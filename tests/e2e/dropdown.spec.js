import { expect, test } from '@playwright/test';

const PAGE = '/tests/e2e/fixtures/dropdown.html';

test.describe('Dropdown on the Popover API', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(PAGE);
  });

  test('opens from its invoker with no author JavaScript', async ({ page }) => {
    await expect(page.locator('#panel')).toBeHidden();
    await page.locator('#trigger').click();
    await expect(page.locator('#panel')).toBeVisible();
  });

  // A popovertarget invoker's expanded state is IMPLICIT ARIA: computed into
  // the accessibility tree, never reflected as a DOM content attribute. CSS
  // attribute selectors match content attributes, so `[aria-expanded="true"]`
  // can never match and open-state styling must select the panel's
  // `:popover-open` instead -- which is what components.css does for both the
  // burger and this component.
  //
  // Measured null in Chromium 151, Firefox 153 and WebKit 26.5. Pinned here so
  // that if an engine ever starts reflecting it, we find out deliberately
  // rather than by a selector silently starting to match.
  test('expanded state is implicit ARIA, not a DOM attribute', async ({ page }) => {
    const attr = () => page.locator('#trigger').evaluate((el) => el.getAttribute('aria-expanded'));
    expect(await attr()).toBeNull();
    await page.locator('#trigger').click();
    await expect(page.locator('#panel')).toBeVisible();
    expect(await attr()).toBeNull();
  });

  test('open state is selectable from the panel, which is what CSS uses', async ({ page }) => {
    const isOpen = () => page.locator('#panel').evaluate((el) => el.matches(':popover-open'));
    expect(await isOpen()).toBe(false);
    await page.locator('#trigger').click();
    expect(await isOpen()).toBe(true);
  });

  test('light-dismisses on outside click', async ({ page }) => {
    await page.locator('#trigger').click();
    await expect(page.locator('#panel')).toBeVisible();
    await page.mouse.click(5, 5);
    await expect(page.locator('#panel')).toBeHidden();
  });

  test('Escape closes it and returns focus to the invoker', async ({ page }) => {
    // Driven from the keyboard deliberately. WebKit follows the macOS
    // convention of not focusing a button on click, so a mouse-driven version
    // of this test asserts focus restoration that never had anywhere to
    // restore from -- and focus restoration exists for keyboard users anyway.
    await page.locator('#trigger').focus();
    await page.keyboard.press('Enter');
    await expect(page.locator('#panel')).toBeVisible();

    await page.keyboard.press('Escape');
    await expect(page.locator('#panel')).toBeHidden();
    await expect(page.locator('#trigger')).toBeFocused();
  });

  test('sits under its invoker with no positioned ancestor', async ({ page }) => {
    // The fixture deliberately has no `position: relative` wrapper. Under the
    // old absolute-positioning contract the panel would have resolved against
    // the initial containing block instead of the trigger.
    await page.locator('#trigger').click();
    const trigger = await page.locator('#trigger').boundingBox();
    const panel = await page.locator('#panel').boundingBox();
    expect(panel.y).toBeGreaterThanOrEqual(trigger.y + trigger.height - 2);
    expect(Math.abs(panel.x - trigger.x)).toBeLessThan(240);
  });

  test('stays inside the viewport near an edge', async ({ page }) => {
    await page.locator('#edge-trigger').click();
    const panel = await page.locator('#edge-panel').boundingBox();
    const width = page.viewportSize().width;
    expect(panel.x).toBeGreaterThanOrEqual(-1);
    expect(panel.x + panel.width).toBeLessThanOrEqual(width + 1);
  });

  test('renders in the top layer, above later stacking contexts', async ({ page }) => {
    // Replaces the old `z-index: 20` guess: the top layer is above every
    // stacking context by definition, so no z-index is needed at all.
    await page.locator('#trigger').click();
    const box = await page.locator('#first-item').boundingBox();
    const topmost = await page.evaluate(
      ([x, y]) => document.elementFromPoint(x, y)?.id ?? '',
      [box.x + box.width / 2, box.y + box.height / 2],
    );
    expect(topmost).toBe('first-item');
  });
});

test('a server-rendered hidden dropdown stays hidden', async ({ page }) => {
  // `display: grid` on .ui-dropdown defeats the UA's `[hidden] { display: none }`
  // exactly as it defeats the closed-popover rule -- author origin always beats
  // UA origin. The old `.ui-menu[hidden]` rule was deleted with the popover
  // migration, so this regressed silently. Server-owned state depends on it.
  await page.setContent(
    '<link rel="stylesheet" href="/fastblocks_ui/static/css/fastblocks-ui.css">',
  );
  await page.goto('/tests/e2e/fixtures/dropdown.html');
  await page.locator('#panel').evaluate((el) => {
    el.removeAttribute('popover');
    el.setAttribute('hidden', '');
  });
  await expect(page.locator('#panel')).toBeHidden();
});
