/**
 * Cursor-follow spotlight glow. Per Decision 22, opacity defaults to 0
 * until JS sets data-spotlight-active="1" — fail-closed. Skipped under
 * pointer: coarse (touch) and prefers-reduced-motion.
 *
 * Per Decision 20: opt-in count at module load; skip registration when
 * zero. Pages without `.has-spotlight` pay nothing.
 */
const hasOptIn = document.querySelectorAll(".has-spotlight").length > 0;
const reducedMotion = matchMedia("(prefers-reduced-motion: reduce)").matches;
const coarsePointer = matchMedia("(pointer: coarse)").matches;

if (hasOptIn && !reducedMotion && !coarsePointer) {
  document.addEventListener("pointermove", (e) => {
    const el = e.target.closest(".has-spotlight");
    if (!el) return;
    if (el.__spotlightBound) return;
    el.__spotlightBound = true;
    el.setAttribute("data-spotlight-active", "1");
    const update = (ev) => {
      const r = el.getBoundingClientRect();
      el.style.setProperty("--ui-spotlight-x", `${ev.clientX - r.left}px`);
      el.style.setProperty("--ui-spotlight-y", `${ev.clientY - r.top}px`);
    };
    el.addEventListener("pointermove", update);
  }, { passive: true });
}

export function init(root = document) {
  /* The global listener is registered once at module load; init()
     is a no-op for spotlight specifically (the listener self-filters
     via e.target.closest()). reinit() after htmx:afterSwap doesn't
     need to do anything for spotlight — the listener handles new
     .has-spotlight elements automatically. */
}

export function teardown(root = document) {
  /* Per htmx contract: when a region is swapped out, remove the
     data-spotlight-active attribute and clear the bound flag so the
     swapped-in element (if any) gets re-bound on the next hover. */
  root.querySelectorAll("[data-spotlight-active]").forEach((el) => {
    el.removeAttribute("data-spotlight-active");
    delete el.__spotlightBound;
  });
}