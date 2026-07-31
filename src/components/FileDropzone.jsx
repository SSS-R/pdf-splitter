import { useRef, useState } from 'react';

/**
 * One dropzone for every tool. Handles drag state, click-to-browse, and
 * resetting the input so re-picking the same file still fires a change event.
 *
 * Before this existed, each tool carried its own copy of the drag/drop and
 * FileReader wiring; five tools meant five copies drifting apart.
 */
export default function FileDropzone({
  onFiles,
  accept = 'application/pdf',
  multiple = false,
  title = 'Drop a PDF here',
  hint = 'or click to browse — nothing is uploaded',
}) {
  const inputRef = useRef(null);
  const [dragging, setDragging] = useState(false);

  const emit = (fileList) => {
    const files = Array.from(fileList || []);
    if (files.length) onFiles(multiple ? files : [files[0]]);
  };

  return (
    <>
      <button
        type="button"
        className="dropzone pixel pixel--lg"
        data-dragging={dragging}
        onClick={() => inputRef.current?.click()}
        onDragOver={(e) => {
          e.preventDefault();
          e.dataTransfer.dropEffect = 'copy';
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragging(false);
          emit(e.dataTransfer.files);
        }}
      >
        <span
          style={{
            display: 'block',
            fontSize: 18,
            fontWeight: 900,
            textTransform: 'uppercase',
            letterSpacing: '0.04em',
          }}
        >
          {title}
        </span>
        <span className="muted" style={{ display: 'block', fontSize: 14, marginTop: 8 }}>
          {hint}
        </span>
      </button>
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        multiple={multiple}
        hidden
        onChange={(e) => {
          emit(e.target.files);
          e.target.value = '';
        }}
      />
    </>
  );
}
