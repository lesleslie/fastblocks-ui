/**
 * Tilt on hover: 8deg max tilt. Per spec §2.7, skipped under
 * pointer: coarse and prefers-reduced-motion.
 *
 * Per Decision 20: opt-in count at module load; skip registration when
 * zero. Pages without `[data-tilt]` pay nothing.
 */
const hasTiltOptIn = document.querySelectorAll("[data-tilt]").length > 0;
const reducedMotion = matchMedia("(prefers-reduced-motion: reduce)").matches;
const coarsePointer = matchMedia("(pointer: coarse)").matches;

if (hasTiltOptIn && !reducedMotion && !coarsePointer) {
  document.addEventListener("pointermove", (e) => {
    const el = e.target.closest("[data-tilt]");
    if (!el) return;
    const r = el.getBoundingClientRect();
    const x = (e.clientX - r.left) / r.width - 0.5;
    const y = (e.clientY - r.top) / r.height - 0.5;
    el.style.setProperty("--ui-tilt-x", `${x * 8}deg`);
    el.style.setProperty("--ui-tilt-y", `${-y * 8}deg`);
  }, { passive: true });
}

export function init() { /* global listener self-filters via closest() */ }

/* Per htmx contract: clear transform on swapped-out [data-tilt] elements. */
export function teardown(root = document) {
  root.querySelectorAll("[data-tilt]").forEach((el) => {
    el.style.setProperty("--ui-tilt-x", "0deg");
    el.style.setProperty("--ui-tilt-y", "0deg");
  });
}