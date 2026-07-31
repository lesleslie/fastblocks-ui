// `content-visibility: auto` sections (demo/demo.html's `.demo-section`)
// replace their `contain-intrinsic-size` placeholder with real rendered
// size once they intersect the viewport, and that swap can land on the
// frame(s) immediately after Playwright's own click-stability check
// passes -- late enough to still shift a control's position out from
// under a synthetic click. Measured on this project's very tall demo
// page (many `.demo-section`s, real heights ranging ~207px-2584px
// against a single 640px `contain-intrinsic-size` placeholder estimate):
// a bare `.click()` on a control ~30 sections down the page landed on
// `<main>` instead of the intended button in Firefox and WebKit, because
// the click fired before the page's true layout had settled. Chromium
// was not observed to reproduce this.
//
// Scrolling first and then polling the bounding box for two consecutive
// identical reads (not a fixed sleep, which would either race the same
// way or pad every test with dead time) waits out exactly that settle.
export async function clickWhenStable(locator, options = {}) {
  await locator.scrollIntoViewIfNeeded();
  let previous = await locator.boundingBox();
  for (let attempt = 0; attempt < 20; attempt += 1) {
    await locator.page().waitForTimeout(50);
    const current = await locator.boundingBox();
    if (
      previous &&
      current &&
      previous.x === current.x &&
      previous.y === current.y &&
      previous.width === current.width &&
      previous.height === current.height
    ) {
      break;
    }
    previous = current;
  }
  await locator.click(options);
}
