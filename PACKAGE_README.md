# FastBulma Package Documentation

FastBulma is a framework that combines Bulma's battle-tested CSS utilities for layout and typography with Microsoft's FAST (Fancy App Styling and Tech) web components. The framework connects these two systems through CSS variables, allowing for seamless theming without requiring any build tools or Sass compilation.

## Framework Overview

The FastBulma framework uses a layered architecture that separates concerns between layout utilities (Bulma) and interactive components (FAST), connected through CSS variables and JavaScript adapters.

### Core Features
- Bulma utilities for page layout and typography (columns, hero, helpers)
- FAST Web Components with Bulma‑aligned tokens (colors, spacing, radius)
- Pure CSS customization via CSS vars
- Shadow DOM encapsulation for components
- MIT licensed, no build tools required

### Architecture

FastBulma uses a **CSS Variable Bridge Pattern** to connect Bulma classes with FAST components:

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
  --accent-fill-hover: color-mix(in srgb, var(--bulma-primary) 90%, black);
}

/* 3. FAST components inherit these variables across Shadow DOM */
<fast-button class="is-primary">
  <!-- Internally uses: --accent-fill-rest, etc. -->
</fast-button>
```

## Python Package

The FastBulma Python package provides utilities for managing the framework assets and integrating with Python-based web frameworks.

### Installation

```bash
pip install fastbulma
```

### Usage

```python
import fastbulma

# Get paths to static assets
css_path = fastbulma.get_css_path()
js_path = fastbulma.get_js_path()

# Copy assets to a destination directory
fastbulma.cli.copy_assets('./static')
```

### CLI

The package includes a command-line interface for asset management:

```bash
# Copy assets to a destination directory
fastbulma copy-assets --dest ./my-project/static
```

## JavaScript Integration

The JavaScript module initializes FAST components and provides utility functions:

```javascript
// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  window.fastBulma = new FastBulma();
});

// Change theme dynamically
window.fastBulma.setTheme('dark');

// Update CSS variables programmatically
window.fastBulma.setCSSVariable('--bulma-primary', '#ff0000');
```

## Theming

Customize the theme by overriding CSS variables:

```css
:root {
  --bulma-primary: #e040fb;
  --bulma-radius: 8px;
  --bulma-success: #00c853;
}
```

## Components

All FAST components work with Bulma classes:

- `fast-button` - Buttons with Bulma-style appearances
- `fast-card` - Cards with Bulma-style layouts
- `fast-text-field` - Form inputs with Bulma styling
- `fast-text-area` - Text areas with Bulma styling
- `fast-select` - Select dropdowns with Bulma styling
- `fast-checkbox` - Checkboxes with Bulma styling
- `fast-radio` - Radio buttons with Bulma styling
- `fast-switch` - Toggle switches
- `fast-dialog` - Modal dialogs
- `fast-tabs` - Tabbed interfaces
- `fast-anchor` - Hyperlinks
- `fast-progress` - Progress bars
- `fast-data-grid` - Data tables
- `fast-menu-button` - Dropdown menus

## Browser Support

- Chrome (latest 2 versions)
- Firefox (latest 2 versions)
- Safari (latest 2 versions)
- Edge (latest 2 versions)

## License

MIT
