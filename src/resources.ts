/// <reference types="vite/client" />
import * as ex from "excalibur";

// All PNG assets under src/assets/, including any future subdirectories.
// Keys are paths relative to this file, e.g. "./assets/cs1-base.png" or
// "./assets/weapons/sword.png". Values are Vite-resolved URLs.
const allPngs = import.meta.glob<string>("./assets/**/*.png", {
  eager: true,
  query: "?url",
  import: "default",
});

// Look up a PNG by its path relative to src/assets/ (without extension).
// E.g., png("cs1-base") or png("subdir/foo"). Throws at startup if the file
// is missing, giving an early and clear error rather than a silent undefined.
const png = (name: string): string => {
  const key = `./assets/${name}.png`;
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
// To add a new non-button tileset: drop the PNG in src/assets/ and add a row
// to TILESET_DEFS below — no import statement needed.

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

// Shorthand constructors keep the catalog rows concise.
const sd = (
  name: string,
  src: string,
  cols: number,
  rows: number,
  tileSize: number,
): StaticDef => ({ kind: "static", name, src, cols, rows, tileSize });

const ad = (
  name: string,
  src: string,
  cols: number,
  rows: number,
  tileSize: number,
  frames: number,
  frameDuration: number,
): AnimatedDef => ({
  kind: "animated",
  name,
  src,
  cols,
  rows,
  tileSize,
  frames,
  frameDuration,
});

// Button tilesets: 3*2 grid, 64 px cells, static.
// Any ui-button-*.png anywhere under assets/ is picked up automatically.
const buttonDefs: TilesetDef[] = Object.entries(allPngs)
  .filter(([path]) => path.split("/").pop()?.startsWith("ui-button-") ?? false)
  .map(([path, src]) => {
    const name = path.replace("./assets/", "").replace(".png", "");
    return sd(name, src, 3, 2, 64);
  });

//                  name             cols rows  sz   frames ms/f
const TILESET_DEFS: TilesetDef[] = [
  sd("test-tileset", png("test-tileset"), 4, 1, 32),
  ad("ui-selection", png("ui-selection"), 6, 6, 256, 32, 66),
  ad("ss1-base", png("ss1-base"), 6, 6, 256, 32, 66),
  ad("ss1-damaged", png("ss1-damaged"), 6, 6, 256, 32, 66),
  ad("cs1-base", png("cs1-base"), 6, 6, 64, 32, 66),
  ad("cs1-moving", png("cs1-moving"), 6, 6, 64, 32, 66),
  ...buttonDefs,
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
    return sheet.getSprite(col, row)!;
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
