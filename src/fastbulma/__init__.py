"""
FastBulma - Combining Bulma CSS utilities with FAST Web Components
"""

__version__ = "0.1.0"
__author__ = "FastBulma Team"
__license__ = "MIT"


def get_static_path():
    """Return the path to static assets."""
    import os

    return os.path.join(os.path.dirname(__file__), "static")


def get_css_path():
    """Return the path to CSS assets."""
    import os

    return os.path.join(get_static_path(), "css", "fastbulma.css")


def get_js_path():
    """Return the path to JS assets."""
    import os

    return os.path.join(get_static_path(), "js", "fastbulma.js")
