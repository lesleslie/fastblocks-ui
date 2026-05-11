"""HTML render helpers for the FastBlocks UI surface."""

from __future__ import annotations

import re
from hashlib import sha1
from html import escape

__all__ = [
    "SafeHTML",
    "alert",
    "breadcrumb",
    "button",
    "card",
    "checkbox",
    "column",
    "columns",
    "container",
    "dialog",
    "field",
    "footer",
    "hero",
    "input",
    "level",
    "media",
    "menu",
    "navbar",
    "pagination",
    "progress",
    "section",
    "select",
    "switch",
    "table",
    "tabs",
    "tile",
    "title",
    "validation_summary",
]


class SafeHTML(str):
    """A tiny HTML-safe string wrapper used for composed fragments."""

    def __html__(self) -> str:
        return str(self)


def _is_safe_html(value: object) -> bool:
    return isinstance(value, SafeHTML) or hasattr(value, "__html__")


def _render_fragment(value: object | None) -> str:
    if value is None:
        return ""
    if _is_safe_html(value):
        return str(value.__html__() if hasattr(value, "__html__") else value)
    return escape(str(value))


def _flatten_classes(*values: object) -> str:
    classes: list[str] = []

    for value in values:
        if not value:
            continue

        if isinstance(value, str):
            classes.extend(part for part in value.split() if part)
            continue

        if isinstance(value, (list, tuple, set)):
            classes.extend(str(part) for part in value if part)
            continue

        classes.append(str(value))

    return " ".join(dict.fromkeys(classes))


def _render_attrs(**attrs: object) -> str:
    rendered: list[str] = []

    class_name = attrs.pop("class_", None)
    legacy_class = attrs.pop("class", None)
    class_value = _flatten_classes(class_name, legacy_class)
    if class_value:
        rendered.append(f'class="{escape(class_value, quote=True)}"')

    for name, value in attrs.items():
        if value is None or value is False:
            continue

        attr_name = name.rstrip("_").replace("_", "-")
        if value is True:
            if attr_name.startswith("data-") or attr_name.startswith("aria-"):
                rendered.append(f'{attr_name}="true"')
                continue
            rendered.append(attr_name)
            continue

        rendered.append(f'{attr_name}="{escape(str(value), quote=True)}"')

    return (" " + " ".join(rendered)) if rendered else ""


def _safe(markup: str) -> SafeHTML:
    return SafeHTML(markup)


def _inject_attrs(markup: object, **attrs: object) -> SafeHTML | str:
    """Inject attributes into the first opening tag of a simple HTML fragment."""

    rendered_markup = _render_fragment(markup)
    if not attrs:
        return SafeHTML(rendered_markup) if _is_safe_html(markup) else rendered_markup

    match = re.match(r"^<([A-Za-z][A-Za-z0-9:-]*)([^>]*)>", rendered_markup)
    if not match:
        return SafeHTML(rendered_markup) if _is_safe_html(markup) else rendered_markup

    opening_tag, tag_name, existing_attrs = (
        match.group(0),
        match.group(1),
        match.group(2),
    )
    attr_html = _render_attrs(**attrs)
    if not attr_html:
        return SafeHTML(rendered_markup) if _is_safe_html(markup) else rendered_markup

    return _safe(
        rendered_markup.replace(
            opening_tag, f"<{tag_name}{existing_attrs}{attr_html}>", 1
        )
    )


_DOM_ID_PATTERN = re.compile(r"^[A-Za-z][A-Za-z0-9\-\_\:\.]*$")


def _normalize_dom_id(value: object, *, prefix: str = "ui") -> str:
    candidate = str(value).strip()
    if candidate and _DOM_ID_PATTERN.match(candidate):
        return candidate
    digest = sha1(candidate.encode("utf-8")).hexdigest()[:10] if candidate else "0"
    return f"{prefix}-{digest}"


def button(
    label: object,
    *,
    variant: str | None = None,
    size: str | None = None,
    href: str | None = None,
    type: str = "button",
    class_: object = None,
    **attrs: object,
) -> SafeHTML:
    classes = _flatten_classes(
        "ui-button",
        variant and f"is-{variant}",
        size and f"is-{size}",
        class_,
    )
    attr_html = _render_attrs(
        class_=classes,
        href=href,
        type=type if href is None else None,
        **attrs,
    )
    tag = "a" if href else "button"
    return _safe(f"<{tag}{attr_html}>{_render_fragment(label)}</{tag}>")


def card(
    *,
    header: object | None = None,
    body: object | None = None,
    footer: object | None = None,
    class_: object = None,
    **attrs: object,
) -> SafeHTML:
    attr_html = _render_attrs(class_=_flatten_classes("ui-card", class_), **attrs)
    parts = [f"<div{attr_html}>"]

    if header is not None:
        parts.append(
            f'<header class="ui-card__header">{_render_fragment(header)}</header>'
        )
    if body is not None:
        parts.append(f'<div class="ui-card__body">{_render_fragment(body)}</div>')
    if footer is not None:
        parts.append(
            f'<footer class="ui-card__footer">{_render_fragment(footer)}</footer>'
        )

    parts.append("</div>")
    return _safe("".join(parts))


def field(
    *,
    label: object | None = None,
    help_text: object | None = None,
    error_text: object | None = None,
    control_html: object = "",
    control_id: str | None = None,
    class_: object = None,
    **attrs: object,
) -> SafeHTML:
    attr_html = _render_attrs(class_=_flatten_classes("ui-field", class_), **attrs)
    parts = [f"<div{attr_html}>"]

    control_markup_source = _render_fragment(control_html)
    resolved_control_id = control_id
    if resolved_control_id is None:
        id_match = re.search(r'\bid="([^"]+)"', control_markup_source)
        if id_match:
            resolved_control_id = id_match.group(1)
    control_has_id = bool(re.search(r'\bid="([^"]+)"', control_markup_source))

    describedby_ids: list[str] = []
    if help_text is not None:
        describedby_ids.append(
            f"{resolved_control_id}-help" if resolved_control_id else "ui-field-help"
        )
    if error_text is not None:
        describedby_ids.append(
            f"{resolved_control_id}-error" if resolved_control_id else "ui-field-error"
        )

    if label is not None:
        label_attrs = _render_attrs(
            class_="ui-field__label",
            for_=resolved_control_id if resolved_control_id else None,
        )
        parts.append(f"<label{label_attrs}>{_render_fragment(label)}</label>")

    control_attrs: dict[str, object] = {}
    if resolved_control_id and not control_has_id:
        control_attrs["id"] = resolved_control_id
    if describedby_ids:
        control_attrs["aria_describedby"] = " ".join(describedby_ids)
    if error_text is not None:
        control_attrs["aria_invalid"] = "true"

    control_markup = _inject_attrs(control_html, **control_attrs)
    parts.append(f'<div class="ui-field__control">{control_markup}</div>')
    if help_text is not None:
        help_id = (
            f"{resolved_control_id}-help" if resolved_control_id else "ui-field-help"
        )
        parts.append(
            f'<div class="ui-field__help" id="{escape(help_id, quote=True)}">{_render_fragment(help_text)}</div>'
        )
    if error_text is not None:
        error_id = (
            f"{resolved_control_id}-error" if resolved_control_id else "ui-field-error"
        )
        parts.append(
            f'<div class="ui-field__error" id="{escape(error_id, quote=True)}" role="alert">{_render_fragment(error_text)}</div>'
        )

    parts.append("</div>")
    return _safe("".join(parts))


def input(
    *,
    value: object | None = None,
    placeholder: object | None = None,
    type: str = "text",
    class_: object = None,
    **attrs: object,
) -> SafeHTML:
    attr_html = _render_attrs(
        class_=_flatten_classes("ui-input", class_),
        type=type,
        value=value,
        placeholder=placeholder,
        **attrs,
    )
    return _safe(f"<input{attr_html}>")


def select(
    options: list[tuple[object, object]] | None = None,
    *,
    value: object | None = None,
    class_: object = None,
    **attrs: object,
) -> SafeHTML:
    option_html: list[str] = []
    for option_value, label in options or []:
        selected = (
            " selected" if value is not None and str(option_value) == str(value) else ""
        )
        option_html.append(
            f'<option value="{escape(str(option_value), quote=True)}"{selected}>{_render_fragment(label)}</option>'
        )

    attr_html = _render_attrs(class_=_flatten_classes("ui-select", class_), **attrs)
    return _safe(f"<select{attr_html}>{''.join(option_html)}</select>")


def checkbox(
    *,
    label: object,
    checked: bool = False,
    class_: object = None,
    **attrs: object,
) -> SafeHTML:
    wrapper_classes = _flatten_classes("ui-checkbox", class_)
    attr_html = _render_attrs(
        type="checkbox",
        checked=checked or None,
        class_="ui-checkbox__input",
        **attrs,
    )
    return _safe(
        f'<label class="{escape(wrapper_classes, quote=True)}">'
        f"<input{attr_html}>"
        f"<span>{_render_fragment(label)}</span>"
        f"</label>"
    )


def switch(
    *,
    label: object,
    checked: bool = False,
    class_: object = None,
    **attrs: object,
) -> SafeHTML:
    input_attrs = _render_attrs(
        type="checkbox",
        role="switch",
        aria_checked=str(bool(checked)).lower(),
        checked=checked or None,
        **attrs,
    )
    classes = _flatten_classes("ui-switch", class_)
    return _safe(
        f'<label class="{escape(classes, quote=True)}">'
        f"<input{input_attrs}>"
        f'<span class="ui-switch__track" aria-hidden="true"><span class="ui-switch__thumb"></span></span>'
        f"<span>{_render_fragment(label)}</span>"
        f"</label>"
    )


def alert(
    content: object,
    *,
    variant: str | None = None,
    class_: object = None,
    **attrs: object,
) -> SafeHTML:
    classes = _flatten_classes("ui-alert", variant and f"is-{variant}", class_)
    attr_html = _render_attrs(class_=classes, **attrs)
    return _safe(f"<div{attr_html}>{_render_fragment(content)}</div>")


def validation_summary(
    errors: dict[str, object] | list[object] | tuple[object, ...],
    *,
    title: object = "Please correct the errors below.",
    class_: object = None,
    **attrs: object,
) -> SafeHTML:
    classes = _flatten_classes("ui-alert", "is-danger", "ui-validation-summary", class_)
    attr_html = _render_attrs(class_=classes, role="alert", **attrs)

    items: list[str] = []
    if isinstance(errors, dict):
        for field_name, error_value in errors.items():
            if error_value is None or error_value is False:
                continue
            items.append(
                f'<li><a href="#{escape(str(field_name), quote=True)}">{_render_fragment(error_value)}</a></li>'
            )
    else:
        for _index, error_value in enumerate(errors):
            if error_value is None or error_value is False:
                continue
            items.append(f"<li>{_render_fragment(error_value)}</li>")

    if not items:
        return _safe(f"<div{attr_html}>{_render_fragment(title)}</div>")

    return _safe(
        f"<div{attr_html}>"
        f'<strong class="ui-validation-summary__title">{_render_fragment(title)}</strong>'
        f'<ul class="ui-validation-summary__list">{"".join(items)}</ul>'
        f"</div>"
    )


def dialog(
    content: object,
    *,
    title: object | None = None,
    open: bool = False,
    custom_element: bool = False,
    class_: object = None,
    **attrs: object,
) -> SafeHTML:
    classes = _flatten_classes("ui-dialog", class_)
    attr_html = _render_attrs(class_=classes, open=open or None, **attrs)
    parts = [f"<dialog{attr_html}>", '<div class="ui-dialog__surface">']
    if title is not None:
        parts.append(f"<h2>{_render_fragment(title)}</h2>")
    parts.append(_render_fragment(content))
    parts.append("</div></dialog>")
    dialog_markup = "".join(parts)
    if custom_element:
        host_attr_html = _render_attrs(
            class_=classes,
            data_ui_dialog=True,
            open=open or None,
            aria_hidden=str(not open).lower(),
        )
        return _safe(f"<ui-dialog{host_attr_html}>{dialog_markup}</ui-dialog>")
    return _safe(dialog_markup)


def tabs(
    items: list[tuple[str, str, object]],
    *,
    active_id: str | None = None,
    label: str = "Tabs",
    custom_element: bool = False,
    class_: object = None,
    **attrs: object,
) -> SafeHTML:
    classes = _flatten_classes("ui-tabs", class_)
    attr_html = _render_attrs(class_=classes, data_ui_tabs=True, **attrs)
    tab_buttons: list[str] = []
    panels: list[str] = []

    for tab_id, tab_label, panel_html in items:
        tab_dom_id = _normalize_dom_id(tab_id, prefix="ui-tab")
        panel_dom_id = f"{tab_dom_id}-panel"
        is_active = tab_id == active_id or (active_id is None and not tab_buttons)
        tab_buttons.append(
            f'<button class="ui-tabs__tab" type="button" role="tab" id="{escape(tab_dom_id, quote=True)}" data-ui-tab-target="#{escape(panel_dom_id, quote=True)}" aria-controls="{escape(panel_dom_id, quote=True)}" aria-selected="{str(is_active).lower()}" tabindex="{0 if is_active else -1}">{_render_fragment(tab_label)}</button>'
        )
        panels.append(
            f'<section id="{escape(panel_dom_id, quote=True)}" class="ui-tabs__panel" data-ui-panel role="tabpanel" aria-labelledby="{escape(tab_dom_id, quote=True)}" aria-hidden="{str(not is_active).lower()}"{" hidden" if not is_active else ""}>{_render_fragment(panel_html)}</section>'
        )

    outer_tag = "ui-tabs" if custom_element else "div"
    return _safe(
        f'<{outer_tag}{attr_html} aria-label="{escape(label, quote=True)}">'
        f'<div class="ui-tabs__list" role="tablist">{"".join(tab_buttons)}</div>'
        f"{''.join(panels)}"
        f"</{outer_tag}>"
    )


def menu(
    items: list[tuple[object, object]] | None = None,
    *,
    label: str = "Menu",
    custom_element: bool = False,
    class_: object = None,
    **attrs: object,
) -> SafeHTML:
    classes = _flatten_classes("ui-menu", class_)
    attr_html = _render_attrs(class_=classes, data_ui_menu=True, **attrs)
    links = [
        f'<a class="ui-menu__item" href="{escape(str(href), quote=True)}">{_render_fragment(text)}</a>'
        for text, href in (items or [])
    ]
    menu_markup = f'<nav{attr_html} aria-label="{escape(label, quote=True)}">{"".join(links)}</nav>'
    if custom_element:
        host_attr_html = _render_attrs(
            class_=classes, data_ui_menu=True, data_ui_state="closed"
        )
        return _safe(
            f'<ui-menu{host_attr_html} aria-label="{escape(label, quote=True)}">{menu_markup}</ui-menu>'
        )
    return _safe(menu_markup)


# =============================================================================
# Layout Helpers
# =============================================================================


def container(
    content: object = None,
    *,
    fluid: bool = False,
    widescreen: bool = False,
    fullhd: bool = False,
    class_: object = None,
    **attrs: object,
) -> SafeHTML:
    """Wrap content in a centered container with optional width constraints."""
    classes = _flatten_classes(
        "ui-container",
        fluid and "is-fluid",
        widescreen and "is-widescreen",
        fullhd and "is-fullhd",
        class_,
    )
    attr_html = _render_attrs(class_=classes, **attrs)
    inner = _render_fragment(content) if content is not None else ""
    return _safe(f"<div{attr_html}>{inner}</div>")


def section(
    content: object = None,
    *,
    size: str | None = None,
    class_: object = None,
    **attrs: object,
) -> SafeHTML:
    """Vertical spacing container for page sections."""
    classes = _flatten_classes(
        "ui-section",
        size and f"is-{size}",
        class_,
    )
    attr_html = _render_attrs(class_=classes, **attrs)
    inner = _render_fragment(content) if content is not None else ""
    return _safe(f"<section{attr_html}>{inner}</section>")


def footer(
    content: object = None,
    *,
    class_: object = None,
    **attrs: object,
) -> SafeHTML:
    """Page footer with centered content."""
    classes = _flatten_classes("ui-footer", class_)
    attr_html = _render_attrs(class_=classes, **attrs)
    inner = _render_fragment(content) if content is not None else ""
    return _safe(f"<footer{attr_html}>{inner}</footer>")


def columns(
    *children: object,
    centered: bool = False,
    vcentered: bool = False,
    gapless: bool = False,
    multiline: bool = True,
    class_: object = None,
    **attrs: object,
) -> SafeHTML:
    """Create a columns container for grid layouts."""
    classes = _flatten_classes(
        "ui-columns",
        centered and "is-centered",
        vcentered and "is-vcentered",
        gapless and "is-gapless",
        multiline and "is-multiline",
        class_,
    )
    attr_html = _render_attrs(class_=classes, **attrs)
    parts = [f"<div{attr_html}>"]
    for child in children:
        parts.append(_render_fragment(child))
    parts.append("</div>")
    return _safe("".join(parts))


def column(
    content: object = None,
    *,
    size: str | None = None,
    offset: str | None = None,
    narrow: bool = False,
    full: bool = False,
    class_: object = None,
    **attrs: object,
) -> SafeHTML:
    """Create a single column in a columns grid."""
    size_class = f"is-{size}" if size else None
    offset_class = f"is-offset-{offset}" if offset else None
    classes = _flatten_classes(
        "ui-column",
        size_class,
        offset_class,
        narrow and "is-narrow",
        full and "is-full",
        class_,
    )
    attr_html = _render_attrs(class_=classes, **attrs)
    inner = _render_fragment(content) if content is not None else ""
    return _safe(f"<div{attr_html}>{inner}</div>")


def level(
    left: object = None,
    right: object = None,
    *,
    centered: bool = False,
    class_: object = None,
    **attrs: object,
) -> SafeHTML:
    """Horizontal level layout with optional left and right sides."""
    classes = _flatten_classes("ui-level", centered and "is-centered", class_)
    attr_html = _render_attrs(class_=classes, **attrs)

    left_content = ""
    if left is not None:
        left_content = f'<div class="ui-level-left">{_render_fragment(left)}</div>'

    right_content = ""
    if right is not None:
        right_content = f'<div class="ui-level-right">{_render_fragment(right)}</div>'

    return _safe(
        f'<nav{attr_html} aria-label="main navigation">'
        f"{left_content}{right_content}"
        f"</nav>"
    )


def hero(
    title: object,
    *,
    subtitle: object | None = None,
    variant: str | None = None,
    size: str | None = None,
    class_: object = None,
    **attrs: object,
) -> SafeHTML:
    """Create a hero section with title and optional subtitle."""
    variant_class = f"is-{variant}" if variant else None
    size_class = f"is-{size}" if size else None
    hero_classes = _flatten_classes("ui-hero", variant_class, size_class, class_)
    hero_attr_html = _render_attrs(class_=hero_classes, **attrs)

    title_html = f'<p class="ui-title">{_render_fragment(title)}</p>'
    subtitle_html = (
        f'<p class="ui-subtitle">{_render_fragment(subtitle)}</p>' if subtitle else ""
    )

    return _safe(
        f"<section{hero_attr_html}>"
        f'<div class="ui-hero-body">'
        f"{title_html}"
        f"{subtitle_html}"
        f"</div>"
        f"</section>"
    )


def title(
    content: object,
    *,
    size: str | None = None,
    class_: object = None,
    **attrs: object,
) -> SafeHTML:
    """Typography title element."""
    size_class = f"is-{size}" if size else None
    classes = _flatten_classes("ui-title", size_class, class_)
    attr_html = _render_attrs(class_=classes, **attrs)
    return _safe(f"<p{attr_html}>{_render_fragment(content)}</p>")


def media(
    content: object = None,
    *,
    image: object = None,
    position: str = "start",
    class_: object = None,
    **attrs: object,
) -> SafeHTML:
    """Create a media object with image and content."""
    classes = _flatten_classes("ui-media", class_)
    attr_html = _render_attrs(class_=classes, **attrs)

    position_class = "ui-media-left" if position == "start" else "ui-media-right"
    image_html = (
        f'<div class="{position_class}">{_render_fragment(image)}</div>'
        if image
        else ""
    )

    return _safe(
        f"<div{attr_html}>"
        f"{image_html}"
        f'<div class="ui-media-content">{_render_fragment(content)}</div>'
        f"</div>"
    )


def tile(
    content: object = None,
    *,
    size: str | None = None,
    parent: bool = False,
    child: bool = False,
    ancestor: bool = False,
    class_: object = None,
    **attrs: object,
) -> SafeHTML:
    """Create a tile element for hierarchical layouts."""
    size_class = f"is-{size}" if size else None
    classes = _flatten_classes(
        "ui-tile",
        size_class,
        parent and "is-parent",
        child and "is-child",
        ancestor and "is-ancestor",
        class_,
    )
    attr_html = _render_attrs(class_=classes, **attrs)
    inner = _render_fragment(content) if content is not None else ""
    return _safe(f"<div{attr_html}>{inner}</div>")


# =============================================================================
# Additional UI Components (v2)
# =============================================================================


def navbar(
    brand: object = None,
    items: list[tuple[object, str]] | None = None,
    *,
    brand_url: str | None = "/",
    start: object = None,
    end: object = None,
    variant: str | None = None,
    class_: object = None,
    **attrs: object,
) -> SafeHTML:
    """Create a navbar with brand and optional nav items.

    Args:
        brand: Brand logo/title content
        items: List of (label, url) tuples for nav links
        brand_url: URL for the brand link; use None to render plain text
        start: Optional content rendered in the start slot
        end: Optional content rendered in the end slot
        variant: "primary", "dark" for color variants
    """
    classes = _flatten_classes("ui-navbar", variant and f"is-{variant}", class_)
    attr_html = _render_attrs(class_=classes, **attrs)

    def _render_navbar_slot(value: object) -> str:
        if isinstance(value, (list, tuple)):
            rendered: list[str] = []
            for item in value:
                if isinstance(item, (list, tuple)) and len(item) == 2:
                    label, href = item
                    rendered.append(
                        f'<a class="ui-navbar-item" href="{escape(str(href), quote=True)}">'
                        f"{_render_fragment(label)}</a>"
                    )
                else:
                    rendered.append(_render_fragment(item))
            return "".join(rendered)
        return _render_fragment(value)

    brand_html = ""
    if brand is not None:
        brand_markup = _render_fragment(brand)
        if brand_url is None:
            brand_html = f'<span class="ui-navbar-brand">{brand_markup}</span>'
        else:
            brand_html = (
                f'<a class="ui-navbar-brand" href="{escape(str(brand_url), quote=True)}">'
                f"{brand_markup}</a>"
            )

    menu_parts: list[str] = []
    if start is not None:
        menu_parts.append(
            f'<div class="ui-navbar-start">{_render_navbar_slot(start)}</div>'
        )

    if items:
        menu_parts.append(
            f'<div class="ui-navbar-start">{_render_navbar_slot(items)}</div>'
        )

    if end is not None:
        menu_parts.append(
            f'<div class="ui-navbar-end">{_render_navbar_slot(end)}</div>'
        )

    return _safe(
        f'<nav{attr_html} aria-label="main navigation">'
        f"{brand_html}{''.join(menu_parts)}"
        f"</nav>"
    )


def breadcrumb(
    items: list[tuple[object, str | None]],
    *,
    class_: object = None,
    **attrs: object,
) -> SafeHTML:
    """Create a breadcrumb navigation trail.

    Args:
        items: List of (label, url) tuples. url=None for current page.
    """
    classes = _flatten_classes("ui-breadcrumb", class_)
    if "aria_label" not in attrs and "aria-label" not in attrs:
        attrs["aria_label"] = "breadcrumb"
    attr_html = _render_attrs(class_=classes, **attrs)

    parts = [f"<nav{attr_html}>"]
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


def progress(
    value: int | float,
    *,
    max_value: int | float = 100,
    size: str | None = None,
    variant: str = "primary",
    show_label: bool = False,
    class_: object = None,
    **attrs: object,
) -> SafeHTML:
    """Create a progress bar.

    Args:
        value: Current progress value (0 to max_value)
        max_value: Maximum value (default 100)
        size: "small", "medium", or "large"
        variant: "primary", "info", "success", "warning", "danger"
        show_label: Include aria-label with percentage
    """
    percentage = min(100, max(0, (int(value) / int(max_value)) * 100))
    size_class = f"is-{size}" if size else None
    classes = _flatten_classes("ui-progress", size_class, class_)
    bar_classes = _flatten_classes("ui-progress__bar", f"is-{variant}")

    attr_html = _render_attrs(
        class_=classes,
        role="progressbar",
        aria_valuenow=str(int(value)),
        aria_valuemin="0",
        aria_valuemax=str(int(max_value)),
        aria_label=f"{percentage:.0f}% complete" if show_label else None,
        **attrs,
    )

    bar_attr_html = _render_attrs(
        class_=bar_classes,
        style=f"width: {percentage:.0f}%",
    )

    return _safe(f"<div{attr_html}><span{bar_attr_html}></span></div>")


def table(
    headers: list[str],
    rows: list[list[object]],
    *,
    striped: bool = False,
    hoverable: bool = False,
    bordered: bool = False,
    fullwidth: bool = False,
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
        fullwidth: Force the full-width compatibility modifier
    """
    classes = _flatten_classes(
        "ui-table",
        striped and "is-striped",
        hoverable and "is-hoverable",
        bordered and "is-bordered",
        fullwidth and "is-fullwidth",
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
        attrs_str = f'class="{cls}" href="{escape(url, quote=True)}"'
        return f"<a {attrs_str}>{label}</a>"

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
