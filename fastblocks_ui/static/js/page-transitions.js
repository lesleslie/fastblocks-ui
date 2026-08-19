/**
 * Page transitions wrapper. Per Decision 14 + htmx integration
 * contract: consumers call this explicitly from their router
 * (htmx:beforeSwap, Turbo:before-render, fetch + DOM swap).
 *
 * No global click listener is registered on `<a>` elements.
 *
 * Per the spec's Risk #16 mitigation: page transitions are gated on
 * (a) consumer opt-in via `data-allow-vt="true"` on <html> and
 * (b) `navigator.deviceMemory >= 4` (>= 4 GB RAM). Pages with
 * mesh-gradient + video + lottie that don't opt in get the instant
 * fallback, not the OOM-riskful 50-150 MB screenshot capture.
 */
let inFlight = null;
let consumerCallback = null;
const ALLOW_OPT_IN = "data-allow-vt";
const MEMORY_THRESHOLD_GB = 4;

function shouldUseViewTransition() {
  // Consumer opt-in (page must declare consent)
  if (!document.documentElement.hasAttribute(ALLOW_OPT_IN)) return false;
  // Reduced-motion users get the instant fallback
  if (matchMedia("(prefers-reduced-motion: reduce)").matches) return false;
  // Memory threshold: skip on low-RAM devices
  if (typeof navigator !== "undefined" && navigator.deviceMemory != null) {
    if (navigator.deviceMemory < MEMORY_THRESHOLD_GB) return false;
  }
  // API availability
  if (typeof document.startViewTransition !== "function") return false;
  return true;
}

export function init(root = document, options = {}) {
  consumerCallback = options.transitionCallback || defaultCallback;
}

function defaultCallback(updateDOM) {
  updateDOM();
}

export async function transition(updateDOM) {
  if (inFlight) return inFlight;
  if (shouldUseViewTransition()) {
    inFlight = document.startViewTransition(() => consumerCallback(updateDOM));
    try { await inFlight; }
    finally { inFlight = null; }
    return inFlight;
  } else {
    // Instant fallback (no view transition)
    consumerCallback(updateDOM);
  }
}

export function teardown() { /* no-op: wrapper function, no listeners */ }