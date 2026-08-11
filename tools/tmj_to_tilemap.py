#!/usr/bin/env python3
"""
Convert a Tiled .tmj map file to a simplified tilemap JSON asset.

The output format matches the TileMapData struct used by the Rust backend:
  { "cols": N, "rows": N, "tile_width": N, "tile_height": N, "tiles": [...] }

Each entry in "tiles" is a comma-delimited list of TileRef strings
(e.g. "my-tileset:0" or "my-tileset:1,my-tileset:27"), one per cell,
in row-major order.  Empty cells (all layers are GID 0) produce "".

Usage:
  python3 tmj_to_tilemap.py -s map.tmj -d out.json -t my-tileset [-W 32] [-H 32]
"""

import argparse
import json
import os
import sys

# Tiled stores these transform bits alongside the tileset-global tile ID.
# The simplified TileMapData format only accepts string TileRefs, which cannot
# preserve per-layer transforms, so reject them instead of emitting an invalid
# (very large) tile ID.
HORIZONTAL_FLIP_FLAG = 0x80000000
VERTICAL_FLIP_FLAG = 0x40000000
DIAGONAL_FLIP_FLAG = 0x20000000
HEXAGONAL_ROTATION_FLAG = 0x10000000
TRANSFORM_FLAGS = {
    HORIZONTAL_FLIP_FLAG: "horizontal flip",
    VERTICAL_FLIP_FLAG: "vertical flip",
    DIAGONAL_FLIP_FLAG: "diagonal flip/rotation",
    HEXAGONAL_ROTATION_FLAG: "hexagonal 120-degree rotation",
}


def reject_transform_flags(
    gid: int, layer_index: int, cell_index: int, cols: int
) -> None:
    """Exit before output when a Tiled GID needs an unsupported transform."""
    flags = [name for bit, name in TRANSFORM_FLAGS.items() if gid & bit]
    if not flags:
        return

    row, col = divmod(cell_index, cols)
    print(
        f"error: tile layer {layer_index + 1}, cell ({col}, {row}) has unsupported "
        f"Tiled transform flag(s): {', '.join(flags)} (raw GID 0x{gid:08x}); "
        "remove the transform before converting this map",
        file=sys.stderr,
    )
    sys.exit(1)


def convert(
    source: str,
    dest: str,
    tileset: str,
    tile_width: int | None,
    tile_height: int | None,
) -> None:
    with open(source, encoding="utf-8") as f:
        tmj = json.load(f)

    tilesets = tmj.get("tilesets", [])
    if len(tilesets) > 1:
        names = [ts.get("source", ts.get("name", "?")) for ts in tilesets]
        print(
            f"error: map uses {len(tilesets)} tilesets ({', '.join(names)}); "
            "only single-tileset maps are supported",
            file=sys.stderr,
        )
        sys.exit(1)

    cols: int = tmj["width"]
    rows: int = tmj["height"]
    tw: int = tile_width if tile_width is not None else tmj["tilewidth"]
    th: int = tile_height if tile_height is not None else tmj["tileheight"]
    firstgid: int = tilesets[0]["firstgid"] if tilesets else 1

    layers: list[list[int]] = [
        layer["data"]
        for layer in tmj.get("layers", [])
        if layer.get("type") == "tilelayer"
    ]

    tiles: list[str] = []
    for i in range(cols * rows):
        parts: list[str] = []
        for layer_index, layer in enumerate(layers):
            gid = layer[i] if i < len(layer) else 0
            if gid != 0:
                reject_transform_flags(gid, layer_index, i, cols)
                parts.append(f"{tileset}:{gid - firstgid}")
        tiles.append(",".join(parts))

    out = {
        "cols": cols,
        "rows": rows,
        "tile_width": tw,
        "tile_height": th,
        "tiles": tiles,
    }

    os.makedirs(os.path.dirname(os.path.abspath(dest)), exist_ok=True)
    with open(dest, "w", encoding="utf-8") as f:
        json.dump(out, f, separators=(",", ":"))

    empty = sum(1 for t in tiles if not t)
    print(f"Wrote {cols}*{rows} tilemap ({empty} empty cells) → {dest}")


def main() -> None:
    parser = argparse.ArgumentParser(
        description="Convert a Tiled .tmj map to a simplified tilemap JSON asset."
    )
    parser.add_argument("-s", "--source", required=True, help="Input .tmj file")
    parser.add_argument("-d", "--dest", required=True, help="Output .json file")
    parser.add_argument(
        "-t",
        "--tileset",
        required=True,
        help="Tileset name to use in TileRef output (e.g. ship-tiles)",
    )
    parser.add_argument(
        "-W",
        "--tile-width",
        type=int,
        default=None,
        help="Override tile width in output (default: from TMJ)",
    )
    parser.add_argument(
        "-H",
        "--tile-height",
        type=int,
        default=None,
        help="Override tile height in output (default: from TMJ)",
    )
    args = parser.parse_args()

    if not os.path.isfile(args.source):
        print(f"error: source file not found: {args.source}", file=sys.stderr)
        sys.exit(1)

    convert(args.source, args.dest, args.tileset, args.tile_width, args.tile_height)


if __name__ == "__main__":
    main()
