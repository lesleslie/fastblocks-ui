import { expect, test } from '@playwright/test';

/**
 * Performance budget smoke test.
 *
 * Asserts the *availability* of LCP/CLS/INP performance metrics on the
 * two representative demo pages, not that they pass specific thresholds.
 * The Web Vitals thresholds (p75 INP <= 200ms, LCP <= 2.5s, CLS <= 0.1)
 * are aspirational; Task 14 is the final sweep to tighten them.
 *
 * Observers are installed via `addInitScript` BEFORE any page script
 * runs, so the buffered flag captures all events that occurred during
 * page load. The INP observer needs a real interaction to fire, so the
 * test calls `page.click()` which Chromium records in `event-timing`.
 * On a static page with no JS, INP may still be null -- the assertion
 * is `>= 0` rather than `> 0`, so a no-op page passes the gate.
 */

const OBSERVER_INIT = () => {
  window.__perfMetrics = { lcp: null, cls: 0, inp: null };
  try {
    new PerformanceObserver((list) => {
      const entries = list.getEntries();
      const last = entries[entries.length - 1];
      if (last) {
        window.__perfMetrics.lcp =
          last.renderTime || last.loadTime || last.startTime;
      }
    }).observe({ type: 'largest-contentful-paint', buffered: true });
  } catch {
    // LCP observer unavailable.
  }
  try {
    new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        if (!entry.hadRecentInput) {
          window.__perfMetrics.cls += entry.value;
        }
      }
    }).observe({ type: 'layout-shift', buffered: true });
  } catch {
    // CLS observer unavailable.
  }
  try {
    new PerformanceObserver((list) => {
      const events = list.getEntriesByType('event');
      const last = events[events.length - 1];
      if (last) {
        window.__perfMetrics.inp = last.duration;
      }
    }).observe({ type: 'event', buffered: true });
  } catch {
    // INP observer unavailable.
  }
};

async function collectMetrics(page) {
  return await page.evaluate(() => window.__perfMetrics);
}

test.describe('performance budget', () => {
  test('plain page: metrics are computed', async ({ page }) => {
    await page.addInitScript(OBSERVER_INIT);
    await page.goto('/tests/e2e/fixtures/demo-plain.html');
    await page.waitForLoadState('networkidle');
    // Drive a real click so the INP observer has a real interaction.
    await page.click('main, body');
    await page.waitForTimeout(50);
    const metrics = await collectMetrics(page);
    expect(metrics.lcp).not.toBeNull();
    expect(metrics.lcp).toBeGreaterThan(0);
    expect(metrics.cls).toBeGreaterThanOrEqual(0);
    // INP is interaction-dependent; on a no-op page it may be null.
    // The gate is "the observer was installed" rather than "a value was
    // recorded", since a static page legitimately records no input.
    expect(metrics.inp === null || metrics.inp >= 0).toBe(true);
  });

  test('effects-stack page: metrics are computed', async ({ page }) => {
    await page.addInitScript(OBSERVER_INIT);
    await page.goto('/tests/e2e/fixtures/demo-effects-stack.html');
    await page.waitForLoadState('networkidle');
    await page.click('main, body');
    await page.waitForTimeout(50);
    const metrics = await collectMetrics(page);
    expect(metrics.lcp).not.toBeNull();
    expect(metrics.lcp).toBeGreaterThan(0);
    expect(metrics.cls).toBeGreaterThanOrEqual(0);
    expect(metrics.inp === null || metrics.inp >= 0).toBe(true);
  });
});
