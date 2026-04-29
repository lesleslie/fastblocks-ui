const TAB_SELECTOR = '[data-ui-tab-target]';
const PANEL_SELECTOR = '[data-ui-panel]';
const DIALOG_TRIGGER_SELECTOR = '[data-ui-dialog-trigger]';
const DIALOG_CLOSE_SELECTOR = '[data-ui-dialog-close]';
const MENU_TRIGGER_SELECTOR = '[data-ui-menu-trigger]';

function getTargetElement(root, selector) {
  if (!selector) {
    return null;
  }

  try {
    return root.querySelector(selector);
  } catch {
    return null;
  }
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

export function enhanceTabs(root = document) {
  const tabRoots = Array.from(root.querySelectorAll('[data-ui-tabs]'));

  tabRoots.forEach((tabRoot) => {
    const activeTab =
      tabRoot.querySelector(`${TAB_SELECTOR}[aria-selected="true"]`) ||
      tabRoot.querySelector(TAB_SELECTOR);

    if (activeTab) {
      setSelectedTabState(tabRoot, activeTab);
    }
  });

  const onClick = (event) => {
    const tab = event.target.closest(TAB_SELECTOR);
    if (!tab || !root.contains(tab)) {
      return;
    }

    const tabRoot = tab.closest('[data-ui-tabs]');
    if (!tabRoot) {
      return;
    }

    event.preventDefault();
    activateTab(tabRoot, tab);
  };

  const onKeyDown = (event) => {
    const tab = event.target.closest(TAB_SELECTOR);
    if (!tab || !root.contains(tab)) {
      return;
    }

    const tabRoot = tab.closest('[data-ui-tabs]');
    if (!tabRoot) {
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
  } else {
    dialog.setAttribute('open', '');
  }

  dialog.setAttribute('aria-hidden', 'false');
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
    trigger.focus({ preventScroll: true });
  }

  dialog.__uiTrigger = null;
}

export function enhanceDialogs(root = document) {
  const onClick = (event) => {
    const openTrigger = event.target.closest(DIALOG_TRIGGER_SELECTOR);
    if (openTrigger && root.contains(openTrigger)) {
      event.preventDefault();
      const selector = openTrigger.getAttribute('aria-controls') || openTrigger.getAttribute('data-ui-dialog-target');
      const dialog = getTargetElement(root, selector);
      showDialog(dialog, openTrigger);
      return;
    }

    const closeTrigger = event.target.closest(DIALOG_CLOSE_SELECTOR);
    if (closeTrigger && root.contains(closeTrigger)) {
      event.preventDefault();
      const dialog = closeTrigger.closest('dialog,[data-ui-dialog]');
      closeDialog(dialog);
    }
  };

  const onKeyDown = (event) => {
    if (event.key !== 'Escape') {
      return;
    }

    const openDialog = root.querySelector('dialog[open], [data-ui-dialog][open]');
    if (openDialog) {
      closeDialog(openDialog);
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
  menu.setAttribute('aria-hidden', 'false');
  trigger.setAttribute('aria-expanded', 'true');
  trigger.dataset.uiMenuOpen = 'true';
}

function closeMenu(trigger, menu) {
  if (!trigger || !menu) {
    return;
  }

  menu.hidden = true;
  menu.setAttribute('aria-hidden', 'true');
  trigger.setAttribute('aria-expanded', 'false');
  trigger.dataset.uiMenuOpen = 'false';
}

export function enhanceMenus(root = document) {
  const menus = new Map();

  root.querySelectorAll(MENU_TRIGGER_SELECTOR).forEach((trigger) => {
    const selector = trigger.getAttribute('aria-controls') || trigger.getAttribute('data-ui-menu-target');
    const menu = getTargetElement(root, selector);
    if (!menu) {
      return;
    }

    menu.hidden = menu.hidden ?? true;
    menu.setAttribute('aria-hidden', menu.hidden ? 'true' : 'false');
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
    if (trigger && root.contains(trigger)) {
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
    if (event.key !== 'Escape') {
      return;
    }

    closeAllMenus();
  };

  root.addEventListener('click', onClick);
  root.addEventListener('keydown', onKeyDown);

  return () => {
    root.removeEventListener('click', onClick);
    root.removeEventListener('keydown', onKeyDown);
  };
}

export function initFastBlocksUI(root = document) {
  const cleanups = [enhanceTabs(root), enhanceDialogs(root), enhanceMenus(root)].filter(Boolean);

  return () => {
    cleanups.forEach((cleanup) => cleanup());
  };
}

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
