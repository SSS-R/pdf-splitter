import { useState } from 'react';
import { Link } from 'react-router-dom';
import { saveAs } from 'file-saver';
import FileDropzone from '../components/FileDropzone.jsx';
import { ToolShell, LoadedFile, Notice, Working } from '../components/ToolShell.jsx';
import { usePdfFile } from '../hooks/usePdfFile.js';
import { usePro } from '../hooks/usePro.js';
import { compressPdf, formatBytes, QUALITY_PRESETS } from '../lib/pdf/compress.js';
import { recordUse } from '../hooks/useUsageStats.js';
import { TOOLS } from '../lib/tools.js';

const tool = TOOLS.find((t) => t.path === '/compress');

export default function Compress() {
  const pdf = usePdfFile();
  const { isPro } = usePro();
  const [preset, setPreset] = useState('balanced');
  const [progress, setProgress] = useState(null);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');

  const reset = () => {
    pdf.reset();
    setResult(null);
    setProgress(null);
    setError('');
  };

  const run = async () => {
    setProgress(0);
    setResult(null);
    setError('');
    try {
      setResult(await compressPdf(pdf.buffer, { preset, onProgress: setProgress }));
      recordUse('compress');
    } catch (err) {
      setError(err.message || 'Could not compress that PDF.');
    } finally {
      setProgress(null);
    }
  };

  return (
    <ToolShell eyebrow={tool.eyebrow} title="Compress" blurb={tool.blurb} path={tool.path}>
      {!pdf.file ? (
        <FileDropzone onFiles={([f]) => pdf.load(f)} hint="or click to browse — analysed on your device" />
      ) : (
        <LoadedFile
          icon="compress"
          name={pdf.file.name}
          meta={`${formatBytes(pdf.buffer.byteLength)} · ${pdf.pageCount} pages · in memory`}
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
      {error && <Notice heading="Something went wrong" body={error} />}

      {pdf.file && progress === null && !result && (
        <div className="card" style={{ marginTop: 24 }}>
          <div style={{ padding: '14px 20px', borderBottom: 'var(--rule-width) solid var(--rule)', display: 'flex', justifyContent: 'space-between', gap: 12 }}>
            <span className="label">Strength</span>
            {!isPro && (
              <span className="muted" style={{ fontSize: 12 }}>
                Quality controls are a{' '}
                <Link to="/pricing" style={{ color: 'var(--accent)', fontWeight: 700 }}>
                  Pro
                </Link>{' '}
                feature
              </span>
            )}
          </div>

          <div style={{ padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: 10 }}>
            {Object.entries(QUALITY_PRESETS).map(([key, cfg]) => {
              const locked = !isPro && key !== 'balanced';
              return (
                <label
                  key={key}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 12,
                    fontSize: 15,
                    fontWeight: 700,
                    opacity: locked ? 0.45 : 1,
                    cursor: locked ? 'not-allowed' : 'pointer',
                  }}
                >
                  <input
                    type="radio"
                    name="preset"
                    checked={preset === key}
                    disabled={locked}
                    onChange={() => setPreset(key)}
                  />
                  {cfg.label}
                  {locked && <span className="muted" style={{ fontSize: 12, fontWeight: 400 }}>· Pro</span>}
                </label>
              );
            })}
          </div>

          <div style={{ padding: '16px 20px', borderTop: 'var(--rule-width) solid var(--rule)' }}>
            <button type="button" className="btn btn--primary" onClick={run}>
              Compress
            </button>
          </div>
        </div>
      )}

      {progress !== null && <Working label="Analysing locally…" percent={progress} />}

      {/* ------------------------------------------- honest result states -- */}
      {result && result.likelyScanned && (
        <Notice
          neutral
          heading="This looks like a scanned document"
          body={
            <>
              Its pages are stored as scanner bitmaps, not JPEG photos, so our compressor can’t
              shrink them yet — we found {result.imagesFound} image
              {result.imagesFound === 1 ? '' : 's'} and could re-encode none of them. We’d rather
              tell you than pretend. Re-scanning at a lower DPI, or running an OCR pass, would do
              more than we can here.
            </>
          }
          action={
            <button type="button" className="btn btn--sm" style={{ marginTop: 16 }} onClick={reset}>
              Try another file
            </button>
          }
        />
      )}

      {result && !result.likelyScanned && result.noGain && (
        <Notice
          neutral
          heading="Already about as small as it gets"
          body="We couldn’t make this meaningfully smaller without degrading it. That usually means it’s mostly text, or its images are already well compressed. Your original is the better file — keep it."
          action={
            <button type="button" className="btn btn--sm" style={{ marginTop: 16 }} onClick={reset}>
              Try another file
            </button>
          }
        />
      )}

      {result && !result.noGain && (
        <div className="card" style={{ marginTop: 24 }}>
          <div className="band" style={{ padding: '14px 20px', fontSize: 13, fontWeight: 900, letterSpacing: '0.08em', textTransform: 'uppercase' }}>
            Compressed
          </div>
          <div style={{ padding: '28px 24px', display: 'flex', alignItems: 'baseline', gap: 20, flexWrap: 'wrap' }}>
            <span style={{ fontSize: 40, fontWeight: 900 }}>{formatBytes(result.originalSize)}</span>
            <span className="muted" style={{ fontSize: 26 }}>→</span>
            <span style={{ fontSize: 40, fontWeight: 900, color: 'var(--accent)' }}>
              {formatBytes(result.newSize)}
            </span>
            <span style={{ border: 'var(--rule-width) solid var(--rule)', padding: '6px 12px', fontSize: 16, fontWeight: 900 }}>
              −{Math.round(result.ratio * 100)}%
            </span>
          </div>
          <div className="muted" style={{ padding: '0 24px 16px', fontSize: 13 }}>
            {result.imagesRecompressed} of {result.imagesFound} images re-encoded
            {result.imagesSkipped > 0 && ` · ${result.imagesSkipped} left untouched`} · text stayed
            selectable
          </div>
          <div style={{ padding: '0 24px 20px', display: 'flex', gap: 14, flexWrap: 'wrap' }}>
            <button
              type="button"
              className="btn btn--primary"
              onClick={() =>
                saveAs(
                  new Blob([result.bytes], { type: 'application/pdf' }),
                  `${(pdf.file?.name || 'document.pdf').replace(/\.pdf$/i, '')}-compressed.pdf`,
                )
              }
            >
              Download
            </button>
            <button type="button" className="btn btn--sm" onClick={reset}>
              Another file
            </button>
          </div>
        </div>
      )}
    </ToolShell>
  );
}
