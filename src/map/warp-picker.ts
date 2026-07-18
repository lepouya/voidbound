import * as ex from "excalibur";

import { invoke } from "@tauri-apps/api/core";

import {
  gameState,
  MothershipData,
  ResourceCounts,
  Revisioned,
} from "../state/game-state.ts";
import { TileGridGeometry } from "../scene/grid-math.ts";
import {
  computeFootprintColors,
  estimateWarpFuelCost,
  Footprint,
  FootprintCellState,
  footprintIsClear,
} from "./warp-footprint.ts";
import {
  errorToast,
  HudGroupDef,
  HudGroupHandle,
  squareButton,
  ToastDef,
} from "../ui/index.ts";

/** Mirrors the Rust `MothershipActionResponse` in
 *  src-tauri/src/game_state/world.rs — keep in sync. */
interface MothershipActionResponse {
  mothership: MothershipData;
  resources: ResourceCounts;
}

const CELL_FILL: Record<FootprintCellState, string> = {
  green: "rgba(60, 200, 100, 0.45)",
  yellow: "rgba(230, 200, 40, 0.5)",
  red: "rgba(220, 60, 60, 0.55)",
};

/** Draws the span*span footprint overlay: one filled+outlined cell per
 *  computeFootprintColors() entry, in world-pixel-sized cells. */
function makeFootprintGraphic(
  colors: FootprintCellState[][],
  cellW: number,
  cellH: number,
): ex.Canvas {
  const span = colors.length;
  return new ex.Canvas({
    width: span * cellW,
    height: span * cellH,
    cache: true,
    draw(ctx) {
      for (let r = 0; r < span; r++) {
        for (let c = 0; c < span; c++) {
          ctx.fillStyle = CELL_FILL[colors[r][c]];
          ctx.fillRect(c * cellW, r * cellH, cellW, cellH);
          ctx.strokeStyle = "rgba(255, 255, 255, 0.6)";
          ctx.lineWidth = 1;
          ctx.strokeRect(c * cellW, r * cellH, cellW, cellH);
        }
      }
    },
  });
}

/** Scene services WarpPicker needs — kept narrow so it doesn't reach back
 *  into MapLevel for anything beyond adding the overlay actor, clearing the
 *  ship selection, spawning the Confirm/Cancel HUD group, and toasting
 *  rejections. */
export interface WarpPickerHost {
  add(actor: ex.Actor): void;
  deselectActor(): void;
  addHudGroup(def: HudGroupDef): HudGroupHandle;
  showToast(toast: string | ToastDef): void;
}

/**
 * The mothership relocation picker (ROADMAP P1.22): a footprint overlay
 * pinned to the camera center — a reticle, not a dragged token — so normal
 * drag-to-pan and pinch/wheel zoom keep working unchanged while it's open;
 * the destination is whatever span*span footprint the camera is currently
 * centered on. Every cell is colored red (overlaps another mothership or
 * asteroid), yellow (8-neighbors a red cell within the footprint), or green
 * (clear) via the pure computeFootprintColors (warp-footprint.ts), which
 * mirrors the server's footprints_clear(gap: 0) overlap rule; Confirm is only
 * enabled once every cell is green. The server re-verifies placement, the
 * no-vessels-deployed precondition, and the fuel cost regardless of what this
 * preview shows.
 */
export class WarpPicker {
  private shipId: string | null = null;
  private span = 4;
  /** The ship's position when the picker opened — the fuel-cost estimate's
   *  origin, distinct from destCol/destRow which track the footprint. */
  private originCol = 0;
  private originRow = 0;
  private grid: TileGridGeometry | null = null;
  private overlay: ex.Actor | null = null;
  private hud: HudGroupHandle | null = null;
  private destCol = 0;
  private destRow = 0;
  /** The (col, row) recompute() last ran for — null before the first tick,
   *  so an open() that happens to land on (0, 0) still recomputes once. */
  private lastComputed: { col: number; row: number } | null = null;

  constructor(private readonly host: WarpPickerHost) {}

  isActive(): boolean {
    return this.overlay !== null;
  }

  /**
   * Opens the picker for the player's own ship. Refuses outright (with an
   * error toast, no picker shown) if the player has any vessel deployed —
   * the roadmap's precondition, checked here for immediate feedback; the
   * server re-verifies it at confirm time regardless. `cameraPos` seeds the
   * initial destination the same way every later tick() derives it.
   */
  open(
    grid: TileGridGeometry,
    cameraPos: ex.Vector,
    mothershipId: string,
  ): void {
    if (this.isActive()) return;
    const ship = gameState.motherships.get(mothershipId);
    if (!ship) return;
    const hasDeployedVessel = [...gameState.vessels.values()].some(
      (v) => v.ownerId === gameState.player.id,
    );
    if (hasDeployedVessel) {
      this.host.showToast(errorToast("Recall every vessel before warping"));
      return;
    }
    this.host.deselectActor();
    this.grid = grid;
    this.shipId = mothershipId;
    this.span = ship.span;
    this.originCol = ship.col;
    this.originRow = ship.row;
    this.overlay = new ex.Actor({ anchor: ex.vec(0.5, 0.5), z: 5 });
    this.host.add(this.overlay);
    this.hud = this.host.addHudGroup({
      anchor: "bottom-center",
      gap: 16,
      buttons: [
        squareButton({
          icon: "confirm",
          width: 48,
          height: 48,
          label: "0 fuel",
          disabled: true,
          onPressed: () => void this.confirm(),
        }),
        squareButton({
          icon: "close",
          width: 48,
          height: 48,
          label: "Cancel",
          onPressed: () => this.close(),
        }),
      ],
    });
    this.tick(cameraPos);
  }

  /**
   * Re-derives the destination footprint from the current camera center and
   * recolors it if it moved — called every frame the picker is open
   * (MapLevel.onPreUpdate), reading the same camera position the P1.13 AOI
   * hysteresis already does, so dragging/zooming the map re-centers both
   * together with no separate tracking needed.
   */
  tick(cameraPos: ex.Vector): void {
    if (!this.isActive() || !this.grid) return;
    const col = ex.clamp(
      Math.round(cameraPos.x / this.grid.tileWidth - this.span / 2),
      0,
      this.grid.columns - this.span,
    );
    const row = ex.clamp(
      Math.round(cameraPos.y / this.grid.tileHeight - this.span / 2),
      0,
      this.grid.rows - this.span,
    );
    if (
      this.lastComputed && this.lastComputed.col === col &&
      this.lastComputed.row === row
    ) {
      return;
    }
    this.lastComputed = { col, row };
    this.destCol = col;
    this.destRow = row;
    this.recompute();
  }

  private recompute(): void {
    if (!this.grid || !this.overlay) return;
    const occupied: Footprint[] = [
      ...[...gameState.motherships.values()].filter((m) =>
        m.mothershipId !== this.shipId
      ),
      ...gameState.asteroids.values(),
    ];
    const colors = computeFootprintColors(
      this.destCol,
      this.destRow,
      this.span,
      occupied,
    );
    this.overlay.pos = ex.vec(
      (this.destCol + this.span / 2) * this.grid.tileWidth,
      (this.destRow + this.span / 2) * this.grid.tileHeight,
    );
    this.overlay.graphics.use(
      makeFootprintGraphic(colors, this.grid.tileWidth, this.grid.tileHeight),
    );
    // Display-only estimate (ROADMAP P1.22 playtest feedback): the server
    // re-derives the real cost at confirm time, so this can only ever be a
    // preview, not a guarantee.
    const cost = estimateWarpFuelCost(
      this.originCol,
      this.originRow,
      this.destCol,
      this.destRow,
    );
    this.hud?.setLabel(0, `${cost} fuel`);
    const affordable = gameState.resources.fuel >= cost;
    this.hud?.setButtonDisabled(0, !footprintIsClear(colors) || !affordable);
  }

  /** Cancels the picker with no server call — safe to call whether or not
   *  it's open (e.g. a scene deactivation cleanup). */
  close(): void {
    this.overlay?.kill();
    this.overlay = null;
    this.hud?.remove();
    this.hud = null;
    this.shipId = null;
    this.grid = null;
    this.lastComputed = null;
  }

  /**
   * Asks the backend to relocate the mothership to the current destination.
   * The backend re-verifies the no-vessels precondition, map bounds,
   * footprint occupancy, and fuel cost, and returns the authoritative
   * MothershipData plus updated resource counts; merging both into gameState
   * fans out to MothershipSync.sync() the same way any other reconciled
   * entity change does.
   */
  private async confirm(): Promise<void> {
    const destCol = this.destCol;
    const destRow = this.destRow;
    try {
      const response = await invoke<Revisioned<MothershipActionResponse>>(
        "request_relocate_mothership",
        { destCol, destRow },
      );
      gameState.syncResources({
        revision: response.revision,
        data: response.data.resources,
      });
      gameState.applyMothershipEvent({
        revision: response.revision,
        data: response.data.mothership,
      });
    } catch (err) {
      // The Confirm button only enables on an all-green footprint, so a
      // rejection here means a race (someone/something else took the spot,
      // or the player ran out of fuel) or a bug. Surface it; state stays
      // untouched.
      console.warn("request_relocate_mothership rejected:", err);
      this.host.showToast(errorToast(`Warp failed: ${err}`));
    } finally {
      this.close();
    }
  }
}
