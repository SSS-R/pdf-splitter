import { useState } from 'react';
import PixelIcon from '../components/PixelIcon.jsx';
import { usePro } from '../hooks/usePro.js';

const FREE = [
  { label: 'Split, merge, compress, reorder — unlimited', on: true },
  { label: 'Images → PDF', on: true },
  { label: 'Edit and add text in a PDF', on: true },
  { label: '100% client-side, no uploads, no account', on: true },
  { label: 'Replace or paste images into a PDF', on: false },
  { label: 'Batch processing', on: false },
  { label: 'True redaction', on: false },
];

const PRO = [
  { label: 'Everything in Free', coming: false },
  { label: 'Replace images in a PDF, and paste new ones in', coming: false },
  { label: 'Batch split & merge — no file limit', coming: false },
  { label: 'True redaction (text really removed, not hidden)', coming: true },
  { label: 'Compression quality controls', coming: true },
];

export default function Pricing() {
  const { isPro, tier, activate, deactivate } = usePro();
  const [key, setKey] = useState('');
  const [invalid, setInvalid] = useState(false);

  const submit = (e) => {
    e.preventDefault();
    if (!activate(key)) setInvalid(true);
    else {
      setInvalid(false);
      setKey('');
    }
  };

  return (
    <div className="container" style={{ padding: '56px var(--gutter)' }}>
      <div style={{ maxWidth: '60ch' }}>
        <div className="eyebrow">Pricing</div>
        <h1 className="display display--sm" style={{ margin: '12px 0 0', fontSize: 48 }}>
          Pay once. Keep it.
        </h1>
        <p style={{ margin: '18px 0 0', fontSize: 17, lineHeight: 1.5, color: 'var(--muted-strong)' }}>
          No subscription, no per-file limits, no account. Everyday tools stay free for everyone;
          Pro unlocks image editing, batch work, and features still in progress — listed honestly as
          they land. Students get all of it free.
        </p>
      </div>

      <div className="grid12" style={{ marginTop: 40 }}>
        {/* ------------------------------------------------------- free -- */}
        <div className="card" style={{ gridColumn: '1 / 7', padding: 32 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
            <div style={{ fontSize: 22, fontWeight: 900, textTransform: 'uppercase' }}>Free</div>
            <div style={{ fontSize: 40, fontWeight: 900 }}>$0</div>
          </div>
          <div style={{ height: 2, background: 'var(--rule)', margin: '20px 0' }} />
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {FREE.map((f) => (
              <div key={f.label} style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                <span style={{ marginTop: 2, color: f.on ? 'var(--accent)' : 'var(--muted)' }}>
                  <PixelIcon name={f.on ? 'check' : 'x'} size={4} />
                </span>
                <span style={{ fontSize: 15, lineHeight: 1.4, opacity: f.on ? 1 : 0.55 }}>{f.label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* -------------------------------------------------------- pro -- */}
        <div className="card band" style={{ gridColumn: '7 / 13', padding: 32 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 12 }}>
            <div style={{ fontSize: 22, fontWeight: 900, textTransform: 'uppercase', color: 'var(--accent)' }}>
              Pro
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: 40, fontWeight: 900 }}>$12</div>
              <div className="muted" style={{ fontSize: 11, letterSpacing: '0.06em', textTransform: 'uppercase' }}>
                Lifetime · introductory
              </div>
            </div>
          </div>
          <div style={{ height: 2, background: 'var(--accent)', margin: '20px 0' }} />

          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {PRO.map((f) => (
              <div key={f.label} style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                <span style={{ marginTop: 2, color: f.coming ? 'var(--band-muted)' : 'var(--accent)' }}>
                  <PixelIcon name={f.coming ? 'doc' : 'check'} size={4} />
                </span>
                <div>
                  <span style={{ fontSize: 15, lineHeight: 1.4 }}>{f.label}</span>
                  {f.coming && (
                    <span
                      style={{
                        border: '1px solid var(--band-muted)',
                        color: 'var(--band-muted)',
                        padding: '2px 7px',
                        fontSize: 10,
                        fontWeight: 700,
                        letterSpacing: '0.08em',
                        textTransform: 'uppercase',
                        marginLeft: 8,
                        whiteSpace: 'nowrap',
                      }}
                    >
                      Coming
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>

          <div style={{ height: 2, background: 'var(--band-hairline)', margin: '24px 0' }} />

          {!isPro ? (
            <form onSubmit={submit}>
              <div className="label" style={{ marginBottom: 10, fontSize: 12 }}>
                Have a license key?
              </div>
              <div style={{ display: 'flex', gap: 12 }}>
                <input
                  className="input"
                  value={key}
                  aria-label="License key"
                  placeholder="DEMO-1234"
                  onChange={(e) => {
                    setKey(e.target.value);
                    setInvalid(false);
                  }}
                />
                <button type="submit" className="btn btn--primary btn--sm" style={{ flex: 'none' }}>
                  Activate
                </button>
              </div>
              {invalid && (
                <div style={{ color: 'var(--accent)', fontSize: 13, fontWeight: 700, marginTop: 10 }}>
                  That key isn’t valid. Try DEMO-1234, or EDU-1234 for the student tier.
                </div>
              )}
              <button type="button" className="btn btn--primary" style={{ width: '100%', marginTop: 16 }}>
                Buy Pro — $12
              </button>
              <p style={{ fontSize: 13, lineHeight: 1.55, marginTop: 16 }}>
                <strong>Students get Pro free.</strong>{' '}
                <span className="muted">
                  Verify with your university email and you’re issued a normal licence key at no
                  cost — same features, same key, nothing withheld. Verification isn’t built yet;
                  it’s next after launch.
                </span>
              </p>
            </form>
          ) : (
            <div
              style={{
                border: 'var(--rule-width) solid var(--accent)',
                padding: 18,
                display: 'flex',
                alignItems: 'center',
                gap: 14,
                flexWrap: 'wrap',
              }}
            >
              <span style={{ color: 'var(--accent)' }}>
                <PixelIcon name="check" size={5} />
              </span>
              <div>
                <div style={{ fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                  {tier === 'edu' ? 'Student access activated' : 'Pro activated'}
                </div>
                <div className="muted" style={{ fontSize: 13, marginTop: 2 }}>
                  {tier === 'edu'
                    ? 'Every Pro feature unlocked — image editing and batch tools included.'
                    : 'Image editing and batch tools unlocked across the site.'}
                </div>
              </div>
              <button type="button" className="btn btn--sm" style={{ marginLeft: 'auto' }} onClick={deactivate}>
                Deactivate
              </button>
            </div>
          )}

          <div style={{ fontSize: 12, color: 'var(--band-dim)', marginTop: 18, lineHeight: 1.5 }}>
            Checkout and refunds handled by our merchant of record. The license key works on every
            browser and device you use — no activation limits, ever.
          </div>
        </div>
      </div>
    </div>
  );
}
