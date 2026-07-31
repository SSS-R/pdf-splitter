import { deflateSync } from 'node:zlib';
import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';

/**
 * Test PDFs are generated, not committed.
 *
 * A checked-in binary fixture is opaque -- nobody can tell from the repo how
 * many pages it has or what is on them, and updating it means regenerating a
 * blob by hand. Building them here keeps the shape of each fixture visible in
 * the test that uses it.
 */

/** A PDF with `pages` numbered pages, so page identity is verifiable after a split. */
export async function makePdf(pages = 12, label = 'Page') {
  const doc = await PDFDocument.create();
  const font = await doc.embedFont(StandardFonts.Helvetica);
  for (let i = 1; i <= pages; i++) {
    const page = doc.addPage([420, 595]);
    page.drawText(`${label} ${i}`, {
      x: 40,
      y: 520,
      size: 32,
      font,
      color: rgb(0.07, 0.07, 0.07),
    });
  }
  return Buffer.from(await doc.save());
}

/** Playwright's setInputFiles payload shape. */
export async function pdfUpload(name, pages = 12, label = 'Page') {
  return {
    name,
    mimeType: 'application/pdf',
    buffer: await makePdf(pages, label),
  };
}

/* --------------------------------------------------------------- images -- */

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

/**
 * A real, valid PNG built from scratch.
 *
 * An earlier version of this fixture used a hand-copied base64 blob. Its header
 * parsed fine, so it looked correct, but the compressed data was corrupt and
 * the browser refused to decode it -- the app reported "the source image could
 * not be decoded" and the test failed for a reason that had nothing to do with
 * the app. Generating the bytes means the fixture cannot be subtly wrong.
 */
export function makePng(width = 8, height = 8, [r, g, b] = [230, 46, 46]) {
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 2; // colour type 2 = truecolour RGB
  // bytes 10-12 stay 0: deflate, adaptive filtering, no interlace

  const raw = Buffer.alloc(height * (1 + width * 3));
  for (let y = 0; y < height; y++) {
    const rowStart = y * (1 + width * 3);
    raw[rowStart] = 0; // filter type 0 (None)
    for (let x = 0; x < width; x++) {
      const p = rowStart + 1 + x * 3;
      raw[p] = r;
      raw[p + 1] = g;
      raw[p + 2] = b;
    }
  }

  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(raw)),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

/** Playwright setInputFiles payload for a generated PNG. */
export function pngUpload(name, width = 8, height = 8, colour) {
  return { name, mimeType: 'image/png', buffer: makePng(width, height, colour) };
}

/** Read a downloaded PDF back and report its page count. */
export async function pageCountOf(download) {
  const stream = await download.createReadStream();
  const chunks = [];
  for await (const chunk of stream) chunks.push(chunk);
  const doc = await PDFDocument.load(Buffer.concat(chunks));
  return doc.getPageCount();
}
