/* FastBulma JavaScript Initialization */
/* Sets up FAST components and provides utility functions */

/**
 * Error boundary class for handling FAST component failures gracefully.
 *
 * Provides error tracking, fallback UI rendering, and safe component registration.
 */
class FastBulmaErrorBoundary {
  /** @type {Map<string, Object>} Track errors by component name */
  static errors = new Map();

  /**
   * Handle a component error by logging it and displaying fallback UI.
   *
   * @static
   * @param {string} componentName - Name of the failed component
   * @param {Error} error - The error object
   * @param {Element|null} element - The DOM element that failed (optional)
   * @returns {Element|null} The fallback DOM element or null if no element provided
   */
  static handleComponentError(componentName, error, element) {
    console.error(`FastBulma component ${componentName} failed:`, error);

    // Log error for monitoring
    this.errors.set(componentName, {
      error,
      timestamp: new Date().toISOString(),
      element: element?.tagName || 'unknown'
    });

    // Show fallback UI using safe DOM methods
    const fallbackDiv = document.createElement('div');
    fallbackDiv.className = `fastbulma-fallback is-${componentName}`;

    const iconSpan = document.createElement('span');
    iconSpan.className = 'fastbulma-error-icon';
    iconSpan.setAttribute('aria-hidden', 'true');
    iconSpan.textContent = '⚠️';

    const messageSpan = document.createElement('span');
    messageSpan.className = 'fastbulma-error-message';
    messageSpan.textContent = 'Component temporarily unavailable';

    const retryButton = document.createElement('button');
    retryButton.className = 'fastbulma-retry-button';
    retryButton.textContent = 'Retry';
    retryButton.addEventListener('click', () => window.location.reload());

    fallbackDiv.appendChild(iconSpan);
    fallbackDiv.appendChild(messageSpan);
    fallbackDiv.appendChild(retryButton);

    if (element) {
      element.insertAdjacentElement('afterend', fallbackDiv);
      element.style.display = 'none'; // Hide failed component
    }

    return fallbackDiv;
  }

  /**
   * Safely register a component with error handling.
   *
   * @static
   * @async
   * @param {string} componentName - Name of the component to register
   * @param {Function} componentFn - Function that registers the component
   * @returns {Promise<boolean>} True if registration succeeded, false if failed
   */
  static async safeRegister(componentName, componentFn) {
    try {
      await componentFn();
      return true;
    } catch (error) {
      this.handleComponentError(componentName, error);
      return false;
    }
  }

  /**
   * Wrap a component function with error handling.
   *
   * @static
   * @param {string} componentName - Name of the component for error tracking
   * @param {Function} fn - The function to wrap
   * @returns {Function} Wrapped function that catches and handles errors
   */
  static wrapComponentFunction(componentName, fn) {
    return async (...args) => {
      try {
        return await fn(...args);
      } catch (error) {
        this.handleComponentError(componentName, error);
        return null;
      }
    };
  }
}

/**
 * Main FastBulma class for initializing and managing FAST components.
 *
 * Provides component registration, theme management, and utility functions
 * for integrating FAST web components with Bulma CSS classes.
 */
class FastBulma {
  /** @type {boolean} Whether FAST components have been initialized */
  #initialized = false;

  /** @type {Object|null} Cached FAST components module */
  #fastComponents = null;

  /**
   * Create a new FastBulma instance and initialize components.
   *
   * @constructor
   */
  constructor() {
    this.init();
  }

  /**
   * Initialize FAST components and design system.
   *
   * This method:
   * - Checks for duplicate initialization
   * - Imports FAST components from CDN (cached)
   * - Registers all components with error boundaries
   * - Logs registration summary
   *
   * @async
   * @returns {Promise<void>}
   */
  async init() {
    if (this.#initialized) {
      console.warn('FastBulma already initialized');
      return;
    }

    // Import and register FAST components with error boundaries
    try {
      // Import FAST components (cached to prevent redundant imports)
      const components = await this.#getFASTComponents();

      const designSystem = components.provideFASTDesignSystem();

      // Register components with error boundaries
      const fastComponentList = [
        { name: 'card', fn: () => fastCard() },
        { name: 'button', fn: () => fastButton() },
        { name: 'text-field', fn: () => fastTextField() },
        { name: 'text-area', fn: () => fastTextArea() },
        { name: 'select', fn: () => fastSelect() },
        { name: 'checkbox', fn: () => fastCheckbox() },
        { name: 'radio', fn: () => fastRadio() },
        { name: 'switch', fn: () => fastSwitch() },
        { name: 'dialog', fn: () => fastDialog() },
        { name: 'tabs', fn: () => fastTabs() },
        { name: 'tab-panel', fn: () => fastTabPanel() },
        { name: 'anchor', fn: () => fastAnchor() },
        { name: 'progress', fn: () => fastProgress() },
        { name: 'data-grid', fn: () => fastDataGrid() },
        { name: 'menu-button', fn: () => fastMenuButton() }
      ];

      const results = {
        registered: [],
        failed: [],
        errors: []
      };

      for (const { name, fn } of fastComponentList) {
        const success = await FastBulmaErrorBoundary.safeRegister(name, fn);
        if (success) {
          designSystem.register(fn());
          results.registered.push(name);
        } else {
          results.failed.push(name);
        }
      }

      // Log registration summary
      console.log('FastBulma registration complete:', {
        success: results.registered.length,
        failed: results.failed.length,
        failed: results.failed
      });

      if (results.failed.length > 0) {
        console.warn(`Some components failed to load: ${results.failed.join(', ')}`);
      }
    } catch (error) {
      console.error('Error initializing FastBulma:', error);
      FastBulmaErrorBoundary.handleComponentError('core', error);
    }
  }

  /**
   * Get FAST components module with caching to prevent redundant imports.
   *
   * @private
   * @async
   * @returns {Promise<Object>} FAST components module with provideFASTDesignSystem
   */
  async #getFASTComponents() {
    if (this.#fastComponents) {
      console.debug('Using cached FAST components');
      return this.#fastComponents;
    }

    console.debug('Importing FAST components from CDN...');
    // Import FAST components from CDN
    this.#fastComponents = await import('https://cdn.skypack.dev/@microsoft/fast-components');
    return this.#fastComponents;
  }

  /**
   * Update a CSS variable dynamically on the document root.
   *
   * @param {string} name - CSS variable name (e.g., '--fast-primary')
   * @param {string} value - CSS value to set
   * @returns {void}
   */
  setCSSVariable(name, value) {
    document.documentElement.style.setProperty(name, value);
  }

  /**
   * Apply a theme by setting multiple CSS variables at once.
   *
   * @param {string} theme - Theme name ('light' or 'dark')
   * @returns {void}
   */
  setTheme(theme) {
    const themeVars = this.getThemeVariables(theme);
    Object.entries(themeVars).forEach(([name, value]) => {
      this.setCSSVariable(name, value);
    });
  }

  /**
   * Get CSS variables for a specific theme.
   *
   * @param {string} theme - Theme name ('light' or 'dark')
   * @returns {Object} Object mapping CSS variable names to values
   */
  getThemeVariables(theme) {
    switch(theme) {
      case 'dark':
        return {
           '--fast-primary': '#5e35b1',
           '--fast-primary-invert': '#fff',
           '--fast-background': '#121212',
           '--fast-text': '#e0e0e0',
           '--fast-grey-dark': '#dbdbdb',
           '--fast-grey-darker': '#ffffff'
        };
      case 'light':
      default:
        return {
           '--fast-primary': '#7957d5',
           '--fast-primary-invert': '#fff',
           '--fast-background': '#fff',
           '--fast-text': '#4a4a4a',
           '--fast-grey-dark': '#4a4a4a',
           '--fast-grey-darker': '#363636'
        };
    }
  }

  /**
   * Apply a Bulma CSS class to a FAST component element.
   *
   * @param {Element} element - DOM element to apply class to
   * @param {string} bulmaClass - Bulma class name to add
   * @returns {void}
   */
  applyBulmaClass(element, bulmaClass) {
    element.classList.add(bulmaClass);

    // Trigger re-evaluation of CSS variables
    const computedStyle = getComputedStyle(element);
    element.style.setProperty('--dummy', computedStyle.getPropertyValue('--dummy'));
  }

  /**
   * Register FAST components found in the DOM and watch for new elements.
   *
   * This method implements eager registration:
   * - Scans the DOM for unregistered FAST custom elements
   * - Registers components that are present
   * - Sets up MutationObserver to register dynamically added elements
   * - Returns a cleanup function to disconnect the observer
   *
   * @async
   * @param {Element|Document} root - Root element to scan (defaults to document)
   * @returns {Promise<Function>} Cleanup function to disconnect observer
   */
  async registerComponentsInDOM(root = document) {
    try {
      const { fastCard, fastButton, fastTextField, fastTextArea, fastSelect, fastCheckbox, fastRadio, fastSwitch, fastDialog, fastTabs, fastTabPanel, fastAnchor, fastProgress, fastDataGrid, fastMenuButton } = await import('https://cdn.skypack.dev/@microsoft/fast-components');

      const componentMap = {
        'fast-card': fastCard,
        'fast-button': fastButton,
        'fast-text-field': fastTextField,
        'fast-text-area': fastTextArea,
        'fast-select': fastSelect,
        'fast-checkbox': fastCheckbox,
        'fast-radio': fastRadio,
        'fast-switch': fastSwitch,
        'fast-dialog': fastDialog,
        'fast-tabs': fastTabs,
        'fast-tab-panel': fastTabPanel,
        'fast-anchor': fastAnchor,
        'fast-progress': fastProgress,
        'fast-data-grid': fastDataGrid,
        'fast-menu-button': fastMenuButton
      };

      // Find all FAST custom elements in the DOM
      const allElements = root.querySelectorAll('*');
      const fastElements = Array.from(allElements).filter(el =>
        el.tagName.startsWith('FAST-') && !customElements.get(el.tagName.toLowerCase())
      );

      // Register components that are present in the DOM
      for (const element of fastElements) {
        const tagName = element.tagName.toLowerCase();
        if (componentMap[tagName]) {
          const componentFn = componentMap[tagName];
          try {
            customElements.define(tagName, componentFn());
          } catch (error) {
            console.error(`Failed to define ${tagName}:`, error);
          }
        }
      }

      // Watch for dynamically added elements
      let debounceTimer;
      const observer = new MutationObserver((mutations) => {
        // Collect FAST elements to register (batch processing)
        const fastElements = [];

        mutations.forEach((mutation) => {
          mutation.addedNodes.forEach((node) => {
            // Filter early: only process FAST custom elements
            if (node.nodeType === 1 && node.tagName.startsWith('FAST-')) {
              const tagName = node.tagName.toLowerCase();
              if (componentMap[tagName] && !customElements.get(tagName)) {
                fastElements.push({ tagName, element: node });
              }
            }
          });
        });

        // Register all collected components in a single batch
        if (fastElements.length > 0) {
          // Clear existing timer
          clearTimeout(debounceTimer);

          // Debounce to batch rapid mutations (e.g., during page load)
          debounceTimer = setTimeout(() => {
            fastElements.forEach(({ tagName, element }) => {
              if (componentMap[tagName] && !customElements.get(tagName)) {
                try {
                  customElements.define(tagName, componentMap[tagName]());
                } catch (error) {
                  console.error(`Failed to define ${tagName}:`, error);
                }
              }
            });
          }, 16); // Wait one frame (~16ms at 60fps)
        }
      });

      // Observe with optimized configuration
      observer.observe(root, { childList: true, subtree: true });

      // Return disconnect function for cleanup
      return () => {
        clearTimeout(debounceTimer);
        observer.disconnect();
      };
    } catch (error) {
      console.error('Error registering components in DOM:', error);
      FastBulmaErrorBoundary.handleComponentError('dom-registration', error);
    }
  }
}

// Initialize FastBulma when the DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  window.fastBulma = new FastBulma();
});

// Catch unhandled errors in FAST components
window.addEventListener('error', (event) => {
  // Check if error is from a FAST component
  if (event.message && (event.message.includes('FAST') || event.filename.includes('fast'))) {
    event.preventDefault();
    FastBulmaErrorBoundary.handleComponentError(
      'unknown',
      event.error,
      null
    );
  }
});

// Catch unhandled promise rejections
window.addEventListener('unhandledrejection', (event) => {
  if (event.reason && event.reason.message?.includes('FAST')) {
    console.error('FastBulma promise rejection:', event.reason);
    // Prevent default browser error page
    event.preventDefault();
  }
});

// Export for module usage
export default FastBulma;