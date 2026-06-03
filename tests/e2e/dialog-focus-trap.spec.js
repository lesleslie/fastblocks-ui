import { expect, test } from '@playwright/test';

test.describe('Dialog focus management', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/demo.html');
    await page.waitForLoadState('networkidle');
  });

  test('moves focus into the dialog and restores it on Escape', async ({ page }) => {
    const trigger = page.getByRole('button', { name: 'Open dialog' });
    await trigger.focus();
    await trigger.click();

    await expect(page.locator('#demo-dialog')).toHaveAttribute('open', '');
    // openDialog() moves focus to the first focusable inside the dialog.
    await expect(page.locator('#demo-dialog [data-ui-dialog-close]')).toBeFocused();

    await page.keyboard.press('Escape');
    await expect(page.locator('#demo-dialog')).not.toHaveAttribute('open', '');
    // closeDialog() restores focus to the trigger.
    await expect(trigger).toBeFocused();
  });

  test('traps Tab focus on the non-modal fallback path', async ({ page }) => {
    // Force the fallback (no showModal) so the library's own trap runs rather than
    // the browser's native modal trap, and inject a dialog with two focusables.
    await page.evaluate(() => {
      HTMLDialogElement.prototype.showModal = undefined;
      const host = document.createElement('ui-dialog');
      host.className = 'ui-dialog';
      host.setAttribute('data-ui-dialog', '');
      host.innerHTML =
        '<button type="button" id="ft-trigger" data-ui-dialog-trigger aria-controls="ft" aria-expanded="false">Open FT</button>' +
        '<dialog id="ft" class="ui-dialog" aria-hidden="true">' +
        '<button id="ft-a" type="button" data-ui-dialog-close>A</button>' +
        '<a id="ft-b" href="#x">B</a>' +
        '</dialog>';
      document.querySelector('main').appendChild(host);
    });

    await page.locator('#ft-trigger').click();
    await expect(page.locator('#ft')).toHaveAttribute('open', '');

    // Tabbing forward from the last focusable wraps to the first.
    await page.locator('#ft-b').focus();
    await page.keyboard.press('Tab');
    await expect(page.locator('#ft-a')).toBeFocused();

    // Shift+Tab from the first wraps back to the last.
    await page.locator('#ft-a').focus();
    await page.keyboard.press('Shift+Tab');
    await expect(page.locator('#ft-b')).toBeFocused();
  });
});
