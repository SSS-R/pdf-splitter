import { lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/Layout.jsx';
import ScrollToTop from './components/ScrollToTop.jsx';
import Home from './routes/Home.jsx';

/**
 * Route table. Each tool owns a real URL so it can be prerendered to static
 * HTML and ranked independently -- the point of the SEO work in ROADMAP 0.3.
 *
 * Every route that touches pdf-lib is lazy-loaded. pdf-lib is ~640 kB raw, and
 * eager-importing it meant the marketing pages -- the ones that have to rank
 * and load fast -- shipped the entire PDF engine to visitors who never opened
 * a tool. Now it arrives only when someone actually opens one.
 *
 * `basename` comes from Vite so the app works both under the GitHub Pages
 * subpath (/pdf-splitter/) and at the root of the custom domain later.
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

export default function App() {
  return (
    <BrowserRouter basename={import.meta.env.BASE_URL}>
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
    </BrowserRouter>
  );
}
