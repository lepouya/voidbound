# Trading Post (P1.12) — Design Doc

**Status: design settled (July 2026) — not yet implemented.** This doc records
the design for ROADMAP P1.12 and its UI prerequisite (P1.14) so it persists
across sessions; § 8 logs the decisions.

**This file is temporary working state, not permanent documentation.** It only
exists to carry the design across work sessions. Once P1.14 and P1.12 are both
implemented, **delete this file**: graduate the settled parts to
README/CLAUDE/SERVER as usual, compact the roadmap entries to the standard
done-item summary, and move anything still open into the roadmap's "Still open"
notes (mostly → P2.5 balancing, P4.6 economy).

## 1. Scope and goals

P1.12 as written: "Buy/sell the 4 resources with NPCs at a markup/markdown …
introduces the generic trade currency ('credits') as a non-produced fifth
count." The design direction (this doc) reshapes that from an open buy/sell
price list into a **deal-slot shop**: the Trading Post offers a small set of
concrete, randomized exchange deals that refresh on a daily cycle. Same intent
(resource liquidity between mining runs, credits introduction), better game feel
(concrete offers > abstract exchange rates), and it scales naturally with the
building's level.

Two deliverables fall out, and they are **separate tasks**:

1. **A generic dialog/overlay system** — roadmap task **P1.14**, prerequisite of
   P1.12. Reusable for every future panel (notification feed P6.3, mail P3.5,
   research tree P5.1, module info…).
2. **The Trading Post itself** — catalog module + server-side deals + the shop
   dialog built on (1).

## 2. Prerequisite: dialog/overlay system (P1.14)

Nothing in the game today is a modal: HUD groups are always-on screen-space
button clusters, and world buttons hang off selected actors. A shop needs a real
windowing layer.

### Requirements

- **Modal screen-space panel** over the current scene: dimming scrim + framed
  panel + title + close button + content region.
- **Input capture**: while a dialog is open it swallows _all_ pointer input — no
  camera pan/zoom, no world taps, no HUD taps underneath. One dialog open at a
  time is enough for now (no stacking); opening a new one closes the old.
- **Z-space**: a `MODAL_BASE_Z` above `HUD_BASE_Z` (e.g. `20_000`) in
  `src/ui/hud.ts`'s spirit — scrim at base, panel content stacked above it.
- **Composition, not invention**: content is built from the existing `ui/`
  primitives (`LabelDef`, `ButtonDef`, TileRef graphics, badges). The dialog
  contributes layout + lifecycle, not new widget types.
- **Pure layout math** in a new `src/ui/dialog-layout.ts` (no runtime imports,
  unit-tested — same shape as `hud-layout.ts`): panel rect from screen size +
  margins, row/slot rects from a slot count. Portrait 390*844 is the design
  target but resize must relayout (enroll via the same mechanism as
  `registerHudTarget`).
- **Disabled button state**: greyed-out, non-interactive buttons — needed for
  accepted deals, first real consumer of a disabled state in `ButtonDef`.

### Non-goals (deliberately deferred)

- **Scrolling.** P6.3 explicitly plans the first scrollable list panel. The shop
  shows at most 6 fixed slots — they fit portrait without scrolling. Keep the
  content region a distinct sub-rect so P6.3's scrollable region can drop into
  it later, but don't build scrolling now.
- **Dialog stacking / window management.** One modal at a time.
- **Cross-scene persistence.** A dialog is spawned into the current scene via a
  `TiledScene` helper (e.g. `openDialog(def)` / `closeDialog()`); switching
  scenes closes it. This matches how HUD groups already live per-scene.

### Integration sketch

`TiledScene` gains a modal slot. While set, its pointer handlers early-return
(cheaper and more robust than fighting Excalibur event ordering), and dialog
buttons run the same confirmed-tap logic HUD buttons use. New module
`src/ui/dialog.ts` (`DialogDef`, `spawnDialog`) + pure `dialog-layout.ts`; both
exported per the existing barrel/pure-module split.

## 3. Trading Post module

New `MODULE_CATALOG` entry `"trading-post"` (game_state.rs + the TS mirror): no
`produces`, no `stores` — its function is the deal panel. Modest crew demand
like other functional modules. Unlock at a low-mid Command Module level (exact
level: balancing stub → P2.5). Selecting a settled (level ≥ 1) Trading Post
shows a **Trade** action button that opens the shop dialog. Level 0 / mid-build
shows nothing (consistent with P1.10's "zero and earned" starting-state
preference).

## 4. Deals model (server-authoritative)

All deal state lives in `ServerState` — generation, acceptance, refresh, and the
daily cycle are Rust-side; the client only renders (zero-trust, as with every
resource-touching action). Deals ride the `load_game_state` snapshot, so they
persist across window reopens and scene switches for free, and P2.1 save/load
will pick them up with no extra work.

```text
DealData {
  id:        stable string ("deal-<day>-<slot>-<n>")
  slot:      u32           // 0..slots-1, stable within the day
  rarity:    common | uncommon | rare
  give:      Option<(trade-type, amount)>  // None = the daily freebie
  get:       (trade-type, amount)
  accepted:  bool          // greyed out client-side once true
}
```

### Deal shape

No flavor taxonomy: every deal is a single generic exchange. `give` and `get`
types are each drawn from the **5 trade-eligible types** — the 4 resources plus
credits — with one hard, server-enforced invariant: **give type ≠ get type**,
always (a "10 X for 12 X" deal is never generated and never accepted even if the
client asks). Credits on the give side is buying, credits on the get side is
selling — both fall out of the general mechanic rather than being special cases.
**This is where credits enter the economy** (README: credits are "earned through
trade rather than production or mining" — `ServerState.credits` already exists,
uncapped, seeded 0), and credits-give deals plus paid refreshes are the sink,
closing the loop.

Anything that involves an actual counterparty player — negotiated trades,
player-to-player exchange — is explicitly out of scope; that mechanism is
designed in P4.6 (needs P3.1).

### Rarity

Every deal rolls a rarity that sets how player-favorable the exchange is — the
rarity multiplies the **get** side; the give side keeps the affordability cap
(below):

| Rarity   | Get bonus | Weight (stub) |
| -------- | --------- | ------------- |
| common   | +20%      | ~70%          |
| uncommon | +50%      | ~25%          |
| rare     | +100%     | ~5%           |

Rarity is shown in the deal row (label/color; art polish later). With the 4
resources value-equivalent for now (all balancing is stubbed until P2.5),
"value" is just the raw amount; the bonus tiers, weights, and the
credits-per-unit rate are named constants ready for P2.5 retuning.

### The daily freebie

- Exactly **one freebie per daily cycle**, generated in slot 0 at the daily
  reset: `give: None`, get a small amount of a random trade type (resources or a
  few credits — the bootstrap path so a new player can eventually afford paid
  refreshes).
- It is deliberately **basic**: amounts come from a separate small constant
  band, _not_ the deal-sizing rule below — never a big win, just a daily growth
  nudge.
- **Refreshes never produce a new freebie** (see § 5): once the day's freebie is
  claimed — or forfeited by refreshing past it — it's gone until the next daily
  reset.

### Sizing (worthwhile, affordable, not overpowered)

- `give` amount scales with Trading Post level (through the existing
  `scale_for_level` stub for now) **and is capped at a fraction of the player's
  current storage cap** for that resource (e.g. ≤ 20% of cap) — this single rule
  keeps deals affordable at every progression stage and makes "trade a million
  resources" structurally impossible. (Credits are uncapped, so a credits-give
  amount just uses the level scale directly.)
- Because deals are player-favorable (+20% to +100% by rarity), the shop is a
  bounded resource faucet: worst case ≈ slots * refreshes * rarity surplus per
  day. Bounded by design; the exact leak rate is a P2.5 balancing input.

### Slot count by level

Start at 3 slots, +1 every 2 Trading Post levels, capped at 6:
`slots = min(6, 3 + (level - 1) / 2)` → levels 1–2: 3, 3–4: 4, 5–6: 5, 7+: 6.
Level scaling = more deals (simple, legible). "Better ratios at higher level" is
deferred to P2.5 — one scaling axis is enough for v1, and slot count is the more
visible reward.

## 5. Daily cycle and refresh

- **Fixed daily reset** (00:00 UTC), not a rolling 24 h window — matches the
  README's diminishing-returns principle ("resetting at a fixed point", P1.7)
  and is trivially server-verifiable. The scheduler gains a daily deadline
  alongside production/build/vessel deadlines: regenerate all deals, clear
  `accepted`, reset the refresh counter, push the new state.
- **Deterministic generation**: seeded RNG from (player id, day index, slot) —
  same precedent as `seed_asteroids`. Regeneration is reproducible and
  server-cheap.
- **Refresh button** in the shop dialog: replaces **all** slots (accepted ones
  included — it's both a re-roll and a "give me more deals today" mechanic).
  Every replacement slot is a normal random deal — **a refresh never generates a
  new freebie**; an unclaimed freebie is forfeited by refreshing (the player's
  call — worth a confirm hint in the UI if the freebie is still unclaimed).
  First refresh each day is free; subsequent ones cost credits, doubling each
  time, hard cap 5 refreshes/day: `free, 10, 20, 40, 80` (constants;
  P2.5-tunable). Count + cost verified server-side; the response carries the new
  deals + updated counts.

Until P2.1 lands, a restart reseeds everything anyway — the daily cycle only
matters within long sessions. Design carries `deals_day_index` and
`refreshes_used_today` in `ServerState` regardless so persistence inherits it.

## 6. Commands and events (via `/add-game-event`)

Follows the server-verified event pattern; `ModuleData`-style "the event is the
snapshot" applies — a deals push/response carries the full deal list.

- `request_accept_deal(deal_id)` — verify: deal exists for the current day, not
  yet accepted, player holds the `give` amount, and the `get` amount **fits in
  storage — otherwise reject** with a clear error (unlike P1.11's clamp-and-lose
  for passive production, an explicit player action must never silently burn the
  purchase). Applies the exchange, marks accepted, returns updated deals +
  resource counts.
- `request_refresh_deals()` — verify count < 5, deduct the tier cost, regenerate
  all slots, return deals + counts.
- Snapshot: `load_game_state` gains the deal list + refresh state.
- Push channel: a `deals` push at the daily-reset settle (and covering any
  future server-initiated deal change). Accept/refresh responses use the same
  apply entry point (`gameState.applyDeals(...)`).

## 7. Shop dialog UI

- Opened from the settled Trading Post's **Trade** button. Each deal row: give
  side (resource icon + amount) → get side, an **Accept** button (disabled +
  greyed once accepted or while unaffordable), freebie row styled as a gift.
  Footer: **Refresh** button with its current cost (or "Free") and remaining
  count; the resource bar stays visible above the dialog for reference.
- Amount displays use `formatCompactCount`; resource icons reuse the resource
  bar's TileRefs.

## 8. Decisions log (settled July 2026)

1. **Roadmap**: the dialog system is its own Phase-1 task, **P1.14**, and P1.12
   needs it.
2. **Deal shape**: no flavor taxonomy — one generic exchange over the 5
   trade-eligible types (4 resources + credits), give ≠ get enforced
   server-side. Anything needing an actual counterparty player is punted to
   P4.6.
3. **Rarity tiers**: common +20% / uncommon +50% / rare +100% on the get side;
   weights are P2.5-tunable stubs.
4. **Freebie**: once per daily cycle only; refreshes never mint a new one;
   contents are a random mix of trade types but always small ("basic, never too
   much").
5. **Refresh**: replaces all slots (accepted included) with normal random deals
   — the "more deals" mechanic, forfeiting an unclaimed freebie.
6. **Storage overflow on accept**: reject with a clear error, never
   clamp-and-lose.
7. **Shop HUD button**: stays reserved for a future premium/IAP shop; the
   Trading Post shop opens only through the module itself.

## 9. Later / out of scope here

- Real deal balancing (rarity bonuses/weights, credit rate, cap fraction, slot
  curve, refresh costs, freebie band, unlock level) → P2.5.
- Daily _rotating featured_ deals, limited-stock deals → P4.6 credits-economy
  design.
- Player-to-player and alliance trade (any deal with a real counterparty) → P4.6
  (needs P3.1).
- Scrollable dialog content → P6.3.
- Trading Post art → P6.1; deal/resource icon art polish → P6.2-adjacent.
