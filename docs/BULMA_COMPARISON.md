# Bulma vs FastBulma: Side-by-Side Comparison

**Version**: 0.2.0
**Last Updated**: 2025-01-24

---

## Overview

This document provides side-by-side comparisons of Bulma and FastBulma implementations to help you understand the differences and migrate your code.

---

## Quick Comparison Table

| Feature | Bulma | FastBulma | Notes |
|---------|-------|-----------|-------|
| **Technology** | Pure CSS | CSS + Web Components | FastBulma uses FAST components |
| **Encapsulation** | None | Shadow DOM | FastBulma components are isolated |
| **Theming** | CSS variables only | CSS variables + Shadow DOM | FastBulma bridges variables to Shadow DOM |
| **JavaScript** | Optional (Bulma.js) | Required | FastBulma needs JS for component registration |
| **Form Handling** | Native HTML | Native HTML + Polyfill | Works identically |
| **Accessibility** | Manual (developer adds ARIA) | Built-in ARIA | FastBulma has ARIA by default |
| **Bundle Size** | ~200KB CSS | ~350KB (CSS + JS) | FastBulma includes FAST framework |
| **Browser Support** | Excellent | Very Good | FastBulma needs modern browsers or polyfills |
| **Learning Curve** | Low | Medium | FastBulma requires learning web components |

---

## Component Comparisons

### Button

#### Bulma Implementation

```html
<!DOCTYPE html>
<html>
<head>
  <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/bulma@1.0.2/css/bulma.min.css">
</head>
<body>
  <!-- Primary button -->
  <button class="button is-primary">Primary Button</button>

  <!-- Success button, large size -->
  <button class="button is-success is-large">Large Success</button>

  <!-- Danger button, small size -->
  <button class="button is-danger is-small">Small Danger</button>

  <!-- Loading state -->
  <button class="button is-primary is-loading">Loading</button>

  <!-- Disabled button -->
  <button class="button" disabled>Disabled</button>
</body>
</html>
```

**Characteristics**:
- ✅ Simple HTML/CSS only
- ✅ No JavaScript required
- ✅ Works without polyfills
- ❌ No encapsulation
- ❌ Manual accessibility (add ARIA yourself)
- ❌ Limited state management

#### FastBulma Implementation

```html
<!DOCTYPE html>
<html>
<head>
  <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/bulma@1.0.2/css/bulma.min.css">
  <link rel="stylesheet" href="https://cdn.example.com/fastbulma.css">
</head>
<body>
  <!-- Primary button -->
  <fast-button class="is-primary">Primary Button</fast-button>

  <!-- Success button, large size -->
  <fast-button class="is-success is-large">Large Success</fast-button>

  <!-- Danger button, small size -->
  <fast-button class="is-danger is-small">Small Danger</fast-button>

  <!-- Loading state (automatic) -->
  <fast-button class="is-primary" loading>Loading</fast-button>

  <!-- Disabled button -->
  <fast-button class="is-primary" disabled>Disabled</fast-button>

  <script src="https://cdn.example.com/fastbulma.js"></script>
</body>
</html>
```

**Characteristics**:
- ✅ Web Component (custom element)
- ✅ Shadow DOM encapsulation
- ✅ Built-in ARIA attributes
- ✅ Rich state management
- ✅ Consistent cross-browser
- ❌ Requires JavaScript
- ❌ Slightly larger bundle

#### Key Differences

| Aspect | Bulma | FastBulma |
|--------|-------|-----------|
| **Element** | `<button class="button">` | `<fast-button>` |
| **Encapsulation** | None (global styles) | Shadow DOM (isolated) |
| **Accessibility** | Add ARIA manually | Built-in ARIA |
| **State Management** | CSS classes only | Properties + methods |
| **Loading State** | Add `.is-loading` class | Set `loading` attribute |
| **Icons** | Add `<i>` tag manually | Use named slots |
| **JavaScript API** | None (use vanilla JS) | `element.click()`, etc. |

---

### Card

#### Bulma Implementation

```html
<div class="card">
  <div class="card-header">
    <p class="card-header-title">
      Card Title
    </p>
  </div>
  <div class="card-content">
    <div class="content">
      <p>Card content goes here.</p>
    </div>
  </div>
  <div class="card-footer">
    <a href="#" class="card-footer-item">Save</a>
    <a href="#" class="card-footer-item">Cancel</a>
  </div>
</div>
```

**Structure**:
- `.card` - Container
- `.card-header` - Header section
- `.card-header-title` - Title text
- `.card-content` - Main content
- `.card-footer` - Footer section
- `.card-footer-item` - Footer links/buttons

#### FastBulma Implementation

```html
<fast-card class="card">
  <div slot="heading">
    Card Title
  </div>
  <div class="content">
    <p>Card content goes here.</p>
  </div>
  <div slot="actions">
    <fast-button class="is-primary">Save</fast-button>
    <fast-button>Cancel</fast-button>
  </div>
</fast-card>
```

**Structure**:
- `<fast-card>` - Custom element
- `slot="heading"` - Header section
- Default slot - Main content
- `slot="actions"` - Footer actions

#### Key Differences

| Aspect | Bulma | FastBulma |
|--------|-------|-----------|
| **Element** | `<div class="card">` | `<fast-card>` |
| **Header** | `.card-header` + `.card-header-title` | `slot="heading"` |
| **Content** | `.card-content` | Default slot |
| **Footer** | `.card-footer` + `.card-footer-item` | `slot="actions"` |
| **Semantic HTML** | Div-based | Web Component |
| **API** | CSS classes only | Slots + properties |

---

### Form Inputs

#### Bulma Text Input

```html
<div class="field">
  <label class="label">Username</label>
  <div class="control">
    <input
      class="input"
      type="text"
      name="username"
      placeholder="Enter your username">
  </div>
  <p class="help">Enter your desired username</p>
</div>
```

#### FastBulma Text Field

```html
<div class="field">
  <label class="label" for="username">Username</label>
  <div class="control">
    <fast-text-field
      id="username"
      name="username"
      placeholder="Enter your username">
    </fast-text-field>
  </div>
  <p class="help">Enter your desired username</p>
</div>
```

#### Key Differences

| Aspect | Bulma | FastBulma |
|--------|-------|-----------|
| **Element** | `<input class="input">` | `<fast-text-field>` |
| **Label Association** | Optional (but recommended) | Required for accessibility |
| **Validation** | Browser default | Enhanced (with error states) |
| **Icons** | Add `.has-icons` wrapper | Use named slots |
| **Character Count** | Manual implementation | Built-in with `maxlength` |

---

### Checkbox

#### Bulma Checkbox

```html<label class="checkbox">
  <input type="checkbox" name="terms" required>
  I agree to the <a href="#">terms and conditions</a>
</label>
```

#### FastBulma Checkbox

```html
<label class="checkbox">
  <fast-checkbox
    name="terms"
    value="agree"
    required>
  </fast-checkbox>
  I agree to the <a href="#">terms and conditions</a>
</label>
```

#### Key Differences

| Aspect | Bulma | FastBulma |
|--------|-------|-----------|
| **Element** | `<input type="checkbox">` | `<fast-checkbox>` |
| **Styling** | Browser default (styled with CSS) | Custom styled component |
| **Accessibility** | Add ARIA manually | Built-in ARIA |
| **State API** | `element.checked` (native) | `element.checked` (same) |
| **Form Integration** | Native HTML | Native HTML + polyfill |

---

### Tabs

#### Bulma Tabs

```html
<div class="tabs">
  <ul>
    <li class="is-active">
      <a>Pictures</a>
    </li>
    <li>
      <a>Music</a>
    </li>
    <li>
      <a>Videos</a>
    </li>
  </ul>
</div>

<!-- Tab content (manual) -->
<div id="pictures" class="tab-content">
  Pictures content...
</div>
<div id="music" class="tab-content" style="display:none">
  Music content...
</div>
<div id="videos" class="tab-content" style="display:none">
  Videos content...
</div>

<script>
// Manual JavaScript required for tab switching
document.querySelectorAll('.tabs a').forEach(tab => {
  tab.addEventListener('click', (e) => {
    e.preventDefault();
    // Manual tab switching logic here...
  });
});
</script>
```

#### FastBulma Tabs

```html
<fast-tabs activeid="tab-pictures" aria-label="Media tabs">
  <fast-tab id="tab-pictures">Pictures</fast-tab>
  <fast-tab id="tab-music">Music</fast-tab>
  <fast-tab id="tab-videos">Videos</fast-tab>

  <fast-tab-panel id="panel-pictures">
    Pictures content...
  </fast-tab-panel>

  <fast-tab-panel id="panel-music">
    Music content...
  </fast-tab-panel>

  <fast-tab-panel id="panel-videos">
    Videos content...
  </fast-tab-panel>
</fast-tabs>

<!-- No JavaScript required! -->
```

#### Key Differences

| Aspect | Bulma | FastBulma |
|--------|-------|-----------|
| **Structure** | Separate lists + content | Tabs + panels in one component |
| **JavaScript** | Required for switching | Built-in functionality |
| **Accessibility** | Add ARIA manually | Built-in ARIA |
| **State Management** | Manual (hide/show) | Automatic |
| **Keyboard Navigation** | Manual implementation | Built-in (arrow keys) |

---

### Modal/Dialog

#### Bulma Modal

```html
<div class="modal" id="modal">
  <div class="modal-background"></div>
  <div class="modal-card">
    <header class="modal-card-head">
      <p class="modal-card-title">Modal title</p>
      <button class="delete" aria-label="close"></button>
    </header>
    <section class="modal-card-body">
      <p>Modal content...</p>
    </section>
    <footer class="modal-card-foot">
      <button class="button is-success">Save changes</button>
      <button class="button">Cancel</button>
    </footer>
  </div>
</div>

<script>
// Manual JavaScript to open/close
document.getElementById('modal').classList.add('is-active');
document.getElementById('modal').classList.remove('is-active');
</script>
```

#### FastBulma Dialog

```html
<fast-dialog
  id="dialog"
  aria-labelledby="dialog-title"
  aria-hidden="true"
  hidden>
  <h2 id="dialog-title">Modal title</h2>
  <p>Modal content...</p>
  <fast-button class="is-success" onclick="this.closest('fast-dialog').hide()">
    Save changes
  </fast-button>
  <fast-button onclick="this.closest('fast-dialog').hide()">
    Cancel
  </fast-button>
</fast-dialog>

<fast-button onclick="document.getElementById('dialog').show()">
  Open
</fast-button>
```

#### Key Differences

| Aspect | Bulma | FastBulma |
|--------|-------|-----------|
| **Open/Close** | Add/remove `.is-active` | Call `.show()` / `.hide()` |
| **Background** | Manual `.modal-background` | Automatic backdrop |
| **Focus Trap** | Manual implementation | Built-in focus management |
| **Escape Key** | Manual implementation | Built-in |
| **Accessibility** | Add ARIA manually | Built-in ARIA |

---

## Color Comparison

### Bulma Colors (Original)

```css
--bulma-primary: #7957d5;    /* Purple */
--bulma-info: #3298dc;       /* Blue */
--bulma-success: #48c774;    /* Green */
--bulma-warning: #ffdd57;    /* Yellow */
--bulma-danger: #f14668;     /* Red */
```

### FastBulma Colors (Tailwind)

```css
--fast-primary: #4f46e5;     /* Indigo-600 */
--fast-info: #06b6d4;        /* Cyan-500 */
--fast-success: #22c55e;     /* Green-500 */
--fast-warning: #eab308;     /* Yellow-500 */
--fast-danger: #ef4444;      /* Red-500 */
```

**Visual Differences**:
- Primary: Purple → **Indigo** (more blue-ish)
- Info: Blue → **Cyan** (more aqua)
- Success: Same green (different shade)
- Warning: Same yellow (different shade)
- Danger: Same red (different shade)

---

## Usage Comparison

### Theming

#### Bulma Theming

```css
/* Override Bulma variables */
:root {
  --bulma-primary: #custom-color;
}
```

#### FastBulma Theming

```css
/* Override FastBulma variables */
:root {
  --fast-primary: #custom-color;
}

/* Or use JavaScript */
fastBulma.setTheme('dark');
```

### Responsive Design

#### Bulma Responsive

```html
<!-- Bulma uses utility classes -->
<button class="button is-hidden-mobile">Hidden on mobile</button>
<button class="button is-tablet">Tablet only</button>
```

#### FastBulma Responsive

```html
<!-- Same Bulma utilities work with FAST components -->
<fast-button class="is-hidden-mobile">Hidden on mobile</fast-button>
<fast-button class="is-tablet">Tablet only</fast-button>
```

**Note**: FastBulma uses Bulma's responsive utilities, so the approach is identical.

---

## Migration Checklist

### ✅ You Can Keep

- Bulma layout utilities (`.columns`, `.level`, `.hero`)
- Responsive modifier classes (`.is-hidden-mobile`, etc.)
- Container classes (`.container`, `.section`)
- Helper classes (`.has-text-centered`, `.mt-5`, etc.)
- Form structure (`.field`, `.control`, `.label`)

### 🔄 You Need to Change

- `<button class="button">` → `<fast-button>`
- `<div class="card">` → `<fast-card>` (different slot structure)
- `<input class="input">` → `<fast-text-field>`
- `<div class="tabs">` → `<fast-tabs>` (different structure)
- JavaScript that assumes native elements

### 🆕 You Need to Add

- FastBulma JavaScript (`fastbulma.js`)
- Form association polyfill (for older browsers)
- Web Component polyfills (if needed)
- ARIA testing (though built-in, still verify)

---

## Performance Comparison

| Metric | Bulma | FastBulma | Difference |
|--------|-------|-----------|------------|
| **CSS Size** | ~200KB | ~220KB | +10% (FAST tokens) |
| **JavaScript** | 0KB (optional) | ~130KB | +130KB (FAST framework) |
| **Initial Load** | ~200KB | ~350KB | +75% |
| **FCP** | ~1.0s | ~2.5-3.5s | +150-250% (Shadow DOM) |
| **TTI** | ~2.0s | ~4-6s | +100-200% |
| **Style Updates** | Fast | 15-25% faster (contain: style) |
| **Memory** | Low | Medium (Shadow DOM overhead) |

---

## When to Use Which

### Use Bulma If:

- ✅ You want pure CSS (no JavaScript)
- ✅ You need maximum browser support
- ✅ Performance is critical (no JS overhead)
- ✅ You want simple drop-in replacement
- ✅ You don't need encapsulation

### Use FastBulma If:

- ✅ You want modern web components
- ✅ You need Shadow DOM encapsulation
- ✅ You want built-in accessibility
- ✅ You're building a complex SPA
- ✅ You prefer Tailwind's color scheme
- ✅ You want consistent cross-browser components

---

## Conclusion

FastBulma provides a modern, component-based alternative to Bulma while maintaining the familiar utility-first approach. The main trade-offs are:

**Pros of FastBulma**:
- 🎯 Shadow DOM encapsulation
- ♿ Built-in accessibility
- 🎨 Tailwind colors (if you prefer them)
- 🧩 Consistent component APIs
- 📱 Future-proof (web components standard)

**Cons of FastBulma**:
- 📦 Larger bundle size
- 🐌 Slower initial load
- 🔧 Requires JavaScript
- 🌐 Needs modern browsers or polyfills

Choose based on your project's requirements and constraints.

---

**Last Updated**: 2025-01-24
**Maintained By**: FastBulma Team
