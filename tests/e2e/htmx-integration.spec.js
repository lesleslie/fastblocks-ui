import { expect, test } from '@playwright/test';

const PAGE = '/tests/e2e/fixtures/htmx-integration.html';

test.describe('htmx integration', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(PAGE);
  });

  test('init(root) is idempotent — second call does not double-bind', async ({ page }) => {
    // Non-vacuous: count actual side effects. The previous draft read
    // `el.__spotlightListenerCount` (always undefined → default 0 → trivially
    // <= 1 → test passes whether or not init is idempotent). The new test
    // patches `el.style.setProperty` to count writes to the spotlight CSS
    // custom properties, then dispatches events to trigger the listener.
    // With double-binding, the listener fires twice per event and writes 4
    // (2 per update × 2 listeners); with idempotent binding, exactly 2.
    //
    // Deviation from brief verbatim: spotlight.js (the actual shipped
    // module) uses a global `pointermove` listener registered at module
    // load that lazily binds a per-element listener on first pointermove;
    // its `init(root)` is intentionally a no-op. The brief's verbatim
    // test — which fires `mousemove`, expects `__spotlightBound` after
    // `init(el)`, and expects exactly 1 write per dispatch — is
    // incompatible with that design. Adapted to dispatch `pointermove`
    // (the real event spotlight listens for) and to prime the per-element
    // listener before measuring the double-binding invariant.
    const result = await page.evaluate(async () => {
      // Brief's `/static/js/spotlight.js` rewritten to the repo-rooted
      // path that the Playwright dev server can actually serve
      // (see cross-task lesson 1).
      //
      // Create + insert the .has-spotlight element BEFORE importing
      // spotlight.js. spotlight's module-level opt-in check
      // (`document.querySelectorAll('.has-spotlight').length > 0`)
      // skips registering its global pointermove listener when no
      // element is in the DOM at import time — loading the module
      // after the element exists is the only way to get the listener.
      const el = document.createElement('div');
      el.className = 'has-spotlight';
      document.body.appendChild(el);
      const mod = await import('/fastblocks_ui/static/js/spotlight.js');
      let writes = 0;
      const origSet = el.style.setProperty.bind(el.style);
      el.style.setProperty = (prop, val) => {
        if (typeof prop === 'string' && prop.startsWith('--ui-spotlight')) writes++;
        return origSet(prop, val);
      };
      mod.init(el);
      mod.init(el);  // second call MUST be a no-op
      // Prime the per-element listener: the global pointermove handler
      // sees the first event, sets __spotlightBound = true, and binds the
      // `update` function. update is NOT called on this first event (the
      // global handler only binds; it does not call update itself), so
      // writes should still be 0 here.
      el.dispatchEvent(new PointerEvent('pointermove', { clientX: 5, clientY: 5, bubbles: true }));
      const writesAfterPrime = writes;
      // Trigger the bound listener once. With idempotent init(), exactly
      // one per-element listener is registered (writes += 2 — update
      // writes both --ui-spotlight-x and --ui-spotlight-y). If init()
      // double-bound, two listeners would fire → writes += 4.
      el.dispatchEvent(new PointerEvent('pointermove', { clientX: 10, clientY: 20, bubbles: true }));
      return { writes, writesAfterPrime, bound: el.__spotlightBound === true };
    });
    expect(result.bound).toBe(true);          // global handler set this
    expect(result.writesAfterPrime).toBe(0);  // global handler only binds, doesn't call update
    expect(result.writes).toBe(2);            // one update call wrote 2 props; 4 would mean double-bind
  });

  test('htmx:afterSwap event re-scans for new [data-reveal] elements', async ({ page }) => {
    // Dispatch a synthetic htmx:afterSwap event with a region containing
    // a fresh [data-reveal] element.
    await page.evaluate(() => {
      const region = document.createElement('div');
      region.innerHTML = '<div data-reveal id="newly-swapped">Swapped in</div>';
      document.getElementById('region').appendChild(region);
      document.dispatchEvent(new CustomEvent('htmx:afterSwap', {
        detail: { elt: region },
      }));
    });
    // After init, the newly-swapped element should be observed.
    // We can't directly assert IntersectionObserver membership, but we
    // can assert the element gets revealed when scrolled into view.
    await page.locator('#newly-swapped').scrollIntoViewIfNeeded();
    await page.waitForTimeout(200);
    const revealed = await page.locator('#newly-swapped').getAttribute('data-revealed');
    expect(revealed).toBe('true');
  });

  test('toast queue state survives a swap of unrelated regions', async ({ page }) => {
    await page.evaluate(() => {
      const mod = window.__toastQueue || null;
      // Dispatch a toast via the public API
      document.dispatchEvent(new CustomEvent('htmx:afterRequest', {
        detail: {
          xhr: {
            getResponseHeader: (h) => h === 'HX-Trigger'
              ? JSON.stringify({ toast: { content: 'Before swap', severity: 'info' } })
              : null,
          },
        },
      }));
    });
    await page.waitForTimeout(50);
    const toastBefore = await page.locator('.ui-toast').count();
    // Swap a region (unrelated to toast)
    await page.evaluate(() => {
      const region = document.createElement('div');
      region.innerHTML = '<p>Unrelated content</p>';
      document.getElementById('region').appendChild(region);
      document.dispatchEvent(new CustomEvent('htmx:afterSwap', { detail: { elt: region } }));
    });
    const toastAfter = await page.locator('.ui-toast').count();
    expect(toastAfter).toBe(toastBefore);
  });

  test('popover aria-expanded bindings re-attach on swap', async ({ page }) => {
    await page.evaluate(() => {
      const region = document.createElement('div');
      region.innerHTML = `
        <button popovertarget="newly-swapped-pop" aria-expanded="false">Open</button>
        <div id="newly-swapped-pop" popover="auto">Content</div>
      `;
      document.body.appendChild(region);
      document.dispatchEvent(new CustomEvent('htmx:afterSwap', { detail: { elt: region } }));
    });
    await page.waitForTimeout(100);
    await page.locator('button').last().click();
    const aria = await page.locator('button').last().getAttribute('aria-expanded');
    expect(aria).toBe('true');
  });

  test('toast HX-Trigger dispatch via htmx:afterRequest', async ({ page }) => {
    // Deviation from brief verbatim: brief dispatches the event on
    // `document` but the listener it adds is on `document.body`. Events
    // fired on `document` do not bubble down to `document.body`, so the
    // listener would never fire and `window.__lastToast` would stay
    // undefined. Dispatching on the same node as the listener target
    // (document.body) fixes this without changing the assertion.
    await page.evaluate(() => {
      document.body.addEventListener('htmx:afterRequest', (evt) => {
        const trigger = evt.detail.xhr.getResponseHeader('HX-Trigger');
        if (!trigger) return;
        const parsed = JSON.parse(trigger);
        if (parsed.toast) window.__lastToast = parsed.toast;
      });
      document.body.dispatchEvent(new CustomEvent('htmx:afterRequest', {
        detail: {
          xhr: {
            getResponseHeader: (h) => h === 'HX-Trigger'
              ? JSON.stringify({ toast: { content: 'Saved!', severity: 'success' } })
              : null,
          },
        },
      }));
    });
    const last = await page.evaluate(() => window.__lastToast);
    expect(last.content).toBe('Saved!');
    expect(last.severity).toBe('success');
  });
});
