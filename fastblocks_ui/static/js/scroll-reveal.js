/**
 * Scroll-driven reveals: IntersectionObserver + MutationObserver for
 * dynamic DOM. Per spec §2.6: gate hidden state on .js capability
 * class. Per Decision 20: counts opt-in elements at init, returns
 * early if zero.
 */
if (!document.documentElement.classList.contains("js")) {
  document.documentElement.classList.add("js");
}

const matches = document.querySelectorAll("[data-reveal]");
let io = null;
if (matches.length > 0) {
  io = new IntersectionObserver((entries) => {
    for (const e of entries) {
      if (e.isIntersecting) {
        e.target.setAttribute("data-revealed", "true");
        io.unobserve(e.target);
      }
    }
  }, { threshold: 0.1, rootMargin: "0px 0px -10% 0px" });
  matches.forEach((el) => io.observe(el));
}

const mo = new MutationObserver((muts) => {
  if (!io) return;
  for (const m of muts) {
    for (const n of m.addedNodes) {
      if (!(n instanceof Element)) continue;
      if (n.matches("[data-reveal]")) io.observe(n);
      n.querySelectorAll?.("[data-reveal]").forEach((el) => io.observe(el));
    }
  }
});
mo.observe(document.body, { childList: true, subtree: true });

export function init(root = document) {
  const newMatches = root.querySelectorAll("[data-reveal]:not([data-revealed])");
  newMatches.forEach((el) => io?.observe(el));
}

/* Per htmx contract: when a region containing [data-reveal] elements
   is swapped out, unobserve them. Without this, the IntersectionObserver
   holds references to detached nodes and the observers leak. */
export function teardown(root = document) {
  if (!io) return;
  root.querySelectorAll("[data-reveal]").forEach((el) => io.unobserve(el));
}