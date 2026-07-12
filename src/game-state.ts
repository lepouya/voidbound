/**
 * Shared cross-scene game state (ROADMAP P0.12).
 *
 * `MapLevel` and `ShipLevel` are separate scene instances with no reference
 * to each other; anything both need lives here as a plain module singleton
 * that either can import. Today that is the local player's identity and the
 * four resource counts.
 *
 * The backend is authoritative for everything in here (ROADMAP P1.1): all
 * resource math — production accrual, build costs — happens in
 * src-tauri/src/game_state.rs, because the client can be tampered with. This
 * module only mirrors what the backend last sent (via the loader-phase fetch,
 * the server-push channel subscribed in game-state-loader.ts, or a command
 * response) and notifies subscribers so scenes re-render.
 *
 * Pure module — no Excalibur/Vite imports — so it stays unit-testable under
 * Deno (see tests/game_state_test.ts).
 */

export interface PlayerIdentity {
  readonly id: string;
  readonly name: string;
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
 * src-tauri/src/game_state.rs — keep the two in sync.
 */
export type MaterialResourceKind = Exclude<ResourceKind, "credits">;

/**
 * A mothership on the space map, as reported by the backend — the single
 * source of truth for placement. MapLevel builds its map actors from the
 * snapshot list rather than hardcoding positions, so moved ships or newly
 * joined players arrive through the same reconcile with no client changes.
 * Mirrors the Rust `MothershipData` in src-tauri/src/game_state.rs — keep
 * the two in sync.
 */
export interface MothershipData {
  /** One mothership per player for now, so ids equal the owner id. */
  mothershipId: string;
  ownerId: string;
  /** Display name shown below the ship sprite. */
  ownerName: string;
  /** Sprite/capability type, e.g. "ss1" — resolves art as `<type>-base` /
   *  `<type>-damaged`. */
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
 * in src-tauri/src/game_state.rs — keep the two in sync.
 */
export interface VesselMoveEvent {
  vesselId: string;
  ownerId: string;
  /** Display name shown below the vessel sprite. */
  ownerName: string;
  /** Which mothership dispatched or will receive this vessel. */
  mothershipId: string;
  /** Sprite/capability type, e.g. "cs1". */
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
  /** Asteroid this vessel is assigned to mine (ROADMAP P1.6) — set on the
   *  outbound leg and while extracting; null on return legs and plain
   *  moves. */
  miningAsteroidId: string | null;
  /** Harvested resources riding home on a return leg; the backend deposits
   *  them into the counts when the vessel docks. */
  cargo: VesselCargo | null;
}

/**
 * Harvested resources riding home on a vessel's return leg (ROADMAP P1.6).
 * Mirrors the Rust `VesselCargo` in src-tauri/src/game_state.rs — keep the
 * two in sync.
 */
export interface VesselCargo {
  resource: MaterialResourceKind;
  amount: number;
}

/**
 * An active mining job on an asteroid — which vessel, and the extraction
 * window. At most one per asteroid today (single-slot rule); if large
 * asteroids gain multiple miners later this becomes a list. Mirrors the Rust
 * `AsteroidMining` in src-tauri/src/game_state.rs — keep the two in sync.
 */
export interface AsteroidMining {
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
 * `AsteroidData` in src-tauri/src/game_state.rs — keep the two in sync.
 */
export interface AsteroidData {
  asteroidId: string;
  /** Size tier, an ASTEROID_TIERS key (src/asteroid-catalog.ts):
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
 * src-tauri/src/game_state.rs — keep the two in sync.
 */
export interface NotificationData {
  notificationId: string;
  /** Category slug, e.g. "build-complete", "vessel-arrived" — display and
   *  grouping only; new kinds need no client changes. */
  kind: string;
  /** Server-composed display text (the server owns the catalog names). */
  message: string;
  /** Server epoch ms when the notification was created. */
  createdAt: number;
  /** Cleared by the mark_notifications_read command; the Events HUD badge
   *  shows the unread count. */
  read: boolean;
}

/**
 * A crew recruitment in flight (ROADMAP P1.10) — one at a time, same timer
 * shape as a module's pending build. Mirrors the Rust `PendingHire` in
 * src-tauri/src/game_state.rs — keep the two in sync.
 */
export interface PendingHire {
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
 * src/module-catalog.ts). Mirrors the Rust `CrewData` in
 * src-tauri/src/game_state.rs — keep the two in sync.
 */
export interface CrewData {
  crew: number;
  pendingHire: PendingHire | null;
}

/**
 * How player-favorable a Trading Post deal is (ROADMAP P1.12) — the rarity's
 * bonus multiplied the get side when the server rolled the deal; the client
 * only styles it (see src/trade-catalog.ts). Mirrors the serialized form of
 * the Rust `DealRarity` in src-tauri/src/game_state.rs — keep the two in
 * sync.
 */
export type DealRarity = "common" | "uncommon" | "rare";

/**
 * One side of a Trading Post deal: a trade-eligible type — any ResourceKind,
 * credits included — and its amount. Mirrors the Rust `DealSide` in
 * src-tauri/src/game_state.rs — keep the two in sync.
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
 * the Rust `DealData` in src-tauri/src/game_state.rs — keep the two in sync.
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
 * current list. Mirrors the Rust `DealsData` in src-tauri/src/game_state.rs
 * — keep the two in sync.
 */
export interface DealsData {
  /** UTC day index the current batch belongs to. */
  dayIndex: number;
  /** Refreshes used since the daily reset — indexes the doubling cost table
   *  (src/trade-catalog.ts) for the Refresh button's price tag. */
  refreshesUsed: number;
  deals: DealData[];
}

/**
 * A build or level-up in progress on a module — the level it completes to
 * and when. Mirrors the Rust `ModulePendingBuild` in
 * src-tauri/src/game_state.rs — keep the two in sync.
 */
export interface ModulePendingBuild {
  /** The level this build completes to. */
  level: number;
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
 * src-tauri/src/game_state.rs — keep the two in sync.
 */
export interface ModuleData {
  moduleId: string;
  ownerId: string;
  /** Display name shown below the module sprite. */
  ownerName: string;
  /** Catalog key, e.g. "ore-refinery" (see src/module-catalog.ts). Until
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
 * The client's interest-area window (ROADMAP P1.13): the span*span-tile
 * region, centered on (centerCol, centerRow), inside which the backend
 * streams world entities. Snapshots and entity pushes are filtered to it
 * server-side (everything the player owns is exempt); MapLevel re-centers it
 * via request_map_window as the camera pans. Mirrors the Rust `MapWindow` in
 * src-tauri/src/game_state.rs — keep the two in sync.
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
 * src-tauri/src/game_state.rs — keep the two in sync.
 */
export interface MapWindowData {
  window: MapWindow;
  motherships: MothershipData[];
  asteroids: AsteroidData[];
  vessels: VesselMoveEvent[];
}

/**
 * Wire shape of the `load_game_state` Tauri command. Mirrors the Rust
 * `GameStateData` in src-tauri/src/game_state.rs — keep the two in sync.
 */
export interface GameStateData {
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
   *  Events badge unread count across reloads. */
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
 * SERVER_PUSH_EVENT in src-tauri/src/game_state.rs — keep the two in sync.
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
 * src-tauri/src/game_state.rs — keep the two in sync.
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

export class GameState {
  /**
   * True once load() has applied backend state. Until then every field below
   * holds its new-player default — scenes must render sensibly either way,
   * because the backend fetch (or a future login flow) may finish after they
   * initialize, or not at all.
   */
  loaded = false;

  /**
   * The local player. Synced from the backend during the loader phase (see
   * game-state-loader.ts); the mothership and dispatched vessels are stamped
   * with it. New-player default until load() lands.
   */
  player: PlayerIdentity = { id: "player-1", name: "Player 1" };

  /**
   * The player's stock of every ResourceKind, as last reported by the
   * backend. All writes go through update(); reads are direct. New-player
   * default (all zero) until load() lands — must match what the backend
   * sends for a fresh player.
   */
  resources: ResourceCounts = {
    construction: 0,
    highTech: 0,
    biological: 0,
    fuel: 0,
    credits: 0,
  };

  /**
   * Every mothership on the space map, keyed by mothershipId, as last
   * reported by the backend. Replaced wholesale by each load() snapshot —
   * which is how placement updates (a moved ship, a newly joined player)
   * will reach the client until a mothership push variant is needed. Empty
   * until load() lands: the client hardcodes no placements. MapLevel
   * reconciles its actors from this table whenever subscribers are notified.
   */
  motherships = new Map<string, MothershipData>();

  /**
   * Every vessel in flight or parked on the map, keyed by vesselId, holding
   * its latest backend-authorized move. Replaced wholesale by each load()
   * snapshot, merged per-event by applyVesselEvent(), and pruned by the
   * vesselRemoved push when a return docks. Held here rather than in the map
   * scene so vessel state stays current while other scenes are active —
   * MapLevel reconciles its actors from this table whenever subscribers are
   * notified.
   */
  vessels = new Map<string, VesselMoveEvent>();

  /**
   * Every asteroid still holding resources (ROADMAP P1.6), keyed by
   * asteroidId, as last reported by the backend. Replaced wholesale by each
   * load() snapshot, merged per-asteroid by asteroid pushes, and pruned by
   * the asteroidRemoved push when a deposit is mined out. MapLevel
   * reconciles its actors from this table whenever subscribers are notified.
   */
  asteroids = new Map<string, AsteroidData>();

  /**
   * Every module in the ship, built or under construction (Command Module
   * included), keyed by moduleId, as last reported by the backend. Replaced
   * wholesale by each load() snapshot and merged per-module by
   * applyModuleEvent(). Empty until load() lands: the client hardcodes no
   * modules. ShipLevel reconciles its actors from this table whenever
   * subscribers are notified.
   */
  modules = new Map<string, ModuleData>();

  /**
   * The player's event feed (ROADMAP P1.5), keyed by notificationId in
   * server (chronological) order. Replaced wholesale by each load() snapshot
   * and by syncNotifications(), merged per-entry by notification pushes. The
   * Events HUD badge renders unreadNotificationCount() from it.
   */
  notifications = new Map<string, NotificationData>();

  /**
   * The ship's crew head count (ROADMAP P1.10), as last reported by the
   * backend. New-player default (0) until load() lands — capacity derives
   * from the module table, which is also empty until then, so the HUD
   * renders 0/0 consistently.
   */
  crew = 0;

  /**
   * The one crew recruitment in flight, if any (ROADMAP P1.10) — drives the
   * Hire button's "Recruiting…" state; completion arrives as a crew push.
   */
  pendingHire: PendingHire | null = null;

  /**
   * The Trading Post deal shop (ROADMAP P1.12), as last reported by the
   * backend. New-player default (no deals) until load() lands — the shop
   * dialog renders an empty list gracefully; the real batch arrives with
   * the snapshot, replaced wholesale by accept/refresh responses and the
   * daily-reset push.
   */
  deals: DealsData = { dayIndex: 0, refreshesUsed: 0, deals: [] };

  /**
   * The interest-area window the world tables above are filtered to, as last
   * reported by the backend (ROADMAP P1.13) — null until the first snapshot
   * lands. MapLevel's hysteresis check reads it to decide when the camera
   * has drifted far enough to re-center via request_map_window.
   */
  mapWindow: MapWindow | null = null;

  private listeners = new Set<GameStateListener>();

  /**
   * Register a listener called after every update(). Returns an unsubscribe
   * function. Scenes live for the whole app run, so subscribing once in
   * onInitialize (after actors exist) is fine for world actors; listeners
   * that touch per-activation HUD elements should instead subscribe in
   * onActivate and unsubscribe in onDeactivate.
   */
  subscribe(listener: GameStateListener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  /**
   * Apply a mutation and notify subscribers. All writes must go through here
   * so cross-scene consumers (e.g. the P1.2 resource bar HUD) stay in sync.
   */
  update(mutate: (state: GameState) => void): void {
    mutate(this);
    // Copy first: a listener may unsubscribe (itself or others) mid-notify.
    for (const listener of [...this.listeners]) listener();
  }

  /**
   * Replace the resource counts with an authoritative snapshot from a
   * backend command response (e.g. request_build_module returns the counts
   * after the cost deduction), notifying subscribers.
   */
  syncResources(resources: ResourceCounts): void {
    this.update((s) => {
      s.resources = { ...resources };
    });
  }

  /**
   * Merge a single authorized vessel event from a command response (or, in
   * phase 3, a server push), notifying subscribers. The next load() snapshot
   * supersedes it — the backend records every event it authorizes, so the
   * snapshot already contains it.
   */
  applyVesselEvent(event: VesselMoveEvent): void {
    this.update((s) => {
      s.vessels.set(event.vesselId, event);
    });
  }

  /**
   * Apply a single authorized module event (build or level-up) from a
   * command response, notifying subscribers — the CLAUDE.md multiplayer-
   * ready event pattern's `apply<Action>Event` entry point for module
   * actions, matching applyVesselEvent's shape: idempotent (merges by
   * moduleId, so a redirect/replay just overwrites), zero UI housekeeping.
   * ModuleData itself is the event payload (it already carries the pending
   * build's dispatchedAt/completesAt, same as VesselMoveEvent's timestamps);
   * a separate `ModuleEvent` wrapper isn't needed since the module's full
   * current state *is* what a server push would send. The next load()
   * snapshot supersedes it — the backend records every module it mutates, so
   * the snapshot already contains it.
   */
  applyModuleEvent(module: ModuleData): void {
    this.update((s) => {
      s.modules.set(module.moduleId, module);
    });
  }

  /**
   * Apply a single authorized asteroid event from a server push (mining
   * started/stopped, deposit reduced), notifying subscribers — the
   * `apply<Action>Event` entry point for asteroid changes, following the
   * ModuleData pattern: the AsteroidData payload is the entity's full
   * current snapshot, so merging by asteroidId is idempotent. The next
   * load() snapshot supersedes it.
   */
  applyAsteroidEvent(asteroid: AsteroidData): void {
    this.update((s) => {
      s.asteroids.set(asteroid.asteroidId, asteroid);
    });
  }

  /**
   * Apply an authoritative crew state from a hire command response or a
   * server push (a recruitment completing), notifying subscribers — the
   * `apply<Action>Event` entry point for crew changes, following the
   * ModuleData pattern: the CrewData payload is the full current snapshot,
   * so re-applying is idempotent. The next load() snapshot supersedes it.
   */
  applyCrewEvent(data: CrewData): void {
    this.update((s) => {
      s.crew = data.crew;
      s.pendingHire = data.pendingHire;
    });
  }

  /**
   * Apply an authoritative deal-shop state from an accept/refresh command
   * response or a server push (the daily reset), notifying subscribers — the
   * `apply<Action>Event` entry point for deal changes, following the
   * ModuleData pattern: the DealsData payload is the shop's full current
   * snapshot, so re-applying is idempotent. The next load() snapshot
   * supersedes it.
   */
  applyDealsEvent(data: DealsData): void {
    this.update((s) => {
      s.deals = data;
    });
  }

  /**
   * Replace the world tables with a re-centered interest-area response
   * (ROADMAP P1.13), notifying subscribers. Wholesale replacement is the
   * point: entities that left the window unload (the scene reconcilers
   * despawn their actors), everything inside it is authoritative — stale
   * mining slots and deposits resolve on window re-entry. Modules,
   * resources, and notifications are untouched: they stay global.
   */
  applyMapWindow(data: MapWindowData): void {
    this.update((s) => {
      s.mapWindow = data.window;
      s.motherships = new Map(
        data.motherships.map((m) => [m.mothershipId, m]),
      );
      s.asteroids = new Map(data.asteroids.map((a) => [a.asteroidId, a]));
      s.vessels = new Map(data.vessels.map((e) => [e.vesselId, e]));
    });
  }

  /** Number of unread event-feed entries — the Events HUD badge count. */
  unreadNotificationCount(): number {
    let count = 0;
    for (const n of this.notifications.values()) if (!n.read) count++;
    return count;
  }

  /**
   * Replace the notification feed with an authoritative list — the
   * mark_notifications_read response — notifying subscribers (which clears
   * the Events badge in every scene).
   */
  syncNotifications(notifications: NotificationData[]): void {
    this.update((s) => {
      s.notifications = new Map(
        notifications.map((n) => [n.notificationId, n]),
      );
    });
  }

  /**
   * Route one server push into the matching apply/sync entry point — the
   * client half of the push channel (see ServerPush). Exactly what a phase-3
   * socket handler will do; only the transport delivering the push changes.
   * Idempotent like everything it dispatches to: replaying a push (or
   * receiving one already reflected in a snapshot) merges by id.
   */
  applyServerPush(push: ServerPush): void {
    switch (push.type) {
      case "resources":
        this.syncResources(push.data);
        break;
      case "module":
        this.applyModuleEvent(push.data);
        break;
      case "vesselRemoved":
        this.update((s) => {
          s.vessels.delete(push.data.vesselId);
        });
        break;
      case "vessel":
        this.applyVesselEvent(push.data);
        break;
      case "asteroid":
        this.applyAsteroidEvent(push.data);
        break;
      case "asteroidRemoved":
        this.update((s) => {
          s.asteroids.delete(push.data.asteroidId);
        });
        break;
      case "notification":
        this.update((s) => {
          s.notifications.set(push.data.notificationId, push.data);
        });
        break;
      case "crew":
        this.applyCrewEvent(push.data);
        break;
      case "deals":
        this.applyDealsEvent(push.data);
        break;
    }
  }

  /**
   * Replace this state with backend-loaded data, notifying subscribers.
   * Routed through update() so a re-sync at any time (the periodic poll, a
   * post-login refresh, a phase-3 server snapshot) refreshes live scenes the
   * same way a local mutation would.
   */
  load(data: GameStateData): void {
    this.update((s) => {
      s.player = data.player;
      s.resources = { ...data.resources };
      s.motherships = new Map(
        data.motherships.map((m) => [m.mothershipId, m]),
      );
      s.vessels = new Map(data.vessels.map((e) => [e.vesselId, e]));
      s.asteroids = new Map(data.asteroids.map((a) => [a.asteroidId, a]));
      s.modules = new Map(data.modules.map((m) => [m.moduleId, m]));
      s.notifications = new Map(
        data.notifications.map((n) => [n.notificationId, n]),
      );
      s.crew = data.crew.crew;
      s.pendingHire = data.crew.pendingHire;
      s.deals = data.deals;
      s.mapWindow = data.mapWindow;
      s.loaded = true;
    });
  }
}

/** The single shared instance every scene imports. */
export const gameState = new GameState();
