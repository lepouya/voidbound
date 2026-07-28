import * as ex from "excalibur";

import {
  gameState,
  ModuleData,
  ResourceKind,
  serverNow,
} from "../state/game-state.ts";
import {
  costAtLevel,
  crewRequiredForModules,
  crewScaledAmount,
  formatModuleCost,
  maxModuleLevel,
  moduleCatalogEntry,
  productionAtLevel,
} from "./module-catalog.ts";
import { RESOURCE_ICON_TILESET } from "../scene/tiled-scene.ts";
import {
  bindDialogRows,
  DialogDef,
  DialogHandle,
  DialogRowDef,
  formatCompactCount,
  formatDuration,
} from "../ui/index.ts";

/** Muted styling for the read-only field-name column — matches
 *  map-details.ts's FIELD_LABEL (each dialog file owns this small styling
 *  constant rather than sharing one). */
const FIELD_LABEL: { fontSize: number; color: ex.Color } = {
  fontSize: 10,
  color: ex.Color.fromHex("#9ab0c8"),
};

/** A "Name   value" readout row. */
function fieldRow(name: string, value: string): DialogRowDef {
  return {
    cells: [
      { label: { text: name, ...FIELD_LABEL } },
      { label: { text: value, fontSize: 10 }, weight: 2 },
    ],
  };
}

/** Sole row shown when the module left gameState while its panel was open
 *  (a rebuild that happens to coincide with the panel being open — modules
 *  don't currently despawn on their own, but the reconciler can replace the
 *  instance). */
function goneRow(message: string): DialogRowDef {
  return { cells: [{ label: { text: message, ...FIELD_LABEL } }] };
}

/** Scene services ModuleDetailsDialog needs — the modal slot only; unlike
 *  map-details.ts's DetailsDialog this panel is read-only, so there's no
 *  toast/rejection path to surface. */
export interface ModuleDetailsHost {
  openDialog(def: DialogDef): DialogHandle;
}

/**
 * Ship-scene module details panel (ROADMAP P1.20): extends the P1.16
 * details-panel pattern (map-details.ts's DetailsDialog) to every module —
 * Command Module included. Read-only: level, build/upgrade status with a
 * live countdown, and per-type stats (production, storage, crew) already in
 * the catalog. The Level Up/Hire Crew/Trade actions stay on the module's own
 * map buttons (ModuleSync.createActor) rather than duplicating them here —
 * unlike the map scene's own-mothership panel, every ship module already has
 * its action buttons in view without opening Details.
 */
export class ModuleDetailsDialog {
  /** The open panel's row builder + handle, for the tick() re-render; null
   *  while no details panel is open. Same shape as map-details.ts's
   *  DetailsDialog.current. */
  private current:
    | { buildRows: () => DialogRowDef[]; handle: DialogHandle }
    | null = null;
  /** Last whole second tick() rendered, so the per-frame call only rebuilds
   *  the rows when a visible countdown could have changed. */
  private lastTickSecond = 0;

  constructor(private readonly host: ModuleDetailsHost) {}

  open(moduleId: string): void {
    const data = gameState.modules.get(moduleId);
    const entry = data && moduleCatalogEntry(data.moduleType);
    const title = entry?.displayName ?? data?.moduleType ?? "Module";
    // onClose closes over `unbind` before it's assigned (it's only known
    // once `handle` exists), so it can't be a single const init.
    // deno-lint-ignore prefer-const
    let unbind: (() => void) | undefined;
    const buildRows = () => this.buildRows(moduleId);
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

  /**
   * Re-render the open panel's rows once a second (called every frame from
   * ShipLevel.onPostUpdate, same shape as ModuleSync.tick and
   * map-details.ts's DetailsDialog.tick) — drives the build/upgrade countdown
   * between state notifies.
   */
  tick(): void {
    if (this.current === null) return;
    const second = Math.floor(serverNow() / 1000);
    if (second === this.lastTickSecond) return;
    this.lastTickSecond = second;
    this.current.handle.setRows(this.current.buildRows());
  }

  private buildRows(moduleId: string): DialogRowDef[] {
    const data = gameState.modules.get(moduleId);
    if (!data) return [goneRow("Module decommissioned")];
    const entry = moduleCatalogEntry(data.moduleType);
    const rows: DialogRowDef[] = [
      fieldRow("Level", `${data.level}`),
      fieldRow("Status", this.statusText(data)),
    ];
    if (!entry) return rows;

    // Ship-wide staffing ratio (ROADMAP P1.10) — same pooled calc as
    // ModuleSync.sync's understaffed badge — applied to this module's
    // production only if it actually demands crew. `staffPct` is derived
    // separately from the scaled amount below (rather than driving it) so the
    // amount readout doesn't double-floor.
    const crewRequired = entry.crewRequiredPerLevel > 0
      ? crewRequiredForModules(gameState.modules.values())
      : 0;
    const staffPct = crewRequired > 0
      ? crewScaledAmount(100, gameState.crew, crewRequired)
      : 100;
    if (data.level >= 1) {
      const produced = productionAtLevel(entry, data.level);
      for (const [kind, amount] of Object.entries(produced)) {
        if (!amount) continue;
        const scaled = crewRequired > 0
          ? crewScaledAmount(amount, gameState.crew, crewRequired)
          : amount;
        rows.push({
          cells: [
            { label: { text: "Production", ...FIELD_LABEL } },
            {
              tile: `${RESOURCE_ICON_TILESET[kind as ResourceKind]}:0`,
              label: `${formatCompactCount(scaled)}/min${
                staffPct < 100 ? ` (${staffPct}% staffed)` : ""
              }`,
              weight: 2,
            },
          ],
        });
      }
      const berths = entry.crewCapacityBase +
        entry.crewCapacityPerLevel * data.level;
      if (berths > 0) {
        rows.push(fieldRow("Crew berths", `${berths}`));
      }
      if (entry.crewRequiredPerLevel > 0) {
        rows.push(
          fieldRow(
            "Crew required",
            `${entry.crewRequiredPerLevel * data.level}`,
          ),
        );
      }
    }
    if (data.pending === null && data.level < maxModuleLevel()) {
      const nextLevel = data.level + 1;
      rows.push(
        fieldRow(
          "Next level cost",
          formatModuleCost(costAtLevel(entry, nextLevel)),
        ),
      );
    } else if (data.pending === null) {
      rows.push(fieldRow("Upgrade", "Maximum reached"));
    }
    return rows;
  }

  /** Live one-line status: a running build/upgrade timer with its countdown,
   *  or "Operational" once settled. Mirrors ModuleSync's buildCountdownLabel
   *  logic but as a full sentence for the dialog rather than an actor label. */
  private statusText(data: ModuleData): string {
    if (data.pending !== null) {
      const remaining = formatDuration(
        Math.max(0, data.pending.completesAt - serverNow()),
      );
      return data.level === 0
        ? `Building — ${remaining}`
        : `Upgrading to Lv ${data.pending.level} — ${remaining}`;
    }
    return "Operational";
  }
}
