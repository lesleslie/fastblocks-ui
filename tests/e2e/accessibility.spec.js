import { expect, test } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

test.describe('FastBlocks UI accessibility', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/demo/demo.html');
    await page.waitForLoadState('networkidle');
  });

  test('has no automatically detectable accessibility violations', async ({ page }) => {
    const scan = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
      .analyze();

    expect(scan.violations).toEqual([]);
  });
});
