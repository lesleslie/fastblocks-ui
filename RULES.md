# FastBulma Coding Standards

This document outlines the coding standards and conventions for the FastBulma project.

## Python Code Standards

### Style Guide
- Follow PEP 8 style guidelines
- Use Ruff for linting and formatting (line-length 88)
- Use descriptive variable and function names
- Add docstrings to all public functions and classes

### Type Hints
- Use type hints for all function parameters and return values
- Use `typing` module for complex types
- Enable Pyright strict mode for type checking

```python
from typing import List, Optional

def generate_theme(primary_color: str, variants: Optional[List[str]] = None) -> dict:
    """Generate a theme configuration.

    Args:
        primary_color: Primary color hex code
        variants: Optional list of color variants

    Returns:
        Dictionary containing theme configuration
    """
    if variants is None:
        variants = []
    # ...
```

### Error Handling
- Use specific exceptions (ValueError, TypeError, etc.)
- Include helpful error messages
- Use context managers (with statements) for resource management

```python
def validate_color(color: str) -> None:
    """Validate a color hex code."""
    if not color.startswith('#'):
        raise ValueError(f"Color must start with '#', got: {color}")
    if len(color) not in (4, 7):
        raise ValueError(f"Invalid hex color length: {color}")
```

### Testing Standards
- Write tests for all public functions
- Use pytest markers for test categorization
- Aim for >80% code coverage
- Use descriptive test names

```python
import pytest

class TestThemeGenerator:
    """Test suite for ThemeGenerator class."""

    @pytest.mark.unit
    def test_generate_default_theme(self):
        """Test default theme generation."""
        generator = ThemeGenerator()
        theme = generator.generate()
        assert '--bulma-primary' in theme
        assert theme['--bulma-primary'] == '#7957d5'

    @pytest.mark.unit
    @pytest.mark.parametrize("color,expected", [
        ('#ff0000', '#ff0000'),
        ('#f00', '#ff0000'),
    ])
    def test_normalize_hex_color(self, color, expected):
        """Test hex color normalization."""
        generator = ThemeGenerator()
        result = generator._normalize_hex_color(color)
        assert result == expected

    @pytest.mark.edge
    def test_invalid_color_raises_error(self):
        """Test that invalid colors raise ValueError."""
        generator = ThemeGenerator()
        with pytest.raises(ValueError, match="Invalid hex color"):
            generator._normalize_hex_color('not-a-color')
```

## JavaScript/CSS Standards

### Vanilla JavaScript Only
- **NO frameworks**: No React, Vue, Angular, or other framework patterns
- Use standard DOM APIs: `document.querySelector`, `element.classList`, etc.
- Use modern ES6+ features: arrow functions, template literals, destructuring
- Use FAST web components as custom elements

```javascript
// ✅ CORRECT - Vanilla JavaScript with FAST components
document.querySelectorAll('fast-button').forEach(button => {
  button.addEventListener('click', (event) => {
    console.log('Button clicked:', event.target);
  });
});

// ❌ WRONG - React patterns (DO NOT USE)
const Button = ({ onClick, children }) => (
  <fast-button onClick={onClick}>{children}</fast-button>
);
```

### CSS Variable Bridge Pattern
- Always use CSS variables to bridge Bulma classes to FAST components
- Never use direct CSS rules for FAST component styling (won't penetrate Shadow DOM)

```css
/* ✅ CORRECT - CSS variable bridge */
.is-primary {
  --accent-fill-rest: var(--bulma-primary);
  --accent-fill-hover: color-mix(in srgb, var(--bulma-primary) 90%, black);
}

/* ❌ WRONG - Direct styling won't work */
.is-primary fast-button {
  background-color: var(--bulma-primary);  /* Won't penetrate Shadow DOM! */
}
```

### Component Registration
- Register FAST components before use
- Use progressive enhancement patterns
- Provide polyfills for older browsers

```javascript
// Register FAST components
import { provideFASTDesignSystem } from '@microsoft/fast-components';

provideFASTDesignSystem()
  .register(
    fastButton(),
    fastCard(),
    fastTextField(),
    // ... other components
  );
```

## Documentation Standards

### Docstrings
- Use Google style docstrings for Python
- Include Args, Returns, Raises sections
- Add examples for complex functions

```python
def migrate_bulma_to_fastbulma(source_file: str, output_file: str) -> None:
    """Migrate Bulma HTML to FastBulma format.

    This function reads a Bulma HTML file, converts components to FAST
    web components, and writes the output to a new file.

    Args:
        source_file: Path to source Bulma HTML file
        output_file: Path to output FastBulma HTML file

    Raises:
        FileNotFoundError: If source_file doesn't exist
        ValueError: If source_file contains invalid HTML

    Example:
        >>> migrate_bulma_to_fastbulma('index.html', 'index-fastbulma.html')
        Migration complete: 25 components converted
    """
```

### Comments
- Add comments for complex logic
- Explain "why", not "what"
- Keep comments up-to-date with code changes

## Git Standards

### Commit Messages
- Use conventional commit format
- Start with verb: "Add", "Fix", "Update", "Refactor"
- Include issue number if applicable

```
Add theme generator utility (Fixes #123)

Implement ThemeGenerator class with support for custom color
schemes and pre-built theme templates.
```

### Branch Naming
- Use descriptive branch names
- Include issue number

```
feature/45-theme-generator
bugfix/78-dialog-styling
docs/101-api-documentation
```

## Security Standards

### Input Validation
- Validate all user input
- Sanitize HTML to prevent XSS
- Use CSP headers for production

```python
import re

def validate_color_input(color: str) -> str:
    """Validate and sanitize color input."""
    if not re.match(r'^#[0-9a-fA-F]{3,6}$', color):
        raise ValueError(f"Invalid color format: {color}")
    return color.lower()
```

### Dependency Management
- Keep dependencies up-to-date
- Run `creosote` to detect unused dependencies
- Review security advisories regularly

## Performance Standards

### Code Optimization
- Profile before optimizing
- Use built-in functions and libraries
- Avoid premature optimization

```python
# ✅ CORRECT - Use built-in functions
colors = ['#ff0000', '#00ff00', '#0000ff']
valid_colors = [c for c in colors if is_valid_color(c)]

# ❌ WRONG - Manual loop when built-in exists
valid_colors = []
for color in colors:
    if is_valid_color(color):
        valid_colors.append(color)
```

### Asset Optimization
- Minify CSS and JavaScript for production
- Use tree-shaking for FAST components
- Lazy load non-critical components

## Accessibility Standards

### Web Components
- Use FAST components (built with accessibility in mind)
- Add ARIA labels where needed
- Ensure keyboard navigation works

```html
<!-- Accessible button with label -->
<fast-button aria-label="Close dialog" id="close-btn">
  <span aria-hidden="true">×</span>
</fast-button>
```

### Color Contrast
- Ensure WCAG AA compliance (4.5:1 for normal text)
- Test with color blindness simulators
- Provide visual indicators beyond color

## Quality Assurance

### Pre-Commit Checks
- Run `crackerjack check` before committing
- Ensure all tests pass
- Check code coverage doesn't decrease

```bash
# Run full quality check
crackerjack check

# Run with auto-fix
crackerjack check --ai-fix
```

### Code Review Checklist
- [ ] Tests pass and coverage adequate
- [ ] Type checking passes (pyright)
- [ ] No security vulnerabilities (bandit)
- [ ] Code follows style guide (ruff)
- [ ] Documentation updated
- [ ] Accessibility verified
- [ ] Browser compatibility checked (Tier 1/2)

## Project-Specific Rules

### CSS Variable Naming
- Use `--bulma-` prefix for Bulma variables
- Map to FAST tokens with semantic names
- Document variable purpose

```css
:root {
  /* Bulma variable */
  --bulma-primary: #7957d5;

  /* FAST token mapping */
  --accent-fill-rest: var(--bulma-primary);
}
```

### Component Integration
- Always place Bulma classes on FAST components (not wrappers)
- Use slot names for component content
- Respect Shadow DOM boundaries

```html
<!-- ✅ CORRECT - Bulma class on FAST component -->
<fast-button class="is-primary is-large">
  Click me
</fast-button>

<!-- ❌ WRONG - Bulma class won't affect FAST component -->
<div class="is-primary">
  <fast-button>Click me</fast-button>
</div>
```

### Browser Compatibility
- Test on Tier 1 browsers (Chrome, Firefox, Safari, Edge)
- Provide polyfills for older browsers
- Use progressive enhancement

```html
<!-- Polyfill for form association (older browsers) -->
<script src="https://cdn.jsdelivr.net/npm/@github/form-associated-element-boundary@latest/dist/form-associated-element-boundary.min.js"></script>
```
