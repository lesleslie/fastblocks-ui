/* FastBulma JavaScript Initialization */
/* Sets up FAST components and provides utility functions */

class FastBulmaErrorBoundary {
  static errors = new Map(); // Track errors by component

  static handleComponentError(componentName, error, element) {
    console.error(`FastBulma component ${componentName} failed:`, error);

    // Log error for monitoring
    this.errors.set(componentName, {
      error,
      timestamp: new Date().toISOString(),
      element: element?.tagName || 'unknown'
    });

    // Show fallback UI
    const fallbackHTML = `
      <div class="fastbulma-fallback is-${componentName}">
        <span class="fastbulma-error-icon" aria-hidden="true">⚠️</span>
        <span class="fastbulma-error-message">
          Component temporarily unavailable
        </span>
        <button class="fastbulma-retry-button" onclick="window.location.reload()">
          Retry
        </button>
      </div>
    `;

    if (element) {
      element.insertAdjacentHTML('afterend', fallbackHTML);
      element.style.display = 'none'; // Hide failed component
    }

    return fallbackHTML;
  }

  static async safeRegister(componentName, componentFn) {
    try {
      await componentFn();
      return true;
    } catch (error) {
      this.handleComponentError(componentName, error);
      return false;
    }
  }

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

class FastBulma {
  constructor() {
    this.init();
  }

  async init() {
    // Import and register FAST components with error boundaries
    try {
      const { provideFASTDesignSystem, fastCard, fastButton, fastTextField, fastTextArea, fastSelect, fastCheckbox, fastRadio, fastSwitch, fastDialog, fastTabs, fastTabPanel, fastAnchor, fastProgress, fastDataGrid, fastMenuButton } = await import('https://cdn.skypack.dev/@microsoft/fast-components');

      const designSystem = provideFASTDesignSystem();

      // Register components with error boundaries
      const components = [
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

      for (const { name, fn } of components) {
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

  // Utility function to update CSS variables dynamically
  setCSSVariable(name, value) {
    document.documentElement.style.setProperty(name, value);
  }

  // Theme management utility
  setTheme(theme) {
    const themeVars = this.getThemeVariables(theme);
    Object.entries(themeVars).forEach(([name, value]) => {
      this.setCSSVariable(name, value);
    });
  }

  getThemeVariables(theme) {
    switch(theme) {
      case 'dark':
        return {
          '--bulma-primary': '#5e35b1',
          '--bulma-primary-invert': '#fff',
          '--bulma-background': '#121212',
          '--bulma-text': '#e0e0e0',
          '--bulma-grey-dark': '#dbdbdb',
          '--bulma-grey-darker': '#ffffff'
        };
      case 'light':
      default:
        return {
          '--bulma-primary': '#7957d5',
          '--bulma-primary-invert': '#fff',
          '--bulma-background': '#fff',
          '--bulma-text': '#4a4a4a',
          '--bulma-grey-dark': '#4a4a4a',
          '--bulma-grey-darker': '#363636'
        };
    }
  }

  // Utility to apply Bulma classes to FAST components dynamically
  applyBulmaClass(element, bulmaClass) {
    element.classList.add(bulmaClass);

    // Trigger re-evaluation of CSS variables
    const computedStyle = getComputedStyle(element);
    element.style.setProperty('--dummy', computedStyle.getPropertyValue('--dummy'));
  }

  // Utility to register components when they appear in the DOM (eager registration)
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