# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.8.1] - 2026-08-06

### Internal

- Propagate the 0.8.0 bump; gitignore pyscn reports

## [0.8.0] - 2026-08-06

### Added

- **BREAKING:** dialog: Move to command/commandfor, drop non-modal support
- **BREAKING:** dropdown: Move onto the Popover API and anchor positioning
- Add ui-burger popover toggle button
- Add ui-drawer off-canvas panel on the Popover API
- Add ui-nav-list and ui-nav-group vertical navigation
- ci: Enforce a Baseline floor on the shipped CSS; spec B and C
- ci: Let check-baseline scan an unmerged branch; correct overscroll data
- Close drawer when viewport crosses its breakpoint
- demo: Add showcase sections for the five new components
- demo: Add showcase sections for the five new components
- field: Add :user-invalid client-side validation styling
- layout: Add sticky navbar reveal and responsive aside switch
- layout: Add ui-shell full-bleed page shell
- Rebuild generated demo on the public shell and drawer
- Rebuild the hand-written demo on the public shell and drawer
- textarea: Auto-grow with field-sizing: content
- tokens: Derive colour scales from one input per role

### Changed

- **BREAKING:** api: Rename ui-menu to ui-dropdown
- **BREAKING:** css: Apply one element-naming rule across all components
- **BREAKING:** js: Retire the dialog and dropdown JavaScript layers
- a11y: Retire deprecated `clip` from .ui-visually-hidden
- Rename nav_group() to nav_groups()

### Fixed

- a11y: Close the four pre-existing contrast and RTL defects
- a11y: Extend the 3:1 control border to pagination and focused switches
- a11y: Give form controls a 3:1 border (WCAG 2.1 SC 1.4.11)
- a11y: Make scroll containers keyboard-reachable and nav names unique
- a11y: Saturate the -contrast switch; restore [hidden]; close review gaps
- burger: Select the open state from the drawer, not aria-expanded
- css: Move ui-measure to utilities and gate the utility surface
- demo: Drop the nav skip link below the drawer breakpoint
- demo: Make the escaped-markup block keyboard scrollable
- demo: Re-inline the CSS bundle, both JS modules and the manifest
- drawer: Guard matchMedia so a missing API cannot abort init
- drawer: Reset the UA popover box model so the panel lands on the right edge
- e2e: Wait for content-visibility layout to settle before clicking
- Expose nav_list's active item to assistive tech
- helpers: Close style-spelling gap and pin \_safe_css_length boundaries
- helpers: Dedupe \_render_attrs against a helper's own positional defaults
- helpers: Detect a caller's aria-label under any spelling
- js: Direct :popover-open feature detect, self-inclusive drawer discovery
- layout: Hide only the shell's own burger above the breakpoint
- layout: Scope the sticky-bar side effects and repair two can't-fail tests
- lint: Satisfy refurb, lychee and ruff before the 0.8.0 bump
- Make nav_list's aria-current token a validated parameter
- Make the desktop hide opt-in via .ui-burger.is-shell-toggle
- scripts: Emit sorted manifest keys so sync agrees with the formatter
- shell: Don't reserve an aside track when there is no aside

### Documentation

- Correct the aria-expanded claim in spec and plan
- css: Explain why .ui-nav-list\_\_item carries no rule of its own
- Document ui-shell, ui-drawer, ui-burger, and ui-nav-list
- helpers: Document and test the aria_label=None opt-out
- Implementation plan for full-bleed demo layout
- Implementation plan for Spec B component modernization
- js: Correct the enhanceDrawers comment after the burger-scoping fix
- plan: Add the missing JS drift gate to Task 8
- plan: Align Task 6 with the enhance.js contract
- plan: Carry the drawer box-model reset into Task 3's CSS
- plan: Declare parity tests expected-red until Task 8
- plan: Drop dead reduced-motion rules from Tasks 4 and 5
- plan: Fix a sequencing bug found by re-checking Spec A's branch
- plan: Fix interpreter paths, nav_group attr duplication, add Task 0
- plan: Make Task 9's axe gate baseline-relative
- plan: Mark Task 1 done; Spec A's hard gate is satisfied
- plan: Mark Task 10 done; record the canvas measurement fix and the border gap
- plan: Mark Task 11 done — B3 phase complete
- plan: Mark Task 12 done — Spec B complete
- plan: Mark Task 2 done, record the two test-side deviations
- plan: Mark Task 3 done; record the dropped accent-color scope
- plan: Mark Task 4 done — B1 phase complete
- plan: Mark Task 5 done; record the demo re-inlining hazard
- plan: Mark Task 6 done; record the custom-property substring hazard
- plan: Mark Task 7 done; record three popover corrections for Tasks 8-9
- plan: Mark Task 8 done; record the parity-mirror staleness trap
- plan: Mark Task 9 done — B2 phase complete
- plan: Note in-page aria-current token for Task 7 sidebar
- plan: Task 0 commits only the sync script, not manifest.json
- plan: Tell Task 8 to mirror Task 7's banner role and theme-toggle fixes
- Record the Spec B breaking changes and correct the roadmap
- Spec full-bleed demo layout with sticky nav and popover drawer
- spec: Correct six stale snippets and record what changed
- test: Correct the JS drift gate docstring

### Testing

- a11y: Extract one correct colour-measurement implementation
- a11y: Sweep both demo pages across the shell breakpoint
- ci: Gate the Baseline floor and version parity from pytest
- demo: Retarget parity selectors and add the missing JS drift gate
- e2e: Correct unverified comment claims and tighten the ARIA canary
- e2e: Cover the drawer, sticky column, and navbar reveal
- e2e: Verify demo-layout.spec.js and axe sweeps under real Firefox/WebKit
- parity: Derive JS_DIR from get_js_path() instead of hardcoding it
- parity: Pin shell/nav_list/nav_groups showcase fragments
- tokens: Activate the contrast gates for Task 11
- tokens: Real-engine contrast harness over an OKLCH brand grid

### Internal

- quality: Clear the one refurb finding this branch introduced
- security: Scope the secret scanner to first-party code
- Sync package.json version to 0.7.1
- Sync uv.lock version to 0.7.1

## [Unreleased]

### Breaking changes

Spec B modernises the existing components onto platform primitives. Every break
below is deliberate; each replaces library code with something the browser now
does natively. See `docs/superpowers/specs/2026-07-28-spec-b-component-modernization-design.md`.

**`ui-menu` is now `ui-dropdown`.** The `.ui-menu` / `.ui-menu__item` classes
and the `menu()` helper are renamed.

- *Migration:* rename `menu(...)` to `dropdown(...)` and `.ui-menu` to
  `.ui-dropdown` in your templates and CSS overrides.
- *Why:* `ui-nav-list` was named to avoid implying kinship with this component,
  which behaves nothing like it. The rename removes the ambiguity at its source.

**Removed, not renamed — these have no replacement**, because the dropdown now
has no JavaScript at all:

- The `<ui-menu>` custom element.
- The attributes `data-ui-menu-trigger`, `data-ui-menu-target`, `data-ui-menu`
  and `data-ui-menu-open`. *Migration:* put `popovertarget="{id}"` on the
  trigger and pass `id=` to `dropdown()`.
- The events `ui-menu-open`, `ui-menu-close`, `ui-menu-opened`,
  `ui-menu-closed`. There is no `ui-dropdown-*` equivalent. *Migration:* listen
  for the platform's own `beforetoggle` / `toggle` events on the popover.

**Dialog JavaScript hooks are removed with no replacement:**

- The attributes `data-ui-dialog-trigger`, `data-ui-dialog-target`,
  `data-ui-dialog-close`, `data-ui-dialog` and `data-ui-state`. *Migration:*
  `command="show-modal"` / `command="close"` with `commandfor="{id}"`. A
  `<button data-ui-dialog-trigger>` becomes an inert button, silently.
- The events `ui-dialog-open`, `ui-dialog-close`, `ui-dialog-opened`,
  `ui-dialog-closed`. *Migration:* the native `<dialog>` `close` event, and
  `beforetoggle` / `toggle`. A stale `addEventListener('ui-dialog-opened', ...)`
  will simply never fire -- no error, no warning.
- `data-ui-state="closed"` was also a styling hook; CSS selecting on it stops
  matching. Style from `:popover-open` / `[open]` instead.

**Element classes move to the BEM `__` separator.**

| Old | New |
| --- | --- |
| `ui-hero-head` / `-body` / `-foot` | `ui-hero__head` / `__body` / `__foot` |
| `ui-level-left` / `-right` / `-item` / `-content` | `ui-level__left` / `__right` / `__item` / `__content` |
| `ui-media-left` / `-right` / `-content` | `ui-media__left` / `__right` / `__content` |
| `ui-navbar-brand` / `-start` / `-end` / `-item` / `-menu` | `ui-navbar__brand` / `__start` / `__end` / `__item` / `__menu` |
| `ui-table-container` | `ui-table__container` |
| `ui-shell-main` / `-aside` | `ui-shell__main` / `__aside` |

- *Not renamed:* `ui-columns`/`ui-column` and `ui-tiles`/`ui-tile` are sibling
  components rather than elements; all `is-*` modifiers; all utilities.
- *Why:* the split was archaeological -- components ported from Bulma kept
  Bulma's hyphen while freshly authored ones used `__`, and the inconsistency
  had begun replicating into new code.

**`dropdown()` requires `id` and renders a popover.** The trigger uses
`popovertarget` instead of `data-ui-dropdown-trigger` + `aria-controls` +
`aria-expanded`.

- *Migration:* `dropdown(items, id="account")` with
  `<button popovertarget="account">`.
- *Removed with it:* the `position: relative` ancestor contract every caller
  previously had to satisfy, the `z-index: 20` stacking guess, and the
  `[hidden]` toggling.
- *Note:* the attribute being replaced is `data-ui-dropdown-trigger` only if you
  upgraded through an intermediate build; the attribute that actually shipped in
  0.7.x is **`data-ui-menu-trigger`**. Grep for that one.

**`dialog()` requires `id`; `open=` is replaced by `autoshow=`. Every dialog is
now modal.**

- *Migration:* `dialog(body, id="settings")` opened by
  `<button command="show-modal" commandfor="settings">` and closed by
  `command="close"`. Replace `open=True` with `autoshow=True`.
- *Why:* the platform does not trap focus in a NON-modal dialog, by design --
  one is specified to let focus leave. Supporting it meant hand-rolling a trap.
  Dropping the feature is what retires the trap; the platform did not "catch up".
- *Server-owned state:* `autoshow=True` renders `data-ui-dialog-autoshow`, which
  the enhancement layer promotes to `showModal()` on load and after
  `htmx:afterSwap`. That replaces `<dialog open>` as the way a server says
  "this dialog is open".

**The public JavaScript surface drops from six exports to four.**

- Removed: `enhanceMenus`, `enhanceDialogs`.
- Remaining: `defineFastBlocksCustomElements`, `enhanceDrawers`, `enhanceTabs`,
  `initFastBlocksUI`.
- *Note:* a named import of a removed ES export is a module-instantiation error,
  so a stale `import { enhanceMenus }` takes down the whole enhancement layer
  rather than degrading. Remove those imports before upgrading.

**The `<ui-dialog>` and `<ui-dropdown>` custom elements are removed, and
`dialog()` / `dropdown()` no longer accept `custom_element`.** `<ui-tabs>`
remains -- tabs has no platform equivalent and still needs JavaScript.

- *Migration:* drop the parameter. Both helpers raise `TypeError` naming the
  replacement rather than silently rendering a stray `custom-element` attribute.

**`dialog(open=True)` raises `TypeError`.** This is guarded specifically because
`open` is a *valid* attribute on `<dialog>`: left to pass through `**attrs` it
would silently render the non-modal open dialog this release removed, with no
focus trap, rather than failing visibly. Use `autoshow=True`.

### Added

- **Baseline support gate.** `scripts/check-baseline.mjs` resolves every CSS
  feature the library uses against the W3C WebDX Baseline dataset and fails when
  one sits below the declared floor (Baseline Newly) without an `@supports`
  guard or a justified allowlist entry. Wired into `npm run validate` and the
  pytest suite. `--css-dir` lets an unmerged branch be checked before it lands.

- **`:user-invalid` field styling.** Client-side validation feedback layered
  under the existing server-set `aria-invalid` rules, which stay authoritative.
  `:user-invalid` matches only after the user edits a field, so untouched
  required fields no longer render as already-failing.

- **Auto-growing textareas** via `field-sizing: content` (Baseline Newly since
  2026-06-16), with a `min-block-size` floor because the property stops honouring
  `rows`.

- **`--ui-color-border-control`.** Used wherever a border is the ONLY thing
  identifying an interactive control: text inputs, selects, textareas, the switch
  track (resting and focused), and pagination items. Those all measured 1.47:1
  where WCAG 2.1 SC 1.4.11 requires 3:1; the new token measures 4.84:1 in light
  and 3.74:1 in dark.

  Decorative boundaries keep the lighter `--ui-color-border` deliberately --
  a card, table, dialog or navbar is identified by its contents, so 1.4.11 does
  not apply and darkening them would change the library's whole visual weight
  for no conformance gain.

- **Derived colour scales.** Each semantic role now needs ONE input:
  `-contrast`, `-subtle` and `-strong` follow from it, in both themes. Set
  `--ui-color-primary` and the scale follows. Verified over a 185-colour OKLCH
  grid in all three engines.

- `tools/refresh_demo_assets.py` for the copies `demo/demo.html` inlines.

### Changed

- `.ui-visually-hidden` moves off the deprecated `clip: rect(...)` onto
  `clip-path`, matching `.ui-burger__label` and collapsing two divergent
  implementations into one.
- `enhance.js` shrinks from 1069 to 416 lines.

### Fixed

- `package-lock.json` carried an integrity hash that codespell had corrupted
  (`coup` -> `coup` inside base64), which made `npm ci` and `npm install` fail
  with `EINTEGRITY` on any cold cache.
- `package.json` and `uv.lock` had drifted from `pyproject.toml`'s version; a
  pytest assertion now keeps all three in step.
- Focusing a switch dropped its boundary contrast from 4.84:1 back to 1.47:1,
  because the `:focus-visible` rule overrode `box-shadow` with the decorative
  border token while the resting rule used the control token.
- An intermittent WebKit failure in the tabs smoke test. `content-visibility`
  settling between mousedown and mouseup meant no `click` event was dispatched
  at all, so the handler never ran while focus had already moved.

### Added

- `nav_groups()` renders `.ui-nav-groups`. Named plural because it takes a
  list of groups and renders a wrapper around them, matching `columns()` /
  `.ui-columns`; each group inside is a `.ui-nav-group`.

- `ui-shell`, `ui-nav-list`, `ui-nav-group`, `ui-drawer`, and `ui-burger`
  components, plus a `.ui-navbar.is-sticky` modifier. `shell()` is a CSS grid —
  one column below 1024px, main plus aside above — with `--ui-shell-max`
  defaulting to `none` (genuinely edge-to-edge) and `--ui-shell-aside-width` to
  `16rem`.

- `ui-drawer` is built on the Popover API: light dismiss, Escape, top-layer
  stacking, tab-order placement while shown, focus return, and the implicit
  `aria-expanded`/`aria-details` invoker relationship all come from the
  platform, with no author JavaScript for any of them.

- One JavaScript enhancement, `enhanceDrawers`, for the one case the platform
  does not cover: a drawer opened below its breakpoint stays in the top layer,
  so widening the viewport past it would leave a stale popover and a full-page
  scrim over the desktop column. Drawers carrying a
  `data-ui-drawer-breakpoint` get a single `matchMedia` listener that calls
  `hidePopover()` on the upward crossing. Drawers without the attribute get no
  listener.

- `ui-measure`, a utility (not a component) that caps line length for readable
  prose; override with `--ui-measure-size`.

### Changed

- `table()` now emits `tabindex="0"` on its `.ui-table-container` wrapper.
  The wrapper is `overflow-x: auto`, so a table wide enough to overflow was a
  scroll container with no focusable descendant -- a keyboard user could not
  reach the columns past the fold at all (axe `scrollable-region-focusable`).
  Every table gains one tab stop, including ones that do not overflow.

- Both demo pages are now full-bleed, with the hero at the top of the page and
  section navigation as a right-hand sticky column that becomes an off-canvas
  drawer below 1024px. The demo is built from public `ui-*` components instead
  of demo-local CSS.

- In-page anchors now use a single `:root { scroll-padding-top }` rather than
  per-section `scroll-margin-top`. That rule and its neighbouring
  `scrollbar-gutter: stable` are scoped to pages that actually render a
  `.ui-navbar.is-sticky`, so pages without one are unaffected.

### Known limitations

- The burger's bars-to-cross morph is selected from any open drawer's
  `:popover-open` via `:has()`, because `:has()` cannot express "the burger
  whose `popovertarget` equals *this* drawer's id". On a page with more than
  one drawer, every burger morphs whenever any drawer opens. Visual only.
- `.ui-navbar.is-sticky` reserves a single fixed length
  (`--ui-navbar-height`, default `3.5rem`) on `body`, so a bar that wraps to a
  second row still covers the top of the content until that custom property is
  raised to match.

## [0.7.1] - 2026-07-28

### Fixed

- a11y,api: Medium/low-tier audit findings
- a11y: Make navbar's landmark name overridable; gate inlined-CSS drift
- security,a11y: URL/attribute injection, dead tabs, field labelling, focus ring

### Testing

- Revive the dead contrast gate and the fabricated CSS-variable tests

### Internal

- deps: Sync uv.lock with v0.7.0 release
- legal: Align copyright with the sibling packages

## [0.7.0] - 2026-07-27

### Added

- **BREAKING:** tokens: Migrate the palette from Tailwind v3 to v4 (oklch)
- Add comprehensive implementation summary
- Add self-contained component demo generated from the helpers
- demo: Add a live semantic color palette section
- Finalize fastblocks ui docs and checks
- Initial commit: Add project files
- Rename fastbulma to fastblocks ui
- ws-1: OS dark-mode default via prefers-color-scheme (single source)
- ws-2: Type variant/size params; make py.typed sound
- ws-3: A11y CSS guardrails + docs/branding honesty
- ws-3: Dialog focus trap on the non-modal fallback path
- ws-3: Menu keyboard navigation (WAI-ARIA menu pattern)

### Changed

- quality: Refurb FURB cleanup; nosemgrep for non-security sha1 ID
- Replace Bulma colors with Tailwind CSS default colors
- Update config, core
- ws-1: Single-source CSS via generated bundle + drift gate

### Fixed

- **BREAKING:** a11y: Let hero/title opt into a heading level
- Fix broken crackerjack documentation link
- Fix PyPI metadata: license and classifiers
- Implement Phase 3 JavaScript optimizations (specialist recommendations)
- Implement Phase 4: Testing and Validation infrastructure
- Implement specialist-recommended fixes (CSS, Web Components, Accessibility)
- ui: Make tiles fill their ancestor and pin the demo sidebar
- ui: Repair mobile overflow, hero subtitle contrast, and demo tracking
- ws-1: Progress() -> native <progress> for CSP-safe rendering
- ws-2: Harden pagination() and progress() helpers

### Documentation

- Add BSD-3-Clause license and update project documentation
- Comprehensive-hooks implementation plan
- Implement Phase 4.5: Performance Optimization and Phase 5: Documentation
- links: Fix or drop broken htmx and archive refs
- Mark fastblocks-htmy scaffold complete in roadmap
- spec,plan: Wrap get_manifest_path() in Path() in code listings
- spec: Comprehensive-hooks-failing design
- Update config, core, docs
- Update core, docs

### Testing

- ws-3: Retire string-split legacy-runtime guard tests
- ws-4: Manifest contract checks (caught real doc drift)

### Internal

- Bump version to 0.2.0
- Bump version to 0.3.0
- Bump version to 0.4.0
- Bump version to 0.4.1
- Bump version to 0.5.0
- Finalize fastblocks ui cleanup
- Fix zuban config + clean type-checker findings
- gitignore: Add backup file patterns to silence checkpoint tool artifacts
- infra: Pyscn/creosote wrappers and .cache/ for betterleaks
- Land WS-0..WS-7 workstream (v0.6.0)
- types: Switch type checking from pyright to ty
- ws-0: Single-source version, ship py.typed, untrack artifacts
- ws-5: Supply-chain hygiene — reconcile pins, enforce zero deps

## [0.6.0] - 2026-07-26

### Contract changes (CSS classes / manifest / asset paths)

- **Removed** the legacy `--fast-*` bridge CSS custom properties from
  `tokens.css`/`theme.css` (and the two related, always-unused
  `--accent-fill-rest`/`--control-height` tokens) — no live consumers
  depended on them, so they were removed outright rather than deprecated.
  Anyone reading these variables directly (rather than through `ui-*`/`is-*`
  classes, the supported public surface) needs to switch to the
  corresponding `--ui-color-*`/`--ui-radius-*` tokens in `tokens.css`. Per
  the SemVer policy in `docs/roadmap.md` §1.4, this is a breaking change to
  the CSS surface — hence the minor bump on a pre-1.0 package.

### Added

- `data-ui-dialog` (function-path/non-`<ui-dialog>`) markup now dispatches
  the same cancelable `ui-dialog-open`/`ui-dialog-close` and follow-up
  `ui-dialog-opened`/`ui-dialog-closed` events as `<ui-dialog>`, and listens
  for the dialog's native `close` event (e.g. a `<form method="dialog">`
  submit) to resync `aria-hidden`/`aria-expanded` — previously only the
  custom-element path had either behavior.
- Test coverage for `container`/`section`/`footer`/`level`/`hero`/`title`/
  `columns`/`column` (previously 0% statement coverage) and the
  list/tuple/falsy-value branches of `validation_summary`.
- **Opt-in container queries (WS-6):** a new `.is-container` modifier
  (added to `manifest.json`'s `state_modifiers`) on `.ui-columns` (new
  `.is-N-cq` fractional tier via `@container (min-width: 30rem)`),
  `.ui-tiles` (full-width fallback below, fractional above the same
  threshold), and `.ui-card` (more generous padding above a 24rem
  threshold, applied to the card's own header/body/footer children — a
  container query cannot restyle the container element itself). Purely
  additive — existing viewport-based `.is-N` classes are unchanged for
  anyone not opting in.
- **`manifest.json` now carries per-component `params` and a `codegen` flag
  (WS-4)**, derived by introspecting the real `fastblocks_ui.helpers`
  signatures (`scripts/sync_manifest_params.py`, with a `--check` drift
  gate) rather than hand-copied — catches signature-shape drift a
  name-only manifest couldn't. Also added the previously-missing
  `validation_summary` manifest entry. Purely additive (new JSON fields
  and one new entry); no existing field changed shape or was removed.

### Changed

- `enhance.js`'s dialog open/close logic is now a single shared
  implementation used by both `UiDialogElement` and the function-based
  `enhanceDialogs()` path (previously duplicated with a real behavior gap
  between them, not just duplicated code).

### Fixed (found by independent multi-agent review, before release)

- `.ui-card.is-container`'s `@container` rule targeted `.ui-card.is-container`
  itself — CSS forbids a container from restyling itself via its own query
  (only descendants), so the rule silently never matched and the card
  padding feature was dead code. Retargeted to the card's
  `.ui-card__header`/`__body`/`__footer` children, which are genuine
  descendants of the containment box.
- `layout.css`'s mobile stacking rule
  (`.ui-columns:not(.is-desktop) > .ui-column { width: 100%; ... }`,
  specificity (0,0,3,0)) silently overrode `.is-N-cq` (specificity (0,0,2,0))
  at any viewport ≤768px, regardless of the *container's* own width —
  defeating the "container width, not viewport" premise exactly where it
  mattered most (a wide sidebar on a narrow page). Excluded `.is-container`
  from the mobile rule's selector.

### Fixed (found reviewing the generated demo page, before release)

- **Cascade-layer ordering silently broke text color on every anchor-based
  component** (pagination's current-page indicator, breadcrumb links, menu
  items, link-buttons): `tools/build_css.py`'s `LAYER_ORDER` put `base`
  (which resets `a { color: inherit; }`) at *higher* priority than
  `components`, so that generic reset always won over
  `.ui-pagination__item.is-current`'s `color: var(--ui-color-primary-contrast)` regardless of selector specificity.
  Reordered to standard ITCSS precedence (`base, tokens, theme, components, utilities`).
- `scripts/build_demo.py`'s tabs demo passed raw `<p>...</p>` strings as
  panel content; `_render_fragment()` correctly HTML-escapes untrusted
  strings by default, so the tags rendered as visible literal text instead
  of markup. Wrapped in `_safe(...)`.
- The Layout demo's "Action" toolbar button had no wired behavior at all.
  Gave it demo-only click feedback (status text update), matching the
  existing theme-toggle pattern.
- The RTL demo used English/Latin text under `dir="rtl"` — this only flips
  block-level layout (offsets, alignment), it does not reverse Latin
  letters/word order, so it never visually read as right-to-left. Replaced
  with genuine Arabic sample content.
- **`.ui-level-left`/`.ui-level-right` had no `gap`** between multiple inline
  children (e.g. a label plus a status span passed via `level(left=...)`) —
  visually read as no space at all ("ToolbarAction clicked 1 time."). Added
  `gap: var(--ui-space-3)`, the logical equivalent of Bulma's non-last-child
  spacing between level items; fixes every `level()` usage, not just the
  demo.
- The Theme toggle in both demo pages was a bare `<div>` sitting outside any
  card, inconsistent with every other demo section (Layout, Menu, Dialog,
  etc. are each their own titled card). Wrapped it in its own
  `demo_section("Theme", ...)`. Its lead text also contained a literal,
  unescaped `<html>` (rendered as a broken tag rather than visible text,
  since `demo_section()`'s `lead` isn't HTML-escaped) — reworded to avoid
  angle brackets entirely.
- The Layout demo bundled an unrelated `level()` toolbar into the same card
  as the 12-column grid demo, inconsistent with every other section being
  single-purpose. Split into separate `demo_section("Layout", ...)` and
  `demo_section("Toolbar", ...)` cards.
- **`.ui-menu` had no `position`, so opening a dropdown pushed all following
  page content downward** instead of overlaying it like a real dropdown.
  Added `position: absolute` (plus `z-index`/`margin-top`) — `menu()`'s new
  docstring and a code comment document that the element wrapping the
  trigger + menu together needs `position: relative` for correct anchoring
  (the demo's `.demo-panel` wrapper already has this now).
- **The Component manifest demo section's `fetch('./manifest.json')` is
  blocked by browsers under `file://`** (a same-origin/CORS restriction, not
  a bug in `manifest.js`), so it always showed "Component manifest could not
  be loaded" when either demo page was opened as a bare local file — this
  was a known, documented limitation, not previously actually fixed.
  `manifest.js` now has a `loadManifestData()` helper that prefers manifest
  data embedded directly in the page (a
  `<script type="application/json" id="fastblocks-ui-manifest-data">`
  sibling) when present, falling back to the network `fetch()` for real
  server-hosted deployments where that inline tag won't exist. `demo/demo.html`
  now embeds `fastblocks_ui/manifest.json`'s content inline for exactly this
  reason.

### Changed

- **Button hover/active redesign.** Replaced the `transform: translateY(-1px)` hover "lift" with a single, uniform mechanism applied to
  every variant: hover/active always move to that color's own
  already-defined next step along its token ramp (`--ui-color-surface-muted`
  → `--ui-color-surface-raised` for the neutral button; each color's own
  `--ui-color-*-strong` token for filled variants). No runtime color math
  (rejected a `filter: brightness()` approach after computing WCAG contrast
  ratios both ways: brightening a saturated fill pushes its background
  luminance *toward* the white button text's own luminance, measurably
  reducing contrast on `is-primary`/`is-success`/`is-danger`, whereas
  darkening toward the existing `-strong` tokens improves it). Pressed
  feedback is now a `box-shadow: inset` depth cue rather than a second color
  mechanism. Mirrors Bulma's actual approach of one consistent
  darken-by-a-fixed-amount rule per color, rather than mixing techniques.

- **Fixed the pre-existing WCAG contrast failures surfaced above**, plus two
  more found while verifying the fix (dark theme's `danger` and `primary`
  weren't covered by the original check). All are genuine Tailwind default
  hex values, not one-off colors -- see `tokens.css`/`theme.css` comments for
  the exact before/after ratios:

  - Light theme: `--ui-color-info`/`-strong` moved cyan-500/600 ->
    cyan-700/800 (2.43:1/3.68:1 -> 5.36:1/7.27:1); `--ui-color-success`/
    `-strong` moved green-500/600 -> green-700/800 (2.28:1/3.30:1 ->
    5.02:1/7.13:1); `--ui-color-danger` moved red-500 -> red-600 (3.76:1 ->
    4.83:1; `-strong` was already red-700 and already passed).
  - Dark theme: `--ui-color-danger-contrast` flipped from white to black
    (2.77:1/1.90:1 -> 7.59:1/11.06:1) -- info/success/warning already got
    this same black-text treatment in dark mode; danger was the one
    inconsistent holdout. `--ui-color-primary`/`-strong` moved indigo-400/300
    -> indigo-600/700 (2.98:1/1.99:1 -> 6.29:1/7.90:1) -- black text wasn't a
    good option here (indigo reads muddy with black at any shade still
    "dark-mode-native"), so dark mode's primary button/hero is now the same
    color as light mode's, which is an intentional, acceptable side effect.
  - New `tests/test_fastblocks_ui.py::TestColorTokenContrastRegression`
    parses the built CSS bundle's actual `:root`/`[data-theme="dark"]` custom
    -property blocks and asserts >= 4.5:1 for every color/`-strong` pair
    against its own theme's `-contrast` token, so this class of bug can't
    silently ship again.

- **Demo consolidation:** retired the hand-written `fastblocks_ui/demo.html`
  in favor of two demos living together under `demo/`: `demo/demo.html`
  (hand-written reference, still e2e/axe-core-tested) and `demo/index.html`
  (generated by `scripts/build_demo.py` through the real helpers, self
  -contained). New `tests/test_demo_parity.py` calls the real helpers with
  the same inputs used in both files and asserts the output appears
  verbatim in `demo/demo.html`, so the two can no longer silently drift
  apart — if a helper's markup shape ever changes, this fails immediately.
  `demo/manifest.json` is a symlink to `fastblocks_ui/manifest.json` (single
  source of truth, `manifest.js`'s relative fetch still resolves).
  `scripts/build_demo.py`'s `dialog_demo()`/`menu_demo()` now call the real
  `dialog()`/`menu()` helpers instead of hand-typed raw HTML. Added a
  `--check` drift gate to `build_demo.py` mirroring `build_css.py`'s.
  `playwright.config.js` now serves the repo root; the 4 e2e specs updated
  their `goto()` path and (for `smoke.spec.js`) two tab-panel-id selectors
  to match the real `tabs()` helper's actual ids (`#demo-overview-panel`,
  not the old hand-picked `#demo-overview`).

## [0.5.0] - 2026-05-10

### Added

- Add BSD-3-Clause license and update project documentation
- Add comprehensive implementation summary
- Finalize fastblocks ui docs and checks
- Implement Phase 3 JavaScript optimizations (specialist recommendations)
- Implement Phase 4.5: Performance Optimization and Phase 5: Documentation
- Implement Phase 4: Testing and Validation infrastructure
- Implement specialist-recommended fixes (CSS, Web Components, Accessibility)
- Initial commit: Add project files
- Rename fastbulma to fastblocks ui

### Changed

- Replace Bulma colors with Tailwind CSS default colors
- Update config, core
- Update config, core, docs
- Update core, docs

### Fixed

- Fix broken crackerjack documentation link
- Fix PyPI metadata: license and classifiers

### Internal

- Bump version to 0.2.0
- Bump version to 0.3.0
- Bump version to 0.4.0
- Bump version to 0.4.1
- Finalize fastblocks ui cleanup

## [Unreleased]

### Added

- Optional light-DOM Custom Elements wrappers for tabs, dialogs, and menus
- Fragment-resync support for htmx-style replacement of wrapper children

### Changed

- Keep the helper output canonical while allowing explicit custom-element opt-in

## [0.4.1] - 2026-04-29

### Internal

- Finalize fastblocks ui cleanup

## [0.4.0] - 2026-04-29

### Added

- Finalize fastblocks ui docs and checks
- Rename fastbulma to fastblocks ui

## [0.3.0] - 2026-01-24

### Added

- Add comprehensive implementation summary
- Implement Phase 3 JavaScript optimizations (specialist recommendations)
- Implement Phase 4.5: Performance Optimization and Phase 5: Documentation
- Implement Phase 4: Testing and Validation infrastructure
- Implement specialist-recommended fixes (CSS, Web Components, Accessibility)

### Changed

- Replace Bulma colors with Tailwind CSS default colors
- Update core, docs
