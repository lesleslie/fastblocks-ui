"""Generic fragment/id helpers for htmx-style server-rendered swaps.

NOT a FastBlocks framework adapter. These are plain, framework-agnostic
helpers (stable DOM ids, fragment/block wrapper markup) usable from any
Jinja-based stack. They do not register template globals, mount static
assets, or otherwise wire into an actual FastBlocks application.

For typed components, template-global registration, and asset mounting
inside a real FastBlocks app (ACB ``[[ ]]`` delimiters), see the sibling
package ``fastblocks-htmy``, which is the FastBlocks-native integration
layer built on top of this package.
"""

from __future__ import annotations

from hashlib import sha1

from .helpers import SafeHTML, _flatten_classes, _render_attrs, _render_fragment

__all__ = ["block", "compose", "fragment", "stable_id"]


def compose(*parts: object, separator: str = "") -> SafeHTML:
    """Join HTML-safe fragments without double-escaping them."""
    return SafeHTML(separator.join(_render_fragment(part) for part in parts))


def stable_id(*parts: object, prefix: str = "fb") -> str:
    """Build a deterministic DOM id for swapped fragments and nested blocks."""
    normalized = "::".join(
        str(part).strip().lower() for part in parts if part is not None
    )
    digest = sha1(normalized.encode("utf-8")).hexdigest()[:10]
    return f"{prefix}-{digest}" if prefix else digest


def fragment(
    content: object,
    *,
    tag: str = "div",
    fragment_id: str | None = None,
    class_: object = None,
    **attrs: object,
) -> SafeHTML:
    """Wrap content in a FastBlocks-friendly fragment container."""
    classes = _flatten_classes("ui-fragment", class_)
    attr_html = _render_attrs(
        class_=classes,
        id=fragment_id,
        data_fastblocks_fragment=True,
        **attrs,
    )
    return SafeHTML(f"<{tag}{attr_html}>{_render_fragment(content)}</{tag}>")


def block(
    content: object,
    *,
    tag: str = "section",
    block_id: str | None = None,
    class_: object = None,
    **attrs: object,
) -> SafeHTML:
    """Wrap content in a FastBlocks block container."""
    classes = _flatten_classes("ui-block", class_)
    attr_html = _render_attrs(
        class_=classes,
        id=block_id,
        data_fastblocks_block=True,
        **attrs,
    )
    return SafeHTML(f"<{tag}{attr_html}>{_render_fragment(content)}</{tag}>")
