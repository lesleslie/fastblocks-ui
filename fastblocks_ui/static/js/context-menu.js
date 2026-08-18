/**
 * Context menu: right-click + Shift-F10 + ARIA-correct keyboard nav.
 *
 * Per APG menu pattern (https://www.w3.org/WAI/ARIA/apg/patterns/menubar/):
 * - Right-click (or Shift-F10) on `[data-context-menu-target]` opens
 *   the sibling `<ul role="menu">` at the cursor position.
 * - ArrowDown / ArrowUp / Home / End navigate menuitems (roving
 *   tabindex model with all items at tabindex="-1" so Tab leaves
 *   the menu per APG -- no menubar pattern, no Tab trap).
 * - Escape closes and returns focus to the trigger.
 * - Enter / click activates a menuitem: a `context-menu-action`
 *   CustomEvent is dispatched on the trigger (bubbles) so the
 *   consumer wires their own handler.
 * - Outside-click dismiss.
 *
 * Decision 20: this module is individually importable; the initial
 * pass only registers listeners if `[data-context-menu-target]`
 * elements exist at module-load time. `init(root)` re-scans for
 * htmx:afterSwap content; the `__contextMenuBound` flag prevents
 * double-binding.
 *
 * XSS posture: this module does not interpolate caller-supplied
 * data into HTML. It uses `setAttribute` for ARIA wiring and
 * `target.dispatchEvent(new CustomEvent(...))` to fire the action
 * event. The Python `context_menu()` helper emits escaped menuitem
 * markup; a malicious label is rendered as literal text in the
 * browser, never as a script tag.
 */

function bind(target) {
  if (target.__contextMenuBound) return;
  target.__contextMenuBound = true;

  // The menu is a sibling of the target in the fixture; consumers
  // may place it elsewhere, in which case they supply
  // `data-context-menu-id="<selector>"`.
  const menuId = target.id + "-menu";
  const menuSelector = target.dataset.contextMenuId || "#" + menuId;
  const menu = document.querySelector(menuSelector);
  if (!menu) return;

  // APG: the trigger MUST expose `aria-haspopup="menu"` for screen
  // readers to announce the context menu as available. Set it
  // defensively even though the fixture already includes it.
  target.setAttribute("aria-haspopup", "menu");

  function show(e) {
    e.preventDefault();
    menu.hidden = false;
    menu.style.position = "fixed";
    menu.style.left = `${e.clientX}px`;
    menu.style.top = `${e.clientY}px`;
    // Focus the first menuitem per APG roving tabindex pattern.
    const first = menu.querySelector('[role="menuitem"]');
    first?.focus();
  }

  function hide() {
    menu.hidden = true;
  }

  target.addEventListener("contextmenu", show);

  // Shift+F10 is the keyboard equivalent of right-click per APG.
  // The synthetic event object passed to `show` is duck-typed
  // (preventDefault + clientX/Y only); it is not a real Event.
  target.addEventListener("keydown", (e) => {
    if (e.key === "F10" && e.shiftKey) {
      e.preventDefault();
      const rect = target.getBoundingClientRect();
      show({
        preventDefault: () => {},
        clientX: rect.left,
        clientY: rect.bottom,
      });
    }
  });

  // Roving focus within the menu.
  menu.addEventListener("keydown", (e) => {
    const items = [...menu.querySelectorAll('[role="menuitem"]')];
    if (items.length === 0) return;
    const idx = items.indexOf(document.activeElement);
    if (e.key === "ArrowDown") {
      e.preventDefault();
      items[(idx + 1 + items.length) % items.length].focus();
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      items[(idx - 1 + items.length) % items.length].focus();
    } else if (e.key === "Home") {
      e.preventDefault();
      items[0].focus();
    } else if (e.key === "End") {
      e.preventDefault();
      items[items.length - 1].focus();
    } else if (e.key === "Escape") {
      hide();
      target.focus();
    } else if (e.key === "Tab") {
      // APG: Tab leaves the menu (no menubar pattern).
      hide();
      target.focus();
    } else if (e.key === "Enter" || e.key === " ") {
      // APG: Enter/Space activates the focused menuitem. We share
      // the click path so the CustomEvent and hide() logic live in
      // one place. Re-dispatch the keydown as a click on the
      // focused item so a single menu.click handler stays the
      // source of truth.
      e.preventDefault();
      const focused = document.activeElement;
      if (focused && focused.getAttribute("role") === "menuitem") {
        focused.click();
      }
    }
  });

  // Click handler for menuitems. Fires when a menuitem is clicked;
  // hides the menu first so the outside-click handler below (which
  // also fires because click events bubble to document) is a
  // no-op against an already-hidden menu.
  menu.addEventListener("click", (e) => {
    const item = e.target.closest('[role="menuitem"]');
    if (!item) return;
    const action = item.dataset.action;
    if (action) {
      // Dispatch a CustomEvent on the trigger so the consumer can
      // wire their own handler. CustomEvent is XSS-safe: no
      // innerHTML interpolation of `action` happens anywhere.
      target.dispatchEvent(
        new CustomEvent("context-menu-action", {
          detail: { action, item, target },
          bubbles: true,
        })
      );
    }
    hide();
  });

  // Outside-click dismiss. Click events bubble, so this also fires
  // for menuitem clicks -- but the inside handler above has
  // already hidden the menu by then, and the `!menu.hidden` guard
  // makes the outside handler a no-op (idempotent).
  document.addEventListener("click", (e) => {
    if (!menu.hidden && !menu.contains(e.target) && !target.contains(e.target)) {
      hide();
    }
  });
}

// Decision 20: opt-in. Only attach listeners if at least one
// `[data-context-menu-target]` element exists at module-load time.
const targets = document.querySelectorAll("[data-context-menu-target]");
for (const target of targets) {
  bind(target);
}

/**
 * Idempotent re-scan for htmx:afterSwap (or any other dynamic
 * content insertion). The `__contextMenuBound` flag prevents
 * double-binding.
 */
export function init(root = document) {
  const newTargets = root.querySelectorAll("[data-context-menu-target]");
  for (const target of newTargets) {
    bind(target);
  }
}