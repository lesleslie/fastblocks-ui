import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import {
  defineFastBlocksCustomElements,
  enhanceDialogs,
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
