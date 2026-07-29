# Full-bleed demo layout with sticky nav column and off-canvas drawer

- **Date:** 2026-07-28
- **Status:** Approved design, pending implementation plan
- **Scope:** Spec A of three (see `docs/modernization-roadmap.md` for B and C)

## Problem

The demo pages are the primary showcase for FastBlocks UI, but their layout
contradicts what the library is meant to demonstrate:

- `.demo-layout` is capped at `max-width: 72rem` and centred, so the page never
  demonstrates fluid or full-width responsive behaviour.
- The hero renders *inside* the constrained main column, so it reads as a card
  rather than a page banner.
- The nav sits in the left column.
- Below 769px the nav is not off-canvas at all: it is `display: none` toggled to
  `display: block`, so opening it expands inline and pushes the entire page down.
- All of the above lives in `.demo-*` classes, meaning the demo showcases a page
  layout the library itself cannot produce.

## Goals

1. Full-bleed page: hero, section backgrounds, and the layout shell run edge to
   edge; prose keeps a readable measure.
2. Hero is full-width at the top of the page, outside the content column.
3. Nav becomes a right-hand column beneath the hero, sibling to main, that sticks
   once the hero scrolls out while main continues to scroll.
4. A condensed header bar reveals as the hero exits.
5. Below 1024px the nav becomes a burger-triggered off-canvas drawer, with the
   burger pinned top-right and reachable from page load.
6. The pieces ship as public `ui-*` components, so the demo is built from the
   library rather than from demo-local CSS.

## Non-goals

- Modernising existing components (`ui-menu`, `ui-dialog`, tokens). Spec B.
- Propagating anything to `fastblocks` or `fastblocks-htmy`. Spec C.
- Changing the content, ordering, or categories of the 32 demo sections.
- Any visual redesign beyond what the layout change requires.

## Decisions

| # | Decision | Rationale |
|---|---|---|
| 1 | New pieces become public `ui-*` components | The demo should be reproducible with the library's own classes |
| 2 | Nav column sticks **and** a condensed header bar reveals | Chosen over nav-only and over a shrinking hero |
| 3 | Full-bleed shell, capped text measure | Full-width look without unreadable line lengths on wide displays |
| 4 | Drawer breakpoint at **1024px** | Matches "tablet and mobile"; already one of the project's three breakpoints |
| 5 | Header hidden and revealed by scroll-driven CSS ≥1024px; always visible <1024px | CSS-first; below 1024px it is a normal app bar so the burger is reachable at page load |
| 6 | Four focused primitives, not two fat ones | Matches the project's one-component-one-purpose grain; `ui-drawer` stays reusable |

### Rejected alternatives

- **`:target` drawer** — hijacks the URL hash. The sidebar is 32 hash links; a
  `:target` drawer would fight every one of them. Disqualified outright.
- **Checkbox hack** — announces as a checkbox to assistive tech, and provides no
  light-dismiss, no Escape handling, and no focus return.
- **htmx `class-tools` / `hx-on` / hyperscript** — `class-tools` is time-driven,
  not click-driven; the others are inline-JS escape hatches. All add a dependency
  without beating four lines of vanilla JS, and none beat zero lines.
- **Duplicated nav markup** (one for desktop, one for the drawer) — doubles the
  DOM and breaks the stable-ID contract that htmx compatibility depends on.

## Page structure

```html
<body>
  <a class="ui-skip-link" href="#demo-content">Skip to content</a>
  <a class="ui-skip-link" href="#site-nav">Skip to section navigation</a>

  <header class="ui-navbar is-sticky" id="site-bar">
    <a class="ui-navbar-brand" href="#top">FastBlocks UI</a>
    <div class="ui-navbar-end">
      <button class="ui-button" data-theme-toggle>Theme</button>
      <button class="ui-burger" popovertarget="site-nav">
        <span class="ui-burger__bar" aria-hidden="true"></span>
        <span class="ui-burger__bar" aria-hidden="true"></span>
        <span class="ui-burger__bar" aria-hidden="true"></span>
        <span class="ui-burger__label">Menu</span>
      </button>
    </div>
  </header>

  <header class="ui-hero is-primary" id="top">
    <div class="ui-hero-body">
      <h1 class="ui-title">FastBlocks UI</h1>
      <p class="ui-subtitle">…</p>
    </div>
  </header>

  <div class="ui-shell">
    <main class="ui-shell-main" id="demo-content">…32 sections…</main>

    <nav class="ui-shell-aside ui-drawer" id="site-nav" popover
         aria-label="Component sections">
      <div class="ui-nav-group">
        <p class="ui-nav-group__label">Layout</p>
        <ul class="ui-nav-list">
          <li class="ui-nav-list__item">
            <a class="ui-nav-list__link" href="#container">Container</a>
          </li>
          …
        </ul>
      </div>
      …
    </nav>
  </div>
</body>
```

### Placement rationale

**App bar is DOM-first but `position: fixed`.** DOM order does not constrain
where a fixed element paints, so placing it first yields correct reading and tab
order — site chrome before content — at no layout cost.

**Nav is DOM-last, matching its visual position.** In LTR the main column is
visually first and the aside second, so DOM order and visual order agree and
WCAG 1.3.2 (Meaningful Sequence) and 2.4.3 (Focus Order) hold with no grid
reordering. The cost is that a keyboard user would otherwise traverse all 32
sections before reaching the nav; the second skip link and the early-in-tab-order
burger mitigate this.

**RTL is free.** `grid-template-columns: minmax(0, 1fr) <aside>` places the aside
at the inline end, so it flips to the left under `dir="rtl"`. The demo's existing
RTL showcase is a nested `dir="rtl"` region and does not affect the page shell.

## Components

### `ui-shell`

Full-bleed grid shell. Single column below 1024px; main + aside above.

```css
.ui-shell {
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  gap: var(--ui-space-6);
  padding-inline: var(--ui-space-4);
  padding-block: var(--ui-space-6);
  max-inline-size: var(--ui-shell-max, none);
  margin-inline: auto;
}

.ui-shell-main {
  min-inline-size: 0;
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  gap: var(--ui-space-6);
}

@media (min-width: 1024px) {
  .ui-shell {
    grid-template-columns: minmax(0, 1fr) var(--ui-shell-aside-width, 16rem);
    align-items: start;
  }
}
```

`--ui-shell-max` defaults to `none` (true full-bleed) and is settable per page.
Readable measure is a separate opt-in utility so component demos stay full width:

```css
.ui-measure { max-inline-size: var(--ui-measure-size, 72ch); }
```

`grid-template-columns: minmax(0, 1fr)` on `.ui-shell-main` is deliberate and
carries forward an existing hard-won fix: an auto-sized track floors at the
widest child's min-content width and applies that floor to every sibling, which
previously let one un-shrinkable component stretch all 32 sections past the
viewport.

### `ui-nav-list`

Vertical nav list. Reference: Bulma `.menu` / `.menu-label` / `.menu-list`.

Named `ui-nav-list`, **not** `ui-menu-list`, because `ui-menu` is already the
absolutely-positioned dropdown. A `ui-menu` / `ui-menu-list` pair would imply
kinship between components that behave nothing alike.

```css
.ui-nav-group + .ui-nav-group { margin-block-start: var(--ui-space-4); }

.ui-nav-group__label {
  font-weight: 600;
  font-size: 0.8125rem;
  text-transform: uppercase;
  letter-spacing: 0.03em;
  color: var(--ui-color-text-muted);
  margin: 0 0 var(--ui-space-2);
}

.ui-nav-list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: grid;
  gap: var(--ui-space-1);
}

.ui-nav-list__link {
  display: block;
  padding: 0.25rem 0.5rem;
  border-radius: var(--ui-radius-sm);
  color: var(--ui-color-text);
  text-decoration: none;
}

.ui-nav-list__link:hover,
.ui-nav-list__link:focus-visible,
.ui-nav-list__link.is-active {
  background: var(--ui-color-surface-muted);
  color: var(--ui-color-text-strong);
}
```

Uses the `__` element convention established by `ui-menu__item`,
`ui-tabs__panel`, and `ui-dialog__surface` in `components.css`.

### `ui-drawer`

Off-canvas panel built on the Popover API. Reference: Web Awesome `<wa-drawer>`.

The platform supplies light-dismiss, Escape-to-close, top-layer rendering,
implicit `aria-expanded` and `aria-details` on the invoker, placement of the
panel in the tab order when shown, and focus return to the invoker on close —
all verified against MDN. **No JavaScript for any of that**; see the responsive
switch below for the one narrow case that does need a listener.

```css
.ui-drawer {
  position: fixed;
  inset-block: 0;
  inset-inline-end: 0;
  inline-size: min(20rem, 85vw);
  padding: var(--ui-space-4);
  border: 0;
  border-inline-start: var(--ui-border-width) solid var(--ui-color-border);
  background: var(--ui-color-surface-raised);
  overflow-y: auto;
  overscroll-behavior: contain;
  translate: 100% 0;
  transition:
    translate 0.25s ease,
    overlay 0.25s allow-discrete,
    display 0.25s allow-discrete;
}

.ui-drawer:popover-open { translate: 0 0; }

@starting-style {
  .ui-drawer:popover-open { translate: 100% 0; }
}

.ui-drawer::backdrop {
  background: rgb(0 0 0 / 0.5);
  transition:
    background-color 0.25s,
    overlay 0.25s allow-discrete,
    display 0.25s allow-discrete;
}

@starting-style {
  .ui-drawer:popover-open::backdrop { background: rgb(0 0 0 / 0); }
}
```

`@starting-style` must follow the `:popover-open` rule — equal specificity means
source order decides.

### Single-element responsive switch

One DOM node serves both roles. The UA stylesheet's
`[popover]:not(:popover-open) { display: none }` is author-overridable, so above
1024px the popover attribute goes inert and the element renders as an ordinary
sticky column:

```css
@media (min-width: 1024px) {
  .ui-shell-aside[popover] {
    display: block;
    position: sticky;
    inset: auto;
    translate: none;
    inline-size: auto;
    border-inline-start: 0;
    overscroll-behavior: auto;
    top: calc(var(--ui-navbar-height) + var(--ui-space-4));
    max-block-size: calc(100vh - var(--ui-navbar-height) - var(--ui-space-8));
  }

  .ui-shell-aside[popover]::backdrop { background: none; }
  .ui-burger { display: none; }
}
```

With `.ui-burger` hidden above 1024px nothing can open the popover, so the
top-layer path is unreachable there.

**Known edge case, and the one place JavaScript is required.** If the drawer is
open below 1024px and the viewport is then widened past 1024px (tablet rotation,
window resize), the element remains in the top layer because `:popover-open`
state persists across the media-query change. CSS cannot express this.

**Decision: add the listener.** The alternative — accepting it — leaves the panel
rendering as a stuck open sheet over a desktop layout, with no visible control to
dismiss it since the burger is hidden above 1024px. That is a dead end for the
user, not a cosmetic wrinkle.

```js
const wide = matchMedia('(min-width: 1024px)');
wide.addEventListener('change', (e) => {
  if (e.matches) document.getElementById('site-nav')?.hidePopover();
});
```

This is the **only** JavaScript this spec introduces. It is behaviour-only and
the component is fully functional without it at every static viewport size,
which satisfies the library's JS-optional constraint. It belongs in
`enhance.js`, generalised over `[data-ui-drawer-breakpoint]` rather than
hard-coded to one element ID.

### `ui-burger`

Toggle button. Reference: Bulma `.navbar-burger`. Three bars that transform to a
cross when the popover is open. Bulma's implementation requires JavaScript to
toggle `is-active`; ours does not, because the browser maintains `aria-expanded`
on a `popovertarget` invoker and CSS can select on it.

```css
.ui-burger {
  /* `position: relative` is required, not decorative: `.ui-burger__label`
     below is `position: absolute`, and without a positioned ancestor here it
     resolves against whatever positioned element happens to be further up the
     page. That is precisely the `ui-menu` footgun this spec criticises -- see
     the roadmap's item 1.1. */
  position: relative;
  display: inline-flex;
  flex-direction: column;
  justify-content: center;
  gap: 5px;
  inline-size: 2.75rem;
  block-size: 2.75rem;
  padding: 0;
  border: 0;
  background: none;
  cursor: pointer;
}

.ui-burger__bar {
  display: block;
  block-size: 2px;
  inline-size: 1.25rem;
  margin-inline: auto;
  background: currentColor;
  transition: translate 0.2s ease, rotate 0.2s ease, opacity 0.2s ease;
}

.ui-burger__label {
  position: absolute;
  inline-size: 1px;
  block-size: 1px;
  overflow: hidden;
  clip-path: inset(50%);
  white-space: nowrap;
}

.ui-burger[aria-expanded="true"] .ui-burger__bar:nth-child(1) {
  translate: 0 7px;
  rotate: 45deg;
}
.ui-burger[aria-expanded="true"] .ui-burger__bar:nth-child(2) { opacity: 0; }
.ui-burger[aria-expanded="true"] .ui-burger__bar:nth-child(3) {
  translate: 0 -7px;
  rotate: -45deg;
}
```

The 2.75rem box satisfies the WCAG 2.5.8 (Target Size, Minimum) 24px floor with
margin to spare. `.ui-burger__label` provides the accessible name visually
hidden; it must not be replaced with `aria-label` alone, so the control retains
a name if CSS fails to load.

`aria-expanded` is browser-maintained via the implicit invoker relationship. The
implementation plan must include an e2e assertion that this holds in all three
target engines, since the CSS depends on it and a polyfill would be needed if any
engine does not set the attribute in the DOM.

### `.ui-navbar.is-sticky`

A modifier on the existing `ui-navbar`, not a fifth component. The condensed
header is structurally a navbar — brand on one side, actions on the other.

```css
:root {
  --ui-navbar-height: 3.5rem;
  scroll-padding-top: calc(var(--ui-navbar-height) + var(--ui-space-4));
  scrollbar-gutter: stable;
}

.ui-navbar.is-sticky {
  position: fixed;
  inset-block-start: 0;
  inset-inline: 0;
  z-index: 30;
  block-size: var(--ui-navbar-height);
}

/* Default and no-support fallback: bar is always visible, space reserved. */
body { padding-block-start: var(--ui-navbar-height); }

@supports (animation-timeline: view()) and (timeline-scope: none) {
  @media (min-width: 1024px) {
    body {
      padding-block-start: 0;
      timeline-scope: --page-hero;
    }

    .ui-hero {
      view-timeline-name: --page-hero;
      view-timeline-axis: block;
    }

    .ui-navbar.is-sticky {
      animation: ui-navbar-reveal linear both;
      animation-timeline: --page-hero;
      animation-range: exit 0% exit 100%;
    }
  }
}

@keyframes ui-navbar-reveal {
  from { opacity: 0; translate: 0 -100%; visibility: hidden; }
  to   { opacity: 1; translate: 0 0;     visibility: visible; }
}

@media (prefers-reduced-motion: reduce) {
  .ui-navbar.is-sticky { animation-duration: 1ms; }
  .ui-drawer { transition-duration: 1ms; }
  .ui-burger__bar { transition-duration: 1ms; }
}
```

Three points hold this together:

- **`timeline-scope` on `body`** is what lets the navbar animate off the *hero's*
  visibility. A named view timeline is otherwise only visible to the element's
  own descendants.
- **`scroll-padding-top` on `:root`** replaces the current per-section
  `scroll-margin-top`, so all 32 anchor links stop landing beneath the fixed bar.
  One declaration instead of one per section.
- **The always-visible bar is the default**, and the reveal is layered on top
  inside `@supports`. Progressive enhancement in the correct direction: the
  fallback needs no separate authoring.

## Browser support and fallback policy

Verified 2026-07-28.

| Feature | Chrome/Edge | Safari | Firefox | Fallback |
|---|---|---|---|---|
| Popover API | ✅ 114+ | ✅ 17+ | ✅ 125+ | none needed |
| `@starting-style` / `allow-discrete` | ✅ | ✅ | ✅ | drawer appears without transition |
| Scroll-driven animations | ✅ 115+ | ✅ 18+ | ❌ **flagged in 152** | `@supports` → always-visible bar |
| `overscroll-behavior` | ✅ | ✅ | ✅ | scroll chaining, cosmetic |
| `content-visibility` | ✅ | ✅ 18+ | ⚠️ partial | renders normally, slower |

**Scroll-driven animations are not Baseline.** As of Firefox 152 (June 2026) the
feature remains behind `layout.css.scroll-driven-animations.enabled` in stable
Firefox. Coverage is roughly 90%. The `@supports` branch is therefore not a
legacy tail — it is the path every stable-Firefox user takes, and it must be
treated as a first-class supported rendering, not a degraded one. It is
visually identical to the "always-visible sticky bar" option, which was an
acceptable design in its own right.

**Policy going forward:** add `web-features` and `@mdn/browser-compat-data` as
devDependencies and assert a declared Baseline floor in CI, so `@supports` guards
become enforced policy rather than author judgement. Tracked in the roadmap.

## Additional CSS adopted

Four platform features folded in because they address problems this layout
introduces:

| Feature | Applied to | Why |
|---|---|---|
| `overscroll-behavior: contain` | `.ui-drawer` | Stops scroll chaining from the open drawer to the page behind it |
| `scrollbar-gutter: stable` | `:root` | Prevents layout shift when the drawer takes over scrolling |
| `content-visibility: auto` + `contain-intrinsic-size` | `.demo-section` | 32 full-bleed sections is precisely this feature's target case |
| `text-wrap: balance` | `.ui-title`, `.ui-subtitle` | The hero is now full-bleed, so headlines wrap at large widths |

`content-visibility: auto` requires `contain-intrinsic-size` to give offscreen
sections a placeholder size; without it, scroll position and anchor landing
become unstable as sections render. E2E must verify anchor navigation still lands
correctly with it enabled.

## Accessibility contract

- Two skip links: to content and to section navigation.
- Nav DOM order matches visual order (WCAG 1.3.2, 2.4.3).
- Burger has a visually-hidden text label, not `aria-label` alone.
- Burger target is 2.75rem (WCAG 2.5.8 minimum is 24px).
- `aria-expanded` and `aria-details` are browser-maintained via `popovertarget`.
- Escape closes the drawer and returns focus to the burger — platform-supplied.
- The drawer is a `<nav>` with `aria-label="Component sections"`; it keeps that
  label in both roles, so the accessible name is stable across breakpoints.
- `prefers-reduced-motion: reduce` collapses the reveal, drawer slide, and burger
  morph to 1ms.
- The existing navbar landmark-name override behaviour (commit f188d25) must be
  preserved.
- Colour contrast of the burger and app bar over `is-primary` hero fill must meet
  4.5:1 and be asserted.

## Python API

New helpers in `fastblocks_ui/helpers.py`, exported from `__init__.py`, and
registered in `manifest.json` alongside the existing 20+ components:

```python
def shell(main, aside=None, *, aside_width=None, max_width=None,
          class_=None, **attrs) -> SafeHTML: ...

def nav_list(items, *, label=None, active=None,
             class_=None, **attrs) -> SafeHTML: ...

def nav_group(groups, *, class_=None, **attrs) -> SafeHTML: ...

def drawer(content, *, id, label=None, side="end",
           class_=None, **attrs) -> SafeHTML: ...

def burger(*, controls, label="Menu", class_=None, **attrs) -> SafeHTML: ...
```

Constraints carried over from existing helpers: return `SafeHTML`; escape all
interpolated content; route URLs through `_safe_url`; share one render path
across Jinja, async Jinja, and FastBlocks fragments; accept `class_` and
arbitrary `**attrs`; use `stable_id` where an ID must survive htmx swaps.

`drawer()` requires an explicit `id` because `popovertarget` needs a stable
target — this is the htmx stable-ID constraint surfacing in the API.

Manifest entries must be added for each, with `codegen` set consistently with
comparable existing components, and `scripts/sync_manifest_params.py` re-run so
recorded parameters match the signatures.

## Build pipeline

Three artefacts must stay consistent:

1. **`scripts/build_demo.py`** — source of truth. `DEMO_CSS`, the body template,
   `build_sidebar()`, and `build_content()` all change. The inline `nav_js`
   toggle script is deleted; the drawer is declarative.
2. **`demo/index.html`** — regenerated output.
3. **`demo/demo.html`** — hand-written reference, updated to match. Both pages
   stay fully self-contained with inlined CSS/JS so either opens as a bare file.

`tests/test_demo_parity.py` asserts real helper output appears verbatim in
`demo.html`; its `'<nav class="demo-sidebar"'` index lookup changes to the new
markup. Every fragment marked "real helper output" must be regenerated by calling
the actual helper, never hand-edited.

## Testing

**pytest** (`tests/test_fastblocks_ui.py`): each new helper — default render,
custom `class_`, arbitrary attrs, escaping of hostile content, URL safety,
`SafeHTML` return type. Manifest completeness and signature-sync checks.

**pytest** (`tests/test_demo_parity.py`): updated selectors; parity between
generated and hand-written demos.

**Vitest**: cover the new `enhance.js` breakpoint listener — drawer open below
the breakpoint plus a `matchMedia` change to wide closes it; already-closed
drawer is a no-op; absent element does not throw. Existing `enhance.js` tests
must still pass. This spec deletes the demo's inline nav script and adds one
generalised listener to `enhance.js`.

**Playwright e2e** at 375px, 768px, 1023px, 1024px, 1280px:
- Drawer opens from burger, closes on backdrop click, closes on Escape.
- Focus returns to the burger on close.
- `aria-expanded` flips on the invoker without author JS (all three engines).
- Above 1024px: aside is an in-flow sticky column, burger is hidden.
- Open the drawer at 768px, resize to 1280px: drawer closes and the aside
  renders as an in-flow sticky column with no top-layer remnant.
- Anchor links land correctly beneath the fixed bar (`scroll-padding-top`), with
  `content-visibility: auto` active.
- App bar reveal in a scroll-driven-capable engine; always-visible fallback in
  Firefox stable. **Both paths must be asserted, not just the enhanced one.**

**axe / accessibility spec**: no new violations at each breakpoint, drawer open
and closed; contrast of burger and app bar over the hero fill.

**CSS drift gate**: the inlined-CSS drift check added in f188d25 must be extended
to cover the new rules.

## Risks

| Risk | Mitigation |
|---|---|
| Firefox lacks scroll-driven animations | `@supports` fallback is a first-class supported rendering and is explicitly tested |
| Drawer left open across the 1024px boundary | Resolved: generalised `matchMedia` listener in `enhance.js` closes it; covered by unit and e2e tests |
| `content-visibility` destabilises anchor scrolling | `contain-intrinsic-size` required; e2e asserts anchor landing |
| Three artefacts drift apart | Parity test extended before markup changes |
| `aria-expanded` not set in DOM by some engine | E2E asserts it in all three; polyfill only if it fails |
| Full-bleed hurts readability on ultrawide | `.ui-measure` utility on prose; `--ui-shell-max` available per page |

## Follow-ups (not this spec)

Recorded in `docs/modernization-roadmap.md`:

- `ui-menu` migration to Popover API + anchor positioning, retiring the
  `position: relative` ancestor contract.
- `ui-dialog` migration to `command` / `commandfor`, retiring the hand-rolled
  focus trap in `enhance.js`.
- Baseline enforcement in CI via `web-features`.
