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
| 5 | No new design-token derivation machinery; 4 explicit tokens | Glass is a handful of independent knobs (blur, saturate, tint, border), not a hue needing WCAG-derived `-contrast`/`-subtle`/`-strong` variants. Deriving one from another would be invented complexity — YAGNI |
| 6 | Tint opacity fixed at a contrast-safe default (78%), not left fully open | Addresses the accessibility risk by construction rather than relying on `prefers-reduced-transparency`, which has thin browser support and cannot be the only guard |
| 7 | No Python helper signature changes | Existing modifiers (`is-sticky`, `is-primary`) are applied via `class_=`, not dedicated parameters; `.is-glass` follows the same convention |

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
--ui-glass-blur: 12px;
--ui-glass-saturate: 130%;
--ui-glass-tint: color-mix(in oklab, var(--ui-color-surface) 78%, transparent);
--ui-glass-border: color-mix(in oklab, var(--ui-color-border) 60%, transparent);
```

- `12px` blur is deliberately restrained relative to common glassmorphism
  tutorials (often 20-40px) — it keeps the effect in the "fine-line, subtle"
  decorative language the spec already asks for, rather than the "heavy"
  look it warns against.
- `130%` saturate compensates for the desaturating effect blur has on
  whatever's behind it; without it, glass panels read as muddy gray rather
  than crisp.
- `78%` tint opacity is the accessibility-critical number: it's high enough
  that text contrast stays close to the fully-opaque-surface case regardless
  of backdrop content, addressed further in *Accessibility contract*.
- `--ui-glass-border` reuses the existing `--ui-color-border` token's hue
  (mixed toward transparent) rather than inventing a new color, keeping
  glass panels tonally consistent with the rest of the theme instead of
  introducing the stereotypical stark white glass-edge.

Dark theme needs no separate override block: `--ui-color-surface` and
`--ui-color-border` already resolve per-theme in `theme.css`, and the glass
tokens are defined in terms of those, so they inherit correctly in both
themes for free.

## CSS implementation

Added to `components.css`, colocated with the eligible components (matching
the existing convention that `.ui-navbar.is-sticky` lives with `.ui-navbar`,
not in a separate file):

```css
:is(.ui-card, .ui-dialog, .ui-drawer, .ui-navbar, .ui-dropdown).is-glass,
[data-surface="glass"] :is(.ui-card, .ui-dialog, .ui-drawer, .ui-navbar, .ui-dropdown) {
  background-color: var(--ui-glass-tint);
  border-color: var(--ui-glass-border);
  -webkit-backdrop-filter: blur(var(--ui-glass-blur)) saturate(var(--ui-glass-saturate));
  backdrop-filter: blur(var(--ui-glass-blur)) saturate(var(--ui-glass-saturate));
}

@supports not (backdrop-filter: blur(1px)) {
  :is(.ui-card, .ui-dialog, .ui-drawer, .ui-navbar, .ui-dropdown).is-glass,
  [data-surface="glass"] :is(.ui-card, .ui-dialog, .ui-drawer, .ui-navbar, .ui-dropdown) {
    background-color: var(--ui-color-surface-raised);
  }
}

@media (prefers-reduced-transparency: reduce), (forced-colors: active) {
  :is(.ui-card, .ui-dialog, .ui-drawer, .ui-navbar, .ui-dropdown).is-glass,
  [data-surface="glass"] :is(.ui-card, .ui-dialog, .ui-drawer, .ui-navbar, .ui-dropdown) {
    background-color: var(--ui-color-surface-raised);
    backdrop-filter: none;
    -webkit-backdrop-filter: none;
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

The `@supports not (...)` block only needs `background-color`, not the full
solid-surface treatment `forced-colors` gets, because a non-supporting
engine simply never applies `backdrop-filter` at all — there's nothing to
turn off, only a background to make solid.

## Accessibility contract

- Text inside a `.is-glass` surface must clear WCAG AA (4.5:1) against both
  a pure-black and pure-white backdrop, guaranteed by the 78% tint opacity
  rather than by hoping real-world backdrops cooperate. Asserted by a new
  test (see *Testing*).
- `forced-colors: active` (Windows High Contrast) fully disables blur and
  translucency — non-negotiable, not a nice-to-have.
- `prefers-reduced-transparency: reduce` gets the same solid fallback.
  Browser support for this media feature is currently thin (Safari/macOS
  only as of this writing), so it's treated as defense in depth, not the
  primary safeguard — the primary safeguard is the 78% tint.
- No motion is introduced, so no new `prefers-reduced-motion` handling is
  needed.
- Border contrast: `.is-glass` overrides `border-color` but not
  `border-width` or `border-style`, so the existing 1px crisp-border
  language and any component-specific border-contrast guarantees in
  `tokens.css` are otherwise undisturbed.

## Browser support and fallback policy

| Feature | Chrome/Edge | Safari | Firefox | Fallback |
|---|---|---|---|---|
| `backdrop-filter` (unprefixed) | ✅ | ✅ 18+ | ✅ 103+ | `@supports not` → solid surface |
| `backdrop-filter` (`-webkit-` prefix) | n/a | ✅ 9+ | n/a | extends coverage to Safari <18 |
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

- `docs/components.md`: add `.is-glass` as a documented modifier under each
  of the five eligible components' rows, following the existing pattern for
  `.ui-navbar.is-sticky`.
- `docs/theming-recipes.md`: new "Glass Surfaces" recipe section alongside
  the existing "Dark Theme" recipe, showing both the `data-surface="glass"`
  whole-app switch and the per-component `.is-glass` class, and one line
  noting it composes with `data-theme="dark"`.
- `docs/new-package-spec.md`: **no change.** The "avoid glassmorphism" line
  describes the default and remains accurate.
- Demo: add a small glass example (e.g. one card with `.is-glass` over a
  patterned background). Per the existing build pipeline, `scripts/build_demo.py`
  is the source of truth for `demo/index.html`; `demo/demo.html` is updated by
  hand to match. Both stay self-contained (inlined CSS/JS). The example must
  use real helper output (`card(..., class_="is-glass")`), not hand-written
  markup, so `tests/test_demo_parity.py`'s verbatim-output check covers it.

## Testing

**pytest** (`tests/test_fastblocks_ui.py`): no new helper behavior to test
since there are no signature changes; existing `class_` pass-through tests
already cover `.is-glass` as an arbitrary class string.

**pytest** (`tests/test_demo_parity.py`): extend to cover the new glass demo
markup once added.

**New e2e contrast test**, sibling to the existing
`tests/e2e/token-contrast.spec.js`: render `.is-glass` (each of the five
eligible components) over a pure-black and pure-white backdrop and assert
foreground text still clears 4.5:1 in both cases.

**Playwright e2e**:
- `forced-colors: active` emulation renders a solid, non-blurred surface.
- `data-surface="glass"` on a container applies the treatment to all five
  eligible components beneath it without requiring `.is-glass` on each.
- `.is-glass` alone (no `data-surface`) applies the treatment to just that
  instance.
- `data-theme="dark"` + `data-surface="glass"` together render correctly
  (composability check).

**axe / accessibility spec**: no new violations with `.is-glass` active in
either theme.

## Risks

| Risk | Mitigation |
|---|---|
| Stacking many glass surfaces tanks scroll performance | Scope limited to 5 panel-type components, explicitly excluding dense/repeated surfaces (table, tile grids); documented in the theming recipe as "use for overlays and chrome, not dense grids" |
| Text contrast varies with real-world backdrop content | 78% tint opacity keeps contrast close to the opaque case by construction; asserted by the new contrast e2e test rather than left to chance |
| `prefers-reduced-transparency` under-relied-upon due to thin support | Treated as defense in depth; `forced-colors` and the fixed tint opacity are the primary safeguards |
| Feature quietly contradicts the spec's own design principles | Opt-in only, `new-package-spec.md` left unedited; documented in Goals as an explicit constraint |

## Follow-ups (not this spec)

- Possible future `data-surface` values beyond `"glass"` (e.g. a flat/matte
  alternative) if a real use case shows up — not designed for speculatively
  here.
- Animated/shimmer glass variants, if requested later, would need their own
  `prefers-reduced-motion` design pass.
