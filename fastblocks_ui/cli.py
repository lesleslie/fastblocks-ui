"""FastBlocks UI CLI tools."""

import argparse
import shutil
from pathlib import Path


def copy_assets(dest_dir: str) -> None:
    """Copy FastBlocks UI assets to destination directory."""
    import fastblocks_ui

    static_src = fastblocks_ui.get_static_path()
    static_dest = Path(dest_dir) / "fastblocks-ui"
    static_dest.mkdir(parents=True, exist_ok=True)

    # Copy only the built CSS bundle, not the source modules. Shipping the module
    # files would let the (canonical) modules and the generated bundle drift apart
    # in consumer projects.
    css_src = Path(static_src) / "css"
    css_dest = static_dest / "css"
    bundle_src = css_src / "fastblocks-ui.css"
    if bundle_src.exists():
        css_dest.mkdir(parents=True, exist_ok=True)
        shutil.copy2(bundle_src, css_dest / "fastblocks-ui.css")

    # Copy JS
    js_src = Path(static_src) / "js"
    js_dest = static_dest / "js"
    if js_src.exists():
        shutil.copytree(js_src, js_dest, dirs_exist_ok=True)

    # Copy manifest
    manifest_src = Path(fastblocks_ui.get_manifest_path())
    manifest_dest = static_dest / "manifest.json"
    if manifest_src.exists():
        shutil.copy2(manifest_src, manifest_dest)

    print(f"FastBlocks UI assets copied to {static_dest}")


def main() -> None:
    parser = argparse.ArgumentParser(description="FastBlocks UI CLI tools")
    parser.add_argument("command", choices=["copy-assets"], help="Command to execute")
    parser.add_argument(
        "--dest", default="./static", help="Destination directory for assets"
    )

    args = parser.parse_args()

    if args.command == "copy-assets":
        copy_assets(args.dest)


if __name__ == "__main__":
    main()
