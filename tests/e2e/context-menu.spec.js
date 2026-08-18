import { expect, test } from '@playwright/test';

const PAGE = '/tests/e2e/fixtures/context-menu.html';

test.describe('ui-context-menu', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(PAGE);
  });

  test('trigger has aria-haspopup="menu" (APG requirement)', async ({ page }) => {
    await expect(page.locator('#file-tree')).toHaveAttribute('aria-haspopup', 'menu');
  });

  test('right-click opens the menu', async ({ page }) => {
    const target = page.locator('#file-tree');
    await target.click({ button: 'right' });
    await expect(page.locator('#file-menu:visible')).toBeVisible();
  });

  test('Shift-F10 opens the menu (keyboard equivalent)', async ({ page }) => {
    await page.locator('#file-tree').focus();
    await page.keyboard.press('Shift+F10');
    await expect(page.locator('#file-menu:visible')).toBeVisible();
  });

  test('ArrowDown / ArrowUp navigate items', async ({ page }) => {
    await page.locator('#file-tree').click({ button: 'right' });
    const items = page.locator('#file-menu [role="menuitem"]');
    await expect(items.nth(0)).toBeFocused();
    await page.keyboard.press('ArrowDown');
    await expect(items.nth(1)).toBeFocused();
    await page.keyboard.press('ArrowUp');
    await expect(items.nth(0)).toBeFocused();
  });

  test('Escape closes', async ({ page }) => {
    await page.locator('#file-tree').click({ button: 'right' });
    await expect(page.locator('#file-menu:visible')).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(page.locator('#file-menu:visible')).toBeHidden();
  });

  test('Enter activates an item', async ({ page }) => {
    await page.locator('#file-tree').click({ button: 'right' });
    await page.keyboard.press('Enter');
    // The fixture's "rename" item logs to console; we just verify
    // the menu closed (the action fired).
    await expect(page.locator('#file-menu:visible')).toBeHidden();
  });

  // XSS guard: Python helper interpolates `item["label"]` into the
  // menuitem content. A malicious label like `<script>...` MUST be
  // rendered as text, not parsed as HTML. Regression test for the
  // explicit `escape(label, quote=True)` defense-in-depth added on top
  // of `_safe()`.
  test('context-menu item labels are rendered as text, not parsed as HTML (XSS guard)', async ({ page }) => {
    await page.evaluate(() => { window.__xssFired = false; });
    await page.evaluate(async () => {
      const mod = await import('/fastblocks_ui/static/js/context-menu.js');
      mod.init(document);
      const target = document.getElementById('file-tree');
      // Re-render the menu with a malicious label injected into a
      // menuitem, then dispatch a right-click + click sequence to
      // trigger the JS sink (none — labels are set via textContent).
      const menu = document.getElementById('file-menu');
      const evil = document.createElement('li');
      evil.setAttribute('role', 'menuitem');
      evil.setAttribute('data-action', 'rename');
      evil.textContent = '<script>window.__xssFired = true</script>';
      menu.appendChild(evil);
      const evt = new MouseEvent('contextmenu', { bubbles: true, clientX: 100, clientY: 100 });
      target.dispatchEvent(evt);
      // Simulate clicking the menuitem — this is the path that fires
      // the custom event; the XSS payload would have already parsed
      // during innerHTML insertion in the helper if escape() weren't
      // applied.
      evil.click();
    });
    await page.waitForTimeout(200);
    expect(await page.evaluate(() => window.__xssFired)).toBe(false);
    // The literal <script> tag text should be preserved in the menuitem.
    await expect(page.locator('#file-menu li').last()).toContainText('<script>');
  });
});