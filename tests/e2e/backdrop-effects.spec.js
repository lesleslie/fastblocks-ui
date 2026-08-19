import { expect, test } from '@playwright/test';

const PAGE = '/tests/e2e/fixtures/backdrop-effects.html';

test.describe('backdrop effects', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(PAGE);
  });

  test('has-fullbleed spans the viewport width', async ({ page }) => {
    const el = page.locator('.has-fullbleed');
    const box = await el.boundingBox();
    expect(box.width).toBeGreaterThan(1000); // viewport-relative width
  });

  test('has-aurora applies transform animation (not background-position)', async ({ page }) => {
    const el = page.locator('.has-aurora');
    const animation = await el.evaluate(
      (e) => getComputedStyle(e, '::before').animation,
    );
    expect(animation).toContain('ui-aurora-drift');
    expect(animation).not.toContain('background-position');
  });

  test('has-noise applies noise opacity from --ui-noise-opacity', async ({ page }) => {
    const el = page.locator('.has-noise');
    const opacity = await el.evaluate(
      (e) => getComputedStyle(e, '::before').opacity,
    );
    expect(parseFloat(opacity)).toBeGreaterThan(0);
    expect(parseFloat(opacity)).toBeLessThanOrEqual(0.5);
  });

  test('has-pattern-dots uses --ui-pattern-size for background-size', async ({ page }) => {
    const el = page.locator('.has-pattern-dots');
    const bgSize = await el.evaluate(
      (e) => getComputedStyle(e, '::before').backgroundSize,
    );
    expect(bgSize).toBe('16px 16px'); // default
  });

  test('aurora animation disabled under prefers-reduced-motion', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    const animationName = await page.locator('.has-aurora').evaluate(
      (e) => getComputedStyle(e, '::before').animationName,
    );
    expect(animationName).toBe('none');
  });
});
