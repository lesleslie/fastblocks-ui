/**
 * Vitest Setup File
 *
 * Configures the test environment for FastBulma JavaScript testing.
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

// Mock DOM environment helpers
global.createFastBulmaElement = (tagName, attributes = {}) => {
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

// FastBulma-specific test helpers
global.waitForFastBulmaInit = async (timeout = 5000) => {
  return new Promise((resolve, reject) => {
    const startTime = Date.now();

    const checkInit = () => {
      if (window.fastBulma && window.fastBulma.#initialized) {
        resolve(window.fastBulma);
      } else if (Date.now() - startTime > timeout) {
        reject(new Error('FastBulma initialization timeout'));
      } else {
        setTimeout(checkInit, 50);
      }
    };

    checkInit();
  });
};

// Mock FAST components for testing (until we can properly import them)
global.mockFASTComponents = {
  fastCard: class extends HTMLElement {},
  fastButton: class extends HTMLElement {},
  fastTextField: class extends HTMLElement {},
  fastTextArea: class extends HTMLElement {},
  fastSelect: class extends HTMLElement {},
  fastCheckbox: class extends HTMLElement {},
  fastRadio: class extends HTMLElement {},
  fastSwitch: class extends HTMLElement {},
  fastDialog: class extends HTMLElement {},
  fastTabs: class extends HTMLElement {},
  fastTabPanel: class extends HTMLElement {},
  fastAnchor: class extends HTMLElement {},
  fastProgress: class extends HTMLElement {},
  fastDataGrid: class extends HTMLElement {},
  fastMenuButton: class extends HTMLElement {},
};

// Register mock FAST components
Object.entries(global.mockFASTComponents).forEach(([name, componentClass]) => {
  customElements.define(name.toLowerCase(), componentClass);
});

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
    prop.startsWith('--fast-')
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
