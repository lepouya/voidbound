import os
import shutil
import tempfile
import unittest

import svg_rasterize
import svg_ui_gen
from PIL import Image

# Rasterizer error-path behavior (missing binary, failed exit code, missing
# output file) is shared by every svg_*_gen.py script via svg_rasterize.py —
# see test_svg_rasterize.py, which covers it once for every consumer.


class TestSvgUiGen(unittest.TestCase):
    def setUp(self):
        self.test_dir = tempfile.mkdtemp()
        self.svg_path = os.path.join(self.test_dir, "test_icon.svg")
        self.png_path = os.path.join(self.test_dir, "output_icon.png")
        with open(self.svg_path, "w", encoding="utf-8") as f:
            f.write(
                '<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64">'
                '<circle cx="32" cy="32" r="30" fill="#COLOR1" stroke="#COLOR2" stroke-width="4"/>'
                "</svg>"
            )

    def tearDown(self):
        shutil.rmtree(self.test_dir, ignore_errors=True)

    def test_color_parsing(self):
        self.assertEqual(svg_ui_gen.parse_hex_color("#FFFFFF"), (255, 255, 255))
        self.assertEqual(svg_ui_gen.parse_hex_color("00FFFF"), (0, 255, 255))
        self.assertEqual(svg_ui_gen.parse_hex_color("#FFF"), (255, 255, 255))

    def test_compute_active_color(self):
        active = svg_ui_gen.compute_active_color("#808080")
        self.assertTrue(active.startswith("#"))
        self.assertNotEqual(active, "#808080")

    @unittest.skipUnless(
        svg_rasterize.find_rsvg_convert(),
        "rsvg-convert is intentionally absent; install librsvg to run SVG rendering tests",
    )
    def test_process_svg_states(self):
        sprites = svg_ui_gen.process_svg_states(
            self.svg_path,
            "#FFFFFF",
            "#00d2ff",
            "#FFFFFF",
            "#00ffff",
            "#888888",
            "#005577",
            64,
            self.test_dir,
        )
        self.assertEqual(len(sprites), 3)
        for s in sprites:
            self.assertEqual(s.size, (64, 64))

    @unittest.skipUnless(
        svg_rasterize.find_rsvg_convert(),
        "rsvg-convert is intentionally absent; install librsvg to run SVG rendering tests",
    )
    def test_process_svg_states_respects_num_states(self):
        sprites = svg_ui_gen.process_svg_states(
            self.svg_path,
            "#FFFFFF",
            "#00d2ff",
            "#FFFFFF",
            "#00ffff",
            "#888888",
            "#005577",
            64,
            self.test_dir,
            num_states=1,
        )
        self.assertEqual(len(sprites), 1)

    def test_build_compact_sheet(self):
        sprites = [Image.new("RGBA", (64, 64), (255, 0, 0, 255))] * 3
        sheet = svg_ui_gen.build_compact_sheet(sprites, 3, 1, 64)
        self.assertEqual(sheet.size, (192, 64))


if __name__ == "__main__":
    unittest.main()
