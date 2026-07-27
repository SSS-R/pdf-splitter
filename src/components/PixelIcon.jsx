/**
 * Bitmap icons drawn with box-shadow.
 *
 * Each glyph is a 7x7 character matrix; every '#' becomes one offset shadow of
 * a single seed pixel. Omitting the shadow colour makes it resolve to
 * currentColor, so icons invert with the theme for free -- no SVG, no icon
 * font, no second asset to keep in sync.
 *
 *   '#....#.'      # . . . . # .
 *   '.#..#..'      . # . . # . .
 *   '..##...'  ->  . . # # . . .   (scissors)
 */

const BITMAPS = {
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

export default function PixelIcon({ name, size = 5, color, title }) {
  const matrix = BITMAPS[name] || BITMAPS.doc;
  const rows = matrix.length;
  const cols = matrix[0].length;

  const shadows = [];
  for (let y = 0; y < rows; y++) {
    for (let x = 0; x < cols; x++) {
      if (matrix[y][x] === '#') {
        // No colour term -> currentColor -> follows the theme.
        shadows.push(`${x * size}px ${y * size}px 0 ${color || ''}`.trim());
      }
    }
  }

  return (
    <span
      role={title ? 'img' : 'presentation'}
      aria-label={title}
      aria-hidden={title ? undefined : true}
      style={{
        position: 'relative',
        display: 'inline-block',
        width: cols * size,
        height: rows * size,
        flex: 'none',
      }}
    >
      <span
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: size,
          height: size,
          boxShadow: shadows.join(','),
        }}
      />
    </span>
  );
}
