# FastBlocks HTMY — Specification

Date: 2026-05-09
Status: Draft
Package: `fastblocks-htmy`
Depends: `fastblocks-ui` (for CSS), `htmy` (for component base)

______________________________________________________________________

## 1. Concept & Philosophy

`fastblocks-htmy` is a type-safe HTMY component library for FastBlocks UI components.

Unlike `fastblocks-ui/helpers.py` which outputs plain HTML strings, `fastblocks-htmy` provides Python dataclass-based components with:

- Full type safety on props (IDE autocomplete, mypy/pyright validation)
- Composable sub-components
- Built-in htmx integration patterns
- Reusable component libraries per domain

**Design principle**: `fastblocks-htmy` is a thin wrapper over `fastblocks-ui` CSS. It does not reimplement styling — it wraps existing classes with type-safe Python.

______________________________________________________________________

## 2. Architecture

### Package Structure

```
fastblocks-htmy/
├── pyproject.toml
├── src/
│   └── fastblocks_htmy/
│       ├── __init__.py
│       ├── base.py              # Base component classes
│       ├── layout/              # Layout components (mirrors fastblocks-ui)
│       │   ├── __init__.py
│       │   ├── container.py
│       │   ├── columns.py
│       │   ├── navbar.py
│       │   ├── breadcrumb.py
│       │   └── ...              # One file per component
│       ├── ui/                  # UI components
│       │   ├── __init__.py
│       │   ├── button.py
│       │   ├── table.py
│       │   ├── pagination.py
│       │   ├── progress.py
│       │   ├── card.py
│       │   ├── notification.py
│       │   ├── tag.py
│       │   ├── form.py           # Field, Input, Select, Checkbox, etc.
│       │   └── ...              # One file per component
│       ├── patterns/            # Composite patterns
│       │   ├── __init__.py
│       │   ├── data_table.py    # Table + Pagination + Search (htmx)
│       │   ├── modal.py
│       │   ├── sidebar_nav.py
│       │   └── crud_page.py     # List + Create + Edit patterns
│       └── html.py              # Escape/escape attr utilities
├── tests/
│   ├── test_layout.py
│   ├── test_ui.py
│   └── test_patterns.py
└── README.md
```

### Core Base Class

```python
from htmy import Component, Context
from typing import Any


class FastBlocksComponent(Component):
    """Base class for all FastBlocks HTMY components."""

    def htmy(self, context: Context | None = None) -> str:
        """Render component as HTML."""
        raise NotImplementedError
```

### CSS Integration Pattern

Components reference `fastblocks-ui` CSS classes via the `css_class` attribute or inline generation. No CSS duplication.

```python
@dataclass
class Container(FastBlocksComponent):
    """Wrapper component using fastblocks-ui container."""

    content: str | Component = ""
    fluid: bool = False

    def htmy(self, context: Context | None = None) -> str:
        cls = "ui-container is-fluid" if self.fluid else "ui-container"
        return f'<div class="{cls}">{render(self.content, context)}</div>'
```

______________________________________________________________________

## 3. Component Design

### Naming Convention

- Files: `snake_case.py` (e.g., `data_table.py`)
- Classes: `PascalCase` (e.g., `DataTable`)
- Props: `snake_case` (e.g., `striped_rows`)
- CSS classes: `ui-{element}` (e.g., `ui-table`)

### Prop Patterns

```python
# Optional props with defaults
@dataclass
class Table:
    headers: list[str]
    rows: list[list[str]]
    striped: bool = False  # CSS modifier
    hoverable: bool = False  # CSS modifier
    bordered: bool = False  # CSS modifier
    loading: bool = False  # JS enhancement


# Enum for variants
class ButtonVariant(Enum):
    PRIMARY = "primary"
    SECONDARY = "secondary"
    DANGER = "danger"
    GHOST = "ghost"


@dataclass
class Button:
    text: str
    variant: ButtonVariant = ButtonVariant.PRIMARY
    size: str = "normal"  # "small", "normal", "medium", "large"
    disabled: bool = False
    loading: bool = False  # Shows spinner state
```

### htmx Integration

```python
@dataclass
class HtmxButton(Button):
    """Button with htmx attributes."""

    hx_get: str = ""
    hx_post: str = ""
    hx_target: str = ""
    hx_swap: str = "innerHTML"
    hx_trigger: str = "click"
    hx_indicator: str = ""  # Selector for loading indicator
    hx_confirm: str = ""  # Confirmation message

    def htmy(self, context: Context | None = None) -> str:
        attrs = []
        if self.hx_get:
            attrs.append(f'hx-get="{self.hx_get}"')
        if self.hx_post:
            attrs.append(f'hx-post="{self.hx_post}"')
        if self.hx_target:
            attrs.append(f'hx-target="{self.hx_target}"')
        if self.hx_swap:
            attrs.append(f'hx-swap="{self.hx_swap}"')
        if self.hx_trigger:
            attrs.append(f'hx-trigger="{self.hx_trigger}"')
        if self.hx_indicator:
            attrs.append(f'hx-indicator="{self.hx_indicator}"')
        if self.hx_confirm:
            attrs.append(f'hx-confirm="{self.hx_confirm}"')

        attrs_str = " " + " ".join(attrs) if attrs else ""
        cls = f"ui-button is-{self.variant.value} is-{self.size}"
        if self.loading:
            cls += " is-loading"

        return f'<button class="{cls}"{attrs_str}>{self.text}</button>'
```

### Composable Sub-components

```python
@dataclass
class Navbar(FastBlocksComponent):
    """Navbar with brand, menu, and htmx mobile toggle."""

    brand: str = ""
    brand_url: str = "/"
    items: list[NavbarItem] = field(default_factory=list)
    start_content: str = ""  # Left side HTML
    end_content: str = ""  # Right side HTML
    mobile_breakpoint: str = "tablet"  # htmx trigger breakpoint

    def htmy(self, context: Context | None = None) -> str:
        # Renders full navbar with htmx mobile menu toggle
        ...


@dataclass
class NavbarItem:
    text: str
    url: str
    active: bool = False
    dropdown: list[str] = field(default_factory=list)  # ["Item 1", "Item 2"]
```

______________________________________________________________________

## 4. Component Inventory

### Phase 1: Layout Components (from fastblocks-ui)

| Component | File | Props | Notes |
|-----------|------|-------|-------|
| Container | `layout/container.py` | `content`, `fluid` | |
| Columns | `layout/columns.py` | `children`, `gap`, `multiline` | |
| Column | `layout/column.py` | `size`, `offset`, `narrow` | |
| Section | `layout/section.py` | `content`, `spacing` | |
| Hero | `layout/hero.py` | `title`, `subtitle`, `size`, `color` | |
| Footer | `layout/footer.py` | `content`, `sticky` | |
| Level | `layout/level.py` | `left`, `right`, `mobile` | |
| Media | `layout/media.py` | `left`, `content`, `right` | |
| Tile | `layout/tile.py` | `ancestor`, `parent`, `child` | |
| Navbar | `layout/navbar.py` | `brand`, `items`, `htmx_mobile` | htmx toggle pattern |
| Breadcrumb | `layout/breadcrumb.py` | `items`, `separator` | |

### Phase 2: UI Components (from fastblocks-ui)

| Component | File | Props | Notes |
|-----------|------|-------|-------|
| Button | `ui/button.py` | `text`, `variant`, `size`, `htmx_*` | Full htmx props |
| Table | `ui/table.py` | `headers`, `rows`, `striped`, `hoverable` | |
| Pagination | `ui/pagination.py` | `current`, `total`, `htmx_*` | htmx nav pattern |
| Progress | `ui/progress.py` | `value`, `max`, `label`, `color` | |
| Tag | `ui/tag.py` | `text`, `color`, `rounded`, `delete` | |
| Card | `ui/card.py` | `header`, `body`, `footer`, `image` | |
| Notification | `ui/notification.py` | `message`, `type`, `dismissible` | |
| Form | `ui/form.py` | `Field`, `Input`, `Select`, `Checkbox`, `Radio` | |
| Dropdown | `ui/dropdown.py` | `trigger`, `items`, `align` | |

### Phase 3: Composite Patterns (new)

| Component | File | Purpose |
|-----------|------|---------|
| DataTable | `patterns/data_table.py` | Table + Pagination + Search with htmx |
| Modal | `patterns/modal.py` | Dialog with htmx open/close |
| SidebarNav | `patterns/sidebar_nav.py` | Collapsible sidebar with htmx |
| CRUDPage | `patterns/crud_page.py` | List + Create + Edit + Delete patterns |

______________________________________________________________________

## 5. htmx Integration Patterns

### DataTable Pattern

```python
@dataclass
class DataTable(FastBlocksComponent):
    """Table with htmx-powered sorting, pagination, and search."""

    columns: list[ColumnDef]  # name, label, sortable
    endpoint: str  # htmx endpoint for data fetch
    initial_page: int = 1
    per_page: int = 20
    search_placeholder: str = "Search..."
    no_results_message: str = "No results found"

    def htmy(self, context: Context | None = None) -> str:
        # Renders: search input + table + pagination
        # All wired with htmx for server-side updates
        pass
```

### Modal Pattern

```python
@dataclass
class Modal(FastBlocksComponent):
    """Dialog with htmx open/close."""

    id: str
    title: str
    content: str | Component
    trigger_text: str = "Open"
    trigger_hx_get: str = ""  # Optional: load content via htmx
    size: str = "normal"  # "small", "normal", "large", "full"

    def htmy(self, context: Context | None = None) -> str:
        # Renders: trigger button + dialog with htmx attributes
        # close on backdrop click, escape key
        pass
```

### Server-Side htmx Response Pattern

Components provide both client-side HTML AND server-side response helpers:

```python
class DataTable:
    def render_response(self, request) -> Response:
        """Render htmx partial response (just table rows)."""
        # For htmx swap — returns only the table body, not full page
        pass
```

______________________________________________________________________

## 6. Dependencies

### Required

- `python >= 3.10`
- `htmy >= 0.5.0` (component base)
- `fastblocks-ui >= 0.4.0` (CSS reference)

### Optional

- `pydantic` (for enhanced prop validation, if user wants it)

### Installation

```toml
[project]
dependencies = [
    "htmy>=0.5.0",
    "fastblocks-ui>=0.4.0",
]
```

______________________________________________________________________

## 7. API Design Examples

### Basic Usage

```python
from fastblocks_htmy import Button, Table, Container

# Single component
button = Button(text="Click me", variant=ButtonVariant.PRIMARY)
html = button.htmy()
# -> '<button class="ui-button is-primary is-normal">Click me</button>'

# Composition
container = Container(
    content=Table(
        headers=["Name", "Email"],
        rows=[["Alice", "alice@test.com"], ["Bob", "bob@test.com"]],
        striped=True,
    )
)
html = container.htmy()
```

### htmx Usage

```python
from fastblocks_htmy import HtmxButton, DataTable

# Button with htmx
btn = HtmxButton(
    text="Load More",
    hx_get="/api/items",
    hx_target="#items",
    hx_swap="afterend",
    hx_indicator="#spinner",
)
html = btn.htmy()

# Full data table
table = DataTable(
    columns=[
        ColumnDef(name="name", label="Name", sortable=True),
        ColumnDef(name="email", label="Email", sortable=False),
    ],
    endpoint="/api/table-data",
    search_placeholder="Search users...",
)
html = table.htmy()
```

### Jinja2 + FastBlocks-htmy

```python
from fastblocks_htmy import DataTable, ColumnDef


@app.get("/users")
async def users(request):
    table = DataTable(
        columns=[
            ColumnDef(name="name", label="Name", sortable=True),
            ColumnDef(name="email", label="Email", sortable=False),
        ],
        endpoint="/api/users",
    )
    return templates.render("users.html", {"data_table": table})
```

```html
<!-- users.html -->
<div hx-get="/api/users" hx-trigger="htmx:refresh" hx-swap="none">
  [[ data_table ]]
</div>
```

______________________________________________________________________

## 8. Out of Scope

- **No CSS duplication**: all styling comes from `fastblocks-ui` CSS
- **No JavaScript bundling**: htmx integration uses CDN or user-supplied htmx
- **No state management**: components are stateless; server manages application state
- **No frontend framework binding**: works with any Python web framework (Starlette, Flask, FastAPI, Django)
- **No backend logic**: components render HTML, they don't fetch data or manage state

______________________________________________________________________

## 9. Version Plan

| Version | Components | Notes |
|---------|------------|-------|
| 0.1.0 | Core base, Container, Button, Table | MVP with basic components |
| 0.2.0 | + Layout components (Columns, Hero, Navbar, Breadcrumb) | Layout system |
| 0.3.0 | + UI components (Card, Notification, Form, Tag) | UI system |
| 0.4.0 | + htmx patterns (DataTable, Modal, Sidebar) | Interactive components |
| 1.0.0 | Full component library | Production ready |

______________________________________________________________________

## 10. Open Questions

1. **htmy version**: Which htmy version to target? Check PyPI for latest stable.
1. **Pydantic vs dataclass**: Use `@dataclass` for simplicity, or `BaseModel` for validation?
1. **Server response helpers**: Include `render_partial()` for htmx responses, or leave to user?
1. **CSS variable theming**: Should components expose theming via CSS custom properties?
1. **CDN htmx**: Bundle htmx or require user to include it separately?

______________________________________________________________________

*Last updated: 2026-05-09*
