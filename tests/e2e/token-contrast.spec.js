import { expect, test } from '@playwright/test';

const PAGE = '/tests/e2e/fixtures/token-contrast.html';

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

// Every rendered pair, with its WCAG 2.x threshold. 4.5:1 for text, 3:1 for
// non-text (borders against the surface they sit on).
const PAIRS = [
  { name: 'text on -subtle', fg: '--ui-color-text', bg: '--ui-color-primary-subtle', min: 4.5 },
  { name: '-contrast on base', fg: '--ui-color-primary-contrast', bg: '--ui-color-primary', min: 4.5 },
  { name: '-contrast on -strong', fg: '--ui-color-primary-contrast', bg: '--ui-color-primary-strong', min: 4.5 },
];
// Border tokens are deliberately absent: they derive from nothing, so running
// them through the brand grid would measure the same pair 185 times. They get
// their own assertion at the bottom.

// Runs entirely in-page: 185 colours x 2 tokens would otherwise be ~370 round
// trips per pair. Returns only the failures.
const MEASURE = ({ grid, pair }) => {
  const probe = document.getElementById('probe');
  const ctx = document.getElementById('raster').getContext('2d', { willReadFrequently: true });

  // getComputedStyle reports colours in their AUTHORED space -- e.g.
  // "oklch(0.511 0.262 276.966)", never rgb(). Parsing those numbers as RGB
  // channels would produce confident nonsense, so rasterise instead: the canvas
  // gives exact sRGB bytes, which is also the space WCAG 2.x is defined over.
  const toSrgb = (token) => {
    probe.style.color = `var(${token})`;
    ctx.clearRect(0, 0, 1, 1);
    ctx.fillStyle = getComputedStyle(probe).color;
    ctx.fillRect(0, 0, 1, 1);
    const [r, g, b] = ctx.getImageData(0, 0, 1, 1).data;
    return [r, g, b];
  };

  const luminance = ([r, g, b]) => {
    const f = (v) => {
      const s = v / 255;
      return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
    };
    return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
  };

  const contrast = (a, b) => {
    const [x, y] = [luminance(a), luminance(b)];
    return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05);
  };

  const failures = [];
  for (const brand of grid) {
    document.documentElement.style.setProperty('--ui-color-primary', brand);
    const ratio = contrast(toSrgb(pair.fg), toSrgb(pair.bg));
    if (ratio < pair.min) {
      failures.push({ brand, ratio: Math.round(ratio * 100) / 100 });
    }
  }
  document.documentElement.style.removeProperty('--ui-color-primary');
  return failures;
};

test.describe('Derived token contrast', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(PAGE);
  });

  // Guards the harness itself. Everything below is vacuous if setting a brand
  // colour does not actually move the derived tokens -- which is exactly the
  // state before Task 11, when they are hand-authored constants. Without this,
  // 185 grid points would silently measure the default palette 185 times and
  // report a clean pass.
  test.fixme(
    'derived tokens respond to --ui-color-primary',
    async ({ page }) => {
      const sample = async (brand) =>
        page.evaluate((value) => {
          const probe = document.getElementById('probe');
          document.documentElement.style.setProperty('--ui-color-primary', value);
          const read = (token) => {
            probe.style.color = `var(${token})`;
            return getComputedStyle(probe).color;
          };
          const out = {
            subtle: read('--ui-color-primary-subtle'),
            strong: read('--ui-color-primary-strong'),
            contrast: read('--ui-color-primary-contrast'),
          };
          document.documentElement.style.removeProperty('--ui-color-primary');
          return out;
        }, brand);

      const a = await sample('oklch(0.55 0.2 250)');
      const b = await sample('oklch(0.85 0.05 90)');
      expect(a.subtle).not.toBe(b.subtle);
      expect(a.strong).not.toBe(b.strong);
      expect(a.contrast).not.toBe(b.contrast);
    },
  );

  for (const pair of PAIRS) {
    // `-contrast on base` and `-contrast on -strong` cannot pass until Task 11
    // derives the foreground: --ui-color-primary-contrast is currently the
    // constant #ffffff, so 79 of 185 grid colours fall below 4.5:1 -- every
    // brand colour light enough that white text stops working. Measured, not
    // estimated; the worst is 1.91:1. Task 11 removes these fixmes.
    const pending = pair.fg === '--ui-color-primary-contrast';
    const runner = pending ? test.fixme : test;
    runner(`${pair.name} holds ${pair.min}:1 across the brand grid`, async ({ page }) => {
      const failures = await page.evaluate(MEASURE, { grid: GRID, pair });
      expect(
        failures,
        `${failures.length}/${GRID.length} brand colours fall below ${pair.min}:1\n` +
          failures
            .slice(0, 10)
            .map((f) => `  ${f.brand} -> ${f.ratio}:1`)
            .join('\n'),
      ).toEqual([]);
    });
  }

  // The shipped palette is audited in tokens.css; this pins those measurements
  // so a future token edit cannot quietly regress them.
  //
  // Each role is paired with ITS OWN -contrast token. An earlier version of this
  // test substituted every colour into --ui-color-primary and read
  // --ui-color-primary-contrast, which is hard-coded white -- so it reported
  // `warning` (a light yellow) as failing, when warning actually ships
  // --ui-color-warning-contrast: #000000 and measures 10.99:1.
  test('the shipped palette meets its documented ratios', async ({ page }) => {
    const measured = await page.evaluate((roles) => {
      const probe = document.getElementById('probe');
      const ctx = document.getElementById('raster').getContext('2d', { willReadFrequently: true });
      const toSrgb = (token) => {
        probe.style.color = `var(${token})`;
        ctx.clearRect(0, 0, 1, 1);
        ctx.fillStyle = getComputedStyle(probe).color;
        ctx.fillRect(0, 0, 1, 1);
        const [r, g, b] = ctx.getImageData(0, 0, 1, 1).data;
        return [r, g, b];
      };
      const lum = ([r, g, b]) => {
        const f = (v) => {
          const s = v / 255;
          return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
        };
        return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
      };
      const out = {};
      for (const role of roles) {
        const [x, y] = [lum(toSrgb(`--ui-color-${role}-contrast`)), lum(toSrgb(`--ui-color-${role}`))];
        out[role] = (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05);
      }
      return out;
    }, Object.keys(SHIPPED));

    for (const [role, ratio] of Object.entries(measured)) {
      expect(ratio, `${role}: ${ratio.toFixed(2)}:1`).toBeGreaterThanOrEqual(4.5);
    }
    // tokens.css records danger as the tightest pair at 4.77:1. Pinning it here
    // means that documented figure cannot drift from reality unnoticed.
    expect(measured.danger).toBeLessThan(5);
  });

  // KNOWN PRE-EXISTING GAP, not introduced by the token derivation work.
  //
  // Measured against white surface: --ui-color-border is 1.47:1 and
  // --ui-color-border-strong is 2.60:1, both below WCAG 2.1 SC 1.4.11's 3:1 for
  // non-text contrast. That matters because .ui-input / .ui-select /
  // .ui-textarea use --ui-color-border as the only visual boundary of the
  // control, which is exactly what 1.4.11 covers.
  //
  // Left failing-but-visible rather than silently threshold-lowered: raising
  // these tokens is a palette decision affecting every component's appearance,
  // so it needs a deliberate choice rather than a quiet edit here.
  test.fixme('non-text contrast: control borders meet 3:1', async ({ page }) => {
    const failures = await page.evaluate(MEASURE, {
      grid: ['oklch(51.1% 0.262 276.966)'],
      pair: { name: 'border on surface', fg: '--ui-color-border', bg: '--ui-color-surface', min: 3 },
    });
    expect(failures).toEqual([]);
  });
});
