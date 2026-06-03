const TAB_SELECTOR = '[data-ui-tab-target]';
const PANEL_SELECTOR = '[data-ui-panel]';
const DIALOG_TRIGGER_SELECTOR = '[data-ui-dialog-trigger]';
const DIALOG_CLOSE_SELECTOR = '[data-ui-dialog-close]';
const MENU_TRIGGER_SELECTOR = '[data-ui-menu-trigger]';
const MENU_ITEM_SELECTOR = 'a[href], button:not([disabled]), [role="menuitem"]';

function dispatchCustomEvent(target, name, detail = {}, options = {}) {
  return target.dispatchEvent(
    new CustomEvent(name, {
      bubbles: true,
      cancelable: Boolean(options.cancelable),
      composed: true,
      detail,
    }),
  );
}

function getTargetElement(root, selector) {
  if (!selector) {
    return null;
  }

  const trimmed = selector.trim();
  if (trimmed && !/^[#[.:]/.test(trimmed)) {
    return root.getElementById?.(trimmed) || root.ownerDocument?.getElementById(trimmed) || document.getElementById(trimmed);
  }

  try {
    return root.querySelector(trimmed);
  } catch {
    return null;
  }
}

function isWithinRoot(root, element) {
  if (!root || !element) {
    return false;
  }

  if (typeof root.contains === 'function' && root !== document) {
    return root.contains(element);
  }

  return document.documentElement?.contains(element) ?? document.contains(element);
}

function setSelectedTabState(tabRoot, activeTab) {
  const tabs = Array.from(tabRoot.querySelectorAll(TAB_SELECTOR));
  const panels = Array.from(tabRoot.querySelectorAll(PANEL_SELECTOR));

  tabs.forEach((tab) => {
    const isActive = tab === activeTab;
    tab.setAttribute('aria-selected', String(isActive));
    tab.setAttribute('tabindex', isActive ? '0' : '-1');
  });

  panels.forEach((panel) => {
    const shouldShow = panel.id && activeTab?.getAttribute('data-ui-tab-target') === `#${panel.id}`;
    panel.hidden = !shouldShow;
    panel.setAttribute('aria-hidden', String(!shouldShow));
  });
}

function activateTab(tabRoot, tab) {
  if (!tabRoot || !tab) {
    return;
  }

  setSelectedTabState(tabRoot, tab);
  tab.focus({ preventScroll: true });
}

function isCustomElementHost(element, tagName) {
  return Boolean(element?.matches?.(tagName));
}

function menuItems(menu) {
  if (!menu) {
    return [];
  }
  return Array.from(menu.querySelectorAll(MENU_ITEM_SELECTOR));
}

// Shared keyboard handling for the menu disclosure pattern (used by both the
// custom-element and the function-based enhancers). Implements the WAI-ARIA menu
// keyboard contract: arrow navigation, Home/End, Escape (close + restore focus),
// and Tab (close). Returns true if the event was consumed.
function handleMenuKeydown(event, { menu, trigger, open, close }) {
  if (!menu) {
    return false;
  }

  const { key } = event;
  const items = menuItems(menu);
  const onTrigger = Boolean(
    trigger && (event.target === trigger || trigger.contains(event.target)),
  );

  if (key === 'Escape') {
    if (!menu.hidden) {
      close();
      trigger?.focus?.({ preventScroll: true });
      return true;
    }
    return false;
  }

  // Open from the trigger and move into the list.
  if (onTrigger && (key === 'ArrowDown' || key === 'Enter' || key === ' ')) {
    event.preventDefault();
    if (menu.hidden) {
      open();
    }
    items[0]?.focus?.({ preventScroll: true });
    return true;
  }

  if (menu.hidden || items.length === 0) {
    return false;
  }

  const index = items.indexOf(document.activeElement);

  if (key === 'ArrowDown') {
    event.preventDefault();
    (items[(index + 1) % items.length] || items[0]).focus({ preventScroll: true });
    return true;
  }
  if (key === 'ArrowUp') {
    event.preventDefault();
    (
      items[(index - 1 + items.length) % items.length] || items[items.length - 1]
    ).focus({ preventScroll: true });
    return true;
  }
  if (key === 'Home') {
    event.preventDefault();
    items[0].focus({ preventScroll: true });
    return true;
  }
  if (key === 'End') {
    event.preventDefault();
    items[items.length - 1].focus({ preventScroll: true });
    return true;
  }
  if (key === 'Tab') {
    // Let focus leave naturally, but collapse the menu behind it.
    close();
  }
  return false;
}

const FOCUSABLE_SELECTOR =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

function focusableWithin(container) {
  if (!container) {
    return [];
  }
  return Array.from(container.querySelectorAll(FOCUSABLE_SELECTOR)).filter(
    (el) => !el.closest('[hidden]'),
  );
}

// Wrap Tab focus inside a container. Native modal dialogs (showModal) trap focus
// themselves; this backs the non-modal fallback path (setAttribute('open')) where
// the browser does not. Returns true if focus was wrapped.
function trapTabFocus(event, container) {
  if (event.key !== 'Tab' || !container) {
    return false;
  }
  const items = focusableWithin(container);
  if (items.length === 0) {
    return false;
  }
  const first = items[0];
  const last = items[items.length - 1];
  const active = document.activeElement;
  if (event.shiftKey) {
    if (active === first || !container.contains(active)) {
      event.preventDefault();
      last.focus({ preventScroll: true });
      return true;
    }
  } else if (active === last || !container.contains(active)) {
    event.preventDefault();
    first.focus({ preventScroll: true });
    return true;
  }
  return false;
}

class UiTabsElement extends HTMLElement {
  constructor() {
    super();
    this.onClick = this.onClick.bind(this);
    this.onKeyDown = this.onKeyDown.bind(this);
    this._observer = new MutationObserver(() => this.syncFromMarkup());
  }

  connectedCallback() {
    if (this._connected) {
      return;
    }

    this._connected = true;
    this.setAttribute('data-ui-tabs', this.getAttribute('data-ui-tabs') ?? '');
    this.addEventListener('click', this.onClick);
    this.addEventListener('keydown', this.onKeyDown);
    this._observer.observe(this, { childList: true, subtree: true });
    this.syncFromMarkup();
  }

  disconnectedCallback() {
    this._observer.disconnect();
    this.removeEventListener('click', this.onClick);
    this.removeEventListener('keydown', this.onKeyDown);
    this._connected = false;
  }

  getTabs() {
    return Array.from(this.querySelectorAll(TAB_SELECTOR));
  }

  getPanels() {
    return Array.from(this.querySelectorAll(PANEL_SELECTOR));
  }

  syncFromMarkup() {
    const tabs = this.getTabs();
    if (!tabs.length) {
      return;
    }

    const activeTab =
      tabs.find((tab) => tab.getAttribute('aria-selected') === 'true') || tabs[0];
    setSelectedTabState(this, activeTab);
  }

  changeTab(nextTab) {
    const currentTab = this.getTabs().find((tab) => tab.getAttribute('aria-selected') === 'true');
    if (!nextTab || currentTab === nextTab) {
      return;
    }

    const allowed = dispatchCustomEvent(
      this,
      'ui-tab-change',
      { currentTab, nextTab, currentPanel: this.getPanelForTab(currentTab), nextPanel: this.getPanelForTab(nextTab) },
      { cancelable: true },
    );
    if (!allowed) {
      return;
    }

    setSelectedTabState(this, nextTab);
    nextTab.focus({ preventScroll: true });
    dispatchCustomEvent(this, 'ui-tab-changed', {
      currentTab,
      nextTab,
      currentPanel: this.getPanelForTab(currentTab),
      nextPanel: this.getPanelForTab(nextTab),
    });
  }

  getPanelForTab(tab) {
    if (!tab) {
      return null;
    }

    const selector = tab.getAttribute('data-ui-tab-target');
    return selector ? getTargetElement(this, selector) : null;
  }

  onClick(event) {
    const tab = event.target.closest(TAB_SELECTOR);
    if (!tab || !isWithinRoot(this, tab)) {
      return;
    }

    event.preventDefault();
    this.changeTab(tab);
  }

  onKeyDown(event) {
    const tab = event.target.closest(TAB_SELECTOR);
    if (!tab || !isWithinRoot(this, tab)) {
      return;
    }

    const tabs = this.getTabs();
    const currentIndex = tabs.indexOf(tab);
    if (currentIndex === -1) {
      return;
    }

    let nextIndex = currentIndex;
    if (event.key === 'ArrowRight' || event.key === 'ArrowDown') {
      nextIndex = (currentIndex + 1) % tabs.length;
    } else if (event.key === 'ArrowLeft' || event.key === 'ArrowUp') {
      nextIndex = (currentIndex - 1 + tabs.length) % tabs.length;
    } else if (event.key === 'Home') {
      nextIndex = 0;
    } else if (event.key === 'End') {
      nextIndex = tabs.length - 1;
    } else if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      this.changeTab(tab);
      return;
    } else {
      return;
    }

    event.preventDefault();
    this.changeTab(tabs[nextIndex]);
  }
}

class UiDialogElement extends HTMLElement {
  constructor() {
    super();
    this.onClick = this.onClick.bind(this);
    this.onKeyDown = this.onKeyDown.bind(this);
    this.onDialogClose = this.onDialogClose.bind(this);
    this._observer = new MutationObserver(() => this.syncFromMarkup());
  }

  connectedCallback() {
    if (this._connected) {
      return;
    }

    this._connected = true;
    this.addEventListener('click', this.onClick);
    this.addEventListener('keydown', this.onKeyDown);
    this._observer.observe(this, { childList: true, subtree: true });
    this.syncFromMarkup();
  }

  disconnectedCallback() {
    const dialog = this._dialog;
    dialog?.removeEventListener('close', this.onDialogClose);
    this._observer.disconnect();
    this.removeEventListener('click', this.onClick);
    this.removeEventListener('keydown', this.onKeyDown);
    this._connected = false;
  }

  getDialog() {
    return this._dialog || this.querySelector('dialog,[data-ui-dialog]');
  }

  getTrigger() {
    const dialog = this.getDialog();
    if (!dialog) {
      return this.querySelector(DIALOG_TRIGGER_SELECTOR);
    }

    const selector = dialog.getAttribute('aria-labelledby');
    return selector ? this.querySelector(`[aria-controls="${dialog.id}"], [data-ui-dialog-trigger]`) : this.querySelector(DIALOG_TRIGGER_SELECTOR);
  }

  syncFromMarkup() {
    const dialog = this.getDialog();
    if (!dialog) {
      return;
    }

    if (this._dialog !== dialog) {
      this._dialog?.removeEventListener('close', this.onDialogClose);
      this._dialog = dialog;
      dialog.addEventListener('close', this.onDialogClose);
    }

    this.toggleAttribute('open', dialog.hasAttribute('open'));
    this.setAttribute('aria-hidden', dialog.hasAttribute('open') ? 'false' : 'true');
    dialog.setAttribute('aria-hidden', dialog.hasAttribute('open') ? 'false' : 'true');
  }

  openDialog(trigger) {
    const dialog = this.getDialog();
    if (!dialog) {
      return;
    }

    const allowed = dispatchCustomEvent(
      this,
      'ui-dialog-open',
      { dialog, trigger },
      { cancelable: true },
    );
    if (!allowed) {
      return;
    }

    if (typeof dialog.showModal === 'function' && !dialog.open) {
      dialog.showModal();
      this._modal = true;
    } else {
      dialog.setAttribute('open', '');
      this._modal = false;
    }

    dialog.setAttribute('aria-hidden', 'false');
    this.setAttribute('open', '');
    this.setAttribute('aria-hidden', 'false');
    trigger?.setAttribute('aria-expanded', 'true');
    this._trigger = trigger || null;

    const focusTarget = dialog.querySelector(
      '[autofocus], [data-ui-dialog-close], button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
    );
    focusTarget?.focus({ preventScroll: true });

    dispatchCustomEvent(this, 'ui-dialog-opened', { dialog, trigger });
  }

  closeDialog() {
    const dialog = this.getDialog();
    if (!dialog) {
      return;
    }

    const allowed = dispatchCustomEvent(
      this,
      'ui-dialog-close',
      { dialog, trigger: this._trigger || null },
      { cancelable: true },
    );
    if (!allowed) {
      return;
    }

    if (typeof dialog.close === 'function' && dialog.open) {
      dialog.close();
    } else {
      dialog.removeAttribute('open');
    }

    dialog.setAttribute('aria-hidden', 'true');
    this.removeAttribute('open');
    this.setAttribute('aria-hidden', 'true');

    const trigger = this._trigger;
    if (trigger && typeof trigger.focus === 'function') {
      trigger.setAttribute('aria-expanded', 'false');
      trigger.focus({ preventScroll: true });
    }

    this._trigger = null;
    dispatchCustomEvent(this, 'ui-dialog-closed', { dialog, trigger: trigger || null });
  }

  onDialogClose() {
    const dialog = this.getDialog();
    if (!dialog) {
      return;
    }

    dialog.setAttribute('aria-hidden', 'true');
    this.removeAttribute('open');
    this.setAttribute('aria-hidden', 'true');
    const trigger = this._trigger || this.querySelector(DIALOG_TRIGGER_SELECTOR);
    if (trigger) {
      trigger.setAttribute('aria-expanded', 'false');
    }
  }

  onClick(event) {
    const openTrigger = event.target.closest(DIALOG_TRIGGER_SELECTOR);
    if (openTrigger && isWithinRoot(this, openTrigger)) {
      event.preventDefault();
      this.openDialog(openTrigger);
      return;
    }

    const closeTrigger = event.target.closest(DIALOG_CLOSE_SELECTOR);
    if (closeTrigger && isWithinRoot(this, closeTrigger)) {
      event.preventDefault();
      this.closeDialog();
    }
  }

  onKeyDown(event) {
    const dialog = this.getDialog();
    if (event.key === 'Escape') {
      if (dialog?.open) {
        this.closeDialog();
      }
      return;
    }

    // Native modal dialogs trap Tab themselves; back the non-modal fallback.
    if (event.key === 'Tab' && dialog?.hasAttribute('open') && !this._modal) {
      trapTabFocus(event, dialog);
    }
  }
}

class UiMenuElement extends HTMLElement {
  constructor() {
    super();
    this.onClick = this.onClick.bind(this);
    this.onKeyDown = this.onKeyDown.bind(this);
    this.onDocumentClick = this.onDocumentClick.bind(this);
    this._observer = new MutationObserver(() => this.syncFromMarkup());
  }

  connectedCallback() {
    if (this._connected) {
      return;
    }

    this._connected = true;
    this.addEventListener('click', this.onClick);
    this.addEventListener('keydown', this.onKeyDown);
    document.addEventListener('click', this.onDocumentClick, true);
    this._observer.observe(this, { childList: true, subtree: true });
    this.syncFromMarkup();
  }

  disconnectedCallback() {
    this._observer.disconnect();
    this.removeEventListener('click', this.onClick);
    this.removeEventListener('keydown', this.onKeyDown);
    document.removeEventListener('click', this.onDocumentClick, true);
    this._connected = false;
  }

  getTrigger() {
    return this.querySelector(MENU_TRIGGER_SELECTOR);
  }

  getMenu() {
    const trigger = this.getTrigger();
    if (!trigger) {
      return this.querySelector('[data-ui-menu], [id]');
    }

    const selector = trigger.getAttribute('aria-controls') || trigger.getAttribute('data-ui-menu-target');
    return getTargetElement(this, selector) || this.querySelector('[data-ui-menu], [id]');
  }

  syncFromMarkup() {
    const menu = this.getMenu();
    const trigger = this.getTrigger();
    if (!menu || !trigger) {
      return;
    }

    menu.hidden = menu.hasAttribute('hidden');
    trigger.setAttribute('aria-expanded', menu.hidden ? 'false' : 'true');
    this.toggleAttribute('open', !menu.hidden);
    this.setAttribute('data-ui-state', menu.hidden ? 'closed' : 'open');
  }

  setOpen(nextOpen, trigger = this.getTrigger()) {
    const menu = this.getMenu();
    if (!menu) {
      return;
    }

    const eventName = nextOpen ? 'ui-menu-open' : 'ui-menu-close';
    const allowed = dispatchCustomEvent(
      this,
      eventName,
      { menu, trigger },
      { cancelable: true },
    );
    if (!allowed) {
      return;
    }

    menu.hidden = !nextOpen;
    trigger?.setAttribute('aria-expanded', nextOpen ? 'true' : 'false');
    this.toggleAttribute('open', nextOpen);
    this.setAttribute('data-ui-state', nextOpen ? 'open' : 'closed');

    dispatchCustomEvent(this, nextOpen ? 'ui-menu-opened' : 'ui-menu-closed', { menu, trigger });
  }

  toggleMenu(trigger = this.getTrigger()) {
    const menu = this.getMenu();
    if (!menu) {
      return;
    }

    this.setOpen(menu.hidden, trigger);
  }

  closeMenu() {
    const menu = this.getMenu();
    if (menu?.hidden) {
      return;
    }

    this.setOpen(false);
  }

  onClick(event) {
    const trigger = event.target.closest(MENU_TRIGGER_SELECTOR);
    if (trigger && isWithinRoot(this, trigger)) {
      event.preventDefault();
      this.toggleMenu(trigger);
    }
  }

  onKeyDown(event) {
    handleMenuKeydown(event, {
      menu: this.getMenu(),
      trigger: this.getTrigger(),
      open: () => this.setOpen(true),
      close: () => this.closeMenu(),
    });
  }

  onDocumentClick(event) {
    if (!this.contains(event.target)) {
      this.closeMenu();
    }
  }
}

export function defineFastBlocksCustomElements(root = globalThis) {
  const registry = root?.customElements;
  if (!registry) {
    return false;
  }

  const definitions = [
    ['ui-tabs', UiTabsElement],
    ['ui-dialog', UiDialogElement],
    ['ui-menu', UiMenuElement],
  ];

  definitions.forEach(([name, ctor]) => {
    if (!registry.get(name)) {
      registry.define(name, ctor);
    }
  });

  return true;
}

export function enhanceTabs(root = document) {
  const tabRoots = Array.from(root.querySelectorAll('[data-ui-tabs]'));

  tabRoots.forEach((tabRoot) => {
    if (isCustomElementHost(tabRoot, 'ui-tabs') || tabRoot.closest('ui-tabs')) {
      return;
    }

    const activeTab =
      tabRoot.querySelector(`${TAB_SELECTOR}[aria-selected="true"]`) ||
      tabRoot.querySelector(TAB_SELECTOR);

    if (activeTab) {
      setSelectedTabState(tabRoot, activeTab);
    }
  });

  const onClick = (event) => {
    const tab = event.target.closest(TAB_SELECTOR);
    if (!tab || !isWithinRoot(root, tab)) {
      return;
    }

    const tabRoot = tab.closest('[data-ui-tabs]');
    if (!tabRoot || tabRoot.closest('ui-tabs')) {
      return;
    }

    event.preventDefault();
    activateTab(tabRoot, tab);
  };

  const onKeyDown = (event) => {
    const tab = event.target.closest(TAB_SELECTOR);
    if (!tab || !isWithinRoot(root, tab)) {
      return;
    }

    const tabRoot = tab.closest('[data-ui-tabs]');
    if (!tabRoot || tabRoot.closest('ui-tabs')) {
      return;
    }

    const tabs = Array.from(tabRoot.querySelectorAll(TAB_SELECTOR));
    const currentIndex = tabs.indexOf(tab);
    if (currentIndex === -1) {
      return;
    }

    let nextIndex = currentIndex;
    if (event.key === 'ArrowRight' || event.key === 'ArrowDown') {
      nextIndex = (currentIndex + 1) % tabs.length;
    } else if (event.key === 'ArrowLeft' || event.key === 'ArrowUp') {
      nextIndex = (currentIndex - 1 + tabs.length) % tabs.length;
    } else if (event.key === 'Home') {
      nextIndex = 0;
    } else if (event.key === 'End') {
      nextIndex = tabs.length - 1;
    } else if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      activateTab(tabRoot, tab);
      return;
    } else {
      return;
    }

    event.preventDefault();
    activateTab(tabRoot, tabs[nextIndex]);
  };

  root.addEventListener('click', onClick);
  root.addEventListener('keydown', onKeyDown);

  return () => {
    root.removeEventListener('click', onClick);
    root.removeEventListener('keydown', onKeyDown);
  };
}

function showDialog(dialog, trigger) {
  if (!dialog) {
    return;
  }

  if (typeof dialog.showModal === 'function' && !dialog.open) {
    dialog.showModal();
    dialog.__uiModal = true;
  } else {
    dialog.setAttribute('open', '');
    dialog.__uiModal = false;
  }

  dialog.setAttribute('open', '');
  dialog.setAttribute('aria-hidden', 'false');
  trigger?.setAttribute('aria-expanded', 'true');
  dialog.__uiTrigger = trigger || null;

  const focusTarget = dialog.querySelector('[autofocus], [data-ui-dialog-close], button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])');
  focusTarget?.focus({ preventScroll: true });
}

function closeDialog(dialog) {
  if (!dialog) {
    return;
  }

  if (typeof dialog.close === 'function' && dialog.open) {
    dialog.close();
  } else {
    dialog.removeAttribute('open');
  }

  dialog.setAttribute('aria-hidden', 'true');

  const trigger = dialog.__uiTrigger;
  if (trigger && typeof trigger.focus === 'function') {
    trigger.setAttribute('aria-expanded', 'false');
    trigger.focus({ preventScroll: true });
  }

  dialog.__uiTrigger = null;
}

export function enhanceDialogs(root = document) {
  const onClick = (event) => {
    const openTrigger = event.target.closest(DIALOG_TRIGGER_SELECTOR);
    if (openTrigger && isWithinRoot(root, openTrigger) && !openTrigger.closest('ui-dialog')) {
      event.preventDefault();
      const selector = openTrigger.getAttribute('aria-controls') || openTrigger.getAttribute('data-ui-dialog-target');
      const dialog = getTargetElement(root, selector);
      showDialog(dialog, openTrigger);
      return;
    }

    const closeTrigger = event.target.closest(DIALOG_CLOSE_SELECTOR);
    if (closeTrigger && isWithinRoot(root, closeTrigger) && !closeTrigger.closest('ui-dialog')) {
      event.preventDefault();
      const dialog = closeTrigger.closest('dialog,[data-ui-dialog]');
      closeDialog(dialog);
    }
  };

  const onKeyDown = (event) => {
    const openDialog = root.querySelector('dialog[open], [data-ui-dialog][open]');
    if (
      !openDialog ||
      isCustomElementHost(openDialog, 'ui-dialog') ||
      openDialog.closest('ui-dialog')
    ) {
      return;
    }

    if (event.key === 'Escape') {
      closeDialog(openDialog);
      return;
    }

    // Native modal dialogs trap Tab themselves; back the non-modal fallback.
    if (event.key === 'Tab' && !openDialog.__uiModal) {
      trapTabFocus(event, openDialog);
    }
  };

  root.addEventListener('click', onClick);
  root.addEventListener('keydown', onKeyDown);

  return () => {
    root.removeEventListener('click', onClick);
    root.removeEventListener('keydown', onKeyDown);
  };
}

function openMenu(trigger, menu) {
  if (!trigger || !menu) {
    return;
  }

  menu.hidden = false;
  trigger.setAttribute('aria-expanded', 'true');
  trigger.dataset.uiMenuOpen = 'true';
}

function closeMenu(trigger, menu) {
  if (!trigger || !menu) {
    return;
  }

  menu.hidden = true;
  trigger.setAttribute('aria-expanded', 'false');
  trigger.dataset.uiMenuOpen = 'false';
}

export function enhanceMenus(root = document) {
  const menus = new Map();

  root.querySelectorAll(MENU_TRIGGER_SELECTOR).forEach((trigger) => {
    if (trigger.closest('ui-menu')) {
      return;
    }

    const selector = trigger.getAttribute('aria-controls') || trigger.getAttribute('data-ui-menu-target');
    const menu = getTargetElement(root, selector);
    if (!menu) {
      return;
    }

    menu.hidden = menu.hidden ?? true;
    trigger.setAttribute('aria-expanded', menu.hidden ? 'false' : 'true');
    menus.set(trigger, menu);
  });

  const closeAllMenus = (exceptTrigger = null) => {
    menus.forEach((menu, trigger) => {
      if (trigger !== exceptTrigger) {
        closeMenu(trigger, menu);
      }
    });
  };

  const onClick = (event) => {
    const trigger = event.target.closest(MENU_TRIGGER_SELECTOR);
    if (trigger && isWithinRoot(root, trigger) && !trigger.closest('ui-menu')) {
      event.preventDefault();
      const menu = menus.get(trigger);
      if (!menu) {
        return;
      }

      const isOpen = trigger.getAttribute('aria-expanded') === 'true';
      closeAllMenus(trigger);
      if (isOpen) {
        closeMenu(trigger, menu);
      } else {
        openMenu(trigger, menu);
      }
      return;
    }

    const clickedInsideMenu = event.target.closest('[data-ui-menu]');
    if (!clickedInsideMenu) {
      closeAllMenus();
    }
  };

  const onKeyDown = (event) => {
    // Route the event to the menu that owns the current focus, or any open menu.
    for (const [trigger, menu] of menus) {
      const relevant =
        trigger.contains(event.target) || menu.contains(event.target) || !menu.hidden;
      if (!relevant) {
        continue;
      }
      const handled = handleMenuKeydown(event, {
        menu,
        trigger,
        open: () => openMenu(trigger, menu),
        close: () => closeMenu(trigger, menu),
      });
      if (handled) {
        return;
      }
    }
  };

  root.addEventListener('click', onClick);
  root.addEventListener('keydown', onKeyDown);

  return () => {
    root.removeEventListener('click', onClick);
    root.removeEventListener('keydown', onKeyDown);
  };
}

export function initFastBlocksUI(root = document) {
  defineFastBlocksCustomElements(globalThis);
  const cleanups = [enhanceTabs(root), enhanceDialogs(root), enhanceMenus(root)].filter(Boolean);

  return () => {
    cleanups.forEach((cleanup) => cleanup());
  };
}

defineFastBlocksCustomElements(globalThis);

if (typeof document !== 'undefined' && !window.__FASTBLOCKS_UI_NO_AUTO_INIT__) {
  const boot = () => {
    if (!window.fastBlocksUI) {
      window.fastBlocksUI = initFastBlocksUI(document);
    }
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot, { once: true });
  } else {
    boot();
  }
}
