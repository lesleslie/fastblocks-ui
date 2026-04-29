# FastBlocks UI Usage

FastBlocks UI is built for server-rendered Python apps first. The public API is the `ui-*` CSS namespace plus the helper functions exported by `fastblocks_ui`.

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

## Optional enhancement JavaScript

The enhancement layer is only for interactive behaviors that need a little script:

- dialog open and close
- tabs switching
- menu toggles

Rendering still works without JavaScript.

## PWA-Friendly App Integration

FastBlocks UI is not a PWA runtime. The application should own service workers, offline caching, install prompts, and web manifest behavior.

What FastBlocks UI can provide is a clean surface for PWA-compatible apps:

- stable `ui-*` classes and helper output that render identically online and offline
- semantic color tokens that map cleanly to app-level `theme-color` metadata
- light and dark theme variables that follow `prefers-color-scheme`
- predictable asset paths for CSS, JavaScript, and the component manifest
- plain HTML fragments that remain readable when cached or swapped by htmx

Typical app-layer head tags:

```html
<link rel="manifest" href="/manifest.webmanifest">
<meta name="theme-color" content="#0f172a">
<link rel="apple-touch-icon" href="/icons/icon-180.png">
```

Typical app-layer service worker registration:

```html
<script>
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('/sw.js');
  }
</script>
```

Use FastBlocks UI for the UI contract, and keep the PWA lifecycle in the server-rendered application.
