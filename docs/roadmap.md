# FastBlocks UI — Roadmap

Status: Active (v2 — incorporates multi-agent review)
Last updated: 2026-06-02
Supersedes (archived under `docs/archive/superseded-plans/`):
`implementation-plan.md`, `new-package-next-steps.md`, `remaining-items.md`

This roadmap covers the remediation of `fastblocks-ui` and the parallel spin-up of
its sibling package `fastblocks-htmy`. It is the single source of planning truth.

> **Review record.** This plan was reviewed by three independent agents
> (architecture, Python/packaging, frontend/CSS/a11y). All returned
> "Endorse-with-changes." Their accepted findings are folded in below and tagged
> `[rev]` where they changed a prior decision.

______________________________________________________________________

## 1. Architecture decision record

### 1.1 Two separate repositories (not a monorepo)

**Decision:** `fastblocks-ui` and `fastblocks-htmy` are **separate git repositories**,
each its own PyPI wheel.

**Why:** Our quality/release tool **crackerjack** is architecturally
one-repo-one-package: single root `pyproject.toml` (`project.name`), a single
`--cov={package}` target, `.git`-at-root release flow, and no workspace concept. A
uv-workspace monorepo would break per-package coverage, package-name resolution, and
the git-integrated release flow. Two repos align with crackerjack and the Bodai
ecosystem convention (one component = one repo).

### 1.2 Layering and dependency direction

```
┌──────────────────────────────────────────────┐
│ fastblocks-htmy            (separate repo)     │  FastBlocks-native, type-safe
│   typed htmy components, htmx patterns,        │  deps: fastblocks-ui, htmy
│   FastBlocks adapter (asset + template wiring) │
├──────────────────────────────────────────────┤
│ fastblocks-ui              (this repo)         │  zero-dependency design system
│   CSS + tokens + manifest.json + string        │  usable from raw Jinja/Flask/Django
│   helpers                                      │  AND FastBlocks
└──────────────────────────────────────────────┘
```

- `fastblocks-ui` stays **zero runtime dependencies**.
- `fastblocks-htmy` depends on `fastblocks-ui` and `htmy`.
- The string helpers remain in `fastblocks-ui`; `fastblocks-htmy` is the
  **recommended** path for FastBlocks apps.

**[rev] Coexistence cost is real, not free.** Maintaining string helpers + htmy
components + CSS means three generators of the same surface. We will NOT attempt to
codegen the string helpers from the manifest (their ARIA/pagination logic is too
bespoke). Instead:

- Add htmy↔string **parity tests** (same `ui-*`/`is-*` token set for equivalent
  inputs).
- Document that string helpers MAY be deprecated once htmy reaches parity; do not
  market permanent coexistence as cost-free.

**[rev] Python floor conflict.** `fastblocks-ui` requires `>=3.13`; the htmy spec
(`docs/fastblocks-htmy-spec.md:314`) claims `>=3.10`. Since htmy depends on
fastblocks-ui, the effective floor is **3.13**. Either lower fastblocks-ui to 3.10 or
correct the spec. Decide explicitly; document the chosen floor as intent in both
READMEs.

### 1.3 Cross-repo drift control

`manifest.json` is the contract. It ships in the `fastblocks-ui` wheel and is read by
`fastblocks-htmy` via `importlib.resources`.

**[rev] The manifest is currently too thin to be "the contract."** It carries only
`name / class_name / helper / description` + a flat `state_modifiers` list — no
per-component props, variants, or required CSS classes. As-is it can only catch
"component missing entirely," not signature/variant drift (the most likely
divergence). Remediation:

- **Extend the manifest schema** to include per-component props and allowed
  variants/sizes (WS-4), OR explicitly scope the guarantee to "name-level coverage
  only" in docs. We will extend it.
- **[rev] CSS-class drift is invisible to a Python manifest.** Add a CI step in
  `fastblocks-htmy` that greps rendered component output for `ui-*`/`is-*` tokens and
  asserts each exists in the **installed bundle's CSS** (parse `fastblocks-ui.css`),
  not just in the manifest.
- **[rev] Guard runtime version skew, not just test-time.** `fastblocks-htmy` adds an
  import-time assertion that the installed `fastblocks-ui` is within its tested
  range, and pins a **hard upper bound** (`fastblocks-ui>=A,<B`), not an aspirational
  floor.
- **[rev] Cross-repo CI.** On `fastblocks-ui` release (and nightly), a downstream
  smoke job installs both and runs `fastblocks-htmy`'s coverage + CSS-token checks
  against the new wheel. Without this, §1.3 validation runs too late.

Rule: **every new component lands in `manifest.json` first.** All layers validate
against it.

### 1.4 SemVer & breaking-change coordination

**[rev] A pin is not a policy.** Written, enforced rule:

- Any breaking change to a `ui-*`/`is-*` class, manifest entry, or asset path is a
  **major** bump in `fastblocks-ui` and requires a matching `fastblocks-htmy` release
  before its floor moves.
- Maintain a dedicated "Contract changes (CSS classes / manifest / asset paths)"
  section in `fastblocks-ui`'s CHANGELOG that release tooling must update.
- The downstream smoke job (1.3) is the backstop that catches uncoordinated breaks.

### 1.5 Asset serving & versioning

**[rev] Define how htmy locates/serves the CSS+JS that live in the fastblocks-ui
wheel** (the roadmap previously omitted this):

- Resolution: `importlib.resources` path into the installed `fastblocks-ui` package;
  the FastBlocks adapter mounts it as a static route (no copy).
- Cache-busting: append `?v=<fastblocks-ui version>` to emitted asset URLs.
- htmx ownership: the adapter does **not** bundle htmx; it documents the expected
  htmx version and leaves inclusion to the app (resolves spec §10 open question).

### 1.6 Branding honesty (interim)

We are FastBlocks-ecosystem-first, so "optimized for FastBlocks" must be made **true**
via the htmy adapter — not softened permanently. **[rev] Until the adapter ships**,
soften the interim `fastblocks-ui` `pyproject.toml` `description` (line 4) and correct
`docs/usage.md` (it currently shows `{{ }}` Jinja, not FastBlocks `[[ ]]`), so the
PyPI claim isn't misleading in the gap.

______________________________________________________________________

## 2. fastblocks-ui remediation (this repo)

WS-1..WS-5 run in parallel after WS-0.

### WS-0 — Foundation & hygiene (do first)

- [ ] **[rev] Version single-source robustly.** Replace the `__version__` literal in
  `fastblocks_ui/__init__.py:3` with:
  ```python
  from importlib.metadata import version, PackageNotFoundError
  try:
      __version__ = version("fastblocks-ui")
  except PackageNotFoundError:  # running from a source checkout
      __version__ = "0.0.0+dev"
  ```
  Fix `tests/test_fastblocks_ui.py:43` to assert a version *format*, not the literal
  `0.4.2` (otherwise it re-breaks every release).
- [ ] Add `fastblocks_ui/py.typed` AND declare it in
  `[tool.setuptools.package-data]` (`pyproject.toml:68`): `fastblocks_ui = ["py.typed", "manifest.json", "static/**/*"]`.
- [ ] `git rm --cached` tracked artifacts already covered by `.gitignore`
  (`.crackerjack/adapter_learning.db`, `.oneiric_cache/domain_activity.sqlite`,
  `fastbulma/.skylos/cache.sqlite`); finish removing the half-deleted `fastbulma/`.
- [ ] Prune `docs/.backups/`, `docs/usage.md.backup*`; archive the superseded plan
  docs listed in the header.

### WS-1 — CSS single source of truth

Problem: `static/css/fastblocks-ui.css` inlines copies of the module CSS; the
standalone modules are unimported and have **already diverged**
(`--ui-color-danger-strong` `#b91c1c` in the bundle vs `#dc2626` in `tokens.css`).
The `themes/` dir (BOTH `default.css` and `dark.css`) is orphaned. CSS tests assert
against the non-shipping module files.

- [x] Declare the module CSS files the source of truth — the canonical content was
  split verbatim out of the shipping bundle into `tokens/theme/base/utilities/ components.css` (+ existing `layout.css`); equivalence verified (0 declarations
  lost/added).
- [x] **Build step `tools/build_css.py`.** **DEVIATION from the lightningcss
  recommendation:** used a deterministic Python concatenator instead. Rationale: it
  satisfies every *correctness* concern (explicit `@layer` order, single source) with
  **provable** byte-equivalence and **zero new build-tool/transpilation risk**, and
  keeps the package Node-free for the core build. lightningcss's remaining value
  (minify / autoprefix / `color-mix()` fallbacks) is *optimization* — the current
  bundle has none of those today, so deferring is not a regression.
  **→ carryover:** add lightningcss as a post-processing optimization once visual
  tests can validate transpiled output.
- [x] **Explicit `@layer` order statement.** Emitted as
  `@layer components, tokens, theme, base, utilities;` — this **preserves the
  historical effective order** (components lowest, utilities highest; it arose because
  `layout.css` was `@import`ed first). Order is now intentional and
  concatenation-independent. *(Note: differs from the originally-guessed
  `tokens,theme,base,utilities,components`; the as-shipped order is what we preserved
  to guarantee no visual regression. Reconsidering the order is a future design call.)*
- [x] **`copy-assets` now ships only the built bundle** (`cli.py`), not the source
  modules; test asserts no module CSS (`tokens/components/layout/theme.css`) is copied.
- [x] **Drift gate:** `python tools/build_css.py --check` + a unit test that fails if
  the committed bundle is stale (replaces the `git diff` idea; works without CI yaml).
  Verified it actually fires on a perturbed module.
- [x] **Deleted the orphaned `themes/` dir** (default.css AND dark.css); dark mode
  ships via the `[data-theme="dark"]` block now living in `theme.css`.
- [x] **Kept the `[data-theme="dark"]` override model; rejected `light-dark()`** (keys
  off `color-scheme`, not the explicit toggle; can't express non-color tokens). The
  block is now generated from the single `theme.css` source.
- [x] **Added `@media (prefers-color-scheme: dark)` no-JS default**, gated to
  `:root:not([data-theme])` so an explicit theme still wins. Implemented as a
  **build-time macro** in `build_css.py` that generates the block from the single
  `[data-theme="dark"]` source — no hand-duplicated dark tokens. Verified in-browser
  via the CSSOM; test guards it.
- [x] CSS tests now validate the canonical modules (which are the source) + a new test
  asserting the bundle declares the explicit `@layer` order.

**WS-1 carryover (follow-up increment):** ~~the `progress()` CSP swap~~ (done), the
`prefers-color-scheme` no-JS default (deferred — needs a no-duplication approach, e.g.
a build-time macro so dark tokens aren't written twice), and the optional lightningcss
optimization pass.

### WS-2 — Helper hardening

- [ ] **[rev] `progress()` (`helpers.py:852,860,869`):** use floats throughout (both
  `int(value)` and `int(max_value)` truncate; `aria_valuenow` also lies); guard
  `max_value == 0`.
- [x] **[rev] `progress()` CSP** — swapped to a native `<progress>` element (implicit
  `role="progressbar"`, `value`/`max` attributes, text fallback). No inline `style=`,
  so it is safe under a strict `style-src`. The `ui-progress` CSS in `layout.css` was
  rewritten for the native element (`::-webkit-progress-value`/`::-moz-progress-bar`
  - per-variant rules); the old `.ui-progress__bar` span is gone.
- [x] **[rev] Enforce CSP as a test:** `test_progress_is_csp_safe` asserts no `style=`
  in progress output (it was the only inline style in the helper surface).
- [ ] **[rev] `pagination()` (`helpers.py:945,947,951`):** (a) replace
  `url_pattern.format(page=...)` with `url_pattern.replace("{page}", str(page))` —
  `.format()` allows attribute/index injection (`{page.__class__}`) and crashes on any
  other `{...}`; (b) wrap the `label` in `page_link` with `_render_fragment` (it is
  emitted unescaped); (c) fix the `label: str | int = None` type lie.
- [x] Added `Variant`/`Size` aliases (`Literal[...] | str` — autocomplete for known
  values, custom CSS variants still pass) and applied them to button/alert/hero/
  navbar/section/title/progress (grid sizes on `column`/`tile` deliberately stay
  `str`). Exported `Variant`/`Size` from the package.
- [x] **Made `py.typed` genuinely sound:** `pyright` is now 0 errors/0 warnings on the
  helper surface. Fixed two pre-existing type defects en route — the `__html__` access
  on `object` (use `getattr`), and `pagination()`'s `list[int | str]` page list (now a
  pure `list[int]` window with boolean ellipsis boundaries; behavior verified
  unchanged).
- [ ] **[rev] `_inject_attrs` (`helpers.py:110`) is a known-UNSAFE regex HTML path**,
  not merely "single-root contract" — it breaks on `>` inside attribute values and
  feeds `field()`. Document it as known-unsafe and superseded by htmy; do not expand
  its use.

### WS-3 — Docs, a11y & test integrity

- [x] Corrected `docs/usage.md`: added a template-syntax note framing the examples as
  generic Jinja (`{{ }}`) and pointing FastBlocks `[[ ]]` integration to
  `fastblocks-htmy`. Also softened the `pyproject.toml` description (interim branding
  honesty, §1.6) so the PyPI metadata no longer overclaims FastBlocks-optimization.
- [x] **Menu arrow-key navigation + focus management** — added a shared
  `handleMenuKeydown` helper (ArrowUp/Down with wrap, Home/End, Enter/Space-to-open,
  Tab-to-close, Escape closes + restores focus to the trigger) wired into BOTH the
  `UiMenuElement` class and the function-based `enhanceMenus` (previously Escape-only,
  and duplicated). jsdom tests cover both paths.
  - *Discovery:* menu and dialog logic is **duplicated** across a custom-element class
    and a function enhancer; the shared helper removes the menu duplication. The dialog
    pair should be consolidated similarly.
- [x] **Dialog focus trap** on the `setAttribute('open')` fallback path — added a
  shared `trapTabFocus` helper (Tab/Shift+Tab wrap) wired into BOTH dialog
  implementations, tracking modal vs fallback so native `showModal()` keeps its own
  trap. Covered by a deterministic jsdom test (forced fallback) AND a real-browser
  Playwright spec (`tests/e2e/dialog-focus-trap.spec.js`): focus-into-dialog, Escape
  restores focus to the trigger, and Tab wraps on the fallback path. Both pass in
  Chromium.
- [x] **Fixed the stale Playwright `webServer`** (`src/fastblocks_ui` →
  `fastblocks_ui`); the whole e2e suite was serving an empty dir. Made the smoke
  badge-count assertion derive from the served manifest (no longer hard-coded to 11).
- [x] **[rev] Added `prefers-reduced-motion` global block** to `base.css` (neutralizes
  animations/transitions/smooth-scroll — WCAG 2.3.3); test asserts it ships.
- [x] **[rev] Added `@media (forced-colors: active)`** outline fallback so the
  box-shadow focus ring stays visible in forced-colors/high-contrast mode.
- [ ] Replace brittle substring HTML assertions with parsed-DOM checks where it
  matters; keep manifest-coverage tests. Retire the `"Microsoft's " + "FAST"`
  string-splitting doc tests (`tests/test_fastblocks_ui.py:252`).

### WS-4 — Manifest as contract

- [ ] **[rev] Extend the manifest schema** beyond `name/class_name/helper/description`
  to include per-component props and allowed variants/sizes (leverage existing
  `scripts/generate-*.py`).
- [x] **Contract tests added** (`TestManifestContract`): every manifest component's
  helper is exported & callable, its `class_name` is styled in the shipped bundle, and
  it is documented in `docs/components.md`. These immediately caught real drift —
  `navbar`/`breadcrumb`/`progress`/`table`/`pagination` were missing from the docs;
  now added and guarded.
- [ ] **[rev] Document the limitation:** a Python-side manifest catches existence and
  (now) declared-variant drift, but NOT signature/return-type parity between string
  helpers and htmy — that is covered by the §1.2 parity tests, not the manifest.

### WS-5 — Dependency & supply-chain hygiene **[rev — new workstream]**

> Note: quality gates run via **crackerjack** (`crackerjack all`), not a GitHub
> Actions workflow; "CI gate" below means the crackerjack pipeline.

- [x] Reconcile contradictory crackerjack pins: bumped `crackerjack>=0.1.0`
  (extras) to `>=0.50.1` to match `[dependency-groups]`.
- [x] Restore the accidentally-deleted `.pip-audit-suppressions.txt` (held a
  legitimate transitive protobuf CVE suppression consumed by crackerjack's
  `pip-audit` step).
- [x] **Assert zero runtime dependencies** via a test
  (`test_zero_runtime_dependencies`) — chosen over `creosote` because creosote
  detects *unused* declared deps, not the empty-`dependencies` invariant we want.
- [x] `uv.lock` committed/refreshed (WS-0) and is the version source of truth.
- [ ] *(carryover)* Document the dependency-floor strategy in CONTRIBUTING/README.

______________________________________________________________________

## 3. fastblocks-htmy spin-up (new sibling repo)

Reference spec: `docs/fastblocks-htmy-spec.md` (move into the new repo once
scaffolded; correct its Python-floor claim — see §1.2).

- [ ] Scaffold `fastblocks-htmy` with crackerjack (own `.git`, `pyproject.toml`,
  `py.typed`, coverage target).
- [ ] `FastBlocksComponent` base + Phase 1 components: Button, Container, Table, Field.
- [ ] **Adapter** (`fastblocks_htmy/fastblocks/`): register CSS/JS assets (per §1.5)
  and install helpers/components as template globals using FastBlocks `[[ ]]`
  delimiters. This is the deliverable that makes the FastBlocks branding true.
- [ ] Generate htmy component stubs from the installed `fastblocks-ui` manifest;
  validate coverage + the CSS-token presence check (§1.3) in CI.
- [ ] Import-time version-range assertion + hard upper-bound pin on `fastblocks-ui`
  (§1.3).
- [ ] Pin `htmy` with a tested floor; add htmx-pattern components (DataTable, Modal).
- [ ] Keep htmy components thin wrappers over the same `ui-*` classes; enforce via the
  §1.2 parity tests.

______________________________________________________________________

## 4. Other improvements

- Token export pipeline: one source → CSS + a Python/JS token module so htmy and the
  JS layer read the same values (breakpoints, etc.).
- **[rev] Asset versioning/cache-busting** helper (content-hash or `?v=` from package
  version) — `copy-assets` currently ships unhashed filenames.
- **[rev] Concrete CSS bundle-size budget** as a CI gate — e.g. **≤ 30 KB min+gzip**,
  not just "a budget."
- Keep Python floor decision documented as intent (§1.2) in the README.

______________________________________________________________________

## 5. Future considerations / guardrails

1. Manifest is law — new components land there first; all layers validated against it
   (existence + declared variants; parity covered separately).
1. Track htmx 2.x and htmy versions; keep htmx-pattern components in `fastblocks-htmy`,
   never in zero-dep `fastblocks-ui`.
1. CSP-clean by default: no inline styles or handlers; **enforced by test** (WS-2).
1. Accessibility as CI gates: axe **plus** named keyboard/focus acceptance tests for
   the JS layer; `prefers-reduced-motion`, `forced-colors`, `:focus-visible`.
1. SemVer coordination protocol across two wheels (§1.4) — written gate + downstream
   smoke CI, not just a pin.
1. Modern CSS (`light-dark()` deliberately NOT used for theming — see WS-1; `:has()`,
   container queries, `color-mix()`) behind a documented browser baseline emitted by
   lightningcss.
1. Three implementations must not become three behaviors — parity tests enforce it.
1. **[rev / CONSIDER] RTL via logical properties** — migrate physical
   `margin-left`/`padding-left` to `margin-inline`/`padding-inline`.
1. **[rev / CONSIDER] Print styles** — low priority, cheap.

______________________________________________________________________

## 6. Sequencing

WS-0 first (unblocks the rest). Then `fastblocks-ui` (WS-1..WS-5) and `fastblocks-htmy`
(section 3) proceed in parallel.

**[rev] Release cut point.** Cut the `fastblocks-ui` release that unblocks
`fastblocks-htmy` **after WS-1 (stable, single-source bundle) AND the WS-2 fixes that
change emitted markup (`progress`, `pagination`)** — not at the WS-0/WS-1 boundary.
Cutting earlier hands htmy the already-diverged bundle and soon-to-change markup. If
adapter plumbing must start sooner, scope an early pre-release as
adapter-wiring-only with assets pinned to the post-WS-1/WS-2 release.
