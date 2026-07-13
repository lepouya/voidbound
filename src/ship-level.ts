import * as ex from "excalibur";

import { gameState } from "./game-state.ts";
import { buildTileMap } from "./map-loader.ts";
import { ModuleSync } from "./ship-modules.ts";
import { ShopDialog } from "./ship-shop.ts";
import { TileActor } from "./tile-actor.ts";
import { SceneMap, TiledScene } from "./tiled-scene.ts";
import { squareButton } from "./ui/index.ts";

export class ShipLevel extends TiledScene {
  /** Reconciles module actors (Command Module included) against
   *  gameState.modules and owns the build/level-up/hire-crew actions. */
  private moduleSync = new ModuleSync({
    add: (actor) => this.add(actor),
    onTilePressed: this.handleTilePressed,
    edgeFallthrough: () => this.supportsEmptyTileActor(),
    isSelected: (actor) => this.isSelected(actor),
    reselectActor: (actor) => this.reselectActor(actor),
    deselectActor: () => this.deselectActor(),
    openShop: () => this.shop.open(),
  });
  /** Owns the Trading Post dialog and its accept/refresh actions. */
  private shop = new ShopDialog({
    openDialog: (def) => this.openDialog(def),
  });

  override onInitialize(engine: ex.Engine): void {
    super.onInitialize(engine);
    this.backgroundColor = ex.Color.Black;
    this.addCommonHud(squareButton({
      icon: "mapview",
      width: 64,
      height: 64,
      label: "Map",
      onPressed: () => engine.goToScene("map"),
    }));
    // The backend state may load (or a future login complete) after this
    // scene is built — reconcile module actors (Command Module included)
    // against the refreshed table on every notify. No unsubscribe: scenes
    // live for the whole app run.
    gameState.subscribe(() => this.moduleSync.sync(this.grid));
  }

  protected override async buildMap(): Promise<SceneMap> {
    const tilemap = await buildTileMap("ship");
    return { grid: tilemap, tilemap };
  }

  protected override supportsEmptyTileActor(): boolean {
    return true;
  }

  protected override setupActors(): void {
    // Nothing is placed here: every module, including the Command Module, is
    // server-owned and reconciled from the backend snapshot — which may have
    // loaded before this scene finished its async map build (hence the
    // explicit sync), or may land later (the gameState subscription).
    this.moduleSync.sync(this.grid);
  }

  protected override createEmptyTileActor(
    col: number,
    row: number,
    onPressed: (a: TileActor) => void,
  ): TileActor | null {
    return this.moduleSync.createBuildOfferActor(
      this.grid,
      col,
      row,
      onPressed,
    );
  }

  override onPostUpdate(): void {
    this.moduleSync.tick();
  }
}
