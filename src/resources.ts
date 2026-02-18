import * as ex from "excalibur";
import { TiledResource } from "@excaliburjs/plugin-tiled";

import tilesetsPath from "./assets/tilesets.tmx?url";
import testTilesetPath from "./assets/test-tileset.tsx?url";
import testTilesetPngPath from "./assets/test-tileset.png?url";
import ss1BaseTilesetPath from "./assets/ss1-base.tsx?url";
import ss1BasePngPath from "./assets/ss1-base.png?url";
import ss1DamagedTilesetPath from "./assets/ss1-damaged.tsx?url";
import ss1DamagedPngPath from "./assets/ss1-damaged.png?url";

export const Resources = {
  Sword: new ex.ImageSource("/src/assets/sword.png"),

  Tilesets: new TiledResource(tilesetsPath, {
    pathMap: [
      { path: "tilesets.tmx", output: tilesetsPath },
      { path: "test-tileset.tsx", output: testTilesetPath },
      { path: "test-tileset.png", output: testTilesetPngPath },
      { path: "ss1-base.tsx", output: ss1BaseTilesetPath },
      { path: "ss1-base.png", output: ss1BasePngPath },
      { path: "ss1-damaged.tsx", output: ss1DamagedTilesetPath },
      { path: "ss1-damaged.png", output: ss1DamagedPngPath },
    ],
  }),
} as const;

export const loader = new ex.DefaultLoader();
for (const res of Object.values(Resources)) {
  loader.addResource(res);
}
