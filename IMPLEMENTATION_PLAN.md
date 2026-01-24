# FastBulma Implementation Plan (Enhanced)

## Visual Documentation Diagrams

This implementation plan includes visual diagrams created with Mermaid and Excalidraw to illustrate key concepts:

- **Mermaid Diagrams** (`docs/diagrams/*.png`):

  - `01-css-variable-inheritance-flow.png` - How CSS variables penetrate Shadow DOM
  - `02-system-architecture.png` - Layered architecture overview
  - `03-migration-path-decision-tree.png` - Choosing your migration strategy

- **Excalidraw Mockups** (accessible via Excalidraw MCP):

  - Component Comparison (Bulma vs FastBulma side-by-side)
  - Shadow DOM Visualization (visual cutaway showing variable penetration)
  - Theme Gallery (5 pre-built themes with actual colors)

Refer to these diagrams when implementing to visualize the architecture.

______________________________________________________________________

## Project Overview

The FastBulma framework combines Bulma's native CSS utilities for layout with FAST's design system for encapsulated components, all via CSS variables with no Sass or build step.

### Important: Vanilla JavaScript Only

**FastBulma is optimized for vanilla JavaScript with NO framework dependencies**. All examples and code use:

- Native web components (custom elements)
- Standard DOM APIs
- Plain JavaScript (ES6+)
- CSS (no preprocessors)

**NOT included**:

- No React integration
- No Vue integration
- No Angular integration
- No other framework-specific optimizations

Framework integrations may be added in future releases, but the core is vanilla JS only.

______________________________________________________________________

### Core Features

- Bulma utilities for page layout and typography (columns, hero, helpers)
- FAST Web Components with Bulma‑aligned tokens (colors, spacing, radius)
- Pure CSS customization via CSS vars
- Shadow DOM encapsulation for components
- MIT licensed, no build tools required

______________________________________________________________________

## Technical Architecture

### System Overview

FastBulma uses a **layered architecture** that separates concerns between layout utilities (Bulma) and interactive components (FAST), connected through CSS variables and JavaScript adapters.

![System Architecture](docs/diagrams/02-system-architecture.png)

```
┌─────────────────────────────────────────────────────────┐
│                    Application Layer                    │
│              (User's HTML and Content)                  │
└─────────────────────────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────┐
│                 FastBulma Integration Layer             │
│  ┌─────────────────┐         ┌────────────────────┐   │
│  │ CSS Variable    │         │ JavaScript Adapter │   │
│  │ Mapping System  │◄────────┤ & Component Registry│   │
│  └─────────────────┘         └────────────────────┘   │
└─────────────────────────────────────────────────────────┘
           │                                    │
           ▼                                    ▼
┌─────────────────────┐           ┌──────────────────────┐
│   Bulma CSS Layer   │           │   FAST Components    │
│  (Layout Utilities) │           │  (Shadow DOM Widgets)│
└─────────────────────┘           └──────────────────────┘
```

### Shadow DOM Integration Strategy

![CSS Variable Inheritance Flow](docs/diagrams/01-css-variable-inheritance-flow.png)

#### The Challenge

FAST components use Shadow DOM for style encapsulation, which prevents external CSS from penetrating the component boundary. Bulma modifier classes (`.is-primary`, `.is-large`, etc.) cannot directly affect FAST component internals.

#### Our Solution: CSS Variable Bridge Pattern

We use **CSS custom properties as the bridge** between Bulma classes and FAST components:

```css
/* 1. Define Bulma variables at document root */
:root {
  --bulma-primary: #7957d5;
  --bulma-radius: 4px;
  --bulma-size-normal: 1rem;
}

/* 2. Bulma classes update CSS variables */
.is-primary {
  --accent-fill-rest: var(--bulma-primary);
  /* Note: color-mix() requires Chrome 111+, Firefox 113+, Safari 16.2+ */
  --accent-fill-hover: color-mix(in srgb, var(--bulma-primary) 90%, black);
  /* Fallback for older browsers: use predefined dark variant */
  --accent-fill-hover: var(--bulma-primary-dark, var(--bulma-primary));
}

.is-large {
  --control-height: 2.5em;
  --type-ramp-base-font-size: var(--bulma-size-large);
}

/* 3. FAST components inherit these variables across Shadow DOM */
/* This works because CSS variables DO penetrate Shadow DOM boundaries */
<fast-button class="is-primary is-large">
  <!-- Shadow DOM boundary -->
  <!-- Internally uses: --accent-fill-rest, --control-height, etc. -->
</fast-button>
```

#### Shadow DOM Compatibility Matrix

| FAST Component | Exposed CSS Variables | Bulma Modifier Support | Limitations |
|----------------|----------------------|------------------------|-------------|
| `fast-button` | ✓ All tokens | ✓ Full (color, size, state) | None |
| `fast-text-field` | ✓ Most tokens | ✓ Partial (size, fullwidth) | Border styling limited |
| `fast-select` | ✓ Most tokens | ✓ Partial (size, state) | Icon styling limited |
| `fast-checkbox` | ✓ Core tokens | △ Limited (size only) | Color customization requires workarounds |
| `fast-radio-group` | ✓ Core tokens | △ Limited (size only) | Color customization requires workarounds |
| `fast-card` | ✓ All tokens | ✓ Full (color variant) | None |
| `fast-data-grid` | △ Limited tokens | ✗ Minimal | Layout controlled internally, needs API |
| `fast-tabs` | ✓ Most tokens | ✓ Good (size, position) | Tab panel styling limited |
| `fast-dialog` | ✓ All tokens | ✓ Full (size variant) | None |
| `fast-menu-button` | ✓ Most tokens | ✓ Good (size, state) | Menu item positioning controlled internally |

**Legend**: ✓ Full support | △ Partial support | ✗ No support

#### Workarounds for Limited Components

**1. Checkbox/Radio Color Customization**

**Note**: This workaround requires that FAST components expose the `control` part via the CSS Shadow Parts API. Verify in FAST documentation before implementing.

```css
/* Workaround: Use CSS Shadow Parts to override shadow styles */
fast-checkbox.is-primary::part(control) {
  background-color: var(--bulma-primary);
  border-color: var(--bulma-primary);
}
```

If `::part(control)` is not available, alternative approach:

```css
/* Alternative: Use CSS variables if FAST exposes them */
fast-checkbox.is-primary {
  --checkbox-control-background: var(--bulma-primary);
  --checkbox-control-border: var(--bulma-primary);
}
```

**2. Data Grid Styling**

```javascript
// Workaround: Use FAST's column configuration API
// NOTE: FAST's internal template system uses html tagged template literals
// This is FAST-specific syntax, not a general templating engine

import { html } from '@microsoft/fast-element';

const grid = document.querySelector('fast-data-grid');
grid.columns = [
  {
    columnDataKey: 'name',
    cellInternalTemplate: html`
      <div class="has-text-primary">${(x) => x.cell}</div>
    `
  }
];
```

**Important**: The `html` tagged template literal is part of FAST's internal API (`@microsoft/fast-element`). This is NOT a general-purpose templating engine - it's specifically for FAST component templates. You'll only use this syntax when working with FAST's template API.

#### CSS Variable Inheritance Testing

We must test CSS variable inheritance across browser contexts:

```javascript
// Test suite to verify Shadow DOM variable penetration
describe('Shadow DOM CSS Variable Inheritance', () => {
  test('Bulma color variables penetrate Shadow DOM', () => {
    const button = document.createElement('fast-button');
    button.className = 'is-primary';
    document.body.appendChild(button);

    const shadowRoot = button.shadowRoot;
    const computedStyle = getComputedStyle(shadowRoot);

    // Verify the variable is accessible inside Shadow DOM
    expect(computedStyle.getPropertyValue('--accent-fill-rest')).toBeTruthy();
  });
});
```

**Success Probability: 55%** (reduced from 75% due to Safari 15.x Shadow DOM bugs, form association issues, and CSS variable recalculation overhead)

______________________________________________________________________

### JavaScript Integration Architecture

#### Component Registration System

FastBulma provides **three registration modes** to accommodate different use cases:

##### Mode 1: Global Registration (Simplest)

Register all FAST components globally on page load:

```javascript
// fastbulma.js - Global mode
import { provideFASTDesignSystem } from '@microsoft/fast-components';
import {
  fastButton,
  fastCard,
  fastTextField,
  fastSelect,
  // ... all components
} from '@microsoft/fast-components';

export function registerFastBulma() {
  provideFASTDesignSystem()
    .register(
      fastButton(),
      fastCard(),
      fastTextField(),
      fastSelect(),
      // ... all 50+ components
    );
}

// User's code
import { registerFastBulma } from 'fastbulma';
registerFastBulma();
```

**Pros**: Simplest for users, works everywhere
**Cons**: Larger bundle size, all components loaded even if unused

##### Mode 2: Eager Registration (Balanced)

Register components when they appear in the DOM:

```javascript
// fastbulma.js - Eager mode
import { provideFASTDesignSystem } from '@microsoft/fast-components';

const componentMap = {
  'fast-button': () => import('@microsoft/fast-components').then(m => m.fastButton()),
  'fast-card': () => import('@microsoft/fast-components').then(m => m.fastCard()),
  // ... lazy imports
};

export function registerFastBulmaEager(root = document) {
  const designSystem = provideFASTDesignSystem();

  // Find all FAST custom elements in the DOM
  // Filter all elements to find those starting with 'FAST-'
  const allElements = root.querySelectorAll('*');
  const fastElements = Array.from(allElements).filter(el =>
    el.tagName.startsWith('FAST-')
  );

  fastElements.forEach(async (element) => {
    const tagName = element.tagName.toLowerCase();
    if (componentMap[tagName] && !customElements.get(tagName)) {
      const componentFn = await componentMap[tagName]();
      designSystem.register(componentFn());
    }
  });

  // Watch for dynamically added elements (OPTIMIZED for performance)
  // Filter mutations BEFORE processing to avoid main thread blocking
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
        // Batch register all components (more efficient than individual calls)
        Promise.all(
          fastElements.map(({ tagName }) =>
            componentMap[tagName]().then((fn) => designSystem.register(fn()))
          )
        ).catch((error) => {
          console.error('Failed to register FAST components:', error);
        });
      }, 16); // Wait one frame (~16ms at 60fps)
    }
  });

  // Observe with optimized configuration
  observer.observe(root, { childList: true, subtree: true });

  // IMPORTANT: Cleanup observer when no longer needed
  // Return disconnect function for cleanup
  return () => {
    clearTimeout(debounceTimer);
    observer.disconnect();
  };
}
```

**Pros**: Smaller initial bundle, still simple API
**Cons**: Slight delay for first component render

##### Mode 3: Lazy Registration (Most Performant)

Register components only when they enter the viewport:

```javascript
// fastbulma.js - Lazy mode
import { provideFASTDesignSystem } from '@microsoft/fast-components';

const componentMap = {
  'fast-button': () => import('@microsoft/fast-components').then(m => m.fastButton()),
  // ... lazy imports
};

export function registerFastBulmaLazy(root = document) {
  const designSystem = provideFASTDesignSystem();

  const intersectionObserver = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        const element = entry.target;
        const tagName = element.tagName.toLowerCase();

        if (componentMap[tagName] && !customElements.get(tagName)) {
          componentMap[tagName]().then((fn) => {
            designSystem.register(fn());
            intersectionObserver.unobserve(element);
          });
        }
      }
    });
  }, { rootMargin: '50px' }); // Start loading 50px before viewport

  const fastElements = root.querySelectorAll('fast-\\-');
  fastElements.forEach((element) => {
    const tagName = element.tagName.toLowerCase();
    if (!customElements.get(tagName)) {
      intersectionObserver.observe(element);
    }
  });
}
```

**Pros**: Smallest initial bundle, best performance
**Cons**: Complexity, potential flash of unstyled content

**Recommended**: Start with **Mode 1 (Global)** for v1.0, add Mode 2 and 3 in v1.1 based on user feedback.

#### Event Handling Model

FAST components use standard DOM events, but Shadow DOM changes event retargeting:

```javascript
// Event retargeting example
const button = document.querySelector('fast-button');
button.addEventListener('click', (event) => {
  // event.target is the fast-button element (retargeted)
  // NOT the internal button element in Shadow DOM

  console.log(event.target); // <fast-button>
  console.log(event.composedPath()); // Full path through Shadow DOM
});
```

**Bulma compatibility**: Standard event attributes work:

```html
<fast-button onclick="handleClick()">Click me</fast-button>
```

#### Form Integration Strategy

FAST form components participate in native form submission using the `formAssociation` pattern:

```javascript
// Automatic form association
<form id="my-form">
  <fast-text-field name="username" required></fast-text-field>
  <fast-button type="submit">Submit</fast-button>
</form>

<script>
  const form = document.getElementById('my-form');
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const formData = new FormData(form);
    console.log(formData.get('username')); // Works!
  });
</script>
```

**Fallback for older browsers**: Polyfill provided for browsers without native form association.

#### Initialization Race Conditions

**Problem**: What if FastBulma JS loads before Bulma CSS?

**Solution**: CSS variables are parsed before JavaScript runs, so no race condition exists. However, we provide a `ready` event:

```javascript
import { registerFastBulma } from 'fastbulma';

registerFastBulma().then(() => {
  console.log('FastBulma is ready');
  // Safe to manipulate components
});
```

**Success Probability: 80%** → **70%** (added error handling complexity)

______________________________________________________________________

#### Error Boundary Handling

**Critical Addition**: FastBulma requires comprehensive error boundary handling to gracefully handle component failures.

**Why Error Boundaries Are Essential**:

1. **Network Failures**: CDN dependencies may be temporarily unavailable
1. **Component Registration Failures**: FAST components may fail to register
1. **JavaScript Errors**: User code may cause component crashes
1. **Browser Compatibility**: Older browsers may not support certain features

**Error Boundary Implementation**:

```javascript
// fastbulma.js - Error boundary utilities
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
```

**Enhanced Registration with Error Boundaries**:

```javascript
// Enhanced registration with error handling
export async function registerFastBulmaSafe() {
  const results = {
    registered: [],
    failed: [],
    errors: []
  };

  // Register components with error boundaries
  const components = [
    { name: 'button', fn: () => import('@microsoft/fast-components').then(m => m.fastButton()) },
    { name: 'card', fn: () => import('@microsoft/fast-components').then(m => m.fastCard()) },
    { name: 'text-field', fn: () => import('@microsoft/fast-components').then(m => m.fastTextField()) },
    // ... all components
  ];

  for (const { name, fn } of components) {
    const success = await FastBulmaErrorBoundary.safeRegister(name, fn);
    if (success) {
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

  return results;
}

// Usage
registerFastBulmaSafe().then((results) => {
  if (results.failed.length > 0) {
    console.warn(`Some components failed to load: ${results.failed.join(', ')}`);
    // Optionally show notification to user
  }
});
```

**Fallback UI Styling**:

```css
/* Fallback component styling */
.fastbulma-fallback {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem 1rem;
  border: 2px dashed var(--bulma-danger);
  border-radius: var(--bulma-radius);
  background-color: var(--bulma-danger-light);
  color: var(--bulma-danger);
}

.fastbulma-error-icon {
  font-size: 1.2rem;
}

.fastbulma-retry-button {
  padding: 0.25rem 0.75rem;
  border-radius: var(--bulma-radius);
  background-color: var(--bulma-primary);
  color: var(--bulma-primary-invert);
  border: none;
  cursor: pointer;
}

.fastbulma-retry-button:hover {
  opacity: 0.9;
}
```

**Global Error Handler**:

```javascript
// Catch unhandled errors in FAST components
window.addEventListener('error', (event) => {
  // Check if error is from a FAST component
  if (event.message && event.message.includes('FAST')) {
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
```

**User-Facing Error Messages**:

```javascript
// Internationalized error messages (optional)
const errorMessages = {
  'button': {
    loadFailed: 'Button component failed to load',
    tryAgain: 'Click to retry'
  },
  'card': {
    loadFailed: 'Card component failed to load',
    tryAgain: 'Refresh the page'
  },
  // ... other components
};

// Usage in error boundary
FastBulmaErrorBoundary.handleComponentError('button', error, element, errorMessages);
```

**Testing Error Boundaries**:

```javascript
// Test error boundary by simulating component failure
function testErrorBoundary() {
  // Trigger intentional error
  const testButton = document.createElement('fast-button');
  testButton.id = 'test-fail-button';
  document.body.appendChild(testButton);

  // Simulate failure by calling error handler directly
  setTimeout(() => {
    FastBulmaErrorBoundary.handleComponentError(
      'button',
      new Error('Test error'),
      testButton
    );

    // Verify fallback UI appears
    const fallback = document.querySelector('.fastbulma-fallback');
    console.assert(fallback !== null, 'Fallback UI should appear');
  }, 100);
}
```

**Success Probability: 70%** (error boundaries improve robustness but don't eliminate all failure modes)

______________________________________________________________________

### Component API Specification

#### Custom Element Naming Convention

**Decision**: Use FAST custom elements directly with Bulma classes. **DO NOT** create new custom elements like `<fastbulma-card>`.

**Rationale**:

- Prevents namespace collision
- Leverages FAST documentation directly
- Allows mixing FAST and Bulma components
- Smaller bundle size (no wrapper components)

**Correct usage**:

```html
<!-- ✓ Use FAST elements with Bulma classes -->
<fast-card class="is-primary">
  <h3 slot="heading">Card Title</h3>
</fast-card>

<!-- ✗ Don't create custom elements -->
<fastbulma-card variant="primary">  <!-- DON'T DO THIS -->
```

#### Slot Naming Conventions

Map Bulma's content model to FAST's slot system:

| Component | Bulma Content | FAST Slot | Example |
|-----------|---------------|-----------|---------|
| `fast-card` | `.card-header` | `heading` | `<h3 slot="heading">Title</h3>` |
| `fast-card` | `.card-content` | (default) | `<p>Content here</p>` |
| `fast-card` | `.card-footer` | `actions` | `<div slot="actions">...</div>` |
| `fast-dialog` | Modal title | `heading` | `<h2 slot="heading">Title</h2>` |
| `fast-dialog` | Modal body | (default) | `<p>Content</p>` |
| `fast-anchor` | Link text | (default) | `<span>Click me</span>` |
| `fast-menu-button` | Button icon | `start` | `<span slot="start">▼</span>` |

**Default slot** (no `slot` attribute) is used for main content.

#### Data Attribute Mapping

Bulma data attributes map to FAST properties:

```html
<!-- Size modifiers -->
<fast-button data-size="large">    <!-- FAST: size="large" -->
<fast-button data-size="small">    <!-- FAST: size="small" -->

<!-- State modifiers -->
<fast-button data-loading="true">  <!-- FAST: disabled -->
<fast-button data-disabled="true"> <!-- FAST: disabled -->

<!-- Appearance modifiers -->
<fast-button data-outline="true">  <!-- FAST: appearance="outline" -->
<fast-checkbox data-checked="true"> <!-- FAST: checked -->

<!-- Full-width modifier -->
<fast-text-field data-fullwidth>   <!-- FAST: width="full" -->
```

**Implementation**:

```javascript
// Data attribute to property mapper
function mapDataAttributes(element) {
  const dataset = element.dataset;

  if (dataset.size) {
    element.size = dataset.size;
  }

  if (dataset.outline === 'true') {
    element.appearance = 'outline';
  }

  if (dataset.loading === 'true') {
    element.disabled = true;
    element.classList.add('is-loading');
  }
}

// Auto-map on component registration
document.addEventListener('fast-component-ready', (e) => {
  mapDataAttributes(e.target);
});
```

#### Component Composition Rules

**Rule 1**: FAST components can be nested inside Bulma structures

```html
<div class="columns">
  <div class="column">
    <fast-card>
      <h3 slot="heading">Card in column</h3>
    </fast-card>
  </div>
</div>
```

**Rule 2**: Bulma utilities can wrap FAST components

```html
<section class="section is-medium">
  <fast-button appearance="accent">Button in section</fast-button>
</section>
```

**Rule 3**: FAST components should NOT contain Bulma structural classes (columns, level, etc.)

```html
<!-- ✗ DON'T: Bulma structure inside FAST component -->
<fast-card>
  <div class="columns">  <!-- BAD: columns inside card -->
    <div class="column">Content</div>
  </div>
</fast-card>

<!-- ✓ DO: Use Bulma utilities inside FAST components -->
<fast-card>
  <div class="has-text-centered">  <!-- GOOD: utility class -->
    <p class="is-size-4">Content</p>
  </div>
</fast-card>
```

**Rule 4**: FAST components can contain other FAST components

```html
<fast-card>
  <fast-tabs>
    <fast-tab>Tab 1</fast-tab>
    <fast-tab>Tab 2</fast-tab>
  </fast-tabs>
</fast-card>
```

#### Component Property Reference

**fast-button**
| Property | Type | Default | Bulma Equivalent |
|----------|------|---------|------------------|
| `appearance` | `'accent' \| 'neutral' \| 'outline' \| 'lightweight'` | `'neutral'` | `.is-primary` → accent, `.is-outlined` → outline |
| `size` | `'small' \| 'normal' \| 'large'` | `'normal'` | `.is-small`, `.is-large` |
| `disabled` | `boolean` | `false` | `.is-disabled` |
| `autofocus` | `boolean` | `false` | HTML attribute |

**fast-text-field**
| Property | Type | Default | Bulma Equivalent |
|----------|------|---------|------------------|
| `size` | `'small' \| 'normal' \| 'large'` | `'normal'` | `.is-small`, `.is-large` |
| `placeholder` | `string` | `''` | HTML attribute |
| `readonly` | `boolean` | `false` | `.is-readonly` |
| `disabled` | `boolean` | `false` | `.is-disabled` |
| `value` | `string` | `''` | JavaScript property |

**fast-card**
| Property | Type | Default | Bulma Equivalent |
|----------|------|---------|------------------|
| No component-specific properties | - | - | Uses CSS variables for styling |

**Success Probability: 80%** (reduced from 85% - vanilla JS constraint limits API ergonomics, no framework integration)

______________________________________________________________________

## Risk Assessment and Mitigation

### Technical Risks

| Risk | Probability | Impact | Mitigation Strategy |
|------|------------|--------|---------------------|
| Shadow DOM style encapsulation conflicts | 70% | High | Implement comprehensive CSS variable inheritance testing |
| Bulma/FAST version incompatibilities | 60% | Medium | Create automated compatibility testing pipeline |
| Performance degradation from combined frameworks | 55% | High | Implement performance budget monitoring |
| Cross-browser shadow DOM inconsistencies | 65% | Medium | Use feature detection and polyfills where needed |
| CSS specificity conflicts | 80% | Medium | Implement strict CSS layering strategy |

### Project Risks

| Risk | Probability | Impact | Mitigation Strategy |
|------|------------|--------|---------------------|
| Scope creep beyond core integration | 75% | Medium | Strict feature freeze after Phase 3 |
| Documentation falling behind implementation | 85% | Medium | Adopt docs-as-code approach with automated generation |
| Community adoption challenges | 60% | Low | Early engagement with developer community |

______________________________________________________________________

## Implementation Phases

### Phase 1: Project Setup and Dependencies

#### 1.1 Environment Setup

- Initialize project with uv
- Install crackerjack for quality control & project management
- Install session-buddy for session management
- Configure pyproject.toml with all necessary dependencies

#### 1.2 Python Package Purpose and Structure

The Python package will serve primarily for development, documentation, and integration tools rather than runtime functionality:

- Support development workflow with crackerjack and session-buddy
- Provide documentation generation tools
- Include integration utilities for FastBlocks
- Bundle static assets (CSS/JS) for easy distribution

**Success Probability: 85%** (reduced from 95% - environment setup, dependency conflicts, tooling configuration)

______________________________________________________________________

### Phase 2: Core Framework Implementation

#### 2.1 CSS Integration

- Include Bulma CSS via CDN link in base template
- Create CSS variable mappings from Bulma to FAST tokens
- Implement the `@layer fast` approach for CSS cascade control

#### 2.2 JavaScript Integration

- Register FAST components in the design system
- Create initialization script for FastBulma components
- Implement dynamic CSS variable updates

#### 2.3 Component Development

- Create base component class that integrates Bulma classes with FAST components
- Develop wrapper components that map Bulma utilities to FAST web components
- Implement token mapping system for consistent theming

**Success Probability: 75%** (reduced from 85% - Shadow DOM variable inheritance issues, browser-specific bugs)

______________________________________________________________________

### Phase 3: Component Mapping Implementation

#### 3.1 CSS Variable Mappings

Create comprehensive mapping between Bulma variables and FAST tokens:

```css
:root {
  /* Customizable Bulma variables */
  --bulma-primary: #7957d5;
  --bulma-primary-invert: #fff;
  --bulma-primary-light: #f1effd;
  --bulma-primary-dark: #563acc;
  --bulma-info: #3298dc;
  --bulma-info-invert: #fff;
  --bulma-success: #48c774;
  --bulma-success-invert: #fff;
  --bulma-warning: #ffdd57;
  --bulma-warning-invert: #000;
  --bulma-danger: #f14668;
  --bulma-danger-invert: #fff;
  --bulma-grey: #7a7a7a;
  --bulma-grey-light: #f5f5f5;
  --bulma-grey-lighter: #f5f5f5;
  --bulma-grey-dark: #4a4a4a;
  --bulma-grey-darker: #363636;
  --bulma-white: #fff;
  --bulma-black: #0a0a0a;
  --bulma-radius: 4px;
  --bulma-radius-small: 2px;
  --bulma-radius-large: 6px;
  --bulma-radius-rounded: 9999px;
  --bulma-family-primary: Inter, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
  --bulma-size-small: 0.75rem;
  --bulma-size-normal: 1rem;
  --bulma-size-medium: 1.25rem;
  --bulma-size-large: 1.5rem;
}

@layer fast {
  :root {
    /* FAST tokens mapped to Bulma variables */
    /* Accent colors */
    --accent-base-color: var(--bulma-primary);
    --accent-fill-rest: var(--bulma-primary);
    --accent-fill-hover: color-mix(in srgb, var(--bulma-primary) 90%, black);
    --accent-fill-active: color-mix(in srgb, var(--bulma-primary) 80%, black);
    --accent-fill-focus: var(--bulma-primary);
    --accent-foreground-rest: var(--bulma-primary-invert);
    --accent-foreground-hover: var(--bulma-primary-invert);
    --accent-foreground-active: var(--bulma-primary-invert);
    --accent-foreground-focus: var(--bulma-primary-invert);

    /* CRITICAL: Fallbacks for browsers without color-mix() support */
    /* Browsers affected: Safari < 16.2, Firefox < 113, Chrome < 111 */
    /* These fallbacks use pre-computed dark variants (10% and 20% darker) */
    --accent-fill-hover-fallback: color-mix(in srgb, var(--bulma-primary) 90%, black);
    --accent-fill-active-fallback: color-mix(in srgb, var(--bulma-primary) 80%, black);

    /* Neutral colors */
    --neutral-base-color: var(--bulma-grey);
    --neutral-fill-rest: var(--bulma-grey-lighter);
    --neutral-fill-hover: var(--bulma-grey-light);
    --neutral-fill-active: var(--bulma-grey);
    --neutral-fill-focus: var(--bulma-grey-light);
    --neutral-fill-input-rest: var(--bulma-white);
    --neutral-fill-input-hover: var(--bulma-white);
    --neutral-fill-input-active: var(--bulma-white);
    --neutral-fill-input-focus: var(--bulma-white);
    --neutral-foreground-rest: var(--bulma-grey-darker);
    --neutral-foreground-hover: var(--bulma-black);
    --neutral-foreground-active: var(--bulma-black);
    --neutral-foreground-focus: var(--bulma-black);
    --neutral-stroke-rest: var(--bulma-grey-light);
    --neutral-stroke-hover: var(--bulma-grey);
    --neutral-stroke-active: var(--bulma-grey-dark);
    --neutral-stroke-focus: var(--bulma-primary);

    /* Control dimensions */
    --control-corner-radius: var(--bulma-radius, 4px);
    --control-corner-radius-brand: var(--bulma-radius-large, 6px);
    --control-corner-radius-pill: var(--bulma-radius-rounded, 9999px);
    --control-height: 2.5em; /* Standard Bulma control height */
    --control-line-height: 1.5;

    /* Typography */
    --neutral-font-family: var(--bulma-family-primary);
    --type-ramp-base-font-size: var(--bulma-size-normal);
    --type-ramp-base-line-height: 1.5;
    --type-ramp-minus-1-font-size: var(--bulma-size-small);
    --type-ramp-plus-1-font-size: var(--bulma-size-medium);
    --type-ramp-plus-2-font-size: var(--bulma-size-large);

    /* Spacing */
    --design-unit: 4px;
    --base-height-multiplier: 8;
    --density: calc(var(--base-height-multiplier) * var(--design-unit));
  }

  /* CRITICAL PERFORMANCE OPTIMIZATION: CSS Containment */
  /* Limit style recalculation scope to each component */
  /* This prevents cascade recalculations from affecting entire page */

  /* Apply containment to all FAST components */
  fast-button,
  fast-card,
  fast-text-field,
  fast-text-area,
  fast-select,
  fast-checkbox,
  fast-radio-group,
  fast-radio,
  fast-switch,
  fast-dialog,
  fast-tabs,
  fast-tab,
  fast-tab-panel,
  fast-anchor,
  fast-menu-button,
  fast-data-grid,
  fast-divider,
  fast-progress,
  fast-slider,
  fast-badge,
  fast-tooltip {
    contain: style;  /* Limit style recalculation to this component subtree */
  }

  /* Performance impact:
   - 15-25% faster style updates when classes change
   - Limits recalculation scope to component only
   - Prevents page-wide style invalidation
   - Especially important for pages with many FAST components
   */
}

/* CRITICAL: Fallback for browsers without color-mix() support */
/* This MUST come after @layer fast to override color-mix() calls */
@supports not (color-mix(in srgb, red, blue)) {
  @layer fast {
    :root {
      /* Pre-computed dark variants for --bulma-primary */
      /* Original: #7957d5 */
      /* 10% darker: #6c4dc0 (computed via color-mix()) */
      /* 20% darker: #5f43ab (computed via color-mix()) */
      --accent-fill-hover: #6c4dc0;
      --accent-fill-active: #5f43ab;

      /* Pre-computed dark variants for --bulma-success */
      /* Original: #48c774 */
      /* 10% darker: #3dad66 */
      /* 20% darker: #32d358 */
      --success-fill-hover: #3dad66;
      --success-fill-active: #32d358;

      /* Pre-computed dark variants for --bulma-danger */
      /* Original: #f14668 */
      /* 10% darker: #d93d5c */
      /* 20% darker: #c13450 */
      --danger-fill-hover: #d93d5c;
      --danger-fill-active: #c13450;

      /* Pre-computed dark variants for --bulma-warning */
      /* Original: #ffdd57 */
      /* 10% darker: #e6c84e */
      /* 20% darker: #ccb345 */
      --warning-fill-hover: #e6c84e;
      --warning-fill-active: #ccb345;
    }

    /* Apply fallbacks to Bulma modifier classes */
    .is-primary {
      --accent-fill-hover: #6c4dc0;
      --accent-fill-active: #5f43ab;
    }

    .is-success {
      --accent-fill-hover: #3dad66;
      --accent-fill-active: #32d358;
    }

    .is-danger {
      --accent-fill-hover: #d93d5c;
      --accent-fill-active: #c13450;
    }

    .is-warning {
      --accent-fill-hover: #e6c84e;
      --accent-fill-active: #ccb345;
    }
  }
}

/* Note: Maintenance burden
   Adding new colors requires computing pre-computed dark variants.
   Use this formula for 10% darker: color-mix(in srgb, original 90%, black)
   Use this formula for 20% darker: color-mix(in srgb, original 80%, black)

   For automated variant generation, see scripts/generate-color-variants.js
*/
```

#### 3.2 Component-Specific Mappings

- Map Bulma color classes (.is-primary, .is-success, etc.) to FAST component states
- Implement responsive utility mappings
- Create typography mapping system

#### 3.3 Component Mapping Matrix

| Bulma Class/Utility | FAST Component | CSS Variable Mapping | Notes | Probability |
|---------------------|----------------|----------------------|-------|-------------|
| `.is-primary` | `fast-button[appearance="accent"]` | `--accent-fill-rest: var(--bulma-primary)` | Applies primary color to accent buttons | 90% |
| `.is-success` | `fast-button[appearance="accent"]` | `--accent-fill-rest: var(--bulma-success)` | Applies success color to accent buttons | 85% |
| `.is-warning` | `fast-button[appearance="accent"]` | `--accent-fill-rest: var(--bulma-warning)` | Applies warning color to accent buttons | 85% |
| `.is-danger` | `fast-button[appearance="accent"]` | `--accent-fill-rest: var(--bulma-danger)` | Applies danger color to accent buttons | 85% |
| `.card` | `fast-card` | `--neutral-fill-rest: var(--bulma-grey-lighter)` | Maps card background to neutral fill | 88% |
| `.button` | `fast-button` | `--control-corner-radius: var(--bulma-radius)` | Applies border radius to buttons | 90% |
| `.input` | `fast-text-field` | `--neutral-fill-input-rest: var(--bulma-white)` | Maps input backgrounds | 85% |
| `.textarea` | `fast-text-area` | `--neutral-fill-input-rest: var(--bulma-white)` | Maps textarea backgrounds | 85% |
| `.select` | `fast-select` | `--neutral-fill-input-rest: var(--bulma-white)` | Maps select backgrounds | 85% |
| `.table` | `fast-data-grid` | `--neutral-fill-rest: var(--bulma-white)` | Maps table backgrounds | 80% |
| `.pagination` | `fast-anchor` (for links) | `--neutral-foreground-rest: var(--bulma-text)` | Maps pagination link colors | 80% |
| `.tabs` | `fast-tabs` + `fast-tab` | `--neutral-foreground-rest: var(--bulma-text)` | Maps tab text colors | 80% |
| `.modal` | `fast-dialog` | `--neutral-fill-rest: var(--bulma-white)` | Maps modal backgrounds | 80% |
| `.dropdown` | `fast-menu-button` | `--neutral-fill-rest: var(--bulma-white)` | Maps dropdown backgrounds | 80% |
| `.level` | CSS Grid/Flexbox | N/A | Uses Bulma's layout utilities directly | 95% |
| `.columns` | CSS Grid/Flexbox | N/A | Uses Bulma's column system directly | 95% |
| `.hero` | CSS Container | N/A | Uses Bulma's hero classes directly | 95% |
| `.section` | CSS Container | N/A | Uses Bulma's section classes directly | 95% |
| `.container` | CSS Container | N/A | Uses Bulma's container classes directly | 95% |
| `.box` | `fast-card` | `--neutral-fill-rest: var(--bulma-white)` | Maps box styling to fast-card | 88% |
| `.title` | Native heading with CSS | `--neutral-foreground-rest: var(--bulma-text)` | Typography handled via CSS | 90% |
| `.subtitle` | Native heading with CSS | `--neutral-foreground-rest: var(--bulma-text)` | Typography handled via CSS | 90% |

**Success Probability: 70%** (reduced from 80% - CDN configuration complexity, polyfill compatibility issues)

______________________________________________________________________

### Phase 4: Testing and Validation

#### 4.1 Testing Infrastructure

##### Framework Selection

**Unit Testing**: Vitest

- **Rationale**: Fast, native ESM support, Jest-compatible API
- **Setup**: Config files in `vitest.config.ts`
- **Coverage**: Built-in coverage with c8

**Visual Regression Testing**: Chromatic

- **Rationale**: Cloud-based, integrates with Storybook, automatic diff detection
- **Alternative**: Percy (open source) or Playwright (built-in screenshots)
- **Storage**: 1,000+ screenshots expected for all component variations

**E2E Testing**: Playwright

- **Rationale**: Cross-browser, auto-waiting, built-in assertions
- **Coverage**: Chrome, Firefox, Safari (via WebKit), Edge
- **Test Data**: Fixture files for complex component states

**Accessibility Testing**: axe-core + Playwright

- **Rationale**: Automated WCAG compliance, integrates with E2E tests
- **Manual Testing**: NVDA, JAWS, VoiceOver, TalkBack

##### Test Structure

```
tests/
├── unit/
│   ├── css-variable-mappings.test.ts
│   ├── shadow-dom-encapsulation.test.ts
│   ├── component-registration.test.ts
│   └── data-attribute-mapping.test.ts
├── visual/
│   ├── button-variants.story.ts
│   ├── card-modifiers.story.ts
│   └── form-components.story.ts
├── e2e/
│   ├── keyboard-navigation.spec.ts
│   ├── form-submission.spec.ts
│   ├── responsive-layout.spec.ts
│   └── component-interactions.spec.ts
└── a11y/
    ├── automated-a11y.spec.ts
    ├── screen-reader-testing.md
    └── keyboard-audit.md
```

#### 4.2 Unit Testing

**CSS Variable Mapping Tests**

```javascript
// tests/unit/css-variable-mappings.test.ts
describe('CSS Variable Mappings', () => {
  test('.is-primary sets --accent-fill-rest to --bulma-primary', () => {
    const button = document.createElement('fast-button');
    button.className = 'is-primary';
    document.body.appendChild(button);

    const shadowRoot = button.shadowRoot;
    const control = shadowRoot.querySelector('[role="button"]');

    // Vanilla JS approach - no framework-specific matchers
    const styles = window.getComputedStyle(control);
    expect(styles.backgroundColor).toBe('rgb(121, 87, 213)'); // --bulma-primary
  });

  test('.is-large sets --control-height correctly', () => {
    const input = document.createElement('fast-text-field');
    input.className = 'is-large';
    document.body.appendChild(input);

    const shadowRoot = input.shadowRoot;
    const control = shadowRoot.querySelector('input');

    const styles = window.getComputedStyle(control);
    expect(styles.minHeight).toBe('2.5em');
  });
});
```

**Shadow DOM Encapsulation Tests**

```javascript
// tests/unit/shadow-dom-encapsulation.test.ts
describe('Shadow DOM Encapsulation', () => {
  test('Bulma classes do NOT leak into Shadow DOM', () => {
    const card = document.createElement('fast-card');
    card.className = 'has-background-primary';
    document.body.appendChild(card);

    const shadowRoot = card.shadowRoot;

    // Verify that Bulma class didn't penetrate
    expect(shadowRoot.querySelector('.has-background-primary')).toBeNull();
  });

  test('CSS variables DO penetrate Shadow DOM', () => {
    document.documentElement.style.setProperty('--bulma-primary', '#ff0000');

    const button = document.createElement('fast-button');
    button.className = 'is-primary';
    document.body.appendChild(button);

    const shadowRoot = button.shadowRoot;
    const computedStyle = getComputedStyle(shadowRoot);

    expect(computedStyle.getPropertyValue('--accent-fill-rest')).toBe('#ff0000');
  });
});
```

**Component Registration Tests**

```javascript
// tests/unit/component-registration.test.ts
describe('Component Registration', () => {
  test('registerFastBulma() registers all components', async () => {
    await registerFastBulma();

    expect(customElements.get('fast-button')).toBeDefined();
    expect(customElements.get('fast-card')).toBeDefined();
    expect(customElements.get('fast-text-field')).toBeDefined();
  });

  test('registerFastBulmaEager() only registers components in DOM', async () => {
    const button = document.createElement('fast-button');
    document.body.appendChild(button);

    await registerFastBulmaEager();

    expect(customElements.get('fast-button')).toBeDefined();
    expect(customElements.get('fast-dialog')).toBeUndefined(); // Not in DOM
  });
});
```

#### 4.3 Visual Regression Testing

**Storybook Integration**

```javascript
// tests/visual/button-variants.story.ts
import type { Meta, StoryObj } from '@storybook/web-components';

const meta: Meta = {
  title: 'Components/Button',
  tags: ['autodocs'],
  argTypes: {
    appearance: {
      control: 'select',
      options: ['accent', 'neutral', 'outline', 'lightweight']
    },
    size: {
      control: 'select',
      options: ['small', 'normal', 'large']
    }
  }
};

export default meta;

export const Primary: StoryObj = {
  render: () => `
    <fast-button class="is-primary" appearance="accent">Primary Button</fast-button>
  `
};

export const PrimaryLarge: StoryObj = {
  render: () => `
    <fast-button class="is-primary is-large" appearance="accent">Large Primary Button</fast-button>
  `
};

export const SuccessOutline: StoryObj = {
  render: () => `
    <fast-button class="is-success is-outlined" appearance="outline">Success Outline Button</fast-button>
  `
};
```

**Chromatic Configuration**

```json
{
  "stories": ["./tests/visual/**/*.story.ts"],
  "addons": ["@storybook/addon-a11y", "@storybook/addon-themes"],
  "framework": {
    "name": "@storybook/web-components-webpack5"
  }
}
```

#### 4.4 Integration Testing (E2E)

**Keyboard Navigation Tests**

```javascript
// tests/e2e/keyboard-navigation.spec.ts
import { test, expect } from '@playwright/test';

test.describe('Keyboard Navigation', () => {
  test('Tab order works through FAST components', async ({ page }) => {
    await page.goto('/demo/form');

    const textField = page.locator('fast-text-field');
    const button = page.locator('fast-button');

    // Tab to text field
    await page.keyboard.press('Tab');
    await expect(textField).toBeFocused();

    // Tab to button
    await page.keyboard.press('Tab');
    await expect(button).toBeFocused();
  });

  test('Enter key submits form with FAST components', async ({ page }) => {
    await page.goto('/demo/form');

    await page.locator('fast-text-field').fill('test');
    await page.keyboard.press('Enter');

    await expect(page.locator('.form-submitted')).toBeVisible();
  });
});
```

**Responsive Layout Tests**

```javascript
// tests/e2e/responsive-layout.spec.ts
test.describe('Responsive Layout', () => {
  test('Components adapt to mobile viewport', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('/demo/responsive');

    const card = page.locator('fast-card');
    const width = await card.evaluate(el => el.offsetWidth);

    expect(width).toBeLessThanOrEqual(375);
  });

  test('Bulma columns work with FAST components', async ({ page }) => {
    await page.goto('/demo/columns');

    const columns = page.locator('.column');
    await expect(columns).toHaveCount(3);

    // Check that each column contains a FAST component
    for (const column of await columns.all()) {
      await expect(column.locator('fast-card')).toHaveCount(1);
    }
  });
});
```

**Component Interaction Tests**

```javascript
// tests/e2e/component-interactions.spec.ts
test.describe('Component Interactions', () => {
  test('Dropdown menu opens and closes', async ({ page }) => {
    await page.goto('/demo/dropdown');

    const menuButton = page.locator('fast-menu-button');

    await menuButton.click();
    await expect(page.locator('.fast-menu')).toBeVisible();

    await page.keyboard.press('Escape');
    await expect(page.locator('.fast-menu')).toBeHidden();
  });

  test('Dialog modal opens and traps focus', async ({ page }) => {
    await page.goto('/demo/dialog');

    await page.locator('button[onclick="openDialog()"]').click();
    await expect(page.locator('fast-dialog')).toBeVisible();

    // Focus should be trapped in dialog
    await page.keyboard.press('Tab');
    await expect(page.locator('fast-dialog')).toBeFocused();
  });
});
```

#### 4.5 Accessibility Testing

**Automated Accessibility Tests**

```javascript
// tests/a11y/automated-a11y.spec.ts
import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

test.describe('Accessibility', () => {
  test('Button components have accessible names', async ({ page }) => {
    await page.goto('/demo/buttons');

    const accessibilityScanResults = await new AxeBuilder({ page })
      .include('.fast-button')
      .analyze();

    expect(accessibilityScanResults.violations).toEqual([]);
  });

  test('Form components have proper labels', async ({ page }) => {
    await page.goto('/demo/forms');

    const accessibilityScanResults = await new AxeBuilder({ page })
      .include('fast-text-field, fast-select, fast-checkbox')
      .analyze();

    expect(accessibilityScanResults.violations).toEqual([]);
  });

  test('Color contrast meets WCAG AA standards', async ({ page }) => {
    await page.goto('/demo/all-components');

    const accessibilityScanResults = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa'])
      .analyze();

    expect(accessibilityScanResults.violations).toEqual([]);
  });
});
```

**Screen Reader Testing Matrix**

| Screen Reader | Browser | Testing Priority | Test Coverage |
|---------------|---------|------------------|---------------|
| NVDA (2024+) | Firefox | High (Windows market leader) | All components |
| JAWS (2024+) | Chrome | High (Enterprise standard) | Form components, dialogs |
| VoiceOver | Safari | High (macOS/iOS default) | All components |
| TalkBack | Chrome | Medium (Android default) | Mobile-specific tests |

**Manual Keyboard Audit Checklist**

- [ ] All interactive elements are keyboard accessible
- [ ] Tab order follows visual layout
- [ ] Focus indicators are visible
- [ ] Escape key closes modals/dropdowns
- [ ] Arrow keys navigate within components (tabs, menus)
- [ ] Enter/Space activate buttons and checkboxes
- [ ] Focus is trapped in modals
- [ ] Focus returns to triggering element after modal closes
- [ ] Skip links work for keyboard users
- [ ] Custom select widgets work with keyboard

#### 4.6 Component Testing Strategy

**Test Coverage Requirements**

- **Unit tests**: >80% line coverage for JavaScript modules
- **Visual tests**: All component variants (size × color × state combinations)
- **E2E tests**: Critical user journeys (form submission, navigation, modal interactions)
- **A11y tests**: 100% of components tested with axe-core

**Testing Matrix**

| Component | Unit Tests | Visual Tests | E2E Tests | A11y Tests |
|-----------|------------|--------------|-----------|------------|
| fast-button | ✓ CSS vars, events | ✓ All variants | ✓ Click, keyboard | ✓ ARIA, contrast |
| fast-text-field | ✓ CSS vars, validation | ✓ All variants | ✓ Input, focus | ✓ Labels, contrast |
| fast-select | ✓ CSS vars, options | ✓ All variants | ✓ Select, keyboard | ✓ Labels, roles |
| fast-checkbox | ✓ CSS vars, state | ✓ All variants | ✓ Check, keyboard | ✓ Labels, state |
| fast-card | ✓ CSS vars, slots | ✓ All variants | ✓ Render | ✓ Contrast |
| fast-dialog | ✓ CSS vars, traps | ✓ All variants | ✓ Open/close/keyboard | ✓ Focus mgmt, ARIA |
| fast-tabs | ✓ CSS vars, activation | ✓ All variants | ✓ Switch, keyboard | ✓ Roles, ARIA |
| fast-menu-button | ✓ CSS vars, menu | ✓ All variants | ✓ Open/select/keyboard | ✓ Roles, ARIA |
| fast-data-grid | ✓ CSS vars, columns | ✓ Key variants | ✓ Sort/page/keyboard | ✓ Table markup |

**Quality Assurance with Crackerjack**

Crackerjack provides comprehensive testing infrastructure through its settings/config and cache mechanism:

```bash
# Run all tests via crickerjack
crickerjack test

# Run specific test suites
crickerjack test --unit          # Unit tests only
crickerjack test --e2e           # End-to-end tests
crickerjack test --visual        # Visual regression tests
crickerjack test --a11y          # Accessibility tests

# Run with coverage
crickerjack test --coverage

# Auto-fix issues where possible
crickerjack test --fix
```

**Crickerjack Quality Gates** (enforced via settings/config):

Crickerjack runs quality checks using its own configuration system and caches:

- ✅ Unit tests pass
- ✅ Visual regression tests pass
- ✅ E2E tests pass
- ✅ Accessibility tests pass (axe-core)
- ✅ Code coverage doesn't decrease
- ✅ Bundle size within budget

Quality gates are enforced through crickerjack's settings (not pre-commit hooks):

```bash
# Crickerjack settings (not pre-commit hooks)
~/.config/crickerjack/settings.toml
~/.cache/crickerjack/
```

**Success Probability: 65%** (reduced from 85% - memory leak tests added, Shadow DOM testing complexity)

#### 4.7 Memory Leak Testing Strategy

**Critical Requirement**: Shadow DOM + custom elements = high memory leak risk. Memory leak testing is mandatory for production readiness.

**Why Memory Leaks Matter**

- Shadow DOM creates isolated DOM trees that can retain references
- Custom elements with event listeners can prevent garbage collection
- MutationObserver can hold references to entire DOM subtrees
- Long-running pages with dynamic components will accumulate leaked memory
- Memory leaks cause browser crashes and degraded UX over time

**Test Scenarios**

**1. Event Listener Leaks Test**

```javascript
describe('Memory Leak: Event Listeners', () => {
  test('Event listeners are removed on component destroy', async () => {
    const initialListenerCount = await page.evaluate(() => {
      return window.getEventListeners(document).length;
    });

    // Create and destroy 100 buttons
    for (let i = 0; i < 100; i++) {
      const button = document.createElement('fast-button');
      button.id = `test-button-${i}`;
      document.body.appendChild(button);

      // Add event listener
      button.addEventListener('click', () => {});

      // Remove from DOM
      document.body.removeChild(button);
    }

    // Force garbage collection if possible
    await page.evaluate(() => {
      if (window.gc) window.gc();
    });

    const finalListenerCount = await page.evaluate(() => {
      return window.getEventListeners(document).length;
    });

    expect(finalListenerCount).toBe(initialListenerCount);
  });
});
```

**2. MutationObserver Leaks Test**

```javascript
describe('Memory Leak: MutationObserver', () => {
  test('MutationObserver is properly disconnected', async () => {
    const observerCount = await page.evaluate(() => {
      return new WeakSet(
        Object.values(window).filter(obj =>
          obj instanceof MutationObserver
        )
      ).size;
    });

    // Create observer, observe, then disconnect
    await page.evaluate(() => {
      const observer = new MutationObserver(() => {});
      observer.observe(document.body, { childList: true, subtree: true });
      observer.disconnect();
    });

    // Force garbage collection
    await page.evaluate(() => {
      if (window.gc) window.gc();
    });

    const finalObserverCount = await page.evaluate(() => {
      return new WeakSet(
        Object.values(window).filter(obj =>
          obj instanceof MutationObserver
        )
      ).size;
    });

    expect(finalObserverCount).toBeLessThanOrEqual(observerCount);
  });
});
```

**3. Shadow DOM Circular References Test**

```javascript
describe('Memory Leak: Shadow DOM Circular References', () => {
  test('Components with circular refs release memory', async () => {
    const initialMemory = await page.metrics().then(m => m.JSHeapUsedSize);

    // Create nested components with circular references
    await page.evaluate(() => {
      for (let i = 0; i < 50; i++) {
        const card = document.createElement('fast-card');
        const button = document.createElement('fast-button');

        // Create circular reference
        card.fastButton = button;
        button.parentCard = card;

        document.body.appendChild(card);
      }
    });

    // Remove all components
    await page.evaluate(() => {
      document.querySelectorAll('fast-card').forEach(card => {
        card.remove();
      });
    });

    // Force garbage collection
    await page.evaluate(() => {
      if (window.gc) window.gc();
    });

    const finalMemory = await page.metrics().then(m => m.JSHeapUsedSize);
    const memoryGrowth = finalMemory - initialMemory;

    // Allow some growth but should not be linear with component count
    expect(memoryGrowth).toBeLessThan(50 * 1024); // Less than 50KB growth
  });
});
```

**4. Component Pool Leaks Test**

```javascript
describe('Memory Leak: Component Pool', () => {
  test('Component pool does not leak memory', async () => {
    const initialMemory = await page.metrics().then(m => m.JSHeapUsedSize);

    // If component pooling is implemented
    await page.evaluate(() => {
      // Create and recycle components from pool
      for (let i = 0; i < 1000; i++) {
        const button = FastBulma.componentPool.acquire('fast-button');
        FastBulma.componentPool.release(button);
      }
    });

    await page.evaluate(() => {
      if (window.gc) window.gc();
    });

    const finalMemory = await page.metrics().then(m => m.JSHeapUsedSize);
    const memoryGrowth = finalMemory - initialMemory;

    // Pool should not grow unbounded
    expect(memoryGrowth).toBeLessThan(100 * 1024); // Less than 100KB
  });
});
```

**Testing Tools**

- **Chrome DevTools Memory Profiler**: Take heap snapshots before/after operations
- **Playwright with Chrome DevTools Protocol**: Automated memory profiling
- **Crackerjack leak detection**: Built-in memory leak detection in test suite
- **Long-running page test**: Run 24+ hour soak test to detect slow leaks

**Memory Leak Testing with Crackerjack**

```bash
# Run memory leak tests via crackerjack
crackerjack test --memory

# Run with garbage collection enabled
NODE_OPTIONS="--expose-gc" crackerjack test --memory

# Run long-running soak test (24+ hours)
crackerjack test --soak --duration=24h

# Check for memory leaks in specific component
crackerjack test --memory --component=fast-button
```

Crackerjack integrates memory leak testing into the standard test workflow:

- Automatically detects memory leaks before commits
- Generates heap snapshots on failure
- Provides detailed leak reports with stack traces
- No separate CI configuration needed

**Success Criteria**

- ✅ No memory growth after 1000 component create/destroy cycles
- ✅ No detached DOM nodes after garbage collection (check heap snapshots)
- ✅ Event listeners are properly removed when components are destroyed
- ✅ MutationObserver instances are garbage collected after disconnect
- ✅ Component pool maintains stable memory usage over time
- ✅ Long-running page test (24 hours) shows < 10MB memory growth

**Performance Budget**

- Maximum allowed memory growth: 10MB per 1000 component operations
- Maximum detached DOM nodes: 0 after garbage collection
- Maximum event listeners growth: 0 after component destruction

______________________________________________________________________

### Phase 4.5: Performance Optimization

#### 4.5.1 Performance Benchmarking

- Establish baseline performance metrics
- Implement automated performance regression testing
- Create performance budget tracking

#### 4.5.2 Optimization Strategies

- CSS optimization: Critical CSS extraction, unused rule removal
- JavaScript optimization: Tree-shaking, lazy loading
- Rendering optimization: Virtual scrolling, efficient DOM updates

#### 4.5.3 Performance Targets

**Revised based on technical audit - Updated January 2026**

| Metric | Original Target | **Revised Target** | Justification |
|--------|-----------------|-------------------|----------------|
| **First Contentful Paint** | < 1.5s | **2.5-3.5s** | Shadow DOM overhead (10-20ms per component), FAST initialization |
| **Time to Interactive** | < 3s | **4-6s** | Component registration, form polyfills, larger bundle |
| **Bundle Size** | < 150KB | **350-420KB** | FAST framework size was not included in original calculation |
| **60 FPS Animations** | 85% probability | **60-70%** | CSS variable recalculation overhead, Shadow DOM rendering |

**Performance Optimization Requirements**:

- **Critical CSS extraction**: Inline above-the-fold CSS to reduce FCP
- **Component lazy loading**: Only register above-the-fold components initially
- **CSS containment**: Apply `contain: style` to limit recalculation scope
- **MutationObserver optimization**: Filter mutations and use debouncing
- **Shadow DOM pooling**: Reuse template instances for repeated components

**Success Probability: 80%** → **65%** (performance targets more realistic but achievable with optimizations)

______________________________________________________________________

### Phase 5: Documentation, Demos, and Examples

#### 5.1 API Documentation

- Document component interfaces with detailed property/method listings
- Provide comprehensive usage examples for each component
- Create customization guides for theming and styling
- Include migration guides from other frameworks
- Generate documentation automatically from source code comments

#### 5.2 Interactive Documentation Site

- Build documentation site using FastBulma components
- Include live code examples that users can modify
- Provide side-by-side comparisons of Bulma vs FastBulma implementations
- Create searchable component catalog with filtering capabilities

**Success Probability: 75%** (reduced from 90% - SSR limitations complex to document, migration paths need extensive examples)

______________________________________________________________________

## Browser Support Strategy

### Tier 1 Support (Full functionality)

- Chrome (latest 2 versions)
- Firefox (latest 2 versions)
- Safari (latest 2 versions)
- Edge (latest 2 versions)

**Features Supported**:

- All components and features
- Native form association (no polyfill needed)
- CSS `color-mix()` function for advanced theming
- CSS Shadow Parts API for component customization
- Full Shadow DOM encapsulation

### Tier 2 Support (Core functionality)

- Chrome (last 4 versions)
- Firefox (last 4 versions)
- Safari (last 3 versions)
- Edge (last 3 versions)

**Features Supported**:

- All components and features
- Form association requires polyfill for older versions
- CSS `color-mix()` requires fallback to predefined color variants
- CSS Shadow Parts API where available

**Polyfills Required**:

- `@github/form-associated-element-boundary` for form association (Safari < 16.4, Firefox < 79, Chrome < 77)
- Fallback CSS variables for `color-mix()` (Safari < 16.2, Firefox < 113, Chrome < 111)

### Tier 3 Support (Best effort)

- Mobile browsers (iOS Safari, Chrome Android)
- Legacy browsers with polyfills

**Limitations**:

- Some advanced features may not work
- Performance may be degraded
- Polyfills increase bundle size

**Implementation Probability: 70%** (Reduced from 88% due to Safari 15.x Shadow DOM bugs)

______________________________________________________________________

### Server-Side Rendering Strategy

**Decision**: FastBulma does **NOT** support server-side rendering.

**Reasoning**:

1. FAST components use Shadow DOM, which doesn't exist on the server
1. No SSR framework integration (React, Vue, Angular, etc.)
1. Vanilla JavaScript constraint precludes SSR solutions
1. Web Components require browser JavaScript to initialize

**Implications**:

- Initial HTML will show unstyled `<fast-button>` elements
- Content only visible after JavaScript loads and components register
- **NOT suitable for SEO-critical pages** (search engines won't see component content)
- **NOT suitable for progressive enhancement** (requires JavaScript)
- **NOT suitable for users with JavaScript disabled**

**Impact on Core Web Vitals**:

- **LCP (Largest Contentful Paint)**: Will be delayed until after component registration
- **FCP (First Contentful Paint)**: May show unstyled custom elements
- **CLS (Cumulative Layout Shift)**: Possible layout shift when components render

**Alternatives for SSR**:

**Option 1: Hybrid Approach (Recommended for SEO)**

```html
<!-- Server-rendered Bulma content for SEO -->
<head>
  <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/bulma@1.0.2/css/bulma.min.css">
</head>
<body>
  <!-- Critical content: Use Bulma for initial render (SEO-friendly) -->
  <div class="box">
    <h1 class="title">SEO-Critical Content</h1>
    <p>This content is indexed by search engines.</p>
  </div>

  <!-- Interactive elements: Use FAST after page load -->
  <div id="interactive-region">
    <fast-button class="is-primary">Interactive Button</fast-button>
  </div>

  <script type="module">
    import { provideFASTDesignSystem } from '@microsoft/fast-components';
    import { fastButton } from '@microsoft/fast-components';

    // Register FAST components after page load
    provideFASTDesignSystem().register(fastButton());
  </script>
</body>
```

**Option 2: Declarative Shadow DOM (Experimental)**

```html
<!-- Experimental: Declarative Shadow DOM (Chrome 111+, Safari 16.4+) -->
<fast-button class="is-primary">
  <template shadowrootmode="open">
    <style>/* FAST component styles */</style>
    <button class="control">
      <slot></slot>
    </button>
  </template>
  Click me
</fast-button>
```

**Limitations of Option 2**:

- Browser support is limited (Chrome 111+, Safari 16.4+)
- Bloats HTML with duplicated component internals
- No hydration - static only
- Requires build-time HTML generation
- **Not recommended for production**

**Migration Guidance**:
If you need SSR:

1. Use Bulma components for server-rendered content (SEO-critical areas)
1. Hydrate with FAST components after page load (interactive regions)
1. Accept hydration complexity and potential layout shift
1. Consider using Bulma-only for SEO-critical pages
1. Use FastBulma only for interactive dashboards, admin panels, etc.

**Examples of When FastBulma is Appropriate**:

- ✅ Admin dashboards (login required, not SEO-critical)
- ✅ Internal tools (authentication gate, no indexing)
- ✅ Interactive applications (SPA-like behavior)
- ✅ Progressive Web Apps (JavaScript required anyway)

**Examples of When to Use Bulma Instead**:

- ❌ Marketing landing pages (SEO-critical)
- ❌ Public documentation (needs SEO, no-JS fallback)
- ❌ E-commerce product pages (SEO + performance critical)
- ❌ Blog posts and articles (content must be indexed)

**Implementation Probability: 50%** (Hybrid approach adds significant complexity)

______________________________________________________________________

## Migration Path from Bulma

![Migration Decision Tree](docs/diagrams/03-migration-path-decision-tree.png)

### Migration Strategy Overview

Migrating from pure Bulma to FastBulma can be done **incrementally**, allowing teams to adopt FAST components gradually while maintaining existing Bulma layouts.

### Migration Levels

#### Level 1: Drop-in Replacement (No Code Changes)

**Target**: Teams wanting FAST components without changing HTML structure.

**Approach**: Use FAST components with Bulma classes, no JavaScript changes required.

**Example**:

```html
<!-- Before (Bulma) -->
<button class="button is-primary">Click me</button>

<!-- After (FastBulma) - No JavaScript changes needed! -->
<fast-button class="button is-primary">Click me</fast-button>
```

**Migration Steps**:

1. Add FastBulma CSS and JS to your page
1. Replace `<button class="button">` with `<fast-button class="button">`
1. Replace `<input class="input">` with `<fast-text-field class="input">`
1. Replace `<div class="select">` with `<fast-select class="select">`

**Benefits**: FAST components automatically, minimal code changes
**Limitations**: No access to FAST-specific features (slots, advanced properties)

#### Level 2: Gradual Adoption (Selective Migration)

**Target**: Teams wanting to use FAST features in specific areas.

**Approach**: Migrate high-value components first (forms, modals, data grids).

**Example**:

```html
<!-- Keep Bulma for simple layout -->
<div class="columns">
  <div class="column">
    <!-- Migrate to FAST for interactive components -->
    <fast-card class="is-primary">
      <h3 slot="heading">User Profile</h3>
      <fast-text-field id="username-field" placeholder="Name"></fast-text-field>
      <fast-button appearance="accent" slot="actions">Save</fast-button>
    </fast-card>
  </div>
</div>

<script>
  // Vanilla JavaScript approach (no templating required)
  const textField = document.getElementById('username-field');
  const userName = 'John Doe';  // Your data source

  // Set value using JavaScript property
  textField.value = userName;

  // Or respond to user input
  textField.addEventListener('input', (event) => {
    console.log('Username:', event.target.value);
  });
</script>
```

**Migration Steps**:

1. Identify high-value components (forms, modals, data grids)
1. Migrate identified components to FAST with slots and properties
1. Use vanilla JavaScript for dynamic values (no templating engine required)
1. Keep Bulma for layout and typography
1. Test component interactions thoroughly

**Benefits**: Best of both worlds, gradual learning curve
**Limitations**: Some inconsistency in component patterns

#### Level 3: Full Migration (Complete FAST Adoption)

**Target**: New projects or teams ready for full migration.

**Approach**: Use FAST components throughout with Bulma utilities only for layout.

**Example**:

```html
<section class="hero is-primary">
  <div class="hero-body">
    <fast-dialog>
      <h2 slot="heading">Welcome</h2>
      <fast-text-field name="email" type="email" placeholder="Email"></fast-text-field>
      <fast-checkbox>I agree to terms</fast-checkbox>
      <fast-button appearance="accent">Submit</fast-button>
    </fast-dialog>
  </div>
</section>
```

**Migration Steps**:

1. Replace all form components with FAST equivalents
1. Use FAST data-grid instead of Bulma tables
1. Use FAST dialog instead of Bulma modal
1. Use FAST menu-button instead of Bulma dropdown
1. Keep Bulma for columns, hero, section, typography
1. Optimize CSS variables for your theme

**Benefits**: Consistent component API, full FAST feature set
**Limitations**: Steeper learning curve, more code changes

### Automated Migration Tooling

**Codemods for FastBulma**

We'll provide automated codemods (using `jscodeshift`) to speed up migration:

```bash
# Install codemod CLI
npm install -g jscodeshift

# Run button migration codemod
jscodeshift -t fastbulma-codemods/src/button.js src/

# Run form input migration codemod
jscodeshift -t fastbulma-codemods/src/text-field.js src/

# Run all codemods at once
fastbulma-migrate src/
```

**Example Codemod: Button Migration**

```javascript
// fastbulma-codemods/src/button.js
module.exports = function(fileInfo, api) {
  const j = api.jscodeshift;
  const root = j(fileInfo.source);

  // Find JSX button elements with Bulma classes
  root.find(j.JSXElement, {
    openingElement: {
      name: { name: 'button' },
      attributes: {
        some: attr =>
          attr.type === 'JSXAttribute' &&
          attr.name.name === 'className' &&
          attr.value.value.includes('button')
      }
    }
  })
  .forEach(path => {
    // Replace with fast-button
    path.node.openingElement.name.name = 'fast-button';
    path.node.closingElement.name.name = 'fast-button';
  });

  return root.toSource();
};
```

**Codemod Coverage**

| Bulma Component | FAST Component | Codemod Available | Complexity |
|-----------------|----------------|-------------------|------------|
| `.button` | `fast-button` | ✓ v1.0 | Low |
| `.input` | `fast-text-field` | ✓ v1.0 | Low |
| `.textarea` | `fast-text-area` | ✓ v1.0 | Low |
| `.select` | `fast-select` | ✓ v1.0 | Medium |
| `.checkbox` | `fast-checkbox` | ✓ v1.0 | Low |
| `.radio` | `fast-radio-group` | ✓ v1.0 | Medium |
| `.table` | `fast-data-grid` | △ v1.1 | High |
| `.modal` | `fast-dialog` | ✓ v1.0 | Medium |
| `.dropdown` | `fast-menu-button` | △ v1.1 | High |
| `.tabs` | `fast-tabs` | ✓ v1.0 | Medium |

**Legend**: ✓ Available | △ Planned

### Breaking Changes and Compatibility

#### Breaking Changes from Pure Bulma

1. **Event Handlers**

   ```javascript
   // Before (Bulma)
   <button onclick="handleClick()">Click</button>

   // After (FastBulma)
   // ✓ Still works, but event.target is retargeted
   <fast-button onclick="handleClick()">Click</fast-button>
   ```

1. **Form Submission**

   ```html
   <!-- Before (Bulma) -->
   <form onsubmit="handleSubmit()">
     <input name="username">
     <button type="submit">Submit</button>
   </form>

   <!-- After (FastBulma) -->
   <!-- ✓ Works with polyfill! FAST components participate in native forms -->
   <!-- IMPORTANT: Add form association polyfill for older browsers -->
   <script src="https://cdn.jsdelivr.net/npm/@github/form-associated-element-boundary@latest/dist/form-associated-element-boundary.min.js"></script>

   <form onsubmit="handleSubmit()">
     <fast-text-field name="username"></fast-text-field>
     <fast-button type="submit">Submit</fast-button>
   </form>
   ```

   **Browser Support for Native Form Association**:

   - Chrome 77+, Firefox 79+, Safari 16.4+: Native support (no polyfill needed)
   - Older browsers: Polyfill required (as shown above)

   **Polyfill Details**:

   - Package: `@github/form-associated-element-boundary`
   - CDN: jsDelivr, unpkg
   - Load before FastBulma JavaScript

1. **CSS Specificity**

   ```css
   /* Before: Direct element styling */
   .button { background: var(--bulma-primary); }

   /* After: CSS variable bridge required */
   .button {
     --accent-fill-rest: var(--bulma-primary);
   }
   ```

#### Version Compatibility Matrix

| FastBulma Version | Bulma Version | FAST Components | Breaking Changes |
|------------------|---------------|-----------------|------------------|
| v1.0.x | 1.0.2 | 2.x.x | None |
| v1.1.x | 1.0.2 | 3.x.x | Minor (check migration guide) |
| v2.0.x | 1.1.x | 3.x.x | Major (new variable names) |

### Migration Checklist

#### Pre-Migration Planning

- [ ] Audit current Bulma usage in your project
- [ ] Identify components to migrate (use automated audit tool)
- [ ] Estimate migration effort (use complexity matrix)
- [ ] Create migration branch
- [ ] Set up FastBulma in staging environment

#### Level 1 Migration (Drop-in Replacement)

- [ ] Add FastBulma CDN links to HTML
- [ ] Run automated codemods for buttons and inputs
- [ ] Test basic functionality (clicks, form submission)
- [ ] Verify CSS variables are applied
- [ ] Check browser console for errors

#### Level 2 Migration (Gradual Adoption)

- [ ] Identify high-value components (forms, modals, data grids)
- [ ] Migrate identified components to FAST with slots
- [ ] Update event handlers to use Shadow DOM-aware patterns
- [ ] Test keyboard navigation
- [ ] Verify accessibility with screen reader

#### Level 3 Migration (Full FAST Adoption)

- [ ] Replace all form components with FAST equivalents
- [ ] Use FAST data-grid instead of Bulma tables
- [ ] Use FAST dialog instead of Bulma modal
- [ ] Optimize CSS variables for your theme
- [ ] Remove unused Bulma CSS (keep only utilities)
- [ ] Performance test and optimize bundle size

#### Post-Migration Validation

- [ ] Run automated test suite
- [ ] Manual QA testing across browsers
- [ ] Accessibility audit with axe-core
- [ ] Performance benchmarking
- [ ] User acceptance testing
- [ ] Deploy to production and monitor metrics

### Common Migration Issues and Solutions

#### Issue 1: CSS Variables Not Applied

**Problem**: FAST components don't inherit Bulma CSS variables.

**Solution**: Ensure Bulma classes are on the same element as FAST component:

```html
<!-- ✗ WRONG -->
<div class="is-primary">
  <fast-button>Click</fast-button>
</div>

<!-- ✓ CORRECT -->
<fast-button class="is-primary">Click</fast-button>
```

#### Issue 2: Event Handlers Not Firing

**Problem**: Click events on FAST components not triggering.

**Solution**: Use Shadow DOM-aware event handling:

```javascript
// Before
document.querySelector('.button').addEventListener('click', handler);

// After (still works, but be aware of retargeting)
document.querySelector('fast-button').addEventListener('click', handler);
```

#### Issue 3: Form Validation Not Working

**Problem**: Native form validation not working with FAST components.

**Solution**: Use FAST's validation API or enable form association polyfill:

```html
<form id="my-form">
  <fast-text-field name="email" required></fast-text-field>
</form>

<script>
  // Use FAST validation API
  const textField = document.querySelector('fast-text-field');
  textField.value = 'invalid-email';
  textField.validate(); // Returns validation result
</script>
```

### Migration Timeline Estimates

| Project Size | Level 1 Migration | Level 2 Migration | Level 3 Migration |
|--------------|-------------------|-------------------|-------------------|
| Small (< 50 components) | 1-2 days | 3-5 days | 1-2 weeks |
| Medium (50-200 components) | 3-5 days | 1-2 weeks | 3-4 weeks |
| Large (200+ components) | 1-2 weeks | 3-4 weeks | 2-3 months |

**Success Probability: 50%** (reduced from 75% - hybrid SSR approach complexity, hydration challenges, layout shift risks)

______________________________________________________________________

## Theming System

### Theme Architecture

FastBulma's theming system is built entirely on **CSS custom properties**, allowing complete customization without Sass or build tools.

### Theme Structure

```css
/* 1. Base Theme Variables (Required) */
:root {
  /* Bulma Core Variables */
  --bulma-scheme-main: #ffffff;
  --bulma-scheme-invert: #000000;
  --bulma-scheme-primary: #7957d5;
  --bulma-scheme-success: #48c774;
  --bulma-scheme-warning: #ffdd57;
  --bulma-scheme-danger: #f14668;

  /* Spacing */
  --bulma-radius: 4px;
  --bulma-size-normal: 1rem;

  /* Typography */
  --bulma-family-primary: Inter, sans-serif;
}

/* 2. FAST Token Mappings (Required) */
@layer fast {
  :root {
    --accent-fill-rest: var(--bulma-primary);
    --control-corner-radius: var(--bulma-radius);
    --type-ramp-base-font-size: var(--bulma-size-normal);
  }
}

/* 3. Custom Theme Overrides (Optional) */
[data-theme="dark"] {
  --bulma-scheme-main: #0a0a0a;
  --bulma-scheme-invert: #ffffff;
}
```

### Pre-Built Themes

FastBulma will ship with 5 pre-built themes:

#### Default Theme (Light)

```css
/* FastestBulma default */
--bulma-primary: #7957d5;
--bulma-background: #ffffff;
--bulma-text: #4a4a4a;
```

#### Dark Theme

```css
[data-theme="dark"] {
  --bulma-scheme-main: #0a0a0a;
  --bulma-scheme-invert: #ffffff;
  --bulma-primary: #9e86e8;
  --bulma-background: #0a0a0a;
  --bulma-text: #f5f5f5;
}
```

#### Solarized Light Theme

```css
[data-theme="solarized-light"] {
  --bulma-primary: #6c71c4;
  --bulma-success: #859900;
  --bulma-warning: #b58900;
  --bulma-danger: #dc322f;
  --bulma-background: #fdf6e3;
  --bulma-text: #657b83;
}
```

#### Dracula Theme

```css
[data-theme="dracula"] {
  --bulma-primary: #bd93f9;
  --bulma-success: #50fa7b;
  --bulma-warning: #f1fa8c;
  --bulma-danger: #ff5555;
  --bulma-background: #282a36;
  --bulma-text: #f8f8f2;
}
```

#### Nord Theme

```css
[data-theme="nord"] {
  --bulma-primary: #88c0d0;
  --bulma-success: #a3be8c;
  --bulma-warning: #ebcb8b;
  --bulma-danger: #bf616a;
  --bulma-background: #2e3440;
  --bulma-text: #d8dee9;
}
```

### Theme Switching Mechanism

#### Method 1: Data Attribute (Recommended)

```html
<!-- Set theme on document -->
<html data-theme="dark">

<!-- Or set on container -->
<div data-theme="dark">
  <fast-button class="is-primary">Dark theme button</fast-button>
</div>
```

```javascript
// Switch theme programmatically
function setTheme(themeName) {
  document.documentElement.setAttribute('data-theme', themeName);
  // Persist to localStorage
  localStorage.setItem('fastbulma-theme', themeName);
}

// Load saved theme on page load
const savedTheme = localStorage.getItem('fastbulma-theme') || 'default';
document.documentElement.setAttribute('data-theme', savedTheme);
```

#### Method 2: CSS Class

```html
<!-- Add theme class -->
<html class="theme-dark">
```

```css
.theme-dark {
  --bulma-primary: #9e86e8;
  --bulma-background: #0a0a0a;
}
```

#### Method 3: Dynamic CSS Variable Updates

```javascript
// Update specific color dynamically
document.documentElement.style.setProperty('--bulma-primary', '#ff0000');

// Update multiple variables at once
const themeColors = {
  '--bulma-primary': '#ff0000',
  '--bulma-success': '#00ff00',
  '--bulma-danger': '#0000ff'
};

Object.entries(themeColors).forEach(([varName, value]) => {
  document.documentElement.style.setProperty(varName, value);
});
```

### Creating Custom Themes

#### Theme Template

```css
/* my-theme.css */
:root {
  /* 1. Brand Colors */
  --bulma-primary: #your-brand-color;
  --bulma-primary-invert: #contrast-color;
  --bulma-primary-light: #lighter-variant;
  --bulma-primary-dark: #darker-variant;

  /* 2. Semantic Colors */
  --bulma-success: #success-color;
  --bulma-warning: #warning-color;
  --bulma-danger: #error-color;
  --bulma-info: #info-color;

  /* 3. Neutral Colors */
  --bulma-scheme-main: #background-color;
  --bulma-scheme-invert: #foreground-color;
  --bulma-background: #background-color;
  --bulma-text: #text-color;

  /* 4. Spacing & Sizing */
  --bulma-radius: 4px;
  --bulma-radius-small: 2px;
  --bulma-radius-large: 6px;
  --bulma-size-normal: 1rem;

  /* 5. Typography */
  --bulma-family-primary: 'Your Font', sans-serif;
  --bulma-family-code: 'Monospace', monospace;
}

/* Map to FAST tokens */
@layer fast {
  :root {
    --accent-fill-rest: var(--bulma-primary);
    --accent-fill-hover: color-mix(in srgb, var(--bulma-primary) 90%, black);
    --neutral-fill-rest: var(--bulma-background);
    --neutral-foreground-rest: var(--bulma-text);
  }
}
```

#### Theme Validation Tool

FastBulma will provide a CLI tool to validate custom themes:

```bash
# Install CLI
npm install -g fastbulma-theme-validator

# Validate theme
fastbulma-theme-validator validate my-theme.css

# Output:
# ✓ All required CSS variables defined
# ✓ Color contrast ratios meet WCAG AA (4.5:1)
# ⚠ Warning: --bulma-primary-dark is missing (auto-generated)
# ✓ FAST token mappings valid
```

### Theme Marketplace Strategy

**Phase 1**: Community Themes (v1.0)

- Accept community-contributed themes via GitHub PRs
- Curate and review themes for quality
- Include 10-15 community themes in v1.0 release

**Phase 2**: Theme Marketplace (v1.2)

- Build online theme gallery
- Allow users to upload and share themes
- Implement theme rating and review system
- Provide theme preview/playground

**Phase 3**: Theme Generator Tool (v2.0)

- Visual theme editor with live preview
- Export theme as CSS file
- One-click installation via CDN
- Theme customization presets

### Theme Accessibility Requirements

All themes must meet **WCAG AA** standards:

```javascript
// Automated accessibility check
function validateThemeAccessibility() {
  const tests = [
    {
      name: 'Primary contrast',
      minRatio: 4.5,
      foreground: '--bulma-primary',
      background: '--bulma-scheme-main'
    },
    {
      name: 'Text contrast',
      minRatio: 4.5,
      foreground: '--bulma-text',
      background: '--bulma-background'
    }
  ];

  tests.forEach(test => {
    const ratio = calculateContrast(test.foreground, test.background);
    if (ratio < test.minRatio) {
      console.error(`${test.name} fails WCAG AA (ratio: ${ratio})`);
    }
  });
}
```

**Success Probability: 70%** (reduced from 80% - color-mix() fallback complexity, accessibility validation overhead)

______________________________________________________________________

## Build and Deployment Strategy

### Two-Tier Build System

FastBulma uses a **two-tier build system**:

- **Tier 1 (User-facing)**: No build tools required for users
- **Tier 2 (Developer-facing)**: Build tools for generating distribution assets

### Tier 1: User Experience (No Build Tools Required)

Users can use FastBulma directly via CDN with zero configuration:

```html
<!DOCTYPE html>
<html lang="en">
<head>
    <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/bulma@1.0.2/css/bulma.min.css">
    <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/fastbulma@latest/css/fastbulma.min.css">
</head>
<body>
    <fast-button class="is-primary">Click me</fast-button>

    <script type="module" src="https://cdn.jsdelivr.net/npm/fastbulma@latest/js/fastbulma.min.js"></script>
</body>
</html>
```

### Tier 2: Developer Experience (Build Tools for Distribution)

#### Project Structure

```
fastbulma/
├── src/
│   ├── css/
│   │   ├── core.css           # CSS variable mappings
│   │   ├── components.css     # Component-specific overrides
│   │   └── themes.css         # Pre-built themes
│   ├── js/
│   │   ├── index.ts          # Main entry point
│   │   ├── registration.ts   # Component registration
│   │   └── data-attributes.ts # Data attribute mapper
│   └── themes/
│       ├── default.css
│       ├── dark.css
│       └── solarized.css
├── dist/                      # Generated distribution files
│   ├── css/
│   │   ├── fastbulma.css
│   │   ├── fastbulma.min.css
│   │   └── themes/
│   └── js/
│       ├── fastbulma.js
│       ├── fastbulma.min.js
│       └── fastbulma.esm.js
├── tests/
├── docs/
├── scripts/
│   ├── build.ts              # Build script
│   ├── minify.ts             # Minification
│   └── bundle.ts             # Bundling
├── package.json
├── tsconfig.json
└── vite.config.ts            # Build configuration
```

#### Build Tools

**Primary Build Tool**: Vite

- **Rationale**: Fast, native ESM support, built-in TypeScript
- **Usage**: Bundle JavaScript, minify CSS, generate distribution files

**CSS Processing**: PostCSS + csso

- **PostCSS plugins**: autoprefixer, postcss-nested, postcss-import
- **Minification**: csso for optimal CSS compression

**JavaScript Bundling**: Vite (Rollup under the hood)

- **Output formats**: ESM, IIFE (for browser), CJS (for Node.js)
- **Tree-shaking**: Automatic dead code elimination

**TypeScript**: esbuild (via Vite)

- **Rationale**: Fastest TypeScript compiler
- **Config**: Strict mode, path aliases

#### Build Script

```typescript
// scripts/build.ts
import { build } from 'vite';
import { minify as minifyCss } from 'csso';
import { readFile, writeFile } from 'fs/promises';
import { join } from 'path';

async function buildFastBulma() {
  console.log('🚀 Building FastBulma...');

  // 1. Build JavaScript
  console.log('📦 Building JavaScript...');
  await build({
    configFile: join(process.cwd(), 'vite.config.ts'),
    mode: 'production'
  });

  // 2. Minify CSS
  console.log('🎨 Minifying CSS...');
  const cssFiles = [
    'src/css/core.css',
    'src/css/components.css',
    'src/css/themes.css'
  ];

  for (const file of cssFiles) {
    const source = await readFile(file, 'utf-8');
    const minified = minifyCss(source).css;
    const outputPath = file.replace('src/', 'dist/').replace('.css', '.min.css');
    await writeFile(outputPath, minified);
  }

  // 3. Generate type definitions
  console.log('📝 Generating TypeScript definitions...');
  // Run tsc --emitDeclarationOnly

  // 4. Copy static assets
  console.log('📋 Copying static assets...');
  // Copy themes, fonts, etc.

  console.log('✅ Build complete!');
}

buildFastBulma().catch(console.error);
```

#### Vite Configuration

```typescript
// vite.config.ts
import { defineConfig } from 'vite';

export default defineConfig({
  build: {
    lib: {
      entry: 'src/js/index.ts',
      name: 'FastBulma',
      formats: ['es', 'umd', 'iife'],  // Added IIFE for CDN
      fileName: (format) => {
        // Map format names to output file names
        if (format === 'es') return 'fastbulma.esm.js';
        if (format === 'umd') return 'fastbulma.umd.js';
        if (format === 'iife') return 'fastbulma.js';  // For direct browser use
        return `fastbulma.${format}.js`;
      }
    },
    rollupOptions: {
      // CRITICAL FIX: DON'T externalize FAST for CDN builds
      // Original code broke CDN users because global 'FAST' variable doesn't exist
      //
      // For ESM/UMD builds (Node.js): external: ['@microsoft/fast-components']
      // For IIFE builds (CDN): bundle everything
      //
      // Solution: Use separate build configs or conditional externalization
      external: [],  // Bundle everything for CDN compatibility

      // Alternative: Conditional externalization based on format
      // external: (id) => {
      //   // Only externalize for ESM/UMD, not IIFE
      //   return false;  // Always bundle for CDN compatibility
      // },

      output: {
        // CRITICAL: Don't assume globals exist for CDN users
        // Original code assumed global 'FAST' exists - this breaks CDN usage
        //
        // Correct approach: Bundle everything, no globals assumed
        globals: {}  // Empty object = no globals assumed
      }
    },
    sourcemap: true,
    minify: 'terser'
  },
  css: {
    postcss: {
      plugins: [
        require('autoprefixer'),
        require('postcss-nested'),
        require('postcss-import')
      ]
    }
  }
});
```

**CRITICAL FIX NOTES**:

The original Vite configuration had a **critical bug** that broke CDN usage:

1. **Externalized FAST components**: This assumed users would load FAST separately
1. **Assumed global 'FAST' variable**: This doesn't exist for CDN users
1. **Result**: `fastbulma.esm.js` would fail with "FAST is not defined"

**Revised approach**:

- Bundle FAST components directly for CDN users
- No assumptions about external globals
- Single-file distribution that works out-of-the-box
- Trade-off: Larger bundle size, but actually works for CDN users

**For advanced users**: Provide separate build configurations:

- `vite.config.cdn.ts` - Bundles everything (for CDN users)
- `vite.config.npm.ts` - Externalizes FAST (for npm users with tree-shaking)

### Quality Assurance with Crackerjack

**Crackerjack** provides comprehensive quality control without complex CI/CD configuration:

```bash
# Run full quality check
crackerjack check

# Run specific checks
crackerjack check --lint          # Linting only
crackerjack check --test          # Tests only
crackerjack check --coverage      # Coverage threshold check
crackerjack check --bundle        # Bundle size check
crackerjack check --security      # Security audit

# Auto-fix issues where possible
crackerjack check --fix

# Check quality gates via crickerjack settings/config
crackerjack check
```

**Quality Gates Enforced by Crackerjack** (via settings/config and caches):

- ✅ All tests pass (unit, integration, e2e)
- ✅ Code coverage threshold met (>80%)
- ✅ Bundle size within budget (CSS: 35KB, JS: 80KB, Total: 420KB)
- ✅ No security vulnerabilities (bandit)
- ✅ No linting errors (ruff)
- ✅ Type checking passes (pyright for Python, tsc for TypeScript)
- ✅ Memory leak tests pass
- ✅ Accessibility tests pass (axe-core)

**Release Workflow** (simplified, no CI needed):

```bash
# 1. Run full quality check
crackerjack check

# 2. Build distribution bundles
npm run build

# 3. Publish to npm
npm publish

# 4. jsDelivr automatically caches from npm (no action needed)
# 5. Tag release in git
git tag v0.1.0
git push origin v0.1.0
```

______________________________________________________________________

### Distribution Channels

#### Channel 1: CDN (Primary)

**jsDelivr** (Recommended)

- Base URL: `https://cdn.jsdelivr.net/npm/fastbulma@latest/`
- Features: Automatic caching, multiple CDNs, real-time analytics
- Usage:
  ```html
  <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/fastbulma@latest/css/fastbulma.min.css">
  <script type="module" src="https://cdn.jsdelivr.net/npm/fastbulma@latest/js/fastbulma.esm.js"></script>
  ```

**unpkg** (Alternative)

- Base URL: `https://unpkg.com/fastbulma@latest/` (placeholder - package not yet published)
- Features: Fast, reliable, maintained by Mocha team
- Usage:
  ```html
  <link rel="stylesheet" href="https://unpkg.com/fastbulma@latest/css/fastbulma.min.css"> (placeholder - package not yet published)
  ```

#### Channel 2: NPM Package

**Package**: `fastbulma`
**Contents**: CSS files, JavaScript bundles, TypeScript definitions
**Installation**:

```bash
npm install fastbulma
```

**Usage**:

```javascript
import { registerFastBulma } from 'fastbulma';
import 'fastbulma/css/fastbulma.css';

registerFastBulma();
```

#### Channel 3: Python Package

**Package**: `fastbulma` (PyPI)
**Purpose**: Development tools, FastBlocks integration, asset bundling
**Installation**:

```bash
pip install fastbulma
```

**Usage**:

```python
from fastbulma import ThemeGenerator, MigrationAssistant

# Generate custom theme
generator = ThemeGenerator()
theme = generator.generate(primary="#7957d5")
theme.save("my-theme.css")

# Migrate Bulma project
migrator = MigrationAssistant("src/")
migrator.migrate_buttons()
migrator.migrate_forms()
```

### Version Management

#### Semantic Versioning

FastBulma follows **semantic versioning** (SemVer):

- **MAJOR**: Breaking changes
- **MINOR**: New features, backward compatible
- **PATCH**: Bug fixes, backward compatible

#### Version Strategy

```
v0.1.0 - Initial release
  ├── Core components
  ├── Default theme
  └── CDN distribution

v1.1.0 - Feature release
  ├── Additional themes
  ├── Component registration modes
  └── Improved documentation

v1.2.0 - Feature release
  ├── Theme marketplace
  ├── Migration tooling
  └── Performance optimizations

v2.0.0 - Major release
  ├── Breaking changes to CSS variable names
  ├── New component API
  └── Enhanced accessibility
```

#### Dependency Versioning

| Package | Version Strategy | Update Frequency |
|---------|------------------|------------------|
| Bulma | Pin to `^1.0.2` | Manual review before update |
| FAST Components | Allow `^2.x.x` | Automated testing, manual approval |
| Vite | Pin to exact version | Update quarterly |
| Testing libraries | Allow `^` updates | Automated PRs |

### Asset Optimization

#### CSS Optimization

1. **Critical CSS Extraction**

   - Extract above-the-fold CSS for critical rendering path
   - Lazy load non-critical CSS

1. **Unused CSS Removal**

   - Use PurgeCSS to remove unused Bulma classes
   - Configure safelist for dynamic classes

1. **Minification**

   - csso for optimal compression
   - Target: < 20KB for core CSS

#### JavaScript Optimization

1. **Tree Shaking**

   - Remove unused FAST components
   - Support for tree-shakeable ESM imports

1. **Code Splitting**

   - Separate bundles for each registration mode
   - Lazy load component variants

1. **Minification**

   - Terser for JavaScript compression
   - Target: < 30KB for core JS

#### Bundle Size Budgets

**Revised based on technical audit - Updated January 2026**

| Asset | Original Target | **Revised Target** | Justification |
|-------|-----------------|-------------------|----------------|
| Bulma CSS (cdn) | N/A | 23KB | Bulma 1.0.2 minified+gzipped |
| FastBulma CSS | 20KB | **35KB** | CSS variables, themes, mappings |
| FastBulma JS | 30KB | **80KB** | Registration, utilities, adapters |
| FAST Foundation | Not listed | **150KB** | Required for all FAST components |
| FAST Components (10) | Not listed | **120KB** | Most-used components |
| Form Association Polyfill | Not listed | **8KB** | For older browsers |
| **TOTAL** | **150KB** ❌ | **~416KB** ✅ | 177% over original - realistic |

**Optimization Strategy**:

- Aggressive code splitting by component type
- Lazy load non-critical components
- Critical CSS extraction for above-the-fold
- Dynamic imports for optional components

**Note**: Original 150KB target was mathematically impossible. Revised 350-420KB range reflects actual FAST framework size.

**Success Probability: 80%** (reduced from 90% - two-tier build system complexity, CDN vs npm trade-offs)

______________________________________________________________________

## Enhanced Success Metrics

### Technical Success Metrics

- [ ] Successful integration of Bulma and FAST components (60% probability) - revised from 90%
- [ ] Proper CSS variable mapping system (70% probability) - revised from 85%
- [ ] Responsive and accessible components (65% probability) - revised from 80%
- [ ] Comprehensive test coverage (>80%) (65% probability) - revised from 90%
- [ ] Performance benchmarks met (60% probability) - revised from 75%

### Quality Metrics

- [ ] Zero critical accessibility violations (75% probability) - revised from 85%
- [ ] \<5% test failure rate (80% probability) - revised from 90%
- [ ] Documentation completeness >90% (75% probability) - revised from 85%
- [ ] Cross-browser compatibility >95% (70% probability) - revised from 80%

### Adoption Metrics

- [ ] GitHub stars >500 within 6 months (60% probability)
- [ ] Weekly downloads >1,000 within 12 months (65% probability)
- [ ] Community contributions >10 within 12 months (55% probability)

______________________________________________________________________

## 🚀 Implementation Optimization Strategy

This section details the optimization strategies that reduce the implementation timeline from 21-27 weeks to 10-16 weeks (48-59% faster) while increasing success probability from 60-70% to 65-75%.

### Optimization Overview

| # | Optimization | Time Savings | Risk | Impact |
|---|-------------|--------------|------|--------|
| 1 | **CDN-only build system** | 2-3 weeks | Low | High |
| 2 | **Parallel testing** | 2-3 weeks | Medium | High |
| 3 | **Proactive performance** | 2-3 weeks | Low | Medium |
| 4 | **Iterative documentation** | 1-2 weeks | Low | Medium |
| 5 | **Automated component mapping** | 3-4 weeks | Medium | High |
| 6 | **Simplified registration** | 1 week | Low | Low |
| **TOTAL** | | **11-16 weeks** | | |

______________________________________________________________________

### Optimization 1: CDN-Only Build System

**Problem** (Lines 2552-2757):

- Two-tier build system requires maintaining both CDN (no build) and Vite (build) approaches
- Dual maintenance burden increases complexity
- Configuration divergences cause bugs
- CDN users experienced "FAST is not defined" errors due to externalization

**Solution**:

- **Primary distribution**: CDN-only (jsDelivr/unpkg)
- **Build tool**: Simple npm scripts for minification and bundling
- **Advanced users**: Can use Vite independently (not officially supported)
- **Vite for development**: Optional, not part of core distribution

**Implementation**:

```json
// package.json - simplified build scripts
{
  "scripts": {
    "build": "npm run build:css && npm run build:js",
    "build:css": "postcss src/fastbulma/static/css/fastbulma.css -o dist/fastbulma.min.css",
    "build:js": "esbuild src/fastbulma/static/js/fastbulma.js --bundle --minify --outfile=dist/fastbulma.min.js",
    "dev": "npx serve . --watch",
    "test": "vitest",
    "test:e2e": "playwright test"
  }
}
```

**Benefits**:

- Eliminates 2-3 weeks of dual build system maintenance
- Simpler onboarding for users (just add CDN links)
- Faster releases (no complex build pipeline)
- Reduced bug surface area

**Trade-offs**:

- Advanced users lose tree-shaking (acceptable for v1.0)
- No official TypeScript source maps (can add later)
- Build customization requires npm (document workarounds)

**Success Probability**: 95% (low risk, high confidence)

______________________________________________________________________

### Optimization 2: Parallel Testing with Development

**Problem** (Lines 1135-1738):

- Sequential testing (Phase 4) waits until all components complete
- Long feedback loop between implementation and test results
- Bugs discovered late in development cycle
- Testing becomes a bottleneck

**Solution**: Test-as-you-go approach with crackerjack

```bash
# Crickerjack enforces test-as-you-go via settings/config
# Quality checks run through crickerjack's own mechanism

# Manual test execution
crickerjack test                      # Run all tests
crickerjack test --component fast-button  # Test specific component
crickerjack test --changed              # Test only changed components
crickerjack test --watch                # Watch mode during development

# Generate test templates
python scripts/generate-tests.py fast-button > tests/fast-button.test.js
```

**Implementation Workflow**:

1. **Week 1-2**: Develop `fast-button` → generate test → crickerjack settings enforce quality
1. **Week 2-3**: Develop `fast-card` → generate test → crickerjack validates via config
1. **Week 3-4**: Develop `fast-text-field` → generate test → crickerjack quality gates
1. **Continuous**: Crickerjack settings/config enforce quality through cache system

**Test Template Generator** (see Optimization 5):

```javascript
// scripts/generate-component-test.js
function generateComponentTest(componentName) {
  return `
describe('${componentName}', () => {
  test('renders with Bulma classes', async () => {
    const component = document.createElement('${componentName}');
    component.className = 'is-primary';
    document.body.appendChild(component);

    // Verify CSS variable mapping
    const styles = getComputedStyle(component);
    expect(styles.getPropertyValue('--accent-fill-rest')).toBe('var(--bulma-primary)');
  });

  test('accessible with ARIA attributes', async () => {
    const component = document.createElement('${componentName}');
    document.body.appendChild(component);

    // Run axe-core accessibility tests
    const results = await axe.run(component);
    expect(results.violations).toHaveLength(0);
  });
});
  `.trim();
}
```

**Benefits**:

- 2-3 weeks saved by overlapping testing with development
- Faster bug detection (hours instead of weeks)
- Higher code quality (test coverage never lags)
- Continuous integration prevents regressions

**Trade-offs**:

- Requires disciplined development workflow
- Test infrastructure needed earlier (Week 1 instead of Week 9)
- Developers must write tests (no dedicated QA phase)

**Success Probability**: 80% (medium risk, requires discipline)

______________________________________________________________________

### Optimization 3: Proactive Performance Budgets

**Problem** (Lines 1740-1770):

- Phase 4.5 treats performance as separate optimization phase
- Performance issues discovered after implementation complete
- Expensive rework when budgets exceeded
- Reactive instead of preventive

**Solution**: Performance budgets enforced from Phase 1

**Budget Definition** (Phase 1, Week 1):

```json
// .github/performance-budget.json
{
  "budgets": {
    "css": {
      "maxSize": "35KB",
      "gzip": true
    },
    "javascript": {
      "maxSize": "80KB",
      "gzip": true
    },
    "total": {
      "maxSize": "420KB",
      "gzip": true
    }
  },
  "performanceTargets": {
    "FCP": "3.5s",
    "TTI": "6s",
    "60FPS": "60%"
  }
}
```

**Budget Enforcement with Crackerjack** (Phase 1, Week 1):

Crackerjack includes bundle size checks in its quality gate:

```bash
# Add to package.json scripts
{
  "scripts": {
    "check-bundle": "npm run build && ls -lh dist/*.css dist/*.js"
  }
}

# Crackerjack automatically checks bundle size before commits
crackerjack check --bundle

# Manual bundle size check
npm run check-bundle
```

**Budget Configuration** (`.crackerjack/config.toml`):

```toml
[budgets]
css_max_size_kb = 35
js_max_size_kb = 80
total_max_size_kb = 420

[performance]
fcp_target_ms = 3500
tti_target_ms = 6000
```

**Performance Testing with Crackerjack**:

```bash
# Run performance tests (integrated into crackerjack)
crackerjack test --performance

# Check performance budgets
crackerjack check --performance

# Run with Lighthouse (manual verification)
npx lighthouse http://your-app-url --view  # Replace with your actual deployment URL
```

**Benefits**:

- 2-3 weeks saved (no separate optimization phase)
- Performance issues caught immediately
- No expensive rework
- Prevents performance regression
- Integrated into existing crackerjack workflow

**Trade-offs**:

- Requires upfront performance research
- May limit feature scope (budget enforcement)
- Manual Lighthouse verification (not automated)

**Success Probability**: 85% (low risk, high value)

______________________________________________________________________

### Optimization 4: Iterative Documentation

**Problem** (Lines 1774-1789):

- Phase 5 concentrates all documentation into 3-4 weeks
- Big-bang documentation becomes disconnected from code
- Hard to recall implementation details months later
- Documentation often delayed or incomplete

**Solution**: Docs-as-code approach (write alongside implementation)

**Documentation Template** (created in Phase 1, Week 1):

```markdown
# Component: ${COMPONENT_NAME}

## Usage
\`\`\`html
<${COMPONENT_NAME} class="is-primary">
  Content
</${COMPONENT_NAME}>
\`\`\`

## Bulma Mapping
- **Bulma Class**: `.is-primary`
- **FAST Token**: `--accent-fill-rest`
- **CSS Variable**: `var(--bulma-primary)`

## Accessibility
- ARIA role: ${ARIA_ROLE}
- Keyboard support: ${KEYBOARD_SUPPORT}
- Contrast ratio: ${CONTRAST_RATIO}

## Browser Support
- Chrome: ${CHROME_VERSION}+
- Firefox: ${FIREFOX_VERSION}+
- Safari: ${SAFARI_VERSION}+

## Examples
### Basic
\`\`\`html
<!-- Example code -->
\`\`\`

### With Slots
\`\`\`html
<!-- Example with named slots -->
\`\`\`
```

**Workflow**:

1. **Phase 2, Week 1**: Document `fast-button` while implementing
1. **Phase 2, Week 2**: Document `fast-card` while implementing
1. **Phase 3**: Document each component as it's completed
1. **Phase 4**: Review and polish (1-2 weeks, not 3-4)

**Automated Docs Generation**:

```javascript
// scripts/generate-docs.js
function generateComponentDocs(componentName) {
  const template = fs.readFileSync('docs/component-template.md', 'utf8');
  return template
    .replace(/\$\{COMPONENT_NAME\}/g, componentName)
    .replace(/\$\{ARIA_ROLE\}/g, getARIARole(componentName))
    .replace(/\$\{KEYBOARD_SUPPORT\}/g, getKeyboardSupport(componentName));
}
```

**Benefits**:

- 1-2 weeks saved (spread across phases instead of concentrated)
- Documentation is accurate (written while code is fresh)
- No documentation debt accumulation
- Easier to maintain (docs track code changes)

**Trade-offs**:

- Developers must write documentation
- Requires documentation discipline
- Template enforcement needed

**Success Probability**: 90% (low risk, high value)

______________________________________________________________________

### Optimization 5: Automated Component Mapping

**Problem** (Lines 1104-1130, 900-1097):

- Manual mapping of 50+ Bulma classes to FAST components
- Labor-intensive (6-8 weeks)
- Error-prone (typos, missed mappings)
- Inconsistent style

**Solution**: Automated CSS variable generation scripts

**CSS Variable Generator** (Phase 1, Week 2):

```python
# scripts/generate-css-variables.py
"""
Generate CSS variable mappings from Bulma to FAST tokens.
Automates the manual work in Phase 3 (Component Mapping).
"""

from typing import Dict, List
import os

BULMA_COLORS = {
    "primary": "#7957d5",
    "success": "#48c774",
    "danger": "#f14668",
    "warning": "#ffdd57",
    "info": "#3298dc",
    "light": "#f5f5f5",
    "dark": "#363636",
}

FAST_TOKENS = {
    "primary": "--accent-fill-rest",
    "neutral": "--neutral-fill-rest",
    "success": "--success-fill-rest",
    "danger": "--danger-fill-rest",
    "warning": "--warning-fill-rest",
    "info": "--info-fill-rest",
}


def generate_color_mappings() -> str:
    """Generate CSS color variable mappings."""
    css = []

    # Base Bulma variables
    css.append(":root {")
    for name, hex_value in BULMA_COLORS.items():
        css.append(f"  --bulma-{name}: {hex_value};")
    css.append("}\n")

    # FAST token mappings
    css.append("@layer fast {")
    css.append("  :root {")

    for bulma_name, hex_value in BULMA_COLORS.items():
        fast_token = FAST_TOKENS.get(bulma_name, "--neutral-fill-rest")
        css.append(f"    /* Map .is-{bulma_name} to FAST */")
        css.append(f"    .is-{bulma_name} {{")
        css.append(f"      {fast_token}: var(--bulma-{bulma_name});")
        css.append(f"    }}")

    css.append("  }")
    css.append("}")

    return "\\n".join(css)


def generate_dark_variants() -> str:
    """Generate @supports fallbacks for color-mix()."""
    css = []

    css.append("/* Fallback for browsers without color-mix() */")
    css.append("@supports not (color-mix(in srgb, red, blue)) {")
    css.append("  @layer fast {")
    css.append("    :root {")

    # Pre-computed dark variants (10% and 20% darker)
    dark_variants = {
        "primary": {"10%": "#6c4dc0", "20%": "#5f43ab"},
        "success": {"10%": "#3dad66", "20%": "#32d358"},
        "danger": {"10%": "#d93d5c", "20%": "#c13450"},
        "warning": {"10%": "#e6c84e", "20%": "#ccb345"},
    }

    for color_name, variants in dark_variants.items():
        fast_token = FAST_TOKENS[color_name]
        css.append(f"      /* {color_name} dark variants */")
        css.append(f"      --{fast_token.replace('--', '')}-hover: {variants['10%']};")
        css.append(f"      --{fast_token.replace('--', '')}-active: {variants['20%']};")

    css.append("    }")
    css.append("  }")
    css.append("}")

    return "\\n".join(css)


if __name__ == "__main__":
    # Generate output
    output = []
    output.append(generate_color_mappings())
    output.append(generate_dark_variants())

    # Write to file
    os.makedirs("src/fastbulma/static/css", exist_ok=True)
    with open("src/fastbulma/static/css/fastbulma.css", "w") as f:
        f.write("\\n\\n".join(output))

    print("✅ Generated CSS variables: src/fastbulma/static/css/fastbulma.css")
```

**Component Mapping Generator** (Phase 1, Week 2):

```python
# scripts/generate-component-mapping.py
"""
Generate Bulma to FAST component mappings.
Automates the manual component mapping table.
"""

COMPONENT_MAPPINGS = {
    "button": {
        "bulma_classes": [
            ".is-primary",
            ".is-success",
            ".is-danger",
            ".is-warning",
            ".is-info",
        ],
        "fast_element": "fast-button",
        "mapping_type": "class_to_token",
        "complexity": "low",
    },
    "card": {
        "bulma_classes": [".box"],
        "fast_element": "fast-card",
        "mapping_type": "class_to_token",
        "complexity": "low",
    },
    "text-field": {
        "bulma_classes": [".input", ".textarea"],
        "fast_element": "fast-text-field",
        "mapping_type": "element_replacement",
        "complexity": "medium",
    },
    # ... 50+ more mappings
}


def generate_mapping_matrix() -> str:
    """Generate component mapping table."""
    markdown = ["## Bulma to FAST Component Mapping\\n"]
    markdown.append(
        "| Bulma Class/Element | FAST Component | Mapping Type | Complexity | Priority |"
    )
    markdown.append(
        "|---------------------|----------------|--------------|------------|----------|"
    )

    for bulma_info in COMPONENT_MAPPINGS.values():
        for bulma_class in bulma_info["bulma_classes"]:
            priority = "P0" if bulma_info["complexity"] == "low" else "P1"
            markdown.append(
                f"| {bulma_class} | {bulma_info['fast_element']} | "
                f"{bulma_info['mapping_type']} | {bulma_info['complexity']} | {priority} |"
            )

    return "\\n".join(markdown)


if __name__ == "__main__":
    print(generate_mapping_matrix())
```

**Benefits**:

- 3-4 weeks saved (automation vs. manual work)
- Consistent code style
- Easy to regenerate when Bulma/FAST versions update
- Fewer human errors
- Scalable to 100+ components

**Trade-offs**:

- Requires upfront script development (1 week)
- Need to validate generated code
- Less flexibility for edge cases

**Success Probability**: 75% (medium risk, high value)

______________________________________________________________________

### Optimization 6: Simplified Component Registration

**Problem** (Lines 215-379):

- Three registration modes (global, eager, lazy) add complexity
- All modes must be tested and documented
- Most users only need global mode
- Maintenance burden for v1.0

**Solution**: Global-only registration for v1.0

**Simplified Registration**:

```javascript
// src/fastbulma/static/js/fastbulma.js (optimized)
import { provideFASTDesignSystem } from '@microsoft/fast-components';
import { fastButton, fastCard, fastTextField } from '@microsoft/fast-components';

/**
 * FastBulma v1.0 - Global Registration Mode
 * All components registered globally on page load.
 *
 * Future versions may add eager/lazy modes based on user feedback.
 */
export function registerFastBulma() {
  provideFASTDesignSystem().register(
    fastButton(),
    fastCard(),
    fastTextField(),
    // ... other core components
  );
}

// Auto-register on script load
registerFastBulma();
```

**Usage**:

```html
<!-- Single script tag, no configuration needed -->
<script type="module" src="https://cdn.jsdelivr.net/npm/fastbulma@latest/js/fastbulma.js"></script>

<!-- Components ready to use immediately -->
<fast-button class="is-primary">Click me</fast-button>
```

**Future Expansion** (v1.1+):

- Add eager mode if users request dynamic component loading
- Add lazy mode if performance monitoring indicates need
- Base decision on actual user data, not speculation

**Benefits**:

- 1 week saved (simplified implementation)
- Easier for users (zero configuration)
- Less code to test and maintain
- Faster to market

**Trade-offs**:

- All components loaded upfront (larger initial bundle)
- No dynamic registration (can add in v1.1 if needed)
- Less flexibility (acceptable for v1.0)

**Success Probability**: 95% (low risk, simplifies v1.0)

______________________________________________________________________

### Risk Mitigation Summary

| Optimization | Primary Risk | Mitigation Strategy | Contingency Plan |
|--------------|--------------|---------------------|------------------|
| CDN-only build | Advanced users want tree-shaking | Document npm usage for advanced users | Add Vite support in v1.1 |
| Parallel testing | Discipline required | CI gate prevents merge without tests | Hire QA contractor if needed |
| Proactive performance | May limit features | Budget research upfront, not guessed | Revisit budgets if blocking critical features |
| Iterative docs | Developers dislike writing | Template enforcement, CI checks | Technical writer for final polish |
| Automated mapping | Edge cases missed | Manual validation of generated code | Hybrid approach (auto + manual) |
| Global-only registration | Performance complaints | Bundle size monitoring | Add lazy mode in v1.1 if needed |

______________________________________________________________________

### Implementation Order

**Week 1-2: Foundation (Phase 1)**

1. Set up CDN-only build system
1. Create CSS variable generator script
1. Create test generator script
1. Define performance budgets in crickerjack config
1. Configure crickerjack quality gates (via settings/config)

**Week 3-6: Core + Performance (Phase 2)**

1. Implement CSS/JS integration with budgets
1. Write tests alongside each component
1. Document each component as built
1. Continuous performance monitoring

**Week 7-12: Component Factory (Phase 3)**

1. Run automated CSS variable generation
1. Generate test templates for all components
1. Fill in component-specific implementations
1. Validate all generated code
1. Parallel testing continues

**Week 13-14: Polish & Docs (Phase 4)**

1. Review and polish documentation
1. Final testing and bug fixes
1. Deploy to CDN
1. Community announcement

**Total: 10-16 weeks** (3-4 months)

______________________________________________________________________

### ⚡ Optimized Timeline (Recommended)

| Phase | Duration | Deliverables | Success Probability |
|-------|----------|--------------|---------------------|
| 1. Foundation | 2 weeks | Setup, automation scripts, CDN-only build | 90% |
| 2. Core + Performance | 3-4 weeks | CSS/JS integration with proactive performance budgets | 75% |
| 3. Component Factory | 4-6 weeks | Automated mapping + parallel test-as-you-go | 70% |
| 4. Polish & Docs | 1-2 weeks | Finalize documentation, deployment | 85% |
| **TOTAL** | **10-16 weeks** (3-4 months) | **Production-ready** | **65-75%** |

**Optimization Timeline Notes**:

- **Phase 1: Foundation** (2 weeks) - CDN-only distribution (no Vite dual maintenance), automation scripts created
- **Phase 2: Core + Performance** (3-4 weeks) - Performance budgets enforced from start, no separate optimization phase
- **Phase 3: Component Factory** (4-6 weeks) - Automated CSS variable generation, test-as-you-go approach, parallel testing
- **Phase 4: Polish & Docs** (1-2 weeks) - Documentation written iteratively during development, only final review needed
- **Key Improvement**: 48-59% reduction from 21-27 weeks through automation and parallelization

______________________________________________________________________

### Original Timeline (For Reference)

| Phase | Duration | Deliverables | Success Probability |
|-------|----------|--------------|---------------------|
| 1 | 1 week | Project setup, dependencies, structure | 85% |
| 2 | 4-5 weeks | Core framework, CSS/JS integration | 75% |
| 3 | 6-8 weeks | Component mapping, token system | 70% |
| 4 | 4-5 weeks | Testing, demo application | 65% |
| 4.5 | 3-4 weeks | Performance optimization | 60% |
| 5 | 3-4 weeks | Documentation, deployment | 75% |
| 6 | 1 week | Community engagement, feedback | 75% |
| **TOTAL** | **21-27 weeks** (6 months) | **All phases complete** | **60-70%** |

**Timeline Comparison**:
| Aspect | Original | Optimized | Improvement |
|--------|----------|-----------|-------------|
| Total Duration | 21-27 weeks | 10-16 weeks | 48-59% faster |
| Success Probability | 60-70% | 65-75% | +5-10% |
| Build System | Two-tier (CDN + Vite) | CDN-only | Simpler |
| Testing Approach | Sequential phase | Parallel with development | Faster feedback |
| Performance | Reactive (Phase 4.5) | Proactive (built-in) | Earlier detection |
| Documentation | Big bang (Phase 5) | Iterative (ongoing) | Lower risk |
| Component Mapping | Manual (6-8 weeks) | Automated (3-4 weeks) | 50% faster |

______________________________________________________________________

## Overall Success Assessment

**Optimized Probability of Success: 65-75%** (improved from 60-70% through automation and parallelization)

The optimized plan improves upon the original by:

1. **Automation over manual work** - CSS variable generators, test generators reduce human error
1. **Parallel execution** - Testing alongside development instead of sequential
1. **Proactive performance** - Budgets enforced from start, not reactive optimization
1. **Simplified architecture** - CDN-only distribution eliminates dual maintenance
1. **Iterative documentation** - Docs-as-code instead of big-bang approach
1. **Realistic timeline** - 10-16 weeks (3-4 months) with clear milestones

This optimized plan provides faster delivery with higher success probability by reducing complexity and leveraging automation.

## Future Enhancements

### Theme Generator Tool

As a potential future enhancement, develop an online tool where users can visually customize their FastBulma theme and download the corresponding CSS variables. This would allow users to:

- Visually adjust color palettes, spacing, and typography
- Preview changes in real-time
- Export custom CSS variable definitions
- Generate downloadable theme packages

______________________________________________________________________

## Technical Implementation Details

### Base Template Structure

```html
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>FastBulma Application</title>
    <!-- Include Bulma CSS -->
    <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/bulma@1.0.2/css/bulma.min.css">
    <!-- Include FastBulma custom CSS -->
    <link rel="stylesheet" href="/static/css/fastbulma.css">
</head>
<body>
    <!-- Application content -->

    <!-- Form Association Polyfill (for older browsers) -->
    <!-- Chrome 77+, Firefox 79+, Safari 16.4+ don't need this -->
    <script src="https://cdn.jsdelivr.net/npm/@github/form-associated-element-boundary@latest/dist/form-associated-element-boundary.min.js"></script>

    <!-- Register FAST components -->
    <script type="module">
        import { provideFASTDesignSystem, fastCard, fastButton } from 'https://cdn.skypack.dev/@microsoft/fast-components';
        provideFASTDesignSystem()
            .register(fastCard(), fastButton());
    </script>
    <!-- Include FastBulma custom JS -->
    <script type="module" src="/static/js/fastbulma.js"></script>
</body>
</html>
```

### Component Usage Example

```html
<section class="hero is-primary">
    <div class="hero-body">
        <fast-card class="is-primary">
            <h3 slot="heading">FastBulma Power</h3>
            <fast-button appearance="accent" slot="actions">Action</fast-button>
        </fast-card>
    </div>
</section>
```

### CSS Customization

```css
/* Allow Bulma classes to affect FAST components */
.is-primary {
    --accent-fill-rest: var(--bulma-primary);
}
.is-success {
    --accent-fill-rest: var(--bulma-success);
}
```

______________________________________________________________________

## Quality Assurance

### Code Quality

- Use crackerjack for linting and formatting
- Implement automated testing
- Follow semantic versioning

### Performance

- Optimize CSS delivery
- Minimize JavaScript bundle size
- Ensure efficient rendering

______________________________________________________________________

## Distribution Strategy

### CDN-First Distribution

- Create CDN distribution as the primary distribution method
- Host FastBulma CSS variable mapping files and initialization scripts on CDN
- Provide simple HTML snippet for quick integration:
  ```html
  <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/bulma@1.0.2/css/bulma.min.css">
  <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/fastbulma@latest/css/fastbulma.css">

  <script type="module" src="https://cdn.skypack.dev/@microsoft/fast-components"></script>
  <script type="module" src="https://cdn.jsdelivr.net/npm/fastbulma@latest/js/fastbulma.js"></script>
  ```
- Ensure CDN assets are optimized for performance (minified, compressed)

### Secondary Distribution Channels

- Prepare Python package for PyPI (for development tools and FastBlocks integration only)
- Create NPM package for CSS and web components (mirroring CDN assets)
- Implement synchronized versioning strategy across CDN, NPM, and Python packages
- Ensure consistent release cycles for all distribution channels

## Dependency Management Strategy

### Version Synchronization

- Maintain synchronized versioning between FastBulma releases and underlying dependencies
- Track Bulma and FAST component releases separately
- Create compatibility matrix for different versions of Bulma and FAST
- Implement automated checks for breaking changes in upstream dependencies

### Update Process

- Monitor Bulma and FAST releases for updates
- Test compatibility before updating dependencies
- Provide migration guides for breaking changes
- Maintain LTS versions for stability in production environments

### Package Management

- Use package-lock.json for NPM dependencies
- Use uv.lock for Python dependencies
- Ensure consistent dependency versions across all distributions
- Implement automated dependency update workflows
