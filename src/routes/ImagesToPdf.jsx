import { useState } from 'react';
import { saveAs } from 'file-saver';
import FileDropzone from '../components/FileDropzone.jsx';
import PixelIcon from '../components/PixelIcon.jsx';
import { ToolShell, Notice, Working } from '../components/ToolShell.jsx';
import { imagesToPdf } from '../lib/pdf/imagesToPdf.js';
import { TOOLS } from '../lib/tools.js';

const tool = TOOLS.find((t) => t.path === '/images-to-pdf');

export default function ImagesToPdf() {
  const [items, setItems] = useState([]); // { id, file, url }
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const add = (files) => {
    setError('');
    const images = files.filter((f) => f.type.startsWith('image/'));
    if (images.length === 0) {
      setError('Those weren’t images. JPEG, PNG, WebP and GIF all work.');
      return;
    }
    setItems((prev) => [
      ...prev,
      ...images.map((file) => ({
        id: `${file.name}-${Date.now()}-${Math.random()}`,
        file,
        url: URL.createObjectURL(file),
      })),
    ]);
  };

  const remove = (id) =>
    setItems((prev) => {
      const target = prev.find((p) => p.id === id);
      if (target) URL.revokeObjectURL(target.url);
      return prev.filter((p) => p.id !== id);
    });

  const move = (i, delta) =>
    setItems((prev) => {
      const next = [...prev];
      const target = i + delta;
      if (target < 0 || target >= next.length) return prev;
      [next[i], next[target]] = [next[target], next[i]];
      return next;
    });

  const run = async () => {
    setBusy(true);
    setError('');
    try {
      const bytes = await imagesToPdf(items.map((i) => i.file));
      saveAs(new Blob([bytes], { type: 'application/pdf' }), 'images.pdf');
    } catch (err) {
      setError(err.message || 'Could not build the PDF.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <ToolShell eyebrow={tool.eyebrow} title="Images → PDF" blurb={tool.blurb}>
      <FileDropzone
        multiple
        accept="image/*"
        onFiles={add}
        title={items.length ? 'Add more images' : 'Drop images here'}
        hint="JPEG, PNG, WebP or GIF — rotated upright and downscaled automatically"
      />

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
            <span className="label">Page order</span>
            <span className="muted" style={{ fontSize: 12 }}>
              {items.length} image{items.length === 1 ? '' : 's'} · one per page
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
            {items.map((item, i) => (
              <div key={item.id} className="card pixel" style={{ padding: 12, display: 'flex', flexDirection: 'column', gap: 10 }}>
                <div
                  style={{
                    aspectRatio: '3 / 4',
                    border: '1px solid var(--hairline)',
                    overflow: 'hidden',
                    display: 'flex',
                  }}
                >
                  <img
                    src={item.url}
                    alt={item.file.name}
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                  />
                </div>
                <div style={{ display: 'flex', gap: 6, justifyContent: 'center' }}>
                  <button type="button" className="btn btn--icon" aria-label="Move earlier" disabled={i === 0} onClick={() => move(i, -1)} style={{ width: 30, height: 30, transform: 'rotate(180deg)' }}>
                    <PixelIcon name="arrow" size={2} />
                  </button>
                  <button type="button" className="btn btn--icon" aria-label="Remove image" onClick={() => remove(item.id)} style={{ width: 30, height: 30 }}>
                    <PixelIcon name="x" size={2} />
                  </button>
                  <button type="button" className="btn btn--icon" aria-label="Move later" disabled={i === items.length - 1} onClick={() => move(i, 1)} style={{ width: 30, height: 30 }}>
                    <PixelIcon name="arrow" size={2} />
                  </button>
                </div>
              </div>
            ))}
          </div>

          <div style={{ padding: '16px 20px', borderTop: 'var(--rule-width) solid var(--rule)', display: 'flex', gap: 14, flexWrap: 'wrap' }}>
            <button type="button" className="btn btn--primary" onClick={run} disabled={busy}>
              Build PDF
            </button>
            <button
              type="button"
              className="btn btn--sm"
              onClick={() => {
                items.forEach((i) => URL.revokeObjectURL(i.url));
                setItems([]);
              }}
            >
              Clear
            </button>
          </div>
        </div>
      )}

      {busy && <Working label="Building locally…" percent={100} />}
    </ToolShell>
  );
}
