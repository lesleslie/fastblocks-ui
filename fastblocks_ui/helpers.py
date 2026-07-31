"""HTML render helpers for the FastBlocks UI surface."""

from __future__ import annotations

import re
from hashlib import sha1, sha256
from html import escape
from typing import Literal, NamedTuple

# Public vocabulary hints. Unioned with ``str`` so custom CSS variants/sizes still
# type-check — the library is extensible by design (autocomplete, not enforcement).
Variant = Literal["primary", "info", "success", "warning", "danger"] | str
Size = Literal["small", "medium", "large"] | str
# Closed on purpose, unlike Variant/Size: HTML defines exactly h1-h6, so there
# is no caller-supplied value to leave room for.
HeadingLevel = Literal[1, 2, 3, 4, 5, 6]

__all__ = [
    "SafeHTML",
    "Size",
    "Variant",
    "alert",
    "breadcrumb",
    "burger",
    "button",
    "card",
    "checkbox",
    "column",
    "columns",
    "container",
    "dialog",
    "drawer",
    "field",
    "footer",
    "Option",
    "hero",
    "level",
    "media",
    "menu",
    "nav_groups",
    "nav_list",
    "navbar",
    "pagination",
    "progress",
    "section",
    "select",
    "shell",
    "switch",
    "table",
    "text_input",
    "tabs",
    "tile",
    "title",
    "validation_summary",
]


class Option(NamedTuple):
    """An explicit ``select()`` option.

    ``select()`` historically took bare ``(value, label)`` tuples while
    ``menu()``/``navbar()``/``breadcrumb()`` take ``(label, target)``. Swapping
    the bare form would have been a *silent* breaking change -- existing calls
    would keep working and just render label and value the wrong way round --
    so the ambiguity is resolved at the type level instead. Prefer this;
    bare 2-tuples keep their original ``(value, label)`` meaning indefinitely.
    """

    label: object
    value: object


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
        html = getattr(value, "__html__", None)
        return str(html() if callable(html) else value)
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


# An attribute *name* is interpolated into the tag unescaped -- escaping it
# would corrupt legitimate names -- so it must be validated instead. Without
# this, `**{"onclick=alert(1) data-x": "y"}` splices a live event handler into
# the opening tag, which is a real XSS vector wherever a caller forwards an
# attribute dict built from untrusted keys.
_ATTR_NAME_PATTERN = re.compile(r"^[A-Za-z_][A-Za-z0-9_.:-]*$")

# Schemes that execute rather than navigate. HTML-escaping does not neutralise
# these (there is nothing to escape in `javascript:alert(1)`), so they have to
# be rejected by scheme. Control characters are stripped first because browsers
# ignore them when resolving a scheme, making `java\tscript:` equivalent.
_DANGEROUS_URL_SCHEME = re.compile(r"^(javascript|vbscript|data):", re.IGNORECASE)
_URL_CONTROL_CHARS = re.compile(r"[\x00-\x20\x7f]")


def _safe_url(value: object) -> str:
    """Neutralise URLs whose scheme executes script.

    Returns ``"#"`` for a rejected URL rather than raising: a link is usually
    rendering user- or CMS-supplied data, where dropping the destination beats
    a 500 -- and beats shipping a script-executing link. Relative URLs,
    ``http(s):``, ``mailto:`` and ``tel:`` are unaffected.
    """
    text = str(value)
    if _DANGEROUS_URL_SCHEME.match(_URL_CONTROL_CHARS.sub("", text)):
        return "#"
    return text


def _normalise_attr_name(name: str) -> str:
    """Resolve a Python keyword spelling to the HTML attribute it renders as.

    Kept beside `_render_attrs`, which applies the identical transform at
    render time -- any caller that needs to reason about "did the caller
    already supply this attribute?" must use *this* rule rather than compare
    literal spellings, or the two will disagree.
    """
    return name.rstrip("_").replace("_", "-")


def _has_attr(attrs: dict[str, object], attr_name: str) -> bool:
    """Has the caller already supplied `attr_name`, under any spelling?

    `rstrip("_")` collapses *unbounded* trailing underscores, so `aria_label`,
    `aria_label_` and `aria_label__` all render as `aria-label`. Helpers that
    set a convenience argument (`label=`) only when the caller has not passed
    the attribute themselves used to compare two literal spellings, which
    missed the rest -- the helper then set its own value too and the opening
    tag carried the attribute twice. That is invalid HTML, and browsers keep
    the first, silently discarding whichever value the caller meant.
    """
    return any(_normalise_attr_name(key) == attr_name for key in attrs)


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

        attr_name = _normalise_attr_name(name)
        if not _ATTR_NAME_PATTERN.match(attr_name):
            msg = (
                f"invalid HTML attribute name {name!r}: attribute names are "
                "written into the tag verbatim, so only "
                "[A-Za-z_][A-Za-z0-9_.:-]* is accepted"
            )
            raise ValueError(msg)
        if value is True:
            if attr_name.startswith(("data-", "aria-")):
                rendered.append(f'{attr_name}="true"')
                continue
            rendered.append(attr_name)
            continue

        rendered.append(f'{attr_name}="{escape(str(value), quote=True)}"')

    return (" " + " ".join(rendered)) if rendered else ""


# A CSS length reaches the page inside a `style` attribute, where HTML escaping
# is not sufficient protection: `escape()` neutralises quotes but leaves `;`
# intact, so `16rem;background:url(//evil)` would splice a second declaration
# into the rule. Same reasoning as `_ATTR_NAME_PATTERN` and `_safe_url` -- the
# value is structural, so it is validated rather than escaped.
# `re.ASCII` is deliberate: bare `\d` also matches Unicode decimal digits, so
# `١٦rem` and `１６px` passed validation while being values no browser parses.
# Not exploitable -- nothing here can splice a declaration -- but the error
# message promises "a bare number", and those are not one.
_CSS_LENGTH_PATTERN = re.compile(
    r"^-?(?:\d+|\d*\.\d+)(?:px|rem|em|ch|ex|vw|vh|vmin|vmax|%|)$", re.ASCII
)


def _safe_css_length(value: object) -> str:
    text = str(value).strip()
    if not _CSS_LENGTH_PATTERN.match(text):
        msg = (
            f"invalid CSS length {value!r}: values are written into a `style` "
            "attribute verbatim, so only a bare number with an optional CSS "
            "unit is accepted"
        )
        raise ValueError(msg)
    return text


def _safe(markup: str) -> SafeHTML:
    return SafeHTML(markup)


def _inject_attrs(markup: object, **attrs: object) -> SafeHTML | str:
    """Inject attributes into the first opening tag of a simple HTML fragment.

    KNOWN-UNSAFE: this performs a regex match on the first ``<tag ...>`` and is only
    reliable for single-root fragments whose opening tag contains no ``>`` inside an
    attribute value. It does not parse HTML. It exists to back :func:`field`'s control
    wiring for the simple inputs this library emits; do not expand its use. The typed
    ``fastblocks-htmy`` component layer supersedes it for non-trivial composition.
    """

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
    # NB: SHA1 is intentional here. We use a 10-character hex prefix
    # purely as a *non-cryptographic* deterministic ID for fragment-stable
    # DOM ids; there is no adversarial model here and collisions in 10
    # chars are statistically irrelevant. Using SHA256/SHA3 would change
    # the external 10-char IDs and break tests that assert specific values.
    # nosemgrep: python.lang.security.insecure-hash-algorithms.insecure-hash-algorithm-sha1
    digest = sha1(candidate.encode("utf-8")).hexdigest()[:10] if candidate else "0"
    return f"{prefix}-{digest}"


def _format_number(value: float) -> str:
    """Render a number without a spurious trailing ``.0`` for integral values."""
    return str(int(value)) if value.is_integer() else str(value)


def button(
    label: object,
    *,
    variant: Variant | None = None,
    size: Size | None = None,
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
        href=_safe_url(href) if href is not None else None,
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

    # Derive an id when the caller gave neither `control_id` nor an `id` in the
    # control markup. Two defects came from not doing this: the help/error
    # elements fell back to the FIXED ids `ui-field-help`/`ui-field-error`, so
    # two fields on one page emitted duplicate DOM ids and both controls'
    # `aria-describedby` pointed at the first field's text; and the `<label>`
    # got no `for`, and since it does not wrap the control it labelled nothing
    # at all -- in the component whose whole job is labelling.
    #
    # The id hashes the field's own content, so it is stable across re-renders
    # (htmx swaps keep working) rather than a render counter. Only generated
    # when the control has an opening tag to receive it, so the label can never
    # point at an id that was never injected.
    if resolved_control_id is None and re.match(
        r"^\s*<[A-Za-z]", control_markup_source
    ):
        # sha256, not the sha1 used above: purely an opaque DOM id, but no
        # reason to add a new sha1 call site and trip security scanners.
        digest = sha256(
            f"{_render_fragment(label)}::{control_markup_source}".encode()
        ).hexdigest()[:10]
        resolved_control_id = f"ui-field-{digest}"

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
            for_=resolved_control_id or None,
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


def text_input(
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


# Backwards-compatible alias. `input` shadows the Python builtin, so it is
# deliberately NOT in `__all__` -- `from fastblocks_ui import *` no longer
# clobbers `input()`. Explicit `from fastblocks_ui import input` still works,
# and the manifest/CSS keep the HTML-native `input`/`ui-input` names.
input = text_input


def select(
    options: list[tuple[object, object]] | None = None,
    *,
    value: object | None = None,
    class_: object = None,
    **attrs: object,
) -> SafeHTML:
    option_html: list[str] = []
    for entry in options or []:
        # `Option` is itself a tuple, so check it before unpacking: an
        # `Option(label=..., value=...)` is field-addressed, while a bare
        # 2-tuple keeps its legacy `(value, label)` order.
        if isinstance(entry, Option):
            option_value, label = entry.value, entry.label
        else:
            option_value, label = entry
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
        # No `aria-checked`: it was rendered once server-side and nothing ever
        # updated it, so the first toggle desynchronised the exposed state --
        # measured in Chrome, a switch turned on still reported
        # `aria-checked="false"`. A native checkbox already exposes its checked
        # state correctly, ARIA-in-HTML says not to duplicate it, and the CSS
        # styles from `:checked`.
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
    variant: Variant | None = None,
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
                f'<li><a href="#{escape(field_name, quote=True)}">{_render_fragment(error_value)}</a></li>'
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
    # Link the visible title to the dialog. Previously the title rendered as a
    # bare `<h2>` with no id and nothing referenced it, so the dialog had no
    # accessible name at all -- screen readers announced an unnamed dialog.
    title_id = None
    if title is not None:
        title_id = (
            "ui-dialog-title-"
            + sha256(_render_fragment(title).encode("utf-8")).hexdigest()[:10]
        )
        attrs.setdefault("aria_labelledby", title_id)
        attr_html = _render_attrs(class_=classes, open=open or None, **attrs)

    parts = [f"<dialog{attr_html}>", '<div class="ui-dialog__surface">']
    if title is not None:
        parts.append(
            f'<h2 id="{escape(str(title_id), quote=True)}">'
            f"{_render_fragment(title)}</h2>"
        )
    parts.extend((_render_fragment(content), "</div></dialog>"))
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


# The tag is interpolated into the markup unescaped, so it is validated against
# an allowlist rather than sanitised -- same posture as `_ATTR_NAME_PATTERN`.
# These four are the elements a drawer legitimately is: a generic container, or
# one of the three sectioning elements that make sense as an off-canvas panel.
_DRAWER_TAGS = frozenset({"div", "nav", "aside", "section"})
_DRAWER_SIDES = frozenset({"start", "end"})


def drawer(
    content: object,
    *,
    id: str,
    label: str | None = None,
    side: str = "end",
    tag: str = "div",
    class_: object = None,
    **attrs: object,
) -> SafeHTML:
    """Render an off-canvas panel (`<div class="ui-drawer" popover>`).

    Built on the Popover API, so the browser supplies light-dismiss,
    Escape-to-close, top-layer rendering, implicit ``aria-expanded`` and
    ``aria-details`` on the invoker, placement in the tab order when shown, and
    focus return to the invoker on close. None of that needs JavaScript --
    pair it with any ``<button popovertarget="...">``.

    ``id`` is required because ``popovertarget`` needs a stable target. That is
    the same stable-ID contract htmx swapping depends on; do not generate it
    per-render.

    Above a breakpoint the same element can render as an ordinary in-flow
    column instead, by overriding the UA ``[popover]:not(:popover-open)``
    display rule. One DOM node, one id, both roles.
    """
    if side not in _DRAWER_SIDES:
        msg = f"drawer side must be one of {sorted(_DRAWER_SIDES)}, got {side!r}"
        raise ValueError(msg)
    if tag not in _DRAWER_TAGS:
        msg = f"drawer tag must be one of {sorted(_DRAWER_TAGS)}, got {tag!r}"
        raise ValueError(msg)

    classes = _flatten_classes(
        "ui-drawer", "is-start" if side == "start" else None, class_
    )
    # Match on the *normalised* attribute name rather than a literal
    # ("aria_label", "aria-label") pair: `_render_attrs` collapses trailing
    # underscores, so `aria_label_` also renders as `aria-label` and a literal
    # check would let it through -- emitting the attribute twice, which is
    # invalid HTML (browsers keep the first). Same trap as `shell()`'s `style`
    # merge. An explicit attribute wins over the `label` convenience argument.
    if label is not None and not _has_attr(attrs, "aria-label"):
        attrs["aria_label"] = label

    attr_html = _render_attrs(class_=classes, id=id, popover=True, **attrs)
    return _safe(f"<{tag}{attr_html}>{_render_fragment(content)}</{tag}>")


def burger(
    *,
    controls: str,
    label: object = "Menu",
    class_: object = None,
    **attrs: object,
) -> SafeHTML:
    """Render a burger button that toggles a `drawer()` (`.ui-burger`).

    ``controls`` is the drawer's id and becomes ``popovertarget``. No
    JavaScript is involved: the browser toggles the popover, and the invoker
    relationship gives this button an implicit *expanded* state in the
    accessibility tree, so screen readers are told whether the drawer is open.

    That state is **not** a DOM attribute, though -- implicit ARIA never is.
    Measured in Chrome 150 with the popover open, ``getAttribute
    ("aria-expanded")`` returns ``None``. So the visual bars-to-cross morph
    cannot select on it; components.css reaches the open state through the
    drawer's own ``:popover-open`` via ``:has()`` instead.

    The accessible name is a visually-hidden `<span>`, not ``aria-label``, so
    the control keeps a name if the stylesheet fails to load.
    """
    classes = _flatten_classes("ui-burger", class_)
    attr_html = _render_attrs(
        class_=classes, type="button", popovertarget=controls, **attrs
    )
    bars = '<span class="ui-burger__bar" aria-hidden="true"></span>' * 3
    return _safe(
        f"<button{attr_html}>{bars}"
        f'<span class="ui-burger__label">{_render_fragment(label)}</span>'
        f"</button>"
    )


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
    # Render the label through `_render_attrs` instead of appending it to the
    # f-string below: appending produced a SECOND `aria-label` whenever a
    # caller passed one, which is invalid HTML and silently ignored `label=`
    # (browsers keep the first occurrence). Mirrors `breadcrumb()`'s guard.
    if not _has_attr(attrs, "aria-label"):
        attrs["aria_label"] = label
    attr_html = _render_attrs(class_=classes, data_ui_tabs=True, **attrs)
    tab_buttons: list[str] = []
    panels: list[str] = []

    # Fall back to the first tab when `active_id` matches nothing. Previously
    # an `active_id` matching no item (a stale query param, a renamed tab) left
    # every tab `aria-selected="false"` with `tabindex="-1"` and every panel
    # hidden: no content visible and no tab reachable by keyboard.
    resolved_active_id = (
        active_id if any(tab_id == active_id for tab_id, _, _ in items) else None
    )

    for tab_id, tab_label, panel_html in items:
        tab_dom_id = _normalize_dom_id(tab_id, prefix="ui-tab")
        panel_dom_id = f"{tab_dom_id}-panel"
        is_active = tab_id == resolved_active_id or (
            resolved_active_id is None and not tab_buttons
        )
        tab_buttons.append(
            f'<button class="ui-tabs__tab" type="button" role="tab" id="{escape(tab_dom_id, quote=True)}" data-ui-tab-target="#{escape(panel_dom_id, quote=True)}" aria-controls="{escape(panel_dom_id, quote=True)}" aria-selected="{str(is_active).lower()}" tabindex="{0 if is_active else -1}">{_render_fragment(tab_label)}</button>'
        )
        panels.append(
            f'<section id="{escape(panel_dom_id, quote=True)}" class="ui-tabs__panel" data-ui-panel role="tabpanel" aria-labelledby="{escape(tab_dom_id, quote=True)}" aria-hidden="{str(not is_active).lower()}"{" hidden" if not is_active else ""}>{_render_fragment(panel_html)}</section>'
        )

    outer_tag = "ui-tabs" if custom_element else "div"
    return _safe(
        f"<{outer_tag}{attr_html}>"
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
    """Render a dropdown menu (`<nav class="ui-menu">`).

    `.ui-menu` is `position: absolute` (components.css) so opening it
    overlays the page instead of pushing following content downward. That
    means the element wrapping this helper's output *and* its trigger button
    together needs `position: relative` (or any other positioned value) so
    the menu anchors to that local wrapper -- otherwise it walks up to
    whatever positioned ancestor happens to exist further up the page. See
    `demo/demo.html`'s `.demo-panel` wrapper for a minimal example.
    """
    classes = _flatten_classes("ui-menu", class_)
    # See tabs() above -- appending the label duplicated `aria-label`.
    if not _has_attr(attrs, "aria-label"):
        attrs["aria_label"] = label
    attr_html = _render_attrs(class_=classes, data_ui_menu=True, **attrs)
    links = [
        f'<a class="ui-menu__item" href="{escape(_safe_url(href), quote=True)}">{_render_fragment(text)}</a>'
        for text, href in (items or [])
    ]
    menu_markup = f"<nav{attr_html}>{''.join(links)}</nav>"
    if custom_element:
        host_attr_html = _render_attrs(
            class_=classes,
            data_ui_menu=True,
            data_ui_state="closed",
            aria_label=attrs.get("aria_label", attrs.get("aria-label", label)),
        )
        return _safe(f"<ui-menu{host_attr_html}>{menu_markup}</ui-menu>")
    return _safe(menu_markup)


# The enumerated `aria-current` tokens. ARIA treats any unlisted non-null value
# as `true` rather than rejecting it, so a typo would silently degrade to the
# generic token instead of failing -- validate here so it fails loudly.
_ARIA_CURRENT_TOKENS = frozenset({"page", "step", "location", "date", "time", "true"})


def nav_list(
    items: list[tuple[object, str]],
    *,
    active: str | None = None,
    aria_current: str = "true",
    class_: object = None,
    **attrs: object,
) -> SafeHTML:
    """Render a vertical navigation list (`<ul class="ui-nav-list">`).

    This is the in-flow sidebar list, not the dropdown: `menu()` renders
    `.ui-menu`, which is `position: absolute` and overlays the page. The two
    are unrelated despite both being navigation.

    Args:
        items: List of (label, href) tuples.
        active: Href of the current item, marked with `is-active`. Matched
            against each item's raw href, *before* URL sanitisation, so a
            caller comparing against a value they supplied gets the match they
            expect.
        aria_current: The `aria-current` token for the active item. Defaults
            to `"true"`, which is the only value that is honest no matter what
            the hrefs point at -- `breadcrumb()` and `pagination()` hardcode
            `"page"` because they *are* page navigation, but this component is
            generic and cannot know. Pass `"page"` for cross-page site nav, or
            `"location"` for an in-page table of contents whose links only
            move the viewport; announcing "current page" for a link that never
            leaves the page is worse than the generic token.

    No `<nav>` landmark is emitted: the list is meant to be placed inside one
    the caller already owns (a drawer, an aside), and nesting landmarks here
    would produce a second, unnamed navigation region.
    """
    if aria_current not in _ARIA_CURRENT_TOKENS:
        msg = (
            f"invalid aria-current token {aria_current!r}: expected one of "
            f"{sorted(_ARIA_CURRENT_TOKENS)}"
        )
        raise ValueError(msg)

    classes = _flatten_classes("ui-nav-list", class_)
    attr_html = _render_attrs(class_=classes, **attrs)

    rendered: list[str] = []
    for label, href in items:
        is_active = active is not None and href == active
        link_classes = _flatten_classes("ui-nav-list__link", is_active and "is-active")
        # `aria-current` alongside the class: `is-active` is a purely visual
        # cue, so without this assistive technology cannot tell which item is
        # current (WCAG 4.1.2). Same reasoning as `pagination()` and
        # `breadcrumb()`; the token is a parameter here because those two know
        # they navigate pages and this one does not.
        current_attr = f' aria-current="{aria_current}"' if is_active else ""
        rendered.append(
            f'<li class="ui-nav-list__item">'
            f'<a class="{link_classes}" href="{escape(_safe_url(href), quote=True)}"'
            f"{current_attr}>"
            f"{_render_fragment(label)}</a></li>"
        )

    return _safe(f"<ul{attr_html}>{''.join(rendered)}</ul>")


def nav_groups(
    groups: list[tuple[object, list[tuple[object, str]]]],
    *,
    active: str | None = None,
    aria_current: str = "true",
    class_: object = None,
    **attrs: object,
) -> SafeHTML:
    """Render labelled groups of navigation links.

    Args:
        groups: List of (label, items) tuples, where `items` is a `nav_list()`
            item list.
        active: Forwarded to every group's `nav_list()`.
        aria_current: Forwarded to every group's `nav_list()`. See there for
            why the default is the generic `"true"` rather than `"page"`.

    `class_` and `**attrs` land on one outer `<div class="ui-nav-groups">`
    rather than on each group: applying them per group would emit N elements
    sharing whatever `id` the caller passed, which is invalid HTML and breaks
    `document.getElementById`.

    The label is a `<p>`, not a heading: these are section dividers inside a
    navigation landmark, and emitting headings here would inject entries into
    the document outline that do not correspond to page sections. Same
    reasoning as `_heading_tag`'s `<p>` default.
    """
    classes = _flatten_classes("ui-nav-groups", class_)
    attr_html = _render_attrs(class_=classes, **attrs)

    rendered = [
        f'<div class="ui-nav-group">'
        f'<p class="ui-nav-group__label">{_render_fragment(label)}</p>'
        f"{nav_list(items, active=active, aria_current=aria_current)}"
        f"</div>"
        for label, items in groups
    ]

    return _safe(f"<div{attr_html}>{''.join(rendered)}</div>")


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


def shell(
    main: object,
    aside: object = None,
    *,
    aside_width: str | None = None,
    max_width: str | None = None,
    main_id: str | None = None,
    class_: object = None,
    **attrs: object,
) -> SafeHTML:
    """Create the full-bleed page shell (`<div class="ui-shell">`).

    Renders ``main`` inside ``<main class="ui-shell-main">`` and places
    ``aside`` after it. The aside is rendered *after* main deliberately: it is
    the right-hand column in LTR, so DOM order matches visual order and WCAG
    1.3.2/2.4.3 hold without grid reordering. Pair it with a skip link so
    keyboard users are not forced through the whole main column to reach it.

    ``aside_width`` and ``max_width`` are emitted as the ``--ui-shell-aside-width``
    and ``--ui-shell-max`` custom properties. Both are validated as CSS lengths
    -- see ``_safe_css_length``.
    """
    classes = _flatten_classes("ui-shell", class_)

    declarations: list[str] = []
    if aside_width is not None:
        declarations.append(f"--ui-shell-aside-width:{_safe_css_length(aside_width)}")
    if max_width is not None:
        declarations.append(f"--ui-shell-max:{_safe_css_length(max_width)}")
    if declarations:
        # Pop every spelling that normalises to `style`, not a fixed pair:
        # `_render_attrs` uses `rstrip("_")`, which collapses *unbounded*
        # trailing underscores, so a literal ("style", "style_") tuple still
        # let `style__` through and emitted `style` twice -- invalid HTML, and
        # browsers keep the first, silently dropping the validated custom
        # properties above. Mirrors `class_`/`class` handling in
        # `_render_attrs`.
        existing = [
            str(value)
            for key in [k for k in attrs if k.rstrip("_") == "style"]
            if (value := attrs.pop(key, None))
        ]
        attrs["style"] = ";".join([*declarations, *existing])

    attr_html = _render_attrs(class_=classes, **attrs)
    main_attr_html = _render_attrs(class_="ui-shell-main", id=main_id)
    aside_html = _render_fragment(aside) if aside is not None else ""

    return SafeHTML(
        f"<div{attr_html}>"
        f"<main{main_attr_html}>{_render_fragment(main)}</main>"
        f"{aside_html}"
        f"</div>"
    )


def section(
    content: object = None,
    *,
    size: Size | None = None,
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

    # A `<div>`, not a `<nav aria-label="main navigation">`. `level` is a
    # layout primitive (the manifest calls it "horizontal layout with left and
    # right sides"), but it emitted the exact landmark name `navbar()` uses --
    # and level is the standard toolbar/header row, so any page with both
    # exposed two navigation landmarks with an identical accessible name.
    # That is ambiguous for landmark navigation and is what axe's
    # `landmark-unique` rule flags. Callers who genuinely want navigation
    # semantics can pass `role="navigation"` and their own `aria_label`.
    return _safe(f"<div{attr_html}>{left_content}{right_content}</div>")


def _heading_tag(level: HeadingLevel | None) -> str:
    """Resolve an optional heading level to the tag `.ui-title` renders as.

    Returns ``p`` when no level is given. That default is deliberate: a hero
    or title is a *typographic* element, and a page may legitimately contain
    several (this library's own demo renders nine heroes). Emitting a heading
    unconditionally would manufacture a broken outline -- nine ``<h1>``s --
    which is a worse accessibility defect than the one it fixes. Callers opt
    in per instance, where they alone know the surrounding document
    structure.
    """
    if level is None:
        return "p"
    # `isinstance(level, bool)` first: `True == 1` and `True in (1, ..., 6)`
    # are both true in Python, so a bare membership test accepted `True` and
    # emitted the invalid tag `<hTrue>`.
    if isinstance(level, bool) or level not in (1, 2, 3, 4, 5, 6):
        msg = f"heading level must be an int 1-6, got {level!r}"
        raise ValueError(msg)
    return f"h{level}"


def hero(
    title: object,
    *,
    subtitle: object | None = None,
    variant: Variant | None = None,
    size: Size | None = None,
    heading_level: HeadingLevel | None = None,
    class_: object = None,
    **attrs: object,
) -> SafeHTML:
    """Create a hero section with title and optional subtitle.

    Args:
        heading_level: Render the title as ``<h1>``..``<h6>`` instead of the
            default ``<p>``. Set this on the hero that acts as the page's
            banner so its title joins the heading outline -- assistive
            technology navigates by headings, and a page whose most prominent
            text is a ``<p>`` is invisible to that. Leave unset for decorative
            or repeated heroes.
    """
    variant_class = f"is-{variant}" if variant else None
    size_class = f"is-{size}" if size else None
    hero_classes = _flatten_classes("ui-hero", variant_class, size_class, class_)
    hero_attr_html = _render_attrs(class_=hero_classes, **attrs)

    tag = _heading_tag(heading_level)
    title_html = f'<{tag} class="ui-title">{_render_fragment(title)}</{tag}>'
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
    size: Size | None = None,
    heading_level: HeadingLevel | None = None,
    class_: object = None,
    **attrs: object,
) -> SafeHTML:
    """Typography title element.

    Args:
        size: Visual size, 1 (largest) to 6. Purely typographic.
        heading_level: Render as ``<h1>``..``<h6>`` instead of the default
            ``<p>``. Kept independent of ``size`` on purpose -- visual weight
            and document structure are separate concerns, and conflating them
            is how heading outlines end up chosen by how big the text should
            look. A small ``is-6`` title can still be an ``<h2>``.
    """
    size_class = f"is-{size}" if size else None
    classes = _flatten_classes("ui-title", size_class, class_)
    attr_html = _render_attrs(class_=classes, **attrs)
    tag = _heading_tag(heading_level)
    return _safe(f"<{tag}{attr_html}>{_render_fragment(content)}</{tag}>")


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
    variant: Variant | None = None,
    label: str = "main navigation",
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
        label: Accessible name for the navigation landmark. Override it when
            a page renders more than one navbar, so the landmarks stay
            distinguishable.
    """
    classes = _flatten_classes("ui-navbar", variant and f"is-{variant}", class_)
    # The landmark name is caller-overridable and rendered through
    # `_render_attrs`, not hardcoded into the f-string below. It was fixed at
    # "main navigation" with no way to change it, so a page with two navbars
    # (a primary bar and a utility bar, say) exposed two navigation landmarks
    # with an identical accessible name -- ambiguous for landmark navigation
    # and flagged by axe's `landmark-unique`.
    if not _has_attr(attrs, "aria-label"):
        attrs["aria_label"] = label
    attr_html = _render_attrs(class_=classes, **attrs)

    def _render_navbar_slot(value: object) -> str:
        if isinstance(value, (list, tuple)):
            rendered: list[str] = []
            for item in value:
                if isinstance(item, (list, tuple)) and len(item) == 2:
                    label, href = item
                    rendered.append(
                        f'<a class="ui-navbar-item" href="{escape(_safe_url(href), quote=True)}">'
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
                f'<a class="ui-navbar-brand" href="{escape(_safe_url(brand_url), quote=True)}">'
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

    return _safe(f"<nav{attr_html}>{brand_html}{''.join(menu_parts)}</nav>")


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
    if not _has_attr(attrs, "aria-label"):
        attrs["aria_label"] = "breadcrumb"
    attr_html = _render_attrs(class_=classes, **attrs)

    parts = [f"<nav{attr_html}>"]
    for label, url in items:
        if url:
            parts.append(
                f'<span class="ui-breadcrumb__item">'
                f'<a class="ui-breadcrumb__link" href="{escape(_safe_url(url), quote=True)}">'
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
    size: Size | None = None,
    variant: Variant = "primary",
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

    Renders a native ``<progress>`` element: it carries an implicit
    ``role="progressbar"`` with ``valuenow``/``valuemax`` derived from
    ``value``/``max``, and needs no inline ``style`` (safe under a strict
    ``style-src`` CSP).
    """
    value_f = float(value)
    max_f = float(max_value)
    ratio = (value_f / max_f) if max_f else 0.0
    percentage = min(100.0, max(0.0, ratio * 100.0))
    classes = _flatten_classes(
        "ui-progress",
        f"is-{size}" if size else None,
        variant and f"is-{variant}",
        class_,
    )

    attr_html = _render_attrs(
        class_=classes,
        value=_format_number(value_f),
        max=_format_number(max_f),
        aria_label=f"{percentage:.0f}% complete" if show_label else None,
        **attrs,
    )

    return _safe(f"<progress{attr_html}>{percentage:.0f}%</progress>")


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

    # `tabindex="0"` on the scroll container, not decoration. `layout.css` gives
    # it `overflow-x: auto`, and a table wide enough to overflow has no focusable
    # descendant of its own -- so without this a keyboard user cannot scroll to
    # the columns beyond the fold at all. Measured with axe on this library's own
    # demo at 375px: `scrollable-region-focusable`, one node per wide table.
    #
    # `role="region"` + a name is the fuller treatment, but a region needs an
    # accessible name to be useful and `table()` has no caption argument to
    # derive one from; `tabindex` alone makes the content reachable, which is
    # the part that is currently broken.
    return _safe(
        f'<div class="ui-table-container" tabindex="0">'
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

    def page_link(page: int, label: str | int | None = None) -> str:
        link_label = page if label is None else label
        # Use a literal substitution rather than str.format() so a caller-supplied
        # url_pattern cannot trigger format-string injection (e.g. "{page.__class__}")
        # or crash on unrelated braces (e.g. "/items/{category}?page={page}").
        url = _safe_url(url_pattern.replace("{page}", str(page)))
        is_current = page == current
        cls = "ui-pagination__item" + (" is-current" if is_current else "")
        # `aria-current="page"` alongside the class: the class is a purely
        # visual cue, so without this assistive technology cannot tell which
        # page is active (WCAG 4.1.2).
        current_attr = ' aria-current="page"' if is_current else ""
        attrs_str = f'class="{cls}" href="{escape(url, quote=True)}"{current_attr}'
        return f"<a {attrs_str}>{_render_fragment(link_label)}</a>"

    def ellipsis() -> str:
        return '<span class="ui-pagination__ellipsis">…</span>'

    # Window of page numbers around the current page (a pure list[int]); ellipses are
    # rendered at the boundaries rather than stored as sentinel strings in the list.
    window = list(range(max(1, current - siblings), min(total, current + siblings) + 1))

    parts = [f"<nav{attr_html}>"]

    # Previous link
    if current > 1:
        parts.append(page_link(current - 1, "‹"))
    else:
        parts.append('<span class="ui-pagination__item is-disabled">‹</span>')

    # Leading first page + ellipsis
    if window and window[0] > 1:
        parts.append(page_link(1))
        if window[0] > 2:
            parts.append(ellipsis())

    # Page window
    for page in window:
        parts.append(page_link(page))

    # Trailing ellipsis + last page
    if window and window[-1] < total:
        if window[-1] < total - 1:
            parts.append(ellipsis())
        parts.append(page_link(total))

    # Next link
    if current < total:
        parts.append(page_link(current + 1, "›"))
    else:
        parts.append('<span class="ui-pagination__item is-disabled">›</span>')

    parts.append("</nav>")
    return _safe("".join(parts))
