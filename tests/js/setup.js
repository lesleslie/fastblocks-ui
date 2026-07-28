/**
 * Vitest Setup File
 *
 * Configures the test environment for FastBlocks UI JavaScript testing.
 */

// Import testing utilities
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { vi, beforeEach, afterEach, expect } from 'vitest';
import '@fastblocks-ui/css/fastblocks-ui.css';

// Token values are PARSED FROM THE SHIPPED BUNDLE, never hand-written here.
//
// jsdom does not apply an imported stylesheet's custom properties to
// `getComputedStyle`, so `getCSSVariable` needs a fallback. That fallback used
// to be a hardcoded table of Tailwind *v3* hex values. After the palette
// migrated to v4 `oklch()`, every colour assertion in css-variables.test.js was
// validating a table that no longer matched anything the library ships --
// including `--ui-color-info: #06b6d4` and `--ui-color-success: #22c55e`,
// precisely the two values tokens.css documents as failing WCAG AA and having
// been deliberately replaced. Reading the real bundle means these tests cannot
// silently drift from the shipped tokens again.
const CSS_PATH = resolve(
  dirname(fileURLToPath(import.meta.url)),
  '../../fastblocks_ui/static/css/fastblocks-ui.css',
);

function extractBlock(css, selector) {
  const start = css.indexOf(selector);
  if (start === -1) return '';
  const open = css.indexOf('{', start);
  let depth = 1;
  let i = open + 1;
  while (depth > 0 && i < css.length) {
    if (css[i] === '{') depth += 1;
    else if (css[i] === '}') depth -= 1;
    i += 1;
  }
  return css.slice(open, i);
}

function parseTokens(block) {
  const tokens = {};
  const re = /(--ui-[\w-]+):\s*([^;]+);/g;
  let match;
  while ((match = re.exec(block)) !== null) {
    tokens[match[1]] = match[2].trim();
  }
  return tokens;
}

const bundleCSS = readFileSync(CSS_PATH, 'utf8');
const lightCSSVariables = parseTokens(extractBlock(bundleCSS, ':root {'));
const darkCSSVariables = parseTokens(
  extractBlock(bundleCSS, '[data-theme="dark"] {'),
);

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
