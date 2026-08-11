"""Tests for sprite_transition.py — run with: python3 -m unittest discover -s tools"""

import os
import subprocess
import sys
import tempfile
import unittest

import sprite_transition
from PIL import Image


def transition(
    kind: str,
    alt: Image.Image,
    start: int,
    end: int,
    **params: float,
) -> sprite_transition.TransitionSpec:
    return sprite_transition.TransitionSpec(kind, alt, start, end, params)


class SpriteTransitionHelpersTest(unittest.TestCase):
    def test_resize_to_square_centers_non_square_content_before_resizing(self):
        source = Image.new("RGBA", (2, 4), (255, 0, 0, 255))

        resized = sprite_transition.resize_to_square(source, 4)

        self.assertEqual(resized.size, (4, 4))
        self.assertEqual(resized.getpixel((0, 2))[3], 0)
        self.assertEqual(resized.getpixel((1, 2)), (255, 0, 0, 255))
        self.assertEqual(resized.getpixel((2, 2)), (255, 0, 0, 255))
        self.assertEqual(resized.getpixel((3, 2))[3], 0)

    def test_generate_frames_uses_transition_range_endpoints(self):
        base = Image.new("RGBA", (2, 2), (0, 0, 0, 0))
        red = Image.new("RGBA", (2, 2), (255, 0, 0, 255))
        frames = sprite_transition.generate_frames(
            base,
            [transition("fade", red, 1, 3, alpha_from=0, alpha_to=1)],
            4,
        )

        self.assertEqual(frames[0].getpixel((0, 0))[3], 0)
        self.assertEqual(frames[1].getpixel((0, 0))[3], 0)
        self.assertEqual(frames[2].getpixel((0, 0)), (255, 0, 0, 127))
        self.assertEqual(frames[3].getpixel((0, 0)), (255, 0, 0, 255))

    def test_generate_frames_composites_later_transitions_on_top(self):
        transparent = Image.new("RGBA", (2, 2), (0, 0, 0, 0))
        red = Image.new("RGBA", (2, 2), (255, 0, 0, 255))
        blue = Image.new("RGBA", (2, 2), (0, 0, 255, 255))
        frames = sprite_transition.generate_frames(
            transparent,
            [
                transition("fade", red, 0, 1, alpha_from=1, alpha_to=1),
                transition("fade", blue, 0, 1, alpha_from=1, alpha_to=1),
            ],
            2,
        )

        self.assertEqual(frames[0].getpixel((0, 0)), (0, 0, 255, 255))

    def test_oversized_scale_is_cropped_to_the_frame(self):
        green = Image.new("RGBA", (4, 4), (0, 255, 0, 255))

        overlay = sprite_transition.overlay_scale(green, 1, 1, 2)

        self.assertEqual(overlay.size, (4, 4))
        self.assertEqual(overlay.getpixel((0, 0)), (0, 255, 0, 255))
        self.assertEqual(overlay.getpixel((3, 3)), (0, 255, 0, 255))


class SpriteTransitionCliValidationTest(unittest.TestCase):
    def test_cli_rejects_a_transition_range_past_the_last_frame(self):
        with tempfile.TemporaryDirectory() as directory:
            base = os.path.join(directory, "base.png")
            alt = os.path.join(directory, "alt.png")
            output = os.path.join(directory, "output.png")
            Image.new("RGBA", (2, 2), (0, 0, 0, 0)).save(base)
            Image.new("RGBA", (2, 2), (255, 0, 0, 255)).save(alt)
            result = subprocess.run(
                [
                    sys.executable,
                    os.path.join(os.path.dirname(__file__), "sprite_transition.py"),
                    "--base",
                    base,
                    "--frames",
                    "2",
                    "--size",
                    "2",
                    "--transition",
                    f"fade:{alt}:0:2:0:1",
                    "--dest",
                    output,
                ],
                capture_output=True,
                text=True,
                check=False,
            )

        self.assertEqual(result.returncode, 1)
        self.assertIn("transition end frame 2 exceeds --frames 2", result.stderr)

    def test_resolve_source_image_built_in_keywords(self):
        transparent = sprite_transition.resolve_source_image("transparent", 16)
        self.assertEqual(transparent.size, (16, 16))
        self.assertEqual(transparent.getpixel((0, 0)), (0, 0, 0, 0))

        red = sprite_transition.resolve_source_image("color(#ff0000)", 16)
        self.assertEqual(red.getpixel((0, 0)), (255, 0, 0, 255))

        green = sprite_transition.resolve_source_image("#00ff00", 16)
        self.assertEqual(green.getpixel((0, 0)), (0, 255, 0, 255))

    def test_parse_transition_auto_rejoins_color_hex(self):
        spec = sprite_transition.parse_transition("fade:color:#0000ff:0:5:0:1", 8)
        self.assertEqual(spec.kind, "fade")
        self.assertEqual(spec.start, 0)
        self.assertEqual(spec.end, 5)
        self.assertEqual(spec.alt.getpixel((0, 0)), (0, 0, 255, 255))

    def test_cli_optional_base_and_keyword_transition(self):
        with tempfile.TemporaryDirectory() as directory:
            output = os.path.join(directory, "output.png")
            result = subprocess.run(
                [
                    sys.executable,
                    os.path.join(os.path.dirname(__file__), "sprite_transition.py"),
                    "--frames",
                    "2",
                    "--size",
                    "4",
                    "--transition",
                    "fade:color(#ff0000):0:1:1:1",
                    "--dest",
                    output,
                ],
                capture_output=True,
                text=True,
                check=False,
            )
            self.assertEqual(result.returncode, 0, result.stderr)
            out_img = Image.open(output)
            self.assertEqual(out_img.getpixel((0, 0)), (255, 0, 0, 255))


if __name__ == "__main__":
    unittest.main()
