import { Link, NavLink, Outlet } from 'react-router-dom';
import PixelIcon from './PixelIcon.jsx';
import { useTheme } from '../hooks/useTheme.js';
import { usePro } from '../hooks/usePro.js';

const navLinkStyle = ({ isActive }) => ({
  fontSize: 13,
  fontWeight: 700,
  letterSpacing: '0.08em',
  textTransform: 'uppercase',
  color: isActive ? 'var(--accent)' : undefined,
});

function ThemeToggle() {
  const { theme, toggle } = useTheme();
  const nextIsDark = theme === 'light';
  return (
    <button
      type="button"
      className="btn btn--sm"
      onClick={toggle}
      aria-label={`Switch to ${nextIsDark ? 'dark' : 'light'} mode`}
      title={`Switch to ${nextIsDark ? 'dark' : 'light'} mode`}
      style={{ padding: '7px 10px' }}
    >
      <PixelIcon name={nextIsDark ? 'moon' : 'sun'} size={3} />
    </button>
  );
}

export default function Layout() {
  const { isPro, tier } = usePro();

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <header
        style={{
          position: 'sticky',
          top: 0,
          zIndex: 20,
          background: 'var(--bg)',
          borderBottom: 'var(--rule-width) solid var(--rule)',
        }}
      >
        <div
          className="container"
          style={{
            height: 66,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 16,
          }}
        >
          <Link to="/" style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <span style={{ color: 'var(--accent)', display: 'inline-flex' }}>
              <PixelIcon name="scissors" size={4} />
            </span>
            <span
              style={{
                fontWeight: 900,
                letterSpacing: '0.12em',
                textTransform: 'uppercase',
                fontSize: 16,
                textShadow: '2px 2px 0 var(--pixel-shadow)',
                whiteSpace: 'nowrap',
              }}
            >
              PDF&nbsp;Tools
            </span>
          </Link>

          <nav style={{ display: 'flex', alignItems: 'center', gap: 22 }}>
            <NavLink to="/" style={navLinkStyle} end className="hide-sm">
              Tools
            </NavLink>
            <NavLink to="/pricing" style={navLinkStyle}>
              Pricing
            </NavLink>
            <NavLink to="/privacy" style={navLinkStyle} className="hide-sm">
              Privacy
            </NavLink>
            <span className="chip hide-sm">
              <span className="chip__dot" />
              100% client-side
            </span>
            {isPro && <span className="tag-pro">{tier === 'edu' ? 'Student' : 'Pro'}</span>}
            <ThemeToggle />
          </nav>
        </div>
      </header>

      <main style={{ flex: 1 }}>
        <Outlet />
      </main>

      <footer style={{ borderTop: 'var(--rule-width) solid var(--rule)', marginTop: 'auto' }}>
        <div
          className="container grid12"
          style={{ padding: '36px var(--gutter)', alignItems: 'center' }}
        >
          <div
            style={{ gridColumn: '1 / 7', display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}
          >
            <span style={{ color: 'var(--accent)', display: 'inline-flex' }}>
              <PixelIcon name="scissors" size={4} />
            </span>
            <span style={{ fontWeight: 900, letterSpacing: '0.1em', textTransform: 'uppercase', fontSize: 14 }}>
              PDF Tools
            </span>
            <span className="muted" style={{ fontSize: 13 }}>
              Client-side PDF toolkit · MIT licensed
            </span>
          </div>
          <div style={{ gridColumn: '7 / 13', textAlign: 'right', fontSize: 13, lineHeight: 1.5 }}>
            Every network request this site makes is documented on the{' '}
            <Link to="/privacy" style={{ color: 'var(--accent)', fontWeight: 700 }}>
              Privacy page
            </Link>
            .
          </div>
        </div>
      </footer>
    </div>
  );
}
