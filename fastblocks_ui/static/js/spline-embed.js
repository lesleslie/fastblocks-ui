const targets = document.querySelectorAll(".ui-spline");
let splineViewer = null;

function loadSpline() {
  if (splineViewer) return Promise.resolve(splineViewer);
  const loader = (typeof window !== "undefined" && window.__fastblocksUi3DLoader) || null;
  const src = loader?.spline || "@splinetool/viewer";
  return import(/* webpackIgnore: true */ /* @vite-ignore */ src)
    .then((m) => { splineViewer = m; return m; })
    .catch(() => null);
}

async function initSpline(el) {
  if (el.__splineInit) return;
  el.__splineInit = true;
  const url = el.dataset.splineUrl;
  if (!url) return;
  if (matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  const mod = await loadSpline();
  if (!mod) return;
  // SplineViewer's API: new Application(canvas) + load(url)
  const canvas = document.createElement("canvas");
  el.appendChild(canvas);
  const app = new mod.Application(canvas);
  await app.load(url);
}

export function init(root = document) {
  root.querySelectorAll(".ui-spline:not([data-spline-init])")
    .forEach(initSpline);
}

export function teardown(root = document) {
  root.querySelectorAll(".ui-spline[data-spline-init]").forEach((el) => {
    delete el.__splineInit;
    el.innerHTML = ""; // Spline disposes on canvas removal
  });
}
