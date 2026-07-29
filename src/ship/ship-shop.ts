import * as ex from "excalibur";

import { invoke } from "@tauri-apps/api/core";

import {
  DealActionResponse,
  DealData,
  gameState,
  ResourceKind,
  Revisioned,
} from "../state/game-state.ts";
import {
  crewRequiredAtLevel,
  moduleCatalogEntry,
  storageCapsForModules,
  TRADING_POST_MODULE_TYPE,
} from "./module-catalog.ts";
import { RESOURCE_ICON_TILESET } from "../scene/tiled-scene.ts";
import {
  DEAL_RARITY_STYLE,
  dealRefreshCost,
  MAX_DEAL_REFRESHES_PER_DAY,
} from "./trade-catalog.ts";
import {
  bindDialogRows,
  DialogCellDef,
  DialogDef,
  DialogHandle,
  DialogRowDef,
  errorToast,
  formatCompactCount,
  squareButton,
  ToastDef,
} from "../ui/index.ts";

/** Styling for the daily freebie's give cell — a gift, not a price. */
const GIFT_LABEL_COLOR = ex.Color.fromHex("#ffcc4d");

/** Scene services ShopDialog needs — the modal slot, plus rejection
 *  surfacing (toasts render above the open dialog). */
export interface ShopDialogHost {
  openDialog(def: DialogDef): DialogHandle;
  showToast(toast: string | ToastDef): void;
}

/**
 * Owns the Trading Post shop dialog (ROADMAP P1.12): one row per
 * server-rolled deal plus a refresh footer, and the accept/refresh requests
 * behind them. The rows are state-bound (bindDialogRows): every gameState
 * notify — an accept/refresh response, a resource change flipping
 * affordability, the daily-reset push — rebuilds them wholesale, so the
 * dialog is always a pure render of the last server-reported shop.
 */
export class ShopDialog {
  constructor(private readonly host: ShopDialogHost) {}

  open(): void {
    if (!this.tradingPostOperational()) {
      this.host.showToast(
        errorToast("Trading Post needs 1 assigned crew member"),
      );
      return;
    }
    const buildRows = () => this.buildRows();
    // onClose below closes over `unbind` before it's assigned (it's only
    // known once `handle` exists), so it can't be a single const init.
    // deno-lint-ignore prefer-const
    let unbind: (() => void) | undefined;
    const handle = this.host.openDialog({
      title: "Trading Post",
      rows: buildRows(),
      onClose: () => unbind?.(),
    });
    unbind = bindDialogRows(handle, (l) => gameState.subscribe(l), buildRows);
  }

  /** One row per deal, then the refresh footer. */
  private buildRows(): DialogRowDef[] {
    if (!this.tradingPostOperational()) {
      return [{
        cells: [{ label: "Needs 1 assigned crew member", weight: 1 }],
      }];
    }
    const caps = storageCapsForModules(gameState.modules.values());
    const rows: DialogRowDef[] = gameState.deals.deals.map((deal) =>
      this.buildDealRow(deal, caps)
    );
    rows.push(this.buildRefreshRow());
    return rows;
  }

  private tradingPostOperational(): boolean {
    const post = [...gameState.modules.values()].find(
      (module) =>
        module.moduleType === TRADING_POST_MODULE_TYPE && module.level >= 1,
    );
    const entry = moduleCatalogEntry(TRADING_POST_MODULE_TYPE);
    if (!post || !entry) return false;
    const required = crewRequiredAtLevel(entry, post.level);
    return (gameState.crewAssignments.get(post.moduleId)?.assigned ?? 0) >=
      required;
  }

  /**
   * One deal row: give side → get side, the rarity tag, and Accept. The
   * disabled pre-checks (affordability, storage room) are UX only — the
   * backend re-verifies both and rejects rather than clamping (an explicit
   * action must never silently burn the purchase).
   */
  private buildDealRow(
    deal: DealData,
    caps: Record<ResourceKind, number>,
  ): DialogRowDef {
    const rarity = DEAL_RARITY_STYLE[deal.rarity];
    const giveCell: DialogCellDef = deal.give === null
      ? { label: { text: "Free", fontSize: 12, color: GIFT_LABEL_COLOR } }
      : {
        tile: `${RESOURCE_ICON_TILESET[deal.give.kind]}:0`,
        label: formatCompactCount(deal.give.amount, 1_000),
      };
    const affordable = deal.give === null ||
      gameState.resources[deal.give.kind] >= deal.give.amount;
    // Storage room for the get side (credits are uncapped: Infinity).
    const fits = gameState.resources[deal.get.kind] + deal.get.amount <=
      caps[deal.get.kind];
    return {
      cells: [
        giveCell,
        { label: "→", weight: 0.5 },
        {
          tile: `${RESOURCE_ICON_TILESET[deal.get.kind]}:0`,
          label: formatCompactCount(deal.get.amount, 1_000),
        },
        {
          label: {
            text: rarity.label,
            color: ex.Color.fromHex(rarity.colorHex),
          },
          weight: 0.9,
        },
        {
          button: squareButton({
            icon: "buy",
            width: 40,
            height: 40,
            // "No Room" (the get side won't fit storage) is the non-obvious
            // blocker — an unmet give side is already visible in the row.
            label: deal.accepted ? "Accepted" : fits ? "Accept" : "No Room",
            disabled: deal.accepted || !affordable || !fits,
            onPressed: () => void this.acceptDeal(deal.dealId),
          }),
        },
      ],
    };
  }

  /**
   * The shop footer: refreshes left (with the freebie-forfeit hint when one
   * is still unclaimed — refreshing replaces every slot) and the Refresh
   * button wearing the next use's credits price.
   */
  private buildRefreshRow(): DialogRowDef {
    const used = gameState.deals.refreshesUsed;
    const cost = dealRefreshCost(used);
    const freebiePending = gameState.deals.deals.some(
      (d) => d.give === null && !d.accepted,
    );
    const text = cost === null
      ? "No refreshes left today"
      : freebiePending
      ? "Refreshing forfeits the unclaimed gift"
      : `${
        MAX_DEAL_REFRESHES_PER_DAY - used
      } of ${MAX_DEAL_REFRESHES_PER_DAY} refreshes left today`;
    return {
      cells: [
        { label: { text, fontSize: 9 }, weight: 3 },
        {
          button: squareButton({
            icon: "refresh",
            width: 40,
            height: 40,
            label: "Refresh",
            badge: cost === null
              ? undefined
              : cost === 0
              ? "Free"
              : formatCompactCount(cost, 1_000),
            disabled: cost === null || gameState.resources.credits < cost,
            onPressed: () => void this.refreshDeals(),
          }),
        },
      ],
    };
  }

  /**
   * Asks the backend to accept a deal (ROADMAP P1.12). The backend verifies
   * the settled Trading Post, the deal's state, the give-side cost, and
   * get-side storage room, applies the exchange, and returns the
   * authoritative deal state plus updated counts; applying both fans out to
   * the open dialog's state-bound rows. Same event-pattern shape as
   * ModuleSync.build/hireCrew.
   */
  private async acceptDeal(dealId: string): Promise<void> {
    try {
      const response = await invoke<Revisioned<DealActionResponse>>(
        "request_accept_deal",
        { dealId },
      );
      gameState.syncResources({
        revision: response.revision,
        data: response.data.resources,
      });
      gameState.applyDealsEvent({
        revision: response.revision,
        data: response.data.deals,
      });
    } catch (err) {
      console.warn("request_accept_deal rejected:", err);
      this.host.showToast(errorToast(`Trade failed: ${err}`));
    }
  }

  /**
   * Asks the backend to refresh the deal slots (ROADMAP P1.12). The backend
   * verifies the daily cap and the doubling credits cost, deducts it, and
   * returns the authoritative deal state plus updated counts.
   */
  private async refreshDeals(): Promise<void> {
    try {
      const response = await invoke<Revisioned<DealActionResponse>>(
        "request_refresh_deals",
      );
      gameState.syncResources({
        revision: response.revision,
        data: response.data.resources,
      });
      gameState.applyDealsEvent({
        revision: response.revision,
        data: response.data.deals,
      });
    } catch (err) {
      console.warn("request_refresh_deals rejected:", err);
      this.host.showToast(errorToast(`Refresh failed: ${err}`));
    }
  }
}
