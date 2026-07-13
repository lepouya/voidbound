// Cross-checks every PNG under src/assets/ against the tileset catalog in
// src/resources/tileset-geometry.ts by reading real pixel dimensions from the PNG IHDR
// chunk (no image library needed). This is exactly the class of drift that
// once caused a module-* mis-slicing bug (catalog rows out of step with the
// regenerated PNG dimensions).

import { assert, assertEquals } from "@std/assert";
import { fromFileUrl } from "@std/path";

import {
  AUTO_TILESET_RULES,
  TILESET_GEOMETRY,
  TilesetGridGeometry,
} from "../src/resources/tileset-geometry.ts";

const ASSETS_DIR = fromFileUrl(new URL("../src/assets/", import.meta.url));

/** Width/height from a PNG's IHDR chunk (first chunk after the 8-byte signature). */
function pngSize(bytes: Uint8Array): { width: number; height: number } {
  const dv = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  assertEquals(dv.getUint32(0), 0x89504e47, "PNG signature");
  assertEquals(dv.getUint32(12), 0x49484452, "IHDR chunk tag");
  return { width: dv.getUint32(16), height: dv.getUint32(20) };
}

/** All PNG paths under src/assets/, as slash-joined paths relative to it. */
async function listAssetPngs(dir = ASSETS_DIR, prefix = ""): Promise<string[]> {
  const out: string[] = [];
  for await (const entry of Deno.readDir(dir)) {
    if (entry.isDirectory) {
      out.push(
        ...await listAssetPngs(
          `${dir}${entry.name}/`,
          `${prefix}${entry.name}/`,
        ),
      );
    } else if (entry.name.endsWith(".png")) {
      out.push(`${prefix}${entry.name}`);
    }
  }
  return out;
}

function checkGeometry(relPath: string, g: TilesetGridGeometry, label: string) {
  const bytes = Deno.readFileSync(`${ASSETS_DIR}${relPath}`);
  const { width, height } = pngSize(bytes);
  assertEquals(width, g.cols * g.tileSize, `${label}: width = cols*tileSize`);
  assertEquals(height, g.rows * g.tileSize, `${label}: height = rows*tileSize`);
  if (g.frames != null) {
    assert(
      g.frames <= g.cols * g.rows,
      `${label}: frames (${g.frames}) exceed grid cells (${g.cols * g.rows})`,
    );
  }
}

Deno.test("explicit catalog rows match their PNG dimensions", () => {
  for (const g of TILESET_GEOMETRY) {
    checkGeometry(`${g.name}.png`, g, g.name);
  }
});

Deno.test("auto-registered PNGs match their rule's dimensions", async () => {
  for (const relPath of await listAssetPngs()) {
    const basename = relPath.split("/").pop()!;
    const rule = AUTO_TILESET_RULES.find((r) => basename.startsWith(r.prefix));
    if (rule) checkGeometry(relPath, rule, relPath);
  }
});

Deno.test("every asset PNG is covered by a catalog row or auto-rule", async () => {
  const explicit = new Set(TILESET_GEOMETRY.map((g) => `${g.name}.png`));
  for (const relPath of await listAssetPngs()) {
    const basename = relPath.split("/").pop()!;
    const covered = explicit.has(relPath) ||
      AUTO_TILESET_RULES.some((r) => basename.startsWith(r.prefix));
    assert(
      covered,
      `${relPath} is not registered — add a row to TILESET_GEOMETRY ` +
        `or match an AUTO_TILESET_RULES prefix (see /add-tileset)`,
    );
  }
});
