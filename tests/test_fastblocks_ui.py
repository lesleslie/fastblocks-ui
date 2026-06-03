import os
import subprocess
import sys
import tempfile
import tomllib
import unittest
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
    compose,
    dialog,
    field,
    fragment,
    menu,
    navbar,
    pagination,
    progress,
    stable_id,
    switch,
    table,
    tabs,
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

    def test_bundle_declares_explicit_layer_order(self):
        with open(fastblocks_ui.get_css_path(), encoding="utf-8") as handle:
            content = handle.read()
        self.assertIn("@layer components, tokens, theme, base, utilities;", content)


class TestDocumentationConsistency(unittest.TestCase):
    def test_active_guidance_does_not_describe_legacy_fast_runtime(self):
        repo_root = Path(__file__).resolve().parents[1]
        active_paths = [
            repo_root / "QWEN.md",
            repo_root / "RULES.md",
            repo_root / "scripts" / "generate-docs.py",
            repo_root / "scripts" / "generate-tests.py",
            repo_root / "scripts" / "generate-css-variables.py",
        ]
        forbidden_phrases = [
            "Microsoft's " + "FAST",
            "FAST " + "components",
            "Fluent" + "-backed",
            "provide" + "FASTDesignSystem",
            "register" + "ComponentsInDOM",
            "fast" + "-button",
            "fast" + "-text-field",
            "Shadow DOM " + "Encapsulation",
        ]

        for path in active_paths:
            content = path.read_text(encoding="utf-8")
            for phrase in forbidden_phrases:
                self.assertNotIn(phrase, content, f"{phrase!r} found in {path}")

    def test_package_metadata_does_not_claim_web_components_runtime(self):
        repo_root = Path(__file__).resolve().parents[1]
        pyproject = tomllib.loads((repo_root / "pyproject.toml").read_text())

        self.assertNotIn("web" + "-components", pyproject["project"]["keywords"])
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
        self.assertIn('aria-checked="true"', switch_markup)
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
