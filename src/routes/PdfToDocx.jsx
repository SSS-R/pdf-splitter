import { useState } from 'react';
import { saveAs } from 'file-saver';
import FileDropzone from '../components/FileDropzone.jsx';
import { ToolShell, LoadedFile, Notice, Working } from '../components/ToolShell.jsx';
import { usePdfFile } from '../hooks/usePdfFile.js';
import { pdfToDocx } from '../lib/pdf/toDocx.js';
import { recordUse } from '../hooks/useUsageStats.js';
import { TOOLS } from '../lib/tools.js';

const tool = TOOLS.find((t) => t.path === '/pdf-to-docx');

export default function PdfToDocx() {
  const pdf = usePdfFile();
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState(0);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');

  const run = async () => {
    setBusy(true);
    setError('');
    setProgress(0);
    try {
      setResult(await pdfToDocx(pdf.buffer, { onProgress: setProgress }));
      recordUse('pdf-to-docx');
    } catch (err) {
      setError(err.message || 'Could not read the text in that PDF.');
    } finally {
      setBusy(false);
    }
  };

  const reset = () => {
    pdf.reset();
    setResult(null);
    setError('');
  };

  const baseName = (pdf.file?.name || 'document.pdf').replace(/\.pdf$/i, '');

  return (
    <ToolShell title="PDF → Word" blurb={tool.blurb} path={tool.path}>
      {!pdf.file ? (
        <FileDropzone
          onFiles={([f]) => pdf.load(f)}
          title="Drop a PDF here"
          hint="or click to browse — the file stays on your device"
        />
      ) : (
        <LoadedFile
          icon="doc"
          name={pdf.file.name}
          meta={`${pdf.pageCount} pages · read in memory`}
          onRemove={reset}
        />
      )}

      {pdf.error && (
        <Notice
          heading={pdf.error.includes('password') ? 'This PDF is password-protected' : 'Can’t open that file'}
          body={pdf.error}
          action={
            <button type="button" className="btn btn--sm" style={{ marginTop: 16 }} onClick={reset}>
              Try another file
            </button>
          }
        />
      )}
      {error && <Notice heading="Couldn’t convert that" body={error} />}

      {pdf.file && !busy && !result && (
        <div className="card" style={{ marginTop: 24, padding: '20px' }}>
          <button type="button" className="btn btn--primary" onClick={run}>
            Convert to Word
          </button>
          <p className="muted" style={{ fontSize: 13, lineHeight: 1.55, margin: '16px 0 0' }}>
            You’ll get the text, headings and paragraphs as an editable .docx. Layout, tables and
            images are not carried over — see below for why that isn’t a limitation we can code
            around.
          </p>
        </div>
      )}

      {busy && <Working label="Reading text locally…" percent={progress} />}

      {result && (
        <div className="card" style={{ marginTop: 24 }}>
          <div
            className="band"
            style={{
              padding: '14px 20px',
              borderBottom: 'var(--rule-width) solid var(--rule)',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              gap: 12,
            }}
          >
            <span style={{ fontSize: 13, fontWeight: 900, letterSpacing: '0.08em', textTransform: 'uppercase' }}>
              {result.empty ? 'No text found' : 'Ready'}
            </span>
            <span className="muted" style={{ fontSize: 12 }}>
              0 requests sent
            </span>
          </div>

          {result.empty ? (
            <div style={{ padding: '22px 20px' }}>
              <p style={{ margin: 0, fontSize: 15, lineHeight: 1.6 }}>
                <strong>This PDF has no text layer.</strong>{' '}
                <span className="muted">
                  It’s a scan — a picture of a page rather than text — so there is nothing to
                  extract. Converting it would need OCR, which this tool doesn’t do. Try selecting
                  text in your PDF reader: if nothing highlights, this is why.
                </span>
              </p>
            </div>
          ) : (
            <div style={{ padding: '20px', display: 'flex', alignItems: 'center', gap: 20, flexWrap: 'wrap' }}>
              <div>
                <div style={{ fontSize: 34, fontWeight: 900, lineHeight: 1 }}>{result.words}</div>
                <div className="label muted" style={{ fontSize: 12, marginTop: 4 }}>
                  words · {result.blocks} paragraphs · {result.pageCount} pages
                </div>
              </div>
              <button
                type="button"
                className="btn btn--primary"
                style={{ marginLeft: 'auto' }}
                onClick={() =>
                  saveAs(
                    new Blob([result.bytes], {
                      type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
                    }),
                    `${baseName}.docx`,
                  )
                }
              >
                Download .docx
              </button>
            </div>
          )}

          <div style={{ padding: '16px 20px', borderTop: '1px solid var(--hairline)', display: 'flex', gap: 12 }}>
            <span style={{ width: 10, height: 10, background: 'var(--accent)', marginTop: 5, flex: 'none' }} />
            <p style={{ margin: 0, fontSize: 13, lineHeight: 1.55 }}>
              <strong>Text and structure, not layout.</strong>{' '}
              <span className="muted">
                Paragraphs and headings survive. Columns, tables, images and exact positioning do
                not — a PDF stores glyphs at coordinates, not a document, so anything laid out in
                two dimensions has to be guessed at and we would rather not guess.
              </span>
            </p>
          </div>

          <div style={{ padding: '16px 20px', borderTop: '1px solid var(--hairline)' }}>
            <button type="button" className="btn btn--sm" onClick={() => setResult(null)}>
              Convert again
            </button>
          </div>
        </div>
      )}
    </ToolShell>
  );
}
