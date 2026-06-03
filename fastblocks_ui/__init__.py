"""FastBlocks UI package helpers and asset path utilities."""

from importlib.metadata import PackageNotFoundError
from importlib.metadata import version as _dist_version

try:
    __version__ = _dist_version("fastblocks-ui")
except PackageNotFoundError:  # running from a source checkout without an install
    __version__ = "0.0.0+dev"

__author__ = "FastBlocks UI Team"
__license__ = "BSD-3-Clause"

from .fastblocks import block, compose, fragment, stable_id
from .helpers import (
    SafeHTML,
    alert,
    breadcrumb,
    button,
    card,
    checkbox,
    column,
    columns,
    container,
    dialog,
    field,
    footer,
    hero,
    input,
    level,
    media,
    menu,
    navbar,
    pagination,
    progress,
    section,
    select,
    switch,
    table,
    tabs,
    tile,
    title,
    validation_summary,
)
from .manifest import (
    COMPONENT_MANIFEST,
    component_classes,
    component_manifest,
    component_names,
)

__all__ = [
    "SafeHTML",
    "COMPONENT_MANIFEST",
    "__author__",
    "__license__",
    "__version__",
    "alert",
    "block",
    "breadcrumb",
    "button",
    "card",
    "checkbox",
    "column",
    "columns",
    "compose",
    "component_classes",
    "component_manifest",
    "component_names",
    "container",
    "dialog",
    "field",
    "footer",
    "fragment",
    "get_css_path",
    "get_js_path",
    "get_manifest_path",
    "get_static_path",
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
    "stable_id",
    "switch",
    "table",
    "tabs",
    "tile",
    "title",
    "validation_summary",
]


def get_static_path():
    """Return the path to static assets."""
    import os

    return os.path.join(os.path.dirname(__file__), "static")


def get_css_path():
    """Return the path to CSS assets."""
    import os

    return os.path.join(get_static_path(), "css", "fastblocks-ui.css")


def get_js_path():
    """Return the path to JS assets."""
    import os

    return os.path.join(get_static_path(), "js", "fastblocks-ui.js")


def get_manifest_path():
    """Return the path to the bundled component manifest."""
    import os

    return os.path.join(os.path.dirname(__file__), "manifest.json")
