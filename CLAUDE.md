# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

A static mock-up of an ADIZERO shoe comparison page, built from Figma node
`2869:230287` in the file `ADIZERO_FW26_ADIOS_PRO_5`. Three plain files, no
build step, no framework, no dependencies: `index.html` (layout + render loop),
`leaf-chart.js` (petal geometry), `shoes.js` (data).

## Commands

```bash
node .claude/serve.js
```

Serves the project root on <http://localhost:4173>. It **must** be served over
HTTP — `file://` breaks because the page loads `leaf-chart.js`, `shoes.js`, the
photography, the icons and the fonts as separate files.

Both JS files are classic scripts (no ESM), so they can also be loaded in Node
for geometry work:

```bash
node -e "require('./leaf-chart.js'); console.log(globalThis.LeafChart.petalPath(0, 10))"
```

Deploying is `git push origin main` — GitHub Pages serves `main` at
<https://davidjthurgood.github.io/adizero-comparison/>. Pages sets
`cache-control: max-age=600` on JS, so for ten minutes after a push a returning
visitor can get new HTML with cached JS. Verify a deploy against the server
copy, not a warm tab:

```bash
curl -s "https://davidjthurgood.github.io/adizero-comparison/leaf-chart.js?cb=$RANDOM" | grep BASELINE
```

## No test suite — verification is measurement

There are no unit tests. Correctness here is geometric, and the established
method is to **measure the rendered result in a browser** rather than assert on
code. Two harnesses have been used repeatedly; both are written as throwaway
`_*.html` pages in the project root, served, read with `get_page_text`, then
deleted:

- **Ray-marching against the Figma vectors.** Inline the `d` attributes from
  `reference/*.svg`, then for each angle bisect outward from the chart centre
  using `SVGGeometryElement.isPointInFill` to find each shape's outer radius,
  and diff generated against original. Score-10 petals should land within
  ±1.5px. **`isPointInFill` ignores the element's own `transform`** — probe
  from each asset's native centre instead (`figma-background-petals.svg` is
  centred at 252,248.913; `figma-value-petals-pro5.svg` at 201.71,248.896).
- **Shoe-reach measurement.** Redraw a shoe photo into chart coordinates with
  its exact CSS transform onto a canvas, then ray-march alpha outward to find
  how far it covers each petal axis. This is what the petal baseline is set
  from.

Cheap regression check with no browser: `petalPath(0, 10)` must stay
byte-identical to
`M 316.860 217.359 L 436.503 148.283 A 36.760 36.760 0 0 1 489.532 167.841 A 252.000 252.000 0 0 1 489.532 336.159 A 36.760 36.760 0 0 1 436.503 355.717 L 316.860 286.641 A 40.000 40.000 0 0 1 316.860 217.359 Z`.
Also sweep `segmentPath` across scores 0–10 at every axis and shoe count 1–4
looking for `NaN`/`Infinity` in the output.

When driving the browser to verify: **CSS transitions and Web Animations do not
advance during a synchronous eval.** Reading a transitioning property in the
same call that triggers it returns the pre-transition value — change state in
one call, read in the next, or this looks like a bug when it isn't.

## Architecture

### One geometric construction draws everything

`leaf-chart.js` has a single primitive, `wedgePath(fromDeg, toDeg, value,
gapFrom, gapTo, shift)`, which builds a rounded wedge from four parts: a nose
circle tangent to both sides, two straight sides pushed inwards by their
half-gaps, an outer arc at `radiusFor(value)`, and a fillet rounding each
shoulder. A whole petal is the ±30° case; one shoe's share of a subdivided
petal is a narrower case of the same call. `wedgeFor` adds the compare-mode
policy on top, and `petalPath` / `segmentPath` are the two public wrappers.

Consequences worth knowing before changing it:

- **Don't add a second construction.** Earlier versions clipped full petals to
  angular slices; that left hard cuts where the clip crossed the outline. Every
  corner is rounded because it all comes from one path builder.
- `shift` is a pure translation, which is how compare mode explodes the petals.
  A translation moves each arc's centre along with its endpoints, so the arc
  commands need no adjustment.
- The nose radius is *solved* per wedge (a quadratic in `noseRadius`) so its
  closest approach to the centre is always `NOSE_APEX`, whatever the wedge's
  angular width. A fixed nose radius in a 20°-wide wedge would sit at radius
  ~244 and punch a hole through the chart.

### The grey outline has to follow the wedges

The score-10 "ghost" petal is a separate shape drawn behind each metric's
wedges. It takes the shoe count (`petalPath(axis, 10, shoes.length)`) because
it must use the same gap and the same explode offset, or it drifts off the
coloured wedges inside it. Anything that changes compare-mode geometry has to
change both.

### Scaling, and what it means for measuring

The page is a fixed 1358 × 1129 composition scaled to fit by `fitToStage()`,
not a fluid layout. Two things follow:

- **`getBoundingClientRect` returns *scaled* values.** Every verification
  harness in this repo depends on rect measurements, so either measure with the
  stage at ≥1358 (where the scale is 1 and the transform is removed entirely)
  or divide through by the scale read off `getComputedStyle(page).transform`.
  Silently comparing scaled numbers against the Figma coordinates will look
  like a fidelity regression that isn't one.
- **1358 is the reference width.** At exactly that width the transform is
  `none` — deliberately, since `scale(1)` still promotes a layer and can shift
  text rasterisation. Fidelity claims should be made at that width.

### Render loop

`index.html` holds all state in a `selected` Set of shoe ids plus a `mode`
string, and `renderAll()` rebuilds every dynamic part from scratch on any
change — petals, labels, photo, info pane, selectors, mode toggle. There is no
diffing. Two useful side effects: the carousel's progress-bar animation
restarts naturally because the element is recreated, and any interaction resets
the dwell.

`page.dataset.mode` and `page.dataset.compare` drive the layout via CSS
attribute selectors rather than inline styles, so the graph centring and the
info pane hiding are transitions rather than jumps.

### Two behaviours, switched by the Option 1 / Option 2 toggle

- **compare** — shoes toggle, several at once. Petals subdivide into a wedge
  per shoe, the graph centres (left 60 → 227.5), the info pane fades out, the
  product photo drops.
- **swap** — one shoe at a time, layout never moves, and it auto-advances every
  15s. The advance is driven by the progress bar's `animation.finished`, not a
  parallel timer, so the bar and the shoe can't drift apart; a generation check
  discards a finish that a later render superseded.

Because swap mode never has more than one shoe selected, the compare-mode rules
simply never fire — there is no second layout path to maintain.

State is mirrored to the URL (`?shoes=a,b&option=2`), so any state is linkable
and reproducible when verifying.

## Figma gotchas that will bite again

- **The `inset` frame is vertically flipped.** Every child's Figma `top` is
  really its distance from the frame's *bottom*, and `get_metadata`'s `y` for
  those children is measured from the bottom too (visual top = 1129 − y). Taken
  at face value the generated code and the metadata disagree by hundreds of
  pixels; they reconcile once you know this. Resolved visual positions are
  tabulated in README.md.
- **`get_metadata` reports a rotated node's own top-left corner after
  rotation**, with `width`/`height` as the axis-aligned bbox. Which visual
  corner that lands on depends on the angle — topmost for +25°, leftmost for
  −63.49°. Don't read it as the bbox origin.
- **The flat vector exports can't be re-scored.**
  `reference/figma-value-petals-pro5.svg` is one boolean-merged path baked at
  Adios Pro 5's scores, which is why the geometry is rebuilt procedurally. That
  merge also distorted the Energy Return petal where it met its neighbour, so
  the generated version is arguably more correct than the file.
- **The graph card is transparent in the page frame** — the page gradient shows
  through it. It only carries its own gradient when the graph node is viewed
  standalone.

## Deliberate departures from the design

These are not bugs; check README.md before "fixing" them.

- `BASELINE` is 75, not the design's 45. At 45 any low score hides behind the
  product photo, which reaches 135 along the Value for Money axis. Raising it
  costs discrimination, so it is deliberately *not* high enough to clear the
  photo outright — the lowest scores sit partly behind it rather than
  overstating themselves. Score 10 is untouched at 252.
- Compare mode widens the between-petal gap and explodes the petals; single-
  shoe view keeps the design's exact geometry.
- The info pane's product name follows the selection, but its copy is shared
  across all three shoes (`RACING_COPY`) pending real copy.
- Photography is downsampled from the Figma masters (12MB → 2.3MB). Crops are
  percentages, so proportional resizing keeps every offset valid.

## Tuning constants

All the visual judgement calls in `leaf-chart.js` are single named constants
with their trade-offs recorded in comments and README.md: `BASELINE`,
`PETAL_GAP_COMPARE`, `SEG_GAP`, `EXPLODE_COMPARE`, `FILLET_*`. Several are
bounded by something physical — `EXPLODE_COMPARE` cannot exceed 36.7 before
petal tips clip the 903×560 card, and `FILLET_MIN_RATIO` exists because the
fitted fillet line crosses zero at R = 96.7 and would otherwise give low scores
square corners. Re-measure rather than eyeball when changing them.

## Fonts and licensing

`adidasFG` (Regular, Compressed Bold) and `Denton Light` are self-hosted from
`assets/fonts/` under the same family names the design uses, so a `@font-face`
family takes precedence over any local install and rendering is identical
everywhere. Keep it that way — relying on installed fonts hides breakage from
anyone who doesn't have them.

Both are licensed typefaces served from a public URL, at the user's explicit
decision. Deleting `assets/fonts/` and the three `@font-face` blocks reverts to
`Arial Narrow` / `Georgia` fallbacks if that ever needs undoing.
