import { useEffect, useRef, useState } from 'react';
import { Link, NavLink, Outlet } from 'react-router-dom';
import PixelIcon from './PixelIcon.jsx';
import { THEME_FRAMES } from '../lib/bitmaps.js';
import { useTheme } from '../hooks/useTheme.js';
import { usePro } from '../hooks/usePro.js';

const navLinkStyle = ({ isActive }) => ({
  fontSize: 13,
  fontWeight: 700,
  letterSpacing: '0.08em',
  textTransform: 'uppercase',
  color: isActive ? 'var(--accent-text)' : undefined,
});

const FRAME_MS = 55;

function ThemeToggle() {
  const { theme, toggle } = useTheme();
  const nextIsDark = theme === 'light';
  // Index into THEME_FRAMES: 0 is the sun (light mode), last is the moon.
  const [frame, setFrame] = useState(theme === 'dark' ? THEME_FRAMES.length - 1 : 0);
  const timer = useRef(null);

  /**
   * Walk the frames one at a time toward whichever end the theme now wants.
   *
   * Driven off `theme` rather than the click so the icon still animates when
   * the OS flips at sunset, and so a mid-animation click simply reverses
   * direction instead of queueing a second run.
   */
  const target = theme === 'dark' ? THEME_FRAMES.length - 1 : 0;
  const reduced =
    typeof window !== 'undefined' &&
    window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

  useEffect(() => {
    // Nothing to schedule when motion is reduced: the frame is derived below.
    if (reduced) return undefined;

    timer.current = setInterval(() => {
      setFrame((current) => {
        if (current === target) {
          clearInterval(timer.current);
          return current;
        }
        return current < target ? current + 1 : current - 1;
      });
    }, FRAME_MS);

    return () => clearInterval(timer.current);
  }, [theme, reduced, target]);

  return (
    <button
      type="button"
      className="btn btn--sm"
      onClick={toggle}
      aria-label={`Switch to ${nextIsDark ? 'dark' : 'light'} mode`}
      title={`Switch to ${nextIsDark ? 'dark' : 'light'} mode`}
      style={{ padding: '7px 10px' }}
    >
      <PixelIcon matrix={THEME_FRAMES[reduced ? target : frame]} size={3} />
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
              <PixelIcon name="logo" size={4} />
            </span>
            {/* The wordmark drops on phones so the nav can keep Account. The
                mark alone is 28px against ~190px for mark-plus-name, which is
                the difference between the header fitting and the whole page
                scrolling sideways. */}
            <span
              className="hide-sm"
              style={{
                fontWeight: 900,
                letterSpacing: '0.12em',
                textTransform: 'uppercase',
                fontSize: 16,
                textShadow: '2px 2px 0 var(--pixel-shadow)',
                whiteSpace: 'nowrap',
              }}
            >
              PDF&nbsp;Splitter
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
            {/* Not hide-sm. With Tools, Privacy and Account all hidden, the
                mobile nav was "Pricing" plus a theme toggle and there was no
                hamburger -- /account had no route to it on a phone at all. */}
            <NavLink to="/account" style={navLinkStyle}>
              Account
            </NavLink>
            {isPro && (
              <Link to="/account" className="tag-pro" style={{ textDecoration: 'none' }}>
                {tier === 'edu' ? 'Student' : 'Pro'}
              </Link>
            )}
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
              <PixelIcon name="logo" size={4} />
            </span>
            <span style={{ fontWeight: 900, letterSpacing: '0.1em', textTransform: 'uppercase', fontSize: 14 }}>
              PDF Splitter
            </span>
            <span className="muted" style={{ fontSize: 13 }}>
              Client-side PDF toolkit · © 2026 Indevoria
            </span>
          </div>
          <div style={{ gridColumn: '7 / 13', textAlign: 'right', fontSize: 13, lineHeight: 1.5 }}>
            Every network request this site makes is documented on the{' '}
            <Link to="/privacy" style={{ color: 'var(--accent-text)', fontWeight: 700 }}>
              Privacy page
            </Link>
            .
          </div>
        </div>
      </footer>
    </div>
  );
}
