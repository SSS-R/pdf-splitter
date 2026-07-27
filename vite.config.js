import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { copyFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const projectRoot = resolve(fileURLToPath(import.meta.url), '..')

/**
 * Static hosts serve files, not routes. A visitor who lands directly on
 * /split -- from search, which is the entire point of giving each tool its own
 * URL -- gets a 404, because no split.html exists. GitHub Pages serves 404.html
 * for any unmatched path, so shipping a copy of index.html under that name
 * makes deep links boot the app instead of dead-ending.
 *
 * This is a stopgap. The real fix is prerendering each route to its own HTML
 * file (ROADMAP Phase 0.3) so crawlers get real content rather than an empty
 * shell. Cloudflare Pages does the same job via a _redirects rule.
 */
const spaFallback = () => ({
  name: 'spa-fallback-404',
  closeBundle() {
    const dist = resolve(projectRoot, 'dist')
    copyFileSync(resolve(dist, 'index.html'), resolve(dist, '404.html'))
  },
})

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), spaFallback()],
  base: '/pdf-splitter/',
  test: {
    include: ['src/**/*.test.js'],
  },
})
