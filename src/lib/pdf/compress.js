import { PDFName, PDFRawStream, PDFNumber } from 'pdf-lib';
import { loadPdf } from './document.js';
import { computeFitSize } from './imagesToPdf.js';

/**
 * Image-only PDF compression.
 *
 *   load -> walk indirect objects -> find /Subtype /Image streams
 *        -> DCTDecode (JPEG)? decode to a bitmap, downscale, re-encode
 *        -> smaller? swap the stream in place
 *
 * What this deliberately does NOT do: rasterise pages. Rendering a page to an
 * image would "compress" any document to any size while destroying selectable
 * text, search and accessibility. Every tool that quietly does this produces
 * files a lawyer cannot search. We would rather return "no gain" honestly.
 *
 * Known limitation, surfaced in the UI rather than hidden: scanned documents
 * usually store pages as CCITT or JBIG2 bitmaps, not JPEG. Those are skipped,
 * so a scan often comes back barely smaller. See ROADMAP Phase 2 for the
 * quality-controls work that widens this.
 *
 * PERF NOTE: runs on the main thread with a yield between images so progress
 * can paint. Moving this into a Web Worker with OffscreenCanvas is the next
 * step (ROADMAP Phase 0.4) and is what makes very large documents comfortable.
 */

const yieldToUi = () => new Promise((resolve) => setTimeout(resolve, 0));

/** Re-encode raw JPEG bytes through a canvas at `scale`, returning smaller bytes or null. */
const recompressJpeg = async (bytes, { scale, quality }) => {
  const blob = new Blob([bytes], { type: 'image/jpeg' });
  let bitmap;
  try {
    bitmap = await createImageBitmap(blob);
  } catch {
    return null; // CMYK / progressive / otherwise undecodable — leave it alone.
  }

  const maxEdge = Math.max(bitmap.width, bitmap.height) * scale;
  const { width, height } = computeFitSize(bitmap.width, bitmap.height, maxEdge);

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  ctx.drawImage(bitmap, 0, 0, width, height);
  bitmap.close();

  const out = await new Promise((resolve) => canvas.toBlob(resolve, 'image/jpeg', quality));
  if (!out) return null;

  const buffer = new Uint8Array(await out.arrayBuffer());
  return buffer.byteLength < bytes.byteLength ? { bytes: buffer, width, height } : null;
};

export const QUALITY_PRESETS = {
  light: { scale: 1, quality: 0.82, label: 'Light — re-encode only' },
  balanced: { scale: 0.75, quality: 0.72, label: 'Balanced — recommended' },
  strong: { scale: 0.5, quality: 0.6, label: 'Strong — smallest file' },
};

export const compressPdf = async (fileArrayBuffer, { preset = 'balanced', onProgress } = {}) => {
  const { scale, quality } = QUALITY_PRESETS[preset] || QUALITY_PRESETS.balanced;
  const originalSize = fileArrayBuffer.byteLength;

  const doc = await loadPdf(fileArrayBuffer);
  const context = doc.context;

  const imageRefs = [];
  for (const [ref, obj] of context.enumerateIndirectObjects()) {
    if (!(obj instanceof PDFRawStream)) continue;
    if (obj.dict.get(PDFName.of('Subtype')) !== PDFName.of('Image')) continue;
    imageRefs.push([ref, obj]);
  }

  let replaced = 0;
  let skipped = 0;

  for (let i = 0; i < imageRefs.length; i++) {
    const [ref, stream] = imageRefs[i];
    const filter = stream.dict.get(PDFName.of('Filter'));

    // Only JPEG streams can be round-tripped through a canvas safely.
    if (filter !== PDFName.of('DCTDecode')) {
      skipped++;
    } else {
      try {
        const result = await recompressJpeg(stream.contents, { scale, quality });
        if (result) {
          const dict = stream.dict.clone(context);
          dict.set(PDFName.of('Width'), PDFNumber.of(result.width));
          dict.set(PDFName.of('Height'), PDFNumber.of(result.height));
          dict.set(PDFName.of('ColorSpace'), PDFName.of('DeviceRGB'));
          dict.set(PDFName.of('BitsPerComponent'), PDFNumber.of(8));
          dict.set(PDFName.of('Filter'), PDFName.of('DCTDecode'));
          dict.delete(PDFName.of('DecodeParms'));
          dict.delete(PDFName.of('Decode'));
          context.assign(ref, PDFRawStream.of(dict, result.bytes));
          replaced++;
        } else {
          skipped++;
        }
      } catch {
        skipped++;
      }
    }

    onProgress?.(Math.round(((i + 1) / Math.max(imageRefs.length, 1)) * 100));
    await yieldToUi();
  }

  const bytes = await doc.save({ useObjectStreams: true });
  const saved = originalSize - bytes.byteLength;

  return {
    bytes,
    originalSize,
    newSize: bytes.byteLength,
    ratio: originalSize > 0 ? saved / originalSize : 0,
    imagesFound: imageRefs.length,
    imagesRecompressed: replaced,
    imagesSkipped: skipped,
    /** True when there was nothing this technique could act on — say so plainly. */
    noGain: saved <= 0,
    /** Heuristic: images present, but none were JPEG. Classic scanned document. */
    likelyScanned: imageRefs.length > 0 && replaced === 0,
  };
};

export const formatBytes = (n) => {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(0)} KB`;
  return `${(n / (1024 * 1024)).toFixed(1)} MB`;
};
