# CLAUDE.md

This file provides guidance to Claude Code when working in this repository.

For a shorter, tool-neutral bootstrap document, start with `AGENTS.md`.

## Project Overview

FastBlocks UI is a clean-slate, HTML/CSS-first UI system for FastBlocks and other server-rendered Python apps. The public surface centers on `ui-*` classes, Python helpers, FastBlocks fragment helpers, and a small optional JavaScript enhancement layer.

## Project Structure

```text
src/fastblocks_ui/
├── __init__.py
├── __main__.py
├── cli.py
├── helpers.py
├── fastblocks.py
└── static/
    ├── css/
    │   ├── fastblocks-ui.css
    │   ├── tokens.css
    │   ├── base.css
    │   ├── utilities.css
    │   └── components.css
    └── js/
        ├── fastblocks-ui.js
        └── enhance.js

tests/
└── test_fastblocks_ui.py
```

## Development Commands

```bash
# Install in development mode
pip install -e ".[dev]"

# Run tests
python -m pytest tests/

# Run the main Python suite
python -m pytest tests/test_fastblocks_ui.py

# Run tests with coverage
python -m pytest --cov=fastblocks_ui tests/
```

## Core Constraints

- Keep the core intentionally small.
- Prefer semantic HTML and `ui-*` classes.
- Keep JavaScript optional and behavior-only.
- Use CSS custom properties and `@layer` for theming and structure.
- Keep htmx compatibility explicit: stable IDs, server-owned state, and focus restoration matter.
- Treat accessibility as a hard contract, not a loose goal.

## Helper and Component Patterns

- Python helpers should return HTML-safe markup.
- Jinja, async Jinja, and FastBlocks helpers should share the same render path.
- `button`, `card`, `field`, `input`, `select`, `checkbox`, `switch`, `dialog`, `tabs`, `menu`, and `alert` are the v1 public components.
- `ui-*` is the stable public CSS namespace.

## Theming

Use semantic tokens rather than framework-specific variables.

```css
:root {
  --ui-color-primary: #4f46e5;
  --ui-color-success: #22c55e;
  --ui-color-warning: #eab308;
  --ui-color-danger: #ef4444;
}
```

## Testing Strategy

- Use pytest for Python behavior and packaging checks.
- Use Vitest for browser-side JS enhancement tests when the JS toolchain is available.
- Add regressions for packaging, CLI behavior, accessibility, and htmx-safe rendering.

## Implementation Plan

The active implementation plan lives in `docs/fastblocks-ui-implementation-plan.md`.

## Important Files

- `docs/fastblocks-ui-implementation-plan.md`
- `docs/new-package-spec.md`
- `docs/new-package-next-steps.md`
- `README.md`
- `PACKAGE_README.md`
- `pyproject.toml`

## Development Workflow

1. Read `docs/fastblocks-ui-implementation-plan.md` before changing architecture.
2. Keep public docs aligned with the current component scope.
3. Update tests alongside behavior changes.
4. Verify Python packaging with `uv build` and `uv run pytest tests/test_fastblocks_ui.py -q`.

<!-- CRACKERJACK_START -->

## Crackerjack Integration

This project uses Crackerjack for automated quality checks and AI-powered code improvement.

### Quality Commands

```bash
# Run all quality checks
crackerjack all

# Run specific checks
crackerjack test
crackerjack lint
crackerjack format
crackerjack security
crackerjack check
```

### Quality Standards

- Coverage target: 80%+ code coverage
- Linting: Ruff with 88-character lines
- Type checking: Pyright
- Security: Bandit

### Testing with Crackerjack

```bash
pytest -m unit
pytest -m integration
pytest -m "not slow"
pytest -n auto
pytest --cov=fastblocks_ui --cov-report=html
```

<!-- CRACKERJACK_END -->
