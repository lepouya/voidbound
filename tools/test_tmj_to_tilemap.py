#!/usr/bin/env python3
"""Tests for tmj_to_tilemap.py — run with: python3 -m unittest discover -s tools"""

import json
import io
import os
import sys
import tempfile
import unittest
from contextlib import redirect_stderr

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from tmj_to_tilemap import convert


def make_tmj(**overrides):
    """A minimal 3*2 map: two tile layers (firstgid 5) plus an object layer."""
    tmj = {
        "width": 3,
        "height": 2,
        "tilewidth": 16,
        "tileheight": 16,
        "tilesets": [{"firstgid": 5, "name": "some-tiles"}],
        "layers": [
            {"type": "tilelayer", "data": [5, 0, 6, 7, 0, 9]},
            {"type": "objectgroup", "objects": []},
            {"type": "tilelayer", "data": [0, 5, 0, 0, 10, 0]},
        ],
    }
    tmj.update(overrides)
    return tmj


class TmjToTilemapTest(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.addCleanup(self.tmp.cleanup)

    def run_convert(self, tmj, tile_width=None, tile_height=None):
        source = os.path.join(self.tmp.name, "map.tmj")
        dest = os.path.join(self.tmp.name, "out", "map.json")
        with open(source, "w", encoding="utf-8") as f:
            json.dump(tmj, f)
        convert(source, dest, "ship-tiles", tile_width, tile_height)
        with open(dest, encoding="utf-8") as f:
            return f.read()

    def test_layers_stack_and_gids_rebase_to_firstgid(self):
        out = json.loads(self.run_convert(make_tmj()))
        self.assertEqual(out["cols"], 3)
        self.assertEqual(out["rows"], 2)
        self.assertEqual(out["tile_width"], 16)
        self.assertEqual(out["tile_height"], 16)
        self.assertEqual(
            out["tiles"],
            [
                "ship-tiles:0",  # layer 1 only
                "ship-tiles:0",  # layer 2 only (gid 5 - firstgid 5)
                "ship-tiles:1",
                "ship-tiles:2",
                "ship-tiles:5",  # layer 2 gid 10
                "ship-tiles:4",
            ],
        )

    def test_empty_cells_produce_empty_strings(self):
        tmj = make_tmj(layers=[{"type": "tilelayer", "data": [5, 0, 6, 0, 0, 9]}])
        out = json.loads(self.run_convert(tmj))
        self.assertEqual(
            out["tiles"],
            ["ship-tiles:0", "", "ship-tiles:1", "", "", "ship-tiles:4"],
        )

    def test_tile_size_overrides(self):
        out = json.loads(self.run_convert(make_tmj(), tile_width=32, tile_height=24))
        self.assertEqual(out["tile_width"], 32)
        self.assertEqual(out["tile_height"], 24)

    def test_output_is_compact_json(self):
        raw = self.run_convert(make_tmj())
        self.assertNotIn(", ", raw)
        self.assertNotIn(": ", raw)
        self.assertNotIn("\n", raw.strip())

    def test_multi_tileset_map_is_rejected(self):
        tmj = make_tmj(
            tilesets=[
                {"firstgid": 1, "name": "a"},
                {"firstgid": 9, "name": "b"},
            ]
        )
        with self.assertRaises(SystemExit) as ctx:
            self.run_convert(tmj)
        self.assertEqual(ctx.exception.code, 1)

    def test_normal_gid_is_converted(self):
        out = json.loads(self.run_convert(make_tmj()))
        self.assertEqual(out["tiles"][0], "ship-tiles:0")

    def test_transformed_gids_are_rejected_before_writing_output(self):
        cases = (
            (0x80000000, "horizontal flip"),
            (0x40000000, "vertical flip"),
            (0x20000000, "diagonal flip/rotation"),
            (0x10000000, "hexagonal 120-degree rotation"),
        )
        for flag, flag_name in cases:
            with self.subTest(flag=flag_name):
                tmj = make_tmj(
                    layers=[{"type": "tilelayer", "data": [5 | flag, 0, 0, 0, 0, 0]}],
                )
                source = os.path.join(self.tmp.name, "map.tmj")
                dest = os.path.join(self.tmp.name, "out", "map.json")
                with open(source, "w", encoding="utf-8") as f:
                    json.dump(tmj, f)

                stderr = io.StringIO()
                with redirect_stderr(stderr), self.assertRaises(SystemExit) as ctx:
                    convert(source, dest, "ship-tiles", None, None)
                self.assertEqual(ctx.exception.code, 1)
                self.assertIn("tile layer 1, cell (0, 0)", stderr.getvalue())
                self.assertIn(flag_name, stderr.getvalue())
                self.assertFalse(os.path.exists(dest))


if __name__ == "__main__":
    unittest.main()
