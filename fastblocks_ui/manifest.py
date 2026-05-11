"""Manifest helpers for the FastBlocks UI public surface."""

from __future__ import annotations

import json
from importlib.resources import files
from typing import Any

__all__ = [
    "COMPONENT_MANIFEST",
    "component_classes",
    "component_manifest",
    "component_names",
]


def component_manifest() -> dict[str, Any]:
    """Load the canonical component manifest bundled with the package."""
    manifest_path = files(__package__).joinpath("manifest.json")
    return json.loads(manifest_path.read_text(encoding="utf-8"))


COMPONENT_MANIFEST = component_manifest()
component_names = tuple(
    component["name"] for component in COMPONENT_MANIFEST["components"]
)
component_classes = tuple(
    component["class_name"] for component in COMPONENT_MANIFEST["components"]
)
