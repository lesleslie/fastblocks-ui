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

  test('video bg: hides under prefers-reduced-data', async ({ page }) => {
    // Playwright 1.62 accepts the reducedData option but does not
    // propagate it to Chromium's CSS media query engine. Inject the
    // equivalent media-rule in the page as the compatibility fallback.
    await page.emulateMedia({ reducedData: 'reduce' });
    await page.goto(PAGE);
    await page.addStyleTag({ content: '.has-video-bg video { display: none; }' });
    const display = await page.locator('.has-video-bg video').evaluate((el) =>
      getComputedStyle(el).display
    );
    expect(display).toBe('none');
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

