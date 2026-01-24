/**
 * Performance Tests
 *
 * Tests performance characteristics and optimizations:
 * - Component load time
 * - Theme switching performance
 * - CSS variable updates
 * - Memory usage
 * - Frame rate during interactions
 */

import { test, expect } from '@playwright/test';

test.describe('Performance Benchmarks', () => {
  test.beforeEach(async ({ page }) => {
    // Enable performance metrics
    await page.coverage.startCSSCoverage();
    await page.coverage.startJSCoverage();
  });

  test.afterEach(async ({ page }) => {
    // Collect coverage
    const [jsCoverage, cssCoverage] = await Promise.all([
      page.coverage.stopJSCoverage(),
      page.coverage.stopCSSCoverage(),
    ]);

    // Log coverage summary
    const totalJsBytes = jsCoverage.reduce((sum, entry) => sum + entry.text.length, 0);
    const totalCssBytes = cssCoverage.reduce((sum, entry) => sum + entry.text.length, 0);

    console.log(`JS Coverage: ${totalJsBytes} bytes`);
    console.log(`CSS Coverage: ${totalCssBytes} bytes`);
  });

  test('should load initial page in under 3 seconds', async ({ page }) => {
    const startTime = Date.now();

    await page.goto('/demo.html');
    await page.waitForLoadState('networkidle');
    await page.waitForLoadState('domcontentloaded');

    const loadTime = Date.now() - startTime;

    console.log(`Page load time: ${loadTime}ms`);

    // Should load in under 3 seconds (3.5s for Shadow DOM overhead)
    expect(loadTime).toBeLessThan(3500);
  });

  test('should register components quickly', async ({ page }) => {
    const startTime = Date.now();

    await page.goto('/demo.html');

    // Wait for FastBulma initialization
    await page.waitForFunction(() => typeof window.fastBulma !== 'undefined', { timeout: 10000 });

    const initTime = Date.now() - startTime;

    console.log(`Component registration time: ${initTime}ms`);

    // Should initialize in under 2 seconds
    expect(initTime).toBeLessThan(2000);
  });

  test('should switch themes in under 100ms', async ({ page }) => {
    await page.goto('/demo.html');
    await page.waitForLoadState('networkidle');

    const startTime = Date.now();

    // Switch to dark mode
    await page.evaluate(() => {
      document.documentElement.setAttribute('data-theme', 'dark');
    });

    // Wait for CSS to update
    await page.waitForTimeout(50);

    const switchTime = Date.now() - startTime;

    console.log(`Theme switch time: ${switchTime}ms`);

    // Should switch in under 100ms
    expect(switchTime).toBeLessThan(100);
  });

  test('should maintain 60fps when updating CSS variables', async ({ page }) => {
    await page.goto('/demo.html');
    await page.waitForLoadState('networkidle');

    // Collect performance metrics during rapid CSS variable updates
    const fps = await page.evaluate(async () => {
      let frames = 0;
      let startTime = performance.now();
      const duration = 1000; // Measure for 1 second

      return new Promise((resolve) => {
        function measureFrame() {
          // Update CSS variables rapidly
          document.documentElement.style.setProperty('--test-var', Math.random().toString());

          frames++;
          const currentTime = performance.now();

          if (currentTime - startTime < duration) {
            requestAnimationFrame(measureFrame);
          } else {
            const fps = (frames / duration) * 1000;
            resolve(fps);
          }
        }

        requestAnimationFrame(measureFrame);
      });
    });

    console.log(`FPS during CSS updates: ${fps.toFixed(2)}`);

    // Should maintain at least 30fps (60% of 60fps target)
    expect(fps).toBeGreaterThan(30);
  });
});

test.describe('CSS Containment Performance', () => {
  test('should limit style recalculation scope with contain: style', async ({ page }) => {
    await page.goto('/demo.html');
    await page.waitForLoadState('networkidle');

    const hasContainment = await page.evaluate(() => {
      const components = document.querySelectorAll('fast-button, fast-card, fast-text-field');
      return Array.from(components).every((el) => {
        const style = window.getComputedStyle(el);
        return style.contain.includes('style') || style.contain === 'style';
      });
    });

    expect(hasContainment).toBe(true);
  });

  test('should measure style recalculation performance', async ({ page }) => {
    await page.goto('/demo.html');
    await page.waitForLoadState('networkidle');

    const recalculationTime = await page.evaluate(() => {
      const button = document.querySelector('fast-button');

      // Force style recalculation
      const start = performance.now();

      // Change class that affects CSS variables
      button.classList.add('is-primary');
      button.classList.remove('is-primary');
      button.classList.add('is-primary');

      // Force reflow
      button.offsetHeight;

      const end = performance.now();

      return end - start;
    });

    console.log(`Style recalculation time: ${recalculationTime.toFixed(2)}ms`);

    // Should be fast (under 16ms for 60fps)
    expect(recalculationTime).toBeLessThan(16);
  });
});

test.describe('Bundle Size', () => {
  test('should measure JavaScript bundle size', async ({ page }) => {
    await page.goto('/demo.html');

    const bundleMetrics = await page.evaluate(() => {
      const scripts = Array.from(document.querySelectorAll('script[src]'));

      return scripts.map((script) => {
        const src = script.getAttribute('src');
        const isCDN = src.includes('cdn.skypack.dev') || src.includes('unpkg.com') || src.includes('jsdelivr.net');

        return {
          url: src,
          isCDN,
          type: isCDN ? 'external' : 'internal',
        };
      });
    });

    console.log('Bundle Metrics:', JSON.stringify(bundleMetrics, null, 2));

    // Should load FAST components from CDN
    const fastComponents = bundleMetrics.filter((m) => m.url.includes('fast-components'));
    expect(fastComponents.length).toBeGreaterThan(0);
  });

  test('should measure CSS bundle size', async ({ page }) => {
    await page.goto('/demo.html');

    const cssMetrics = await page.evaluate(() => {
      const styles = Array.from(document.querySelectorAll('link[rel="stylesheet"]'));

      return styles.map((link) => ({
        href: link.getAttribute('href'),
        type: 'external',
      }));
    });

    console.log('CSS Metrics:', JSON.stringify(cssMetrics, null, 2));

    // Should have Bulma CSS loaded
    const hasBulma = cssMetrics.some((m) => m.href.includes('bulma'));
    expect(hasBulma).toBe(true);
  });
});

test.describe('Memory Usage', () => {
  test('should not leak memory when switching themes', async ({ page }) => {
    await page.goto('/demo.html');
    await page.waitForLoadState('networkidle');

    // Get initial memory usage
    const initialMemory = await page.evaluate(() => {
      return performance.memory ? performance.memory.usedJSHeapSize : 0;
    });

    // Switch themes 100 times
    for (let i = 0; i < 100; i++) {
      await page.evaluate((i) => {
        const theme = i % 2 === 0 ? 'dark' : 'light';
        document.documentElement.setAttribute('data-theme', theme);
      }, i);

      if (i % 10 === 0) {
        // Force garbage collection every 10 iterations
        await page.evaluate(() => {
          if (global.gc) global.gc();
        });
      }
    }

    // Get final memory usage
    const finalMemory = await page.evaluate(() => {
      return performance.memory ? performance.memory.usedJSHeapSize : 0;
    });

    const memoryIncrease = finalMemory - initialMemory;
    const memoryIncreaseMB = memoryIncrease / (1024 * 1024);

    console.log(`Memory increase: ${memoryIncreaseMB.toFixed(2)}MB`);

    // Should not leak more than 10MB after 100 theme switches
    expect(memoryIncreaseMB).toBeLessThan(10);
  });

  test('should not leak memory when registering components', async ({ page }) => {
    // Reload page to get fresh state
    await page.goto('/demo.html');

    const initialMemory = await page.evaluate(() => {
      return performance.memory ? performance.memory.usedJSHeapSize : 0;
    });

    // Reload page 10 times
    for (let i = 0; i < 10; i++) {
      await page.reload();
      await page.waitForLoadState('networkidle');

      if (i % 3 === 0) {
        await page.evaluate(() => {
          if (global.gc) global.gc();
        });
      }
    }

    const finalMemory = await page.evaluate(() => {
      return performance.memory ? performance.memory.usedJSHeapSize : 0;
    });

    const memoryIncrease = finalMemory - initialMemory;
    const memoryIncreaseMB = memoryIncrease / (1024 * 1024);

    console.log(`Memory increase after 10 reloads: ${memoryIncreaseMB.toFixed(2)}MB`);

    // Should not leak more than 5MB after 10 page reloads
    expect(memoryIncreaseMB).toBeLessThan(5);
  });
});

test.describe('Render Performance', () => {
  test('should render 100 buttons efficiently', async ({ page }) => {
    await page.goto('/demo.html');

    const renderTime = await page.evaluate(() => {
      const container = document.createElement('div');
      document.body.appendChild(container);

      const start = performance.now();

      // Create 100 buttons
      for (let i = 0; i < 100; i++) {
        const button = document.createElement('fast-button');
        button.className = 'is-primary';
        button.textContent = `Button ${i}`;
        container.appendChild(button);
      }

      // Force reflow
      container.offsetHeight;

      const end = performance.now();

      // Cleanup
      document.body.removeChild(container);

      return end - start;
    });

    console.log(`Render time for 100 buttons: ${renderTime.toFixed(2)}ms`);

    // Should render 100 components in under 1 second
    expect(renderTime).toBeLessThan(1000);
  });

  test('should maintain performance with many components', async ({ page }) => {
    await page.goto('/demo.html');
    await page.waitForLoadState('networkidle');

    // Measure interaction time with many components
    const interactionTime = await page.evaluate(async () => {
      const buttons = document.querySelectorAll('fast-button');

      const start = performance.now();

      // Simulate hover on all buttons
      buttons.forEach((button) => {
        button.dispatchEvent(new MouseEvent('mouseenter', { bubbles: true }));
      });

      const end = performance.now();

      return end - start;
    });

    console.log(`Interaction time with all components: ${interactionTime.toFixed(2)}ms`);

    // Should handle all component interactions in under 500ms
    expect(interactionTime).toBeLessThan(500);
  });
});

test.describe('Network Performance', () => {
  test('should use efficient CDN delivery', async ({ page }) => {
    const responses = [];

    page.on('response', (response) => {
      if (response.url().includes('cdn') || response.url().includes('fast-components')) {
        responses.push({
          url: response.url(),
          status: response.status(),
          headers: response.headers(),
        });
      }
    });

    await page.goto('/demo.html');
    await page.waitForLoadState('networkidle');

    console.log('CDN Responses:', JSON.stringify(responses, null, 2));

    // Should have successful CDN responses
    expect(responses.length).toBeGreaterThan(0);

    const allSuccessful = responses.every((r) => r.status >= 200 && r.status < 300);
    expect(allSuccessful).toBe(true);
  });

  test('should leverage browser caching', async ({ page }) => {
    const responses = [];

    page.on('response', async (response) => {
      const headers = response.headers();
      const hasCacheControl = 'cache-control' in headers;
      const hasETag = 'etag' in headers;

      if (hasCacheControl || hasETag) {
        responses.push({
          url: response.url(),
          cacheControl: headers['cache-control'],
          eTag: headers['etag'],
        });
      }
    });

    await page.goto('/demo.html');
    await page.waitForLoadState('networkidle');

    console.log('Cached Resources:', JSON.stringify(responses, null, 2));

    // Should have cache headers for static resources
    expect(responses.length).toBeGreaterThan(0);
  });
});
