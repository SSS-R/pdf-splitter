import { useState } from 'react';
import { Link } from 'react-router-dom';
import PixelIcon from '../components/PixelIcon.jsx';
import { usePro } from '../hooks/usePro.js';
import { useUsageStats } from '../hooks/useUsageStats.js';
import { TOOLS } from '../lib/tools.js';

/**
 * What you have, and what you've done with it.
 *
 * This is not an account in the usual sense -- there is no login, no password
 * and no session, because the licence key in local storage *is* the state. It
 * persists across restarts and never expires; it is only lost if browser data
 * is cleared, which is exactly when a cookie session would be lost too.
 *
 * Everything on this page is read from the device. Nothing here required a
 * server, and nothing here was reported to one.
 */

const TIER_LABEL = { pro: 'Pro', edu: 'Student' };

export default function Account() {
  const { isPro, tier, activate, deactivate } = usePro();
  const { stats, total, clear } = useUsageStats();
  const [key, setKey] = useState('');
  const [invalid, setInvalid] = useState(false);

  const submit = (event) => {
    event.preventDefault();
    if (activate(key)) setKey('');
    else setInvalid(true);
  };

  const rows = [
    ...TOOLS.map((t) => ({ label: t.name, count: stats[t.path.replace('/', '')] || 0 })),
  ].sort((a, b) => b.count - a.count);

  return (
    <div className="container" style={{ padding: '56px var(--gutter)' }}>
      <div className="grid12">
        <div style={{ gridColumn: '1 / 5' }}>
          <div className="eyebrow">Your account</div>
          <h1 className="display display--sm" style={{ margin: '12px 0 0', fontSize: 44 }}>
            {isPro ? TIER_LABEL[tier] : 'Free'}
          </h1>
          <p style={{ margin: '20px 0 0', fontSize: 16, lineHeight: 1.5, color: 'var(--muted-strong)' }}>
            {isPro
              ? 'Everything is unlocked. Your licence lives on this device — no login, nothing to expire.'
              : 'Every everyday tool is yours already. Pro adds image editing and batch work.'}
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

        <div style={{ gridColumn: '5 / 13', minWidth: 0 }}>
          {/* ------------------------------------------------------ licence -- */}
          <div className="card">
            <div
              style={{
                padding: '14px 20px',
                borderBottom: 'var(--rule-width) solid var(--rule)',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                gap: 12,
              }}
            >
              <span className="label">Licence</span>
              <span className="muted" style={{ fontSize: 12 }}>
                Stored on this device
              </span>
            </div>

            <div style={{ padding: '20px' }}>
              {isPro ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap' }}>
                  <span style={{ color: 'var(--accent)' }}>
                    <PixelIcon name="check" size={5} />
                  </span>
                  <div>
                    <div style={{ fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                      {TIER_LABEL[tier]} active
                    </div>
                    <div className="muted" style={{ fontSize: 13, marginTop: 2 }}>
                      {tier === 'edu'
                        ? 'Student licence — the full Pro feature set, at no cost.'
                        : 'Lifetime licence. No renewal, no expiry.'}
                    </div>
                  </div>
                  <button
                    type="button"
                    className="btn btn--sm"
                    style={{ marginLeft: 'auto' }}
                    onClick={deactivate}
                  >
                    Sign out of this device
                  </button>
                </div>
              ) : (
                <form onSubmit={submit}>
                  <div className="label" style={{ marginBottom: 10, fontSize: 12 }}>
                    Have a licence key?
                  </div>
                  <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                    <input
                      className="input"
                      value={key}
                      aria-label="License key"
                      placeholder="DEMO-1234"
                      style={{ flex: 1, minWidth: 180 }}
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
                  <p className="muted" style={{ fontSize: 13, lineHeight: 1.55, marginTop: 14 }}>
                    Enter it once. It stays on this device until you clear your browser data — there is
                    no session to expire and nothing to log back into.{' '}
                    <Link to="/pricing" style={{ color: 'var(--accent)', fontWeight: 700 }}>
                      See what Pro includes
                    </Link>
                    .
                  </p>
                </form>
              )}
            </div>
          </div>

          {/* -------------------------------------------------------- usage -- */}
          <div className="card" style={{ marginTop: 24 }}>
            <div
              style={{
                padding: '14px 20px',
                borderBottom: 'var(--rule-width) solid var(--rule)',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                gap: 12,
              }}
            >
              <span className="label">Your usage</span>
              <span className="muted" style={{ fontSize: 12 }}>
                {total} file{total === 1 ? '' : 's'} processed
              </span>
            </div>

            {total === 0 ? (
              <div style={{ padding: '28px 20px', textAlign: 'center' }} className="muted">
                Nothing yet. Open a tool and it’ll start counting.
              </div>
            ) : (
              <div className="rowlist">
                {rows.map((row) => (
                  <div
                    key={row.label}
                    style={{
                      padding: '13px 20px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: 16,
                    }}
                  >
                    <span style={{ fontWeight: 700, fontSize: 15 }}>{row.label}</span>
                    <span
                      className="mono"
                      style={{ fontSize: 15, fontWeight: 900, color: row.count ? undefined : 'var(--muted)' }}
                    >
                      {row.count}
                    </span>
                  </div>
                ))}
              </div>
            )}

            <div
              style={{
                padding: '16px 20px',
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
                  background: 'var(--accent)',
                  marginTop: 5,
                  flex: 'none',
                }}
              />
              <p style={{ margin: 0, fontSize: 13, lineHeight: 1.55 }}>
                <strong>These numbers never leave your device.</strong>{' '}
                <span className="muted">
                  They’re counted in your browser, not on a server — we genuinely don’t know which
                  tools you use or how often. That also means they don’t follow you to another
                  device, and clearing your browser data resets them.
                </span>
              </p>
              {total > 0 && (
                <button type="button" className="btn btn--sm" style={{ flex: 'none' }} onClick={clear}>
                  Reset
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
