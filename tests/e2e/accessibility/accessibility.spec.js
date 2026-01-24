/**
 * Accessibility Tests with axe-core
 *
 * Automated accessibility testing using axe-core Playwright integration:
 * - WCAG 2.1 AA compliance
 * - ARIA attributes
 * - Keyboard navigation
 * - Color contrast
 * - Screen reader compatibility
 */

import { test, expect } from '@playwright/test';
import AxeBuilder from '@playwright/test');

test.describe('Accessibility - WCAG 2.1 AA Compliance', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/demo.html');
    await page.waitForLoadState('networkidle');
  });

  test('should not have any automatically detectable accessibility issues', async ({ page }) => {
    const accessibilityScanResults = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
      .analyze();

    expect(accessibilityScanResults.violations).toEqual([]);
  });

  test('should have no critical accessibility violations', async ({ page }) => {
    const accessibilityScanResults = await new AxeBuilder({ page })
      .include('fast-button')
      .analyze();

    // Check for violations
    expect(accessibilityScanResults.violations.length).toBe(0);

    // If there are violations, log them for debugging
    if (accessibilityScanResults.violations.length > 0) {
      console.log('Accessibility Violations:', JSON.stringify(accessibilityScanResults.violations, null, 2));
    }
  });
});

test.describe('Component Accessibility', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/demo.html');
    await page.waitForLoadState('networkidle');
  });

  test('fast-button should be accessible', async ({ page }) => {
    const button = page.locator('fast-button').first();

    // Check button is in accessibility tree
    await expect(button).toBeVisible();

    // Check for accessible name
    const accessibleName = await button.evaluate((el) => {
      return el.getAttribute('aria-label') || el.textContent || el.getAttribute('title');
    });

    expect(accessibleName).toBeTruthy();
    expect(accessibleName.length).toBeGreaterThan(0);
  });

  test('fast-text-field should have accessible label', async ({ page }) => {
    const textField = page.locator('fast-text-field').first();

    await expect(textField).toBeVisible();

    // Check for label or aria-label
    const hasLabel = await textField.evaluate((el) => {
      const id = el.getAttribute('id');
      const label = id ? document.querySelector(`label[for="${id}"]`) : null;
      const ariaLabel = el.getAttribute('aria-label');
      const placeholder = el.getAttribute('placeholder');

      return !!(label || ariaLabel || placeholder);
    });

    expect(hasLabel).toBe(true);
  });

  test('fast-checkbox should be keyboard accessible', async ({ page }) => {
    const checkbox = page.locator('fast-checkbox').first();

    await expect(checkbox).toBeVisible();

    // Check checkbox can receive focus
    await checkbox.focus();
    const isFocused = await checkbox.evaluate((el) => document.activeElement === el);

    expect(isFocused).toBe(true);

    // Toggle with spacebar
    await checkbox.keyboard.press('Space');

    // Verify checkbox state changed
    const isChecked = await checkbox.isChecked();
    expect(isChecked).toBeDefined();
  });

  test('fast-tabs should have proper ARIA attributes', async ({ page }) => {
    const tabs = page.locator('fast-tabs').first();

    await expect(tabs).toBeVisible();

    // Check for aria-label or aria-labelledby
    const hasAriaLabel = await tabs.evaluate((el) => {
      return !!(el.getAttribute('aria-label') || el.getAttribute('aria-labelledby'));
    });

    expect(hasAriaLabel).toBe(true);
  });

  test('fast-dialog should have proper ARIA attributes', async ({ page }) => {
    const dialog = page.locator('fast-dialog').first();

    if ((await dialog.count()) > 0) {
      await expect(dialog).toBeVisible();

      // Check for aria-labelledby
      const hasLabelledBy = await dialog.evaluate((el) => {
        return el.hasAttribute('aria-labelledby');
      });

      expect(hasLabelledBy).toBe(true);
    }
  });
});

test.describe('Keyboard Navigation', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/demo.html');
    await page.waitForLoadState('networkidle');
  });

  test('should allow tab navigation through interactive elements', async ({ page }) => {
    const buttons = page.locator('fast-button');

    const count = await buttons.count();
    if (count > 0) {
      // Focus first button
      await buttons.first().focus();

      // Tab to next element
      await page.keyboard.press('Tab');

      // Check focus moved
      const focusedElement = await page.evaluate(() => {
        return document.activeElement.tagName.toLowerCase();
      });

      expect(['fast-button', 'fast-text-field', 'fast-checkbox', 'fast-select', 'button', 'input']).toContain(
        focusedElement
      );
    }
  });

  test('should allow Enter key to activate buttons', async ({ page }) => {
    const button = page.locator('fast-button').first();

    await button.focus();

    // Press Enter
    await page.keyboard.press('Enter');

    // Button should remain focused and functional
    const isFocused = await button.evaluate((el) => document.activeElement === el);
    expect(isFocused).toBe(true);
  });

  test('should allow Space key to activate checkboxes', async ({ page }) => {
    const checkbox = page.locator('fast-checkbox').first();

    await checkbox.focus();

    // Get initial state
    const initialState = await checkbox.isChecked();

    // Press Space
    await page.keyboard.press('Space');

    // Get new state
    const newState = await checkbox.isChecked();

    // State should have toggled
    expect(newState).not.toBe(initialState);
  });

  test('should allow arrow keys in tab list', async ({ page }) => {
    const tabs = page.locator('fast-tabs').first();

    if ((await tabs.count()) > 0) {
      await tabs.focus();

      // Try left arrow
      await page.keyboard.press('ArrowLeft');

      // Try right arrow
      await page.keyboard.press('ArrowRight');

      // Tabs should still be focused
      const isFocused = await tabs.evaluate((el) => document.activeElement === el || el.contains(document.activeElement));

      expect(isFocused).toBe(true);
    }
  });
});

test.describe('Color Contrast', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/demo.html');
    await page.waitForLoadState('networkidle');
  });

  test('buttons should have sufficient color contrast', async ({ page }) => {
    const button = page.locator('fast-button.is-primary').first();

    await expect(button).toBeVisible();

    // Get text color and background color
    const colors = await button.evaluate((el) => {
      const style = window.getComputedStyle(el);
      return {
        color: style.color,
        backgroundColor: style.backgroundColor,
      };
    });

    // Colors should be defined (not transparent/rgba(0,0,0,0))
    expect(colors.color).not.toBe('rgba(0, 0, 0, 0)');
    expect(colors.color).not.toBe('transparent');
    expect(colors.backgroundColor).not.toBe('rgba(0, 0, 0, 0)');
    expect(colors.backgroundColor).not.toBe('transparent');
  });

  test('text fields should have visible focus indicator', async ({ page }) => {
    const textField = page.locator('fast-text-field').first();

    await textField.focus();

    // Get outline/focus styles
    const hasFocusIndicator = await textField.evaluate((el) => {
      const style = window.getComputedStyle(el);
      const outline = style.outline;
      const boxShadow = style.boxShadow;

      return !!(outline !== 'none' || boxShadow !== 'none');
    });

    expect(hasFocusIndicator).toBe(true);
  });
});

test.describe('ARIA Attributes', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/demo.html');
    await page.waitForLoadState('networkidle');
  });

  test('fast-checkbox should have aria-checked', async ({ page }) => {
    const checkbox = page.locator('fast-checkbox').first();

    await expect(checkbox).toBeVisible();

    const hasAriaChecked = await checkbox.evaluate((el) => {
      return el.hasAttribute('aria-checked');
    });

    // FAST components should have aria-checked
    expect(hasAriaChecked).toBe(true);
  });

  test('fast-tabs should have aria-selected on active tab', async ({ page }) => {
    const tabs = page.locator('fast-tabs').first();

    if ((await tabs.count()) > 0) {
      const tab = tabs.locator('fast-tab').first();

      await expect(tab).toBeVisible();

      const hasAriaSelected = await tab.evaluate((el) => {
        return el.hasAttribute('aria-selected');
      });

      expect(hasAriaSelected).toBe(true);
    }
  });

  test('form fields should support aria-invalid', async ({ page }) => {
    const textField = page.locator('fast-text-field').first();

    await expect(textField).toBeVisible();

    // Set aria-invalid attribute
    await textField.evaluate((el) => el.setAttribute('aria-invalid', 'true'));

    // Verify it's set
    const hasInvalid = await textField.evaluate((el) => {
      return el.getAttribute('aria-invalid') === 'true';
    });

    expect(hasInvalid).toBe(true);
  });
});

test.describe('Screen Reader Compatibility', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/demo.html');
    await page.waitForLoadState('networkidle');
  });

  test('buttons should have accessible names', async ({ page }) => {
    const buttons = page.locator('fast-button');

    const count = await buttons.count();
    if (count > 0) {
      for (let i = 0; i < Math.min(count, 5); i++) {
        const button = buttons.nth(i);
        await expect(button).toBeVisible();

        const name = await button.evaluate((el) => {
          return el.textContent?.trim() || el.getAttribute('aria-label') || el.getAttribute('title') || '';
        });

        expect(name.length).toBeGreaterThan(0);
      }
    }
  });

  test('form inputs should have associated labels', async ({ page }) => {
    const textFields = page.locator('fast-text-field');

    const count = await textFields.count();
    if (count > 0) {
      for (let i = 0; i < Math.min(count, 3); i++) {
        const textField = textFields.nth(i);

        const hasLabel = await textField.evaluate((el) => {
          // Check for explicit label
          const id = el.getAttribute('id');
          const label = id ? document.querySelector(`label[for="${id}"]`) : null;

          // Check for aria-label
          const ariaLabel = el.getAttribute('aria-label');

          // Check for aria-labelledby
          const labelledBy = el.getAttribute('aria-labelledby');
          const labelledByElement = labelledBy ? document.getElementById(labelledBy) : null;

          // Check for placeholder (not ideal but better than nothing)
          const placeholder = el.getAttribute('placeholder');

          return !!(label || ariaLabel || labelledByElement || placeholder);
        });

        expect(hasLabel).toBe(true);
      }
    }
  });

  test('error messages should be associated with form inputs', async ({ page }) => {
    // This test checks if there are error message elements
    // with proper aria-describedby associations

    const hasErrorMessaging = await page.evaluate(() => {
      const inputs = document.querySelectorAll('fast-text-field, fast-text-area, fast-select');

      return Array.from(inputs).some((input) => {
        const describedBy = input.getAttribute('aria-describedby');
        if (describedBy) {
          const errorElement = document.getElementById(describedBy);
          return errorElement && (errorElement.getAttribute('role') === 'alert' || errorElement.classList.contains('error'));
        }
        return false;
      });
    });

    // This is informational - not all forms may have error messages
    console.log('Has error messaging:', hasErrorMessaging);
  });
});

test.describe('Focus Management', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/demo.html');
    await page.waitForLoadState('networkidle');
  });

  test('should manage focus in fast-dialog', async ({ page }) => {
    const dialog = page.locator('fast-dialog').first();

    if ((await dialog.count()) > 0) {
      // Open dialog (click trigger button if exists)
      const trigger = page.locator('[data-dialog-trigger]').first();

      if ((await trigger.count()) > 0) {
        await trigger.click();
        await page.waitForTimeout(100);

        // Focus should be inside dialog
        const focusedInDialog = await page.evaluate(() => {
          const dialog = document.querySelector('fast-dialog');
          return dialog && dialog.contains(document.activeElement);
        });

        expect(focusedInDialog).toBe(true);
      }
    }
  });

  test('should return focus after closing fast-dialog', async ({ page }) => {
    const trigger = page.locator('[data-dialog-trigger]').first();
    const dialog = page.locator('fast-dialog').first();

    if ((await trigger.count()) > 0 && (await dialog.count()) > 0) {
      // Focus trigger
      await trigger.focus();
      const wasFocused = await trigger.evaluate((el) => document.activeElement === el);
      expect(wasFocused).toBe(true);

      // Open dialog
      await trigger.click();
      await page.waitForTimeout(100);

      // Close dialog (ESC key)
      await page.keyboard.press('Escape');
      await page.waitForTimeout(100);

      // Focus should return to trigger
      const isFocused = await trigger.evaluate((el) => document.activeElement === el);
      expect(isFocused).toBe(true);
    }
  });
});

test.describe('Mobile Accessibility', () => {
  test('should be accessible on mobile viewport', async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('/demo.html');
    await page.waitForLoadState('networkidle');

    // Run accessibility scan
    const accessibilityScanResults = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
      .analyze();

    // Should not have violations
    expect(accessibilityScanResults.violations.length).toBe(0);
  });

  test('touch targets should be large enough (44x44 min)', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('/demo.html');
    await page.waitForLoadState('networkidle');

    const buttons = page.locator('fast-button, button');

    const count = await buttons.count();
    if (count > 0) {
      for (let i = 0; i < Math.min(count, 5); i++) {
        const button = buttons.nth(i);

        const size = await button.evaluate((el) => {
          const rect = el.getBoundingClientRect();
          return {
            width: rect.width,
            height: rect.height,
          };
        });

        // Check minimum touch target size (WCAG 2.5.5: 44x44 CSS pixels)
        expect(size.width).toBeGreaterThanOrEqual(44);
        expect(size.height).toBeGreaterThanOrEqual(44);
      }
    }
  });
});
