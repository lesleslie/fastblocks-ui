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

---

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

---

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
  `[tool.setuptools.package-data]` (`pyproject.toml:68`): `fastblocks_ui =
  ["py.typed", "manifest.json", "static/**/*"]`.
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

- [ ] Declare the module CSS files the source of truth.
- [ ] **[rev] Build with `lightningcss`** (dev-only; vendored Rust binary, preserves
  zero runtime deps) via `tools/build-css.py` — NOT hand-rolled `cat`. This gives
  `@layer` correctness, minification, autoprefixing, `color-mix()`/nesting
  transpilation, and a documented browser baseline in one pass.
- [ ] **[rev] Emit an explicit `@layer tokens, theme, base, utilities, components;`
  statement first.** The shipped bundle currently has NO layer-order declaration;
  precedence relies on first-appearance order, so naive concatenation silently
  reorders the cascade.
- [ ] **[rev] Fix the downstream drift the bundle creates.** `copy-assets`
  (`cli.py:21`) `copytree`s the whole `css/` dir, shipping modules + orphaned
  `themes/` alongside the bundle. Change `copy-assets` to emit **only the built
  bundle + manifest** (build into a `dist/`-style output the CLI ships exclusively).
  Add a test asserting `copy-assets` output contains no module CSS.
- [ ] CI gate: `build-css && git diff --exit-code` fails on drift.
- [ ] **[rev] Delete the entire orphaned `themes/` dir** (default.css AND dark.css),
  not just dark.css.
- [ ] **[rev] Keep the `[data-theme="dark"]` override model; do NOT migrate to
  `light-dark()`.** `light-dark()` keys off `color-scheme` (not the explicit
  `data-theme` toggle), only swaps colors (not spacing/radius tokens), and would need
  ~40 per-token calls. The correct fix is to *generate* the existing two-block model
  (override `--ui-*` under `[data-theme="dark"]` + set `color-scheme`) from one
  source.
- [ ] **[rev] Add `@media (prefers-color-scheme: dark)`** for the no-JS / no-explicit-
  toggle default, gated so an explicit `[data-theme="light"]` still wins.
- [ ] Re-point CSS tests at the shipped bundle, not the module files.

### WS-2 — Helper hardening

- [ ] **[rev] `progress()` (`helpers.py:852,860,869`):** use floats throughout (both
  `int(value)` and `int(max_value)` truncate; `aria_valuenow` also lies); guard
  `max_value == 0`.
- [ ] **[rev] `progress()` CSP — the previously-proposed "CSS var on style attr" does
  NOT satisfy strict `style-src` (still inline).** Real fix: render the value with a
  native `<progress>` element styled via `::-webkit-progress-value` /
  `::-moz-progress-bar` (no inline width), with stepped utility classes
  (`.ui-progress--{0..100 by 5}`) for the custom bar. **Ship the missing `ui-progress`
  CSS** — it has no rule in `components.css` today; the bar is currently *only* the
  inline width.
- [ ] **[rev] Enforce CSP as a test:** assert no helper output contains `style=`.
- [ ] **[rev] `pagination()` (`helpers.py:945,947,951`):** (a) replace
  `url_pattern.format(page=...)` with `url_pattern.replace("{page}", str(page))` —
  `.format()` allows attribute/index injection (`{page.__class__}`) and crashes on any
  other `{...}`; (b) wrap the `label` in `page_link` with `_render_fragment` (it is
  emitted unescaped); (c) fix the `label: str | int = None` type lie.
- [ ] Add `Literal[...]` to `variant`/`size` params so call sites type-check (also
  the precondition for `py.typed` to be worth shipping — see WS-5 ruff `A001`).
- [ ] **[rev] `_inject_attrs` (`helpers.py:110`) is a known-UNSAFE regex HTML path**,
  not merely "single-root contract" — it breaks on `>` inside attribute values and
  feeds `field()`. Document it as known-unsafe and superseded by htmy; do not expand
  its use.

### WS-3 — Docs, a11y & test integrity

- [ ] Correct `docs/usage.md`: mark examples as generic Jinja (`{{ }}`) OR move the
  FastBlocks `[[ ]]` examples into `fastblocks-htmy` docs.
- [ ] **[rev] Extend (not "add") the existing axe suite**
  (`tests/e2e/accessibility.spec.js`). axe cannot catch the behaviors the custom
  elements implement — add named Playwright acceptance tests for:
  - **Dialog focus trap** on the `setAttribute('open')` fallback path
    (`enhance.js:283`) — `showModal()` traps natively, the fallback does not.
  - **Menu arrow-key navigation + focus management** — `UiMenuElement.onKeyDown`
    (`enhance.js:486`) only handles Escape; `role="menu"` requires arrow keys.
  - **Focus restoration** after dialog/menu close (ESC, backdrop, roving tabindex).
- [ ] **[rev] Add `prefers-reduced-motion` global block** to `base.css` (currently
  zero hits while the bundle animates — WCAG 2.3.3 miss for a "hard contract").
- [ ] **[rev] Add `@media (forced-colors: active)`** outline fallback (box-shadow
  focus rings vanish in forced-colors mode).
- [ ] Replace brittle substring HTML assertions with parsed-DOM checks where it
  matters; keep manifest-coverage tests. Retire the `"Microsoft's " + "FAST"`
  string-splitting doc tests (`tests/test_fastblocks_ui.py:252`).

### WS-4 — Manifest as contract

- [ ] **[rev] Extend the manifest schema** beyond `name/class_name/helper/description`
  to include per-component props and allowed variants/sizes (leverage existing
  `scripts/generate-*.py`).
- [ ] CI check: manifest components == exported helpers == documented components ==
  CSS classes present in the bundle.
- [ ] **[rev] Document the limitation:** a Python-side manifest catches existence and
  (now) declared-variant drift, but NOT signature/return-type parity between string
  helpers and htmy — that is covered by the §1.2 parity tests, not the manifest.

### WS-5 — Dependency & supply-chain hygiene  **[rev — new workstream]**

- [ ] Reconcile contradictory crackerjack pins: `crackerjack>=0.1.0`
  (`pyproject.toml:35`, extras) vs `>=0.50.1` (`pyproject.toml:184`,
  `[dependency-groups]`).
- [ ] Restore/resolve the deleted `.pip-audit-suppressions.txt` (in git status) and
  add a `pip-audit` (or `uv`-native audit) CI gate.
- [ ] **Assert zero runtime dependencies in CI** — `creosote` is already a dev dep but
  unused as a gate; wire it in. Zero-deps is a security asset; protect it.
- [ ] Commit/refresh the lockfile policy (`uv.lock`) and document the floor strategy.

---

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

---

## 4. Other improvements

- Token export pipeline: one source → CSS + a Python/JS token module so htmy and the
  JS layer read the same values (breakpoints, etc.).
- **[rev] Asset versioning/cache-busting** helper (content-hash or `?v=` from package
  version) — `copy-assets` currently ships unhashed filenames.
- **[rev] Concrete CSS bundle-size budget** as a CI gate — e.g. **≤ 30 KB min+gzip**,
  not just "a budget."
- Keep Python floor decision documented as intent (§1.2) in the README.

---

## 5. Future considerations / guardrails

1. Manifest is law — new components land there first; all layers validated against it
   (existence + declared variants; parity covered separately).
2. Track htmx 2.x and htmy versions; keep htmx-pattern components in `fastblocks-htmy`,
   never in zero-dep `fastblocks-ui`.
3. CSP-clean by default: no inline styles or handlers; **enforced by test** (WS-2).
4. Accessibility as CI gates: axe **plus** named keyboard/focus acceptance tests for
   the JS layer; `prefers-reduced-motion`, `forced-colors`, `:focus-visible`.
5. SemVer coordination protocol across two wheels (§1.4) — written gate + downstream
   smoke CI, not just a pin.
6. Modern CSS (`light-dark()` deliberately NOT used for theming — see WS-1; `:has()`,
   container queries, `color-mix()`) behind a documented browser baseline emitted by
   lightningcss.
7. Three implementations must not become three behaviors — parity tests enforce it.
8. **[rev / CONSIDER] RTL via logical properties** — migrate physical
   `margin-left`/`padding-left` to `margin-inline`/`padding-inline`.
9. **[rev / CONSIDER] Print styles** — low priority, cheap.

---

## 6. Sequencing

WS-0 first (unblocks the rest). Then `fastblocks-ui` (WS-1..WS-5) and `fastblocks-htmy`
(section 3) proceed in parallel.

**[rev] Release cut point.** Cut the `fastblocks-ui` release that unblocks
`fastblocks-htmy` **after WS-1 (stable, single-source bundle) AND the WS-2 fixes that
change emitted markup (`progress`, `pagination`)** — not at the WS-0/WS-1 boundary.
Cutting earlier hands htmy the already-diverged bundle and soon-to-change markup. If
adapter plumbing must start sooner, scope an early pre-release as
adapter-wiring-only with assets pinned to the post-WS-1/WS-2 release.
