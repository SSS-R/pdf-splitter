import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'

/**
 * Deliberately `createRoot`, not `hydrateRoot`, even though the HTML is
 * prerendered (scripts/prerender.js).
 *
 * Hydration would need the route's lazy chunk resolved *before* the first
 * client render. It isn't: the tool routes sit behind React.lazy with no SSR
 * module manifest, so hydration would suspend, paint the "Loading tool…"
 * fallback, and mismatch the prerendered markup it was supposed to adopt.
 *
 * The prerender exists so crawlers and link-preview bots get real content, and
 * that works regardless of how the client mounts. Users get the prerendered
 * paint first, then React takes over. If hydration is ever worth the TTI win,
 * it needs an SSR manifest to preload route chunks *and* a deterministic first
 * render from useTheme (which currently resolves from localStorage/OS).
 */
createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
