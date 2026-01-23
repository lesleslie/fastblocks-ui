# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

FastBulma combines Bulma's CSS utilities with FAST's web components through CSS variables. This is a **vanilla JavaScript framework** - no React, Vue, Angular, or other framework integrations.

**Critical Architecture**: The entire framework works through the CSS Variable Bridge Pattern:
- Bulma classes (`.is-primary`, `.is-success`, etc.) update CSS variables
- Those CSS variables penetrate Shadow DOM boundaries
- FAST components read those CSS variables internally
- This allows Bulma classes to style FAST components without direct CSS access

## Project Structure

```
src/fastbulma/
├── __init__.py           # Package metadata and static path helpers
├── cli.py                # CLI tools (if implemented)
└── static/
    ├── css/
    │   └── fastbulma.css  # CSS variable mappings (Bulma → FAST tokens)
    └── js/
        └── fastbulma.js   # Component registration and utilities

tests/
└── test_fastbulma.py     # Python unit tests
```

## Development Commands

### Python Package Development
```bash
# Install in development mode
pip install -e ".[dev]"

# Run tests
python -m pytest tests/

# Run specific test
python -m pytest tests/test_fastbulma.py::TestFastBulma::test_version

# Run tests with coverage
python -m pytest --cov=fastbulma tests/
```

### Frontend Development
Currently, frontend assets are static files in `src/fastbulma/static/`. The build system has not been implemented yet. See IMPLEMENTATION_PLAN.md for the planned build system (Vite, PostCSS, etc.).

## Critical Constraints

### Vanilla JavaScript Only
- **NO React patterns**: Never use `className`, JSX props, or React-specific syntax
- **NO framework integration code**: All examples must use vanilla JS web components
- **Standard DOM APIs only**: Use `document.querySelector`, `element.classList`, etc.
- **Web Components**: Use FAST custom elements directly (`<fast-button>`, `<fast-card>`, etc.)

### CSS Variable Bridge Pattern
When styling FAST components with Bulma classes, ALWAYS use CSS variables, never direct CSS:

```css
/* ✅ CORRECT - CSS variable bridge */
.is-primary {
  --accent-fill-rest: var(--bulma-primary);
}

/* ❌ WRONG - Direct styling won't penetrate Shadow DOM */
.is-primary fast-button {
  background-color: var(--bulma-primary);  /* This doesn't work! */
}
```

### Browser Compatibility Requirements
The framework must support:
- **Tier 1** (latest 2 versions): Chrome, Firefox, Safari, Edge - full functionality
- **Tier 2** (last 4 versions): Core functionality with polyfills
- **color-mix() function**: Requires Chrome 111+, Firefox 113+, Safari 16.2+ OR fallback
- **Form Association**: Chrome 77+, Firefox 79+, Safari 16.4+ OR polyfill

Always include the form association polyfill for older browsers:
```html
<script src="https://cdn.jsdelivr.net/npm/@github/form-associated-element-boundary@latest/dist/form-associated-element-boundary.min.js"></script>
```

## Component API Patterns

### FAST Component Usage
Use FAST custom elements with Bulma classes:
```html
<!-- Correct: Bulma class on the FAST element itself -->
<fast-button class="is-primary is-large">Click me</fast-button>

<!-- Wrong: Bulma class on wrapper won't affect Shadow DOM -->
<div class="is-primary">
  <fast-button>Click me</fast-button>
</div>
```

### Slot Naming Conventions
FAST components use named slots (not props):
```html
<fast-card>
  <h3 slot="heading">Card Title</h3>
  <p>Content goes here (default slot)</p>
  <div slot="actions">Footer actions</div>
</fast-card>
```

## CSS Architecture

### Three-Layer Structure
1. **Base Variables** (`:root`): Define Bulma colors, spacing, typography
2. **FAST Token Mapping** (`@layer fast`): Map Bulma variables to FAST design tokens
3. **Bulma Class Mappings**: Bulma classes (`.is-primary`, etc.) update CSS variables

### CSS Customization Example
```css
:root {
  --bulma-primary: #7957d5;  /* User customizes here */
}

@layer fast {
  :root {
    --accent-fill-rest: var(--bulma-primary);  /* Mapped to FAST */
  }
}

.is-primary {
  --accent-fill-rest: var(--bulma-primary);  /* Applied by Bulma class */
}
```

## Testing Strategy

See IMPLEMENTATION_PLAN.md Phase 4 for comprehensive testing strategy. Key points:
- **Vitest** for unit tests (JavaScript)
- **Playwright** for E2E tests
- **Chromatic** for visual regression testing
- **axe-core** for accessibility testing
- Target: >80% code coverage

## Implementation Plan

This project is following a comprehensive implementation plan documented in **IMPLEMENTATION_PLAN.md**. Always reference that document for:
- Technical architecture details
- Shadow DOM integration strategy
- Component API specifications
- Testing infrastructure
- Migration paths from Bulma
- Build and deployment strategy

## Common Patterns

### Dynamic Theme Switching
```javascript
// Set theme via data attribute (recommended)
document.documentElement.setAttribute('data-theme', 'dark');

// Or update CSS variables directly
document.documentElement.style.setProperty('--bulma-primary', '#ff0000');
```

### Component Registration
Three modes are planned (see IMPLEMENTATION_PLAN.md):
1. **Global mode**: Register all components upfront (v1.0)
2. **Eager mode**: Register on-demand when elements appear in DOM
3. **Lazy mode**: Register only when components enter viewport

### Form Integration
FAST components participate in native forms with the polyfill:
```html
<form id="my-form">
  <fast-text-field name="username"></fast-text-field>
  <fast-button type="submit">Submit</fast-button>
</form>

<script>
  const form = document.getElementById('my-form');
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const formData = new FormData(form);
    console.log(formData.get('username'));  // Works!
  });
</script>
```

## Important Files

- **IMPLEMENTATION_PLAN.md**: Comprehensive implementation plan with all technical details
- **src/fastbulma/static/css/fastbulma.css**: CSS variable mappings
- **src/fastbulma/static/js/fastbulma.js**: Component registration and utilities
- **pyproject.toml**: Python package configuration

## Development Workflow

1. Read IMPLEMENTATION_PLAN.md to understand the architecture
2. Implement features following the vanilla JavaScript constraint
3. Use CSS Variable Bridge Pattern for all styling
4. Test with Vitest (JS) and pytest (Python)
5. Ensure browser compatibility with Tier 1/2 requirements
6. Include polyfills for older browsers

<!-- CRACKERJACK_START -->
## Crackerjack Integration

This project uses Crackerjack for automated quality checks and AI-powered code improvement.

### Quality Commands

```bash
# Run all quality checks
crackerjack all

# Run specific checks
crickerjack test      # Run pytest with coverage
crickerjack lint      # Run ruff linting
crickerjack format    # Run ruff formatting
crickerjack security  # Run bandit security scanning
crickerjack check     # Run all checks (test + lint + security)
```

### AI-Powered Fixes

```bash
# Automatically fix issues
crickerjack test --ai-fix      # Fix test failures
crickerjack lint --ai-fix      # Fix linting issues
crickerjack format --ai-fix    # Fix formatting issues
crickerjack check --ai-fix     # Fix all check issues
```

### Quality Standards

- **Coverage Target**: 80%+ code coverage required
- **Linting**: Ruff with Black-compatible formatting (line-length 88)
- **Type Checking**: Pyright for static type analysis
- **Security**: Bandit for security vulnerability scanning
- **Dependencies**: Creosote ensures no unused dependencies

### Testing with Crackerjack

```bash
# Run tests with markers
pytest -m unit                    # Unit tests only
pytest -m integration             # Integration tests only
pytest -m "not slow"              # Exclude slow tests
pytest -m "requires_network"      # Tests needing network

# Run tests in parallel (3-4x faster)
pytest -n auto

# Generate coverage reports
pytest --cov=fastbulma --cov-report=html
open htmlcov/index.html          # View coverage report
```

### MCP Integration

Crickerjack is available as an MCP server for Claude Code integration:

```json
{
  "mcpServers": {
    "crackerjack": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-crackerjack@latest"]
    }
  }
}
```

### Skill System

Access 12 specialized AI agents via crackerjack's skill system:

- **RefactoringAgent**: Code refactoring and modernization
- **SecurityAgent**: Security vulnerability analysis
- **PerformanceAgent**: Performance optimization
- **TestAgent**: Test generation and improvement
- **DocumentationAgent**: Documentation generation
- And 7 more specialized agents

See [crackerjack documentation](https://github.com/your-org/crackerjack) for complete skill system reference.
<!-- CRACKERJACK_END -->
