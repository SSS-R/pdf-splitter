import { useEffect, useState } from 'react';
import { saveAs } from 'file-saver';
import FileDropzone from '../components/FileDropzone.jsx';
import PixelIcon from '../components/PixelIcon.jsx';
import { ToolShell, LoadedFile, Notice, Working } from '../components/ToolShell.jsx';
import { usePdfFile } from '../hooks/usePdfFile.js';
import { applyPagePlan, initialPlan } from '../lib/pdf/reorder.js';
import { TOOLS } from '../lib/tools.js';

const tool = TOOLS.find((t) => t.path === '/reorder');

export default function Reorder() {
  const pdf = usePdfFile();
  const [plan, setPlan] = useState([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    setPlan(pdf.pageCount ? initialPlan(pdf.pageCount) : []);
  }, [pdf.pageCount]);

  const move = (i, delta) =>
    setPlan((prev) => {
      const next = [...prev];
      const target = i + delta;
      if (target < 0 || target >= next.length) return prev;
      [next[i], next[target]] = [next[target], next[i]];
      return next;
    });

  const rotate = (i) =>
    setPlan((prev) =>
      prev.map((p, k) => (k === i ? { ...p, rotation: (p.rotation + 90) % 360 } : p)),
    );

  const drop = (i) => setPlan((prev) => prev.filter((_, k) => k !== i));

  const run = async () => {
    setBusy(true);
    setError('');
    try {
      const bytes = await applyPagePlan(pdf.buffer, plan);
      saveAs(
        new Blob([bytes], { type: 'application/pdf' }),
        `${(pdf.file?.name || 'document.pdf').replace(/\.pdf$/i, '')}-reordered.pdf`,
      );
    } catch (err) {
      setError(err.message || 'Could not rebuild that PDF.');
    } finally {
      setBusy(false);
    }
  };

  const reset = () => {
    pdf.reset();
    setPlan([]);
    setError('');
  };

  return (
    <ToolShell eyebrow={tool.eyebrow} title="Reorder" blurb={tool.blurb} path={tool.path}>
      {!pdf.file ? (
        <FileDropzone onFiles={([f]) => pdf.load(f)} hint="or click to browse — pages stay on your device" />
      ) : (
        <LoadedFile
          icon="reorder"
          name={pdf.file.name}
          meta={`${pdf.pageCount} pages · ${plan.length} kept`}
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
      {error && <Notice heading="Nothing to build" body={error} />}

      {plan.length > 0 && (
        <div className="card" style={{ marginTop: 24 }}>
          <div
            style={{
              padding: '14px 20px',
              borderBottom: 'var(--rule-width) solid var(--rule)',
              display: 'flex',
              justifyContent: 'space-between',
              gap: 12,
            }}
          >
            <span className="label">Page plan</span>
            <span className="muted" style={{ fontSize: 12 }}>
              Deleting a page just leaves it out
            </span>
          </div>

          <div
            style={{
              padding: 20,
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(132px, 1fr))',
              gap: 14,
            }}
          >
            {plan.map((page, i) => (
              <div
                key={page.id}
                className="card pixel"
                style={{ padding: 12, display: 'flex', flexDirection: 'column', gap: 10 }}
              >
                <div
                  style={{
                    aspectRatio: '3 / 4',
                    border: '1px solid var(--hairline)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontWeight: 900,
                    fontSize: 20,
                    transform: `rotate(${page.rotation}deg)`,
                    transition: 'transform var(--tick) steps(2)',
                  }}
                >
                  {page.index + 1}
                </div>
                <div style={{ display: 'flex', gap: 6, justifyContent: 'center', flexWrap: 'wrap' }}>
                  <button type="button" className="btn btn--icon" aria-label="Move earlier" disabled={i === 0} onClick={() => move(i, -1)} style={{ width: 30, height: 30, transform: 'rotate(180deg)' }}>
                    <PixelIcon name="arrow" size={2} />
                  </button>
                  <button type="button" className="btn btn--icon" aria-label="Rotate" onClick={() => rotate(i)} style={{ width: 30, height: 30 }}>
                    <PixelIcon name="rotate" size={2} />
                  </button>
                  <button type="button" className="btn btn--icon" aria-label="Delete page" onClick={() => drop(i)} style={{ width: 30, height: 30 }}>
                    <PixelIcon name="trash" size={2} />
                  </button>
                  <button type="button" className="btn btn--icon" aria-label="Move later" disabled={i === plan.length - 1} onClick={() => move(i, 1)} style={{ width: 30, height: 30 }}>
                    <PixelIcon name="arrow" size={2} />
                  </button>
                </div>
              </div>
            ))}
          </div>

          <div style={{ padding: '16px 20px', borderTop: 'var(--rule-width) solid var(--rule)', display: 'flex', gap: 14, flexWrap: 'wrap' }}>
            <button type="button" className="btn btn--primary" onClick={run} disabled={busy}>
              Build &amp; download
            </button>
            <button type="button" className="btn btn--sm" onClick={() => setPlan(initialPlan(pdf.pageCount))}>
              Reset plan
            </button>
          </div>
        </div>
      )}

      {busy && <Working label="Rebuilding locally…" percent={100} />}
    </ToolShell>
  );
}
