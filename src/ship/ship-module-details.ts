import * as ex from "excalibur";

import { invoke } from "@tauri-apps/api/core";

import {
  CrewAssignmentResponse,
  gameState,
  ModuleData,
  ResourceKind,
  Revisioned,
  serverNow,
} from "../state/game-state.ts";
import {
  costAtLevel,
  crewRequiredAtLevel,
  crewScaledAmount,
  formatModuleCost,
  maxModuleLevel,
  moduleCatalogEntry,
  productionAtLevel,
  productionBoostedAmount,
  productionBoostPctAtLevel,
  productionBoostPctForModules,
} from "./module-catalog.ts";
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

/** Scene services ModuleDetailsDialog needs — the modal slot plus server
 * reassignment rejection surfacing. */
export interface ModuleDetailsHost {
  openDialog(def: DialogDef): DialogHandle;
  showToast(toast: string | ToastDef): void;
}

/**
 * Ship-scene module details panel (ROADMAP P1.20): extends the P1.16
 * details-panel pattern (map-details.ts's DetailsDialog) to every module —
 * Command Module included. It shows level, build/upgrade status with a live
 * countdown, and per-type catalog stats; P2.8 adds the one mutable setting:
 * explicit crew allocation. Level Up/Hire Crew/Trade remain on the module's
 * own map buttons rather than duplicating them here.
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

    // P2.8 staffing is explicit per module, not an opaque ship-wide ratio.
    const crewRequired = crewRequiredAtLevel(entry, data.level);
    const assigned = gameState.crewAssignments.get(data.moduleId)?.assigned ??
      0;
    const staffPct = crewRequired > 0
      ? crewScaledAmount(100, assigned, crewRequired)
      : 100;
    const productionBoostPct = productionBoostPctForModules(
      gameState.modules.values(),
      gameState.crewAssignments,
    );
    if (data.level >= 1) {
      const produced = productionAtLevel(entry, data.level);
      for (const [kind, amount] of Object.entries(produced)) {
        if (!amount) continue;
        const staffed = crewRequired > 0
          ? crewScaledAmount(amount, assigned, crewRequired)
          : amount;
        const scaled = productionBoostedAmount(staffed, productionBoostPct);
        rows.push({
          cells: [
            { label: { text: "Production", ...FIELD_LABEL } },
            {
              tile: `${RESOURCE_ICON_TILESET[kind as ResourceKind]}:0`,
              label: `${formatCompactCount(scaled)}/min${
                staffPct < 100 ? ` (${staffPct}% staffed)` : ""
              }${
                productionBoostPct > 0 ? ` (+${productionBoostPct}% boost)` : ""
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
      const configuredBoost = productionBoostPctAtLevel(entry, data.level);
      if (configuredBoost > 0) {
        const activeBoost = crewScaledAmount(
          configuredBoost,
          assigned,
          crewRequired,
        );
        rows.push(
          fieldRow(
            "Production boost",
            `+${activeBoost}% ship-wide (+${configuredBoost}% fully staffed)`,
          ),
        );
      }
      if (crewRequired > 0) {
        rows.push(
          this.crewAssignmentRow(
            data.moduleId,
            assigned,
            crewRequired,
            staffPct,
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

  private crewAssignmentRow(
    moduleId: string,
    assigned: number,
    required: number,
    staffPct: number,
  ): DialogRowDef {
    return {
      cells: [
        { label: { text: "Crew assigned", ...FIELD_LABEL } },
        { label: assigned + "/" + required + " (" + staffPct + "%)" },
        {
          button: squareButton({
            icon: "crew",
            width: 34,
            height: 34,
            label: "-1",
            disabled: assigned === 0,
            onPressed: () => void this.assignCrew(moduleId, assigned - 1),
          }),
        },
        {
          button: squareButton({
            icon: "crew",
            width: 34,
            height: 34,
            label: "+1",
            disabled: assigned >= required || this.unassignedCrew() === 0,
            onPressed: () => void this.assignCrew(moduleId, assigned + 1),
          }),
        },
      ],
    };
  }

  private unassignedCrew(): number {
    let assigned = 0;
    for (const staffing of gameState.crewAssignments.values()) {
      assigned += staffing.assigned;
    }
    return Math.max(0, gameState.crew - assigned);
  }

  private async assignCrew(moduleId: string, assigned: number): Promise<void> {
    try {
      const response = await invoke<Revisioned<CrewAssignmentResponse>>(
        "request_assign_crew",
        { moduleId, assigned },
      );
      gameState.applyCrewEvent({
        revision: response.revision,
        data: response.data.crew,
      });
    } catch (error) {
      console.warn("request_assign_crew rejected:", error);
      this.host.showToast(errorToast("Crew assignment failed: " + error));
    }
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
