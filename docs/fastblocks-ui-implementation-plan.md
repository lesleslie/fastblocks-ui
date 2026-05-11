# FastBlocks UI Implementation Plan

Public name: `FastBlocks UI`

This plan converts the architecture draft into an execution-oriented roadmap.
It is intended to be used as the live implementation plan while the package is finalized in place and then renamed mechanically if needed.

## Progress Tracking

Status values:

- `pending`
- `in_progress`
- `blocked`
- `done`

| ID | Status | Owner | Notes |
|----|--------|-------|-------|
| FBUI-001 | done | unassigned | Token system and theme foundation |
| FBUI-002 | done | unassigned | Base CSS and utility layer |
| FBUI-003 | done | unassigned | Core semantic components |
| FBUI-004 | done | unassigned | Jinja helper layer |
| FBUI-005 | done | unassigned | FastBlocks integration |
| FBUI-006 | done | unassigned | htmx-safe interactive behaviors |
| FBUI-007 | done | unassigned | Optional enhancement JS |
| FBUI-008 | done | unassigned | Packaging, docs, and smoke tests |
| FBUI-009 | done | unassigned | Final naming decision and rename |
| FBUI-010 | done | unassigned | Layout v2 follow-up polish |
| FBUI-011 | done | unassigned | Optional light-DOM Custom Elements |

## Goals

- Build a new, original, HTML-first UI package.
- Keep JavaScript optional and minimal.
- Make htmx compatibility a first-class requirement.
- Support Jinja and async Jinja template environments cleanly.
- Integrate naturally with FastBlocks.
- Preserve useful lessons from Bulma without keeping a Bulma-shaped identity.

## Non-Goals

- No shadow DOM by default.
- No hydration framework.
- No compatibility package for legacy `fast-*` elements.
- No framework-specific wrappers for React/Vue/Svelte in v1.
- No broad component catalog before the core system is stable.
- No data-grid layer in v1.

## Namespace Contract

- The public CSS namespace is `ui-*`.
- The namespace is stable and does not change when the package is renamed later.
- The eventual package name and the CSS namespace are intentionally decoupled.

## Rendering Contract

- Helper functions are the canonical render path and return HTML-safe markup.
- Macros and blocks wrap the same helper implementation; they do not duplicate logic.
- Fragment helpers and full-component helpers use the same underlying renderer.
- Component state that survives swaps must be represented in markup, not hidden in client memory.

## htmx Contract

- Components render valid standalone fragments.
- htmx targets, triggers, and swapped regions use normal light DOM nodes.
- Swapped components use stable IDs when state, focus, labels, or controls depend on IDs.
- Server-rendered markup is the source of truth for selected tabs, open menus, form state, and validation state.
- Optional JS can restore focus or enhance keyboard behavior, but it cannot be required to understand the current state.

## Milestone 1 - Foundations

### Scope

- FBUI-001 Token system and theme foundation
- FBUI-002 Base CSS and utility layer

### Work Items

1. Define semantic design tokens.
1. Create default and dark theme token files.
1. Build base CSS, reset, and cascade layers.
1. Add utility classes for layout and spacing.
1. Establish accessible focus and motion tokens.
1. Define the fallback baseline for modern CSS features before using them in components.
1. Implement the default visual language: crisp geometry, restrained shadows, fine-line detail, and subtle art-deco/futurist accents.

### Acceptance Criteria

- Tokens cover color, spacing, typography, radius, shadow, border, focus, and motion.
- Default color tokens use Tailwind's default color scale as the baseline and expose it through semantic package tokens.
- Radius tokens include `4px`, `6px`, and `8px`, with `8px` as the default maximum for cards and dialogs.
- Borders default to crisp `1px` treatment with clear focus and active states.
- Shadows are restrained and primarily used for overlays, menus, dialogs, and elevation states.
- Motion is quick, subtle, state-oriented, and respects reduced-motion preferences.
- The default visual style is modern, classy, slightly futuristic, and subtly art-deco influenced without heavy decorative effects.
- Dark theme is toggled via CSS, not JavaScript.
- Base CSS loads without requiring any JS.
- Utilities are readable and composable.
- Feature fallbacks are documented for `@layer`, `:has()`, container queries, `dialog`, `popover`, CSS anchor positioning, and View Transitions.

## Milestone 2 - Core Components

### Scope

- FBUI-003 Core semantic components

### Work Items

1. Implement button, card, field, and form control patterns.
1. Implement select, checkbox, switch, dialog, tabs, and menu patterns.
1. Keep default output as native HTML where possible.
1. Use classes and semantic attributes for state.
1. Ensure output is htmx-safe.
1. Define keyboard, focus, and labeling rules for `dialog`, `tabs`, `menu`, `select`, `checkbox`, and `switch`.
1. Define the stable-ID and server-authoritative-state contract for htmx-swapped components.

### Acceptance Criteria

- Core components render correctly as plain HTML.
- Components work without client-side hydration.
- Form controls submit natively.
- Buttons, cards, and fields are usable without JS.
- Interactive components have explicit keyboard and focus behavior documented and tested.
- Swapped components preserve state through markup, not client memory.
- `menu` and `tabs` stay native-first and do not require a custom widget runtime.

## Milestone 3 - Template Helpers

### Scope

- FBUI-004 Jinja helper layer

### Work Items

1. Create helper functions that emit HTML-safe markup.
1. Support sync Jinja2 and async-capable Jinja integrations.
1. Support macro-based and block-based composition.
1. Allow arbitrary HTML attributes and class merging.
1. Add helper docs and examples.
1. Define the canonical helper signatures for shared components and fragments.

### Acceptance Criteria

- Helpers render correctly in Jinja and async Jinja environments.
- Helpers accept arbitrary HTML attributes.
- Helpers do not require browser-side JS.
- Example templates work in both standard and async template flows.
- Helpers escape content correctly and do not double-escape HTML-safe markup.
- Macros, blocks, and fragments all resolve through the same public render contract.
- Class merging and variant handling are covered by tests.

## Milestone 4 - FastBlocks Integration

### Scope

- FBUI-005 FastBlocks integration

### Work Items

1. Define block/fragment helper APIs for FastBlocks.
1. Align component output with FastBlocks composition patterns.
1. Add integration examples for partial rendering.
1. Validate fragment swaps and nested components.
1. Verify that FastBlocks fragments use the same renderer as full components.

### Acceptance Criteria

- FastBlocks can compose the package without special adapters.
- Fragments and blocks render usable standalone HTML.
- Component markup survives repeated fragment swaps.
- Fragment output and full-component output share the same markup contract.
- Integration examples cover nested fragments and partial rendering.

## Milestone 5 - htmx and Enhancement JS

### Scope

- FBUI-006 htmx-safe interactive behaviors
- FBUI-007 Optional enhancement JS

### Work Items

1. Codify htmx swap, focus, and state-restoration rules for interactive components.
1. Implement minimal behavior for dialogs, tabs, and menus.
1. Ensure all behaviors degrade gracefully without JS.
1. Keep interaction state in markup and attributes where possible.
1. Validate that htmx swaps do not break component state.

### Acceptance Criteria

- The package works with htmx without special configuration.
- Interactive components remain usable when JS is disabled.
- JS enhances behavior without becoming the source of truth.
- Focus returns predictably after dialog close, tab changes, and swapped fragments.
- Feature-specific fallback behavior is documented for `dialog`, `popover`, anchor positioning, and View Transitions.

## Milestone 6 - Packaging and Validation

### Scope

- FBUI-008 Packaging, docs, and smoke tests

### Work Items

1. Package CSS and JS assets predictably.
1. Add smoke tests for installed package behavior.
1. Add template rendering smoke tests.
1. Document installation, theming, and usage.
1. Validate the final rename path.
1. Add a built-artifact smoke test that exercises installed assets, not just source-tree modules.

### Acceptance Criteria

- The package installs and imports cleanly.
- Smoke tests cover both source and installed artifact usage.
- Docs match the shipped API.
- The rename path is documented and the package name is stable before release.
- Installed CSS and JS asset paths resolve correctly from the built distribution.

## Milestone 7 - Rename and Release

### Scope

- FBUI-009 Final naming decision and rename

### Work Items

1. Pick the final package name.
1. Update package metadata, docs, and distribution references.
1. Remove the working-title wording from public-facing content.
1. Publish release candidate documentation.

### Acceptance Criteria

- Final name is approved.
- Public docs use the new name consistently.
- Package metadata and repository references are aligned.

## Milestone 8 - Layout v2 Follow-Up

### Scope

- FBUI-010 Layout v2 follow-up polish

The Bulma-inspired layout, flexbox, and grid system is mostly implemented. This
milestone captures the remaining work from `docs/layout-v2-spec.md` so it is not
left buried in a draft spec.

### Work Items

1. Keep `navbar()` static-only in the helper layer and document the mobile
   disclosure pattern as an application- or htmx-level concern.
1. Add `brand_url`, `start`, and `end` support to `navbar()` for parity with
   the layout v2 spec.
1. Make `breadcrumb()` default to `aria-label="breadcrumb"` while still allowing
   callers to override it.
1. Add `.ui-table.is-fullwidth` as a documented compatibility modifier even
   though `.ui-table` is already full width by default.
1. Expand regression tests for navbar, breadcrumb, progress, table, and
   pagination helper output.
1. Update `docs/layout-v2-spec.md` status from in progress to implemented with
   listed follow-up gaps, or move its remaining items into a smaller checklist.

### Acceptance Criteria

- Navbar behavior and docs clearly state that mobile disclosure remains an
  htmx/application pattern.
- Breadcrumb output has a default accessible label.
- Table full-width behavior is documented and covered by CSS/tests.
- Layout helper tests cover ARIA attributes, escaped content, progress bounds,
  table modifiers, and pagination edge cases.
- `docs/layout-v2-spec.md` no longer reads as an unimplemented draft.

## Milestone 9 - Light-DOM Custom Elements

### Scope

- FBUI-011 Optional light-DOM Custom Elements

This milestone implements `docs/light-dom-custom-elements-spec.md` as a
post-v1 enhancement layer. It is not a revival of the archived FastBulma/FAST
runtime, and it does not replace helpers as the canonical render path.

### Work Items

1. Implement optional `<ui-tabs>`, `<ui-dialog>`, and `<ui-menu>` custom
   elements as light-DOM enhancers.
1. Keep existing children in place; do not attach closed shadow DOM or move
   content into implementation-owned markup.
1. Register custom elements from the optional JavaScript entrypoint while
   preserving the existing `data-ui-*` enhancement functions.
1. Derive initial state from server-rendered attributes on connect, including
   `open`, `aria-selected`, `aria-expanded`, `hidden`, and `data-ui-state`.
1. Reflect user interaction back into attributes before dispatching completion
   events so htmx swaps and server-rendered fragments stay authoritative.
1. Add lifecycle-safe setup and cleanup so repeated connection, disconnection,
   and htmx fragment replacement do not duplicate listeners.
1. Add cancelable before-change events and completion events for tab changes,
   dialog open/close, and menu open/close.
1. Add helper opt-in support for custom-element wrappers without changing the
   default helper output.
1. Document when to use the wrapper elements and when plain helper output plus
   `data-ui-*` enhancement is enough.

### Acceptance Criteria

- Existing no-JS markup remains useful before custom elements upgrade.
- `<ui-tabs>`, `<ui-dialog>`, and `<ui-menu>` upgrade idempotently after page
  load and after htmx-style fragment swaps.
- State is represented in normal light-DOM attributes, not retained only in
  client-side memory.
- Browser tests prove component children remain in light DOM and no closed
  shadow DOM is used.
- Tests cover keyboard behavior, focus return, repeated connect/disconnect,
  cancelable events, and htmx-style replacement.
- Helper output remains canonical and the custom-element wrapper emits the same
  IDs, ARIA relationships, classes, and htmx-compatible fragment shape.

## Recommended Execution Order

1. Milestone 1
1. Milestone 2
1. Milestone 3
1. Milestone 4
1. Milestone 5
1. Milestone 6
1. Milestone 7
1. Milestone 8
1. Milestone 9

## V1 Scope Matrix

This matrix defines the initial package boundary. Items in `defer` are valid
future candidates, but they are not part of the first release.

| Component / Capability | v1 | Defer | Maybe Never |
|------------------------|----|-------|-------------|
| `button` | yes | | |
| `card` | yes | | |
| `field` / form group | yes | | |
| `input` | yes | | |
| `select` | yes | | |
| `checkbox` | yes | | |
| `switch` | yes | | |
| `dialog` | yes | | |
| `tabs` | yes | | |
| `menu` | yes | | |
| `alert` | yes | | |
| Bulma-style layout, flexbox, and grid | yes | | |
| `navbar` | yes | | |
| `breadcrumb` | yes | | |
| `progress` | yes | | |
| `table` / semantic table styling | yes | | |
| `pagination` | yes | | |
| `badge` | | yes | |
| `dropdown` | | yes | |
| `toast` | | yes | |
| complex date/time inputs | | yes | |
| deep data-grid behavior | | | yes |
| framework-specific wrappers | | | yes |
| optional light-DOM Custom Elements | | yes | |
| shadow-DOM-based public components | | | yes |

### V1 Notes

- `field` includes label, help, error, and layout patterns.
- `select` must remain native-first unless a clear HTML-native enhancement path is proven.
- `dialog`, `tabs`, and `menu` should be progressively enhanced, not JS-first.
- Optional light-DOM Custom Elements are a deferred enhancement layer, not part
  of v1. They are tracked by FBUI-011 and
  `docs/light-dom-custom-elements-spec.md`.
- Utilities and tokens are part of v1 even though they are not listed as individual components.
- `table` in this plan means semantic table styling only. Deep data-grid
  behavior remains out of scope.

## Finalized Decisions

| Decision | Options | Recommendation | Why |
|----------|---------|----------------|-----|
| Exact v1 component list | Small focus set, medium set, broad catalog | Small focus set | Keeps scope coherent and HTML-first |
| Helper return type | Raw HTML strings, structured objects, hybrid | Raw HTML strings at the public boundary | Best fit for Jinja, async Jinja, FastBlocks, and htmx |
| Token vocabulary | Bulma-like, package-prefixed, semantic public tokens with internal aliases | Semantic public tokens backed by Tailwind default color values | Familiar palette, portable API, future-proof naming, and no Tailwind runtime dependency |
| Dialog/tabs implementation | Pure CSS only, native + tiny JS, full JS component behavior | Native + tiny JS | Best balance of accessibility, simplicity, and htmx safety |
| Final package name | FastBlocks UI, other names, defer rename | FastBlocks UI | The public name is settled; only the mechanical package rename remains |

## Accessibility Contract

| Component | Contract |
|-----------|----------|
| `button` | Use native `button` or link semantics; disabled state must match the underlying element. |
| `input` / `select` | Use native controls and preserve labels, names, values, validation attributes, and help/error relationships. |
| `checkbox` / `switch` | Implement `switch` as a styled checkbox unless a later audit proves a stronger native pattern. |
| `dialog` | Use native `dialog` where available; require a label, close path, focus management, and focus return. |
| `tabs` | Use stable tab and panel IDs; expose selected state in markup; provide keyboard behavior when enhanced. |
| `menu` | Prefer disclosure/navigation semantics in v1; only use ARIA menu semantics if full keyboard behavior is implemented. |
| `alert` | Use semantic status or alert roles only when the content should be announced. |

## Modern HTML and CSS Features

The plan should explicitly use current platform features where they reduce JavaScript or improve ergonomics:

- `@layer` for ordered CSS architecture and overrides.
- `:has()` for parent/state-aware styling when it simplifies component CSS.
- `container-type` and `@container` for component-aware responsive behavior.
- `dialog` for modal interactions where native behavior is sufficient.
- `popover` for lightweight menus, tooltips, and ephemeral UI.
- CSS anchor positioning for anchored overlays when it replaces custom JS positioning.
- View Transitions as an optional polish layer for page/view changes, not a core dependency.

Use these features progressively:

- core rendering must work without them
- enhancements should fail gracefully
- unsupported browsers should receive usable fallback behavior

### Feature Fallback Matrix

| Feature | Primary Use | Fallback |
|---------|-------------|----------|
| `@layer` | Predictable reset, token, component, utility, and override order | Preserve equivalent source order in built CSS. |
| `:has()` | Parent and state-aware styling | Use explicit state classes or `data-*` attributes. |
| Container queries | Component-aware responsive behavior | Use fluid defaults and viewport media queries. |
| Native `dialog` | Modal behavior | Use hidden content plus minimal `role="dialog"` enhancement only when needed. |
| `popover` | Lightweight dismissible overlays | Use disclosure markup or dialog-style overlay patterns. |
| CSS anchor positioning | Overlay placement | Use static/absolute positioning; add optional JS placement only if required. |
| View Transitions | Optional visual polish | Fall back to instant swaps with no functional change. |

## Validation Matrix

| Area | Required Coverage |
|------|-------------------|
| CSS assets | Source and built CSS load in the documented order. |
| Components | Each v1 component renders valid standalone HTML. |
| Helpers | Sync Jinja, async Jinja, macro, block, and fragment paths produce equivalent markup. |
| Escaping | Plain text is escaped, HTML-safe markup is preserved, and output is not double-escaped. |
| htmx | Swapped fragments preserve IDs, labels, form names, selected state, and focus behavior. |
| Accessibility | `dialog`, `tabs`, `menu`, `select`, `checkbox`, and `switch` have keyboard and focus checks. |
| Packaging | Built distributions expose CSS, JS, templates, and package imports from installed artifacts. |

## Decision Notes

1. Exact v1 component list should stay deliberately small.
1. Helper output should be markup-first, not object-first.
1. Tokens should be semantic rather than package-branded.
1. Dialog and tab behavior should be native-first with tiny enhancement JS.
1. The package name should be finalized after the public API is stable.
