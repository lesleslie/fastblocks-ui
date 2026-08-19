import { expect, test } from '@playwright/test';
import { compositeRatio, installProbe } from './contrast-utils.js';

const PAGE = '/tests/e2e/fixtures/token-contrast.html';

const BACKDROPS = ['aurora', 'noise', 'pattern-dots'];

test.describe('Backdrop contrast (WCAG AA, 4.5:1)', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(PAGE);
    await installProbe(page);
  });

  for (const theme of ['light', 'dark']) {
    for (const backdrop of [null, [0, 0, 0], [255, 255, 255]]) {
      for (const effect of BACKDROPS) {
        test(`${theme} theme, effect=${effect}, backdrop=${backdrop?.join(',') ?? 'none'} clears 4.5:1`, async ({
          page,
        }) => {
          // Add a backdrop element to the test fixture
          await page.evaluate(({ effect }) => {
            const el = document.createElement('div');
            el.className = `has-${effect}`;
            el.setAttribute('data-test-backdrop', 'true');
            document.body.appendChild(el);
          }, { effect });
          const ratio = await compositeRatio(page, {
            fg: '--ui-color-text',
            bg: `--ui-${effect === 'aurora' ? 'aurora-stop-1' : 'color-surface'}`,
            backdrop: backdrop || [128, 128, 128],
            theme,
          });
          expect(
            ratio,
            `${theme}/${effect} = ${ratio.toFixed(2)}:1`,
          ).toBeGreaterThanOrEqual(4.5);
        });
      }
    }
  }
});
