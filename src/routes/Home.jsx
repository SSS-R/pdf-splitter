import { Link } from 'react-router-dom';
import PixelIcon from '../components/PixelIcon.jsx';
import { TOOLS } from '../lib/tools.js';

// Split is the product's name, its URL, its search wedge and its hero CTA.
// It leads the grid; everything else is a list beside it.
const lead = TOOLS.find((t) => t.path === '/split');
const rest = TOOLS.filter((t) => t.path !== '/split');

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

          {/* The proof panel. This is the only thing on the page no competitor
              could paste in, so it gets the column rather than floating in a
              decorative field: 76% of this space used to be checkerboard. */}
          <div
            className="hide-sm"
            style={{
              gridColumn: '8 / 13',
              borderLeft: 'var(--rule-width) solid var(--rule)',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'center',
              padding: '72px 0 64px 40px',
            }}
          >
            <div className="label muted" style={{ fontSize: 12 }}>
              devtools · network
            </div>
            <div className="mono" style={{ fontSize: 14, marginTop: 20, lineHeight: 2 }}>
              <div>› open contract-2026.pdf</div>
              <div>› split 1–5, 6–24</div>
            </div>
            <div
              style={{
                marginTop: 24,
                paddingTop: 24,
                borderTop: 'var(--rule-width) solid var(--rule)',
              }}
            >
              <div style={{ fontSize: 88, fontWeight: 900, lineHeight: 0.9, letterSpacing: '-0.02em' }}>
                0
              </div>
              <div
                className="label"
                style={{ fontSize: 13, marginTop: 10, letterSpacing: '0.08em' }}
              >
                requests sent
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ----------------------------------------------------- the toolkit --
          Split leads at hero scale; the rest are a list. Six identical cards
          made the product's own name one-sixth of an undifferentiated grid,
          visually equal to Reorder -- and gave a first-time visitor no way to
          tell which door to open. */}
      <section className="section">
        <div className="container" style={{ padding: '56px var(--gutter)' }}>
          <h2 className="label" style={{ margin: '0 0 28px', fontSize: 15 }}>
            The toolkit
          </h2>

          <div className="grid12" style={{ gap: 20, alignItems: 'stretch' }}>
            <Link
              to={lead.path}
              className="card pixel pixel--lg tool-card"
              style={{
                gridColumn: 'span 6',
                padding: 32,
                display: 'flex',
                flexDirection: 'column',
                gap: 20,
                minHeight: 260,
              }}
            >
              <PixelIcon name={lead.icon} size={7} />
              <div style={{ marginTop: 'auto' }}>
                <h3
                  style={{
                    margin: 0,
                    fontSize: 34,
                    fontWeight: 900,
                    letterSpacing: '0.01em',
                    textTransform: 'uppercase',
                    lineHeight: 1.05,
                  }}
                >
                  {lead.name} PDF
                </h3>
                <p style={{ margin: '12px 0 0', fontSize: 16, lineHeight: 1.5, maxWidth: '34ch' }}>
                  {lead.blurb}
                </p>
              </div>
            </Link>

            <div style={{ gridColumn: 'span 6', display: 'flex', flexDirection: 'column' }}>
              {rest.map((tool, i) => (
                <Link
                  key={tool.path}
                  to={tool.path}
                  className="tool-card"
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 18,
                    padding: '18px 20px',
                    borderTop: i === 0 ? undefined : '1px solid var(--hairline)',
                    flex: 1,
                  }}
                >
                  <PixelIcon name={tool.icon} size={4} />
                  <div style={{ minWidth: 0 }}>
                    <h3
                      style={{
                        margin: 0,
                        fontSize: 17,
                        fontWeight: 900,
                        letterSpacing: '0.02em',
                        textTransform: 'uppercase',
                      }}
                    >
                      {tool.name}
                    </h3>
                    <div className="muted" style={{ fontSize: 14, marginTop: 3, lineHeight: 1.4 }}>
                      {tool.desc}
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </div>
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
