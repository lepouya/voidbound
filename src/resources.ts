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
import uiButtonAttackPngPath from "./assets/ui-button-attack.png?url";
import uiButtonAttackTilesetPath from "./assets/ui-button-attack.tsj?url";
import uiButtonBackPngPath from "./assets/ui-button-back.png?url";
import uiButtonBackTilesetPath from "./assets/ui-button-back.tsj?url";
import uiButtonBuyPngPath from "./assets/ui-button-buy.png?url";
import uiButtonBuyTilesetPath from "./assets/ui-button-buy.tsj?url";
import uiButtonDeployPngPath from "./assets/ui-button-deploy.png?url";
import uiButtonDeployTilesetPath from "./assets/ui-button-deploy.tsj?url";
import uiButtonDetailsPngPath from "./assets/ui-button-details.png?url";
import uiButtonDetailsTilesetPath from "./assets/ui-button-details.tsj?url";
import uiButtonEnterPngPath from "./assets/ui-button-enter.png?url";
import uiButtonEnterTilesetPath from "./assets/ui-button-enter.tsj?url";
import uiButtonEvents2PngPath from "./assets/ui-button-events-2.png?url";
import uiButtonEvents2TilesetPath from "./assets/ui-button-events-2.tsj?url";
import uiButtonEventsPngPath from "./assets/ui-button-events.png?url";
import uiButtonEventsTilesetPath from "./assets/ui-button-events.tsj?url";
import uiButtonItems2PngPath from "./assets/ui-button-items-2.png?url";
import uiButtonItems2TilesetPath from "./assets/ui-button-items-2.tsj?url";
import uiButtonItemsPngPath from "./assets/ui-button-items.png?url";
import uiButtonItemsTilesetPath from "./assets/ui-button-items.tsj?url";
import uiButtonMessagePngPath from "./assets/ui-button-message.png?url";
import uiButtonMessageTilesetPath from "./assets/ui-button-message.tsj?url";
import uiButtonModifyPngPath from "./assets/ui-button-modify.png?url";
import uiButtonModifyTilesetPath from "./assets/ui-button-modify.tsj?url";
import uiButtonUpgradePngPath from "./assets/ui-button-upgrade.png?url";
import uiButtonUpgradeTilesetPath from "./assets/ui-button-upgrade.tsj?url";
import uiButtonWarpPngPath from "./assets/ui-button-warp.png?url";
import uiButtonWarpTilesetPath from "./assets/ui-button-warp.tsj?url";
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
      { path: "ui-button-attack.tsj", output: uiButtonAttackTilesetPath },
      { path: "ui-button-attack.png", output: uiButtonAttackPngPath },
      { path: "ui-button-back.tsj", output: uiButtonBackTilesetPath },
      { path: "ui-button-back.png", output: uiButtonBackPngPath },
      { path: "ui-button-buy.tsj", output: uiButtonBuyTilesetPath },
      { path: "ui-button-buy.png", output: uiButtonBuyPngPath },
      { path: "ui-button-deploy.tsj", output: uiButtonDeployTilesetPath },
      { path: "ui-button-deploy.png", output: uiButtonDeployPngPath },
      { path: "ui-button-details.tsj", output: uiButtonDetailsTilesetPath },
      { path: "ui-button-details.png", output: uiButtonDetailsPngPath },
      { path: "ui-button-enter.tsj", output: uiButtonEnterTilesetPath },
      { path: "ui-button-enter.png", output: uiButtonEnterPngPath },
      { path: "ui-button-events.tsj", output: uiButtonEventsTilesetPath },
      { path: "ui-button-events.png", output: uiButtonEventsPngPath },
      { path: "ui-button-events-2.tsj", output: uiButtonEvents2TilesetPath },
      { path: "ui-button-events-2.png", output: uiButtonEvents2PngPath },
      { path: "ui-button-items.tsj", output: uiButtonItemsTilesetPath },
      { path: "ui-button-items.png", output: uiButtonItemsPngPath },
      { path: "ui-button-items-2.tsj", output: uiButtonItems2TilesetPath },
      { path: "ui-button-items-2.png", output: uiButtonItems2PngPath },
      { path: "ui-button-message.tsj", output: uiButtonMessageTilesetPath },
      { path: "ui-button-message.png", output: uiButtonMessagePngPath },
      { path: "ui-button-modify.tsj", output: uiButtonModifyTilesetPath },
      { path: "ui-button-modify.png", output: uiButtonModifyPngPath },
      { path: "ui-button-upgrade.tsj", output: uiButtonUpgradeTilesetPath },
      { path: "ui-button-upgrade.png", output: uiButtonUpgradePngPath },
      { path: "ui-button-warp.tsj", output: uiButtonWarpTilesetPath },
      { path: "ui-button-warp.png", output: uiButtonWarpPngPath },
    ],
  }),
} as const;

export const loader = new ex.DefaultLoader();
for (const res of Object.values(Resources)) {
  loader.addResource(res);
}
