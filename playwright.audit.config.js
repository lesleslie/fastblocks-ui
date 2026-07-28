// Audit-only Playwright config.
//
// The committed `playwright.config.js` cannot run on this machine: the
// bundled Chromium fails to extract, and video/trace capture dies in ffmpeg
// with "Unknown system error -88", which masks real passes as failures.
// This config uses the installed Google Chrome via `channel` and disables
// video/trace so the suite reports actual results.
import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: true,
  reporter: [['list']],
  use: {
    baseURL: 'http://localhost:8080',
    trace: 'off',
    screenshot: 'off',
    video: 'off',
    viewport: { width: 1280, height: 720 },
    channel: 'chrome',
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'], channel: 'chrome' } },
  ],
  webServer: {
    command: 'python3 -m http.server 8080',
    url: 'http://localhost:8080',
    reuseExistingServer: true,
    timeout: 120000,
  },
});
