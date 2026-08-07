import { lazy, Suspense } from 'react';
import { Routes, Route, Navigate } from 'react-router';
import Layout from './components/Layout.jsx';
import ScrollToTop from './components/ScrollToTop.jsx';
import Home from './routes/Home.jsx';
import { ROUTE_LOADERS, getLoadedRoute, routesPreloaded } from './lib/routeLoaders.js';

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
/**
 * Each route renders the already-loaded module when there is one (the prerender
 * path, which populates the cache first) and falls back to a lazy chunk
 * otherwise (the browser). Rendering the loaded component directly means the
 * static build has no Suspense boundary to race -- see lib/routeLoaders.js.
 */
const routeComponent = (key) => {
  const Lazy = lazy(ROUTE_LOADERS[key]);
  return function RouteComponent(props) {
    const Loaded = getLoadedRoute(key);
    return Loaded ? <Loaded {...props} /> : <Lazy {...props} />;
  };
};

const Split = routeComponent('Split');
const Merge = routeComponent('Merge');
const Compress = routeComponent('Compress');
const Reorder = routeComponent('Reorder');
const ImagesToPdf = routeComponent('ImagesToPdf');
const Edit = routeComponent('Edit');
const Pricing = routeComponent('Pricing');
const Privacy = routeComponent('Privacy');
const Account = routeComponent('Account');
const PdfToDocx = routeComponent('PdfToDocx');

function RouteFallback() {
  return (
    <div className="container" style={{ padding: '56px var(--gutter)' }}>
      <div className="label muted">Loading tool…</div>
    </div>
  );
}

const toolRoutes = (
  <Routes>
    <Route path="split" element={<Split />} />
    <Route path="merge" element={<Merge />} />
    <Route path="compress" element={<Compress />} />
    <Route path="reorder" element={<Reorder />} />
    <Route path="images-to-pdf" element={<ImagesToPdf />} />
    <Route path="edit" element={<Edit />} />
    <Route path="pricing" element={<Pricing />} />
    <Route path="privacy" element={<Privacy />} />
    <Route path="account" element={<Account />} />
    <Route path="pdf-to-docx" element={<PdfToDocx />} />
    <Route path="*" element={<Navigate to="/" replace />} />
  </Routes>
);

/**
 * The boundary exists only for the browser, where route chunks really are
 * fetched on demand. During prerendering every module is already in memory, so
 * wrapping them in Suspense buys nothing and costs correctness -- React may use
 * the boundary as a flush point and emit the page's content after the shell,
 * behind a script that only runs if JavaScript does. See lib/routeLoaders.js.
 */
const routeArea = () =>
  routesPreloaded() ? toolRoutes : <Suspense fallback={<RouteFallback />}>{toolRoutes}</Suspense>;

export default function AppRoutes() {
  return (
    <>
      <ScrollToTop />
      <Routes>
        <Route element={<Layout />}>
          <Route index element={<Home />} />
          <Route path="*" element={routeArea()} />
        </Route>
      </Routes>
    </>
  );
}
