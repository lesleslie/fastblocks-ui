/**
 * Wires `aria-expanded` on the trigger element to the popover's
 * `toggle` event. Decision 3a: the Popover API does NOT toggle
 * `aria-expanded` automatically — without this listener, screen
 * readers receive stale state.
 *
 * Each trigger must have:
 *  -  `popovertarget="<popover-id>"`
 *  -  `aria-expanded="true|false"` (initial value: "false")
 *
 * The module counts opt-in triggers at init (Decision 20); returns
 * early when zero match — pages without popovers pay nothing.
 *
 * htmx integration contract (Task 11): the companion `init(root)`
 * function is idempotent and safe to call from `htmx:afterSwap` to
 * re-bind triggers that htmx swaps into the DOM. For now, the JS
 * module is also a stand-alone import: `import "@fastblocks-ui/popover-aria"`.
 */
const triggers = document.querySelectorAll("[popovertarget][aria-expanded]");
if (triggers.length === 0) {
  // no-op — page doesn't use popovers
} else {
  for (const trigger of triggers) {
    const popoverId = trigger.getAttribute("popovertarget");
    const popover = document.getElementById(popoverId);
    if (!popover) continue;
    popover.addEventListener("toggle", () => {
      trigger.setAttribute(
        "aria-expanded",
        popover.matches(":popover-open") ? "true" : "false",
      );
    });
  }
}

export function init(root = document) {
  // Idempotent re-scan for htmx:afterSwap.
  const newTriggers = root.querySelectorAll("[popovertarget][aria-expanded]");
  for (const trigger of newTriggers) {
    if (trigger.__popoverAriaBound) continue;
    trigger.__popoverAriaBound = true;
    const popoverId = trigger.getAttribute("popovertarget");
    const popover = document.getElementById(popoverId);
    if (!popover) continue;
    popover.addEventListener("toggle", () => {
      trigger.setAttribute(
        "aria-expanded",
        popover.matches(":popover-open") ? "true" : "false",
      );
    });
  }
}
