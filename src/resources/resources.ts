/// <reference types="vite/client" />
import * as ex from "excalibur";

import {
  AUTO_TILESET_RULES,
  AutoTilesetRule,
  TILESET_GEOMETRY,
  TilesetGridGeometry,
} from "./tileset-geometry.ts";

// All PNG assets under src/assets/, including any future subdirectories.
// The leading "/" makes this project-root-absolute rather than relative to
// this file, so it keeps resolving correctly if resources.ts moves again.
// Keys are paths like "/src/assets/vessel-1-base-self.png" or
// "/src/assets/weapons/sword.png". Values are Vite-resolved URLs.
const allPngs = import.meta.glob<string>("/src/assets/**/*.png", {
  eager: true,
  query: "?url",
  import: "default",
});

// Look up a PNG by its path relative to src/assets/ (without extension).
// E.g., png("vessel-1-base-self") or png("subdir/foo"). Throws at startup if the file
// is missing, giving an early and clear error rather than a silent undefined.
const png = (name: string): string => {
  const key = `/src/assets/${name}.png`;
  const url = allPngs[key];
  if (!url) throw new Error(`PNG not found in assets: "${name}.png"`);
  return url;
};

// -- Tileset definitions -------------------------------------------------------
//
// Every tileset is described by a plain data object. TilesetRegistry builds
// SpriteSheets and Animations from these at startup, eliminating the need for
// separate .tsj tileset files or a .tmx map file.
//
// Two kinds:
//   static   — a sheet of distinct sprites. TileRef "name:N" selects sprite N.
//   animated — one looping animation using the first `frames` cells of the
//              sheet. TileRef "name:0" returns the Animation; "name:N" (N > 0)
//              returns the individual frame sprite at index N.
//
// The catalog itself (grid geometry per tileset + auto-register rules) lives
// in src/resources/tileset-geometry.ts as pure data. To add a new tileset:
// drop the PNG in src/assets/ and add a row (or match an auto-register
// prefix) there — no import statement needed.

type StaticDef = {
  kind: "static";
  name: string;
  src: string;
  cols: number;
  rows: number;
  tileSize: number;
};

type AnimatedDef = {
  kind: "animated";
  name: string;
  src: string;
  cols: number;
  rows: number;
  tileSize: number;
  /** Number of animation frames (may be less than cols*rows). */
  frames: number;
  /** Duration of each frame in milliseconds. */
  frameDuration: number;
};

type TilesetDef = StaticDef | AnimatedDef;

// Build a TilesetDef from catalog geometry + a resolved asset URL.
// A row with `frames` is animated; one without is static.
const defFrom = (
  name: string,
  src: string,
  g: TilesetGridGeometry,
): TilesetDef =>
  g.frames != null
    ? {
      kind: "animated",
      name,
      src,
      cols: g.cols,
      rows: g.rows,
      tileSize: g.tileSize,
      frames: g.frames,
      frameDuration: g.frameDuration ?? 66,
    }
    : {
      kind: "static",
      name,
      src,
      cols: g.cols,
      rows: g.rows,
      tileSize: g.tileSize,
    };

const registeredNames = new Set<string>();

const TILESET_DEFS: TilesetDef[] = [
  ...TILESET_GEOMETRY.map((g) => {
    registeredNames.add(g.name);
    return defFrom(g.name, png(g.name), g);
  }),
  ...AUTO_TILESET_RULES.flatMap((rule: AutoTilesetRule) =>
    Object.entries(allPngs)
      .filter(([path]) => {
        const name = path.replace("/src/assets/", "").replace(".png", "");
        const filename = path.split("/").pop() ?? "";
        if (filename.startsWith(rule.prefix) && !registeredNames.has(name)) {
          registeredNames.add(name);
          return true;
        }
        return false;
      })
      .map(([path, src]) =>
        defFrom(path.replace("/src/assets/", "").replace(".png", ""), src, rule)
      )
  ),
];

// -- TilesetRegistry -----------------------------------------------------------

class TilesetRegistry {
  private readonly entries = new Map<
    string,
    { def: TilesetDef; sheet: ex.SpriteSheet }
  >();

  /** All ImageSources — must be added to the Excalibur loader before game start. */
  readonly loadables: ex.ImageSource[] = [];

  constructor(defs: TilesetDef[]) {
    for (const def of defs) {
      const image = new ex.ImageSource(def.src);
      this.loadables.push(image);
      const sheet = ex.SpriteSheet.fromImageSource({
        image,
        grid: {
          rows: def.rows,
          columns: def.cols,
          spriteWidth: def.tileSize,
          spriteHeight: def.tileSize,
        },
      });
      this.entries.set(def.name, { def, sheet });
    }
  }

  /**
   * Resolve a tileset name + local tile index to an Excalibur Graphic.
   *
   * Animated tilesets: tileId=0 returns the full looping Animation;
   * any other tileId returns the individual Sprite at that frame index.
   * Static tilesets: tileId always returns the Sprite at that grid position.
   */
  getGraphic(name: string, tileId: number): ex.Graphic {
    const entry = this.entries.get(name);
    if (!entry) throw new Error(`Tileset not found: "${name}"`);
    const { def, sheet } = entry;

    if (def.kind === "animated" && tileId === 0) {
      return ex.Animation.fromSpriteSheet(
        sheet,
        Array.from({ length: def.frames }, (_, i) => i),
        def.frameDuration,
      );
    }

    const col = tileId % def.cols;
    const row = Math.floor(tileId / def.cols);
    const sprite = sheet.getSprite(col, row);
    if (!sprite) {
      throw new Error(`Tile id ${tileId} out of range for tileset "${name}"`);
    }
    return sprite;
  }
}

// -- Exports ------------------------------------------------------------------

export const Resources = {
  Tilesets: new TilesetRegistry(TILESET_DEFS),
} as const;

export const loader = new ex.DefaultLoader();
for (const img of Resources.Tilesets.loadables) {
  loader.addResource(img);
}
