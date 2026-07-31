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

test.describe('Textarea auto-sizing', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(PAGE);
  });

  test('grows with content instead of scrolling', async ({ page }) => {
    const textarea = page.locator('#growing-textarea');
    const height = () => textarea.evaluate((el) => el.clientHeight);

    const before = await height();
    await textarea.fill('one\ntwo\nthree\nfour\nfive\nsix\nseven');
    const after = await height();

    expect(after).toBeGreaterThan(before);
    // Growing, not scrolling: the content must fit without overflow.
    expect(await textarea.evaluate((el) => el.scrollHeight - el.clientHeight)).toBeLessThanOrEqual(
      1,
    );
  });

  test('keeps a usable minimum height when empty', async ({ page }) => {
    // `field-sizing: content` sizes to content, which makes an empty textarea
    // collapse toward a single line and ignores the `rows` attribute. The floor
    // is what stops that being a visual regression against the previous
    // fixed-height rendering.
    const empty = await page.locator('#growing-textarea').evaluate((el) => el.clientHeight);
    expect(empty).toBeGreaterThanOrEqual(60);
  });
});
