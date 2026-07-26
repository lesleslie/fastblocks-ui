import { defineConfig, devices } from '@playwright/test';

/**
 * Playwright E2E Test Configuration for FastBlocks UI
 *
 * Runs end-to-end tests in multiple browsers to verify:
 * - Demo page smoke coverage
 * - Component behavior and initialization
 * - Theme switching
 * - CSS variable application
 * - Accessibility (with axe-core)
 */
export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: [
    ['html', { outputFolder: 'playwright-report' }],
    ['json', { outputFile: 'playwright-results.json' }],
    ['junit', { outputFile: 'playwright-junit.xml' }],
    ['list'],
  ],

  use: {
    // Base URL for tests. Specs target demo/demo.html (hand-written reference; see
    // tests/test_demo_parity.py for the drift check against demo/index.html's real
    // helper output). Both demo pages inline their own CSS and JS, so the only
    // runtime asset either one fetches is demo/manifest.json -- a symlink to
    // fastblocks_ui/manifest.json, resolved relative to the page.
    baseURL: 'http://localhost:8080',

    // Collect trace when retrying the failed test
    trace: 'on-first-retry',

    // Take screenshot on failure
    screenshot: 'only-on-failure',

    // Record video on failure
    video: 'retain-on-failure',

    // Browser viewport size
    viewport: { width: 1280, height: 720 },
  },

  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },

    {
      name: 'firefox',
      use: { ...devices['Desktop Firefox'] },
    },

    {
      name: 'webkit',
      use: { ...devices['Desktop Safari'] },
    },

    /* Accessibility testing project with axe-core */
    {
      name: 'accessibility',
      testMatch: /accessibility\.spec\.js/,
      use: {
        ...devices['Desktop Chrome'],
      },
    },
  ],

  // Run your local dev server before starting the tests. Serves the repo root so the
  // specs' /demo/... paths resolve, and so demo/manifest.json (a symlink up into
  // fastblocks_ui/) stays inside the served tree.
  webServer: {
    command: 'python3 -m http.server 8080',
    url: 'http://localhost:8080',
    reuseExistingServer: !process.env.CI,
    timeout: 120000,
  },
});
