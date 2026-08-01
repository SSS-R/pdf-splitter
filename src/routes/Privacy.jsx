import PixelIcon from '../components/PixelIcon.jsx';

/**
 * Requests the shipped site actually makes: none.
 *
 * This list previously described analytics, a licence endpoint and a checkout
 * script in the present tense. None of them exist in the code. On a page titled
 * "Every request, documented" that invites you to open devtools and check, a
 * disclosure with no request behind it fails the same test as an undisclosed
 * request would -- the documentation was falsifiable, and false.
 *
 * Anything added here must be added when the request ships, not before.
 */
const REQUESTS = [];

const PLANNED = [
  {
    name: 'GET analytics beacon',
    when: 'Landing and pricing pages only — never a tool page',
    what: 'An anonymous pageview count. No cookies, no identifiers, nothing about your files.',
  },
  {
    name: 'POST /api/license',
    when: 'When you press “Activate”',
    what: 'Your licence key, checked against the payment provider. Nothing else is sent.',
  },
  {
    name: 'Checkout script',
    when: 'On the pricing page, once payments open',
    what: 'The merchant of record’s payment form. It never sees a document.',
  },
];

export default function Privacy() {
  return (
    <div className="container" style={{ padding: '56px var(--gutter)' }}>
      <div className="grid12">
        {/* 1/5, matching ToolShell and Account. At 1/4 the column was 261px and
            "documented." alone rendered 326px at 40px/900, so the heading
            overflowed its column and collided with the table beside it. */}
        <div style={{ gridColumn: '1 / 5' }}>
          <div className="eyebrow">Privacy</div>
          <h1 className="display display--sm" style={{ margin: '12px 0 0', fontSize: 'clamp(28px, 3vw, 40px)' }}>
            Every request, documented.
          </h1>
          <p style={{ margin: '20px 0 0', fontSize: 15, lineHeight: 1.55, color: 'var(--muted-strong)' }}>
            Your files are opened, parsed and processed entirely in your browser. This table lists
            every network request the site itself makes — and when.
          </p>

          <div className="card" style={{ marginTop: 24, padding: 16 }}>
            <div className="muted" style={{ fontSize: 12, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase' }}>
              Verify it yourself
            </div>
            <div className="mono" style={{ fontSize: 13, marginTop: 8, lineHeight: 1.6 }}>
              Open devtools → Network → work with a file. The count stays at zero.
            </div>
          </div>
        </div>

        <div style={{ gridColumn: '5 / 13', minWidth: 0 }}>
          <div className="card">
            <div style={{ overflowX: 'auto' }}>
              <div style={{ minWidth: 560 }}>
                <div
                  className="band"
                  style={{ display: 'grid', gridTemplateColumns: '2.2fr 1.4fr 2.4fr' }}
                >
                  {['Request', 'When', 'What it sends'].map((h, i) => (
                    <div
                      key={h}
                      style={{
                        padding: '14px 18px',
                        fontSize: 12,
                        fontWeight: 900,
                        letterSpacing: '0.08em',
                        textTransform: 'uppercase',
                        borderRight: i < 2 ? '1px solid var(--band-hairline)' : undefined,
                      }}
                    >
                      {h}
                    </div>
                  ))}
                </div>

                {REQUESTS.length === 0 ? (
                  <div style={{ padding: '44px 18px', textAlign: 'center', borderTop: '1px solid var(--hairline)' }}>
                    <div style={{ fontSize: 64, fontWeight: 900, lineHeight: 1 }}>0</div>
                    <div className="label" style={{ fontSize: 13, marginTop: 12 }}>
                      Requests, on every page
                    </div>
                    <p className="muted" style={{ margin: '14px auto 0', fontSize: 14, maxWidth: '46ch', lineHeight: 1.5 }}>
                      Not “none while you work” — none at all. The site is static files. There is no
                      analytics, no licence server and no payment script in it today.
                    </p>
                  </div>
                ) : (
                  REQUESTS.map((req) => (
                    <div
                      key={req.name}
                      style={{
                        display: 'grid',
                        gridTemplateColumns: '2.2fr 1.4fr 2.4fr',
                        borderTop: '1px solid var(--hairline)',
                      }}
                    >
                      <div
                        className="mono"
                        style={{ padding: '16px 18px', borderRight: '1px solid var(--hairline)', fontSize: 13, fontWeight: 700 }}
                      >
                        {req.name}
                      </div>
                      <div style={{ padding: '16px 18px', borderRight: '1px solid var(--hairline)', fontSize: 14 }}>
                        {req.when}
                      </div>
                      <div style={{ padding: '16px 18px', fontSize: 14, lineHeight: 1.4, color: 'var(--muted-strong)' }}>
                        {req.what}
                      </div>
                    </div>
                  ))
                )}

                <div
                  className="band"
                  style={{
                    display: 'grid',
                    gridTemplateColumns: '2.2fr 3.8fr',
                    borderTop: 'var(--rule-width) solid var(--rule)',
                  }}
                >
                  <div
                    style={{
                      padding: 18,
                      borderRight: '1px solid var(--band-hairline)',
                      fontWeight: 900,
                      textTransform: 'uppercase',
                      letterSpacing: '0.04em',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 12,
                    }}
                  >
                    <PixelIcon name="lock" size={5} /> While files are open
                  </div>
                  <div
                    style={{
                      padding: 18,
                      fontSize: 18,
                      fontWeight: 900,
                      display: 'flex',
                      alignItems: 'center',
                      color: 'var(--accent)',
                    }}
                  >
                    Zero requests.
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Stated separately and labelled as future, so the table above stays
              a record of what is, not a promise about what will be. */}
          <div className="card" style={{ marginTop: 24 }}>
            <div
              style={{
                padding: '14px 18px',
                borderBottom: 'var(--rule-width) solid var(--rule)',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                gap: 12,
              }}
            >
              <span className="label">Planned — not shipped</span>
              <span className="muted" style={{ fontSize: 12 }}>
                This page updates when they land, not before
              </span>
            </div>
            <div className="rowlist">
              {PLANNED.map((req) => (
                <div key={req.name} style={{ padding: '14px 18px' }}>
                  <div style={{ fontWeight: 700, fontSize: 15 }}>{req.name}</div>
                  <div className="muted" style={{ fontSize: 13, marginTop: 4, lineHeight: 1.5 }}>
                    {req.when} — {req.what}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <p className="muted" style={{ fontSize: 13, marginTop: 16, lineHeight: 1.5 }}>
            No third-party trackers, no session replay, no “anonymous usage” beacons — and when
            analytics do arrive they will fire on the landing and pricing pages only, never on a page
            where a file is open.
          </p>
        </div>
      </div>
    </div>
  );
}
