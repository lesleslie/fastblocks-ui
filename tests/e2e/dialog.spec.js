import { expect, test } from '@playwright/test';

const PAGE = '/tests/e2e/fixtures/dialog.html';

test.describe('Dialog on command/commandfor', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(PAGE);
  });

  test('opens from command="show-modal" with no author JavaScript', async ({ page }) => {
    await expect(page.locator('#dlg')).toBeHidden();
    await page.locator('#open').click();
    await expect(page.locator('#dlg')).toBeVisible();
  });

  // The distinction the whole task rests on. `command="show-modal"` must produce
  // a genuinely MODAL dialog -- that is what supplies the focus trap the
  // hand-rolled trapTabFocus() used to provide for the non-modal path.
  test('opens modally, not merely open', async ({ page }) => {
    await page.locator('#open').click();
    const state = await page.locator('#dlg').evaluate((el) => ({
      open: el.hasAttribute('open'),
      modal: el.matches(':modal'),
    }));
    expect(state.open).toBe(true);
    expect(state.modal).toBe(true);
  });

  test('Tab never escapes the modal to background controls', async ({ page }) => {
    // The guarantee is "focus cannot reach background interactive content", NOT
    // "activeElement is always a descendant of the dialog". Engines legitimately
    // route focus through <body> or the dialog element itself while cycling:
    //
    //   chromium  close -> body -> inside-link -> close -> body
    //   firefox   close -> close -> close -> close
    //   webkit    body -> dlg -> body -> dlg
    //
    // None of them ever land on #before or #after, which is the property that
    // makes the hand-rolled trapTabFocus() redundant for modal dialogs.
    await page.locator('#open').click();
    await page.locator('#inside-link').focus();

    const visited = [];
    for (let i = 0; i < 8; i += 1) {
      await page.keyboard.press('Tab');
      visited.push(await page.evaluate(() => document.activeElement?.id ?? ''));
    }
    expect(visited).not.toContain('before');
    expect(visited).not.toContain('after');
  });

  test('background content is inert while the modal is open', async ({ page }) => {
    await page.locator('#open').click();
    // A modal dialog makes everything outside it inert, so a click on a
    // background button must not reach it.
    let reached = false;
    await page.exposeFunction('__bgClicked', () => {
      reached = true;
    });
    await page.locator('#after').evaluate((el) => el.addEventListener('click', () => window.__bgClicked()));
    await page.locator('#after').click({ force: true, timeout: 2000 }).catch(() => {});
    expect(reached).toBe(false);
  });

  test('closes via command="close" and restores focus to the invoker', async ({ page }) => {
    // Keyboard-driven: WebKit follows the macOS convention of not focusing a
    // button on click, so a mouse-driven version asserts a restore that never
    // had anywhere to restore from.
    await page.locator('#open').focus();
    await page.keyboard.press('Enter');
    await expect(page.locator('#dlg')).toBeVisible();

    await page.locator('#close').click();
    await expect(page.locator('#dlg')).toBeHidden();
    await expect(page.locator('#open')).toBeFocused();
  });

  test('Escape closes it', async ({ page }) => {
    await page.locator('#open').click();
    await page.keyboard.press('Escape');
    await expect(page.locator('#dlg')).toBeHidden();
  });

  test('renders a backdrop', async ({ page }) => {
    await page.locator('#open').click();
    const hasBackdrop = await page.locator('#dlg').evaluate((el) => {
      const bg = getComputedStyle(el, '::backdrop').backgroundColor;
      return bg !== '' && bg !== 'rgba(0, 0, 0, 0)' && bg !== 'transparent';
    });
    expect(hasBackdrop).toBe(true);
  });
});
