async function loadManifestData(root) {
  // Prefer manifest data embedded directly in the page (a
  // `<script type="application/json" id="fastblocks-ui-manifest-data">`
  // sibling), if present. This is what lets self-contained demo pages that
  // are opened as a bare `file://` document (no server) still render this
  // section: `fetch()` of another local file is blocked by browsers under
  // `file://` (a same-origin/CORS restriction, not a bug in this code), so a
  // real server-hosted app -- where `fetch('./manifest.json')` works fine --
  // falls through to the network fetch below exactly as before.
  const inline = root.getElementById?.('fastblocks-ui-manifest-data');
  if (inline) {
    return JSON.parse(inline.textContent);
  }

  const response = await fetch('./manifest.json', { cache: 'no-store' });
  if (!response.ok) {
    throw new Error(`Unable to load manifest.json (${response.status})`);
  }
  return response.json();
}

async function renderComponentManifest(root = document) {
  const container = root.querySelector?.('[data-ui-component-list]');
  if (!container) {
    return;
  }

  try {
    const manifest = await loadManifestData(root);
    const items = manifest.components
      .map(
        (component) =>
          `<li class="ui-badge" title="${component.description}">${component.class_name}</li>`,
      )
      .join('');

    container.innerHTML = `<div class="ui-stack">
      <div class="ui-muted">Source of truth: <code>fastblocks_ui/manifest.json</code></div>
      <ul class="ui-cluster" role="list">${items}</ul>
    </div>`;
  } catch (error) {
    container.textContent = 'Component manifest could not be loaded.';
    console.error(error);
  }
}

if (typeof document !== 'undefined') {
  const boot = () => {
    renderComponentManifest(document);
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot, { once: true });
  } else {
    boot();
  }
}

export { renderComponentManifest, loadManifestData };
