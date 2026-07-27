import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { loadManifestData, renderComponentManifest } from '@fastblocks-ui/js/manifest.js';

describe('component manifest rendering', () => {
  let root;

  beforeEach(() => {
    root = document.createElement('div');
    document.body.appendChild(root);
  });

  afterEach(() => {
    root?.remove();
    root = undefined;
    vi.unstubAllGlobals();
  });

  it('prefers inline embedded manifest data over a network fetch', async () => {
    const inline = document.createElement('script');
    inline.type = 'application/json';
    inline.id = 'fastblocks-ui-manifest-data';
    inline.textContent = JSON.stringify({
      components: [{ name: 'alert', class_name: 'ui-alert', description: 'Inline notices.' }],
    });
    root.appendChild(inline);

    const fetchSpy = vi.fn();
    vi.stubGlobal('fetch', fetchSpy);

    // `getElementById` is a Document/ShadowRoot-only method (not on a plain
    // Element), matching the real call site (`renderComponentManifest(document)`).
    const data = await loadManifestData(document);

    expect(data.components[0].class_name).toBe('ui-alert');
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it('falls back to fetch() when no inline data is present (real server-hosted case)', async () => {
    const fetchSpy = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        components: [{ name: 'card', class_name: 'ui-card', description: 'Card.' }],
      }),
    });
    vi.stubGlobal('fetch', fetchSpy);

    const data = await loadManifestData(document);

    expect(fetchSpy).toHaveBeenCalledWith('./manifest.json', { cache: 'no-store' });
    expect(data.components[0].class_name).toBe('ui-card');
  });

  it('renders badges from inline manifest data into [data-ui-component-list]', async () => {
    root.innerHTML = '<div data-ui-component-list>Loading manifest…</div>';
    const inline = document.createElement('script');
    inline.type = 'application/json';
    inline.id = 'fastblocks-ui-manifest-data';
    inline.textContent = JSON.stringify({
      components: [{ name: 'alert', class_name: 'ui-alert', description: 'Inline notices.' }],
    });
    root.appendChild(inline);

    await renderComponentManifest(document);

    expect(root.textContent).toContain('ui-alert');
  });

  it('shows a fallback message when the manifest cannot be loaded at all', async () => {
    root.innerHTML = '<div data-ui-component-list>Loading manifest…</div>';
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({ ok: false, status: 404 }),
    );
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    await renderComponentManifest(root);

    expect(root.textContent).toBe('Component manifest could not be loaded.');
    consoleSpy.mockRestore();
  });
});
