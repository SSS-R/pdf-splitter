import { defineConfig, devices } from '@playwright/test';

/**
 * E2E config.
 *
 * Tests run against `vite preview` (the built output), never the dev server.
 * Half the point of this suite is asserting that routes prerender to real
 * HTML, and prerendering only exists in a production build -- running against
 * `vite dev` would pass while shipping empty pages.
 *
 * BASE is Vite's `base`; every route lives under it.
 */
export const BASE = '/pdf-splitter';

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: process.env.CI ? 'line' : [['list']],

  use: {
    baseURL: 'http://localhost:4173',
    trace: 'on-first-retry',
  },

  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],

  webServer: {
    // Build then serve, so the suite always tests current source.
    command: 'npm run build && npm run preview -- --port 4173',
    url: `http://localhost:4173${BASE}/`,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});
