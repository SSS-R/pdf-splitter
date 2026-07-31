import { lazy, Suspense } from 'react';
import { Routes, Route, Navigate } from 'react-router';
import Layout from './components/Layout.jsx';
import ScrollToTop from './components/ScrollToTop.jsx';
import Home from './routes/Home.jsx';

/**
 * Route table, router-agnostic on purpose: App.jsx wraps it in a BrowserRouter
 * for the browser, entry-server.jsx wraps it in a StaticRouter for prerendering.
 * Keeping one table means a new tool cannot ship to one and not the other.
 *
 * Every route that touches pdf-lib is lazy-loaded. pdf-lib is ~640 kB raw, and
 * eager-importing it meant the marketing pages -- the ones that have to rank
 * and load fast -- shipped the entire PDF engine to visitors who never opened
 * a tool. Now it arrives only when someone actually opens one.
 *
 * Prerendering resolves these lazy boundaries at build time via React 19's
 * `prerenderToNodeStream`, so the static HTML holds real content, not the
 * fallback below.
 */
const Split = lazy(() => import('./routes/Split.jsx'));
const Merge = lazy(() => import('./routes/Merge.jsx'));
const Compress = lazy(() => import('./routes/Compress.jsx'));
const Reorder = lazy(() => import('./routes/Reorder.jsx'));
const ImagesToPdf = lazy(() => import('./routes/ImagesToPdf.jsx'));
const Pricing = lazy(() => import('./routes/Pricing.jsx'));
const Privacy = lazy(() => import('./routes/Privacy.jsx'));

function RouteFallback() {
  return (
    <div className="container" style={{ padding: '56px var(--gutter)' }}>
      <div className="label muted">Loading tool…</div>
    </div>
  );
}

export default function AppRoutes() {
  return (
    <>
      <ScrollToTop />
      <Routes>
        <Route element={<Layout />}>
          <Route index element={<Home />} />
          <Route
            path="*"
            element={
              <Suspense fallback={<RouteFallback />}>
                <Routes>
                  <Route path="split" element={<Split />} />
                  <Route path="merge" element={<Merge />} />
                  <Route path="compress" element={<Compress />} />
                  <Route path="reorder" element={<Reorder />} />
                  <Route path="images-to-pdf" element={<ImagesToPdf />} />
                  <Route path="pricing" element={<Pricing />} />
                  <Route path="privacy" element={<Privacy />} />
                  <Route path="*" element={<Navigate to="/" replace />} />
                </Routes>
              </Suspense>
            }
          />
        </Route>
      </Routes>
    </>
  );
}
