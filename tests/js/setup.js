/**
 * Vitest Setup File
 *
 * Configures the test environment for FastBlocks UI JavaScript testing.
 */

// Import testing utilities
import { vi, beforeEach, afterEach, expect } from 'vitest';
import '@fastblocks-ui/css/fastblocks-ui.css';

const lightCSSVariables = {
  '--ui-color-primary': '#4f46e5',
  '--ui-color-primary-subtle': '#e0e7ff',
  '--ui-color-primary-strong': '#4338ca',
  '--ui-color-info': '#06b6d4',
  '--ui-color-info-subtle': '#cffafe',
  '--ui-color-info-strong': '#0891b2',
  '--ui-color-success': '#22c55e',
  '--ui-color-success-subtle': '#dcfce7',
  '--ui-color-success-strong': '#16a34a',
  '--ui-color-warning': '#eab308',
  '--ui-color-danger': '#ef4444',
  '--ui-color-danger-subtle': '#fee2e2',
  '--ui-color-danger-strong': '#b91c1c',
  '--ui-color-surface': '#ffffff',
  '--ui-color-text': '#374151',
  '--ui-radius-sm': '4px',
  '--ui-radius-md': '6px',
  '--ui-radius-lg': '8px',
  '--ui-radius-pill': '9999px',
};

const darkCSSVariables = {
  '--ui-color-primary': '#818cf8',
  '--ui-color-surface': '#0f172a',
  '--ui-color-text': '#cbd5e1',
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
  const variables = Array.from(computedStyle).filter((prop) => prop.startsWith('--ui-'));

  variables.forEach((variable) => {
    document.documentElement.style.removeProperty(variable);
  });
});

// Make Vitest globals available globally
global.vi = vi;
global.expect = expect;
global.beforeEach = beforeEach;
global.afterEach = afterEach;
