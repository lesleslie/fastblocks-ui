# FastBlocks UI

[![Code style: crackerjack](https://img.shields.io/badge/code%20style-crackerjack-000042)](https://github.com/lesleslie/crackerjack)
[![Runtime: oneiric](https://img.shields.io/badge/runtime-oneiric-6e5494)](https://github.com/lesleslie/oneiric)
[![uv](https://img.shields.io/endpoint?url=https://raw.githubusercontent.com/astral-sh/uv/main/assets/badge/v0.json)](https://github.com/astral-sh/uv)
[![Python: 3.13+](https://img.shields.io/badge/python-3.13%2B-green)](https://www.python.org/downloads/)

FastBlocks UI is a modern HTML/CSS-first UI layer with a stable `ui-*` namespace, Jinja/FastBlocks helpers, and optional enhancement JavaScript. It is the successor to the archived `fastbulma` project and is built as a clean-slate system with no compatibility bridge and no Sass/build-tool requirement.

## Features

- **HTML/CSS First**: Uses semantic markup, CSS variables, and cascade layers as the foundation
- **Template Helpers**: Ships Python helpers for Jinja, async Jinja, and FastBlocks rendering
- **htmx Safe**: Keeps IDs, form fields, and interaction state in normal light DOM markup
- **Optional Enhancement JS**: Keeps behavior light and progressive-enhancement friendly
- **Modern Styling**: Uses a Tailwind-inspired semantic token baseline with custom visuals
- **Permissive License**: BSD-3-Clause for commercial and open-source use

## Component Model

FastBlocks UI components are standard HTML patterns with `ui-*` classes and
helper-backed server rendering. The v1 runtime does not register Custom Elements
and does not use shadow DOM by default. htmx targets, triggers, and swapped
regions should remain normal light DOM nodes so the server stays authoritative
for selected tabs, open menus, form state, and validation state.

Optional light-DOM Custom Elements such as `<ui-tabs>`, `<ui-dialog>`, and
`<ui-menu>` are available as opt-in wrappers around the canonical helper output
and are tracked in [docs/light-dom-custom-elements-spec.md](docs/light-dom-custom-elements-spec.md).

## Installation

Install using pip:

```bash
pip install fastblocks-ui
```

Then copy the assets to your project:

```bash
fastblocks-ui copy-assets --dest ./static
```

## Usage

Once installed, you can use the `ui-*` classes and Python helpers with server-rendered HTML:

```html
<div class="ui-card">
  <div class="ui-card__header">Card Title</div>
  <div class="ui-card__body">
    This is a FastBlocks UI card styled with semantic tokens.
  </div>
  <footer class="ui-card__footer">
    <button class="ui-button is-primary" type="button">Action</button>
  </footer>
</div>
```

For full examples covering sync Jinja, async Jinja, and htmx fragments, see [docs/usage.md](docs/usage.md).
The component manifest is documented in [docs/components.md](docs/components.md).
PWA-friendly app integration notes live in [docs/pwa.md](docs/pwa.md).
Theming recipes live in [docs/theming-recipes.md](docs/theming-recipes.md).

## Template Examples

### Sync Jinja

```jinja
{{ button("Save changes", variant="primary", type="submit") }}
```

### Async Jinja

```python
template = env.get_template("profile.html")
html = await template.render_async(user=user, button=button)
```

### htmx Fragment

```jinja
<form id="profile-form" hx-post="/profile" hx-target="#profile-form" hx-swap="outerHTML">
  {{ field(
    label="Email address",
    control_html=ui_input(id="profile-email", name="email", type="email", value=user.email)
  ) }}
  {{ button("Save", variant="primary", type="submit") }}
</form>
```

## Theming

FastBlocks UI enables flexible theming through CSS variables:

```css
:root {
  --ui-color-primary: #e040fb;
  --ui-radius-md: 8px;
  --ui-color-success: #00c853;
}
```

FastBlocks UI components automatically inherit these changes through semantic token mapping.

## Components

FastBlocks UI centers its public surface on `ui-*` classes and helper APIs:

### Layout Components

- `ui-container` / `container()` - Centered max-width container
- `ui-columns` / `columns()` - 12-column responsive grid
- `ui-column` / `column()` - Individual column in grid
- `ui-section` / `section()` - Vertical spacing container
- `ui-footer` / `footer()` - Page footer
- `ui-level` / `level()` - Horizontal toolbar/nav
- `ui-hero` / `hero()` - Full-width banner section
- `ui-title` / `title()` - Typography title
- `ui-media` / `media()` - Image + text pair
- `ui-tile` / `tile()` - Hierarchical tile layout

### UI Components

- `ui-button` / `button()` - Buttons
- `ui-card` / `card()` - Cards
- `ui-field` / `field()` - Form groups
- `ui-input` / `input()` - Form inputs
- `ui-select` / `select()` - Select dropdowns
- `ui-checkbox` / `checkbox()` - Checkboxes
- `ui-switch` / `switch()` - Toggle switches
- `ui-dialog` / `dialog()` - Modal dialogs
- `ui-tabs` / `tabs()` - Tabbed interfaces
- `ui-menu` / `menu()` - Menus
- `ui-alert` / `alert()` - Alerts

## License

BSD-3-Clause
