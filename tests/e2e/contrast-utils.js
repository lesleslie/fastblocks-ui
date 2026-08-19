/**
 * Colour measurement for the WCAG contrast specs.
 *
 * This exists because the maths was previously copy-pasted into six separate
 * `page.evaluate` bodies, and every bug in it had to be found six times. Three
 * were found the hard way and are encoded here once:
 *
 * 1. **Never parse a computed colour string.** `getComputedStyle` reports
 *    colours in their AUTHORED space -- a token written in oklch comes back as
 *    `oklch(0.511 0.262 276.966)`, never `rgb(...)`, in all three engines.
 *    Reading the first three numbers as 0-255 channels yields confident
 *    nonsense (0.511, 0.262, 276.966 as R/G/B). Everything here rasterises
 *    through a 1x1 canvas instead, which returns exact sRGB bytes and is also
 *    the space WCAG 2.x is defined over.
 *
 * 2. **An undefined custom property does not fail loudly.** `color:
 *    var(--missing)` is invalid at computed-value time, so `color` simply
 *    inherits -- usually black, which sails past a `>= 3` assertion while
 *    measuring nothing. `readToken` throws instead.
 *
 * 3. **Shadow colours are not all `rgb()`.** Engines serialise each shadow's
 *    colour in its authored space too, so a regex looking only for `rgb(...)`
 *    silently picks the wrong layer of a multi-shadow value.
 */

/**
 * Install the in-page measurement helpers on `window.__uiContrast`.
 *
 * Call once per navigation, before any of the read helpers below.
 */
export async function installProbe(page) {
  await page.evaluate(() => {
    const canvas = document.createElement('canvas');
    canvas.width = 1;
    canvas.height = 1;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    const probe = document.createElement('div');
    document.body.appendChild(probe);

    // Rasterise any CSS colour to exact sRGB bytes. Handles oklch(),
    // color-mix(), color(srgb ...) and relative colour syntax uniformly,
    // because the canvas resolves whatever the browser would actually paint.
    const rasterise = (cssColour) => {
      ctx.clearRect(0, 0, 1, 1);
      ctx.fillStyle = cssColour;
      ctx.fillRect(0, 0, 1, 1);
      const [r, g, b, a] = ctx.getImageData(0, 0, 1, 1).data;
      return [r, g, b, a];
    };

    const luminance = ([r, g, b]) => {
      const channel = (v) => {
        const s = v / 255;
        return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
      };
      return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b);
    };

    window.__uiContrast = {
      rasterise,
      luminance,

      /** sRGB bytes for a custom property. Throws if the token is undefined. */
      readToken(token) {
        const declared = getComputedStyle(document.documentElement)
          .getPropertyValue(token)
          .trim();
        if (declared === '') {
          throw new Error(
            `custom property ${token} is not defined -- any ratio measured from ` +
              `it would be meaningless, because color: var(--missing) inherits ` +
              `rather than failing`,
          );
        }
        probe.style.color = `var(${token})`;
        return rasterise(getComputedStyle(probe).color);
      },

      /** sRGB bytes for a computed property of an element. */
      readProperty(selector, property) {
        const el = document.querySelector(selector);
        if (!el) {
          throw new Error(`no element matches ${selector}`);
        }
        return rasterise(getComputedStyle(el)[property]);
      },

      /**
       * sRGB bytes for the LAST colour in an element's box-shadow.
       *
       * Matches any `fn(...)`, not just `rgb(...)`: a shadow colour authored in
       * oklch serialises as `oklch(...)`, and an rgb-only regex would pick an
       * earlier layer (e.g. a focus ring) instead of the intended one.
       */
      readShadowColour(selector) {
        const el = document.querySelector(selector);
        if (!el) {
          throw new Error(`no element matches ${selector}`);
        }
        const colours = getComputedStyle(el).boxShadow.match(/[a-z]+\([^)]*\)/g);
        if (!colours || colours.length === 0) {
          throw new Error(`${selector} has no box-shadow colour to measure`);
        }
        return rasterise(colours[colours.length - 1]);
      },

      ratio(a, b) {
        const [x, y] = [luminance(a), luminance(b)];
        return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05);
      },

      /** Set the theme and return the previous value, for restoration. */
      setTheme(mode) {
        const previous = document.documentElement.getAttribute('data-theme');
        document.documentElement.setAttribute('data-theme', mode);
        return previous;
      },

      /**
       * Composite a CSS-colour over a backdrop RGB tuple, returning the
       * sRGB bytes of the result. `bg` is rasterised as a CSS colour so
       * oklch()/color-mix()/relative colour syntax all resolve uniformly.
       */
      compositeOver(cssColour, backdropRgb) {
        const [r, g, b, a] = rasterise(cssColour);
        const alpha = a / 255;
        const comp = (top, bottom) =>
          Math.round(top * alpha + bottom * (1 - alpha));
        return [
          comp(r, backdropRgb[0]),
          comp(g, backdropRgb[1]),
          comp(b, backdropRgb[2]),
        ];
      },
    };
  });
}

/** Contrast ratio between two custom properties, optionally under a theme. */
export function tokenRatio(page, fgToken, bgToken, theme) {
  return page.evaluate(
    ([fg, bg, mode]) => {
      const c = window.__uiContrast;
      if (mode) {
        c.setTheme(mode);
      }
      return c.ratio(c.readToken(fg), c.readToken(bg));
    },
    [fgToken, bgToken, theme ?? null],
  );
}

/** Contrast between an element's rendered edge and the page surface. */
export function edgeRatio(page, selector, source = 'border') {
  return page.evaluate(
    ([sel, kind]) => {
      const c = window.__uiContrast;
      const edge =
        kind === 'box-shadow' ? c.readShadowColour(sel) : c.readProperty(sel, 'borderTopColor');
      return c.ratio(edge, c.readToken('--ui-color-surface'));
    },
    [selector, source],
  );
}

/**
 * Sweep a brand-colour grid through one token pair, returning only failures.
 *
 * Runs entirely in-page: 185 colours x 2 tokens would otherwise be ~370 round
 * trips per pair.
 */
export function gridFailures(page, { grid, fg, bg, min, input = '--ui-color-primary' }) {
  return page.evaluate(
    ({ grid: colours, fg: fgToken, bg: bgToken, min: threshold, input: inputToken }) => {
      const c = window.__uiContrast;
      const root = document.documentElement;
      const failures = [];
      for (const brand of colours) {
        root.style.setProperty(inputToken, brand);
        const ratio = c.ratio(c.readToken(fgToken), c.readToken(bgToken));
        if (ratio < threshold) {
          failures.push({ brand, ratio: Math.round(ratio * 100) / 100 });
        }
      }
      root.style.removeProperty(inputToken);
      return failures;
    },
    { grid, fg, bg, min, input },
  );
}

/** Format a failure list into an assertion message that names real inputs. */
export function describeFailures(failures, total, min) {
  return (
    `${failures.length}/${total} brand colours fall below ${min}:1\n` +
    failures
      .slice(0, 10)
      .map((f) => `  ${f.brand} -> ${f.ratio}:1`)
      .join('\n')
  );
}

/**
 * Contrast ratio between a foreground token and a background token,
 * computed against the composited background a user actually sees.
 *
 * `bg` is alpha-composited over `backdrop` (an `[r, g, b]` 0-255 tuple)
 * before the ratio is calculated, so an alpha'd surface over a colored
 * backdrop is measured against the colour the user sees, not the
 * colour the source code names. Mirrors the canvas probe's oklch/
 * color-mix path so the same expression used in the stylesheet is
 * what gets measured.
 */
export function compositeRatio(page, { fg, bg, backdrop, theme }) {
  return page.evaluate(
    ([fgToken, bgToken, bgRgb, mode]) => {
      const c = window.__uiContrast;
      if (mode) {
        c.setTheme(mode);
      }
      const fgRgb = c.readToken(fgToken);
      const composite = c.compositeOver(c.readToken(bgToken), bgRgb);
      return c.ratio(fgRgb, composite);
    },
    [fg, bg, backdrop, theme ?? null],
  );
}
