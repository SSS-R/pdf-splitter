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
 * Cream on accent red, not the header's red-on-paper.
 *
 * A favicon sits on browser chrome we do not control and is often rendered at
 * 16px, so it needs its own plate for contrast rather than a transparent
 * background that disappears against a light or dark tab strip. Red also makes
 * the tab findable at a glance, which is the icon's whole job.
 */
const PLATE = [230, 46, 46];
const MARK = [250, 250, 247];

/* ------------------------------------------------------------------ SVG -- */

const toSvg = () => {
  const rects = [];
  for (let y = 0; y < ROWS; y++) {
    for (let x = 0; x < COLS; x++) {
      if (GLYPH[y][x] === '#') rects.push(`<rect x="${x + 1}" y="${y + 1}" width="1" height="1"/>`);
    }
  }
  // 9x9 viewBox = the 7x7 glyph plus a one-cell margin, so the mark never
  // touches the edge of a rounded tab treatment.
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 9 9" shape-rendering="crispEdges">
  <rect width="9" height="9" fill="rgb(${PLATE})"/>
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

const encodePng = (size, pixel) => {
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 2; // colour type 2 = truecolour RGB

  const raw = Buffer.alloc(size * (1 + size * 3));
  for (let y = 0; y < size; y++) {
    const rowStart = y * (1 + size * 3);
    raw[rowStart] = 0; // filter: None
    for (let x = 0; x < size; x++) {
      const [r, g, b] = pixel(x, y);
      const p = rowStart + 1 + x * 3;
      raw[p] = r;
      raw[p + 1] = g;
      raw[p + 2] = b;
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
const renderPng = (size) => {
  const cell = Math.max(1, Math.floor((size * 0.78) / COLS));
  const offsetX = Math.floor((size - cell * COLS) / 2);
  const offsetY = Math.floor((size - cell * ROWS) / 2);

  return encodePng(size, (x, y) => {
    const col = Math.floor((x - offsetX) / cell);
    const row = Math.floor((y - offsetY) / cell);
    const inside = col >= 0 && col < COLS && row >= 0 && row < ROWS;
    return inside && GLYPH[row][col] === '#' ? MARK : PLATE;
  });
};

/* ----------------------------------------------------------------- main -- */

mkdirSync(publicDir, { recursive: true });

const outputs = [
  ['favicon.svg', Buffer.from(toSvg(), 'utf8')],
  ['favicon-32.png', renderPng(32)],
  ['favicon-16.png', renderPng(16)],
  ['apple-touch-icon.png', renderPng(180)],
  ['icon-512.png', renderPng(512)],
];

for (const [name, data] of outputs) {
  writeFileSync(join(publicDir, name), data);
  console.log(`  ${name.padEnd(22)} ${String(data.length).padStart(6)} bytes`);
}
console.log('\nFavicons regenerated from BITMAPS.logo.');
