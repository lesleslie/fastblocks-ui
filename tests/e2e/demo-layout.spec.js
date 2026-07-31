import { expect, test } from '@playwright/test';

// Coverage for the full-bleed demo shell: the sticky navbar and its
// scroll-driven reveal, and the table of contents that is an off-canvas
// `ui-drawer` below 1024px and an in-flow sticky column above it -- one DOM
// node, one id, both roles.
//
// Almost none of this is observable from Python. The markup is byte-identical
// whether the CSS works or not, so every assertion below that could be written
// against markup is written against COMPUTED STYLE instead: the whole class of
// bug this file exists to catch is correct markup with wrong computed layout.
const PAGE = '/demo/demo.html';

// The shell's own burger, identified by its opt-in class rather than by
// where it sits. demo.html renders three
// burgers -- the navbar's (`popovertarget="site-nav"`) plus two showcase
// examples that both target `#demo-drawer` -- so `.ui-burger` alone is a
// Playwright strict-mode violation. Measured 2026-07-31 in Chrome 150:
// `document.querySelectorAll('.ui-burger').length === 3`.
const SHELL_BURGER = '.ui-burger.is-shell-toggle';

test.describe('drawer below the breakpoint', () => {
  test.use({ viewport: { width: 768, height: 900 } });

  test('the aside computes as an off-canvas fixed panel', async ({ page }) => {
    await page.goto(PAGE);

    const style = await page.locator('#site-nav').evaluate((el) => {
      const cs = getComputedStyle(el);
      return { position: cs.position, display: cs.display, translate: cs.translate };
    });

    // `display: none` here is the UA's `[popover]:not(:popover-open)` rule,
    // which layout.css overrides at >=1024px and deliberately leaves alone
    // below it. `translate: 100%` is the off-screen park position.
    expect(style).toEqual({ position: 'fixed', display: 'none', translate: '100%' });
  });

  test('the burger opens the drawer and its bars morph into a close icon', async ({ page }) => {
    await page.goto(PAGE);
    const burger = page.locator(SHELL_BURGER);
    await expect(burger).toBeVisible();
    await expect(page.locator('#site-nav')).toBeHidden();

    await burger.click();

    await expect(page.locator('#site-nav')).toBeVisible();

    // Asserted with the drawer OPEN, which is the state that matters. NOT
    // `toHaveAttribute('aria-expanded', 'true')`: a `popovertarget` invoker
    // does get an expanded state, but it is *implicit* ARIA -- computed into
    // the accessibility tree and never reflected as a DOM content attribute.
    // Measured in Chrome 150 with this popover open: `getAttribute` returns
    // null. This assertion is the canary for that platform fact, because
    // components.css selects the open state from the drawer's `:popover-open`
    // precisely since `.ui-burger[aria-expanded="true"]` can never match. If a
    // future Chrome starts reflecting the attribute, this fails and the
    // workaround can be revisited rather than silently outliving its reason.
    await expect(burger).not.toHaveAttribute('aria-expanded');
    expect(await page.locator('#site-nav').evaluate((el) => el.matches(':popover-open'))).toBe(
      true,
    );

    // The behaviour the `:root:has(.ui-drawer:popover-open)` selector exists to
    // produce. `toHaveCSS` retries, which is required: the bars are mid-flight
    // immediately after the click (measured 3.2deg one frame in) and settle at
    // 45deg once the transition finishes.
    const bars = page.locator(`${SHELL_BURGER} .ui-burger__bar`);
    await expect(bars.nth(0)).toHaveCSS('rotate', '45deg');
    await expect(bars.nth(1)).toHaveCSS('opacity', '0');
    await expect(bars.nth(2)).toHaveCSS('rotate', '-45deg');
  });

  test('Escape closes the drawer and returns focus to the burger', async ({ page }) => {
    await page.goto(PAGE);
    // Focus + keyboard activation, not `.click()`: WebKit does not give a
    // `<button>` focus on a mouse click by default (long-standing Safari
    // behavior, independent of the Popover API) -- measured in WebKit 26.5,
    // `.click()` left `document.activeElement` on `<body>`, so there was
    // nothing for the popover's focus-return to return TO, and this
    // assertion failed for a reason unrelated to what it tests. This is also
    // the more correct methodology regardless of engine: the assertion is
    // about the keyboard-Escape contract, so the precondition should be
    // keyboard-driven focus, not a click's incidental focus state.
    await page.locator(SHELL_BURGER).focus();
    await page.keyboard.press('Enter');
    await expect(page.locator('#site-nav')).toBeVisible();

    await page.keyboard.press('Escape');

    await expect(page.locator('#site-nav')).toBeHidden();
    // Focus return is the Popover API's job, not author JavaScript's -- there
    // is deliberately no nav-toggle script. This asserts the browser is
    // actually carrying that half of the contract for this markup.
    await expect(page.locator(SHELL_BURGER)).toBeFocused();
  });

  test('clicking the backdrop light-dismisses the drawer', async ({ page }) => {
    await page.goto(PAGE);
    await page.locator(SHELL_BURGER).click();
    await expect(page.locator('#site-nav')).toBeVisible();

    // The panel parks against the inline-end edge, so x=20 is over the
    // backdrop at every viewport width this describe block uses.
    await page.mouse.click(20, 400);

    await expect(page.locator('#site-nav')).toBeHidden();
  });
});

test.describe('sticky column above the breakpoint', () => {
  test.use({ viewport: { width: 1280, height: 900 } });

  test('the same node computes as an in-flow sticky column', async ({ page }) => {
    await page.goto(PAGE);

    await expect(page.locator(SHELL_BURGER)).toBeHidden();

    const state = await page.locator('#site-nav').evaluate((el) => {
      const cs = getComputedStyle(el);
      return {
        position: cs.position,
        display: cs.display,
        translate: cs.translate,
        // Still a popover element, still the same id -- that is the point.
        // `display: block` proves layout.css beat the UA's
        // `[popover]:not(:popover-open) { display: none }`, which is what
        // makes one node in two roles possible without a second id.
        isPopover: el.hasAttribute('popover'),
        isOpen: el.matches(':popover-open'),
      };
    });

    expect(state).toEqual({
      position: 'sticky',
      display: 'block',
      translate: 'none',
      isPopover: true,
      isOpen: false,
    });
  });

  test('in-page anchors land below the fixed bar, not under it', async ({ page }) => {
    await page.goto(PAGE);
    await page.locator('#site-nav a[href="#table"]').click();

    // The offset comes from one declaration --
    // `:root:has(> body > .ui-navbar.is-sticky) { scroll-padding-top }` --
    // not from per-section `scroll-margin-top`. Delete it and the section
    // lands at top: 0, i.e. a negative gap, and the lower bound below fails.
    //
    // Polled rather than slept: the demo's sections carry
    // `content-visibility: auto`, so the document height (and therefore the
    // resolved scroll position) settles over a few frames after the click.
    const gap = () =>
      page.evaluate(() => {
        const bar = document.querySelector('.ui-navbar.is-sticky').getBoundingClientRect();
        const section = document.querySelector('#table').getBoundingClientRect();
        return section.top - bar.bottom;
      });

    await expect.poll(gap, { timeout: 10000 }).toBeGreaterThanOrEqual(0);
    // Upper bound too, so this cannot pass merely because the anchor landed
    // *somewhere* below the bar. Measured gap: 14.8px -- the 72px
    // scroll-padding-top less the 56px bar, less subpixel scroll rounding.
    expect(await gap()).toBeLessThan(40);
  });
});

test('a drawer left open across the breakpoint is closed by the enhancement layer', async ({
  page,
}) => {
  await page.setViewportSize({ width: 768, height: 900 });
  await page.goto(PAGE);
  await page.locator(SHELL_BURGER).click();
  await expect(page.locator('#site-nav')).toBeVisible();

  await page.setViewportSize({ width: 1280, height: 900 });

  // The one drawer behaviour the Popover API cannot express declaratively, so
  // `enhanceDrawers` reads `data-ui-drawer-breakpoint` and calls
  // `hidePopover()`. Nothing in the CSS closes it: at this width
  // `.ui-shell__aside[popover]` computes `display: block` either way, so a
  // still-open popover would sit in the top layer with a scrim over the page
  // and `toBeVisible()` would not notice. Assert the top-layer state itself.
  await expect
    .poll(() => page.locator('#site-nav').evaluate((el) => el.matches(':popover-open')))
    .toBe(false);
});

test.describe('sticky navbar reveal', () => {
  test.use({ viewport: { width: 1280, height: 900 } });

  test('scroll-driven path: hidden at rest, revealed as the hero exits', async ({
    page,
    browserName,
  }) => {
    // Set explicitly, not left to Playwright's default. The reveal is gated on
    // `@media (prefers-reduced-motion: no-preference)`, and the machine this
    // suite was written on has macOS "Reduce motion" switched ON -- so relying
    // on the ambient setting would silently move this test onto the fallback
    // branch and make it pass for the wrong reason.
    await page.emulateMedia({ reducedMotion: 'no-preference' });
    await page.goto(PAGE);

    const supported = await page.evaluate(
      () => CSS.supports('animation-timeline', 'view()') && CSS.supports('timeline-scope', 'none'),
    );
    // Both renderings are supported; Firefox stable still has scroll-driven
    // animations behind a flag and takes the always-visible branch, which the
    // next test covers. This config runs Chrome, where the feature is present.
    test.skip(!supported, 'no scroll-driven animation support in this browser');

    // WebKit reports `supported` above as true: `animation-timeline` and
    // `timeline-scope` both compute correctly, and (measured in WebKit 26.5)
    // the animation is a live `ViewTimeline` whose continuous properties track
    // scroll progress exactly as promised -- at rest, opacity computed "0" and
    // translate "0px -99.999985%", matching the `from` keyframe almost
    // exactly (progress ~1.7e-7). But the discrete `visibility` keyframe does
    // not apply: it stayed "visible" instead of the `from` keyframe's
    // "hidden". This is narrower than a general discrete-property gap -- a
    // synthetic `Element.animate()` probe with the identical keyframes on a
    // plain (non-timeline) animation correctly computed "hidden" at progress
    // 0 in the same WebKit build, so the defect is specific to a CSS-declared
    // `@keyframes` animation driven by a named view-timeline. Skipped rather
    // than asserted wrong: a verified WebKit engine limitation, not a
    // codebase defect -- the fallback branch below is what WebKit users with
    // `prefers-reduced-motion: reduce` set already get, and is a supported
    // rendering in its own right.
    test.skip(
      browserName === 'webkit',
      'WebKit does not apply the discrete visibility keyframe within a view-timeline-driven animation -- see comment above',
    );

    const bar = page.locator('.ui-navbar.is-sticky');

    await expect(bar).toHaveCSS('opacity', '0');
    await expect(bar).toHaveCSS('visibility', 'hidden');

    const atRest = await page.evaluate(() => {
      const el = document.querySelector('.ui-navbar.is-sticky');
      const animation = el.getAnimations()[0];
      return {
        animations: el.getAnimations().length,
        timeline: animation?.timeline?.constructor?.name ?? null,
        // `body:has(> .ui-navbar.is-sticky):has(> .ui-hero)` drops the
        // reserved space on this path, because the hero already fills the
        // first screenful and the bar is not there yet.
        bodyPadTop: parseFloat(getComputedStyle(document.body).paddingBlockStart),
      };
    });
    // A named view timeline declared by more than one element in scope
    // resolves to an INACTIVE timeline and applies none of its keyframes, so
    // `timeline` being a live `ViewTimeline` is the assertion that catches the
    // `body > .ui-hero` scoping regressing to a bare `.ui-hero` -- the demo
    // renders nine heroes.
    expect(atRest).toEqual({ animations: 1, timeline: 'ViewTimeline', bodyPadTop: 0 });

    await page.evaluate(() => {
      const hero = document.querySelector('body > .ui-hero');
      window.scrollTo(0, hero.getBoundingClientRect().height + 200);
    });

    await expect(bar).toHaveCSS('opacity', '1');
    await expect(bar).toHaveCSS('visibility', 'visible');
  });

  test('fallback path: reduced motion keeps the bar visible and reserves its space', async ({
    page,
  }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.goto(PAGE);

    const bar = page.locator('.ui-navbar.is-sticky');
    await expect(bar).toHaveCSS('opacity', '1');
    await expect(bar).toHaveCSS('visibility', 'visible');

    const state = await page.evaluate(() => {
      const el = document.querySelector('.ui-navbar.is-sticky');
      return {
        animations: el.getAnimations().length,
        barHeight: el.getBoundingClientRect().height,
        bodyPadTop: parseFloat(getComputedStyle(document.body).paddingBlockStart),
      };
    });

    // Zero animations is the load-bearing half: base.css's blanket
    // `animation-duration: 0.01ms !important` does NOT neutralise a
    // progress-based timeline, so the gate has to be the `no-preference`
    // media query itself. Drop that gate and a reduced-motion user gets the
    // whole scroll-linked slide -- and this count becomes 1.
    expect(state.animations).toBe(0);
    // On this path the bar is always painted, so its space must be reserved or
    // it buries the top of the page. Compared against the bar's own measured
    // height rather than a hard-coded 56px, so retuning
    // `--ui-navbar-height` does not require editing this test.
    expect(state.bodyPadTop).toBeCloseTo(state.barHeight, 1);
    expect(state.barHeight).toBeGreaterThan(0);
  });
});
