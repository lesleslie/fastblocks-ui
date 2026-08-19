/**
 * htmx integration orchestrator. Per spec Cross-cutting htmx + htmy
 * contract: every JS module is init(root)-aware; this orchestrator
 * calls each module's init() after htmx:afterSwap fires, so DOM
 * added by htmx is observed without consumers manually wiring each
 * module.
 *
 * Consumers wire this once at their htmx boot:
 *   import "@fastblocks-ui/htmx-integration";
 *
 * Or call window.__fastblocksUiAfterSwap(root) directly for htmy.
 */
const initFns = [];

// Discovery: collect init() from each known module via dynamic import.
// Lazy: each module is only loaded if the page has opted in.
//
// Note: `toast-queue.js`, `command-palette.js`, `theme-transitions.js`,
// and `page-transitions.js` are deliberately NOT in KNOWN_MODULES:
// - `toast-queue.js` and `command-palette.js` self-register their
//   document-level listeners at module load (no per-element init)
// - `theme-transitions.js` and `page-transitions.js` are wrappers
//   consumers call explicitly, not auto-init enhancers
// Consumers wire these directly via `import "@fastblocks-ui/toast-queue"`
// or `import { open_command_palette } from "@fastblocks-ui/command-palette"`.
const KNOWN_MODULES = [
  { name: "spotlight", selector: ".has-spotlight" },
  { name: "scroll-reveal", selector: "[data-reveal]" },
  { name: "tilt", selector: "[data-tilt]" },
  { name: "popover-aria", selector: "[popovertarget][aria-expanded]" },
  { name: "context-menu", selector: "[data-context-menu-target]" },
  { name: "lottie-loader", selector: ".has-lottie" },
  { name: "mesh-gradient", selector: ".has-mesh-gradient" },
  { name: "video-bg", selector: ".has-video-bg" },
  { name: "spline-embed", selector: ".ui-spline" },
];

async function reinit(root) {
  for (const mod of KNOWN_MODULES) {
    if (!root.querySelector(mod.selector)) continue;
    // Lazy-import once per module; subsequent calls re-use the cached
    // module but ALWAYS call init(root) so newly-swapped-in opt-in
    // elements get bound. The original draft had `if (mod.mod.__loaded)
    // continue;` here, which short-circuited the init() call on every
    // subsequent swap — silently breaking the orchestrator (any
    // newly-swapped `[data-reveal]` / `[popovertarget]` element would
    // never get bound). The flag now gates only the dynamic import,
    // not the init() call.
    if (!mod.mod) {
      try {
        mod.mod = await resolveModule(mod.name);
        mod.mod.__loaded = true;
      } catch (e) { /* module failed to load — ignore */ }
    }
    mod.mod?.init?.(root);
  }
}

/**
 * Resolve a module path. Consumers can override paths via
 * `window.__fastblocksUiModuleMap = { spotlight: "https://cdn.example/spotlight.js", ... }`
 * (per the spec's Non-goal §"JS delivery / bundling": no hard-coded
 * bare-specifier imports in the shipped browser entrypoint). The
 * `__fastblocksUiModuleMap` is read fresh on every resolve call so
 * late-bound registry updates work. Falls back to the default
 * `/static/js/<name>.js` path.
 *
 * Cross-task deviation: the brief's default was `/static/js/${name}.js`,
 * but the Playwright dev server (python3 -m http.server) serves the
 * repo root, so `/static/js/...` doesn't resolve — the modules live at
 * `/fastblocks_ui/static/js/...`. This is a path-only change; the
 * `__fastblocksUiModuleMap` registry override still works the same way.
 */
async function resolveModule(name) {
  const registry = (typeof window !== "undefined" && window.__fastblocksUiModuleMap) || {};
  const url = registry[name] || `/fastblocks_ui/static/js/${name}.js`;
  return await import(/* @vite-ignore */ /* webpackIgnore: true */ url);
}

// Initial re-scan at module load
reinit(document);

// htmx integration. htmx fires `htmx:afterSwap` on `document` (not
// `document.body`), so we listen there. Brief's verbatim `document.body`
// would silently miss every real htmx swap — deviation noted in the
// task-11 report.
document.addEventListener("htmx:afterSwap", (e) => {
  reinit(e.detail.elt || document);
});

// htmy fallback: expose a global hook
window.__fastblocksUiAfterSwap = reinit;

export function init(root = document) { reinit(root); }
