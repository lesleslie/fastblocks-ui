# FastBlocks UI

[![Code style: crackerjack](https://img.shields.io/badge/code%20style-crackerjack-000042)](https://github.com/lesleslie/crackerjack)
[![Runtime: oneiric](https://img.shields.io/badge/runtime-oneiric-6e5494)](https://github.com/lesleslie/oneiric)
[![uv](https://img.shields.io/endpoint?url=https://raw.githubusercontent.com/astral-sh/uv/main/assets/badge/v0.json)](https://github.com/astral-sh/uv)
[![Python: 3.13+](https://img.shields.io/badge/python-3.13%2B-green)](https://www.python.org/downloads/)

FastBlocks UI is a modern HTML/CSS-first UI layer with a stable `ui-*` namespace, Jinja/FastBlocks helpers, and optional enhancement JavaScript. It is built as a clean-slate system with no compatibility bridge and no Sass/build-tool requirement.

## Features

- **HTML/CSS First**: Uses semantic markup, CSS variables, and cascade layers as the foundation
- **Template Helpers**: Ships Python helpers for Jinja, async Jinja, and FastBlocks rendering
- **Optional Enhancement JS**: Keeps behavior light and progressive-enhancement friendly
- **Modern Styling**: Uses a Tailwind-inspired semantic token baseline with custom visuals
- **Permissive License**: BSD-3-Clause for commercial and open-source use

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
PWA-friendly app integration notes live in [docs/usage.md](docs/usage.md).

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

- `ui-button`
- `ui-card`
- `ui-field`
- `ui-input`
- `ui-select`
- `ui-checkbox`
- `ui-switch`
- `ui-dialog`
- `ui-tabs`
- `ui-menu`
- `ui-alert`

## License

BSD-3-Clause
