# FastBlocks UI Package Documentation

FastBlocks UI is a modern HTML/CSS-first UI layer with a stable `ui-*` namespace, Jinja/FastBlocks helpers, and optional enhancement JavaScript. It is the successor to the archived `fastbulma` project and is built as a clean-slate system with no compatibility bridge and no Sass/build-tool requirement.

## Framework Overview

FastBlocks UI now uses a layered architecture that separates concerns between semantic HTML/CSS primitives, template helpers, and optional enhancement JavaScript.

### Core Features

- Semantic HTML and CSS variables
- Python helpers for Jinja and FastBlocks rendering
- htmx-safe light DOM fragments
- Optional progressive-enhancement JavaScript
- Tailwind-inspired semantic token baseline with custom visuals
- BSD-3-Clause licensed, no build tools required

### Component Model

FastBlocks UI components are standard HTML patterns with `ui-*` classes and
helper-backed server rendering. The v1 runtime does not register Custom Elements
and does not use shadow DOM by default. Optional JavaScript enhances existing
markup instead of becoming the rendering source of truth.

Optional light-DOM Custom Elements such as `<ui-tabs>`, `<ui-dialog>`, and
`<ui-menu>` are available as opt-in wrappers around the canonical helper output
and are tracked in [docs/light-dom-custom-elements-spec.md](docs/light-dom-custom-elements-spec.md).

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

For template and htmx examples, see [docs/usage.md](docs/usage.md).
The component manifest is documented in [docs/components.md](docs/components.md).
PWA-friendly app integration notes live in [docs/pwa.md](docs/pwa.md).
Theming recipes live in [docs/theming-recipes.md](docs/theming-recipes.md).

### Sync Jinja

```jinja
{{ button("Save changes", variant="primary", type="submit") }}
```

### Async Jinja

```python
html = await template.render_async(user=user, button=button, field=field)
```

### htmx

```jinja
<form id="profile-form" hx-post="/profile" hx-target="#profile-form" hx-swap="outerHTML">
  {{ field(label="Email address", control_html=ui_input(id="profile-email", name="email")) }}
  {{ button("Save", variant="primary", type="submit") }}
</form>
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
import { initFastBlocksUI } from './static/js/fastblocks-ui.js';

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
- `ui-drawer` - Off-canvas panel built on the Popover API
- `ui-burger` - Burger button that toggles a drawer
- `ui-tabs` - Tabbed interfaces
- `ui-menu` - Menus
- `ui-alert` - Alerts

### Layout and Navigation

- `ui-shell` - Full-bleed page shell with an optional aside column
- `ui-container` - Centered max-width container
- `ui-columns` / `ui-column` - 12-column responsive grid
- `ui-section` - Vertical spacing container
- `ui-footer` - Page footer
- `ui-level` - Horizontal toolbar/nav
- `ui-hero` - Full-width banner section
- `ui-title` - Typography title
- `ui-media` - Image + text pair
- `ui-tile` - Hierarchical tile layout
- `ui-navbar` - Navigation bar; add `is-sticky` to fix it to the top
- `ui-breadcrumb` - Navigation trail
- `ui-nav-list` - Vertical navigation list for sidebars and drawers
- `ui-nav-groups` - Labelled groups of vertical navigation links

The full table, including the `ui-*` utility classes, lives in
[docs/components.md](docs/components.md).

### Page Shell

`shell()` renders a CSS grid: a single column below 1024px, and main plus aside
above it. `--ui-shell-max` defaults to `none`, so the shell is genuinely
edge-to-edge; `--ui-shell-aside-width` defaults to `16rem`. Both are settable
per call:

```python
from fastblocks_ui import shell

html = shell(main_markup, aside=aside_markup, aside_width="18rem", max_width="90rem")
```

The aside is rendered after `<main>` in the DOM because it is the right-hand
column in LTR, so DOM order matches visual order. Pair it with a skip link so
keyboard users are not forced through the whole main column to reach it.

## Browser Support

- Chrome (latest 2 versions)
- Firefox (latest 2 versions)
- Safari (latest 2 versions)
- Edge (latest 2 versions)

Two features degrade rather than break outside that range:

- `ui-drawer` needs the Popover API. Without it the panel renders in the normal
  flow instead of the top layer, and the burger cannot toggle it.
- `.ui-navbar.is-sticky`'s scroll-driven reveal is wrapped in
  `@supports (animation-timeline: view())` and additionally gated on
  `prefers-reduced-motion: no-preference` and a 1024px minimum width. Anywhere
  the gate does not pass — including Firefox stable, where scroll-driven
  animations were still behind `layout.css.scroll-driven-animations.enabled`
  when this was last checked (Firefox 152, 2026-07-28) — the bar is simply
  always visible and its height is reserved on `body`. That is a supported
  rendering, and both paths are covered by the e2e suite.

## License

BSD-3-Clause
