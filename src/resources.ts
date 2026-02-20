import * as ex from "excalibur";

import { TiledResource } from "@excaliburjs/plugin-tiled";

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
    ],
  }),
} as const;

export const loader = new ex.DefaultLoader();
for (const res of Object.values(Resources)) {
  loader.addResource(res);
}
