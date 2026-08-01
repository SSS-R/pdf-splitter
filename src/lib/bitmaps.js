/**
 * Icon bitmaps: 7x7 character matrices, '#' meaning "pixel on".
 *
 * Kept out of the component file so the data can be imported by anything --
 * the theme animation, the OG generator, tests -- without a component module
 * exporting non-components, which breaks fast refresh.
 */

export const BITMAPS = {
  // Brand mark: one page become two. The scissors glyph read as a plain "x"
  // at logo size -- two crossing strokes and nothing else -- which said
  // "close" rather than "split".
  logo:     ['###.###', '#.#.#.#', '#.#.#.#', '#.#.#.#', '#.#.#.#', '#.#.#.#', '###.###'],
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
