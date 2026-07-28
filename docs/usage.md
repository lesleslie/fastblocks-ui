# FastBlocks UI Usage

FastBlocks UI is built for server-rendered Python apps first. The public API is the `ui-*` CSS namespace plus the helper functions exported by `fastblocks_ui`.

> **Template syntax note.** The examples below use standard Jinja delimiters
> (`{{ ... }}`), which work with plain Jinja, Flask, and Django (via Jinja).
> FastBlocks templates use ACB's `[[ ... ]]` delimiters instead — the helper API is
> identical, only the surrounding delimiters differ. The forthcoming `fastblocks-htmy`
> package provides typed components and an adapter that registers these helpers as
> template globals for FastBlocks apps, so the FastBlocks-native integration lives
> there. `fastblocks-ui` itself is framework-agnostic.

## Layout Examples

### Container

The container centers content with a max-width:

```jinja
{{ container("Hello world") }}
{{ container("Wide content", fluid=True) }}
```

### Columns Grid

The 12-column responsive grid:

```jinja
{{ columns(
  column("Left content", size="8"),
  column("Right sidebar", size="4")
) }}

{{ columns(
  column("1 of 3", size="4"),
  column("2 of 3", size="4"),
  column("3 of 3", size="4")
) }}
```

With responsive modifiers:

```jinja
{{ columns(
  column("Takes full width on mobile, half on tablet", size="6"),
  column("Same behavior", size="6")
) }}
```

Gapless columns:

```jinja
{{ columns(column("No gap"), column("No gap"), gapless=True) }}
```

### Section

Vertical spacing container:

```jinja
{{ section("Section content", size="medium") }}
```

### Footer

Page footer:

```jinja
{{ footer("© 2026 FastBlocks") }}
```

### Level

Horizontal navigation:

```jinja
{{ level(
  left='<a href="/">Logo</a>',
  right='<a href="/about">About</a>'
) }}
```

### Hero

Full-width banner:

```jinja
{{ hero("Welcome", subtitle="Get started with FastBlocks", variant="primary") }}
{{ hero("Large Hero", size="large", variant="info") }}
```

### Media

Image + text pair:

```jinja
{{ media(
  '<img src="avatar.png" alt="Avatar">',
  content="<p>User profile</p>",
  position="start"
) }}
```

### Tiles

Hierarchical layouts:

```jinja
{{ tile(tile("Main", size="8"), parent=True) }}
```

## Sync Jinja

In a standard Jinja environment, import the helpers into your template context and render them directly:

```python
from fastblocks_ui import button, field, input as ui_input

context = {
    "button": button,
    "field": field,
    "ui_input": ui_input,
}
```

```jinja
{% macro profile_form(user, errors=None) %}
  <form method="post">
    {{ field(
      label="Email address",
      help_text="Used for login and notifications.",
      error_text=errors.email if errors else None,
      control_html=ui_input(
        id="email",
        name="email",
        type="email",
        value=user.email,
        placeholder="you@example.com",
        autocomplete="email"
      )
    ) }}

    {{ button("Save changes", variant="primary", type="submit") }}
  </form>
{% endmacro %}
```

## Async Jinja

The same helpers work with async template environments, including macro-based templates:

```python
from fastblocks_ui import button, field, input as ui_input

# Use the async-capable Jinja environment provided by your stack.
template = env.get_template("profile.html")

html = await template.render_async(
    user=user,
    errors=errors,
    button=button,
    field=field,
    ui_input=ui_input,
)
```

```jinja
{% macro settings_panel(user) %}
  <section class="ui-card">
    <div class="ui-card__header">Profile</div>
    <div class="ui-card__body">
      {{ field(
        label="Display name",
        control_html=ui_input(id="display-name", name="display_name", value=user.display_name)
      ) }}
    </div>
  </section>
{% endmacro %}
```

## htmx

FastBlocks UI markup is designed to swap cleanly with htmx. Keep state on the server, preserve stable IDs, and return the same fragment shape after every update.

```jinja
<form
  id="profile-form"
  hx-post="/profile"
  hx-target="#profile-form"
  hx-swap="outerHTML"
>
  {{ field(
    label="Email address",
    help_text="Used for login and notifications.",
    error_text=errors.email if errors else None,
    control_html=ui_input(
      id="profile-email",
      name="email",
      type="email",
      value=user.email,
      autocomplete="email"
    )
  ) }}

  {{ button("Save", variant="primary", type="submit") }}
</form>
```

Style invalid fields by setting `aria-invalid="true"` on the control and returning the help/error markup with stable IDs:

```jinja
{{ field(
  label="Display name",
  help_text="Shown on your profile and in activity feeds.",
  error_text=errors.get("display_name"),
  control_html=ui_input(
    id="profile-display-name",
    name="display_name",
    value=user.display_name,
    aria_invalid=errors.get("display_name") is not none
  ),
  control_id="profile-display-name"
) }}
```

For fragment responses, keep the outer wrapper stable:

```python
from fastblocks_ui import block, fragment, stable_id

fragment_id = stable_id("profile-form", user.id)
html = block(
    fragment(rendered_form_html, fragment_id=fragment_id),
    block_id="profile-form",
)
```

### Server-side validation swap

On validation failure, return the same form fragment with field errors filled in:

```python
from fastblocks_ui import validation_summary


def render_profile_form(user, errors=None):
    return field(
        label="Email address",
        help_text="Used for login and notifications.",
        error_text=errors.get("email") if errors else None,
        control_html=ui_input(
            id="profile-email",
            name="email",
            type="email",
            value=user.email,
            autocomplete="email",
            aria_invalid=bool(errors and errors.get("email")) or None,
        ),
        control_id="profile-email",
    )
```

```jinja
<form
  id="profile-form"
  hx-post="/profile"
  hx-target="#profile-form"
  hx-swap="outerHTML"
>
  {{ validation_summary(errors) }}
  {{ render_profile_form(user, errors) }}
  {{ button("Save", variant="primary", type="submit") }}
</form>
```

### Multiple validation errors

When a form has more than one invalid field, a summary helps the user jump to the right control:

```jinja
{{ validation_summary({
  "profile-email": "Enter a valid email address.",
  "profile-display-name": "Display name must be at least 3 characters."
}) }}
```

For a single-field error response, keep the same fragment shape and return one summary item:

```jinja
<form id="profile-form" hx-post="/profile" hx-target="#profile-form" hx-swap="outerHTML">
  {{ validation_summary({"profile-email": errors.get("email")}) }}
  {{ field(
    label="Email address",
    help_text="Used for login and notifications.",
    error_text=errors.get("email"),
    control_html=ui_input(
      id="profile-email",
      name="email",
      type="email",
      value=user.email,
      aria_invalid=errors.get("email") is not none
    ),
    control_id="profile-email"
  ) }}
  {{ button("Save", variant="primary", type="submit") }}
</form>
```

## Additional Components

### Navbar

```jinja
{{ navbar(
  brand="My App",
  brand_url="/",
  items=[
    ("Home", "/"),
    ("About", "/about"),
    ("Contact", "/contact")
  ],
  variant="primary"
) }}
```

### Breadcrumb

```jinja
{{ breadcrumb([
  ("Home", "/"),
  ("Products", "/products"),
  ("Details", None)
]) }}
```

### Progress

```jinja
{{ progress(75, show_label=True) }}
{{ progress(50, size="large", variant="success") }}
```

### Table

```jinja
{{ table(
  headers=["Name", "Email", "Status"],
  rows=[
    ["Alice", "alice@example.com", "Active"],
    ["Bob", "bob@example.com", "Pending"],
    ["Carol", "carol@example.com", "Active"]
  ],
  striped=True,
  hoverable=True,
  fullwidth=True
) }}
```

### Pagination

```jinja
{{ pagination(
  current=2,
  total=10,
  url_pattern="/items?page={page}"
) }}
```

### Custom Element Wrappers

Use the wrapper form only when you need the optional enhancement layer:

```jinja
{{ tabs(items, custom_element=True) }}
{{ dialog("Content", title="Settings", custom_element=True) }}
{{ menu([("Profile", "/profile")], custom_element=True) }}
```

The default helper output remains the canonical server-rendered surface.

## htmx Patterns

FastBlocks UI markup is designed to swap cleanly with htmx. Keep state on the server, preserve stable IDs, and return the same fragment shape after every update.

### Table with Server-Side Sort/Filter

```python
from fastblocks_ui import table, pagination


@app.get("/items")
def items(request):
    page = int(request.params.get("page", 1))
    sort = request.params.get("sort", "name")

    data = get_items(page=page, sort=sort)
    rows = [[item.name, item.email, item.status] for item in data.items]

    return table(
        headers=["Name", "Email", "Status"],
        rows=rows,
        striped=True,
        hoverable=True,
    ) + pagination(
        current=page, total=data.total_pages, url_pattern="/items?page={page}"
    )
```

### Datatable with htmx Sorting

Swap just the `<tbody>` on column header click:

```html
<div id="data-table">
  <div class="ui-table-container">
    <table class="ui-table is-striped">
      <thead>
        <tr>
          <th
            hx-get="/items?sort=name"
            hx-target="tbody"
            hx-swap="innerHTML"
            hx-indicator=".ui-table"
          >Name ↕</th>
          <th>Email</th>
          <th>Status</th>
        </tr>
      </thead>
      <tbody>
        <!-- Server renders initial rows -->
      </tbody>
    </table>
  </div>
</div>
```

Reference: see the htmx docs for the data-tables example pattern.

### Pagination with htmx

Pagination links automatically trigger table refresh:

```html
<div id="pagination-target">
  {{ pagination(current=2, total=10, url_pattern="/items?page={page}") }}
</div>
```

Use htmx to swap the entire content area on pagination:

```html
<div
  id="items-list"
  hx-get="/items?page=2"
  hx-trigger="click from:.ui-pagination__item"
  hx-target="#items-list"
  hx-swap="innerHTML"
>
  <!-- table and pagination -->
</div>
```

### Navbar Mobile Collapse (htmx Pattern)

For mobile-aware navbar that adapts to viewport:

```python
@app.get("/nav")
def nav(request):
    # htmx sends HX-Desktop header
    is_mobile = request.headers.get("HX-Desktop") == "false"
    items = [...]
    return navbar(brand="Logo", items=items)
```

```html
<nav
  class="ui-navbar"
  hx-get="/nav"
  hx-trigger="resize from:window"
  hx-swap="outerHTML"
>
  {{ navbar(brand="Logo", items=items) }}
</nav>
```

### Tabbed Panel Swap (htmx Pattern)

Keep the tab state on the server and return the same tab/panel structure after
each request:

```python
@app.get("/account")
def account(request):
    active = request.params.get("tab", "profile")
    return tabs(
        [
            ("profile", "Profile", "<div>Profile content</div>"),
            ("security", "Security", "<div>Security content</div>"),
        ],
        active_id=active,
    )
```

```html
<div hx-get="/account?tab=security" hx-trigger="click from:[data-ui-tab-target]" hx-target="#account-tabs" hx-swap="outerHTML">
  {{ tabs([
    ("profile", "Profile", "<div>Profile content</div>"),
    ("security", "Security", "<div>Security content</div>")
  ], active_id="profile") }}
</div>
```

### Dialog Content Swap (htmx Pattern)

Load dialog content from the server when the dialog opens, and return the same
`<dialog>` wrapper each time:

```python
@app.get("/settings/dialog")
def settings_dialog(request):
    return dialog(
        "<form method='post'>...</form>",
        title="Settings",
        open=True,
    )
```

```html
<ui-dialog class="ui-dialog" data-ui-dialog>
  <button type="button" data-ui-dialog-trigger aria-controls="settings-dialog">
    Open settings
  </button>
  <dialog id="settings-dialog" class="ui-dialog" aria-hidden="true">
    <!-- htmx can swap this fragment with server-rendered content -->
  </dialog>
</ui-dialog>
```

### Menu Refresh (htmx Pattern)

Use htmx to refresh menu content while keeping the disclosure shape stable:

```python
@app.get("/nav/menu")
def nav_menu(request):
    return menu(
        [
            ("Profile", "/profile"),
            ("Settings", "/settings"),
            ("Sign out", "/logout"),
        ]
    )
```

```html
<ui-menu class="ui-menu" data-ui-menu>
  <button
    type="button"
    data-ui-menu-trigger
    aria-controls="account-menu"
    hx-get="/nav/menu"
    hx-trigger="click"
    hx-target="#account-menu"
    hx-swap="innerHTML"
  >
    Account
  </button>
  <div id="account-menu" data-ui-menu hidden aria-label="Account menu">
    <!-- server-rendered menu links -->
  </div>
</ui-menu>
```

## Optional Enhancement JavaScript

- dialog open and close
- tabs switching
- menu toggles

Rendering still works without JavaScript.

## PWA-Friendly App Integration

PWA guidance now lives in docs/pwa.md.
