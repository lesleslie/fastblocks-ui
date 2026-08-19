/**
 * Three.js mesh-gradient loader. Opt-in via .has-mesh-gradient +
 * data-shader-url. Dynamic import — Three.js is NOT in the core
 * bundle. Per Decision 15: default frame rate is 30 fps (not
 * uncapped); opt in to 60 fps via data-frame-cap="60".
 */
if (!document.querySelectorAll(".has-mesh-gradient").length) {
  /* skip — page doesn't use mesh-gradient */
} else if (matchMedia("(prefers-reduced-motion: reduce)").matches) {
  /* skip — skip the effect under reduced-motion */
} else if (!canWebGL2()) {
  /* skip — fallback is the solid --ui-color-surface background */
} else {
  for (const el of document.querySelectorAll(".has-mesh-gradient")) {
    initMesh(el);
  }
}

function canWebGL2() {
  try {
    const canvas = document.createElement("canvas");
    return !!(canvas.getContext("webgl2"));
  } catch { return false; }
}

// Lazy Three.js loader: cache the import promise so multiple opt-in
// elements don't trigger N HTTP round-trips for the same module.
let THREE_PROMISE = null;
function loadThree() {
  if (THREE_PROMISE) return THREE_PROMISE;
  // Per spec Non-goal §"JS delivery": no hard-coded bare-specifier
  // imports in the shipped browser entrypoint. Consumers supply the
  // resolved URL via `window.__fastblocksUi3DLoader` (e.g. a CDN URL,
  // import map, or vendored bundle). Falls back to the bare "three"
  // specifier for unbundled dev environments.
  const loader = (typeof window !== "undefined" && window.__fastblocksUi3DLoader) || null;
  const src = loader?.three || "three";
  THREE_PROMISE = import(/* webpackIgnore: true */ /* @vite-ignore */ src).catch((e) => {
    THREE_PROMISE = null; // allow retry on next call
    return null;
  });
  return THREE_PROMISE;
}

async function initMesh(el) {
  if (el.__meshInit) return;
  el.__meshInit = true;
  el.setAttribute("data-mesh-init", "");
  const shaderUrl = el.dataset.shaderUrl;
  if (!shaderUrl) return;
  const frameCap = parseInt(el.dataset.frameCap || "30", 10);
  const THREE = await loadThree();
  if (!THREE) return;
  const response = await fetch(shaderUrl);
  if (!response.ok) return;
  const fragmentShader = await response.text();
  const canvas = document.createElement("canvas");
  const renderer = new THREE.WebGLRenderer({ canvas, alpha: true });
  const scene = new THREE.Scene();
  const camera = new THREE.Camera();
  const geometry = new THREE.PlaneGeometry(2, 2);
  const material = new THREE.ShaderMaterial({
    fragmentShader,
    vertexShader: `void main() { gl_Position = vec4(position, 1.0); }`,
    uniforms: { u_time: { value: 0 }, u_resolution: { value: new THREE.Vector2() } },
  });
  scene.add(new THREE.Mesh(geometry, material));
  el.appendChild(canvas);
  const clock = new THREE.Clock();
  let frame = 0;
  let last = 0;
  const interval = 1000 / (frameCap === 60 ? 60 : 30);
  const resize = () => {
    const width = el.clientWidth;
    const height = el.clientHeight;
    renderer.setSize(width, height, false);
    material.uniforms.u_resolution.value.set(width, height);
  };
  const render = (now) => {
    frame = requestAnimationFrame(render);
    if (now - last < interval) return;
    last = now;
    material.uniforms.u_time.value = clock.getElapsedTime();
    renderer.render(scene, camera);
  };
  resize();
  window.addEventListener("resize", resize);
  render(0);
  el.__meshCleanup = () => {
    cancelAnimationFrame(frame);
    window.removeEventListener("resize", resize);
    geometry.dispose();
    material.dispose();
    renderer.dispose();
    canvas.remove();
  };
}

export function init(root = document) {
  root.querySelectorAll(".has-mesh-gradient:not([data-mesh-init])")
    .forEach((el) => initMesh(el));
}

export function teardown(root = document) {
  root.querySelectorAll("[data-mesh-init]").forEach((el) => {
    el.__meshCleanup?.();
    delete el.__meshCleanup;
    delete el.__meshInit;
    el.removeAttribute("data-mesh-init");
  });
}

