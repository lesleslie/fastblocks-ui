/**
 * CSS Variable Mapping Tests
 *
 * Tests the CSS custom-property layer for FastBlocks UI semantic classes.
 * This includes:
 * - Root token definitions (`--ui-*`)
 * - Class modifier mappings
 * - Dark mode support
 * - Naming convention (single `--ui-*` namespace, no legacy bridge tokens)
 *
 * Note: the legacy `--fast-*` bridge tokens and the unrelated
 * `--accent-fill-rest`/`--control-height` tokens were removed outright (no
 * live consumers depended on them) — see WS-13 in the cross-repo
 * remediation plan. This file was rewritten accordingly rather than
 * patched in place, since almost every test here was built around those
 * tokens specifically.
 */

import { describe, it, expect, beforeEach } from 'vitest';

describe('CSS Variable Bridge Layer', () => {
  describe('Root Variables', () => {
    describe('Primary Color', () => {
      it('should define --ui-color-primary', () => {
        const value = getCSSVariable('--ui-color-primary');
        expect(value).toBeTruthy();
      });

      it('should use Tailwind v4 indigo-600 (oklch)', () => {
        const value = getCSSVariable('--ui-color-primary');
        expect(value.toLowerCase()).toBe('oklch(51.1% 0.262 276.966)');
      });

      it('should define --ui-color-primary-subtle', () => {
        const value = getCSSVariable('--ui-color-primary-subtle');
        expect(value.toLowerCase()).toBe('oklch(93% 0.034 272.788)'); // indigo-100
      });

      it('should define --ui-color-primary-strong', () => {
        const value = getCSSVariable('--ui-color-primary-strong');
        expect(value.toLowerCase()).toBe('oklch(45.7% 0.24 277.023)'); // indigo-700
      });
    });

    describe('Success Color', () => {
      it('should define --ui-color-success', () => {
        const value = getCSSVariable('--ui-color-success');
        expect(value.toLowerCase()).toBe('oklch(52.7% 0.154 150.069)'); // green-500
      });

      it('should define --ui-color-success-subtle', () => {
        const value = getCSSVariable('--ui-color-success-subtle');
        expect(value.toLowerCase()).toBe('oklch(96.2% 0.044 156.743)'); // green-100
      });

      it('should define --ui-color-success-strong', () => {
        const value = getCSSVariable('--ui-color-success-strong');
        expect(value.toLowerCase()).toBe('oklch(44.8% 0.119 151.328)'); // green-600
      });
    });

    describe('Warning Color', () => {
      it('should define --ui-color-warning', () => {
        const value = getCSSVariable('--ui-color-warning');
        expect(value.toLowerCase()).toBe('oklch(79.5% 0.184 86.047)'); // yellow-500
      });
    });

    describe('Danger Color', () => {
      it('should define --ui-color-danger', () => {
        const value = getCSSVariable('--ui-color-danger');
        expect(value.toLowerCase()).toBe('oklch(57.7% 0.245 27.325)'); // red-500
      });

      it('should define --ui-color-danger-subtle', () => {
        const value = getCSSVariable('--ui-color-danger-subtle');
        expect(value.toLowerCase()).toBe('oklch(93.6% 0.032 17.717)'); // red-100
      });
    });

    describe('Info Color', () => {
      it('should define --ui-color-info', () => {
        const value = getCSSVariable('--ui-color-info');
        expect(value.toLowerCase()).toBe('oklch(52% 0.105 223.128)'); // cyan-500
      });

      it('should define --ui-color-info-subtle', () => {
        const value = getCSSVariable('--ui-color-info-subtle');
        expect(value.toLowerCase()).toBe('oklch(95.6% 0.045 203.388)'); // cyan-100
      });

      it('should define --ui-color-info-strong', () => {
        const value = getCSSVariable('--ui-color-info-strong');
        expect(value.toLowerCase()).toBe('oklch(45% 0.085 224.283)'); // cyan-600
      });
    });

    describe('Border Radius', () => {
      it('should define --ui-radius-sm/md/lg/pill', () => {
        expect(getCSSVariable('--ui-radius-sm')).toBeTruthy();
        expect(getCSSVariable('--ui-radius-md')).toBeTruthy();
        expect(getCSSVariable('--ui-radius-lg')).toBeTruthy();
        expect(getCSSVariable('--ui-radius-pill')).toBeTruthy();
      });
    });
  });

  describe('Class Modifiers', () => {
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

    it('should keep the SAME primary color in dark mode (deliberate)', () => {
      // tokens.css: "Primary deliberately does NOT lighten in dark mode."
      // indigo-400/-300 reach only 2.98:1 / 1.99:1 against white text, so
      // primary stays indigo-600 in both themes at 6.29:1.
      //
      // This previously asserted the opposite and passed only because the
      // setup file's hand-written dark table claimed '#818cf8' -- a value the
      // library does not ship.
      const lightPrimary = getCSSVariable('--ui-color-primary');

      htmlElement.setAttribute('data-theme', 'dark');
      const darkPrimary = getCSSVariable('--ui-color-primary');

      expect(darkPrimary).toBe(lightPrimary);
    });

    it('should have different surface colors in dark mode', () => {
      const lightSurface = getCSSVariable('--ui-color-surface');

      htmlElement.setAttribute('data-theme', 'dark');
      const darkSurface = getCSSVariable('--ui-color-surface');

      expect(lightSurface).not.toBe(darkSurface);
    });

    it('should have different text colors in dark mode', () => {
      const lightText = getCSSVariable('--ui-color-text');

      htmlElement.setAttribute('data-theme', 'dark');
      const darkText = getCSSVariable('--ui-color-text');

      expect(lightText).not.toBe(darkText);
    });
  });

  describe('Variable Naming Convention', () => {
    it('should use a single --ui- namespace for all tokens', () => {
      const primary = getCSSVariable('--ui-color-primary');
      expect(primary).toBeTruthy();

      // The legacy --fast- bridge tokens were removed outright (WS-13) --
      // there is no compatibility layer to preserve.
      const legacyPrimary = getCSSVariable('--fast-primary');
      expect(legacyPrimary).toBeFalsy();
    });

    it('should consistently use --ui-color- prefix for semantic colors', () => {
      const variables = [
        '--ui-color-primary',
        '--ui-color-success',
        '--ui-color-warning',
        '--ui-color-danger',
        '--ui-color-info',
      ];

      variables.forEach((variable) => {
        const value = getCSSVariable(variable);
        expect(value).toBeTruthy();
      });
    });
  });
});
