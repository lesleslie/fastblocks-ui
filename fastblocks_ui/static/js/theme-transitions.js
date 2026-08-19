/**
 * Theme transitions: set [data-theme-changing] flag on :root during
 * the brief theme-switch window so CSS can apply transitions to the
 * narrowed selector list (Decision 13). Consumers opt out via
 * [data-theme-instant] on <html>.
 *
 * Race-condition fix: rapid theme toggles would re-schedule overlapping
 * setTimeout handlers, and a stale timeout would clear the flag while
 * a new transition is still in flight. The `token` counter ensures
 * only the most recent toggle's timeout wins.
 */
let themeChangeToken = 0;
document.documentElement.addEventListener("data-theme-change", () => {
  const my = ++themeChangeToken;
  document.documentElement.setAttribute("data-theme-changing", "");
  setTimeout(() => {
    if (my === themeChangeToken) {
      document.documentElement.removeAttribute("data-theme-changing");
    }
  }, 250); // slightly longer than --ui-motion-duration-base
});

export function init() { /* listener self-registers once */ }
export function teardown() { /* no-op: document-level listener survives swap */ }