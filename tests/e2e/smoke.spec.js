import { expect, test } from '@playwright/test';

test.describe('FastBlocks UI smoke', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/demo.html');
    await page.waitForLoadState('networkidle');
  });

  test('renders the demo and boots the enhancement layer', async ({ page }) => {
    await expect(page.getByRole('heading', { name: 'FastBlocks UI' })).toBeVisible();
    await expect(page.getByText('HTML/CSS-first components, semantic tokens, htmx-safe fragments, and optional enhancement JavaScript.')).toBeVisible();
    await expect(page.getByText('Source of truth:')).toBeVisible();
    await expect(page.locator('[data-ui-component-list] .ui-badge')).toHaveCount(11);
    await expect(page.getByRole('heading', { name: 'Validation' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Display name must be at least 3 characters.' })).toBeVisible();
    await expect(page.locator('#demo-display-name-error')).toBeVisible();
    await expect(page.getByText('Please correct the errors below.')).toBeVisible();
  });

  test('opens and closes the dialog', async ({ page }) => {
    await page.getByRole('button', { name: 'Open dialog' }).click();
    await expect(page.locator('#demo-dialog')).toHaveAttribute('open', '');
    await expect(page.locator('#demo-dialog')).toHaveAttribute('aria-hidden', 'false');

    await page.locator('#demo-dialog [data-ui-dialog-close]').click();
    await expect(page.locator('#demo-dialog')).not.toHaveAttribute('open', '');
    await expect(page.locator('#demo-dialog')).toHaveAttribute('aria-hidden', 'true');
  });

  test('toggles the menu', async ({ page }) => {
    await page.getByRole('button', { name: 'Toggle menu' }).click();
    await expect(page.locator('#demo-menu')).not.toBeHidden();
    await expect(page.getByRole('button', { name: 'Toggle menu' })).toHaveAttribute('aria-expanded', 'true');
  });

  test('switches tabs and updates visible panels', async ({ page }) => {
    await expect(page.locator('#demo-overview')).toBeVisible();
    await expect(page.locator('#demo-details')).toBeHidden();

    await page.getByRole('tab', { name: 'Details' }).click();

    await expect(page.locator('#demo-overview')).toBeHidden();
    await expect(page.locator('#demo-details')).toBeVisible();
  });
});
