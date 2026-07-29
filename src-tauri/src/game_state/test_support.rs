use super::modules::{build_time_ms, catalog_entry, module_cost, ModuleData, PRODUCTION_TICK_MS};
use super::resources::ResourceKind;
use super::state::{player_identity, ServerState};
use super::world::AsteroidData;

pub(super) const TICK: u64 = PRODUCTION_TICK_MS;

/// Sub-unit production the active profile is carrying between accruals —
/// runtime-only state, so tests read it through this helper rather than
/// reaching into the per-profile map.
pub(super) fn production_carry(s: &ServerState, kind: ResourceKind) -> u64 {
    s.production_carry
        .get(&super::persistence::normalize_player_name(&s.player.name))
        .map(|carry| carry.get(kind))
        .unwrap_or(0)
}

pub(super) fn ore_refinery_cost() -> u64 {
    module_cost(catalog_entry("ore-refinery").unwrap(), 1).construction
}

pub(super) fn ore_refinery_build_time() -> u64 {
    build_time_ms(catalog_entry("ore-refinery").unwrap(), 1)
}

/// A state that can afford `builds` ore-refinery builds, with production
/// anchored so no further accrual lands at time `at`.
pub(super) fn funded_state(builds: u64, at: u64) -> ServerState {
    let mut s = ServerState::new(at);
    s.resources.construction = builds * ore_refinery_cost();
    s
}

/// Insert an already-settled module directly, bypassing the build timer
/// and cost — for tests that isolate level-derived state (production
/// scaling, crew sums) from the build pipeline.
pub(super) fn insert_settled(s: &mut ServerState, id: &str, module_type: &str, level: u32) {
    s.modules.insert(
        id.to_string(),
        ModuleData {
            module_id: id.to_string(),
            owner_id: player_identity().id,
            owner_name: player_identity().name,
            module_type: module_type.to_string(),
            col: 2,
            row: 2,
            level,
            pending: None,
        },
    );
}

/// Give a settled module an explicit crew allocation for tests that need its
/// production or operation to be live. Production does not infer staffing
/// from the size of the overall crew pool after P2.8.
pub(super) fn assign_crew(s: &mut ServerState, module_id: &str, assigned: u32) {
    if assigned == 0 {
        s.crew_assignments.remove(module_id);
    } else {
        s.crew_assignments.insert(module_id.to_string(), assigned);
    }
}

/// The kind of every feed entry, oldest first.
pub(super) fn notification_kinds(s: &ServerState) -> Vec<&str> {
    s.notifications.iter().map(|n| n.payload.kind()).collect()
}

/// A state whose mothership sits at a fixed anchor with an empty asteroid
/// field. For tests about ship/vessel/relocate mechanics rather than world
/// content: P2.6 moved new spawns into the outer resource band, so the
/// planner's chosen coordinates are deterministic but not fixed, and a test
/// that hardcodes them is really asserting the spawn rule by accident.
pub(super) fn anchored_state(col: i64, row: i64) -> ServerState {
    let mut s = ServerState::new(0);
    s.asteroids.clear();
    let id = player_identity().id;
    let ship = s.motherships.get_mut(&id).expect("player mothership");
    ship.col = col;
    ship.row = row;
    s.aoi = super::world::MapWindow::centered_at(col + 2, row + 2);
    s
}

/// A state with production silenced (the only module is a settled
/// Storage Bay, which produces nothing but keeps a 2000-per-resource
/// storage cap so deposits aren't clamped — ROADMAP P1.11) and the
/// seeded asteroid field replaced by one known asteroid at (499, 510) —
/// 10 tiles / 10 s from the (499, 500) dock — so mining math is
/// deterministic.
pub(super) fn mining_state(amount: u64) -> ServerState {
    let mut s = anchored_state(498, 498);
    s.resources = super::resources::ResourceCounts {
        construction: 0,
        high_tech: 0,
        biological: 0,
        fuel: 0,
        credits: 0,
    };
    s.modules.clear();
    let player = player_identity();
    s.modules.insert(
        "module-storage".to_string(),
        ModuleData {
            module_id: "module-storage".to_string(),
            owner_id: player.id,
            owner_name: player.name,
            module_type: "storage-bay".to_string(),
            col: 2,
            row: 2,
            level: 1,
            pending: None,
        },
    );
    s.asteroids.insert(
        "asteroid-x".to_string(),
        AsteroidData {
            asteroid_id: "asteroid-x".to_string(),
            tier: "small".to_string(),
            resource: ResourceKind::Biological,
            col: 499,
            row: 510,
            span: 1,
            total: amount,
            remaining: amount,
            mining: None,
        },
    );
    s
}
