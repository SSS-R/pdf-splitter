import { PDFDocument } from 'pdf-lib';

/** Longest edge we keep. A 12MP phone photo would otherwise make a 40MB page. */
export const MAX_EDGE = 2400;

/**
 * Downscale math, kept pure so it can be tested without a canvas.
 * Never upscales -- a small image stays its own size.
 */
export const computeFitSize = (width, height, maxEdge = MAX_EDGE) => {
  const longest = Math.max(width, height);
  if (longest <= maxEdge) return { width, height };
  const scale = maxEdge / longest;
  return {
    width: Math.round(width * scale),
    height: Math.round(height * scale),
  };
};

/**
 * Decode an image file, honouring its EXIF orientation, and re-encode it as a
 * downscaled JPEG. `imageOrientation: 'from-image'` is what stops a portrait
 * phone photo from landing sideways in the PDF.
 */
export const normalizeImage = async (file, quality = 0.82) => {
  const bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' });
  const { width, height } = computeFitSize(bitmap.width, bitmap.height);

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  ctx.drawImage(bitmap, 0, 0, width, height);
  bitmap.close();

  const blob = await new Promise((resolve) =>
    canvas.toBlob(resolve, 'image/jpeg', quality),
  );
  return { bytes: await blob.arrayBuffer(), width, height };
};

/**
 * Build a PDF with one image per page, each page sized to its image.
 * @param {File[]} imageFiles
 */
export const imagesToPdf = async (imageFiles) => {
  if (!imageFiles || imageFiles.length === 0) {
    throw new Error('Pick at least one image.');
  }

  const pdf = await PDFDocument.create();

  for (const file of imageFiles) {
    const { bytes, width, height } = await normalizeImage(file);
    const embedded = await pdf.embedJpg(bytes);
    const page = pdf.addPage([width, height]);
    page.drawImage(embedded, { x: 0, y: 0, width, height });
  }

  return pdf.save();
};
