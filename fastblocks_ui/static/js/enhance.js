const TAB_SELECTOR = '[data-ui-tab-target]';
const PANEL_SELECTOR = '[data-ui-panel]';
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

export function defineFastBlocksCustomElements(root = globalThis) {
  const registry = root?.customElements;
  if (!registry) {
    return false;
  }

  // `<ui-tabs>` is the only custom element left. `<ui-dialog>` and
  // `<ui-dropdown>` were removed once command/commandfor and the Popover API
  // took over -- they had become wrappers whose JavaScript could never fire,
  // since the helpers stopped emitting the trigger attributes they looked for.
  const definitions = [['ui-tabs', UiTabsElement]];

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

export function enhanceDrawers(root = document) {
  const teardowns = [];

  // Bail before the loop rather than letting `window.matchMedia(...)` throw.
  // `initFastBlocksUI` builds its cleanups in a single array literal, so an
  // exception raised here does not merely disable drawers -- it abandons the
  // whole literal and leaves tabs and dialog autoshow without their cleanup handles too. Real
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
  // unlike enhanceTabs, which delegates clicks via
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

// The only JavaScript Spec B adds, and the counterpart to dropping non-modal
// `<dialog open>`. A server can no longer render "this dialog is open"
// declaratively, so it renders `data-ui-dialog-autoshow` instead and this
// promotes it to `showModal()` -- on load, and again after an htmx swap
// replaces the markup.
//
// Behaviour-only and degrades cleanly: with no JavaScript the dialog simply
// renders closed. Deliberately NOT exported -- the public surface is the
// attribute, not this function.
function enhanceDialogAutoshow(root = document) {
  const selector = 'dialog[data-ui-dialog-autoshow]';

  const open = (dialog) => {
    if (dialog.open || typeof dialog.showModal !== 'function') {
      return;
    }
    try {
      dialog.showModal();
    } catch {
      // showModal() throws InvalidStateError on a disconnected element. This
      // runs inside initFastBlocksUI's array literal, so an unguarded throw
      // here would abort before enhanceDrawers() registers -- exactly the
      // failure enhanceDrawers' own comment warns about.
    }
  };

  const show = () => {
    // `querySelectorAll` matches descendants only, never `root` itself. An htmx
    // swap can hand us the swapped node AS `root`, so a dialog that is the
    // swap target would otherwise never open. Same guard enhanceDrawers uses.
    root.querySelectorAll(selector).forEach(open);
    if (typeof root.matches === 'function' && root.matches(selector)) {
      open(root);
    }
  };

  show();

  // Bound to `root`, not `document`: htmx:afterSwap bubbles, so a
  // document-level listener would (a) accumulate one permanent listener per
  // re-init, each closing over a detached fragment, and (b) re-open a dialog
  // the user had dismissed whenever ANY unrelated swap fired elsewhere on the
  // page. Listening on `root` scopes both problems to the subtree that owns
  // the dialog.
  const target = typeof root.addEventListener === 'function' ? root : document;
  target.addEventListener('htmx:afterSwap', show);
  return () => target.removeEventListener('htmx:afterSwap', show);
}

export function initFastBlocksUI(root = document) {
  defineFastBlocksCustomElements(globalThis);
  const cleanups = [
    enhanceTabs(root),
    enhanceDialogAutoshow(root),
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
