/**
 * Route module loaders, plus a synchronous cache for prerendering.
 *
 * Why this is not just `React.lazy` everywhere:
 *
 * A lazy route renders behind a Suspense boundary. When that boundary does not
 * settle before React flushes the shell, `prerenderToNodeStream` emits the
 * *fallback* into the static HTML and appends the real content later, hidden,
 * behind a client-side swap script. A crawler with no JavaScript then reads
 * "Loading tool…" instead of the page -- exactly the failure prerendering was
 * added to fix.
 *
 * Whether a boundary settles in time is a timing race, so it fails
 * inconsistently: eight routes inlined correctly and /edit, whose module graph
 * is the heaviest, did not. Awaiting the imports beforehand was not enough,
 * because `lazy()` still suspends for a microtask on first read.
 *
 * So the prerender path resolves the modules into this cache first, and
 * AppRoutes renders the cached component *directly* -- no Suspense, no
 * boundary, nothing to race. The browser build never populates the cache and
 * keeps the lazy behaviour, so route-level code splitting is unaffected.
 */

export const ROUTE_LOADERS = {
  Split: () => import('../routes/Split.jsx'),
  Merge: () => import('../routes/Merge.jsx'),
  Compress: () => import('../routes/Compress.jsx'),
  Reorder: () => import('../routes/Reorder.jsx'),
  ImagesToPdf: () => import('../routes/ImagesToPdf.jsx'),
  Edit: () => import('../routes/Edit.jsx'),
  Pricing: () => import('../routes/Pricing.jsx'),
  Privacy: () => import('../routes/Privacy.jsx'),
  Account: () => import('../routes/Account.jsx'),
  PdfToDocx: () => import('../routes/PdfToDocx.jsx'),
};

const resolved = new Map();

/** Prerender-only: load every route module so it can render synchronously. */
export async function preloadRoutes() {
  await Promise.all(
    Object.entries(ROUTE_LOADERS).map(async ([key, load]) => {
      resolved.set(key, (await load()).default);
    }),
  );
}

/** The already-loaded component for a route, or undefined in the browser. */
export const getLoadedRoute = (key) => resolved.get(key);

/**
 * True once every route module is in memory — i.e. we are prerendering.
 *
 * AppRoutes uses this to drop the Suspense boundary entirely rather than merely
 * avoid suspending inside it. That distinction turned out to matter: a boundary
 * that never suspends can still be used by React as a flush point, and on the
 * largest page (/edit, ~950 words) the shell exceeded the buffer before the
 * boundary closed, so its content was emitted after the shell and behind a
 * client-side swap script. No boundary, no flush point, no swap script.
 */
export const routesPreloaded = () => resolved.size === Object.keys(ROUTE_LOADERS).length;
