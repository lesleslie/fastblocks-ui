"""Build the shipped CSS bundle from the canonical source modules.

The module files under ``fastblocks_ui/static/css/`` are the single source of truth.
This builder concatenates them into a single self-contained ``fastblocks-ui.css`` so
consumers ship one file (no runtime ``@import`` chain, no module duplication).

An explicit ``@layer`` statement pins cascade-layer precedence independent of source
order: ``base`` (reset/defaults) lowest, then ``tokens``/``theme`` (custom-property
definitions only -- they never target the same selectors as ``base``/``components``, so
their position relative to those two is a no-op either way), then ``components``, then
``utilities`` highest -- standard ITCSS-style ordering so component rules can always
override base resets, and utilities can always override components.

Fixed 2026-07-26: the order used to be ``components, tokens, theme, base, utilities``,
which put ``base`` *above* ``components``. Cascade layers give layer order priority over
selector specificity, so ``base.css``'s generic ``a { color: inherit; }`` silently beat
every component's anchor ``color`` declaration (e.g. ``.ui-pagination__item.is-current``'s
white text-on-primary-background), regardless of how specific the component selector
was. That's why the "current page" pagination indicator rendered with the wrong text
color. Verified safe to reorder: ``tokens``/``theme`` only ever touch
``:root``/``[data-theme]``, and ``components.css``'s two ``:focus-visible`` rules either
target a different element (a sibling, via ``+``) or agree with ``base``'s reset on the
only overlapping property (``outline: none``), so moving ``components`` above ``base``
introduces no new conflicts.

Usage:
    python tools/build_css.py            # write the bundle
    python tools/build_css.py --check    # exit 1 if the committed bundle is stale

The ``--check`` mode is the drift gate: CI / pre-merge fails if a module changed but
the bundle was not rebuilt.
"""

from __future__ import annotations

import argparse
import re
import sys
from pathlib import Path

CSS_DIR = Path(__file__).resolve().parents[1] / "fastblocks_ui" / "static" / "css"
BUNDLE = CSS_DIR / "fastblocks-ui.css"

# Explicit cascade-layer order (low -> high priority). ITCSS-style: base resets lowest,
# then token/theme custom-property layers (selector-disjoint from the rest -- position
# among these three is a no-op), then components, then utilities highest so utility
# classes can always win.
LAYER_ORDER = ("base", "tokens", "theme", "components", "utilities")

# Concatenation order of source modules. Layer precedence is fixed by LAYER_ORDER
# above, so this order only affects intra-layer source order (and is kept stable).
MODULES = (
    "tokens.css",
    "theme.css",
    "base.css",
    "utilities.css",
    "components.css",
    "layout.css",
)

HEADER = (
    "/* GENERATED FILE - do not edit by hand.\n"
    " * Source: fastblocks_ui/static/css/{tokens,theme,base,utilities,components,"
    "layout}.css\n"
    " * Rebuild: python tools/build_css.py\n"
    " */\n"
)


def _auto_dark_block(theme_css: str) -> str:
    """Generate an OS-preference dark block from the single ``[data-theme="dark"]``
    source so the dark tokens are never duplicated by hand.

    Applies only to ``:root:not([data-theme])`` so an explicit ``data-theme`` (light
    or dark) always wins over the system setting.
    """
    match = re.search(r'\[data-theme="dark"\]\s*\{(.*?)\n {2}\}', theme_css, re.S)
    if not match:
        return ""
    body = match.group(1).strip("\n")
    return (
        "\n@layer theme {\n"
        "  /* GENERATED from [data-theme=\"dark\"]: OS dark-mode default. */\n"
        "  @media (prefers-color-scheme: dark) {\n"
        "    :root:not([data-theme]) {\n"
        f"{body}\n"
        "    }\n"
        "  }\n"
        "}\n"
    )


def render_bundle() -> str:
    layer_stmt = "@layer " + ", ".join(LAYER_ORDER) + ";\n"
    parts = [HEADER, "\n", layer_stmt]
    theme_css = ""
    for name in MODULES:
        module_text = (CSS_DIR / name).read_text(encoding="utf-8").strip("\n")
        if name == "theme.css":
            theme_css = module_text
        parts.append("\n")
        parts.append(module_text)
        parts.append("\n")
    parts.append(_auto_dark_block(theme_css))
    return "".join(parts)


def main() -> int:
    parser = argparse.ArgumentParser(description="Build the FastBlocks UI CSS bundle.")
    parser.add_argument(
        "--check",
        action="store_true",
        help="Exit non-zero if the committed bundle differs from a fresh build.",
    )
    args = parser.parse_args()

    rendered = render_bundle()

    if args.check:
        current = BUNDLE.read_text(encoding="utf-8") if BUNDLE.exists() else ""
        if current != rendered:
            print(
                "fastblocks-ui.css is out of date. Run: python tools/build_css.py",
                file=sys.stderr,
            )
            return 1
        print("fastblocks-ui.css is up to date.")
        return 0

    BUNDLE.write_text(rendered, encoding="utf-8")
    print(f"wrote {BUNDLE.relative_to(CSS_DIR.parents[2])}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
