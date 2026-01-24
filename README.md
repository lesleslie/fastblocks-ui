# FastBulma

FastBulma is a framework that combines Bulma's battle-tested CSS utilities for layout and typography with Microsoft's FAST (Fancy App Styling and Tech) web components. The framework connects these two systems through CSS variables, allowing for seamless theming without requiring any build tools or Sass compilation.

## Features

- **Bulma Layout Utilities**: Leverages Bulma's robust grid system, helpers, and responsive utilities
- **FAST Web Components**: Access to a rich library of accessible, customizable components
- **CSS Variable Theming**: Unified theming through CSS variables with no build tools
- **Shadow DOM Encapsulation**: Components are properly isolated and styled
- **Zero Configuration**: Works out-of-the-box with simple CDN inclusion
- **MIT Licensed**: Free to use in commercial and open-source projects

## Installation

### CDN

Include the following in your HTML:

```html
<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/bulma@1.0.2/css/bulma.min.css">
<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/fastbulma@latest/css/fastbulma.css">

<script type="module" src="https://cdn.skypack.dev/@microsoft/fast-components"></script>
<script type="module" src="https://cdn.jsdelivr.net/npm/fastbulma@latest/js/fastbulma.js"></script>
```

### Python Package

Install using pip:

```bash
pip install fastbulma
```

Then copy the assets to your project:

```bash
fastbulma copy-assets --dest ./static
```

## Usage

Once installed, you can use FAST components with Bulma classes:

```html
<fast-card class="card is-primary">
  <h3 slot="heading" class="title is-4">Card Title</h3>
  <p>This is a FAST card component styled with Bulma classes.</p>
  <fast-button appearance="accent" slot="actions" class="button is-primary">Action</fast-button>
</fast-card>
```

## Theming

FastBulma enables flexible theming through CSS variables:

```css
:root {
  --bulma-primary: #e040fb;  /* Purple primary color */
  --bulma-radius: 8px;       /* Larger border radius */
  --bulma-success: #00c853;  /* Darker green */
}
```

FAST components automatically inherit these changes through variable mapping.

## Components

FastBulma supports all major FAST components:

- `fast-button`
- `fast-card`
- `fast-text-field`
- `fast-text-area`
- `fast-select`
- `fast-checkbox`
- `fast-radio`
- `fast-switch`
- `fast-dialog`
- `fast-tabs`
- `fast-anchor`
- `fast-progress`
- `fast-data-grid`
- `fast-menu-button`

## Known Issues

### Security Vulnerabilities

As of January 2026, there is a known vulnerability in the `protobuf` dependency (CVE-2026-0994) that affects the development environment. This vulnerability exists in the latest version of protobuf (6.33.4) and cannot be resolved by upgrading. This does not affect the runtime functionality of FastBulma itself, as the vulnerability is in a development dependency.

We are monitoring the situation and will update when a patched version becomes available.

## License

MIT
