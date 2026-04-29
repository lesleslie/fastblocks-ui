"""FastBlocks UI CLI tools."""

import argparse
import os
import shutil


def copy_assets(dest_dir):
    """Copy FastBlocks UI assets to destination directory."""
    import fastblocks_ui

    static_src = fastblocks_ui.get_static_path()
    static_dest = os.path.join(dest_dir, "fastblocks-ui")

    os.makedirs(static_dest, exist_ok=True)

    # Copy CSS
    css_src = os.path.join(static_src, "css")
    css_dest = os.path.join(static_dest, "css")
    if os.path.exists(css_src):
        shutil.copytree(css_src, css_dest, dirs_exist_ok=True)

    # Copy JS
    js_src = os.path.join(static_src, "js")
    js_dest = os.path.join(static_dest, "js")
    if os.path.exists(js_src):
        shutil.copytree(js_src, js_dest, dirs_exist_ok=True)

    # Copy manifest
    manifest_src = fastblocks_ui.get_manifest_path()
    manifest_dest = os.path.join(static_dest, "manifest.json")
    if os.path.exists(manifest_src):
        shutil.copy2(manifest_src, manifest_dest)

    print(f"FastBlocks UI assets copied to {static_dest}")


def main():
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
