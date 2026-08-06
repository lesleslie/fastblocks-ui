# Spec B: modernizing existing components onto platform primitives

- **Date:** 2026-07-28
- **Status:** Approved design, pending implementation plan
- **Scope:** Spec B of three (see `docs/modernization-roadmap.md`)
- **Related:** Spec A is `2026-07-28-demo-fullwidth-sticky-nav-design.md`.
  Spec C findings are in `docs/spec-c-investigation.md`.
- **Release:** ships as a single `0.8.0` together with Spec A.

## Problem

`docs/modernization-roadmap.md` proposes retiring coordination code — JavaScript
whose only job is keeping two DOM nodes in sync — by adopting platform features
that now do the same work natively. The roadmap is explicitly non-binding and
its support figures were recorded by hand.

Re-verifying those figures against the authoritative dataset changed six of
them, and reading the code changed the rationale for three roadmap items. This
spec records what is actually true and what will actually be built.

## Non-goals

- The demo layout and the four new layout primitives. Spec A.
- Changing sibling packages. Spec C; this spec records the obligations it creates.
- Tier 3 (view transitions) and Tier 4 polish beyond what Spec A already adopted.
- Deferred items: `interpolate-size`, customizable `<select>`, `@scope`,
  `corner-shape`, `popover="hint"`.

## Corrections to the roadmap

These supersede the corresponding roadmap sections. Verified 2026-07-28 against
`web-features@3.34.2` and the current source.

### C1 — item 1.3 is already implemented

The roadmap proposes adding `:has()` to `ui-field`. `components.css:208` already
has it:

```css
.ui-field:has(.ui-input[aria-invalid="true"]),
.ui-field:has(.ui-select[aria-invalid="true"]),
.ui-field:has(.ui-textarea[aria-invalid="true"]) { … }
```

It keys on `aria-invalid`, which the **server** sets. That is deliberate and
matches the project's server-owned-state constraint. No work remains for 1.3.

### C2 — item 1.4 is additive, not a bug fix

The roadmap argues `:user-invalid` fixes a defect because plain `:invalid`
matches empty required fields at page load. The library never uses `:invalid`
— `grep -n ':invalid' components.css` matches only `[aria-invalid="true"]`
attribute selectors. There is no defect to fix.

`:user-invalid` is client-side constraint validation; `aria-invalid` is
server-authoritative. They are complementary layers. Item 1.4 adds pre-submit
client feedback beneath the existing server rule; it does not replace it.

### C3 — item 1.2 does not retire the focus trap for the stated reason

The roadmap says `tests/e2e/dialog-focus-trap.spec.js` "exists to verify
something all three engines now guarantee natively." It does not.
`enhance.js:845`:

```js
// Native modal dialogs trap Tab themselves; back the non-modal fallback.
if (event.key === 'Tab' && !isDialogModal(openDialog)) {
  trapTabFocus(event, openDialog);
}
```

The library already delegates to the browser for `showModal()` dialogs. The
hand-rolled trap runs only on the **non-modal** path, where the platform
provides no trap by design — a non-modal dialog is specified to let focus
leave. The e2e spec sets `HTMLDialogElement.prototype.showModal = undefined`
to force that path precisely because it is not native.

`command="show-modal"` invokes `showModal()`, the already-delegated path.
Migrating to it retires the open/close click plumbing, not the trap. The trap
retires in this spec for a different reason: **non-modal dialog support is
being dropped** (see D3).

### C4 — six support figures were stale or inverted

| Feature | Roadmap / Spec A | `web-features@3.34.2` |
|---|---|---|
| `accent-color` | "Baseline" | `false` — BCD has no `chrome_android` entry |
| `anchor-positioning` | "caniuse computes Baseline 2026" | `false` at feature level; **6 of 325** compat keys lag |
| `overscroll-behavior` | ✅ Chrome / ✅ Safari / ✅ Firefox | `false` — every engine ships it `partial_implementation`; Chrome fixed in 144, FF in 150, **Safari still partial** |
| `field-sizing` | "verify Safari and Firefox" | Baseline Newly **2026-06-16** |
| `container-style-queries` | Tier 3, unverified | Baseline Newly **2026-05-19** |
| `relative-color` | "newer — verify" | Baseline Newly **2024-09-16** |
| `color-contrast()` | not mentioned | `false`, **zero** browser support |

`invoker-commands` (Baseline Newly 2025-12-12) and `user-pseudos` (Baseline
Widely 2023-11-02) confirmed as the roadmap described.

Two of the `false` verdicts are data artifacts rather than real gaps —
`accent-color` lacks only a `chrome_android` record, and `anchor-positioning`
is dragged down by `position-visibility.anchor-valid`, a key this library never
uses. Both are handled by the allowlist and key-level checking below, not by
overriding the dataset.

## Decisions

| # | Decision | Rationale |
|---|---|---|
| D1 | Baseline floor is **Newly available**, checked at compat-key granularity | Feature-level verdicts are the minimum across all sub-keys; key-level asks the precise question |
| D2 | `enhanceMenus` / `enhanceDialogs` are **deleted**, not deprecated | Chosen over no-op shims; accepted cost is a hard module-instantiation error for stale importers |
| D3 | Non-modal `<dialog open>` support is **dropped**; all dialogs are modal | Retires `trapTabFocus`, `focusableWithin`, `isDialogModal`, and the focus-trap e2e spec |
| D4 | A `[data-ui-dialog-autoshow]` hook restores server-owned open state | Dropping non-modal removes the only declarative way a server can render "open" |
| D5 | `ui-*` class names **are** renamed this release, under one stated rule | Blank cheque taken deliberately; cross-repo cost is near zero (see D9) |
| D6 | Contrast is verified by a **real-engine** Playwright sample grid | Only the browser knows what `color-mix(in oklab, …)` resolves to, including gamut mapping |
| D7 | Ships as a single `0.8.0` with Spec A | Siblings migrate once |
| D8 | Foregrounds are **never** derived with `color-mix()` | `color-contrast()` has zero support; relative colour syntax handles it deterministically |
| D9 | Renames are free across the repo boundary | Neither sibling hardcodes any `ui-*` class |

### Rejected alternatives

- **No-op deprecation shims for the JS exports** — rejected in favour of D2.
  Recorded because the failure mode is sharp: a named import of a removed ES
  export is a module-instantiation error, so a stale
  `import { enhanceMenus } from 'fastblocks-ui.js'` takes down the *entire*
  enhancement layer — tabs and custom elements included — not just menus.
  Mitigation is the CHANGELOG and the major-version signal, nothing more.
- **Keeping non-modal dialogs without a trap** — spec-correct (non-modal
  dialogs are meant to let focus leave) but a silent behaviour change against a
  hard a11y contract. Rejected in favour of the explicit break in D3.
- **Baseline Widely floor** — would flag `popover`, `@starting-style`,
  `content-visibility`, `scrollbar-gutter`, `light-dark`, `field-sizing` and
  `text-wrap`, i.e. most of Spec A and most of Spec B. Too strict for a
  clean-slate library whose premise is adopting recent platform features.
- **Pure-Python contrast math** — fast and offline, but tests our
  reimplementation of `color-mix`, not the engines'.
- **Renaming only `ui-menu`** — rejected as half a fix; the convention split
  below is the larger defect and is actively replicating into new code.

## Baseline enforcement policy

Implemented by `scripts/check-baseline.mjs` (phase B0, already landed).

**Floor:** every CSS feature used outside a guard must be Baseline Newly
(`status.baseline === "low"`) or Widely (`"high"`).

**Granularity:** BCD compat keys (`css.properties.position-area`), reverse-mapped
to `web-features` entries via each feature's `compat_features[]` array.

**Escape hatch 1 — `@supports`.** A declaration inside a matching `@supports`
block may use any feature. This is for **load-bearing** features, where absence
changes correctness or layout: scroll-driven animations, anchor positioning.

**Escape hatch 2 — allowlist.** `.baseline-allowlist.json` entries carry a
compat key, a rationale, a degradation note, and a `review-by` date. This is for
features that are **inert on failure** — an unsupported declaration is dropped
by the CSS parser and the result is still correct. Wrapping those in `@supports`
would be pure ceremony.

**Partial implementations force escape hatch 2.** Baseline counts a
`partial_implementation` record as unsupported, but the engine still *parses*
the declaration — so `@supports` returns true there and the guard protects
nothing while looking like it does. `overscroll-behavior` is the live example:
every engine shipped it partially (no effect on containers without scrollable
overflow), Chrome fixed it in 144 and Firefox in 150, and Safari has not
(webkit.org/b/243452). A guard around it would be actively misleading, so a
partial implementation always belongs in the allowlist with the real-world
degradation written down.

**Value-keyword granularity.** BCD's per-value records are patchily populated —
`css.properties.cursor.pointer` reports not-Baseline solely because no
`safari_ios` version was ever recorded. A value sub-key is therefore only
checked when it maps to a *different* web-feature than its parent property.
That keeps the signal that matters (`text-wrap: balance` is Baseline,
`text-wrap: pretty` is not — only the value key distinguishes them) and drops
the noise (`cursor.pointer` and `cursor` are the same feature, so the property
verdict already covers it).

**Day-one allowlist**, as actually emitted by the checker against 117 feature
keys in the six source modules:

| Key | Reason | Degradation |
|---|---|---|
| `css.properties.accent-color` | BCD data gap — six of seven browsers recorded, no `chrome_android` entry at all | UA-default checkbox/radio colour |
| `css.properties.clip` | **Not a support gap.** All seven recorded back to Chrome 1; flagged because `clip` is *deprecated* | None at runtime |
| `css.types.shape.rect` | The `rect()` inside the same `clip` declaration | None at runtime |

`overscroll-behavior` and `text-wrap: pretty` need no entry — neither is used by
the library today. `scroll-driven-animations` needs none either: Spec A guards it
with `@supports (animation-timeline: view()) and (timeline-scope: none)`.

**The `clip` entry is a real finding, not bookkeeping.** `.ui-visually-hidden`
(`utilities.css:41`) uses the deprecated `clip: rect(0, 0, 0, 0)`, while Spec A's
`.ui-burger__label` uses `clip-path: inset(50%)`. The library is about to ship
two visually-hidden implementations, one deprecated. Migrating `.ui-visually-hidden`
to `clip-path` is a B1 task; it was not done in B0 because the fix requires
rebuilding `fastblocks-ui.css`, which Spec A owns.

**Staleness:** the checker prints the `web-features` version it ran against
(3.34.2 at time of writing) and fails if any `reviewBy` date has passed. The
dataset is a devDependency and bumps like any other. Dead exemptions — unused,
or for a feature that has since reached the floor — also fail the build.

## Work phases

Implementation ordering inside the single `0.8.0` release. B2 and B3 cannot
start until Spec A is merged to main.

### B0 — Baseline tooling *(complete)*

`scripts/check-baseline.mjs` and `.baseline-allowlist.json`, wired into
`npm run validate` via `npm run check:baseline`.

**Deferred, and blocked on Spec A:** the crackerjack gate. Crackerjack runs
pytest, and this repo's established pattern for a non-Python gate is a pytest
test that shells out — `tests/test_fastblocks_ui.py:341` does exactly this for
`tools/build_css.py --check`. Spec A owns `tests/`, so B0 could not add the
equivalent. The test to add once Spec A lands:

```python
def test_css_meets_the_declared_baseline_floor() -> None:
    result = subprocess.run(
        ["node", str(repo_root / "scripts" / "check-baseline.mjs")],
        capture_output=True, text=True,
    )
    assert result.returncode == 0, result.stdout + result.stderr
```

A `.pre-commit-config.yaml` hook was considered and rejected: crackerjack's
`smart_merge_pre_commit_config` returns the source config unchanged and
`write_pre_commit_config` serialises it as JSON, so a hand-written hook at that
path would be overwritten.

### B1 — additive correctness

No markup changes, no public API changes, no `@supports` guards needed.

```css
/* Client-side pre-submit feedback, layered beneath the server-authoritative
   aria-invalid rules that already exist. */
.ui-field:has(:user-invalid) { --ui-field-border: var(--ui-color-danger); }
.ui-field:has(:disabled)     { opacity: 0.6; }

:root { accent-color: var(--ui-color-primary); }

.ui-textarea { field-sizing: content; }
```

Ordering matters: the `:user-invalid` rule must precede the `aria-invalid`
rules so server state wins on equal specificity.

`field-sizing` reached Baseline Newly six weeks ago (2026-06-16), so it needs no
guard — a change from the roadmap's assumption.

Also in B1, from the B0 findings: migrate `.ui-visually-hidden` off deprecated
`clip`/`rect()` onto `clip-path`, matching what Spec A's `.ui-burger__label`
already does, and delete the two corresponding allowlist entries.

```css
.ui-visually-hidden {
  position: absolute;
  inline-size: 1px;
  block-size: 1px;
  overflow: hidden;
  clip-path: inset(50%);
  white-space: nowrap;
}
```

Spec A should then reference `.ui-visually-hidden` from `.ui-burger__label`
rather than restating the six declarations, so there is one implementation.

### B2 — retiring coordination code

**`ui-menu` → `ui-dropdown`, on Popover API + anchor positioning.**

```css
.ui-dropdown {
  position: fixed;
  position-area: block-end span-inline-end;
  position-try-fallbacks: flip-block, flip-inline;
}
```

`popovertarget` creates an implicit anchor reference, so no `anchor-name` is
needed. Deletes the `position: relative` ancestor contract (a 12-line CSS
comment and a helper docstring that document a defect rather than fix it), the
`[hidden]` toggling, and the `z-index: 20` stacking guess.

Guarded: `anchor-positioning` is below the floor at feature level, and the
guard is genuinely load-bearing — without it the panel needs the old positioned
ancestor.

```css
@supports (position-area: block-end) {
  /* anchor-positioned path */
}
```

**`ui-dialog` → `command` / `commandfor`.**

```html
<button command="show-modal" commandfor="my-dialog">Open</button>
<dialog id="my-dialog" class="ui-dialog">
  <button command="close" commandfor="my-dialog">Close</button>
</dialog>
```

Retires the open/close click plumbing. Native `<dialog>` supplies focus
trapping, Escape, backdrop, and inert background content for modal dialogs.

**JS surface.** Exports drop from five to three:

```js
export { defineFastBlocksCustomElements, enhanceTabs, initFastBlocksUI }
```

Deleted: `enhanceMenus`, `enhanceDialogs`, `trapTabFocus`, `focusableWithin`,
`isDialogModal`, `openDialogShared`, `closeDialogShared`, and the
`data-ui-menu-target` / `data-ui-dialog-target` / `data-ui-dialog-trigger`
attribute hooks.

Added — the only new JavaScript in this spec:

```js
export function enhanceDialogAutoshow(root = document) {
  const show = () => root.querySelectorAll('dialog[data-ui-dialog-autoshow]')
    .forEach((d) => { if (!d.open) d.showModal(); });
  show();
  document.addEventListener('htmx:afterSwap', show);
  return () => document.removeEventListener('htmx:afterSwap', show);
}
```

Behaviour-only and degrades to a closed dialog with no JS, satisfying the
JS-optional constraint. It is wired from `initFastBlocksUI` and **not**
separately exported, keeping the public surface at three.

### B3 — token derivation

```css
--ui-color-primary-subtle: color-mix(in oklab, var(--ui-color-primary) 12%, var(--ui-color-surface));
--ui-color-primary-strong: color-mix(in oklab, var(--ui-color-primary) 80%, black);
--ui-color-primary-contrast: oklch(from var(--ui-color-primary) clamp(0, (0.62 - l) * 1000, 1) 0 0);
```

Backgrounds derive with `color-mix()`; the foreground derives with relative
colour syntax, which resolves to pure black or pure white by the brand colour's
own lightness (D8). `color-contrast()` would be the natural tool and has zero
browser support.

Fifteen hand-authored values across five semantic colours collapse to five
inputs. Gated on the contrast matrix below.

`tokens.css` currently carries a substantial comment block recording the
Tailwind-v4 provenance of each value and the measured contrast pairs. That
provenance must survive as the documented *default inputs*, not be deleted with
the derived values.

## Class rename audit

Rule adopted: **BEM `__` separates a component from its elements; a single
hyphen appears only inside a standalone component's own name.**

The current surface splits by origin — freshly authored components use `__`
(`ui-card__body`, `ui-tabs__panel`, `ui-switch__thumb`), components ported from
Bulma's vocabulary use `-`. Spec A commits to `__` in prose and then ships
`ui-burger__bar` alongside `ui-shell-main`, so the split is replicating.

| Old | New | Reason |
|---|---|---|
| `ui-menu`, `ui-menu__item` | `ui-dropdown`, `ui-dropdown__item` | Semantic collision: Spec A named `ui-nav-list` rather than `ui-menu-list` solely to avoid implying kinship with this component |
| `ui-hero-head/-body/-foot` | `ui-hero__head/__body/__foot` | Convention |
| `ui-level-left/-right/-item/-content` | `ui-level__left/__right/__item/__content` | Convention |
| `ui-media-left/-right/-content` | `ui-media__left/__right/__content` | Convention |
| `ui-navbar-brand/-start/-end/-item/-menu` | `ui-navbar__brand/__start/__end/__item/__menu` | Convention; also resolves `ui-navbar-menu` vs `ui-menu` |
| `ui-table-container` | `ui-table__container` | Convention |
| `ui-shell-main`, `ui-shell-aside` *(Spec A)* | `ui-shell__main`, `ui-shell__aside` | Convention, applied before Spec A's names reach a release |

**Unchanged:** `ui-columns`/`ui-column` and `ui-tiles`/`ui-tile` are sibling
components, not elements — the plural is a container in its own right, so a
hyphen is correct. All `is-*` state modifiers. All utilities (`ui-stack`,
`ui-cluster`, `ui-surface`, `ui-muted`, `ui-visually-hidden`, `ui-measure`).

**No aliases, no deprecation period.** The renames land in the same breaking
release as D2 and D3.

## Cross-repo obligations

Established in `docs/spec-c-investigation.md`. Neither sibling hardcodes a
`ui-*` class, so the rename audit costs them nothing. What does cost them:

1. **`manifest.json` component set changes** — Spec A adds five, this spec
   renames `menu` → `dropdown`. `fastblocks-htmy` asserts
   `set(trusted_components()) == {c["name"] for c in manifest["components"]}`,
   an exact set equality, so both directions break it.
1. **`fastblocks-htmy` regenerates** `ui/_generated.py` and `layout/_generated.py`
   from the manifest, and its hand-written `Menu` wrapper becomes `Dropdown`.
1. **Version pins** — `fastblocks-htmy` moves to `>=0.8,<0.9` in both
   `pyproject.toml` and `_UI_MIN`/`_UI_MAX`; `fastblocks` moves its optional
   `fastblocks_ui` extra to the same range.
1. **`fastblocks`'s five Jinja globals** (`ui_button`, `ui_card`, `ui_field`,
   `ui_alert`, `ui_container`) touch no renamed component and need no change.

Release order: `fastblocks-ui` 0.8.0 → `fastblocks-htmy` → `fastblocks`.

## Testing

**Baseline checker** — `npm run validate` and the crackerjack gate. Fails on an
unguarded sub-floor feature, an expired `review-by`, or an allowlist entry for a
feature that has since reached Baseline (dead entries are errors, not warnings).

**Contrast matrix** — `tests/e2e/token-contrast.spec.js`. A fixture page sets
`--ui-color-primary` to each point of a deterministic OKLCH grid (12 hues × 5
lightness × 3 chroma, plus the five shipped defaults), reads `getComputedStyle`
for every derived token, and asserts in-page:

- `-subtle` background against `--ui-color-text` ≥ 4.5:1
- `base` and `-strong` against `-contrast` ≥ 4.5:1
- border tokens against adjacent surfaces ≥ 3:1

Runs in all three engines; a failure names the exact input colour and pair. The
grid is a fixed list checked into the repo, not generated at runtime, so
failures are reproducible.

**E2E** — dropdown opens from its invoker, flips at viewport edges, light-dismisses,
returns focus; `command`/`commandfor` opens and closes the dialog with no author
JS in all three engines; `[data-ui-dialog-autoshow]` opens on load and after an
`htmx:afterSwap`.

**Vitest** — `enhanceDialogAutoshow` covers already-open (no-op), absent element
(no throw), and swap-triggered reopen. Existing `enhance.js` tests updated for
the three-export surface.

**Deleted** — `tests/e2e/dialog-focus-trap.spec.js`, in full.

**Demo parity** — `tests/test_demo_parity.py` selectors updated for every renamed
class; `scripts/build_demo.py`, `demo/index.html` and `demo/demo.html` regenerated
in step. The inlined-CSS drift gate from f188d25 extends to the new rules.

**axe** — no new violations with the dropdown open and closed, at each breakpoint.

## Risks

| Risk | Mitigation |
|---|---|
| Stale importer of a deleted ES export takes down the whole enhancement layer | Accepted under D2; CHANGELOG entry and major-version signal are the only mitigation available |
| Dropping non-modal dialogs breaks a server-rendered open state | `[data-ui-dialog-autoshow]` (D4); called out explicitly in CHANGELOG and `usage.md` |
| Rename churn desynchronises the three artefacts | Parity test updated before markup changes, as in Spec A |
| Derived tokens regress contrast for an untested brand colour | Real-engine sample grid (D6); foregrounds removed from the derived set entirely (D8) |
| `anchor-positioning` guard silently never matches | E2E asserts both the guarded and fallback renderings, as Spec A does for the navbar reveal |
| BCD data artifacts age into real allowlist debt | `review-by` dates; dead allowlist entries fail the build |
| Sibling repos break mid-migration | Fixed release order; siblings pin `<0.9` before 0.8.0 publishes |

## Open items for the implementation plan

- The `--ui-color-*-subtle` mix percentages are placeholders from the roadmap
  (12% / 80%). The matrix in B3 determines the real values; the plan must run it
  before the percentages are fixed.
- `ui-navbar__menu` may prove redundant once `ui-dropdown` exists; decide during
  B2 rather than preemptively.
