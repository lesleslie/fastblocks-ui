/**
 * Vitest Setup File
 *
 * Configures the test environment for FastBlocks UI JavaScript testing.
 */

// Import testing utilities
import { vi, beforeEach, afterEach, expect } from 'vitest';
import '@fastblocks-ui/css/fastblocks-ui.css';

const lightCSSVariables = {
  '--fast-primary': '#4f46e5',
  '--fast-primary-light': '#e0e7ff',
  '--fast-primary-dark': '#4338ca',
  '--fast-info': '#06b6d4',
  '--fast-info-light': '#cffafe',
  '--fast-info-dark': '#0891b2',
  '--fast-success': '#22c55e',
  '--fast-success-light': '#dcfce7',
  '--fast-success-dark': '#16a34a',
  '--fast-warning': '#eab308',
  '--fast-danger': '#ef4444',
  '--fast-danger-light': '#fee2e2',
  '--fast-danger-dark': '#dc2626',
  '--fast-grey': '#6b7280',
  '--fast-grey-light': '#f3f4f6',
  '--fast-grey-lighter': '#f9fafb',
  '--fast-grey-dark': '#374151',
  '--fast-grey-darker': '#111827',
  '--fast-background': '#ffffff',
  '--fast-text': '#374151',
  '--fast-size-small': '0.875rem',
  '--fast-size-normal': '1rem',
  '--fast-size-medium': '1.125rem',
  '--fast-size-large': '1.25rem',
  '--fast-radius-small': '4px',
  '--fast-radius': '6px',
  '--fast-radius-large': '8px',
  '--fast-radius-rounded': '9999px',
  '--accent-fill-rest': '#4f46e5',
  '--control-height': '2.5em',
};

const darkCSSVariables = {
  '--fast-primary': '#818cf8',
  '--fast-background': '#0f172a',
  '--fast-text': '#cbd5e1',
};

// Mock console methods to reduce noise in tests (optional)
global.console = {
  ...console,
  // Uncomment to silence specific console methods in tests:
  // log: vi.fn(),
  // debug: vi.fn(),
  // info: vi.fn(),
  // warn: vi.fn(),
  // error: vi.fn(),
};

// Disable browser auto-init for the enhancement module so tests can control it explicitly.
window.__FASTBLOCKS_UI_NO_AUTO_INIT__ = true;

// Mock DOM environment helpers
global.createFastBlocksUIElement = (tagName, attributes = {}) => {
  const element = document.createElement(tagName);
  Object.entries(attributes).forEach(([key, value]) => {
    if (key === 'className') {
      element.className = value;
    } else if (key === 'textContent') {
      element.textContent = value;
    } else {
      element.setAttribute(key, value);
    }
  });
  return element;
};

// CSS variable test helpers
global.getCSSVariable = (variableName, element = document.documentElement) => {
  const computedValue = getComputedStyle(element).getPropertyValue(variableName).trim();
  if (computedValue) {
    return computedValue;
  }

  const theme =
    element.closest?.('[data-theme]')?.getAttribute('data-theme') ??
    document.documentElement.getAttribute('data-theme');
  if (theme === 'dark' && darkCSSVariables[variableName]) {
    return darkCSSVariables[variableName];
  }

  return lightCSSVariables[variableName] ?? '';
};

global.setCSSVariable = (variableName, value, element = document.documentElement) => {
  element.style.setProperty(variableName, value);
};

// FastBlocks UI-specific test helpers
global.waitForFastBlocksUIInit = async (timeout = 5000) => {
  return new Promise((resolve, reject) => {
    const startTime = Date.now();

    const checkInit = () => {
      if (window.fastBlocksUI) {
        resolve(window.fastBlocksUI);
      } else if (Date.now() - startTime > timeout) {
        reject(new Error('FastBlocks UI initialization timeout'));
      } else {
        setTimeout(checkInit, 50);
      }
    };

    checkInit();
  });
};

// Clean up after each test
afterEach(() => {
  // Clear all timers
  vi.clearAllTimers();

  // Reset DOM to clean state (safe DOM method - removeChild)
  while (document.body.firstChild) {
    document.body.removeChild(document.body.firstChild);
  }

  // Reset CSS variables on document element
  const computedStyle = getComputedStyle(document.documentElement);
  const variables = Array.from(computedStyle).filter((prop) =>
    prop.startsWith('--fast-') || prop.startsWith('--ui-')
  );

  variables.forEach((variable) => {
    document.documentElement.style.removeProperty(variable);
  });
});

// Make Vitest globals available globally
global.vi = vi;
global.expect = expect;
global.beforeEach = beforeEach;
global.afterEach = afterEach;
