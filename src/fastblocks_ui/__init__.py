"""FastBlocks UI package helpers and asset path utilities."""

__version__ = "0.3.0"
__author__ = "FastBlocks UI Team"
__license__ = "BSD-3-Clause"

from .fastblocks import block, compose, fragment, stable_id
from .helpers import (
    SafeHTML,
    alert,
    button,
    card,
    checkbox,
    dialog,
    field,
    input,
    menu,
    select,
    switch,
    tabs,
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
    "button",
    "card",
    "checkbox",
    "dialog",
    "field",
    "get_css_path",
    "get_js_path",
    "get_manifest_path",
    "get_static_path",
    "block",
    "compose",
    "fragment",
    "component_classes",
    "component_manifest",
    "component_names",
    "input",
    "menu",
    "select",
    "stable_id",
    "validation_summary",
    "switch",
    "tabs",
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
