import { useState } from 'react';
import { Link } from 'react-router-dom';
import { saveAs } from 'file-saver';
import FileDropzone from '../components/FileDropzone.jsx';
import PixelIcon from '../components/PixelIcon.jsx';
import { ToolShell, Notice, Working } from '../components/ToolShell.jsx';
import { usePro } from '../hooks/usePro.js';
import { mergePdfs } from '../lib/pdf/merge.js';
import { FREE_MERGE_LIMIT, hasPdfMagicBytes, loadPdf } from '../lib/pdf/document.js';
import { recordUse } from '../hooks/useUsageStats.js';
import { TOOLS } from '../lib/tools.js';

const tool = TOOLS.find((t) => t.path === '/merge');

const readBuffer = (file) =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => resolve(e.target.result);
    reader.onerror = () => reject(new Error('Could not read that file.'));
    reader.readAsArrayBuffer(file);
  });

export default function Merge() {
  const { isPro } = usePro();
  const [items, setItems] = useState([]); // { id, name, buffer, pages }
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [merged, setMerged] = useState(null);

  const limit = isPro ? Infinity : FREE_MERGE_LIMIT;
  const atLimit = items.length >= limit;

  const addFiles = async (files) => {
    setError('');
    setMerged(null);
    const room = limit - items.length;
    if (room <= 0) return;

    const accepted = [];
    for (const file of files.slice(0, room)) {
      try {
        const buffer = await readBuffer(file);
        if (!hasPdfMagicBytes(buffer)) throw new Error(`“${file.name}” isn’t a PDF.`);
        const doc = await loadPdf(buffer);
        accepted.push({
          id: `${file.name}-${Date.now()}-${Math.random()}`,
          name: file.name,
          buffer,
          pages: doc.getPageCount(),
        });
      } catch (err) {
        setError(err.message);
      }
    }
    setItems((prev) => [...prev, ...accepted]);
    if (files.length > room) {
      setError(
        `Free merges up to ${FREE_MERGE_LIMIT} files at a time. Pro lifts the cap — the rest were skipped.`,
      );
    }
  };

  const move = (index, delta) =>
    setItems((prev) => {
      const next = [...prev];
      const target = index + delta;
      if (target < 0 || target >= next.length) return prev;
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });

  const run = async () => {
    setBusy(true);
    setError('');
    try {
      setMerged(await mergePdfs(items.map((i) => i.buffer)));
      recordUse('merge');
    } catch (err) {
      setError(err.message || 'Could not merge those PDFs.');
    } finally {
      setBusy(false);
    }
  };

  const totalPages = items.reduce((sum, i) => sum + i.pages, 0);

  return (
    <ToolShell title="Merge PDF" blurb={tool.blurb} path={tool.path}>
      {!atLimit && (
        <FileDropzone
          multiple
          onFiles={addFiles}
          title={items.length ? 'Add another PDF' : 'Drop PDFs here'}
          hint={
            isPro
              ? 'or click to browse — batch enabled, no file limit'
              : `or click to browse — up to ${FREE_MERGE_LIMIT} files on Free`
          }
        />
      )}

      {error && <Notice heading="Heads up" body={error} neutral />}

      {items.length > 0 && (
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
            <span className="label">Merge order</span>
            <span className="muted" style={{ fontSize: 12 }}>
              {items.length} files · {totalPages} pages
            </span>
          </div>

          <div className="rowlist">
            {items.map((item, i) => (
              <div
                key={item.id}
                style={{
                  padding: '14px 20px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 14,
                  justifyContent: 'space-between',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 14, minWidth: 0 }}>
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
                  <div style={{ minWidth: 0 }}>
                    <div
                      style={{
                        fontWeight: 700,
                        fontSize: 15,
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {item.name}
                    </div>
                    <div className="muted" style={{ fontSize: 12 }}>
                      {item.pages} pages
                    </div>
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 8, flex: 'none' }}>
                  <button
                    type="button"
                    className="btn btn--icon"
                    aria-label="Move up"
                    disabled={i === 0}
                    onClick={() => move(i, -1)}
                    style={{ transform: 'rotate(-90deg)' }}
                  >
                    <PixelIcon name="arrow" size={3} />
                  </button>
                  <button
                    type="button"
                    className="btn btn--icon"
                    aria-label="Move down"
                    disabled={i === items.length - 1}
                    onClick={() => move(i, 1)}
                    style={{ transform: 'rotate(90deg)' }}
                  >
                    <PixelIcon name="arrow" size={3} />
                  </button>
                  <button
                    type="button"
                    className="btn btn--icon"
                    aria-label={`Remove ${item.name}`}
                    onClick={() => setItems((prev) => prev.filter((p) => p.id !== item.id))}
                  >
                    <PixelIcon name="x" size={3} />
                  </button>
                </div>
              </div>
            ))}
          </div>

          <div
            style={{
              padding: '16px 20px',
              borderTop: 'var(--rule-width) solid var(--rule)',
              display: 'flex',
              gap: 14,
              flexWrap: 'wrap',
              alignItems: 'center',
            }}
          >
            <button
              type="button"
              className="btn btn--primary"
              onClick={run}
              disabled={items.length < 2 || busy}
            >
              Merge {items.length} PDFs
            </button>
            <button type="button" className="btn btn--sm" onClick={() => { setItems([]); setMerged(null); }}>
              Clear
            </button>
            {!isPro && atLimit && (
              <span className="muted" style={{ fontSize: 13 }}>
                Free limit reached.{' '}
                <Link to="/pricing" style={{ color: 'var(--accent-text)', fontWeight: 700 }}>
                  Pro removes it
                </Link>
                .
              </span>
            )}
          </div>
        </div>
      )}

      {busy && <Working label="Merging locally…" percent={100} />}

      {merged && (
        <div className="card" style={{ marginTop: 24 }}>
          <div className="band" style={{ padding: '14px 20px', fontSize: 13, fontWeight: 900, letterSpacing: '0.08em', textTransform: 'uppercase' }}>
            Merged — {totalPages} pages
          </div>
          <div style={{ padding: '20px', display: 'flex', gap: 14, flexWrap: 'wrap' }}>
            <button
              type="button"
              className="btn btn--primary"
              onClick={() => saveAs(new Blob([merged], { type: 'application/pdf' }), 'merged.pdf')}
            >
              Download merged.pdf
            </button>
            <button type="button" className="btn btn--sm" onClick={() => { setItems([]); setMerged(null); }}>
              Start over
            </button>
          </div>
        </div>
      )}
    </ToolShell>
  );
}
