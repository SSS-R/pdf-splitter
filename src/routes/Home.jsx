import { Link } from 'react-router-dom';
import PixelIcon from '../components/PixelIcon.jsx';
import { TOOLS } from '../lib/tools.js';

export default function Home() {
  return (
    <>
      {/* ---------------------------------------------------------- hero -- */}
      <section className="section">
        <div className="container grid12" style={{ alignItems: 'stretch' }}>
          <div style={{ gridColumn: '1 / 8', padding: '72px 0 64px' }}>
            <div className="chip" style={{ padding: '6px 12px', marginBottom: 32 }}>
              <PixelIcon name="lock" size={4} />
              No uploads · No accounts
            </div>

            <h1 className="display" style={{ fontSize: 64 }}>
              Your files
              <br />
              never leave
              <br />
              your <span style={{ color: 'var(--accent)' }}>device.</span>
            </h1>

            <p style={{ margin: '32px 0 0', fontSize: 19, lineHeight: 1.5, maxWidth: '34ch' }}>
              Split, merge, compress and reorder PDFs — processed entirely in your browser. No
              uploads. No accounts. Verify it in devtools.
            </p>

            <div style={{ display: 'flex', gap: 16, marginTop: 36, flexWrap: 'wrap' }}>
              <Link to="/split" className="btn btn--primary pixel">
                Start splitting
              </Link>
              <Link to="/privacy" className="btn pixel">
                How it works
              </Link>
            </div>
          </div>

          {/* devtools proof panel, sitting on the dither block */}
          <div
            className="dither hide-sm"
            style={{
              gridColumn: '8 / 13',
              borderLeft: 'var(--rule-width) solid var(--rule)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <div className="card" style={{ padding: '28px 32px', margin: 24 }}>
              <div className="eyebrow">devtools · network</div>
              <div className="mono" style={{ fontSize: 13, marginTop: 14, lineHeight: 1.9 }}>
                <div>› open contract-2026.pdf</div>
                <div>› split 1–5, 6–24</div>
                <div style={{ fontWeight: 900 }}>
                  requests sent: <span style={{ color: 'var(--accent)' }}>0</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ----------------------------------------------------- tool grid -- */}
      <section className="section">
        <div className="container" style={{ padding: '56px var(--gutter)' }}>
          <div
            style={{
              display: 'flex',
              alignItems: 'baseline',
              justifyContent: 'space-between',
              marginBottom: 28,
              gap: 16,
            }}
          >
            <h2 className="label" style={{ margin: 0, fontSize: 15 }}>
              The toolkit
            </h2>
            <span className="muted" style={{ fontSize: 13 }}>
              Everything runs locally.
            </span>
          </div>

          <div className="grid12" style={{ gap: 20 }}>
            {TOOLS.map((tool) => (
              <Link
                key={tool.path}
                to={tool.path}
                className="card pixel pixel--lg tool-card"
                style={{
                  gridColumn: 'span 4',
                  padding: 26,
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 18,
                  minHeight: 200,
                }}
              >
                <PixelIcon name={tool.icon} size={5} />
                <div>
                  <div
                    style={{
                      fontSize: 22,
                      fontWeight: 900,
                      letterSpacing: '0.02em',
                      textTransform: 'uppercase',
                    }}
                  >
                    {tool.name}
                  </div>
                  <div className="muted" style={{ fontSize: 14, marginTop: 8, lineHeight: 1.45 }}>
                    {tool.desc}
                  </div>
                </div>
                <span
                  style={{
                    marginTop: 'auto',
                    fontSize: 12,
                    fontWeight: 700,
                    letterSpacing: '0.08em',
                    textTransform: 'uppercase',
                    color: 'var(--accent)',
                  }}
                >
                  Open tool →
                </span>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* --------------------------------------------------- trust strip -- */}
      <section className="section">
        <div
          className="container"
          style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)' }}
        >
          {[
            ['0', 'Uploads, ever'],
            ['0', 'Accounts required'],
            ['MIT', 'Open source license'],
          ].map(([figure, caption], i) => (
            <div
              key={caption}
              style={{
                padding: i === 0 ? '34px 32px 34px 0' : '34px 32px',
                borderRight: i < 2 ? 'var(--rule-width) solid var(--rule)' : undefined,
              }}
            >
              <div style={{ fontSize: 46, fontWeight: 900 }}>{figure}</div>
              <div
                className="muted"
                style={{ fontSize: 13, letterSpacing: '0.06em', textTransform: 'uppercase', marginTop: 4 }}
              >
                {caption}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ------------------------------------------------------- pro band -- */}
      <section className="section band">
        <div className="container grid12" style={{ padding: '64px var(--gutter)', alignItems: 'center' }}>
          <div style={{ gridColumn: '1 / 9' }}>
            <div className="eyebrow">Pro</div>
            <h2
              className="display"
              style={{ margin: '14px 0 0', fontSize: 40, lineHeight: 1.02 }}
            >
              One fair price,
              <br />
              lifetime.
            </h2>
            <p className="muted" style={{ margin: '18px 0 0', fontSize: 17, maxWidth: '44ch' }}>
              Batch split &amp; merge today. True redaction — text really removed, not hidden —
              coming next. We ship what works and tell you what doesn’t.
            </p>
          </div>
          <div style={{ gridColumn: '9 / 13', textAlign: 'right' }}>
            <div style={{ fontSize: 56, fontWeight: 900 }}>$12</div>
            <div
              className="muted"
              style={{ fontSize: 13, letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: 20 }}
            >
              Lifetime · introductory
            </div>
            <Link to="/pricing" className="btn btn--primary pixel">
              See what’s included
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}
