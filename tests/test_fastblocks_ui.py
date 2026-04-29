import os
import tempfile
import unittest
from importlib.resources import files
from unittest.mock import patch

import fastblocks_ui
from fastblocks_ui import (
    alert,
    block,
    button,
    card,
    checkbox,
    compose,
    dialog,
    field,
    fragment,
    menu,
    stable_id,
    switch,
    tabs,
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
        self.assertEqual(fastblocks_ui.__version__, "0.3.0")
        self.assertEqual(fastblocks_ui.__license__, "BSD-3-Clause")
        self.assertEqual(fastblocks_ui.__author__, "FastBlocks UI Team")

    def test_public_paths(self):
        self.assertTrue(fastblocks_ui.get_static_path().endswith("static"))
        self.assertTrue(fastblocks_ui.get_css_path().endswith("css/fastblocks-ui.css"))
        self.assertTrue(fastblocks_ui.get_js_path().endswith("js/fastblocks-ui.js"))

    def test_package_resources_exist(self):
        self.assertTrue(files(fastblocks_ui).joinpath("static/css/fastblocks-ui.css").is_file())
        self.assertTrue(files(fastblocks_ui).joinpath("static/js/fastblocks-ui.js").is_file())
        self.assertTrue(files(fastblocks_ui).joinpath("static/js/enhance.js").is_file())


class TestFoundationCSS(unittest.TestCase):
    def test_css_entrypoint_imports_layers(self):
        with open(fastblocks_ui.get_css_path(), encoding="utf-8") as handle:
            content = handle.read()

        for statement in (
            '@import "./tokens.css";',
            '@import "./themes/default.css";',
            '@import "./themes/dark.css";',
            '@import "./base.css";',
            '@import "./utilities.css";',
            '@import "./components.css";',
        ):
            self.assertIn(statement, content)

    def test_tokens_and_components_define_core_surface(self):
        tokens_path = os.path.join(os.path.dirname(fastblocks_ui.get_css_path()), "tokens.css")
        components_path = os.path.join(os.path.dirname(fastblocks_ui.get_css_path()), "components.css")

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
        self.assertIn('class="ui-input" type="text" placeholder="Name &quot;tag&quot;"', markup)
        self.assertIn('for="email"', markup)
        self.assertIn('aria-describedby="email-help"', markup)

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

    def test_tabs_emit_accessible_markup(self):
        markup = tabs(
            [("profile", "Profile", "<p>Profile</p>"), ("billing", "Billing", "<p>Billing</p>")],
            active_id="billing",
        )
        self.assertIn('role="tab"', markup)
        self.assertIn('role="tabpanel"', markup)
        self.assertIn('aria-controls="profile-panel"', markup)
        self.assertIn('aria-labelledby="profile"', markup)
        self.assertIn('data-ui-tab-target="#billing-panel"', markup)


class TestFastBlocksIntegration(unittest.TestCase):
    def test_stable_id_compose_fragment_and_block(self):
        self.assertEqual(stable_id("Profile", "Card"), stable_id(" profile ", "card"))
        self.assertTrue(stable_id("Profile", "Card").startswith("fb-"))

        preview = compose(button("Edit"), button("Delete"))
        self.assertIn('<button class="ui-button" type="button">Edit</button>', preview)

        fragment_markup = fragment(button("Save"), fragment_id="save-fragment", class_="tone")
        block_markup = block(preview, block_id="actions")

        self.assertIn('data-fastblocks-fragment="true"', fragment_markup)
        self.assertIn('data-fastblocks-block="true"', block_markup)
        self.assertIn('class="ui-fragment tone"', fragment_markup)
        self.assertIn('class="ui-block"', block_markup)


class TestCLI(unittest.TestCase):
    def test_copy_assets_writes_to_fastblocks_ui_directory(self):
        with tempfile.TemporaryDirectory() as temp_dir:
            copy_assets(temp_dir)

            css_path = os.path.join(temp_dir, "fastblocks-ui", "css", "fastblocks-ui.css")
            js_path = os.path.join(temp_dir, "fastblocks-ui", "js", "fastblocks-ui.js")
            enhance_path = os.path.join(temp_dir, "fastblocks-ui", "js", "enhance.js")

            self.assertTrue(os.path.exists(css_path))
            self.assertTrue(os.path.exists(js_path))
            self.assertTrue(os.path.exists(enhance_path))

    @patch("sys.argv", ["fastblocks-ui", "copy-assets", "--dest", "/tmp/test_dest"])
    @patch("fastblocks_ui.get_static_path")
    @patch("shutil.copytree")
    def test_cli_main_function(self, mock_copytree, mock_get_static_path):
        mock_get_static_path.return_value = "/fake/static/path"

        with patch("os.path.exists", return_value=True):
            try:
                cli_main()
            except SystemExit:
                pass

        self.assertTrue(mock_copytree.called)


if __name__ == "__main__":
    unittest.main()
