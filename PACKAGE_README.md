# FastBlocks UI Package Documentation

FastBlocks UI is a modern HTML/CSS-first UI layer with a stable `ui-*` namespace, Jinja/FastBlocks helpers, and optional enhancement JavaScript. It is built as a clean-slate system with no compatibility bridge and no Sass/build-tool requirement.

## Framework Overview

FastBlocks UI now uses a layered architecture that separates concerns between semantic HTML/CSS primitives, template helpers, and optional enhancement JavaScript.

### Core Features

- Semantic HTML and CSS variables
- Python helpers for Jinja and FastBlocks rendering
- Optional progressive-enhancement JavaScript
- Tailwind-inspired semantic token baseline with custom visuals
- BSD-3-Clause licensed, no build tools required

### Architecture

FastBlocks UI uses a tokenized CSS architecture with semantic classes and optional enhancement JavaScript:

```css
/* 1. Define semantic variables at document root */
:root {
  --ui-color-primary: #7957d5;
  --ui-radius-md: 4px;
  --ui-font-size-base: 1rem;
}

/* 2. Component classes consume those tokens */
.ui-button.is-primary {
  --ui-color-primary: #7957d5;
}

/* 3. Template helpers emit standard HTML */
<button class="ui-button is-primary">Save</button>
```

## Python Package

The FastBlocks UI Python package provides utilities for managing the framework assets and integrating with Python-based web frameworks.

### Installation

```bash
pip install fastblocks-ui
```

### Usage

```python
from fastblocks_ui import get_css_path, get_js_path
from fastblocks_ui.cli import copy_assets

# Get paths to static assets
css_path = get_css_path()
js_path = get_js_path()

# Copy assets to a destination directory
copy_assets("./static")
```

### CLI

The package includes a command-line interface for asset management:

```bash
# Copy assets to a destination directory
fastblocks-ui copy-assets --dest ./my-project/static
```

## JavaScript Integration

The JavaScript module adds optional behavior while preserving the HTML-first API:

```javascript
// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  window.fastBlocksUI = initFastBlocksUI();
});

// Enhance a subtree on demand
initFastBlocksUI(document.querySelector('[data-ui-tabs]'));
```

## Theming

Customize the theme by overriding CSS variables:

```css
:root {
  --ui-color-primary: #e040fb;
  --ui-radius-md: 8px;
  --ui-color-success: #00c853;
}
```

## Components

The main `ui-*` component classes are used by the template helpers and optional enhancement layer:

- `ui-button` - Buttons
- `ui-card` - Cards
- `ui-field` - Form groups
- `ui-input` - Form inputs
- `ui-select` - Select dropdowns
- `ui-checkbox` - Checkboxes
- `ui-switch` - Toggle switches
- `ui-dialog` - Modal dialogs
- `ui-tabs` - Tabbed interfaces
- `ui-menu` - Menus

## Browser Support

- Chrome (latest 2 versions)
- Firefox (latest 2 versions)
- Safari (latest 2 versions)
- Edge (latest 2 versions)

## License

BSD-3-Clause
