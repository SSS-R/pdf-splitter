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
/** Family/weight/slant read off a PDF font name, shared by the editor preview. */
export const describeFont = (fontName = '') => {
  const name = fontName.toLowerCase();
  const bold = /bold|black|heavy|semibold/.test(name);
  const italic = /italic|oblique/.test(name);
  let family = 'sans';
  if (/times|serif|roman|georgia|garamond|book/.test(name) && !/sans/.test(name)) family = 'serif';
  else if (/courier|mono|consol/.test(name)) family = 'mono';
  return { family, bold, italic };
};

/**
 * The same font choice expressed for canvas, so the on-screen preview matches
 * what gets written into the file. One mapping, two consumers -- if these ever
 * drift, the preview silently starts lying.
 */
export const cssFontFor = (fontName, sizePx) => {
  const { family, bold, italic } = describeFont(fontName);
  const stack =
    family === 'serif'
      ? '"Times New Roman", Times, serif'
      : family === 'mono'
        ? '"Courier New", Courier, monospace'
        : 'Helvetica, Arial, sans-serif';
  return `${italic ? 'italic ' : ''}${bold ? 'bold ' : ''}${sizePx}px ${stack}`;
};

/**
 * The cover rectangle for a run, in PDF units.
 *
 * Computed in one place because the editor draws it on screen and pdf-lib
 * draws it into the file; both must agree exactly. Padding is deliberate --
 * glyphs overshoot their reported box (descenders, italics) and a tight
 * rectangle leaves fragments of the old text visible.
 */
export const defaultCoverRect = ({ x, baselineY, width, fontSize }) => ({
  coverX: x - fontSize * 0.12,
  coverY: baselineY - fontSize * 0.26,
  coverW: width + fontSize * 0.24,
  coverH: fontSize * 1.28,
});

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
 * Characters WinAnsi genuinely cannot encode.
 *
 * An earlier version treated "codepoint above 255" as unsupported, which was
 * wrong and blocked ordinary typing: WinAnsi is CP1252, not Latin-1, and its
 * 0x80-0x9F range holds exactly the punctuation people actually use --
 * curly quotes, en and em dashes, the ellipsis, the bullet, the euro. Typing an
 * apostrophe that any word processor had autocorrected to U+2019 produced a
 * refusal for a character pdf-lib encodes without complaint.
 *
 * The set below is the CP1252 table, so this answers the same question the
 * encoder does. Verified against pdf-lib character by character.
 */
const CP1252_HIGH = new Set([
  0x20ac, 0x201a, 0x0192, 0x201e, 0x2026, 0x2020, 0x2021, 0x02c6, 0x2030,
  0x0160, 0x2039, 0x0152, 0x017d, 0x2018, 0x2019, 0x201c, 0x201d, 0x2022,
  0x2013, 0x2014, 0x02dc, 0x2122, 0x0161, 0x203a, 0x0153, 0x017e, 0x0178,
]);

export const unsupportedChars = (text) => {
  const bad = new Set();
  for (const char of text) {
    const code = char.codePointAt(0);
    if (code === 9 || code === 10 || code === 13) continue; // tab, newlines
    if (code >= 0x20 && code <= 0x7e) continue; // ASCII printable
    if (code >= 0xa0 && code <= 0xff) continue; // Latin-1 supplement
    if (CP1252_HIGH.has(code)) continue; // the typographic set
    bad.add(char);
  }
  return [...bad];
};

/**
 * @param {ArrayBuffer} arrayBuffer  the original document
 * @param {Array} edits  text edits as above, plus image edits:
 *   { pageIndex, type: 'image', bytes, format: 'jpeg'|'png', x, y, width, height }
 */
export const applyEdits = async (arrayBuffer, edits) => {
  if (!edits || edits.length === 0) throw new Error('No edits to apply.');

  // Fail before touching the document, so a rejected edit never leaves a
  // half-modified file behind.
  for (const edit of edits) {
    if (edit.type === 'image') continue;
    const bad = unsupportedChars(edit.text);
    if (bad.length) {
      // Name the text, not just the character: with several edits pending, "can't
      // write X" gave no clue which one to go and fix.
      const snippet = edit.text.length > 32 ? `${edit.text.slice(0, 32)}…` : edit.text;
      throw new Error(
        `Can’t write ${bad.map((c) => `"${c}"`).join(', ')} in “${snippet}” — the built-in fonts cover ` +
          `Latin characters and common punctuation only. Other scripts need the original font embedded, ` +
          `which isn’t possible here.`,
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

    if (edit.type === 'imageCover') {
      // Removing a picture means painting the page colour over it. As with
      // text, the original is hidden rather than deleted and is still
      // extractable -- the UI says so.
      page.drawRectangle({
        x: edit.x,
        y: edit.y,
        width: edit.width,
        height: edit.height,
        color: rgb(edit.cover.r / 255, edit.cover.g / 255, edit.cover.b / 255),
      });
      continue;
    }

    if (edit.type === 'image') {
      // Drawn over the existing artwork rather than swapping the underlying
      // XObject. Replacing the stream in place would mean matching its colour
      // space, filters and bit depth, and getting any of that wrong corrupts
      // the page. Painting on top is exact for a rectangle, and the honest cost
      // -- the original picture stays in the file -- is the same trade the text
      // editor already makes and discloses.
      const embedded =
        edit.format === 'png' ? await pdfDoc.embedPng(edit.bytes) : await pdfDoc.embedJpg(edit.bytes);
      page.drawImage(embedded, {
        x: edit.x,
        y: edit.y,
        width: edit.width,
        height: edit.height,
      });
      continue;
    }

    const font = await fontFor(edit.fontName);

    if (edit.type === 'replace' && edit.cover) {
      // The rectangle is supplied by the caller (defaultCoverRect, possibly
      // resized by the user) rather than recomputed here, so what was previewed
      // on screen is exactly what gets painted.
      const fallback = defaultCoverRect(edit);
      const rect = {
        coverX: edit.coverX ?? fallback.coverX,
        coverY: edit.coverY ?? fallback.coverY,
        coverW: edit.coverW ?? fallback.coverW,
        coverH: edit.coverH ?? fallback.coverH,
      };
      page.drawRectangle({
        x: rect.coverX,
        y: rect.coverY,
        width: rect.coverW,
        height: rect.coverH,
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
