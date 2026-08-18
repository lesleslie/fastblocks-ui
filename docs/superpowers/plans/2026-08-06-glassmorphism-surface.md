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
- Before starting Task 1, confirm `tests/e2e/contrast-utils.js` exists and is ESM with `installProbe` already exported (run `grep -n "^export" tests/e2e/contrast-utils.js`). Task 1's first failing-test prediction (`SyntaxError: The requested module './contrast-utils.js' does not provide an export named 'compositeRatio'`) only fires if both hold; if the file is missing, is CommonJS, or `installProbe` is not yet exported, fix that first — the rest of Task 1 is calibrated against those preconditions.

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

// Foreground tokens cover both body text and headings -- the demo renders
// a heading inside the glass card, so the strong token is the actual case
// that consumers hit.
const FOREGROUNDS = ['--ui-color-text', '--ui-color-text-strong'];

test.describe('Glass tint contrast (WCAG AA, 4.5:1)', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(PAGE);
    await installProbe(page);
  });

  for (const theme of ['light', 'dark']) {
    for (const [name, backdrop] of Object.entries(BACKDROPS)) {
      for (const fg of FOREGROUNDS) {
        test(`${fg} on --ui-glass-tint clears 4.5:1 over a ${name} backdrop in ${theme} theme`, async ({
          page,
        }) => {
          const ratio = await compositeRatio(page, {
            fg,
            bg: '--ui-glass-tint',
            backdrop,
            theme,
          });
          expect(
            ratio,
            `${fg} / ${theme}/${name} backdrop = ${ratio.toFixed(2)}:1`,
          ).toBeGreaterThanOrEqual(4.5);
        });
      }
    }
  }
});
```

- [ ] **Step 2: Run it, confirm it fails**

Run: `npx playwright test tests/e2e/glass-contrast.spec.js --project=chromium`
Expected: FAIL — this repo's ESM setup makes a missing named export a module-link error, not a runtime `TypeError`: the test file fails to load with a `SyntaxError: The requested module './contrast-utils.js' does not provide an export named 'compositeRatio'`, before any test body runs.

- [ ] **Step 3: Add `compositeRatio` to `contrast-utils.js`**

Append to `tests/e2e/contrast-utils.js`, after the existing `edgeRatio` export. Reuses `tokenRatio`'s read path internally rather than re-implementing the `window.__uiContrast` plumbing (per the FastBlocks reviewer's call-out):

```js
/**
 * Contrast ratio of `fg` against `bg` alpha-composited over a flat `backdrop`
 * colour — what `background-color` + `backdrop-filter` actually paints when
 * the real backdrop is a single flat colour (see glass-contrast.spec.js for
 * why that's a faithful test of `backdrop-filter: blur()`).
 *
 * Reuses the same `window.__uiContrast` probe as `tokenRatio` — the only
 * divergence is the compositing step (alpha-blend `bg` over `backdrop`),
 * which `tokenRatio` does not need.
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

In `tests/js/css-variables.test.js`, add a new top-level `describe` block (anywhere after the existing `describe('Root Variables', ...)` block closes). Eight tokens now, plus a theme-difference assertion that catches a regression where the tint accidentally stops referencing `--ui-color-surface` (and stops resolving per-theme):

```js
describe('Glass Surface Tokens', () => {
  for (const token of [
    '--ui-glass-strength',
    '--ui-glass-blur',
    '--ui-glass-blur-strong',
    '--ui-glass-saturate',
    '--ui-glass-tint',
    '--ui-glass-border',
    '--ui-glass-highlight',
    '--ui-glass-shadow',
  ]) {
    it(`should define ${token}`, () => {
      expect(getCSSVariable(token)).toBeTruthy();
    });
  }

  it('derives --ui-glass-tint from --ui-color-surface via color-mix (and --ui-glass-strength)', () => {
    const value = getCSSVariable('--ui-glass-tint');
    expect(value).toContain('color-mix');
    expect(value).toContain('--ui-color-surface');
    expect(value).toContain('--ui-glass-strength');
  });

  it('derives --ui-glass-border from --ui-color-border via color-mix (and --ui-glass-strength)', () => {
    const value = getCSSVariable('--ui-glass-border');
    expect(value).toContain('color-mix');
    expect(value).toContain('--ui-color-border');
    expect(value).toContain('--ui-glass-strength');
  });

  it('--ui-glass-tint resolves differently between light and dark themes', () => {
    // Catches a regression where the tint accidentally replaces
    // `var(--ui-color-surface)` with a static color, which would stop
    // re-deriving when [data-theme="dark"] flips the surface token.
    const lightTint = getCSSVariable('--ui-glass-tint', 'light');
    const darkTint = getCSSVariable('--ui-glass-tint', 'dark');
    expect(lightTint).not.toEqual(darkTint);
  });
});
```

If `getCSSVariable` does not currently accept a theme argument (it probably doesn't — verify by reading the helper), extend the helper signature to accept an optional second argument that switches theme via the same `window.__uiContrast.setTheme` plumbing the e2e probe uses. If extending the helper requires more than 5 lines, fall back to asserting theme-difference from within an e2e Playwright spec instead — but prefer the helper extension to keep the test surface tight.

- [ ] **Step 6: Run vitest, confirm it fails**

Run: `npx vitest run tests/js/css-variables.test.js`
Expected: FAIL — all four new assertions fail (`getCSSVariable` returns an empty string; `toBeTruthy()` fails, and `.toContain()` calls throw or fail on an empty string).

- [ ] **Step 7: Add the eight tokens to `tokens.css`**

In `fastblocks_ui/static/css/tokens.css`, insert immediately after the existing `--ui-focus-ring: ...;` declaration (the last declaration in the file), still inside the `:root { ... }` block:

```css

    /* Glassmorphism surface treatment (opt-in only -- see .is-glass /
       data-surface="glass" in components.css).

       --ui-glass-strength couples the tint and border opacities so a
       designer tuning one without the other doesn't produce an
       aesthetically broken middle ground (tinted fill behind a faded
       outline). The four genuinely-independent knobs (blur, saturate,
       highlight, shadow) remain explicit; the strength variable is the
       only derivation.

       78% tint opacity is the accessibility-critical number: it keeps text
       contrast close to the fully-opaque-surface case over flat backdrops.
       Verified by tests/e2e/glass-contrast.spec.js in both themes. */
    --ui-glass-strength: 1;
    --ui-glass-blur: 16px;
    --ui-glass-blur-strong: 24px;
    --ui-glass-saturate: 160%;
    --ui-glass-tint: color-mix(in oklab, var(--ui-color-surface) calc(78% * var(--ui-glass-strength)), transparent);
    --ui-glass-border: color-mix(in oklab, var(--ui-color-border) calc(60% * var(--ui-glass-strength)), transparent);
    --ui-glass-highlight: color-mix(in oklab, var(--ui-color-surface) 80%, transparent);
    --ui-glass-shadow: color-mix(in oklab, var(--ui-color-text) 8%, transparent);
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
Expected: PASS on all — 8 vitest token-existence assertions + 2 derivation assertions + 1 theme-difference assertion = 11 vitest assertions, and 8 Playwright tests (2 foregrounds × 2 themes × 2 backdrops).

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
- Consumes: all eight glass tokens (`--ui-glass-strength`, `--ui-glass-blur`, `--ui-glass-blur-strong`, `--ui-glass-saturate`, `--ui-glass-tint`, `--ui-glass-border`, `--ui-glass-highlight`, `--ui-glass-shadow`) from Task 1.
- Produces: the `--_ui-glass-components` custom property at the top of the glass rule block (single source of truth for the eligible-component selector list) plus the main `.is-glass` rule that references it. Task 3 appends its `@supports`/`@media` fallback blocks directly after this rule, also referencing `--_ui-glass-components`. Task 3 also extends `tests/e2e/glass-surface.spec.js` with `forced-colors` and focus-ring tests.

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

  // Focus-ring visibility: assert --ui-focus-ring resolves and clears 3:1
  // against the composited backdrop (SC 2.4.7 / SC 1.4.11). Backdrop-filter
  // can degrade focus visibility in implementation-dependent ways, and
  // dialog/drawer borders carry modal semantics -- a regression here is
  // an instant keyboard-navigation blocker.
  test('focus ring on a glass surface resolves and clears 3:1 (SC 2.4.7)', async ({ page }) => {
    const card = page.locator('#card-glass');
    await card.focus();
    const shadow = await card.evaluate(
      (el) => getComputedStyle(el).boxShadow + '|' + getComputedStyle(el).outlineColor,
    );
    expect(shadow).not.toBe('|');
    // The actual 3:1 contrast assertion would require reading the focus-ring
    // token and computing the ratio against the glass tint composited over
    // a high-contrast backdrop; defer that exact ratio to Task 3's
    // glass-border-contrast.spec.js pattern. Here we assert the ring exists
    // and is non-empty -- a regression that hides the ring entirely slips
    // past this; the deeper ratio check is in Task 3.
  });

  test('data-theme="dark" composes with data-surface="glass" (independent attributes)', async ({
    page,
  }) => {
    await page.evaluate(() => document.documentElement.setAttribute('data-theme', 'dark'));
    const filter = await page
      .locator('#card-scoped')
      .evaluate((el) => getComputedStyle(el).backdropFilter);
    expect(filter).not.toBe('none');
  });

  test('hover deepens the tint and applies a 1px translate on .is-glass', async ({ page }) => {
    const card = page.locator('#card-glass');
    const restingBg = await card.evaluate((el) => getComputedStyle(el).backgroundColor);
    const restingTransform = await card.evaluate((el) => getComputedStyle(el).transform);
    await card.hover();
    const hoverBg = await card.evaluate((el) => getComputedStyle(el).backgroundColor);
    const hoverTransform = await card.evaluate((el) => getComputedStyle(el).transform);
    expect(hoverBg).not.toEqual(restingBg);
    expect(hoverTransform).not.toEqual(restingTransform);
    expect(hoverTransform).toContain('matrix'); // 1px translateY serializes as a matrix
  });

  test('hover is suppressed under prefers-reduced-motion: reduce', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    const card = page.locator('#card-glass');
    await card.hover();
    const transform = await card.evaluate((el) => getComputedStyle(el).transform);
    // Without the motion-reduce guard, the hover applies translateY(-1px)
    // which serializes as a non-identity matrix. With the guard, transform
    // is `none`.
    expect(transform).toBe('none');
  });
});
```

- [ ] **Step 3: Run it, confirm it fails**

Run: `npx playwright test tests/e2e/glass-surface.spec.js --project=chromium`
Expected: FAIL — every "has backdrop-filter" assertion fails (7 of 9: the direct `.is-glass` card, the 5 scoped-component checks, plus the dark-theme composability check) because `backdropFilter` is `'none'` everywhere (no CSS rule exists yet). The two "no effect" tests pass vacuously.

- [ ] **Step 4: Add the shared selector rule + hover to `components.css`**

In `fastblocks_ui/static/css/components.css`, insert as the last rule inside `@layer components` — i.e. immediately before the layer's closing `}`. Run `tail -25 fastblocks_ui/static/css/components.css` first to confirm the insertion point: the file may have moved relative to the `:root:has(.ui-drawer:popover-open) .ui-burger .ui-burger__bar:nth-child(3) { ... }` selector listed in this plan (any unrelated commit can shift it), but "last rule in `@layer components`" is robust to that drift. If the last rule shown by `tail` is *not* a `.ui-burger__bar` selector, do not match the selector text — match the structural anchor (last rule in the layer).

```css

  /* Opt-in glassmorphism surface treatment. Colocated here rather than
     split between this file and layout.css -- .ui-navbar lives in
     layout.css, but a single shared selector list is what keeps .is-glass
     and data-surface="glass" from ever drifting into two different
     recipes. The `--_ui-glass-components` custom property is the single
     source of truth; the three rule blocks below (main + hover +
     fallback in Task 3) all reference it. See
     docs/superpowers/specs/2026-08-06-glassmorphism-surface-design.md.
     Fallback blocks for @supports / forced-colors /
     prefers-reduced-transparency follow directly below in Task 3,
     reusing this same selector list. */
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
     and lifts by 1px. Suppressed under prefers-reduced-motion in the
     rule further below. */
  :is(var(--_ui-glass-components)).is-glass:hover,
  [data-surface="glass"] :is(var(--_ui-glass-components)):hover {
    background-color: color-mix(in oklab, var(--ui-color-surface) 85%, transparent);
    transform: translateY(-1px);
  }

  @media (prefers-reduced-motion: reduce) {
    :is(var(--_ui-glass-components)).is-glass,
    [data-surface="glass"] :is(var(--_ui-glass-components)),
    :is(var(--_ui-glass-components)).is-glass:hover,
    [data-surface="glass"] :is(var(--_ui-glass-components)):hover {
      transition: none;
      transform: none;
    }
  }
```

- [ ] **Step 5: Rebuild the bundle**

Run: `python tools/build_css.py`

- [ ] **Step 6: Run the spec again, confirm it passes**

Run: `npx playwright test tests/e2e/glass-surface.spec.js --project=chromium`
Expected: PASS — all 13 tests (3 individual + 5 scoped-component loop + 1 dark-theme composability + 1 hover deepens + 1 hover suppressed under reduced-motion + 1 focus-ring resolves + 1 ineligible button no-op). The 7 backdrop-filter assertions (1 direct + 5 scoped + 1 dark-theme) are the load-bearing ones; the 4 new ones (hover, reduced-motion, focus-ring, ineligible) are smaller surface coverage.

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
- Modify: `tests/e2e/glass-surface.spec.js` (expand the `forced-colors` test to cover all five eligible components + scoped variants, assert background-image is `none` alongside alpha)
- Create: `tests/e2e/glass-border-contrast.spec.js` (new SC 1.4.11 test for the glass border)
- Modify: `tests/test_fastblocks_ui.py:434-438` (extend `test_bundle_includes_accessibility_media_queries` to also assert the new tokens, hover rule, and `prefers-reduced-motion` block)

**Interfaces:**
- Consumes: the selector list (now `var(--_ui-glass-components)`) and rule block from Task 2. Both fallback blocks below reuse `--_ui-glass-components` so the three rule blocks stay in sync with one edit.
- Produces: nothing new consumed by later tasks — this task closes out the CSS implementation.

- [ ] **Step 1: Expand the failing Playwright fallback tests**

In `tests/e2e/glass-surface.spec.js`, **replace** the existing single-component forced-colors test added in the original Task 3 Step 1 with a parameterized version that loops over all five eligible components plus the `data-surface="glass"` scoped variants. The current single-`#card-glass` test would miss a regression scoped to one component:

```js

  // The forced-colors fallback must produce a solid, non-blurred, non-image
  // surface across every eligible component AND the scoped-attribute
  // variants. A regression that keeps the translucent tint while only
  // dropping blur, or that uses background-image to simulate translucency,
  // would slip past a backdropFilter-only assertion.
  for (const id of [
    'card-glass',
    'dialog-scoped',
    'drawer-scoped',
    'navbar-scoped',
    'dropdown-scoped',
    'card-scoped',
  ]) {
    test(`forced-colors disables blur + tint + image on #${id}`, async ({
      page,
    }) => {
      await page.emulateMedia({ forcedColors: 'active' });
      const el = page.locator(`#${id}`);

      const filter = await el.evaluate((el) => getComputedStyle(el).backdropFilter);
      expect(filter).toBe('none');

      const background = await el.evaluate((el) => getComputedStyle(el).backgroundColor);
      const alphaMatch = background.match(/rgba?\([^)]*,\s*([\d.]+)\s*\)/);
      const alpha = alphaMatch ? Number(alphaMatch[1]) : 1;
      expect(alpha).toBe(1);

      // background-image is the second regression vector: a translucent
      // gradient would pass the alpha-1 background check while still
      // rendering a see-through surface.
      const backgroundImage = await el.evaluate(
        (el) => getComputedStyle(el).backgroundImage,
      );
      expect(backgroundImage).toBe('none');
    });
  }
```

- [ ] **Step 2: Create the failing border-contrast spec**

Create `tests/e2e/glass-border-contrast.spec.js` (sibling to the existing `tests/e2e/token-contrast.spec.js`):

```js
import { expect, test } from '@playwright/test';
import { compositeRatio, installProbe } from './contrast-utils.js';

const PAGE = '/tests/e2e/fixtures/token-contrast.html';

// Border contrast (SC 1.4.11) for the glass border token. Dialog and
// drawer borders carry modal semantics, so a low-contrast border
// eliminates the affordance -- this is a new test type the existing
// token-contrast.spec.js does not cover.
test.describe('Glass border contrast (SC 1.4.11, 3:1)', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(PAGE);
    await installProbe(page);
  });

  for (const theme of ['light', 'dark']) {
    for (const backdrop of [[0, 0, 0], [255, 255, 255]]) {
      test(`--ui-glass-border clears 3:1 against --ui-glass-tint in ${theme} over ${backdrop.join(',')}`, async ({
        page,
      }) => {
        const ratio = await compositeRatio(page, {
          fg: '--ui-glass-border',
          bg: '--ui-glass-tint',
          backdrop,
          theme,
        });
        expect(ratio, `${theme}/${backdrop.join(',')} = ${ratio.toFixed(2)}:1`).toBeGreaterThanOrEqual(
          3,
        );
      });
    }
  }
});
```

- [ ] **Step 3: Write the failing pytest fallback-presence check**

In `tests/test_fastblocks_ui.py`, extend the existing `test_bundle_includes_accessibility_media_queries` method (in `TestDemoBuild`, currently at lines 434-438):

```python
    def test_bundle_includes_accessibility_media_queries(self):
        with open(fastblocks_ui.get_css_path(), encoding="utf-8") as handle:
            content = handle.read()
        self.assertIn("prefers-reduced-motion: reduce", content)
        self.assertIn("forced-colors: active", content)
        self.assertIn("prefers-reduced-transparency: reduce", content)
        self.assertIn("@supports not (backdrop-filter: blur(1px))", content)
        # Glass feature additions (Task 1, 2, 3):
        self.assertIn("--ui-glass-strength", content)
        self.assertIn("--ui-glass-highlight", content)
        self.assertIn("--ui-glass-shadow", content)
        self.assertIn("--ui-glass-blur-strong", content)
        self.assertIn("--_ui-glass-components", content)
        self.assertIn("translateY(-1px)", content)  # hover micro-interaction
        self.assertIn("box-shadow", content)  # inset highlight + ambient lift
```

- [ ] **Step 4: Run both, confirm they fail**

Run:
```bash
npx playwright test tests/e2e/glass-border-contrast.spec.js tests/e2e/glass-surface.spec.js --project=chromium
python -m pytest tests/test_fastblocks_ui.py::TestDemoBuild::test_bundle_includes_accessibility_media_queries -v
```
Expected: Playwright's forced-colors tests FAIL (`filter` is not `'none'` — Task 2's rule has no forced-colors guard yet). The border-contrast spec FAILs because `--ui-glass-border` reads as empty (no token yet). pytest FAILS on the new `assertIn` calls (strings absent from the bundle).

- [ ] **Step 5: Add the two fallback blocks to `components.css`**

Directly after the rule block added in Task 2 (still inside `@layer components`, same file). Both blocks reset `border-color` to the opaque `--ui-color-border` (not just `background-color`) — a non-supporting engine renders the main rule's translucent border, which on a busy backdrop would otherwise look like a faint outline on a faint fill. `box-shadow` is also reset because the inset highlight only is meaningful on a translucent surface:

```css

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
```

- [ ] **Step 6: Rebuild the bundle**

Run: `python tools/build_css.py`

- [ ] **Step 7: Run all checks again, confirm they pass**

Run:
```bash
npx playwright test tests/e2e/glass-border-contrast.spec.js tests/e2e/glass-surface.spec.js --project=chromium
python -m pytest tests/test_fastblocks_ui.py::TestDemoBuild::test_bundle_includes_accessibility_media_queries -v
```
Expected: PASS on all — 6 forced-colors tests (one per eligible + scoped component), 4 border-contrast tests (2 themes × 2 backdrops), 11 bundle-presence assertions.

- [ ] **Step 8: Verify the Baseline floor, bundle-size, and demo-mirror gates all pass**

`check:baseline` requires `node_modules/@mdn/browser-compat-data` and `node_modules/web-features`, which are declared in `package.json` but are not guaranteed to be installed in a fresh checkout. Run `npm install` first if `ls node_modules/web-features` comes up empty — otherwise `check:baseline` fails immediately with `ERR_MODULE_NOT_FOUND`, before it evaluates any real CSS, which reads like a false positive for this feature if you don't already know the cause.

The new `python tools/build_css.py --check` gate catches "I edited the source but forgot to rebuild" (this plan has been disciplined about rebuilding, but the gate makes it enforced for everyone). The `python scripts/build_demo.py --check` gate is the demo mirror — without it, `demo/demo.html`'s inlined style block can drift from the regenerated `demo/index.html` between this task's commit and Task 4's commit. Run it here so the boundary is enforced immediately after the bundle change, not deferred to Task 4.

Run:
```bash
npm install   # only if node_modules/web-features is missing
npm run check:baseline
python -m pytest tests/test_fastblocks_ui.py::TestBundleSizeBudget -v
python tools/build_css.py --check
python scripts/build_demo.py --check
```
Expected: all four exit 0. `backdrop-filter` (unprefixed) and `color-mix()` are real CSS properties/functions the checker resolves against BCD and checks against the `"newly"` floor — `color-mix()` already passes unexempted elsewhere in `tokens.css`, and `backdrop-filter` is Baseline "high" (widely available), so both pass on their own merits. `@supports not (...)`, `forced-colors`, and `prefers-reduced-transparency` are media/support-query *preludes*, which `scripts/check-baseline.mjs`'s scanner does not parse for compat keys at all (it scans declarations, not at-rule conditions) — they pass by never being evaluated, not because they clear the floor. Don't cite this run as evidence `prefers-reduced-transparency` is Baseline; the spec's own Accessibility contract already says its support is thin and treats it as defense in depth, not the primary guard. If `check:baseline` fails on something unexpected, do not silence it — read `.baseline-allowlist.json`'s header comment for the exemption format and add an entry only if the failure is a genuine partial-implementation gap, not a real correctness issue.

- [ ] **Step 9: Commit**

```bash
git add fastblocks_ui/static/css/components.css fastblocks_ui/static/css/fastblocks-ui.css \
  tests/e2e/glass-surface.spec.js tests/e2e/glass-border-contrast.spec.js \
  tests/test_fastblocks_ui.py
git commit -m "feat(components): add forced-colors / reduced-transparency fallback for .is-glass"
```

---

### Task 4: Demo example, showcase, and parity test

**Files:**
- Modify: `scripts/build_demo.py` (new `.demo-glass-backdrop` rule in `DEMO_CSS`, new `glass_demo()` and `glass_showcase()` functions, one new entry in `build_categories()`)
- Modify: `demo/index.html` (regenerated, not hand-edited)
- Modify: `demo/demo.html` (hand-added CSS rule, section, and sidebar link, kept in parity with `index.html`)
- Modify: `tests/test_demo_parity.py` (new `test_glass_card` and `test_glass_showcase`)

**Interfaces:**
- Consumes: `.is-glass` (Task 2) and the existing `card()` helper (`fastblocks_ui/helpers.py:351`, unchanged signature). The showcase cards override `--ui-glass-blur` per-element via inline `style=""` to demonstrate the soft/regular/strong intensity range.
- Produces: nothing consumed by later tasks.

- [ ] **Step 1: Write the failing parity tests**

In `tests/test_demo_parity.py`, add new test methods next to the existing `test_card` (around line 458):

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

    def test_glass_showcase(self) -> None:
        # The showcase demonstrates the per-element intensity override:
        # soft (10px), regular (16px default), strong (24px). All three
        # cards share the .is-glass class; only --ui-glass-blur differs.
        for intensity, blur in (("soft", "10px"), ("regular", None), ("strong", "24px")):
            kwargs = {"header": f"Glass card ({intensity})", "class_": "is-glass"}
            if blur is not None:
                kwargs["style"] = f"--ui-glass-blur: {blur}"
            with self.subTest(intensity=intensity):
                self.assertFragmentInDemo(str(card(**kwargs)))
```

The exact fragment this must find, verified directly against the real helper:

```html
<div class="ui-card is-glass"><header class="ui-card__header">Glass card</header><div class="ui-card__body"><p>Add <code>is-glass</code> to card, dialog, drawer, navbar, or dropdown for a translucent, blurred surface. Set <code>data-surface="glass"</code> on an ancestor to opt every eligible component in at once.</p></div></div>
```

The showcase cards pass a `style="--ui-glass-blur: ..."` argument — confirm `card()` accepts and forwards `style=` to its outermost `<div>`. If it doesn't, add `style` to the helper's keyword passthrough (no new tests required; the existing `class_` passthrough test pattern applies).

- [ ] **Step 2: Run it, confirm it fails**

Run: `python -m pytest tests/test_demo_parity.py -k test_glass -v`
Expected: FAIL — `demo/demo.html has drifted from real helper output` (the fragments aren't in the file yet).

- [ ] **Step 3: Add `.demo-glass-backdrop` and `.demo-glass-stage` rules to `DEMO_CSS`**

The glass effect needs something behind it to blur, and this codebase deliberately keeps demo pages inline-style-free for CSP reasons (see the comment on `palette_css()` at `scripts/build_demo.py:774-781`: "emitted as real CSS rules rather than `style="background:..."` so the page stays inline-style-free"). A dedicated class, not an inline `style=` attribute, is required here for the same reason.

The previous `linear-gradient(135deg, primary, info)` contradicted `docs/new-package-spec.md:240`'s "no heavy gradients" rule. Replace it with a low-alpha solid derived from `--ui-color-primary` (tonally consistent with the rest of the demo). Add a separate `.demo-glass-stage` for the showcase — wider, contains three cards at varied intensities.

In `scripts/build_demo.py`, in the `DEMO_CSS` string (starts at line 80), insert immediately after the existing `.demo-panel { ... }` rule (ends at line 150) and before `.demo-bordered`:

```css
.demo-glass-backdrop {
  background: oklch(from var(--ui-color-primary) 12% l c h);
  padding: var(--ui-space-6);
  border-radius: var(--ui-radius-lg);
}

.demo-glass-stage {
  background:
    linear-gradient(180deg, var(--ui-color-surface-subtle), var(--ui-color-surface));
  padding: var(--ui-space-6);
  border-radius: var(--ui-radius-lg);
  display: grid;
  gap: var(--ui-space-4);
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
}
```

If `--ui-color-surface-subtle` doesn't exist, fall back to `--ui-color-surface` (the subtle variant is conventional but not required). Verify in tokens.css before writing.

- [ ] **Step 4: Add `glass_demo()` and `glass_showcase()` to `scripts/build_demo.py`**

Add these functions next to `card_demo()` (after it, around line 709):

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


def glass_showcase() -> SafeHTML:
    # Demonstrates the per-element intensity override: same .is-glass
    # class across three cards, three different --ui-glass-blur values
    # (10px soft, 16px default regular, 24px strong). Each card passes
    # `style=` to override the blur token per-element, which is the
    # documented way to tune intensity without forking the modifier API.
    return _safe(
        '<div class="demo-glass-stage">'
        + str(
            card(
                header="Glass card (soft)",
                body=_safe("<p>10px blur — tooltips, small overlays.</p>"),
                class_="is-glass",
                style="--ui-glass-blur: 10px",
            )
        )
        + str(
            card(
                header="Glass card (regular)",
                body=_safe("<p>16px blur — default for cards, dialogs, drawers.</p>"),
                class_="is-glass",
            )
        )
        + str(
            card(
                header="Glass card (strong)",
                body=_safe("<p>24px blur — modals, hero overlays.</p>"),
                class_="is-glass",
                style="--ui-glass-blur: 24px",
            )
        )
        + "</div>"
    )
```

- [ ] **Step 5: Register both in `build_categories()`**

In `scripts/build_demo.py`, in the `"extras"` / `"Patterns & extras"` category tuple, insert two new entries immediately after the `"theme"` entry and before `"forms-in-practice"`:

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
                (
                    "glass-showcase",
                    "Glass surfaces — intensity showcase",
                    "Three cards at soft / regular / strong blur intensities. "
                    "Override --ui-glass-blur per-element to tune intensity "
                    "without forking the modifier API.",
                    glass_showcase(),
                ),
```

- [ ] **Step 6: Regenerate `demo/index.html`**

Run: `python scripts/build_demo.py`

This writes two new `<section id="glass" ...>...</section>` and `<section id="glass-showcase" ...>...</section>` blocks into `demo/index.html`, directly after the `id="theme"` section, the matching sidebar `<li>` entries after the `theme` sidebar link, and the `.demo-glass-backdrop` and `.demo-glass-stage` rules (from Step 3) into `index.html`'s inlined `<style>` block.

- [ ] **Step 7: Hand-copy the generated section, sidebar link, and CSS rules into `demo/demo.html`**

First, re-verify the byte-identical assumption made in this step still holds. `demo/demo.html`'s inlined `<style>` block is supposed to mirror `DEMO_CSS` byte-for-byte; if anything else has drifted since this plan was written, the hand-copy below will silently propagate that drift. Run:

```bash
diff <(sed -n '/demo-panel {/,/demo-bordered {/p' demo/index.html) \
     <(sed -n '/demo-panel {/,/demo-bordered {/p' demo/demo.html)
```

If the diff is non-empty, the assumption is stale — sync `demo/demo.html`'s style block to `demo/index.html` first, *then* do the hand-copy below. If the diff is empty, proceed.

Then keep it that way — copy the new `.demo-glass-backdrop` and `.demo-glass-stage` rules from `index.html`'s `<style>` block into the same position in `demo/demo.html`'s `<style>` block, immediately after `.demo-panel`.

Open `demo/index.html`, find the `<section id="glass" ...>...</section>` and `<section id="glass-showcase" ...>...</section>` blocks (both immediately after `</section>` that closes `id="theme"`), and copy them verbatim into `demo/demo.html` at the same positions — immediately after `demo/demo.html`'s own `id="theme"` section, before its `id="forms-in-practice"` section.

Do the same for the sidebar: copy the generated `<li class="ui-nav-list__item"><a class="ui-nav-list__link" href="#glass">Glass surfaces</a></li>` and `<li ...href="#glass-showcase">Glass surfaces — intensity showcase</li>` from `index.html`'s sidebar into `demo/demo.html`'s sidebar, immediately after the `href="#theme"` link, in order.

- [ ] **Step 8: Run the parity test and the full parity suite, confirm they pass**

Run:
```bash
python -m pytest tests/test_demo_parity.py -v
python scripts/build_demo.py --check
```
Expected: all pass, including `test_every_manifest_component_has_a_demo_section` and `test_sidebar_links_to_every_section` (unaffected — both `glass` and `glass-showcase` are non-manifest showcase entries, same pattern as the existing `palette` and `theme` entries), and the `--check` drift gate exits 0. `test_glass_card` and `test_glass_showcase` (covering 4 cards × per-element intensity) both pass.

- [ ] **Step 9: Confirm the new demo content is axe-clean**

`tests/e2e/accessibility.spec.js` already sweeps both `/demo/demo.html` and `/demo/index.html` at 375/768/1024/1280px with a zero-violations tolerance (see the comment block above its per-width loop) — no new test code is needed, since the glass cards added in Steps 6-7 are now inside that sweep automatically. **Extend the sweep to also run under emulated `forced-colors: active` and `prefers-reduced-transparency: reduce`** — the current axe sweep runs only in the default media state. The fallback blocks added in Task 3 should produce solid, no-glass surfaces under these emulations; an axe pass here confirms the fallback renders correctly, not just that the rule exists in the bundle.

Run: `npx playwright test tests/e2e/accessibility.spec.js --project=accessibility`
Expected: PASS — 0 violations at every width, both pages, both default and emulated forced-colors / reduced-transparency states.

- [ ] **Step 10: Commit**

```bash
git add scripts/build_demo.py demo/demo.html demo/index.html tests/test_demo_parity.py
git commit -m "feat(demo): add glass surfaces example and intensity showcase"
```

---

### Task 5: Documentation and final verification

**Files:**
- Modify: `docs/components.md` (single bullet under `## State Modifiers`, not inline notes in the five eligible-component rows)
- Modify: `docs/theming-recipes.md` (new "Glass Surfaces" recipe section, after "Dark Theme")
- Modify: `docs/usage.md` (one-line `class_="is-glass"` example in the navbar usage section, alongside the existing `is-sticky` example)
- Modify: `README.md` (one-line mention in Features or Customization section)
- Modify: `CHANGELOG.md` (one-line entry under the upcoming version)

**Interfaces:**
- Consumes: nothing new — documents what Tasks 1-4 shipped.
- Produces: nothing consumed by later tasks (last task in this plan).

- [ ] **Step 1: Add `is-glass` as a single bullet under `## State Modifiers` in `docs/components.md`**

Do **not** inline `.is-glass` notes into the five eligible-component rows. Existing modifiers (`is-primary`, `is-info`, etc.) are documented as bullets under `## State Modifiers` at components.md:62. `is-sticky` — the one inline modifier mention — lives in `docs/usage.md:747`, not in `components.md`. Inlining five rows would invent a new docs convention; a single bullet under State Modifiers matches the existing pattern.

Open `docs/components.md`, find `## State Modifiers`, and add a "Surface Modifiers" sub-section at the end:

```markdown
### Surface Modifiers

- `is-glass` — translucent, blurred surface. Applies to card, dialog, drawer, navbar, and dropdown. See [theming-recipes.md > Glass Surfaces](theming-recipes.md#glass-surfaces) for usage and the per-component intensity override.
```

(Line numbers and section headers are as of this plan's writing — confirm with `grep -n "^## State Modifiers\|^### " docs/components.md` before editing, in case earlier tasks' commits shifted them.)

- [ ] **Step 2: Add `class_="is-glass"` example to `docs/usage.md` navbar section**

Open `docs/usage.md`, find the navbar usage section (around line 747 where `is-sticky` is documented), and add a parallel `class_="is-glass"` example. Either as a sibling example to `is-sticky`:

```python
# Sticky navbar
navbar(brand="...", class_="is-sticky")

# Glass navbar (translucent, blurred surface)
navbar(brand="...", class_="is-glass")

# Glass sticky navbar (both modifiers compose)
navbar(brand="...", class_="is-sticky is-glass")
```

Or, if the navbar section is structured differently, add a one-line reference linking to the recipe. The goal is that a developer following either `docs/usage.md` (where `is-sticky` lives) or `docs/theming-recipes.md` (findable via the navbar section) finds the other. Confirm the actual structure of `docs/usage.md`'s navbar section with `grep -n "is-sticky\|^## navbar\|navbar()" docs/usage.md` before editing.

- [ ] **Step 3: Add `is-glass` mention to `README.md`**

Open `README.md`, find the Features or Customization section, and add a one-line mention with a link:

```markdown
- **Opt-in glass surfaces** — apply `.is-glass` or `data-surface="glass"` to card, dialog, drawer, navbar, and dropdown for a translucent, blurred surface. See [theming-recipes.md > Glass Surfaces](docs/theming-recipes.md#glass-surfaces).
```

If the README's Features section uses bullets, add as a bullet. If it's a different structure (table, prose), adapt to match. The goal is that `README.md` mentions glass exists at all — discoverability is the weakest link otherwise, since readers learn about `.is-glass` only by stumbling into `theming-recipes.md` cover-to-cover.

- [ ] **Step 4: Add a CHANGELOG.md entry**

Open `CHANGELOG.md`, find the most recent unreleased section (or the upcoming version section if versions are tracked per-release). Add one bullet:

```markdown
- Added opt-in glassmorphism surface treatment: `.is-glass` modifier class and `data-surface="glass"` attribute for card, dialog, drawer, navbar, and dropdown. See [theming-recipes.md > Glass Surfaces](docs/theming-recipes.md#glass-surfaces) for usage. Eight new tokens (`--ui-glass-strength`, `--ui-glass-blur`, `--ui-glass-blur-strong`, `--ui-glass-saturate`, `--ui-glass-tint`, `--ui-glass-border`, `--ui-glass-highlight`, `--ui-glass-shadow`). Hover micro-interaction (1px lift + tint deepen) suppressed under `prefers-reduced-motion: reduce`. Full fallback to `--ui-color-surface-raised` under `forced-colors` and `prefers-reduced-transparency`. No default-theme changes.
```

If the CHANGELOG uses a different format (sections, Keep-a-Changelog style), adapt to match — the goal is that the entry is findable by `grep -r "is-glass" CHANGELOG.md` and similar searches.

- [ ] **Step 5: Add the "Glass Surfaces" recipe to `docs/theming-recipes.md`**

Insert a new section after the existing "## Dark Theme" section (which ends just before "## Accessible States"):

```markdown
## Glass Surfaces

Opt in to a translucent, blurred surface for card, dialog, drawer, navbar,
and dropdown — never on by default, so the base theme's crisp, opaque look
is unchanged unless you ask for this.

Per instance:

```html
<div class="ui-card is-glass">...</div>
```

For every eligible component under a container at once:

```html
<body data-surface="glass">
  ...
</body>
```

> **Prefer `.is-glass` per instance** unless you genuinely want every
> eligible component on the page to be glass. `data-surface="glass"`
> on `<html>` flips *every* card/dialog/drawer/navbar/dropdown in the
> document; reach for it only when the whole screen is an overlay
> layer (e.g. a modal-on-modal scenario).

Composes with `data-theme`, since glass is a surface-material concern and
`data-theme` is a color-scheme concern:

```html
<html data-theme="dark" data-surface="glass">
```

### When to use (and when not to)

✅ **Use glass for**: floating chrome — sticky navbars, dialogs, drawers,
dropdowns, command palettes. Anything that sits *over* content and benefits
from showing through to what's behind.

❌ **Don't use glass for**:
- **Dense card grids** — many blurred surfaces in close proximity visibly
  cost scroll performance, and the visual depth story collapses.
- **Nested glass-on-glass** — the inner panel's backdrop filter blurs the
  outer panel's already-translucent tint, producing muddy results. Put
  glass on the outer container and a *solid* surface on the inner.
- **Critical readable text** over high-contrast or photographic backdrops
  — the 78% tint keeps *average* contrast close to the opaque case, but
  per-pixel variation over real content can drop locally.

### Tuning the glass tokens

The eight tokens split into genuinely independent knobs and one coupled
pair. Reach for the right knob for the effect you want:

| Want this effect | Raise this |
|---|---|
| Stronger blur (more dreamy) | `--ui-glass-blur` (or `--ui-glass-blur-strong` for max) |
| Crisper colors through the panel | `--ui-glass-saturate` |
| Less transparent fill | `--ui-glass-strength` (couples tint + border together) |
| More visible edge | `--ui-glass-strength` (or `--ui-glass-border` alone) |
| Top-edge "lit from above" highlight | `--ui-glass-highlight` |
| Subtle ambient lift | `--ui-glass-shadow` |

The coupled `--ui-glass-strength` knob scales the tint and border opacities
together so a designer tuning one without the other doesn't produce a
"tinted fill behind a faded outline" or vice versa.

Glass reads best at `--ui-radius-lg` (8px) or larger; avoid pairing with
`--ui-radius-sm` (4px) unless intentional.

### Per-component intensity override

Override `--ui-glass-blur` per-element via inline `style=""` to tune
intensity without forking the modifier API:

```html
<div class="ui-card is-glass" style="--ui-glass-blur: 24px">
  Strong glass for modals
</div>
```

### Accessibility behavior

`backdrop-filter` and translucency are automatically disabled under
`forced-colors` (Windows High Contrast) and `prefers-reduced-transparency`,
falling back to `--ui-color-surface-raised` (solid). The hover micro-
interaction (1px lift + tint deepen) is suppressed under
`prefers-reduced-motion: reduce`. Per-component usage is documented in
[usage.md > navbar section](usage.md#navbar) (alongside `is-sticky`).
```

(Write the fenced code blocks above with plain triple-backtick fences, not the escaped `\` ` ` ` shown here — the backslashes are only to keep this plan's own Markdown from closing early.)

- [ ] **Step 6: Confirm `docs/new-package-spec.md` is untouched**

Run: `git diff --stat docs/new-package-spec.md`
Expected: empty output. This is a deliberate guard, not busywork — the spec's Goals explicitly require this file to remain accurate, since it describes the *default* theme, which this feature does not change.

- [ ] **Step 7: Full verification sweep**

Run the complete relevant test surface in one pass (if `node_modules/web-features` is missing — see Task 3 Step 8 — run `npm install` first, or `check:baseline` fails on a missing dependency rather than a real finding):

```bash
python -m pytest tests/ -q
npx vitest run
npx playwright test tests/e2e/glass-contrast.spec.js tests/e2e/glass-border-contrast.spec.js tests/e2e/glass-surface.spec.js --project=chromium --project=firefox --project=webkit
npx playwright test tests/e2e/accessibility.spec.js --project=accessibility
npm run check:baseline
python tools/build_css.py --check
python scripts/build_demo.py --check
```

Expected: everything exits 0. Running the three new Playwright specs (contrast, border-contrast, surface) across all three engines is the first real cross-browser check this plan does — `backdrop-filter`, `color-mix()`, and `:is()` are all well-supported, but this is the step that would catch an engine-specific surprise before merge. The accessibility sweep now also runs the new glass demo (card + showcase) under both default and emulated `forced-colors` / `prefers-reduced-transparency` states (Task 4 Step 9).

- [ ] **Step 8: Commit**

```bash
git add docs/components.md docs/theming-recipes.md docs/usage.md README.md CHANGELOG.md
git commit -m "docs: document .is-glass and data-surface=\"glass\""
```
