import * as ex from "excalibur";
import { TiledResource } from "@excaliburjs/plugin-tiled";

import tilesetsPath from "./assets/tilesets.tmx?url";
import testTilesetPath from "./assets/test-tileset.tsx?url";
import testTilesetPngPath from "./assets/test-tileset.png?url";

export const Resources = {
  Sword: new ex.ImageSource("/src/assets/sword.png"),

  Tilesets: new TiledResource(tilesetsPath, {
    pathMap: [
      { path: "tilesets.tmx", output: tilesetsPath },
      { path: "test-tileset.tsx", output: testTilesetPath },
      { path: "test-tileset.png", output: testTilesetPngPath },
    ],
  }),
} as const;

export const loader = new ex.DefaultLoader();
for (const res of Object.values(Resources)) {
  loader.addResource(res);
}
