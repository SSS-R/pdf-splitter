import { PDFDocument } from 'pdf-lib';

/** Free tier merges up to this many files; Pro lifts the cap. */
export const FREE_MERGE_LIMIT = 3;

/** Thrown when a PDF is password-protected. Callers surface this verbatim. */
export class EncryptedPdfError extends Error {
  constructor() {
    super('This PDF is password-protected. Remove the password first — we can’t open an encrypted document, and we won’t ask you to hand us the key.');
    this.name = 'EncryptedPdfError';
  }
}

/** Thrown when bytes aren't a readable PDF at all. */
export class InvalidPdfError extends Error {
  constructor() {
    super('That file isn’t a readable PDF. It may be corrupt or saved in another format.');
    this.name = 'InvalidPdfError';
  }
}

/**
 * Load a PDF, refusing encrypted ones.
 *
 * The old code passed `ignoreEncryption: true`, which let password-protected
 * files through and produced corrupt output further down the pipeline. Failing
 * loudly here is the whole point.
 */
export const loadPdf = async (arrayBuffer) => {
  try {
    return await PDFDocument.load(arrayBuffer, { ignoreEncryption: false });
  } catch (err) {
    const msg = String(err?.message || '').toLowerCase();
    if (msg.includes('encrypt')) throw new EncryptedPdfError();
    throw new InvalidPdfError();
  }
};

/**
 * True when the bytes start with the `%PDF-` magic number.
 *
 * Browsers report an empty MIME type for files dragged from some sources, so
 * MIME alone rejects valid PDFs. This is the fallback check.
 */
export const hasPdfMagicBytes = (arrayBuffer) => {
  const head = new Uint8Array(arrayBuffer.slice(0, 5));
  return (
    head[0] === 0x25 && // %
    head[1] === 0x50 && // P
    head[2] === 0x44 && // D
    head[3] === 0x46 && // F
    head[4] === 0x2d //   -
  );
};
