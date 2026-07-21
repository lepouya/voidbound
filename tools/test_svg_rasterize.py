import os
import shutil
import tempfile
import unittest
from unittest.mock import patch

import svg_rasterize


SIMPLE_SVG = (
    '<svg xmlns="http://www.w3.org/2000/svg" width="8" height="8">'
    '<rect width="8" height="8" fill="#ff0000"/>'
    "</svg>"
)


class TestSvgRasterize(unittest.TestCase):
    def setUp(self):
        self.test_dir = tempfile.mkdtemp()

    def tearDown(self):
        shutil.rmtree(self.test_dir, ignore_errors=True)

    @unittest.skipUnless(
        svg_rasterize.find_rsvg_convert(),
        "rsvg-convert is intentionally absent; install librsvg to run SVG rendering tests",
    )
    def test_render_svg_string_to_image_produces_exact_dimensions(self):
        img = svg_rasterize.render_svg_string_to_image(
            SIMPLE_SVG, 32, 32, self.test_dir
        )
        self.assertEqual(img.size, (32, 32))
        self.assertEqual(img.mode, "RGBA")

    @unittest.skipUnless(
        svg_rasterize.find_rsvg_convert(),
        "rsvg-convert is intentionally absent; install librsvg to run SVG rendering tests",
    )
    def test_render_svg_file_to_image_produces_exact_dimensions(self):
        svg_path = os.path.join(self.test_dir, "test.svg")
        with open(svg_path, "w", encoding="utf-8") as f:
            f.write(SIMPLE_SVG)
        img = svg_rasterize.render_svg_file_to_image(svg_path, 16, 16, self.test_dir)
        self.assertEqual(img.size, (16, 16))

    @unittest.skipUnless(
        svg_rasterize.find_rsvg_convert(),
        "rsvg-convert is intentionally absent; install librsvg to run SVG rendering tests",
    )
    def test_render_svg_string_to_image_cleans_up_temp_files(self):
        svg_rasterize.render_svg_string_to_image(SIMPLE_SVG, 16, 16, self.test_dir)
        self.assertEqual(os.listdir(self.test_dir), [])

    def test_missing_rasterizer_explains_how_to_install_it(self):
        with patch("svg_rasterize.find_rsvg_convert", return_value=None):
            with self.assertRaisesRegex(RuntimeError, "brew install librsvg"):
                svg_rasterize.render_svg_string_to_image(
                    SIMPLE_SVG, 16, 16, self.test_dir
                )

    def test_missing_rasterizer_also_covers_the_file_based_entry_point(self):
        with patch("svg_rasterize.find_rsvg_convert", return_value=None):
            with self.assertRaisesRegex(RuntimeError, "brew install librsvg"):
                svg_rasterize.render_svg_file_to_image(
                    "unused.svg", 16, 16, self.test_dir
                )

    def test_rasterizer_failure_preserves_stderr(self):
        failed = svg_rasterize.subprocess.CompletedProcess(
            args=["rsvg-convert"],
            returncode=1,
            stdout="",
            stderr="invalid SVG input",
        )
        with patch("svg_rasterize.find_rsvg_convert", return_value="rsvg-convert"):
            with patch("svg_rasterize.subprocess.run", return_value=failed):
                with self.assertRaisesRegex(RuntimeError, "invalid SVG input"):
                    svg_rasterize.render_svg_string_to_image(
                        SIMPLE_SVG, 16, 16, self.test_dir
                    )

    def test_successful_exit_without_output_file_is_reported(self):
        # A renderer that exits 0 but never writes the PNG (e.g. an
        # unsupported rsvg-convert build) must not be mistaken for success.
        ok = svg_rasterize.subprocess.CompletedProcess(
            args=["rsvg-convert"], returncode=0, stdout="", stderr=""
        )
        with patch("svg_rasterize.find_rsvg_convert", return_value="rsvg-convert"):
            with patch("svg_rasterize.subprocess.run", return_value=ok):
                with self.assertRaisesRegex(RuntimeError, "did not produce a PNG"):
                    svg_rasterize.render_svg_string_to_image(
                        SIMPLE_SVG, 16, 16, self.test_dir
                    )

    def test_find_rsvg_convert_falls_back_to_common_install_prefixes(self):
        with patch("svg_rasterize.shutil.which", return_value=None):
            with patch("svg_rasterize.os.path.isfile", return_value=True):
                with patch("svg_rasterize.os.access", return_value=True):
                    self.assertEqual(
                        svg_rasterize.find_rsvg_convert(),
                        svg_rasterize._FALLBACK_PATHS[0],
                    )

    def test_find_rsvg_convert_returns_none_when_nothing_is_found(self):
        with patch("svg_rasterize.shutil.which", return_value=None):
            with patch("svg_rasterize.os.path.isfile", return_value=False):
                self.assertIsNone(svg_rasterize.find_rsvg_convert())


if __name__ == "__main__":
    unittest.main()
