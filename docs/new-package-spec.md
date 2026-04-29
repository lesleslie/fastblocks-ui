# New Package Architecture Spec

Public name: `FastBlocks UI`

This document defines a new HTML-first, CSS-first, template-first UI package that is being developed in this repository under the current source package and exposed publicly as FastBlocks UI.

The goal is to build a modern web UI system that:

- Uses standard HTML and CSS wherever possible
- Keeps JavaScript to a minimum
- Works naturally with htmx
- Works cleanly with Jinja templates, including async template integrations
- Integrates well with FastBlocks
- Preserves the practical value of Bulma's layout and component experience without copying its public identity

## Product Direction

This is not a compatibility package.
It is a new package that may reuse architectural lessons from Bulma, Kelp, and Web Awesome, but the implementation should be original and the public API should be its own.

## Design Principles

1. Prefer native HTML elements before custom abstractions.
1. Use CSS variables and cascade layers as the primary theming mechanism.
1. Keep JavaScript behavior optional and narrowly scoped.
1. Ensure every component works as server-rendered HTML first.
1. Make htmx integration a first-class requirement, not an adapter layer.
1. Make the template API feel natural in Jinja and FastBlocks.
1. Favor progressive enhancement over client-side hydration.

## Package Layout

Suggested source layout:

```text
src/
  fastblocks_ui/
    __init__.py
    tokens/
      tokens.css
      themes/
        default.css
        dark.css
    css/
      base.css
      components.css
      utilities.css
    js/
      enhance.js
    templates/
      jinja/
        macros/
        partials/
      fastblocks/
        blocks/
    components/
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
    cli.py
```

## Public API

The public API should have three layers.

### 1. HTML/CSS layer

The package should ship semantic HTML patterns and classes that work without JavaScript.
The public CSS namespace should be `ui-*` and should remain stable even if the package name changes later.

Example:

```html
<button class="ui-button is-primary">Save</button>
<div class="ui-card">
  <header class="ui-card__header">Title</header>
  <div class="ui-card__body">Content</div>
</div>
```

### 2. Template helper layer

The package should expose helper functions that render markup for Jinja and FastBlocks.

Example helper names:

- `button()`
- `card()`
- `field()`
- `input()`
- `select()`
- `checkbox()`
- `switch()`
- `dialog()`
- `tabs()`
- `menu()`
- `alert()`

These helpers should emit plain HTML and accept arbitrary HTML attributes.
Macros, blocks, and fragment helpers should all wrap the same rendering path so sync and async template environments stay aligned.

### 3. Optional behavior layer

The JavaScript layer should only implement interactive behaviors that cannot be done with HTML alone.

Candidate behaviors:

- dialog open/close
- tabs switching
- disclosure/menu toggles
- light DOM enhancements for accessibility

## Jinja Compatibility

The template API must support:

- standard Jinja2 templates
- `jinja2-async-environment`
- `starlette-async-jinja`
- FastBlocks template fragments and blocks

Implementation guidance:

- Prefer helper functions that return markup strings.
- Use blocks, fragments, includes, and macros as supported composition tools.
- Treat macros as a supported option across sync and async Jinja environments, but do not make them the only supported path.
- Avoid relying on template-time I/O.
- Avoid requiring template authors to know anything about the JavaScript runtime.

## htmx Compatibility

The package must be safe to use with htmx out of the box.

Rules:

- Render usable HTML before any JavaScript loads.
- Preserve stable IDs and form names.
- Avoid shadow DOM for default components.
- Keep triggers, swaps, and targets on normal DOM nodes.
- Do not hide critical content behind JS-only rendering.
- Ensure server-rendered fragments can replace or refresh components without extra client state.
- Require stable IDs and server-authoritative state for any component that can be swapped independently.

## Component Model

Component families should be narrow and semantic.

Suggested first release components:

- `button`
- `card`
- `field`
- `input`
- `select`
- `checkbox`
- `switch`
- `tabs`
- `dialog`
- `menu`
- `alert`

Semantic table styling can be added later, but a broad table abstraction or data-grid layer is not part of the first release.

Suggested class naming:

- `ui-button`
- `ui-card`
- `ui-field`
- `ui-input`
- `ui-select`
- `ui-checkbox`
- `ui-switch`
- `ui-tabs`
- `ui-dialog`
- `ui-menu`
- `ui-alert`

State modifiers should remain simple and Bulma-like:

- `is-primary`
- `is-success`
- `is-warning`
- `is-danger`
- `is-small`
- `is-medium`
- `is-large`

## Theming

The theming system should be CSS-variable first.
The default palette should use Tailwind's default color scale as the baseline because it is familiar and widely adopted.
Those values should be exposed through this package's semantic tokens, not through Tailwind class names or a Tailwind runtime dependency.

Design token categories:

- color
- typography
- spacing
- radii
- borders
- shadows
- motion
- focus

Theme delivery:

- default theme in `tokens.css`
- alternate theme files layered on top
- dark mode via `data-theme="dark"`
- optional project-level overrides in a custom CSS file

## Visual Defaults

The default theme should feel modern, crisp, classy, slightly futuristic, and subtly art-deco influenced without becoming decorative or gimmicky.

Concrete defaults:

- Radius scale: `4px`, `6px`, and `8px`; `8px` should be the default maximum for cards and dialogs.
- Borders: crisp `1px` borders with stronger focus and active states.
- Shadows: restrained by default and mostly reserved for overlays, menus, dialogs, and elevation states.
- Color: Tailwind default colors as the familiar baseline, mapped into semantic tokens and manually tuned for contrast.
- Typography: clean, readable, and tool-friendly; demos and docs may use `Aptos`, `IBM Plex Sans`, `Geist`, or `Atkinson Hyperlegible`, with a system fallback.
- Decorative language: fine-line separators, corner accents, subtle rails, and stepped details; avoid heavy gradients, glassmorphism, and over-rounded surfaces.
- Motion: quick, subtle, state-oriented, and compatible with reduced-motion preferences.
- Light theme: premium and calm, not plain white.
- Dark theme: refined and contrast-safe, not a simple inverted gray palette.

## Bulma Value Retention

The new package should retain the parts of Bulma that matter most:

- clear utility naming
- predictable responsive layout
- readable component composition
- good defaults for forms and cards
- practical class-based modifier patterns

What should not be copied mechanically:

- old brand identity
- unnecessary component complexity
- dependency on any particular legacy component runtime

## JavaScript Policy

JavaScript should be used only when it adds real value.

Preferred rules:

- no global framework runtime
- no client-side hydration requirement
- no custom element registry unless truly needed
- no shadow DOM by default
- minimal event listeners
- progressive enhancement only

## Naming Recommendation

The new package name is **FastBlocks UI**.

Why:

- `FastBlocks UI` is the product name and public identity.
- This new package is broader and should not be constrained by that identity.
- `FastBlocks UI` describes the package as the default styling, theming, and component system for FastBlocks.

Decision criteria:

- available as a Python package on PyPI
- short and memorable
- not tied to Bulma
- not tied to a framework
- safe to use in docs and package metadata

## Recommended Initial Roadmap

1. Define the token system.
1. Define the component naming, accessibility, and htmx contracts.
1. Build the core component CSS and helper renderers.
1. Build the Jinja helper layer.
1. Build FastBlocks integration.
1. Add htmx-safe component behaviors.
1. Add browser and template smoke tests.
1. Rename the project once the public API is stable.
