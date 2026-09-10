(function (global) {
  'use strict';

  /* The six metrics, in the order and at the axis angles used in the Figma
     design. `axis` is degrees clockwise from 3 o'clock. `pill` is the label
     position inside the 625x460 ITEMS box, straight from the Figma frame:
       left/top  = offset of that edge
       centreX   = centre the pill on this x
       centreY   = centre the pill on the chart's horizontal axis           */
  const METRICS = [
    { key: 'lightness', label: 'Lightness',           axis: -60, pill: { left: 403, top: 0 } },
    { key: 'energy',    label: 'Energy return',       axis: 0,   pill: { left: 504, centreY: true } },
    { key: 'comfort',   label: 'Comfort',             axis: 60,  pill: { left: 415, top: 429 } },
    { key: 'stability', label: 'Stability/support',   axis: 120, pill: { centreX: 170, top: 429 } },
    { key: 'value',     label: 'Value for money',     axis: 180, pill: { left: 0, centreY: true } },
    { key: 'distance',  label: 'Distance / marathon', axis: 240, pill: { left: 92, top: 0 } },
  ];

  /* The info pane's copy. Only Adios Pro 5's is written; all three shoes point
     at it for now, so the pane reads the same whichever is selected. Give a
     shoe its own object here when the real copy arrives. */
  const RACING_COPY = {
    eyebrow: 'Racing',
    body: 'Our best choice for race day, crafted from the same record breaking '
        + 'technology as Adios Pro EVO 3, the official Sub-2 super shoe.',
    specs: [
      { icon: 'best-for',  w: 30,     h: 25.344, label: 'Best for:',       value: 'Marathon racing' },
      { icon: 'drop',      w: 30,     h: 17.288, label: 'Midsole drop:',   value: 'Heel 39mm | Toe 34mm' },
      { icon: 'weight',    w: 30.002, h: 22.477, label: 'Weight approx.:', value: '177g (UK size 8.5)' },
      { icon: 'pronation', w: 30,     h: 32.729, label: 'Pronation type:', value: 'Neutral' },
    ],
  };

  /* Scores are 0-10. `petal` is the shoe's colour, used for its petals, its
     wedge when several shoes are compared, and its selector outline. Note
     Adios Pro Evo 3 and Evo SL currently share #C73F55, so those two can't be
     told apart in the comparison view — give one of them its own red to fix.

     `shoe` places the large product photo in the graph and `thumb` the small
     one in the selector — box size, rotation and crop for both come straight
     from Figma. A crop of 100%/0% means the image fills its box.

     Note on identity: the design labels the white shoe "ADIOS PRO EVO 3" and
     the black one "EVO SL", which is the opposite of what the white photo's
     filename (KH7678_SL_eCom) suggests. The design's labelling wins. */
  const SHOES = [
    {
      id: 'adios-pro-5',
      name: 'Adios Pro 5',
      tagline: 'Designed to Break Records.',
      petal: '#FF5772',
      info: RACING_COPY,
      scores: { lightness: 8, energy: 9, comfort: 8, stability: 6, value: 6, distance: 10 },
      shoe: {
        src: 'assets/adios-pro-5.png',
        box: { w: 309.401, h: 156.617, dx: -3.2, dy: 0.35, rotate: 25 },
        crop: { w: '272.64%', h: '539.08%', left: '-91.01%', top: '-203.51%' },
      },
      thumb: {
        src: 'assets/adios-pro-5.png',
        box: { w: 116, h: 59, cx: 86, rotate: 45 },
        crop: { w: '272.64%', h: '539.08%', left: '-91.01%', top: '-203.51%' },
        textLeft: 148,
      },
    },
    {
      id: 'adios-pro-evo-3',
      name: 'Adios Pro Evo 3',
      tagline: 'The Sub-2 Supershoe.',
      petal: '#C73F55',
      info: RACING_COPY,
      scores: { lightness: 10, energy: 10, comfort: 5, stability: 4, value: 2, distance: 10 },
      shoe: {
        src: 'assets/adios-pro-evo-3.png',
        box: { w: 301.451, h: 158.189, dx: -3.2, dy: -10.46, rotate: 25 },
        crop: { w: '128.07%', h: '116.03%', left: '-13.86%', top: '-6.63%' },
      },
      thumb: {
        // Its own tighter export, not a scaled-down copy of the big photo.
        src: 'assets/selector-evo-3.png',
        box: { w: 137.966, h: 68.205, cx: 93.89, rotate: 45 },
        crop: { w: '100%', h: '100%', left: '0%', top: '0%' },
        textLeft: 156.785,
      },
    },
    {
      id: 'evo-sl',
      name: 'Evo SL',
      tagline: 'Feel Fast.',
      petal: '#C73F55',
      info: RACING_COPY,
      scores: { lightness: 7, energy: 8, comfort: 9, stability: 9, value: 10, distance: 8 },
      shoe: {
        // Shot portrait, so the frame is portrait and the rotation brings the
        // shoe level. Box and image share the same 0.411 aspect.
        src: 'assets/evo-sl.png',
        box: { w: 119.865, h: 291.668, dx: -3.2, dy: -8.6, rotate: -63.49 },
        crop: { w: '100%', h: '100%', left: '0%', top: '0%' },
      },
      thumb: {
        src: 'assets/evo-sl.png',
        box: { w: 44.342, h: 107.897, cx: 94.82, rotate: -45 },
        crop: { w: '100%', h: '100%', left: '0%', top: '0%' },
        textLeft: 158.649,
      },
    },
  ];

  const PAGE = {
    title: 'Compare the best',
    statement: 'Lorem ipsum dolor sit amet consectetur. Ornare euismod ligula '
             + 'elementum condimentum arcu euismod blandit enim.',
  };

  global.ShoeData = { METRICS, SHOES, PAGE };
})(typeof window !== 'undefined' ? window : globalThis);
