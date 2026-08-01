import { useCallback, useEffect, useRef, useState } from 'react';
import { saveAs } from 'file-saver';
import FileDropzone from '../components/FileDropzone.jsx';
import PixelIcon from '../components/PixelIcon.jsx';
import { ToolShell, LoadedFile, Notice, Working } from '../components/ToolShell.jsx';
import { usePdfFile } from '../hooks/usePdfFile.js';
import { openForRender } from '../lib/pdf/render.js';
import { applyTextEdits, unsupportedChars } from '../lib/pdf/edit.js';
import { TOOLS } from '../lib/tools.js';

const tool = TOOLS.find((t) => t.path === '/edit');
const VIEW_WIDTH = 780;

/**
 * Sample the background behind a text run so the cover rectangle matches.
 *
 * Reads a band just above and just below the glyphs -- never through them --
 * and takes the most common colour. On a plain page that is exactly the paper
 * colour; on a busy background it is the closest single colour available, which
 * is the honest limit of cover-and-replace.
 */
const sampleBackground = (canvas, box) => {
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  const counts = new Map();
  const sampleRow = (y) => {
    if (y < 0 || y >= canvas.height) return;
    const width = Math.max(1, Math.min(Math.round(box.width), canvas.width - Math.round(box.left)));
    const left = Math.max(0, Math.round(box.left));
    if (width < 1) return;
    const { data } = ctx.getImageData(left, Math.round(y), width, 1);
    for (let i = 0; i < data.length; i += 4) {
      const key = `${data[i]},${data[i + 1]},${data[i + 2]}`;
      counts.set(key, (counts.get(key) || 0) + 1);
    }
  };
  sampleRow(box.top - 3);
  sampleRow(box.top - 2);
  sampleRow(box.top + box.height + 2);
  sampleRow(box.top + box.height + 3);

  let best = '255,255,255';
  let bestCount = 0;
  for (const [key, count] of counts) {
    if (count > bestCount) {
      bestCount = count;
      best = key;
    }
  }
  const [r, g, b] = best.split(',').map(Number);
  return { r, g, b };
};

export default function Edit() {
  const pdf = usePdfFile();
  const [docHandle, setDocHandle] = useState(null);
  const [pageIndex, setPageIndex] = useState(0);
  const [pageImage, setPageImage] = useState(null);
  const [layout, setLayout] = useState(null); // { scale, pageWidth, pageHeight, items }
  const [rendering, setRendering] = useState(false);
  const [edits, setEdits] = useState([]); // committed, keyed by item id
  const [editing, setEditing] = useState(null); // { id, value, box, item }
  const [addMode, setAddMode] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const canvasRef = useRef(null);
  const inputRef = useRef(null);

  /**
   * Focus the inline editor a frame after it mounts.
   *
   * `autoFocus` looked equivalent and was not: the text run being edited is
   * unmounted in the same render that mounts this input, so focus briefly
   * returned to the body and the input's own onBlur fired instantly, committing
   * an empty edit and closing the editor before a key could be pressed.
   * Taking focus deliberately, after the DOM settles, removes the race.
   */
  const editingId = editing?.id ?? null;
  useEffect(() => {
    if (!editingId) return undefined;
    const frame = requestAnimationFrame(() => inputRef.current?.focus());
    return () => cancelAnimationFrame(frame);
  }, [editingId]);

  // Open the render document once per file.
  useEffect(() => {
    if (!pdf.buffer) {
      setDocHandle(null);
      return undefined;
    }
    let cancelled = false;
    let handle = null;
    (async () => {
      try {
        handle = await openForRender(pdf.buffer);
        if (cancelled) {
          handle.destroy();
          return;
        }
        setDocHandle(handle);
      } catch (err) {
        if (!cancelled) setError(err?.message || 'Could not open that PDF for editing.');
      }
    })();
    return () => {
      cancelled = true;
      handle?.destroy();
    };
  }, [pdf.buffer]);

  // Render the current page and pull its text runs.
  useEffect(() => {
    if (!docHandle) return undefined;
    let cancelled = false;
    setRendering(true);
    (async () => {
      try {
        const { canvas, scale, pageWidth, pageHeight } = await docHandle.renderPageCanvas(
          pageIndex + 1,
          { width: VIEW_WIDTH },
        );
        const { items } = await docHandle.textItems(pageIndex + 1);
        if (cancelled) return;
        canvasRef.current = canvas;
        setPageImage(canvas.toDataURL('image/png'));
        setLayout({ scale, pageWidth, pageHeight, items });
      } catch (err) {
        if (!cancelled) setError(err?.message || 'Could not render that page.');
      } finally {
        if (!cancelled) setRendering(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [docHandle, pageIndex]);

  /** PDF space (bottom-left origin, baseline y) -> screen box (top-left). */
  const boxFor = useCallback(
    (item) => {
      const { scale, pageHeight } = layout;
      return {
        left: item.x * scale,
        top: (pageHeight - item.baselineY - item.fontSize) * scale,
        width: Math.max(item.width * scale, 6),
        height: item.fontSize * 1.25 * scale,
      };
    },
    [layout],
  );

  /** Current text for a run: the pending edit if there is one, else the original. */
  const textFor = (item) => edits.find((e) => e.id === item.id)?.text ?? item.text;

  const beginEdit = (item) => {
    if (addMode) return;
    setEditing({ id: item.id, item, value: textFor(item), box: boxFor(item) });
  };

  const commitEdit = () => {
    if (!editing) return;
    const { item, value } = editing;
    setEditing(null);
    if (value === item.text) {
      setEdits((prev) => prev.filter((e) => e.id !== item.id));
      return;
    }
    const cover = canvasRef.current ? sampleBackground(canvasRef.current, boxFor(item)) : { r: 255, g: 255, b: 255 };
    setEdits((prev) => [
      ...prev.filter((e) => e.id !== item.id),
      {
        id: item.id,
        pageIndex,
        type: 'replace',
        text: value,
        x: item.x,
        baselineY: item.baselineY,
        width: item.width,
        fontSize: item.fontSize,
        fontName: item.fontName,
        cover,
      },
    ]);
  };

  const addTextAt = (event) => {
    if (!addMode || !layout) return;
    const rect = event.currentTarget.getBoundingClientRect();
    const px = event.clientX - rect.left;
    const py = event.clientY - rect.top;
    const { scale, pageHeight } = layout;
    const fontSize = 12;
    const id = `add-${Date.now()}`;
    const item = {
      id,
      text: '',
      x: px / scale,
      baselineY: pageHeight - py / scale - fontSize,
      width: 160,
      fontSize,
      fontName: 'Helvetica',
    };
    setAddMode(false);
    setEditing({
      id,
      item,
      value: '',
      box: {
        left: px,
        top: py,
        width: 160 * scale,
        height: fontSize * 1.25 * scale,
      },
      isNew: true,
    });
  };

  const commitNew = () => {
    if (!editing?.isNew) return;
    const { item, value } = editing;
    setEditing(null);
    if (!value.trim()) return;
    setEdits((prev) => [
      ...prev,
      {
        id: item.id,
        pageIndex,
        type: 'add',
        text: value,
        x: item.x,
        baselineY: item.baselineY,
        width: item.width,
        fontSize: item.fontSize,
        fontName: item.fontName,
        cover: null,
      },
    ]);
  };

  const save = async () => {
    setBusy(true);
    setError('');
    try {
      const bytes = await applyTextEdits(pdf.buffer, edits);
      saveAs(
        new Blob([bytes], { type: 'application/pdf' }),
        `${(pdf.file?.name || 'document.pdf').replace(/\.pdf$/i, '')}-edited.pdf`,
      );
    } catch (err) {
      setError(err.message || 'Could not save those edits.');
    } finally {
      setBusy(false);
    }
  };

  const reset = () => {
    pdf.reset();
    setEdits([]);
    setEditing(null);
    setLayout(null);
    setPageImage(null);
    setError('');
    setPageIndex(0);
  };

  const badChars = editing ? unsupportedChars(editing.value) : [];
  const noTextLayer = layout && layout.items.length === 0 && !rendering;

  return (
    <ToolShell eyebrow={tool.eyebrow} title="Edit PDF" blurb={tool.blurb} path={tool.path}>
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
          meta={`${pdf.pageCount} pages · ${edits.length} edit${edits.length === 1 ? '' : 's'} pending`}
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
      {error && <Notice heading="Couldn’t apply that" body={error} />}

      {noTextLayer && (
        <Notice
          heading="This page has no text to edit"
          body={
            'It looks like a scan — a picture of text rather than text itself, so there is nothing to select or ' +
            'change. You can still add new text on top of it with “Add text”. Editing the scanned words themselves ' +
            'would need OCR, which this tool does not do.'
          }
        />
      )}

      {pdf.file && (
        <div className="card" style={{ marginTop: 24 }}>
          <div
            style={{
              padding: '12px 20px',
              borderBottom: 'var(--rule-width) solid var(--rule)',
              display: 'flex',
              alignItems: 'center',
              gap: 12,
              flexWrap: 'wrap',
            }}
          >
            <span className="label">Page {pageIndex + 1} / {pdf.pageCount}</span>
            <button
              type="button"
              className="btn btn--sm"
              disabled={pageIndex === 0}
              onClick={() => setPageIndex((i) => Math.max(0, i - 1))}
            >
              Prev
            </button>
            <button
              type="button"
              className="btn btn--sm"
              disabled={pageIndex >= pdf.pageCount - 1}
              onClick={() => setPageIndex((i) => Math.min(pdf.pageCount - 1, i + 1))}
            >
              Next
            </button>
            <button
              type="button"
              className={`btn btn--sm${addMode ? ' btn--primary' : ''}`}
              onClick={() => setAddMode((v) => !v)}
              style={{ marginLeft: 'auto' }}
            >
              <PixelIcon name="plus" size={2} /> {addMode ? 'Click the page…' : 'Add text'}
            </button>
          </div>

          <div style={{ padding: 20, overflowX: 'auto' }}>
            <div
              onClick={addTextAt}
              style={{
                position: 'relative',
                width: VIEW_WIDTH,
                margin: '0 auto',
                border: '1px solid var(--hairline)',
                cursor: addMode ? 'crosshair' : 'default',
                background: '#fff',
              }}
            >
              {pageImage && (
                <img src={pageImage} alt={`Page ${pageIndex + 1}`} style={{ width: '100%', display: 'block' }} />
              )}

              {/* Editable text runs, positioned over the rendered page. */}
              {layout &&
                !addMode &&
                layout.items.map((item) => {
                  const box = boxFor(item);
                  const changed = edits.some((e) => e.id === item.id);
                  if (editing?.id === item.id) return null;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      // mousedown, not click, with the default prevented: that
                      // stops the browser moving focus to this button at all,
                      // so the inline input can take it cleanly.
                      onMouseDown={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        beginEdit(item);
                      }}
                      data-text-run={item.id}
                      title={item.text}
                      style={{
                        position: 'absolute',
                        left: box.left,
                        top: box.top,
                        width: box.width,
                        height: box.height,
                        padding: 0,
                        border: changed ? '1px solid var(--accent)' : '1px solid transparent',
                        background: changed ? 'rgba(230,46,46,0.10)' : 'transparent',
                        cursor: 'text',
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.background = 'rgba(230,46,46,0.14)';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.background = changed ? 'rgba(230,46,46,0.10)' : 'transparent';
                      }}
                    />
                  );
                })}

              {/* Inline editor sitting exactly where the text is. */}
              {editing && (
                <input
                  ref={inputRef}
                  value={editing.value}
                  aria-label="Edit text"
                  onChange={(e) => setEditing((s) => ({ ...s, value: e.target.value }))}
                  onClick={(e) => e.stopPropagation()}
                  onBlur={() => (editing.isNew ? commitNew() : commitEdit())}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') e.currentTarget.blur();
                    if (e.key === 'Escape') setEditing(null);
                  }}
                  style={{
                    position: 'absolute',
                    left: editing.box.left,
                    top: editing.box.top,
                    width: Math.max(editing.box.width, 120),
                    height: editing.box.height,
                    fontSize: Math.max(11, editing.item.fontSize * (layout?.scale || 1)),
                    fontFamily: 'inherit',
                    border: '2px solid var(--accent)',
                    background: '#fff',
                    color: '#111',
                    padding: '0 2px',
                    zIndex: 5,
                  }}
                />
              )}
            </div>

            {badChars.length > 0 && (
              <p style={{ color: 'var(--accent)', fontSize: 13, fontWeight: 700, marginTop: 12, textAlign: 'center' }}>
                “{badChars.join(' ')}” can’t be written — built-in fonts cover Latin characters only.
              </p>
            )}
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
            <button type="button" className="btn btn--primary" onClick={save} disabled={busy || edits.length === 0}>
              Save &amp; download
            </button>
            <button
              type="button"
              className="btn btn--sm"
              onClick={() => setEdits([])}
              disabled={edits.length === 0}
            >
              Discard edits
            </button>
            <span className="muted" style={{ fontSize: 12 }}>
              {rendering ? 'Rendering page…' : `${edits.length} edit${edits.length === 1 ? '' : 's'} ready`}
            </span>
          </div>

          {/* The one thing a user must not misunderstand. Replaced text is
              painted over, not deleted -- it is still in the file and still
              extractable by anything that reads PDFs. Someone covering their
              address would otherwise believe it was gone. */}
          {edits.some((e) => e.type === 'replace') && (
            <div
              style={{
                padding: '14px 20px',
                borderTop: '1px solid var(--hairline)',
                display: 'flex',
                gap: 12,
                alignItems: 'flex-start',
              }}
            >
              <span
                style={{
                  width: 10,
                  height: 10,
                  background: 'var(--danger)',
                  marginTop: 5,
                  flex: 'none',
                }}
              />
              <p style={{ margin: 0, fontSize: 13, lineHeight: 1.55 }}>
                <strong>Replaced text is covered, not removed.</strong>{' '}
                <span className="muted">
                  The original words stay inside the file and can still be recovered by copy-paste or
                  any PDF reader. This is how every cover-and-replace editor works. Don’t use it to
                  hide sensitive information — that needs true redaction, which we haven’t shipped yet.
                </span>
              </p>
            </div>
          )}
        </div>
      )}

      {busy && <Working label="Writing changes locally…" percent={100} />}
    </ToolShell>
  );
}
