use std::collections::HashMap;

use serde::Serialize;

use super::resources::{ResourceCounts, ResourceKind};
#[cfg(test)]
use super::state::player_identity;
use super::state::{
    deadline_after, scaled_ms, time_scale, unscaled_ms, NotificationCargo, NotificationPayload,
    SeedRng, ServerPush, ServerState, MAP_COLS, MAP_ROWS, MAP_TILE_PX,
};

/// Response to request_map_window (ROADMAP P1.13): the re-centered interest
/// area plus every world entity the client should now hold — it replaces its
/// mothership/asteroid/vessel tables wholesale with these slices. Mirrors
/// the TS `MapWindowData` in `src/state/game-state-types.ts` — keep the two in sync.
#[derive(Serialize, Debug)]
pub struct MapWindowData {
    pub window: MapWindow,
    pub motherships: Vec<MothershipData>,
    pub asteroids: Vec<AsteroidData>,
    pub vessels: Vec<VesselMoveEventData>,
}

/// Interest-area window edge length in tiles (ROADMAP P1.13): the client
/// only ever holds world entities inside this window centered on its camera.
/// Must stay strictly larger than the client's visible-view tile cap plus
/// its re-request hysteresis (MAP_VIEW_TILES_CAP / AOI_REQUERY_TILES in
/// src/map/aoi-config.ts, which mirrors this constant and whose invariant is
/// asserted by tests/aoi_config_test.ts — keep the two in sync) so unloaded
/// space can never scroll into sight.
pub(super) const AOI_SPAN: i64 = 100;

/// Vessel travel speed in world px/s. Server-verified: clients render the
/// speed the event carries, they never choose it. Update on upgrade (P4).
const VESSEL_SPEED_PX_S: f64 = 32.0;

/// `VESSEL_SPEED_PX_S` scaled by the dev-speed multiplier (ROADMAP P0.13) —
/// the wire `speed` every `VesselMoveEvent` carries. The client's visual tween
/// (`TileActor.moveTo`) derives its own animation duration from this speed
/// and distance alone, never from `arrival_at`, so it must already reflect
/// the same scaling `travel_time_ms` applies to the arrival deadline or the
/// two disagree: a scaled arrival with unscaled on-screen movement.
fn effective_vessel_speed_px_s() -> f64 {
    VESSEL_SPEED_PX_S * time_scale()
}

/// Sprite/capability type of the only vessel class so far (`vessel-1`).
const VESSEL_TYPE: &str = "vessel-1";

/// Cheap stopgap fleet cap (review finding CR1.5): dispatch is otherwise free
/// and uncapped today, so nothing stops an unbounded vessel table. Superseded
/// by P5.3's crew-bound vessel counts; until then this just prevents runaway
/// growth.
const MAX_VESSELS: usize = 20;

/// A mothership on the space map. Placement is server-owned: the client
/// renders whatever the load_game_state snapshot says (MapLevel reconciles
/// its actors from the list), so moved ships or newly joined players reach
/// every client through the same snapshot with no hardcoded positions.
/// Mirrors the TS `MothershipData` in `src/state/game-state-types.ts` — keep the two in
/// sync.
#[derive(Serialize, serde::Deserialize, Clone, Debug)]
#[serde(rename_all = "camelCase")]
pub struct MothershipData {
    /// One mothership per player for now, so ids equal the owner id.
    pub mothership_id: String,
    pub owner_id: String,
    pub owner_name: String,
    /// Sprite/capability type, e.g. "mothership-1" — resolves art as `<type>-<state>-<relation>`.
    pub ship_type: String,
    /// Renders the `-damaged` sprite variant when true.
    pub damaged: bool,
    /// Anchor (top-left) tile of the footprint.
    pub col: i64,
    pub row: i64,
    /// Footprint size in tiles (span*span).
    pub span: i64,
}

/// Result of a verified mothership relocation (ROADMAP P1.22): the ship's new
/// placement plus the resource counts after the fuel cost.
#[derive(Serialize, Debug)]
pub struct MothershipActionResponse {
    pub event_id: String,
    pub mothership: MothershipData,
    pub resources: ResourceCounts,
}

/// Fuel cost per tile of straight-line warp distance — the first real fuel
/// sink (ROADMAP P1.22). P2.6 deliberately left the rate alone: P4.7 replaces
/// warp's fuel cost with a "warp core" item outright, so tuning this number
/// now would be throwaway work. Fuel's broader economy is P4.9.
const WARP_FUEL_PER_TILE: u64 = 1;

/// Fuel cost for a straight-line mothership warp. The client mirrors this for
/// its picker preview, while `relocate_mothership` re-derives it before spend.
fn warp_fuel_cost(src_col: i64, src_row: i64, dest_col: i64, dest_row: i64) -> u64 {
    let distance = ((dest_col - src_col) as f64).hypot((dest_row - src_row) as f64);
    if distance == 0.0 {
        0
    } else {
        (distance * WARP_FUEL_PER_TILE as f64).ceil().max(1.0) as u64
    }
}

/// Center tile of the ship's inner 2*2 that is closest to the given position
/// — the spawn/dock point for vessels. Positions are fractional because
/// recalls depart from a lerped mid-flight position. Mirrors closestDockTile
/// in `src/scene/grid-math.ts` — keep the two in sync.
fn closest_dock_tile(ship: &MothershipData, col: f64, row: f64) -> (i64, i64) {
    let axis = |v: f64, origin: i64| {
        let half = origin + ship.span / 2;
        if v < half as f64 {
            half - 1
        } else {
            half
        }
    };
    (axis(col, ship.col), axis(row, ship.row))
}

/// True if (col, row) is one of the ship's inner 2*2 docking tiles.
/// Mirrors isDockTile in `src/scene/grid-math.ts` — keep the two in sync.
fn is_dock_tile(ship: &MothershipData, col: i64, row: i64) -> bool {
    let on_axis = |v: i64, origin: i64| {
        let half = origin + ship.span / 2;
        v == half - 1 || v == half
    };
    on_axis(col, ship.col) && on_axis(row, ship.row)
}

/// A client's interest-area window: the AOI_SPAN*AOI_SPAN-tile region,
/// centered on (center_col, center_row), inside which world entities are
/// streamed to that client. Snapshot slices and entity pushes are filtered
/// against it; everything the player owns is exempt (a mining vessel must
/// keep existing beyond the edge — alliance entities join the exemption in
/// P4). Per-client state: single-client today (`ServerState::aoi`), but
/// shaped exactly like the per-connection subscriptions P3.1's socket bus
/// needs (SERVER.md § Interest management). Mirrors the TS `MapWindow` in
/// `src/state/game-state-types.ts` — keep the two in sync.
#[derive(Serialize, serde::Deserialize, Clone, Copy, Debug)]
#[serde(rename_all = "camelCase")]
pub struct MapWindow {
    pub center_col: i64,
    pub center_row: i64,
    /// Window edge length in tiles (always AOI_SPAN; carried on the wire so
    /// the client never hardcodes it).
    pub span: i64,
}

impl MapWindow {
    pub(super) fn centered_at(center_col: i64, center_row: i64) -> Self {
        Self {
            center_col,
            center_row,
            span: AOI_SPAN,
        }
    }

    /// Top-left tile of the window. May extend past the map edges — the
    /// intersection math doesn't care.
    fn origin(&self) -> (i64, i64) {
        (
            self.center_col - self.span / 2,
            self.center_row - self.span / 2,
        )
    }

    /// True when the given span*span footprint overlaps this window.
    pub(super) fn intersects(&self, col: i64, row: i64, span: i64) -> bool {
        let (left, top) = self.origin();
        col + span > left && col < left + self.span && row + span > top && row < top + self.span
    }

    /// True when the given fractional tile position (a lerped vessel) lies
    /// inside this window.
    fn contains_point(&self, col: f64, row: f64) -> bool {
        let (left, top) = self.origin();
        col >= left as f64
            && col < (left + self.span) as f64
            && row >= top as f64
            && row < (top + self.span) as f64
    }
}

/// Mining extraction rate in resource units per hour, shared by every tier —
/// tiers differ only in how much an asteroid holds, so a full mine-out takes
/// amount / rate. P2.6 reviewed this and deliberately kept 240: it is the
/// value that makes all three README duration bands land at grade 1 (small
/// 60–240 units → 15–60 min, medium 240–960 → 1–4 h, large 960–2880 → 4–12 h),
/// so it is load-bearing rather than arbitrary — changing it breaks all three
/// at once. Radial grade multiplies the deposit, so deeper nodes take
/// proportionally longer by design; future research/upgrades are the intended
/// lever for bringing those times back down (→ P5.1). Sent to the client in the
/// server-owned balance catalog.
pub(super) const MINE_UNITS_PER_HOUR: u64 = 240;

pub(super) const HOUR_MS: u64 = 3_600_000;

/// How long mining the given amount takes at MINE_UNITS_PER_HOUR, scaled by
/// the dev-speed multiplier (ROADMAP P0.13).
fn mine_duration_ms(amount: u64) -> u64 {
    scaled_ms(amount.saturating_mul(HOUR_MS) / MINE_UNITS_PER_HOUR)
}

/// How much a miner extracts in the given real elapsed time at
/// MINE_UNITS_PER_HOUR — the inverse of `mine_duration_ms`, so proportional
/// early-harvest math (`stop_mining`) stays consistent with the dev-speed
/// multiplier applied to the completion deadline.
fn mined_amount(elapsed_ms: u64) -> u64 {
    unscaled_ms(elapsed_ms).saturating_mul(MINE_UNITS_PER_HOUR) / HOUR_MS
}

/// One asteroid size tier (README § Design principles): footprint, how much
/// resource it can hold, and how many the starter field seeds. Its display
/// fields are sent to `src/map/asteroid-catalog.ts` in the balance catalog.
pub struct AsteroidTierEntry {
    /// Wire key — the `tier` string on `AsteroidData`.
    pub tier: &'static str,
    /// Footprint size in tiles (span*span).
    pub span: i64,
    /// Inclusive resource-amount band; with MINE_UNITS_PER_HOUR this bounds
    /// the full-mine duration per tier.
    pub min_amount: u64,
    pub max_amount: u64,
    /// How many of this tier ServerState::new seeds — the rarity knob
    /// (small common, medium uncommon, large rare). Sized for the full
    /// 1000*1000 map: ~1920 asteroids total is one per ~23*23-tile
    /// neighborhood — 4* the P1.9 density, affordable now that the interest
    /// area (ROADMAP P1.13) unloads everything outside a 100*100 window
    /// (~19 in-window asteroids instead of ~5, which felt sparse under the
    /// tighter zoom cap). P2.6 preserves this 1,920-node density.
    pub seed_count: usize,
    /// Simultaneous mining slots. P2.6 settled this at 1 for every tier,
    /// including large: contention over a rich deposit is meant to be
    /// resolved by combat — driving the occupying vessel home (→ P5.5) —
    /// rather than by sharing the rock. Verification still reads this
    /// instead of hardcoding the single-slot rule.
    pub max_miners: usize,
}

/// Serializable display projection of the authoritative asteroid rules.
/// `seed_count` and `max_miners` stay server-side: they parameterize seeding
/// and mining verification, and the client has nothing to render from them.
#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct AsteroidTierData {
    pub tier: &'static str,
    pub span: i64,
    pub min_amount: u64,
    pub max_amount: u64,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct AsteroidBalanceData {
    pub tiers: Vec<AsteroidTierData>,
    pub mine_units_per_hour: u64,
}

pub const ASTEROID_TIERS: &[AsteroidTierEntry] = &[
    AsteroidTierEntry {
        tier: "small",
        span: 1,
        min_amount: 60,
        max_amount: 240,
        seed_count: 1280,
        max_miners: 1,
    },
    AsteroidTierEntry {
        tier: "medium",
        span: 2,
        min_amount: 240,
        max_amount: 960,
        seed_count: 480,
        max_miners: 1,
    },
    AsteroidTierEntry {
        tier: "large",
        span: 3,
        min_amount: 960,
        max_amount: 2880,
        seed_count: 160,
        max_miners: 1,
    },
];

pub(super) fn asteroid_balance_data() -> AsteroidBalanceData {
    AsteroidBalanceData {
        tiers: ASTEROID_TIERS
            .iter()
            .map(|tier| AsteroidTierData {
                tier: tier.tier,
                span: tier.span,
                min_amount: tier.min_amount,
                max_amount: tier.max_amount,
            })
            .collect(),
        mine_units_per_hour: MINE_UNITS_PER_HOUR,
    }
}

fn asteroid_tier(tier: &str) -> Option<&'static AsteroidTierEntry> {
    ASTEROID_TIERS.iter().find(|t| t.tier == tier)
}

const GRADE_MULTIPLIERS: [(u64, u64); 4] = [(1, 1), (3, 2), (2, 1), (4, 1)];

/// Width of one radial resource band, measured from the nearest map edge.
const GRADE_BAND_WIDTH: i64 = 100;
/// How many bands there are — one deposit multiplier each, so the table's
/// own length is the count.
const GRADE_BAND_COUNT: usize = GRADE_MULTIPLIERS.len();
/// Distance from the nearest edge at which the reserved central system
/// begins: everything past the last band. Derived rather than written out,
/// so widening a band or adding one can't leave the core's bounds behind.
const RESERVED_CORE_MARGIN: i64 = GRADE_BAND_WIDTH * GRADE_BAND_COUNT as i64;

/// Whether a footprint overlaps the reserved central system at all. A
/// multi-tile asteroid may not spill into it even when its top-left anchor
/// sits in the outermost graded ring.
fn touches_reserved_core(col: i64, row: i64, span: i64) -> bool {
    col < MAP_COLS - RESERVED_CORE_MARGIN
        && col + span > RESERVED_CORE_MARGIN
        && row < MAP_ROWS - RESERVED_CORE_MARGIN
        && row + span > RESERVED_CORE_MARGIN
}

/// Deterministic seed for `local-system-1` — the world generator and every
/// per-player spawn plan derive from it (SERVER.md § Persistent state,
/// sessions, and local development).
pub(super) const SYSTEM_SEED: u64 = 0x9E37_79B9_7F4A_7C15;

/// Tiles kept clear of the map boundary so a spawn is never flush against
/// the world edge.
const SPAWN_EDGE_MARGIN: i64 = 4;

/// Bounded deterministic candidate count — a spawn plan either finds a legal
/// spot within this many tries or fails loudly (never a partial profile).
const SPAWN_CANDIDATES: usize = 4096;

/// Deterministically pick a mothership spawn inside the **outer resource
/// band** (grade 1, ROADMAP P2.6).
///
/// Players start on the rim, where asteroids and level-appropriate
/// opposition live, and push inward toward the richer grades (→ P4.2).
/// Uniform whole-map spawning is wrong in both directions: the reserved
/// central system holds no asteroids at all, so a central spawn starts with
/// nothing mineable inside its entire interest window, and a grade-4 spawn
/// would hand a new player 4x deposits before they can use them.
///
/// The band is a ring, so candidates are rejection-sampled — it covers ~36%
/// of the map, which converges long before the candidate bound. Only the
/// anchor is required to be in-band; a footprint straddling the boundary
/// into grade 2 is harmless. `clear` decides whether a candidate footprint
/// is otherwise acceptable.
pub(super) fn plan_outer_band_spawn(
    rng: &mut SeedRng,
    span: i64,
    mut clear: impl FnMut(i64, i64) -> bool,
) -> Option<(i64, i64)> {
    for _ in 0..SPAWN_CANDIDATES {
        let col = rng.range(
            SPAWN_EDGE_MARGIN as u64,
            (MAP_COLS - span - SPAWN_EDGE_MARGIN) as u64,
        ) as i64;
        let row = rng.range(
            SPAWN_EDGE_MARGIN as u64,
            (MAP_ROWS - span - SPAWN_EDGE_MARGIN) as u64,
        ) as i64;
        if asteroid_grade(col, row) != Some(0) {
            continue;
        }
        if clear(col, row) {
            return Some((col, row));
        }
    }
    None
}

/// Grade derives from immutable map position, never save data. The central
/// 200*200 system is reserved for future conflict content and gets no normal
/// asteroids.
fn asteroid_grade(col: i64, row: i64) -> Option<usize> {
    let nearest_edge = col.min(row).min(MAP_COLS - 1 - col).min(MAP_ROWS - 1 - row);
    // Off-map reads negative here, and belong in no band at all.
    if !(0..RESERVED_CORE_MARGIN).contains(&nearest_edge) {
        return None;
    }
    Some((nearest_edge / GRADE_BAND_WIDTH) as usize)
}

/// An active mining job on an asteroid — which vessel, and the extraction
/// window. At most one per asteroid today (single-slot rule); if large
/// asteroids gain multiple miners later this becomes a list, with one window
/// per miner. Mirrors the TS `AsteroidMining` in `src/state/game-state-types.ts` — keep
/// the two in sync.
#[derive(Serialize, serde::Deserialize, Clone, Debug)]
#[serde(rename_all = "camelCase")]
pub struct AsteroidMining {
    /// The mining dispatch that owns this extraction window.
    pub action_id: String,
    pub vessel_id: String,
    /// Epoch ms when extraction starts — the miner's outbound arrival. The
    /// slot is reserved from dispatch, so this can be in the future.
    pub started_at: u64,
    /// Epoch ms when the remaining deposit is fully mined out; the scheduler
    /// auto-recalls the miner then.
    pub completes_at: u64,
}

/// A minable asteroid on the space map (ROADMAP P1.6). Like motherships,
/// placement is server-owned data seeded in ServerState::new and rendered
/// from the snapshot — but asteroids are mutable: mining depletes
/// `remaining`, and a mined-out asteroid leaves the table (AsteroidRemoved
/// push). Following the ModuleData pattern, the struct doubles as its own
/// event payload: an Asteroid push carries the full current snapshot.
/// Mirrors the TS `AsteroidData` in `src/state/game-state-types.ts` — keep the two in
/// sync.
#[derive(Serialize, serde::Deserialize, Clone, Debug)]
#[serde(rename_all = "camelCase")]
pub struct AsteroidData {
    pub asteroid_id: String,
    /// Size tier, an ASTEROID_TIERS key: "small" | "medium" | "large".
    pub tier: String,
    /// The one resource this asteroid yields. Single-resource by design for
    /// now; if large asteroids gain mixed deposits later this becomes a list.
    pub resource: ResourceKind,
    /// Anchor (top-left) tile of the footprint.
    pub col: i64,
    pub row: i64,
    /// Footprint size in tiles (span*span).
    pub span: i64,
    /// Units originally seeded — lets the client show depletion progress.
    pub total: u64,
    /// Units still minable. Settled at mining boundaries (recall/completion),
    /// not per-tick: mid-mine progress is implicit in `mining.started_at` +
    /// MINE_UNITS_PER_HOUR, like vessel positions are implicit in event
    /// timestamps.
    pub remaining: u64,
    /// The active mining job, if any — present from dispatch (the slot is
    /// reserved so two vessels can't race for it) until recall/completion.
    pub mining: Option<AsteroidMining>,
}

/// True when the two footprints are separated by at least `gap` empty tiles
/// on some axis.
fn footprints_clear(
    (a_col, a_row, a_span): (i64, i64, i64),
    (b_col, b_row, b_span): (i64, i64, i64),
    gap: i64,
) -> bool {
    a_col + a_span + gap <= b_col
        || b_col + b_span + gap <= a_col
        || a_row + a_span + gap <= b_row
        || b_row + b_span + gap <= a_row
}

/// Scatter the starter asteroid field (ROADMAP P1.6): ASTEROID_TIERS
/// seed_counts of each tier, rejection-sampled across the four radial resource
/// bands (the center stays empty) to keep clear of motherships and each other, with a
/// deterministic RNG so every run gets the same field until persistence
/// (P2) stores the world. Resource kinds are weighted so high-tech shows up
/// least ("rare asteroids", README § Design principles).
pub(super) fn seed_asteroids(
    motherships: &HashMap<String, MothershipData>,
) -> HashMap<String, AsteroidData> {
    /// Tiles kept empty around every mothership (deploy/dock space).
    const MOTHERSHIP_CLEARANCE: i64 = 6;
    /// Tiles kept empty between asteroids.
    const ASTEROID_CLEARANCE: i64 = 2;
    // Rocky (construction) commonest, metallic (high-tech) rarest — README's
    // asteroid classes; display names live in src/map/asteroid-catalog.ts.
    const RESOURCE_WEIGHTS: [ResourceKind; 8] = [
        ResourceKind::Construction,
        ResourceKind::Construction,
        ResourceKind::Construction,
        ResourceKind::Biological,
        ResourceKind::Biological,
        ResourceKind::Fuel,
        ResourceKind::Fuel,
        ResourceKind::HighTech,
    ];
    let mut rng = SeedRng(SYSTEM_SEED);
    let mut asteroids: HashMap<String, AsteroidData> = HashMap::new();
    let mut seq = 0;
    for tier in ASTEROID_TIERS {
        'placement: for _ in 0..tier.seed_count {
            // Rejection-sample a clear spot; a crowded map just places fewer.
            for _attempt in 0..200 {
                let col = rng.range(0, (MAP_COLS - tier.span) as u64) as i64;
                let row = rng.range(0, (MAP_ROWS - tier.span) as u64) as i64;
                let spot = (col, row, tier.span);
                let Some(grade) = asteroid_grade(col, row) else {
                    continue;
                };
                if touches_reserved_core(col, row, tier.span) {
                    continue;
                }
                let blocked = motherships
                    .values()
                    .any(|m| !footprints_clear(spot, (m.col, m.row, m.span), MOTHERSHIP_CLEARANCE))
                    || asteroids.values().any(|a| {
                        !footprints_clear(spot, (a.col, a.row, a.span), ASTEROID_CLEARANCE)
                    });
                if blocked {
                    continue;
                }
                seq += 1;
                // Snap to a friendly multiple of 10 within the tier band.
                let base_amount = rng.range(tier.min_amount, tier.max_amount) / 10 * 10;
                let base_amount = base_amount.max(tier.min_amount);
                let (numerator, denominator) = GRADE_MULTIPLIERS[grade];
                let amount = base_amount.saturating_mul(numerator) / denominator;
                asteroids.insert(
                    format!("asteroid-{seq}"),
                    AsteroidData {
                        asteroid_id: format!("asteroid-{seq}"),
                        tier: tier.tier.to_string(),
                        resource: RESOURCE_WEIGHTS[(rng.next() % 8) as usize],
                        col,
                        row,
                        span: tier.span,
                        total: amount,
                        remaining: amount,
                        mining: None,
                    },
                );
                continue 'placement;
            }
        }
    }
    asteroids
}

/// Straight-line travel time between two tile positions at the given speed.
/// Callers pass `effective_vessel_speed_px_s()` (already dev-speed scaled)
/// rather than the raw `VESSEL_SPEED_PX_S`, so this stays pure distance/speed
/// math with no scaling of its own — the same speed value that ends up on
/// the wire is what derives the deadline, so the two can never disagree.
fn travel_time_ms(
    src_col: f64,
    src_row: f64,
    dest_col: f64,
    dest_row: f64,
    speed_px_s: f64,
) -> u64 {
    let dist_px = ((dest_col - src_col) * MAP_TILE_PX).hypot((dest_row - src_row) * MAP_TILE_PX);
    (dist_px / speed_px_s * 1000.0).round() as u64
}

/// Harvested resources riding home on a vessel's return leg — deposited into
/// the player's counts when the vessel docks. Mirrors the TS `VesselCargo`
/// in `src/state/game-state-types.ts` — keep the two in sync.
#[derive(Serialize, serde::Deserialize, Clone, Debug)]
#[serde(rename_all = "camelCase")]
pub struct VesselCargo {
    pub resource: ResourceKind,
    pub amount: u64,
}

/// A vessel movement authorized by the backend — dispatches, recalls, and
/// (in phase 3) moves pushed from other players all use this one shape.
/// `src_col`/`src_row` are fractional for recalls, which depart from the
/// vessel's lerped mid-flight position. Mirrors the TS `VesselMoveEvent` in
/// `src/state/game-state-types.ts` — keep the two in sync.
#[derive(Serialize, serde::Deserialize, Clone, Debug)]
#[serde(rename_all = "camelCase")]
pub struct VesselMoveEventData {
    /// Immutable ID for this individual movement leg (a recall replaces the
    /// vessel's current leg but never its prior event identity).
    pub event_id: String,
    pub vessel_id: String,
    pub owner_id: String,
    pub owner_name: String,
    pub mothership_id: String,
    pub vessel_type: String,
    pub src_col: f64,
    pub src_row: f64,
    pub dest_col: i64,
    pub dest_row: i64,
    pub speed: f64,
    pub dispatched_at: u64,
    pub arrival_at: u64,
    /// True on a leg built by `return_leg` (recall or mining auto-return),
    /// false on an outbound dispatch. Settling reads this flag rather than
    /// re-deriving "is this a return" from `is_dock_tile` against the
    /// mothership's *current* position — geometry that a future relocation
    /// (voluntary move, P5.8 forced warp) could change between a return's
    /// dispatch and arrival, stranding the vessel (CR1.4).
    pub returning: bool,
    /// Asteroid this vessel is assigned to mine (ROADMAP P1.6) — present on
    /// the outbound leg and while extracting; cleared on the return leg.
    pub mining_asteroid_id: Option<String>,
    /// Harvested resources riding home on a return leg; deposited when the
    /// vessel docks.
    pub cargo: Option<VesselCargo>,
    /// Durable completion marker for this leg's arrival side effects.
    pub arrival_settled: bool,
}

/// Progress of a vessel's move at `now_ms`, clamped to [0, 1].
fn move_progress(v: &VesselMoveEventData, now_ms: u64) -> f64 {
    let duration = v.arrival_at.saturating_sub(v.dispatched_at);
    if duration == 0 || now_ms >= v.arrival_at {
        return 1.0;
    }
    now_ms.saturating_sub(v.dispatched_at) as f64 / duration as f64
}

/// A vessel's current fractional tile position at `now_ms`, lerped from its
/// move timestamps — the same math the client's vesselWorldPos
/// (src/map/vessel-math.ts) uses.
fn vessel_position(v: &VesselMoveEventData, now_ms: u64) -> (f64, f64) {
    let t = move_progress(v, now_ms);
    (
        v.src_col + (v.dest_col as f64 - v.src_col) * t,
        v.src_row + (v.dest_row as f64 - v.src_row) * t,
    )
}

impl ServerState {
    /// The requesting player's own mothership — dispatch departs from it.
    pub(super) fn player_mothership(&self) -> Result<&MothershipData, String> {
        self.motherships
            .get(&self.player.id)
            .ok_or_else(|| "player has no mothership".to_string())
    }

    /// How many vessels the requesting player currently has in the table
    /// (in flight, parked, or mining) — the fleet-cap check's input.
    fn player_vessel_count(&self) -> usize {
        let player_id = self.player.id.clone();
        self.vessels
            .values()
            .filter(|v| v.owner_id == player_id)
            .count()
    }

    /// Settle every vessel whose current move has arrived: each un-notified
    /// arrival queues a feed notification (ROADMAP P1.5), stamped with
    /// `vessel.arrival_at` rather than `now_ms` — like `settle_mining` below,
    /// so a lazily settled arrival still gets the feed timestamp of when it
    /// actually happened, not when the server got around to noticing. A
    /// vessel finishing a return leg (`vessel.returning`, set by
    /// `return_leg`) additionally despawns (mirroring the arrival handling in
    /// VesselSync.sync's onArrival, src/map/map-vessels.ts) with a VesselRemoved push so
    /// clients drop it from their tables — depositing any cargo it carried
    /// into the resource counts (ROADMAP P1.6: the mining loop's payoff).
    /// Vessels parked at any other destination persist until recalled. Runs
    /// lazily on read/mutation plus eagerly from the scheduler thread, like
    /// production accrual.
    pub(super) fn settle_vessel_arrivals(&mut self, now_ms: u64) {
        self.settle_vessel_arrivals_kind(now_ms, false);
        self.settle_vessel_arrivals_kind(now_ms, true);
    }

    /// Settle one deterministic class of arrivals. Offline replay processes
    /// outbound legs before mining and return legs afterwards.
    pub(super) fn settle_vessel_arrivals_kind(&mut self, now_ms: u64, returning: bool) {
        let mut arrived: Vec<VesselMoveEventData> = self
            .vessels
            .values()
            .filter(|v| {
                now_ms >= v.arrival_at
                    && !v.arrival_settled
                    && v.returning == returning
                    && v.owner_id == self.player.id
            })
            .cloned()
            .collect();
        arrived.sort_by(|a, b| a.event_id.cmp(&b.event_id));
        for vessel in arrived {
            let docked = vessel.returning;
            if docked {
                self.vessels.remove(&vessel.vessel_id);
                let cargo = match &vessel.cargo {
                    Some(cargo) => {
                        // Deposit clamps at the storage cap (ROADMAP P1.11);
                        // whatever doesn't fit is lost, and the notification
                        // says so.
                        let cap = self.storage_caps().get(cargo.resource);
                        let accepted = self.resources.add_capped(cargo.resource, cargo.amount, cap);
                        if accepted > 0 {
                            self.resources_dirty = true;
                        }
                        let lost = cargo.amount - accepted;
                        Some(NotificationCargo {
                            resource: cargo.resource,
                            accepted,
                            lost,
                        })
                    }
                    None => None,
                };
                self.push_notification(
                    vessel.event_id.clone(),
                    NotificationPayload::VesselReturned {
                        vessel_id: vessel.vessel_id.clone(),
                        cargo,
                    },
                    vessel.arrival_at,
                );
                // Own vessel (the only kind until P3) — exempt from
                // interest-area filtering.
                self.queue_push(ServerPush::VesselRemoved {
                    vessel_id: vessel.vessel_id,
                });
            } else {
                if let Some(current) = self.vessels.get_mut(&vessel.vessel_id) {
                    current.arrival_settled = true;
                }
                // Arriving at a plain map destination isn't notification-worthy
                // (P1.21 playtest feedback, July 2026) — only mining-started
                // and vessel-returned are.
                if vessel.mining_asteroid_id.is_some() {
                    self.push_notification(
                        vessel.event_id.clone(),
                        NotificationPayload::MiningStarted {
                            vessel_id: vessel.vessel_id.clone(),
                            asteroid_id: vessel.mining_asteroid_id.clone().expect("checked"),
                            col: vessel.dest_col,
                            row: vessel.dest_row,
                        },
                        vessel.arrival_at,
                    );
                }
            }
        }
    }

    /// Verify and execute a vessel dispatch: the destination must be on the
    /// map and not a docking tile (arriving on a dock despawns the vessel —
    /// that's what recalls are for). The departure dock, speed, and arrival
    /// time are all derived here; the returned event is authoritative and
    /// already recorded, so the next load_game_state snapshot includes it.
    pub(super) fn dispatch_vessel(
        &mut self,
        dest_col: i64,
        dest_row: i64,
        now_ms: u64,
    ) -> Result<VesselMoveEventData, String> {
        self.settle_vessel_arrivals(now_ms);
        let ship = self.player_mothership()?;
        if !(0..MAP_COLS).contains(&dest_col) || !(0..MAP_ROWS).contains(&dest_row) {
            return Err(format!("({dest_col}, {dest_row}) is outside the map"));
        }
        if is_dock_tile(ship, dest_col, dest_row) {
            return Err(format!("({dest_col}, {dest_row}) is a docking tile"));
        }
        if self.player_vessel_count() >= MAX_VESSELS {
            return Err(format!("fleet limit reached ({MAX_VESSELS} vessels)"));
        }
        let (src_col, src_row) = closest_dock_tile(ship, dest_col as f64, dest_row as f64);
        let mothership_id = ship.mothership_id.clone();
        let event = self.outbound_leg(
            mothership_id,
            (src_col as f64, src_row as f64),
            (dest_col, dest_row),
            now_ms,
            None,
        );
        self.vessels.insert(event.vessel_id.clone(), event.clone());
        Ok(event)
    }

    /// Verify and execute a mothership relocation (ROADMAP P1.22): the player
    /// must have no vessel in the table at all (in flight, parked, or mining —
    /// the simplest reading of "all must be docked", and it structurally can't
    /// strand anything, since CR1.4's restranding risk needs a vessel to
    /// strand). The 4*4 destination must be on the map and clear of every
    /// other mothership/asteroid (plain overlap — `footprints_clear` at
    /// `gap: 0` — distinct from `seed_asteroids`' wider seeding clearance).
    /// Fuel cost scales with straight-line tile distance. Broader fuel-economy
    /// tuning is deferred to P4.9. Instant and synchronous like `accept_deal`: no scheduler/timer
    /// involved, so the returned response is already authoritative. The
    /// occupancy check re-reads `self.motherships`/`self.asteroids` live —
    /// never the client's picker preview — so a same-tick race (another
    /// action landing between the client's last preview and this call) can't
    /// slip through: every command runs to completion under one lock on
    /// `ServerState` (see `GameServer::state` / `commands.rs`), so there is no
    /// yield point between this check and the mutation below where another
    /// player's (future, P3.1) command could interleave.
    pub(super) fn relocate_mothership(
        &mut self,
        dest_col: i64,
        dest_row: i64,
        now_ms: u64,
    ) -> Result<MothershipActionResponse, String> {
        self.settle_vessel_arrivals(now_ms);
        let player_id = self.player.id.clone();
        if self.vessels.values().any(|v| v.owner_id == player_id) {
            return Err("recall every vessel before warping".to_string());
        }
        let (src_col, src_row, span) = {
            let ship = self.player_mothership()?;
            (ship.col, ship.row, ship.span)
        };
        if dest_col < 0 || dest_row < 0 || dest_col + span > MAP_COLS || dest_row + span > MAP_ROWS
        {
            return Err(format!("({dest_col}, {dest_row}) is outside the map"));
        }
        let spot = (dest_col, dest_row, span);
        let occupied = self.motherships.values().any(|m| {
            m.mothership_id != player_id && !footprints_clear(spot, (m.col, m.row, m.span), 0)
        }) || self
            .asteroids
            .values()
            .any(|a| !footprints_clear(spot, (a.col, a.row, a.span), 0));
        if occupied {
            return Err(format!("({dest_col}, {dest_row}) is occupied"));
        }
        let cost = warp_fuel_cost(src_col, src_row, dest_col, dest_row);
        self.resources.spend(ResourceKind::Fuel, cost)?;
        self.resources_dirty = true;
        let ship = self
            .motherships
            .get_mut(&player_id)
            .expect("player_mothership already checked existence");
        ship.col = dest_col;
        ship.row = dest_row;
        let mothership = ship.clone();
        let event_id = self.next_event_id();
        self.push_notification(
            event_id.clone(),
            NotificationPayload::MothershipWarped {
                mothership_id: mothership.mothership_id.clone(),
                from_col: src_col,
                from_row: src_row,
                to_col: dest_col,
                to_row: dest_row,
            },
            now_ms,
        );
        Ok(MothershipActionResponse {
            event_id,
            mothership,
            resources: self.resources,
        })
    }

    /// Verify and execute a mining dispatch (ROADMAP P1.6): the asteroid must
    /// exist (a mined-out one has already left the table) and have a free
    /// mining slot. The slot is reserved immediately — an in-transit miner
    /// counts as occupying it, so two vessels can't race for one deposit —
    /// and the extraction window is derived here: it starts on arrival and
    /// ends when the remaining deposit is exhausted (the scheduler
    /// auto-recalls the miner then; an early player recall harvests
    /// proportionally instead). The asteroid change goes out as a push; the
    /// returned vessel event is authoritative like any dispatch.
    pub(super) fn mine_asteroid(
        &mut self,
        asteroid_id: &str,
        now_ms: u64,
    ) -> Result<VesselMoveEventData, String> {
        self.settle_mining(now_ms);
        self.settle_vessel_arrivals(now_ms);
        let ship = self.player_mothership()?.clone();
        let asteroid = self
            .asteroids
            .get(asteroid_id)
            .ok_or_else(|| format!("unknown asteroid: {asteroid_id:?}"))?;
        // Single-slot rule: `mining` holds at most one job today, so any job
        // means the tier's max_miners (1 everywhere) is reached. When large
        // asteroids allow more, this becomes a count-vs-max_miners check.
        let max_miners = asteroid_tier(&asteroid.tier).map_or(1, |t| t.max_miners);
        if asteroid.mining.iter().count() >= max_miners {
            return Err(format!(
                "asteroid {asteroid_id:?} already has a vessel mining it"
            ));
        }
        if self.player_vessel_count() >= MAX_VESSELS {
            return Err(format!("fleet limit reached ({MAX_VESSELS} vessels)"));
        }
        // Fly to the footprint tile closest to the departure dock.
        let center_col = asteroid.col as f64 + asteroid.span as f64 / 2.0;
        let center_row = asteroid.row as f64 + asteroid.span as f64 / 2.0;
        let (src_col, src_row) = closest_dock_tile(&ship, center_col, center_row);
        let dest_col = (src_col).clamp(asteroid.col, asteroid.col + asteroid.span - 1);
        let dest_row = (src_row).clamp(asteroid.row, asteroid.row + asteroid.span - 1);
        let remaining = asteroid.remaining;
        let event = self.outbound_leg(
            ship.mothership_id.clone(),
            (src_col as f64, src_row as f64),
            (dest_col, dest_row),
            now_ms,
            Some(asteroid_id.to_string()),
        );
        let asteroid = self
            .asteroids
            .get_mut(asteroid_id)
            .expect("existence checked above");
        asteroid.mining = Some(AsteroidMining {
            action_id: event.event_id.clone(),
            vessel_id: event.vessel_id.clone(),
            started_at: event.arrival_at,
            completes_at: deadline_after(event.arrival_at, mine_duration_ms(remaining)),
        });
        let snapshot = asteroid.clone();
        self.queue_entity_push(
            (snapshot.col, snapshot.row, snapshot.span),
            ServerPush::Asteroid(snapshot),
        );
        self.vessels.insert(event.vessel_id.clone(), event.clone());
        Ok(event)
    }

    /// End the given vessel's mining job on an asteroid and harvest what it
    /// extracted so far — the full remainder when the window ran to
    /// completion, a time-proportional share on an early recall, nothing if
    /// the vessel never arrived. Depletes the asteroid (removing it outright
    /// at zero, with the AsteroidRemoved push and feed entry) and returns the
    /// cargo to stamp on the vessel's return leg. No-op when the asteroid is
    /// gone or the job belongs to a different vessel.
    fn stop_mining(
        &mut self,
        asteroid_id: &str,
        vessel_id: &str,
        now_ms: u64,
    ) -> Option<VesselCargo> {
        let asteroid = self.asteroids.get_mut(asteroid_id)?;
        match &asteroid.mining {
            Some(mining) if mining.vessel_id == vessel_id => {}
            _ => return None,
        }
        let mining = asteroid.mining.take().expect("matched above");
        // A window that ran to completion harvests the whole remainder
        // outright: deriving it from elapsed time floors (mined_amount), and
        // whenever amount * HOUR_MS isn't divisible by the rate that would
        // strand a husk asteroid holding the rounding remainder. Partial
        // recalls floor deliberately — the remainder stays minable.
        let harvested = if now_ms >= mining.completes_at {
            asteroid.remaining
        } else {
            let elapsed = now_ms.saturating_sub(mining.started_at);
            mined_amount(elapsed).min(asteroid.remaining)
        };
        asteroid.remaining -= harvested;
        let resource = asteroid.resource;
        // Footprint captured before a depleted asteroid leaves the table —
        // its removal push is interest-area filtered like any entity push.
        let footprint = (asteroid.col, asteroid.row, asteroid.span);
        let snapshot = asteroid.clone();
        if snapshot.remaining == 0 {
            self.asteroids.remove(asteroid_id);
            self.push_notification(
                mining.action_id,
                NotificationPayload::AsteroidDepleted {
                    asteroid_id: asteroid_id.to_string(),
                    tier: snapshot.tier.clone(),
                    resource,
                    col: footprint.0,
                    row: footprint.1,
                },
                now_ms,
            );
            self.queue_entity_push(
                footprint,
                ServerPush::AsteroidRemoved {
                    asteroid_id: asteroid_id.to_string(),
                },
            );
        } else {
            self.queue_entity_push(footprint, ServerPush::Asteroid(snapshot));
        }
        (harvested > 0).then_some(VesselCargo {
            resource,
            amount: harvested,
        })
    }

    /// Auto-recall every miner whose extraction window has run out
    /// (ROADMAP P1.6): harvest the full remainder, put the vessel on a
    /// return leg stamped with the cargo, and let stop_mining remove the
    /// now-empty asteroid. The leg is timestamped at the completion moment,
    /// not the settle time, so a client that was away sees the vessel where
    /// it really is — the same aged-event lerp recalls rely on. Runs lazily
    /// on read/mutation plus eagerly from the scheduler thread.
    pub(super) fn settle_mining(&mut self, now_ms: u64) {
        let mut due: Vec<(String, AsteroidMining)> = self
            .asteroids
            .values()
            .filter_map(|a| {
                a.mining
                    .clone()
                    .filter(|m| now_ms >= m.completes_at)
                    .filter(|m| {
                        self.vessels
                            .get(&m.vessel_id)
                            .is_some_and(|vessel| vessel.owner_id == self.player.id)
                    })
                    .map(|m| (a.asteroid_id.clone(), m))
            })
            .collect();
        due.sort_by(|a, b| a.1.action_id.cmp(&b.1.action_id));
        for (asteroid_id, mining) in due {
            // No "mining complete" notification of its own (P1.21 playtest
            // feedback, July 2026) — vessel-returned reports the harvested
            // amount once the vessel actually docks, so an interim mid-flight
            // announcement here would just be noise.
            let cargo = self.stop_mining(&asteroid_id, &mining.vessel_id, mining.completes_at);
            let Some(vessel) = self.vessels.get_mut(&mining.vessel_id) else {
                continue;
            };
            vessel.mining_asteroid_id = None;
            vessel.cargo = cargo;
            let vessel = vessel.clone();
            // Send it home; if the mothership is somehow gone the vessel just
            // stays parked with its cargo until a later recall succeeds.
            let event = match self.return_leg(&vessel, mining.completes_at) {
                Ok(event) => event,
                Err(_) => vessel,
            };
            self.vessels.insert(event.vessel_id.clone(), event.clone());
            // Own vessel (the only kind until P3) — exempt from
            // interest-area filtering.
            self.queue_push(ServerPush::Vessel(event));
        }
    }

    /// The return-home leg for a vessel at `at_ms`, departing from its lerped
    /// current position toward the closest docking tile — shared by player
    /// recalls and the mining auto-return. Pure derivation: recording the
    /// event and notification bookkeeping stay with the caller.
    fn return_leg(
        &mut self,
        vessel: &VesselMoveEventData,
        at_ms: u64,
    ) -> Result<VesselMoveEventData, String> {
        let ship = self.motherships.get(&vessel.mothership_id).ok_or_else(|| {
            format!(
                "vessel {:?} has no mothership to return to",
                vessel.vessel_id
            )
        })?;
        let (src_col, src_row) = vessel_position(vessel, at_ms);
        let (dock_col, dock_row) = closest_dock_tile(ship, src_col, src_row);
        Ok(VesselMoveEventData {
            event_id: self.next_event_id(),
            arrival_settled: false,
            src_col,
            src_row,
            dest_col: dock_col,
            dest_row: dock_row,
            dispatched_at: at_ms,
            arrival_at: deadline_after(
                at_ms,
                travel_time_ms(
                    src_col,
                    src_row,
                    dock_col as f64,
                    dock_row as f64,
                    vessel.speed,
                ),
            ),
            returning: true,
            mining_asteroid_id: None,
            ..vessel.clone()
        })
    }

    /// A fresh outward leg for a newly dispatched vessel — shared by
    /// `dispatch_vessel` and `mine_asteroid`, which differ only in
    /// destination derivation and whether a mining job is attached. Assigns
    /// the vessel id and owner identity, derives arrival time from speed and
    /// distance, and stamps `returning: false`. Recording the event in
    /// `self.vessels` stays with the caller.
    fn outbound_leg(
        &mut self,
        mothership_id: String,
        src: (f64, f64),
        dest: (i64, i64),
        now_ms: u64,
        mining_asteroid_id: Option<String>,
    ) -> VesselMoveEventData {
        let (src_col, src_row) = src;
        let (dest_col, dest_row) = dest;
        self.next_vessel_seq += 1;
        let player = self.player.clone();
        let speed = effective_vessel_speed_px_s();
        VesselMoveEventData {
            event_id: self.next_event_id(),
            vessel_id: format!("vessel-{}-{}", now_ms, self.next_vessel_seq),
            owner_id: player.id,
            owner_name: player.name,
            mothership_id,
            vessel_type: VESSEL_TYPE.to_string(),
            src_col,
            src_row,
            dest_col,
            dest_row,
            speed,
            dispatched_at: now_ms,
            arrival_at: deadline_after(
                now_ms,
                travel_time_ms(src_col, src_row, dest_col as f64, dest_row as f64, speed),
            ),
            returning: false,
            mining_asteroid_id,
            cargo: None,
            arrival_settled: false,
        }
    }

    /// Verify and execute a recall: the vessel must exist and belong to the
    /// requesting player. The return leg departs from the vessel's current
    /// (lerped, possibly fractional) position toward the closest docking
    /// tile; arriving there despawns it (see settle_vessel_arrivals). A
    /// vessel recalled off a mining job harvests proportionally to the time
    /// it spent extracting (ROADMAP P1.6) — the partial cargo rides the
    /// return leg; recalling before it ever reached the asteroid just frees
    /// the slot.
    pub(super) fn recall_vessel(
        &mut self,
        vessel_id: &str,
        now_ms: u64,
    ) -> Result<VesselMoveEventData, String> {
        // A job whose window already ran out is settled first — its full
        // harvest and auto-return happened at completes_at; the recall then
        // legally redirects the return leg (cargo intact).
        self.settle_mining(now_ms);
        self.settle_vessel_arrivals(now_ms);
        let vessel = self
            .vessels
            .get(vessel_id)
            .ok_or_else(|| format!("unknown vessel: {vessel_id:?}"))?
            .clone();
        if vessel.owner_id != self.player.id {
            return Err(format!("vessel {vessel_id:?} belongs to another player"));
        }
        let mut event = self.return_leg(&vessel, now_ms)?;
        if let Some(asteroid_id) = &vessel.mining_asteroid_id {
            event.cargo = self.stop_mining(asteroid_id, vessel_id, now_ms);
        }
        // The redirect puts the vessel back in flight: its next arrival is a
        // fresh event for the notification bookkeeping.
        self.vessels.insert(vessel_id.to_string(), event.clone());
        Ok(event)
    }

    /// Every mothership the client should hold (ROADMAP P1.13): the player's
    /// own anywhere, everyone else's only inside the interest area. Stable
    /// id order — the placement slice of snapshots and window responses.
    pub(super) fn motherships_snapshot(&self) -> Vec<MothershipData> {
        let player_id = self.player.id.clone();
        let mut ships: Vec<_> = self
            .motherships
            .values()
            .filter(|m| m.owner_id == player_id || self.aoi.intersects(m.col, m.row, m.span))
            .cloned()
            .collect();
        ships.sort_by(|a, b| a.mothership_id.cmp(&b.mothership_id));
        ships
    }

    /// Every vessel the client should hold, in dispatch order: the player's
    /// own anywhere (a mining vessel must keep existing beyond the window
    /// edge), foreign ones only while their current lerped position is
    /// inside the interest area — the vessel slice of snapshots and window
    /// responses.
    pub(super) fn active_vessels(&mut self, now_ms: u64) -> Vec<VesselMoveEventData> {
        self.settle_vessel_arrivals(now_ms);
        let player_id = self.player.id.clone();
        let mut vessels: Vec<_> = self
            .vessels
            .values()
            .filter(|v| {
                if v.owner_id == player_id {
                    return true;
                }
                let (col, row) = vessel_position(v, now_ms);
                self.aoi.contains_point(col, row)
            })
            .cloned()
            .collect();
        vessels
            .sort_by(|a, b| (a.dispatched_at, &a.vessel_id).cmp(&(b.dispatched_at, &b.vessel_id)));
        vessels
    }

    /// Every asteroid inside the interest area that still holds resources,
    /// in stable id order — the asteroid slice of snapshots and window
    /// responses (ROADMAP P1.13: the rest of the field stays server-side
    /// until the window moves over it).
    pub(super) fn asteroids_snapshot(&mut self, now_ms: u64) -> Vec<AsteroidData> {
        self.settle_mining(now_ms);
        let mut asteroids: Vec<_> = self
            .asteroids
            .values()
            .filter(|a| self.aoi.intersects(a.col, a.row, a.span))
            .cloned()
            .collect();
        asteroids.sort_by(|a, b| a.asteroid_id.cmp(&b.asteroid_id));
        asteroids
    }

    /// Re-center the client's interest area (ROADMAP P1.13) and return the
    /// world entities inside the new window. The client replaces its
    /// mothership/asteroid/vessel tables wholesale with these slices, so
    /// everything that left the window unloads, and the response is
    /// authoritative for everything inside it — stale mining slots and
    /// deposits resolve on window re-entry.
    pub(super) fn map_window(
        &mut self,
        center_col: i64,
        center_row: i64,
        now_ms: u64,
    ) -> Result<MapWindowData, String> {
        if !(0..MAP_COLS).contains(&center_col) || !(0..MAP_ROWS).contains(&center_row) {
            return Err(format!("({center_col}, {center_row}) is outside the map"));
        }
        self.aoi = MapWindow::centered_at(center_col, center_row);
        // Asteroids settle mining first so an auto-returning miner lands in
        // the vessel slice of this same response.
        let asteroids = self.asteroids_snapshot(now_ms);
        let vessels = self.active_vessels(now_ms);
        Ok(MapWindowData {
            window: self.aoi,
            motherships: self.motherships_snapshot(),
            asteroids,
            vessels,
        })
    }
}

#[cfg(test)]
mod tests {
    use super::super::test_support::*;
    use super::*;

    /// Paired with tests/cross_language_contract_test.ts. These are internal
    /// geometry and preview values, so a shared fixture makes their mirrors
    /// explicit without adding them to the gameplay wire format.
    #[test]
    fn cross_language_world_contracts_match_the_shared_fixture() {
        let contracts: serde_json::Value = serde_json::from_str(include_str!(
            "../../../tests/fixtures/cross-language-contracts.json"
        ))
        .expect("read cross-language contract fixture");

        let asteroids = &contracts["asteroids"];
        let map = asteroids["map"]
            .as_array()
            .expect("asteroid map dimensions");
        assert_eq!(
            [MAP_COLS, MAP_ROWS],
            [map[0].as_i64().unwrap(), map[1].as_i64().unwrap()]
        );
        assert_eq!(
            GRADE_BAND_WIDTH,
            asteroids["gradeBandWidth"].as_i64().unwrap()
        );
        let multipliers: Vec<(u64, u64)> = asteroids["gradeMultipliers"]
            .as_array()
            .expect("grade multipliers")
            .iter()
            .map(|pair| {
                let pair = pair.as_array().expect("grade multiplier pair");
                (pair[0].as_u64().unwrap(), pair[1].as_u64().unwrap())
            })
            .collect();
        assert_eq!(GRADE_MULTIPLIERS.as_slice(), multipliers.as_slice());
        for point in asteroids["grades"].as_array().expect("grade samples") {
            let expected = point["grade"].as_u64().map(|grade| (grade - 1) as usize);
            assert_eq!(
                asteroid_grade(
                    point["col"].as_i64().unwrap(),
                    point["row"].as_i64().unwrap()
                ),
                expected,
                "grade sample {point}"
            );
        }

        let ship = &contracts["ship"];
        let mothership = MothershipData {
            mothership_id: "contract-ship".to_string(),
            owner_id: "contract-player".to_string(),
            owner_name: "Contract Player".to_string(),
            ship_type: "mothership-1".to_string(),
            damaged: false,
            col: ship["mothership"]["col"].as_i64().unwrap(),
            row: ship["mothership"]["row"].as_i64().unwrap(),
            span: ship["mothership"]["span"].as_i64().unwrap(),
        };
        for point in ship["docks"].as_array().expect("dock samples") {
            assert_eq!(
                is_dock_tile(
                    &mothership,
                    point["col"].as_i64().unwrap(),
                    point["row"].as_i64().unwrap()
                ),
                point["isDock"].as_bool().unwrap()
            );
        }
        for point in ship["closestDocks"]
            .as_array()
            .expect("closest dock samples")
        {
            let dest = point["dest"].as_array().expect("dock destination");
            let dock = point["dock"].as_array().expect("expected dock");
            assert_eq!(
                closest_dock_tile(
                    &mothership,
                    dest[0].as_f64().unwrap(),
                    dest[1].as_f64().unwrap()
                ),
                (dock[0].as_i64().unwrap(), dock[1].as_i64().unwrap())
            );
        }

        let vessel = &contracts["vessel"];
        let src = vessel["src"].as_array().expect("vessel source");
        let dest = vessel["dest"].as_array().expect("vessel destination");
        let leg = VesselMoveEventData {
            event_id: "contract-event".to_string(),
            vessel_id: "contract-vessel".to_string(),
            owner_id: "contract-player".to_string(),
            owner_name: "Contract Player".to_string(),
            mothership_id: "contract-ship".to_string(),
            vessel_type: VESSEL_TYPE.to_string(),
            src_col: src[0].as_f64().unwrap(),
            src_row: src[1].as_f64().unwrap(),
            dest_col: dest[0].as_i64().unwrap(),
            dest_row: dest[1].as_i64().unwrap(),
            speed: VESSEL_SPEED_PX_S,
            dispatched_at: vessel["dispatchedAt"].as_u64().unwrap(),
            arrival_at: vessel["arrivalAt"].as_u64().unwrap(),
            returning: false,
            mining_asteroid_id: None,
            cargo: None,
            arrival_settled: false,
        };
        for sample in vessel["samples"].as_array().expect("vessel samples") {
            let position = sample["position"].as_array().expect("vessel position");
            assert_eq!(
                move_progress(&leg, sample["now"].as_u64().unwrap()),
                sample["progress"].as_f64().unwrap()
            );
            assert_eq!(
                vessel_position(&leg, sample["now"].as_u64().unwrap()),
                (position[0].as_f64().unwrap(), position[1].as_f64().unwrap())
            );
        }

        let warp = &contracts["warp"];
        assert_eq!(WARP_FUEL_PER_TILE, warp["fuelPerTile"].as_u64().unwrap());
        for sample in warp["cases"].as_array().expect("warp samples") {
            let from = sample["from"].as_array().expect("warp source");
            let to = sample["to"].as_array().expect("warp destination");
            assert_eq!(
                warp_fuel_cost(
                    from[0].as_i64().unwrap(),
                    from[1].as_i64().unwrap(),
                    to[0].as_i64().unwrap(),
                    to[1].as_i64().unwrap()
                ),
                sample["cost"].as_u64().unwrap()
            );
        }
    }

    #[test]
    fn dispatch_departs_from_the_closest_dock_with_arrival_time() {
        let mut s = anchored_state(498, 498);
        let event = s.dispatch_vessel(500, 510, 1_000).unwrap();
        // Mothership at (498, 498), 4*4: the inner docks are
        // (499..=500, 499..=500).
        assert_eq!((event.src_col, event.src_row), (500.0, 500.0));
        assert_eq!((event.dest_col, event.dest_row), (500, 510));
        assert_eq!(event.owner_id, player_identity().id);
        assert_eq!(event.speed, VESSEL_SPEED_PX_S);
        assert_eq!(event.dispatched_at, 1_000);
        // 10 tiles * 32 px at 32 px/s = 10 s of travel.
        assert_eq!(event.arrival_at, 11_000);
        assert_eq!(s.active_vessels(1_000).len(), 1);
    }

    #[test]
    fn dispatch_rejects_off_map_and_docking_destinations() {
        let mut s = anchored_state(498, 498);
        for (col, row) in [(1000, 5), (5, -1), (-3, 3), (2, 1000)] {
            let err = s.dispatch_vessel(col, row, 0).unwrap_err();
            assert!(err.contains("outside the map"), "{err}");
        }
        let err = s.dispatch_vessel(499, 500, 0).unwrap_err();
        assert!(err.contains("docking tile"), "{err}");
        assert!(s.active_vessels(0).is_empty());
    }

    #[test]
    fn dispatch_rejects_beyond_the_fleet_cap() {
        let mut s = anchored_state(498, 498);
        for i in 0..MAX_VESSELS {
            s.dispatch_vessel(500, 510 + i as i64, 0).unwrap();
        }
        assert_eq!(s.active_vessels(0).len(), MAX_VESSELS);
        let err = s.dispatch_vessel(500, 600, 0).unwrap_err();
        assert!(err.contains("fleet limit"), "{err}");
        // Recalling one mid-flight frees a slot only once its return leg
        // actually docks — the recalled vessel stays in the table meanwhile.
        let vessel_id = s.active_vessels(0)[0].vessel_id.clone();
        let back = s.recall_vessel(&vessel_id, 2_000).unwrap();
        let err = s.dispatch_vessel(500, 600, 2_000).unwrap_err();
        assert!(err.contains("fleet limit"), "{err}");
        s.dispatch_vessel(500, 600, back.arrival_at).unwrap();
    }

    #[test]
    fn recall_redirects_from_the_lerped_mid_flight_position() {
        let mut s = anchored_state(498, 498);
        let out = s.dispatch_vessel(500, 510, 0).unwrap();
        // Halfway through the 10 s outbound flight the vessel sits at row 505.
        let back = s.recall_vessel(&out.vessel_id, 5_000).unwrap();
        assert_eq!(back.vessel_id, out.vessel_id);
        assert_eq!((back.src_col, back.src_row), (500.0, 505.0));
        assert_eq!((back.dest_col, back.dest_row), (500, 500));
        assert_eq!(back.dispatched_at, 5_000);
        assert_eq!(back.arrival_at, 10_000);
        // Docking completes: the vessel leaves the snapshot...
        assert!(s.active_vessels(10_000).is_empty());
        // ...and can no longer be recalled.
        let err = s.recall_vessel(&out.vessel_id, 10_000).unwrap_err();
        assert!(err.contains("unknown vessel"), "{err}");
    }

    #[test]
    fn arrived_vessels_stay_parked_until_recalled() {
        let mut s = anchored_state(498, 498);
        let out = s.dispatch_vessel(500, 510, 0).unwrap();
        // Long past arrival the vessel is still on the map, parked at dest.
        assert_eq!(s.active_vessels(60_000).len(), 1);
        let back = s.recall_vessel(&out.vessel_id, 60_000).unwrap();
        assert_eq!((back.src_col, back.src_row), (500.0, 510.0));
        assert_eq!((back.dest_col, back.dest_row), (500, 500));
        assert_eq!(back.arrival_at, 70_000);
    }

    #[test]
    fn recall_of_an_unknown_vessel_fails() {
        let mut s = ServerState::new(0);
        let err = s.recall_vessel("vessel-x", 0).unwrap_err();
        assert!(err.contains("unknown vessel"), "{err}");
    }

    #[test]
    fn relocate_moves_the_ship_and_spends_fuel_by_distance() {
        let mut s = anchored_state(498, 498);
        s.resources.fuel = 200;
        // Player starts at (498, 498); straight-line distance to (600, 600)
        // is hypot(102, 102) ≈ 144.25, so the fuel cost rounds up to 145.
        let response = s.relocate_mothership(600, 600, 0).unwrap();
        assert_eq!(
            (response.mothership.col, response.mothership.row),
            (600, 600)
        );
        assert_eq!(response.resources.fuel, 200 - 145);
        assert_eq!(s.player_mothership().unwrap().col, 600);
    }

    #[test]
    fn relocate_queues_a_notification_and_resources_push() {
        let mut s = anchored_state(498, 498);
        s.resources.fuel = 200;
        s.relocate_mothership(600, 600, 0).unwrap();
        let pushes = s.drain_pushes();
        assert!(pushes.iter().any(|p| matches!(
            p,
            ServerPush::Notification(n)
                if matches!(&n.payload, NotificationPayload::MothershipWarped { from_col: 498, from_row: 498, to_col: 600, to_row: 600, .. })
                    && !n.read
        )));
        assert!(pushes
            .iter()
            .any(|p| matches!(p, ServerPush::Resources(r) if r.fuel == 200 - 145)));
    }

    #[test]
    fn relocate_to_the_same_spot_costs_no_fuel() {
        let mut s = anchored_state(498, 498);
        let response = s.relocate_mothership(498, 498, 0).unwrap();
        assert_eq!(response.resources.fuel, 100);
    }

    #[test]
    fn relocate_rejects_when_a_vessel_is_deployed() {
        let mut s = anchored_state(498, 498);
        s.dispatch_vessel(500, 510, 0).unwrap();
        let err = s.relocate_mothership(600, 600, 0).unwrap_err();
        assert!(err.contains("recall every vessel"), "{err}");
    }

    #[test]
    fn relocate_rejects_off_map_and_occupied_destinations() {
        let mut s = anchored_state(498, 498);
        let err = s.relocate_mothership(999, 5, 0).unwrap_err();
        assert!(err.contains("outside the map"), "{err}");
        s.resources.fuel = 100;
        s.motherships.insert(
            "player-2".to_string(),
            MothershipData {
                mothership_id: "player-2".to_string(),
                owner_id: "player-2".to_string(),
                owner_name: "Player 2".to_string(),
                ship_type: "mothership-1".to_string(),
                damaged: false,
                col: 503,
                row: 499,
                span: 4,
            },
        );
        // (503, 499) is another real profile's mothership anchor.
        let err = s.relocate_mothership(503, 499, 0).unwrap_err();
        assert!(err.contains("occupied"), "{err}");
    }

    #[test]
    fn relocate_rejects_insufficient_fuel() {
        let mut s = anchored_state(498, 498);
        let err = s.relocate_mothership(600, 600, 0).unwrap_err();
        assert!(err.contains("not enough fuel"), "{err}");
        // Nothing moved: the failed spend left the ship at its old spot.
        assert_eq!(s.player_mothership().unwrap().col, 498);
    }

    #[test]
    fn snapshot_includes_the_selected_profiles_mothership() {
        let s = anchored_state(498, 498);
        let ships = s.motherships_snapshot();
        assert_eq!(ships.len(), 1);
        let player = ships.iter().find(|m| m.owner_id == "player-1").unwrap();
        assert_eq!((player.col, player.row, player.span), (498, 498, 4));
        assert!(!player.damaged);
    }

    #[test]
    fn radial_grade_bands_tile_the_map_and_reserve_the_core() {
        // Bands and the reserved core are both derived from one width/count
        // pair. These fixed coordinates are what pins that derivation to the
        // intended 100-tile bands and empty 200*200 centre — without them the
        // seeding code and its own assertions would agree with each other
        // while both being wrong.
        assert_eq!(asteroid_grade(0, 0), Some(0));
        assert_eq!(asteroid_grade(99, 500), Some(0));
        assert_eq!(asteroid_grade(100, 500), Some(1));
        assert_eq!(asteroid_grade(399, 500), Some(3));
        assert_eq!(asteroid_grade(400, 500), None);
        assert_eq!(asteroid_grade(500, 500), None);
        // Bands are measured from the *nearest* edge, so the far side mirrors.
        assert_eq!(asteroid_grade(MAP_COLS - 1, 500), Some(0));
        assert_eq!(asteroid_grade(600, 500), Some(3));
        assert_eq!(asteroid_grade(599, 500), None);
        // Off-map reads negative and belongs to no band.
        assert_eq!(asteroid_grade(-1, 500), None);

        // The reserved core is exactly the ungraded region: a 1*1 footprint
        // touches it precisely where `asteroid_grade` gives up.
        for col in [399, 400, 500, 599, 600] {
            assert_eq!(
                touches_reserved_core(col, 500, 1),
                asteroid_grade(col, 500).is_none(),
                "col {col}"
            );
        }
        // A larger footprint is excluded as soon as one tile would spill in.
        assert!(touches_reserved_core(398, 500, 3));
        assert!(!touches_reserved_core(397, 500, 3));
    }

    #[test]
    fn spawns_land_in_the_outer_band_with_asteroids_in_the_home_window() {
        // P2.6 regression: the radial bands emptied the central system, and a
        // spawn there starts with nothing mineable inside its entire interest
        // window — no mining loop at all on first boot.
        let mut s = ServerState::new(0);
        let ship = s.player_mothership().expect("player mothership");
        let (col, row) = (ship.col, ship.row);
        assert_eq!(asteroid_grade(col, row), Some(0), "spawn ({col}, {row})");
        let window = s.aoi;
        let visible = s
            .asteroids
            .values()
            .filter(|a| window.intersects(a.col, a.row, a.span))
            .count();
        assert!(visible > 0, "no asteroids in the home window");

        // A profile created later follows the same rule, and never lands on
        // top of the world already seeded around it.
        s.create_player_profile("Player 2".to_string(), 0)
            .expect("create second local profile");
        let second = s.player_mothership().expect("second mothership");
        assert_eq!(asteroid_grade(second.col, second.row), Some(0));
        let separated = super::super::state::footprints_separated;
        assert!(s.asteroids.values().all(|a| separated(
            (second.col, second.row, 4),
            (a.col, a.row, a.span),
            1
        )));
        assert!(separated((second.col, second.row, 4), (col, row, 4), 1));
    }

    #[test]
    fn window_intersection_covers_edges_and_multi_tile_footprints() {
        // Centered at (500, 500) with span 100 the window covers [450, 550).
        let w = MapWindow::centered_at(500, 500);
        assert_eq!(w.span, AOI_SPAN);
        assert!(w.intersects(450, 450, 1));
        assert!(w.intersects(549, 549, 1));
        assert!(!w.intersects(449, 500, 1));
        assert!(!w.intersects(550, 500, 1));
        // A 3*3 footprint anchored outside still overlaps the window edge.
        assert!(w.intersects(448, 500, 3));
        assert!(w.intersects(500, 548, 3));
        assert!(!w.intersects(446, 500, 3));
        // Fractional vessel positions use half-open bounds too.
        assert!(w.contains_point(450.0, 549.9));
        assert!(!w.contains_point(449.9, 500.0));
        assert!(!w.contains_point(500.0, 550.0));
    }

    #[test]
    fn map_window_recenters_and_returns_the_windowed_world() {
        let mut s = ServerState::new(0);
        let far = s.map_window(100, 100, 0).unwrap();
        assert_eq!(
            (
                far.window.center_col,
                far.window.center_row,
                far.window.span
            ),
            (100, 100, AOI_SPAN)
        );
        // The player's own mothership rides along even though it sits far
        // outside the new window; the enemy's doesn't.
        assert!(far.motherships.iter().any(|m| m.owner_id == "player-1"));
        assert!(!far.motherships.iter().any(|m| m.owner_id == "player-2"));
        assert!(!far.asteroids.is_empty());
        for asteroid in &far.asteroids {
            assert!(far
                .window
                .intersects(asteroid.col, asteroid.row, asteroid.span));
        }
        // Off-map centers are rejected without moving the window.
        assert!(s
            .map_window(-1, 100, 0)
            .unwrap_err()
            .contains("outside the map"));
        assert!(s
            .map_window(100, 1000, 0)
            .unwrap_err()
            .contains("outside the map"));
        assert_eq!((s.aoi.center_col, s.aoi.center_row), (100, 100));
    }

    #[test]
    fn plain_arrival_is_quiet_and_docking_notifies_with_push() {
        let mut s = ServerState::new(0);
        let out = s.dispatch_vessel(500, 510, 0).unwrap();
        s.drain_pushes();
        // A plain arrival (not mining) is deliberately quiet (P1.21 playtest
        // feedback, July 2026) — only mining-started and vessel-returned are
        // notification-worthy.
        let lazy_settle_at = out.arrival_at + 5 * TICK;
        s.settle(lazy_settle_at);
        assert!(!s
            .drain_pushes()
            .iter()
            .any(|p| matches!(p, ServerPush::Notification(_))));
        // Parked: later settles stay quiet about it too.
        s.settle(lazy_settle_at + 5 * TICK);
        assert!(!s
            .drain_pushes()
            .iter()
            .any(|p| matches!(p, ServerPush::Notification(_))));
        // The recall's docking arrival despawns the vessel: a "returned"
        // notification plus the VesselRemoved push for the client's table.
        let back = s
            .recall_vessel(&out.vessel_id, lazy_settle_at + 5 * TICK)
            .unwrap();
        s.drain_pushes();
        // Same lazy-settle check on the return leg — the notification must
        // still be stamped with the arrival moment, not this later settle
        // time (CR1.2).
        let lazy_return_settle_at = back.arrival_at + 5 * TICK;
        s.settle(lazy_return_settle_at);
        let pushes = s.drain_pushes();
        assert!(pushes.iter().any(|p| matches!(
            p,
            ServerPush::Notification(n)
                if n.payload.kind() == "vessel-returned" && n.created_at == back.arrival_at
        )));
        assert!(pushes.iter().any(|p| matches!(
            p,
            ServerPush::VesselRemoved { vessel_id } if *vessel_id == out.vessel_id
        )));
        assert!(s.active_vessels(lazy_return_settle_at).is_empty());
        assert_eq!(notification_kinds(&s), vec!["vessel-returned"]);
    }

    #[test]
    fn seeded_asteroid_field_is_deterministic_and_valid() {
        let a = ServerState::new(0);
        let b = ServerState::new(0);
        let key = |s: &ServerState| {
            let mut rows: Vec<_> = s
                .asteroids
                .values()
                .map(|a| (a.asteroid_id.clone(), a.col, a.row, a.span, a.total))
                .collect();
            rows.sort();
            rows
        };
        assert_eq!(key(&a), key(&b));

        let expected: usize = ASTEROID_TIERS.iter().map(|t| t.seed_count).sum();
        assert_eq!(a.asteroids.len(), expected);
        // Evenly spread across the map (July 2026 playtest feedback), not
        // clustered around the start: every map quadrant holds asteroids.
        let quadrants: std::collections::HashSet<_> = a
            .asteroids
            .values()
            .map(|ast| (ast.col >= MAP_COLS / 2, ast.row >= MAP_ROWS / 2))
            .collect();
        assert_eq!(quadrants.len(), 4);
        for asteroid in a.asteroids.values() {
            let tier = asteroid_tier(&asteroid.tier).expect("known tier");
            assert_eq!(asteroid.span, tier.span);
            let grade = asteroid_grade(asteroid.col, asteroid.row).expect("outside central system");
            let (numerator, denominator) = GRADE_MULTIPLIERS[grade];
            assert!(asteroid.total >= tier.min_amount * numerator / denominator);
            assert!(asteroid.total <= tier.max_amount * numerator / denominator);
            assert!(!touches_reserved_core(
                asteroid.col,
                asteroid.row,
                asteroid.span
            ));
            assert_eq!(asteroid.remaining, asteroid.total);
            assert!(asteroid.mining.is_none());
            assert!(asteroid.col >= 0 && asteroid.col + asteroid.span <= MAP_COLS);
            assert!(asteroid.row >= 0 && asteroid.row + asteroid.span <= MAP_ROWS);
            // Clear of every mothership (and its deploy space)...
            for ship in a.motherships.values() {
                assert!(footprints_clear(
                    (asteroid.col, asteroid.row, asteroid.span),
                    (ship.col, ship.row, ship.span),
                    6,
                ));
            }
            // ...and of every other asteroid.
            for other in a.asteroids.values() {
                if other.asteroid_id != asteroid.asteroid_id {
                    assert!(footprints_clear(
                        (asteroid.col, asteroid.row, asteroid.span),
                        (other.col, other.row, other.span),
                        2,
                    ));
                }
            }
        }
    }

    #[test]
    fn mine_dispatch_reserves_the_slot_and_derives_the_window() {
        let mut s = mining_state(240);
        let event = s.mine_asteroid("asteroid-x", 1_000).unwrap();
        assert_eq!(event.mining_asteroid_id.as_deref(), Some("asteroid-x"));
        assert!(event.cargo.is_none());
        assert_eq!((event.src_col, event.src_row), (499.0, 500.0));
        assert_eq!((event.dest_col, event.dest_row), (499, 510));
        assert_eq!(event.arrival_at, 11_000);

        // Extraction runs from arrival until the deposit is exhausted:
        // 240 units at MINE_UNITS_PER_HOUR (240) is one hour.
        let mining = s.asteroids["asteroid-x"].mining.clone().unwrap();
        assert_eq!(mining.vessel_id, event.vessel_id);
        assert_eq!(mining.started_at, 11_000);
        assert_eq!(mining.completes_at, 11_000 + HOUR_MS);

        // The slot is taken from dispatch, before arrival — a second miner
        // can't race for it.
        let err = s.mine_asteroid("asteroid-x", 2_000).unwrap_err();
        assert!(err.contains("already has a vessel"), "{err}");
        let err = s.mine_asteroid("asteroid-gone", 2_000).unwrap_err();
        assert!(err.contains("unknown asteroid"), "{err}");
    }

    #[test]
    fn travel_and_mining_deadlines_near_the_timestamp_limit_do_not_wrap() {
        let now = u64::MAX - 1;
        let mut s = mining_state(240);

        let out = s.mine_asteroid("asteroid-x", now).unwrap();

        assert_eq!(out.dispatched_at, now);
        assert_eq!(out.arrival_at, u64::MAX);
        let mining = s.asteroids["asteroid-x"].mining.as_ref().unwrap();
        assert_eq!(mining.started_at, u64::MAX);
        assert_eq!(mining.completes_at, u64::MAX);
    }

    #[test]
    fn completed_mining_auto_returns_the_full_harvest_and_deposits_on_dock() {
        let mut s = mining_state(240);
        let out = s.mine_asteroid("asteroid-x", 0).unwrap();
        s.drain_pushes();
        // Arrival announces the start of extraction (in a long lazy jump
        // straight past completes_at this stale news would be skipped).
        s.settle(10_000);
        let done = 10_000 + HOUR_MS;
        s.settle(done);

        // Mined out: the asteroid left the table with its removal push.
        assert!(!s.asteroids.contains_key("asteroid-x"));
        let pushes = s.drain_pushes();
        assert!(pushes.iter().any(|p| matches!(
            p,
            ServerPush::AsteroidRemoved { asteroid_id } if asteroid_id == "asteroid-x"
        )));
        // The server put the vessel on a return leg (a push, not a command
        // response) carrying the whole deposit, stamped at the completion
        // moment rather than the settle time.
        assert!(pushes
            .iter()
            .any(|p| matches!(p, ServerPush::Vessel(v) if v.vessel_id == out.vessel_id)));
        let back = s.vessels[&out.vessel_id].clone();
        assert_eq!(back.mining_asteroid_id, None);
        assert_eq!(back.dispatched_at, done);
        assert_eq!((back.src_col, back.src_row), (499.0, 510.0));
        assert_eq!((back.dest_col, back.dest_row), (499, 500));
        let cargo = back.cargo.clone().unwrap();
        assert_eq!(cargo.resource, ResourceKind::Biological);
        assert_eq!(cargo.amount, 240);

        // Docking deposits the cargo into the resource counts.
        s.settle(back.arrival_at);
        assert_eq!(s.resources.biological, 240);
        assert!(s.vessels.is_empty());
        assert_eq!(
            notification_kinds(&s),
            vec!["mining-started", "asteroid-depleted", "vessel-returned"]
        );
        assert!(
            matches!(&s.notifications.last().unwrap().payload, NotificationPayload::VesselReturned { cargo: Some(cargo), .. } if cargo.accepted == 240)
        );
        // CR1.6: the depletion message names the deposit, not just "mined
        // out" — tier, resource, and location, matching the seeded asteroid.
        let depleted = s
            .notifications
            .iter()
            .find(|n| n.payload.kind() == "asteroid-depleted")
            .unwrap();
        assert!(
            matches!(&depleted.payload, NotificationPayload::AsteroidDepleted { tier, resource: ResourceKind::Biological, col: 499, row: 510, .. } if tier == "small")
        );
    }

    #[test]
    fn cargo_deposit_clamps_at_the_cap_and_reports_the_loss() {
        // mining_state's Storage Bay caps biological at 2000; leave only 100
        // of room before the 240-unit harvest docks.
        let mut s = mining_state(240);
        s.resources.biological = 1_900;
        let out = s.mine_asteroid("asteroid-x", 0).unwrap();
        s.settle(10_000 + HOUR_MS);
        let back = s.vessels[&out.vessel_id].clone();
        s.settle(back.arrival_at);
        assert_eq!(s.resources.biological, 2_000);
        let last = s.notifications.last().unwrap();
        assert!(
            matches!(&last.payload, NotificationPayload::VesselReturned { cargo: Some(cargo), .. } if cargo.lost == 140)
        );
    }

    #[test]
    fn early_recall_harvests_proportionally_and_frees_the_slot() {
        let mut s = mining_state(240);
        let out = s.mine_asteroid("asteroid-x", 0).unwrap();
        // Recall halfway through the one-hour window (arrival was 10_000).
        let back = s
            .recall_vessel(&out.vessel_id, 10_000 + HOUR_MS / 2)
            .unwrap();
        let cargo = back.cargo.clone().unwrap();
        assert_eq!(cargo.amount, 120);
        assert_eq!(back.mining_asteroid_id, None);

        // The un-mined half stays on the asteroid, slot free for the next
        // vessel — whose window covers only what's left (half an hour).
        let asteroid = &s.asteroids["asteroid-x"];
        assert_eq!(asteroid.remaining, 120);
        assert_eq!(asteroid.total, 240);
        assert!(asteroid.mining.is_none());
        let again = s.mine_asteroid("asteroid-x", 10_000 + HOUR_MS / 2).unwrap();
        let mining = s.asteroids["asteroid-x"].mining.clone().unwrap();
        assert_eq!(mining.vessel_id, again.vessel_id);
        assert_eq!(mining.completes_at - mining.started_at, HOUR_MS / 2);
    }

    #[test]
    fn recall_before_arrival_abandons_the_job_with_no_cargo() {
        let mut s = mining_state(240);
        let out = s.mine_asteroid("asteroid-x", 0).unwrap();
        // Turn back mid-outbound: nothing was extracted.
        let back = s.recall_vessel(&out.vessel_id, 5_000).unwrap();
        assert!(back.cargo.is_none());
        assert_eq!(back.mining_asteroid_id, None);
        let asteroid = &s.asteroids["asteroid-x"];
        assert_eq!(asteroid.remaining, 240);
        assert!(asteroid.mining.is_none());
    }

    #[test]
    fn completion_harvests_the_whole_remainder_despite_rate_rounding() {
        // Hand-shorten the window so mined_amount(window) floors below the
        // remainder — as happens whenever amount * HOUR_MS isn't divisible
        // by the rate. Completion must still take everything: otherwise a
        // 1-unit husk asteroid survives every full mine-out.
        let mut s = mining_state(470);
        let out = s.mine_asteroid("asteroid-x", 0).unwrap();
        let asteroid = s.asteroids.get_mut("asteroid-x").unwrap();
        let mining = asteroid.mining.as_mut().unwrap();
        mining.completes_at -= 7;
        let done = mining.completes_at;
        assert!(mined_amount(done - mining.started_at) < 470);
        s.settle(done);
        assert!(!s.asteroids.contains_key("asteroid-x"));
        assert_eq!(s.vessels[&out.vessel_id].cargo.clone().unwrap().amount, 470);
    }

    #[test]
    fn recall_after_the_window_redirects_the_auto_return_with_cargo_intact() {
        let mut s = mining_state(240);
        let out = s.mine_asteroid("asteroid-x", 0).unwrap();
        // Recall long after mining finished: the auto-return already departed
        // at completes_at (and by now already docked), so the recall finds no
        // vessel left to redirect.
        let done = 10_000 + HOUR_MS;
        let err = s.recall_vessel(&out.vessel_id, done + 60_000).unwrap_err();
        assert!(err.contains("unknown vessel"), "{err}");
        // The full harvest still deposited through the settle chain.
        assert_eq!(s.resources.biological, 240);

        // A recall *during* the return leg is a legal redirect keeping the
        // cargo: re-run with a recall one second after completion.
        let mut s = mining_state(240);
        let out = s.mine_asteroid("asteroid-x", 0).unwrap();
        let back = s.recall_vessel(&out.vessel_id, done + 1_000).unwrap();
        assert_eq!(back.cargo.clone().unwrap().amount, 240);
        assert_eq!(back.dispatched_at, done + 1_000);
    }

    #[test]
    fn vessel_docks_follow_the_mothership_position() {
        let mut s = anchored_state(498, 498);
        // Relocate the player's mothership: docks must move with it, for
        // dispatch departure, recall destination, and docked pruning alike.
        let ship = s.motherships.get_mut("player-1").unwrap();
        ship.col = 10;
        ship.row = 10;
        let out = s.dispatch_vessel(12, 30, 0).unwrap();
        assert_eq!((out.src_col, out.src_row), (12.0, 12.0));
        let back = s.recall_vessel(&out.vessel_id, 0).unwrap();
        assert_eq!((back.dest_col, back.dest_row), (12, 12));
        assert!(s.active_vessels(back.arrival_at).is_empty());
    }

    #[test]
    fn returning_vessel_docks_even_if_mothership_moved_after_dispatch() {
        // CR1.4 regression: a relocation between a return leg's dispatch and
        // arrival must not strand the vessel. Impossible via any command
        // today (ships never move), so the move is injected directly —
        // exercising the fix, that docking reads the `returning` flag stamped
        // at return_leg time rather than re-deriving it from is_dock_tile
        // against the mothership's now-different position.
        let mut s = anchored_state(498, 498);
        let out = s.dispatch_vessel(500, 510, 0).unwrap();
        let back = s.recall_vessel(&out.vessel_id, 0).unwrap();
        assert!(back.returning);
        let ship = s.motherships.get_mut("player-1").unwrap();
        ship.col += 5;
        ship.row += 5;
        s.settle(back.arrival_at);
        assert!(s.active_vessels(back.arrival_at).is_empty());
        // Recalled before its outbound leg ever arrived, so only the return
        // leg's notification fires.
        assert_eq!(notification_kinds(&s), vec!["vessel-returned"]);
    }
}
