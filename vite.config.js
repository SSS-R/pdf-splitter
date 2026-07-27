import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
//
// The build is three steps (see package.json "build"):
//   1. vite build                       -> dist/ client bundle + shell
//   2. vite build --ssr entry-server    -> dist-ssr/ node bundle
//   3. node scripts/prerender.js        -> real HTML per route, sitemap, robots
//
// Step 3 also writes dist/404.html, so static hosts still boot the SPA on an
// unknown path.
export default defineConfig({
  plugins: [react()],
  base: '/pdf-splitter/',
  ssr: {
    // file-saver is CommonJS with no named ESM exports, so Node's ESM loader
    // rejects `import { saveAs }` when Vite leaves it external. Bundling it
    // into the SSR output lets Vite rewrite the interop. Without this the tool
    // routes' lazy imports reject and prerender silently emits empty pages.
    noExternal: ['file-saver'],
  },
  test: {
    include: ['src/**/*.test.js'],
  },
})
