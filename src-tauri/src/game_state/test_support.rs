use super::modules::{catalog_entry, ModuleData, PRODUCTION_TICK_MS};
use super::resources::ResourceKind;
use super::state::{player_identity, ServerState};
use super::world::AsteroidData;

pub(super) const TICK: u64 = PRODUCTION_TICK_MS;

pub(super) fn ore_refinery_cost() -> u64 {
    catalog_entry("ore-refinery")
        .unwrap()
        .base_cost_construction
}

pub(super) fn ore_refinery_build_time() -> u64 {
    catalog_entry("ore-refinery").unwrap().base_build_time_ms
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

/// The kind of every feed entry, oldest first.
pub(super) fn notification_kinds(s: &ServerState) -> Vec<&str> {
    s.notifications.iter().map(|n| n.payload.kind()).collect()
}

/// A state with production silenced (the only module is a settled
/// Storage Bay, which produces nothing but keeps a 2000-per-resource
/// storage cap so deposits aren't clamped — ROADMAP P1.11) and the
/// seeded asteroid field replaced by one known asteroid at (499, 510) —
/// 10 tiles / 10 s from the (499, 500) dock — so mining math is
/// deterministic.
pub(super) fn mining_state(amount: u64) -> ServerState {
    let mut s = ServerState::new(0);
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
    s.asteroids.clear();
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
