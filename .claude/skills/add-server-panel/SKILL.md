---
name: add-server-panel
description: Build a server-driven dialog panel — a live list of gameState entities rendered as dialog rows that stay in sync with the backend (the P1.12 Trading Post shop's pattern). Use for feed/mail/research/list-style panels, e.g. P6.3 feed, P3.5 mail, P5.1 research.
---

# Adding a server-driven dialog panel

Several panels are really the same shape: a modal list of server-owned entities
(deals, mail, research projects, feed entries) where each row has an action
button whose enabled/disabled state depends on live `gameState` — and the list
must re-render whenever that state changes, not just when the dialog opens. The
P1.12 Trading Post shop established this shape first; follow it rather than
re-deriving it.

This skill builds on `/add-game-event` (the wire/event plumbing) and assumes
`src/ui/dialog.ts`'s modal layer (`TiledScene.openDialog`, `DialogRowDef`,
`bindDialogRows`) — read that file's header comment first if you haven't used
dialogs before.

## 1. Wire types

Mirror the Rust command response struct(s) as a TS interface, same as any
server-verified action (`/add-game-event` step 3): the entity list itself should
already ride the `load_game_state` snapshot as a self-snapshot payload
(`ModuleData`/`DealsData`-style — see CLAUDE.md § Multiplayer-ready event
pattern), and each action command additionally returns updated `ResourceCounts`
when it touches resources. Reference: `DealActionResponse`/`DealsData` in
src/ship-level.ts and src-tauri/src/game_state.rs.

## 2. Define a status enum per row-level decision

For every action button whose enabled state depends on more than one blocker,
define a string-union status type with **one variant per distinct blocker** —
never collapse them into a single `disabled: boolean`. A player who sees a
button disabled needs to know _why_ (out of stock vs. capped vs. already in
progress) rather than get a cost badge that looks unmet when the real blocker is
something else entirely.

```ts
type <Action>Status = "unavailable" | "<specific-blocker>" | "unaffordable" | "ready";
```

Reference: `LevelUpStatus`
(`"unavailable" | "capped" | "unaffordable" |
"ready"`) and `HireStatus`
(`"recruiting" | "full" | "unaffordable" | "ready"`) in src/ship-level.ts — both
documented inline with why the non-obvious blocker variant exists. Compute the
status in its own method (`levelUpStatus()`, `hireStatus()`) so both
row-building and any reconciler diff-check (`syncModules`'s
`appliedLevelUpStatus`) call the same logic.

## 3. Write `build<Panel>Rows()`

A method returning `DialogRowDef[]`, mapping live `gameState` entities to rows.
One row per entity, built by a per-row helper (`build<Entity>Row(data)`):

- Static cells (`tile`/`label`) for read-only info (icon + amount, an arrow, a
  rarity tag).
- A `button` cell (built with `roundButton`/`squareButton` from
  `src/ui/button.ts`) whose `label`/`disabled`/`badge` are derived from the
  status enum, e.g.
  `label: accepted ? "Accepted" : fits ? "Accept" :
  "No Room"`. Precompute
  affordability/fit checks as UX-only pre-checks — the backend re-verifies and
  rejects rather than silently clamping (see § 5).

Append any footer row (a refresh/paginate control) at the end. Reference:
`buildShopRows`/`buildDealRow`/`buildRefreshRow` in src/ship-level.ts.

## 4. Write `open<Panel>Dialog()`

```ts
private open<Panel>Dialog(): void {
  const buildRows = () => this.build<Panel>Rows();
  // deno-lint-ignore prefer-const
  let unbind: (() => void) | undefined;
  const handle = this.openDialog({
    title: "<Panel Title>",
    rows: buildRows(),
    onClose: () => unbind?.(),
  });
  unbind = bindDialogRows(handle, (l) => gameState.subscribe(l), buildRows);
}
```

`bindDialogRows` rebuilds the rows wholesale on every `gameState` notify — an
action response, a resource change flipping affordability, a server push — so
the dialog is always a pure render of the latest state. Always unbind in
`onClose`, or a closed dialog keeps rebuilding rows in the background.
Reference: `openShopDialog` in src/ship-level.ts.

## 5. Wire the action methods

Each row button's `onPressed` calls a private `async` method following the
standard server-verified action shape (`/add-game-event` step 3): `invoke` the
Tauri command, apply the returned resources via `gameState.syncResources`, and
apply the returned self-snapshot event via its `apply<Entity>Event`/
`gameState.apply<Entity>Event`. Reject explicitly rather than clamping —
`console.warn` on `catch`, matching every other action (ROADMAP P1.15 is the
toast task that replaces this with real UI feedback). Reference:
`acceptDeal`/`refreshDeals` in src/ship-level.ts.

## 6. Open the panel from somewhere

Wire a HUD button (`addHudGroup`/`addCommonHud`) or an entity's action button
(`TileActor` `buttons`) to call `open<Panel>Dialog()`. If the panel is a
top-level destination, it likely already has a placeholder button with a ROADMAP
task attached (HUD Shop → P4.8, Items → P6.5, feed → P6.3, mail → P3.5) — check
ROADMAP before adding a new one.

## Checklist before declaring done

- [ ] Wire types mirror the Rust response struct(s); the entity list itself
      rides the snapshot as a self-snapshot payload.
- [ ] Every multi-blocker button has a status enum with one variant per distinct
      blocker — no bare `disabled: boolean` hiding the reason.
- [ ] `build<Panel>Rows()` builds rows from live `gameState`, not a local copy.
- [ ] `open<Panel>Dialog()` binds rows with `bindDialogRows` and unbinds in
      `onClose`.
- [ ] Action methods are server-verified: `invoke` → `syncResources` +
      `apply*Event`; rejections caught and logged, never clamped client-side.
- [ ] `deno task format` and `deno task check` pass.
- [ ] Run **`/verify`** and drive the panel in the dev app — open it, trigger an
      action, and confirm the rows update live with no console errors.

## Reference

The P1.12 Trading Post shop is the canonical implementation, entirely in
src/ship-level.ts: `LevelUpStatus`/`HireStatus` (status enums),
`openShopDialog`/`buildShopRows`/`buildDealRow`/`buildRefreshRow` (panel +
rows), `acceptDeal`/`refreshDeals` (actions). The modal layer itself
(`DialogDef`, `DialogRowDef`, `bindDialogRows`, `TiledScene.openDialog`) lives
in src/ui/dialog.ts — read its header comment for the full input-capture and
z-ordering model.
