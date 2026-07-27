import { Link } from 'react-router-dom';
import PixelIcon from './PixelIcon.jsx';

/** Two-column tool page: Swiss sidebar on the left, the working area on the right. */
export function ToolShell({ eyebrow, title, blurb, children }) {
  return (
    <div className="container" style={{ padding: '56px var(--gutter)' }}>
      <div className="grid12">
        <div style={{ gridColumn: '1 / 5' }}>
          <div className="eyebrow">{eyebrow}</div>
          <h1 className="display display--sm" style={{ margin: '12px 0 0', fontSize: 44 }}>
            {title}
          </h1>
          <p style={{ margin: '20px 0 0', fontSize: 16, lineHeight: 1.5, color: 'var(--muted-strong)' }}>
            {blurb}
          </p>
          <Link
            to="/"
            style={{
              display: 'inline-block',
              marginTop: 24,
              fontSize: 13,
              fontWeight: 700,
              letterSpacing: '0.06em',
              textTransform: 'uppercase',
              color: 'var(--accent)',
            }}
          >
            ← All tools
          </Link>
        </div>
        <div style={{ gridColumn: '5 / 13', minWidth: 0 }}>{children}</div>
      </div>
    </div>
  );
}

/** The "file is in memory" bar shown once something is loaded. */
export function LoadedFile({ icon = 'lock', name, meta, onRemove }) {
  return (
    <div
      className="card"
      style={{
        padding: '22px 24px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 16,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 16, minWidth: 0 }}>
        <PixelIcon name={icon} size={5} />
        <div style={{ minWidth: 0 }}>
          <div
            style={{
              fontWeight: 900,
              fontSize: 16,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            {name}
          </div>
          <div className="muted" style={{ fontSize: 13 }}>
            {meta}
          </div>
        </div>
      </div>
      <button type="button" className="btn btn--sm" onClick={onRemove}>
        Remove
      </button>
    </div>
  );
}

/** Progress panel. All work is local, so the copy says so. */
export function Working({ label, percent }) {
  return (
    <div className="card" style={{ marginTop: 24, padding: 24 }}>
      <div className="label" style={{ marginBottom: 14 }}>
        {label} {percent}%
      </div>
      <div className="progress">
        <div className="progress__bar" style={{ width: `${percent}%` }} />
      </div>
    </div>
  );
}

/** Error / honest-result panel. */
export function Notice({ heading, body, action, neutral = false }) {
  return (
    <div className={`notice${neutral ? ' notice--neutral' : ''}`} style={{ marginTop: 24 }}>
      <span className="notice__dot" />
      <div>
        <div style={{ fontWeight: 900, fontSize: 16, textTransform: 'uppercase', letterSpacing: '0.02em' }}>
          {heading}
        </div>
        <div style={{ fontSize: 15, marginTop: 8, lineHeight: 1.5, maxWidth: '56ch' }}>{body}</div>
        {action}
      </div>
    </div>
  );
}
