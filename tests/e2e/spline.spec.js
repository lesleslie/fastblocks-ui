import { expect, test } from '@playwright/test';

const PAGE = '/tests/e2e/fixtures/spline.html';

test.describe('ui-spline', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(PAGE);
  });

  test('wrapper renders with .ui-spline class and data-spline-url attribute', async ({ page }) => {
    const el = page.locator('.ui-spline');
    await expect(el).toHaveAttribute('data-spline-url');
    await expect(el).toHaveAttribute('aria-label', 'Interactive 3D model');
  });

  test('skipped under prefers-reduced-motion', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    // No canvas should be appended (the loader short-circuits)
    const canvases = await page.locator('.ui-spline canvas').count();
    expect(canvases).toBe(0);
  });
});
