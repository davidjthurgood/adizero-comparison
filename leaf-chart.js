(function (global) {
'use strict';

/* -----------------------------------------------------------------------------
   ADIZERO leaf chart — procedural petal geometry
   -----------------------------------------------------------------------------
   Geometry reverse-engineered from the Figma node 2842:136809 vector assets
   (reference/figma-background-petals.svg = every petal at value 10,
    reference/figma-value-petals-pro5.svg = Adios Pro 5's values).

   One construction draws everything. A wedge spans two angular boundaries and
   is bounded by:

     · a rounded **nose** near the centre, a circle tangent to both sides
     · two straight **sides**, each pushed inwards by its own half-gap so
       neighbouring wedges never touch
     · an outer **arc** struck from the chart centre at radius R(score)
     · a **fillet** rounding each shoulder where a side meets the outer arc

   A whole petal is just the ±30° case. Subdividing one petal between several
   shoes uses the same code with narrower boundaries, so every corner stays
   rounded — no clipping, and nothing to keep in sync.

   The fitted constants were measured off the Figma paths at scores 6, 8 and 10
   and are linear across that range to within ~0.3px.
-------------------------------------------------------------------------------*/

const CHART_SIZE = 504;                        // SVG viewBox, square
const CX = CHART_SIZE / 2;                     // 252
const CY = CHART_SIZE / 2;                     // 252

/* Score 10 is the design's own full radius. Score 0 sits above the design's
   own 45 so that a low score isn't swallowed by the product photo, which
   covers the middle of the chart — ray-marching the cut-outs, the furthest any
   reaches along a petal axis is 135, on the Value for Money axis at 180°
   (the shoes point left-right, so that axis is worst).

   Deliberately *not* high enough to clear the photo completely. A baseline of
   150 did that but left a point worth only 10.2 units of radius, so a 2 read
   as nearly as much as a 6. At 75 a point is worth 17.7 — close to the
   design's own 20.7 — and the lowest scores are allowed to sit partly behind
   the shoe rather than overstating themselves. */
const MAX_RADIUS = 252;                        // score 10, straight from the design
const BASELINE = 75;                           // score 0
const R_PER_POINT = (MAX_RADIUS - BASELINE) / 10;

const HALF_ANGLE = 30;                         // petal half-width, degrees
const PETAL_GAP = 2.43;                        // half-gap at a petal's own edges
const PETAL_GAP_COMPARE = 5.5;                 // …widened while comparing, see segmentPath
const SEG_GAP = 1.2;                           // half-gap between shoes inside one petal
const NOSE_APEX = 44.86;                       // how close a tip comes to the centre
const FILLET_SLOPE = 0.2367;                   // shoulder fillet vs. R
const FILLET_INTERCEPT = 96.7;
const FILLET_WIDTH_CAP = 0.55;                 // …but never past this much of the rim half-width
const FILLET_MIN_RATIO = 0.1014;               // …and never less than this much of R

const RAD = Math.PI / 180;

const radiusFor = (value) => BASELINE + R_PER_POINT * value;

/**
 * Shoulder fillet radius.
 *
 * The linear term is fitted from the Figma paths, but it was only ever
 * measured over scores 6-10 and crosses zero at R = 96.7 — extrapolate it
 * below that and a low-scoring wedge comes out with hard square corners,
 * which is not what the design does. FILLET_MIN_RATIO keeps the rounding
 * proportional instead, and is set to the value where the two agree at score
 * 6 (17.16 / 169.2), so it only takes over below the range that was measured
 * and every verified petal is untouched.
 */
const filletFor = (R) => Math.max(FILLET_SLOPE * (R - FILLET_INTERCEPT), R * FILLET_MIN_RATIO);

// Inward normal of the boundary at `deg`; the wedge lies on its positive side.
const normal = (deg) => [-Math.sin(deg * RAD), Math.cos(deg * RAD)];
// Outward direction along that boundary.
const along = (deg) => [Math.cos(deg * RAD), Math.sin(deg * RAD)];

const dot = (a, b) => a[0] * b[0] + a[1] * b[1];
const len = (a) => Math.hypot(a[0], a[1]);
const add = (a, b) => [a[0] + b[0], a[1] + b[1]];
const mul = (a, k) => [a[0] * k, a[1] * k];

/**
 * Centre of the circle inscribed in the corner where the two sides meet,
 * as an affine function of the nose radius: centre = P + nr·V.
 */
function noseCentreTerms(nA, nB, gA, gB) {
  const det = nA[0] * nB[1] - nA[1] * nB[0];
  const solve = (p, q) => [(nB[1] * p - nA[1] * q) / det, (-nB[0] * p + nA[0] * q) / det];
  return { P: solve(gA, -gB), V: solve(1, -1) };
}

/**
 * Nose radius that puts the tip's closest approach to the centre at `apex`,
 * whatever the wedge's width. This is what keeps every tip on the same inner
 * circle while a narrow wedge gets a proportionally smaller tip — without it,
 * subdividing a petal would punch a big hole through the middle of the chart.
 *
 * Solves |P + nr·V| − nr = apex, which is a quadratic in nr.
 */
function noseRadius(P, V, apex) {
  const a = dot(V, V) - 1;
  const b = 2 * (dot(P, V) - apex);
  const c = dot(P, P) - apex * apex;
  if (Math.abs(a) < 1e-9) return -c / b;
  const disc = b * b - 4 * a * c;
  if (disc < 0) return 0;
  return (-b + Math.sqrt(disc)) / (2 * a);
}

/**
 * One wedge as an SVG path string.
 *
 * @param {number} fromDeg  lower angular boundary, degrees clockwise from 3 o'clock
 * @param {number} toDeg    upper angular boundary
 * @param {number} value    score, 0–10, driving the outer radius
 * @param {number} gapFrom  half-gap to leave at the `fromDeg` side
 * @param {number} gapTo    half-gap to leave at the `toDeg` side
 */
function wedgePath(fromDeg, toDeg, value, gapFrom, gapTo) {
  const R = radiusFor(value);
  const half = ((toDeg - fromDeg) / 2) * RAD;
  const maxGap = Math.max(gapFrom, gapTo);

  // Round the shoulders as in the design, but never so much that the two
  // fillets swallow the rim of a narrow wedge.
  const f = Math.min(
    filletFor(R),
    R * Math.sin(half) * FILLET_WIDTH_CAP,
    ((R - maxGap) / 2) * 0.9
  );

  const nA = normal(fromDeg);
  const nB = normal(toDeg);
  const uA = along(fromDeg);
  const uB = along(toDeg);

  // Nose. Shrink it if the tip would leave no straight side to draw.
  const { P, V } = noseCentreTerms(nA, nB, gapFrom, gapTo);
  let nr = noseRadius(P, V, NOSE_APEX);
  let noseC = add(P, mul(V, nr));
  const sideLimit = R - f - 2;
  for (let i = 0; i < 4 && len(add(noseC, mul(nA, -nr))) > sideLimit; i++) {
    nr *= sideLimit / len(add(noseC, mul(nA, -nr)));
    noseC = add(P, mul(V, nr));
  }

  // Fillet centres: distance f from their side, distance R−f from the centre.
  const filletCentre = (n, u, g) => {
    const d = g + f;
    return add(mul(n, d), mul(u, Math.sqrt(Math.max(0, (R - f) ** 2 - d * d))));
  };
  const qA = filletCentre(nA, uA, gapFrom);
  const qB = add(mul(nB, -(gapTo + f)), mul(uB, Math.sqrt(Math.max(0, (R - f) ** 2 - (gapTo + f) ** 2))));

  const noseA = add(noseC, mul(nA, -nr));          // side ∩ nose
  const noseB = add(noseC, mul(nB, nr));
  const shoulderA = add(qA, mul(nA, -f));          // side ∩ fillet
  const shoulderB = add(qB, mul(nB, f));
  const rimA = mul(qA, R / (R - f));               // fillet ∩ outer arc
  const rimB = mul(qB, R / (R - f));

  const p = ([x, y]) => `${(CX + x).toFixed(3)} ${(CY + y).toFixed(3)}`;
  // Every arc runs in the increasing-angle direction and turns less than 180°.
  const arc = (r, to) => `A ${r.toFixed(3)} ${r.toFixed(3)} 0 0 1 ${p(to)}`;
  const round = f > 0.5;

  return [
    `M ${p(noseA)}`,
    `L ${p(shoulderA)}`,
    round ? arc(f, rimA) : `L ${p(rimA)}`,
    arc(R, rimB),
    round ? arc(f, shoulderB) : `L ${p(shoulderB)}`,
    `L ${p(noseB)}`,
    arc(nr, noseA),
    'Z',
  ].join(' ');
}

/**
 * One shoe's share of a petal. `count` shoes split the petal's 60° evenly; the
 * wedge takes the petal's own gap on any edge it shares with a neighbouring
 * petal and the tighter SEG_GAP on the dividers inside it, so the six metrics
 * read as groups rather than one undifferentiated ring.
 *
 * While comparing, the between-petal gap widens to PETAL_GAP_COMPARE — a
 * single shoe fills its petal so 2.43 is enough to separate the six, but
 * subdivided petals need the group boundary to be unmistakably wider than the
 * dividers inside a group. A single shoe keeps the design's own 2.43, so its
 * geometry is untouched.
 *
 * @param {number} axisDeg  petal axis, degrees clockwise from 3 o'clock
 * @param {number} value    score, 0–10
 * @param {number} index    which shoe, 0-based, ordered by increasing angle
 * @param {number} count    how many shoes are being compared
 */
function segmentPath(axisDeg, value, index = 0, count = 1) {
  const step = (HALF_ANGLE * 2) / count;
  const from = axisDeg - HALF_ANGLE + index * step;
  const outer = count > 1 ? PETAL_GAP_COMPARE : PETAL_GAP;
  return wedgePath(
    from,
    from + step,
    value,
    index === 0 ? outer : SEG_GAP,
    index === count - 1 ? outer : SEG_GAP
  );
}

/** A whole petal — the single-shoe case. */
const petalPath = (axisDeg, value) => segmentPath(axisDeg, value, 0, 1);

global.LeafChart = { CHART_SIZE, CX, CY, MAX_RADIUS, petalPath, segmentPath, radiusFor };
})(typeof window !== 'undefined' ? window : globalThis);
