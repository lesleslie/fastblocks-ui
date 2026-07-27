# Theming Recipes

FastBlocks UI themes are controlled through semantic `--ui-*` CSS variables.
The goal is to change the visual tone of the entire package without forking
components or overriding markup contracts.

## Brand Accent

Set a single brand accent and let the component palette derive from it:

```css
:root {
  --ui-color-primary: #2563eb;
  --ui-color-primary-contrast: #ffffff;
  --ui-color-primary-hover: #1d4ed8;
  --ui-color-primary-active: #1e40af;
}
```

Use this when the application wants one clear brand color across buttons,
focus states, pagination, and tabs.

## Quiet Business App

For dashboards and internal tools, keep the surface restrained:

```css
:root {
  --ui-color-surface: #ffffff;
  --ui-color-surface-muted: #f8fafc;
  --ui-color-surface-raised: #f1f5f9;
  --ui-color-border: #dbe3ee;
  --ui-color-text: #334155;
  --ui-color-text-strong: #0f172a;
}
```

This keeps cards, tables, and dialogs readable without a heavy visual accent.

## Dark Theme

Prefer a class or attribute switch rather than JavaScript-driven inline styles:

```css
[data-theme="dark"] {
  --ui-color-surface: #0f172a;
  --ui-color-surface-muted: #111827;
  --ui-color-surface-raised: #1f2937;
  --ui-color-border: #334155;
  --ui-color-text: #cbd5e1;
  --ui-color-text-strong: #f8fafc;
}
```

Keep semantic tokens intact so the same helpers render consistently in either
theme.

**Why `[data-theme]` and not CSS `light-dark()`.** This is a deliberate,
closed decision, not an oversight: `light-dark()` only switches *color*
values based on `color-scheme`, but FastBlocks UI themes also vary
non-color tokens (spacing, border width, radius) between light and dark in
some recipes, which `light-dark()` cannot express. The `[data-theme]`
attribute switch also gives the application an explicit, JS-free toggle
independent of the OS `prefers-color-scheme` setting — `light-dark()` is
tied to `color-scheme`, so decoupling "what the OS prefers" from "what the
user chose in this app" would require extra plumbing anyway. If a future
component's palette is ever *pure* color tokens with no non-color
variation, `light-dark()` could be considered there specifically — but it
is not the default mechanism for this package.

## Accessible States

Make the state tokens obvious enough to read at a glance:

```css
:root {
  --ui-color-success: #16a34a;
  --ui-color-warning: #ca8a04;
  --ui-color-danger: #dc2626;
  --ui-color-info: #0284c7;
}
```

These tokens support alerts, progress bars, and validation messaging without
changing the component structure.

## Layout Rhythm

Spacing should stay on a consistent scale:

```css
:root {
  --ui-space-1: 0.25rem;
  --ui-space-2: 0.5rem;
  --ui-space-3: 0.75rem;
  --ui-space-4: 1rem;
  --ui-space-6: 1.5rem;
  --ui-space-8: 2rem;
}
```

This keeps cards, tables, menus, and layout helpers aligned without requiring
per-component tuning.

## What Not To Override

- Do not replace helper output with custom wrapper markup.
- Do not reintroduce a `--fast-*`-style compatibility layer; the `--ui-*`
  namespace is the only supported token surface.
- Do not restyle state using hidden client-side memory.
- Do not use shadow DOM to solve ordinary theme changes.
