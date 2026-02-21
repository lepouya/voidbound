import * as ex from "excalibur";

import { TiledResource } from "@excaliburjs/plugin-tiled";

import cs1BasePngPath from "./assets/cs1-base.png?url";
import cs1BaseTilesetPath from "./assets/cs1-base.tsj?url";
import cs1MovingPngPath from "./assets/cs1-moving.png?url";
import cs1MovingTilesetPath from "./assets/cs1-moving.tsj?url";
import ss1BasePngPath from "./assets/ss1-base.png?url";
import ss1BaseTilesetPath from "./assets/ss1-base.tsj?url";
import ss1DamagedPngPath from "./assets/ss1-damaged.png?url";
import ss1DamagedTilesetPath from "./assets/ss1-damaged.tsj?url";
import testTilesetPngPath from "./assets/test-tileset.png?url";
import testTilesetPath from "./assets/test-tileset.tsj?url";
import tilesetsPath from "./assets/tilesets.tmx?url";
import uiSelectionPngPath from "./assets/ui-selection.png?url";
import uiSelectionTilesetPath from "./assets/ui-selection.tsj?url";

export const Resources = {
  Tilesets: new TiledResource(tilesetsPath, {
    pathMap: [
      { path: "tilesets.tmx", output: tilesetsPath },
      { path: "test-tileset.tsj", output: testTilesetPath },
      { path: "test-tileset.png", output: testTilesetPngPath },
      { path: "ui-selection.tsj", output: uiSelectionTilesetPath },
      { path: "ui-selection.png", output: uiSelectionPngPath },
      { path: "ss1-base.tsj", output: ss1BaseTilesetPath },
      { path: "ss1-base.png", output: ss1BasePngPath },
      { path: "ss1-damaged.tsj", output: ss1DamagedTilesetPath },
      { path: "ss1-damaged.png", output: ss1DamagedPngPath },
      { path: "cs1-base.tsj", output: cs1BaseTilesetPath },
      { path: "cs1-base.png", output: cs1BasePngPath },
      { path: "cs1-moving.tsj", output: cs1MovingTilesetPath },
      { path: "cs1-moving.png", output: cs1MovingPngPath },
    ],
  }),
} as const;

export const loader = new ex.DefaultLoader();
for (const res of Object.values(Resources)) {
  loader.addResource(res);
}
