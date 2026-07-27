import { useState } from 'react';
import { saveAs } from 'file-saver';
import FileDropzone from '../components/FileDropzone.jsx';
import PixelIcon from '../components/PixelIcon.jsx';
import { ToolShell, LoadedFile, Notice, Working } from '../components/ToolShell.jsx';
import { usePdfFile } from '../hooks/usePdfFile.js';
import { splitPdf } from '../lib/pdf/split.js';
import { TOOLS } from '../lib/tools.js';

const tool = TOOLS.find((t) => t.path === '/split');
const baseName = (name) => (name || 'document.pdf').replace(/\.pdf$/i, '');

export default function Split() {
  const pdf = usePdfFile();
  const [ranges, setRanges] = useState([
    { id: 'r1', value: '1-5' },
    { id: 'r2', value: '10-end' },
  ]);
  const [busy, setBusy] = useState(false);
  const [results, setResults] = useState(null);
  const [failure, setFailure] = useState('');

  const reset = () => {
    pdf.reset();
    setResults(null);
    setFailure('');
    setRanges([{ id: 'r1', value: '1-5' }, { id: 'r2', value: '10-end' }]);
  };

  const run = async () => {
    const values = ranges.map((r) => r.value).filter((v) => v.trim());
    if (!pdf.buffer || values.length === 0) {
      setFailure('Add at least one page range first.');
      return;
    }
    setBusy(true);
    setFailure('');
    try {
      setResults(await splitPdf(pdf.buffer, values));
    } catch (err) {
      setFailure(err.message || 'Could not split that PDF.');
    } finally {
      setBusy(false);
    }
  };

  const produced = results?.filter((r) => r.bytes) ?? [];
  const empty = results?.filter((r) => !r.bytes) ?? [];

  return (
    <ToolShell eyebrow={tool.eyebrow} title="Split PDF" blurb={tool.blurb}>
      {!pdf.file ? (
        <FileDropzone
          onFiles={([f]) => pdf.load(f)}
          title="Drop a PDF here"
          hint="or click to browse — the file stays on your device"
        />
      ) : (
        <LoadedFile
          name={pdf.file.name}
          meta={`${pdf.pageCount} pages · loaded in memory`}
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

      {/* ------------------------------------------------- range editor -- */}
      {pdf.file && !busy && !results && (
        <div className="card" style={{ marginTop: 24 }}>
          <div
            style={{
              padding: '14px 20px',
              borderBottom: 'var(--rule-width) solid var(--rule)',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              gap: 12,
            }}
          >
            <span className="label">Page ranges</span>
            <span className="muted" style={{ fontSize: 12 }}>
              e.g. 1-5, 10-end
            </span>
          </div>

          <div style={{ padding: '14px 20px', display: 'flex', flexDirection: 'column', gap: 12 }}>
            {ranges.map((range, i) => (
              <div key={range.id} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <span
                  style={{
                    width: 26,
                    height: 26,
                    border: 'var(--rule-width) solid var(--rule)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: 12,
                    fontWeight: 900,
                    flex: 'none',
                  }}
                >
                  {i + 1}
                </span>
                <input
                  className="input"
                  value={range.value}
                  aria-label={`Page range ${i + 1}`}
                  onChange={(e) =>
                    setRanges((rs) =>
                      rs.map((r) => (r.id === range.id ? { ...r, value: e.target.value } : r)),
                    )
                  }
                />
                <button
                  type="button"
                  className="btn btn--icon"
                  aria-label={`Remove range ${i + 1}`}
                  disabled={ranges.length <= 1}
                  onClick={() => setRanges((rs) => rs.filter((r) => r.id !== range.id))}
                >
                  <PixelIcon name="x" size={3} />
                </button>
              </div>
            ))}

            <button
              type="button"
              className="btn btn--sm"
              style={{ alignSelf: 'flex-start' }}
              onClick={() =>
                setRanges((rs) => [...rs, { id: `r${Date.now()}`, value: '' }])
              }
            >
              <PixelIcon name="plus" size={3} /> Add range
            </button>
          </div>

          <div
            style={{
              padding: '16px 20px',
              borderTop: 'var(--rule-width) solid var(--rule)',
              display: 'flex',
              gap: 14,
              alignItems: 'center',
              flexWrap: 'wrap',
            }}
          >
            <button type="button" className="btn btn--primary" onClick={run} disabled={busy}>
              Split PDF
            </button>
            {failure && (
              <span style={{ color: 'var(--accent)', fontSize: 13, fontWeight: 700 }}>{failure}</span>
            )}
          </div>
        </div>
      )}

      {busy && <Working label="Splitting locally…" percent={100} />}

      {/* ----------------------------------------------------- results -- */}
      {results && (
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
              Done — {produced.length} file{produced.length === 1 ? '' : 's'} ready
            </span>
            <span className="muted" style={{ fontSize: 12 }}>
              0 requests sent
            </span>
          </div>

          <div className="rowlist">
            {produced.map((result) => (
              <div
                key={result.rangeStr}
                style={{
                  padding: '16px 20px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: 16,
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 14, minWidth: 0 }}>
                  <PixelIcon name="doc" size={4} />
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontWeight: 700, fontSize: 15 }}>
                      {baseName(pdf.file?.name)}_{result.rangeStr.replace(/\s+/g, '')}.pdf
                    </div>
                    <div className="muted" style={{ fontSize: 12 }}>
                      {result.pageCount} pages · generated locally
                    </div>
                  </div>
                </div>
                <button
                  type="button"
                  className="btn btn--sm btn--primary"
                  onClick={() =>
                    saveAs(
                      new Blob([result.bytes], { type: 'application/pdf' }),
                      `${baseName(pdf.file?.name)}_${result.rangeStr.replace(/\s+/g, '')}.pdf`,
                    )
                  }
                >
                  Download
                </button>
              </div>
            ))}
          </div>

          {/* A range that matched nothing is named, not silently dropped. */}
          {empty.length > 0 && (
            <div style={{ padding: '16px 20px', borderTop: '1px solid var(--hairline)' }}>
              {empty.map((result) => (
                <div key={result.rangeStr} style={{ fontSize: 14, lineHeight: 1.5 }}>
                  <strong>“{result.rangeStr}” produced no pages.</strong>{' '}
                  <span className="muted">{result.warnings.join(' ')}</span>
                </div>
              ))}
            </div>
          )}

          <div style={{ padding: '16px 20px', borderTop: '1px solid var(--hairline)' }}>
            <button type="button" className="btn btn--sm" onClick={() => setResults(null)}>
              Change ranges
            </button>
          </div>
        </div>
      )}
    </ToolShell>
  );
}
