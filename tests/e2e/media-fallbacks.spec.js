import { expect, test } from '@playwright/test';

const PAGE = '/tests/e2e/fixtures/media-fallbacks.html';

test.describe('media fallbacks', () => {
  test('video bg: <video> has autoplay/muted/loop/playsinline', async ({ page }) => {
    await page.goto(PAGE);
    const v = page.locator('.has-video-bg video');
    await expect(v).toHaveAttribute('autoplay', '');
    await expect(v).toHaveAttribute('muted', '');
    await expect(v).toHaveAttribute('loop', '');
    await expect(v).toHaveAttribute('playsinline', '');
  });

  test('video bg: hides under prefers-reduced-data (CSS pattern; Chromium 151 does not emulate reducedData)', async ({ page }) => {
    // Chromium 151 + Playwright 1.62 limitation: emulateMedia({ reducedData })
    // does not propagate to the CSS media engine — neither matchMedia shims
    // nor @media emulation can verify the runtime contract. This test
    // verifies the production CSS rule pattern exists by reading effects.css
    // (the source of truth). Re-enable runtime verification when Chromium
    // adds prefers-reduced-data emulation (track Playwright issue).
    await page.goto(PAGE);
    const css = await page.evaluate(async () => {
      const r = await fetch('/fastblocks_ui/static/css/effects.css');
      return r.text();
    });
    expect(css).toMatch(/@media \(prefers-reduced-data: reduce\)/);
    expect(css).toMatch(/\.has-video-bg video[^}]*display:\s*none/);
  });

  test('lottie: data-lottie-url attribute present', async ({ page }) => {
    await page.goto(PAGE);
    await expect(page.locator('.has-lottie')).toHaveAttribute('data-lottie-url', '/animations/loading.json');
  });

  test('mesh-gradient: data-shader-url + data-frame-cap present', async ({ page }) => {
    await page.goto(PAGE);
    const el = page.locator('.has-mesh-gradient');
    await expect(el).toHaveAttribute('data-shader-url', '/shaders/aurora.frag');
    await expect(el).toHaveAttribute('data-frame-cap', '30');
  });
});

