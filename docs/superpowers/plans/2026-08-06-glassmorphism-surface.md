# Opt-in glassmorphism surface treatment Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship an opt-in `.is-glass` modifier class and `data-surface="glass"` attribute that give card, dialog, drawer, navbar, and dropdown a translucent, blurred surface, without changing the default theme's look.

**Architecture:** Four new tokens in `tokens.css` (blur, saturate, tint, border) feed one shared CSS selector list in `components.css` that both `.is-glass` and `[data-surface="glass"]` reference — no duplicated recipe. Accessibility fallbacks (`forced-colors`, `prefers-reduced-transparency`, `@supports not`) collapse to the existing solid `--ui-color-surface-raised`. No Python helper signature changes; `.is-glass` is passed via the existing `class_=` parameter every helper already accepts.

**Tech Stack:** Python (helpers, pytest), CSS (`@layer components`/`tokens`, `color-mix()`, `backdrop-filter`), Playwright (e2e), Vitest (token existence), the repo's existing `tools/build_css.py` / `scripts/build_demo.py` build pipeline.

## Global Constraints

- Spec: `docs/superpowers/specs/2026-08-06-glassmorphism-surface-design.md` — read it before starting; this plan implements it task-by-task.
- `docs/new-package-spec.md`'s "avoid glassmorphism" line (line 240) is **not edited** by any task — it describes the default theme, which this feature does not change.
- No new browser floor: `@supports not (backdrop-filter: blur(1px))`, `forced-colors`, `prefers-reduced-transparency`, and `color-mix()` are all already at or below the project's declared Baseline floor (`"newly"`, `.baseline-allowlist.json`); `backdrop-filter` unprefixed is Baseline "widely available" (Safari 18+, 2024). No allowlist entry is expected — verified in Task 3.
- No JavaScript is added anywhere in this plan. This is a hard constraint from the spec's Non-goals, not a preference.
- No new Python helper parameters. `.is-glass` is applied via each helper's existing `class_=` argument, exactly like `is-sticky` and `is-primary` today.
- Every CSS change must be followed by `python tools/build_css.py` (rebuild the shipped bundle) before running any test that reads `fastblocks_ui/static/css/fastblocks-ui.css` — the source modules are not what ships or what tests read.
- Follow existing repo conventions exactly: 2-space indentation inside `@layer` blocks, `--ui-*` token namespace, modifier classes colocated with their component's CSS.

---

### Task 1: Glass design tokens

**Files:**
- Modify: `fastblocks_ui/static/css/tokens.css` (insert before the closing `  }\n}` at the end of the file, directly after the existing `--ui-focus-ring` declaration)
- Modify: `tests/e2e/contrast-utils.js` (add one new export)
- Create: `tests/e2e/glass-contrast.spec.js`
- Modify: `tests/js/css-variables.test.js` (add one `describe` block)

**Interfaces:**
- Produces: four custom properties on `:root` — `--ui-glass-blur`, `--ui-glass-saturate`, `--ui-glass-tint`, `--ui-glass-border`. Task 2 consumes all four by name.
- Produces: `compositeRatio(page, { fg, bg, backdrop, theme })` exported from `tests/e2e/contrast-utils.js`, matching the calling convention of the existing `tokenRatio(page, fgToken, bgToken, theme)` in the same file. Returns a `Promise<number>` (the WCAG contrast ratio of `fg` against `bg` alpha-composited over the flat `backdrop` RGB triple).

- [ ] **Step 1: Write the failing contrast-utils.js helper's consumer test**

Create `tests/e2e/glass-contrast.spec.js`:

```js
import { expect, test } from '@playwright/test';
import { compositeRatio, installProbe } from './contrast-utils.js';

const PAGE = '/tests/e2e/fixtures/token-contrast.html';

// A flat-colour backdrop makes `backdrop-filter: blur()` a no-op (blurring a
// uniform field yields the same uniform field) and `saturate()` a no-op on
// zero-chroma black/white, so alpha-compositing the tint over these two
// colours reproduces exactly what the browser paints. See contrast-utils.js
// for the compositing formula.
const BACKDROPS = {
  black: [0, 0, 0],
  white: [255, 255, 255],
};

test.describe('Glass tint contrast (WCAG AA, 4.5:1)', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(PAGE);
    await installProbe(page);
  });

  for (const theme of ['light', 'dark']) {
    for (const [name, backdrop] of Object.entries(BACKDROPS)) {
      test(`text on --ui-glass-tint clears 4.5:1 over a ${name} backdrop in ${theme} theme`, async ({
        page,
      }) => {
        const ratio = await compositeRatio(page, {
          fg: '--ui-color-text',
          bg: '--ui-glass-tint',
          backdrop,
          theme,
        });
        expect(ratio, `${theme}/${name} backdrop = ${ratio.toFixed(2)}:1`).toBeGreaterThanOrEqual(
          4.5,
        );
      });
    }
  }
});
```

- [ ] **Step 2: Run it, confirm it fails**

Run: `npx playwright test tests/e2e/glass-contrast.spec.js --project=chromium`
Expected: FAIL — `compositeRatio` is not exported from `contrast-utils.js` (import error / `TypeError: compositeRatio is not a function`).

- [ ] **Step 3: Add `compositeRatio` to `contrast-utils.js`**

Append to `tests/e2e/contrast-utils.js`, after the existing `edgeRatio` export:

```js
/**
 * Contrast ratio of `fg` against `bg` alpha-composited over a flat `backdrop`
 * colour — what `background-color` + `backdrop-filter` actually paints when
 * the real backdrop is a single flat colour (see glass-contrast.spec.js for
 * why that's a faithful test of `backdrop-filter: blur()`).
 */
export function compositeRatio(page, { fg, bg, backdrop, theme }) {
  return page.evaluate(
    ([fgToken, bgToken, backdropRgb, mode]) => {
      const c = window.__uiContrast;
      if (mode) {
        c.setTheme(mode);
      }
      const fgBytes = c.readToken(fgToken);
      const bgBytes = c.readToken(bgToken);
      const alpha = bgBytes[3] / 255;
      const composited = [0, 1, 2].map(
        (i) => bgBytes[i] * alpha + backdropRgb[i] * (1 - alpha),
      );
      return c.ratio(fgBytes, composited);
    },
    [fg, bg, backdrop, theme ?? null],
  );
}
```

- [ ] **Step 4: Run the spec again, confirm it still fails — this time on the token itself**

Run: `npx playwright test tests/e2e/glass-contrast.spec.js --project=chromium`
Expected: FAIL — `readToken` throws `custom property --ui-glass-tint is not defined`.

- [ ] **Step 5: Add the failing vitest token-existence check**

In `tests/js/css-variables.test.js`, add a new top-level `describe` block (anywhere after the existing `describe('Root Variables', ...)` block closes):

```js
describe('Glass Surface Tokens', () => {
  it('should define --ui-glass-blur', () => {
    expect(getCSSVariable('--ui-glass-blur')).toBeTruthy();
  });

  it('should define --ui-glass-saturate', () => {
    expect(getCSSVariable('--ui-glass-saturate')).toBeTruthy();
  });

  it('derives --ui-glass-tint from --ui-color-surface via color-mix', () => {
    const value = getCSSVariable('--ui-glass-tint');
    expect(value).toContain('color-mix');
    expect(value).toContain('--ui-color-surface');
  });

  it('derives --ui-glass-border from --ui-color-border via color-mix', () => {
    const value = getCSSVariable('--ui-glass-border');
    expect(value).toContain('color-mix');
    expect(value).toContain('--ui-color-border');
  });
});
```

- [ ] **Step 6: Run vitest, confirm it fails**

Run: `npx vitest run tests/js/css-variables.test.js`
Expected: FAIL — all four new assertions fail (`getCSSVariable` returns an empty string; `toBeTruthy()` fails, and `.toContain()` calls throw or fail on an empty string).

- [ ] **Step 7: Add the four tokens to `tokens.css`**

In `fastblocks_ui/static/css/tokens.css`, insert immediately after the existing `--ui-focus-ring: ...;` declaration (the last declaration in the file), still inside the `:root { ... }` block:

```css

    /* Glassmorphism surface treatment (opt-in only -- see .is-glass /
       data-surface="glass" in components.css). Four independent knobs, not a
       derived scale: unlike the color roles above, blur/saturate/tint/border
       have no principled relationship to derive from a single input.

       78% tint opacity is the accessibility-critical number: it keeps text
       contrast close to the fully-opaque-surface case regardless of what's
       actually behind the blur, rather than relying on
       prefers-reduced-transparency (thin browser support) as the only
       guard. Verified by tests/e2e/glass-contrast.spec.js in both themes,
       against a black and a white backdrop. */
    --ui-glass-blur: 12px;
    --ui-glass-saturate: 130%;
    --ui-glass-tint: color-mix(in oklab, var(--ui-color-surface) 78%, transparent);
    --ui-glass-border: color-mix(in oklab, var(--ui-color-border) 60%, transparent);
```

- [ ] **Step 8: Rebuild the shipped CSS bundle**

Run: `python tools/build_css.py`
Expected: exits 0, silently rewrites `fastblocks_ui/static/css/fastblocks-ui.css`.

- [ ] **Step 9: Run all three checks again, confirm they pass**

Run:
```bash
npx vitest run tests/js/css-variables.test.js
npx playwright test tests/e2e/glass-contrast.spec.js --project=chromium
```
Expected: PASS on all — 4 vitest assertions, 4 Playwright tests (2 themes × 2 backdrops).

- [ ] **Step 10: Commit**

```bash
git add fastblocks_ui/static/css/tokens.css fastblocks_ui/static/css/fastblocks-ui.css \
  tests/e2e/contrast-utils.js tests/e2e/glass-contrast.spec.js tests/js/css-variables.test.js
git commit -m "feat(tokens): add opt-in glassmorphism surface tokens"
```

---

### Task 2: `.is-glass` / `data-surface="glass"` activation

**Files:**
- Modify: `fastblocks_ui/static/css/components.css` (insert before the final closing `}` of `@layer components`, i.e. after the `.ui-burger__bar:nth-child(3)` rule at the end of the file)
- Create: `tests/e2e/fixtures/glass-surface.html`
- Create: `tests/e2e/glass-surface.spec.js`

**Interfaces:**
- Consumes: `--ui-glass-blur`, `--ui-glass-saturate`, `--ui-glass-tint`, `--ui-glass-border` from Task 1.
- Produces: the selector list `:is(.ui-card, .ui-dialog, .ui-drawer, .ui-navbar, .ui-dropdown).is-glass, [data-surface="glass"] :is(.ui-card, .ui-dialog, .ui-drawer, .ui-navbar, .ui-dropdown)` in `components.css`. Task 3 appends its `@supports`/`@media` fallback blocks directly after this rule, reusing the identical selector list. Task 3 also extends `tests/e2e/glass-surface.spec.js` with a `forced-colors` test.

- [ ] **Step 1: Write the failing fixture**

Create `tests/e2e/fixtures/glass-surface.html`:

```html
<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <title>Glass surface activation probe</title>
    <link rel="stylesheet" href="../../../fastblocks_ui/static/css/fastblocks-ui.css" />
  </head>
  <body>
    <div class="ui-card" id="card-plain">Plain card</div>
    <div class="ui-card is-glass" id="card-glass">Glass card</div>
    <button class="ui-button is-glass" id="button-glass" type="button">
      Glass button (ineligible component)
    </button>

    <div data-surface="glass" id="glass-scope">
      <div class="ui-card" id="card-scoped">Scoped card</div>
      <div class="ui-dialog" id="dialog-scoped">Scoped dialog</div>
      <div class="ui-drawer" id="drawer-scoped">Scoped drawer</div>
      <nav class="ui-navbar" id="navbar-scoped">Scoped navbar</nav>
      <div class="ui-dropdown" id="dropdown-scoped">Scoped dropdown</div>
    </div>
  </body>
</html>
```

- [ ] **Step 2: Write the failing spec**

Create `tests/e2e/glass-surface.spec.js`:

```js
import { expect, test } from '@playwright/test';

const PAGE = '/tests/e2e/fixtures/glass-surface.html';
const SCOPED_IDS = ['card-scoped', 'dialog-scoped', 'drawer-scoped', 'navbar-scoped', 'dropdown-scoped'];

test.describe('.is-glass / data-surface="glass" activation', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(PAGE);
  });

  test('.is-glass applies backdrop-filter to an eligible component', async ({ page }) => {
    const filter = await page
      .locator('#card-glass')
      .evaluate((el) => getComputedStyle(el).backdropFilter);
    expect(filter).not.toBe('none');
  });

  test('a plain .ui-card with neither trigger has no backdrop-filter', async ({ page }) => {
    const filter = await page
      .locator('#card-plain')
      .evaluate((el) => getComputedStyle(el).backdropFilter);
    expect(filter).toBe('none');
  });

  test('.is-glass on an ineligible component (button) has no effect', async ({ page }) => {
    const filter = await page
      .locator('#button-glass')
      .evaluate((el) => getComputedStyle(el).backdropFilter);
    expect(filter).toBe('none');
  });

  for (const id of SCOPED_IDS) {
    test(`data-surface="glass" applies to #${id} without .is-glass on the instance`, async ({
      page,
    }) => {
      const filter = await page
        .locator(`#${id}`)
        .evaluate((el) => getComputedStyle(el).backdropFilter);
      expect(filter).not.toBe('none');
    });
  }

  test('data-theme="dark" composes with data-surface="glass" (independent attributes)', async ({
    page,
  }) => {
    await page.evaluate(() => document.documentElement.setAttribute('data-theme', 'dark'));
    const filter = await page
      .locator('#card-scoped')
      .evaluate((el) => getComputedStyle(el).backdropFilter);
    expect(filter).not.toBe('none');
  });
});
```

- [ ] **Step 3: Run it, confirm it fails**

Run: `npx playwright test tests/e2e/glass-surface.spec.js --project=chromium`
Expected: FAIL — every "has backdrop-filter" assertion fails (7 of 9: the direct `.is-glass` card, the 5 scoped-component checks, plus the dark-theme composability check) because `backdropFilter` is `'none'` everywhere (no CSS rule exists yet). The two "no effect" tests pass vacuously.

- [ ] **Step 4: Add the shared selector rule to `components.css`**

In `fastblocks_ui/static/css/components.css`, insert immediately before the final `}` that closes `@layer components` (directly after the `:root:has(.ui-drawer:popover-open) .ui-burger .ui-burger__bar:nth-child(3) { ... }` rule):

```css

  /* Opt-in glassmorphism surface treatment. Colocated here rather than
     split between this file and layout.css -- .ui-navbar lives in
     layout.css, but a single shared selector list is what keeps .is-glass
     and data-surface="glass" from ever drifting into two different
     recipes. See docs/superpowers/specs/2026-08-06-glassmorphism-surface-design.md.
     Fallback blocks for @supports / forced-colors / prefers-reduced-transparency
     follow directly below, reusing this same selector list. */
  :is(.ui-card, .ui-dialog, .ui-drawer, .ui-navbar, .ui-dropdown).is-glass,
  [data-surface="glass"] :is(.ui-card, .ui-dialog, .ui-drawer, .ui-navbar, .ui-dropdown) {
    background-color: var(--ui-glass-tint);
    border-color: var(--ui-glass-border);
    -webkit-backdrop-filter: blur(var(--ui-glass-blur)) saturate(var(--ui-glass-saturate));
    backdrop-filter: blur(var(--ui-glass-blur)) saturate(var(--ui-glass-saturate));
  }
```

- [ ] **Step 5: Rebuild the bundle**

Run: `python tools/build_css.py`

- [ ] **Step 6: Run the spec again, confirm it passes**

Run: `npx playwright test tests/e2e/glass-surface.spec.js --project=chromium`
Expected: PASS — all 9 tests (3 individual + 5 scoped-component loop + 1 dark-theme composability).

- [ ] **Step 7: Commit**

```bash
git add fastblocks_ui/static/css/components.css fastblocks_ui/static/css/fastblocks-ui.css \
  tests/e2e/fixtures/glass-surface.html tests/e2e/glass-surface.spec.js
git commit -m "feat(components): activate .is-glass and data-surface=\"glass\""
```

---

### Task 3: Accessibility fallbacks (`forced-colors`, `prefers-reduced-transparency`, no-support)

**Files:**
- Modify: `fastblocks_ui/static/css/components.css` (append directly after the rule added in Task 2)
- Modify: `tests/e2e/glass-surface.spec.js` (add one test)
- Modify: `tests/test_fastblocks_ui.py:434-438` (extend `test_bundle_includes_accessibility_media_queries`)

**Interfaces:**
- Consumes: the selector list and rule block from Task 2 (reused verbatim in both fallback blocks below).
- Produces: nothing new consumed by later tasks — this task closes out the CSS implementation.

- [ ] **Step 1: Write the failing Playwright fallback test**

In `tests/e2e/glass-surface.spec.js`, add inside the existing `test.describe(...)` block, after the dark-theme composability test added in Task 2:

```js

  test('forced-colors disables blur and transparency on .is-glass', async ({ page }) => {
    await page.emulateMedia({ forcedColors: 'active' });
    const filter = await page
      .locator('#card-glass')
      .evaluate((el) => getComputedStyle(el).backdropFilter);
    expect(filter).toBe('none');
  });
```

- [ ] **Step 2: Write the failing pytest fallback-presence check**

In `tests/test_fastblocks_ui.py`, extend the existing `test_bundle_includes_accessibility_media_queries` method (in `TestDemoBuild`, currently at lines 434-438):

```python
    def test_bundle_includes_accessibility_media_queries(self):
        with open(fastblocks_ui.get_css_path(), encoding="utf-8") as handle:
            content = handle.read()
        self.assertIn("prefers-reduced-motion: reduce", content)
        self.assertIn("forced-colors: active", content)
        self.assertIn("prefers-reduced-transparency: reduce", content)
        self.assertIn("@supports not (backdrop-filter: blur(1px))", content)
```

- [ ] **Step 3: Run both, confirm they fail**

Run:
```bash
npx playwright test tests/e2e/glass-surface.spec.js --project=chromium
python -m pytest tests/test_fastblocks_ui.py::TestDemoBuild::test_bundle_includes_accessibility_media_queries -v
```
Expected: Playwright's new test FAILS (`filter` is not `'none'` — Task 2's rule has no forced-colors guard yet). pytest FAILS on the two new `assertIn` calls (strings absent from the bundle).

- [ ] **Step 4: Add the two fallback blocks to `components.css`**

Directly after the rule block added in Task 2 (still inside `@layer components`, same file):

```css

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

- [ ] **Step 5: Rebuild the bundle**

Run: `python tools/build_css.py`

- [ ] **Step 6: Run both checks again, confirm they pass**

Run:
```bash
npx playwright test tests/e2e/glass-surface.spec.js --project=chromium
python -m pytest tests/test_fastblocks_ui.py::TestDemoBuild::test_bundle_includes_accessibility_media_queries -v
```
Expected: PASS on both.

- [ ] **Step 7: Verify the Baseline floor and bundle-size gates still pass**

Run:
```bash
npm run check:baseline
python -m pytest tests/test_fastblocks_ui.py::TestBundleSizeBudget -v
```
Expected: both exit 0. `check:baseline` should report no new violation (every feature used — `backdrop-filter`, `@supports`, `forced-colors`, `prefers-reduced-transparency`, `color-mix()` — is at or above the project's `"newly"` floor; `color-mix()` is already used elsewhere in `tokens.css` with no exemption). If `check:baseline` unexpectedly fails, do not silence it — read `.baseline-allowlist.json`'s header comment for the exemption format and add an entry only if the failure is a genuine partial-implementation gap, not a real correctness issue.

- [ ] **Step 8: Commit**

```bash
git add fastblocks_ui/static/css/components.css fastblocks_ui/static/css/fastblocks-ui.css \
  tests/e2e/glass-surface.spec.js tests/test_fastblocks_ui.py
git commit -m "feat(components): add forced-colors / reduced-transparency fallback for .is-glass"
```

---

### Task 4: Demo example and parity test

**Files:**
- Modify: `scripts/build_demo.py` (new `.demo-glass-backdrop` rule in `DEMO_CSS`, new `glass_demo()` function, one new entry in `build_categories()`)
- Modify: `demo/index.html` (regenerated, not hand-edited)
- Modify: `demo/demo.html` (hand-added CSS rule, section, and sidebar link, kept in parity with `index.html`)
- Modify: `tests/test_demo_parity.py` (new `test_glass_card`)

**Interfaces:**
- Consumes: `.is-glass` (Task 2) and the existing `card()` helper (`fastblocks_ui/helpers.py:351`, unchanged signature).
- Produces: nothing consumed by later tasks.

- [ ] **Step 1: Write the failing parity test**

In `tests/test_demo_parity.py`, add a new test method next to the existing `test_card` (around line 458):

```python
    def test_glass_card(self) -> None:
        html = str(
            card(
                header="Glass card",
                body=_safe(
                    "<p>Add <code>is-glass</code> to card, dialog, drawer, "
                    "navbar, or dropdown for a translucent, blurred surface. "
                    'Set <code>data-surface="glass"</code> on an ancestor to '
                    "opt every eligible component in at once.</p>"
                ),
                class_="is-glass",
            )
        )
        self.assertFragmentInDemo(html)
```

The exact fragment this must find, verified directly against the real helper:

```html
<div class="ui-card is-glass"><header class="ui-card__header">Glass card</header><div class="ui-card__body"><p>Add <code>is-glass</code> to card, dialog, drawer, navbar, or dropdown for a translucent, blurred surface. Set <code>data-surface="glass"</code> on an ancestor to opt every eligible component in at once.</p></div></div>
```

- [ ] **Step 2: Run it, confirm it fails**

Run: `python -m pytest tests/test_demo_parity.py -k test_glass_card -v`
Expected: FAIL — `demo/demo.html has drifted from real helper output` (the fragment isn't in the file yet).

- [ ] **Step 3: Add a `.demo-glass-backdrop` rule to `DEMO_CSS`**

The glass effect needs something behind it to blur, and this codebase deliberately keeps demo pages inline-style-free for CSP reasons (see the comment on `palette_css()` at `scripts/build_demo.py:774-781`: "emitted as real CSS rules rather than `style="background:..."` so the page stays inline-style-free"). A dedicated class, not an inline `style=` attribute, is required here for the same reason.

In `scripts/build_demo.py`, in the `DEMO_CSS` string (starts at line 80), insert immediately after the existing `.demo-panel { ... }` rule (ends at line 150) and before `.demo-bordered`:

```css
.demo-glass-backdrop {
  background: linear-gradient(135deg, var(--ui-color-primary), var(--ui-color-info));
  padding: var(--ui-space-6);
  border-radius: var(--ui-radius-lg);
}
```

- [ ] **Step 4: Add `glass_demo()` to `scripts/build_demo.py`**

Add this function next to `card_demo()` (after it, around line 709):

```python
def glass_demo() -> SafeHTML:
    return _safe(
        '<div class="ui-cluster demo-panel demo-glass-backdrop">'
        + str(
            card(
                header="Glass card",
                body=_safe(
                    "<p>Add <code>is-glass</code> to card, dialog, drawer, "
                    "navbar, or dropdown for a translucent, blurred surface. "
                    'Set <code>data-surface="glass"</code> on an ancestor to '
                    "opt every eligible component in at once.</p>"
                ),
                class_="is-glass",
            )
        )
        + "</div>"
    )
```

- [ ] **Step 5: Register it in `build_categories()`**

In `scripts/build_demo.py`, in the `"extras"` / `"Patterns & extras"` category tuple, insert a new entry immediately after the `"theme"` entry and before `"forms-in-practice"`:

```python
                (
                    "glass",
                    "Glass surfaces",
                    "Opt-in translucent, blurred surface for card, dialog, "
                    "drawer, navbar, and dropdown. Add is-glass to one "
                    'instance, or data-surface="glass" to an ancestor to '
                    "apply it everywhere beneath. Disabled automatically "
                    "under forced-colors and prefers-reduced-transparency.",
                    glass_demo(),
                ),
```

- [ ] **Step 6: Regenerate `demo/index.html`**

Run: `python scripts/build_demo.py`

This writes the new `<section id="glass" class="demo-section" ...>...</section>` block into `demo/index.html`, directly after the `id="theme"` section, the matching sidebar `<li>` entry after the `theme` sidebar link, and the `.demo-glass-backdrop` rule (from Step 3) into `index.html`'s inlined `<style>` block.

- [ ] **Step 7: Hand-copy the generated section, sidebar link, and CSS rule into `demo/demo.html`**

`demo/demo.html`'s inlined `<style>` block is currently byte-identical to `DEMO_CSS` (verified: both contain the same `.demo-panel { ... }` rule immediately before `.demo-bordered`), so keep it that way — copy the new `.demo-glass-backdrop` rule from `index.html`'s `<style>` block into the same position in `demo/demo.html`'s `<style>` block, immediately after `.demo-panel`.

Open `demo/index.html`, find the `<section id="glass" ...>...</section>` block (immediately after `</section>` that closes `id="theme"`), and copy it verbatim into `demo/demo.html` at the same position — immediately after `demo/demo.html`'s own `id="theme"` section, before its `id="forms-in-practice"` section.

Do the same for the sidebar: copy the generated `<li class="ui-nav-list__item"><a class="ui-nav-list__link" href="#glass">Glass surfaces</a></li>` from `index.html`'s sidebar into `demo/demo.html`'s sidebar, immediately after the `href="#theme"` link.

- [ ] **Step 8: Run the parity test and the full parity suite, confirm they pass**

Run:
```bash
python -m pytest tests/test_demo_parity.py -v
python scripts/build_demo.py --check
```
Expected: all pass, including `test_every_manifest_component_has_a_demo_section` and `test_sidebar_links_to_every_section` (unaffected — `glass` is a non-manifest showcase entry, same pattern as the existing `palette` and `theme` entries), and the `--check` drift gate exits 0.

- [ ] **Step 9: Confirm the new demo content is axe-clean**

`tests/e2e/accessibility.spec.js` already sweeps both `/demo/demo.html` and `/demo/index.html` at 375/768/1024/1280px with a zero-violations tolerance (see the comment block above its per-width loop) — no new test code is needed, since the glass card added in Steps 6-7 is now inside that sweep automatically. This step only needs to be *run*, to catch a real defect (e.g. a contrast regression from the gradient backdrop behind the glass example) before it reaches Task 5's final sweep.

Run: `npx playwright test tests/e2e/accessibility.spec.js --project=accessibility`
Expected: PASS — 0 violations at every width, both pages.

- [ ] **Step 10: Commit**

```bash
git add scripts/build_demo.py demo/demo.html demo/index.html tests/test_demo_parity.py
git commit -m "feat(demo): add glass surfaces example"
```

---

### Task 5: Documentation and final verification

**Files:**
- Modify: `docs/components.md:20,30,36,37,40` (five inline notes)
- Modify: `docs/theming-recipes.md` (new section, after "Dark Theme")

**Interfaces:**
- Consumes: nothing new — documents what Tasks 1-4 shipped.
- Produces: nothing consumed by later tasks (last task in this plan).

- [ ] **Step 1: Add inline `.is-glass` notes in `docs/components.md`**

Five one-line edits to the Purpose column, appending a sentence to each existing cell (do not touch any other column):

Line 20 (Layout Components table, `navbar` row) — change:
```
| navbar | `ui-navbar` | `navbar()` | Navigation bar with brand and menu items. |
```
to:
```
| navbar | `ui-navbar` | `navbar()` | Navigation bar with brand and menu items. Add `is-glass` for a translucent, blurred surface. |
```

Line 30 (`card` row) — change:
```
| card | `ui-card` | `card()` | Content containers and panels. |
```
to:
```
| card | `ui-card` | `card()` | Content containers and panels. Add `is-glass` for a translucent, blurred surface. |
```

Line 36 (`dialog` row) — change:
```
| dialog | `ui-dialog` | `dialog()` | Native dialog styling and enhancement hooks. |
```
to:
```
| dialog | `ui-dialog` | `dialog()` | Native dialog styling and enhancement hooks. Add `is-glass` for a translucent, blurred surface. |
```

Line 37 (`drawer` row) — change:
```
| drawer | `ui-drawer` | `drawer()` | Off-canvas panel built on the Popover API. |
```
to:
```
| drawer | `ui-drawer` | `drawer()` | Off-canvas panel built on the Popover API. Add `is-glass` for a translucent, blurred surface. |
```

Line 40 (`dropdown` row) — change:
```
| dropdown | `ui-dropdown` | `dropdown()` | Disclosure and navigation dropdown styling. |
```
to:
```
| dropdown | `ui-dropdown` | `dropdown()` | Disclosure and navigation dropdown styling. Add `is-glass` for a translucent, blurred surface. |
```

(Line numbers are as of this plan's writing — confirm with `grep -n "^| card \|^| dialog \|^| drawer \|^| dropdown \|^| navbar " docs/components.md` before editing, in case earlier tasks' commits shifted them; they should not have, since no earlier task touches this file.)

- [ ] **Step 2: Add the "Glass Surfaces" recipe to `docs/theming-recipes.md`**

Insert a new section after the existing "## Dark Theme" section (which ends just before "## Accessible States"):

```markdown
## Glass Surfaces

Opt in to a translucent, blurred surface for card, dialog, drawer, navbar,
and dropdown — never on by default, so the base theme's crisp, opaque look
is unchanged unless you ask for this.

Per instance:

\```html
<div class="ui-card is-glass">...</div>
\```

Or for every eligible component under a container at once:

\```html
<body data-surface="glass">
  ...
</body>
\```

Composes with `data-theme`, since glass is a surface-material concern and
`data-theme` is a color-scheme concern:

\```html
<html data-theme="dark" data-surface="glass">
\```

Tune the effect with `--ui-glass-blur`, `--ui-glass-saturate`,
`--ui-glass-tint`, and `--ui-glass-border`. `backdrop-filter` and
transparency are automatically disabled under `forced-colors` (Windows High
Contrast) and `prefers-reduced-transparency`, falling back to
`--ui-color-surface-raised`.

Reserve glass for overlays and chrome — dialogs, drawers, a sticky navbar —
rather than dense, repeated grids of cards, where many blurred surfaces can
visibly cost scroll performance.
```

(Write the fenced code blocks above with plain triple-backtick fences, not the escaped `\` ` ` ` shown here — the backslashes are only to keep this plan's own Markdown from closing early.)

- [ ] **Step 3: Confirm `docs/new-package-spec.md` is untouched**

Run: `git diff --stat docs/new-package-spec.md`
Expected: empty output. This is a deliberate guard, not busywork — the spec's Goals explicitly require this file to remain accurate, since it describes the *default* theme, which this feature does not change.

- [ ] **Step 4: Full verification sweep**

Run the complete relevant test surface in one pass:

```bash
python -m pytest tests/ -q
npx vitest run
npx playwright test tests/e2e/glass-contrast.spec.js tests/e2e/glass-surface.spec.js --project=chromium --project=firefox --project=webkit
npx playwright test tests/e2e/accessibility.spec.js --project=accessibility
npm run check:baseline
python tools/build_css.py --check
python scripts/build_demo.py --check
```

Expected: everything exits 0. Running the two new Playwright specs across all three engines (not just chromium, as in earlier tasks) is the first real cross-browser check this plan does — `backdrop-filter`, `color-mix()`, and `:is()` are all well-supported, but this is the step that would catch an engine-specific surprise before merge.

- [ ] **Step 5: Commit**

```bash
git add docs/components.md docs/theming-recipes.md
git commit -m "docs: document .is-glass and data-surface=\"glass\""
```
