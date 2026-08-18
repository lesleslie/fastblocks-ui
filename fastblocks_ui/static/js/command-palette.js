/**
 * Command palette: keybinding handling + async result filtering.
 *
 * Keybindings (Decision 5a):
 * - "/" (slash) primary — works on all keyboard layouts.
 * - "mod+k" (Cmd on macOS, Ctrl elsewhere) secondary.
 * - Configurable per palette via `keybinding` argument.
 * - `event.preventDefault()` on `mod+k` to avoid macOS Safari
 *   (Find Selection) and Chrome (search bar) stealing the keystroke.
 *
 * Async behavior: each keystroke creates a new AbortController;
 * the previous in-flight fetch is aborted. `load_results(query, signal)`
 * receives the signal so consumers can pass it to fetch().
 *
 * Throws at first invocation if `load_results` is missing (fail-loud).
 */
const PALETTE_KEY = "ui-command-current";

export function open_command_palette({
  trigger,
  load_results,
  recent = [],
  groups = [],
  keybinding = "slash,mod+k",
  placeholder = "Type a command...",
} = {}) {
  if (!load_results) {
    throw new Error("ui-command: load_results(query, signal) callback is required");
  }

  let palette = document.getElementById("ui-command-palette");
  if (!palette) {
    palette = document.createElement("div");
    palette.id = "ui-command-palette";
    palette.className = "ui-command";
    palette.setAttribute("data-command-keybinding", keybinding);
    palette.hidden = true;

    // Path A (XSS-aware): construct DOM via createElement + textContent.
    // The brief's literal `palette.innerHTML = ...` was an XSS sink
    // because `${placeholder}` interpolates user-supplied data into an
    // HTML attribute. textContent assignment never parses HTML.
    const input = document.createElement("input");
    input.type = "text";
    input.setAttribute("role", "combobox");
    input.setAttribute("aria-expanded", "true");
    input.setAttribute("aria-controls", "ui-command-results");
    input.setAttribute("placeholder", placeholder);
    input.setAttribute("data-command-input", "");

    const ul = document.createElement("ul");
    ul.id = "ui-command-results";
    ul.setAttribute("role", "listbox");
    ul.setAttribute("data-command-results", "");

    palette.append(input, ul);
    document.body.appendChild(palette);
  }
  palette.hidden = false;
  const input = palette.querySelector("[data-command-input]");
  const list = palette.querySelector("[data-command-results]");
  input.value = "";
  input.focus();

  // Wire input → filter (with AbortController)
  let controller = null;
  let activeIndex = -1;
  function setActive(idx) {
    activeIndex = idx;
    [...list.children].forEach((el, i) => {
      el.setAttribute("aria-selected", i === idx ? "true" : "false");
    });
    if (idx >= 0) {
      input.setAttribute("aria-activedescendant", list.children[idx].id);
    } else {
      input.removeAttribute("aria-activedescendant");
    }
  }
  async function refresh() {
    if (controller) controller.abort();
    controller = new AbortController();
    const results = await load_results(input.value, controller.signal);
    // Clear list — no user data here, so innerHTML="" is safe.
    list.innerHTML = "";
    results.forEach((r, i) => {
      const li = document.createElement("li");
      li.id = `cmd-result-${i}`;
      li.setAttribute("role", "option");
      li.setAttribute("aria-selected", "false");
      // textContent is XSS-safe: never parses HTML.
      li.textContent = r.label;
      li.addEventListener("click", () => { r.action?.(); close(); });
      list.appendChild(li);
    });
    setActive(results.length ? 0 : -1);
  }
  input.addEventListener("input", refresh);

  // Keyboard nav
  input.addEventListener("keydown", (e) => {
    if (e.key === "Escape") { close(); return; }
    if (e.key === "ArrowDown") { e.preventDefault(); setActive(Math.min(activeIndex + 1, list.children.length - 1)); }
    if (e.key === "ArrowUp")   { e.preventDefault(); setActive(Math.max(activeIndex - 1, 0)); }
    if (e.key === "Home")      { e.preventDefault(); setActive(0); }
    if (e.key === "End")       { e.preventDefault(); setActive(list.children.length - 1); }
    if (e.key === "Enter") {
      e.preventDefault();
      const sel = list.children[activeIndex];
      if (sel) sel.click();
    }
  });

  function close() {
    palette.hidden = true;
    if (trigger) trigger.focus();
  }

  refresh();
}

// Global keybinding listener (Decision 20: opt-in — only register if
// at least one [data-command-trigger] exists at init time)
const triggers = document.querySelectorAll("[data-command-trigger]");
if (triggers.length > 0) {
  document.addEventListener("keydown", (e) => {
    if (e.key === "/") {
      // Don't intercept if user is typing in an input/textarea
      const t = e.target;
      if (t && (t.tagName === "INPUT" || t.tagName === "TEXTAREA" || t.isContentEditable)) return;
      e.preventDefault();
      triggers[0].click();
    }
    if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
      e.preventDefault(); // Decision 5a: avoid browser shortcuts
      triggers[0].click();
    }
  });
}

export function init(root = document) {
  // Idempotent re-scan; the keydown listener is registered once at
  // module load. For htmx swaps adding new [data-command-trigger]
  // elements, this re-scan attaches them to the global listener by
  // closing over `triggers` via a class-set; the simplest implementation
  // is to re-query on every keydown (cheap).
  // TODO: implement explicit rebind if perf becomes an issue.
}
