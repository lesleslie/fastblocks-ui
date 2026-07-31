const TAB_SELECTOR = '[data-ui-tab-target]';
const PANEL_SELECTOR = '[data-ui-panel]';
const DIALOG_TRIGGER_SELECTOR = '[data-ui-dialog-trigger]';
const DIALOG_CLOSE_SELECTOR = '[data-ui-dialog-close]';
const DROPDOWN_TRIGGER_SELECTOR = '[data-ui-dropdown-trigger]';
const DROPDOWN_ITEM_SELECTOR = 'a[href], button:not([disabled]), [role="menuitem"]';

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
  return Array.from(menu.querySelectorAll(DROPDOWN_ITEM_SELECTOR));
}

// Shared keyboard handling for the menu disclosure pattern (used by both the
// custom-element and the function-based enhancers). Implements the WAI-ARIA menu
// keyboard contract: arrow navigation, Home/End, Escape (close + restore focus),
// and Tab (close). Returns true if the event was consumed.
function handleDropdownKeydown(event, { menu, trigger, open, close }) {
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

// Shared dialog open/close core (used by both the custom-element
// (`UiDialogElement`) and the function-based (`enhanceDialogs()`) paths).
// Consolidated so both markup styles get the same behavior: cancelable
// `ui-dialog-open`/`ui-dialog-close` events, follow-up `ui-dialog-opened`/
// `ui-dialog-closed` events, and a listener on the dialog's native `close`
// event (so a `<form method="dialog">` submit, or any other native close,
// still resyncs `aria-hidden`/`aria-expanded`) -- previously only the
// custom-element path had any of this.
//
// Per-dialog state (whether it was opened via `showModal()`, its current
// trigger, and whether the native-close listener is already attached) is
// tracked in a WeakMap keyed by the `<dialog>`/`[data-ui-dialog]` element
// itself, rather than expando properties on that element or instance
// fields on a wrapper -- the same state shape works whether or not a
// `<ui-dialog>` wrapper element exists.
const dialogState = new WeakMap();

function getDialogState(dialog) {
  let state = dialogState.get(dialog);
  if (!state) {
    state = { modal: false, trigger: null, closeListenerAttached: false };
    dialogState.set(dialog, state);
  }
  return state;
}

function isDialogModal(dialog) {
  return Boolean(dialogState.get(dialog)?.modal);
}

// Resyncs aria state (and, for the custom-element path, the wrapper's own
// `open`/`aria-hidden`) when a dialog closes through any means other than
// our own `closeDialogShared()` call -- e.g. a `<form method="dialog">`
// submit, or the browser's own Escape handling on a modal `<dialog>`.
// Deliberately does not dispatch `ui-dialog-closed`: that event means
// "closed via this library's API", which this path isn't.
function onNativeDialogClose(dialog, wrapper) {
  const state = getDialogState(dialog);
  dialog.setAttribute('aria-hidden', 'true');
  wrapper?.removeAttribute('open');
  wrapper?.setAttribute('aria-hidden', 'true');
  const trigger = state.trigger;
  if (trigger) {
    trigger.setAttribute('aria-expanded', 'false');
  }
  state.trigger = null;
}

function attachDialogCloseListener(dialog, wrapper) {
  if (!dialog) {
    return;
  }
  const state = getDialogState(dialog);
  if (state.closeListenerAttached) {
    return;
  }
  dialog.addEventListener('close', () => onNativeDialogClose(dialog, wrapper));
  state.closeListenerAttached = true;
}

// Returns true if the dialog was actually opened (i.e. the cancelable
// `ui-dialog-open` event wasn't prevented), so callers with their own extra
// wrapper state (the custom-element path's `open`/`aria-hidden` on itself)
// know whether to apply it.
function openDialogShared(dialog, trigger, dispatchTarget) {
  if (!dialog) {
    return false;
  }

  const allowed = dispatchCustomEvent(
    dispatchTarget,
    'ui-dialog-open',
    { dialog, trigger },
    { cancelable: true },
  );
  if (!allowed) {
    return false;
  }

  const state = getDialogState(dialog);

  if (typeof dialog.showModal === 'function' && !dialog.open) {
    dialog.showModal();
    state.modal = true;
  } else {
    dialog.setAttribute('open', '');
    state.modal = false;
  }

  dialog.setAttribute('aria-hidden', 'false');
  trigger?.setAttribute('aria-expanded', 'true');
  state.trigger = trigger || null;

  const focusTarget = dialog.querySelector(
    '[autofocus], [data-ui-dialog-close], button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
  );
  focusTarget?.focus({ preventScroll: true });

  dispatchCustomEvent(dispatchTarget, 'ui-dialog-opened', { dialog, trigger });
  return true;
}

// Returns true if the dialog was actually closed (the cancelable
// `ui-dialog-close` event wasn't prevented) -- see `openDialogShared`.
function closeDialogShared(dialog, dispatchTarget) {
  if (!dialog) {
    return false;
  }

  const state = getDialogState(dialog);

  const allowed = dispatchCustomEvent(
    dispatchTarget,
    'ui-dialog-close',
    { dialog, trigger: state.trigger || null },
    { cancelable: true },
  );
  if (!allowed) {
    return false;
  }

  if (typeof dialog.close === 'function' && dialog.open) {
    dialog.close();
  } else {
    dialog.removeAttribute('open');
  }

  dialog.setAttribute('aria-hidden', 'true');

  const trigger = state.trigger;
  if (trigger && typeof trigger.focus === 'function') {
    trigger.setAttribute('aria-expanded', 'false');
    trigger.focus({ preventScroll: true });
  }

  state.trigger = null;
  dispatchCustomEvent(dispatchTarget, 'ui-dialog-closed', { dialog, trigger: trigger || null });
  return true;
}

class UiDialogElement extends HTMLElement {
  constructor() {
    super();
    this.onClick = this.onClick.bind(this);
    this.onKeyDown = this.onKeyDown.bind(this);
  }

  connectedCallback() {
    if (this._connected) {
      return;
    }

    this._connected = true;
    this.addEventListener('click', this.onClick);
    this.addEventListener('keydown', this.onKeyDown);
    this._observer = new MutationObserver(() => this.syncFromMarkup());
    this._observer.observe(this, { childList: true, subtree: true });
    this.syncFromMarkup();
  }

  disconnectedCallback() {
    this._observer?.disconnect();
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
      this._dialog = dialog;
      attachDialogCloseListener(dialog, this);
    }

    this.toggleAttribute('open', dialog.hasAttribute('open'));
    this.setAttribute('aria-hidden', dialog.hasAttribute('open') ? 'false' : 'true');
    dialog.setAttribute('aria-hidden', dialog.hasAttribute('open') ? 'false' : 'true');
  }

  openDialog(trigger) {
    const dialog = this.getDialog();
    if (!openDialogShared(dialog, trigger, this)) {
      return;
    }
    this.setAttribute('open', '');
    this.setAttribute('aria-hidden', 'false');
  }

  closeDialog() {
    const dialog = this.getDialog();
    if (!closeDialogShared(dialog, this)) {
      return;
    }
    this.removeAttribute('open');
    this.setAttribute('aria-hidden', 'true');
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
    if (event.key === 'Tab' && dialog?.hasAttribute('open') && !isDialogModal(dialog)) {
      trapTabFocus(event, dialog);
    }
  }
}

class UiDropdownElement extends HTMLElement {
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
    return this.querySelector(DROPDOWN_TRIGGER_SELECTOR);
  }

  getMenu() {
    const trigger = this.getTrigger();
    if (!trigger) {
      return this.querySelector('[data-ui-dropdown], [id]');
    }

    const selector = trigger.getAttribute('aria-controls') || trigger.getAttribute('data-ui-dropdown-target');
    return getTargetElement(this, selector) || this.querySelector('[data-ui-dropdown], [id]');
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

    const eventName = nextOpen ? 'ui-dropdown-open' : 'ui-dropdown-close';
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

    dispatchCustomEvent(this, nextOpen ? 'ui-dropdown-opened' : 'ui-dropdown-closed', { menu, trigger });
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
    const trigger = event.target.closest(DROPDOWN_TRIGGER_SELECTOR);
    if (trigger && isWithinRoot(this, trigger)) {
      event.preventDefault();
      this.toggleMenu(trigger);
    }
  }

  onKeyDown(event) {
    handleDropdownKeydown(event, {
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
    ['ui-dropdown', UiDropdownElement],
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

// Function-path dialogs (plain `data-ui-dialog` markup, no `<ui-dialog>`
// wrapper) dispatch their `ui-dialog-*` events directly on the
// `<dialog>`/`[data-ui-dialog]` element itself, since there's no wrapper
// element to dispatch on -- the custom-element path dispatches on the
// `<ui-dialog>` wrapper instead (see `UiDialogElement.openDialog`/
// `closeDialog`), but both now go through the same `openDialogShared`/
// `closeDialogShared`/`attachDialogCloseListener` core, so both markup
// styles are otherwise behaviorally identical: events, focus handling,
// modal-vs-attribute toggling, and native-close resync all match.
export function enhanceDialogs(root = document) {
  // Attach the native-close listener up front for any dialog already in the
  // DOM (including ones server-rendered already `open`), not just ones this
  // code goes on to open itself -- matches the custom-element path, which
  // attaches its listener from `syncFromMarkup()` on connect.
  Array.from(root.querySelectorAll('dialog,[data-ui-dialog]')).forEach((dialog) => {
    if (isCustomElementHost(dialog, 'ui-dialog') || dialog.closest('ui-dialog')) {
      return;
    }
    attachDialogCloseListener(dialog, null);
  });

  const onClick = (event) => {
    const openTrigger = event.target.closest(DIALOG_TRIGGER_SELECTOR);
    if (openTrigger && isWithinRoot(root, openTrigger) && !openTrigger.closest('ui-dialog')) {
      event.preventDefault();
      const selector = openTrigger.getAttribute('aria-controls') || openTrigger.getAttribute('data-ui-dialog-target');
      const dialog = getTargetElement(root, selector);
      attachDialogCloseListener(dialog, null);
      openDialogShared(dialog, openTrigger, dialog);
      return;
    }

    const closeTrigger = event.target.closest(DIALOG_CLOSE_SELECTOR);
    if (closeTrigger && isWithinRoot(root, closeTrigger) && !closeTrigger.closest('ui-dialog')) {
      event.preventDefault();
      const dialog = closeTrigger.closest('dialog,[data-ui-dialog]');
      closeDialogShared(dialog, dialog);
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
      closeDialogShared(openDialog, openDialog);
      return;
    }

    // Native modal dialogs trap Tab themselves; back the non-modal fallback.
    if (event.key === 'Tab' && !isDialogModal(openDialog)) {
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

  root.querySelectorAll(DROPDOWN_TRIGGER_SELECTOR).forEach((trigger) => {
    if (trigger.closest('ui-dropdown')) {
      return;
    }

    const selector = trigger.getAttribute('aria-controls') || trigger.getAttribute('data-ui-dropdown-target');
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
    const trigger = event.target.closest(DROPDOWN_TRIGGER_SELECTOR);
    if (trigger && isWithinRoot(root, trigger) && !trigger.closest('ui-dropdown')) {
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

    const clickedInsideMenu = event.target.closest('[data-ui-dropdown]');
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
      const handled = handleDropdownKeydown(event, {
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

// The one drawer behaviour the Popover API cannot express declaratively. A
// drawer left open while the viewport crosses its breakpoint stays in the top
// layer, and the control that would dismiss it is gone by then -- `layout.css`
// sets `.ui-burger.is-shell-toggle { display: none }` inside
// `@media (min-width: 1024px)`, the shell's own switch width, and the shell's
// burger lives in that bar. So the panel is stuck open with nothing visible to
// close it. That is a dead end, not a cosmetic wrinkle, and it is the only
// reason this module touches drawers at all: light dismiss, Escape, focus
// return and the invoker's implicit expanded state are the platform's job and
// are not duplicated here.
//
// Generalised over `data-ui-drawer-breakpoint` rather than one hard-coded id or
// width, so any drawer can opt in at whatever width its own layout switches.
export function enhanceDrawers(root = document) {
  const teardowns = [];

  // Bail before the loop rather than letting `window.matchMedia(...)` throw.
  // `initFastBlocksUI` builds its cleanups in a single array literal, so an
  // exception raised here does not merely disable drawers -- it abandons the
  // whole literal and leaves tabs, dialogs and menus un-enhanced too. Real
  // browsers have had `matchMedia` since ~2012; the realistic exposure is a
  // non-browser DOM (this project's jsdom does not implement it).
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
    return () => {};
  }

  // Direct feature detect for the capability the callback below actually
  // uses, not a proxy. `typeof drawer.hidePopover === 'function'` used to
  // stand in for `:popover-open` selector support, but the two are
  // independent capabilities -- an engine can implement the Popover API's
  // imperative methods before its selector engine understands the
  // pseudo-class (this project's own jsdom/nwsapi pairing is exactly that
  // split), and probing an unsupported pseudo-class throws a SyntaxError
  // rather than returning false.
  const supportsPopoverOpenSelector =
    typeof CSS !== 'undefined' &&
    typeof CSS.supports === 'function' &&
    CSS.supports('selector(:popover-open)');

  const drawerSelector = '.ui-drawer[data-ui-drawer-breakpoint]';
  // `querySelectorAll` only matches descendants, never `root` itself --
  // unlike enhanceTabs/enhanceDialogs/enhanceMenus, which delegate clicks via
  // `closest()` + `isWithinRoot()` and so keep working when `root` IS the
  // matched element, this function has no click delegation to fall back on:
  // its whole job is registering a matchMedia listener per drawer up front.
  // Without this, an htmx swap that re-initialises with a drawer node as
  // `root` would silently skip that one drawer.
  const drawers = Array.from(root.querySelectorAll(drawerSelector));
  if (typeof root.matches === 'function' && root.matches(drawerSelector)) {
    drawers.push(root);
  }

  drawers.forEach((drawer) => {
    const width = Number.parseInt(drawer.dataset.uiDrawerBreakpoint, 10);
    if (!Number.isFinite(width)) {
      return;
    }

    const query = window.matchMedia(`(min-width: ${width}px)`);
    const onChange = (event) => {
      if (!event.matches || !supportsPopoverOpenSelector) {
        return;
      }

      // `hidePopover()` on a popover that is not showing throws
      // InvalidStateError, so this check is load-bearing.
      if (drawer.matches(':popover-open')) {
        drawer.hidePopover();
      }
    };

    query.addEventListener('change', onChange);
    teardowns.push(() => query.removeEventListener('change', onChange));
  });

  return () => {
    teardowns.forEach((teardown) => teardown());
  };
}

export function initFastBlocksUI(root = document) {
  defineFastBlocksCustomElements(globalThis);
  const cleanups = [
    enhanceTabs(root),
    enhanceDialogs(root),
    enhanceMenus(root),
    enhanceDrawers(root),
  ].filter(Boolean);

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
