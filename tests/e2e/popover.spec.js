import { expect, test } from '@playwright/test';

const PAGE = '/tests/e2e/fixtures/popover.html';

test.describe('ui-popover', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(PAGE);
  });

  test('popover has popover="auto" and ui-popover class', async ({ page }) => {
    const p = page.locator('#profile-pop');
    await expect(p).toHaveAttribute('popover', 'auto');
    await expect(p).toHaveClass(/ui-popover/);
  });

  test('clicking the trigger toggles the popover', async ({ page }) => {
    await page.locator('#open-profile').click();
    await expect(page.locator('#profile-pop:visible')).toBeVisible();
    await page.locator('#open-profile').click();
    await expect(page.locator('#profile-pop:visible')).toBeHidden();
  });

  test('aria-expanded toggles on the trigger (Decision 3a fix)', async ({ page }) => {
    const trigger = page.locator('#open-settings');
    await expect(trigger).toHaveAttribute('aria-expanded', 'false');
    await trigger.click();
    await expect(trigger).toHaveAttribute('aria-expanded', 'true');
    await trigger.click();
    await expect(trigger).toHaveAttribute('aria-expanded', 'false');
  });

  test('Escape dismisses', async ({ page }) => {
    await page.locator('#open-profile').click();
    await expect(page.locator('#profile-pop:visible')).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(page.locator('#profile-pop:visible')).toBeHidden();
  });

  test('outside-click dismisses', async ({ page }) => {
    await page.locator('#open-profile').click();
    await expect(page.locator('#profile-pop:visible')).toBeVisible();
    await page.locator('body').click({ position: { x: 5, y: 5 } });
    await expect(page.locator('#profile-pop:visible')).toBeHidden();
  });
});
