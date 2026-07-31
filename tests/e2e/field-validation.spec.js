import { expect, test } from '@playwright/test';

const PAGE = '/tests/e2e/fixtures/field-validation.html';

// The border-inline-start width is the observable signal: the invalid state
// adds `border-inline-start: 3px solid`, and every other field state leaves it
// at 0. Reading the computed value rather than a class keeps this a test of the
// rendered result, which is the point of a CSS-first component.
const borderWidth = (locator) =>
  locator.evaluate((el) => getComputedStyle(el).borderInlineStartWidth);

test.describe('Field validation states', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(PAGE);
  });

  test('an untouched required field is not styled invalid at page load', async ({ page }) => {
    // The whole reason for :user-invalid over :invalid. A bare `:invalid` rule
    // matches an empty required field before the user has done anything, so an
    // untouched form renders as already-failing.
    await expect(page.locator('#untouched input')).toHaveJSProperty('validity.valid', false);
    expect(await borderWidth(page.locator('#untouched'))).toBe('0px');
  });

  test('a field styles invalid once the user has edited it and left it empty', async ({
    page,
  }) => {
    // The value must actually CHANGE to set the element's user-interacted flag.
    // Focusing and blurring an empty required field is not enough -- the HTML
    // spec sets that flag on value change or on attempted submission, so a
    // click-in/click-out leaves :user-invalid correctly unmatched. Type then
    // delete to reach "the user emptied this" rather than "never touched".
    const input = page.locator('#interacted input');
    await input.click();
    await input.pressSequentially('x');
    await input.press('Backspace');
    await page.locator('#elsewhere').click();
    expect(await borderWidth(page.locator('#interacted'))).toBe('3px');
  });

  test('server-set aria-invalid still styles without any interaction', async ({ page }) => {
    // The pre-existing, server-authoritative path. htmx swaps in a field the
    // server rejected; nothing has been interacted with, and it must still read
    // as invalid.
    expect(await borderWidth(page.locator('#server-invalid'))).toBe('3px');
  });

  test('a disabled field is dimmed', async ({ page }) => {
    expect(
      await page.locator('#disabled').evaluate((el) => getComputedStyle(el).opacity),
    ).toBe('0.6');
  });
});
