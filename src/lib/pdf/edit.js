import { StandardFonts, rgb } from 'pdf-lib';
import { loadPdf } from './document.js';

/**
 * Text edits, applied by cover-and-replace.
 *
 * What this is NOT: structural text editing. A PDF stores glyph runs at fixed
 * coordinates -- it has no paragraphs, no lines, no reflow. There is nothing to
 * re-flow when a word changes length, and embedded fonts are usually subsetted
 * to only the glyphs the document already uses, so a character that never
 * appeared may have no glyph at all.
 *
 * What this IS: paint over the old run, draw a new one in its place with a
 * matched standard font. It is the same approach the commercial online editors
 * take (Sejda's works line by line and its own docs warn that formatting can
 * shift). It works well on plain backgrounds and ordinary Latin text, and it is
 * honest about the cases where it does not -- see UNSUPPORTED_CHARS below.
 */

/**
 * Standard fonts only. Embedding the document's real font would require
 * extracting and re-subsetting it, which pdf-lib cannot do -- so the closest
 * match by family and weight is the honest ceiling here.
 */
const pickStandardFont = (fontName = '') => {
  const name = fontName.toLowerCase();
  const bold = /bold|black|heavy|semibold/.test(name);
  const italic = /italic|oblique/.test(name);

  if (/times|serif|roman|georgia|garamond|book/.test(name) && !/sans/.test(name)) {
    if (bold && italic) return StandardFonts.TimesRomanBoldItalic;
    if (bold) return StandardFonts.TimesRomanBold;
    if (italic) return StandardFonts.TimesRomanItalic;
    return StandardFonts.TimesRoman;
  }
  if (/courier|mono|consol/.test(name)) {
    if (bold && italic) return StandardFonts.CourierBoldOblique;
    if (bold) return StandardFonts.CourierBold;
    if (italic) return StandardFonts.CourierOblique;
    return StandardFonts.Courier;
  }
  if (bold && italic) return StandardFonts.HelveticaBoldOblique;
  if (bold) return StandardFonts.HelveticaBold;
  if (italic) return StandardFonts.HelveticaOblique;
  return StandardFonts.Helvetica;
};

/**
 * The standard fonts are WinAnsi-encoded, so they can only draw Latin-1.
 * Bengali, Arabic, CJK and even a stray smart quote will throw deep inside
 * pdf-lib with an unhelpful message. Detect it up front and say plainly what
 * cannot be typed, rather than failing at save time.
 */
export const unsupportedChars = (text) => {
  const bad = new Set();
  for (const char of text) {
    const code = char.codePointAt(0);
    // Printable WinAnsi range, plus tab/newline.
    if (code === 9 || code === 10 || code === 13) continue;
    if (code >= 32 && code <= 255) continue;
    bad.add(char);
  }
  return [...bad];
};

/**
 * @param {ArrayBuffer} arrayBuffer  the original document
 * @param {Array} edits  each: { pageIndex, type: 'replace'|'add', text,
 *   x, baselineY, width, fontSize, fontName, cover: {r,g,b} | null }
 */
export const applyTextEdits = async (arrayBuffer, edits) => {
  if (!edits || edits.length === 0) throw new Error('No edits to apply.');

  // Fail before touching the document, so a rejected edit never leaves a
  // half-modified file behind.
  for (const edit of edits) {
    const bad = unsupportedChars(edit.text);
    if (bad.length) {
      throw new Error(
        `Can’t write ${bad.map((c) => `"${c}"`).join(', ')} — the built-in fonts only cover Latin characters. ` +
          `Editing text in other scripts needs the original font embedded, which isn’t possible here.`,
      );
    }
  }

  const pdfDoc = await loadPdf(arrayBuffer);
  const pages = pdfDoc.getPages();
  const fontCache = new Map();

  const fontFor = async (fontName) => {
    const key = pickStandardFont(fontName);
    if (!fontCache.has(key)) fontCache.set(key, await pdfDoc.embedFont(key));
    return fontCache.get(key);
  };

  for (const edit of edits) {
    const page = pages[edit.pageIndex];
    if (!page) continue;
    const font = await fontFor(edit.fontName);

    if (edit.type === 'replace' && edit.cover) {
      // Paint out the original run. Padding is deliberate: glyphs routinely
      // overshoot the reported box (descenders, italics), and a tight rectangle
      // leaves visible fragments of the old text poking out.
      const padX = Math.max(1, edit.fontSize * 0.12);
      const padTop = edit.fontSize * 0.28;
      const padBottom = edit.fontSize * 0.26;
      page.drawRectangle({
        x: edit.x - padX,
        y: edit.baselineY - padBottom,
        width: edit.width + padX * 2,
        height: edit.fontSize + padTop,
        color: rgb(edit.cover.r / 255, edit.cover.g / 255, edit.cover.b / 255),
      });
    }

    if (edit.text.trim()) {
      page.drawText(edit.text, {
        x: edit.x,
        y: edit.baselineY,
        size: edit.fontSize,
        font,
        color: rgb(
          (edit.color?.r ?? 17) / 255,
          (edit.color?.g ?? 17) / 255,
          (edit.color?.b ?? 17) / 255,
        ),
      });
    }
  }

  return pdfDoc.save();
};
