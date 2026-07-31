import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  defineFastBlocksCustomElements,
  enhanceDialogs,
  enhanceDrawers,
  enhanceMenus,
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

  it('opens and closes dialogs with focus restoration', () => {
    root.innerHTML = `
      <button type="button" data-ui-dialog-trigger aria-controls="test-dialog" aria-expanded="false">
        Open dialog
      </button>
      <dialog id="test-dialog" data-ui-dialog aria-hidden="true" aria-labelledby="dialog-title">
        <h2 id="dialog-title">Dialog title</h2>
        <button type="button" data-ui-dialog-close>Close</button>
      </dialog>
    `;

    cleanup = enhanceDialogs(document);

    const trigger = root.querySelector('[data-ui-dialog-trigger]');
    const dialog = root.querySelector('#test-dialog');
    const closeButton = root.querySelector('[data-ui-dialog-close]');

    trigger.focus();
    trigger.click();

    expect(dialog.hasAttribute('open')).toBe(true);
    expect(dialog.getAttribute('aria-hidden')).toBe('false');
    expect(trigger.getAttribute('aria-expanded')).toBe('true');
    expect(document.activeElement).toBe(closeButton);

    closeButton.click();

    expect(dialog.hasAttribute('open')).toBe(false);
    expect(dialog.getAttribute('aria-hidden')).toBe('true');
    expect(trigger.getAttribute('aria-expanded')).toBe('false');
    expect(document.activeElement).toBe(trigger);
  });

  it('dispatches ui-dialog-* events on the plain (function-path) dialog element (WS-12)', () => {
    root.innerHTML = `
      <button type="button" data-ui-dialog-trigger aria-controls="event-dialog" aria-expanded="false">
        Open dialog
      </button>
      <dialog id="event-dialog" data-ui-dialog aria-hidden="true">
        <button type="button" data-ui-dialog-close>Close</button>
      </dialog>
    `;

    cleanup = enhanceDialogs(document);

    const trigger = root.querySelector('[data-ui-dialog-trigger]');
    const dialog = root.querySelector('#event-dialog');
    const closeButton = root.querySelector('[data-ui-dialog-close]');

    const events = [];
    ['ui-dialog-open', 'ui-dialog-opened', 'ui-dialog-close', 'ui-dialog-closed'].forEach((name) => {
      dialog.addEventListener(name, () => events.push(name));
    });

    trigger.click();
    closeButton.click();

    expect(events).toEqual([
      'ui-dialog-open',
      'ui-dialog-opened',
      'ui-dialog-close',
      'ui-dialog-closed',
    ]);
  });

  it('honors a canceled ui-dialog-open event on the plain (function-path) dialog (WS-12)', () => {
    root.innerHTML = `
      <button type="button" data-ui-dialog-trigger aria-controls="cancel-dialog" aria-expanded="false">
        Open dialog
      </button>
      <dialog id="cancel-dialog" data-ui-dialog aria-hidden="true">
        <button type="button" data-ui-dialog-close>Close</button>
      </dialog>
    `;

    cleanup = enhanceDialogs(document);

    const trigger = root.querySelector('[data-ui-dialog-trigger]');
    const dialog = root.querySelector('#cancel-dialog');

    dialog.addEventListener('ui-dialog-open', (event) => event.preventDefault(), { once: true });
    trigger.click();

    expect(dialog.hasAttribute('open')).toBe(false);
    expect(trigger.getAttribute('aria-expanded')).toBe('false');
  });

  it('resyncs aria state when a plain (function-path) dialog closes natively, e.g. form[method=dialog] (WS-12)', () => {
    root.innerHTML = `
      <button type="button" data-ui-dialog-trigger aria-controls="native-close-dialog" aria-expanded="false">
        Open dialog
      </button>
      <dialog id="native-close-dialog" data-ui-dialog aria-hidden="true">
        <form method="dialog">
          <button type="submit" data-ui-dialog-close>Close</button>
        </form>
      </dialog>
    `;

    cleanup = enhanceDialogs(document);

    const trigger = root.querySelector('[data-ui-dialog-trigger]');
    const dialog = root.querySelector('#native-close-dialog');

    trigger.click();
    expect(dialog.hasAttribute('open')).toBe(true);
    expect(trigger.getAttribute('aria-expanded')).toBe('true');

    // Simulate the browser's native dialog close (form[method=dialog] submit,
    // or dialog.close() called directly) rather than our own close handler --
    // jsdom doesn't implement <dialog> form submission, so fire the `close`
    // event dialog elements emit natively in that case.
    dialog.removeAttribute('open');
    dialog.dispatchEvent(new Event('close'));

    expect(dialog.getAttribute('aria-hidden')).toBe('true');
    expect(trigger.getAttribute('aria-expanded')).toBe('false');
  });

  it('toggles menus and closes them on outside click or escape', () => {
    root.innerHTML = `
      <button id="menu-trigger" type="button" data-ui-menu-trigger aria-controls="test-menu" aria-expanded="false">
        Menu
      </button>
      <div id="test-menu" data-ui-menu hidden aria-label="Actions">
        <a href="#">Edit</a>
      </div>
    `;

    cleanup = enhanceMenus(document);

    const trigger = root.querySelector('#menu-trigger');
    const menu = root.querySelector('#test-menu');

    trigger.click();
    expect(menu.hidden).toBe(false);
    expect(trigger.getAttribute('aria-expanded')).toBe('true');

    document.body.click();
    expect(menu.hidden).toBe(true);
    expect(trigger.getAttribute('aria-expanded')).toBe('false');

    trigger.click();
    expect(menu.hidden).toBe(false);

    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    expect(menu.hidden).toBe(true);
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

  it('defines lightweight custom elements and upgrades dialogs and menus', () => {
    defineFastBlocksCustomElements(window);

    root.innerHTML = `
      <ui-dialog class="ui-dialog" data-ui-dialog>
        <button type="button" data-ui-dialog-trigger aria-controls="settings-dialog" aria-expanded="false">
          Open dialog
        </button>
        <dialog id="settings-dialog" class="ui-dialog" aria-hidden="true">
          <button type="button" data-ui-dialog-close>Close</button>
        </dialog>
      </ui-dialog>
      <ui-menu class="ui-menu" data-ui-menu>
        <button id="menu-trigger" type="button" data-ui-menu-trigger aria-controls="menu-panel" aria-expanded="false">
          Menu
        </button>
        <div id="menu-panel" data-ui-menu hidden aria-label="Actions">
          <a href="#">Edit</a>
        </div>
      </ui-menu>
    `;

    const dialogHost = root.querySelector('ui-dialog');
    const dialogTrigger = root.querySelector('[data-ui-dialog-trigger]');
    const dialogSurface = root.querySelector('#settings-dialog');
    const dialogClose = root.querySelector('[data-ui-dialog-close]');
    const menuHost = root.querySelector('ui-menu');
    const menuTrigger = root.querySelector('#menu-trigger');
    const menuBody = root.querySelector('#menu-panel');

    dialogTrigger.click();
    expect(dialogHost.hasAttribute('open')).toBe(true);
    expect(dialogSurface.hasAttribute('open')).toBe(true);
    expect(dialogTrigger.getAttribute('aria-expanded')).toBe('true');
    dialogClose.click();
    expect(dialogHost.hasAttribute('open')).toBe(false);
    expect(dialogSurface.hasAttribute('open')).toBe(false);

    menuTrigger.click();
    expect(menuHost.hasAttribute('open')).toBe(true);
    expect(menuBody.hidden).toBe(false);
    document.body.click();
    expect(menuHost.hasAttribute('open')).toBe(false);
    expect(menuBody.hidden).toBe(true);
  });

  it('honors cancelable dialog and menu events and reconnects cleanly', () => {
    defineFastBlocksCustomElements(window);

    root.innerHTML = `
      <ui-dialog class="ui-dialog" data-ui-dialog>
        <button type="button" data-ui-dialog-trigger aria-controls="settings-dialog" aria-expanded="false">
          Open dialog
        </button>
        <dialog id="settings-dialog" class="ui-dialog" aria-hidden="true">
          <button type="button" data-ui-dialog-close>Close</button>
        </dialog>
      </ui-dialog>
      <ui-menu class="ui-menu" data-ui-menu>
        <button id="menu-trigger" type="button" data-ui-menu-trigger aria-controls="menu-panel" aria-expanded="false">
          Menu
        </button>
        <div id="menu-panel" data-ui-menu hidden aria-label="Actions">
          <a href="#">Edit</a>
        </div>
      </ui-menu>
    `;

    const dialogHost = root.querySelector('ui-dialog');
    const dialogTrigger = root.querySelector('[data-ui-dialog-trigger]');
    const menuHost = root.querySelector('ui-menu');
    const menuTrigger = root.querySelector('#menu-trigger');
    const menuBody = root.querySelector('#menu-panel');

    dialogHost.addEventListener('ui-dialog-open', (event) => event.preventDefault(), { once: true });
    dialogTrigger.click();
    expect(dialogHost.hasAttribute('open')).toBe(false);

    menuHost.addEventListener('ui-menu-open', (event) => event.preventDefault(), { once: true });
    menuTrigger.click();
    expect(menuHost.hasAttribute('open')).toBe(false);
    expect(menuBody.hidden).toBe(true);

    const menuOpenEvents = [];
    menuHost.addEventListener('ui-menu-opened', () => menuOpenEvents.push('open'));
    menuHost.remove();
    document.body.appendChild(menuHost);
    menuTrigger.click();
    expect(menuHost.hasAttribute('open')).toBe(true);
    expect(menuOpenEvents).toHaveLength(1);
  });

  it('navigates menu items with the keyboard and restores focus on escape', () => {
    root.innerHTML = `
      <button id="menu-trigger" type="button" data-ui-menu-trigger aria-controls="kbd-menu" aria-expanded="false">Menu</button>
      <div id="kbd-menu" data-ui-menu hidden aria-label="Actions">
        <a href="#one">One</a>
        <a href="#two">Two</a>
        <a href="#three">Three</a>
      </div>
    `;

    cleanup = enhanceMenus(document);

    const trigger = root.querySelector('#menu-trigger');
    const items = root.querySelectorAll('#kbd-menu a');

    trigger.focus();
    trigger.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true }));
    expect(root.querySelector('#kbd-menu').hidden).toBe(false);
    expect(document.activeElement).toBe(items[0]);

    items[0].dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true }));
    expect(document.activeElement).toBe(items[1]);

    items[1].dispatchEvent(new KeyboardEvent('keydown', { key: 'End', bubbles: true }));
    expect(document.activeElement).toBe(items[2]);

    items[2].dispatchEvent(new KeyboardEvent('keydown', { key: 'Home', bubbles: true }));
    expect(document.activeElement).toBe(items[0]);

    items[0].dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowUp', bubbles: true }));
    expect(document.activeElement).toBe(items[2]);

    items[2].dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    expect(root.querySelector('#kbd-menu').hidden).toBe(true);
    expect(document.activeElement).toBe(trigger);
  });

  it('traps Tab focus in the non-modal dialog fallback path', () => {
    defineFastBlocksCustomElements(window);

    root.innerHTML = `
      <ui-dialog class="ui-dialog" data-ui-dialog>
        <button type="button" data-ui-dialog-trigger aria-controls="ft-dialog" aria-expanded="false">Open</button>
        <dialog id="ft-dialog" class="ui-dialog" aria-hidden="true">
          <button id="ft-first" type="button" data-ui-dialog-close>Close</button>
          <a id="ft-last" href="#ok">OK</a>
        </dialog>
      </ui-dialog>
    `;

    const dialog = root.querySelector('#ft-dialog');
    // Force the non-modal fallback so our trap (not native showModal) runs.
    dialog.showModal = undefined;
    root.querySelector('[data-ui-dialog-trigger]').click();

    const first = root.querySelector('#ft-first');
    const last = root.querySelector('#ft-last');

    last.focus();
    last.dispatchEvent(new KeyboardEvent('keydown', { key: 'Tab', bubbles: true }));
    expect(document.activeElement).toBe(first); // wrapped forward

    first.focus();
    first.dispatchEvent(
      new KeyboardEvent('keydown', { key: 'Tab', shiftKey: true, bubbles: true }),
    );
    expect(document.activeElement).toBe(last); // wrapped backward
  });

  it('resyncs the ui-dialog wrapper when the native dialog closes some other way (WS-12)', () => {
    defineFastBlocksCustomElements(window);

    root.innerHTML = `
      <ui-dialog class="ui-dialog" data-ui-dialog>
        <button type="button" data-ui-dialog-trigger aria-controls="ce-native-close" aria-expanded="false">
          Open dialog
        </button>
        <dialog id="ce-native-close" class="ui-dialog" aria-hidden="true">
          <form method="dialog">
            <button type="submit" data-ui-dialog-close>Close</button>
          </form>
        </dialog>
      </ui-dialog>
    `;

    const dialogHost = root.querySelector('ui-dialog');
    const trigger = root.querySelector('[data-ui-dialog-trigger]');
    const dialog = root.querySelector('#ce-native-close');

    trigger.click();
    expect(dialogHost.hasAttribute('open')).toBe(true);

    // jsdom doesn't implement <dialog> form submission; simulate the native
    // `close` event a real browser fires in that case.
    dialog.removeAttribute('open');
    dialog.dispatchEvent(new Event('close'));

    expect(dialogHost.hasAttribute('open')).toBe(false);
    expect(dialogHost.getAttribute('aria-hidden')).toBe('true');
    expect(trigger.getAttribute('aria-expanded')).toBe('false');
  });

  it('navigates ui-menu custom-element items with arrow keys', () => {
    defineFastBlocksCustomElements(window);

    root.innerHTML = `
      <ui-menu class="ui-menu" data-ui-menu>
        <button id="cm-trigger" type="button" data-ui-menu-trigger aria-controls="cm-menu" aria-expanded="false">Menu</button>
        <div id="cm-menu" data-ui-menu hidden aria-label="Actions">
          <a href="#a">A</a>
          <a href="#b">B</a>
        </div>
      </ui-menu>
    `;

    const trigger = root.querySelector('#cm-trigger');
    const items = root.querySelectorAll('#cm-menu a');

    trigger.click();
    items[0].focus();
    items[0].dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true }));
    expect(document.activeElement).toBe(items[1]);
  });

  it('resyncs custom elements after fragment replacement', async () => {
    defineFastBlocksCustomElements(window);

    root.innerHTML = `
      <ui-dialog class="ui-dialog" data-ui-dialog>
        <button type="button" data-ui-dialog-trigger aria-controls="initial-dialog" aria-expanded="false">
          Open dialog
        </button>
        <dialog id="initial-dialog" class="ui-dialog" aria-hidden="true">
          <button type="button" data-ui-dialog-close>Close</button>
        </dialog>
      </ui-dialog>
      <ui-menu class="ui-menu" data-ui-menu>
        <button id="menu-trigger" type="button" data-ui-menu-trigger aria-controls="menu-panel" aria-expanded="false">
          Menu
        </button>
        <div id="menu-panel" data-ui-menu hidden aria-label="Actions">
          <a href="#">Edit</a>
        </div>
      </ui-menu>
    `;

    const dialogHost = root.querySelector('ui-dialog');
    const menuHost = root.querySelector('ui-menu');

    dialogHost.innerHTML = `
      <button type="button" data-ui-dialog-trigger aria-controls="replacement-dialog" aria-expanded="false">
        Open replacement
      </button>
      <dialog id="replacement-dialog" class="ui-dialog" aria-hidden="true">
        <button type="button" data-ui-dialog-close>Close replacement</button>
      </dialog>
    `;

    menuHost.innerHTML = `
      <button id="replacement-menu-trigger" type="button" data-ui-menu-trigger aria-controls="replacement-menu" aria-expanded="false">
        Menu
      </button>
      <div id="replacement-menu" data-ui-menu hidden aria-label="Replacement actions">
        <a href="#">View</a>
      </div>
    `;

    await Promise.resolve();
    await Promise.resolve();

    const replacementTrigger = root.querySelector('[aria-controls="replacement-dialog"]');
    const replacementClose = root.querySelector('[data-ui-dialog-close]');
    const replacementMenuTrigger = root.querySelector('#replacement-menu-trigger');
    const replacementMenu = root.querySelector('#replacement-menu');

    replacementTrigger.click();
    expect(dialogHost.hasAttribute('open')).toBe(true);
    replacementClose.click();
    expect(dialogHost.hasAttribute('open')).toBe(false);

    replacementMenuTrigger.click();
    expect(menuHost.hasAttribute('open')).toBe(true);
    expect(replacementMenu.hidden).toBe(false);
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

  // Unlike enhanceTabs/enhanceDialogs/enhanceMenus, which delegate clicks via
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
