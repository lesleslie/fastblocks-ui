# New Package Next Steps

This document turns the architecture draft into a practical starting plan.
Public name: `FastBlocks UI`.

## V1 Scope

The first version should stay small and opinionated.

### Core Foundations

- token system
- theme files
- base reset / normalize layer
- utility classes
- component class layer

### Core Components

- button
- card
- field
- input
- select
- checkbox
- switch
- dialog
- tabs
- menu
- alert

### Core Integrations

- Jinja helper layer
- async Jinja compatibility
- FastBlocks helpers
- htmx-safe markup
- optional enhancement JS

### Explicitly Out of Scope for V1

- deep client-side state management
- shadow DOM by default
- hydration framework
- semantic table styling and any table abstraction beyond native HTML
- data grid / complex table abstraction
- toast system
- charts
- icon system with a bundled icon font
- framework-specific React/Vue/Svelte wrappers

## Package / Module Tree

Suggested package layout:

```text
src/
  fastblocks_ui/
    __init__.py
    cli.py
    tokens.py
    theme.py
    helpers.py
    renderers.py
    htmx.py
    fastblocks.py
    components/
      __init__.py
      button.py
      card.py
      field.py
      input.py
      select.py
      checkbox.py
      switch.py
      dialog.py
      tabs.py
      menu.py
      alert.py
    templates/
      __init__.py
      macros/
      fragments/
    assets/
      css/
        base.css
        tokens.css
        components.css
        utilities.css
        themes/
          default.css
          dark.css
      js/
        enhance.js
```

## API Shape

Preferred helper shape:

```python
button("Save", variant="primary", href=None, **attrs)
card(title="Title", body="...", footer=None, **attrs)
field(label="Email", input_html="...", help_text=None, error_text=None, **attrs)
```

Rules:

- helpers return HTML-safe markup
- helpers accept arbitrary HTML attributes
- helpers should not assume a browser-side runtime
- helpers should work in sync and async template contexts
- macros, blocks, and fragments should reuse the same render helpers
- htmx-sensitive components should expose stable IDs and server-owned state

Namespace contract:

- public CSS classes use the `ui-*` namespace
- the namespace stays stable across the eventual package rename

## Theme System

Theme files should be layered in this order:

1. reset/base
2. tokens
3. components
4. utilities
5. theme overrides
6. app overrides

Tokens should be semantic, not framework-specific.
The default palette should use Tailwind's default color scale as its baseline, exposed through semantic tokens instead of Tailwind utility classes.

Visual defaults:

- radius scale: `4px`, `6px`, `8px`
- crisp `1px` borders with strong focus states
- restrained shadows reserved mostly for overlays
- Tailwind default colors mapped into semantic tokens and tuned for contrast
- clean tool-friendly typography with system fallbacks
- fine-line separators, subtle rails, corner accents, and stepped details
- quick reduced-motion-aware transitions
- calm premium light theme and refined contrast-safe dark theme

## htmx Rules

- output must be valid standalone HTML
- component state must survive partial swaps
- form markup must remain native
- event hooks should use standard bubbling events where possible
- fragments should render cleanly into swapped regions
- swapped interactive fragments should use stable IDs and server-owned state

## Implementation Order

1. Tokens and base CSS
2. htmx-safe contract and accessibility rules
3. Button, card, field, and form controls
4. Jinja helpers
5. FastBlocks integration
6. htmx-safe interactive components
7. Optional enhancement JS
8. Documentation and smoke tests

## Naming Path

Final public name:

- `FastBlocks UI`

Internal package rename target:

- `fastblocks-ui`

Selection criteria:

- easy to say
- easy to type
- not tied to Bulma
- not tied to a specific framework
- available on package registries
