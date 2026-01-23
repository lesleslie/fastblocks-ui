import unittest
import os
import tempfile
import fastbulma
from fastbulma.cli import copy_assets


class TestFastBulma(unittest.TestCase):
    def test_version(self):
        """Test that the package has a version."""
        self.assertTrue(hasattr(fastbulma, '__version__'))
        self.assertIsInstance(fastbulma.__version__, str)
        self.assertEqual(fastbulma.__version__, "0.1.0")

    def test_author_info(self):
        """Test that author and license info is defined."""
        self.assertTrue(hasattr(fastbulma, '__author__'))
        self.assertTrue(hasattr(fastbulma, '__license__'))
        self.assertEqual(fastbulma.__license__, "MIT")

    def test_static_paths(self):
        """Test that static asset paths exist."""
        css_path = fastbulma.get_css_path()
        js_path = fastbulma.get_js_path()
        static_path = fastbulma.get_static_path()

        # Check that paths are formed correctly (not necessarily that files exist)
        self.assertIn('css', css_path)
        self.assertIn('fastbulma.css', css_path)
        self.assertIn('js', js_path)
        self.assertIn('fastbulma.js', js_path)
        self.assertIn('static', static_path)

    def test_static_files_exist(self):
        """Test that static files actually exist."""
        css_path = fastbulma.get_css_path()
        js_path = fastbulma.get_js_path()

        self.assertTrue(os.path.exists(css_path), f"CSS file does not exist: {css_path}")
        self.assertTrue(os.path.exists(js_path), f"JS file does not exist: {js_path}")

    def test_cli_copy_assets(self):
        """Test the CLI copy assets functionality."""
        with tempfile.TemporaryDirectory() as temp_dir:
            # Copy assets to temporary directory
            copy_assets(temp_dir)

            # Check that the assets were copied
            copied_css_path = os.path.join(temp_dir, 'static', 'fastbulma', 'css', 'fastbulma.css')
            copied_js_path = os.path.join(temp_dir, 'static', 'fastbulma', 'js', 'fastbulma.js')

            self.assertTrue(os.path.exists(copied_css_path), f"Copied CSS file does not exist: {copied_css_path}")
            self.assertTrue(os.path.exists(copied_js_path), f"Copied JS file does not exist: {copied_js_path}")


class TestFastBulmaCSS(unittest.TestCase):
    def setUp(self):
        """Set up test fixtures before each test method."""
        self.css_path = fastbulma.get_css_path()

    def test_css_contains_expected_variables(self):
        """Test that the CSS contains expected Bulma variables."""
        with open(self.css_path, 'r', encoding='utf-8') as f:
            css_content = f.read()

        # Check for key Bulma variables
        expected_vars = [
            '--bulma-primary',
            '--bulma-success',
            '--bulma-warning',
            '--bulma-danger',
            '--bulma-radius',
            '--bulma-size-normal'
        ]

        for var in expected_vars:
            with self.subTest(variable=var):
                self.assertIn(var, css_content, f"Expected variable {var} not found in CSS")

    def test_css_contains_fast_layer(self):
        """Test that the CSS contains the @layer fast directive."""
        with open(self.css_path, 'r', encoding='utf-8') as f:
            css_content = f.read()

        self.assertIn('@layer fast', css_content, "Expected @layer fast directive not found in CSS")


class TestFastBulmaJS(unittest.TestCase):
    def setUp(self):
        """Set up test fixtures before each test method."""
        self.js_path = fastbulma.get_js_path()

    def test_js_contains_error_boundary_class(self):
        """Test that the JS contains the FastBulmaErrorBoundary class."""
        with open(self.js_path, 'r', encoding='utf-8') as f:
            js_content = f.read()

        self.assertIn('FastBulmaErrorBoundary', js_content,
                     "Expected FastBulmaErrorBoundary class not found in JS")
        self.assertIn('handleComponentError', js_content,
                     "Expected handleComponentError method not found in JS")
        self.assertIn('safeRegister', js_content,
                     "Expected safeRegister method not found in JS")

    def test_js_contains_fastbulma_class(self):
        """Test that the JS contains the FastBulma class."""
        with open(self.js_path, 'r', encoding='utf-8') as f:
            js_content = f.read()

        self.assertIn('class FastBulma', js_content,
                     "Expected FastBulma class not found in JS")
        self.assertIn('init()', js_content,
                     "Expected init method not found in JS")
        self.assertIn('setCSSVariable', js_content,
                     "Expected setCSSVariable method not found in JS")


if __name__ == '__main__':
    unittest.main()
