# FastBlocks UI Project Context

## Project Overview

FastBlocks UI is an HTML-first, CSS-first, template-first UI package for
FastBlocks, Jinja, and htmx applications. It ships static CSS and small optional
JavaScript enhancements while keeping server-rendered HTML as the primary
interface.

The archived FastBulma/FAST direction is historical context only. The active
package is not a FAST, Fluent, or `fast-*` compatibility layer.

## Active Product Contract

- Standard HTML should be usable before JavaScript loads.
- Public styling uses stable `ui-*` classes.
- Jinja and FastBlocks helpers emit the canonical markup.
- htmx swaps target normal light DOM nodes.
- JavaScript enhances dialogs, tabs, menus, and similar behavior only when it
  adds practical value.
- Custom Elements and shadow DOM are not part of the v1 runtime.

## Architecture

1. **Token system**: CSS variables for color, typography, spacing, radii,
   borders, shadows, focus, and motion.
1. **CSS layers**: Base, token, theme, utility, layout, and component styles
   remain separate in source and reproducible in the bundled entrypoint.
1. **Helper layer**: Python helpers render safe HTML strings for Jinja,
   FastBlocks, and direct use.
1. **Enhancement layer**: Vanilla JavaScript adds idempotent behavior for
   interactive patterns without taking ownership of rendering.
1. **Manifest**: `fastblocks_ui/manifest.json` is the supported component
   catalog for docs and validation scripts.

## File Structure

```text
fastblocks_ui/
  __init__.py
  cli.py
  fastblocks.py
  helpers.py
  manifest.json
  manifest.py
  static/
    css/
      base.css
      components.css
      fastblocks-ui.css
      layout.css
      tokens.css
      utilities.css
      themes/
    js/
      enhance.js
      fastblocks-ui.js
      manifest.js
docs/
  fastblocks-ui-implementation-plan.md
  usage.md
  components.md
scripts/
  generate-docs.py
  generate-tests.py
tests/
```

## Development Conventions

- Install dependencies through the documented Python workflow.
- Run Python tests with pytest and JavaScript checks through npm scripts.
- Keep helper output htmx-safe: state belongs in markup, not hidden client
  memory.
- Keep docs and generated examples aligned with `ui-*` classes and helper names.
- Do not reintroduce legacy FAST/Fluent runtime assumptions into active docs or
  scripts.

## Distribution

The package distributes CSS, JavaScript, the manifest, CLI helpers, and Python
rendering helpers through the Python package. Asset-copy behavior should remain
predictable and covered by tests when changed.
