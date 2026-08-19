# Opt-in glassmorphism surface treatment

- **Date:** 2026-08-06
- **Status:** Draft, not yet implemented
- **Scope:** New optional visual treatment, no new components

## Problem

The user wants a glassmorphism (frosted-glass, translucent-blur) treatment
available for FastBlocks UI surfaces. `docs/new-package-spec.md`'s Visual
Defaults section explicitly instructs the *default* theme to "avoid heavy
gradients, glassmorphism, and over-rounded surfaces" as part of the crisp,
restrained, art-deco-influenced identity the rest of the token system
(fine 1px borders, restrained shadows, manually contrast-tuned OKLCH colors)
was built around. This spec resolves that tension by scoping glass strictly
to opt-in usage: it never changes what ships by default, only what a
consumer can turn on.

## Goals

1. A `.is-glass` modifier class usable on individual component instances,
   following the same pattern as existing modifiers (`is-primary`,
   `is-sticky`).
1. An app-wide `data-surface="glass"` attribute that applies the same
   treatment to every eligible component under it, without requiring the
   class on each instance.
1. Both mechanisms driven by one shared CSS declaration block — no
   duplicated recipe to drift out of sync.
1. Composes freely with `data-theme="dark"` — glass is a surface-material
   concern, `data-theme` is a color-scheme concern, and the two must not be
   coupled into combinatorial theme names (`glass-dark`, etc.).
1. Accessible by construction: guaranteed text contrast regardless of what's
   behind the blur, and full fallback to a solid surface under
   `forced-colors`, `prefers-reduced-transparency`, and non-supporting
   engines.
1. `docs/new-package-spec.md`'s "avoid glassmorphism" line remains true and
   unedited — it describes the default, which this feature does not change.

## Non-goals

- Changing the default theme's visual identity.
- Applying glass to interactive controls (button, input, select, checkbox,
  switch) or dense/text-heavy surfaces (table, alert, pagination) — see
  *Rejected alternatives*.
- Any JavaScript. This is a pure CSS feature; no runtime toggle logic beyond
  what a consumer's own theme switch (if any) already does by setting an
  attribute.
- New Python helper parameters. See *Python API*.
- Animated/shimmer glass effects (e.g. moving highlight). Out of scope for
  v1; would need its own `prefers-reduced-motion` handling and isn't
  something glassmorphism strictly requires.

## Decisions

| # | Decision | Rationale |
|---|---|---|
| 1 | Ship as opt-in only: `.is-glass` class + `data-surface="glass"` attribute | Confirmed with user: default identity stays untouched, avoids rewriting the spec's own design principles |
| 2 | One shared selector list drives both activation paths | Rejects the "write the recipe twice" alternative, which is exactly the drift risk `test_demo_parity.py` already guards against elsewhere in this repo |
| 3 | `data-surface="glass"`, independent of `data-theme` | Confirmed with user (recommended option): composes with light and dark for free, matches the existing `[data-theme="dark"]` attribute-value naming convention rather than introducing a bare boolean |
| 4 | Eligible components: `ui-card`, `ui-dialog`, `ui-drawer`, `ui-navbar`, `ui-dropdown` | Confirmed with user: these are "floating panel over content" surfaces where translucency reads as intentional |
| 5 | Eight explicit tokens (strength, blur, blur-strong, saturate, tint, border, highlight, shadow); tint and border derived from `--ui-glass-strength` | Glass is a handful of independent knobs (blur, saturate, highlight, shadow) plus one coupled pair (tint fill + border opacity). The `--ui-glass-strength` knob couples the latter so a designer tuning one without the other doesn't produce an aesthetically broken middle ground (tinted fill behind a faded outline, or vice versa). Blur, saturate, highlight, and shadow are genuinely independent — no principled relationship to derive from — so they remain explicit |
| 6 | Tint opacity baseline fixed at a contrast-safe default (78%), with `--ui-glass-strength` as the single override | Addresses the accessibility risk by construction rather than relying on `prefers-reduced-transparency`, which has thin browser support and cannot be the only guard |
| 7 | No Python helper signature changes | Existing modifiers (`is-sticky`, `is-primary`) are applied via `class_=`, not dedicated parameters; `.is-glass` follows the same convention |
| 8 | Hover micro-interaction: deepens tint toward 85%, lifts 1px, 150ms ease-out, fully suppressed under `prefers-reduced-motion: reduce` | Glass without state feedback reads as static; a subtle hover differentiates "shipped product" from "CSS feature." The 1px lift is small enough to feel responsive without becoming a scroll-jank trigger; the motion guard keeps the design honest about its restraint claim |
| 9 | Per-component intensity via tokens, not modifier classes: `--ui-glass-blur` (16px default) vs. `--ui-glass-blur-strong` (24px), overridable per-element | Modifier variants (`is-glass-soft`, `is-glass-strong`) would fragment the API and create three recipes to drift; a one-token override per consumer component keeps the single source of truth while allowing per-surface tuning |

### Rejected alternatives

- **Duplicate CSS per activation mechanism** (separate rules under `.is-glass`
  and under the attribute selector) — doubles the surface area for the same
  visual bug and has no benefit over a shared selector list.
- **JavaScript-toggled runtime class** — conflicts outright with the
  project's JS Policy (CSS-first, no client-side hydration requirement,
  progressive enhancement only). There is no state here that needs a script;
  an attribute a consumer's own theme switch already sets is sufficient.
- **`data-theme="glass"` as a sibling of `"light"`/`"dark"`** — simpler
  mental model, but loses glass+dark as a combination without inventing
  `"glass-dark"` etc. Rejected in favor of an independent attribute (user
  confirmed).
- **Applying `.is-glass` to interactive controls** (button, input, select) —
  glassmorphism is a panel/surface treatment; translucent form controls read
  as low-contrast and ambiguous rather than intentional, and every one of
  those components already has strict border-contrast requirements (SC
  1.4.11) documented in `tokens.css` that a translucent fill would undermine.
- **Applying `.is-glass` to Hero/Tile** — user declined. These are large
  decorative surfaces, frequently text-on-top and frequently repeated in
  grids, which is exactly the performance and contrast risk profile
  glassmorphism handles worst.
- **Deriving glass tokens from a single input** (mirroring the color token
  pattern) — considered and rejected. The color derivation formula exists to
  solve WCAG contrast math across an open palette of brand colors. Glass has
  four independent, non-derivable knobs (how blurred, how saturated, how
  opaque, how visible the border is); forcing a derivation relationship
  between them would be arbitrary, not principled.

## Tokens

New tokens added to `tokens.css`, `@layer tokens`:

```css
--ui-glass-strength: 1;
--ui-glass-blur: 16px;
--ui-glass-blur-strong: 24px;
--ui-glass-saturate: 160%;
--ui-glass-tint: color-mix(in oklab, var(--ui-color-surface) calc(78% * var(--ui-glass-strength)), transparent);
--ui-glass-border: color-mix(in oklab, var(--ui-color-border) calc(60% * var(--ui-glass-strength)), transparent);
--ui-glass-highlight: color-mix(in oklab, var(--ui-color-surface) 80%, transparent);
--ui-glass-shadow: color-mix(in oklab, var(--ui-color-text) 8%, transparent);
```

- `16px` blur is the default; `--ui-glass-blur-strong: 24px` is the
  optional "wow" setting for dialogs and modals. Both sit in the same
  restrained range as premium glass UIs (Linear, Vercel, Stripe land at
  16-24px), distinct from the heavy 20-40px common in older tutorials.
- `160%` saturate compensates for the desaturating effect blur has on
  whatever's behind it; without it, glass panels read as muddy gray rather
  than crisp. 180% reads cartoonish on top of the OKLCH base.
- `78%` tint opacity is the accessibility-critical number — see
  `--ui-glass-strength` below for how it's tuned in one place.
- `--ui-glass-strength` is the single tuning knob for "how visible is
  glass": scaling it to `0.5` makes glass half as opaque (and the border
  half as visible). The two coupled surfaces (tint fill and border) move
  together by construction — without this, a designer tuning one would
  forget the other and produce an aesthetically broken middle ground
  (tinted fill behind a faded outline, or vice versa).
- `--ui-glass-border` reuses the existing `--ui-color-border` token's hue
  (mixed toward transparent) rather than inventing a new color, keeping
  glass panels tonally consistent with the rest of the theme instead of
  introducing the stereotypical stark white glass-edge.
- `--ui-glass-highlight` is a top-edge inset highlight (`inset 0 1px 0 0`)
  that gives glass panels the "lit from above" line which sells premium
  glass (visionOS, Stripe, Linear, Windows Aero all have one). Without
  this, glass reads as flat — see *CSS implementation* for the
  `box-shadow` application.
- `--ui-glass-shadow` is a subtle ambient elevated shadow (`0 4px 16px`)
  that pairs with the highlight to add depth without violating the
  existing "restrained shadows" identity.

Dark theme needs no separate override block: `--ui-color-surface` and
`--ui-color-border` already resolve per-theme in `theme.css`, and the glass
tokens are defined in terms of those, so they inherit correctly in both
themes for free.

## CSS implementation

Added to `components.css`, colocated with the eligible components. The
five-component selector list is lifted to a CSS custom property at the top
of the glass rule block so all three rule blocks below reference a single
source of truth — without this, adding a sixth eligible component or
fixing a typo in one block silently diverges from the others:

```css
@layer components {
  /* Shared selector list for .is-glass and [data-surface="glass"].
     Three rule blocks below reference this single token; if you add a
     sixth eligible component, edit it here and all three sites update. */
  --_ui-glass-components: .ui-card, .ui-dialog, .ui-drawer, .ui-navbar, .ui-dropdown;

  :is(var(--_ui-glass-components)).is-glass,
  [data-surface="glass"] :is(var(--_ui-glass-components)) {
    background-color: var(--ui-glass-tint);
    border-color: var(--ui-glass-border);
    box-shadow:
      inset 0 1px 0 0 var(--ui-glass-highlight),
      0 4px 16px var(--ui-glass-shadow);
    -webkit-backdrop-filter: blur(var(--ui-glass-blur)) saturate(var(--ui-glass-saturate));
    backdrop-filter: blur(var(--ui-glass-blur)) saturate(var(--ui-glass-saturate));
    transition:
      background-color 150ms ease-out,
      box-shadow 150ms ease-out,
      transform 150ms ease-out;
  }

  /* Hover micro-interaction: deepens tint toward opaque (78% → 85%)
     and lifts by 1px. The transition is short enough to feel responsive,
     long enough to read as intentional. */
  :is(var(--_ui-glass-components)).is-glass:hover,
  [data-surface="glass"] :is(var(--_ui-glass-components)):hover {
    background-color: color-mix(in oklab, var(--ui-color-surface) 85%, transparent);
    transform: translateY(-1px);
  }

  @supports not (backdrop-filter: blur(1px)) {
    :is(var(--_ui-glass-components)).is-glass,
    [data-surface="glass"] :is(var(--_ui-glass-components)) {
      background-color: var(--ui-color-surface-raised);
      border-color: var(--ui-color-border);
      box-shadow: none;
    }
  }

  @media (prefers-reduced-transparency: reduce), (forced-colors: active) {
    :is(var(--_ui-glass-components)).is-glass,
    [data-surface="glass"] :is(var(--_ui-glass-components)) {
      background-color: var(--ui-color-surface-raised);
      border-color: var(--ui-color-border);
      box-shadow: none;
      backdrop-filter: none;
      -webkit-backdrop-filter: none;
    }
  }

  /* prefers-reduced-motion guards the hover transform and the
     transition itself. The motion reduction is per-element, not
     opt-out, so the static glass effect still renders fully. */
  @media (prefers-reduced-motion: reduce) {
    :is(var(--_ui-glass-components)).is-glass,
    [data-surface="glass"] :is(var(--_ui-glass-components)),
    :is(var(--_ui-glass-components)).is-glass:hover,
    [data-surface="glass"] :is(var(--_ui-glass-components)):hover {
      transition: none;
      transform: none;
    }
  }
}
```

The `-webkit-backdrop-filter` line is defensive: unprefixed `backdrop-filter`
is Baseline widely available (WebKit shipped it unprefixed in Safari 18,
2024), but the prefixed form costs one line and extends the safety net to
older Safari without any fallback-of-shame complexity.

`forced-colors: active` is grouped with `prefers-reduced-transparency`
because both need the identical solid-surface answer — Windows High
Contrast Mode must never render a blurred, translucent panel.

The `@supports not (...)` block resets `border-color` to the opaque
`--ui-color-border` (not just `background-color`) — a non-supporting
engine renders the main rule's translucent border, which on a busy
backdrop would otherwise look like a faint outline on a faint fill.
`box-shadow` is also reset because the inset highlight only is meaningful on
a translucent surface.

The hover `:hover` rule's `background-color` is computed against
`var(--ui-color-surface)` directly (not `var(--ui-glass-tint)`) so the
deeper opacity is unambiguous rather than derived — a designer reading
the rule sees "85% surface" without doing the arithmetic against the
78% baseline.

## Accessibility contract

- Text inside a `.is-glass` surface clears WCAG AA (4.5:1) against any flat
  backdrop — pure black and pure white in both light and dark themes,
  verified by `tests/e2e/glass-contrast.spec.js`. The 78% tint opacity
  keeps average contrast close to the opaque case by construction.
- Over real-world backdrops (gradients, photos, multi-color content),
  per-pixel contrast can vary locally — the fixed tint opacity does not
  mathematically guarantee per-pixel text contrast against arbitrary
  content. Glass is a *decorative surface*, and consumers should avoid
  placing critical readable text directly over high-contrast backdrops
  (see `theming-recipes.md`'s "When to use (and when not to)" section).
- `forced-colors: active` (Windows High Contrast) fully disables blur and
  translucency — non-negotiable, not a nice-to-have.
- `prefers-reduced-transparency: reduce` gets the same solid fallback.
  Browser support for this media feature is currently thin (Safari/macOS
  only as of this writing), so it's treated as defense in depth, not the
  primary safeguard — the primary safeguard is the 78% tint.
- The hover micro-interaction (translateY(-1px), 150ms ease-out transition
  on background-color, box-shadow, and transform) is the only motion
  introduced. It is fully suppressed under `prefers-reduced-motion: reduce`
  — the glass effect renders fully static for users who prefer that, with
  no visual cost to the static appearance.
- Border contrast: `.is-glass` overrides `border-color` (via
  `--ui-glass-border` derived from `--ui-glass-strength`), `border-width`
  and `border-style` are undisturbed. The existing 1px crisp-border
  language and any component-specific border-contrast guarantees in
  `tokens.css` apply unchanged outside the glass rule.

## Browser support and fallback policy

| Feature | Chrome/Edge | Safari | Firefox | Fallback |
|---|---|---|---|---|
| `backdrop-filter` (unprefixed) | ✅ | ✅ 18+ | ✅ 103+ | `@supports not` → solid surface |
| `backdrop-filter` (`-webkit-` prefix) | n/a | ✅ 9+ | n/a | extends coverage to Safari \<18 |
| `prefers-reduced-transparency` | ❌ | ✅ | ❌ | solid surface (same as forced-colors path) |
| `forced-colors` | ✅ | ✅ | ✅ | solid surface, blur/transparency disabled |
| `color-mix()` | ✅ | ✅ | ✅ | already a hard dependency elsewhere in tokens.css |

No new browser floor is introduced beyond what `tokens.css` already
requires (`color-mix()`, `@container`, `:has()`, `oklch()`).

## Python API

No helper signature changes. `card()`, `dialog()`, `drawer()`, `navbar()`,
and `dropdown()` already accept `class_`, and `.is-glass` is applied exactly
like `is-sticky` today:

```python
card(body="...", class_="is-glass")
navbar(brand="...", class_="is-sticky is-glass")
```

The app-wide `data-surface="glass"` attribute is plain HTML on `<html>` or
any ancestor container — no helper involvement, same as how `data-theme`
works today.

## Docs updates

- `docs/components.md`: add a single `is-glass` bullet under `## State Modifiers` (with a "Surface Modifiers" sub-section), following the
  existing bullet-list convention used for `is-primary`, `is-info`, etc.
  Do not inline `.is-glass` notes into the five eligible-component rows —
  that would invent a new docs convention that no other modifier follows.
- `docs/theming-recipes.md`: new "Glass Surfaces" recipe section alongside
  the existing "Dark Theme" recipe. The recipe must include:
  - Both the `data-surface="glass"` whole-app switch and the per-component
    `.is-glass` class examples.
  - A "When to use (and when not to)" callout block, explicitly calling out
    the two stacking pitfalls: dense card grids (already known), and
    nested glass-on-glass (the inner panel blurs the outer tint and looks
    muddy — *not* warned against elsewhere in the spec).
  - A 4-line "Tuning the four (now six) glass tokens" subsection naming
    which knob raises for which effect (`--ui-glass-blur`, `--ui-glass-blur-strong`,
    `--ui-glass-saturate`, `--ui-glass-tint`/`--ui-glass-strength`,
    `--ui-glass-border`, `--ui-glass-highlight`, `--ui-glass-shadow`).
  - One line on radius coupling: "Glass reads best at `--ui-radius-lg`
    (8px) or larger; avoid pairing with `--ui-radius-sm` (4px) unless
    intentional."
  - One line noting it composes with `data-theme="dark"`.
- `docs/usage.md`: add a one-line `class_="is-glass"` example to the
  existing navbar usage section (where `is-sticky` is already documented),
  or cross-link from the theming recipe to the navbar usage section so
  readers following either path find the other.
- `README.md`: add a one-line mention of glass surfaces in the Features
  or Customization section, linking to the theming recipe. Discoverability
  is the weakest link otherwise — readers learn about `.is-glass` only by
  stumbling into `theming-recipes.md` cover-to-cover.
- `CHANGELOG.md`: add an entry at ship time so the feature is findable by
  search after the fact.
- `docs/new-package-spec.md`: **no change.** The "avoid glassmorphism" line
  describes the default and remains accurate.
- Demo: add a glass example section with a low-alpha solid backdrop (e.g.
  `background: oklch(from var(--ui-color-primary) 12% l c h)` — tonally
  consistent with the spec's "no heavy gradients" identity) and a
  three-card showcase at soft / regular / strong glass intensities so
  the depth scale reads at a glance. Per the existing build pipeline,
  `scripts/build_demo.py` is the source of truth for `demo/index.html`;
  `demo/demo.html` is updated by hand to match. Both stay self-contained
  (inlined CSS/JS). The example must use real helper output
  (`card(..., class_="is-glass")`), not hand-written markup, so
  `tests/test_demo_parity.py`'s verbatim-output check covers it.

## Testing

**pytest** (`tests/test_fastblocks_ui.py`): no new helper behavior to test
since there are no signature changes; existing `class_` pass-through tests
already cover `.is-glass` as an arbitrary class string.

**pytest** (`tests/test_fastblocks_ui.py`): extend
`test_bundle_includes_accessibility_media_queries` to also assert the new
tokens, hover rule, and `prefers-reduced-motion` block are present in the
built bundle.

**pytest** (`tests/test_demo_parity.py`): extend to cover the new glass
demo markup (both the single-card example and the three-card showcase).

**vitest** (`tests/js/css-variables.test.js`): extend the token-existence
test to cover all eight glass tokens (`--ui-glass-strength`, `--ui-glass-blur`,
`--ui-glass-blur-strong`, `--ui-glass-saturate`, `--ui-glass-tint`,
`--ui-glass-border`, `--ui-glass-highlight`, `--ui-glass-shadow`), and
add a one-line assertion that `--ui-glass-tint` resolves differently in
the light vs. dark themes (catches a regression that accidentally replaces
`var(--ui-color-surface)` with a static color).

**New e2e contrast test** (`tests/e2e/glass-contrast.spec.js`): render
`.is-glass` (each of the five eligible components) over a pure-black and
pure-white backdrop and assert foreground text still clears 4.5:1 in both
cases. Foreground tokens must include both `--ui-color-text` and
`--ui-color-text-strong` (the latter is what headings use; the existing
loop in the plan only checks `--ui-color-text`).

**New e2e border-contrast test** (`tests/e2e/glass-border-contrast.spec.js`):
render `--ui-glass-border` against the glass tint composited over flat
black and flat white; assert it clears the SC 1.4.11 (3:1) bar in both
configurations. This is a new test type the existing test suite doesn't
cover; dialog and drawer borders carry modal semantics, so a low-contrast
border eliminates the affordance.

**New focus-ring test** (extension to `tests/e2e/glass-surface.spec.js`):
focus an element inside `#card-glass`, assert `--ui-focus-ring` resolves
and clears 3:1 against the composified backdrop per SC 2.4.7. Backdrop-
filter can degrade focus visibility in implementation-dependent ways,
which the current test suite does not cover.

**Playwright e2e** (`tests/e2e/glass-surface.spec.js`):

- `forced-colors: active` emulation renders a solid, non-blurred surface
  for **all five eligible components** plus the scoped-attribute variants
  — the existing test only exercises `#card-glass` and would miss a
  regression scoped to one component.
- `data-surface="glass"` on a container applies the treatment to all five
  eligible components beneath it without requiring `.is-glass` on each.
- `.is-glass` alone (no `data-surface`) applies the treatment to just that
  instance.
- `data-theme="dark"` + `data-surface="glass"` together render correctly
  (composability check).
- Hover applies the deeper tint and the 1px translate, and the transition
  is observable via a CSS variable swap (test by overriding `--ui-glass-tint`
  to a known value and asserting the hover-computed value).

**axe / accessibility spec**: no new violations with `.is-glass` active in
either theme. The axe sweep must also pass under emulated
`forced-colors: active` for the new demo backdrop and showcase cards —
currently axe runs only in the default media state.

## Risks

| Risk | Mitigation |
|---|---|
| Stacking many glass surfaces tanks scroll performance | Scope limited to 5 panel-type components, explicitly excluding dense/repeated surfaces (table, tile grids); documented in the theming recipe as "use for overlays and chrome, not dense grids"; the recipe's "When to use" callout adds the nested-glass-on-glass warning |
| Text contrast varies with real-world backdrop content | 78% tint opacity keeps *average* contrast close to the opaque case by construction; asserted by the new contrast e2e test against flat backdrops in both themes. Per-pixel variation over real backdrops is documented in *Accessibility contract* and the recipe — glass is a decorative surface, not a critical-readability surface |
| `prefers-reduced-transparency` under-relied-upon due to thin support | Treated as defense in depth; `forced-colors` and the fixed tint opacity are the primary safeguards |
| Feature quietly contradicts the spec's own design principles | Opt-in only, `new-package-spec.md` left unedited; documented in Goals as an explicit constraint; the demo backdrop uses a low-alpha solid (not a heavy gradient) to demonstrate the feature without contradicting the restraint principle |
| Hover micro-interaction could trigger vestibular concerns | Fully suppressed under `prefers-reduced-motion: reduce` — the transition and translate are both removed, the static glass effect renders identically. The 150ms ease-out is short enough to feel responsive without reading as motion |
| `--ui-glass-strength` could be set to a value that breaks contrast | The default `1` is the empirically-tested value; the contrast test asserts the default, and a future contributor changing the default must re-run `tests/e2e/glass-contrast.spec.js`. Scaling down toward `0` reduces opacity (safer, not riskier) — the risk is only in scaling up toward larger values, which would re-introduce the contrast issue the spec set out to solve |
| `--_ui-glass-components` could drift from the actual eligible-component list | Drift gate via a parity test that asserts the selector list count matches the comment (3 sites × 1 list). Any divergence fails CI. The list is also small enough (5 components) that visual review catches it |
| Focus indicators on glass surfaces may degrade in some implementations | New focus-ring e2e test asserts `--ui-focus-ring` resolves and clears 3:1 against the composited backdrop; the rule applies `box-shadow` (above the blur paint layer in tested engines) rather than `outline` (which can shift paint order) |

## Follow-ups (not this spec)

- Possible future `data-surface` values beyond `"glass"` (e.g. a flat/matte
  alternative) if a real use case shows up — not designed for speculatively
  here.
- Animated/shimmer glass variants, if requested later, would need their own
  `prefers-reduced-motion` design pass.
- **Future components eligible for glass.** When `ui-tooltip`, `ui-popover`,
  `ui-toast`/`ui-snackbar`, `ui-command` (command palette), and
  `ui-context-menu` are introduced in their own plans, they are strong
  candidates for glass — these are the surfaces modern design systems
  (Linear, Vercel, Stripe, visionOS) most often apply glass to. Adding them
  to glass is a one-line edit to the `--_ui-glass-components` custom
  property in `components.css`; the rest of the implementation is
  component-specific (positioning, focus management, ARIA semantics) and
  should be designed in the component plan, not here. Scroll-tied navbar
  opacity is also deferred — ship navbar as-is for v1, document the
  limitation in the recipe, revisit in a follow-up plan if it generates
  bug reports.
