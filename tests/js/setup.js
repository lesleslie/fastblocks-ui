/**
 * Vitest Setup File
 *
 * Configures the test environment for FastBlocks UI JavaScript testing.
 */

// Import testing utilities
import { vi, beforeEach, afterEach, expect } from 'vitest';

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
  return getComputedStyle(element).getPropertyValue(variableName).trim();
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
