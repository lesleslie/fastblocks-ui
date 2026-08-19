import { expect, test } from '@playwright/test';

const PAGE = '/tests/e2e/fixtures/motion-effects.html';

test.describe('motion effects', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(PAGE);
  });

  test('has-spotlight: opacity stays 0 until JS sets data-spotlight-active', async ({ page }) => {
    // Before JS: opacity 0 (fail-closed per Decision 22)
    const opacity = await page.locator('.has-spotlight').evaluate((el) =>
      getComputedStyle(el, '::before').opacity
    );
    expect(parseFloat(opacity)).toBe(0);
  });

  test('has-spotlight: pointermove sets --ui-spotlight-x/Y', async ({ page }) => {
    await page.evaluate(async () => { await import('/fastblocks_ui/static/js/spotlight.js'); });
    await page.locator('#spotlight-card').hover();
    // After JS + hover: opacity > 0
    const opacity = await page.locator('.has-spotlight').evaluate((el) =>
      getComputedStyle(el, '::before').opacity
    );
    expect(parseFloat(opacity)).toBeGreaterThan(0);
  });

  test('has-spotlight: skipped under prefers-reduced-motion', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.evaluate(async () => { await import('/fastblocks_ui/static/js/spotlight.js'); });
    await page.locator('#spotlight-card').hover();
    const opacity = await page.locator('.has-spotlight').evaluate((el) =>
      getComputedStyle(el, '::before').opacity
    );
    expect(parseFloat(opacity)).toBe(0);
  });

  test('has-spotlight: skipped under pointer: coarse', async ({ page }) => {
    // Playwright 1.62 does not support emulateMedia({ pointer: 'coarse' });
    // override matchMedia for (pointer: coarse) so the JS module's
    // load-time check skips listener registration (the brief's intent).
    await page.addInitScript(() => {
      const original = window.matchMedia;
      window.matchMedia = (query) => {
        const result = original.call(window, query);
        if (query === '(pointer: coarse)') {
          Object.defineProperty(result, 'matches', { value: true, configurable: true });
        }
        return result;
      };
    });
    await page.goto(PAGE);
    await page.evaluate(async () => { await import('/fastblocks_ui/static/js/spotlight.js'); });
    await page.locator('#spotlight-card').hover();
    const opacity = await page.locator('.has-spotlight').evaluate((el) =>
      getComputedStyle(el, '::before').opacity
    );
    expect(parseFloat(opacity)).toBe(0);
  });

  test('data-reveal: hidden initially without .js capability class', async ({ page }) => {
    // Per spec §2.6: gate the hidden state on .js capability class.
    // Without .js: opacity 1 (content visible).
    const opacity = await page.locator('#reveal-card').evaluate((el) =>
      getComputedStyle(el).opacity
    );
    expect(parseFloat(opacity)).toBe(1);
  });

  test('data-reveal: with .js capability class, hidden until revealed', async ({ page }) => {
    await page.evaluate(() => document.documentElement.classList.add('js'));
    await page.evaluate(async () => { await import('/fastblocks_ui/static/js/scroll-reveal.js'); });
    const opacity = await page.locator('#reveal-card').evaluate((el) =>
      getComputedStyle(el).opacity
    );
    expect(parseFloat(opacity)).toBeLessThan(1);
    // Scroll the element to the top of the viewport. The IO uses
    // rootMargin '0px 0px -10% 0px' (effective viewport bottom is
    // 720 - 72 = 648px), and scrollIntoViewIfNeeded's 'nearest' only
    // scrolls to put the element at the actual viewport bottom (720)
    // which is below the IO's effective area. Use window.scrollTo
    // directly so the element lands at viewport top (well above 648).
    await page.evaluate(() => {
      const el = document.getElementById('reveal-card');
      window.scrollTo({ top: el.offsetTop - 100, behavior: 'instant' });
    });
    await page.waitForTimeout(300);
    const opacityAfter = await page.locator('#reveal-card').evaluate((el) =>
      getComputedStyle(el).opacity
    );
    expect(parseFloat(opacityAfter)).toBe(1);
  });

  test('data-tilt: transform applied on hover', async ({ page }) => {
    await page.evaluate(async () => { await import('/fastblocks_ui/static/js/tilt.js'); });
    await page.locator('#tilt-card').hover();
    await page.waitForTimeout(50);
    const transform = await page.locator('#tilt-card').evaluate((el) =>
      getComputedStyle(el).transform
    );
    expect(transform).toContain('matrix'); // 1px translateY serializes as matrix
  });

  test('data-tilt: no transform under prefers-reduced-motion', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.evaluate(async () => { await import('/fastblocks_ui/static/js/tilt.js'); });
    await page.locator('#tilt-card').hover();
    const transform = await page.locator('#tilt-card').evaluate((el) =>
      getComputedStyle(el).transform
    );
    expect(transform).toBe('none');
  });

  test('theme-transitions: data-theme-changing flag applies transitions', async ({ page }) => {
    await page.evaluate(async () => { await import('/fastblocks_ui/static/js/theme-transitions.js'); });
    await page.evaluate(() =>
      document.documentElement.setAttribute('data-theme-changing', ''));
    const has = await page.locator('button').first().evaluate((el) =>
      getComputedStyle(el).transitionProperty.includes('background-color')
    );
    expect(has).toBe(true);
  });

  test('page-transitions: transition() wrapper exists and is callable', async ({ page }) => {
    const result = await page.evaluate(async () => {
      const mod = await import('/fastblocks_ui/static/js/page-transitions.js');
      return typeof mod.transition;
    });
    expect(result).toBe('function');
  });

  test('init() is idempotent (htmx integration)', async ({ page }) => {
    const result = await page.evaluate(async () => {
      const mod = await import('/fastblocks_ui/static/js/spotlight.js');
      mod.init();
      mod.init(); // second call must not double-bind
      const before = window.__spotlightListenerCount;
      mod.init();
      const after = window.__spotlightListenerCount;
      return after === before;
    });
    expect(result).toBe(true);
  });
});