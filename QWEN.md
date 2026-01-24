# FastBulma Project Context

## Project Overview

FastBulma is a framework that combines Bulma's battle-tested CSS utilities for layout and typography with Microsoft's FAST (Fancy App Styling and Tech) web components. The framework connects these two systems through CSS variables, allowing for seamless theming without requiring any build tools or Sass compilation.

### Key Features

- **Bulma Layout Utilities**: Leverages Bulma's robust grid system, helpers, and responsive utilities
- **FAST Web Components**: Access to a rich library of accessible, customizable components
- **CSS Variable Theming**: Unified theming through CSS variables with no build tools
- **Shadow DOM Encapsulation**: Components are properly isolated and styled
- **Zero Configuration**: Works out-of-the-box with simple CDN inclusion
- **MIT Licensed**: Free to use in commercial and open-source projects

## Architecture

### Core Components

1. **CSS Variable Mapping Layer**: Maps Bulma CSS variables to FAST design tokens using the `@layer fast` approach
1. **JavaScript Initialization**: Handles the registration of FAST components and provides utility functions
1. **Static Assets**: Bundled CSS and JavaScript files that enable the integration

### CSS Variable System

The framework uses a dual-layer CSS variable system:

- **Bulma Variables**: Customizable variables prefixed with `--bulma-*` that users can override
- **FAST Tokens**: Design tokens that map to Bulma variables using the `@layer fast` approach

Example mapping:

```css
:root {
  --bulma-primary: #7957d5;
  --bulma-radius: 4px;
}

@layer fast {
  :root {
    --accent-fill-rest: var(--bulma-primary);
    --control-corner-radius: var(--bulma-radius, 4px);
  }
}
```

### Component Integration

The framework enables seamless integration between Bulma classes and FAST components:

- Bulma classes like `.is-primary`, `.is-success` can affect the styling of FAST components
- FAST components like `<fast-button>`, `<fast-card>`, `<fast-text-field>` work alongside Bulma layout classes
- CSS variable inheritance ensures consistent theming across both systems

## File Structure

```
fastbulma/
├── src/
│   └── fastbulma/
│       ├── __init__.py          # Package initialization and asset path functions
│       ├── cli.py               # Command-line interface for asset management
│       ├── demo.html            # Interactive demonstration of the framework
│       └── static/
│           ├── css/
│           │   └── fastbulma.css # CSS variable mapping layer
│           └── js/
│               └── fastbulma.js  # JavaScript initialization and utilities
├── tests/
│   └── test_fastbulma.py        # Unit tests for the Python package
├── pyproject.toml              # Project metadata and dependencies
├── README.md                   # Main project documentation
├── IMPLEMENTATION_PLAN.md      # Detailed implementation roadmap
└── PACKAGE_README.md           # Package-specific documentation
```

## Building and Running

### Development Setup

1. Clone the repository
1. Install dependencies using `uv` or `pip`:
   ```bash
   pip install -e .
   ```

### Using the Demo

The project includes a demo HTML file (`src/fastbulma/demo.html`) that showcases the integration between Bulma and FAST components. To view it:

1. Open `src/fastbulma/demo.html` in a web browser
1. Or serve it using a local HTTP server

### Python Package Usage

The Python package primarily serves for development, documentation, and integration tools:

- Provides CLI tools for copying static assets
- Includes utilities for FastBlocks integration
- Bundles static assets (CSS/JS) for easy distribution

To copy assets to a project:

```bash
fastbulma copy-assets --dest ./my-project/static
```

## Development Conventions

### CSS Coding Standards

- Use `--bulma-*` prefix for customizable variables
- Implement `@layer fast` for CSS cascade control
- Follow Bulma's naming conventions for utility classes
- Ensure CSS variables properly cascade to FAST components

### JavaScript Standards

- Use ES modules for component imports
- Follow FAST's component registration patterns
- Implement utility functions for theme management
- Maintain compatibility with modern browsers

### Testing Practices

- Unit tests for Python package functionality
- Manual testing of component integration
- Cross-browser compatibility verification
- Accessibility compliance checking

## Distribution Strategy

### CDN-First Distribution

The primary distribution method is via CDN:

```html
<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/bulma@1.0.2/css/bulma.min.css">
<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/fastbulma@latest/css/fastbulma.css">

<script type="module" src="https://cdn.skypack.dev/@microsoft/fast-components"></script>
<script type="module" src="https://cdn.jsdelivr.net/npm/fastbulma@latest/js/fastbulma.js"></script>
```

### Python Package

Secondary distribution via PyPI for development tools and asset management:

```bash
pip install fastbulma
```

## Theming Capabilities

FastBulma enables flexible theming through CSS variables:

1. Override Bulma variables to change the base theme
1. FAST components automatically inherit these changes through variable mapping
1. Component-specific classes can further customize individual elements

Example custom theme:

```css
:root {
  --bulma-primary: #e040fb;  /* Purple primary color */
  --bulma-radius: 8px;       /* Larger border radius */
  --bulma-success: #00c853;  /* Darker green */
}
```

## Browser Support

### Tier 1 Support (Full functionality)

- Chrome (latest 2 versions)
- Firefox (latest 2 versions)
- Safari (latest 2 versions)
- Edge (latest 2 versions)

### Tier 2 Support (Core functionality)

- Chrome (last 4 versions)
- Firefox (last 4 versions)
- Safari (last 3 versions)
- Edge (last 3 versions)

## Key Implementation Details

### Component Mapping Matrix

The framework implements a comprehensive mapping between Bulma classes and FAST components:

- `.is-primary` affects `fast-button[appearance="accent"]` through `--accent-fill-rest`
- `.card` maps to `fast-card` with appropriate background styling
- `.button` applies border radius and other styling to `fast-button`
- Form elements like `.input` and `.textarea` map to `fast-text-field` and `fast-text-area`

### Shadow DOM Encapsulation

The framework properly handles Shadow DOM encapsulation by ensuring CSS variables cascade correctly into FAST components' shadow roots, maintaining consistent theming across the application.

### Performance Considerations

- Optimized CSS with minimal specificity conflicts
- Efficient JavaScript initialization
- Lightweight bundle size for fast loading
- Proper caching strategies for CDN assets
