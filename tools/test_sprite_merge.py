"""Tests for sprite_merge.py — run with: python3 -m unittest discover -s tools"""

import os
import subprocess
import sys
import tempfile
import unittest

from PIL import Image

import sprite_merge


class SpriteMergeHelpersTest(unittest.TestCase):
    def test_extract_sprite_centers_a_non_square_alpha_crop(self):
        cell = Image.new("RGBA", (6, 6), (0, 0, 0, 0))
        cell.paste(Image.new("RGBA", (2, 4), (255, 0, 0, 255)), (2, 1))

        sprite = sprite_merge.extract_sprite(cell, 4)

        self.assertEqual(sprite.size, (4, 4))
        self.assertEqual(sprite.getpixel((0, 2))[3], 0)
        self.assertEqual(sprite.getpixel((1, 2)), (255, 0, 0, 255))
        self.assertEqual(sprite.getpixel((2, 2)), (255, 0, 0, 255))
        self.assertEqual(sprite.getpixel((3, 2))[3], 0)

    def test_extract_sprite_preserves_an_empty_cell_as_transparent(self):
        sprite = sprite_merge.extract_sprite(
            Image.new("RGBA", (3, 5), (40, 50, 60, 0)),
            4,
        )

        self.assertEqual(sprite.size, (4, 4))
        self.assertEqual(sprite.getbbox(), None)

    def test_build_spritesheet_lays_sprites_out_in_declaration_order(self):
        sprites = [
            Image.new("RGBA", (2, 2), (255, 0, 0, 255)),
            Image.new("RGBA", (2, 2), (0, 255, 0, 255)),
            Image.new("RGBA", (2, 2), (0, 0, 255, 255)),
        ]

        sheet = sprite_merge.build_spritesheet(sprites, 2)

        self.assertEqual(sheet.size, (4, 4))
        self.assertEqual(sheet.getpixel((0, 0)), (255, 0, 0, 255))
        self.assertEqual(sheet.getpixel((2, 0)), (0, 255, 0, 255))
        self.assertEqual(sheet.getpixel((0, 2)), (0, 0, 255, 255))
        self.assertEqual(sheet.getpixel((2, 2)), (0, 0, 0, 0))


class SpriteMergeCliValidationTest(unittest.TestCase):
    def test_cli_rejects_zero_sized_source_grid(self):
        with tempfile.TemporaryDirectory() as directory:
            source = os.path.join(directory, "source.png")
            Image.new("RGBA", (2, 2), (255, 255, 255, 255)).save(source)
            result = subprocess.run(
                [
                    sys.executable,
                    os.path.join(os.path.dirname(__file__), "sprite_merge.py"),
                    "--sheet",
                    f"{source}:0:1",
                    "--size",
                    "2",
                    "--dest",
                    os.path.join(directory, "output.png"),
                ],
                capture_output=True,
                text=True,
                check=False,
            )

        self.assertEqual(result.returncode, 1)
        self.assertIn("COLS and ROWS must be at least 1", result.stderr)

    def test_parse_sheet_spec_built_in_keywords(self):
        path, cols, rows = sprite_merge.parse_sheet_spec("transparent:4")
        self.assertEqual((path, cols, rows), ("transparent", 4, 1))

        path, cols, rows = sprite_merge.parse_sheet_spec("color(#ff0000)")
        self.assertEqual((path, cols, rows), ("color(#ff0000)", 1, 1))

    def test_load_sprites_from_sheet_built_in_keywords(self):
        sprites, empty_count = sprite_merge.load_sprites_from_sheet(
            "transparent", 3, 1, 16
        )
        self.assertEqual(len(sprites), 3)
        self.assertEqual(empty_count, 3)
        self.assertEqual(sprites[0].getpixel((0, 0)), (0, 0, 0, 0))

        sprites, empty_count = sprite_merge.load_sprites_from_sheet(
            "color(#00ff00)", 2, 1, 16
        )
        self.assertEqual(len(sprites), 2)
        self.assertEqual(empty_count, 0)
        self.assertEqual(sprites[0].getpixel((0, 0)), (0, 255, 0, 255))


if __name__ == "__main__":
    unittest.main()
