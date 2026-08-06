import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  defineFastBlocksCustomElements,
  enhanceDrawers,
  enhanceTabs,
  initFastBlocksUI,
} from '@fastblocks-ui/js/fastblocks-ui.js';

describe('FastBlocks UI enhancement layer', () => {
  let root;
  let cleanup;

  beforeEach(() => {
    root = document.createElement('div');
    document.body.appendChild(root);
  });

  afterEach(() => {
    cleanup?.();
    cleanup = undefined;
    root?.remove();
    root = undefined;
  });

  it('activates tabs and updates panels on click', () => {
    root.innerHTML = `
      <div data-ui-tabs>
        <div role="tablist">
          <button type="button" data-ui-tab-target="#panel-1" aria-selected="true">One</button>
          <button type="button" data-ui-tab-target="#panel-2" aria-selected="false">Two</button>
        </div>
        <section id="panel-1" data-ui-panel>First</section>
        <section id="panel-2" data-ui-panel hidden>Second</section>
      </div>
    `;

    cleanup = enhanceTabs(document);

    const tabs = root.querySelectorAll('[data-ui-tab-target]');
    const secondTab = tabs[1];
    secondTab.click();

    expect(tabs[0].getAttribute('aria-selected')).toBe('false');
    expect(tabs[1].getAttribute('aria-selected')).toBe('true');
    expect(root.querySelector('#panel-1').hidden).toBe(true);
    expect(root.querySelector('#panel-2').hidden).toBe(false);
    expect(document.activeElement).toBe(secondTab);
  });

  it('supports keyboard navigation for tabs', () => {
    root.innerHTML = `
      <div data-ui-tabs>
        <div role="tablist">
          <button type="button" data-ui-tab-target="#panel-1" aria-selected="true">One</button>
          <button type="button" data-ui-tab-target="#panel-2" aria-selected="false">Two</button>
        </div>
        <section id="panel-1" data-ui-panel>First</section>
        <section id="panel-2" data-ui-panel hidden>Second</section>
      </div>
    `;

    cleanup = enhanceTabs(document);

    const firstTab = root.querySelector('[data-ui-tab-target="#panel-1"]');
    firstTab.focus();
    firstTab.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true }));

    const secondTab = root.querySelector('[data-ui-tab-target="#panel-2"]');
    expect(secondTab.getAttribute('aria-selected')).toBe('true');
    expect(document.activeElement).toBe(secondTab);
  });

  it('returns a cleanup function from the combined initializer', () => {
    cleanup = initFastBlocksUI(document);
    expect(typeof cleanup).toBe('function');
  });

  it('defines lightweight custom elements and upgrades tabs', () => {
    defineFastBlocksCustomElements(window);

    root.innerHTML = `
      <ui-tabs class="ui-tabs" data-ui-tabs aria-label="Profile tabs">
        <div class="ui-tabs__list" role="tablist">
          <button type="button" class="ui-tabs__tab" data-ui-tab-target="#panel-1" aria-selected="true">One</button>
          <button type="button" class="ui-tabs__tab" data-ui-tab-target="#panel-2" aria-selected="false">Two</button>
        </div>
        <section id="panel-1" class="ui-tabs__panel" data-ui-panel>First</section>
        <section id="panel-2" class="ui-tabs__panel" data-ui-panel hidden>Second</section>
      </ui-tabs>
    `;

    const tabsHost = root.querySelector('ui-tabs');
    const secondTab = root.querySelector('[data-ui-tab-target="#panel-2"]');
    secondTab.click();

    expect(customElements.get('ui-tabs')).toBeTruthy();
    expect(tabsHost.hasAttribute('data-ui-tabs')).toBe(true);
    expect(secondTab.getAttribute('aria-selected')).toBe('true');
    expect(root.querySelector('#panel-2').hasAttribute('hidden')).toBe(false);
  });

  it('honors cancelable tab change events', () => {
    defineFastBlocksCustomElements(window);

    root.innerHTML = `
      <ui-tabs class="ui-tabs" data-ui-tabs aria-label="Profile tabs">
        <div class="ui-tabs__list" role="tablist">
          <button type="button" class="ui-tabs__tab" data-ui-tab-target="#panel-1" aria-selected="true">One</button>
          <button type="button" class="ui-tabs__tab" data-ui-tab-target="#panel-2" aria-selected="false">Two</button>
        </div>
        <section id="panel-1" class="ui-tabs__panel" data-ui-panel>First</section>
        <section id="panel-2" class="ui-tabs__panel" data-ui-panel hidden>Second</section>
      </ui-tabs>
    `;

    const tabsHost = root.querySelector('ui-tabs');
    tabsHost.addEventListener('ui-tab-change', (event) => event.preventDefault(), { once: true });

    const secondTab = root.querySelector('[data-ui-tab-target="#panel-2"]');
    secondTab.click();

    expect(secondTab.getAttribute('aria-selected')).toBe('false');
    expect(root.querySelector('#panel-2').hasAttribute('hidden')).toBe(true);
  });

});

// jsdom (as of the version vitest pulls in here) implements neither
// `window.matchMedia` -- it is `undefined`, not a no-op -- nor the Popover API:
// `element.matches(':popover-open')` raises `SyntaxError: unknown pseudo-class
// selector`, and `hidePopover` is absent. So both are stubbed per test.
//
// The stub records the *media string* and *event type* it was handed rather
// than just counting calls, so these tests can assert the listener is
// registered against each drawer's own `data-ui-drawer-breakpoint` rather than
// merely re-proving that the stub works. `removeEventListener` really removes,
// so the cleanup assertion has something to observe.
describe('enhanceDrawers', () => {
  let registrations;
  let realMatchMedia;
  let realCSS;
  let cleanup;

  const fireChange = (matches) => {
    registrations.forEach(({ handler }) => handler({ matches }));
  };

  // Stand in for a browser that supports the Popover API *and* can select
  // `:popover-open`, for the given state. Both are stubbed because the two
  // capabilities come from independent implementations in this project's own
  // test stack (jsdom for the element API, nwsapi for the selector engine) --
  // see the "even if hidePopover exists" test below for why that split
  // matters.
  const withPopoverSupport = (drawer, { open }) => {
    window.CSS = { supports: (condition) => condition === 'selector(:popover-open)' };
    drawer.hidePopover = vi.fn();
    drawer.matches = (selector) => open && selector === ':popover-open';
    return drawer;
  };

  beforeEach(() => {
    registrations = [];
    realMatchMedia = window.matchMedia;
    realCSS = window.CSS;
    window.matchMedia = (media) => ({
      media,
      matches: false,
      addEventListener: (type, handler) => {
        registrations.push({ media, type, handler });
      },
      removeEventListener: (type, handler) => {
        const index = registrations.findIndex(
          (entry) => entry.media === media && entry.type === type && entry.handler === handler,
        );
        if (index !== -1) {
          registrations.splice(index, 1);
        }
      },
    });
  });

  afterEach(() => {
    cleanup?.();
    cleanup = undefined;
    window.matchMedia = realMatchMedia;
    window.CSS = realCSS;
  });

  it('listens on a query built from each drawer\'s own breakpoint', () => {
    document.body.innerHTML = `
      <div class="ui-drawer" id="narrow" popover data-ui-drawer-breakpoint="900"></div>
      <div class="ui-drawer" id="wide" popover data-ui-drawer-breakpoint="1216"></div>
    `;

    cleanup = enhanceDrawers();

    expect(registrations.map((entry) => entry.media)).toEqual([
      '(min-width: 900px)',
      '(min-width: 1216px)',
    ]);
    expect(registrations.map((entry) => entry.type)).toEqual(['change', 'change']);
  });

  it('closes an open drawer when the viewport becomes wide', () => {
    document.body.innerHTML =
      '<div class="ui-drawer" id="d" popover data-ui-drawer-breakpoint="1024"></div>';
    const drawer = withPopoverSupport(document.getElementById('d'), { open: true });

    cleanup = enhanceDrawers();
    fireChange(true);

    expect(drawer.hidePopover).toHaveBeenCalledTimes(1);
  });

  it('leaves an open drawer alone when the viewport becomes narrow', () => {
    document.body.innerHTML =
      '<div class="ui-drawer" id="d" popover data-ui-drawer-breakpoint="1024"></div>';
    const drawer = withPopoverSupport(document.getElementById('d'), { open: true });

    cleanup = enhanceDrawers();
    fireChange(false);

    expect(drawer.hidePopover).not.toHaveBeenCalled();
  });

  // `hidePopover()` on a popover that is not showing throws InvalidStateError,
  // so the open check is load-bearing, not a micro-optimisation.
  it('does not close a drawer that is already closed', () => {
    document.body.innerHTML =
      '<div class="ui-drawer" id="d" popover data-ui-drawer-breakpoint="1024"></div>';
    const drawer = withPopoverSupport(document.getElementById('d'), { open: false });

    cleanup = enhanceDrawers();
    fireChange(true);

    expect(drawer.hidePopover).not.toHaveBeenCalled();
  });

  it('ignores drawers without a breakpoint attribute', () => {
    document.body.innerHTML = '<div class="ui-drawer" id="e" popover></div>';

    cleanup = enhanceDrawers();

    expect(registrations).toHaveLength(0);
  });

  it('ignores a breakpoint that is not a number', () => {
    document.body.innerHTML =
      '<div class="ui-drawer" id="e" popover data-ui-drawer-breakpoint="wide"></div>';

    cleanup = enhanceDrawers();

    expect(registrations).toHaveLength(0);
  });

  it('does not throw when no drawers are present', () => {
    document.body.innerHTML = '';

    expect(() => {
      cleanup = enhanceDrawers();
    }).not.toThrow();
  });

  // Progressive enhancement: in an engine without the Popover API the drawer is
  // never in the top layer, so there is nothing to dismiss -- and probing
  // `:popover-open` there is a selector syntax error, not `false`.
  it('does not throw in an engine without the Popover API', () => {
    document.body.innerHTML =
      '<div class="ui-drawer" id="legacy" data-ui-drawer-breakpoint="1024"></div>';

    cleanup = enhanceDrawers();

    expect(() => fireChange(true)).not.toThrow();
  });

  // The exact failure mode the old `typeof drawer.hidePopover === 'function'`
  // proxy risked: an engine can implement the Popover API's imperative
  // methods before its selector engine understands `:popover-open`, so
  // `hidePopover` existing must never be read as selector support. Real
  // `.matches(':popover-open')` throws a SyntaxError in that situation rather
  // than returning false -- this drawer's `matches` reproduces that.
  it('does not probe :popover-open when the engine cannot select it, even if hidePopover exists', () => {
    document.body.innerHTML =
      '<div class="ui-drawer" id="d" popover data-ui-drawer-breakpoint="1024"></div>';
    const drawer = document.getElementById('d');
    drawer.hidePopover = vi.fn();
    drawer.matches = () => {
      throw new Error('unknown pseudo-class selector ":popover-open"');
    };

    cleanup = enhanceDrawers();

    expect(() => fireChange(true)).not.toThrow();
    expect(drawer.hidePopover).not.toHaveBeenCalled();
  });

  // Unlike enhanceTabs, which delegates clicks via
  // `closest()` + `isWithinRoot()` and so keep working when `root` IS the
  // matched element, this function has no click delegation -- its whole job
  // is registering a matchMedia listener per drawer up front via
  // `querySelectorAll`, which never matches the element it was called on.
  it('enhances the root element itself when it is a drawer, not only its descendants', () => {
    document.body.innerHTML =
      '<div class="ui-drawer" id="d" popover data-ui-drawer-breakpoint="1024"></div>';
    const root = document.getElementById('d');

    cleanup = enhanceDrawers(root);

    expect(registrations).toHaveLength(1);
  });

  it('removes every listener it added on cleanup', () => {
    document.body.innerHTML = `
      <div class="ui-drawer" id="a" popover data-ui-drawer-breakpoint="900"></div>
      <div class="ui-drawer" id="b" popover data-ui-drawer-breakpoint="1024"></div>
    `;

    const teardown = enhanceDrawers();
    expect(registrations).toHaveLength(2);

    teardown();

    expect(registrations).toHaveLength(0);
  });

  it('is wired into initFastBlocksUI and torn down by its cleanup', () => {
    document.body.innerHTML =
      '<div class="ui-drawer" id="d" popover data-ui-drawer-breakpoint="1024"></div>';

    const teardown = initFastBlocksUI(document);
    expect(registrations).toHaveLength(1);

    teardown();

    expect(registrations).toHaveLength(0);
  });
});

describe('enhanceDrawers without matchMedia', () => {
  it('does not take the other enhancers down with it', async () => {
    const { enhanceDrawers, initFastBlocksUI } = await import(
      '@fastblocks-ui/js/fastblocks-ui.js'
    );
    const saved = window.matchMedia;
    // jsdom does not implement matchMedia; other suites stub it. Remove any
    // stub so this reproduces a DOM that genuinely lacks it.
    delete window.matchMedia;
    try {
      document.body.innerHTML =
        '<div class="ui-drawer" id="d" popover data-ui-drawer-breakpoint="1024"></div>';
      // Without the guard this throws, and initFastBlocksUI's single array
      // literal is abandoned -- tabs, dialogs and menus never get enhanced.
      expect(() => enhanceDrawers()).not.toThrow();
      let teardown;
      expect(() => {
        teardown = initFastBlocksUI(document);
      }).not.toThrow();
      expect(typeof teardown).toBe('function');
      teardown();
    } finally {
      if (saved) window.matchMedia = saved;
    }
  });
});

describe('public export surface after the platform migration', () => {
  it('exports exactly the four entry points that still need JavaScript', async () => {
    const mod = await import('../../fastblocks_ui/static/js/fastblocks-ui.js');
    expect(Object.keys(mod).sort()).toEqual([
      'defineFastBlocksCustomElements',
      'enhanceDrawers',
      'enhanceTabs',
      'initFastBlocksUI',
    ]);
  });

  it('no longer registers ui-dialog or ui-dropdown custom elements', async () => {
    const registered = [];
    const registry = {
      get: () => undefined,
      define: (name) => registered.push(name),
    };
    const { defineFastBlocksCustomElements } = await import(
      '../../fastblocks_ui/static/js/enhance.js'
    );
    defineFastBlocksCustomElements({ customElements: registry });
    expect(registered).toContain('ui-tabs');
    expect(registered).not.toContain('ui-dialog');
    expect(registered).not.toContain('ui-dropdown');
  });
});

describe('dialog autoshow', () => {
  it('opens a dialog marked data-ui-dialog-autoshow', async () => {
    document.body.innerHTML = '<dialog id="d" data-ui-dialog-autoshow></dialog>';
    const dialog = document.getElementById('d');
    dialog.showModal = vi.fn(function () {
      this.setAttribute('open', '');
    });
    const { initFastBlocksUI } = await import('../../fastblocks_ui/static/js/enhance.js');
    initFastBlocksUI(document);
    expect(dialog.showModal).toHaveBeenCalledTimes(1);
  });

  it('is a no-op for a dialog that is already open', async () => {
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

  it('reopens after an htmx swap replaces the markup', async () => {
    document.body.innerHTML = '<div></div>';
    const { initFastBlocksUI } = await import('../../fastblocks_ui/static/js/enhance.js');
    initFastBlocksUI(document);

    document.body.innerHTML = '<dialog id="d" data-ui-dialog-autoshow></dialog>';
    const dialog = document.getElementById('d');
    dialog.showModal = vi.fn(function () {
      this.setAttribute('open', '');
    });
    document.dispatchEvent(new Event('htmx:afterSwap'));
    expect(dialog.showModal).toHaveBeenCalledTimes(1);
  });
});
