import { StaticRouter } from 'react-router';
import { prerenderToNodeStream } from 'react-dom/static';
import AppRoutes from './AppRoutes.jsx';
import { preloadRoutes } from './lib/routeLoaders.js';

/**
 * Prerender entry, used only by scripts/prerender.js at build time.
 *
 * `prerenderToNodeStream` (React 19) is used rather than `renderToString`
 * because the tool routes sit behind React.lazy: renderToString would emit the
 * "Loading tool…" fallback, which is exactly the empty-shell problem
 * prerendering exists to fix. The static API waits for Suspense boundaries to
 * resolve, so the emitted HTML contains the real page.
 */
const tree = (url) => (
  <StaticRouter location={url}>
    <AppRoutes />
  </StaticRouter>
);

const drain = async (stream) => {
  let html = '';
  for await (const chunk of stream) html += chunk;
  return html;
};

export async function render(url) {
  // Load every route module first. AppRoutes then renders them directly and
  // drops the Suspense boundary altogether, so nothing in the tree can suspend
  // and the prelude is plain static HTML. See lib/routeLoaders.js for what went
  // wrong when the boundary was left in place.
  await preloadRoutes();

  return drain((await prerenderToNodeStream(tree(url))).prelude);
}
