import { expect, test } from '@playwright/test';
import { clickWhenStable } from './test-utils.js';

test.describe('FastBlocks UI smoke', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/demo/demo.html');
    await page.waitForLoadState('networkidle');
    // `networkidle` says the bytes arrived, not that the ES module finished
    // executing. Every test below depends on the enhancement layer being live,
    // and enhance.js publishes `window.fastBlocksUI` as its last boot step --
    // so that is the real readiness signal. Without this the tab test was
    // intermittently clicking before enhanceTabs() had bound, failing roughly
    // half of WebKit runs.
    await page.waitForFunction(() => Boolean(window.fastBlocksUI));

    // Neutralise `content-visibility: auto` for this spec.
    //
    // These are component smoke tests, not a test of lazy rendering -- that is
    // demo-layout.spec.js's job, including anchor landing with it enabled. But
    // offscreen `.demo-section`s swap their `contain-intrinsic-size` estimate
    // for real height as they intersect, and on this very tall page that can
    // land between a synthetic click's mousedown and mouseup. Focus moves (it
    // is set on mousedown) while no `click` event is ever dispatched, because
    // mouseup landed elsewhere -- so the handler is never called and the tab
    // silently fails to switch. Measured directly: activeElement was the tab
    // while aria-selected stayed false, in ~25% of WebKit runs.
    await page.addStyleTag({
      content: '.demo-section { content-visibility: visible !important; }',
    });
  });

  test('renders the demo and boots the enhancement layer', async ({ page }) => {
    await expect(page.getByRole('heading', { name: 'FastBlocks UI' })).toBeVisible();
    await expect(page.getByText('HTML/CSS-first components, semantic tokens, htmx-safe fragments, and optional enhancement JavaScript.')).toBeVisible();
    await expect(page.getByText('Source of truth:')).toBeVisible();
    const manifest = await page.evaluate(() =>
      fetch('/fastblocks_ui/manifest.json').then((response) => response.json()),
    );
    await expect(page.locator('[data-ui-component-list] .ui-badge')).toHaveCount(
      manifest.components.length,
    );
    await expect(page.getByRole('heading', { name: 'Validation' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Display name must be at least 3 characters.' })).toBeVisible();
    await expect(page.locator('#demo-display-name-error')).toBeVisible();
    // Scoped to the section. The demo renders validation_summary() twice on
    // purpose -- once standalone in the Validation Summary section, once
    // wired to a real field in Complete form example -- so an unscoped
    // getByText matches both and trips strict mode. The two assertions above
    // are about the live form, so this one belongs to the same section.
    await expect(
      page.getByLabel('Complete form example').getByText('Please correct the errors below.'),
    ).toBeVisible();
  });

  test('opens and closes the dialog', async ({ page }) => {
    await clickWhenStable(page.getByRole('button', { name: 'Open dialog' }));
    await expect(page.locator('#demo-dialog')).toHaveAttribute('open', '');
    await expect(page.locator('#demo-dialog')).toHaveAttribute('aria-hidden', 'false');

    await page.locator('#demo-dialog [data-ui-dialog-close]').click();
    await expect(page.locator('#demo-dialog')).not.toHaveAttribute('open', '');
    await expect(page.locator('#demo-dialog')).toHaveAttribute('aria-hidden', 'true');
  });

  test('toggles the dropdown', async ({ page }) => {
    await clickWhenStable(page.getByRole('button', { name: 'Toggle dropdown' }));
    await expect(page.locator('#demo-dropdown')).toBeVisible();
    // Open state is read from the panel, not the invoker: a popovertarget
    // button's expanded state is implicit ARIA and is never reflected as a DOM
    // attribute in any engine. See tests/e2e/dropdown.spec.js.
    expect(
      await page.locator('#demo-dropdown').evaluate((el) => el.matches(':popover-open')),
    ).toBe(true);
  });

  test('switches tabs and updates visible panels', async ({ page }) => {
    // Panel ids are the real tabs() helper's output (id-panel), not the old
    // hand-picked #demo-overview/#demo-details scheme -- see demo/demo.html and
    // tests/test_demo_parity.py.
    await expect(page.locator('#demo-overview-panel')).toBeVisible();
    await expect(page.locator('#demo-details-panel')).toBeHidden();

    await clickWhenStable(page.getByRole('tab', { name: 'Details' }));

    await expect(page.locator('#demo-overview-panel')).toBeHidden();
    await expect(page.locator('#demo-details-panel')).toBeVisible();
  });
});
