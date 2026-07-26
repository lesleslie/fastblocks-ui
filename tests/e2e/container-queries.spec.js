import { expect, test } from '@playwright/test';

// WS-6: `.is-container` opts columns/tiles/cards into CSS container-query
// sizing. Unlike the rest of the grid (which responds to the *viewport*),
// these rules key off `container-type: inline-size` on a wrapper element, so
// the only way to prove the layout is genuinely container-driven -- not just
// coincidentally matching the current viewport -- is to compare two fixed
// -width wrappers side by side in a single, unchanged viewport. If these
// assertions were viewport-driven instead, both panels would compute the
// same values; they don't.
test.describe('Container queries (is-container)', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/demo/demo.html');
    await page.waitForLoadState('networkidle');
  });

  test('a narrow wrapper keeps compact card padding; a wide wrapper does not', async ({ page }) => {
    // A CSS container query can only restyle a container's *descendants*,
    // never the container element itself -- components.css's
    // `.ui-card.is-container` rule therefore targets the card's own
    // `.ui-card__body`/`__header`/`__footer` children, not the `.ui-card`
    // element carrying `.is-container`. Assert against the inner body, which
    // is where the effect actually lives.
    const narrowCardBody = page.locator('#cq-narrow-card .ui-card__body');
    const wideCardBody = page.locator('#cq-wide-card .ui-card__body');

    await expect(narrowCardBody).toBeVisible();
    await expect(wideCardBody).toBeVisible();

    const narrowPadding = await narrowCardBody.evaluate(
      (el) => getComputedStyle(el).paddingInlineStart
    );
    const widePadding = await wideCardBody.evaluate(
      (el) => getComputedStyle(el).paddingInlineStart
    );

    // The wide wrapper (31rem) crosses the 24rem @container threshold in
    // components.css and should end up with strictly more padding than the
    // narrow wrapper (15rem), which stays under it.
    expect(parseFloat(widePadding)).toBeGreaterThan(parseFloat(narrowPadding));
  });

  test('a narrow wrapper takes the full-width fallback for is-N-cq columns; a wide one takes its fraction', async ({ page }) => {
    const narrowWrapper = page.locator('#cq-narrow');
    const wideWrapper = page.locator('#cq-wide');
    const narrowColumn = page.locator('#cq-narrow-column');
    const wideColumn = page.locator('#cq-wide-column');

    const narrowWrapperWidth = await narrowWrapper.evaluate((el) => el.getBoundingClientRect().width);
    const wideWrapperWidth = await wideWrapper.evaluate((el) => el.getBoundingClientRect().width);
    const narrowColumnWidth = await narrowColumn.evaluate((el) => el.getBoundingClientRect().width);
    const wideColumnWidth = await wideColumn.evaluate((el) => el.getBoundingClientRect().width);

    // Sanity check on the fixture itself: the two wrappers really are
    // different widths (15rem vs 31rem). The narrow one sits below the
    // 30rem @container threshold; only the wide one crosses it (its inner
    // .ui-columns measures ~502px thanks to the grid's negative gutters).
    expect(wideWrapperWidth).toBeGreaterThan(narrowWrapperWidth);

    // Below the 30rem container threshold, `.is-6-cq` has no fractional
    // rule yet (the tier only defines widths inside the @container block),
    // so the column falls back to the browser's default block-level
    // rendering and fills its parent. At/above the threshold, it should
    // take roughly half its container's width (`calc(100% * 6 / 12)`).
    const wideColumnRatio = wideColumnWidth / wideWrapperWidth;
    expect(wideColumnRatio).toBeGreaterThan(0.4);
    expect(wideColumnRatio).toBeLessThan(0.6);

    const narrowColumnRatio = narrowColumnWidth / narrowWrapperWidth;
    expect(narrowColumnRatio).toBeGreaterThan(0.6);
  });

  test('resizing the viewport alone does not change the narrow wrapper card padding', async ({ page }) => {
    // This is the crux of the container-query claim: unlike the rest of the
    // grid (is-N/is-N-tablet/is-N-desktop), these rules must NOT react to
    // viewport size at all -- only to the wrapper's own width.
    const narrowCardBody = page.locator('#cq-narrow-card .ui-card__body');
    const before = await narrowCardBody.evaluate((el) => getComputedStyle(el).paddingInlineStart);

    await page.setViewportSize({ width: 375, height: 800 });
    const afterNarrowViewport = await narrowCardBody.evaluate((el) => getComputedStyle(el).paddingInlineStart);

    await page.setViewportSize({ width: 1600, height: 900 });
    const afterWideViewport = await narrowCardBody.evaluate((el) => getComputedStyle(el).paddingInlineStart);

    expect(afterNarrowViewport).toBe(before);
    expect(afterWideViewport).toBe(before);
  });
});
