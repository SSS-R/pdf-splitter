import { BrowserRouter } from 'react-router';
import AppRoutes from './AppRoutes.jsx';

/**
 * Browser entry. The route table itself lives in AppRoutes.jsx so the prerender
 * step can mount the same tree under a StaticRouter.
 *
 * `basename` comes from Vite so the app works both under the GitHub Pages
 * subpath (/pdf-splitter/) and at the root of the custom domain later.
 */
export default function App() {
  return (
    <BrowserRouter basename={import.meta.env.BASE_URL}>
      <AppRoutes />
    </BrowserRouter>
  );
}
