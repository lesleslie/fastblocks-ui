# FastBlocks UI Coding Standards

This document captures the active repository conventions for FastBlocks UI.
Historical FastBulma/FAST component guidance lives under `docs/archive/`.

## Python Code Standards

- Follow the configured Ruff rules and keep line length at 88 characters.
- Use descriptive snake_case for helpers and implementation details.
- Add type hints for public helper functions and CLI-facing code.
- Keep helper output deterministic and HTML-safe.
- Preserve public APIs and generated asset paths unless a release note covers the
  change.

## HTML And Component Model

- Render usable standard HTML before JavaScript loads.
- Use the stable public CSS namespace `ui-*`.
- Prefer native elements and attributes before adding abstractions.
- Keep component state in markup so server-rendered fragments remain the source
  of truth.
- Do not add default shadow-DOM components or a custom-element registry in v1.
- If optional Custom Elements are ever added, they must enhance existing light
  DOM markup and keep htmx swaps server-authoritative.

## CSS Standards

- Use CSS variables and cascade layers for theming.
- Keep token names stable and predictable.
- Put reusable component styles in source CSS files; generated bundles must stay
  reproducible from source.
- Do not hand-edit generated output when there is a source file or generator.
- Keep layout, token, utility, and component entrypoints aligned.

## JavaScript Standards

- Use vanilla JavaScript and standard DOM APIs.
- Keep JavaScript optional and progressively enhancing.
- Avoid client-side hydration and framework-specific runtime assumptions.
- Interactive behavior must tolerate htmx swaps by using event delegation or
  idempotent initialization.
- Reflect state in attributes where possible.

## htmx Standards

- htmx targets, triggers, and swapped regions must be normal light DOM nodes.
- Preserve stable IDs, form names, labels, ARIA references, and selected state in
  server-rendered fragments.
- Do not hide critical content behind JavaScript-only rendering.
- Examples should show server-authoritative state rather than client memory.

## Documentation Standards

- Active docs must describe FastBlocks UI, not the archived FastBulma runtime.
- Legacy FAST, Fluent, and `fast-*` notes belong only in archive or changelog
  context.
- Component docs should be derived from `fastblocks_ui/manifest.json` whenever
  possible.
- README examples should match shipped helpers and CSS classes.

## Testing Standards

- Add regression tests when changing helper output, packaging, asset generation,
  or CLI behavior.
- Verify CSS and JavaScript behavior with the configured JS suite when touching
  static assets.
- Keep tests focused on the current `ui-*` public contract.

## Commit Standards

- Use focused conventional commits such as `fix(docs): archive stale fastbulma plan`.
- PR notes should call out whether changes affect runtime assets, packaging, or
  documentation examples.
