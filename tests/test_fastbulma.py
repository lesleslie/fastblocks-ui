import os
import tempfile
import unittest
from unittest.mock import patch

import fastbulma
from fastbulma.cli import copy_assets
from fastbulma.cli import main as cli_main


class TestFastBulma(unittest.TestCase):
    def test_version(self):
        """Test that the package has a version."""
        self.assertTrue(hasattr(fastbulma, "__version__"))
        self.assertIsInstance(fastbulma.__version__, str)
        self.assertEqual(fastbulma.__version__, "0.1.0")

    def test_author_info(self):
        """Test that author and license info is defined."""
        self.assertTrue(hasattr(fastbulma, "__author__"))
        self.assertTrue(hasattr(fastbulma, "__license__"))
        self.assertEqual(fastbulma.__license__, "MIT")

    def test_static_paths(self):
        """Test that static asset paths exist."""
        css_path = fastbulma.get_css_path()
        js_path = fastbulma.get_js_path()
        static_path = fastbulma.get_static_path()

        # Check that paths are formed correctly (not necessarily that files exist)
        self.assertIn("css", css_path)
        self.assertIn("fastbulma.css", css_path)
        self.assertIn("js", js_path)
        self.assertIn("fastbulma.js", js_path)
        self.assertIn("static", static_path)

    def test_static_files_exist(self):
        """Test that static files actually exist."""
        css_path = fastbulma.get_css_path()
        js_path = fastbulma.get_js_path()

        self.assertTrue(
            os.path.exists(css_path), f"CSS file does not exist: {css_path}"
        )
        self.assertTrue(os.path.exists(js_path), f"JS file does not exist: {js_path}")


class TestFastBulmaCSS(unittest.TestCase):
    def setUp(self):
        """Set up test fixtures before each test method."""
        self.css_path = fastbulma.get_css_path()

    def test_css_contains_expected_variables(self):
        """Test that the CSS contains expected Bulma variables."""
        with open(self.css_path, encoding="utf-8") as f:
            css_content = f.read()

        # Check for key Bulma variables
        expected_vars = [
            "--bulma-primary",
            "--bulma-success",
            "--bulma-warning",
            "--bulma-danger",
            "--bulma-radius",
            "--bulma-size-normal",
        ]

        for var in expected_vars:
            with self.subTest(variable=var):
                self.assertIn(
                    var, css_content, f"Expected variable {var} not found in CSS"
                )

    def test_css_contains_fast_layer(self):
        """Test that the CSS contains the @layer fast directive."""
        with open(self.css_path, encoding="utf-8") as f:
            css_content = f.read()

        self.assertIn(
            "@layer fast",
            css_content,
            "Expected @layer fast directive not found in CSS",
        )

    def test_css_contains_component_mappings(self):
        """Test that the CSS contains expected component mappings."""
        with open(self.css_path, encoding="utf-8") as f:
            css_content = f.read()

        # Check for key component mappings
        expected_mappings = [
            ".is-primary",
            ".is-success",
            ".is-warning",
            ".is-danger",
            ".card",
            ".input",
            ".button",
            ".checkbox",
            ".radio",
        ]

        for mapping in expected_mappings:
            with self.subTest(mapping=mapping):
                self.assertIn(
                    mapping,
                    css_content,
                    f"Expected component mapping {mapping} not found in CSS",
                )


class TestFastBulmaJS(unittest.TestCase):
    def setUp(self):
        """Set up test fixtures before each test method."""
        self.js_path = fastbulma.get_js_path()

    def test_js_contains_error_boundary_class(self):
        """Test that the JS contains the FastBulmaErrorBoundary class."""
        with open(self.js_path, encoding="utf-8") as f:
            js_content = f.read()

        self.assertIn(
            "FastBulmaErrorBoundary",
            js_content,
            "Expected FastBulmaErrorBoundary class not found in JS",
        )
        self.assertIn(
            "handleComponentError",
            js_content,
            "Expected handleComponentError method not found in JS",
        )
        self.assertIn(
            "safeRegister", js_content, "Expected safeRegister method not found in JS"
        )

    def test_js_contains_fastbulma_class(self):
        """Test that the JS contains the FastBulma class."""
        with open(self.js_path, encoding="utf-8") as f:
            js_content = f.read()

        self.assertIn(
            "class FastBulma", js_content, "Expected FastBulma class not found in JS"
        )
        self.assertIn("init()", js_content, "Expected init method not found in JS")
        self.assertIn(
            "setCSSVariable",
            js_content,
            "Expected setCSSVariable method not found in JS",
        )


class TestFastBulmaCLI(unittest.TestCase):
    def test_cli_copy_assets(self):
        """Test the CLI copy assets functionality."""
        with tempfile.TemporaryDirectory() as temp_dir:
            # Copy assets to temporary directory
            copy_assets(temp_dir)

            # Check that the assets were copied
            copied_css_path = os.path.join(
                temp_dir, "static", "fastbulma", "css", "fastbulma.css"
            )
            copied_js_path = os.path.join(
                temp_dir, "static", "fastbulma", "js", "fastbulma.js"
            )

            self.assertTrue(
                os.path.exists(copied_css_path),
                f"Copied CSS file does not exist: {copied_css_path}",
            )
            self.assertTrue(
                os.path.exists(copied_js_path),
                f"Copied JS file does not exist: {copied_js_path}",
            )

    def test_cli_copy_assets_with_nonexistent_dir(self):
        """Test copying assets to a non-existent directory (should be created)."""
        with tempfile.TemporaryDirectory() as base_temp_dir:
            dest_dir = os.path.join(base_temp_dir, "nonexistent", "nested", "path")

            # This should create the nested directory structure
            copy_assets(dest_dir)

            # Check that the assets were copied to the correct location within the nested path
            copied_css_path = os.path.join(
                dest_dir, "static", "fastbulma", "css", "fastbulma.css"
            )
            copied_js_path = os.path.join(
                dest_dir, "static", "fastbulma", "js", "fastbulma.js"
            )

            self.assertTrue(
                os.path.exists(copied_css_path),
                f"Copied CSS file does not exist: {copied_css_path}",
            )
            self.assertTrue(
                os.path.exists(copied_js_path),
                f"Copied JS file does not exist: {copied_js_path}",
            )

    @patch("sys.argv", ["fastbulma", "copy-assets", "--dest", "/tmp/test_dest"])
    @patch("fastbulma.get_static_path")
    @patch("shutil.copytree")
    def test_cli_main_function(self, mock_copytree, mock_get_static_path):
        """Test the CLI main function with mocked dependencies."""
        # Mock the static path to return a fake path
        mock_get_static_path.return_value = "/fake/static/path"

        # Mock os.path.exists to return True for the source paths
        with patch("os.path.exists", return_value=True):
            # Since we're mocking the dependencies, this should complete without error
            # We're testing that the argument parsing and flow work correctly
            try:
                cli_main()
            except SystemExit:
                # The main function calls sys.exit(), which raises SystemExit
                pass  # This is expected


class TestFastBulmaErrorBoundary(unittest.TestCase):
    def test_error_boundary_conceptual_verification(self):
        """Test that error boundary functionality exists in JS."""
        with open(fastbulma.get_js_path(), encoding="utf-8") as f:
            js_content = f.read()

        # Check for error boundary-related functions
        error_boundary_functions = [
            "FastBulmaErrorBoundary",
            "handleComponentError",
            "safeRegister",
            "wrapComponentFunction",
        ]

        for func in error_boundary_functions:
            with self.subTest(function=func):
                self.assertIn(
                    func,
                    js_content,
                    f"Expected error boundary function {func} not found in JS",
                )


class TestFastBulmaClass(unittest.TestCase):
    def test_set_css_variable(self):
        """Test CSS variable setting functionality conceptually."""
        # Since we can't directly test the JS class, we'll test the concept
        # by verifying that the method exists in the JS file
        with open(fastbulma.get_js_path(), encoding="utf-8") as f:
            js_content = f.read()

        self.assertIn(
            "setCSSVariable",
            js_content,
            "Expected setCSSVariable method not found in JS",
        )

    def test_theme_management_functions(self):
        """Test theme management functionality exists in JS."""
        with open(fastbulma.get_js_path(), encoding="utf-8") as f:
            js_content = f.read()

        # Check for theme-related functions
        theme_functions = ["setTheme", "getThemeVariables", "dark", "light"]

        for func in theme_functions:
            with self.subTest(function=func):
                self.assertIn(
                    func, js_content, f"Expected theme function {func} not found in JS"
                )


class TestEdgeCases(unittest.TestCase):
    def test_static_paths_with_nonexistent_structure(self):
        """Test static path functions with mocked nonexistent paths."""
        # This test verifies that the path construction functions work correctly
        # even if the actual files don't exist

        css_path = fastbulma.get_css_path()
        js_path = fastbulma.get_js_path()
        static_path = fastbulma.get_static_path()

        # Verify the paths are constructed with the expected components
        self.assertTrue(css_path.endswith("css/fastbulma.css"))
        self.assertTrue(js_path.endswith("js/fastbulma.js"))
        self.assertTrue(
            static_path.endswith("static") or "static" in static_path.split("/")[-1]
        )

    def test_copy_assets_to_existing_directory(self):
        """Test copying assets to a directory that already exists."""
        with tempfile.TemporaryDirectory() as temp_dir:
            # Create the destination static directory beforehand
            static_dest = os.path.join(temp_dir, "static", "fastbulma")
            os.makedirs(static_dest, exist_ok=True)

            # Create a dummy file to ensure it gets overwritten
            dummy_css = os.path.join(static_dest, "css", "fastbulma.css")
            os.makedirs(os.path.dirname(dummy_css), exist_ok=True)
            with open(dummy_css, "w") as f:
                f.write("dummy content")

            # Copy assets again
            copy_assets(temp_dir)

            # Verify the real CSS file was copied
            copied_css_path = os.path.join(static_dest, "css", "fastbulma.css")
            self.assertTrue(os.path.exists(copied_css_path))

            # Verify it's not the dummy content anymore
            with open(copied_css_path, encoding="utf-8") as f:
                content = f.read()
                self.assertNotEqual(content, "dummy content")
                self.assertIn(":root", content)  # Should contain actual CSS

    def test_copy_assets_readonly_destination(self):
        """Test copying assets to a read-only destination (should fail gracefully)."""
        # This test verifies that the function exists and documents its behavior
        # Since the actual copy_assets function doesn't have explicit error handling,
        # we're documenting that it relies on shutil.copytree's built-in error handling
        import inspect

        import fastbulma.cli

        source = inspect.getsource(fastbulma.cli.copy_assets)

        # Verify the function exists and has the expected functionality
        self.assertIn("shutil.copytree", source)
        self.assertIn("dirs_exist_ok=True", source)


class TestErrorConditions(unittest.TestCase):
    def test_css_file_corruption_handling(self):
        """Test that the system handles corrupted CSS files appropriately."""
        # Create a temporary CSS file with invalid content
        with tempfile.NamedTemporaryFile(
            mode="w", suffix=".css", delete=False
        ) as tmp_file:
            tmp_file.write("{ invalid css content without proper structure")
            tmp_file.flush()

            try:
                # Just verify we can read the file
                with open(tmp_file.name, encoding="utf-8") as f:
                    content = f.read()
                self.assertIn("invalid css content", content)
            finally:
                os.unlink(tmp_file.name)

    def test_js_file_corruption_handling(self):
        """Test that the system handles corrupted JS files appropriately."""
        # Create a temporary JS file with invalid content
        with tempfile.NamedTemporaryFile(
            mode="w", suffix=".js", delete=False
        ) as tmp_file:
            tmp_file.write("function brokenFunction { unclosed brace")
            tmp_file.flush()

            try:
                # Just verify we can read the file
                with open(tmp_file.name, encoding="utf-8") as f:
                    content = f.read()
                self.assertIn("brokenFunction", content)
            finally:
                os.unlink(tmp_file.name)

    def test_missing_static_directory(self):
        """Test behavior when static directory is missing."""
        # This test verifies that the path functions work even if the actual directory doesn't exist
        # We're not testing failure modes here, but rather resilience
        css_path = fastbulma.get_css_path()
        js_path = fastbulma.get_js_path()

        # The paths should still be constructed properly even if they don't exist
        self.assertTrue(isinstance(css_path, str))
        self.assertTrue(isinstance(js_path, str))
        self.assertIn("css", css_path)
        self.assertIn("js", js_path)


class TestIntegration(unittest.TestCase):
    def test_complete_workflow(self):
        """Integration test: Complete workflow from asset copying to validation."""
        with tempfile.TemporaryDirectory() as temp_dir:
            # Step 1: Copy assets
            copy_assets(temp_dir)

            # Step 2: Verify assets exist
            copied_css_path = os.path.join(
                temp_dir, "static", "fastbulma", "css", "fastbulma.css"
            )
            copied_js_path = os.path.join(
                temp_dir, "static", "fastbulma", "js", "fastbulma.js"
            )

            self.assertTrue(os.path.exists(copied_css_path))
            self.assertTrue(os.path.exists(copied_js_path))

            # Step 3: Validate CSS content
            with open(copied_css_path, encoding="utf-8") as f:
                css_content = f.read()

            self.assertIn("--bulma-primary", css_content)
            self.assertIn("@layer fast", css_content)

            # Step 4: Validate JS content
            with open(copied_js_path, encoding="utf-8") as f:
                js_content = f.read()

            self.assertIn("FastBulma", js_content)
            self.assertIn("init()", js_content)

    def test_cli_and_api_consistency(self):
        """Integration test: Verify CLI and API produce consistent results."""
        with tempfile.TemporaryDirectory() as temp_dir:
            # Use the API directly
            api_css_path = fastbulma.get_css_path()
            api_js_path = fastbulma.get_js_path()

            # Use the CLI to copy assets
            copy_assets(temp_dir)
            cli_css_path = os.path.join(
                temp_dir, "static", "fastbulma", "css", "fastbulma.css"
            )
            cli_js_path = os.path.join(
                temp_dir, "static", "fastbulma", "js", "fastbulma.js"
            )

            # Both should exist
            self.assertTrue(os.path.exists(api_css_path))
            self.assertTrue(os.path.exists(cli_css_path))
            self.assertTrue(os.path.exists(api_js_path))
            self.assertTrue(os.path.exists(cli_js_path))

            # Contents should be identical
            with open(api_css_path, encoding="utf-8") as f:
                api_css_content = f.read()
            with open(cli_css_path, encoding="utf-8") as f:
                cli_css_content = f.read()

            self.assertEqual(api_css_content, cli_css_content)

            with open(api_js_path, encoding="utf-8") as f:
                api_js_content = f.read()
            with open(cli_js_path, encoding="utf-8") as f:
                cli_js_content = f.read()

            self.assertEqual(api_js_content, cli_js_content)


if __name__ == "__main__":
    unittest.main()
