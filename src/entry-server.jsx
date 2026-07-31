import { StaticRouter } from 'react-router';
import { prerenderToNodeStream } from 'react-dom/static';
import AppRoutes from './AppRoutes.jsx';

/**
 * Prerender entry, used only by scripts/prerender.js at build time.
 *
 * `prerenderToNodeStream` (React 19) is used rather than `renderToString`
 * because the tool routes sit behind React.lazy: renderToString would emit the
 * "Loading tool…" fallback, which is exactly the empty-shell problem
 * prerendering exists to fix. The static API waits for Suspense boundaries to
 * resolve, so the emitted HTML contains the real page.
 */
export async function render(url) {
  const { prelude } = await prerenderToNodeStream(
    <StaticRouter location={url}>
      <AppRoutes />
    </StaticRouter>,
  );

  let html = '';
  for await (const chunk of prelude) html += chunk;
  return html;
}
