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
 * src-tauri/src/game_state/, because the client can be tampered with. This
 * module only mirrors what the backend last sent (via the loader-phase fetch,
 * the server-push channel subscribed in game-state-loader.ts, or a command
 * response) and notifies subscribers so scenes re-render.
 *
 * Wire-shape types (mirroring the Rust structs/enums) live in
 * game-state-types.ts and are re-exported below, so `GameState` and its
 * payload types share one import for consumers. Pure module — no
 * Excalibur/Vite imports — so it stays unit-testable under Deno (see
 * tests/game_state_test.ts).
 */

export * from "./game-state-types.ts";

import type {
  AsteroidData,
  CrewData,
  DealsData,
  GameStateData,
  GameStateListener,
  MapWindow,
  MapWindowData,
  ModuleData,
  MothershipData,
  NotificationData,
  NotificationListener,
  PendingHire,
  PlayerIdentity,
  ResourceCounts,
  Revisioned,
  ServerPush,
  VesselMoveEvent,
} from "./game-state-types.ts";

/**
 * Best current estimate of server epoch-ms "now" (SERVER.md § Time — "clients
 * never trust Date.now()"). No clock-offset handshake exists yet (that's
 * P3.2), so this is `Date.now()` today, but every comparison against a
 * server timestamp (`dispatchedAt`, `arrivalAt`, `completesAt`) should read
 * through here rather than calling `Date.now()` directly, so P3.2 only has to
 * change this one function.
 */
export function serverNow(): number {
  return Date.now();
}

/**
 * Mirrors `MAX_NOTIFICATIONS` in src-tauri/src/game_state/state.rs — keep the
 * two in sync. The backend evicts past this cap silently (no removal push),
 * so the client must cap its own `notifications` table the same way or it
 * grows unbounded over a long session that never opens Mail (CR1.2).
 */
const MAX_NOTIFICATIONS = 100;

interface EntityRevisionTracker {
  /** Revision of the newest authoritative whole-table replacement. */
  floor: number;
  /** Newer per-entity updates and removal tombstones above the floor. */
  entities: Map<string, number>;
}

function revisionTracker(): EntityRevisionTracker {
  return { floor: -1, entities: new Map() };
}

/**
 * Evict the oldest entries (by createdAt) past MAX_NOTIFICATIONS, mutating
 * the map in place — matches the backend's silent-eviction behavior since no
 * removal push exists for notifications (CR1.2).
 */
function evictOldestNotifications(
  notifications: Map<string, NotificationData>,
): void {
  const excess = notifications.size - MAX_NOTIFICATIONS;
  if (excess <= 0) return;
  const oldestIds = [...notifications.values()]
    .sort((a, b) => a.createdAt - b.createdAt)
    .slice(0, excess)
    .map((n) => n.notificationId);
  for (const id of oldestIds) notifications.delete(id);
}

export class GameState {
  /** Highest authoritative revision observed on any incoming message. */
  latestRevision = -1;

  /**
   * True once load() has applied backend state. Until then every field below
   * holds its new-player default — scenes must render sensibly either way,
   * because the backend fetch (or a future login flow) may finish after they
   * initialize, or not at all.
   */
  loaded = false;

  /**
   * Set while a load attempt has failed and not yet been recovered. Incoming
   * pushes are dropped meanwhile: without a snapshot baseline there is
   * nothing to reconcile them against, and without a balance catalog the
   * scenes cannot render what they describe. Cleared by the next successful
   * load, whose snapshot restores the baseline.
   */
  suspended = false;

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
   * Mail HUD badge renders unreadNotificationCount() from it.
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
  private notificationListeners = new Set<NotificationListener>();
  private playerRevision = -1;
  private resourcesRevision = -1;
  private mapWindowRevision = -1;
  private crewRevision = -1;
  private dealsRevision = -1;
  private mothershipRevisions = revisionTracker();
  private vesselRevisions = revisionTracker();
  private asteroidRevisions = revisionTracker();
  private moduleRevisions = revisionTracker();
  private notificationRevisions = revisionTracker();

  private observeRevision(revision: number): void {
    this.latestRevision = Math.max(this.latestRevision, revision);
  }

  private entityRevision(
    tracker: EntityRevisionTracker,
    id: string,
  ): number {
    return Math.max(tracker.floor, tracker.entities.get(id) ?? -1);
  }

  private mergeEntity<T>(
    table: Map<string, T>,
    tracker: EntityRevisionTracker,
    message: Revisioned<T>,
    id: string,
  ): boolean {
    this.observeRevision(message.revision);
    if (message.revision < this.entityRevision(tracker, id)) return false;
    table.set(id, message.data);
    if (message.revision > tracker.floor) {
      tracker.entities.set(id, message.revision);
    } else {
      tracker.entities.delete(id);
    }
    return true;
  }

  private removeEntity<T>(
    table: Map<string, T>,
    tracker: EntityRevisionTracker,
    revision: number,
    id: string,
  ): boolean {
    this.observeRevision(revision);
    if (revision < this.entityRevision(tracker, id)) return false;
    table.delete(id);
    if (revision > tracker.floor) tracker.entities.set(id, revision);
    else tracker.entities.delete(id);
    return true;
  }

  /**
   * Replace a table at `revision`, retaining only newer per-entity updates or
   * tombstones. This is the important distinction from one global last-write
   * gate: a newer resource push must not suppress an older-but-still-useful
   * map response, while a newer asteroid push must survive that response.
   */
  private replaceEntities<T>(
    current: Map<string, T>,
    tracker: EntityRevisionTracker,
    message: Revisioned<T[]>,
    idOf: (value: T) => string,
  ): Map<string, T> {
    this.observeRevision(message.revision);
    if (message.revision < tracker.floor) return current;

    const next = new Map<string, T>();
    for (const value of message.data) {
      const id = idOf(value);
      if (this.entityRevision(tracker, id) <= message.revision) {
        next.set(id, value);
      }
    }
    for (const [id, value] of current) {
      if ((tracker.entities.get(id) ?? -1) > message.revision) {
        next.set(id, value);
      }
    }

    tracker.floor = message.revision;
    for (const [id, revision] of tracker.entities) {
      if (revision <= tracker.floor) tracker.entities.delete(id);
    }
    return next;
  }

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
   * Register a listener fired once per freshly-arrived `notification` server
   * push (ROADMAP P1.19) — never for a replay, the backlog a load() snapshot,
   * or syncNotifications() (mark_notifications_read), so a returning player's
   * unread feed and replayed messages do not flood the toast layer. Returns an
   * unsubscribe function. The notification itself still lands in
   * `notifications` (and the Mail badge) via applyServerPush regardless of
   * whether anyone is listening here.
   */
  subscribeToNotifications(listener: NotificationListener): () => void {
    this.notificationListeners.add(listener);
    return () => this.notificationListeners.delete(listener);
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
  syncResources(message: Revisioned<ResourceCounts>): void {
    this.observeRevision(message.revision);
    if (message.revision < this.resourcesRevision) return;
    this.resourcesRevision = message.revision;
    this.update((s) => {
      s.resources = { ...message.data };
    });
  }

  /**
   * Merge a single authorized vessel event from a command response (or, in
   * phase 3, a server push), notifying subscribers. The next load() snapshot
   * supersedes it — the backend records every event it authorizes, so the
   * snapshot already contains it.
   */
  applyVesselEvent(message: Revisioned<VesselMoveEvent>): void {
    const event = message.data;
    if (
      !this.mergeEntity(
        this.vessels,
        this.vesselRevisions,
        message,
        event.vesselId,
      )
    ) return;
    this.update((s) => {
      s.vessels.set(event.vesselId, event);
    });
  }

  /**
   * Apply a single authorized module event (build or level-up) from a
   * command response, notifying subscribers — the AGENTS.md multiplayer-
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
  applyModuleEvent(message: Revisioned<ModuleData>): void {
    const module = message.data;
    if (
      !this.mergeEntity(
        this.modules,
        this.moduleRevisions,
        message,
        module.moduleId,
      )
    ) return;
    this.update((s) => {
      s.modules.set(module.moduleId, module);
    });
  }

  /**
   * Apply a single authorized mothership relocation from a command response
   * (ROADMAP P1.22), notifying subscribers — the `apply<Action>Event` entry
   * point for mothership changes, following the ModuleData pattern:
   * MothershipData is the entity's full current snapshot, so merging by
   * mothershipId is idempotent. The next load()/applyMapWindow supersedes it.
   */
  applyMothershipEvent(message: Revisioned<MothershipData>): void {
    const ship = message.data;
    if (
      !this.mergeEntity(
        this.motherships,
        this.mothershipRevisions,
        message,
        ship.mothershipId,
      )
    ) return;
    this.update((s) => {
      s.motherships.set(ship.mothershipId, ship);
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
  applyAsteroidEvent(message: Revisioned<AsteroidData>): void {
    const asteroid = message.data;
    if (
      !this.mergeEntity(
        this.asteroids,
        this.asteroidRevisions,
        message,
        asteroid.asteroidId,
      )
    ) return;
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
  applyCrewEvent(message: Revisioned<CrewData>): void {
    this.observeRevision(message.revision);
    if (message.revision < this.crewRevision) return;
    this.crewRevision = message.revision;
    const data = message.data;
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
  applyDealsEvent(message: Revisioned<DealsData>): void {
    this.observeRevision(message.revision);
    if (message.revision < this.dealsRevision) return;
    this.dealsRevision = message.revision;
    const data = message.data;
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
  applyMapWindow(message: Revisioned<MapWindowData>): void {
    const { revision, data } = message;
    this.observeRevision(revision);
    const windowAccepted = revision >= this.mapWindowRevision;
    const motherships = this.replaceEntities(
      this.motherships,
      this.mothershipRevisions,
      { revision, data: data.motherships },
      (m) => m.mothershipId,
    );
    const asteroids = this.replaceEntities(
      this.asteroids,
      this.asteroidRevisions,
      { revision, data: data.asteroids },
      (a) => a.asteroidId,
    );
    const vessels = this.replaceEntities(
      this.vessels,
      this.vesselRevisions,
      { revision, data: data.vessels },
      (v) => v.vesselId,
    );
    if (
      !windowAccepted && motherships === this.motherships &&
      asteroids === this.asteroids && vessels === this.vessels
    ) return;
    if (windowAccepted) this.mapWindowRevision = revision;
    this.update((s) => {
      if (windowAccepted) s.mapWindow = data.window;
      s.motherships = motherships;
      s.asteroids = asteroids;
      s.vessels = vessels;
    });
  }

  /** Number of unread event-feed entries — the Mail HUD badge count. */
  unreadNotificationCount(): number {
    let count = 0;
    for (const n of this.notifications.values()) if (!n.read) count++;
    return count;
  }

  /**
   * Replace the notification feed with an authoritative list — the
   * mark_notifications_read response — notifying subscribers (which clears
   * the Mail badge in every scene).
   */
  syncNotifications(message: Revisioned<NotificationData[]>): void {
    const notifications = this.replaceEntities(
      this.notifications,
      this.notificationRevisions,
      message,
      (n) => n.notificationId,
    );
    if (notifications === this.notifications) return;
    this.update((s) => {
      s.notifications = notifications;
    });
  }

  /**
   * Route one server push into the matching apply/sync entry point — the
   * client half of the push channel (see ServerPush). Exactly what a phase-3
   * socket handler will do; only the transport delivering the push changes.
   * Idempotent like everything it dispatches to: replaying a push (or
   * receiving one already reflected in a snapshot) merges by id.
   *
   * Deliberately *not* gated on `loaded`. The listener subscribes before the
   * snapshot is requested precisely so nothing emitted in between is missed
   * (game-state-loader-order.ts), and `load()` reconciles per entity by
   * revision — so a push that beats the snapshot is kept, not overwritten.
   * `suspended` is the narrower guard: it stops pushes only once a load has
   * definitively *failed*, where there is no baseline to reconcile against
   * and no balance catalog to render with. A successful retry lifts it, and
   * that snapshot re-establishes the baseline.
   */
  applyServerPush(message: Revisioned<ServerPush>): void {
    if (this.suspended) return;
    const { revision, data: push } = message;
    switch (push.type) {
      case "resources":
        this.syncResources({ revision, data: push.data });
        break;
      case "module":
        this.applyModuleEvent({ revision, data: push.data });
        break;
      case "vesselRemoved":
        if (
          !this.removeEntity(
            this.vessels,
            this.vesselRevisions,
            revision,
            push.data.vesselId,
          )
        ) break;
        this.update((s) => {
          s.vessels.delete(push.data.vesselId);
        });
        break;
      case "vessel":
        this.applyVesselEvent({ revision, data: push.data });
        break;
      case "asteroid":
        this.applyAsteroidEvent({ revision, data: push.data });
        break;
      case "asteroidRemoved":
        if (
          !this.removeEntity(
            this.asteroids,
            this.asteroidRevisions,
            revision,
            push.data.asteroidId,
          )
        ) break;
        this.update((s) => {
          s.asteroids.delete(push.data.asteroidId);
        });
        break;
      case "notification": {
        // A replay can carry the same notification at the same or a newer
        // revision. Keep its feed data current, but only surface a toast when
        // this notification ID first enters the client-side feed.
        const newlyArrived = !this.notifications.has(push.data.notificationId);
        if (
          !this.mergeEntity(
            this.notifications,
            this.notificationRevisions,
            { revision, data: push.data },
            push.data.notificationId,
          )
        ) break;
        this.update((s) => {
          s.notifications.set(push.data.notificationId, push.data);
          evictOldestNotifications(s.notifications);
        });
        if (newlyArrived) {
          for (const listener of [...this.notificationListeners]) {
            listener(push.data);
          }
        }
        break;
      }
      case "crew":
        this.applyCrewEvent({ revision, data: push.data });
        break;
      case "deals":
        this.applyDealsEvent({ revision, data: push.data });
        break;
    }
  }

  /**
   * Replace this state with backend-loaded data, notifying subscribers.
   * Routed through update() so a re-sync at any time (a fresh snapshot, a
   * post-login refresh, a phase-3 server snapshot) refreshes live scenes the
   * same way a local mutation would.
   */
  load(message: Revisioned<GameStateData>): void {
    const { revision, data } = message;
    this.observeRevision(revision);
    const playerAccepted = revision >= this.playerRevision;
    const resourcesAccepted = revision >= this.resourcesRevision;
    const windowAccepted = revision >= this.mapWindowRevision;
    const crewAccepted = revision >= this.crewRevision;
    const dealsAccepted = revision >= this.dealsRevision;
    const motherships = this.replaceEntities(
      this.motherships,
      this.mothershipRevisions,
      { revision, data: data.motherships },
      (m) => m.mothershipId,
    );
    const vessels = this.replaceEntities(
      this.vessels,
      this.vesselRevisions,
      { revision, data: data.vessels },
      (v) => v.vesselId,
    );
    const asteroids = this.replaceEntities(
      this.asteroids,
      this.asteroidRevisions,
      { revision, data: data.asteroids },
      (a) => a.asteroidId,
    );
    const modules = this.replaceEntities(
      this.modules,
      this.moduleRevisions,
      { revision, data: data.modules },
      (m) => m.moduleId,
    );
    const notifications = this.replaceEntities(
      this.notifications,
      this.notificationRevisions,
      { revision, data: data.notifications },
      (n) => n.notificationId,
    );
    if (playerAccepted) this.playerRevision = revision;
    if (resourcesAccepted) this.resourcesRevision = revision;
    if (windowAccepted) this.mapWindowRevision = revision;
    if (crewAccepted) this.crewRevision = revision;
    if (dealsAccepted) this.dealsRevision = revision;
    this.update((s) => {
      if (playerAccepted) s.player = data.player;
      if (resourcesAccepted) s.resources = { ...data.resources };
      s.motherships = motherships;
      s.vessels = vessels;
      s.asteroids = asteroids;
      s.modules = modules;
      s.notifications = notifications;
      if (crewAccepted) {
        s.crew = data.crew.crew;
        s.pendingHire = data.crew.pendingHire;
      }
      if (dealsAccepted) s.deals = data.deals;
      if (windowAccepted) s.mapWindow = data.mapWindow;
      s.loaded = true;
    });
  }
}

/** The single shared instance every scene imports. */
export const gameState = new GameState();
