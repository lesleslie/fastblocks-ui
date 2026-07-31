# Platform modernization roadmap

- **Created:** 2026-07-28
- **Status:** Non-binding. Ideas and prioritisation, not specifications.
- **Relationship to specs:** Spec A is
  `docs/superpowers/specs/2026-07-28-demo-fullwidth-sticky-nav-design.md`.
  Everything here is Spec B (this library) and Spec C (sibling packages), each of
  which needs its own requirements pass before implementation.

## Why this document exists

FastBlocks UI is a clean-slate library. Its reference points are not: Bulma is
Sass-era and predates `:has()`, container queries, popover, and anchor
positioning; htmx deliberately stays out of CSS entirely. That leaves a real
opening — platform features shipped since roughly 2023 can *retire* code rather
than accumulate it.

The pattern worth naming: nearly every item in Tier 1 replaces **coordination
code** — JavaScript whose only job was keeping two DOM nodes in sync (trigger ↔
panel, input ↔ wrapper, open state ↔ ARIA). For a library whose stated constraint
is "JavaScript optional and behavior-only," each adoption moves a correctness
guarantee out of our test suite and into the browser.

`tests/e2e/dialog-focus-trap.spec.js` is the clearest example: it exists to
verify something all three engines now guarantee natively.

## Support data policy

Support figures below were verified 2026-07-28 and **will go stale**. Before
acting on any item, re-verify.

**Recommended:** add the official Baseline dataset as devDependencies and assert
a declared floor in CI:

```bash
npm i -D web-features @mdn/browser-compat-data
```

`web-features` is the W3C WebDX Baseline dataset — local, versioned, offline,
authoritative. This turns `@supports` guards from author judgement into enforced
policy, and is strictly better than ad-hoc web search for this purpose. An MDN
MCP server (`/mdn/mcp`) also exposes compat data if querying is preferred to
vendoring.

Note for this environment: `WebFetch` and `WebSearch` are non-functional in
Claude Desktop sessions because `~/.claude/settings.json` sets
`ANTHROPIC_DEFAULT_*_MODEL` to `MiniMax-M3` while Desktop overrides
`ANTHROPIC_BASE_URL` back to Anthropic. The env block is required by terminal
sessions and must not be removed. Working alternatives: the `mmx` CLI
(`mmx search query --q "…" --output json`) for web search, and context7 for
library/API documentation.

______________________________________________________________________

## Tier 1 — retires code already written

Highest value: each of these deletes existing implementation or removes a
documented footgun.

### 1.1 `ui-menu` → Popover API + CSS Anchor Positioning

**Support:** Anchor positioning — Chrome 125+, Edge 125+, Firefox 147+,
Safari 26+. caniuse computes Baseline 2026. Popover — Baseline.

`ui-menu` currently carries a 12-line CSS comment and a helper docstring that
both exist to warn callers the wrapper *must* have `position: relative`, or the
dropdown escapes to an arbitrary positioned ancestor. That is a design defect
documented rather than fixed.

```css
.ui-menu {
  position: fixed;
  position-area: block-end span-inline-end;
  position-try-fallbacks: flip-block, flip-inline;
}
```

Deletes the positioned-ancestor contract entirely and adds viewport collision
handling. Because `popovertarget` creates an *implicit anchor reference*, a
popover-based `ui-menu` needs no `anchor-name` declaration at all.

Also retires the `[hidden]` toggling and `z-index: 20` stacking guess, and the
`enhance.js` menu open/close handlers.

**Breaking-change risk:** moderate. Markup gains `popover` / `popovertarget`;
consumers relying on the `position: relative` wrapper see no break, but those
scripting `.ui-menu` open/close directly would.

### 1.2 `ui-dialog` → `command` / `commandfor`

**Support:** Baseline as of January 2026 (Safari 26.2 completed the rollout).
The safest item in this tier.

```html
<button command="show-modal" commandfor="my-dialog">Open</button>
<dialog id="my-dialog">
  <button command="close" commandfor="my-dialog">Close</button>
</dialog>
```

Retires the open/close handlers and the hand-rolled focus trap in `enhance.js`,
along with `dialog-focus-trap.spec.js`. Native `<dialog>` supplies focus
trapping, Escape, backdrop, and inert background content.

**Breaking-change risk:** moderate — `dialog()` helper signature likely gains
invoker rendering; existing `open` handling stays.

### 1.3 `:has()` on `ui-field`

**Support:** Baseline widely available since December 2023. No guard needed.

```css
.ui-field:has(:user-invalid) { --ui-field-border: var(--ui-color-danger); }
.ui-field:has(:disabled)     { opacity: 0.6; }
```

Removes JS class-toggling for field state. Pairs with 1.4.

### 1.4 `:user-valid` / `:user-invalid`

**Support:** Baseline. Trivial change, real correctness fix.

Plain `:invalid` matches empty required fields at page load, so untouched forms
render as already-failing. `:user-invalid` only matches after interaction. This
is a bug fix, not an enhancement.

### 1.5 `field-sizing: content`

**Support:** Chrome/Edge shipped; verify Safari and Firefox before acting.

Auto-growing textareas with zero JS. Progressive — degrades to a fixed-height
textarea.

### 1.6 `accent-color`

**Support:** Baseline. One line to theme native checkbox and radio controls from
`--ui-color-primary`.

______________________________________________________________________

## Tier 2 — theming and tokens

### 2.1 Derive colour scales with `color-mix()`

The token set hand-authors `{subtle, base, strong}` for five semantic colours —
fifteen values maintained by hand, plus contrast pairs.

```css
--ui-color-primary-subtle: color-mix(in oklab, var(--ui-color-primary) 12%, var(--ui-color-surface));
--ui-color-primary-strong: color-mix(in oklab, var(--ui-color-primary) 80%, black);
```

A consumer then sets **one** brand colour and receives the whole scale. For a
library that positions theming as a headline feature, this is the largest DX win
available.

**Caution:** derived values must be checked for contrast compliance across the
full input range, not just the default palette. Needs a contrast test matrix
before adoption — this is the item most likely to silently break accessibility.

**Support:** `color-mix()` is Baseline. Relative colour syntax
(`rgb(from … r g b / …)`) is newer — verify.

### 2.2 `light-dark()`

Collapses paired light/dark token declarations into single lines. Interacts with
the existing `data-theme` attribute override and `theme.css`; needs a deliberate
decision about whether `data-theme` remains authoritative or `color-scheme`
takes over. Not a drop-in.

### 2.3 `@property` for typed tokens

Makes custom properties animatable and gives them guaranteed types and fallbacks.
Required if colour tokens should ever transition smoothly on theme switch.

______________________________________________________________________

## Tier 3 — distinctly on-brand for a hypermedia framework

### 3.1 Cross-document View Transitions

**Support:** usable in production on Chromium and Safari as of May 2026; Firefox
keeps both same- and cross-document transitions behind a flag. Progressive
enhancement only.

```css
@view-transition { navigation: auto; }
```

Animated transitions for **multi-page, server-rendered navigation**, in pure CSS.
SPAs needed a router and a pile of JavaScript to achieve this. For a library
built for server-rendered Python apps, this is close to a signature feature — it
is the clearest case where the hypermedia architecture is now an *advantage*
rather than a trade-off.

Same-document view transitions also compose naturally with htmx swaps
(Chrome 111+, Edge 111+, Safari 18+, Firefox 144+).

### 3.2 `hidden="until-found"`

Collapsed content that Ctrl+F still finds and auto-expands. Good for FAQ and
accordion patterns; SEO-friendly. Verify support.

### 3.3 Container style queries

Size queries are already used (`@container (min-width: …)`). Style queries
(`@container style(--variant: danger)`) let descendants respond to a custom
property on the container, reducing class proliferation for variants. Also `cqi`
/ `cqb` units for intrinsically responsive typography inside components.

______________________________________________________________________

## Tier 4 — cheap polish

| Feature | Target | Notes |
|---|---|---|
| `text-wrap: balance` / `pretty` | headings / prose | **Adopted in Spec A** for `ui-title`, `ui-subtitle` |
| `content-visibility: auto` | long pages | **Adopted in Spec A** for `.demo-section` |
| `overscroll-behavior: contain` | drawer, dialog | **Adopted in Spec A** |
| `scrollbar-gutter: stable` | `:root` | **Adopted in Spec A** |
| `text-box-trim` / `text-box-edge` | button labels | Precise optical centring; verify support |
| `inert` | htmx loading states | Non-interactive regions during swaps |

______________________________________________________________________

## Deferred / not recommended yet

| Feature | Why not |
|---|---|
| `interpolate-size` / `calc-size()` | Chrome/Edge only as of late 2025; treat as progressive enhancement, not a foundation for an accordion component |
| Customizable `<select>` (`appearance: base-select`) | Very new; high value for `ui-select` eventually, but not yet dependable |
| `@scope` | Class names *are* the public API here; scoping them reduces the surface consumers rely on |
| `corner-shape`, `shape()` | Decorative; no current need |
| `popover="hint"` | Only relevant once a tooltip component exists |

______________________________________________________________________

## Spec C — sibling packages

`~/Projects/fastblocks` and `~/Projects/fastblocks-htmy` both exist locally and
are outside this repository's release cycle.

**Unknown and must be established before any Spec C work:** whether either
package re-exports, wraps, or merely documents `fastblocks_ui` helpers. Until
that dependency direction is mapped, the propagation surface is unknown and any
estimate would be invented.

First action for Spec C is therefore investigation, not implementation:

1. Determine how each package consumes `fastblocks_ui` (if at all).
1. Identify which of the above changes are visible across that boundary.
1. Decide version/release coordination — whether the three ship in lockstep.

## Suggested sequencing

1. **Spec A** — demo redesign and new layout primitives. Additive, no existing
   behaviour changes. *Designed and approved.*
1. **Baseline tooling** — `web-features` in CI. Small, and everything after it
   benefits from enforced support policy.
1. **Spec B phase 1** — Tier 1 items 1.3, 1.4, 1.6. Baseline-safe, no markup
   changes, immediate correctness wins.
1. **Spec B phase 2** — Tier 1 items 1.1, 1.2. Retire `enhance.js` handlers and
   the focus-trap test. Behaviour-changing; needs its own review.
1. **Spec B phase 3** — Tier 2 tokens, gated on the contrast test matrix.
1. **Spec C** — investigation first.
1. **Tier 3** — view transitions, once Firefox support firms up.

Spec A is forward-compatible with all of the above: the popover-based `ui-drawer`
is the same platform family as an anchor-positioned `ui-menu` and a
command-driven `ui-dialog`, so nothing built now is discarded later.
