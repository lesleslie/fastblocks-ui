"""HTML render helpers for the FastBlocks UI surface."""

from __future__ import annotations

import re
from hashlib import sha1
from html import escape

__all__ = [
    "SafeHTML",
    "alert",
    "button",
    "card",
    "checkbox",
    "dialog",
    "field",
    "input",
    "menu",
    "select",
    "validation_summary",
    "switch",
    "tabs",
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

    opening_tag, tag_name, existing_attrs = match.group(0), match.group(1), match.group(2)
    attr_html = _render_attrs(**attrs)
    if not attr_html:
        return SafeHTML(rendered_markup) if _is_safe_html(markup) else rendered_markup

    return _safe(rendered_markup.replace(opening_tag, f"<{tag_name}{existing_attrs}{attr_html}>", 1))


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
        parts.append(f'<header class="ui-card__header">{_render_fragment(header)}</header>')
    if body is not None:
        parts.append(f'<div class="ui-card__body">{_render_fragment(body)}</div>')
    if footer is not None:
        parts.append(f'<footer class="ui-card__footer">{_render_fragment(footer)}</footer>')

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
        describedby_ids.append(f"{resolved_control_id}-help" if resolved_control_id else "ui-field-help")
    if error_text is not None:
        describedby_ids.append(f"{resolved_control_id}-error" if resolved_control_id else "ui-field-error")

    if label is not None:
        label_attrs = _render_attrs(class_="ui-field__label", for_=resolved_control_id if resolved_control_id else None)
        parts.append(f'<label{label_attrs}>{_render_fragment(label)}</label>')

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
        help_id = f"{resolved_control_id}-help" if resolved_control_id else "ui-field-help"
        parts.append(f'<div class="ui-field__help" id="{escape(help_id, quote=True)}">{_render_fragment(help_text)}</div>')
    if error_text is not None:
        error_id = f"{resolved_control_id}-error" if resolved_control_id else "ui-field-error"
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
        selected = " selected" if value is not None and str(option_value) == str(value) else ""
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
        f'<input{attr_html}>'
        f'<span>{_render_fragment(label)}</span>'
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
        f'<input{input_attrs}>'
        f'<span class="ui-switch__track" aria-hidden="true"><span class="ui-switch__thumb"></span></span>'
        f'<span>{_render_fragment(label)}</span>'
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
    return _safe("".join(parts))


def tabs(
    items: list[tuple[str, str, object]],
    *,
    active_id: str | None = None,
    label: str = "Tabs",
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

    return _safe(
        f'<div{attr_html} aria-label="{escape(label, quote=True)}">'
        f'<div class="ui-tabs__list" role="tablist">{"".join(tab_buttons)}</div>'
        f'{"".join(panels)}'
        f"</div>"
    )


def menu(
    items: list[tuple[object, object]] | None = None,
    *,
    label: str = "Menu",
    class_: object = None,
    **attrs: object,
) -> SafeHTML:
    classes = _flatten_classes("ui-menu", class_)
    attr_html = _render_attrs(class_=classes, data_ui_menu=True, **attrs)
    links = [
        f'<a class="ui-menu__item" href="{escape(str(href), quote=True)}">{_render_fragment(text)}</a>'
        for text, href in (items or [])
    ]
    return _safe(f'<nav{attr_html} aria-label="{escape(label, quote=True)}">{"".join(links)}</nav>')
