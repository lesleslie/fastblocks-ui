import gzip
import math
import os
import re
import subprocess
import sys
import tempfile
import tomllib
import unittest
from collections.abc import Callable
from importlib.resources import files
from pathlib import Path
from unittest.mock import patch

import fastblocks_ui
from fastblocks_ui import (
    COMPONENT_MANIFEST,
    alert,
    block,
    breadcrumb,
    button,
    card,
    checkbox,
    column,
    columns,
    compose,
    container,
    dialog,
    field,
    footer,
    fragment,
    hero,
    level,
    media,
    menu,
    navbar,
    pagination,
    progress,
    section,
    stable_id,
    switch,
    table,
    tabs,
    tile,
    title,
    validation_summary,
)
from fastblocks_ui import (
    input as ui_input,
)
from fastblocks_ui import (
    select as ui_select,
)
from fastblocks_ui.cli import copy_assets
from fastblocks_ui.cli import main as cli_main


class TestPackageMetadata(unittest.TestCase):
    def test_version_and_license(self):
        # Version is single-sourced from installed package metadata (PEP 621),
        # so assert a PEP 440-style format rather than a brittle literal.
        self.assertRegex(fastblocks_ui.__version__, r"^\d+\.\d+\.\d+")
        self.assertEqual(fastblocks_ui.__license__, "BSD-3-Clause")
        self.assertEqual(fastblocks_ui.__author__, "FastBlocks UI Team")

    def test_public_paths(self):
        self.assertTrue(fastblocks_ui.get_static_path().endswith("static"))
        self.assertTrue(fastblocks_ui.get_css_path().endswith("css/fastblocks-ui.css"))
        self.assertTrue(fastblocks_ui.get_js_path().endswith("js/fastblocks-ui.js"))
        self.assertTrue(fastblocks_ui.get_manifest_path().endswith("manifest.json"))

    def test_package_resources_exist(self):
        self.assertTrue(
            files(fastblocks_ui).joinpath("static/css/fastblocks-ui.css").is_file()
        )
        self.assertTrue(
            files(fastblocks_ui).joinpath("static/js/fastblocks-ui.js").is_file()
        )
        self.assertTrue(files(fastblocks_ui).joinpath("static/js/enhance.js").is_file())
        self.assertTrue(
            files(fastblocks_ui).joinpath("static/js/manifest.js").is_file()
        )
        self.assertTrue(files(fastblocks_ui).joinpath("manifest.json").is_file())
        self.assertTrue(files(fastblocks_ui).joinpath("py.typed").is_file())

    def test_manifest_exposes_component_surface(self):
        names = [component["name"] for component in COMPONENT_MANIFEST["components"]]
        classes = [
            component["class_name"] for component in COMPONENT_MANIFEST["components"]
        ]

        # Layout components
        layout_names = [
            "container",
            "columns",
            "column",
            "section",
            "footer",
            "level",
            "hero",
            "title",
            "media",
            "tile",
            "navbar",
            "breadcrumb",
            "progress",
            "table",
            "pagination",
        ]
        # UI components
        ui_names = [
            "button",
            "card",
            "field",
            "input",
            "select",
            "checkbox",
            "switch",
            "dialog",
            "tabs",
            "menu",
            "alert",
        ]

        for name in layout_names + ui_names:
            self.assertIn(name, names, f"Missing component: {name}")

        self.assertIn("ui-button", classes)
        self.assertIn("ui-alert", classes)
        self.assertIn("ui-columns", classes)
        self.assertIn("ui-hero", classes)
        self.assertIn("ui-navbar", classes)
        self.assertIn("ui-table", classes)
        self.assertIn("ui-pagination", classes)

    def test_packaging_config_declares_bundled_package_surface(self):
        repo_root = Path(__file__).resolve().parents[1]
        pyproject = tomllib.loads((repo_root / "pyproject.toml").read_text())
        package_find = pyproject["tool"]["setuptools"]["packages"]["find"]
        package_data = pyproject["tool"]["setuptools"]["package-data"]["fastblocks_ui"]

        self.assertEqual(package_find["include"], ["fastblocks_ui", "fastblocks_ui.*"])
        self.assertIn("tests*", package_find["exclude"])
        self.assertIn("scripts*", package_find["exclude"])
        self.assertIn("node_modules*", package_find["exclude"])
        self.assertIn("py.typed", package_data)
        self.assertIn("manifest.json", package_data)
        self.assertIn("static/**/*", package_data)

    def test_source_distribution_manifest_excludes_development_paths(self):
        repo_root = Path(__file__).resolve().parents[1]
        manifest = (repo_root / "MANIFEST.in").read_text(encoding="utf-8")

        for path in ("node_modules", "scripts", "src", "tests"):
            self.assertIn(f"prune {path}", manifest)

    def test_zero_runtime_dependencies(self):
        # The package must ship with no runtime dependencies; this is a deliberate
        # security/supply-chain property, so enforce it as a tripwire.
        repo_root = Path(__file__).resolve().parents[1]
        pyproject = tomllib.loads((repo_root / "pyproject.toml").read_text())
        self.assertEqual(pyproject["project"].get("dependencies", []), [])


class TestFoundationCSS(unittest.TestCase):
    def test_css_entrypoint_imports_layers(self):
        with open(fastblocks_ui.get_css_path(), encoding="utf-8") as handle:
            content = handle.read()

        # @import is allowed for bundling layout.css
        for statement in (
            "@layer tokens",
            "@layer theme",
            "@layer base",
            "@layer utilities",
            "@layer components",
        ):
            self.assertIn(statement, content)

    def test_manifest_documentation_exists(self):
        components_doc = Path(__file__).resolve().parents[1] / "docs" / "components.md"
        self.assertTrue(components_doc.is_file())
        content = components_doc.read_text(encoding="utf-8")
        for name in (
            "button",
            "card",
            "field",
            "input",
            "select",
            "checkbox",
            "switch",
            "dialog",
            "tabs",
            "menu",
            "alert",
        ):
            self.assertIn(f"| {name} |", content)

    def test_tokens_and_components_define_core_surface(self):
        tokens_path = os.path.join(
            os.path.dirname(fastblocks_ui.get_css_path()), "tokens.css"
        )
        components_path = os.path.join(
            os.path.dirname(fastblocks_ui.get_css_path()), "components.css"
        )

        with open(tokens_path, encoding="utf-8") as handle:
            tokens = handle.read()
        with open(components_path, encoding="utf-8") as handle:
            components = handle.read()

        for token in (
            "--ui-color-primary",
            "--ui-color-success",
            "--ui-color-warning",
            "--ui-color-danger",
            "--ui-color-surface",
            "--ui-color-text",
            "--ui-radius-md",
            "--ui-shadow-1",
            "--ui-space-10",
            "--ui-space-12",
        ):
            self.assertIn(token, tokens)

        for selector in (
            ".ui-button",
            ".ui-card",
            ".ui-field",
            ".ui-input",
            ".ui-select",
            ".ui-checkbox",
            ".ui-switch",
            ".ui-alert",
            ".ui-tabs",
            ".ui-menu",
            ".ui-dialog",
        ):
            self.assertIn(selector, components)

    def test_layout_css_defines_grid_system(self):
        layout_path = os.path.join(
            os.path.dirname(fastblocks_ui.get_css_path()), "layout.css"
        )
        self.assertTrue(
            os.path.isfile(layout_path), f"layout.css not found at {layout_path}"
        )

        with open(layout_path, encoding="utf-8") as handle:
            content = handle.read()

        for selector in (
            ".ui-container",
            ".ui-columns",
            ".ui-column",
            ".ui-level",
            ".ui-hero",
            ".ui-tile",
            ".ui-media",
            ".ui-navbar",
            ".ui-breadcrumb",
            ".ui-pagination",
            ".ui-table",
            ".ui-progress",
        ):
            self.assertIn(selector, content, f"Missing layout selector: {selector}")


class TestContainerQueries(unittest.TestCase):
    """WS-6: opt-in `@container`-driven layout for columns/tiles/cards.

    The viewport-based grid (`.is-N`/`.is-N-tablet`/etc.) ships unchanged as
    the default; these assertions cover the new, explicitly opt-in
    `.is-container` modifier and its container-query rules.
    """

    def _bundle(self) -> str:
        with open(fastblocks_ui.get_css_path(), encoding="utf-8") as handle:
            return handle.read()

    def test_columns_container_query_variant_exists(self):
        css = self._bundle()
        self.assertIn(".ui-columns.is-container", css)
        self.assertIn("container-type: inline-size", css)
        self.assertIn("@container (min-width: 30rem)", css)
        self.assertIn(".ui-column.is-4-cq", css)
        self.assertIn(".ui-column.is-12-cq", css)

    def test_tiles_container_query_variant_exists(self):
        css = self._bundle()
        self.assertIn(".ui-tiles.is-container", css)
        self.assertIn(".ui-tiles.is-container > .ui-tile.is-4", css)

    def test_card_container_query_variant_exists(self):
        css = self._bundle()
        self.assertIn(".ui-card.is-container", css)
        self.assertIn("@container (min-width: 24rem)", css)

    def test_is_container_is_documented_in_manifest(self):
        self.assertIn("is-container", COMPONENT_MANIFEST["state_modifiers"])


class TestManifestParamsSync(unittest.TestCase):
    """WS-4/WS-16: manifest.json's `params` are derived by introspection from
    the real helper signatures (`scripts/sync_manifest_params.py`), not
    hand-copied -- if a helper's signature changes without re-running that
    script, this drift gate fails.
    """

    def test_manifest_params_are_in_sync_with_helper_signatures(self):
        repo_root = Path(__file__).resolve().parents[1]
        result = subprocess.run(
            [
                sys.executable,
                str(repo_root / "scripts" / "sync_manifest_params.py"),
                "--check",
            ],
            capture_output=True,
            text=True,
        )
        self.assertEqual(result.returncode, 0, result.stdout + result.stderr)

    def test_every_component_has_a_codegen_flag(self):
        for component in COMPONENT_MANIFEST["components"]:
            self.assertIn("codegen", component, component["name"])
            self.assertIn("params", component, component["name"])

    def test_validation_summary_is_a_manifest_component(self):
        # Previously missing entirely -- fastblocks-htmy's WS-16 carve-out
        # wrapper needs a manifest entry to be listed in trusted_components().
        names = {c["name"] for c in COMPONENT_MANIFEST["components"]}
        self.assertIn("validation_summary", names)


class TestCSSBuild(unittest.TestCase):
    def test_bundle_is_in_sync_with_source_modules(self):
        # The shipped bundle is generated from the canonical source modules. If a
        # module changed without rebuilding, the build drift gate must fail.
        repo_root = Path(__file__).resolve().parents[1]
        result = subprocess.run(
            [sys.executable, str(repo_root / "tools" / "build_css.py"), "--check"],
            capture_output=True,
            text=True,
        )
        self.assertEqual(result.returncode, 0, result.stdout + result.stderr)


class TestDemoBuild(unittest.TestCase):
    def test_demo_index_is_in_sync_with_build_script(self):
        # demo/index.html is generated by scripts/build_demo.py. If a helper or the
        # script changed without regenerating, this drift gate must fail -- same
        # idiom as TestCSSBuild above and generate_components.py's --check in
        # fastblocks-htmy.
        repo_root = Path(__file__).resolve().parents[1]
        result = subprocess.run(
            [sys.executable, str(repo_root / "scripts" / "build_demo.py"), "--check"],
            capture_output=True,
            text=True,
        )
        self.assertEqual(result.returncode, 0, result.stdout + result.stderr)

    def test_bundle_declares_explicit_layer_order(self):
        with open(fastblocks_ui.get_css_path(), encoding="utf-8") as handle:
            content = handle.read()
        self.assertIn("@layer base, tokens, theme, components, utilities;", content)

    def test_bundle_includes_accessibility_media_queries(self):
        with open(fastblocks_ui.get_css_path(), encoding="utf-8") as handle:
            content = handle.read()
        self.assertIn("prefers-reduced-motion: reduce", content)
        self.assertIn("forced-colors: active", content)

    def test_bundle_includes_os_dark_mode_default(self):
        # Generated from the single [data-theme="dark"] source; gated to
        # :root:not([data-theme]) so an explicit theme choice still wins.
        with open(fastblocks_ui.get_css_path(), encoding="utf-8") as handle:
            content = handle.read()
        self.assertIn("prefers-color-scheme: dark", content)
        self.assertIn(":root:not([data-theme])", content)


class TestBundleSizeBudget(unittest.TestCase):
    """WS-9: cheap insurance against silent bundle bloat.

    `docs/roadmap.md` §4 names a target (~30KB min+gzip for the CSS bundle)
    but nothing previously enforced it. As of this writing the CSS bundle
    gzips to ~6.5KB and `enhance.js` to ~6KB -- both comfortably under
    budget (about 20% and 40% of their respective budgets) -- so this is a
    regression guard, not a currently-binding constraint.
    """

    CSS_BUDGET_BYTES = 30 * 1024  # ~30KB min+gzip, per docs/roadmap.md §4.
    # No published budget exists for enhance.js; set generously above the
    # current ~6KB gzip size (roughly the same headroom ratio as the CSS
    # budget) so this catches real bloat without being a tripwire on normal
    # growth.
    JS_BUDGET_BYTES = 15 * 1024

    def test_css_bundle_is_within_gzip_budget(self):
        content = Path(fastblocks_ui.get_css_path()).read_bytes()
        gzipped = gzip.compress(content, compresslevel=9)
        self.assertLessEqual(
            len(gzipped),
            self.CSS_BUDGET_BYTES,
            f"fastblocks-ui.css gzips to {len(gzipped)} bytes, over the "
            f"{self.CSS_BUDGET_BYTES}-byte budget (docs/roadmap.md §4). "
            "Trim CSS or revisit the budget deliberately.",
        )

    def test_enhance_js_is_within_gzip_budget(self):
        enhance_path = os.path.join(
            os.path.dirname(fastblocks_ui.get_js_path()), "enhance.js"
        )
        content = Path(enhance_path).read_bytes()
        gzipped = gzip.compress(content, compresslevel=9)
        self.assertLessEqual(
            len(gzipped),
            self.JS_BUDGET_BYTES,
            f"enhance.js gzips to {len(gzipped)} bytes, over the "
            f"{self.JS_BUDGET_BYTES}-byte budget. Trim JS or revisit the "
            "budget deliberately.",
        )


class TestLogicalPropertiesDriftGate(unittest.TestCase):
    """WS-7: grep-based drift gate (matching this project's existing
    "drift gate" test style, e.g. `TestCSSBuild.test_bundle_is_in_sync...`)
    for physical-direction CSS properties.

    Fails if a new `margin-left`/`-right`, `padding-left`/`-right`,
    `border-left`/`-right`, bare `left:`/`right:` positioning, or
    `text-align: left`/`right` shows up in a CSS source module outside the
    one documented, intentional exception: `.ui-media-left`/
    `.ui-media-right` in `layout.css`, which names a physical visual
    position (see the comment there) rather than a logical start/end.
    """

    PHYSICAL_MARKERS = (
        "margin-left:",
        "margin-right:",
        "padding-left:",
        "padding-right:",
        "border-left:",
        "border-right:",
        "text-align: left",
        "text-align: right",
        "text-align:left",
        "text-align:right",
        " left:",
        " right:",
    )
    ALLOWED_SELECTOR_MARKERS = ("ui-media-left", "ui-media-right")
    CSS_MODULES = (
        "tokens.css",
        "theme.css",
        "base.css",
        "components.css",
        "layout.css",
        "utilities.css",
    )

    def test_no_new_physical_direction_properties(self):
        css_dir = Path(os.path.dirname(fastblocks_ui.get_css_path()))
        violations = []
        for name in self.CSS_MODULES:
            path = css_dir / name
            if not path.is_file():
                continue
            current_selector = ""
            for lineno, line in enumerate(
                path.read_text(encoding="utf-8").splitlines(), start=1
            ):
                stripped = line.strip()
                if stripped.endswith("{"):
                    current_selector = stripped[:-1].strip()
                if not any(marker in line for marker in self.PHYSICAL_MARKERS):
                    continue
                if any(
                    marker in current_selector
                    for marker in self.ALLOWED_SELECTOR_MARKERS
                ):
                    continue
                violations.append(f"{name}:{lineno}: {stripped}")

        self.assertEqual(
            violations,
            [],
            "New physical-direction CSS propert(y/ies) found outside the "
            "documented ui-media-left/-right exception (WS-7). Prefer "
            "margin-inline-*/padding-inline-*/inset-inline-*/text-align: "
            "start|end. If this one is genuinely a physical exception "
            "(like ui-media-left/-right), add its selector marker to "
            "ALLOWED_SELECTOR_MARKERS with a comment explaining why:\n"
            + "\n".join(violations),
        )


def _hex_to_rgb(value: str) -> tuple[int, int, int]:
    # Unpacked rather than `tuple(genexp)`, which types as `tuple[int, ...]`
    # and needed a `type: ignore` to pass. This is the same code without the
    # escape hatch.
    value = value.lstrip("#")
    red, green, blue = (int(value[i : i + 2], 16) for i in (0, 2, 4))
    return red, green, blue


_OKLCH_RE = re.compile(
    r"oklch\(\s*([0-9.]+)%?\s+([0-9.]+)\s+([0-9.]+)\s*\)", re.IGNORECASE
)


def _oklch_to_rgb(
    lightness: float, chroma: float, hue_deg: float
) -> tuple[int, int, int]:
    """Convert an ``oklch()`` triple to 8-bit sRGB (Ottosson's transform).

    WCAG 2.x contrast is defined over sRGB, so wide-gamut values are clamped
    into the sRGB box -- the same projection a browser reports from
    ``getComputedStyle`` on a non-P3 display, and what tokens.css's own comment
    says the recorded ratios are computed against.
    """
    hue = math.radians(hue_deg)
    a = chroma * math.cos(hue)
    b = chroma * math.sin(hue)

    l_ = lightness + 0.3963377774 * a + 0.2158037573 * b
    m_ = lightness - 0.1055613458 * a - 0.0638541728 * b
    s_ = lightness - 0.0894841775 * a - 1.2914855480 * b
    long_, med, short = l_**3, m_**3, s_**3

    linear = (
        4.0767416621 * long_ - 3.3077115913 * med + 0.2309699292 * short,
        -1.2684380046 * long_ + 2.6097574011 * med - 0.3413193965 * short,
        -0.0041960863 * long_ - 0.7034186147 * med + 1.7076147010 * short,
    )

    def encode(channel: float) -> int:
        channel = min(1.0, max(0.0, channel))
        srgb = (
            12.92 * channel
            if channel <= 0.0031308
            else 1.055 * channel ** (1 / 2.4) - 0.055
        )
        return round(min(1.0, max(0.0, srgb)) * 255)

    red, green, blue = (encode(c) for c in linear)
    return red, green, blue


def _css_color_to_rgb(value: str) -> tuple[int, int, int]:
    """Parse the CSS colour forms the token bundle actually uses."""
    value = value.strip()
    if value.startswith("#"):
        return _hex_to_rgb(value)
    match = _OKLCH_RE.match(value)
    if match:
        lightness = float(match.group(1))
        if "%" in value or lightness > 1:
            lightness /= 100
        return _oklch_to_rgb(lightness, float(match.group(2)), float(match.group(3)))
    msg = f"unsupported CSS colour form: {value!r}"
    raise ValueError(msg)


def _relative_luminance(rgb: tuple[int, int, int]) -> float:
    def channel(c: int) -> float:
        c_srgb = c / 255
        return (
            c_srgb / 12.92 if c_srgb <= 0.03928 else ((c_srgb + 0.055) / 1.055) ** 2.4
        )

    r, g, b = rgb
    return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b)


def _contrast_ratio(color_a: str, color_b: str) -> float:
    """WCAG contrast ratio between two CSS colours (hex or ``oklch()``)."""
    l1 = _relative_luminance(_css_color_to_rgb(color_a))
    l2 = _relative_luminance(_css_color_to_rgb(color_b))
    lighter, darker = max(l1, l2), min(l1, l2)
    return (lighter + 0.05) / (darker + 0.05)


class TestColorTokenContrastRegression(unittest.TestCase):
    """Regression gate for a real, previously-shipped bug (found 2026-07-26
    while redesigning button hover states): `is-info`/`is-success` (light
    theme) and `is-danger`/`is-primary` (dark theme) filled surfaces --
    `.ui-button.is-*`, `.ui-hero.is-*` -- paired their `-contrast` text color
    against a base fill too light/saturated to meet WCAG AA's 4.5:1 text
    contrast threshold. Parses the actual built CSS bundle's `:root` and
    `[data-theme="dark"]` custom-property blocks (not hand-copied hex
    literals) so this can't silently pass while the bundle drifts from what
    this test checks.
    """

    AA_NORMAL_TEXT = 4.5

    # Base color names whose fill pairs with that same color's own
    # `-contrast` token as real rendered text (button/hero variants).
    # `-strong` (hover/active) is checked too since components.css's button
    # hover rule reuses the *same* `-contrast` text color. The paired
    # `-contrast` token is looked up per-theme below (deliberately NOT
    # hardcoded white/black here) since light and dark themes don't always
    # agree on which text color a given fill pairs with -- e.g. light theme
    # pairs `--ui-color-danger` with white text, dark theme pairs it with
    # black.
    COLOR_NAMES = ("primary", "success", "danger", "warning")

    @staticmethod
    def _extract_block(css: str, selector: str) -> str:
        start = css.index(selector)
        open_brace = css.index("{", start)
        depth = 1
        i = open_brace + 1
        while depth:
            if css[i] == "{":
                depth += 1
            elif css[i] == "}":
                depth -= 1
            i += 1
        return css[open_brace:i]

    @classmethod
    def _tokens(cls, block: str) -> dict[str, str]:
        # Must match `oklch()` as well as hex: the palette migrated to
        # `oklch()`, and a hex-only pattern matched no base fill at all,
        # leaving `_assert_all_pass` with nothing to compare.
        return dict(
            re.findall(
                r"(--ui-color-[\w-]+):\s*(#[0-9a-fA-F]{6}|oklch\([^)]*\))", block
            )
        )

    def test_light_theme_fill_contrast(self):
        css = Path(fastblocks_ui.get_css_path()).read_text(encoding="utf-8")
        # First `:root { ... }` block is tokens.css's light-theme defaults.
        block = self._extract_block(css, ":root {")
        tokens = self._tokens(block)
        self._assert_all_pass(tokens, "light theme (:root)")

    def test_dark_theme_fill_contrast(self):
        css = Path(fastblocks_ui.get_css_path()).read_text(encoding="utf-8")
        block = self._extract_block(css, '[data-theme="dark"] {')
        tokens = self._tokens(block)
        # Dark theme only overrides tokens that differ from light -- fall
        # back to light-theme values for any token dark mode doesn't touch.
        root_block = self._extract_block(css, ":root {")
        merged = {**self._tokens(root_block), **tokens}
        self._assert_all_pass(merged, 'dark theme ([data-theme="dark"])')

    def _assert_all_pass(self, tokens: dict[str, str], theme_label: str) -> None:
        failures = []
        for name in self.COLOR_NAMES:
            text_color = tokens.get(f"--ui-color-{name}-contrast")
            if text_color is None:
                continue
            for suffix in ("", "-strong"):
                token = f"--ui-color-{name}{suffix}"
                fill = tokens.get(token)
                if fill is None:
                    continue
                ratio = _contrast_ratio(fill, text_color)
                if ratio < self.AA_NORMAL_TEXT:
                    failures.append(
                        f"{token}={fill} vs {text_color} text -> {ratio:.2f}:1 "
                        f"(needs >= {self.AA_NORMAL_TEXT}:1)"
                    )
        self.assertEqual(
            failures,
            [],
            f"WCAG AA text-contrast failure(s) in {theme_label}:\n"
            + "\n".join(failures),
        )


class TestManifestContract(unittest.TestCase):
    """The manifest is the single source of truth; every layer must agree with it."""

    def test_every_helper_is_exported_and_callable(self):
        for component in COMPONENT_MANIFEST["components"]:
            helper = component["helper"]
            self.assertIn(
                helper, fastblocks_ui.__all__, f"{helper!r} missing from __all__"
            )
            self.assertTrue(
                callable(getattr(fastblocks_ui, helper, None)),
                f"{helper!r} is not an importable callable",
            )

    def test_every_class_name_is_styled_in_bundle(self):
        with open(fastblocks_ui.get_css_path(), encoding="utf-8") as handle:
            css = handle.read()
        for component in COMPONENT_MANIFEST["components"]:
            class_name = component["class_name"]
            self.assertIn(
                f".{class_name}",
                css,
                f"{class_name!r} has no rule in the shipped bundle",
            )

    def test_every_component_is_documented(self):
        components_doc = Path(__file__).resolve().parents[1] / "docs" / "components.md"
        content = components_doc.read_text(encoding="utf-8")
        for component in COMPONENT_MANIFEST["components"]:
            self.assertIn(
                f"| {component['name']} |",
                content,
                f"{component['name']!r} missing from docs/components.md",
            )


class TestDocumentationConsistency(unittest.TestCase):
    def test_package_keywords_describe_a_design_system(self):
        repo_root = Path(__file__).resolve().parents[1]
        pyproject = tomllib.loads((repo_root / "pyproject.toml").read_text())
        self.assertIn("design-system", pyproject["project"]["keywords"])

    def test_deferred_light_dom_custom_elements_spec_exists(self):
        repo_root = Path(__file__).resolve().parents[1]
        spec = repo_root / "docs" / "light-dom-custom-elements-spec.md"
        content = spec.read_text(encoding="utf-8")

        for phrase in (
            "fusion of Bulma, Kelp, and Web Awesome",
            "<ui-tabs>",
            "<ui-dialog>",
            "<ui-menu>",
            "Why light DOM is the default:",
            "Existing children must not be moved into closed implementation details.",
            "State must be reflected in attributes",
            "Helpers emit the canonical markup",
        ):
            self.assertIn(phrase, content)


class TestHelpers(unittest.TestCase):
    def test_button_escapes_and_merges_classes(self):
        markup = button("Save <draft>", variant="primary", class_=["is-rounded", ""])
        self.assertIn('class="ui-button is-primary is-rounded"', markup)
        self.assertIn("&lt;draft&gt;", markup)
        self.assertNotIn('role="button"', button("Go", href="/go"))

    def test_field_and_card_render_safe_html(self):
        control = ui_input(placeholder='Name "tag"')
        markup = card(
            header="Profile",
            body=field(
                label="Email <address>",
                help_text="We'll never share it",
                control_html=control,
                control_id="email",
            ),
        )
        self.assertIn('<header class="ui-card__header">Profile</header>', markup)
        self.assertIn("Email &lt;address&gt;", markup)
        self.assertIn(
            'class="ui-input" type="text" placeholder="Name &quot;tag&quot;"', markup
        )
        self.assertIn('for="email"', markup)
        self.assertIn('aria-describedby="email-help"', markup)

    def test_field_renders_validation_state(self):
        markup = field(
            label="Display name",
            help_text="Shown on your profile.",
            error_text="Must be at least 3 characters.",
            control_html=ui_input(id="display-name", name="display_name", value="Ada"),
            control_id="display-name",
        )
        self.assertIn('aria-invalid="true"', markup)
        self.assertIn('aria-describedby="display-name-help display-name-error"', markup)
        self.assertIn('role="alert"', markup)

    def test_validation_summary_renders_links(self):
        markup = validation_summary(
            {
                "profile-email": "Enter a valid email address.",
                "profile-display-name": "Display name must be at least 3 characters.",
            }
        )
        self.assertIn('class="ui-alert is-danger ui-validation-summary"', markup)
        self.assertIn('role="alert"', markup)
        self.assertIn(
            '<strong class="ui-validation-summary__title">Please correct the errors below.</strong>',
            markup,
        )
        self.assertIn(
            '<a href="#profile-email">Enter a valid email address.</a>', markup
        )
        self.assertIn(
            '<a href="#profile-display-name">Display name must be at least 3 characters.</a>',
            markup,
        )

    def test_select_checkbox_switch_alert_dialog_menu(self):
        select_markup = ui_select(options=[("1", "One"), ("2", "Two")], value="2")
        checkbox_markup = checkbox(label="Remember me", class_="is-inline")
        switch_markup = switch(label="Auto save", checked=True)
        alert_markup = alert("Saved", variant="success")
        dialog_markup = dialog("Content", title="Dialog title", open=True)
        menu_markup = menu([("Profile", "/profile"), ("Settings", "/settings")])

        self.assertIn('<select class="ui-select">', select_markup)
        self.assertIn('<option value="2" selected>Two</option>', select_markup)
        self.assertIn('class="ui-checkbox is-inline"', checkbox_markup)
        self.assertIn('class="ui-switch"', switch_markup)
        self.assertIn('role="switch"', switch_markup)
        # State comes from the native `checked` attribute, not a server-rendered
        # `aria-checked` nothing keeps in sync -- see TestSwitchAriaState.
        self.assertIn("checked", switch_markup)
        self.assertNotIn("aria-checked", switch_markup)
        self.assertIn('class="ui-alert is-success"', alert_markup)
        self.assertIn('<dialog class="ui-dialog" open', dialog_markup)
        self.assertIn('class="ui-menu"', menu_markup)

    def test_custom_element_wrappers_remain_opt_in(self):
        tabs_markup = tabs(
            [("profile", "Profile", "<p>Profile</p>")],
            custom_element=True,
        )
        dialog_markup = dialog("Content", title="Dialog title", custom_element=True)
        menu_markup = menu([("Profile", "/profile")], custom_element=True)

        self.assertIn("<ui-tabs", tabs_markup)
        self.assertIn("<ui-dialog", dialog_markup)
        self.assertIn("<ui-menu", menu_markup)
        self.assertIn('<dialog class="ui-dialog"', dialog_markup)
        self.assertIn('<nav class="ui-menu"', menu_markup)

    def test_navbar_breadcrumb_and_table_layout_helpers(self):
        navbar_markup = navbar(
            brand="FastBlocks",
            brand_url="/home",
            start=[("Docs", "/docs"), ("API", "/api")],
            end=button("Log in", href="/login"),
            variant="primary",
        )
        breadcrumb_markup = breadcrumb(
            [("Home", "/"), ("Products", "/products"), ("Details", None)]
        )
        overridden_breadcrumb_markup = breadcrumb(
            [("Home", "/"), ("Details", None)],
            aria_label="section breadcrumb",
        )
        table_markup = table(
            headers=["Name", "Email"],
            rows=[["Ada", "ada@example.com"]],
            fullwidth=True,
        )

        self.assertIn('href="/home"', navbar_markup)
        self.assertIn('class="ui-navbar-start"', navbar_markup)
        self.assertIn('href="/docs"', navbar_markup)
        self.assertIn('href="/api"', navbar_markup)
        self.assertIn('href="/login"', navbar_markup)
        self.assertIn('aria-label="breadcrumb"', breadcrumb_markup)
        self.assertIn('aria-label="section breadcrumb"', overridden_breadcrumb_markup)
        self.assertIn('class="ui-table is-fullwidth"', table_markup)

    def test_tabs_emit_accessible_markup(self):
        markup = tabs(
            [
                ("profile", "Profile", "<p>Profile</p>"),
                ("billing", "Billing", "<p>Billing</p>"),
            ],
            active_id="billing",
        )
        self.assertIn('role="tab"', markup)
        self.assertIn('role="tabpanel"', markup)
        self.assertIn('aria-controls="profile-panel"', markup)
        self.assertIn('aria-labelledby="profile"', markup)
        self.assertIn('data-ui-tab-target="#billing-panel"', markup)


class TestLayoutHelpers(unittest.TestCase):
    """WS-14: `container`/`section`/`footer`/`level`/`hero`/`title`/`columns`/
    `column` had 0% statement coverage — string-matched from CSS tests only,
    never actually invoked by any Python test. This class exercises their
    real rendered output, including the flag/branch combinations coverage.json
    flagged as untested."""

    def test_container_default_and_content(self):
        markup = container("Hello <b>world</b>")
        self.assertIn('class="ui-container"', markup)
        self.assertIn("Hello", markup)
        self.assertTrue(markup.startswith("<div"))
        self.assertTrue(markup.endswith("</div>"))

    def test_container_no_content_renders_empty_inner(self):
        markup = container()
        self.assertEqual(markup, '<div class="ui-container"></div>')

    def test_container_width_modifiers(self):
        self.assertIn("is-fluid", container("x", fluid=True))
        self.assertIn("is-widescreen", container("x", widescreen=True))
        self.assertIn("is-fullhd", container("x", fullhd=True))
        markup = container("x", fluid=True, widescreen=True, fullhd=True)
        self.assertIn("ui-container is-fluid is-widescreen is-fullhd", markup)

    def test_section_default_and_size(self):
        markup = section("Body")
        self.assertTrue(markup.startswith("<section"))
        self.assertIn('class="ui-section"', markup)
        self.assertIn("Body", markup)
        self.assertIn("is-large", section("Body", size="large"))

    def test_section_no_content(self):
        self.assertEqual(section(), '<section class="ui-section"></section>')

    def test_footer_with_and_without_content(self):
        self.assertEqual(footer(), '<footer class="ui-footer"></footer>')
        markup = footer("Copyright 2026")
        self.assertTrue(markup.startswith("<footer"))
        self.assertIn("Copyright 2026", markup)

    def test_columns_wraps_multiple_children(self):
        markup = columns(column("A"), column("B"))
        self.assertIn('class="ui-columns is-multiline"', markup)
        self.assertIn("ui-column", markup)
        self.assertIn(">A<", markup)
        self.assertIn(">B<", markup)

    def test_columns_modifiers(self):
        markup = columns(centered=True, vcentered=True, gapless=True, multiline=False)
        self.assertIn("is-centered", markup)
        self.assertIn("is-vcentered", markup)
        self.assertIn("is-gapless", markup)
        self.assertNotIn("is-multiline", markup)

    def test_column_size_offset_narrow_full(self):
        self.assertIn("is-4", column("x", size="4"))
        self.assertIn("is-offset-2", column("x", offset="2"))
        self.assertIn("is-narrow", column("x", narrow=True))
        self.assertIn("is-full", column("x", full=True))

    def test_column_no_content(self):
        self.assertEqual(column(), '<div class="ui-column"></div>')

    def test_level_left_and_right(self):
        markup = level(left="Left side", right="Right side")
        self.assertIn('class="ui-level-left">Left side</div>', markup)
        self.assertIn('class="ui-level-right">Right side</div>', markup)
        self.assertIn('aria-label="main navigation"', markup)

    def test_level_left_only(self):
        markup = level(left="Only left")
        self.assertIn("ui-level-left", markup)
        self.assertNotIn("ui-level-right", markup)

    def test_level_right_only(self):
        markup = level(right="Only right")
        self.assertNotIn("ui-level-left", markup)
        self.assertIn("ui-level-right", markup)

    def test_level_neither_side(self):
        markup = level()
        self.assertNotIn("ui-level-left", markup)
        self.assertNotIn("ui-level-right", markup)

    def test_level_centered(self):
        self.assertIn("is-centered", level(centered=True))

    def test_hero_title_only(self):
        markup = hero("Welcome")
        self.assertIn('class="ui-title">Welcome</p>', markup)
        self.assertNotIn("ui-subtitle", markup)

    def test_hero_with_subtitle_variant_and_size(self):
        markup = hero(
            "Welcome", subtitle="Get started", variant="primary", size="large"
        )
        self.assertIn('class="ui-subtitle">Get started</p>', markup)
        self.assertIn("is-primary", markup)
        self.assertIn("is-large", markup)
        self.assertIn('class="ui-hero-body"', markup)

    def test_title_default_and_size(self):
        markup = title("Heading")
        self.assertEqual(markup, '<p class="ui-title">Heading</p>')
        self.assertIn("is-large", title("Heading", size="large"))

    def test_media_with_image_start(self):
        markup = media("Body text", image="<img>")
        self.assertIn('class="ui-media-left">', markup)
        self.assertIn('class="ui-media-content">Body text</div>', markup)

    def test_media_with_image_end(self):
        markup = media("Body text", image="<img>", position="end")
        self.assertIn('class="ui-media-right">', markup)

    def test_media_no_image(self):
        markup = media("Body text")
        self.assertNotIn("ui-media-left", markup)
        self.assertNotIn("ui-media-right", markup)

    def test_tile_parent_child_ancestor(self):
        self.assertIn("is-parent", tile("x", parent=True))
        self.assertIn("is-child", tile("x", child=True))
        self.assertIn("is-ancestor", tile("x", ancestor=True))
        self.assertIn("is-8", tile("x", size="8"))

    def test_tile_no_content(self):
        self.assertEqual(tile(), '<div class="ui-tile"></div>')


class TestValidationSummaryBranches(unittest.TestCase):
    """WS-14: `validation_summary` had the worst branch coverage of any
    tested function (41.67%) — the dict branch was tested, list/tuple and
    the falsy-value-skipping/empty-items branches were not."""

    def test_list_input_renders_items(self):
        markup = validation_summary(["First error", "Second error"])
        self.assertIn("<li>First error</li>", markup)
        self.assertIn("<li>Second error</li>", markup)
        self.assertNotIn("<a href=", markup)  # only dict errors get anchors

    def test_tuple_input_renders_items(self):
        markup = validation_summary(("Only error",))
        self.assertIn("<li>Only error</li>", markup)

    def test_list_input_skips_falsy_values(self):
        markup = validation_summary(["Real error", None, False])
        self.assertIn("<li>Real error</li>", markup)
        self.assertEqual(markup.count("<li>"), 1)

    def test_dict_input_skips_falsy_values(self):
        markup = validation_summary({"a": "Real error", "b": None, "c": False})
        self.assertEqual(markup.count("<li>"), 1)

    def test_all_falsy_values_renders_no_list(self):
        markup = validation_summary([None, False])
        self.assertNotIn("<ul", markup)
        self.assertNotIn("ui-validation-summary__title", markup)
        self.assertIn("Please correct the errors below.", markup)

    def test_empty_list_renders_no_list(self):
        markup = validation_summary([])
        self.assertNotIn("<ul", markup)

    def test_custom_title(self):
        markup = validation_summary(["err"], title="Fix these:")
        self.assertIn("Fix these:", markup)


class TestHelperHardening(unittest.TestCase):
    def test_pagination_url_pattern_uses_literal_substitution(self):
        # Unrelated braces must not crash (str.format would KeyError on {category});
        # only {page} is substituted.
        markup = pagination(2, 5, url_pattern="/shop/{category}/items?page={page}")
        self.assertIn("/shop/{category}/items?page=1", markup)
        self.assertIn("/shop/{category}/items?page=3", markup)

    def test_pagination_url_pattern_rejects_format_injection(self):
        # "{page.__class__}" must stay literal — no attribute access is evaluated.
        markup = pagination(2, 3, url_pattern="/p/{page.__class__}/{page}")
        self.assertNotIn("class 'int'", markup)
        self.assertIn("{page.__class__}", markup)

    def test_pagination_marks_current_and_renders_siblings(self):
        markup = pagination(3, 10, url_pattern="/items?page={page}", siblings=1)
        self.assertIn('href="/items?page=2"', markup)
        self.assertIn('href="/items?page=4"', markup)
        self.assertIn("is-current", markup)
        self.assertIn('aria-label="pagination"', markup)

    def test_pagination_single_page_is_empty(self):
        self.assertEqual(pagination(1, 1), "")

    def test_pagination_renders_ellipsis_for_large_range(self):
        markup = pagination(50, 100, url_pattern="/p?page={page}", siblings=1)
        self.assertIn('href="/p?page=1"', markup)  # first page
        self.assertIn('href="/p?page=100"', markup)  # last page
        self.assertIn('href="/p?page=49"', markup)  # window
        self.assertIn('href="/p?page=51"', markup)
        self.assertIn("ui-pagination__ellipsis", markup)

    def test_progress_uses_float_math(self):
        # 0.75 / 1 was truncated to 0 / 1 = 0% under the old int() math; the native
        # <progress> carries honest value/max attributes.
        markup = progress(0.75, max_value=1)
        self.assertIn('value="0.75"', markup)
        self.assertIn('max="1"', markup)
        self.assertIn(">75%</progress>", markup)

    def test_progress_honest_value_for_fractional_input(self):
        self.assertIn('value="33.5"', progress(33.5, max_value=100))

    def test_progress_handles_zero_max_without_crashing(self):
        markup = progress(5, max_value=0)
        self.assertIn(">0%</progress>", markup)
        self.assertIn('value="5"', markup)

    def test_progress_clamps_overflow(self):
        self.assertIn(">100%</progress>", progress(150, max_value=100))

    def test_progress_is_csp_safe(self):
        # Native <progress> needs no inline width, so output never carries a
        # style attribute (safe under a strict style-src CSP).
        for markup in (
            progress(50),
            progress(0.5, max_value=1, variant="success", size="large"),
            progress(150, max_value=100, show_label=True),
        ):
            self.assertNotIn("style=", markup)
            self.assertIn("<progress", markup)


class TestFastBlocksIntegration(unittest.TestCase):
    def test_stable_id_compose_fragment_and_block(self):
        self.assertEqual(stable_id("Profile", "Card"), stable_id(" profile ", "card"))
        self.assertTrue(stable_id("Profile", "Card").startswith("fb-"))

        preview = compose(button("Edit"), button("Delete"))
        self.assertIn('<button class="ui-button" type="button">Edit</button>', preview)

        fragment_markup = fragment(
            button("Save"), fragment_id="save-fragment", class_="tone"
        )
        block_markup = block(preview, block_id="actions")

        self.assertIn('data-fastblocks-fragment="true"', fragment_markup)
        self.assertIn('data-fastblocks-block="true"', block_markup)
        self.assertIn('class="ui-fragment tone"', fragment_markup)
        self.assertIn('class="ui-block"', block_markup)


class TestCLI(unittest.TestCase):
    def test_copy_assets_writes_to_fastblocks_ui_directory(self):
        with tempfile.TemporaryDirectory() as temp_dir:
            copy_assets(temp_dir)

            css_path = os.path.join(
                temp_dir, "fastblocks-ui", "css", "fastblocks-ui.css"
            )
            js_path = os.path.join(temp_dir, "fastblocks-ui", "js", "fastblocks-ui.js")
            enhance_path = os.path.join(temp_dir, "fastblocks-ui", "js", "enhance.js")
            manifest_path = os.path.join(temp_dir, "fastblocks-ui", "manifest.json")

            self.assertTrue(os.path.exists(css_path))
            self.assertTrue(os.path.exists(js_path))
            self.assertTrue(os.path.exists(enhance_path))
            self.assertTrue(os.path.exists(manifest_path))

            # Only the built bundle ships, never the source modules (which would
            # let the bundle and modules drift apart in consumer projects).
            css_dir = os.path.join(temp_dir, "fastblocks-ui", "css")
            for module in ("tokens.css", "components.css", "layout.css", "theme.css"):
                self.assertFalse(
                    os.path.exists(os.path.join(css_dir, module)),
                    f"copy-assets should not ship source module {module}",
                )

    def test_cli_main_function(self):
        with (
            tempfile.TemporaryDirectory() as temp_dir,
            patch.object(
                sys, "argv", ["fastblocks-ui", "copy-assets", "--dest", temp_dir]
            ),
        ):
            try:
                cli_main()
            except SystemExit:
                pass

            css_path = os.path.join(
                temp_dir, "fastblocks-ui", "css", "fastblocks-ui.css"
            )
            js_path = os.path.join(temp_dir, "fastblocks-ui", "js", "fastblocks-ui.js")
            manifest_path = os.path.join(temp_dir, "fastblocks-ui", "manifest.json")

            self.assertTrue(os.path.exists(css_path))
            self.assertTrue(os.path.exists(js_path))
            self.assertTrue(os.path.exists(manifest_path))


if __name__ == "__main__":
    unittest.main()


class TestContrastGateActuallyRuns(unittest.TestCase):
    """Guard the guard: `TestColorTokenContrastRegression` must do real work.

    Its token parser matched `#rrggbb` only. When the palette moved to
    `oklch()` every base fill stopped matching, so `_assert_all_pass` hit
    `if fill is None: continue` every iteration and both tests asserted
    `[] == []` -- zero contrast comparisons. The gate was silently inert from
    the exact commit whose message cited it as evidence nothing regressed.
    """

    def test_parser_finds_base_fills_in_both_themes(self) -> None:
        css = Path(fastblocks_ui.get_css_path()).read_text(encoding="utf-8")
        for selector, label in ((":root {", "light"), ('[data-theme="dark"] {', "dark")):
            block = TestColorTokenContrastRegression._extract_block(css, selector)
            tokens = TestColorTokenContrastRegression._tokens(block)
            missing = [
                f"--ui-color-{name}"
                for name in TestColorTokenContrastRegression.COLOR_NAMES
                if f"--ui-color-{name}" not in tokens
            ]
            self.assertEqual(
                missing,
                [],
                f"{label}: the contrast gate's parser found no value for {missing} "
                "-- it cannot compare what it cannot parse, so the gate passes "
                "vacuously.",
            )

    def test_gate_would_catch_a_real_regression(self) -> None:
        gate = TestColorTokenContrastRegression("test_light_theme_fill_contrast")
        with self.assertRaises(AssertionError):
            gate._assert_all_pass(
                {
                    "--ui-color-primary": "#fefefe",
                    "--ui-color-primary-contrast": "#ffffff",
                },
                "synthetic",
            )

    def test_oklch_conversion_matches_browser(self) -> None:
        """Cross-check against values measured in Chrome on the rendered demo."""
        self.assertEqual(_oklch_to_rgb(0.511, 0.262, 276.966), (79, 57, 246))
        self.assertAlmostEqual(
            _contrast_ratio("oklch(51.1% 0.262 276.966)", "#ffffff"), 6.46, places=2
        )
        # tokens.css documents danger + white as the tightest pair at 4.77:1.
        self.assertAlmostEqual(
            _contrast_ratio("oklch(57.7% 0.245 27.325)", "#ffffff"), 4.77, places=2
        )


class TestFocusIndicatorContrast(unittest.TestCase):
    """WCAG 2.1 AA 1.4.11 (non-text contrast) for the focus indicator.

    Measured in Chrome against the rendered demo, the shipped ring managed
    1.47:1 light and 1.20:1 dark: `--ui-focus-ring` mixed the focus colour to
    24% alpha, and dark mode inherited light mode's indigo-600, only 2.76:1 on
    the dark surface even at full opacity. axe-core does not evaluate
    focus-indicator contrast, so the Playwright a11y run passed throughout.
    """

    AA_NON_TEXT = 3.0

    @staticmethod
    def _tokens_for(selector: str) -> dict[str, str]:
        css = Path(fastblocks_ui.get_css_path()).read_text(encoding="utf-8")
        block = TestColorTokenContrastRegression._extract_block(css, selector)
        return TestColorTokenContrastRegression._tokens(block)

    def test_focus_ring_is_not_transparent(self) -> None:
        css = Path(fastblocks_ui.get_css_path()).read_text(encoding="utf-8")
        match = re.search(r"--ui-focus-ring:\s*([^;]+);", css)
        if match is None:
            self.fail("--ui-focus-ring is not defined")
        value = match.group(1)
        self.assertNotIn(
            "transparent",
            value,
            "the focus ring blends toward transparent, dropping it far below "
            f"the {self.AA_NON_TEXT}:1 non-text contrast floor: {value!r}",
        )

    def test_focus_colour_meets_non_text_contrast_in_both_themes(self) -> None:
        light = self._tokens_for(":root {")
        dark = {**light, **self._tokens_for('[data-theme="dark"] {')}

        failures: list[str] = []
        for label, tokens in (("light", light), ("dark", dark)):
            focus = tokens.get("--ui-color-focus")
            surface = tokens.get("--ui-color-surface")
            if focus is None:
                self.fail(f"{label}: --ui-color-focus missing")
            if surface is None:
                self.fail(f"{label}: --ui-color-surface missing")
            ratio = _contrast_ratio(focus, surface)
            if ratio < self.AA_NON_TEXT:
                failures.append(
                    f"{label}: focus {focus} on surface {surface} -> {ratio:.2f}:1 "
                    f"(needs >= {self.AA_NON_TEXT}:1)"
                )

        self.assertEqual(
            failures, [], "focus indicator fails WCAG 1.4.11:\n" + "\n".join(failures)
        )


class TestHelperCorrectnessRegressions(unittest.TestCase):
    """Defects found by executing the helpers during the 2026-07-27 audit."""

    def test_tabs_unmatched_active_id_still_activates_a_tab(self) -> None:
        html = str(tabs([("a", "A", "1"), ("b", "B", "2")], active_id="does-not-exist"))
        self.assertEqual(
            re.findall(r'aria-selected="(\w+)"', html).count("true"),
            1,
            "no tab is selected, so the panel content is unreachable",
        )
        self.assertEqual(
            re.findall(r'tabindex="(-?\d+)"', html).count("0"),
            1,
            "no tab is keyboard-reachable: every tab has tabindex=-1",
        )

    def test_heading_level_rejects_bool(self) -> None:
        # Dispatched through a loosely-typed callable on purpose: `ty` already
        # rejects a literal `heading_level=True` statically, and that static
        # check works. This covers the dynamic callers a type checker never
        # sees -- values from JSON, a form, or a template context -- which
        # silently rendered `<hTrue>` because `True == 1`.
        dynamic_helpers: list[tuple[str, Callable[..., object]]] = [
            ("title", title),
            ("hero", hero),
        ]
        for name, helper in dynamic_helpers:
            with self.assertRaises(ValueError, msg=f"{name}() accepted True"):
                helper("X", heading_level=True)

    def test_field_without_control_id_generates_unique_ids(self) -> None:
        first = str(field(label="Email", help_text="a", control_html=ui_input()))
        second = str(field(label="Name", help_text="b", control_html=ui_input()))
        ids = re.findall(r'id="([^"]+)"', first) + re.findall(r'id="([^"]+)"', second)
        self.assertEqual(
            len(ids), len(set(ids)), f"duplicate DOM ids across two fields: {ids}"
        )

    def test_field_label_is_associated_with_its_control(self) -> None:
        html = str(field(label="Email", control_html=ui_input()))
        for_match = re.search(r'<label[^>]*\bfor="([^"]+)"', html)
        self.assertIsNotNone(
            for_match, "label has no for= attribute, so it labels nothing"
        )
        assert for_match is not None
        self.assertIn(
            f'id="{for_match.group(1)}"',
            html,
            "label points at an id that does not exist in the field",
        )

    def test_attribute_names_cannot_inject_markup(self) -> None:
        # Raise rather than silently drop: a malformed attribute name is a
        # programming error or an injection attempt, and both deserve to be
        # loud. Previously this spliced a live `onclick` handler into the tag.
        with self.assertRaises(ValueError):
            button("X", **{"onclick=alert(1) data-x": "y"})

    def test_ordinary_attribute_names_still_work(self) -> None:
        html = str(button("X", data_testid="save", aria_label="Save", hx_post="/x"))
        self.assertIn('data-testid="save"', html)
        self.assertIn('aria-label="Save"', html)
        self.assertIn('hx-post="/x"', html)

    def test_javascript_urls_are_neutralised(self) -> None:
        cases = {
            "button": str(button("X", href="javascript:alert(1)")),
            "breadcrumb": str(breadcrumb([("Home", "javascript:alert(1)")])),
            "navbar": str(navbar("B", brand_url="javascript:alert(1)")),
            "menu": str(menu([("Home", "javascript:alert(1)")])),
        }
        for name, html in cases.items():
            self.assertNotIn(
                "javascript:", html, f"{name}() emitted a javascript: URL: {html}"
            )

    def test_ordinary_urls_still_work(self) -> None:
        self.assertIn('href="/dashboard"', str(button("X", href="/dashboard")))
        self.assertIn(
            'href="https://example.com"', str(button("X", href="https://example.com"))
        )
        self.assertIn('href="mailto:a@b.co"', str(button("X", href="mailto:a@b.co")))


class TestSwitchAriaState(unittest.TestCase):
    """`switch()` must not server-render a state that goes stale on click.

    Measured in Chrome: after clicking, the control read `checked == True`
    while the attribute still said `aria-checked="false"`, so assistive
    technology announced "off" for a switch that was on. Nothing in
    `enhance.js` ever updated it (there is no switch handler at all).
    """

    def test_switch_does_not_emit_static_aria_checked(self) -> None:
        for checked in (True, False):
            html = str(switch(label="Notify", checked=checked))
            self.assertNotIn(
                "aria-checked",
                html,
                "server-rendered aria-checked goes stale the moment the user "
                f"toggles the control: {html}",
            )

    def test_switch_still_conveys_state_natively(self) -> None:
        self.assertIn("checked", str(switch(label="N", checked=True)))
        self.assertNotIn("checked", str(switch(label="N", checked=False)))
        self.assertIn('role="switch"', str(switch(label="N")))
