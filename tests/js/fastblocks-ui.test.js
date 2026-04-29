import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import {
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
});
