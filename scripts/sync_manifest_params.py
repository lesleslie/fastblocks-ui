#!/usr/bin/env python3
"""Sync `fastblocks_ui/manifest.json`'s per-component ``params`` from the real
helper signatures in ``fastblocks_ui/helpers.py`` (WS-4).

The manifest previously only tracked `name`/`class_name`/`helper`/`description` —
enough to prove a component *exists* in every layer, but not enough to catch
signature or variant drift (a helper gaining/losing a keyword, e.g.). This script
derives `params` by introspection (`inspect.signature`) rather than hand-encoding
them, so the manifest cannot drift from the actual callable: re-run this script
after changing a helper's signature and the diff shows exactly what changed.

Only the explicit, documented parameters are recorded — `class_` and the
`**attrs` passthrough are deliberately excluded from every component's `params`.
This matches the existing hand-written `fastblocks-htmy` wrappers (`Button`,
`Container`, `Field`, `Table`), none of which expose `class_`/`**attrs` either;
downstream codegen (WS-16) follows the same convention.

Usage:
    python scripts/sync_manifest_params.py          # write manifest.json
    python scripts/sync_manifest_params.py --check  # exit 1 on drift (CI gate)
"""

from __future__ import annotations

import argparse
import inspect
import json
import sys
from pathlib import Path
from typing import Any

REPO_ROOT = Path(__file__).resolve().parents[1]
MANIFEST_PATH = REPO_ROOT / "fastblocks_ui" / "manifest.json"

sys.path.insert(0, str(REPO_ROOT))

import fastblocks_ui  # noqa: E402

# Components whose helper takes a shape codegen can't mechanically translate into
# a flat `@dataclass` (variadic positional args, `list[tuple[...]]`-shaped args, or
# a real union type) are hand-written in fastblocks-htmy rather than generated.
# Recorded here (and mirrored into the manifest as `"codegen": false`) so the
# codegen script (WS-16) and this sync script agree on scope without a second
# source of truth.
HAND_WRITTEN = {
    # Shape carve-outs: the helper signature isn't a flat, keyword-friendly
    # shape codegen can mirror mechanically.
    "columns",  # *children (variadic positional)
    "select",  # options: list[tuple[object, object]]
    "tabs",  # items: list[tuple[str, str, object]]
    "menu",  # items: list[tuple[object, object]]
    "navbar",  # items: list[tuple[object, str]] + multiple content slots
    "breadcrumb",  # items: list[tuple[object, str | None]]
    "validation_summary",  # errors: dict | list | tuple (three-way union)
    # Pre-existing carve-outs: these wrappers were hand-written before WS-16
    # introduced codegen and already live in fastblocks_htmy/{ui,layout}/*.py
    # (not *_generated.py). Their shape is flat enough that codegen *could*
    # mirror them, but doing so would collide with the existing hand-written
    # classes -- excluded here so `codegen: false` accurately reflects "not
    # in _generated.py", not just "shape-incompatible".
    "button",
    "container",
    "field",
    "table",
}

# `validation_summary` predates this script but was never added to the manifest
# (a real gap WS-4/WS-16 close) — no CSS class of its own beyond
# `ui-alert.is-danger.ui-validation-summary`, so it gets a synthetic
# `class_name` matching that combination for documentation purposes.
EXTRA_COMPONENTS = [
    {
        "name": "validation_summary",
        "class_name": "ui-validation-summary",
        "helper": "validation_summary",
        "description": "Aggregated form-error summary linking to individual fields.",
    },
]

EXCLUDED_PARAMS = {"class_", "attrs"}


def _param_kind(kind: inspect._ParameterKind) -> str:
    return kind.name.lower()


def _json_default(value: object) -> object:
    if value is None or isinstance(value, (bool, int, float, str)):
        return value
    # No helper param currently has a non-primitive default; fail loudly rather
    # than silently mis-serializing one if that ever changes.
    raise TypeError(f"Unsupported default value for manifest params: {value!r}")


def _params_for(helper_name: str) -> list[dict[str, Any]]:
    fn = getattr(fastblocks_ui, helper_name)
    params: list[dict[str, Any]] = []
    for name, param in inspect.signature(fn).parameters.items():
        if name in EXCLUDED_PARAMS or param.kind is inspect.Parameter.VAR_KEYWORD:
            continue
        entry: dict[str, Any] = {
            "name": name,
            "kind": _param_kind(param.kind),
            # Under `from __future__ import annotations`, annotations are plain
            # strings already -- this is the literal source text, not a
            # best-effort str(type).
            "type": param.annotation
            if isinstance(param.annotation, str)
            else str(param.annotation),
        }
        if param.default is inspect.Parameter.empty:
            entry["required"] = True
        else:
            entry["default"] = _json_default(param.default)
        params.append(entry)
    return params


def build_manifest() -> dict[str, Any]:
    manifest = json.loads(MANIFEST_PATH.read_text(encoding="utf-8"))
    components: list[dict[str, Any]] = list(manifest["components"])

    existing_names = {c["name"] for c in components}
    for extra in EXTRA_COMPONENTS:
        if extra["name"] not in existing_names:
            components.append(dict(extra))

    for component in components:
        helper_name = component.get("helper", component["name"])
        component["params"] = _params_for(helper_name)
        component["codegen"] = component["name"] not in HAND_WRITTEN

    components.sort(key=lambda c: c["name"])
    manifest["components"] = components
    return manifest


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "--check",
        action="store_true",
        help="Exit 1 if manifest.json would change (CI drift gate).",
    )
    args = parser.parse_args()

    current = MANIFEST_PATH.read_text(encoding="utf-8")
    # `manifest.json` is committed with alphabetized keys (3e76f69); emit the
    # same order so this script and whatever sorted it can't overwrite each
    # other on every run. Without this, `--check` fails on a full-file reorder
    # that carries no semantic change at all -- every param object holds the
    # same keys, just permuted.
    #
    # `sort_keys` reorders dict keys only and never list elements, so the
    # manifest's component and param *arrays* keep their meaningful order.
    updated = json.dumps(build_manifest(), indent=2, sort_keys=True) + "\n"

    if args.check:
        if current != updated:
            print("manifest.json params are stale; run scripts/sync_manifest_params.py")
            sys.exit(1)
        print("manifest.json params are up to date.")
        return

    MANIFEST_PATH.write_text(updated, encoding="utf-8")
    print(f"wrote {MANIFEST_PATH.relative_to(REPO_ROOT)}")


if __name__ == "__main__":
    main()
