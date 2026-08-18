# Expand UI vocabulary and visual polish

- **Date:** 2026-08-18
- **Status:** Draft, not yet implemented
- **Scope:** Six new components, four backdrop systems, five motion/feedback primitives, and three 3D / WebGL / media integration points. No glass-feature changes — those land in a follow-up to this spec via one-token edits to the `--_ui-glass-components` custom property introduced by the glass plan.

This spec is one of three companion documents for fastblocks-ui's "elevate the default library" push:

| Doc | Covers |
|---|---|
| This spec | Design rationale, goals, decisions, a11y contract, browser floor |
| Companion plan (`...-plan.md`, not yet drafted) | Task-by-task TDD implementation |
| Glass spec (`2026-08-06-glassmorphism-surface-design.md`) | The opt-in glass surface treatment (already drafted) |

## Problem

FastBlocks UI has the surface vocabulary to build functional UIs but lacks
the surfaces and effects that distinguish premium libraries (Linear,
Vercel, Stripe, Apple Vision Pro landing pages, iOS 26 Liquid Glass).
Reading the current `repos.yaml` / `manifest.json` and the existing
components, the gaps cluster into three categories:

1. **Missing components.** Modern UIs reach for tooltips, popovers,
   toasts/notifications, command palettes, context menus, and avatars
   constantly; none exist yet. These are the "obvious glass surfaces"
   identified during the glass review (per-component review, August
   2026) and the surfaces modern design systems most often apply glass,
   noise, and motion to.

2. **No backdrop or motion vocabulary.** There is no full-bleed hero,
   no aurora / mesh gradient, no noise / grain overlay, no geometric
   pattern. There is no cursor-follow glow, no scroll-driven reveal,
   no tilt on hover, no page transition. The library ships static,
   flat surfaces that look correct but don't *feel* premium.

3. **No 3D / WebGL / media integration.** Three.js, Spline, Lottie, and
   `<model-viewer>` are not exposed as first-class primitives. Consumers
   who want them currently hand-roll the integrations.

Together these gaps keep fastblocks-ui in "functional but plain" territory.
Closing them — without compromising the existing restraint-first design
identity — is the goal of this plan.

## Goals

### Scope 1: Six new components

1. **`ui-tooltip`** — short text on hover/focus, ARIA-described, focus
   management via the Popover API (where supported) or the CSS Anchor
   Positioning polyfill.
1. **`ui-popover`** — click-triggered, rich content, dismissable via
   outside-click / Escape / focus-loss. Built on the Popover API with
   graceful fallback.
1. **`ui-toast` / `ui-snackbar`** — transient notification queue with
   auto-dismiss, ARIA live regions, pause-on-hover, max-stack policy.
1. **`ui-command`** — command palette / CMDK picker with fuzzy search,
   keyboard navigation, async result loading, recent-items.
1. **`ui-context-menu`** — right-click anchored menu with keyboard
   navigation and ARIA `role="menu"`.
1. **`ui-avatar`** — identity indicator with optional status dot,
   initials fallback, and group / stack rendering.

All six ship glass-ready: their class name is appended to
`--_ui-glass-components` in the *same* PR that introduces the component,
not as a follow-up.

### Scope 2: Backdrop systems and motion / feedback primitives

1. **Full-bleed hero background** — `.is-fullbleed` utility class
   covering the viewport behind a hero region.
1. **Aurora / mesh gradient backdrop** — multiple radial gradients
   composited via `conic-gradient` + optional `filter: hue-rotate`
   animation. Pure CSS, no JS.
1. **Noise / grain overlay** — pseudo-random texture via SVG turbulence
   or CSS `filter: url(#noise)`. Adds depth to flat surfaces.
1. **Geometric pattern backgrounds** — grid, dots, lines as SVG / CSS
   patterns.
1. **Cursor-follow spotlight glow** — radial gradient that tracks mouse
   position, masked to a card or button. The "Linear button hover"
   effect. Requires a single `pointermove` listener (1-line JS opt-in
   on the consumer's end, or progressive enhancement via CSS-only
   `:hover` for consumers who opt out).
1. **Scroll-driven reveals** — IntersectionObserver-based `translate +
   opacity` reveal as content enters the viewport. No scroll-tied blur
   (which the glass spec forbids — scroll-tied blur would re-introduce
   motion-related vestibular concerns).
1. **Tilt on hover** — 3D CSS `transform: rotateX/rotateY` driven by
   mouse position. 150ms ease-out, fully suppressed under
   `prefers-reduced-motion`.
1. **Theme transitions** — animate color tokens (rather than snapping)
   on `data-theme` toggle.
1. **Page transitions** — View Transitions API for cross-route
   animation, where supported.

### Scope 3: 3D / WebGL / media integrations

1. **Spline embed** — `<spline-viewer>` wrapper component, opt-in lazy
   load, `prefers-reduced-motion` fallback to a static poster image.
1. **Three.js mesh-gradient backdrop** — vertex/fragment shader for
   the "Apple Vision Pro landing page" effect. Heavier weight;
   opt-in via a single class.
1. **`<model-viewer>` wrapper** — glTF product viewer with built-in
   camera controls, fallback to image poster on unsupported engines.
1. **Lottie animations** — After Effects → JSON via `lottie-web`,
   with `prefers-reduced-motion` fallback to a static keyframe.
1. **`<video>` muted loop backgrounds** — with overlay tint + content;
   the Stripe-homepage-hero pattern.

### Cross-cutting

1. **All new features compose freely with `data-theme="dark"`.**
   Surface / motion / 3D features do not introduce color-scheme
   coupling.
1. **All motion is gated by `prefers-reduced-motion: reduce`.** The
   static version always renders fully; motion is layered on top.
1. **All new components pass the existing pytest / Playwright / vitest
   gates** at the same coverage levels as the rest of the library.
1. **No new browser floor beyond what the glass spec establishes**
   (Baseline "newly" with the existing allowlist).
1. **No new Python helper signature changes that aren't strictly
   necessary.** New keyword args on existing helpers are fine; new
   dedicated helpers (e.g. `tooltip()`, `toast()`) are preferred over
   complex multi-purpose helpers.

## Non-goals

- **Glass-feature changes.** This spec does not edit the glass spec
  or plan. The six new components do **not** auto-append to
  `--_ui-glass-components`; consumers opt-in per-instance via
  `class_="is-glass"` if they want the glass surface (with the
  exclusion of `ui-avatar`, which the glass spec's "no ordinary
  interactive / dense surfaces" rule excludes by default — the
  `avatar_group` helper does not auto-glass its children).
- **Replacing existing helpers.** `card()`, `dialog()`, etc. keep
  their signatures; new helpers (`tooltip()`, `popover()`, etc.) are
  added alongside.
- **Building a design-system-internal component library** — the goal
  is to ship the *primitives* consumers need, not the
  business-logic wrappers (e.g. a "command palette manager" — consumers
  wire that themselves).
- **Custom WebGL / shader work outside Scope 3.** Shader implementation
  lives in Scope 3 and is opt-in; the rest of the library must
  function in browsers without WebGL2 support.
- **Animation library integration** (Framer Motion, GSAP, Motion One)
  for the core library. Motion is implemented via CSS transitions /
  animations + a tiny `pointermove` listener where needed. Consumers
  who want Framer-style APIs can layer them on top.
- **Theming overhaul.** This spec assumes the existing token system
  (color, surface, border, space, radius). New tokens added under
  this spec extend the system; none redefine existing ones.
- **JS delivery / bundling infrastructure.** This spec does *not*
  add a JS bundler, minifier, source-map generator, or bare-specifier
  resolver. The repo has zero build pipeline for JS today; we keep
  it that way. JS modules are ES module source files served as-is,
  with bare-specifier imports (`import("three")`) resolved by
  consumer-side tooling (import maps, bundlers) or replaced with
  consumer-supplied resolved URLs. The library exposes **API adapters**
  that accept consumer-supplied module references or URLs — never
  hard-coded bare-specifier imports in the shipped browser entrypoint.
- **Global navigation interception.** The page-transition feature
  exposes a `fastblocks_ui.transition(callback)` wrapper that
  consumers call explicitly inside their own router (htmx, Turbo,
  fetch + DOM swap). The library does **not** intercept `<a>` clicks
  globally — that pattern silently breaks htmx-based consumers
  because it changes the URL via `history.pushState()` without
  performing the navigation. Consumers wire their own routing
  inside the transition callback.
- **Animations / motion that doesn't respect `prefers-reduced-motion`.**
  Every JS module and every CSS animation gates on reduced-motion.
  Consumers cannot opt out of this guard — it's the floor.

## Decisions

| # | Decision | Rationale |
|---|---|---|
| 1 | Six components ship together (Scope 1) as a coordinated release | Each component is independently useful, but releasing them together prevents the "ghost glass" problem (where glass references components that don't exist yet) and gives consumers a complete surface vocabulary in one upgrade |
| 2 | `ui-tooltip` uses `popover` semantics with `popover="hint"` where supported | Single mental model across all floating UI; future-proofs against Popover API's "hint" variant landing in stable Safari / Firefox; older browsers fall back to absolute-positioned + JS-driven placement |
| 3 | `ui-popover` and `ui-dialog` both use the Popover API (`popover="auto"`), with `[popover]` polyfill via `@floating-ui/dom` if needed | The Popover API is the platform-blessed answer to outside-click / focus-loss / top-layer rendering; using it for both keeps the implementation consistent |
| 3a | Popover API does **not** toggle `aria-expanded` automatically | Factual correction from initial draft: ARIA state is the consumer's responsibility. Implementers must wire `aria-expanded="true|false"` on the trigger to the popover's `toggle` event. Without this, screen readers receive stale state |
| 4 | `ui-toast` ships as **both** a Python helper (`toast(content, severity=, duration=)` for SSR) **and** a JS API (`import { toast } from "@fastblocks-ui/toast"` for client-side firing) | The library's posture is progressive enhancement with server-side render first; htmx-after-save flows need a Python path. The JS queue handles timing, stacking, and ARIA live-region coordination; the Python helper renders the role="status" / role="alert" container with a small `<script>` that hands off to the JS queue |
| 5 | `ui-command` ships with no built-in fuzzy-search algorithm — uses a consumer-supplied async `load_results(query: str) -> Promise<Result[]>` | The matcher (fuse.js, fuzzysort, server-side search, etc.) is a consumer choice; shipping one would lock consumers in. Throw at first invocation if `load_results` is missing |
| 5a | `ui-command` keybinding is configurable; `/` is the primary, `Cmd/Ctrl-K` is the secondary | Cmd-K collides with macOS Safari (Find Selection) and Chrome (search bar). Consumers must `event.preventDefault()` on the keydown. Non-Latin keyboard layouts put "K" in different physical positions. `/` works on all layouts. Default: `data-command-key="slash,mod+k"` |
| 6 | `ui-context-menu` uses the Popover API + a `position-anchor` CSS Anchor for the click target | The Popover API gives top-layer rendering and outside-click handling; CSS Anchor gives us keyboard-friendly positioning without a JS positioning library |
| 7 | `ui-avatar` supports stacked groups via a `avatar_group(avatars, *, max=4)` Python helper that computes the `+N` overflow itself | Consumers should not write the same `+N` boilerplate. The `+N` element carries `aria-label="N more users"` |
| 7a | `ui-avatar` is **not** added to `--_ui-glass-components` by default — it's an interactive / dense surface per the glass spec's exclusion list | The glass spec explicitly excludes "ordinary interactive or dense surfaces" from glass; an avatar is typically used in dense lists (navbars, comment threads, user rosters). Consumers opt-in per-instance via `class_="is-glass"` on the avatar element if they want the translucent identity-ring pattern |
| 8 | Aurora gradient uses `--ui-aurora-stop-1`, `--ui-aurora-stop-2`, `--ui-aurora-stop-3` (3 stops) | Designers tune the gradient per-section; theme-aware (stops derive from `--ui-color-*` tokens). Three tokens trade convenience for tunability; collapse to one if a future spec shows the 3-stop pattern is over-engineered |
| 9 | Noise overlay uses inline SVG `<filter id="ui-noise">` referenced via `background-image: url("data:image/svg+xml;...")` — *not* a separate `.svg` file | CSP-friendly (no extra fetch); ships with the bundle; small enough (≈1 KB) |
| 10 | Cursor-follow glow uses `has-spotlight` (class, not `[data-spotlight]`) — see Decision 18 on naming convention | The class-form is consistent with `has-noise` / `has-pattern-*` / `has-lottie` / `has-video-bg`. One listener per page; the JS counts opt-in elements at init and returns early if zero match |
| 11 | Scroll-driven reveals use `IntersectionObserver` with a `threshold: 0.1` and `rootMargin: 0px 0px -10% 0px`; the JS adds `data-revealed="true"`, CSS handles the transition | CSS-driven motion; JS only flips a state attribute; `prefers-reduced-motion` users get the revealed state immediately. JS also adds `MutationObserver` for elements added to the DOM after page load (HTMX swaps, infinite scroll, command-palette lists) |
| 12 | Tilt on hover uses CSS `transform: perspective(800px) rotateX(...) rotateY(...)` with `transition: transform 150ms ease-out`; the JS reads `mousemove` and writes CSS variables | Same single-listener pattern as spotlight; the per-element transform is computed from `--ui-tilt-x` / `--ui-tilt-y` custom properties |
| 13 | Theme transitions apply a `transition: background-color 200ms, color 200ms, border-color 200ms` to a **narrowed** selector list (button, .ui-card, .ui-navbar, .ui-dialog, .ui-drawer, .ui-dropdown, .ui-tooltip, .ui-popover, .ui-toast, .ui-avatar) — text elements (p, h1-h6, a) are excluded | Animated color flips on text read as contrast flicker. The narrowed list keeps the theme switch readable as "polished" without the jank of 30+ elements animating simultaneously |
| 14 | Page transitions use the View Transitions API (`document.startViewTransition`) **exposed as a wrapper function**, not a global anchor interceptor | Consumers call `fastblocks_ui.transition(callback)` explicitly. The library does NOT intercept `<a>` clicks globally — that pattern (used in the initial draft) is dangerous because it changes the URL via `history.pushState()` without performing the navigation, leaving the page in a broken state for consumers using htmx or server-side routing. The wrapper pattern lets consumers wire their own router (htmx, Turbo, fetch + DOM swap) inside the transition callback |
| 15 | Three.js mesh-gradient backdrop is opt-in via `.has-mesh-gradient` + a `data-shader-url` attribute pointing to a `.glsl` file in `static/shaders/` | Keeps the shader source outside the JS bundle (consumer controls the art); the wrapper component loads Three.js lazily only when the class is present. **Default frame rate is 30 fps** (not uncapped); consumers opt-in to 60 fps via `data-frame-cap="60"` for hero sections where they explicitly want the smoothness. Battery-positive shipping defaults beat opt-out bolt-ons |
| 16 | Lottie animations use `lottie-web` from CDN (or the consumer's preferred bundle) loaded **lazily via IntersectionObserver** when a `.has-lottie` element scrolls near the viewport | Lazy load keeps the core bundle slim; consumers supply the JSON via `data-lottie-url`. Off-screen Lotties don't fetch until just before they're visible. The reduced-motion fallback (poster image) is the default until first paint completes, then the live animation upgrades |
| 17 | `<video>` muted-loop backgrounds use `<video autoplay muted loop playsinline preload="metadata">` with an `aria-hidden="true"` overlay; consumers provide the `.webm` / `.mp4` source. **Also guarded by `prefers-reduced-data: reduce`** — a1080p video is 3-7 MB on cellular, so the media-source is replaced by the static poster image under reduced-data | The browser-native `<video>` is more efficient than any JS shim; aria-hidden keeps it out of the accessibility tree. iOS Safari can still block autoplay in some cases — the wrapper exposes a `data-click-to-play` opt-in for those environments |
| 18 | **Two-way class/attribute naming convention**: `is-*` for boolean state (mirrors `is-primary`, `is-glass`, `is-sticky`); `has-*` for static layered visual effects (mirrors `has-noise`, `has-spotlight`); `[data-*]` for JS-toggled runtime state (e.g. `data-revealed="true"`) | The initial draft muddled these — `is-aurora` and `is-mesh-gradient` are layered effects, not states. They become `has-aurora` / `has-mesh-gradient`. `data-spotlight` becomes `has-spotlight`. **`data-reveal` and `data-tilt` stay as attributes** because they hold JS-flipped runtime state, not visual layer flags. All opt-in selectors wrapped in `:where()` so consumers' transforms always win specificity |
| 19 | **JS↔CSS contract**: every JS module (a) writes *only* to `--ui-*` CSS custom properties via `el.style.setProperty('--ui-X', value)` — never directly to `transform`, `opacity`, etc.; (b) the corresponding CSS rule always supplies a `var(--ui-X, default)` fallback so the element renders correctly with JS disabled; (c) every JS module checks `matchMedia("(prefers-reduced-motion: reduce)").matches` early-return and the CSS rule is gated by the same media query | This is the contract that lets future specs (scroll-driven blur, magnetic buttons) inherit the same pattern. Documented once, applied everywhere. Without it, contributors will write `el.style.transform = ...` directly and break the entire model |
| 20 | **JS delivery contract**: each motion/feedback module is **individually importable** (`import { spotlight } from "@fastblocks-ui/spotlight"`); none auto-register on `<body>` | The initial draft's "registered on `<body>` via a deferred `<script>`" pattern auto-loads JS for consumers who never use the feature — a "page that doesn't use spotlight pays the spotlight listener tax" bug. Modules count at init (`document.querySelectorAll("[has-effect]").length > 0`) and return early when zero match. Consumers opt-in by importing the modules they need |
| 21 | **Shared `--_ui-backdrop-base` selector list** at the top of `effects.css` for the common `position: relative; isolation: isolate;` setup across all backdrop classes | Mirrors `--_ui-glass-components` from the glass spec. Avoids the same drift risk: a6th backdrop class would otherwise need to remember to add the setup |
| 22 | **Native-first extension** (per `docs/light-dom-custom-elements-spec.md`): where the platform provides the behavior natively (Popover API, View Transitions, `command`/`commandfor`, custom elements), the spec uses the native API. JS enhancement is scoped narrowly to behavior the platform cannot provide (fuzzy search, async command results, toast queue, IntersectionObserver-driven reveals, click-to-m-mapped tilt and spotlight) | The existing `dialog()` and `dropdown()` helpers have already moved to native-first (no JS in the helper itself). The new components follow the same principle. This is repo governance, not just taste |

### Rejected alternatives

- **Per-component implementation plans.** Considered and rejected —
  the six components share enough patterns (Popover API, focus
  management, ARIA semantics) that splitting into six plans would
  duplicate the boilerplate. One plan with per-component tasks.
- **`ui-dropdown` → `ui-popover` rewrite.** Rejected. Dropdowns have
  a specific form-control integration pattern that popovers
  don't; keeping dropdown for form-controls and popover for floating
  content is the right separation. Both ship in this spec.
- **CSS-only tooltips (no JS).** Rejected. CSS-only tooltips lack
  the dynamic positioning required when consumers place tooltips on
  nested or transformed elements; the Popover API solves it without
  hand-rolled positioning math.
- **Three.js as a hard dependency.** Rejected. Three.js is ~150 KB
  gzipped; loading it on every page is wasteful. Opt-in via
  `.is-mesh-gradient` + lazy import.
- **A unified "effect" primitive that wraps all backdrops.** Rejected.
  Each backdrop (aurora, noise, geometric, mesh) is visually distinct
  and benefits from its own CSS class. A unified primitive would be a
  configuration soup (`<div class="ui-effect ui-effect--aurora
  ui-effect--animated">`) instead of a clean selector set.
- **`@starting-style` for theme transitions.** Considered — it's
  the CSS-native way to animate in styles on first paint. Rejected
  for theme transitions because the JS-controlled flag pattern is
  more predictable across browsers; `@starting-style` lands in
  Safari soon but isn't Baseline yet.

## Cross-cutting token additions

Five new tokens, all in `@layer tokens`:

```css
:root {
  /* Motion */
  --ui-motion-duration-fast: 150ms;
  --ui-motion-duration-base: 200ms;
  --ui-motion-duration-slow: 400ms;
  --ui-motion-easing-standard: cubic-bezier(0.2, 0, 0, 1);
  --ui-motion-easing-emphasized: cubic-bezier(0.3, 0, 0, 1);
}
```

Existing `--ui-radius-lg`, `--ui-color-surface`, `--ui-color-border`,
etc. are reused. No new color tokens. No `--ui-*` tokens are
introduced for backdrops — backdrops consume color tokens directly
(`--ui-aurora-stop-1: oklch(from var(--ui-color-primary) ...)`).

---

## Scope 1: Six new components

Each component below ships with: a Python helper (per the established
`(trigger, *, id, ..., class_=None, **attrs)` signature shape that
mirrors `dialog()` / `drawer()` / `dropdown()`), a CSS rule in
`components.css` (six components stay in `components.css`; the JS-
coupled `ui-command` gets a sibling `command.css` for its CSS), a
vitest token-existence check (where new tokens are introduced), a
Playwright behavior spec, and a pytest parity test in
`test_demo_parity.py`.

**Helper API discipline (per FastBlocks review):** every helper emits
*only* the body / panel element. The trigger is a separate element
the consumer composes (e.g. `<button data-tooltip-target="...">` +
`tooltip(text=...)`). This matches the existing split-responsibility
convention of `burger()` / `drawer()` / `dropdown()`. Stable `id` is
required (for `popovertarget` / `aria-controls` linkage) and mirrors
`dialog()` / `drawer()` / `dropdown()`'s approach.

**Glass readiness is *opt-in per instance*, not auto:** the spec's
initial draft said every new component auto-appends to
`--_ui-glass-components` at ship time. Per the glass spec's own
opt-in / restraint-first policy and Decision 7a (`ui-avatar`
specifically excluded), the **correct** pattern is: consumers
opt-in per instance via `class_="is-glass"` on the component
element. The library does not pre-add any of the six new
components to the glass list. The glass plan's `--_ui-glass-components`
list stays as-is (card, dialog, drawer, navbar, dropdown).

**Toast is special-cased** because it ships as BOTH a Python helper
(`toast()` for server-rendered static regions like notification
panels) AND a JS API (`import { toast } from "@fastblocks-ui/toast"`
for client-side dispatch via the `HX-Trigger` response header —
see the htmx contract above).

The `--_ui-glass-components` edit is mechanical: open
`fastblocks_ui/static/css/components.css`, find the `--_ui-glass-components`
declaration (introduced by the glass plan), append the new class name,
rebuild the bundle, done. The implementer does this *as part of* the
component's commit, not as a follow-up.

### 1.1 `ui-tooltip`

**Behavior:** appears on `:hover` and `:focus-visible` of the
trigger element (a consumer-provided element with
`data-tooltip-target="<tooltip-id>"` or `aria-describedby="<tooltip-id>"`).
Shows short text — typically one line, ≤ 80 characters. Dismisses
on `:hover` / `:focus-visible` loss, Escape key, or pointer leaves
the trigger + tooltip region (300ms grace period).

**Touch devices:** `:hover` doesn't fire reliably on touch. The
tooltip shows on `:focus-visible` (which keyboard and tap-then-tab
navigation both trigger). On touch-only devices, the
`aria-describedby` content is read by the screen reader on focus
land, which is the documented fallback for touch users.

**Trigger requirement:** the trigger **must** be a natively focusable
element (`<button>`, `<a>`, `<input>`, etc.) or carry
`tabindex="0"`. Without this, screen reader users get no description
because `aria-describedby` is read on focus. The companion plan
documents this in the tooltip task as a defensive comment.

**Positioning:** uses `popover="hint"` where supported (Baseline
"newly" in Chromium 2024+, Safari 17+, Firefox 128+). The Popover
API handles outside-click / focus-loss dismissal natively. On
engines without `popover="hint"` support, the wrapper falls back to
absolute positioning computed from the trigger's bounding rect via
`getBoundingClientRect()`.

**Accessibility contract:**
- Trigger gets `aria-describedby="<tooltip-id>"`.
- Tooltip element gets `role="tooltip"`.
- Tooltip is **not** focusable (it's a *description* of the trigger,
  not a destination).
- Tooltip text is read by screen readers when focus lands on the
  trigger (via `aria-describedby`), in addition to visual hover.
- Tooltip does not appear on `:focus` without `:focus-visible` —
  keyboard users see tooltips on Tab, but mouse users don't get them
  when clicking (only on hover).
- Time-sensitive tooltip text (e.g. "Last synced 3s ago") must use
  `aria-live="polite"` instead of `aria-describedby` — that is a
  **consumer-side decision**; the spec only requires it for static
  descriptions.

**Helper signature** (matches existing `dialog()` / `drawer()`):
```python
def tooltip(text: object, *, id: str, position: Literal["top", "right", "bottom", "left"] = "top",
            class_: object = None, **attrs: object) -> SafeHTML:
    ...
```

Emits **only** the tooltip body. Consumer adds the trigger separately:
```python
button(label="Save", id="save-btn") + tooltip("Save your changes", id="save-tip", position="top")
```
which renders to:
```html
<button id="save-btn" aria-describedby="save-tip">Save your changes</button>
<span role="tooltip" id="save-tip" popover="hint" class="ui-tooltip top">Save your changes</span>
```

**Glass readiness:** opt-in per instance. Consumer adds
`class_="is-glass"` to the tooltip body if they want the glass
surface.

### 1.2 `ui-popover`

**Behavior:** click-triggered (`popovertarget="<popover-id>"`) or
right-click-triggered (context menus use the same component, see
1.5). Rich content — headings, lists, forms. Dismisses on
outside-click, Escape key, or trigger re-click. Maintains the
trigger's focus when the popover closes (focus restoration).

**Positioning:** uses `popover="auto"` (Baseline "newly"). The Popover
API gives correct top-layer rendering, outside-click handling, and
focus restoration. CSS Anchor (`position-anchor`) sets the popover's
position relative to the trigger.

**Accessibility contract:**
- Trigger gets `popovertarget="<popover-id>"` and **`aria-expanded="true|false"`**
  — **toggled by the consumer's listener on the popover's `toggle`
  event**, *not* by the Popover API itself. (Factual correction
  from the initial draft: the Popover API does not toggle
  `aria-expanded`. Without an explicit listener, screen readers
  receive stale `aria-expanded="false"` state for the lifetime of
  the popover.) The companion plan's popover task includes this
  listener as a required implementation detail.
- Popover content keeps focus order: Tab from the trigger moves into
  the popover; the first focusable item in the popover receives
  focus on open (browser-default).
- On close, focus restores to the trigger.
- `Escape` dismisses.
- **Trigger removal while popover open**: the consumer is responsible
  for closing the popover before removing its trigger, OR providing
  a `data-focus-fallback` ancestor that the popover can restore
  focus to. Without one, focus goes to `document.body` (a known
  Popover API limitation). The companion plan documents this.
- **Long popovers** with internal scrolling: consumers using
  `element.scrollIntoView({behavior: "smooth"})` must opt out under
  `prefers-reduced-motion` — pass `behavior: "auto"` (instant) when
  reduced-motion matches.

**Helper signature:**
```python
def popover(content: object, *, id: str, label: object = None,
            position: Literal["top", "right", "bottom", "left"] = "bottom",
            class_: object = None, **attrs: object) -> SafeHTML:
    ...
```

Emits **only** the popover panel. Consumer adds the trigger
separately:
```python
button(label="Open", popovertarget="my-popover") + popover("Content here", id="my-popover")
```

**Glass readiness:** opt-in per instance.

### 1.3 `ui-toast`

**Naming:** the spec ships **one** component: `ui-toast`. The
"snackbar" aliasing in the initial draft is dropped — Linear, Vercel,
Sonner, shadcn/ui all use "toast" as the canonical name.

**Behavior:** transient notifications in a fixed-positioned container
(single container per page, positioned bottom-center by default).
Auto-dismiss after `duration` ms (default 5000). Pause on `:hover`
**or** when any descendant has `:focus`. Queue policy: stack up to
N (default 5); non-error toasts follow FIFO with the cap;
**`severity="error"` toasts cap-bypass** (errors are always
visible). `role="status"` for informational, `role="alert"` for
errors.

**Positioning:** the container is `position: fixed` at the viewport
edge. Toast items animate in via `translateY` + `opacity`, out via
`opacity`. `prefers-reduced-motion: reduce` removes the transitions
entirely (instant in/out).

**Accessibility contract:**
- Container has `role="region"` + **`aria-label="Notifications"`**
  (pinned, not "or similar" — `aria-label="Notifications"` is the
  contract for the `region` landmark; live-region announcement comes
  from the children's `role="status"` / `role="alert"`).
- Each toast has `role="status"` or `role="alert"` per severity.
- New toasts *append* to the live region container — screen readers
  announce them on arrival. Removing toasts from the live region
  immediately on auto-dismiss is *not* required (live regions don't
  re-announce removed text).
- Focus is **not** moved to the toast — toasts are non-modal.
- Buttons inside toasts (e.g. "Undo") are focusable; auto-dismiss
  **pauses on focus**, not just `:hover`. (Without this, a user
  who is mid-press on Undo when the timer fires loses focus and
  silently fails their action.)

**Variants:** severity (`info` / `success` / `warning` / `error`),
duration (`short` 3s / `default` 5s / `long` 10s / `persistent` no
auto-dismiss), position (`top` / `bottom` × `start` / `center` /
`end`).

**State management** ships in **two** paths:

1. **Python helper** (SSR / static regions / htmx integration):
```python
def toast(content: object, *, severity: Literal["info", "success", "warning", "error"] = "info",
          duration: int | Literal["short", "default", "long", "persistent"] = "default",
          id: str | None = None, class_: object = None, **attrs: object) -> SafeHTML:
    ...
```

This renders the toast region with `role="status"` / `role="alert"`
markup. Consumers wire it into server responses for htmx:
```python
@htmy.route("/api/save", methods=["POST"])
def save(request):
    saved = save_record(request)
    return {
        "status": "ok",
        "hx_trigger": json.dumps({"toast": {"content": "Saved!", "severity": "success"}}),
    }
```
The JS module listens for the `htmx:configRequest` /
`htmx:afterRequest` event, reads the `HX-Trigger` header, and
dispatches the toast client-side.

2. **JS API** (client-side dispatch):
```js
import { toast } from "@fastblocks-ui/toast";
toast("Hello", { severity: "success" });
```

**Glass readiness:** opt-in per instance.

### 1.4 `ui-command` (command palette / CMDK)

**Behavior:** keyboard-triggered. Default keybindings:
**`/` (slash, primary)** — works on all keyboard layouts including
non-Latin. **`Cmd/Ctrl-K` (secondary)** — must `event.preventDefault()`
on the keydown to avoid macOS Safari (Find Selection) and Chrome
(search bar) stealing the keystroke. Consumers configure via
`data-command-key="slash,mod+k"` (slash only by default;
configurable to add or remove).

Opens a modal-ish floating panel anchored to the top of the
viewport. Shows a search input + a list of results. Filters as the
user types. Closes on Escape, outside-click, or selection. Async
result loading: the consumer passes a `load_results(query: str) ->
Promise<Result[]>` callback; the panel shows a loading state while
the promise is pending.

**Positioning:** uses `popover="auto"` with `position-anchor: --viewport-top`
(a CSS Anchor pointing at the viewport top via a `position-anchor`
name). Or — more commonly — the panel is `position: fixed; top: 10vh;
left: 50%; transform: translateX(-50%)` with the modal backdrop
applied separately.

**Accessibility contract:**
- Input has `role="combobox"`, `aria-expanded="true"`, `aria-controls="<list-id>"`.
- Result list has `role="listbox"`, `aria-activedescendant="<focused-id>"`.
- Each result has `role="option"`, `aria-selected="false|true"`.
- **Trigger is required**: consumers wire a button with
  `data-command-trigger` or invoke `open_command_palette()`
  imperatively. The command palette is not keyboard-only by
  accident — there must always be a button consumers can click.
- `ArrowUp` / `ArrowDown` navigate results; `Enter` selects;
  `Escape` closes.
- Focus moves to the input on open; on close, focus restores to the
  element that was focused before the palette opened.
- **Async result handling**: stale requests must be aborted on
  every new keystroke. The companion plan's command task includes
  this as a required implementation detail (`AbortController`
  per-query).

**Variants:** recent-items section (consumer-supplied list), grouped
results (consumer-supplied groups), placeholder text, empty-state
message.

**State management:** the JS module exports `open_command_palette({
trigger, load_results, recent, groups, keybinding })`. Result
matching is **not** shipped — consumers wire `fuse.js`, `fuzzysort`,
server-side search, or whatever they prefer. The module **throws
at first invocation** if `load_results` is missing (fail-loud,
not silent).

**Glass readiness:** opt-in per instance.

### 1.5 `ui-context-menu`

**Behavior:** right-click-triggered (or Shift-F10 for keyboard).
Shows a menu of actions at the click position. Dismisses on item
selection, outside-click, Escape, or Tab-out.

**Positioning:** uses `popover="auto"` with a CSS Anchor
(`position-anchor`) pointing at the click target's bounding rect.
The browser handles flip / shift to keep the menu in-viewport; no
manual positioning math.

**Accessibility contract** (per ARIA Authoring Practices Guide menu
pattern):
- Menu has `role="menu"`.
- **Every trigger** that can right-click to a context menu carries
  `aria-haspopup="menu"`. Without this attribute, screen readers
  won't announce the menu as available.
- Each item has `role="menuitem"`, optional `aria-disabled`.
- `ArrowUp` / `ArrowDown` navigate; `Home` / `End` jump to first /
  last; `Enter` / `Space` activate; `Escape` closes.
- **Tab behavior (APG-correct)**: for menus *not* opened from a
  menubar, Tab moves focus to the next element in document source
  order — out of the menu entirely. The menu lives in the top
  layer (`popover="auto"`), not in the DOM tree as a sibling of
  the trigger; that's why the initial draft's "sibling vs parent"
  reasoning was wrong.
- **No submenus in v1.** Nested `role="menu"` containers will
  produce incorrect keyboard behavior; documented in the
  companion plan's context-menu task.

**Variants:** grouped items (separators via `<hr>`), icons (via
`aria-hidden="true"`), keyboard shortcuts (displayed via
`<kbd>`), destructive actions (apply `is-destructive` class for red
text).

**Glass readiness:** opt-in per instance.

### 1.6 `ui-avatar`

**Behavior:** circular or rounded-square indicator of identity. Shows
an image (`<img>`), initials fallback (when image fails to load),
or a placeholder. Supports an optional status dot (online / busy /
away / offline).

**Positioning:** inline. Default size 32px (configurable via `--ui-avatar-size`
CSS variable; consumer sets it per-instance via inline `style=""` or
sizing utility classes).

**Accessibility contract:**
- The `<img>` has `alt="<consumer-provided text>"` — for a user
  avatar, the alt text is the user's name; for a decorative avatar
  (e.g. "anonymous" placeholder), `alt=""`.
- The initials / placeholder is wrapped in `aria-hidden="true"` when
  the image is present. When the image is missing, the initials
  use **`role="img" aria-label="<full name>"`** — the visible text is
  initials (e.g. `JD`), the `aria-label` is the full name (e.g.
  `John Doe`). Never `role="img"` with an empty label (axe flags
  that). If only initials are shown without a full name known,
  use `role="presentation"` or `aria-hidden="true"` instead.
- The status dot is `aria-hidden="true"` (visual only — the consumer
  surfaces status text elsewhere if needed).

**Variants:**
- Shape: `circle` (default), `square`, `rounded` (4px).
- Size: `xs` 24px / `sm` 32px / `md` 40px / `lg` 56px / `xl` 80px.
  All via `--ui-avatar-size` CSS variable.
- Status dot: `online` / `busy` / `away` / `offline`.

**Helper signatures** (matches existing helpers):
```python
def avatar(src: object, *, alt: str, name: str | None = None,
           shape: Literal["circle", "square", "rounded"] = "circle",
           size: Literal["xs", "sm", "md", "lg", "xl"] = "md",
           status: Literal["online", "busy", "away", "offline"] | None = None,
           class_: object = None, **attrs: object) -> SafeHTML:
    ...

def avatar_group(avatars: list, *, max: int = 4,
                 class_: object = None, **attrs: object) -> SafeHTML:
    """Stack up to `max` avatars; overflow shows +N with
    aria-label="N more users". The helper computes +N itself
    so consumers don't write the same boilerplate."""
```

`avatar_group` computes the overflow count internally; consumers
pass a list of avatar markup and the helper returns the stacked
HTML. The `+N` element carries **`aria-label="N more users"`** (or
"1 more user" for N=1), not the literal text "+3" that screen
readers would otherwise read.

**Glass readiness:** `ui-avatar` is **not** added to
`--_ui-glass-components` by default (per Decision 7a). Avatars
typically appear in dense lists (navbars, comment threads); the
glass spec explicitly excludes ordinary interactive / dense surfaces.
Consumers opt-in per instance via `class_="is-glass"` on the
avatar element when they want the translucent identity-ring
pattern (Instagram-story-rings aesthetic).
  All via `--ui-avatar-size` CSS variable.
- Status dot: `online` / `busy` / `away` / `offline`.
- Group: `<div class="ui-avatar-group">` wraps multiple avatars with
  negative `margin-inline-start: -8px` (overlap). Up to 4 visible;
  the 5th+ avatar shows "+N" (consumer-supplied count).

**Glass readiness:** appended to `--_ui-glass-components` at ship time.
The avatar's glass surface is a useful "translucent identity ring"
pattern (think Instagram story rings); the spec defers the *visual*
use of glass on avatars to consumers via `--ui-glass-strength` /
`--ui-glass-highlight` token overrides per instance.

---

## Scope 2: Backdrop systems and motion / feedback primitives

Each system ships with: a CSS rule (or a small JS + CSS pair for
event-driven effects), a vitest token check (where tokens are
introduced), a Playwright behavior spec, and an axe pass under
emulated reduced-motion.

### 2.1 Full-bleed hero background

```css
.has-fullbleed {
  position: relative;
  width: 100vw;
  margin-inline-start: calc(50% - 50vw);
  margin-inline-end: calc(50% - 50vw);
  min-height: 60vh;
  display: grid;
  place-items: center;
  isolation: isolate;
}
```

The `isolation: isolate` creates a stacking context so backdrop
filters / overflow:hidden don't leak. Variants via inline
`style="min-height: ..."` or a `.has-fullbleed--lg` modifier class.
**Note**: the original draft used `is-fullbleed` — the `is-*`
prefix is reserved for boolean state modifiers (per Decision 18).
Full-bleed is a visual layout choice, hence `has-fullbleed`. (The
spec's "has-*" convention covers layered visual effects; "is-*"
would have wrongly suggested a state toggle.)

### 2.2 Aurora / mesh gradient backdrop

```css
@keyframes ui-aurora-drift {
  /* Animate `transform: translate3d` on a wrapper, NOT `background-position`
     on the element itself. `background-position` is not GPU-composited in
     Chromium (paint every frame); `transform` is. */
  0%   { transform: translate3d(0,    0,    0); }
  100% { transform: translate3d(2%,   4%,   0); }
}

.has-aurora {
  position: relative;
  isolation: isolate;
  overflow: hidden;
}
.has-aurora::before {
  content: "";
  position: absolute;
  inset: -10%; /* slight overshoot so the drift doesn't reveal edges */
  background:
    radial-gradient(circle at 20% 30%, var(--ui-aurora-stop-1), transparent 60%),
    radial-gradient(circle at 80% 70%, var(--ui-aurora-stop-2), transparent 60%),
    radial-gradient(circle at 50% 50%, var(--ui-aurora-stop-3), transparent 70%);
  animation: ui-aurora-drift 30s ease-in-out infinite alternate;
  will-change: transform;
}
@media (prefers-reduced-motion: reduce) {
  .has-aurora::before { animation: none; }
}
```

Three new tokens (`--ui-aurora-stop-1/2/3`), defaulting to
`color-mix(in oklab, var(--ui-color-primary) 40%, transparent)` etc.
Consumers override per-instance via inline `style=""`.

**Note**: the original draft used `.is-aurora` with a
`background-position` animation. The class name change follows
Decision 18; the animation change follows the JS↔CSS contract
(Decision 19) and the perf reviewer recommendation — `transform` on
a wrapper is GPU-composited, `background-position` is not.

### 2.3 Noise / grain overlay

```css
.has-noise {
  position: relative;
  isolation: isolate;
}
.has-noise::before {
  content: "";
  position: absolute;
  inset: 0;
  pointer-events: none;
  background-image: url("data:image/svg+xml,%3Csvg ... %3E");
  /* SVG <filter> with feTurbulence + feColorMatrix for monochrome grain */
  opacity: 0.04;
  z-index: var(--ui-z-backdrop, -1);
  mix-blend-mode: overlay;
}
.has-noise > * { position: relative; z-index: 2; }
```

The SVG filter is inlined (data URI) — no extra fetch, CSP-friendly.
Consumers control intensity via `--ui-noise-opacity` (default 0.04)
and grain scale via `--ui-noise-scale` (default 1).

**New token `--ui-z-backdrop`** (default `-1`) pins a consistent
stacking position across backdrops so that stacking (e.g.
`.has-aurora` + `.has-noise` + glass) doesn't produce conflicting
`z-index` values.

### 2.4 Geometric pattern backgrounds

```css
.has-pattern-dots {
  position: relative;
  isolation: isolate;
}
.has-pattern-dots::before {
  content: "";
  position: absolute;
  inset: 0;
  pointer-events: none;
  background-image: radial-gradient(
    circle,
    var(--ui-color-text) 1px,
    transparent 1px
  );
  background-size: var(--ui-pattern-size, 16px) var(--ui-pattern-size, 16px);
  opacity: var(--ui-pattern-opacity, 0.06);
  z-index: var(--ui-z-backdrop, -1);
}
```

Variants: `has-pattern-dots`, `has-pattern-grid`, `has-pattern-lines`,
`has-pattern-diagonal`. All use the same `--ui-pattern-*` token set
for size and opacity.

### 2.5 Cursor-follow spotlight glow

The class is `has-spotlight` (per Decision 18 — this is a layered
visual effect with implicit JS, not a JS-toggled state attribute).

JS module (`fastblocks_ui/static/js/spotlight.js`):

```js
// Per Decision 20: count opt-in elements at init; return early if zero.
// This means pages without spotlight pay nothing — no listener tax.
const matches = document.querySelectorAll(".has-spotlight");
if (matches.length === 0) return;

// Progressive enhancement: do nothing if reduced-motion or pointer:coarse
if (matchMedia("(prefers-reduced-motion: reduce)").matches) return;
if (matchMedia("(pointer: coarse)").matches) return;

document.addEventListener("pointermove", (e) => {
  const el = e.target.closest(".has-spotlight");
  if (!el) return;
  const r = el.getBoundingClientRect();
  el.style.setProperty("--ui-spotlight-x", `${e.clientX - r.left}px`);
  el.style.setProperty("--ui-spotlight-y", `${e.clientY - r.top}px`);
}, { passive: true });

// Per htmx integration contract: re-init after swaps.
export function init(root = document) { /* idempotent re-scan */ }
```

CSS:

```css
/* Wrapped in :where() so consumer transforms always win specificity. */
:where(.has-spotlight) {
  position: relative;
  isolation: isolate;
}
:where(.has-spotlight)::before {
  content: "";
  position: absolute;
  inset: 0;
  background: radial-gradient(
    circle 200px at var(--ui-spotlight-x, 50%) var(--ui-spotlight-y, 50%),
    var(--ui-spotlight-color, var(--ui-color-primary)),
    transparent 70%
  );
  /* Per JS↔CSS contract: opacity defaults to 0 until JS sets --ui-spotlight-active="1".
     Without this fail-closed gate, consumers who add `.has-spotlight` but
     forget to import the JS module see a static centered glow that they
     will mistake for a broken implementation. */
  opacity: var(--ui-spotlight-opacity, 0);
  pointer-events: none;
  z-index: var(--ui-z-backdrop, -1);
  transition: opacity var(--ui-motion-duration-fast) var(--ui-motion-easing-standard);
}
:where(.has-spotlight)[data-spotlight-active="1"]::before {
  opacity: var(--ui-spotlight-opacity, 0.15);
}
@media (prefers-reduced-motion: reduce) {
  :where(.has-spotlight)::before { display: none; }
}
```

Consumers opt in by adding `has-spotlight` to a card, button, or
section and importing the `spotlight` module.

### 2.6 Scroll-driven reveals

`data-reveal` stays an attribute (Decision 18) because it holds
JS-flipped runtime state (`data-revealed="true"`), not a visual
layer flag. The initial draft's no-JS fallback was broken — the
empty `:not([data-revealed="true"]) { /* empty */ }` rule at the end
doesn't override the `opacity: 0` on `[data-reveal]` because the
selector specificity is the same and CSS cascade goes by source order.
The fix: gate the hidden state on a `.js` capability class that JS
adds to `<html>`, not on the data attribute.

JS module:

```js
// Capability class: only added when JS is available. Without it,
// `[data-reveal]` styles are no-ops, so content is visible immediately.
document.documentElement.classList.add("js");

// Per Decision 20: count opt-in elements at init; return early if zero.
const matches = document.querySelectorAll("[data-reveal]");
if (matches.length === 0) return;

const io = new IntersectionObserver(
  (entries) => {
    for (const e of entries) {
      if (e.isIntersecting) {
        e.target.setAttribute("data-revealed", "true");
        io.unobserve(e.target);
      }
    }
  },
  { threshold: 0.1, rootMargin: "0px 0px -10% 0px" }
);

// Initial observation
matches.forEach((el) => io.observe(el));

// Per htmx contract: re-init after swaps. MutationObserver catches
// `[data-reveal]` elements added to the DOM after page load.
const mo = new MutationObserver((muts) => {
  for (const m of muts) {
    for (const n of m.addedNodes) {
      if (!(n instanceof Element)) continue;
      if (n.matches("[data-reveal]")) io.observe(n);
      n.querySelectorAll?.("[data-reveal]").forEach((el) => io.observe(el));
    }
  }
});
mo.observe(document.body, { childList: true, subtree: true });

// Cleanup
export function init(root = document) { /* idempotent re-scan */ }
export function teardown(root = document) { /* unobserve + remove listeners */ }
```

CSS:

```css
/* Gate the hidden state on `.js` capability class — without JS, this
   rule is inert and `[data-reveal]` elements show in their final
   position immediately. */
.js [data-reveal]:not([data-revealed="true"]) {
  opacity: 0;
  transform: translateY(16px);
}
[data-reveal] {
  transition:
    opacity var(--ui-motion-duration-slow) var(--ui-motion-easing-emphasized),
    transform var(--ui-motion-duration-slow) var(--ui-motion-easing-emphasized);
}
[data-reveal][data-revealed="true"] {
  opacity: 1;
  transform: none;
}
@media (prefers-reduced-motion: reduce) {
  .js [data-reveal]:not([data-revealed="true"]) {
    opacity: 1;
    transform: none;
  }
  [data-reveal] { transition: none; }
}
```

**Note on dynamic DOM**: the `MutationObserver` catches elements
added after page load (HTMX swaps, infinite scroll, command-palette
result lists). Without it, an HTMX-swapped section of `[data-reveal]`
elements would stay invisible forever.

### 2.7 Tilt on hover

JS module:

```js
// Per Decision 20: count opt-in elements at init.
const matches = document.querySelectorAll("[data-tilt]");
if (matches.length === 0) return;

if (matchMedia("(prefers-reduced-motion: reduce)").matches) return;
if (matchMedia("(pointer: coarse)").matches) return;

document.addEventListener("pointermove", (e) => {
  const el = e.target.closest("[data-tilt]");
  if (!el) return;
  const r = el.getBoundingClientRect();
  const x = (e.clientX - r.left) / r.width - 0.5;
  const y = (e.clientY - r.top) / r.height - 0.5;
  el.style.setProperty("--ui-tilt-x", `${x * 8}deg`);
  el.style.setProperty("--ui-tilt-y", `${-y * 8}deg`);
}, { passive: true });

export function init(root = document) { /* idempotent re-scan */ }
```

CSS:

```css
:where([data-tilt]) {
  transform: perspective(800px) rotateX(var(--ui-tilt-y, 0deg)) rotateY(var(--ui-tilt-x, 0deg));
  transition: transform var(--ui-motion-duration-fast) var(--ui-motion-easing-standard);
  transform-style: preserve-3d;
  will-change: transform;
}
@media (prefers-reduced-motion: reduce),
       (pointer: coarse) {
  :where([data-tilt]) { transform: none; }
}
```

8deg max tilt (subtle — Apple's Vision Pro cards tilt ~6deg). Capped
to prevent over-rotation on edge-of-card pointer positions.
`:where()` wrapper per Decision 18 — consumer transforms always win
specificity.

### 2.8 Theme transitions

JS module (consumer or framework-level):

```js
// On data-theme change, flag the transition, let CSS animate, unflag.
document.documentElement.addEventListener("data-theme-change", () => {
  document.documentElement.setAttribute("data-theme-changing", "");
  setTimeout(() => {
    document.documentElement.removeAttribute("data-theme-changing");
  }, 250); // slightly longer than --ui-motion-duration-base
});
```

CSS — the selector list is **narrower** than the original draft
(per Decision 13): only surface elements that actually benefit from
color transitions; text elements (`p, h1-h6, a`) are excluded
because animated text-color flips read as contrast flicker.

```css
:root[data-theme-changing] :is(
  button,
  .ui-card, .ui-navbar, .ui-dialog, .ui-drawer, .ui-dropdown,
  .ui-tooltip, .ui-popover, .ui-toast, .ui-avatar
) {
  transition:
    background-color var(--ui-motion-duration-base) var(--ui-motion-easing-standard),
    color var(--ui-motion-duration-base) var(--ui-motion-easing-standard),
    border-color var(--ui-motion-duration-base) var(--ui-motion-easing-standard);
}
```

Consumers opt out via `[data-theme-instant]` on `<html>`. The selector
list is intentionally narrow — only elements where color changes
matter get the transition; pure layout properties don't animate. New
components added later need their class added to this list
deliberately (a maintenance burden documented in the spec's
Follow-ups).

### 2.9 Page transitions

The initial draft had a global anchor-click interceptor that
called `history.pushState()` without performing the navigation —
silently broken for htmx / htmy consumers. The corrected pattern
exposes a transition wrapper that consumers call explicitly from
their router:

```js
// Per Decision 14 + htmx integration contract. No global click listener.
// Consumers wire their own router (htmx, Turbo, fetch + DOM swap)
// inside the transition callback.

let transitionCallback = null;
let transitionInFlight = null;

export function init(root = document, options = {}) {
  transitionCallback = options.transitionCallback || defaultCallback;
}

function defaultCallback(updateDOM) {
  // SSR-only fallback: no view transition. Just call the DOM update.
  updateDOM();
}

export async function transition(updateDOM) {
  if (document.startViewTransition && !matchMedia("(prefers-reduced-motion: reduce)").matches) {
    if (transitionInFlight) return transitionInFlight;
    transitionInFlight = document.startViewTransition(() => {
      const result = transitionCallback(updateDOM);
      return result;
    });
    await transitionInFlight;
    transitionInFlight = null;
    return transitionInFlight;
  } else {
    transitionCallback(updateDOM);
  }
}
```

Consumer wiring with htmx:

```js
import { transition } from "@fastblocks-ui/transition";

document.body.addEventListener("htmx:beforeSwap", (evt) => {
  // Wrap htmx's swap in a view transition
  const originalSwap = evt.detail.elt;
  transition(() => {
    originalSwap();
  });
});
```

Consumer wiring with Turbo:

```js
import { transition } from "@fastblocks-ui/transition";

document.addEventListener("turbo:before-render", (evt) => {
  evt.preventDefault();
  transition(() => {
    evt.detail.render = evt.detail.newBody;
  });
});
```

CSS for the transition itself:

```css
::view-transition-old(root),
::view-transition-new(root) {
  animation-duration: var(--ui-motion-duration-base);
}
@media (prefers-reduced-motion: reduce) {
  ::view-transition-old(root),
  ::view-transition-new(root) { animation: none !important; }
}
```

The library does NOT intercept any clicks. Consumers wrap their own
router's DOM-update in `transition()`. This is the documented pattern
for using view transitions with htmx, Turbo, fetch + DOM swap, or any
custom router.

---

## Scope 3: 3D / WebGL / media integrations

Each integration ships with: a small wrapper component (Python
helper + CSS), a library-agnostic JS module, and graceful fallbacks
for unsupported browsers / `prefers-reduced-motion`.

### 3.1 Spline embed

```html
<div class="ui-spline"
     data-spline-url="https://prod.spline.design/..."
     aria-label="Interactive 3D model">
  <noscript>
    <img src="static/spline-poster.jpg" alt="3D model preview" />
  </noscript>
</div>
```

JS:

```js
if (matchMedia("(prefers-reduced-motion: reduce)").matches) {
  // Skip loading Spline; show the poster image as a static fallback.
  return;
}
import("@splinetool/viewer").then(({ Application }) => {
  const canvas = el.querySelector("canvas");
  const app = new Application(canvas);
  app.load(el.dataset.splineUrl);
});
```

The `<spline-viewer>` web component is loaded lazily (dynamic import)
only when `.ui-spline` is present in the DOM. Spline's CDN dependency
is *not* bundled — it's loaded on first use. The wrapper enforces a
size budget (default 100% × 400px; configurable via inline `style=""`)
and a `loading="lazy"` attribute on the underlying `<canvas>`.

### 3.2 Three.js mesh-gradient backdrop

This is the heaviest of the three. The CSS class is:

```css
.is-mesh-gradient {
  position: relative;
  isolation: isolate;
  background: var(--ui-color-surface); /* fallback while loading */
}
.is-mesh-gradient canvas {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  z-index: -1;
  pointer-events: none;
}
```

JS:

```js
if (!("WebGL2RenderingContext" in window)) return; // fallback
if (matchMedia("(prefers-reduced-motion: reduce)").matches) return;

import("three").then((THREE) => {
  // consumer-supplied fragment shader loaded from data-shader-url
  fetch(el.dataset.shaderUrl).then((r) => r.text()).then((fragmentShader) => {
    // mesh setup is consumer-specific; we ship a default vertex shader
    // and the consumer writes the fragment
  });
});
```

A default vertex shader is shipped (it's trivial — full-screen
triangle). The fragment shader is consumer-supplied via
`data-shader-url` pointing at a file in `fastblocks_ui/static/shaders/`.
The shader source lives in the bundle (not the JS), so consumers can
write art without touching the JS.

**Performance budget:** the mesh-gradient is rendered at a fixed
internal resolution (capped at 1280×720) and CSS-scaled to the
element's actual size. **Frame rate is capped at 30 fps by default**
(not uncapped — battery-positive shipping defaults beat opt-out
bolt-ons); consumers opt-in to 60 fps for hero sections via
`data-frame-cap="60"`. The companion plan asserts the default via
a Playwright performance spec.

### 3.3 `<model-viewer>` wrapper

```html
<model-viewer class="ui-model-viewer"
              src="path/to/model.glb"
              poster="path/to/poster.jpg"
              camera-controls
              auto-rotate
              aria-label="Product viewer">
</model-viewer>
```

`<model-viewer>` is shipped via the
`@google/model-viewer` package (Baseline "newly" web component).
Loaded via a single `<script type="module">` in the demo and on
opt-in pages. The `ui-model-viewer` wrapper class adds the
fastblocks-style sizing defaults (default 100% × 400px, configurable).

Fallback strategy:
- `<noscript>` shows the `<img>` poster.
- Browsers without WebGL show the poster and a "WebGL required" message.
- `prefers-reduced-motion: reduce` disables `auto-rotate`.

### 3.4 Lottie animations

```html
<div class="has-lottie"
     data-lottie-url="path/to/animation.json"
     aria-label="Success animation">
</div>
```

JS:

```js
if (matchMedia("(prefers-reduced-motion: reduce)").matches) {
  el.style.backgroundImage = `url(${el.dataset.lottiePosterUrl})`;
  return;
}
import("lottie-web").then((lottie) => {
  lottie.loadAnimation({
    container: el,
    renderer: "svg",
    loop: true,
    autoplay: true,
    path: el.dataset.lottieUrl,
  });
});
```

Lottie-web is loaded dynamically. Default loop / autoplay; consumers
override via `data-lottie-loop="false"` etc. Reduced-motion users get
the first-frame poster (consumer-supplied via
`data-lottie-poster-url`).

### 3.5 `<video>` muted loop backgrounds

```html
<div class="has-video-bg" aria-hidden="true">
  <video autoplay muted loop playsinline preload="metadata"
         poster="path/to/poster.jpg">
    <source src="path/to/bg.webm" type="video/webm" />
    <source src="path/to/bg.mp4" type="video/mp4" />
  </video>
  <div class="has-video-bg__overlay"></div>
</div>
```

CSS:

```css
.has-video-bg {
  position: relative;
  isolation: isolate;
}
.has-video-bg video {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  object-fit: cover;
  z-index: var(--ui-z-backdrop, -1);
}
.has-video-bg__overlay {
  position: absolute;
  inset: 0;
  background: var(--ui-video-overlay, oklch(from var(--ui-color-surface) 60% l c h));
  pointer-events: none;
}
/* prefers-reduced-data replaces the <source> with the static poster.
   A 1080p video is 3-7 MB on cellular; users on metered connections
   shouldn't pay for decorative motion. */
@media (prefers-reduced-data: reduce) {
  .has-video-bg video { display: none; }
}
```

`autoplay muted loop playsinline` is the canonical pattern that
bypasses browser autoplay policies in most browsers. The `<source>`
list `webm` first, `mp4` second — `webm` is smaller and preferred by
browsers that support it. The overlay tints the video so foreground
content stays readable regardless of the video's colors. iOS Safari
can still block autoplay in some edge cases — consumers expose a
`data-click-to-play="true"` opt-in for those environments (the
companion plan documents the fallback: a `<button>` overlay that
calls `video.play()` on click).

**`aria-hidden="true"` is correct only for decorative use.** If
the video carries meaning (a sign-language interpreter track, a
product demo with spoken narration), the consumer must remove
`aria-hidden`, provide captions, and surface the video as
foreground content. The companion plan's docs/effects.md entry
explicitly warns against misusing `has-video-bg` for non-
decorative content.

---

## Cross-cutting browser support

Same floor as the glass spec: Baseline "newly" with the existing
allowlist. Specific feature dependencies:

| Feature | New dependency |
|---|---|
| `ui-tooltip` / `ui-popover` | Popover API (`popover="auto"`) — Baseline "newly" |
| `ui-toast` queue | None (DOM + `aria-live`) |
| `ui-command` | None |
| `ui-context-menu` | Popover API + CSS Anchor Positioning — both Baseline "newly" |
| `ui-avatar` | None |
| Full-bleed hero | None |
| Aurora gradient | `conic-gradient` (already a dependency) |
| Noise overlay | None (inline SVG filter) |
| Geometric patterns | None (SVG / CSS) |
| Cursor-follow spotlight | `pointermove` event + CSS variables |
| Scroll-driven reveals | `IntersectionObserver` |
| Tilt on hover | CSS `transform: perspective()` |
| Theme transitions | None (CSS transitions) |
| Page transitions | View Transitions API — Baseline "newly" since 2024 |
| Spline embed | `<spline-viewer>` web component |
| Three.js mesh-gradient | WebGL2 (graceful fallback: skip the effect, render solid) |
| `<model-viewer>` | `<model-viewer>` web component (Baseline "newly") |
| Lottie | `lottie-web` from CDN (loaded lazily) |
| `<video>` muted-loop | `<video autoplay muted loop playsinline>` |

If any of these introduce a new dependency beyond the existing allowlist,
the implementer adds an entry to `.baseline-allowlist.json` and the plan
verifies it in the Baseline floor step (same pattern as Task 3 Step 8
of the glass plan).

## Cross-cutting docs strategy

The six components and 14+ effect primitives need a discoverability
surface that the glass spec punted on (and that this spec amplifies
7x). `docs/effects.md` is the dedicated home — `theming-recipes.md`
remains for color / surface recipes only (glass, dark theme). The
split keeps both docs focused.

`docs/effects.md` structure (drafted by the companion plan):

- **Top**: 14-row index table with one-liner per feature + link.
- **Per-effect section**: behavior contract, when to use, when not
  to use, browser support, copy-pasteable snippet, performance notes.
- **Recipe collections**: "Glass + motion stack", "Hero-section
  combos", "Lightweight data viz backdrop", "Reduced-motion safety".

`docs/components.md` (the component reference) gets a one-line
cross-link to `effects.md` next to each new component row. The
README gets an "Effects" sidebar section linking to `effects.md`.

The companion plan's docs task (Task X) updates all three files.
Per Decision 18, the effects cookbook uses the same naming convention
as the components (e.g. `has-aurora` documented under "Backdrop
effects", `data-tilt` documented under "Motion primitives").

## Cross-cutting accessibility contract

- All new components comply with WCAG 2.2 AA.
- All motion respects `prefers-reduced-motion: reduce`. The static
  version renders fully; motion is layered on top.
- All focus management follows the existing token-based focus-ring
  pattern (no component-specific focus styles that would override
  the global `--ui-focus-ring`).
- All new components pass `tests/e2e/accessibility.spec.js` (axe) at
  the four existing breakpoints with zero violations, in both default
  and emulated reduced-motion / reduced-transparency / forced-colors
  states.

## Cross-cutting htmx and htmy integration contract

FastBlocks UI ships for the FastBlocks framework, whose primary
rendering model is server-side with progressive enhancement. Both
**htmx** (`hx-*` attributes, response-header events) and **htmy**
(FastBlocks' Python-native component framework) are first-class
consumers of this library. Every JS-coupled feature must integrate
with the SSR + DOM-swap model, not assume a SPA lifecycle.

This contract is not optional. The implementation plan fails if any
JS-coupled feature ships without it.

### SSR contract: server-rendered markup is the source of truth

- **Toast**: a server response triggers a toast via the `HX-Trigger`
  response header. The response is `HX-Trigger: {"toast":
  {"content": "Saved!", "severity": "success"}}` and the JS module
  listens for `HX-Trigger` events (or the equivalent `htmx:trigger`
  / `htmx:configRequest` event) and dispatches the toast. The Python
  `toast(content, severity=, duration=)` helper is for templating a
  static toast *region* (e.g. a panel of inline notifications on a
  dashboard), not for client-only dispatch. The companion plan
  documents both paths in the toast task.
- **Command palette**: results are fetched via a `fetch(query)`
  callback the consumer provides. The consumer wires this to their
  own htmx endpoint or REST API. The companion plan ships a working
  example using htmx-style `hx-get="/api/search?q=..."`.
- **Page transitions**: the `fastblocks_ui.transition(callback)`
  wrapper is called *explicitly* by the consumer's router, inside
  `htmx:beforeSwap` or `htmx:afterSwap` event handlers (or
  equivalent htmy hooks). The library does not intercept `<a>`
  clicks globally.
- **Backdrops, motion, 3D effects**: these are CSS-class / data-attr
  opt-ins. They render correctly in SSR markup with no JS, and
  enhance when JS is loaded. No htmx-specific integration required.

### Swap lifecycle: every enhancer re-scans after `htmx:afterSwap`

When htmx swaps a region, the JS modules must:

1. **Tear down** listeners attached to nodes that were removed.
   `IntersectionObserver.unobserve()` for scroll-reveals on swapped-
   out `[data-reveal]` nodes; remove `pointermove` listeners attached
   to swapped-out `[data-tilt]` / `has-spotlight` nodes; reset toast
   queue if the queue container was swapped.
2. **Re-attach** for nodes added by the swap. Each module exposes an
   `init(root: ParentNode = document)` function that the consumer
   calls in `htmx:afterSwap` (or htmy's equivalent). The init
   function is idempotent — calling it twice does not double-attach
   listeners.
3. **Preserve state across swaps** where the spec says so: the toast
   queue survives a swap of unrelated regions (queue state lives on
   `<body>`, not on the swapped region). Scroll-reveals reset their
   observer and re-observe the new DOM. Spotlight/tilt do not
   preserve state — the new DOM gets fresh listeners.

### Idiomatic integration example (htmy + htmx)

```python
# A FastBlocks route returns a JSON-encoded toast trigger
@htmy.route("/api/save", methods=["POST"])
def save(request):
    saved = save_record(request)
    return {
        "status": "ok",
        "hx_trigger": json.dumps({
            "toast": {"content": "Saved!", "severity": "success"},
        }),
    }
```

```html
<!-- The button is htmx-driven; the toast fires from the response header -->
<button hx-post="/api/save" hx-swap="none">Save</button>

<!-- The companion plan ships the toast module's htmx integration:
     it listens for `htmx:configRequest` / `htmx:afterRequest` and
     dispatches toasts from the response's HX-Trigger header. -->
```

### What this means for the implementation plan

- Every Task X for a JS-coupled feature (toast, command, motion,
  page transitions, enhancers) includes:
  - An `init(root: ParentNode = document)` function in the module's
    public API
  - An idempotency assertion in the test surface (`init(root);
    init(root); assert(listeners.length === expected)`)
  - A teardown test for swapped-out nodes
  - A `htmx:afterSwap` integration example in the demo (`demo.html`
    has an `htmx:afterSwap` handler that calls each module's init)
- The companion plan's final task extends
  `tests/e2e/accessibility.spec.js` to also run with a mocked
  `htmx:afterSwap` cycle, asserting no regressions in the
  swapped-in DOM.
- The companion plan ships a single `fastblocks_ui/__init__.py`
  (or `static/js/fastblocks-ui-init.js`) entry point that consumers
  wire into their htmx / htmy boot sequence — but the entry point is
  a *dispatcher* that calls each module's `init(root)`, not a
  side-effect-on-import.

### What we explicitly are NOT doing

- We are NOT replacing htmx with a custom client router. Consumers
  using htmx continue to use htmx.
- We are NOT building a stateful "session" layer that survives
  page navigation beyond what htmx already provides.
- We are NOT requiring consumers to import the JS modules — they
  can opt-in per module via `import { toast } from "..."` and skip
  the ones they don't use. SSR-only consumers don't import any JS.

## Cross-cutting testing strategy

| Surface | Test type |
|---|---|
| Component behavior | Playwright e2e (one spec file per component: `tooltip.spec.js`, `popover.spec.js`, `toast.spec.js`, `command.spec.js`, `context-menu.spec.js`, `avatar.spec.js`) |
| Effect behavior | Playwright e2e (grouped: `motion-effects.spec.js` for spotlight / reveal / tilt / theme / page transitions; `backdrop-effects.spec.js` for aurora / noise / patterns) |
| Component parity | pytest (existing `test_demo_parity.py` pattern) — extend with `tooltip_demo()`, `popover_demo()`, `toast_demo()`, `command_demo()`, `context_menu_demo()`, `avatar_demo()` helpers in `build_categories()`, and update the manifest component count assertion at line 487 |
| Tokens | vitest (extend `tests/js/css-variables.test.js`) |
| Bundle presence | pytest (extend `test_bundle_includes_accessibility_media_queries`) |
| **Contrast over new backdrops** | **Playwright (`tests/e2e/backdrop-contrast.spec.js`)** — assert `--ui-color-text` clears 4.5:1 over aurora / aurora + noise / aurora + pattern / pattern-only, in both themes. Mirrors the glass spec's `glass-contrast.spec.js` pattern |
| Accessibility | axe via existing `tests/e2e/accessibility.spec.js` — extend to also run under emulated `prefers-reduced-motion: reduce`, `prefers-reduced-transparency: reduce`, and `forced-colors: active` (the existing spec only runs in the default media state). Add specific axe-rule assertions for `aria-required-children` (menu → menuitem), `aria-required-parent` (listbox → combobox), `role-img-alt` (avatar fallback) |
| Keyboard / focus | Playwright keyboard tests for command palette (ArrowUp/Down/Home/End, Enter, Escape), context menu (same), toast auto-dismiss-pause-on-focus, popover focus restoration on close, avatar `+N` aria-label |
| Cross-browser | All Playwright specs across chromium / firefox / webkit, plus reduced-motion and reduced-data emulations |
| **Performance regression** | Playwright Lighthouse on representative pages: a "plain" page, a "glass hero" page, an "aurora + glass + tilt" page. Assert p75 INP ≤ 200 ms, LCP ≤ 2.5 s, CLS ≤ 0.1 under throttled-CPU preset. Bundle-size test extends `TestBundleSizeBudget` to assert each new JS module ≤ 4 KB gzip, total under the JS budget |
| **htmx integration** | Playwright tests that simulate `htmx:afterSwap` by dispatching the event and asserting: (a) toast queue state survives the swap of unrelated regions; (b) scroll-reveal observers re-attach to swapped-in `[data-reveal]` elements; (c) no duplicate listeners after two `init(root)` calls (idempotency assertion per Decision 20) |

## Risks

| Risk | Mitigation |
|---|---|
| Six components in one release is too large to review | Per-component commits with clear scopes; the plan's commit-per-task pattern keeps each commit small and reviewable |
| Popover API browser support gaps break tooltips / popovers | The plan includes a Playwright matrix test that runs across all three engines; failures on a single engine trigger a fallback strategy rather than a merge-block |
| Three.js bundle size bloat | Three.js is lazy-loaded only when `.has-mesh-gradient` is present; `tree-shaking` + dynamic import keeps the core bundle slim; the bundle-size budget test in `TestBundleSizeBudget` catches regression. Default frame rate is 30 fps, opt-in 60 fps via `data-frame-cap="60"` |
| `<video>` autoplay blocked by browser policy | `<video autoplay muted loop playsinline>` is the canonical pattern; iOS Safari edge cases handled by `data-click-to-play="true"` opt-in (the companion plan documents the click-to-play fallback). `prefers-reduced-data: reduce` replaces the source with the static poster |
| Scroll-driven reveals cause layout shift when content reveals | The reveal CSS uses `transform` + `opacity` (composited, no layout); the IntersectionObserver has a `rootMargin` that triggers before the element enters the visible area, hiding the flash. **Dynamic DOM (HTMX swaps, infinite scroll) is handled by a `MutationObserver`** — the spec explicitly calls this out as a required implementation detail |
| Cursor-follow spotlight interferes with touch devices | Spotlight is registered only on `pointer: fine` media query; touch devices see no JS work. **Default opacity is 0** — JS sets `data-spotlight-active="1"` only after a successful opt-in count, so consumers who forget to import the JS see no glow (fail-closed) |
| Tilt on hover causes scroll-jank on slow devices | 150ms ease-out with `will-change: transform`; fallback to no transform under `pointer: coarse` and `prefers-reduced-motion`. `:where()` wrapper keeps consumer transforms winning specificity |
| Lottie / Spline / Three.js library churn | All three are pinned to specific versions in `package.json`; upgrades are a deliberate decision in their own PR |
| New components overlap with existing ones (e.g. `ui-dropdown` vs `ui-popover`) | The plan's testing matrix explicitly tests the boundary: a dropdown inside a popover should render correctly, and vice-versa |
| Glass composition assumed for new components before the glass spec is shipped | **No longer applies** — per Decision 7a, none of the six new components auto-appends to `--_ui-glass-components`. Consumers opt-in per instance via `class_="is-glass"`. The glass plan's `--_ui-glass-components` list stays as-is |
| Motion on `data-theme` toggle is jarring if a consumer has many surfaces animating | The motion uses 200 ms ease, fast enough to read as a switch; consumers can opt out via a `[data-theme-instant]` attribute on `<html>`. **Selector list narrowed** to button + .ui-* components only — text elements (`p, h1-h6, a`) excluded to avoid contrast-flicker |
| htmx swap leaves JS-coupled components in a broken state | The companion plan's htmx integration task requires every JS module to expose `init(root)` (idempotent) and `teardown(root)`; consumers wire them into `htmx:afterSwap`. MutationObserver catches dynamic `[data-reveal]` additions. htmx integration tests assert no duplicate listeners, no stale state |
| Toast queue overflow silently drops notifications | Spec defines explicit policy: `severity="error"` cap-bypasses (errors are always visible); non-error toasts follow FIFO with the cap (default 5). The companion plan adds a unit test asserting the policy |
| Command palette Cmd-K collides with browser shortcuts | `/` is the primary keybinding; Cmd-K is the secondary and **must** `event.preventDefault()` on the keydown. Both are configurable via `data-command-key`. The companion plan tests that opening via `/` works on chromium / firefox / webkit and on non-Latin layouts |
| Stacked effects (glass + tilt + spotlight) compound jank on low-end devices | Documented as a "tier 3" preset in `docs/effects.md` with an explicit warning against stacking. Per-effect Playwright perf assertion (frame interval ≤ 20 ms on throttled CPU) |
| Page transitions memory cost on heavy pages | `startViewTransition` captures a screenshot; on a page with mesh-gradient + video + glass, this is 50-150 MB. Gate on `deviceMemory >= 4`; document the trade-off. Heavy pages opt-in via `data-allow-vt="true"` |
| `<model-viewer>` script tag is always-loaded | **Fixed** — `<model-viewer>` and Spline use dynamic `import()` only when the matching class is in the DOM (per Decision 20). Consumers opt-in by adding the class |
| Bundle size growth rate is uncontrolled | Each JS module is individually importable; tree-shaking removes unused modules per consumer. Bundle-size test extends `TestBundleSizeBudget` to walk `static/js/` and assert each module ≤ 4 KB gzip, sum ≤ JS budget |
| Spec assumes SPA-style lifecycle, breaks htmx/htmy consumers | Spec explicitly addresses htmx + htmy integration via the JS↔CSS contract and the `init(root)` / `teardown(root)` pattern. The companion plan's final task verifies no regressions in htmx-swapped DOM |
| New components silently regress against the glass plan's rest of library | Spec is explicit: none of the six new components auto-appends to `--_ui-glass-components`. Consumers opt-in per instance. The glass spec's restraint-first policy is preserved |
| Hidden a11y gaps from Popover API factually-wrong assumptions | Initial draft said Popover API toggles `aria-expanded`; it does not. Spec now requires the consumer to wire `aria-expanded` to the popover's `toggle` event. The companion plan's popover task includes this as a required implementation detail |

## Follow-ups (not this spec)

- **`ui-banner` / `ui-callout`** — persistent inline message (vs
  toast's transient dismiss). Different ARIA semantics (`role="alert"`
  vs `role="status"`).
- **`ui-empty-state`** — zero-results placeholder with optional
  illustration slot.
- **`ui-skeleton`** — loading-state placeholder.
- **`ui-steps` / `ui-stepper`** — multi-step flow indicator.
- **`ui-tag` / `ui-chip`** — compact labels for filters / categories.
- **Custom WebGL / shader work beyond Scope 3** — e.g. liquid glass
  shaders, particle systems, custom raymarching. Each warrants its
  own spec.
- **Theme transition graph** — currently a single global transition;
  future spec may add per-surface transition durations (e.g. cards
  take 200 ms, dialogs take 150 ms).
- **Region-based cursor-follow** — currently a single global
  listener; future scope may add scoped listeners for high-precision
  per-card effects (touching one card doesn't shift the cursor on
  another).
- **Tooltip-on-tap pattern for touch devices** — currently tooltips
  depend on `:hover` / `:focus-visible`; touch users only get the
  description via screen reader. A future spec could add tap-to-show
  behavior with a 3-5s timeout for purely-touch surfaces.
- **Submenu support in `ui-context-menu`** — explicitly excluded
  from v1 (would break keyboard model). A future spec can add
  nested `role="menu"` containers with proper APG roving-tabindex.
- **Glass per-instance helper** — consumers opt-in via
  `class_="is-glass"` today. A future spec could add
  `is_glass=True` as a per-instance helper kwarg (mirroring how
  `is-primary` etc. work), but this is a separate concern from the
  CSS feature itself.

## Out of scope (long-term)

- A full design-system site (Storybook, Histoire, etc.) — the
  companion-plan for this spec is the right place for that decision.
- Server-side rendering of motion / 3D effects — all effects here
  are client-only by design (CSP-friendly, no hydration cost).
- Animation libraries (Framer Motion, GSAP) — consumers can layer
  them on top of the CSS-only primitives shipped here.