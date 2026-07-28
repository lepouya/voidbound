/**
 * Wire-shape types for shared cross-scene game state (ROADMAP P0.12).
 *
 * Pure module — no Excalibur/Vite imports — so it stays unit-testable under
 * Deno. Not runtime logic: every type here mirrors a Rust struct/enum in
 * src-tauri/src/game_state/ (each doc comment names its counterpart) and
 * describes what the backend last sent. game-state.ts re-exports everything
 * below alongside the `GameState` class that holds it.
 */

export interface PlayerIdentity {
  readonly id: string;
  readonly name: string;
}

/**
 * Authoritative wire envelope shared by snapshots, command responses, and
 * pushes. The Rust server advances one global revision at each state-lock
 * boundary. GameState compares it per state slice/entity, preventing late
 * messages from rolling back newer data without discarding unrelated fields.
 * Mirrors `Revisioned<T>` in src-tauri/src/game_state/state.rs.
 */
export interface Revisioned<T> {
  revision: number;
  data: T;
}

/**
 * The four material resources (README § Design principles) plus a generic
 * currency for the trade economy. "credits" is a placeholder term — the
 * player-facing name settles later in the display layer (likely with the
 * P1.12 trading post), so only rendering code should ever spell it out. Key
 * names are shared with the Rust `ResourceCounts` wire shape (serde
 * camelCase).
 */
export type ResourceKind =
  | "construction"
  | "highTech"
  | "biological"
  | "fuel"
  | "credits";

export const RESOURCE_KINDS: readonly ResourceKind[] = [
  "construction",
  "highTech",
  "biological",
  "fuel",
  "credits",
];

export type ResourceCounts = Record<ResourceKind, number>;

/**
 * The four material resources a module can produce, a build can cost, or an
 * asteroid can yield — everything except the trade-only currency. Matches
 * the serialized form of the Rust `ResourceKind` in
 * src-tauri/src/game_state/resources.rs — keep the two in sync.
 */
export type MaterialResourceKind = Exclude<ResourceKind, "credits">;

export interface ModuleCatalogData {
  moduleType: string;
  displayName: string;
  produces: [MaterialResourceKind, number][];
  /** Storage granted once settled at any level, plus storage added per
   *  settled level: `base + perLevel * level`. Split in two rather than one
   *  field plus an "is it flat?" branch, so no type is a special case. */
  storesBase: [MaterialResourceKind, number][];
  storesPerLevel: [MaterialResourceKind, number][];
  /** Crew berths, same base + per-level shape as `stores`. */
  crewCapacityBase: number;
  crewCapacityPerLevel: number;
  crewRequiredPerLevel: number;
  /** Extra materials charged from `operationalCostStartLevel` on, each at
   *  the supplemental fraction. A list, not one material: some types are
   *  honestly both "houses humans" and "houses robotics". Amounts sum into
   *  their slot, so a list containing highTech pays it twice past
   *  `highTechCostStartLevel`. */
  operationalCosts: MaterialResourceKind[];
  /** Exact cost multiplier over the shared construction curve, reaching the
   *  supplemental materials derived from it. Separate from the build-time
   *  multiplier even where the two currently agree, so cost and speed can be
   *  tuned apart without a schema change. */
  costNumerator: number;
  costDenominator: number;
  buildTimeNumerator: number;
  buildTimeDenominator: number;
  unlockCommandLevel: number;
}

export interface BalanceCatalogData {
  schemaVersion: number;
  modules: ModuleCatalogData[];
  baseBuildTimesMs: number[];
  postLevel10BuildTimeMs: number;
  constructionCostLevelOne: number;
  constructionCostNumerator: number;
  constructionCostDenominator: number;
  productionNumerator: number;
  productionDenominator: number;
  /** Fixed-point scale the production curve compounds in before its single
   *  rounding — the mirror must use the server's value to match exactly. */
  productionPrecision: number;
  /** Production ticks per minute; `produces` is stated per minute. */
  ticksPerMinute: number;
  operationalCostStartLevel: number;
  highTechCostStartLevel: number;
  /** Global module-level ceiling, enforced by the server for the Command
   * Module and every other module. */
  maxModuleLevel: number;
  supplementalCostNumerator: number;
  supplementalCostDenominator: number;
  hireCostBiological: number;
  hireTimeMs: number;
  asteroids: {
    tiers: AsteroidTierData[];
    mineUnitsPerHour: number;
  };
}

/** Server-side seeding and mining-slot parameters (`seedCount`, `maxMiners`)
 *  deliberately stay off the wire — the client has nothing to render from
 *  them, and the backend is what verifies both. */
export interface AsteroidTierData {
  tier: string;
  span: number;
  minAmount: number;
  maxAmount: number;
}

/**
 * A mothership on the space map, as reported by the backend — the single
 * source of truth for placement. MapLevel builds its map actors from the
 * snapshot list rather than hardcoding positions, so moved ships or newly
 * joined players arrive through the same reconcile with no client changes.
 * Mirrors the Rust `MothershipData` in src-tauri/src/game_state/world.rs —
 * keep the two in sync.
 */
export interface MothershipData {
  /** One mothership per player for now, so ids equal the owner id. */
  mothershipId: string;
  ownerId: string;
  /** Display name shown below the ship sprite. */
  ownerName: string;
  /** Sprite/capability type, e.g. "mothership-1" — resolves art as `<type>-<state>-<relation>`. */
  shipType: string;
  /** Renders the `-damaged` sprite variant when true. */
  damaged: boolean;
  /** Anchor (top-left) tile of the footprint. */
  col: number;
  row: number;
  /** Footprint size in tiles (span*span). */
  span: number;
}

/**
 * A vessel movement authorized by the backend — dispatches, recalls, and (in
 * phase 3) moves pushed from other players all use this one shape (see
 * SERVER.md). Lives here rather than in map-level.ts because it rides the
 * load_game_state snapshot: the shared state holds the vessel table between
 * scenes. srcCol/srcRow may be fractional — a recall departs from the
 * vessel's lerped mid-flight position. Mirrors the Rust `VesselMoveEventData`
 * in src-tauri/src/game_state/world.rs — keep the two in sync.
 */
export interface VesselMoveEvent {
  /** Immutable ID for this specific movement leg. */
  eventId: string;
  vesselId: string;
  ownerId: string;
  /** Display name shown below the vessel sprite. */
  ownerName: string;
  /** Which mothership dispatched or will receive this vessel. */
  mothershipId: string;
  /** Sprite/capability type, e.g. "vessel-1". */
  vesselType: string;
  srcCol: number;
  srcRow: number;
  destCol: number;
  destRow: number;
  /** World px/s, server-verified. */
  speed: number;
  /** Server epoch ms when the move was authorized. */
  dispatchedAt: number;
  /** Pre-computed arrival time: dispatchedAt + (distancePx / speed * 1000).
   *  Lets late-joining clients lerp to the current position without
   *  re-computing travel time. */
  arrivalAt: number;
  /** True on a return leg (recall or mining auto-return), false on an
   *  outbound dispatch. Authoritative "does this arrival dock and despawn
   *  the vessel" signal — read this instead of re-deriving it from
   *  isDockTile against the mothership's current position, which a future
   *  relocation could change between dispatch and arrival (CR1.4). */
  returning: boolean;
  /** Asteroid this vessel is assigned to mine (ROADMAP P1.6) — set on the
   *  outbound leg and while extracting; null on return legs and plain
   *  moves. */
  miningAsteroidId: string | null;
  /** Harvested resources riding home on a return leg; the backend deposits
   *  them into the counts when the vessel docks. */
  cargo: VesselCargo | null;
  /** Backend-side completion marker carried for persistence/recovery. */
  arrivalSettled: boolean;
}

/**
 * Harvested resources riding home on a vessel's return leg (ROADMAP P1.6).
 * Mirrors the Rust `VesselCargo` in src-tauri/src/game_state/world.rs — keep
 * the two in sync.
 */
export interface VesselCargo {
  resource: MaterialResourceKind;
  amount: number;
}

/**
 * An active mining job on an asteroid — which vessel, and the extraction
 * window. At most one per asteroid today (single-slot rule); if large
 * asteroids gain multiple miners later this becomes a list. Mirrors the Rust
 * `AsteroidMining` in src-tauri/src/game_state/world.rs — keep the two in sync.
 */
export interface AsteroidMining {
  actionId: string;
  vesselId: string;
  /** Epoch ms when extraction starts — the miner's outbound arrival. The
   *  slot is reserved from dispatch, so this can be in the future. */
  startedAt: number;
  /** Epoch ms when the remaining deposit is fully mined out; the backend
   *  auto-recalls the miner then. */
  completesAt: number;
}

/**
 * A minable asteroid on the space map (ROADMAP P1.6), as reported by the
 * backend. Like motherships, placement is server-owned and MapLevel builds
 * its actors from the snapshot — but asteroids are mutable: mining depletes
 * `remaining` and a mined-out asteroid leaves the table (asteroidRemoved
 * push). Like ModuleData, the struct doubles as its own event payload: an
 * asteroid push carries the full current snapshot. Mirrors the Rust
 * `AsteroidData` in src-tauri/src/game_state/world.rs — keep the two in sync.
 */
export interface AsteroidData {
  asteroidId: string;
  /** Size tier, an ASTEROID_TIERS key (src/map/asteroid-catalog.ts):
   *  "small" | "medium" | "large". */
  tier: string;
  /** The one resource this asteroid yields. Single-resource by design for
   *  now; if large asteroids gain mixed deposits later this becomes a
   *  list. */
  resource: MaterialResourceKind;
  /** Anchor (top-left) tile of the footprint. */
  col: number;
  row: number;
  /** Footprint size in tiles (span*span). */
  span: number;
  /** Units originally seeded — for showing depletion progress. */
  total: number;
  /** Units still minable, settled at mining boundaries (mid-mine progress is
   *  implicit in mining.startedAt + the mine rate). */
  remaining: number;
  /** The active mining job, if any — present from dispatch (the slot is
   *  reserved so two vessels can't race for it) until recall/completion. */
  mining: AsteroidMining | null;
}

/**
 * One entry in the player's event feed (ROADMAP P1.5), created server-side
 * when something the player should hear about happens — a build or level-up
 * completing, a vessel arriving or returning. Rides the load_game_state
 * snapshot (so the feed and its unread state survive a reload) and arrives
 * live as a ServerPush. Mirrors the Rust `NotificationData` in
 * src-tauri/src/game_state/state.rs — keep the two in sync.
 */
export type NotificationData = {
  notificationId: string;
  /** Immutable action/transition ID the feed entry reports. Retaining only
   *  100 Mail rows never makes that transition replayable. */
  sourceEventId: string;
  /** Server epoch ms when the notification was created. */
  createdAt: number;
  /** Cleared by the mark_notifications_read command; the Mail HUD badge
   *  shows the unread count. */
  read: boolean;
} & NotificationPayload;

/** Closed known vocabulary. Add one discriminated member with every new
 * server kind; runtime rendering also retains a defensive fallback if a
 * newer server arrives first. Mirrors Rust `NotificationPayload`. */
export type NotificationPayload = KnownNotificationPayload;

export type KnownNotificationPayload =
  | {
    kind: "module-completed";
    moduleId: string;
    moduleType: string;
    level: number;
    operation: "build" | "levelup";
  }
  | { kind: "crew-hired"; crew: number }
  | {
    kind: "mining-started";
    vesselId: string;
    asteroidId: string;
    col: number;
    row: number;
  }
  | {
    kind: "asteroid-depleted";
    asteroidId: string;
    tier: string;
    resource: MaterialResourceKind;
    col: number;
    row: number;
  }
  | {
    kind: "vessel-returned";
    vesselId: string;
    cargo: NotificationCargo | null;
  }
  | {
    kind: "mothership-warped";
    mothershipId: string;
    fromCol: number;
    fromRow: number;
    toCol: number;
    toRow: number;
  }
  | { kind: "deals-refreshed"; dayIndex: number };

export interface NotificationCargo {
  resource: MaterialResourceKind;
  accepted: number;
  lost: number;
}

/**
 * A crew recruitment in flight (ROADMAP P1.10) — one at a time, same timer
 * shape as a module's pending build. Mirrors the Rust `PendingHire` in
 * src-tauri/src/game_state/crew.rs — keep the two in sync.
 */
export interface PendingHire {
  actionId: string;
  /** Server epoch ms when the hire was authorized. */
  dispatchedAt: number;
  /** Pre-computed completion time — lets late-joining clients show the
   *  correct remaining time without redoing the clock math locally. */
  completesAt: number;
}

/**
 * The ship's crew state (ROADMAP P1.10): head count plus any recruitment in
 * flight. Like ModuleData, the struct doubles as its own event payload — a
 * crew push carries the full current snapshot. Capacity is not on the wire:
 * it derives from the module snapshot (crewCapacityForModules in
 * src/ship/module-catalog.ts). Mirrors the Rust `CrewData` in
 * src-tauri/src/game_state/crew.rs — keep the two in sync.
 */
export interface CrewData {
  crew: number;
  pendingHire: PendingHire | null;
}

/**
 * How player-favorable a Trading Post deal is (ROADMAP P1.12) — the rarity's
 * bonus multiplied the get side when the server rolled the deal; the client
 * only styles it (see src/ship/trade-catalog.ts). Mirrors the serialized form of
 * the Rust `DealRarity` in src-tauri/src/game_state/deals.rs — keep the two
 * in sync.
 */
export type DealRarity = "common" | "uncommon" | "rare";

/**
 * One side of a Trading Post deal: a trade-eligible type — any ResourceKind,
 * credits included — and its amount. Mirrors the Rust `DealSide` in
 * src-tauri/src/game_state/deals.rs — keep the two in sync.
 */
export interface DealSide {
  kind: ResourceKind;
  amount: number;
}

/**
 * One deal slot in the Trading Post shop (ROADMAP P1.12), as rolled by the
 * backend — generation, acceptance, refreshes, and the daily cycle are all
 * server-side; the client only renders and asks. Give and get types always
 * differ (server-enforced); `give: null` is the once-daily freebie. Mirrors
 * the Rust `DealData` in src-tauri/src/game_state/deals.rs — keep the two in sync.
 */
export interface DealData {
  /** Stable id: "deal-<day>-<slot>-<generation>". */
  dealId: string;
  /** 0..slots-1, stable within a batch. */
  slot: number;
  rarity: DealRarity;
  /** What the player pays; null = the daily freebie. */
  give: DealSide | null;
  get: DealSide;
  /** Greyed out once true; a refresh replaces the whole batch. */
  accepted: boolean;
}

/**
 * The whole Trading Post shop state (ROADMAP P1.12) — day, refreshes used,
 * and every current deal slot. Following the ModuleData pattern, the struct
 * doubles as its own event payload: a deals push/response carries the full
 * current list. Mirrors the Rust `DealsData` in
 * src-tauri/src/game_state/deals.rs — keep the two in sync.
 */
export interface DealsData {
  /** UTC day index the current batch belongs to. */
  dayIndex: number;
  /** Refreshes used since the daily reset — indexes the doubling cost table
   *  (src/ship/trade-catalog.ts) for the Refresh button's price tag. */
  refreshesUsed: number;
  deals: DealData[];
}

/**
 * A build or level-up in progress on a module — the level it completes to
 * and when. Mirrors the Rust `ModulePendingBuild` in
 * src-tauri/src/game_state/modules.rs — keep the two in sync.
 */
export interface ModulePendingBuild {
  /** The level this build completes to. */
  level: number;
  actionId: string;
  /** Server epoch ms when the build/upgrade was authorized. */
  dispatchedAt: number;
  /** Pre-computed completion time — lets late-joining clients show the
   *  correct remaining time without redoing the clock math locally. */
  completesAt: number;
}

/**
 * A module placed in the ship (ROADMAP P1.4), with its catalog type and
 * current level — placement and level are server-owned, so ShipLevel builds
 * its actors from the `gameState.modules` snapshot with no hardcoded layout
 * (the Command Module included). Level 0 means the first build hasn't
 * completed yet; `pending` carries the in-progress timer for either a first
 * build (level 0 -> 1) or a level-up (level N -> N+1, during which the
 * module keeps functioning at level N). Mirrors the Rust `ModuleData` in
 * src-tauri/src/game_state/modules.rs — keep the two in sync.
 */
export interface ModuleData {
  moduleId: string;
  ownerId: string;
  /** Display name shown below the module sprite. */
  ownerName: string;
  /** Catalog key, e.g. "ore-refinery" (see src/ship/module-catalog.ts). Until
   *  per-type art lands, every module renders with the same "module-base"
   *  sprite regardless of this value. */
  moduleType: string;
  /** Anchor (top-left) tile of the module footprint. */
  col: number;
  row: number;
  /** Highest level this module has fully completed; 0 while the first build
   *  is still running. */
  level: number;
  /** Present while a build/upgrade is in flight. */
  pending: ModulePendingBuild | null;
}

/**
 * Wire shape of the `request_build_module` / `request_levelup_module` Tauri
 * commands' result. Mirrors the Rust `ModuleActionResponse` in
 * src-tauri/src/game_state/modules.rs — keep the two in sync.
 */
export interface ModuleActionResponse {
  actionId: string;
  module: ModuleData;
  /** Authoritative counts after the cost was deducted. */
  resources: ResourceCounts;
}

/**
 * Wire shape of the `request_hire_crew` Tauri command's result. Mirrors the
 * Rust `CrewActionResponse` in src-tauri/src/game_state/crew.rs — keep the
 * two in sync.
 */
export interface CrewActionResponse {
  actionId: string;
  crew: CrewData;
  /** Authoritative counts after the cost was deducted. */
  resources: ResourceCounts;
}

/**
 * Wire shape of the `request_accept_deal` / `request_refresh_deals` Tauri
 * commands' result (ROADMAP P1.12). Mirrors the Rust `DealActionResponse` in
 * src-tauri/src/game_state/deals.rs — keep the two in sync.
 */
export interface DealActionResponse {
  actionId: string;
  deals: DealsData;
  /** Authoritative counts after the exchange/cost was applied. */
  resources: ResourceCounts;
}

/**
 * Wire shape of the `request_relocate_mothership` Tauri command's result
 * (ROADMAP P1.22). Mirrors the Rust `MothershipActionResponse` in
 * src-tauri/src/game_state/world.rs — keep the two in sync.
 */
export interface MothershipActionResponse {
  eventId: string;
  mothership: MothershipData;
  /** Authoritative counts after the fuel cost was deducted. */
  resources: ResourceCounts;
}

/**
 * The client's interest-area window (ROADMAP P1.13): the span*span-tile
 * region, centered on (centerCol, centerRow), inside which the backend
 * streams world entities. Snapshots and entity pushes are filtered to it
 * server-side (everything the player owns is exempt); MapLevel re-centers it
 * via request_map_window as the camera pans. Mirrors the Rust `MapWindow` in
 * src-tauri/src/game_state/world.rs — keep the two in sync.
 */
export interface MapWindow {
  centerCol: number;
  centerRow: number;
  /** Window edge length in tiles (the server's AOI_SPAN). */
  span: number;
}

/**
 * Wire shape of the `request_map_window` Tauri command response (ROADMAP
 * P1.13): the re-centered window plus every world entity the client should
 * now hold — applyMapWindow replaces the mothership/asteroid/vessel tables
 * wholesale with these slices. Mirrors the Rust `MapWindowData` in
 * src-tauri/src/game_state/world.rs — keep the two in sync.
 */
export interface MapWindowData {
  window: MapWindow;
  motherships: MothershipData[];
  asteroids: AsteroidData[];
  vessels: VesselMoveEvent[];
}

/**
 * Wire shape of the `load_game_state` Tauri command. Mirrors the Rust
 * `GameStateData` in src-tauri/src/game_state/state.rs — keep the two in sync.
 */
export interface GameStateData {
  balance: BalanceCatalogData;
  player: PlayerIdentity;
  resources: ResourceCounts;
  /** The interest-area window the world slices below were filtered to
   *  (ROADMAP P1.13) — centered on the player's mothership at load. */
  mapWindow: MapWindow;
  /** Every mothership on the space map — placement is server-owned; the
   *  client builds its map actors from this list. */
  motherships: MothershipData[];
  /** Every asteroid still holding resources (ROADMAP P1.6) — placement and
   *  deposits are server-owned; depleted asteroids simply leave the list. */
  asteroids: AsteroidData[];
  /** Every vessel currently in flight or parked on the map, in dispatch
   *  order — the snapshot half of SERVER.md's snapshot + replay. */
  vessels: VesselMoveEvent[];
  /** Every module in the ship, built or under construction, including the
   *  Command Module — placement and level are server-owned. */
  modules: ModuleData[];
  /** The player's event feed (ROADMAP P1.5), oldest first — restores the
   *  Mail badge unread count across reloads. */
  notifications: NotificationData[];
  /** The ship's crew state (ROADMAP P1.10) — head count plus any recruitment
   *  in flight; capacity derives from the module list. */
  crew: CrewData;
  /** The Trading Post deal shop (ROADMAP P1.12) — the current day's deal
   *  slots and refresh state; server-generated, so acceptance state and the
   *  daily cycle survive scene switches and reloads. */
  deals: DealsData;
}

/**
 * Name of the Tauri event channel carrying ServerPush messages. Mirrors
 * SERVER_PUSH_EVENT in src-tauri/src/game_state/state.rs — keep the two in sync.
 */
export const SERVER_PUSH_EVENT = "server-push";

/**
 * A server-initiated state push — the in-process stand-in for the phase-3
 * WebSocket event bus (SERVER.md § append + broadcast). The backend emits one
 * whenever state changes server-side — a production tick landing, a build or
 * level-up completing, a vessel docking, a new feed notification — and
 * applyServerPush routes it into the same apply/sync entry points that
 * command responses already use, so pushed and requested changes take one
 * code path. Mirrors the Rust `ServerPush` enum in
 * src-tauri/src/game_state/state.rs — keep the two in sync.
 */
export type ServerPush =
  | { type: "resources"; data: ResourceCounts }
  | { type: "module"; data: ModuleData }
  | { type: "vesselRemoved"; data: { vesselId: string } }
  | { type: "vessel"; data: VesselMoveEvent }
  | { type: "asteroid"; data: AsteroidData }
  | { type: "asteroidRemoved"; data: { asteroidId: string } }
  | { type: "notification"; data: NotificationData }
  | { type: "crew"; data: CrewData }
  | { type: "deals"; data: DealsData };

export type GameStateListener = () => void;

/** Fired once per freshly-pushed notification (ROADMAP P1.19) — see
 *  GameState.subscribeToNotifications(). */
export type NotificationListener = (notification: NotificationData) => void;
