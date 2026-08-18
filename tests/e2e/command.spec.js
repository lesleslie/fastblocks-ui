import { expect, test } from '@playwright/test';

const PAGE = '/tests/e2e/fixtures/command.html';

test.describe('ui-command', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(PAGE);
  });

  test('throws if load_results is missing', async ({ page }) => {
    await page.evaluate(async () => {
      const mod = await import('/fastblocks_ui/static/js/command-palette.js');
      try { mod.open_command_palette({ trigger: document.body }); }
      catch (e) { window.__err = e.message; }
    });
    expect(await page.evaluate(() => window.__err)).toMatch(/load_results/);
  });

  test('opening via "/" works (slash keybinding, Decision 5a)', async ({ page }) => {
    await page.keyboard.press('/');
    await expect(page.locator('[data-command-input]')).toBeVisible();
  });

  test('opening via Cmd+K works (mod+k keybinding, preventDefault)', async ({ page }) => {
    // Cmd on macOS, Ctrl on Linux/Windows — Playwright normalizes
    await page.keyboard.press('Control+K');
    await expect(page.locator('[data-command-input]')).toBeVisible();
  });

  test('typing filters results', async ({ page }) => {
    await page.keyboard.press('/');
    await page.locator('[data-command-input]').fill('save');
    const results = page.locator('[data-command-results] li');
    await expect(results).toHaveCount(1);
    await expect(results.first()).toContainText('Save document');
  });

  test('Escape closes the palette', async ({ page }) => {
    await page.keyboard.press('/');
    await expect(page.locator('[data-command-input]')).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(page.locator('[data-command-input]')).toBeHidden();
  });

  test('stale async results are aborted on new keystroke', async ({ page }) => {
    let abortsSeen = 0;
    await page.exposeFunction('__noteAbort', () => { abortsSeen++; });
    await page.evaluate(() => {
      const orig = AbortController;
      window.AbortController = class extends orig {
        constructor() { super(); this.__flagged = true; }
        abort() { super.abort(); window.__noteAbort(); }
      };
    });
    await page.keyboard.press('/');
    await page.locator('[data-command-input]').fill('s');
    await page.locator('[data-command-input]').fill('se');
    await page.locator('[data-command-input]').fill('sav');
    await page.waitForTimeout(500);
    expect(abortsSeen).toBeGreaterThanOrEqual(2);
  });

  // XSS guard: user-supplied slot values (placeholder) must be rendered as
  // text, not parsed as HTML. Regression test for the JS sink that replaced
  // innerHTML interpolation with createElement + textContent.
  test('placeholder is rendered as text, not parsed as HTML (XSS guard)', async ({ page }) => {
    await page.evaluate(() => { window.__xssFired = false; });
    await page.evaluate(async () => {
      const mod = await import('/fastblocks_ui/static/js/command-palette.js');
      mod.open_command_palette({
        trigger: document.body,
        placeholder: '<script>window.__xssFired = true</script>',
        load_results: async () => [],
      });
    });
    await page.waitForSelector('[data-command-input]');
    const xssFired = await page.evaluate(() => window.__xssFired === true);
    expect(xssFired).toBe(false);
    const placeholder = await page.locator('[data-command-input]').first().getAttribute('placeholder');
    expect(placeholder).toBe('<script>window.__xssFired = true</script>');
  });
});
