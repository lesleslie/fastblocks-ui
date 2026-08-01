# Spec B Component Modernization Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Move `fastblocks-ui`'s existing components onto platform primitives — popover + anchor positioning, `command`/`commandfor`, `:user-invalid`, `color-mix()`-derived tokens — deleting the JavaScript that previously coordinated them.

**Architecture:** CSS-first. Every change either deletes JavaScript or adds a CSS rule that makes JavaScript unnecessary. The only JS added is a ten-line `[data-ui-dialog-autoshow]` hook that restores server-owned dialog state across htmx swaps. Class names are renamed under one stated rule in this one breaking release.

**Tech Stack:** Plain CSS in `@layer` blocks, ES modules, Python 3.13 render helpers, pytest, vitest, Playwright (chromium/firefox/webkit), axe-core, `web-features` Baseline data.

**Source spec:** `docs/superpowers/specs/2026-07-28-spec-b-component-modernization-design.md`
**Cross-repo findings:** `docs/spec-c-investigation.md`

## Global Constraints

Every task's requirements implicitly include this section.

- **HARD GATE — SATISFIED 2026-07-31.** Spec A merged to `main` at `50503b2`; Spec B tooling merged at `b90b0d5`. Tasks 2–12 are unblocked. The files Spec A owned (`components.css`, `layout.css`, `fastblocks-ui.css`, `enhance.js`, `helpers.py`, `__init__.py`, `manifest.json`, `build_demo.py`, `demo/*.html`, `tests/`) are now shared; re-read them before editing, since Spec A changed all of them substantially.
- **Never edit a version field.** Not `pyproject.toml` `version`, not `package.json` `version`. Les bumps and publishes manually through crackerjack. Report readiness instead.
- **`fastblocks_ui/static/css/fastblocks-ui.css` is GENERATED.** After every CSS module edit run `python tools/build_css.py`. `tests/test_fastblocks_ui.py` fails if the committed bundle is stale.
- **`static/js/enhance.js` and `static/css/fastblocks-ui.css` must keep their exact paths.** `fastblocks-htmy`'s `asset_urls()` and `inline_js()` hardcode them. Empty the file of retired handlers; never rename or delete it.
- **Element-naming rule:** BEM `__` separates a component from its elements; a single hyphen appears only inside a standalone component's own name.
- **Baseline floor: Newly available**, enforced by `scripts/check-baseline.mjs`. Anything below the floor needs an `@supports` guard or an allowlist entry with `reason`, `degradation`, and `reviewBy`.
- **Accessibility is a hard contract.** Any change to focus, naming, or contrast needs an assertion, not an assumption.
- **Verification commands** (all must pass before any commit):
  - `uv run pytest tests/ -q`
  - `npm run validate`
  - `npx playwright test` (Tasks 7–11 only)

## Corrections already verified — do not "fix" these again

Three roadmap items are already implemented in the current source. Confirm, do not reimplement:

| Roadmap item | Reality |
|---|---|
| 1.3 `:has()` on `ui-field` | Shipped at `components.css:208`, keyed on `aria-invalid` (server-set, by design) |
| 1.6 `accent-color` | Shipped at `components.css:281` on `.ui-checkbox input, .ui-switch input` |
| 1.2 focus trap "now native" | False. `enhance.js:846` already delegates modal dialogs to the browser; the hand-rolled trap covers only the non-modal path |

---

### Task 1: Wire the Baseline gate into the pytest suite  ✅ DONE (`737911f`)

Closes the one B0 item that Spec A's ownership of `tests/` blocked. The repo's established pattern for a non-Python gate is a pytest test that shells out — `tests/test_fastblocks_ui.py:341` already does this for `tools/build_css.py --check`.

**Files:**
- Modify: `tests/test_fastblocks_ui.py` (add a class beside `TestManifestParamsSync`)

**Interfaces:**
- Consumes: `scripts/check-baseline.mjs` (exit 0 = pass, 1 = violation), `.baseline-allowlist.json`
- Produces: nothing later tasks import

- [x] **Step 1: Unbreak the gate that Spec A's merge turns red**

**Do this before anything else in this task.** Spec A's `.ui-drawer` uses
`overscroll-behavior: contain` unguarded, at two sites. Verified against the
branch at `7bb85e4` (48 commits ahead of main):

```
css.properties.overscroll-behavior is not Baseline and is used unguarded
at components.css:549, layout.css:255
```

So `npm run validate` is red from the moment Spec A lands, and Step 2's new
`TestBaselineFloor` would fail on arrival. This entry could not be pre-staged on
the Spec B branch — the checker rejects an exemption for a feature no CSS module
uses yet, which is the no-speculative-exemptions rule working as intended.

Add to `.baseline-allowlist.json`'s `allow` array:

```json
    {
      "key": "css.properties.overscroll-behavior",
      "reason": "Not a data gap and not fixable with @supports. Every engine shipped this partial_implementation -- it has no effect on scroll containers without scrollable overflow. Chrome fixed that in 144 and Firefox in 150; Safari has not (webkit.org/b/243452). Safari still PARSES the property, so @supports (overscroll-behavior: contain) evaluates true there and a guard would protect nothing while appearing to.",
      "degradation": "On Safari, an open .ui-drawer whose content is too short to scroll chains its scroll to the page behind it. Cosmetic; the drawer still traps focus, light-dismisses, and returns focus.",
      "reviewBy": "2027-01-31"
    }
```

Run: `npm run check:baseline`
Expected: `check-baseline: OK`

- [x] **Step 2: Write the failing test**

Add to `tests/test_fastblocks_ui.py`:

```python
class TestBaselineFloor(unittest.TestCase):
    """The shipped CSS must not use a sub-Baseline feature unguarded.

    Mirrors TestCssBundleFreshness: crackerjack runs pytest, so shelling out
    to the Node gate here is what puts it in the quality gate.
    """

    def test_css_meets_the_declared_baseline_floor(self) -> None:
        repo_root = Path(__file__).resolve().parents[1]
        if not (repo_root / "node_modules" / "web-features").exists():
            self.skipTest("node_modules/web-features absent; run `npm install`")
        result = subprocess.run(
            [shutil.which("node") or "node", str(repo_root / "scripts" / "check-baseline.mjs")],
            capture_output=True,
            text=True,
            cwd=repo_root,
        )
        self.assertEqual(result.returncode, 0, result.stdout + result.stderr)
```

Confirm `shutil`, `subprocess`, `Path`, and `unittest` are already imported at the top of the file; add `import shutil` if absent.

- [x] **Step 3: Run it and confirm it passes against current CSS**

Run: `uv run pytest tests/test_fastblocks_ui.py::TestBaselineFloor -q --no-cov`
Expected: `1 passed`

- [x] **Step 4: Prove the gate actually fails when it should**

Temporarily append to `fastblocks_ui/static/css/utilities.css` inside the `@layer utilities` block:

```css
  .ui-probe {
    text-wrap: pretty;
  }
```

`text-wrap: pretty` rather than `overscroll-behavior: contain` — Step 1 just
allowlisted the latter, so it would no longer trip. This probe is also the
better test: `text-wrap` itself is Baseline Newly while `text-wrap.pretty` is
its own non-Baseline feature, so a pass here proves the value-sub-key
discriminator works, not just the property check.

Run: `uv run pytest tests/test_fastblocks_ui.py::TestBaselineFloor -q --no-cov`
Expected: FAIL, message contains
`css.properties.text-wrap.pretty is not Baseline (feature: text-wrap-pretty)`

- [x] **Step 5: Revert the probe**

Run: `git checkout fastblocks_ui/static/css/utilities.css`
Then re-run Step 3 and confirm `1 passed`.

- [x] **Step 6: Add the version-parity guard**

Three files carry the project version and crackerjack bumps only one of them.
Between 0.7.0 and 0.7.1 both `package.json` and `uv.lock` were left behind with
nothing to catch it. `fastblocks_ui.__version__` reads from dist metadata and
cannot drift, so these three files are the whole surface.

Add to `tests/test_fastblocks_ui.py`:

```python
class TestVersionParity(unittest.TestCase):
    """crackerjack bumps pyproject.toml only; nothing else checks the rest."""

    def _expected(self) -> tuple[Path, str]:
        repo_root = Path(__file__).resolve().parents[1]
        pyproject = tomllib.loads(
            (repo_root / "pyproject.toml").read_text(encoding="utf-8")
        )
        return repo_root, pyproject["project"]["version"]

    def test_package_json_version_matches_pyproject(self) -> None:
        repo_root, expected = self._expected()
        package_json = json.loads(
            (repo_root / "package.json").read_text(encoding="utf-8")
        )
        self.assertEqual(
            package_json["version"],
            expected,
            "package.json has drifted from pyproject.toml; crackerjack does not "
            "manage it, so it must be bumped by hand.",
        )

    def test_uv_lock_version_matches_pyproject(self) -> None:
        repo_root, expected = self._expected()
        lock = tomllib.loads((repo_root / "uv.lock").read_text(encoding="utf-8"))
        entry = next(
            package
            for package in lock["package"]
            if package["name"] == "fastblocks-ui"
        )
        self.assertEqual(
            entry["version"],
            expected,
            "uv.lock has drifted from pyproject.toml; run `uv lock`.",
        )
```

Add `import json` and `import tomllib` at the top of the file if absent.

- [x] **Step 7: Run both new tests**

Run: `uv run pytest tests/test_fastblocks_ui.py::TestBaselineFloor tests/test_fastblocks_ui.py::TestVersionParity -q --no-cov`
Expected: `2 passed`

- [x] **Step 8: Commit**

```bash
git add tests/test_fastblocks_ui.py
git commit -m "test(ci): gate the Baseline floor and version parity from pytest

Puts scripts/check-baseline.mjs in the crackerjack quality gate, matching how
tools/build_css.py --check is wired; skips cleanly when node_modules is absent.

Also asserts package.json and pyproject.toml agree. crackerjack bumps only
pyproject.toml, which is how the two drifted apart between 0.7.0 and 0.7.1."
```

---

### Task 2: B1 — client-side field validation states  ✅ DONE (`5a78075`)

> **Executed with two deviations, both test-side.** The spec's `page.setContent()`
> approach cannot resolve a root-relative stylesheet href (the page stays on
> `about:blank`), so it uses a served fixture at
> `tests/e2e/fixtures/field-validation.html` instead — matching Task 10's pattern.
> And `:user-invalid` needs a value change, not focus/blur, to set the
> user-interacted flag; the test types and deletes a character.

Adds `:user-invalid` feedback *beneath* the existing server-authoritative `aria-invalid` rules. Source order matters: `aria-invalid` must win on equal specificity, so the new rules go **before** the existing block at `components.css:208`.

**Files:**
- Modify: `fastblocks_ui/static/css/components.css` (insert before line 208)
- Modify: `fastblocks_ui/static/css/fastblocks-ui.css` (regenerated, never hand-edited)
- Test: `tests/e2e/field-validation.spec.js` (create)

**Interfaces:**
- Consumes: `--ui-color-danger`, `--ui-space-3` from `tokens.css`
- Produces: `.ui-field:has(:user-invalid)` styling contract relied on by Task 12's docs

- [x] **Step 1: Write the failing e2e test**

Create `tests/e2e/field-validation.spec.js`:

```javascript
import { expect, test } from '@playwright/test';

test.describe('Field validation states', () => {
  test('an untouched required field is not styled invalid at load', async ({ page }) => {
    await page.setContent(`
      <link rel="stylesheet" href="/fastblocks_ui/static/css/fastblocks-ui.css">
      <div class="ui-field" id="f">
        <input class="ui-input" required>
      </div>
    `);
    const border = await page.locator('#f').evaluate(
      (el) => getComputedStyle(el).borderInlineStartWidth,
    );
    expect(border).toBe('0px');
  });

  test('a field styles invalid only after the user interacts and blurs', async ({ page }) => {
    await page.setContent(`
      <link rel="stylesheet" href="/fastblocks_ui/static/css/fastblocks-ui.css">
      <div class="ui-field" id="f">
        <input class="ui-input" required>
      </div>
      <button id="elsewhere">elsewhere</button>
    `);
    await page.locator('#f input').click();
    await page.locator('#elsewhere').click();
    const border = await page.locator('#f').evaluate(
      (el) => getComputedStyle(el).borderInlineStartWidth,
    );
    expect(border).toBe('3px');
  });
});
```

- [x] **Step 2: Run it to confirm it fails**

Run: `npx playwright test tests/e2e/field-validation.spec.js --project=chromium`
Expected: second test FAILS — `expected "3px", received "0px"`

- [x] **Step 3: Add the CSS**

Insert into `fastblocks_ui/static/css/components.css` immediately **before** the existing `.ui-field:has(.ui-input[aria-invalid="true"])` rule:

```css
  /* Client-side constraint validation, layered UNDER the aria-invalid rules
     below. `:user-invalid` only matches after the user has interacted, so an
     untouched required field does not render as already-failing the way plain
     `:invalid` would. The server-set `aria-invalid` rules that follow are
     authoritative and win on source order at equal specificity. */
  .ui-field:has(:user-invalid) {
    padding-inline-start: var(--ui-space-3);
    border-inline-start: 3px solid var(--ui-color-danger);
  }

  .ui-field:has(:user-invalid) .ui-field__label {
    color: var(--ui-color-danger-strong);
  }

  .ui-field:has(:disabled) {
    opacity: 0.6;
  }

```

- [x] **Step 4: Rebuild the bundle**

Run: `python tools/build_css.py`
Expected: `wrote fastblocks_ui/static/css/fastblocks-ui.css`

- [x] **Step 5: Run the tests**

Run: `npx playwright test tests/e2e/field-validation.spec.js`
Expected: 6 passed (2 tests × 3 engines)

Run: `uv run pytest tests/ -q && npm run validate`
Expected: both pass

- [x] **Step 6: Commit**

```bash
git add fastblocks_ui/static/css/components.css fastblocks_ui/static/css/fastblocks-ui.css tests/e2e/field-validation.spec.js
git commit -m "feat(field): add :user-invalid client-side validation styling

Layered under the existing server-set aria-invalid rules, which stay
authoritative. :user-invalid only matches after interaction, so untouched
required fields no longer need to avoid :invalid."
```

---

### Task 3: B1 — native control theming  ✅ DONE (`2bf8244`)

> **Scope reduced during execution.** The planned `accent-color` on
> `.ui-progress` was dropped: the component is already themed in `layout.css`
> via `::-webkit-progress-value` / `::-moz-progress-bar` with an explicit
> background per variant, which override `accent-color`. The declaration would
> have been dead, and is less capable besides — one colour against five
> variants. Roadmap item 1.6 needs no further work.

Two one-line platform wins. `field-sizing` reached Baseline Newly on 2026-06-16, so it needs no guard — a change from the roadmap's assumption that Safari and Firefox were unverified.

`accent-color` is already applied to `.ui-checkbox input, .ui-switch input` at `components.css:281`; this extends it to `<progress>`, which is the remaining native control the token can theme.

**Files:**
- Modify: `fastblocks_ui/static/css/components.css`
- Modify: `fastblocks_ui/static/css/fastblocks-ui.css` (regenerated)
- Test: `tests/e2e/field-validation.spec.js` (extend)

**Interfaces:**
- Consumes: `--ui-color-primary`
- Produces: nothing later tasks import

- [x] **Step 1: Write the failing test**

Append to `tests/e2e/field-validation.spec.js`:

```javascript
test('textarea grows with content instead of scrolling', async ({ page }) => {
  await page.setContent(`
    <link rel="stylesheet" href="/fastblocks_ui/static/css/fastblocks-ui.css">
    <textarea class="ui-textarea" id="t"></textarea>
  `);
  const before = await page.locator('#t').evaluate((el) => el.clientHeight);
  await page.locator('#t').fill('one\ntwo\nthree\nfour\nfive\nsix');
  const after = await page.locator('#t').evaluate((el) => el.clientHeight);
  expect(after).toBeGreaterThan(before);
});
```

- [x] **Step 2: Run it to confirm it fails**

Run: `npx playwright test tests/e2e/field-validation.spec.js --project=chromium -g "textarea grows"`
Expected: FAIL — heights equal

- [x] **Step 3: Add the CSS**

In `components.css`, add to the `.ui-textarea` rule set (find `.ui-input,\n  .ui-select,\n  .ui-textarea {`) a dedicated rule after it:

```css
  .ui-textarea {
    /* Baseline Newly since 2026-06-16. Degrades to a fixed-height textarea. */
    field-sizing: content;
    min-block-size: 4rem;
  }
```

And extend the accent-color rule — change:

```css
  .ui-checkbox input,
  .ui-switch input {
```

to:

```css
  .ui-checkbox input,
  .ui-switch input,
  .ui-progress {
```

Then verify `.ui-progress`'s own rule does not conflict on `inline-size`/`block-size`; if it does, split `.ui-progress` into its own single-declaration rule:

```css
  .ui-progress {
    accent-color: var(--ui-color-primary);
  }
```

- [x] **Step 4: Rebuild and verify the Baseline gate still passes**

Run: `python tools/build_css.py && npm run check:baseline`
Expected: `check-baseline: OK` — `field-sizing` is Baseline Newly, so no allowlist entry is needed

- [x] **Step 5: Run the tests**

Run: `npx playwright test tests/e2e/field-validation.spec.js --project=chromium`
Expected: all pass

Run: `uv run pytest tests/ -q && npm run validate`

- [x] **Step 6: Commit**

```bash
git add fastblocks_ui/static/css/components.css fastblocks_ui/static/css/fastblocks-ui.css tests/e2e/field-validation.spec.js
git commit -m "feat(form): auto-growing textareas and accent-coloured progress

field-sizing: content reached Baseline Newly 2026-06-16, so no guard is needed.
accent-color already themed checkbox/switch; extends it to <progress>."
```

---

### Task 4: B1 — retire deprecated `clip` from `.ui-visually-hidden`  DONE (`3d4a1d7`)

Surfaced by the Baseline gate. `clip` is universally supported but deprecated, and Spec A's `.ui-burger__label` uses `clip-path`, so the library ships two visually-hidden implementations — one of them deprecated. This retires the deprecated one.

**Files:**
- Modify: `fastblocks_ui/static/css/utilities.css:34-44`
- Read only: `fastblocks_ui/static/css/components.css` (`.ui-burger__label` — verify, no edit)
- Modify: `.baseline-allowlist.json` (remove two entries)
- Modify: `fastblocks_ui/static/css/fastblocks-ui.css` (regenerated)

**Interfaces:**
- Consumes: nothing
- Produces: `.ui-visually-hidden` as the single visually-hidden implementation

- [x] **Step 1: Replace the utility**

In `fastblocks_ui/static/css/utilities.css`, replace the whole `.ui-visually-hidden` rule with:

```css
  .ui-visually-hidden {
    position: absolute;
    inline-size: 1px;
    block-size: 1px;
    padding: 0;
    margin: -1px;
    overflow: hidden;
    /* `clip: rect(...)` is deprecated; `clip-path` is the supported form and is
       what .ui-burger__label already used. One implementation, not two. */
    clip-path: inset(50%);
    white-space: nowrap;
    border: 0;
  }
```

- [x] **Step 2: Verify `.ui-burger__label` — no edit expected**

Spec A landed this rule already, and it is **already correct**. Confirm it reads:

```css
  .ui-burger__label {
    position: absolute;
    inline-size: 1px;
    block-size: 1px;
    overflow: hidden;
    clip-path: inset(50%);
    white-space: nowrap;
  }
```

If it matches, make no change and move on. An earlier draft of this plan asked
you to "replace" it with byte-identical text, which was a no-op written before
Spec A had authored the rule.

Leave it as its own rule rather than swapping in a `.ui-visually-hidden` class:
`.ui-burger__label` needs `position: absolute` scoped to the burger, and keeping
the declarations local means the accessible name survives even if a consumer
overrides the burger markup. Step 1 is what removes the duplication that
mattered — the deprecated `clip` form.

- [x] **Step 3: Remove the now-dead allowlist entries**

Delete the `css.properties.clip` and `css.types.shape.rect` objects from `.baseline-allowlist.json`'s `allow` array, leaving only `css.properties.accent-color`.

- [x] **Step 4: Rebuild and verify the gate proves the entries were dead**

Run: `python tools/build_css.py && npm run check:baseline`
Expected: `check-baseline: OK`. If it reports `exempts css.properties.clip, but no CSS module uses it`, an entry was left behind — remove it.

- [x] **Step 5: Run the tests**

Run: `uv run pytest tests/ -q && npm run validate && npx playwright test tests/e2e/accessibility.spec.js`
Expected: all pass

- [x] **Step 6: Commit**

```bash
git add fastblocks_ui/static/css/utilities.css fastblocks_ui/static/css/components.css fastblocks_ui/static/css/fastblocks-ui.css .baseline-allowlist.json
git commit -m "refactor(a11y): one visually-hidden implementation, on clip-path

The Baseline gate flagged .ui-visually-hidden's deprecated clip/rect(). Spec A's
.ui-burger__label already used clip-path, so the two are now consistent and the
allowlist entries that covered the deprecation are removed."
```

---

### Task 5: B2 — rename `ui-menu` to `ui-dropdown`  DONE (`7683f43`)

> **Scope was wider than listed.** Also covered: the `<ui-menu>` custom element
> and its four events, JS selector constants, `data-ui-menu*` hooks, the demo
> section id + sidebar anchor, `scripts/generate-docs.py`, and five docs —
> including `docs/light-dom-custom-elements-spec.md`, which is asserted by
> `TestDocumentationConsistency`. `tests/e2e/smoke.spec.js` also needed updating;
> the plan's file list omitted `tests/e2e/`.
>
> **Re-inlining `demo/demo.html` is hazardous.** It embeds `manifest.js`, whose
> source contains the literal string `<script type="application/json"
> id="fastblocks-ui-manifest-data">`. Any regex anchored on that markup matches
> inside the inlined script first. Anchor on previously-committed file content
> instead, and note the real element is the FIRST of three occurrences.

Spec A named `ui-nav-list` rather than `ui-menu-list` purely to avoid implying kinship with this component. Renaming dissolves that tension. This task is the rename only; the popover migration is Task 7.

**Files:**
- Modify: `fastblocks_ui/static/css/components.css` (`.ui-menu`, `.ui-menu__item`, `.ui-menu[hidden]`)
- Modify: `fastblocks_ui/helpers.py` (`menu()` → `dropdown()`)
- Modify: `fastblocks_ui/__init__.py` (export)
- Modify: `fastblocks_ui/manifest.json` (`name`, `class_name`, `helper`)
- Modify: `scripts/build_demo.py`, `demo/demo.html`, `demo/index.html`
- Modify: `tests/test_fastblocks_ui.py`, `tests/test_demo_parity.py`

**Interfaces:**
- Consumes: nothing
- Produces: `dropdown(items, *, label="Menu", custom_element=False, class_=None, **attrs) -> SafeHTML`; CSS classes `.ui-dropdown`, `.ui-dropdown__item`; manifest entry `{"name": "dropdown", "class_name": "ui-dropdown", "helper": "dropdown"}`

- [x] **Step 1: Update the failing tests first**

In `tests/test_fastblocks_ui.py`, rename every `menu` reference to `dropdown` and every `ui-menu` string to `ui-dropdown`. Same in `tests/test_demo_parity.py`.

Run: `uv run pytest tests/ -q --no-cov`
Expected: FAIL — `ImportError: cannot import name 'dropdown'`

- [x] **Step 2: Rename in `helpers.py`**

Rename `def menu(` to `def dropdown(`, change `_flatten_classes("ui-menu", class_)` to `_flatten_classes("ui-dropdown", class_)`, and replace the docstring's `position: relative` warning — Task 7 deletes that contract, but until then the warning is still true, so keep it and change only the class names it mentions.

- [x] **Step 3: Rename in `__init__.py`**

Change `menu` to `dropdown` in the import list and in `__all__`.

- [x] **Step 4: Rename in `manifest.json`**

Change the component entry's `"name": "menu"` → `"dropdown"`, `"class_name": "ui-menu"` → `"ui-dropdown"`, `"helper": "menu"` → `"dropdown"`. Keep `"codegen": false`.

- [x] **Step 5: Rename in CSS**

In `components.css`, replace `.ui-menu` → `.ui-dropdown`, `.ui-menu__item` → `.ui-dropdown__item`, `.ui-menu[hidden]` → `.ui-dropdown[hidden]`. Also rename `.ui-navbar-menu` → `.ui-navbar__menu` (Task 6 does the rest of the navbar; doing this one here keeps the two "menu" names from colliding mid-plan).

- [x] **Step 6: Rename in the demo builder and both demo pages**

In `scripts/build_demo.py`, replace `ui-menu` → `ui-dropdown` and any `menu(` helper call → `dropdown(`.

Run: `python scripts/build_demo.py`

Then hand-edit `demo/demo.html` to match. Every fragment marked "real helper output" must be regenerated by calling the real helper — never hand-typed:

```bash
uv run python -c "import fastblocks_ui; print(fastblocks_ui.dropdown([('One','#1'),('Two','#2')], label='Menu'))"
```

- [x] **Step 7: Rebuild and run everything**

Run: `python tools/build_css.py && uv run pytest tests/ -q && npm run validate`
Expected: all pass

- [x] **Step 8: Commit**

```bash
git add -A
git commit -m "refactor(api)!: rename ui-menu to ui-dropdown

BREAKING CHANGE: the .ui-menu/.ui-menu__item classes, the menu() helper, and
the manifest 'menu' component are renamed to dropdown. Spec A named ui-nav-list
rather than ui-menu-list solely to avoid implying kinship with this component;
the rename removes the ambiguity at its source."
```

---

### Task 6: B2 — apply the element-naming rule to Bulma-derived components  DONE (`88a9f07`)

> **Substring hazard the plan did not flag.** `--ui-shell-aside-width` contains
> the `ui-shell-aside` class token. The rename must use a negative lookbehind on
> `-` or it corrupts the custom property. Same shape applies to any future
> rename touching `--ui-navbar-height` or `--ui-shell-max`.
>
> **Demo re-inline order matters:** swap the inlined CSS bundle FIRST (while
> demo.html still holds the committed copy the content anchor matches), then
> rename the hand-written markup. Reversed, the anchor no longer matches.

The surface splits by origin: freshly authored components use `__`, components ported from Bulma's vocabulary use `-`. Spec A commits to `__` in prose and then ships `ui-burger__bar` alongside `ui-shell-main`, so the split is replicating.

**Files:**
- Modify: `fastblocks_ui/static/css/layout.css`, `fastblocks_ui/static/css/components.css`
- Modify: `fastblocks_ui/helpers.py` (any helper emitting these classes)
- Modify: `fastblocks_ui/manifest.json` (`class_name` values only — no `name` changes)
- Modify: `scripts/build_demo.py`, `demo/demo.html`, `demo/index.html`
- Modify: `tests/test_fastblocks_ui.py`, `tests/test_demo_parity.py`

**Interfaces:**
- Consumes: nothing
- Produces: the renamed classes below; no Python signature changes

- [x] **Step 1: Apply this exact rename table**

| Old | New |
|---|---|
| `ui-hero-head` / `ui-hero-body` / `ui-hero-foot` | `ui-hero__head` / `ui-hero__body` / `ui-hero__foot` |
| `ui-level-left` / `ui-level-right` / `ui-level-item` / `ui-level-content` | `ui-level__left` / `ui-level__right` / `ui-level__item` / `ui-level__content` |
| `ui-media-left` / `ui-media-right` / `ui-media-content` | `ui-media__left` / `ui-media__right` / `ui-media__content` |
| `ui-navbar-brand` / `ui-navbar-start` / `ui-navbar-end` / `ui-navbar-item` | `ui-navbar__brand` / `ui-navbar__start` / `ui-navbar__end` / `ui-navbar__item` |
| `ui-table-container` | `ui-table__container` |
| `ui-shell-main` / `ui-shell-aside` (Spec A) | `ui-shell__main` / `ui-shell__aside` |

**Explicitly NOT renamed:** `ui-columns`/`ui-column` and `ui-tiles`/`ui-tile` are sibling components, not elements — the plural is a container in its own right. All `is-*` modifiers. All utilities.

- [x] **Step 2: Update tests first**

Apply the table to `tests/test_fastblocks_ui.py` and `tests/test_demo_parity.py`.

Run: `uv run pytest tests/ -q --no-cov`
Expected: FAIL with assertion errors naming the old classes

- [x] **Step 3: Apply to CSS, helpers, and manifest**

Run this to find every site, then edit each one:

```bash
grep -rn 'ui-hero-\|ui-level-\|ui-media-\|ui-navbar-\|ui-table-container\|ui-shell-' \
  fastblocks_ui/static/css/components.css fastblocks_ui/static/css/layout.css \
  fastblocks_ui/helpers.py fastblocks_ui/manifest.json scripts/build_demo.py
```

In `manifest.json`, change only `class_name` values. Component `name` values stay, so `fastblocks-htmy`'s set-equality assertion is unaffected by this task.

- [x] **Step 4: Regenerate everything**

```bash
python tools/build_css.py
python scripts/build_demo.py
uv run python scripts/sync_manifest_params.py
```

Then update `demo/demo.html` by hand to match, regenerating each "real helper output" fragment by calling the helper.

- [x] **Step 5: Verify no old names survive**

Run:
```bash
grep -rn 'ui-hero-\|ui-level-\|ui-media-\|ui-navbar-\|ui-table-container\|ui-shell-' \
  fastblocks_ui/ demo/ scripts/ tests/ --include='*.css' --include='*.py' --include='*.html' --include='*.json'
```
Expected: no output

- [x] **Step 6: Run everything**

Run: `uv run pytest tests/ -q && npm run validate && npx playwright test`
Expected: all pass

- [x] **Step 7: Commit**

```bash
git add -A
git commit -m "refactor(css)!: apply one element-naming rule across all components

BREAKING CHANGE: hero, level, media, navbar, table and shell element classes
move from single-hyphen to BEM __ separators, matching card, tabs, field and
dialog. The split was archaeological -- Bulma-derived components kept Bulma's
convention -- and Spec A had begun replicating it."
```

---

### Task 7: B2 — `ui-dropdown` onto Popover API and anchor positioning  DONE (`4dca767`)

> **Three corrections for Tasks 8-9, which use the same primitives:**
> 1. Never set `display` on a `[popover]` in the author layer — it defeats the
>    UA's `:not(:popover-open) { display: none }`. Cascade layers do not order
>    author styles against the UA sheet.
> 2. `aria-expanded` on a `popovertarget` invoker is implicit ARIA and is never a
>    DOM attribute in any engine. Style open state from the panel's
>    `:popover-open`. Task 9's plan text assumed otherwise.
> 3. WebKit does not focus a button on click (macOS convention). Drive
>    focus-restoration assertions from the keyboard.
>
> Use `tools/refresh_demo_assets.py` for demo re-inlining from here on.

Deletes the `position: relative` ancestor contract that `components.css:437-448` and `menu()`'s docstring both document rather than fix.

**Files:**
- Modify: `fastblocks_ui/static/css/components.css` (`.ui-dropdown`)
- Modify: `fastblocks_ui/helpers.py` (`dropdown()` — emit `popover`, drop the docstring warning)
- Modify: `scripts/build_demo.py`, `demo/demo.html`, `demo/index.html`
- Test: `tests/e2e/dropdown.spec.js` (create)

**Interfaces:**
- Consumes: `dropdown()` from Task 5
- Produces: `dropdown(items, *, id, label="Menu", class_=None, **attrs)` — **`id` becomes required**, because `popovertarget` needs a stable target. This is the htmx stable-ID constraint surfacing in the API, exactly as Spec A's `drawer()` did.

- [x] **Step 1: Write the failing e2e test**

Create `tests/e2e/dropdown.spec.js`:

```javascript
import { expect, test } from '@playwright/test';

test.describe('Dropdown', () => {
  const markup = `
    <link rel="stylesheet" href="/fastblocks_ui/static/css/fastblocks-ui.css">
    <div style="margin-top:40vh">
      <button class="ui-button" id="trigger" popovertarget="d">Open</button>
      <nav class="ui-dropdown" id="d" popover aria-label="Menu">
        <a class="ui-dropdown__item" href="#a">One</a>
      </nav>
    </div>`;

  test('opens from its invoker with no author JavaScript', async ({ page }) => {
    await page.setContent(markup);
    await expect(page.locator('#d')).toBeHidden();
    await page.locator('#trigger').click();
    await expect(page.locator('#d')).toBeVisible();
  });

  test('the browser maintains aria-expanded on the invoker', async ({ page }) => {
    await page.setContent(markup);
    await expect(page.locator('#trigger')).toHaveAttribute('aria-expanded', 'false');
    await page.locator('#trigger').click();
    await expect(page.locator('#trigger')).toHaveAttribute('aria-expanded', 'true');
  });

  test('light-dismisses and returns focus to the invoker', async ({ page }) => {
    await page.setContent(markup);
    await page.locator('#trigger').click();
    await page.keyboard.press('Escape');
    await expect(page.locator('#d')).toBeHidden();
    await expect(page.locator('#trigger')).toBeFocused();
  });

  test('needs no positioned ancestor to sit under its invoker', async ({ page }) => {
    await page.setContent(markup);
    await page.locator('#trigger').click();
    const trigger = await page.locator('#trigger').boundingBox();
    const panel = await page.locator('#d').boundingBox();
    expect(panel.y).toBeGreaterThanOrEqual(trigger.y);
    expect(Math.abs(panel.x - trigger.x)).toBeLessThan(200);
  });
});
```

- [x] **Step 2: Run it to confirm it fails**

Run: `npx playwright test tests/e2e/dropdown.spec.js --project=chromium`
Expected: FAIL — the current `.ui-dropdown` uses `[hidden]`, not `popover`

- [x] **Step 3: Replace the CSS**

In `components.css`, replace the entire `.ui-dropdown` rule (including the 12-line positioning comment and `.ui-dropdown[hidden]`) with:

```css
  .ui-dropdown {
    display: grid;
    gap: var(--ui-space-1);
    min-inline-size: 12rem;
    padding: var(--ui-space-2);
    border: var(--ui-border-width) solid var(--ui-color-border);
    border-radius: var(--ui-radius-md);
    background: var(--ui-color-surface);
    box-shadow: var(--ui-shadow-2);
    /* Top layer, so no z-index guess and no positioned-ancestor contract.
       `popovertarget` establishes an implicit anchor reference, so the panel
       needs no `anchor-name` of its own. */
    margin: 0;
    overflow: visible;
  }

  /* Anchor positioning is below the Baseline floor, and the guard is
     load-bearing: without it the panel must fall back to the browser's
     static-position placement, which is the pre-popover behaviour. */
  @supports (position-area: block-end) {
    .ui-dropdown {
      position: fixed;
      position-area: block-end span-inline-end;
      position-try-fallbacks: flip-block, flip-inline;
      margin-block-start: var(--ui-space-1);
    }
  }
```

- [x] **Step 4: Update the helper**

In `helpers.py`, change `dropdown()` to require `id` and emit `popover`:

```python
def dropdown(
    items: list[tuple[object, object]] | None = None,
    *,
    id: str,
    label: str = "Menu",
    class_: object = None,
    **attrs: object,
) -> SafeHTML:
    """Render a dropdown panel (`<nav class="ui-dropdown" popover>`).

    Opened by a `<button popovertarget="{id}">`. The browser supplies
    light-dismiss, Escape, top-layer placement, focus return, and
    `aria-expanded` on the invoker, so this component needs no JavaScript and
    no positioned ancestor.

    `id` is required because `popovertarget` needs a stable target -- the same
    htmx stable-ID constraint that `drawer()` carries.
    """
    classes = _flatten_classes("ui-dropdown", class_)
    if "aria_label" not in attrs and "aria-label" not in attrs:
        attrs["aria_label"] = label
    attr_html = _render_attrs(class_=classes, id=id, popover=True, **attrs)
```

Keep the rest of the body (item rendering) unchanged. Delete the `custom_element` parameter only if `grep -rn 'custom_element' fastblocks_ui/ demo/ tests/` shows no dropdown-specific use; otherwise leave it.

- [x] **Step 5: Update the manifest params and the demo**

```bash
uv run python scripts/sync_manifest_params.py
python scripts/build_demo.py
python tools/build_css.py
```

Update `demo/demo.html`'s dropdown section to the popover markup, regenerating the helper output fragment:

```bash
uv run python -c "import fastblocks_ui; print(fastblocks_ui.dropdown([('One','#1')], id='demo-dropdown'))"
```

- [x] **Step 6: Run everything, all three engines**

Run: `npx playwright test tests/e2e/dropdown.spec.js`
Expected: 12 passed (4 tests × 3 engines). **If `aria-expanded` fails in any engine, stop** — the CSS in Task 9 depends on it and a polyfill would be needed.

Run: `uv run pytest tests/ -q && npm run validate && npx playwright test`

- [x] **Step 7: Commit**

```bash
git add -A
git commit -m "feat(dropdown)!: move onto Popover API and anchor positioning

BREAKING CHANGE: dropdown() now requires an `id` and renders `popover`; the
trigger uses `popovertarget`. Deletes the position:relative ancestor contract,
the [hidden] toggling, and the z-index:20 guess. Anchor positioning sits below
the Baseline floor so it is @supports-guarded; the fallback is the browser's
static-position placement."
```

---

### Task 8: B2 — `ui-dialog` onto `command`/`commandfor`, dropping non-modal  DONE (`1d383bc`)

> **The modal focus-trap guarantee is narrower than it looks.** Engines route
> Tab through `<body>` or the dialog element itself while cycling, so
> `dialog.contains(activeElement)` is NOT invariant. Assert the real property:
> focus never reaches background interactive controls.
>
> **`tests/test_demo_parity.py` hand-mirrors `build_demo.py`.** Change one
> without the other and the parity test validates `demo.html` against a stale
> expectation — passing while the two demo pages diverge. Update the mirror
> FIRST and confirm it fails before touching `demo.html`.

Non-modal `<dialog open>` support is dropped, which is what genuinely retires `trapTabFocus` — not the platform, which never covered the non-modal path.

**Files:**
- Modify: `fastblocks_ui/helpers.py` (`dialog()`)
- Modify: `fastblocks_ui/static/css/components.css` (`.ui-dialog`)
- Modify: `scripts/build_demo.py`, `demo/demo.html`, `demo/index.html`
- Test: `tests/e2e/dialog.spec.js` (create)
- Delete: `tests/e2e/dialog-focus-trap.spec.js`

**Interfaces:**
- Consumes: nothing from earlier tasks
- Produces: `dialog(content, *, id, title=None, autoshow=False, class_=None, **attrs) -> SafeHTML`. The `open` parameter is **removed**; `autoshow` replaces it and renders `data-ui-dialog-autoshow`, consumed by Task 9's `enhanceDialogAutoshow`.

- [x] **Step 1: Write the failing e2e test**

Create `tests/e2e/dialog.spec.js`:

```javascript
import { expect, test } from '@playwright/test';

const markup = `
  <link rel="stylesheet" href="/fastblocks_ui/static/css/fastblocks-ui.css">
  <button class="ui-button" id="open" command="show-modal" commandfor="dlg">Open</button>
  <dialog class="ui-dialog" id="dlg">
    <div class="ui-dialog__surface">
      <button class="ui-button" id="close" command="close" commandfor="dlg">Close</button>
      <a id="link" href="#x">link</a>
    </div>
  </dialog>`;

test.describe('Dialog', () => {
  test('opens modally from command/commandfor with no author JavaScript', async ({ page }) => {
    await page.setContent(markup);
    await page.locator('#open').click();
    await expect(page.locator('#dlg')).toBeVisible();
    const modal = await page.locator('#dlg').evaluate((el) => el.matches(':modal'));
    expect(modal).toBe(true);
  });

  test('closes via command=close and restores focus to the invoker', async ({ page }) => {
    await page.setContent(markup);
    await page.locator('#open').click();
    await page.locator('#close').click();
    await expect(page.locator('#dlg')).toBeHidden();
    await expect(page.locator('#open')).toBeFocused();
  });

  test('the browser traps Tab inside the modal', async ({ page }) => {
    await page.setContent(markup);
    await page.locator('#open').click();
    await page.locator('#link').focus();
    await page.keyboard.press('Tab');
    const inside = await page.evaluate(
      () => document.getElementById('dlg').contains(document.activeElement),
    );
    expect(inside).toBe(true);
  });
});
```

- [x] **Step 2: Run it to confirm it fails**

Run: `npx playwright test tests/e2e/dialog.spec.js --project=chromium`
Expected: FAIL — nothing wires `command`/`commandfor` yet

- [x] **Step 3: Update `dialog()`**

In `helpers.py`, replace the `open: bool = False` parameter with `autoshow: bool = False`, require `id`, and render `data-ui-dialog-autoshow` instead of `open`:

```python
def dialog(
    content: object,
    *,
    id: str,
    title: object | None = None,
    autoshow: bool = False,
    class_: object = None,
    **attrs: object,
) -> SafeHTML:
    """Render a modal `<dialog class="ui-dialog">`.

    Opened by `<button command="show-modal" commandfor="{id}">` and closed by
    `command="close"`. The browser supplies focus trapping, Escape, the
    backdrop, and inert background content.

    Every dialog is modal. Non-modal `<dialog open>` is no longer supported:
    the platform does not trap focus in a non-modal dialog by design, so
    supporting it meant hand-rolling a trap. `autoshow=True` renders
    `data-ui-dialog-autoshow`, which enhance.js promotes to `showModal()` on
    load and after an htmx swap -- that is how a server expresses "this dialog
    is open" now.
    """
    classes = _flatten_classes("ui-dialog", class_)
    attr_html = _render_attrs(
        class_=classes,
        id=id,
        data_ui_dialog_autoshow=autoshow or None,
        **attrs,
    )
```

Keep the existing `title_id` / `aria_labelledby` logic exactly as it is — it is the dialog's accessible name and must not regress.

- [x] **Step 4: Delete the obsolete e2e spec**

Run: `git rm tests/e2e/dialog-focus-trap.spec.js`

- [x] **Step 5: Regenerate and update the demo**

```bash
uv run python scripts/sync_manifest_params.py
python scripts/build_demo.py
python tools/build_css.py
```

Update `demo/demo.html`'s dialog section to `command`/`commandfor` markup, regenerating the helper fragment:

```bash
uv run python -c "import fastblocks_ui; print(fastblocks_ui.dialog('Body', id='demo-dialog', title='Title'))"
```

- [x] **Step 6: Run everything**

Run: `npx playwright test tests/e2e/dialog.spec.js`
Expected: 9 passed (3 tests × 3 engines)

Run: `uv run pytest tests/ -q && npm run validate`

- [x] **Step 7: Commit**

```bash
git add -A
git commit -m "feat(dialog)!: move to command/commandfor, drop non-modal support

BREAKING CHANGE: dialog() requires an `id`; the `open` parameter is replaced by
`autoshow`. All dialogs are now modal, opened by command=\"show-modal\".

Non-modal <dialog open> is dropped deliberately. The platform does not trap
focus in a non-modal dialog -- by design, since a non-modal dialog is specified
to let focus leave -- so supporting it required a hand-rolled trap. Removing the
feature is what retires the trap; the roadmap's claim that engines now cover it
natively was wrong. dialog-focus-trap.spec.js is deleted with it."
```

---

### Task 9: B2 — delete the retired JS exports, add the autoshow hook  DONE (`adecb5e`)

> **The plan was not executable as written.** It said to leave the custom
> elements alone while deleting the helpers; they were the last consumers of
> those helpers, and were already dead code after Tasks 7-8. Resolved by
> deleting `<ui-dialog>` and `<ui-dropdown>` (user decision) and keeping
> `<ui-tabs>`. Export surface is FOUR, not three -- the plan predated Spec A
> adding `enhanceDrawers`.
>
> **Removing a named parameter from a helper with `**attrs` fails silently** --
> the retired keyword renders as an HTML attribute. Guard explicitly.

Public exports drop from five to three. A named import of a removed ES export is a module-instantiation error, so this is a hard break by design.

**Files:**
- Modify: `fastblocks_ui/static/js/enhance.js`
- Modify: `fastblocks_ui/static/js/fastblocks-ui.js`
- Test: `tests/js/fastblocks-ui.test.js`

**Interfaces:**
- Consumes: `data-ui-dialog-autoshow` from Task 8
- Produces: public exports `defineFastBlocksCustomElements`, `enhanceTabs`, `initFastBlocksUI` only

- [x] **Step 1: Write the failing vitest tests**

Add to `tests/js/fastblocks-ui.test.js`:

```javascript
describe('dialog autoshow', () => {
  it('opens a dialog marked data-ui-dialog-autoshow', async () => {
    document.body.innerHTML = '<dialog id="d" data-ui-dialog-autoshow></dialog>';
    const dialog = document.getElementById('d');
    dialog.showModal = vi.fn(function () { this.setAttribute('open', ''); });
    const { initFastBlocksUI } = await import('../../fastblocks_ui/static/js/enhance.js');
    initFastBlocksUI(document);
    expect(dialog.showModal).toHaveBeenCalledTimes(1);
  });

  it('is a no-op for an already-open dialog', async () => {
    document.body.innerHTML = '<dialog id="d" open data-ui-dialog-autoshow></dialog>';
    const dialog = document.getElementById('d');
    dialog.showModal = vi.fn();
    const { initFastBlocksUI } = await import('../../fastblocks_ui/static/js/enhance.js');
    initFastBlocksUI(document);
    expect(dialog.showModal).not.toHaveBeenCalled();
  });

  it('does not throw when no autoshow dialog is present', async () => {
    document.body.innerHTML = '<div></div>';
    const { initFastBlocksUI } = await import('../../fastblocks_ui/static/js/enhance.js');
    expect(() => initFastBlocksUI(document)).not.toThrow();
  });
});

describe('public export surface', () => {
  it('exports exactly three names', async () => {
    const mod = await import('../../fastblocks_ui/static/js/fastblocks-ui.js');
    expect(Object.keys(mod).sort()).toEqual([
      'defineFastBlocksCustomElements',
      'enhanceTabs',
      'initFastBlocksUI',
    ]);
  });
});
```

- [x] **Step 2: Run to confirm failure**

Run: `npx vitest run tests/js/fastblocks-ui.test.js`
Expected: FAIL — five exports found, and `showModal` never called

- [x] **Step 3: Delete the retired code from `enhance.js`**

Delete these, and any helper that becomes unreferenced after them: `enhanceDialogs`, `enhanceMenus`, `openMenu`, `closeMenu`, `openDialogShared`, `closeDialogShared`, `attachDialogCloseListener`, `onNativeDialogClose`, `isDialogModal`, `trapTabFocus`, `focusableWithin`, `dialogState`, and the constants `DIALOG_TRIGGER_SELECTOR`, `DIALOG_CLOSE_SELECTOR`, `MENU_TRIGGER_SELECTOR`, `MENU_ITEM_SELECTOR`, `FOCUSABLE_SELECTOR`.

Verify nothing else references them:

```bash
grep -n 'trapTabFocus\|focusableWithin\|dialogState\|MENU_TRIGGER\|DIALOG_TRIGGER\|enhanceMenus\|enhanceDialogs' fastblocks_ui/static/js/enhance.js
```
Expected: no output

Leave the custom-element (`ui-dialog`, `ui-menu` host) definitions alone unless they reference deleted helpers; if they do, reduce them to markup-sync only.

- [x] **Step 4: Add the autoshow hook (not exported)**

Add to `enhance.js`:

```javascript
// The only JavaScript Spec B adds. Non-modal <dialog open> is gone, so this is
// how a server expresses "this dialog is open" -- including after an htmx swap
// replaces the markup. Behaviour-only: with no JS the dialog renders closed.
function enhanceDialogAutoshow(root = document) {
  const show = () => {
    root.querySelectorAll('dialog[data-ui-dialog-autoshow]').forEach((dialog) => {
      if (!dialog.open && typeof dialog.showModal === 'function') {
        dialog.showModal();
      }
    });
  };
  show();
  document.addEventListener('htmx:afterSwap', show);
  return () => document.removeEventListener('htmx:afterSwap', show);
}
```

And change `initFastBlocksUI`:

```javascript
export function initFastBlocksUI(root = document) {
  defineFastBlocksCustomElements(globalThis);
  const cleanups = [enhanceTabs(root), enhanceDialogAutoshow(root)].filter(Boolean);

  return () => {
    cleanups.forEach((cleanup) => cleanup());
  };
}
```

- [x] **Step 5: Shrink the public entrypoint**

Replace the export block in `fastblocks_ui/static/js/fastblocks-ui.js`:

```javascript
export {
  defineFastBlocksCustomElements,
  enhanceTabs,
  initFastBlocksUI,
} from './enhance.js';
```

- [x] **Step 6: Run everything**

Run: `npx vitest run && npm run validate && uv run pytest tests/ -q && npx playwright test`
Expected: all pass

- [x] **Step 7: Commit**

```bash
git add -A
git commit -m "refactor(js)!: delete the retired enhancement handlers

BREAKING CHANGE: enhanceMenus and enhanceDialogs are removed. The public export
surface is now defineFastBlocksCustomElements, enhanceTabs, initFastBlocksUI.

A named import of a removed ES export is a module-instantiation error, so a
stale 'import { enhanceMenus }' takes down the whole enhancement layer rather
than degrading. That is the accepted cost of the clean removal.

Adds enhanceDialogAutoshow (internal, not exported) so a server can still
render an open dialog via data-ui-dialog-autoshow, including across htmx swaps."
```

---

### Task 10: B3 — the contrast harness, before any token derives

Built first, deliberately. It is the gate that decides Task 11's mix percentages, so it must exist and pass against the current hand-authored palette before anything derives.

**Files:**
- Create: `tests/e2e/fixtures/token-contrast.html`
- Create: `tests/e2e/token-contrast.spec.js`

**Interfaces:**
- Consumes: `fastblocks-ui.css` tokens
- Produces: a passing baseline that Task 11 must not regress

- [ ] **Step 1: Create the fixture**

Create `tests/e2e/fixtures/token-contrast.html`:

```html
<!doctype html>
<meta charset="utf-8">
<title>Token contrast probe</title>
<link rel="stylesheet" href="/fastblocks_ui/static/css/fastblocks-ui.css">
<div id="probe"></div>
```

- [ ] **Step 2: Write the spec with a fixed, checked-in sample grid**

Create `tests/e2e/token-contrast.spec.js`:

```javascript
import { expect, test } from '@playwright/test';

// A fixed grid, checked in rather than generated, so a failure is reproducible.
// 12 hues x 5 lightnesses x 3 chromas, plus the five shipped defaults.
const HUES = [0, 30, 60, 90, 120, 150, 180, 210, 240, 270, 300, 330];
const LIGHTNESS = [0.35, 0.45, 0.55, 0.65, 0.8];
const CHROMA = [0.05, 0.15, 0.25];

const SHIPPED = [
  'oklch(51.1% 0.262 276.966)',
  'oklch(52% 0.105 223.128)',
  'oklch(52.7% 0.154 150.069)',
  'oklch(79.5% 0.184 86.047)',
  'oklch(57.7% 0.245 27.325)',
];

const GRID = [
  ...SHIPPED,
  ...HUES.flatMap((h) => LIGHTNESS.flatMap((l) => CHROMA.map((c) => `oklch(${l} ${c} ${h})`))),
];

// WCAG 2.x relative luminance, computed on the sRGB projection -- which is what
// WCAG 2 is defined over, so this matches how the shipped ratios in tokens.css
// were measured.
const CONTRAST_FN = `
  (a, b) => {
    const lum = (css) => {
      const [r, g, bl] = css.match(/[\\d.]+/g).slice(0, 3).map(Number);
      const f = (v) => {
        v /= 255;
        return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
      };
      return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(bl);
    };
    const [x, y] = [lum(a), lum(b)];
    return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05);
  }`;

// Every pair the library actually renders, with its WCAG threshold.
const PAIRS = [
  { fg: '--ui-color-text', bg: '--ui-color-primary-subtle', min: 4.5 },
  { fg: '--ui-color-primary-contrast', bg: '--ui-color-primary', min: 4.5 },
  { fg: '--ui-color-primary-contrast', bg: '--ui-color-primary-strong', min: 4.5 },
  { fg: '--ui-color-border', bg: '--ui-color-surface', min: 3 },
];

test.describe('Derived token contrast', () => {
  for (const pair of PAIRS) {
    test(`${pair.fg} on ${pair.bg} holds ${pair.min}:1 across the brand-colour grid`, async ({ page }) => {
      await page.goto('/tests/e2e/fixtures/token-contrast.html');

      const failures = await page.evaluate(
        ([grid, pair, contrastSrc]) => {
          const contrast = eval(contrastSrc);
          const probe = document.getElementById('probe');
          const bad = [];
          for (const brand of grid) {
            document.documentElement.style.setProperty('--ui-color-primary', brand);
            const styles = getComputedStyle(probe);
            probe.style.color = `var(${pair.fg})`;
            probe.style.backgroundColor = `var(${pair.bg})`;
            const fg = getComputedStyle(probe).color;
            const bg = getComputedStyle(probe).backgroundColor;
            const ratio = contrast(fg, bg);
            if (ratio < pair.min) {
              bad.push({ brand, ratio: Number(ratio.toFixed(2)), fg, bg });
            }
            void styles;
          }
          document.documentElement.style.removeProperty('--ui-color-primary');
          return bad;
        },
        [GRID, pair, CONTRAST_FN],
      );

      expect(
        failures,
        `${failures.length}/${GRID.length} brand colours fail:\n` +
          failures.slice(0, 8).map((f) => `  ${f.brand} -> ${f.ratio}:1`).join('\n'),
      ).toEqual([]);
    });
  }
});
```

- [ ] **Step 3: Run it against the current hand-authored palette**

Run: `npx playwright test tests/e2e/token-contrast.spec.js --project=chromium`

Expected: the two `-contrast`-on-`primary` pairs **pass** for the shipped colours but **fail** for much of the grid — today's tokens are hand-authored constants that do not respond to `--ui-color-primary` at all, so the grid is measuring the default palette repeatedly.

**This is the correct starting state.** Record the failure count in the commit message; Task 11 is what makes the grid meaningful.

- [ ] **Step 4: Mark the not-yet-derived pairs as expected failures**

For any pair failing only because the token is not yet derived, add `test.fixme(...)` with a comment naming Task 11. Do not weaken the thresholds.

- [ ] **Step 5: Commit**

```bash
git add tests/e2e/fixtures/token-contrast.html tests/e2e/token-contrast.spec.js
git commit -m "test(tokens): real-engine contrast matrix over an OKLCH brand grid

185 sampled brand colours x 4 rendered token pairs, evaluated by the browser so
color-mix() and gamut mapping are the engine's, not a reimplementation.
Pairs awaiting Task 11's derivation are marked fixme, thresholds unchanged."
```

---

### Task 11: B3 — derive the token scales

**Files:**
- Modify: `fastblocks_ui/static/css/tokens.css`
- Modify: `fastblocks_ui/static/css/theme.css` (dark-mode overrides that become redundant)
- Modify: `fastblocks_ui/static/css/fastblocks-ui.css` (regenerated)
- Modify: `tests/e2e/token-contrast.spec.js` (remove the fixmes)

**Interfaces:**
- Consumes: the harness from Task 10
- Produces: `--ui-color-{primary,info,success,warning,danger}-{subtle,strong,contrast}` as derived values

- [ ] **Step 1: Remove one fixme and watch it fail**

Delete the `test.fixme` from the `--ui-color-primary-contrast on --ui-color-primary` test.

Run: `npx playwright test tests/e2e/token-contrast.spec.js --project=chromium -g "primary-contrast"`
Expected: FAIL, listing brand colours whose contrast falls below 4.5:1

- [ ] **Step 2: Derive the foreground**

In `tokens.css`, replace `--ui-color-primary-contrast: #ffffff;` with:

```css
    /* Black or white, chosen from the brand colour's own lightness. This is
       what color-contrast() would do, but that function has ZERO browser
       support (web-features: baseline false, empty support map), so relative
       colour syntax -- Baseline Newly since 2024-09-16 -- does it instead.
       The clamp collapses to 0 or 1 either side of the 0.62 lightness pivot. */
    --ui-color-primary-contrast: oklch(from var(--ui-color-primary) clamp(0, (0.62 - l) * 1000, 1) 0 0);
```

- [ ] **Step 3: Run and tune the pivot empirically**

Run: `npx playwright test tests/e2e/token-contrast.spec.js --project=chromium -g "primary-contrast"`

If failures remain, adjust `0.62` and re-run. **Do not lower the 4.5 threshold.** Record the final pivot and why in a comment.

- [ ] **Step 4: Derive the backgrounds, one at a time**

Remove the next fixme, then replace:

```css
    --ui-color-primary-subtle: color-mix(in oklab, var(--ui-color-primary) 12%, var(--ui-color-surface));
    --ui-color-primary-strong: color-mix(in oklab, var(--ui-color-primary) 80%, black);
```

Run the harness after each change and tune the percentages — 12% and 80% are the roadmap's placeholders, not measured values.

- [ ] **Step 5: Repeat for info, success, warning, danger**

Apply the same three derivations to each. `warning` is the risk case: its shipped `-contrast` is `#000000`, so confirm the pivot picks black for a light yellow.

- [ ] **Step 6: Preserve the provenance comments**

`tokens.css`'s existing comment block records the Tailwind v4 shade each value maps to and the measured contrast pairs. Keep it, retargeted to describe the **default inputs** rather than the derived outputs. Do not delete it.

- [ ] **Step 7: Rebuild and run the full matrix in all three engines**

Run: `python tools/build_css.py && npx playwright test tests/e2e/token-contrast.spec.js`
Expected: all pairs pass, all engines, no fixmes remaining

Run: `uv run pytest tests/ -q && npm run validate && npx playwright test`

- [ ] **Step 8: Commit**

```bash
git add -A
git commit -m "feat(tokens): derive colour scales from one brand colour per role

Fifteen hand-authored values across five semantic roles collapse to five inputs.
Backgrounds derive with color-mix(in oklab); foregrounds derive with relative
colour syntax rather than color-mix, because a mixed foreground has no contrast
guarantee and color-contrast() has zero browser support.

Every mix percentage and the lightness pivot were tuned against the real-engine
contrast matrix, not chosen by eye. The Tailwind provenance comments are kept
and retargeted to the default inputs."
```

---

### Task 12: Release readiness

**Files:**
- Modify: `CHANGELOG.md`
- Modify: `docs/usage.md`, `docs/components.md`, `README.md`, `PACKAGE_README.md`
- Modify: `docs/modernization-roadmap.md` (mark items done, fold in the corrections)

**Interfaces:**
- Consumes: everything above
- Produces: a release-ready tree; **no version fields touched**

- [ ] **Step 1: Write the CHANGELOG entry**

Under a new `## Unreleased` heading, document every breaking change with a migration line each: the `ui-menu` → `ui-dropdown` rename, the element-naming renames (with the full table from Task 6), the removed `enhanceMenus`/`enhanceDialogs` exports, `dialog()`'s `open` → `autoshow`, the required `id` on `dialog()` and `dropdown()`, and the dropped non-modal dialog support.

- [ ] **Step 2: Update the docs**

Run this to find every stale reference, and fix each:

```bash
grep -rn 'ui-menu\|enhanceMenus\|enhanceDialogs\|data-ui-menu-target\|data-ui-dialog-target\|data-ui-dialog-trigger\|ui-hero-body\|ui-level-item\|ui-navbar-brand' \
  README.md PACKAGE_README.md docs/*.md
```

- [ ] **Step 3: Update the roadmap**

In `docs/modernization-roadmap.md`, mark items 1.1–1.6 and 2.1 done, and replace the support figures for `accent-color`, `anchor-positioning`, `overscroll-behavior`, `field-sizing`, `container-style-queries` and `relative-color` with the verified values from the spec's C4 table.

- [ ] **Step 4: Full verification**

```bash
python tools/build_css.py --check
uv run python scripts/sync_manifest_params.py --check
uv run pytest tests/ -q
npm run validate
npx playwright test
npx playwright test --config=playwright.audit.config.js
```
Expected: every command exits 0

- [ ] **Step 5: Confirm no version field moved**

Run: `git diff main --stat -- pyproject.toml package.json`
Expected: no `version` line in the diff

- [ ] **Step 6: Commit and report**

```bash
git add -A
git commit -m "docs: record the Spec B breaking changes and verified support data"
```

Then report to Les, do not act:

> Spec B is complete and all gates pass. Ready for a **0.8.0** bump via crackerjack.
> Release order is fixed: `fastblocks-ui` 0.8.0 first, then `fastblocks-htmy`
> (bump the pin *and* `_UI_MIN`/`_UI_MAX`, re-run `scripts/generate_components.py`,
> add wrappers for Spec A's five components, rename `Menu` → `Dropdown`), then
> `fastblocks` (optional extra to `>=0.8,<0.9`).
> Note: `package.json` is at 0.7.0 while `pyproject.toml` is at 0.7.1 — worth
> confirming the bump covers both.

---

## Self-review

**Spec coverage:** B0 → Task 1 (deferred pytest wiring). B1 → Tasks 2, 3, 4. B2 → Tasks 5, 6, 7, 8, 9. B3 → Tasks 10, 11. Rename audit → Tasks 5, 6. Cross-repo obligations → Task 12's report (the sibling repos themselves are Spec C's own plan). Corrections C1–C4 → the "do not fix again" table plus Task 12 Step 3.

**Known gaps, stated rather than hidden:**
- The spec lists `ui-navbar__menu` as "decide during B2 whether it is redundant once `ui-dropdown` exists." Task 5 Step 5 renames it; the redundancy call is left to the implementer with the context in front of them.
- Task 3's `.ui-progress` accent-color extension goes slightly beyond roadmap item 1.6, which is already implemented. It is one declaration and completes the item's stated intent.
- Task 10's harness measures the sRGB projection of OKLCH colours, matching how `tokens.css`'s existing ratios were measured and how WCAG 2 is defined. WCAG 2's known gap on wide-gamut colour is inherited, not introduced.
