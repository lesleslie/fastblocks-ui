import { expect, test } from '@playwright/test';
import {
  describeFailures,
  edgeRatio,
  gridFailures,
  installProbe,
  tokenRatio,
} from './contrast-utils.js';

const PAGE = '/tests/e2e/fixtures/token-contrast.html';
const INTERACTIVE = '/tests/e2e/fixtures/interactive-borders.html';

// A fixed grid, checked in rather than generated, so a failure names a specific
// reproducible input. 12 hues x 5 lightnesses x 3 chromas, plus the five
// palette colours the library actually ships.
const HUES = [0, 30, 60, 90, 120, 150, 180, 210, 240, 270, 300, 330];
const LIGHTNESS = [0.35, 0.45, 0.55, 0.65, 0.8];
const CHROMA = [0.05, 0.15, 0.25];

const SHIPPED = {
  primary: 'oklch(51.1% 0.262 276.966)',
  info: 'oklch(52% 0.105 223.128)',
  success: 'oklch(52.7% 0.154 150.069)',
  warning: 'oklch(79.5% 0.184 86.047)',
  danger: 'oklch(57.7% 0.245 27.325)',
};

const GRID = [
  ...Object.values(SHIPPED),
  ...HUES.flatMap((h) => LIGHTNESS.flatMap((l) => CHROMA.map((c) => `oklch(${l} ${c} ${h})`))),
];

// Pairs that vary with --ui-color-primary, so the grid is meaningful for them.
// Border tokens derive from nothing and get their own assertions below --
// sweeping them would measure the same pair 185 times.
const PAIRS = [
  { name: 'text on -subtle', fg: '--ui-color-text', bg: '--ui-color-primary-subtle', min: 4.5 },
  { name: '-contrast on base', fg: '--ui-color-primary-contrast', bg: '--ui-color-primary', min: 4.5 },
  {
    name: '-contrast on -strong',
    fg: '--ui-color-primary-contrast',
    bg: '--ui-color-primary-strong',
    min: 4.5,
  },
];

test.describe('Derived token contrast', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(PAGE);
    await installProbe(page);
  });

  // Guards the whole suite. Every grid assertion below is vacuous if setting a
  // brand colour does not actually move the derived tokens -- that was the
  // state before they were derived, when 185 grid points measured the default
  // palette 185 times and reported a clean pass.
  test('derived tokens respond to --ui-color-primary', async ({ page }) => {
    const sample = (brand) =>
      page.evaluate((value) => {
        const c = window.__uiContrast;
        document.documentElement.style.setProperty('--ui-color-primary', value);
        const out = {
          subtle: c.readToken('--ui-color-primary-subtle').join(),
          strong: c.readToken('--ui-color-primary-strong').join(),
          contrast: c.readToken('--ui-color-primary-contrast').join(),
        };
        document.documentElement.style.removeProperty('--ui-color-primary');
        return out;
      }, brand);

    const a = await sample('oklch(0.55 0.2 250)');
    const b = await sample('oklch(0.85 0.05 90)');
    expect(a.subtle).not.toBe(b.subtle);
    expect(a.strong).not.toBe(b.strong);
    expect(a.contrast).not.toBe(b.contrast);
  });

  for (const pair of PAIRS) {
    test(`${pair.name} holds ${pair.min}:1 across the brand grid`, async ({ page }) => {
      const failures = await gridFailures(page, { grid: GRID, ...pair });
      expect(failures, describeFailures(failures, GRID.length, pair.min)).toEqual([]);
    });
  }

  // The grid varies --ui-color-primary only. The other four roles share the
  // identical formula, so this checks each role's SHIPPED value in BOTH themes
  // -- what actually renders, and what a per-role typo would break.
  for (const theme of ['light', 'dark']) {
    test(`every role's derived scale holds its ratios in the ${theme} theme`, async ({ page }) => {
      for (const role of Object.keys(SHIPPED)) {
        const pairs = [
          [`--ui-color-${role}-contrast`, `--ui-color-${role}`, `${role} on base`],
          [`--ui-color-${role}-contrast`, `--ui-color-${role}-strong`, `${role} on strong`],
          ['--ui-color-text', `--ui-color-${role}-subtle`, `text on ${role} subtle`],
        ];
        for (const [fg, bg, label] of pairs) {
          const ratio = await tokenRatio(page, fg, bg, theme);
          expect(ratio, `${theme}: ${label} = ${ratio.toFixed(2)}:1`).toBeGreaterThanOrEqual(4.5);
        }
      }
    });
  }

  // Pins the audited figures in tokens.css so a token edit cannot quietly
  // regress them. Each role is paired with ITS OWN -contrast token: an earlier
  // version substituted every colour into --ui-color-primary and read
  // --ui-color-primary-contrast, which was hard-coded white, and so reported
  // `warning` (a light yellow) as failing when it ships black text at 10.99:1.
  test('the shipped palette meets its documented ratios', async ({ page }) => {
    const measured = {};
    for (const role of Object.keys(SHIPPED)) {
      measured[role] = await tokenRatio(page, `--ui-color-${role}-contrast`, `--ui-color-${role}`);
    }
    for (const [role, ratio] of Object.entries(measured)) {
      expect(ratio, `${role}: ${ratio.toFixed(2)}:1`).toBeGreaterThanOrEqual(4.5);
    }
    // tokens.css records danger as the tightest pair at 4.77:1. Pinning it
    // means that documented figure cannot drift from reality unnoticed.
    expect(measured.danger).toBeLessThan(5);
  });

  // WCAG 2.1 SC 1.4.11 (non-text contrast, 3:1).
  //
  // Form controls fill with --ui-color-surface, the SAME token as the page, so
  // their border is the only thing distinguishing the control from blank page.
  // Scoped to --ui-color-border-control rather than raising the shared
  // --ui-color-border: cards, tables, dialogs and navbars are decorative
  // boundaries whose contents identify them.
  for (const theme of ['light', 'dark']) {
    test(`control borders meet 3:1 in the ${theme} theme`, async ({ page }) => {
      const ratio = await tokenRatio(page, '--ui-color-border-control', '--ui-color-surface', theme);
      expect(ratio, `${theme}: ${ratio.toFixed(2)}:1`).toBeGreaterThanOrEqual(3);
    });
  }

  // The invalid-state border swaps to --ui-color-danger, which must clear the
  // same bar or the error state is less identifiable than the resting one.
  test('the invalid-state border also meets 3:1', async ({ page }) => {
    const ratio = await tokenRatio(page, '--ui-color-danger', '--ui-color-surface');
    expect(ratio, `${ratio.toFixed(2)}:1`).toBeGreaterThanOrEqual(3);
  });
});

// Controls whose border is the ONLY thing identifying them. Not decorative
// containers: a card is identified by its contents, but a pagination item
// renders as body-coloured text with no underline inside a 2.5rem box -- strip
// the border and it is indistinguishable from a paragraph.
test.describe('Interactive component borders', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(INTERACTIVE);
    await installProbe(page);
  });

  test('a pagination item is identifiable at 3:1', async ({ page }) => {
    const ratio = await edgeRatio(page, '#page-1');
    expect(ratio, `${ratio.toFixed(2)}:1`).toBeGreaterThanOrEqual(3);
  });

  test('focusing a switch does not weaken its boundary', async ({ page }) => {
    // Regression guard: the resting track moved to --ui-color-border-control
    // while :focus-visible still overrode box-shadow with the decorative token,
    // so focusing the control dropped its edge from 4.84:1 to 1.47:1 -- the
    // state that most needs to be legible.
    const resting = await edgeRatio(page, '.ui-switch__track', 'box-shadow');
    await page.locator('#sw').focus();
    const focused = await edgeRatio(page, '.ui-switch__track', 'box-shadow');
    expect(
      focused,
      `resting ${resting.toFixed(2)}:1, focused ${focused.toFixed(2)}:1`,
    ).toBeGreaterThanOrEqual(3);
  });
});
