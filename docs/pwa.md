# PWA-Friendly App Integration

FastBlocks UI is not a PWA runtime. The application should own service workers,
offline caching, install prompts, and web manifest behavior.

What FastBlocks UI can provide is a clean surface for PWA-compatible apps:

- stable `ui-*` classes and helper output that render identically online and offline
- semantic color tokens that map cleanly to app-level `theme-color` metadata
- light and dark theme variables that follow `prefers-color-scheme`
- predictable asset paths for CSS, JavaScript, and the component manifest
- plain HTML fragments that remain readable when cached or swapped by htmx

Typical app-layer head tags:

```html
<link rel="manifest" href="/manifest.webmanifest">
<meta name="theme-color" content="#0f172a">
<link rel="apple-touch-icon" href="/icons/icon-180.png">
```

Typical app-layer service worker registration:

```html
<script>
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('/sw.js');
  }
</script>
```

Use FastBlocks UI for the UI contract, and keep the PWA lifecycle in the
server-rendered application.
