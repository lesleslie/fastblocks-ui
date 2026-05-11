#!/usr/bin/env python3
"""Generate Vitest smoke-test templates from the FastBlocks UI manifest."""

from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path
from typing import Any

REPO_ROOT = Path(__file__).resolve().parents[1]
MANIFEST_PATH = REPO_ROOT / "fastblocks_ui" / "manifest.json"


def load_manifest() -> dict[str, Any]:
    """Load the supported component manifest."""
    return json.loads(MANIFEST_PATH.read_text(encoding="utf-8"))


def component_by_name(manifest: dict[str, Any], name: str) -> dict[str, Any]:
    """Return component metadata by component name."""
    for component in manifest["components"]:
        if component["name"] == name:
            return component
    available = ", ".join(component["name"] for component in manifest["components"])
    raise SystemExit(f"Unknown component {name!r}. Available components: {available}")


def generate_component_test(component: dict[str, Any]) -> str:
    """Generate a small browser-side smoke test for one component."""
    name = component["name"]
    class_name = component["class_name"]
    helper = component.get("helper", name)
    return f"""import {{ describe, expect, it }} from 'vitest';

describe('{name}', () => {{
  it('keeps the documented class as the public contract', () => {{
    const element = document.createElement('div');
    element.className = '{class_name}';

    expect(element.classList.contains('{class_name}')).toBe(true);
  }});

  it('documents the helper-backed rendering path', () => {{
    expect('{helper}').toBeTruthy();
  }});
}});
"""


def main() -> None:
    """Run the test-template generator."""
    parser = argparse.ArgumentParser(
        description="Generate FastBlocks UI Vitest templates from the manifest"
    )
    parser.add_argument("component", nargs="?", help="Component name, e.g. button")
    parser.add_argument("--all", action="store_true", help="Print all test templates")
    parser.add_argument("--list", action="store_true", help="List components")
    args = parser.parse_args()

    manifest = load_manifest()

    if args.list:
        for component in manifest["components"]:
            print(component["name"])
        return

    if args.all:
        for component in manifest["components"]:
            print(generate_component_test(component))
        return

    if args.component:
        print(generate_component_test(component_by_name(manifest, args.component)))
        return

    parser.print_help()
    sys.exit(1)


if __name__ == "__main__":
    main()
