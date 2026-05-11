# FastBlocks UI v2 Layout Components — Scoped Spec

Date: 2026-05-09
Status: Implemented
Target: v2.0

This spec is implemented in FastBlocks UI with one explicit follow-up decision:
navbar mobile disclosure remains an application- or htmx-level concern.

## Goals

Add deferred layout components and htmx-compatible patterns for:

- Navbar (static helper; mobile disclosure remains app-level)
- Breadcrumb (simple navigation aid)
- Progress (accessible progress bar)
- Table (semantic table styling)
- Document htmx patterns for mobile nav, pagination, and datatables

______________________________________________________________________

## 1. Navbar

### CSS Design

```css
.ui-navbar {
  display: flex;
  align-items: center;
  min-height: 3rem;
  padding: 0 var(--ui-space-4);
  background: var(--ui-color-surface);
  border-bottom: var(--ui-border-width) solid var(--ui-color-border);
}

.ui-navbar-brand {
  display: flex;
  align-items: center;
  margin-right: auto;
  font-weight: 600;
  color: var(--ui-color-text-strong);
  text-decoration: none;
}

.ui-navbar-menu {
  display: flex;
  align-items: center;
  gap: var(--ui-space-2);
}

.ui-navbar-start,
.ui-navbar-end {
  display: flex;
  align-items: center;
  gap: var(--ui-space-1);
}

.ui-navbar-item {
  display: inline-flex;
  align-items: center;
  padding: 0.5rem 0.75rem;
  color: var(--ui-color-text);
  text-decoration: none;
  border-radius: var(--ui-radius-md);
}

.ui-navbar-item:hover,
.ui-navbar-item.is-active {
  background: var(--ui-color-surface-muted);
  color: var(--ui-color-text-strong);
}

/* Color variants */
.ui-navbar.is-primary {
  background: var(--ui-color-primary);
  border-color: var(--ui-color-primary);
}

.ui-navbar.is-primary .ui-navbar-brand,
.ui-navbar.is-primary .ui-navbar-item {
  color: var(--ui-color-primary-contrast);
}

/* Mobile toggle - CSS-only disclosure */
.ui-navbar-toggle {
  display: none;
  padding: 0.5rem;
  background: none;
  border: none;
  cursor: pointer;
}

@media screen and (max-width: 768px) {
  .ui-navbar-toggle {
    display: block;
  }

  .ui-navbar-menu {
    display: none;
    flex-direction: column;
    position: absolute;
    top: 100%;
    left: 0;
    right: 0;
    padding: var(--ui-space-2);
    background: var(--ui-color-surface);
    border-bottom: var(--ui-border-width) solid var(--ui-color-border);
    box-shadow: var(--ui-shadow-2);
  }

  .ui-navbar[data-open="true"] .ui-navbar-menu {
    display: flex;
  }
}
```

### Python Helper

```python
def navbar(
    brand: object = None,
    items: list[tuple[object, str]] | None = None,
    *,
    variant: str | None = None,
    class_: object = None,
    **attrs: object,
) -> SafeHTML:
    """Create a navbar with brand and optional nav items."""
    classes = _flatten_classes("ui-navbar", variant and f"is-{variant}", class_)
    attr_html = _render_attrs(class_=classes, **attrs)

    brand_html = (
        f'<a class="ui-navbar-brand">{_render_fragment(brand)}</a>' if brand else ""
    )

    items_html = ""
    if items:
        items_html = '<div class="ui-navbar-menu">'
        for label, href in items:
            items_html += f'<a class="ui-navbar-item" href="{escape(str(href), quote=True)}">{_render_fragment(label)}</a>'
        items_html += "</div>"

    toggle_html = '<button class="ui-navbar-toggle" type="button" aria-label="Toggle menu">☰</button>'

    return _safe(
        f'<nav{attr_html} aria-label="main navigation">'
        f"{brand_html}{toggle_html}{items_html}"
        f"</nav>"
    )
```

### htmx Mobile Pattern

**Problem:** CSS-only toggle requires JS for `data-open` attribute toggling.

**Solution:** Use htmx to swap the navbar on mobile breakpoint detection:

```python
# Backend: mobile-aware navbar endpoint
@app.get("/nav")
def nav(request):
    is_mobile = request.headers.get("HX-Desktop", "true") == "false"
    return render_navbar(is_mobile=is_mobile)
```

```jinja
{# Initial page load #}
<div hx-get="/nav" hx-trigger="resize" hx-target="this">
  {{ navbar(brand="Logo", items=[...]) }}
</div>
```

**Alternative: CSS-only with checkbox hack**

```html
<input type="checkbox" id="nav-toggle" class="ui-navbar-checkbox" hidden>
<nav class="ui-navbar">
  <label for="nav-toggle" class="ui-navbar-toggle">☰</label>
  <div class="ui-navbar-menu">
    <!-- menu items -->
  </div>
</nav>
```

```css
.ui-navbar-checkbox:checked ~ .ui-navbar .ui-navbar-menu {
  display: flex;
}
```

**Recommendation:** Start with CSS-only static navbar (no mobile collapse), document the htmx pattern for apps that need mobile.

______________________________________________________________________

## 2. Breadcrumb

### CSS Design

```css
.ui-breadcrumb {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: var(--ui-space-2);
  padding: var(--ui-space-3) 0;
  font-size: 0.875rem;
}

.ui-breadcrumb__item {
  display: flex;
  align-items: center;
  gap: var(--ui-space-2);
}

.ui-breadcrumb__item + .ui-breadcrumb__item::before {
  content: "/";
  color: var(--ui-color-text-muted);
}

.ui-breadcrumb__link {
  color: var(--ui-color-text-muted);
  text-decoration: none;
}

.ui-breadcrumb__link:hover {
  color: var(--ui-color-text-strong);
  text-decoration: underline;
}

.ui-breadcrumb__current {
  color: var(--ui-color-text-strong);
  font-weight: 500;
}
```

### Python Helper

```python
def breadcrumb(
    items: list[tuple[object, str | None]],
    *,
    class_: object = None,
    **attrs: object,
) -> SafeHTML:
    """Create a breadcrumb navigation trail.

    items: list of (label, url) tuples. url=None for current page.
    """
    classes = _flatten_classes("ui-breadcrumb", class_)
    attr_html = _render_attrs(class_=classes, aria_label="breadcrumb", **attrs)

    parts = ["<nav" + attr_html + ">"]
    for label, url in items:
        if url:
            parts.append(
                f'<span class="ui-breadcrumb__item">'
                f'<a class="ui-breadcrumb__link" href="{escape(str(url), quote=True)}">'
                f"{_render_fragment(label)}</a>"
                f"</span>"
            )
        else:
            parts.append(
                f'<span class="ui-breadcrumb__item">'
                f'<span class="ui-breadcrumb__current" aria-current="page">'
                f"{_render_fragment(label)}</span>"
                f"</span>"
            )
    parts.append("</nav>")

    return _safe("".join(parts))
```

### Usage

```jinja
{{ breadcrumb([
    ("Home", "/"),
    ("Products", "/products"),
    ("Details", None)
]) }}
```

______________________________________________________________________

## 3. Progress

### CSS Design

```css
.ui-progress {
  display: block;
  width: 100%;
  height: 0.5rem;
  background: var(--ui-color-surface-muted);
  border-radius: var(--ui-radius-pill);
  overflow: hidden;
}

.ui-progress__bar {
  display: block;
  height: 100%;
  background: var(--ui-color-primary);
  border-radius: var(--ui-radius-pill);
  transition: width 300ms ease;
}

/* Size variants */
.ui-progress.is-small { height: 0.25rem; }
.ui-progress.is-medium { height: 0.75rem; }
.ui-progress.is-large { height: 1rem; }

/* Color variants */
.ui-progress__bar.is-primary { background: var(--ui-color-primary); }
.ui-progress__bar.is-success { background: var(--ui-color-success); }
.ui-progress__bar.is-warning { background: var(--ui-color-warning); }
.ui-progress__bar.is-danger { background: var(--ui-color-danger); }
.ui-progress__bar.is-info { background: var(--ui-color-info); }
```

### Python Helper

```python
def progress(
    value: int | float,
    *,
    max: int | float = 100,
    size: str | None = None,
    variant: str = "primary",
    show_label: bool = False,
    class_: object = None,
    **attrs: object,
) -> SafeHTML:
    """Create a progress bar.

    Args:
        value: Current progress value (0 to max)
        max: Maximum value (default 100)
        size: "small", "medium", or "large"
        variant: "primary", "success", "warning", "danger", "info"
        show_label: Include aria-label with percentage
    """
    percentage = min(100, max(0, (int(value) / int(max)) * 100))
    size_class = f"is-{size}" if size else None
    classes = _flatten_classes("ui-progress", size_class, class_)
    bar_classes = _flatten_classes("ui-progress__bar", f"is-{variant}")

    attr_html = _render_attrs(
        class_=classes,
        role="progressbar",
        aria_valuenow=str(int(value)),
        aria_valuemin="0",
        aria_valuemax=str(int(max)),
        aria_label=f"{percentage:.0f}% complete" if show_label else None,
        **attrs,
    )

    bar_attr_html = _render_attrs(
        class_=bar_classes,
        style=f"width: {percentage:.0f}%",
    )

    return _safe(f"<div{attr_html}><span{bar_attr_html}></span></div>")
```

### Usage

```jinja
{{ progress(75, show_label=True) }}
{{ progress(50, size="large", variant="success") }}
```

______________________________________________________________________

## 4. Table (Semantic Styling)

### CSS Design

```css
.ui-table-container {
  overflow-x: auto;
  border: var(--ui-border-width) solid var(--ui-color-border);
  border-radius: var(--ui-radius-lg);
}

.ui-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 0.875rem;
}

.ui-table th,
.ui-table td {
  padding: 0.75rem 1rem;
  text-align: left;
  border-bottom: var(--ui-border-width) solid var(--ui-color-border);
}

.ui-table th {
  font-weight: 600;
  color: var(--ui-color-text-strong);
  background: var(--ui-color-surface-muted);
}

.ui-table td {
  color: var(--ui-color-text);
}

/* Striped rows */
.ui-table.is-striped tbody tr:nth-child(even) {
  background: var(--ui-color-surface-raised);
}

/* Hoverable rows */
.ui-table.is-hoverable tbody tr:hover {
  background: var(--ui-color-surface-raised);
}

/* Bordered */
.ui-table.is-bordered th,
.ui-table.is-bordered td {
  border: var(--ui-border-width) solid var(--ui-color-border);
}

/* Full width */
.ui-table.is-fullwidth {
  width: 100%;
}

/* Last row no border */
.ui-table tbody tr:last-child td {
  border-bottom: none;
}
```

### Python Helper

```python
def table(
    headers: list[str],
    rows: list[list[object]],
    *,
    striped: bool = False,
    hoverable: bool = False,
    bordered: bool = False,
    class_: object = None,
    **attrs: object,
) -> SafeHTML:
    """Create a styled table.

    Args:
        headers: List of column header labels
        rows: List of rows, each row is a list of cell values
        striped: Add alternating row colors
        hoverable: Add row hover effect
        bordered: Add borders to all cells
    """
    classes = _flatten_classes(
        "ui-table",
        striped and "is-striped",
        hoverable and "is-hoverable",
        bordered and "is-bordered",
        class_,
    )
    attr_html = _render_attrs(class_=classes, **attrs)

    header_html = "".join(f"<th>{_render_fragment(h)}</th>" for h in headers)

    body_html = "".join(
        "<tr>" + "".join(f"<td>{_render_fragment(cell)}</td>" for cell in row) + "</tr>"
        for row in rows
    )

    return _safe(
        f'<div class="ui-table-container">'
        f"<table{attr_html}>"
        f"<thead><tr>{header_html}</tr></thead>"
        f"<tbody>{body_html}</tbody>"
        f"</table></div>"
    )
```

### htmx Datatable Pattern

**Reference:** [htmx data tables example](https://htmx.org/examples/data-tables/)

**FastBlocks UI approach:**

1. **Server renders table rows** — use `table()` helper for initial render
1. **htmx swaps tbody** — keep `<thead>` stable, swap only `<tbody>` on sort/filter/page

```jinja
<div id="data-table">
  <table class="ui-table is-striped">
    <thead>
      <tr>
        <th hx-get="/items?sort=name" hx-swap="none">Name ↕</th>
        <th>Email</th>
      </tr>
    </thead>
    <tbody hx-get="/items?page=1" hx-trigger="load">
      <!-- Server renders initial rows -->
    </tbody>
  </table>
</div>
```

```python
# Backend: /items endpoint
@app.get("/items")
def items(request):
    page = int(request.params.get("page", 1))
    sort = request.params.get("sort", "name")

    data = get_items(page=page, sort=sort)
    rows = [[item.name, item.email] for item in data.items]

    return table(
        headers=["Name", "Email"],
        rows=rows,
        striped=True,
    )
```

______________________________________________________________________

## 5. Pagination (htmx Pattern)

### CSS Design (extends existing)

```css
.ui-pagination {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: var(--ui-space-1);
  padding: var(--ui-space-4) 0;
}

.ui-pagination__item {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 2.5rem;
  min-height: 2.5rem;
  padding: 0 0.5rem;
  border: var(--ui-border-width) solid var(--ui-color-border);
  border-radius: var(--ui-radius-md);
  color: var(--ui-color-text);
  text-decoration: none;
  transition: all 160ms ease;
}

.ui-pagination__item:hover {
  border-color: var(--ui-color-primary);
  color: var(--ui-color-primary);
}

.ui-pagination__item.is-current {
  background: var(--ui-color-primary);
  border-color: var(--ui-color-primary);
  color: var(--ui-color-primary-contrast);
  font-weight: 600;
}

.ui-pagination__item.is-disabled {
  opacity: 0.5;
  pointer-events: none;
}

.ui-pagination__ellipsis {
  padding: 0 var(--ui-space-2);
  color: var(--ui-color-text-muted);
}
```

### Python Helper

```python
def pagination(
    current: int,
    total: int,
    *,
    url_pattern: str = "?page={page}",
    siblings: int = 2,
    class_: object = None,
    **attrs: object,
) -> SafeHTML:
    """Create pagination links.

    Args:
        current: Current page number (1-indexed)
        total: Total number of pages
        url_pattern: URL template with {page} placeholder
        siblings: Number of pages to show on each side of current
    """
    if total <= 1:
        return _safe("")

    classes = _flatten_classes("ui-pagination", class_)
    attr_html = _render_attrs(class_=classes, aria_label="pagination", **attrs)

    def page_link(page: int, label: str | int = None) -> str:
        label = label or page
        url = url_pattern.format(page=page)
        is_current = page == current
        cls = "ui-pagination__item" + (" is-current" if is_current else "")
        attrs = f'class="{cls}" href="{escape(url, quote=True)}"'
        return f"<a {attrs}>{label}</a>"

    def ellipsis() -> str:
        return '<span class="ui-pagination__ellipsis">…</span>'

    # Generate page range
    pages: list[int | str] = []
    for p in range(max(1, current - siblings), min(total, current + siblings) + 1):
        pages.append(p)

    # Add first page and ellipsis if needed
    if pages and pages[0] > 1:
        if pages[0] > 2:
            pages.insert(0, "…first")
        pages.insert(0, 1)

    # Add last page and ellipsis if needed
    if pages and pages[-1] < total:
        if pages[-1] < total - 1:
            pages.append("…last")
        pages.append(total)

    parts = [f"<nav{attr_html}>"]

    # Previous link
    if current > 1:
        parts.append(page_link(current - 1, "‹"))
    else:
        parts.append('<span class="ui-pagination__item is-disabled">‹</span>')

    # Page links
    for page in pages:
        if page == "…first":
            parts.append(ellipsis())
        elif page == "…last":
            parts.append(ellipsis())
        else:
            parts.append(page_link(int(page)))

    # Next link
    if current < total:
        parts.append(page_link(current + 1, "›"))
    else:
        parts.append('<span class="ui-pagination__item is-disabled">›</span>')

    parts.append("</nav>")
    return _safe("".join(parts))
```

### Usage with htmx

```jinja
{{ pagination(
    current=current_page,
    total=total_pages,
    url_pattern="/items?page={page}"
) }}
```

htmx will swap the entire pagination fragment on click:

```python
@app.get("/items")
def items(request):
    page = int(request.params.get("page", 1))
    data = get_items(page=page)

    return render_template(
        "items.html",
        {
            "items": data.items,
            "pagination": pagination(
                current=page, total=data.total_pages, url_pattern="/items?page={page}"
            ),
        },
    )
```

______________________________________________________________________

## Component Summary

| Component | CSS Lines | Helper | htmx Pattern |
|-----------|-----------|--------|-------------|
| Navbar | ~80 | `navbar()` | CSS-only static, htmx for mobile |
| Breadcrumb | ~40 | `breadcrumb()` | None needed |
| Progress | ~35 | `progress()` | None needed |
| Table | ~70 | `table()` | Swap tbody on sort/page |
| Pagination | ~45 | `pagination()` | Full fragment swap |

**Total estimated: ~270 lines CSS + 150 lines Python helpers**

______________________________________________________________________

## Dependency Order

1. **Breadcrumb** — trivial, add first
1. **Progress** — trivial, add second
1. **Table** — medium, useful for htmx patterns
1. **Pagination** — medium, depends on table
1. **Navbar** — larger, depends on level (already done)

______________________________________________________________________

## Files to Modify

```
fastblocks_ui/static/css/
├── layout.css       # Add: navbar, breadcrumb, progress, table, pagination
└── fastblocks-ui.css  # Already imports layout.css

fastblocks_ui/helpers.py  # Add: navbar, breadcrumb, progress, table, pagination helpers

fastblocks_ui/manifest.json  # Add new components

docs/
├── components.md   # Document new components
├── usage.md         # Add htmx patterns section
└── layout-v2-spec.md  # This spec
```
