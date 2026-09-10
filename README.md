# ADIZERO — Compare the best

Mock-up of the shoe comparison page from
[ADIZERO_FW26_ADIOS_PRO_5][page] (node `2869:230287`): a six-petal "leaf"
chart where each petal is one feature scored 0–10, a product info pane, and a
three-up shoe selector.

[page]: https://www.figma.com/design/w7nMWYJWs2BGly8yZZTTM4/ADIZERO_FW26_ADIOS_PRO_5?node-id=2869-230287&m=dev

No build step, but it needs serving over HTTP rather than opening from
`file://`, because it loads `leaf-chart.js` / `shoes.js`, the photography and
the icons as separate files:

```bash
node .claude/serve.js
```

Then visit <http://localhost:4173>.

## What's here

| File | |
| --- | --- |
| `index.html` | The page: layout, info pane, selectors, and the render loop |
| `leaf-chart.js` | Petal geometry — the only non-obvious part, see below |
| `shoes.js` | The metrics, the three shoes, and the info-pane copy |
| `assets/` | Product photography and the info-pane icons |
| `reference/` | The two petal vectors exported from Figma, kept for provenance |

## Behaviour

Two behaviours are under review, switched by the **Option 1 / Option 2** toggle
in the band above the heading. The toggle isn't part of the design — it's
review chrome, styled to sit quietly in the page's own language.

### Option 1 — compare (default)

Clicking a shoe toggles it, so any combination can be on the chart at once
(the last one can't be switched off). With one shoe selected the page is
exactly the Figma frame. Selecting a second one:

- centres the graph in the page (left 60 → 227.5)
- fades out the info pane and takes it out of the accessibility tree
- drops the product photo, since one shoe's photo over several sets of scores
  would misread

### Option 2 — swap, with a carousel

One shoe at a time. Clicking a shoe replaces the selection rather than adding
to it, so the chart, product photo and info pane all swap to it. Nothing
moves: the graph stays at left 60 and the info pane is always there. Switching
from option 1 while several shoes are selected collapses down to the first of
them.

It also advances on its own every 15 seconds, wrapping back to the first shoe.
A 4px bar in the shoe's own colour hugs the very bottom edge of the active
card and fills left to right over the dwell, clipped by the card's 20px radius
so it reads as the bottom edge thickening. Clicking a shoe restarts the dwell
rather than inheriting the part-elapsed one.

The advance is driven by the progress bar's own animation finishing
(`animation.finished`) rather than a parallel `setTimeout`, so the bar and the
shoe can't drift apart — if the browser throttles rendering, both stall
together. A generation check ignores any finish that a later render has
already superseded.

The graph and info pane dissolve over 180ms between shoes; a 15s carousel that
hard-cuts reads as a bug. That dissolve is the one thing here that wasn't
asked for — drop the `[data-swapping]` rules and the `SWAP_FADE_MS` wait to
get straight cuts back. Under `prefers-reduced-motion` the dissolve is skipped
but the carousel still advances, since stopping it outright would just look
broken to anyone demoing with that setting on.

Option 1 never runs the carousel — the bars are `display: none` and the
animation is cancelled, verified as zero running animations on the document.

Because option 2 never has more than one shoe selected, the centring and
pane-hiding rules simply never fire — there's no second layout path to keep in
step.

### Linking to a state

`?shoes=<id>[,<id>...]` and `?option=2` open a specific state.
`?shoes=adios-pro-5` is the state the design is drawn in;
`?shoes=adios-pro-5,evo-sl` a head-to-head; `?shoes=evo-sl&option=2` option 2
on the Evo SL. Both the toggle and the selectors keep the URL in step, so any
state can be linked or reloaded.

### Info pane copy

Only Adios Pro 5's copy exists, so all three shoes point at the same
`RACING_COPY` object in `shoes.js` and the pane reads the same whichever shoe
is selected — as agreed, to be revisited. Two deliberate exceptions worth
knowing about:

- the **product name** follows the selection, since that's unambiguous and the
  data was already there
- the **"Racing" eyebrow** stays `#ff5772` rather than taking each shoe's
  colour, because that's what the design specifies and guessing otherwise
  seemed like inventing

Give a shoe its own copy object to break the three apart.

## Layout

Figma's `inset` frame is vertically flipped, so every child's Figma `top` is
really its distance from the frame's bottom, and `get_metadata`'s `y` for those
children is measured from the bottom too (visual top = 1129 − y). The resolved
visual positions, which is what the CSS uses:

| | left | top | size |
| --- | --- | --- | --- |
| option toggle | 64 | 32 | (review chrome, not in the design) |
| heading | 64 | 103.1 | 1238 × 106 |
| graph | 60 (227.5 comparing) | 264 | 903 × 560 |
| info pane | 967 | 264 | 339 × 560 |
| selectors | 60 | 844 | 1248 × 133 |

The graph card is transparent in this frame — the page gradient shows through
it. It only carries its own gradient when the graph node is viewed standalone.

Selector items are all `flex: 1` at 413.33px, where the design has 414 / 413 /
413 (the selected one was `flex-1`, the others fixed). That sub-pixel
difference buys a single layout that works for any number of selected items.
The 1px → 2px border on selection lives on a `::before`, so switching it never
nudges the absolutely-positioned thumb and text inside.

## Verified against the design

Measured rather than eyeballed:

- page 1366 × 1129; heading, graph, info pane and selectors all on the
  coordinates above
- info pane internals exact — title block at (20, 40) 299 × 71, body at
  (20, 131) 299 × 96, spec rows at y 267 / 337 / 407 / 477
- text box heights match Figma's (h1 68, statement 28, eyebrow 27, product
  name 34, body 96), which is also what confirms the fonts are resolving
- selector thumbs within 0.02px: bounding boxes 123.74 / 145.78 / 107.64 vs
  123.744 / 145.785 / 107.649, text at 148 / 156.78 / 158.65
- chart centre (451, 279.6) vs Figma's (451, 279.63)
- pill widths within 0.7px, heights 31.3 vs 31
- the Pro 5 photo's rotated frame lands its topmost corner on (341.20, 144.00)
  vs Figma's (341.19, 144); Evo 3 and Evo SL frames match to 0.01px
- score-10 petal outlines within ±1.5px of the Figma vectors; lower scores now
  use a raised baseline and deliberately differ, see below

One thing to note if you go back into the Figma file: `graph+amounts` contains
a hidden `AMOUNTS-template` frame holding rows of eleven 5px dots spaced
20.2px apart — a 0–10 tick track, one per petal axis. It is switched off in
the design as delivered, so it isn't built here. Worth deciding whether the
scores should be readable rather than only comparable.

## Comparing shoes

On the chart itself, more than one shoe keeps the six petals exactly where they
are and divides each one into an equal wedge per shoe, so a petal still reads as "this
metric" and the wedge lengths read as "this shoe scored that". Wedge order is
by increasing angle and identical in every petal, so a colour is always in the
same relative position.

Each wedge is built by the same construction as a whole petal, just with
narrower boundaries — so every corner is rounded exactly as the design rounds
a petal, with no hard cuts. `wedgePath` takes two angles and a half-gap per
side; `segmentPath` works out a shoe's share of a petal; `petalPath` is the
±30° single-shoe case. Nothing is clipped and there is only one construction
to keep correct.

Two details make a subdivided petal read properly:

- **Gaps are grouped.** A wedge takes a wider half-gap on any edge it shares
  with a neighbouring petal and a tighter 1.2px on the dividers inside it, so
  the six metrics read as six groups rather than one undifferentiated ring of
  eighteen. Both are constant perpendicular offsets, as in the design, so a
  gap looks even from nose to rim rather than pinching at the centre.

  The between-petal half-gap is the design's own 2.43px for a single shoe
  (which fills its petal, so that is plenty) and `PETAL_GAP_COMPARE` = 5.5px
  while comparing. 2.43 is far too tight once a petal is subdivided — the
  eighteen wedges read as one ring. It's worth knowing the trade-off if you
  retune it: because the gap is a perpendicular offset rather than an angular
  one, widening it takes angle away from the two outer wedges in each group
  but not the middle one, so at 5.5 an outer wedge is about 9% narrower than
  the middle at mid-radius. At 7 that pinching starts to show. Wedge *length*
  is what encodes the score, so this costs nothing in accuracy, but it is why
  the value isn't larger.
- **Tips land on a common circle.** The nose radius is solved per wedge so its
  closest approach to the centre is always 44.86 — the design's own value —
  whatever the wedge's width. A narrow wedge therefore gets a proportionally
  smaller tip. Without this a fixed nose radius in a 20° wedge would sit far
  out and punch a hole through the middle of the chart.

Shoulder fillets follow the design's `0.2367 × (R − 96.7)`, with two bounds:

- capped at 55% of the wedge's half-width at the rim, so two fillets can't
  swallow a narrow wedge
- floored at 10.14% of R, because the fitted line was only ever measured over
  scores 6-10 and crosses zero at R = 96.7. Extrapolated below that it gives a
  low-scoring wedge hard square corners, which the design never does. The
  floor is set to where the two agree at score 6 (17.16 / 169.2), so it only
  takes over below the measured range.

Neither bound binds over scores 6-10 at the full ±30° width, so single-shoe
petals come out byte-identical to the pre-comparison version — verified both
by re-running the ray-march against the Figma vectors for the same numbers to
2dp, and by string-comparing the generated paths.

Colours are per shoe in `shoes.js`, all in one red family:

| | hex | L* | chroma |
| --- | --- | --- | --- |
| Adios Pro 5 | `#FF5772` | 61.0 | 68.5 |
| Adios Pro Evo 3 | `#C73F55` | 47.4 | 58.1 |
| Evo SL | `#F52748` | 53.3 | 82.4 |

A selected shoe's selector outline takes the same colour (via a `--shoe`
custom property), so the button and its wedges match; unselected shoes keep
the design's neutral hairline, since they have no colour on the chart.

The three separate on lightness and saturation rather than hue, which is what
lets them stay in one red family and still be told apart. Pairwise ΔE (CIE76)
is 17.2 / 18.7 / 26.5, comfortably past the ~10 mark below which two colours
stop reading as different at a glance. Worth re-checking those numbers if the
palette is ever retuned — an earlier pass had two of them at 8.8, which was
not enough to distinguish wedges in the comparison view.

Two things worth a decision:

- The design's petal gradient runs from 10% opacity at the centre to full at
  the rim. On one wide petal that reads as depth; on three narrow wedges there
  is less saturated area and the middle of the chart goes quite pale. It's
  kept faithful, but the inner stop in `buildDefs` is a single number if you'd
  rather the colours held up in comparison mode.
- The product photo only shows when exactly one shoe is selected — one shoe's
  photo over three sets of scores would misread. The comparison view has an
  empty centre, as in the reference sketch.

## Petal geometry

The Figma file contains two flat vector assets: one with every petal at 10
(`reference/figma-background-petals.svg`, the grey ghosts) and one merged
path baked at the Adios Pro 5 scores (`reference/figma-value-petals-pro5.svg`).
Neither can be re-scored, so `leaf-chart.js` rebuilds the petal from its
construction instead:

- a rounded **nose** near the centre, a circle tangent to both sides — fixed
  size, it does not shrink with the score
- two straight **sides** on the ±30° rays, pushed inwards by 2.43px so
  neighbouring petals never touch
- an outer **arc** struck from the chart centre at radius
  `R = BASELINE + (252 − BASELINE)/10 × score`
- a **fillet** rounding each shoulder, `0.2367 × (R − 96.7)`, floored at
  `0.1014 × R` so a low score still gets rounded corners

Those constants were measured off the Figma paths at scores 6, 8 and 10 and
are linear across that range to within ~0.3px.

### The baseline

The design's scale was `45 + 20.7 × score` — score 0 at radius 45. That is the
right look, but the product photo covers the middle of the chart, so a low
score disappears behind it. Ray-marching each shoe cut-out from the chart
centre, the furthest any reaches along a petal axis is **135**, on the Value
for Money axis at 180° (the shoes point left-right, so that axis is worst).
Evo 3's Value for Money of 2 landed at 86 and was invisible.

`BASELINE` is **75**. That is deliberately *not* high enough to clear the
photo outright — 150 did that, but it left a point worth only 10.2 units of
radius, so a 2 read as nearly as much as a 6. At 75 a point is worth 17.7,
close to the design's own 20.7, and the very lowest scores are allowed to sit
partly behind the shoe rather than overstating themselves.

| score | 0 | 2 | 4 | 6 | 8 | 10 |
| --- | --- | --- | --- | --- | --- | --- |
| radius | 75 | 110 | 146 | 181 | 217 | 252 |
| design | 45 | 86 | 128 | 169 | 211 | 252 |

Measured result across all three shoes: every petal clears the shoe across
100% of its width except Evo 3's Value for Money of 2, which shows across
**34%** of its width — its tip sits 20px behind the shoe but its flanks come
out either side, so it reads as present and clearly small. Score 10 is
untouched at 252, so the ghost petals and the chart's outer extent are exactly
the design's.

`BASELINE` is the single knob: raise it to make low scores more visible at the
cost of overstating them, lower it toward 45 for design fidelity at the cost
of hiding them.

### What is still verified against the vectors

Score 10 is unchanged, so the ghost petals — which is what the Figma vectors
actually contain at full size — still match. Ray-marching the generated and
original paths from the chart centre put the score-10 petals within **±1.5px**
of the Figma background vector, and the generated score-10 path string is
byte-identical to the version checked before the baseline moved.

Before the baseline changed, the scored petals matched the Figma union vector
within **±2.5px** too, the one outlier being Energy Return, whose original
outline was distorted where the boolean union merged it into its neighbour.
Set `BASELINE` back to 45 to reproduce that.

## Product photography

All three shoes are wired up. Size, rotation and crop for each come from the
`shoe-assets` frame ([node 2869:230283][assets-frame]), which is authoritative
for how a photo is framed but says nothing about where it sits in the card —
it's a flat sheet of three cut-outs. Each is therefore centred on the point the
Adios Pro 5 occupies in the graph frame, carrying the small relative vertical
offsets (−10.5px, −8.6px) the sheet gives the other two.

[assets-frame]: https://www.figma.com/design/w7nMWYJWs2BGly8yZZTTM4/ADIZERO_FW26_ADIOS_PRO_5?node-id=2869-230283&m=dev

The `shoe` block in `shoes.js` is `box` (frame size, offset from the card
centre, rotation) plus `crop` (the window into the source image):

```js
shoe: {
  src: 'assets/adios-pro-evo-3.png',
  box: { w: 301.451, h: 158.189, dx: -3.2, dy: -10.46, rotate: 25 },
  crop: { w: '128.07%', h: '116.03%', left: '-13.86%', top: '-6.63%' },
}
```

Two of the three are shot landscape and rotated 25°; the **Evo SL** is shot
portrait, so its frame is portrait (119.865 × 291.668) and a −63.49° rotation
brings the shoe level. Its box matches the image's 0.411 aspect exactly, so
its crop is a plain 100% fit.

Rendered frame sizes were checked against Figma: 340.06 × 270.76 vs
340.061 × 270.766, and 314.50 × 237.44 vs 314.504 × 237.4475.

`thumb` is the same shape for the selector thumbnails, with `cx` (the thumb's
centre x in the item) and `textLeft` instead of `dx`/`dy`. The Adios Pro Evo 3
has its own tighter export for the thumbnail (`selector-evo-3.png`) rather
than a scaled-down copy of the big photo; the other two reuse theirs.

**Which shoe is which**: the comparison page labels the white shoe
"ADIOS PRO EVO 3" and the black-with-red-stripes one "EVO SL". That is the
opposite of what the white photo's filename (`KH7678_SL_eCom`) suggests, so
the files here are named after the product the design assigns them, not after
the source filename. The design's labelling is the authority — flag it if the
photography was mislabelled upstream instead.

## Fonts

`adidasFG` (Regular and Compressed Bold) and `Denton Light` are self-hosted
from `assets/fonts/` and declared under the same family names the design uses.
A `@font-face` family takes precedence over a locally-installed one, so a
machine that has them installed renders identically to one that doesn't —
verified by checking the browser fetches all three files and that every text
box keeps its Figma height (h1 68, statement 28, eyebrow 27, product name 34,
body 96) and the pill widths stay within 0.7px.

`font-display: block` holds text invisible briefly rather than flashing a
fallback at the wrong width and reflowing.

Both are licensed typefaces served from a public URL. If that ever needs
undoing, delete `assets/fonts/` and the three `@font-face` blocks — the stacks
already fall back to `Arial Narrow` / `Georgia`, so the page still works, just
at different text widths.

## Image sizes

The Figma masters are much larger than anything the page displays, so they're
downsampled for delivery — 12MB to 2.3MB. Crops are expressed as percentages,
so resizing proportionally leaves every offset valid.

| | master | here | displayed at |
| --- | --- | --- | --- |
| `adios-pro-5.png` | 4096 × 4096 | 2048 × 2048 | 843px wide |
| `adios-pro-evo-3.png` | 2400 × 1141 | 1000 × 475 | 386px wide |
| `evo-sl.png` | 1297 × 3156 | 600 × 1460 | 120 × 292 |
| `selector-evo-3.png` | 1024 × 487 | 400 × 190 | 138px wide |

Re-export from the Figma nodes linked above if you need the masters back.
