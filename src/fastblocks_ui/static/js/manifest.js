async function renderComponentManifest(root = document) {
  const container = root.querySelector?.('[data-ui-component-list]');
  if (!container) {
    return;
  }

  try {
    const response = await fetch('./manifest.json', { cache: 'no-store' });
    if (!response.ok) {
      throw new Error(`Unable to load manifest.json (${response.status})`);
    }

    const manifest = await response.json();
    const items = manifest.components
      .map(
        (component) =>
          `<li class="ui-badge" title="${component.description}">${component.class_name}</li>`,
      )
      .join('');

    container.innerHTML = `<div class="ui-stack">
      <div class="ui-muted">Source of truth: <code>src/fastblocks_ui/manifest.json</code></div>
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

export { renderComponentManifest };
