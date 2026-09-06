import * as ex from "excalibur";

import { gameState, RESOURCE_KINDS } from "../state/game-state.ts";
import { storageThreshold } from "../state/storage-threshold.ts";
import {
  crewCapacityForModules,
  storageCapsForModules,
} from "../ship/module-catalog.ts";
import {
  bindDialogRows,
  DialogDef,
  DialogHandle,
  DialogRowDef,
} from "../ui/index.ts";
import {
  productionForModules,
  RESOURCE_ICON_TILESET,
  RESOURCE_NAMES,
} from "./resource-summary.ts";

/** Shared read-only overview, available from every resource/crew HUD icon. */
export class ResourceDetailsDialog {
  constructor(
    private readonly host: { openDialog(def: DialogDef): DialogHandle },
  ) {}

  open(): void {
    // deno-lint-ignore prefer-const
    let unbind: (() => void) | undefined;
    const buildRows = () => this.buildRows();
    const handle = this.host.openDialog({
      title: "Resources & Crew",
      rows: buildRows(),
      layout: { rowGap: 4 },
      scroll: { rowHeight: 78, visibleRows: 6 },
      onClose: () => unbind?.(),
    });
    unbind = bindDialogRows(
      handle,
      (listener) => gameState.subscribe(listener),
      buildRows,
    );
  }

  private buildRows(): DialogRowDef[] {
    const caps = storageCapsForModules(gameState.modules.values());
    const rates = productionForModules(
      gameState.modules.values(),
      gameState.crewAssignments,
    );
    const count = (value: number) => value.toLocaleString("en-US");
    const rows: DialogRowDef[] = RESOURCE_KINDS.map((kind) => {
      const amount = gameState.resources[kind];
      const threshold = storageThreshold(amount, caps[kind]);
      const detail = kind === "credits"
        ? `Total ${
          count(amount)
        } · No storage limit\nEarned through trade\nNo passive production`
        : `Total ${count(amount)} · Storage ${count(caps[kind])}\nProtected ${
          count(threshold.protectedAmount)
        } · Exposed ${count(threshold.exposedAmount)}\n${
          threshold.passiveProductionPaused
            ? "Paused at storage limit"
            : "Producing"
        } · ${count(rates[kind])}/min nominal`;
      return {
        cells: [
          {
            tile: `${RESOURCE_ICON_TILESET[kind]}:0`,
            label: RESOURCE_NAMES[kind],
          },
          {
            weight: 3,
            align: "left",
            label: {
              text: detail,
              fontSize: 10,
              color: threshold.exposedAmount > 0
                ? ex.Color.fromHex("#e8b23a")
                : undefined,
            },
          },
        ],
      };
    });
    let assigned = 0;
    for (const allocation of gameState.crewAssignments.values()) {
      assigned += allocation.assigned;
    }
    rows.push({
      cells: [
        { tile: "ui-icon-crew:0", label: "Crew" },
        {
          weight: 3,
          align: "left",
          label: {
            text: `Crew ${count(gameState.crew)} · Berths ${
              count(crewCapacityForModules(gameState.modules.values()))
            }\nAssigned ${count(assigned)} · Available ${
              count(Math.max(0, gameState.crew - assigned))
            }\nAssign crew in module Details`,
            fontSize: 10,
          },
        },
      ],
    });
    return rows;
  }
}
