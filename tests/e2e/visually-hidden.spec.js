import { expect, test } from '@playwright/test';

const PAGE = '/tests/e2e/fixtures/visually-hidden.html';

// `.ui-visually-hidden` moved off the deprecated `clip: rect(...)` onto
// `clip-path: inset(50%)`. The two render identically, so nothing in the visual
// output would catch a botched swap -- but the whole point of the utility is
// that content stays in the accessibility tree while leaving the visual layout.
// These assert both halves of that contract directly.
test.describe('Visually hidden utility', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(PAGE);
  });

  test('keeps hidden text out of the visual layout', async ({ page }) => {
    const box = await page.locator('#hidden').boundingBox();
    expect(box.width).toBeLessThanOrEqual(2);
    expect(box.height).toBeLessThanOrEqual(2);
  });

  test('keeps hidden text in the accessibility tree', async ({ page }) => {
    // The accessible name comes entirely from the visually-hidden span; if the
    // utility clipped it out of the a11y tree the button would be unnamed.
    await expect(page.locator('#labelled')).toHaveAccessibleName('Close dialog');
  });

  test('uses clip-path, not the deprecated clip', async ({ page }) => {
    const styles = await page.locator('#hidden').evaluate((el) => {
      const s = getComputedStyle(el);
      return { clip: s.clip, clipPath: s.clipPath };
    });
    expect(styles.clipPath).toContain('inset');
    expect(styles.clip).toBe('auto');
  });
});
