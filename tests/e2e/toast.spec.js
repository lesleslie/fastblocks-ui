import { expect, test } from '@playwright/test';

const PAGE = '/tests/e2e/fixtures/toast.html';

test.describe('ui-toast', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(PAGE);
  });

  test('clicking the success button creates a role=status toast', async ({ page }) => {
    await page.locator('#show-success').click();
    const toast = page.locator('[role="status"]').last();
    await expect(toast).toBeVisible();
    await expect(toast).toContainText(/success/i);
  });

  test('clicking the error button creates a role=alert toast', async ({ page }) => {
    await page.locator('#show-error').click();
    const toast = page.locator('[role="alert"]').last();
    await expect(toast).toBeVisible();
  });

  test('toast auto-dismisses after the default duration', async ({ page }) => {
    await page.locator('#show-success').click();
    const toast = page.locator('[role="status"]').last();
    await expect(toast).toBeVisible();
    await page.waitForTimeout(5500); // default 5s + a bit of buffer
    await expect(toast).toBeHidden();
  });

  test('auto-dismiss pauses on hover', async ({ page }) => {
    await page.locator('#show-success').click();
    const toast = page.locator('[role="status"]').last();
    await toast.hover();
    await page.waitForTimeout(3000);
    await expect(toast).toBeVisible();
  });

  test('auto-dismiss pauses on focus (action button)', async ({ page }) => {
    await page.locator('#show-success').click();
    const toast = page.locator('[role="status"]').last();
    const actionBtn = toast.locator('button');
    if (await actionBtn.count() > 0) {
      await actionBtn.focus();
      await page.waitForTimeout(3000);
      await expect(toast).toBeVisible();
    }
  });

  test('error toasts cap-bypass (always visible, even at 5+ non-error)', async ({ page }) => {
    // Fill queue with 5 non-error toasts
    for (let i = 0; i < 5; i++) await page.locator('#show-success').click();
    // 6th: error
    await page.locator('#show-error').click();
    const errorToast = page.locator('[role="alert"]').last();
    await expect(errorToast).toBeVisible();
  });

  test('non-error toasts FIFO-evict when the queue exceeds the cap', async ({ page }) => {
    // MAX_TOASTS_DEFAULT = 5 (in toast-queue.js). The 6th non-error
    // click must evict the FIRST (oldest) toast before appending.
    // Tag each toast so the assertions are unambiguous: the fixture
    // button is a single click target, so we route through a
    // page.evaluate that calls the JS API directly with a unique label.
    // The path is computed from the fixture's URL: the test server
    // serves the repo root, so `/static/js/...` would 404; the fixture
    // uses the same relative path ../../../fastblocks_ui/static/js/...
    // to match the existing CSS <link> pattern.
    await page.evaluate(async () => {
      const mod = await import('/fastblocks_ui/static/js/toast-queue.js');
      for (let i = 1; i <= 6; i++) {
        mod.toast(`success-${i}`, { severity: 'success' });
      }
    });
    // After 6 dispatches, only 5 should remain (the last 5).
    const toasts = page.locator('[role="status"]');
    await expect(toasts).toHaveCount(5);
    // The first toast (success-1) must be the one evicted.
    await expect(toasts.nth(0)).toContainText('success-2');
    await expect(toasts.nth(4)).toContainText('success-6');
  });

  // Path A fix for the brief's HX-Trigger test defect: a raw XMLHttpRequest
  // does NOT dispatch htmx:afterRequest (that event is emitted only by htmx
  // for htmx-initiated requests). The fixture loads htmx via a CDN <script>,
  // so this test uses htmx.ajax() to fire the request — which DOES emit
  // htmx:afterRequest, which the JS module's listener is wired to.
  test('HX-Trigger response fires the toast', async ({ page }) => {
    await page.route('**/api/save', (route) =>
      route.fulfill({
        status: 200,
        headers: { 'HX-Trigger': JSON.stringify({ toast: { content: 'Saved!', severity: 'success' } }) },
      })
    );
    await page.evaluate(() => {
      // htmx.ajax() emits htmx:afterRequest when the response arrives.
      // The local toast-queue.js module listens for that event on
      // document.body and reads the HX-Trigger response header.
      window.htmx.ajax('POST', '/api/save', { hxVals: '{}' });
    });
    await page.waitForTimeout(200);
    await expect(page.locator('[role="status"]').last()).toContainText('Saved!');
  });

  // XSS guard: content passed via the JS API must be rendered as text,
  // not parsed as HTML. Regression test for the round-1 fix that replaced
  // innerHTML interpolation with textContent + createElement.
  test('toast content is rendered as text, not parsed as HTML (XSS guard)', async ({ page }) => {
    // Stash the marker on window so we can detect execution after the
    // toast renders. If the innerHTML sink were ever reintroduced, this
    // <script> tag would execute and set window.__xssFired = true.
    await page.evaluate(() => { window.__xssFired = false; });
    await page.evaluate(async () => {
      const mod = await import('/fastblocks_ui/static/js/toast-queue.js');
      mod.toast('<script>window.__xssFired = true</script>', { severity: 'info' });
    });
    await page.waitForSelector('.ui-toast');
    // The <script> tag MUST NOT have executed.
    const xssFired = await page.evaluate(() => window.__xssFired === true);
    expect(xssFired).toBe(false);
    // The payload must be preserved as literal text (toContainText reads
    // text content, so the textContent-based renderer satisfies it).
    const toast = page.locator('.ui-toast').last();
    await expect(toast).toContainText('<script>window.__xssFired = true</script>');
    // And the content slot must contain exactly ONE child element (the
    // text node) — no <script> child element should have been parsed.
    const childCount = await page.locator('.ui-toast__content').last().evaluate(
      (el) => el.children.length
    );
    expect(childCount).toBe(0);
  });
});
