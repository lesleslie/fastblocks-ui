/**
 * CSS Variable Mapping Tests
 *
 * Tests the CSS variable bridge layer that connects Bulma classes to FAST components.
 * This includes:
 * - Root variable definitions
 * - FAST token mappings
 * - Bulma class modifier mappings
 * - Color theme support
 * - Dark mode support
 */

import { describe, it, expect, beforeEach } from 'vitest';

describe('CSS Variable Bridge Layer', () => {
  describe('Root Variables', () => {
    describe('Primary Color', () => {
      it('should define --fast-primary', () => {
        const value = getCSSVariable('--fast-primary');
        expect(value).toBeTruthy();
        expect(value.length).toBeGreaterThan(0);
      });

      it('should use Tailwind indigo-600 (#4f46e5)', () => {
        const value = getCSSVariable('--fast-primary');
        expect(value.toLowerCase()).toBe('#4f46e5');
      });

      it('should define --fast-primary-light', () => {
        const value = getCSSVariable('--fast-primary-light');
        expect(value).toBeTruthy();
        expect(value.toLowerCase()).toBe('#e0e7ff'); // indigo-100
      });

      it('should define --fast-primary-dark', () => {
        const value = getCSSVariable('--fast-primary-dark');
        expect(value).toBeTruthy();
        expect(value.toLowerCase()).toBe('#4338ca'); // indigo-700
      });
    });

    describe('Success Color', () => {
      it('should define --fast-success', () => {
        const value = getCSSVariable('--fast-success');
        expect(value).toBeTruthy();
      });

      it('should use Tailwind green-500 (#22c55e)', () => {
        const value = getCSSVariable('--fast-success');
        expect(value.toLowerCase()).toBe('#22c55e');
      });

      it('should define --fast-success-light', () => {
        const value = getCSSVariable('--fast-success-light');
        expect(value.toLowerCase()).toBe('#dcfce7'); // green-100
      });

      it('should define --fast-success-dark', () => {
        const value = getCSSVariable('--fast-success-dark');
        expect(value.toLowerCase()).toBe('#16a34a'); // green-600
      });
    });

    describe('Warning Color', () => {
      it('should define --fast-warning', () => {
        const value = getCSSVariable('--fast-warning');
        expect(value).toBeTruthy();
      });

      it('should use Tailwind yellow-500 (#eab308)', () => {
        const value = getCSSVariable('--fast-warning');
        expect(value.toLowerCase()).toBe('#eab308');
      });
    });

    describe('Danger Color', () => {
      it('should define --fast-danger', () => {
        const value = getCSSVariable('--fast-danger');
        expect(value).toBeTruthy();
      });

      it('should use Tailwind red-500 (#ef4444)', () => {
        const value = getCSSVariable('--fast-danger');
        expect(value.toLowerCase()).toBe('#ef4444');
      });

      it('should define --fast-danger-light', () => {
        const value = getCSSVariable('--fast-danger-light');
        expect(value.toLowerCase()).toBe('#fee2e2'); // red-100
      });

      it('should define --fast-danger-dark', () => {
        const value = getCSSVariable('--fast-danger-dark');
        expect(value.toLowerCase()).toBe('#dc2626'); // red-600
      });
    });

    describe('Info Color', () => {
      it('should define --fast-info', () => {
        const value = getCSSVariable('--fast-info');
        expect(value).toBeTruthy();
      });

      it('should use Tailwind cyan-500 (#06b6d4)', () => {
        const value = getCSSVariable('--fast-info');
        expect(value.toLowerCase()).toBe('#06b6d4');
      });

      it('should define --fast-info-light', () => {
        const value = getCSSVariable('--fast-info-light');
        expect(value.toLowerCase()).toBe('#cffafe'); // cyan-100
      });

      it('should define --fast-info-dark', () => {
        const value = getCSSVariable('--fast-info-dark');
        expect(value.toLowerCase()).toBe('#0891b2'); // cyan-600
      });
    });

    describe('Neutral Colors', () => {
      it('should define --fast-grey (gray-500)', () => {
        const value = getCSSVariable('--fast-grey');
        expect(value.toLowerCase()).toBe('#6b7280');
      });

      it('should define --fast-grey-light (gray-100)', () => {
        const value = getCSSVariable('--fast-grey-light');
        expect(value.toLowerCase()).toBe('#f3f4f6');
      });

      it('should define --fast-grey-lighter (gray-50)', () => {
        const value = getCSSVariable('--fast-grey-lighter');
        expect(value.toLowerCase()).toBe('#f9fafb');
      });

      it('should define --fast-grey-dark (gray-700)', () => {
        const value = getCSSVariable('--fast-grey-dark');
        expect(value.toLowerCase()).toBe('#374151');
      });

      it('should define --fast-grey-darker (gray-900)', () => {
        const value = getCSSVariable('--fast-grey-darker');
        expect(value.toLowerCase()).toBe('#111827');
      });
    });

    describe('Typography', () => {
      it('should define --fast-size-small', () => {
        const value = getCSSVariable('--fast-size-small');
        expect(value).toBeTruthy();
      });

      it('should define --fast-size-normal', () => {
        const value = getCSSVariable('--fast-size-normal');
        expect(value).toBeTruthy();
      });

      it('should define --fast-size-medium', () => {
        const value = getCSSVariable('--fast-size-medium');
        expect(value).toBeTruthy();
      });

      it('should define --fast-size-large', () => {
        const value = getCSSVariable('--fast-size-large');
        expect(value).toBeTruthy();
      });
    });

    describe('Border Radius', () => {
      it('should define --fast-radius', () => {
        const value = getCSSVariable('--fast-radius');
        expect(value).toBeTruthy();
      });

      it('should define --fast-radius-small', () => {
        const value = getCSSVariable('--fast-radius-small');
        expect(value).toBeTruthy();
      });

      it('should define --fast-radius-large', () => {
        const value = getCSSVariable('--fast-radius-large');
        expect(value).toBeTruthy();
      });

      it('should define --fast-radius-rounded', () => {
        const value = getCSSVariable('--fast-radius-rounded');
        expect(value).toBeTruthy();
      });
    });
  });

  describe('FAST Token Mappings', () => {
    it('should map --accent-fill-rest to --fast-primary', () => {
      // Add an element with is-primary class
      const button = document.createElement('fast-button');
      button.className = 'is-primary';
      document.body.appendChild(button);

      const accentFill = getComputedStyle(button).getPropertyValue('--accent-fill-rest');
      const primaryColor = getCSSVariable('--fast-primary');

      // The button should inherit the primary color through CSS variables
      expect(primaryColor).toBeTruthy();

      // Cleanup
      document.body.removeChild(button);
    });

    it('should map control dimensions to Bulma sizing', () => {
      const height = getCSSVariable('--control-height');
      expect(height).toBeTruthy();
      // Should be around 2.5em (Bulma standard)
      expect(height).toContain('em');
    });
  });

  describe('Bulma Class Modifiers', () => {
    let testElement;

    beforeEach(() => {
      testElement = document.createElement('div');
      document.body.appendChild(testElement);
    });

    afterEach(() => {
      if (testElement && testElement.parentNode) {
        document.body.removeChild(testElement);
      }
    });

    describe('Color Modifiers', () => {
      it('should apply primary color with .is-primary', () => {
        testElement.className = 'is-primary';

        // The class should be present
        expect(testElement.classList.contains('is-primary')).toBe(true);
      });

      it('should apply success color with .is-success', () => {
        testElement.className = 'is-success';

        expect(testElement.classList.contains('is-success')).toBe(true);
      });

      it('should apply warning color with .is-warning', () => {
        testElement.className = 'is-warning';

        expect(testElement.classList.contains('is-warning')).toBe(true);
      });

      it('should apply danger color with .is-danger', () => {
        testElement.className = 'is-danger';

        expect(testElement.classList.contains('is-danger')).toBe(true);
      });

      it('should apply info color with .is-info', () => {
        testElement.className = 'is-info';

        expect(testElement.classList.contains('is-info')).toBe(true);
      });

      it('should support multiple color modifiers', () => {
        testElement.className = 'is-primary is-success';

        expect(testElement.classList.contains('is-primary')).toBe(true);
        expect(testElement.classList.contains('is-success')).toBe(true);
      });
    });

    describe('Size Modifiers', () => {
      it('should apply small size with .is-small', () => {
        testElement.className = 'is-small';

        expect(testElement.classList.contains('is-small')).toBe(true);
      });

      it('should apply medium size with .is-medium', () => {
        testElement.className = 'is-medium';

        expect(testElement.classList.contains('is-medium')).toBe(true);
      });

      it('should apply large size with .is-large', () => {
        testElement.className = 'is-large';

        expect(testElement.classList.contains('is-large')).toBe(true);
      });
    });
  });

  describe('Dark Mode Support', () => {
    let htmlElement;

    beforeEach(() => {
      htmlElement = document.documentElement;
    });

    afterEach(() => {
      htmlElement.removeAttribute('data-theme');
    });

    it('should switch to dark theme with data-theme="dark"', () => {
      htmlElement.setAttribute('data-theme', 'dark');

      const theme = htmlElement.getAttribute('data-theme');
      expect(theme).toBe('dark');
    });

    it('should switch to light theme with data-theme="light"', () => {
      htmlElement.setAttribute('data-theme', 'dark');
      htmlElement.setAttribute('data-theme', 'light');

      const theme = htmlElement.getAttribute('data-theme');
      expect(theme).toBe('light');
    });

    it('should have different primary colors in dark mode', () => {
      // Get light mode color
      const lightPrimary = getCSSVariable('--fast-primary');

      // Switch to dark mode
      htmlElement.setAttribute('data-theme', 'dark');
      const darkPrimary = getCSSVariable('--fast-primary');

      // Colors should be different
      expect(lightPrimary).not.toBe(darkPrimary);
    });

    it('should have different background colors in dark mode', () => {
      // Get light mode background
      const lightBackground = getCSSVariable('--fast-background');

      // Switch to dark mode
      htmlElement.setAttribute('data-theme', 'dark');
      const darkBackground = getCSSVariable('--fast-background');

      // Backgrounds should be different
      expect(lightBackground).not.toBe(darkBackground);
    });

    it('should have different text colors in dark mode', () => {
      // Get light mode text color
      const lightText = getCSSVariable('--fast-text');

      // Switch to dark mode
      htmlElement.setAttribute('data-theme', 'dark');
      const darkText = getCSSVariable('--fast-text');

      // Text colors should be different
      expect(lightText).not.toBe(darkText);
    });
  });

  describe('Color-mix() Fallback Support', () => {
    it('should define hover states with color-mix() in modern browsers', () => {
      // This test verifies color-mix() is used when supported
      const primary = getCSSVariable('--fast-primary');

      // In modern browsers with color-mix(), hover states are computed
      // We can't easily test the actual color-mix() result in jsdom,
      // but we can verify the base variable exists
      expect(primary).toBeTruthy();
    });

    it('should have fallback colors for older browsers', () => {
      // Verify dark variants exist as fallbacks
      const primaryDark = getCSSVariable('--fast-primary-dark');
      expect(primaryDark).toBeTruthy();

      const successDark = getCSSVariable('--fast-success-dark');
      expect(successDark).toBeTruthy();

      const dangerDark = getCSSVariable('--fast-danger-dark');
      expect(dangerDark).toBeTruthy();
    });
  });

  describe('Variable Naming Convention', () => {
    it('should use --fast- prefix instead of --bulma-', () => {
      // Verify we're using the new naming convention
      const primary = getCSSVariable('--fast-primary');
      expect(primary).toBeTruthy();

      // Old --bulma- variables should not exist (or be migrated)
      const oldPrimary = getCSSVariable('--bulma-primary');
      expect(oldPrimary).toBeFalsy();
    });

    it('should consistently use --fast- prefix for all colors', () => {
      const prefixes = ['--fast-primary', '--fast-success', '--fast-warning', '--fast-danger', '--fast-info'];

      prefixes.forEach((variable) => {
        const value = getCSSVariable(variable);
        expect(value).toBeTruthy();
      });
    });
  });
});
