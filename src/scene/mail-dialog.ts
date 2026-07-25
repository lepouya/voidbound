import * as ex from "excalibur";

import { invoke } from "@tauri-apps/api/core";

import {
  bindDialogRows,
  DialogDef,
  DialogHandle,
  DialogRowDef,
  formatTimeAgo,
} from "../ui/index.ts";
import {
  gameState,
  NotificationData,
  Revisioned,
  serverNow,
} from "../state/game-state.ts";

const NOTIFICATION_ROW_HEIGHT = 36;
const VISIBLE_ROWS = 10;
const ROW_GAP = 4;
const TAB_WIDTH = 100;
const TAB_HEIGHT = 28;
const UNREAD_COLOR = ex.Color.White;
const READ_COLOR = ex.Color.fromRGB(150, 150, 165);

/** Only what MailDialog needs from its host scene. */
export interface MailDialogHost {
  openDialog(def: DialogDef): DialogHandle;
}

/**
 * The Mail panel (ROADMAP P1.21): a modal with a pinned tab strip
 * (`headerRow`) and a scrollable, live-bound list of `gameState.notifications`
 * — the first consumer of dialog.ts's scroll/headerRow additions. Only the
 * Notifications tab has content; Player Mail and System Mail render as
 * disabled placeholders for P3.5 to enable. One instance is owned by
 * TiledScene and shared by every scene via the common HUD's Mail button.
 */
export class MailDialog {
  private handle: DialogHandle | null = null;

  constructor(private readonly host: MailDialogHost) {}

  /** Open the panel and mark the whole feed read, same as the button's old
   *  console-dump behavior — opening the panel *is* acknowledging it. */
  open(): void {
    const buildRows = () => this.buildNotificationRows();
    // deno-lint-ignore prefer-const
    let unbind: (() => void) | undefined;
    const handle = this.host.openDialog({
      title: "Mail",
      headerRow: this.buildHeaderRow(),
      scroll: { rowHeight: NOTIFICATION_ROW_HEIGHT, visibleRows: VISIBLE_ROWS },
      layout: { rowGap: ROW_GAP },
      rows: buildRows(),
      onClose: () => {
        unbind?.();
        if (this.handle === handle) this.handle = null;
      },
    });
    unbind = bindDialogRows(handle, (l) => gameState.subscribe(l), buildRows);
    this.handle = handle;
    void this.markAllRead();
  }

  /** The tab strip: only Notifications is live — Player Mail/System Mail
   *  (P3.5) render disabled so the panel's eventual shape is visible now. */
  private buildHeaderRow(): DialogRowDef {
    const tab = (
      label: string,
      active: boolean,
      disabled: boolean,
    ): DialogRowDef["cells"][number] => ({
      button: {
        frameTile: "ui-frame-square:0",
        activeFrameTile: "ui-frame-square:1",
        disabledFrameTile: "ui-frame-square:2",
        active,
        disabled,
        label,
        labelPosition: "center",
        labelVerticalAlign: "middle",
        width: TAB_WIDTH,
        height: TAB_HEIGHT,
        onPressed: () => {},
      },
    });
    return {
      height: TAB_HEIGHT + 6,
      cells: [
        tab("Notifications", true, false),
        tab("Player Mail", false, true),
        tab("System Mail", false, true),
      ],
    };
  }

  private buildNotificationRows(): DialogRowDef[] {
    const all = [...gameState.notifications.values()].sort((a, b) =>
      b.createdAt - a.createdAt
    );
    if (all.length === 0) {
      return [{ cells: [{ label: "No notifications yet." }] }];
    }
    return all.map((n) => this.buildNotificationRow(n));
  }

  private buildNotificationRow(n: NotificationData): DialogRowDef {
    const color = n.read ? READ_COLOR : UNREAD_COLOR;
    return {
      height: NOTIFICATION_ROW_HEIGHT,
      cells: [
        {
          weight: 3,
          align: "left",
          label: { text: (n.read ? "" : "● ") + formatNotification(n), color },
        },
        {
          weight: 1,
          label: { text: formatTimeAgo(serverNow() - n.createdAt), color },
        },
      ],
    };
  }

  private async markAllRead(): Promise<void> {
    if (gameState.unreadNotificationCount() === 0) return;
    try {
      const notifications = await invoke<Revisioned<NotificationData[]>>(
        "mark_notifications_read",
      );
      gameState.syncNotifications(notifications);
    } catch (err) {
      console.warn("mark_notifications_read rejected:", err);
    }
  }
}

/** Client-owned display text for the typed notification wire contract. New
 * known variants must be added here; a newer server kind remains readable by
 * the fallback while a client upgrade is pending. */
export function formatNotification(notification: NotificationData): string {
  switch (notification.kind) {
    case "module-completed":
      return notification.operation === "build"
        ? `${notification.moduleType} construction complete`
        : `${notification.moduleType} upgraded to level ${notification.level}`;
    case "crew-hired":
      return `A new crew member came aboard (${notification.crew} total)`;
    case "mining-started":
      return `Vessel started mining at (${notification.col}, ${notification.row})`;
    case "asteroid-depleted":
      return `Asteroid mined out — ${notification.tier} ${notification.resource} deposit at (${notification.col}, ${notification.row})`;
    case "vessel-returned": {
      const cargo = notification.cargo;
      if (cargo === null) return "Vessel returned to the mothership";
      const loss = cargo.lost > 0 ? ` — storage full, ${cargo.lost} lost` : "";
      return `Vessel returned with ${cargo.accepted} ${cargo.resource}${loss}`;
    }
    case "mothership-warped":
      return `Mothership warped from (${notification.fromCol}, ${notification.fromRow}) to (${notification.toCol}, ${notification.toRow})`;
    case "deals-refreshed":
      return "New deals are in at the Trading Post";
    default:
      // Defensive runtime fallback for a newer server kind arriving before
      // this client has its matching union member.
      return `New notification (${(notification as { kind: string }).kind})`;
  }
}
