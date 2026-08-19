/**
 * Lottie loader. IntersectionObserver-gated: off-screen Lotties don't
 * fetch until just before they're visible (per spec §3.4). Reduced-
 * motion fallback uses the poster via the `--ui-lottie-poster` custom
 * property (consumed by CSS background-image; per Decision 19, JS
 * writes only `--ui-*` vars, never `el.style.backgroundImage` directly).
 */
const targets = document.querySelectorAll(".has-lottie");
let lottieModule = null;
const io = new IntersectionObserver((entries) => {
  for (const e of entries) {
    if (e.isIntersecting) initLottie(e.target);
    io.unobserve(e.target);
  }
}, { rootMargin: "200px" });

if (targets.length > 0) {
  if (matchMedia("(prefers-reduced-motion: reduce)").matches) {
    // Skip animation; show poster via CSS custom property.
    for (const t of targets) {
      const url = t.dataset.lottiePosterUrl;
      if (url) t.style.setProperty("--ui-lottie-poster", `url(${url})`);
    }
  } else {
    targets.forEach((t) => io.observe(t));
  }
}

// Lazy Lottie loader (same registry pattern as Three.js)
function loadLottie() {
  if (lottieModule) return Promise.resolve(lottieModule);
  const loader = (typeof window !== "undefined" && window.__fastblocksUi3DLoader) || null;
  const src = loader?.lottieWeb || "lottie-web";
  return import(/* webpackIgnore: true */ /* @vite-ignore */ src)
    .then((m) => { lottieModule = m; return m; })
    .catch(() => null);
}

async function initLottie(el) {
  if (el.__lottieInit) return;
  el.__lottieInit = true;
  el.setAttribute("data-lottie-init", "");
  const url = el.dataset.lottieUrl;
  if (!url) return;
  const lottie = await loadLottie();
  if (!lottie) return;
  lottie.default.loadAnimation({
    container: el,
    renderer: "svg",
    loop: el.dataset.lottieLoop !== "false",
    autoplay: true,
    path: url,
  });
}

export function init(root = document) {
  root.querySelectorAll(".has-lottie:not([data-lottie-init])")
    .forEach((el) => io.observe(el));
}

export function teardown(root = document) {
  root.querySelectorAll(".has-lottie[data-lottie-init]").forEach((el) => {
    io.unobserve(el);
    delete el.__lottieInit;
    el.removeAttribute("data-lottie-init");
  });
}

