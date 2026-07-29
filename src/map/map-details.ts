import * as ex from "excalibur";

import { invoke } from "@tauri-apps/api/core";

import {
  asteroidDisplayName,
  asteroidGradeMultiplier,
  asteroidResourceGrade,
  mineDurationMs,
} from "./asteroid-catalog.ts";
import {
  AsteroidData,
  gameState,
  ModuleActionResponse,
  ModuleData,
  Revisioned,
  serverNow,
  VesselMoveEvent,
} from "../state/game-state.ts";
// Same deliberate cross-domain exception as tiled-scene.ts: the
// own-mothership panel reads out and upgrades the Command Module, so the map
// scene reaches into ship/'s catalog for this one panel.
import {
  canAffordModuleCost,
  COMMAND_MODULE_TYPE,
  costAtLevel,
  formatModuleCost,
  maxModuleLevel,
  moduleCatalogEntry,
  storageCapsForModules,
} from "../ship/module-catalog.ts";
import { RESOURCE_ICON_TILESET } from "../scene/tiled-scene.ts";
import {
  bindDialogRows,
  DialogDef,
  DialogHandle,
  DialogRowDef,
  errorToast,
  formatCompactCount,
  formatDuration,
  squareButton,
  ToastDef,
} from "../ui/index.ts";

/** Result of commandUpgradeStatus(): whether/why the details panel's Upgrade
 *  button would currently be enabled. "pending" (a build/level-up timer is
 *  already running) is kept distinct from "unaffordable" so the UI can say
 *  which one it is; the global level cap gives the Command Module its own
 *  "capped" variant too. */
type CommandUpgradeStatus =
  | "unavailable"
  | "pending"
  | "capped"
  | "unaffordable"
  | "ready";

/** Muted styling for the read-only field-name column. */
const FIELD_LABEL: { fontSize: number; color: ex.Color } = {
  fontSize: 10,
  color: ex.Color.fromHex("#9ab0c8"),
};

/** Amber for advisory rows — a warning the player can still act against,
 *  distinct from an outright rejection (which is an error toast). */
const WARNING_COLOR = ex.Color.fromHex("#e8b23a");

/** Space-map geometry is server-owned and fixed at 1000*1000 tiles. Grade is
 * position-derived rather than part of AsteroidData, so the details dialog
 * needs these dimensions to explain the same grade shown on the map actor. */
const MAP_COLUMNS = 1_000;
const MAP_ROWS = 1_000;

/** A "Name   value" readout row. */
function fieldRow(name: string, value: string): DialogRowDef {
  return {
    cells: [
      { label: { text: name, ...FIELD_LABEL } },
      { label: { text: value, fontSize: 10 }, weight: 2 },
    ],
  };
}

/** Sole row shown when the entity left gameState while its panel was open
 *  (mined out, docked, or streamed out of the interest-area window). */
function goneRow(message: string): DialogRowDef {
  return { cells: [{ label: { text: message, ...FIELD_LABEL } }] };
}

/** The player's Command Module, or undefined until the snapshot lands. */
function commandModule(): ModuleData | undefined {
  for (const module of gameState.modules.values()) {
    if (module.moduleType === COMMAND_MODULE_TYPE) return module;
  }
  return undefined;
}

/** Scene services DetailsDialog needs — the modal slot, rejection surfacing
 *  (toasts render above the open dialog). */
export interface DetailsDialogHost {
  openDialog(def: DialogDef): DialogHandle;
  showToast(toast: string | ToastDef): void;
}

/**
 * Owns the map scene's entity details panels (ROADMAP P1.16): motherships
 * (own and foreign), vessels, and asteroids, each a modal dialog rendered
 * from data already in gameState — no new backend queries. Rows are
 * state-bound (bindDialogRows) and additionally re-rendered once a second by
 * tick(), because unlike the shop these panels show live countdowns (vessel
 * ETAs, mining windows, the Command Module's upgrade timer) that must move
 * without waiting for a server push. Panels capture the entity *id* only and
 * re-read gameState on every rebuild, so pushes update an open panel — and an
 * entity that leaves the tables mid-view degrades to a "gone" row rather
 * than showing stale data.
 *
 * The own-mothership panel folds in the Command Module readout + Upgrade
 * action (the old standalone map "Upgrade" stub button): upgrading the ship
 * *is* leveling its Command Module, via the same request_levelup_module
 * command the ship scene uses.
 */
export class DetailsDialog {
  /** The open panel's row builder + handle, for the tick() re-render; null
   *  while no details panel is open. */
  private current:
    | { buildRows: () => DialogRowDef[]; handle: DialogHandle }
    | null = null;
  /** Last whole second tick() rendered, so the per-frame call only rebuilds
   *  the rows when a visible countdown could have changed. */
  private lastTickSecond = 0;

  constructor(private readonly host: DetailsDialogHost) {}

  openMothership(mothershipId: string): void {
    const title = gameState.motherships.get(mothershipId)?.ownerName ??
      "Mothership";
    this.openPanel(title, () => this.buildMothershipRows(mothershipId));
  }

  openVessel(vesselId: string): void {
    this.openPanel("Vessel", () => this.buildVesselRows(vesselId));
  }

  openAsteroid(asteroidId: string): void {
    const asteroid = gameState.asteroids.get(asteroidId);
    const title = asteroid ? asteroidDisplayName(asteroid) : "Asteroid";
    this.openPanel(title, () => this.buildAsteroidRows(asteroidId));
  }

  /**
   * Re-render the open panel's rows once a second (called every frame from
   * MapLevel.onPostUpdate, same shape as ModuleSync.tick) — drives the
   * countdowns between state notifies. A rebuild is a couple dozen actors,
   * so 1 Hz is cheap.
   */
  tick(): void {
    if (this.current === null) return;
    const second = Math.floor(serverNow() / 1000);
    if (second === this.lastTickSecond) return;
    this.lastTickSecond = second;
    this.current.handle.setRows(this.current.buildRows());
  }

  /** Open the modal with state-bound rows; one panel at a time (openDialog
   *  closes any previous one, whose onClose clears `current`). */
  private openPanel(title: string, buildRows: () => DialogRowDef[]): void {
    // onClose closes over `unbind` before it's assigned (it's only known
    // once `handle` exists), so it can't be a single const init.
    // deno-lint-ignore prefer-const
    let unbind: (() => void) | undefined;
    const handle = this.host.openDialog({
      title,
      rows: buildRows(),
      onClose: () => {
        unbind?.();
        if (this.current?.handle === handle) this.current = null;
      },
    });
    unbind = bindDialogRows(handle, (l) => gameState.subscribe(l), buildRows);
    this.current = { buildRows, handle };
  }

  /** Shared mothership panel: status/location readouts for anyone's ship;
   *  the player's own additionally gets the Command Module row. */
  private buildMothershipRows(mothershipId: string): DialogRowDef[] {
    const ship = gameState.motherships.get(mothershipId);
    if (!ship) return [goneRow("Out of scanner range")];
    const rows: DialogRowDef[] = [
      fieldRow("Commander", ship.ownerName),
      fieldRow("Status", ship.damaged ? "Damaged" : "Operational"),
      fieldRow("Location", `(${ship.col}, ${ship.row})`),
    ];
    if (ship.ownerId === gameState.player.id) {
      rows.push(this.buildCommandModuleRow());
    }
    return rows;
  }

  /**
   * The own-ship Command Module readout + Upgrade action (ROADMAP P1.16).
   * The disabled pre-check is UX only — the backend re-verifies the cost and
   * the no-pending-build rule and rejects rather than clamping.
   */
  private buildCommandModuleRow(): DialogRowDef {
    const command = commandModule();
    const status = this.commandUpgradeStatus(command);
    if (!command || status === "unavailable") {
      // Snapshot not landed (or a catalog mismatch): readout only.
      return fieldRow("Command Module", `Lv ${command?.level ?? 0}`);
    }
    const entry = moduleCatalogEntry(command.moduleType);
    const nextLevel = command.level + 1;
    return {
      cells: [
        { label: { text: "Command Module", ...FIELD_LABEL } },
        { label: { text: `Lv ${command.level}`, fontSize: 10 } },
        {
          button: squareButton({
            icon: "upgrade",
            width: 40,
            height: 40,
            // A running timer reads very differently from an unmet cost —
            // count it down rather than showing a price that looks unpaid.
            label: status === "pending"
              ? `Upgrading (${
                formatDuration(
                  (command.pending?.completesAt ?? serverNow()) - serverNow(),
                )
              })`
              : status === "capped"
              ? "Max level"
              : "Upgrade",
            badge: status === "pending" || status === "capped"
              ? undefined
              : formatModuleCost(costAtLevel(entry!, nextLevel)),
            disabled: status !== "ready",
            onPressed: () => void this.upgradeCommandModule(command.moduleId),
          }),
        },
      ],
    };
  }

  /** Whether/why the Upgrade button would currently be enabled — mirrors
   *  ModuleSync.levelUpStatus, including the server-delivered global cap. */
  private commandUpgradeStatus(
    command: ModuleData | undefined,
  ): CommandUpgradeStatus {
    if (!command) return "unavailable";
    const entry = moduleCatalogEntry(command.moduleType);
    if (!entry) return "unavailable";
    if (command.pending !== null) return "pending";
    if (command.level + 1 > maxModuleLevel()) return "capped";
    return canAffordModuleCost(
        gameState.resources,
        costAtLevel(entry, command.level + 1),
      )
      ? "ready"
      : "unaffordable";
  }

  /**
   * Asks the backend to level up the Command Module — the map-scene face of
   * the same server-verified action the ship scene's Level Up button sends
   * (ModuleSync.levelUp): the backend verifies ownership, the no-pending
   * rule, and the scaled cost, and returns the authoritative ModuleData plus
   * updated counts; applying both fans out to the open panel's state-bound
   * rows.
   */
  private async upgradeCommandModule(moduleId: string): Promise<void> {
    try {
      const response = await invoke<Revisioned<ModuleActionResponse>>(
        "request_levelup_module",
        { moduleId },
      );
      gameState.syncResources({
        revision: response.revision,
        data: response.data.resources,
      });
      gameState.applyModuleEvent({
        revision: response.revision,
        data: response.data.module,
      });
    } catch (err) {
      console.warn("request_levelup_module rejected:", err);
      this.host.showToast(errorToast(`Upgrade failed: ${err}`));
    }
  }

  private buildVesselRows(vesselId: string): DialogRowDef[] {
    const event = gameState.vessels.get(vesselId);
    if (!event) return [goneRow("Vessel docked or out of scanner range")];
    const rows: DialogRowDef[] = [
      fieldRow("Commander", event.ownerName),
      fieldRow("Status", this.vesselStatusText(event)),
      fieldRow("Destination", `(${event.destCol}, ${event.destRow})`),
    ];
    if (event.cargo !== null) {
      rows.push({
        cells: [
          { label: { text: "Cargo", ...FIELD_LABEL } },
          {
            tile: `${RESOURCE_ICON_TILESET[event.cargo.resource]}:0`,
            label: formatCompactCount(event.cargo.amount),
            weight: 2,
          },
        ],
      });
    }
    return rows;
  }

  /** Live one-line vessel status from the event timestamps: en route (with
   *  ETA), extracting (with the mining window's countdown), returning, or
   *  holding position. */
  private vesselStatusText(event: VesselMoveEvent): string {
    const now = serverNow();
    if (now < event.arrivalAt) {
      const eta = formatDuration(event.arrivalAt - now);
      if (event.returning) return `Returning — docks in ${eta}`;
      if (event.miningAsteroidId !== null) {
        return `En route to mine — arrives in ${eta}`;
      }
      return `En route — arrives in ${eta}`;
    }
    if (event.returning) return "Docking";
    if (event.miningAsteroidId !== null) {
      // The extraction window lives on the asteroid's mining slot; the
      // asteroid may have left the interest window even though our vessel
      // (always sent) is still assigned to it.
      const mining = gameState.asteroids.get(event.miningAsteroidId)?.mining;
      if (mining && mining.vesselId === event.vesselId) {
        return `Mining — done in ${formatDuration(mining.completesAt - now)}`;
      }
      return "Mining";
    }
    return "Holding position";
  }

  private buildAsteroidRows(asteroidId: string): DialogRowDef[] {
    const asteroid = gameState.asteroids.get(asteroidId);
    if (!asteroid) return [goneRow("Mined out or out of scanner range")];
    const grade = asteroidResourceGrade(
      asteroid.col,
      asteroid.row,
      MAP_COLUMNS,
      MAP_ROWS,
    );
    const multiplier = grade === null
      ? undefined
      : asteroidGradeMultiplier(grade);
    return [
      {
        cells: [
          { label: { text: "Deposit", ...FIELD_LABEL } },
          {
            tile: `${RESOURCE_ICON_TILESET[asteroid.resource]}:0`,
            label: `${formatCompactCount(asteroid.remaining, 1_000)}/${
              formatCompactCount(asteroid.total, 1_000)
            }`,
            weight: 2,
          },
        ],
      },
      fieldRow(
        "Resource grade",
        grade === null || multiplier === undefined
          ? "Unclassified"
          : `Grade ${grade} (${multiplier}x deposit)`,
      ),
      fieldRow("Status", this.asteroidStatusText(asteroid)),
      fieldRow("Location", `(${asteroid.col}, ${asteroid.row})`),
      ...this.storageWarningRows(asteroid),
    ];
  }

  /** Warn when the deposit is worth more than the player can actually bank.
   *  A harvest lands as one lump on the vessel's return and is clamped at
   *  the storage cap, with the overflow lost — and a deep-band asteroid can
   *  hold many times a starting cap, so a multi-hour job can silently return
   *  a fraction of its yield. P2.6 chose to warn rather than to reject the
   *  dispatch or clamp the job; if that changes, this row goes with it. */
  private storageWarningRows(asteroid: AsteroidData): DialogRowDef[] {
    const caps = storageCapsForModules(gameState.modules.values());
    const room = Math.max(
      0,
      caps[asteroid.resource] - gameState.resources[asteroid.resource],
    );
    if (asteroid.remaining <= room) return [];
    return [{
      cells: [{
        label: {
          text: `Storage holds ${formatCompactCount(room, 1_000)} more — ${
            formatCompactCount(asteroid.remaining - room, 1_000)
          } of a full harvest would be lost`,
          fontSize: 10,
          color: WARNING_COLOR,
        },
      }],
    }];
  }

  /** Live one-line asteroid status: the mining slot's phase (miner inbound
   *  or extracting, with countdowns), or idle with the full-harvest
   *  estimate. */
  private asteroidStatusText(asteroid: AsteroidData): string {
    const now = serverNow();
    if (asteroid.mining === null) {
      return `Idle — full harvest ~${
        formatDuration(mineDurationMs(asteroid.remaining))
      }`;
    }
    if (now < asteroid.mining.startedAt) {
      return `Miner inbound — extraction in ${
        formatDuration(asteroid.mining.startedAt - now)
      }`;
    }
    return `Mining — depleted in ${
      formatDuration(asteroid.mining.completesAt - now)
    }`;
  }
}
