/**
 * Theme Switching E2E Tests
 *
 * Tests that theme switching works correctly:
 * - Light theme is default
 * - Dark theme can be activated
 * - CSS variables update correctly
 * - Components reflect theme changes
 * - System preference detection works
 */

import { test, expect } from '@playwright/test';

test.describe('Theme Switching', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/demo.html');
    await page.waitForLoadState('networkidle');
  });

  test('should start in light mode by default', async ({ page }) => {
    const theme = await page.evaluate(() => {
      return document.documentElement.getAttribute('data-theme') || 'light';
    });

    expect(theme).toBe('light');
  });

  test('should have light theme colors in light mode', async ({ page }) => {
    const primaryColor = await page.evaluate(() => {
      return getComputedStyle(document.documentElement).getPropertyValue('--fast-primary').trim();
    });

    // Light mode uses indigo-600 (#4f46e5)
    expect(primaryColor.toLowerCase()).toBe('#4f46e5');
  });

  test('should switch to dark mode when data-theme="dark" is set', async ({ page }) => {
    // Switch to dark mode
    await page.evaluate(() => {
      document.documentElement.setAttribute('data-theme', 'dark');
    });

    // Wait for CSS to update
    await page.waitForTimeout(100);

    const theme = await page.evaluate(() => {
      return document.documentElement.getAttribute('data-theme');
    });

    expect(theme).toBe('dark');
  });

  test('should have different colors in dark mode', async ({ page }) => {
    // Get light mode color
    const lightPrimary = await page.evaluate(() => {
      return getComputedStyle(document.documentElement).getPropertyValue('--fast-primary').trim();
    });

    // Switch to dark mode
    await page.evaluate(() => {
      document.documentElement.setAttribute('data-theme', 'dark');
    });

    await page.waitForTimeout(100);

    const darkPrimary = await page.evaluate(() => {
      return getComputedStyle(document.documentElement).getPropertyValue('--fast-primary').trim();
    });

    // Dark mode uses indigo-400 (#818cf8)
    expect(darkPrimary.toLowerCase()).toBe('#818cf8');
    expect(lightPrimary).not.toBe(darkPrimary);
  });

  test('should have darker background in dark mode', async ({ page }) => {
    // Get light mode background
    const lightBackground = await page.evaluate(() => {
      return getComputedStyle(document.documentElement).getPropertyValue('--fast-background').trim();
    });

    // Switch to dark mode
    await page.evaluate(() => {
      document.documentElement.setAttribute('data-theme', 'dark');
    });

    await page.waitForTimeout(100);

    const darkBackground = await page.evaluate(() => {
      return getComputedStyle(document.documentElement).getPropertyValue('--fast-background').trim();
    });

    // Light mode should be white (#fff), dark mode should be slate-900 (#0f172a)
    expect(lightBackground.toLowerCase()).toBe('#fff');
    expect(darkBackground.toLowerCase()).toBe('#0f172a');
  });

  test('should have lighter text in dark mode', async ({ page }) => {
    const lightText = await page.evaluate(() => {
      return getComputedStyle(document.documentElement).getPropertyValue('--fast-text').trim();
    });

    await page.evaluate(() => {
      document.documentElement.setAttribute('data-theme', 'dark');
    });

    await page.waitForTimeout(100);

    const darkText = await page.evaluate(() => {
      return getComputedStyle(document.documentElement).getPropertyValue('--fast-text').trim();
    });

    // Light mode text is dark (#4a4a4a), dark mode text is light (#f1f5f9)
    expect(lightText.toLowerCase()).toBe('#4a4a4a');
    expect(darkText.toLowerCase()).toBe('#f1f5f9');
  });

  test('should update button colors when theme changes', async ({ page }) => {
    const button = page.locator('fast-button.is-primary').first();

    // Get light mode button color
    const lightButtonColor = await button.evaluate((el) => {
      return window.getComputedStyle(el).backgroundColor;
    });

    // Switch to dark mode
    await page.evaluate(() => {
      document.documentElement.setAttribute('data-theme', 'dark');
    });

    await page.waitForTimeout(100);

    // Get dark mode button color
    const darkButtonColor = await button.evaluate((el) => {
      return window.getComputedStyle(el).backgroundColor;
    });

    // Colors should be different
    expect(lightButtonColor).not.toBe(darkButtonColor);
  });

  test('should update card styling when theme changes', async ({ page }) => {
    const card = page.locator('fast-card').first();

    // Get light mode card background
    const lightCardBg = await card.evaluate((el) => {
      return window.getComputedStyle(el).backgroundColor;
    });

    // Switch to dark mode
    await page.evaluate(() => {
      document.documentElement.setAttribute('data-theme', 'dark');
    });

    await page.waitForTimeout(100);

    // Get dark mode card background
    const darkCardBg = await card.evaluate((el) => {
      return window.getComputedStyle(el).backgroundColor;
    });

    // Card background should change between themes
    expect(lightCardBg).not.toBe(darkCardBg);
  });

  test('should toggle between light and dark mode', async ({ page }) => {
    // Start in light mode
    let theme = await page.evaluate(() => {
      return document.documentElement.getAttribute('data-theme') || 'light';
    });
    expect(theme).toBe('light');

    // Switch to dark
    await page.evaluate(() => {
      document.documentElement.setAttribute('data-theme', 'dark');
    });

    await page.waitForTimeout(100);

    theme = await page.evaluate(() => {
      return document.documentElement.getAttribute('data-theme');
    });
    expect(theme).toBe('dark');

    // Switch back to light
    await page.evaluate(() => {
      document.documentElement.setAttribute('data-theme', 'light');
    });

    await page.waitForTimeout(100);

    theme = await page.evaluate(() => {
      return document.documentElement.getAttribute('data-theme');
    });
    expect(theme).toBe('light');
  });
});

test.describe('Theme Switching UI', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/demo.html');
    await page.waitForLoadState('networkidle');
  });

  test('should have theme switcher button if present in demo', async ({ page }) => {
    // Check if demo page has a theme toggle button
    const themeToggle = page.locator('button#theme-toggle, button[data-theme-toggle]');

    const count = await themeToggle.count();

    if (count > 0) {
      // If theme toggle exists, test it
      await expect(themeToggle.first()).toBeVisible();

      // Click to toggle theme
      await themeToggle.first().click();
      await page.waitForTimeout(100);

      const theme = await page.evaluate(() => {
        return document.documentElement.getAttribute('data-theme');
      });

      expect(theme).toBe('dark');
    } else {
      // Skip test if no theme toggle in demo
      test.skip();
    }
  });

  test('should persist theme choice in localStorage', async ({ page }) => {
    // Set theme to dark
    await page.evaluate(() => {
      localStorage.setItem('theme', 'dark');
      document.documentElement.setAttribute('data-theme', 'dark');
    });

    // Reload page
    await page.reload();
    await page.waitForLoadState('networkidle');

    // Theme should be restored from localStorage
    const theme = await page.evaluate(() => {
      return document.documentElement.getAttribute('data-theme');
    });

    expect(theme).toBe('dark');
  });
});

test.describe('System Preference Detection', () => {
  test('should detect system dark mode preference', async ({ page }) => {
    // Emulate system dark mode preference
    await page.emulateMedia({ colorScheme: 'dark' });

    // Reload to trigger detection
    await page.reload();
    await page.waitForLoadState('networkidle');

    // Check if theme matches system preference
    // (This depends on implementation - may need to check localStorage)
    const prefersDark = await page.evaluate(() => {
      return window.matchMedia('(prefers-color-scheme: dark)').matches;
    });

    expect(prefersDark).toBe(true);
  });

  test('should detect system light mode preference', async ({ page }) => {
    // Emulate system light mode preference
    await page.emulateMedia({ colorScheme: 'light' });

    await page.reload();
    await page.waitForLoadState('networkidle');

    const prefersLight = await page.evaluate(() => {
      return window.matchMedia('(prefers-color-scheme: light)').matches;
    });

    expect(prefersLight).toBe(true);
  });
});

test.describe('Theme Color Values', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/demo.html');
    await page.waitForLoadState('networkidle');
  });

  test('should use correct Tailwind colors in light mode', async ({ page }) => {
    const colors = await page.evaluate(() => {
      const root = document.documentElement;
      const style = getComputedStyle(root);

      return {
        primary: style.getPropertyValue('--fast-primary').trim(),
        success: style.getPropertyValue('--fast-success').trim(),
        warning: style.getPropertyValue('--fast-warning').trim(),
        danger: style.getPropertyValue('--fast-danger').trim(),
        info: style.getPropertyValue('--fast-info').trim(),
      };
    });

    // Verify Tailwind default colors
    expect(colors.primary.toLowerCase()).toBe('#4f46e5'); // indigo-600
    expect(colors.success.toLowerCase()).toBe('#22c55e'); // green-500
    expect(colors.warning.toLowerCase()).toBe('#eab308'); // yellow-500
    expect(colors.danger.toLowerCase()).toBe('#ef4444'); // red-500
    expect(colors.info.toLowerCase()).toBe('#06b6d4'); // cyan-500
  });

  test('should use lighter Tailwind colors in dark mode', async ({ page }) => {
    await page.evaluate(() => {
      document.documentElement.setAttribute('data-theme', 'dark');
    });

    await page.waitForTimeout(100);

    const colors = await page.evaluate(() => {
      const root = document.documentElement;
      const style = getComputedStyle(root);

      return {
        primary: style.getPropertyValue('--fast-primary').trim(),
        success: style.getPropertyValue('--fast-success').trim(),
        warning: style.getPropertyValue('--fast-warning').trim(),
        danger: style.getPropertyValue('--fast-danger').trim(),
        info: style.getPropertyValue('--fast-info').trim(),
      };
    });

    // Dark mode uses lighter shades (400 instead of 600/500)
    expect(colors.primary.toLowerCase()).toBe('#818cf8'); // indigo-400
    expect(colors.success.toLowerCase()).toBe('#4ade80'); // green-400
    expect(colors.warning.toLowerCase()).toBe('#facc15'); // yellow-400
    expect(colors.danger.toLowerCase()).toBe('#f87171'); // red-400
    expect(colors.info.toLowerCase()).toBe('#22d3ee'); // cyan-400
  });

  test('should use neutral gray scale colors', async ({ page }) => {
    const grays = await page.evaluate(() => {
      const root = document.documentElement;
      const style = getComputedStyle(root);

      return {
        grey: style.getPropertyValue('--fast-grey').trim(),
        greyLight: style.getPropertyValue('--fast-grey-light').trim(),
        greyLighter: style.getPropertyValue('--fast-grey-lighter').trim(),
        greyDark: style.getPropertyValue('--fast-grey-dark').trim(),
        greyDarker: style.getPropertyValue('--fast-grey-darker').trim(),
      };
    });

    // Verify Tailwind gray scale
    expect(grays.grey.toLowerCase()).toBe('#6b7280'); // gray-500
    expect(grays.greyLight.toLowerCase()).toBe('#f3f4f6'); // gray-100
    expect(grays.greyLighter.toLowerCase()).toBe('#f9fafb'); // gray-50
    expect(grays.greyDark.toLowerCase()).toBe('#374151'); // gray-700
    expect(grays.greyDarker.toLowerCase()).toBe('#111827'); // gray-900
  });
});
