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

### Shell

The full-bleed page shell. It is a CSS grid: a single column below 1024px, and
main plus aside above it.

```jinja
{{ shell(main_html) }}
```

`shell()` wraps its first argument in `<main class="ui-shell-main">` and places
`aside` after it. `aside_width` and `max_width` are emitted as the
`--ui-shell-aside-width` and `--ui-shell-max` custom properties, and both are
validated as CSS lengths:

```jinja
{{ shell(
  main_html,
  aside=nav_list([("Overview", "#overview")]),
  aside_width="18rem",
  max_width="90rem",
  main_id="content"
) }}
```

`--ui-shell-max` defaults to `none`, so an unconfigured shell is genuinely
edge-to-edge; `--ui-shell-aside-width` defaults to `16rem`. Readable line length
is a separate opt-in — apply the `ui-measure` utility to prose that needs it.

The aside is rendered *after* `<main>` in the DOM because it is the right-hand
column in LTR, so DOM order matches visual order and WCAG 1.3.2/2.4.3 hold
without grid reordering. Pair it with a skip link so keyboard users are not
forced through the whole main column to reach it.

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

### Nav List

A vertical navigation list for sidebars and drawers. This is not the dropdown —
`menu()` renders `.ui-menu`, which is `position: absolute` and overlays the
page. The two are unrelated despite both being navigation.

```jinja
{{ nav_list([
  ("Overview", "#overview"),
  ("Usage", "#usage"),
  ("Components", "#components")
], active="#usage", aria_current="location") }}
```

`active` is matched against each item's raw href, before URL sanitisation, so a
caller comparing against a value they supplied gets the match they expect. The
matching item gets both `is-active` and `aria-current`.

`aria_current` defaults to `"true"`, the generic token, because this component
cannot know whether your hrefs change pages or only move the viewport. Pass
`"page"` for cross-page site navigation, or `"location"` for an in-page table of
contents. An unrecognised token raises `ValueError` rather than silently
degrading.

No `<nav>` landmark is emitted: the list is meant to go inside one you already
own (a drawer, an aside), and nesting landmarks here would produce a second,
unnamed navigation region.

### Nav Group

Labelled groups of navigation links. Each group label is a `<p>`, not a heading,
so the groups do not inject entries into the document outline.

```jinja
{{ nav_group([
  ("Getting started", [("Install", "/install"), ("Usage", "/usage")]),
  ("Reference", [("Components", "/components")])
], active="/usage", aria_current="page") }}
```

`active` and `aria_current` are forwarded to every group's `nav_list()`.
`class_` and `**attrs` land on one outer `<div class="ui-nav-groups">` rather
than on each group, so an `id` you pass stays unique.

### Drawer

An off-canvas panel built on the Popover API. Light dismiss, Escape, top-layer
stacking, tab-order placement while shown, focus return to the invoker on close,
and the implicit `aria-expanded`/`aria-details` invoker relationship are all
supplied by the browser — none of it is author JavaScript.

```jinja
{{ drawer(
  nav_list([("Overview", "#overview")]),
  id="site-nav",
  label="Section navigation",
  tag="nav"
) }}
```

`id` is required, because `popovertarget` needs a stable target. That is the
same stable-ID contract htmx swapping depends on — do not generate it per
render. `tag` accepts `div` (default), `nav`, `aside`, or `section`; anything
else raises `ValueError`. `side` is `"end"` by default; `"start"` adds
`is-start` and slides the panel in from the other edge.

```jinja
{{ drawer("Filters", id="filters", label="Filters", side="start") }}
```

### Burger

The button that toggles a drawer. `controls` is the drawer's `id` and becomes
`popovertarget`.

```jinja
{{ burger(controls="site-nav", label="Open navigation", class_="is-shell-toggle") }}
```

The accessible name is a visually hidden `<span>`, not `aria-label`, so the
control keeps a name if the stylesheet fails to load. The bars-to-cross morph is
selected from the drawer's own `:popover-open` via `:has()`, not from
`aria-expanded` on the button: a `popovertarget` invoker's expanded state is
*implicit* ARIA, computed into the accessibility tree and never reflected as a
DOM content attribute, and CSS attribute selectors only match content
attributes. Screen readers still get the expanded state.

**Known limitation.** `:has()` cannot express "the burger whose `popovertarget`
equals *this* drawer's id", so the selector is written against any open drawer:
on a page with more than one drawer, every burger morphs whenever any drawer
opens. This is a purely visual artifact and is correct for the single-drawer
case the component exists to serve.

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

## App Shell Pattern

The pieces above compose into a full-bleed page whose navigation column is a
sticky sidebar on a desktop and an off-canvas drawer on a phone — one DOM node,
one id, both roles.

```python
from fastblocks_ui import burger, drawer, hero, nav_group, navbar, shell

bar = navbar(
    brand="My App",
    end=burger(controls="site-nav", class_="is-shell-toggle"),
    label="site navigation",
    class_="is-sticky",
)

nav = drawer(
    nav_group([("Docs", [("Install", "#install"), ("Usage", "#usage")])]),
    id="site-nav",
    label="Section navigation",
    tag="nav",
    class_="ui-shell-aside",
    data_ui_drawer_breakpoint="1024",
)

page = bar + hero("My App", heading_level=1, id="top") + shell(
    body_markup, aside=nav, main_id="content"
)
```

What each piece contributes:

- **`class_="is-sticky"` on `navbar()`** fixes the bar to the top of the
  viewport and reserves its height on `body`. Above 1024px, when the page has a
  top-level `.ui-hero` and the visitor has not asked for reduced motion, the bar
  is instead revealed by a scroll-driven animation as the hero scrolls out.
  Everywhere else — including any browser without `animation-timeline: view()` —
  it is simply always visible. `--ui-navbar-height` (default `3.5rem`) is the
  tuning point if your bar is taller than one row.
- **`class_="ui-shell-aside"` on the drawer** is what makes the same element
  stop being a drawer above 1024px and become an ordinary in-flow sticky
  column. The UA stylesheet's `[popover]:not(:popover-open) { display: none }`
  is author-overridable, which is what makes one element with one id able to
  play both roles — and keeping one id is what keeps htmx swapping safe. At that
  width the shell's own burger is hidden (`.ui-burger.is-shell-toggle`), so the
  top-layer path is unreachable.
- **`data_ui_drawer_breakpoint="1024"`** opts the drawer into the one JavaScript
  enhancement this feature has: see below.

Because the sticky bar's height is compensated with
`:root { scroll-padding-top }` rather than per-section `scroll-margin-top`,
in-page anchors land clear of the bar with no per-section markup. That rule, and
the `scrollbar-gutter: stable` beside it, are scoped to pages that actually
have a sticky bar.

## Optional Enhancement JavaScript

- dialog open and close
- tabs switching
- menu toggles
- drawer breakpoint sync (`enhanceDrawers`)

Rendering still works without JavaScript.

`enhanceDrawers` exists for exactly one edge case. A drawer opened below its
breakpoint stays in the top layer until something closes it, so a visitor who
opens the drawer on a narrow window and then widens it past 1024px would
otherwise land on the desktop layout with a stale popover and a full-page scrim
over the column. The enhancement adds one `matchMedia` listener per drawer that
carries a `data-ui-drawer-breakpoint`, and calls `hidePopover()` when the
viewport crosses upward:

```jinja
{{ drawer(nav_html, id="site-nav", tag="nav", class_="ui-shell-aside", data_ui_drawer_breakpoint="1024") }}
```

Nothing else about the drawer needs JavaScript — opening, closing, light
dismiss, Escape, stacking, and focus return are all the platform's. Omit the
attribute and you get a drawer with no listener at all, which is correct for any
drawer that is not also a responsive layout column.

## PWA-Friendly App Integration

PWA guidance now lives in docs/pwa.md.
