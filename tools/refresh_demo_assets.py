"""Refresh the copies of shipped assets that ``demo/demo.html`` inlines.

``demo/demo.html`` is hand-written but fully self-contained: it embeds verbatim
copies of the CSS bundle, ``enhance.js``, ``manifest.js`` and ``manifest.json``
so the file opens correctly straight off disk. Three drift gates enforce that
those copies stay byte-identical to the shipped originals
(``TestInlinedBundleFreshness``, ``TestInlinedJsFreshness``,
``TestEmbeddedManifestFreshness``), so every change to a source module means
re-inlining here.

Two hazards this script exists to avoid, both learned the hard way:

1. **Do not anchor on markup patterns.** ``manifest.js``'s own source contains
   the literal string ``<script type="application/json"
   id="fastblocks-ui-manifest-data">`` -- it is how the module documents the
   element it reads. A regex anchored on that markup matches *inside the inlined
   copy of manifest.js first* and silently overwrites JavaScript with JSON.
   Anchoring on the previously-committed file body instead cannot collide.

2. **The manifest element is the FIRST of three occurrences of its id.** The
   other two are inside the inlined ``manifest.js`` (a comment and a
   ``getElementById`` call), so ``rfind`` picks the wrong one.

Ordering also matters: run this BEFORE renaming hand-written markup, while
demo.html still holds the committed copies that the content anchors match.

Usage:
    python tools/refresh_demo_assets.py
    python tools/refresh_demo_assets.py --check    # exit 1 if a refresh is due
"""

from __future__ import annotations

import argparse
import json
import subprocess
import sys
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parents[1]
DEMO = REPO_ROOT / "demo" / "demo.html"

# Files inlined verbatim. Order is irrelevant; each is located by its own body.
INLINED = (
    "fastblocks_ui/static/css/fastblocks-ui.css",
    "fastblocks_ui/static/js/enhance.js",
    "fastblocks_ui/static/js/manifest.js",
)

MANIFEST_OPEN = '<script type="application/json" id="fastblocks-ui-manifest-data">'


def _committed(path: str) -> str:
    """The version of ``path`` at HEAD, or "" when it is not committed yet."""
    result = subprocess.run(
        ["git", "show", f"HEAD:{path}"],
        capture_output=True,
        text=True,
        cwd=REPO_ROOT,
    )
    return result.stdout if result.returncode == 0 else ""


def _swap_inlined(html: str, path: str) -> tuple[str, bool]:
    current = (REPO_ROOT / path).read_text(encoding="utf-8")
    if current in html or current.strip() in html:
        return html, False  # already fresh
    old = _committed(path)
    for stale, fresh in ((old, current), (old.strip(), current.strip())):
        if stale and stale in html:
            return html.replace(stale, fresh, 1), True
    raise SystemExit(
        f"could not locate the inlined copy of {path} in demo/demo.html. "
        "It may have been refreshed against a different base -- re-inline by hand."
    )


def _swap_manifest(html: str) -> tuple[str, bool]:
    payload = json.dumps(
        json.loads((REPO_ROOT / "fastblocks_ui" / "manifest.json").read_text(encoding="utf-8")),
        separators=(", ", ": "),
    )
    start = html.find(MANIFEST_OPEN)
    if start < 0:
        raise SystemExit("demo/demo.html no longer embeds the manifest script element")
    body_start = start + len(MANIFEST_OPEN)
    end = html.index("</script>", body_start)
    if html[body_start:end] == payload:
        return html, False
    return html[:body_start] + payload + html[end:], True


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    parser.add_argument(
        "--check",
        action="store_true",
        help="Exit non-zero if demo/demo.html needs refreshing, without writing.",
    )
    args = parser.parse_args()

    html = DEMO.read_text(encoding="utf-8")
    changed: list[str] = []

    for path in INLINED:
        html, did = _swap_inlined(html, path)
        if did:
            changed.append(path)

    html, did = _swap_manifest(html)
    if did:
        changed.append("fastblocks_ui/manifest.json")

    if args.check:
        if changed:
            print(
                "demo/demo.html is stale for: " + ", ".join(changed),
                file=sys.stderr,
            )
            return 1
        print("demo/demo.html inlined assets are up to date.")
        return 0

    if changed:
        DEMO.write_text(html, encoding="utf-8")
        for path in changed:
            print(f"  refreshed {path}")
    else:
        print("demo/demo.html inlined assets already up to date.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
