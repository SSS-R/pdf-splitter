import PixelIcon from '../components/PixelIcon.jsx';

const REQUESTS = [
  {
    name: 'GET /analytics.js',
    when: 'Landing pages only',
    what: 'Anonymous pageview. Never loads on a tool page. No cookies, no file data.',
  },
  {
    name: 'POST /api/license',
    when: 'On “Activate”',
    what: 'Your license key, checked against our payment provider. Never stored with files.',
  },
  {
    name: 'GET /checkout.js',
    when: 'Pricing page only',
    what: 'Merchant-of-record payment script. Loads when you open Pricing.',
  },
];

export default function Privacy() {
  return (
    <div className="container" style={{ padding: '56px var(--gutter)' }}>
      <div className="grid12">
        <div style={{ gridColumn: '1 / 4' }}>
          <div className="eyebrow">Privacy</div>
          <h1 className="display display--sm" style={{ margin: '12px 0 0', fontSize: 40 }}>
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

        <div style={{ gridColumn: '4 / 13', minWidth: 0 }}>
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

                {REQUESTS.map((req) => (
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
                ))}

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

          <p className="muted" style={{ fontSize: 13, marginTop: 16, lineHeight: 1.5 }}>
            No third-party trackers, no session replay, no “anonymous usage” beacons while you work.
            Analytics fire only on the marketing landing pages, and never carry file data.
          </p>
        </div>
      </div>
    </div>
  );
}
