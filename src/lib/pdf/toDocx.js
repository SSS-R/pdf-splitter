import { openForRender } from './render.js';

/**
 * PDF -> DOCX, honestly.
 *
 * What this does: recovers the *text* and the structure that can be inferred
 * from it -- lines, paragraphs, headings, indentation -- and writes a Word
 * document you can edit.
 *
 * What it cannot do, and no client-side converter can: reproduce the layout. A
 * PDF has no paragraphs, no styles and no reading order. It has glyphs at
 * coordinates. Everything below is inference from geometry: characters that
 * share a baseline are a line, lines close together are a paragraph, text
 * noticeably larger than the body is a heading. That inference is good on prose
 * and poor on anything laid out in two dimensions, so tables come out as loose
 * lines, multi-column pages interleave, and images are dropped.
 *
 * It is a faithful text extractor with structure, not a layout converter. The
 * UI says so in those words, because calling it a converter would set an
 * expectation the format cannot meet.
 */

/* ------------------------------------------------------------ extraction -- */

/** Items sharing a baseline within this fraction of their height are one line. */
const LINE_TOLERANCE = 0.5;
/** A vertical gap this much larger than the line height starts a paragraph. */
const PARAGRAPH_GAP = 1.6;
/** Text this much larger than the body size is treated as a heading. */
const HEADING_RATIO = 1.15;

/**
 * The most common line size, which is what "body text" means.
 *
 * This was the median at first, and that is subtly the wrong statistic: in a
 * document with a lot of headings relative to prose -- a lab sheet, a spec, an
 * agenda -- the median sits between the body and the headings, and every
 * heading then measures too small to be detected. The mode is unmoved by how
 * many headings there are, which is the property this needs. Sizes are rounded
 * before counting so 10.98 and 11.0 are the same size, which in the source they
 * are.
 */
const bodySizeOf = (sizes) => {
  if (!sizes.length) return 12;
  const counts = new Map();
  for (const size of sizes) {
    const key = Math.round(size * 2) / 2; // half-point buckets
    counts.set(key, (counts.get(key) || 0) + 1);
  }
  let best = null;
  let bestCount = 0;
  for (const [size, count] of counts) {
    // Ties go to the smaller size: body text is never the largest thing here.
    if (count > bestCount || (count === bestCount && size < best)) {
      bestCount = count;
      best = size;
    }
  }
  return best;
};

/** Group one page's items into lines, top to bottom, left to right. */
const toLines = (items) => {
  const lines = [];
  for (const item of [...items].sort((a, b) => b.baselineY - a.baselineY || a.x - b.x)) {
    const last = lines[lines.length - 1];
    const sameLine =
      last && Math.abs(last.baselineY - item.baselineY) <= item.fontSize * LINE_TOLERANCE;
    if (sameLine) {
      last.items.push(item);
      last.fontSize = Math.max(last.fontSize, item.fontSize);
    } else {
      lines.push({ baselineY: item.baselineY, fontSize: item.fontSize, items: [item] });
    }
  }

  return lines.map((line) => {
    const sorted = [...line.items].sort((a, b) => a.x - b.x);
    let text = '';
    let previous = null;
    for (const item of sorted) {
      // PDF.js splits a line wherever the text operator did, which is not where
      // the words are. Insert a space only when the horizontal gap is wide
      // enough to be one -- otherwise "Confi" + "guration" becomes two words.
      if (previous) {
        const gap = item.x - (previous.x + previous.width);
        if (gap > item.fontSize * 0.18 && !/\s$/.test(text)) text += ' ';
      }
      text += item.str ?? item.text ?? '';
      previous = item;
    }
    return { text: text.replace(/\s+/g, ' ').trim(), fontSize: line.fontSize, x: sorted[0].x, baselineY: line.baselineY };
  }).filter((line) => line.text);
};

/**
 * Lines -> blocks. A block is a heading or a paragraph, which is as much
 * structure as coordinates can honestly support.
 */
export async function extractBlocks(arrayBuffer, { onProgress } = {}) {
  const doc = await openForRender(arrayBuffer);
  try {
    const pages = [];
    for (let n = 1; n <= doc.pageCount; n++) {
      const { items } = await doc.textItems(n);
      pages.push(toLines(items));
      onProgress?.(Math.round((n / doc.pageCount) * 100));
    }

    const bodySize = bodySizeOf(pages.flat().map((l) => l.fontSize));
    const blocks = [];

    pages.forEach((lines, pageIndex) => {
      if (pageIndex > 0 && lines.length) blocks.push({ type: 'pagebreak' });
      let previous = null;

      for (const line of lines) {
        const isHeading = line.fontSize >= bodySize * HEADING_RATIO;
        const gap = previous ? previous.baselineY - line.baselineY : 0;
        const startsParagraph =
          !previous ||
          isHeading ||
          previous.isHeading ||
          gap > line.fontSize * PARAGRAPH_GAP ||
          Math.abs(line.x - previous.x) > line.fontSize; // an indent change

        if (startsParagraph) {
          blocks.push({
            type: isHeading ? 'heading' : 'paragraph',
            text: line.text,
            size: line.fontSize,
            indent: line.x,
          });
        } else {
          // Continuation of the same paragraph: a PDF line break is a layout
          // artefact, not a sentence boundary, so rejoin it.
          blocks[blocks.length - 1].text += ` ${line.text}`;
        }
        previous = { ...line, isHeading };
      }
    });

    return { blocks, bodySize, pageCount: doc.pageCount };
  } finally {
    doc.destroy();
  }
}

/* ------------------------------------------------------------------ docx -- */

const escapeXml = (s) =>
  s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')
    // XML 1.0 forbids most control characters outright; a stray one makes
    // Word refuse the whole file rather than skip the character. Tab, LF and
    // CR are the only ones it permits.
    // eslint-disable-next-line no-control-regex
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, '');

/**
 * Direct formatting rather than named styles.
 *
 * A styles.xml part would let us say Heading1, but then the document depends
 * on that part being correct or Word silently renders everything as Normal.
 * Bold and an explicit half-point size always render, in Word, LibreOffice and
 * Google Docs alike, with three files in the package instead of five.
 */
const paragraphXml = (block, bodySize) => {
  if (block.type === 'pagebreak') {
    return '<w:p><w:r><w:br w:type="page"/></w:r></w:p>';
  }
  const halfPoints = Math.round((block.size || bodySize) * 2);
  const runProps = block.type === 'heading'
    ? `<w:rPr><w:b/><w:sz w:val="${halfPoints}"/></w:rPr>`
    : `<w:rPr><w:sz w:val="${halfPoints}"/></w:rPr>`;
  const spacing = block.type === 'heading'
    ? '<w:spacing w:before="240" w:after="120"/>'
    : '<w:spacing w:after="160"/>';
  return `<w:p><w:pPr>${spacing}</w:pPr><w:r>${runProps}<w:t xml:space="preserve">${escapeXml(block.text)}</w:t></w:r></w:p>`;
};

const documentXml = (blocks, bodySize) =>
  `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body>${blocks
    .map((b) => paragraphXml(b, bodySize))
    .join('')}<w:sectPr><w:pgSz w:w="11906" w:h="16838"/><w:pgMar w:top="1134" w:right="1134" w:bottom="1134" w:left="1134"/></w:sectPr></w:body></w:document>`;

const CONTENT_TYPES = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/></Types>`;

const ROOT_RELS = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/></Relationships>`;

/* ------------------------------------------------------------------- zip -- */

const CRC_TABLE = (() => {
  const table = new Int32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    table[n] = c;
  }
  return table;
})();

const crc32 = (bytes) => {
  let c = 0xffffffff;
  for (let i = 0; i < bytes.length; i++) c = CRC_TABLE[(c ^ bytes[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
};

/**
 * Minimal ZIP writer, stored (uncompressed).
 *
 * A .docx is a ZIP of XML parts, so this is the whole "document format" layer.
 * Stored rather than deflated because the payload is a few kilobytes of text
 * and every reader accepts it -- it keeps this to about eighty lines with no
 * dependency, on a project that has been deliberate about not adding any.
 */
const zip = (files) => {
  const encoder = new TextEncoder();
  const locals = [];
  const central = [];
  let offset = 0;

  const u16 = (n) => [n & 0xff, (n >> 8) & 0xff];
  const u32 = (n) => [n & 0xff, (n >> 8) & 0xff, (n >> 16) & 0xff, (n >>> 24) & 0xff];

  for (const [name, text] of files) {
    const nameBytes = encoder.encode(name);
    const data = encoder.encode(text);
    const sum = crc32(data);

    // Bit 11 marks the name as UTF-8, which matters for nothing here but is
    // correct and costs a bit.
    const header = [
      ...u32(0x04034b50), ...u16(20), ...u16(0x0800), ...u16(0),
      ...u16(0), ...u16(0), ...u32(sum), ...u32(data.length), ...u32(data.length),
      ...u16(nameBytes.length), ...u16(0),
    ];
    locals.push(new Uint8Array(header), nameBytes, data);

    central.push(
      new Uint8Array([
        ...u32(0x02014b50), ...u16(20), ...u16(20), ...u16(0x0800), ...u16(0),
        ...u16(0), ...u16(0), ...u32(sum), ...u32(data.length), ...u32(data.length),
        ...u16(nameBytes.length), ...u16(0), ...u16(0), ...u16(0), ...u16(0),
        ...u32(0), ...u32(offset),
      ]),
      nameBytes,
    );

    offset += header.length + nameBytes.length + data.length;
  }

  const centralSize = central.reduce((n, part) => n + part.length, 0);
  const end = new Uint8Array([
    ...u32(0x06054b50), ...u16(0), ...u16(0),
    ...u16(files.length), ...u16(files.length),
    ...u32(centralSize), ...u32(offset), ...u16(0),
  ]);

  const parts = [...locals, ...central, end];
  const total = parts.reduce((n, part) => n + part.length, 0);
  const out = new Uint8Array(total);
  let at = 0;
  for (const part of parts) {
    out.set(part, at);
    at += part.length;
  }
  return out;
};

/* ------------------------------------------------------------------ main -- */

/**
 * @param {ArrayBuffer} arrayBuffer
 * @returns {{bytes: Uint8Array, blocks: number, words: number, pageCount: number, empty: boolean}}
 */
export async function pdfToDocx(arrayBuffer, { onProgress } = {}) {
  const { blocks, bodySize, pageCount } = await extractBlocks(arrayBuffer, { onProgress });
  const textBlocks = blocks.filter((b) => b.type !== 'pagebreak');
  const words = textBlocks.reduce((n, b) => n + b.text.split(/\s+/).filter(Boolean).length, 0);

  const bytes = zip([
    ['[Content_Types].xml', CONTENT_TYPES],
    ['_rels/.rels', ROOT_RELS],
    ['word/document.xml', documentXml(blocks, bodySize)],
  ]);

  return { bytes, blocks: textBlocks.length, words, pageCount, empty: textBlocks.length === 0 };
}
