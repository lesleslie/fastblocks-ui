"""
FastBulma CLI Tools
"""

import argparse
import os
import shutil


def copy_assets(dest_dir):
    """Copy FastBulma assets to destination directory."""
    import fastbulma

    static_src = fastbulma.get_static_path()
    static_dest = os.path.join(dest_dir, "static", "fastbulma")

    if not os.path.exists(static_dest):
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

    print(f"FastBulma assets copied to {static_dest}")


def main():
    parser = argparse.ArgumentParser(description="FastBulma CLI Tools")
    parser.add_argument("command", choices=["copy-assets"], help="Command to execute")
    parser.add_argument(
        "--dest", default="./static", help="Destination directory for assets"
    )

    args = parser.parse_args()

    if args.command == "copy-assets":
        copy_assets(args.dest)


if __name__ == "__main__":
    main()
