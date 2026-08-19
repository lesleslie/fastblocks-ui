const targets = document.querySelectorAll(".ui-model-viewer");
let modelViewerModule = null;

function loadModelViewer() {
  if (modelViewerModule) return Promise.resolve(modelViewerModule);
  const loader = (typeof window !== "undefined" && window.__fastblocksUi3DLoader) || null;
  const src = loader?.modelViewer || "@google/model-viewer";
  return import(/* webpackIgnore: true */ /* @vite-ignore */ src)
    .then((m) => { modelViewerModule = m; return m; })
    .catch(() => null);
}

async function initModelViewer() {
  if (document.querySelector("model-viewer")) return; // already registered
  const mod = await loadModelViewer();
  if (!mod) return;
  // @google/model-viewer is a side-effect import: importing it
  // registers the <model-viewer> custom element.
}

export function init(root = document) {
  if (targets.length === 0) return;
  initModelViewer();
}

export function teardown(root = document) {
  /* No-op: <model-viewer> is a self-contained custom element. The
     implementer may add a graceful-dispose hook here for hot-swap
     consumers (e.g. luma.gl scene teardown). */
}