import { useCallback, useState } from 'react';
import { hasPdfMagicBytes, loadPdf } from '../lib/pdf/document.js';

const readAsArrayBuffer = (file) =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => resolve(e.target.result);
    reader.onerror = () => reject(new Error('Could not read that file.'));
    reader.readAsArrayBuffer(file);
  });

/**
 * Load and validate a single PDF, keeping name / buffer / page count together.
 *
 * Validation is two-stage on purpose: the MIME type is checked first, but a
 * file dragged from some apps arrives with an empty type, so a `%PDF-` magic
 * byte check is the real gate. Encrypted files are rejected here rather than
 * producing corrupt output three steps later.
 */
export function usePdfFile() {
  const [file, setFile] = useState(null);
  const [buffer, setBuffer] = useState(null);
  const [pageCount, setPageCount] = useState(0);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const load = useCallback(async (incoming) => {
    setError('');
    setLoading(true);
    try {
      const arrayBuffer = await readAsArrayBuffer(incoming);

      if (incoming.type && incoming.type !== 'application/pdf' && !hasPdfMagicBytes(arrayBuffer)) {
        throw new Error('That file isn’t a PDF.');
      }
      if (!hasPdfMagicBytes(arrayBuffer)) {
        throw new Error('That file isn’t a PDF — it doesn’t start with a PDF header.');
      }

      const doc = await loadPdf(arrayBuffer); // throws EncryptedPdfError / InvalidPdfError
      setFile(incoming);
      setBuffer(arrayBuffer);
      setPageCount(doc.getPageCount());
    } catch (err) {
      setFile(null);
      setBuffer(null);
      setPageCount(0);
      setError(err.message || 'Could not open that PDF.');
    } finally {
      setLoading(false);
    }
  }, []);

  const reset = useCallback(() => {
    setFile(null);
    setBuffer(null);
    setPageCount(0);
    setError('');
    setLoading(false);
  }, []);

  return { file, buffer, pageCount, error, loading, load, reset, setError };
}
