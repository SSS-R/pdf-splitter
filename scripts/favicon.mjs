/**
 * Favicon generator.
 *
 * Unlike scripts/og-image.html, this needs no browser and no manual step. That
 * generator has to run in a page because it renders Helvetica and only a real
 * text engine can lay that out; the logo is seven rows of rectangles, so it can
 * be drawn straight into a pixel buffer here and the PNGs encoded by hand.
 *
 * The glyph is imported from lib/bitmaps.js rather than copied, so the tab icon
 * and the mark in the header cannot drift apart. Change the logo there and
 * re-run `npm run favicon`.
 *
 * Emits:
 *   public/favicon.svg        primary — vector, so it stays crisp at any size
 *   public/favicon-32.png     fallback for browsers that ignore SVG icons
 *   public/favicon-16.png     fallback
 *   public/apple-touch-icon.png  180x180, iOS home screen (no SVG support)
 *   public/icon-512.png       512x512, for the web manifest when the PWA lands
 */
import { deflateSync } from 'node:zlib';
import { writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { BITMAPS } from '../src/lib/bitmaps.js';

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const publicDir = join(projectRoot, 'public');

const GLYPH = BITMAPS.logo;
const ROWS = GLYPH.length;
const COLS = GLYPH[0].length;

/**
 * The header's mark exactly: accent red, on nothing.
 *
 * An earlier version inverted it -- cream on a red plate -- for contrast against
 * unknown browser chrome. It read well and it was the wrong call: the tab icon
 * and the mark in the header were visibly different marks, which is worse than
 * any legibility gain. Red is mid-tone enough to hold up on a light or a dark
 * tab strip, so transparent works on both.
 *
 * The one exception is apple-touch-icon, which iOS composites onto an opaque
 * background of its own choosing; that gets the site's paper colour so it reads
 * as the light-mode header rather than whatever iOS picks.
 */
const MARK = [230, 46, 46];
const PAPER = [250, 250, 247];

/* ------------------------------------------------------------------ SVG -- */

/**
 * The viewBox is 16 units with 2-unit cells, not 9 units with 1-unit cells.
 *
 * That is the whole fix for the stair-stepping. Favicons are drawn at 16 and 32
 * device pixels; 16/9 is 1.78, so each cell landed on a fraction of a pixel and
 * `crispEdges` resolved neighbouring cells to different widths -- one bar 2px,
 * the next 1px, which looked like a crack down the mark. 7 cells x 2 units plus
 * a 1-unit margin each side is exactly 16, so every cell is a whole number of
 * pixels at 16px, 32px, 64px and every other power of two a browser asks for.
 */
const toSvg = () => {
  const rects = [];
  for (let y = 0; y < ROWS; y++) {
    for (let x = 0; x < COLS; x++) {
      if (GLYPH[y][x] === '#') {
        rects.push(`<rect x="${x * 2 + 1}" y="${y * 2 + 1}" width="2" height="2"/>`);
      }
    }
  }
  // No background rect: the icon sits on the browser's own chrome, exactly as
  // the mark sits on the page.
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" shape-rendering="crispEdges">
  <g fill="rgb(${MARK})">
    ${rects.join('\n    ')}
  </g>
</svg>
`;
};

/* ------------------------------------------------------------------ PNG -- */

const CRC_TABLE = (() => {
  const table = new Int32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    table[n] = c;
  }
  return table;
})();

const crc32 = (buf) => {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
};

const chunk = (type, data) => {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const body = Buffer.concat([Buffer.from(type, 'ascii'), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body));
  return Buffer.concat([len, body, crc]);
};

/** `pixel(x, y)` returns [r, g, b, a]; a of 0 leaves the browser's chrome showing. */
const encodePng = (size, pixel) => {
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 6; // colour type 6 = truecolour with alpha

  const raw = Buffer.alloc(size * (1 + size * 4));
  for (let y = 0; y < size; y++) {
    const rowStart = y * (1 + size * 4);
    raw[rowStart] = 0; // filter: None
    for (let x = 0; x < size; x++) {
      const [r, g, b, a] = pixel(x, y);
      const p = rowStart + 1 + x * 4;
      raw[p] = r;
      raw[p + 1] = g;
      raw[p + 2] = b;
      raw[p + 3] = a;
    }
  }

  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ]);
};

/**
 * Draw the glyph at an integer cell size and centre it.
 *
 * The cell must be a whole number of device pixels or the mark blurs -- the one
 * thing a pixel logo must never do. Whatever is left over after rounding
 * becomes margin, which is why the padding is not a fixed percentage.
 */
const renderPng = (size, { plate = null } = {}) => {
  // size/8 matches the SVG's 16-unit grid (7 cells plus a half-cell margin each
  // side), so both assets carry the same proportions, and it stays a whole
  // number of pixels at every size emitted here.
  const cell = Math.max(1, Math.floor(size / 8));
  const offsetX = Math.floor((size - cell * COLS) / 2);
  const offsetY = Math.floor((size - cell * ROWS) / 2);
  const background = plate ? [...plate, 255] : [0, 0, 0, 0];

  return encodePng(size, (x, y) => {
    const col = Math.floor((x - offsetX) / cell);
    const row = Math.floor((y - offsetY) / cell);
    const inside = col >= 0 && col < COLS && row >= 0 && row < ROWS;
    return inside && GLYPH[row][col] === '#' ? [...MARK, 255] : background;
  });
};

/* ----------------------------------------------------------------- main -- */

mkdirSync(publicDir, { recursive: true });

const outputs = [
  ['favicon.svg', Buffer.from(toSvg(), 'utf8')],
  ['favicon-32.png', renderPng(32)],
  ['favicon-16.png', renderPng(16)],
  // Opaque on purpose: iOS ignores alpha and composites onto its own
  // background, so an unspecified plate means an unpredictable one.
  ['apple-touch-icon.png', renderPng(180, { plate: PAPER })],
  ['icon-512.png', renderPng(512, { plate: PAPER })],
];

for (const [name, data] of outputs) {
  writeFileSync(join(publicDir, name), data);
  console.log(`  ${name.padEnd(22)} ${String(data.length).padStart(6)} bytes`);
}
console.log('\nFavicons regenerated from BITMAPS.logo.');
