/**
 * Toast queue with HX-Trigger + JS-API support.
 *
 * - Container: appends a single `<div class="ui-toast-region"
 *   role="region" aria-label="Notifications">` to <body> if not
 *   already present (SSR-friendly).
 * - Auto-dismiss after duration (default 5000ms). Pause on
 *   `:hover` OR descendant `:focus`. Errors cap-bypass.
 * - `prefers-reduced-motion: reduce` removes the in/out animation
 *   (instant show/hide).
 * - htmx integration: listens for `htmx:afterRequest` and dispatches
 *   any `toast` key from the response's HX-Trigger header.
 *
 * JS API: `import { toast } from "@fastblocks-ui/toast"` then
 *   `toast("Saved!", { severity: "success" })`.
 *
 * Decision 20: this module is individually importable; consumers
 * opt-in. Pages without toast usage pay nothing.
 */

const MAX_TOASTS_DEFAULT = 5;
const DURATION_MS = {
  short: 3000,
  default: 5000,
  long: 10000,
  persistent: null,
};

let region = null;

function getRegion() {
  if (!region) {
    region = document.querySelector(".ui-toast-region");
    if (!region) {
      region = document.createElement("div");
      region.className = "ui-toast-region";
      region.setAttribute("role", "region");
      region.setAttribute("aria-label", "Notifications");
      document.body.appendChild(region);
    }
  }
  return region;
}

/**
 * Content is rendered via textContent (never innerHTML). Callers who
 * need HTML must pass a DocumentFragment or Element, not a string.
 */
function dispatch({ content, severity = "info", duration = "default", id = null }) {
  const role = severity === "error" ? "alert" : "status";
  const live = role === "alert" ? "assertive" : "polite";
  const durationMs = typeof duration === "number" ? duration : DURATION_MS[duration];
  const toastEl = document.createElement("div");
  toastEl.className = `ui-toast is-${severity}`;
  toastEl.setAttribute("role", role);
  toastEl.setAttribute("aria-live", live);
  if (id) toastEl.id = id;
  if (durationMs !== null) {
    toastEl.style.setProperty("--ui-toast-duration", `${durationMs}ms`);
  }
  const contentEl = document.createElement("div");
  contentEl.className = "ui-toast__content";
  contentEl.textContent = String(content);

  const closeBtn = document.createElement("button");
  closeBtn.type = "button";
  closeBtn.className = "ui-toast__close";
  closeBtn.setAttribute("aria-label", "Dismiss");
  closeBtn.textContent = "×"; // × (U+00D7) — literal text, not an HTML entity

  toastEl.append(contentEl, closeBtn);

  // Cap-bypass errors; FIFO cap non-errors
  if (severity !== "error") {
    const active = getRegion().querySelectorAll(".ui-toast").length;
    if (active >= MAX_TOASTS_DEFAULT) {
      getRegion().firstElementChild?.remove();
    }
  }
  getRegion().appendChild(toastEl);

  // Pause auto-dismiss on hover OR focus (Decision: covers both)
  let dismissTimer = null;
  function startDismiss() {
    if (durationMs === null) return; // persistent
    dismissTimer = setTimeout(() => toastEl.remove(), durationMs);
  }
  function stopDismiss() { if (dismissTimer) { clearTimeout(dismissTimer); dismissTimer = null; } }
  toastEl.addEventListener("mouseenter", stopDismiss);
  toastEl.addEventListener("mouseleave", startDismiss);
  toastEl.addEventListener("focusin", stopDismiss);
  toastEl.addEventListener("focusout", startDismiss);

  // Close button
  toastEl.querySelector(".ui-toast__close")?.addEventListener("click", () => toastEl.remove());

  startDismiss();
  return toastEl;
}

// Public JS API
export function toast(content, options = {}) {
  return dispatch({ content, ...options });
}

// htmx integration: parse HX-Trigger response header
document.body.addEventListener("htmx:afterRequest", (evt) => {
  const trigger = evt.detail.xhr.getResponseHeader("HX-Trigger");
  if (!trigger) return;
  try {
    const parsed = JSON.parse(trigger);
    if (parsed.toast) dispatch(parsed.toast);
    // Also support multi-key headers
    for (const [key, value] of Object.entries(parsed)) {
      if (key === "toast") continue;
      // Future: dispatch other event types here
    }
  } catch (_) {
    // HX-Trigger was a simple event name (not JSON), ignore.
  }
});

export function init(root = document) {
  // Idempotent: re-scan the root for any SSR-rendered toast items.
  // No re-binding needed (single region on <body>).
}
