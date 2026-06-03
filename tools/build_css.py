"""Build the shipped CSS bundle from the canonical source modules.

The module files under ``fastblocks_ui/static/css/`` are the single source of truth.
This builder concatenates them into a single self-contained ``fastblocks-ui.css`` so
consumers ship one file (no runtime ``@import`` chain, no module duplication).

An explicit ``@layer`` statement pins cascade-layer precedence independent of source
order. The order below preserves the historical effective order (``components`` is the
lowest-priority layer, ``utilities`` the highest) so regenerating causes no visual
regression. It is now intentional rather than an accident of import order.

Usage:
    python tools/build_css.py            # write the bundle
    python tools/build_css.py --check    # exit 1 if the committed bundle is stale

The ``--check`` mode is the drift gate: CI / pre-merge fails if a module changed but
the bundle was not rebuilt.
"""

from __future__ import annotations

import argparse
import sys
from pathlib import Path

CSS_DIR = Path(__file__).resolve().parents[1] / "fastblocks_ui" / "static" / "css"
BUNDLE = CSS_DIR / "fastblocks-ui.css"

# Explicit cascade-layer order (low -> high priority). Preserves historical behavior.
LAYER_ORDER = ("components", "tokens", "theme", "base", "utilities")

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


def render_bundle() -> str:
    layer_stmt = "@layer " + ", ".join(LAYER_ORDER) + ";\n"
    parts = [HEADER, "\n", layer_stmt]
    for name in MODULES:
        module_text = (CSS_DIR / name).read_text(encoding="utf-8").strip("\n")
        parts.append("\n")
        parts.append(module_text)
        parts.append("\n")
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
