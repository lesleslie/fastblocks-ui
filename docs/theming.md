# FastBulma Theming System

FastBulma's theming system is built entirely on **CSS custom properties**, allowing complete customization without Sass or build tools.

## Theme Architecture

Themes work through a three-layer structure:

1. **Base Theme Variables** (`:root`) - Define Bulma colors, spacing, typography
1. **FAST Token Mappings** (`@layer fast`) - Map Bulma variables to FAST tokens
1. **Bulma Class Mappings** - Apply specific theme colors via classes

### Visual Theme Gallery

The following 5 pre-built themes are available:

- **Default (Light)** - Clean white background, purple primary color
- **Dark Mode** - Dark background, lighter purple accents
- **Solarized Light** - Warm, eye-friendly palette
- **Dracula** - Dark purple theme with neon accents
- **Nord** - Cool, arctic color scheme

> **Note**: Visual theme gallery mockups are available in the Excalidraw canvas (accessed via Excalidraw MCP server). Export them as PNG to include in documentation.

______________________________________________________________________

## Pre-Built Themes

### Theme 1: Default (Light)

**Best for**: General-purpose applications, clean modern look

```css
:root {
  --bulma-primary: #7957d5;
  --bulma-primary-invert: #fff;
  --bulma-primary-light: #f1effd;
  --bulma-primary-dark: #563acc;
  --bulma-background: #ffffff;
  --bulma-text: #4a4a4a;
}
```

**Preview**:

- Primary buttons: Purple (#7957d5)
- Success buttons: Green (#48c774)
- Background: White (#ffffff)
- Text: Dark gray (#4a4a4a)

______________________________________________________________________

### Theme 2: Dark Mode

**Best for**: Developer tools, dashboard applications, low-light environments

```css
[data-theme="dark"] {
  --bulma-scheme-main: #0a0a0a;
  --bulma-scheme-invert: #ffffff;
  --bulma-primary: #9e86e8;  /* Lighter purple for dark mode */
  --bulma-background: #0a0a0a;
  --bulma-text: #f5f5f5;
}
```

**Preview**:

- Primary buttons: Light purple (#9e86e8)
- Success buttons: Bright green (#50fa7b)
- Background: Nearly black (#0a0a0a)
- Text: Off-white (#f5f5f5)

______________________________________________________________________

### Theme 3: Solarized Light

**Best for**: Long coding sessions, documentation, reading-heavy apps

```css
[data-theme="solarized-light"] {
  --bulma-primary: #6c71c4;
  --bulma-success: #859900;
  --bulma-warning: #b58900;
  --bulma-danger: #dc322f;
  --bulma-background: #fdf6e3;
  --bulma-text: #657b83;
}
```

**Preview**:

- Primary buttons: Muted purple (#6c71c4)
- Success buttons: Olive green (#859900)
- Background: Warm cream (#fdf6e3)
- Text: Muted brown-gray (#657b83)

**Designer**: Ethan Schoonover

______________________________________________________________________

### Theme 4: Dracula

**Best for**: Developer tools, terminal-like interfaces, dark-first apps

```css
[data-theme="dracula"] {
  --bulma-primary: #bd93f9;
  --bulma-success: #50fa7b;
  --bulma-warning: #f1fa8c;
  --bulma-danger: #ff5555;
  --bulma-background: #282a36;
  --bulma-text: #f8f8f2;
}
```

**Preview**:

- Primary buttons: Bright purple (#bd93f9)
- Success buttons: Neon green (#50fa7b)
- Warning: Bright yellow (#f1fa8c)
- Danger: Bright pink-red (#ff5555)
- Background: Dark purple-gray (#282a36)
- Text: Off-white (#f8f8f2)

**Inspired by**: Dracula color scheme for syntax highlighting

______________________________________________________________________

### Theme 5: Nord

**Best for**: Clean, professional interfaces, Scandinavian design aesthetic

```css
[data-theme="nord"] {
  --bulma-primary: #88c0d0;
  --bulma-success: #a3be8c;
  --bulma-warning: #ebcb8b;
  --bulma-danger: #bf616a;
  --bulma-background: #2e3440;
  --bulma-text: #d8dee9;
}
```

**Preview**:

- Primary buttons: Ice blue (#88c0d0)
- Success buttons: Soft green (#a3be8c)
- Warning: Soft yellow (#ebcb8b)
- Danger: Soft red (#bf616a)
- Background: Deep blue-gray (#2e3440)
- Text: Light gray-blue (#d8dee9)

**Designer**: Arctic Ice Studio

______________________________________________________________________

## Theme Switching

### Method 1: Data Attribute (Recommended)

```html
<!-- Set theme on document -->
<html data-theme="dark">

<!-- Or set on container for scoped theming -->
<div data-theme="dark">
  <fast-button class="is-primary">Dark theme button</fast-button>
</div>
```

```javascript
// Switch theme programmatically
function setTheme(themeName) {
  document.documentElement.setAttribute('data-theme', themeName);
  // Persist to localStorage
  localStorage.setItem('fastbulma-theme', themeName);
}

// Load saved theme on page load
const savedTheme = localStorage.getItem('fastbulma-theme') || 'default';
document.documentElement.setAttribute('data-theme', savedTheme);
```

### Method 2: CSS Class

```html
<html class="theme-dark">
```

```css
.theme-dark {
  --bulma-primary: #9e86e8;
  --bulma-background: #0a0a0a;
  --bulma-text: #f5f5f5;
}
```

### Method 3: Dynamic CSS Variables

```javascript
// Update specific color dynamically
document.documentElement.style.setProperty('--bulma-primary', '#ff0000');

// Update multiple variables at once
const themeColors = {
  '--bulma-primary': '#ff0000',
  '--bulma-success': '#00ff00',
  '--bulma-danger': '#0000ff'
};

Object.entries(themeColors).forEach(([varName, value]) => {
  document.documentElement.style.setProperty(varName, value);
});
```

______________________________________________________________________

## Creating Custom Themes

### Theme Template

```css
/* my-custom-theme.css */
:root {
  /* 1. Brand Colors */
  --bulma-primary: #your-brand-color;
  --bulma-primary-invert: #contrast-color;
  --bulma-primary-light: #lighter-variant;
  --bulma-primary-dark: #darker-variant;

  /* 2. Semantic Colors */
  --bulma-success: #success-color;
  --bulma-warning: #warning-color;
  --bulma-danger: #error-color;
  --bulma-info: #info-color;

  /* 3. Neutral Colors */
  --bulma-scheme-main: #background-color;
  --bulma-scheme-invert: #foreground-color;
  --bulma-background: #background-color;
  --bulma-text: #text-color;

  /* 4. Spacing & Sizing */
  --bulma-radius: 4px;
  --bulma-radius-small: 2px;
  --bulma-radius-large: 6px;
  --bulma-size-normal: 1rem;

  /* 5. Typography */
  --bulma-family-primary: 'Your Font', sans-serif;
}

/* Map to FAST tokens */
@layer fast {
  :root {
    --accent-fill-rest: var(--bulma-primary);
    --accent-fill-hover: color-mix(in srgb, var(--bulma-primary) 90%, black);
    --neutral-fill-rest: var(--bulma-background);
    --neutral-foreground-rest: var(--bulma-text);
  }
}
```

### Color Picker Tool

For color selection, consider:

- **Contrast ratio**: Must meet WCAG AA (4.5:1 for text)
- **Color harmony**: Use complementary, triadic, or analogous color schemes
- **Brand alignment**: Match your company's brand guidelines

### Theme Validation

FastBulma will provide a CLI tool to validate custom themes:

```bash
# Install CLI
npm install -g fastbulma-theme-validator

# Validate theme
fastbulma-theme-validator validate my-theme.css

# Output:
# ✓ All required CSS variables defined
# ✓ Color contrast ratios meet WCAG AA (4.5:1)
# ⚠ Warning: --bulma-primary-dark is missing (auto-generated)
# ✓ FAST token mappings valid
```

______________________________________________________________________

## Theme Usage Examples

### Applying Themes to Components

```html
<!-- Default theme -->
<fast-button class="is-primary">Primary Button</fast-button>

<!-- Dark theme -->
<div data-theme="dark">
  <fast-button class="is-primary">Primary Button</fast-button>
</div>

<!-- Custom theme -->
<div style="--bulma-primary: #ff0000;">
  <fast-button class="is-primary">Red Button</fast-button>
</div>
```

### Theme-Specific Styling

```css
/* Dark theme specific adjustments */
[data-theme="dark"] .is-primary {
  /* Adjust hover brightness for dark mode */
  --accent-fill-hover: color-mix(in srgb, var(--bulma-primary) 80%, white);
}

/* Solarized Light theme adjustments */
[data-theme="solarized-light"] .is-success {
  /* Warmer green for solarized palette */
  --accent-fill-rest: #859900;
}
```

______________________________________________________________________

## Accessibility Requirements

All themes must meet **WCAG AA** standards:

### Automated Validation

```javascript
// Check color contrast
function validateThemeAccessibility() {
  const tests = [
    {
      name: 'Primary contrast',
      minRatio: 4.5,
      foreground: '--bulma-primary',
      background: '--bulma-scheme-main'
    },
    {
      name: 'Text contrast',
      minRatio: 4.5,
      foreground: '--bulma-text',
      background: '--bulma-background'
    }
  ];

  tests.forEach(test => {
    const ratio = calculateContrast(test.foreground, test.background);
    if (ratio < test.minRatio) {
      console.error(`${test.name} fails WCAG AA (ratio: ${ratio})`);
    }
  });
}
```

### Manual Testing Checklist

- [ ] All interactive elements have visible focus indicators
- [ ] Text remains readable in all themes
- [ ] Form validation errors are visible
- [ ] Color alone is not used to convey information
- [ ] Tested with screen reader (NVDA, VoiceOver, TalkBack)

______________________________________________________________________

## Best Practices

### 1. Use Semantic Color Names

```css
/* ✅ GOOD - Semantic */
--bulma-primary: #7957d5;
--bulma-success: #48c774;
--bulma-danger: #f14668;

/* ❌ BAD - Generic */
--color1: #7957d5;
--color2: #48c774;
--color3: #f14668;
```

### 2. Provide Fallbacks

```css
/* Provide fallback for older browsers */
.is-primary {
  --accent-fill-rest: var(--bulma-primary);
  --accent-fill-hover: color-mix(in srgb, var(--bulma-primary) 90%, black);
  --accent-fill-hover: var(--bulma-primary-dark, var(--bulma-primary));
}
```

### 3. Test Across Components

```javascript
// Ensure theme works across all FAST components
const components = ['fast-button', 'fast-card', 'fast-text-field', 'fast-checkbox'];
components.forEach(component => {
  const el = document.createElement(component);
  el.className = 'is-primary';
  document.body.appendChild(el);

  // Verify styling applied correctly
  const styles = getComputedStyle(el);
  console.assert(styles.backgroundColor === 'rgb(121, 87, 213)', `${component} theme test failed`);
});
```

______________________________________________________________________

## Future Enhancements

### Theme Generator Tool (v2.0)

Planned online tool for visual theme customization:

- Visual color picker
- Live preview components
- Export theme CSS
- Download theme package

### Theme Marketplace (v1.2)

Community-contributed themes:

- Upload and share custom themes
- Rate and review themes
- One-click installation via CDN

______________________________________________________________________

## Related Documentation

- [Architecture Documentation](architecture.md) - CSS variable bridge pattern
- [Implementation Plan](../IMPLEMENTATION_PLAN.md) - Complete theming system details
- [Component API Reference](../IMPLEMENTATION_PLAN.md#component-api-specification) - Component styling
