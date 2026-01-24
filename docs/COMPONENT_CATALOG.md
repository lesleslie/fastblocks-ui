# FastBulma Component Catalog

**Version**: 0.2.0
**Last Updated**: 2025-01-24

---

## Overview

This catalog provides a complete reference for all FastBulma components, including usage examples, Bulma class mappings, and accessibility features.

---

## Quick Reference

| Component | FAST Element | Bulma Classes | Accessibility | Status |
|-----------|--------------|---------------|---------------|--------|
| Button | `fast-button` | `.is-primary`, `.is-success`, etc. | ✅ Full | ✅ Stable |
| Card | `fast-card` | `.card` | ✅ Full | ✅ Stable |
| Text Field | `fast-text-field` | `.input`, `.is-small` | ✅ Full | ✅ Stable |
| Text Area | `fast-text-area` | `.textarea` | ✅ Full | ✅ Stable |
| Select | `fast-select` | `.select` | ✅ Full | ✅ Stable |
| Checkbox | `fast-checkbox` | Custom (no Bulma equivalent) | ✅ Full | ✅ Stable |
| Radio | `fast-radio` | Custom (no Bulma equivalent) | ✅ Full | ✅ Stable |
| Switch | `fast-switch` | Custom (no Bulma equivalent) | ✅ Full | ✅ Stable |
| Tabs | `fast-tabs` | `.tabs` | ✅ Full | ✅ Stable |
| Dialog | `fast-dialog` | `.modal` | ✅ Full | ✅ Stable |
| Menu Button | `fast-menu-button` | `.dropdown` | ✅ Full | ✅ Stable |
| Progress | `fast-progress` | `.progress` | ✅ Full | ✅ Stable |

---

## Component Details

### Button (`fast-button`)

**Purpose**: Interactive button with various styles and states.

**Usage**:
```html
<fast-button class="is-primary">Primary Button</fast-button>
<fast-button class="is-success is-large">Large Success Button</fast-button>
<fast-button class="is-danger is-small">Small Danger Button</fast-button>
```

**Bulma Class Mappings**:
- `.is-primary` → Primary color (indigo-600)
- `.is-success` → Success color (green-500)
- `.is-warning` → Warning color (yellow-500)
- `.is-danger` → Danger color (red-500)
- `.is-info` → Info color (cyan-500)
- `.is-small` → Small size
- `.is-medium` → Medium size
- `.is-large` → Large size
- `.is-loading` → Loading state
- `.is-disabled` → Disabled state

**Accessibility**:
- ✅ Keyboard accessible (Enter, Space)
- ✅ ARIA attributes (role="button")
- ✅ Focus visible indicator
- ✅ Screen reader support

**FAST Slots**:
- Default slot: Button content

**FAST Attributes**:
- `appearance` - Don't use (conflicts with Bulma classes)
- `autofocus` - Auto-focus on load
- `disabled` - Disable button

---

### Card (`fast-card`)

**Purpose**: Container for grouping related content.

**Usage**:
```html
<fast-card class="card">
  <div slot="heading">Card Title</div>
  <p>Card content goes here.</p>
  <div slot="actions">
    <fast-button class="is-primary">Action</fast-button>
  </div>
</fast-card>
```

**Bulma Class Mappings**:
- `.card` → Card styling

**Accessibility**:
- ✅ Semantic landmark (role="region")
- ✅ ARIA labeling support

**FAST Slots**:
- `heading` - Card header/title
- Default slot - Card content
- `actions` - Card footer/actions

---

### Text Field (`fast-text-field`)

**Purpose**: Single-line text input.

**Usage**:
```html
<fast-text-field
  id="username"
  name="username"
  placeholder="Enter your username"
  required>
</fast-text-field>
<label for="username">Username</label>
```

**Bulma Class Mappings**:
- `.is-small` → Small size
- `.is-medium` → Medium size
- `.is-large` → Large size
- `.is-fullwidth` → Full width

**Accessibility**:
- ✅ Label association (for/id or aria-label)
- ✅ Required state indication
- ✅ Error messaging support (aria-invalid, aria-describedby)
- ✅ Keyboard accessible

**FAST Attributes**:
- `placeholder` - Placeholder text
- `required` - Mark as required
- `disabled` - Disable input
- `readonly` - Make read-only
- `type` - Input type (email, password, etc.)
- `minlength` - Minimum length
- `maxlength` - Maximum length
- `pattern` - Validation pattern

---

### Checkbox (`fast-checkbox`)

**Purpose**: Boolean choice input.

**Usage**:
```html
<label>
  <fast-checkbox
    id="agree"
    name="terms"
    value="agree"
    required>
  </fast-checkbox>
  I agree to the terms
</label>
```

**Bulma Class Mappings**:
- None (Bulma uses native checkboxes)

**Accessibility**:
- ✅ Label association
- ✅ Checked state (aria-checked)
- ✅ Required state indication
- ✅ Keyboard accessible (Space to toggle)

**FAST Attributes**:
- `checked` - Initial state
- `required` - Mark as required
- `disabled` - Disable checkbox
- `value` - Form value
- `name` - Form name

---

### Radio (`fast-radio`)

**Purpose**: Single choice from options.

**Usage**:
```html
<fieldset>
  <legend>Choose an option</legend>

  <label>
    <fast-radio
      name="choice"
      value="option1"
      checked>
    </fast-radio>
    Option 1
  </label>

  <label>
    <fast-radio
      name="choice"
      value="option2">
    </fast-radio>
    Option 2
  </label>
</fieldset>
```

**Bulma Class Mappings**:
- None (Bulma uses native radio buttons)

**Accessibility**:
- ✅ Fieldset/legend for grouping
- ✅ Label association
- ✅ Checked state (aria-checked)
- ✅ Keyboard navigation (arrow keys)

**FAST Attributes**:
- `checked` - Initial state
- `name` - Group name (for mutual exclusion)
- `value` - Form value
- `disabled` - Disable radio

---

### Switch (`fast-switch`)

**Purpose**: Toggle switch for binary choices.

**Usage**:
```html
<label>
  <fast-switch
    id="notifications"
    name="notifications"
    checked>
  </fast-switch>
  Enable notifications
</label>
```

**Bulma Class Mappings**:
- None (Bulma doesn't have switches)

**Accessibility**:
- ✅ Label association
- ✅ Checked state (aria-checked)
- ✅ Role="switch"
- ✅ Keyboard accessible (Space to toggle)

**FAST Attributes**:
- `checked` - Initial state
- `required` - Mark as required
- `disabled` - Disable switch
- `name` - Form name
- `value` - Form value

---

### Tabs (`fast-tabs`)

**Purpose**: Tabbed content navigation.

**Usage**:
```html
<fast-tabs
  activeid="tab1"
  aria-label="Example tabs">
  <fast-tab id="tab1">Tab 1</fast-tab>
  <fast-tab id="tab2">Tab 2</fast-tab>
  <fast-tab id="tab3">Tab 3</fast-tab>

  <fast-tab-panel id="panel1">
    Content 1
  </fast-tab-panel>
  <fast-tab-panel id="panel2">
    Content 2
  </fast-tab-panel>
  <fast-tab-panel id="panel3">
    Content 3
  </fast-tab-panel>
</fast-tabs>
```

**Bulma Class Mappings**:
- `.is-small` → Small size
- `.is-medium` → Medium size
- `.is-large` → Large size
- `.is-centered` → Centered tabs
- `.is-right` → Right-aligned tabs

**Accessibility**:
- ✅ ARIA tab role
- ✅ aria-label for labeling
- ✅ Keyboard navigation (arrow keys)
- ✅ aria-selected for active tab
- ✅ aria-controls for panel association

**FAST Attributes**:
- `activeid` - ID of active tab
- `orientation` - Horizontal or vertical

**FAST Slots**:
- Default slot - Tab elements and panels

---

### Dialog (`fast-dialog`)

**Purpose**: Modal dialog for focused interactions.

**Usage**:
```html
<fast-dialog
  aria-labelledby="dialog-title"
  aria-describedby="dialog-description"
  aria-hidden="true"
  id="my-dialog"
  hidden>
  <h2 id="dialog-title">Dialog Title</h2>
  <p id="dialog-description">Dialog description</p>
  <fast-button class="is-primary" onclick="document.getElementById('my-dialog').close()">
    Close
  </fast-button>
</fast-dialog>

<fast-button
  data-dialog-trigger="my-dialog"
  onclick="document.getElementById('my-dialog').show()">
  Open Dialog
</fast-button>
```

**Bulma Class Mappings**:
- None (Bulma uses `.modal` with different structure)

**Accessibility**:
- ✅ ARIA dialog role
- ✅ aria-labelledby for title
- ✅ aria-describedby for description
- ✅ Focus trapping
- ✅ Focus restoration on close
- ✅ Escape key to close
- ✅ aria-hidden when not visible

**FAST Attributes**:
- `hidden` - Hide dialog
- `modal` - Make modal (blocks background)

**FAST Methods**:
- `show()` - Show dialog
- `hide()` - Hide dialog

---

### Menu Button (`fast-menu-button`)

**Purpose**: Dropdown menu trigger.

**Usage**:
```html
<fast-menu-button>
  <fast-button class="is-primary" slot="trigger">
    Open Menu
  </fast-button>

  <fast-menu-item value="option1">Option 1</fast-menu-item>
  <fast-menu-item value="option2">Option 2</fast-menu-item>
  <fast-menu-item value="option3">Option 3</fast-menu-item>
</fast-menu-button>
```

**Bulma Class Mappings**:
- `.dropdown` → Dropdown container
- `.is-active` → Open state

**Accessibility**:
- ✅ ARIA menu role
- ✅ aria-expanded state
- ✅ Keyboard navigation (arrow keys, Enter, Escape)
- ✅ Focus management

**FAST Slots**:
- `trigger` - Button that opens menu
- Default slot - Menu items

---

### Progress (`fast-progress`)

**Purpose**: Progress indicator.

**Usage**:
```html
<fast-progress
  value="50"
  min="0"
  max="100"
  aria-label="Loading progress">
</fast-progress>
```

**Bulma Class Mappings**:
- `.is-primary` → Primary color
- `.is-success` → Success color
- `.is-warning` → Warning color
- `.is-danger` → Danger color

**Accessibility**:
- ✅ role="progressbar"
- ✅ aria-valuenow
- ✅ aria-valuemin
- ✅ aria-valuemax
- ✅ aria-label for labeling

**FAST Attributes**:
- `value` - Current value
- `min` - Minimum value
- `max` - Maximum value
- `paused` - Pause animation

---

## Theme Integration

All components support theme switching through CSS variables:

```html
<!-- Light mode (default) -->
<div data-theme="light">
  <fast-button class="is-primary">Light Mode Button</fast-button>
</div>

<!-- Dark mode -->
<div data-theme="dark">
  <fast-button class="is-primary">Dark Mode Button</fast-button>
</div>
```

**Theme Variables**:
- `--fast-primary` - Primary color
- `--fast-success` - Success color
- `--fast-warning` - Warning color
- `--fast-danger` - Danger color
- `--fast-info` - Info color
- `--fast-background` - Background color
- `--fast-text` - Text color

---

## Responsive Design

Components respond to Bulma's responsive utilities:

```html
<!-- Responsive button sizes -->
<fast-button class="is-small is-hidden-mobile">Hidden on mobile</fast-button>
<fast-button class="is-medium is-tablet">Tablet only</fast-button>
<fast-button class="is-large is-desktop">Desktop only</fast-button>

<!-- Responsive form controls -->
<fast-text-field class="is-fullwidth-mobile is-half-desktop">
</fast-text-field>
```

---

## Form Integration

FastBulma components work seamlessly with native forms:

```html
<form id="my-form" onsubmit="handleSubmit(event)">
  <fast-text-field
    id="email"
    name="email"
    type="email"
    required
    placeholder="Enter your email">
  </fast-text-field>

  <fast-checkbox
    id="agree"
    name="terms"
    required>
  </fast-checkbox>
  <label for="agree">I agree</label>

  <fast-button type="submit" class="is-primary">Submit</fast-button>
</form>

<script>
function handleSubmit(event) {
  event.preventDefault();
  const formData = new FormData(event.target);
  console.log(formData.get('email')); // Works!
}
</script>
```

**Note**: Requires form association polyfill for older browsers.

---

## Performance Considerations

### CSS Containment

All components use `contain: style` for optimized rendering:
- 15-25% faster style updates
- Isolated style recalculation
- Better frame rate with many components

### Component Registration

Three registration modes are available:

1. **Global Mode** (default): All components registered upfront
2. **Eager Mode**: Register on-demand when elements appear
3. **Lazy Mode** (future): Register only when in viewport

Current implementation uses **Global Mode** for simplicity.

---

## Browser Compatibility

| Browser | Version | Support |
|---------|---------|---------|
| Chrome | Latest 2 | ✅ Full |
| Firefox | Latest 2 | ✅ Full |
| Safari | Latest 2 | ✅ Full |
| Edge | Latest 2 | ✅ Full |
| Chrome | Last 4 | ⚠️ Polyfills |
| Firefox | Last 4 | ⚠️ Polyfills |
| Safari | Last 3 | ⚠️ Polyfills |

**Required Polyfills**:
- Form Association (Chrome < 77, Firefox < 79, Safari < 16.4)
- ResizeObserver (Safari < 13.1, Firefox < 69)

---

## Migration from Bulma

### Button Migration

**Before (Bulma)**:
```html
<button class="button is-primary is-large">Click me</button>
```

**After (FastBulma)**:
```html
<fast-button class="is-primary is-large">Click me</fast-button>
```

### Card Migration

**Before (Bulma)**:
```html
<div class="card">
  <div class="card-header">
    <p class="card-header-title">Title</p>
  </div>
  <div class="card-content">
    <p>Content</p>
  </div>
  <div class="card-footer">
    <a href="#" class="card-footer-item">Action</a>
  </div>
</div>
```

**After (FastBulma)**:
```html
<fast-card class="card">
  <div slot="heading">Title</div>
  <p>Content</p>
  <div slot="actions">
    <fast-button class="is-primary">Action</fast-button>
  </div>
</fast-card>
```

---

## Best Practices

### 1. Always Use Labels

```html
<!-- Good -->
<label for="email">Email</label>
<fast-text-field id="email" name="email"></fast-text-field>

<!-- Bad -->
<fast-text-field placeholder="Email"></fast-text-field>
```

### 2. Provide ARIA Labels

```html
<fast-tabs activeid="tab1" aria-label="Settings tabs">
  <!-- ... -->
</fast-tabs>
```

### 3. Test Keyboard Navigation

- Tab: Move between interactive elements
- Enter/Space: Activate buttons, checkboxes
- Arrow keys: Navigate tabs, radios, menus
- Escape: Close dialogs, menus

### 4. Ensure Color Contrast

All default colors meet WCAG 2.1 AA standards (4.5:1 minimum).

### 5. Use Semantic HTML

```html
<!-- Good -->
<form>
  <fast-text-field name="username"></fast-text-field>
</form>

<!-- Bad -->
<div class="form">
  <fast-text-field name="username"></fast-text-field>
</div>
```

---

## Troubleshooting

### Components Not Rendering

**Problem**: Custom elements appear as plain text.

**Solution**: Ensure JavaScript is loaded and components are registered.

```html
<script src="path/to/fastbulma.js"></script>
```

### Styles Not Applied

**Problem**: Bulma classes not affecting FAST components.

**Solution**: Check CSS variable bridge is working. Use browser DevTools to inspect variables.

```javascript
// Should show FAST tokens
getComputedStyle(document.documentElement).getPropertyValue('--fast-primary');
```

### Form Not Submitting

**Problem**: FAST component values not in FormData.

**Solution**: Ensure polyfill is loaded and components have `name` attribute.

```html
<script src="form-associated-element-boundary.min.js"></script>
<fast-text-field name="username"></fast-text-field>
```

---

**Last Updated**: 2025-01-24
**Maintained By**: FastBulma Team
