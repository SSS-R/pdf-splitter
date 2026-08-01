/**
 * Icon bitmaps: 7x7 character matrices, '#' meaning "pixel on".
 *
 * Kept out of the component file so the data can be imported by anything --
 * the theme animation, the OG generator, tests -- without a component module
 * exporting non-components, which breaks fast refresh.
 */

export const BITMAPS = {
  // Brand mark: two pages, offset. Third attempt, and the first two are worth
  // recording because both failed the same way -- they resolved into a symbol
  // that already means something else.
  //
  //   scissors  ->  two crossing strokes, i.e. a plain "x": close, not split.
  //   two bars  ->  '###.###' over six rows: two upright rectangles side by
  //                 side, which is the universal pause glyph.
  //
  // The fix is asymmetry. Offsetting the second page diagonally breaks the
  // mirror symmetry that made the last one read as a media control, and
  // overlapping rectangles are already understood as "documents".
  logo:     ['####...', '#..#...', '#..####', '#..#..#', '####..#', '...#..#', '...####'],
  scissors: ['#....#.', '.#..#..', '..##...', '..#....', '.#.#...', '#...#..', '.......'],
  merge:    ['#.....#', '.#...#.', '..#.#..', '...#...', '..#.#..', '.#...#.', '#.....#'],
  compress: ['..#.#..', '...#...', '..###..', '#.....#', '..###..', '...#...', '..#.#..'],
  reorder:  ['...#...', '..###..', '.#.#.#.', '.......', '.#.#.#.', '..###..', '...#...'],
  images:   ['#######', '#.....#', '#..#..#', '#.#.#.#', '##...##', '#######', '.......'],
  lock:     ['.####..', '.#..#..', '.#..#..', '######.', '######.', '######.', '.......'],
  plus:     ['...#...', '...#...', '...#...', '#######', '...#...', '...#...', '...#...'],
  x:        ['#.....#', '.#...#.', '..#.#..', '...#...', '..#.#..', '.#...#.', '#.....#'],
  check:    ['......#', '.....#.', '#...#..', '.#.#...', '..#....', '.......', '.......'],
  doc:      ['#####..', '#...#..', '#####..', '#...#..', '#...#..', '#...#..', '#####..'],
  sun:      ['#..#..#', '.#.#.#.', '..###..', '#######', '..###..', '.#.#.#.', '#..#..#'],
  moon:     ['..###..', '.##....', '##.....', '##.....', '##.....', '.##....', '..###..'],
  rotate:   ['.#####.', '##...##', '##.....', '##..###', '.##..##', '..#####', '....##.'],
  trash:    ['.#####.', '#######', '.#.#.#.', '.#.#.#.', '.#.#.#.', '.#####.', '.......'],
  arrow:    ['...#...', '..##...', '.###...', '#######', '.###...', '..##...', '...#...'],
};

/**
 * Sun -> moon, as discrete frames rather than a tween.
 *
 * A CSS cross-fade between two bitmaps produces half-lit pixels, which is the
 * one thing this icon set never does. Stepping through whole frames keeps every
 * pixel fully on or fully off: the rays retract, the disc solidifies, then it
 * hollows into a crescent. Played backwards for the return trip.
 */
export const THEME_FRAMES = [
  BITMAPS.sun,
  ['.......', '..###..', '.#####.', '.#####.', '.#####.', '..###..', '.......'],
  ['..###..', '.###...', '###....', '###....', '###....', '.###...', '..###..'],
  BITMAPS.moon,
];
