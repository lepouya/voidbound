import {
  attemptGameStateLoad,
  LoadFailure,
  resetLocalSystem,
} from "../state/game-state-loader.ts";
import { DialogDef, DialogRowDef } from "../ui/index.ts";

/**
 * The blocking dialog a scene shows when the initial game-state load failed
 * (ROADMAP P2.6 review, F5).
 *
 * There is deliberately no playable degraded mode: the client carries no
 * local balance numbers, so a failed load means no catalog, no world, and
 * nothing to do — a silent empty game is worse than saying so. The loader
 * itself still never blocks `game.start()` (AGENTS.md § Startup / loader
 * phase); the loading screen finishes and *this* is what greets the player.
 *
 * The two failure kinds need different words. "unreachable" is transient and
 * worth retrying. "incompatible" means the client is out of date — retrying
 * will fail identically, and once Phase 3 serves real clients that case has
 * to send the player to an app update or a page reload. Both offer Retry,
 * because a backend that has since been restarted (or updated) can satisfy
 * either without a relaunch.
 */
export interface LoadFailureDialogHost {
  openDialog(def: DialogDef): void;
  closeDialog(): void;
}

function failureText(failure: LoadFailure): string[] {
  if (failure.kind === "incompatible") {
    return [
      "This client is out of date.",
      "The server's data format is newer than this",
      "build understands. Update the app, or",
      "reload the page, and try again.",
    ];
  }
  return [
    "Could not reach the game server.",
    "Your progress is safe — it lives on the",
    "server, not in this window.",
  ];
}

/**
 * Build the modal for an outstanding load failure. `onResolved` runs when an
 * attempt succeeds, so the scene can close the dialog and rebuild itself
 * from the freshly loaded state.
 *
 * The Reset control is development-only and destroys the entire local
 * system. It exists because in-progress balance work can leave a local save
 * that no longer loads, and hunting down the file by hand is a bad use of a
 * playtest. The backend refuses the command in release builds regardless of
 * what the client offers, and both halves go away once Phase 3 owns the
 * authoritative state.
 */
export function loadFailureDialog(
  failure: LoadFailure,
  host: LoadFailureDialogHost,
  onResolved: () => void,
  allowReset = import.meta.env.DEV,
): DialogDef {
  const rows: DialogRowDef[] = failureText(failure).map((text) => ({
    cells: [{ label: { text, fontSize: 10 } }],
  }));
  rows.push({
    cells: [{ label: { text: failure.message, fontSize: 8 } }],
  });

  const attempt = (run: () => Promise<LoadFailure | null>) => async () => {
    const result = await run();
    if (result === null) {
      host.closeDialog();
      onResolved();
    } else {
      // Still failing, possibly for a new reason — reopen with fresh text.
      host.openDialog(loadFailureDialog(result, host, onResolved, allowReset));
    }
  };

  const buttons: DialogRowDef = {
    cells: [
      {
        button: {
          label: "Retry",
          onPressed: () => void attempt(() => attemptGameStateLoad())(),
        },
      },
    ],
  };
  if (allowReset) {
    buttons.cells.push({
      button: {
        label: "Reset (dev)",
        onPressed: () => void attempt(resetLocalSystem)(),
      },
    });
  }
  rows.push(buttons);

  return {
    title: failure.kind === "incompatible" ? "Update required" : "Load failed",
    rows,
    // Dismissing would leave the player in the empty state the dialog is
    // reporting, with no way back to it.
    dismissable: false,
  };
}
