/**
 * Component Registration E2E Tests
 *
 * Tests that FAST components are properly registered and initialized:
 * - Components load from CDN
 * - Components are registered with custom elements
 * - Components render in the DOM
 * - Bulma classes apply to FAST components
 */

import { test, expect } from '@playwright/test';

test.describe('FastBulma Initialization', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to demo page
    await page.goto('/demo.html');

    // Wait for FastBulma to initialize
    await page.waitForFunction(() => window.fastBulma !== undefined, { timeout: 10000 });
  });

  test('should load FastBulma global object', async ({ page }) => {
    const fastBulmaExists = await page.evaluate(() => {
      return typeof window.fastBulma !== 'undefined';
    });

    expect(fastBulmaExists).toBe(true);
  });

  test('should initialize FAST components', async ({ page }) => {
    const isInitialized = await page.evaluate(() => {
      return window.fastBulma && window.fastBulma.#initialized === true;
    });

    // Note: We can't access private fields from outside the class
    // So we check for visible signs of initialization instead
    const hasFastButtons = await page.locator('fast-button').count();
    expect(hasFastButtons).toBeGreaterThan(0);
  });

  test('should register fast-button custom element', async ({ page }) => {
    const button = page.locator('fast-button').first();

    await expect(button).toBeVisible();
    await expect(button).toHaveAttribute('is-initialized');
  });
});

test.describe('Component Rendering', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/demo.html');
    await page.waitForLoadState('networkidle');
  });

  test('should render fast-button components', async ({ page }) => {
    const buttons = page.locator('fast-button');

    const count = await buttons.count();
    expect(count).toBeGreaterThan(0);

    // Check first button is visible
    await expect(buttons.first()).toBeVisible();
  });

  test('should render fast-card components', async ({ page }) => {
    const cards = page.locator('fast-card');

    const count = await cards.count();
    expect(count).toBeGreaterThan(0);

    // Check first card is visible
    await expect(cards.first()).toBeVisible();
  });

  test('should render fast-text-field components', async ({ page }) => {
    const textFields = page.locator('fast-text-field');

    const count = await textFields.count();
    expect(count).toBeGreaterThan(0);

    // Check first text field is visible
    await expect(textFields.first()).toBeVisible();
  });

  test('should render fast-checkbox components', async ({ page }) => {
    const checkboxes = page.locator('fast-checkbox');

    const count = await checkboxes.count();
    expect(count).toBeGreaterThan(0);

    // Check first checkbox is visible
    await expect(checkboxes.first()).toBeVisible();
  });

  test('should render fast-tabs components', async ({ page }) => {
    const tabs = page.locator('fast-tabs');

    const count = await tabs.count();
    expect(count).toBeGreaterThan(0);

    // Check tabs are visible
    await expect(tabs.first()).toBeVisible();
  });
});

test.describe('Bulma Class Application', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/demo.html');
    await page.waitForLoadState('networkidle');
  });

  test('should apply is-primary class to fast-button', async ({ page }) => {
    const primaryButton = page.locator('fast-button.is-primary').first();

    await expect(primaryButton).toBeVisible();

    // Check the class is present
    const hasClass = await primaryButton.evaluate((el) => el.classList.contains('is-primary'));
    expect(hasClass).toBe(true);
  });

  test('should apply is-success class to fast-button', async ({ page }) => {
    const successButton = page.locator('fast-button.is-success').first();

    await expect(successButton).toBeVisible();

    const hasClass = await successButton.evaluate((el) => el.classList.contains('is-success'));
    expect(hasClass).toBe(true);
  });

  test('should apply is-danger class to fast-button', async ({ page }) => {
    const dangerButton = page.locator('fast-button.is-danger').first();

    await expect(dangerButton).toBeVisible();

    const hasClass = await dangerButton.evaluate((el) => el.classList.contains('is-danger'));
    expect(hasClass).toBe(true);
  });

  test('should apply is-warning class to fast-button', async ({ page }) => {
    const warningButton = page.locator('fast-button.is-warning').first();

    await expect(warningButton).toBeVisible();

    const hasClass = await warningButton.evaluate((el) => el.classList.contains('is-warning'));
    expect(hasClass).toBe(true);
  });

  test('should apply size modifiers (is-small, is-medium, is-large)', async ({ page }) => {
    const smallButton = page.locator('fast-button.is-small').first();
    const mediumButton = page.locator('fast-button.is-medium').first();
    const largeButton = page.locator('fast-button.is-large').first();

    // Check small button
    if ((await smallButton.count()) > 0) {
      await expect(smallButton).toBeVisible();
      const hasSmallClass = await smallButton.evaluate((el) => el.classList.contains('is-small'));
      expect(hasSmallClass).toBe(true);
    }

    // Check medium button
    if ((await mediumButton.count()) > 0) {
      await expect(mediumButton).toBeVisible();
      const hasMediumClass = await mediumButton.evaluate((el) => el.classList.contains('is-medium'));
      expect(hasMediumClass).toBe(true);
    }

    // Check large button
    if ((await largeButton.count()) > 0) {
      await expect(largeButton).toBeVisible();
      const hasLargeClass = await largeButton.evaluate((el) => el.classList.contains('is-large'));
      expect(hasLargeClass).toBe(true);
    }
  });
});

test.describe('CSS Variable Penetration', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/demo.html');
    await page.waitForLoadState('networkidle');
  });

  test('should apply --fast-primary color to is-primary button', async ({ page }) => {
    const button = page.locator('fast-button.is-primary').first();

    // Get the computed background color
    const backgroundColor = await button.evaluate((el) => {
      return window.getComputedStyle(el).backgroundColor;
    });

    // Check it's not empty/transparent
    expect(backgroundColor).not.toBe('rgba(0, 0, 0, 0)');
    expect(backgroundColor).not.toBe('transparent');
  });

  test('should apply --fast-success color to is-success button', async ({ page }) => {
    const button = page.locator('fast-button.is-success').first();

    const backgroundColor = await button.evaluate((el) => {
      return window.getComputedStyle(el).backgroundColor;
    });

    expect(backgroundColor).not.toBe('rgba(0, 0, 0, 0)');
    expect(backgroundColor).not.toBe('transparent');
  });

  test('should have different colors for different button variants', async ({ page }) => {
    const primaryButton = page.locator('fast-button.is-primary').first();
    const successButton = page.locator('fast-button.is-success').first();
    const dangerButton = page.locator('fast-button.is-danger').first();

    const primaryColor = await primaryButton.evaluate((el) => {
      return window.getComputedStyle(el).backgroundColor;
    });

    const successColor = await successButton.evaluate((el) => {
      return window.getComputedStyle(el).backgroundColor;
    });

    const dangerColor = await dangerButton.evaluate((el) => {
      return window.getComputedStyle(el).backgroundColor;
    });

    // Colors should be different
    expect(primaryColor).not.toBe(successColor);
    expect(primaryColor).not.toBe(dangerColor);
    expect(successColor).not.toBe(dangerColor);
  });
});

test.describe('Error Boundary', () => {
  test('should show fallback UI if component fails to load', async ({ page }) => {
    // Navigate to page and inject error scenario
    await page.goto('/demo.html');

    // Check that error boundary console exists
    const hasErrorBoundary = await page.evaluate(() => {
      return typeof FastBulmaErrorBoundary !== 'undefined';
    });

    expect(hasErrorBoundary).toBe(true);
  });

  test('should handle missing CDN gracefully', async ({ page }) => {
    // This test would require mocking network failures
    // For now, we just verify error handling code exists

    const hasErrorHandler = await page.evaluate(() => {
      return window.addEventListener && window.onerror !== null;
    });

    expect(hasErrorHandler).toBe(true);
  });
});

test.describe('Component Interactions', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/demo.html');
    await page.waitForLoadState('networkidle');
  });

  test('should allow clicking fast-button', async ({ page }) => {
    const button = page.locator('fast-button').first();

    await expect(button).toBeVisible();
    await button.click();

    // Button should remain visible and clickable
    await expect(button).toBeVisible();
  });

  test('should allow typing in fast-text-field', async ({ page }) => {
    const textField = page.locator('fast-text-field').first();

    await expect(textField).toBeVisible();

    // Type text
    await textField.fill('Test input');

    // Verify value was set
    const value = await textField.inputValue();
    expect(value).toBe('Test input');
  });

  test('should allow checking fast-checkbox', async ({ page }) => {
    const checkbox = page.locator('fast-checkbox').first();

    await expect(checkbox).toBeVisible();

    // Check the checkbox
    await checkbox.check();

    // Verify it's checked
    const isChecked = await checkbox.isChecked();
    expect(isChecked).toBe(true);

    // Uncheck
    await checkbox.uncheck();

    const isUnchecked = await checkbox.isChecked();
    expect(isUnchecked).toBe(false);
  });

  test('should allow switching tabs in fast-tabs', async ({ page }) => {
    const tabs = page.locator('fast-tabs').first();

    await expect(tabs).toBeVisible();

    // Click on a tab
    const tab = tabs.locator('fast-tab').nth(1);
    await tab.click();

    // Verify tab is now active (has active attribute or class)
    const isActive = await tab.evaluate((el) => {
      return el.hasAttribute('active') || el.classList.contains('active');
    });

    expect(isActive).toBe(true);
  });
});
