use serde::Serialize;

use super::persistence::normalize_player_name;
use super::resources::{ResourceCounts, ResourceKind, MATERIAL_KINDS};
#[cfg(test)]
use super::state::player_identity;
use super::state::{
    deadline_after, scaled_ms, ModuleCompletionOperation, NotificationPayload, ServerPush,
    ServerState,
};

/// One entry in the module catalog (ROADMAP P1.4): production, storage,
/// cost, build time, and unlock prerequisite for a module type.
/// Balance data is authoritative here. The client receives its display catalog
/// from this server and never authorizes a spend or completion.
pub struct ModuleCatalogEntry {
    /// Wire key — the `module_type` string on `ModuleData` and build requests.
    pub module_type: &'static str,
    pub display_name: &'static str,
    /// Resources produced **per minute** at level 1; `production_at_level`
    /// applies the level curve, and accrual converts to the tick cadence.
    /// Per minute rather than per tick so the 1.15x curve has the resolution
    /// to express itself — see `production_at_level`.
    pub produces: &'static [(ResourceKind, u64)],
    /// Storage capacity (ROADMAP P1.11), as a flat baseline granted once the
    /// module is settled at any level plus an amount added per settled level:
    /// `base + per_level * level`. Two fields rather than one plus a
    /// "is it flat?" branch, so no type is a special case — the Command
    /// Module is simply base-only and the Storage Bay per-level-only.
    pub stores_base: &'static [(ResourceKind, u64)],
    pub stores_per_level: &'static [(ResourceKind, u64)],
    /// Crew berths (ROADMAP P1.10), same base + per-level shape as `stores`
    /// and summed **linearly**, not on a curve: capacity is a head count.
    /// Crew Quarters is the real source; the Command Module holds a fixed
    /// baseline so hiring works before one exists.
    pub crew_capacity_base: u32,
    pub crew_capacity_per_level: u32,
    /// Crew wanted per settled level to run at full output (ROADMAP P1.10),
    /// summed linearly ship-wide. Modules with 0 are never damped; the
    /// Command Module's baseline production stays 0 so the player can never
    /// get stuck (README § Ship design).
    pub crew_required_per_level: u32,
    /// Extra materials this type needs from `OPERATIONAL_COST_START_LEVEL`
    /// on, each at the supplemental fraction of the construction amount.
    /// Construction is universal and never listed here; high-tech is added
    /// to every type from `HIGH_TECH_COST_START_LEVEL` and doesn't need
    /// listing either (a type may still list it to pay it twice as early
    /// and again later — the amounts sum).
    ///
    /// A list rather than one material: the biological/fuel split reads as
    /// "houses humans" vs "houses robotics", and some types are honestly
    /// both — a Command Module does crew quarters *and* drone control. Empty
    /// means construction-only until the high-tech threshold.
    ///
    /// End-game costs are expected to reach past materials entirely (an
    /// antimatter/exotic-matter item to push past a level cap). That is not
    /// scoped yet; the extension point is `module_cost`'s return type, which
    /// would grow an item side alongside its `ResourceCounts` rather than
    /// this field changing shape again.
    pub operational_costs: &'static [ResourceKind],
    /// Exact cost multiplier applied to the shared construction curve, and
    /// through it to the supplemental materials derived from it. Deliberately
    /// **separate** from the build-time multiplier even though every type
    /// currently sets the two identically (a cheap module is a fast one):
    /// keeping them independent leaves room to make something slow but cheap,
    /// or quick but expensive, without a schema change mid-balancing.
    pub cost_numerator: u64,
    pub cost_denominator: u64,
    /// Exact build-time multiplier applied to the shared target-level table.
    pub build_time_numerator: u64,
    pub build_time_denominator: u64,
    /// Minimum Command Module level required before this type can be built.
    pub unlock_command_level: u32,
}

pub const COMMAND_MODULE_TYPE: &str = "command";

/// The highest settled level any module can reach in this first progression
/// arc. It is included in the server-issued balance catalog so the client can
/// render the same cap it is about to have enforced, never a hand-maintained
/// frontend approximation.
pub(super) const MAX_MODULE_LEVEL: u32 = 30;

/// Catalog key of the Trading Post (ROADMAP P1.12) — hosts the NPC deal
/// shop; its settled level gates the deal commands and sets the slot count.
pub const TRADING_POST_MODULE_TYPE: &str = "trading-post";

/// Serializable UI/catalog projection of the authoritative module rules.
#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ModuleCatalogData {
    pub module_type: &'static str,
    pub display_name: &'static str,
    pub produces: &'static [(ResourceKind, u64)],
    pub stores_base: &'static [(ResourceKind, u64)],
    pub stores_per_level: &'static [(ResourceKind, u64)],
    pub crew_capacity_base: u32,
    pub crew_capacity_per_level: u32,
    pub crew_required_per_level: u32,
    pub operational_costs: &'static [ResourceKind],
    pub cost_numerator: u64,
    pub cost_denominator: u64,
    pub build_time_numerator: u64,
    pub build_time_denominator: u64,
    pub unlock_command_level: u32,
}

/// The module catalog. The Command Module is a catalog entry like every
/// other type (formalized per ROADMAP P1.4) even though it's pre-built at
/// game start rather than player-constructed — its level still advances
/// through the same `levelup_module` path as everything else, and its level
/// gates every other type's unlock and level cap (README § Ship design).
pub const MODULE_CATALOG: &[ModuleCatalogEntry] = &[
    ModuleCatalogEntry {
        module_type: COMMAND_MODULE_TYPE,
        display_name: "Command Module",
        produces: &[
            (ResourceKind::Construction, 12),
            (ResourceKind::HighTech, 12),
            (ResourceKind::Biological, 12),
            (ResourceKind::Fuel, 12),
        ],
        // Baseline storage, mirroring the baseline production: the player
        // always has some cap even with no Storage Bay built — sized to hold
        // a max small-tier asteroid harvest (ASTEROID_TIERS) with room over.
        // Base-only, and deliberately so: leveling the Command Module buys
        // progression (unlocks and the ship-wide level cap), never capacity.
        // Holding more and housing more are the specialized modules' jobs, so
        // a Storage Bay and Crew Quarters stay worth building at every level.
        stores_base: &[
            (ResourceKind::Construction, 1_000),
            (ResourceKind::HighTech, 1_000),
            (ResourceKind::Biological, 1_000),
            (ResourceKind::Fuel, 1_000),
        ],
        stores_per_level: &[],
        // Baseline berths too — hiring works before the first Crew Quarters
        // exists (ROADMAP P1.10).
        crew_capacity_base: 2,
        crew_capacity_per_level: 0,
        crew_required_per_level: 0,
        operational_costs: &[ResourceKind::Biological],
        cost_numerator: 1,
        cost_denominator: 1,
        build_time_numerator: 1,
        build_time_denominator: 1,
        unlock_command_level: 0,
    },
    ModuleCatalogEntry {
        module_type: "ore-refinery",
        display_name: "Ore Refinery",
        produces: &[(ResourceKind::Construction, 24)],
        stores_base: &[],
        stores_per_level: &[],
        crew_capacity_base: 0,
        crew_capacity_per_level: 0,
        crew_required_per_level: 1,
        operational_costs: &[ResourceKind::Fuel],
        // Producers are the cheap, fast half of the catalog: half cost and
        // half time, so the early production loop is quick to stand up.
        cost_numerator: 1,
        cost_denominator: 2,
        build_time_numerator: 1,
        build_time_denominator: 2,
        unlock_command_level: 1,
    },
    ModuleCatalogEntry {
        module_type: "electronics-fabricator",
        display_name: "Electronics Fabricator",
        produces: &[(ResourceKind::HighTech, 24)],
        stores_base: &[],
        stores_per_level: &[],
        crew_capacity_base: 0,
        crew_capacity_per_level: 0,
        crew_required_per_level: 1,
        operational_costs: &[ResourceKind::Fuel],
        // Producers are the cheap, fast half of the catalog: half cost and
        // half time, so the early production loop is quick to stand up.
        cost_numerator: 1,
        cost_denominator: 2,
        build_time_numerator: 1,
        build_time_denominator: 2,
        unlock_command_level: 1,
    },
    ModuleCatalogEntry {
        module_type: "hydroponics-bay",
        display_name: "Hydroponics Bay",
        produces: &[(ResourceKind::Biological, 24)],
        stores_base: &[],
        stores_per_level: &[],
        crew_capacity_base: 0,
        crew_capacity_per_level: 0,
        crew_required_per_level: 1,
        operational_costs: &[ResourceKind::Biological],
        // Producers are the cheap, fast half of the catalog: half cost and
        // half time, so the early production loop is quick to stand up.
        cost_numerator: 1,
        cost_denominator: 2,
        build_time_numerator: 1,
        build_time_denominator: 2,
        unlock_command_level: 1,
    },
    ModuleCatalogEntry {
        module_type: "fusion-reactor",
        display_name: "Fusion Reactor",
        produces: &[(ResourceKind::Fuel, 24)],
        stores_base: &[],
        stores_per_level: &[],
        crew_capacity_base: 0,
        crew_capacity_per_level: 0,
        crew_required_per_level: 1,
        operational_costs: &[ResourceKind::Fuel],
        // Producers are the cheap, fast half of the catalog: half cost and
        // half time, so the early production loop is quick to stand up.
        cost_numerator: 1,
        cost_denominator: 2,
        build_time_numerator: 1,
        build_time_denominator: 2,
        unlock_command_level: 1,
    },
    ModuleCatalogEntry {
        module_type: "storage-bay",
        display_name: "Storage Bay",
        produces: &[],
        // Per-level only: the whole point of the type is that capacity grows
        // with it, and a flat share would dilute that.
        stores_base: &[],
        stores_per_level: &[
            (ResourceKind::Construction, 2_000),
            (ResourceKind::HighTech, 2_000),
            (ResourceKind::Biological, 2_000),
            (ResourceKind::Fuel, 2_000),
        ],
        crew_capacity_base: 0,
        crew_capacity_per_level: 0,
        crew_required_per_level: 0,
        operational_costs: &[ResourceKind::Fuel],
        cost_numerator: 1,
        cost_denominator: 1,
        build_time_numerator: 1,
        build_time_denominator: 1,
        unlock_command_level: 1,
    },
    ModuleCatalogEntry {
        module_type: "crew-quarters",
        display_name: "Crew Quarters",
        produces: &[],
        stores_base: &[],
        stores_per_level: &[],
        // Per-level only, for the same reason as the Storage Bay's capacity.
        crew_capacity_base: 0,
        crew_capacity_per_level: 5,
        crew_required_per_level: 0,
        operational_costs: &[ResourceKind::Biological],
        cost_numerator: 1,
        cost_denominator: 1,
        build_time_numerator: 1,
        build_time_denominator: 1,
        unlock_command_level: 1,
    },
    ModuleCatalogEntry {
        module_type: TRADING_POST_MODULE_TYPE,
        display_name: "Trading Post",
        // No production or storage — its function is the deal shop
        // (ROADMAP P1.12); leveling it adds deal slots instead.
        produces: &[],
        stores_base: &[],
        stores_per_level: &[],
        crew_capacity_base: 0,
        crew_capacity_per_level: 0,
        crew_required_per_level: 1,
        operational_costs: &[ResourceKind::Biological],
        cost_numerator: 1,
        cost_denominator: 1,
        build_time_numerator: 1,
        build_time_denominator: 1,
        // Unlock so trade arrives after the first production loop is really
        // running: P2.6's pacing puts Command level 2 around 2.5 minutes in —
        // too early for that intent — and level 3 nearer 6. Expected to move
        // later still once modules can express real prerequisites (P5.10)
        // rather than only a Command-level gate.
        unlock_command_level: 3,
    },
];

pub(super) fn catalog_entry(module_type: &str) -> Option<&'static ModuleCatalogEntry> {
    MODULE_CATALOG.iter().find(|e| e.module_type == module_type)
}

pub(super) fn module_catalog_data() -> Vec<ModuleCatalogData> {
    MODULE_CATALOG
        .iter()
        .map(|entry| ModuleCatalogData {
            module_type: entry.module_type,
            display_name: entry.display_name,
            produces: entry.produces,
            stores_base: entry.stores_base,
            stores_per_level: entry.stores_per_level,
            crew_capacity_base: entry.crew_capacity_base,
            crew_capacity_per_level: entry.crew_capacity_per_level,
            crew_required_per_level: entry.crew_required_per_level,
            operational_costs: entry.operational_costs,
            cost_numerator: entry.cost_numerator,
            cost_denominator: entry.cost_denominator,
            build_time_numerator: entry.build_time_numerator,
            build_time_denominator: entry.build_time_denominator,
            unlock_command_level: entry.unlock_command_level,
        })
        .collect()
}

pub(super) const BASE_BUILD_TIMES_MS: [u64; 10] = [
    45_000,
    90_000,
    180_000,
    480_000,
    1_200_000,
    2_700_000,
    7_200_000,
    21_600_000,
    64_800_000,
    172_800_000,
];
/// Deliberate, configurable post-table behavior until a later level-cap pass.
pub(super) const POST_LEVEL_10_BUILD_TIME_MS: u64 = 172_800_000;
/// Production curve, applied as `base * (num/den)^(level-1)`.
pub(super) const PRODUCTION_NUMERATOR: u64 = 115;
pub(super) const PRODUCTION_DENOMINATOR: u64 = 100;
/// Fixed-point scale the production curve compounds in before its single
/// rounding. Large enough that 20+ levels of drift stay far under one unit,
/// small enough that `base * PRODUCTION_PRECISION * 1.15^level` cannot
/// approach u64 (or the TS mirror's 2^53) at any reachable level.
pub(super) const PRODUCTION_PRECISION: u64 = 1_000_000;

/// Production ticks per minute — the catalog states production per minute,
/// while accrual runs at `PRODUCTION_TICK_MS`. Nominal on purpose: the
/// development `--time-scale` shortens the wall-clock tick so production runs
/// faster, and must not change how much one tick is worth.
pub(super) const TICKS_PER_MINUTE: u64 = 60_000 / PRODUCTION_TICK_MS;

/// First target level whose cost adds the entry's operational material, and
/// the first that adds high-tech on top of it. Basic modules are
/// construction-only below the first threshold (ROADMAP P2.6).
pub(super) const OPERATIONAL_COST_START_LEVEL: u32 = 5;
pub(super) const HIGH_TECH_COST_START_LEVEL: u32 = 10;
pub(super) const SUPPLEMENTAL_COST_NUMERATOR: u64 = 1;
pub(super) const SUPPLEMENTAL_COST_DENOMINATOR: u64 = 2;

fn ceil_ratio(value: u64, numerator: u64, denominator: u64) -> u64 {
    value
        .saturating_mul(numerator)
        .saturating_add(denominator - 1)
        / denominator
}

/// Level-1 construction, and the 1.5x compounding applied per target level
/// after it (25, 38, 57, 86, 129, ...). Named rather than written inline:
/// the same three numbers ride the wire so the client can reproduce the
/// curve, and as literals in two places they could drift apart silently.
pub(super) const CONSTRUCTION_COST_LEVEL_ONE: u64 = 25;
pub(super) const CONSTRUCTION_COST_NUMERATOR: u64 = 3;
pub(super) const CONSTRUCTION_COST_DENOMINATOR: u64 = 2;

fn construction_cost(level: u32) -> u64 {
    let mut amount = CONSTRUCTION_COST_LEVEL_ONE;
    for _ in 1..level {
        amount = ceil_ratio(
            amount,
            CONSTRUCTION_COST_NUMERATOR,
            CONSTRUCTION_COST_DENOMINATOR,
        );
    }
    amount
}

/// The full cost of building or upgrading to `level`, as keyed material
/// slots. Amounts **sum** into their slot, so a type that lists high-tech as
/// an operational material pays both that and the universal high-tech
/// charge once past `HIGH_TECH_COST_START_LEVEL` — the shape can't lose or
/// double-spend one of them the way a (kind, amount) list could.
pub(super) fn module_cost(entry: &ModuleCatalogEntry, level: u32) -> ResourceCounts {
    // The entry multiplier applies to construction, and so reaches the
    // supplemental materials derived from it — a half-cost module is half
    // cost in every material, not just the construction line.
    let construction = ceil_ratio(
        construction_cost(level),
        entry.cost_numerator,
        entry.cost_denominator,
    );
    let supplemental = ceil_ratio(
        construction,
        SUPPLEMENTAL_COST_NUMERATOR,
        SUPPLEMENTAL_COST_DENOMINATOR,
    );
    let mut cost = ResourceCounts::ZERO;
    cost.add(ResourceKind::Construction, construction);
    if level >= OPERATIONAL_COST_START_LEVEL {
        for &kind in entry.operational_costs {
            cost.add(kind, supplemental);
        }
    }
    if level >= HIGH_TECH_COST_START_LEVEL {
        cost.add(ResourceKind::HighTech, supplemental);
    }
    cost
}

pub(super) fn build_time_ms(entry: &ModuleCatalogEntry, level: u32) -> u64 {
    let baseline = BASE_BUILD_TIMES_MS
        .get(level.saturating_sub(1) as usize)
        .copied()
        .unwrap_or(POST_LEVEL_10_BUILD_TIME_MS);
    ceil_ratio(
        baseline,
        entry.build_time_numerator,
        entry.build_time_denominator,
    )
}

/// Production grows independently from costs: `base * 1.15^(level-1)`,
/// rounded up **once** at the end. Level 0 produces nothing.
///
/// The compounding runs in fixed point (`PRODUCTION_PRECISION` sub-units)
/// rather than rounding at every level, because rounding each step up on a
/// small integer base turns "+15% per level" into "+1 per level": at a base
/// of 12/minute, per-level rounding reaches 120/minute by level 10 where the
/// intended curve reaches 43. Fixed point keeps the curve honest while
/// staying integer-only and bit-identical to the TS preview mirror.
fn production_at_level(base: u64, level: u32) -> u64 {
    if level == 0 {
        return 0;
    }
    let mut scaled = base.saturating_mul(PRODUCTION_PRECISION);
    for _ in 1..level {
        scaled = scaled.saturating_mul(PRODUCTION_NUMERATOR) / PRODUCTION_DENOMINATOR;
    }
    scaled.div_ceil(PRODUCTION_PRECISION)
}

/// Damp a production amount by the pooled crew staffing ratio (ROADMAP
/// P1.10): output * (0.5 + 0.5 * staffed/required), as exact integer math —
/// `amount * (required + staffed) / (2 * required)`. Fully staffed passes
/// through unchanged; a ship with no crew still runs at half speed (the 50%
/// floor — understaffing punishes, it never kills). `required == 0` means
/// nothing wants crew: no damping. P2.6 deliberately kept the 50% floor;
/// lowering it waits on P2.8's per-module shortage UX, so a shortage can be
/// seen and acted on before it bites harder. The client recomputes this
/// display preview from the server-delivered catalog in
/// `src/ship/module-catalog.ts`.
fn crew_scaled(amount: u64, staffed: u32, required: u32) -> u64 {
    if required == 0 {
        return amount;
    }
    let (staffed, required) = (staffed as u64, required as u64);
    amount.saturating_mul(required + staffed) / (2 * required)
}

/// A module placed in the ship, with its catalog type and current level.
/// Level 0 means the first build hasn't completed yet. `pending` carries the
/// in-progress timer for either a first build (level 0 → 1) or a level-up
/// (level N → N+1, during which the module keeps functioning at level N).
/// Mirrors the TS `ModuleData` in `src/state/game-state-types.ts` — keep the two in sync.
#[derive(Serialize, serde::Deserialize, Clone, Debug)]
#[serde(rename_all = "camelCase")]
pub struct ModuleData {
    pub module_id: String,
    pub owner_id: String,
    pub owner_name: String,
    /// Catalog key, e.g. "ore-refinery" — until per-type art lands, the
    /// client renders every module with the same "module-base" sprite.
    pub module_type: String,
    /// Anchor (top-left) tile of the module footprint.
    pub col: i64,
    pub row: i64,
    /// Highest level this module has fully completed; 0 while the first
    /// build is still running.
    pub level: u32,
    /// Present while a build/upgrade is in flight.
    pub pending: Option<ModulePendingBuild>,
}

/// Mirrors the TS `ModulePendingBuild` in `src/state/game-state-types.ts` — keep the two
/// in sync.
#[derive(Serialize, serde::Deserialize, Clone, Debug)]
#[serde(rename_all = "camelCase")]
pub struct ModulePendingBuild {
    /// The level this build completes to.
    pub level: u32,
    /// Immutable ID allocated when this build/upgrade was authorized.
    pub action_id: String,
    pub dispatched_at: u64,
    pub completes_at: u64,
}

/// Result of a verified build/level-up request: the affected module's
/// current state plus the resource counts after the cost was deducted.
#[derive(Serialize, Debug)]
pub struct ModuleActionResponse {
    pub action_id: String,
    pub module: ModuleData,
    pub resources: ResourceCounts,
}

//
// The backend owns all resource math and build verification: the client can
// be tampered with, so it only renders what these commands return and asks
// for actions — it never computes or mutates resource values on its own.
// This is the phase-3 server model (SERVER.md) running in-process for now.

/// Length of one production interval — also the cadence at which the
/// scheduler thread pushes accrued resources to the client (the client never
/// polls; see run_scheduler).
pub(super) const PRODUCTION_TICK_MS: u64 = 5_000;

/// Ship-interior room layout — mirrors SHIP_ROOM_GRID in `src/scene/grid-math.ts`
/// and the geometry drawn in art/ship-level.tmj; keep all three in sync.
const ROOM_ORIGIN: i64 = 1;

const ROOM_SPAN: i64 = 6;

const ROOM_PITCH: i64 = 8;

const ROOM_COUNT: i64 = 5;

/// Modules occupy the 4*4 center of their 6*6 room. Mirrors MODULE_SPAN in
/// `src/ship/ship-modules.ts` — keep the two in sync.
const MODULE_SPAN: i64 = 4;

/// Top-left tile of the room containing (col, row), or None when the
/// position falls outside every room (void, corridors between rooms).
fn room_origin_at(col: i64, row: i64) -> Option<(i64, i64)> {
    let axis = |v: i64| {
        let rel = v - ROOM_ORIGIN;
        let idx = rel.div_euclid(ROOM_PITCH);
        if !(0..ROOM_COUNT).contains(&idx) || rel.rem_euclid(ROOM_PITCH) >= ROOM_SPAN {
            return None;
        }
        Some(ROOM_ORIGIN + idx * ROOM_PITCH)
    };
    Some((axis(col)?, axis(row)?))
}

/// Anchor (top-left) tile for a module centered in the room containing
/// (col, row), or None when (col, row) is not inside a room.
pub(super) fn module_anchor_at(col: i64, row: i64) -> Option<(i64, i64)> {
    let (room_col, room_row) = room_origin_at(col, row)?;
    let inset = (ROOM_SPAN - MODULE_SPAN) / 2;
    Some((room_col + inset, room_row + inset))
}

impl ServerState {
    /// The module already occupying the given room, if any — a build target
    /// must land on a free room.
    fn room_occupant(&self, room: (i64, i64)) -> Option<&ModuleData> {
        self.modules
            .values()
            .find(|m| room_origin_at(m.col, m.row) == Some(room))
    }

    /// The Command Module's current level, or 0 if it somehow doesn't exist
    /// yet — every other type's unlock and level cap read from this.
    fn command_level(&self) -> u32 {
        self.modules
            .values()
            .find(|m| m.module_type == COMMAND_MODULE_TYPE)
            .map(|m| m.level)
            .unwrap_or(0)
    }

    /// Total storage cap per resource (ROADMAP P1.11): every module's catalog
    /// baseline plus its per-level contribution, summed. A build/upgrade
    /// raises the cap only once it settles, like production — an unbuilt
    /// module (level 0) contributes neither half. Credits are trade-only and
    /// uncapped (their economy is P1.12/P4.6 design), expressed here as a
    /// u64::MAX cap.
    pub(super) fn storage_caps(&self) -> ResourceCounts {
        let mut caps = ResourceCounts {
            construction: 0,
            high_tech: 0,
            biological: 0,
            fuel: 0,
            credits: u64::MAX,
        };
        for module in self.modules.values() {
            let Some(entry) = catalog_entry(&module.module_type) else {
                continue;
            };
            if module.level == 0 {
                continue;
            }
            for &(kind, base) in entry.stores_base {
                caps.add(kind, base);
            }
            for &(kind, per_level) in entry.stores_per_level {
                caps.add(kind, per_level.saturating_mul(module.level as u64));
            }
        }
        caps
    }

    /// Total crew berths (ROADMAP P1.10): every settled module's catalog
    /// baseline plus its per-level contribution — the Command Module's fixed
    /// two, Crew Quarters' five a level.
    pub(super) fn crew_capacity(&self) -> u32 {
        self.modules
            .values()
            .filter(|m| m.level > 0)
            .filter_map(|m| {
                catalog_entry(&m.module_type).map(|e| {
                    e.crew_capacity_base
                        .saturating_add(e.crew_capacity_per_level.saturating_mul(m.level))
                })
            })
            .sum()
    }

    /// Ship-wide crew demand (ROADMAP P1.10): every module's catalog
    /// `crew_required_per_level` times its settled level, summed linearly.
    /// The pooled staffing ratio against this damps producer output.
    fn crew_required(&self) -> u32 {
        self.modules
            .values()
            .filter_map(|m| {
                catalog_entry(&m.module_type)
                    .map(|e| e.crew_required_per_level.saturating_mul(m.level))
            })
            .sum()
    }

    /// Promote every module whose pending build/upgrade has finished — lazy
    /// settlement on read/mutation plus eager settlement from the scheduler
    /// thread. Each promotion queues a Module push (so the client flips the
    /// actor to its new level without asking) and a feed notification
    /// (ROADMAP P1.5).
    pub(super) fn settle_modules(&mut self, now_ms: u64) {
        let mut settled = Vec::new();
        for module in self.modules.values_mut() {
            if let Some(pending) = &module.pending {
                if now_ms >= pending.completes_at {
                    let pending = pending.clone();
                    module.level = pending.level;
                    module.pending = None;
                    settled.push((module.clone(), pending));
                }
            }
        }
        settled.sort_by(|(a, _), (b, _)| a.module_id.cmp(&b.module_id));
        for (module, pending) in &settled {
            let operation = if module.level == 1 {
                ModuleCompletionOperation::Build
            } else {
                ModuleCompletionOperation::Levelup
            };
            // Modules are the player's own ship interior — always exempt
            // from interest-area filtering.
            self.queue_push(ServerPush::Module(module.clone()));
            self.push_notification(
                pending.action_id.clone(),
                NotificationPayload::ModuleCompleted {
                    module_id: module.module_id.clone(),
                    module_type: module.module_type.clone(),
                    level: module.level,
                    operation,
                },
                now_ms,
            );
        }
        // A Trading Post level-up can raise the deal slot count mid-batch —
        // make the reward visible now rather than at the next reroll
        // (ROADMAP P1.12).
        if settled
            .iter()
            .any(|(m, _)| m.module_type == TRADING_POST_MODULE_TYPE)
        {
            self.top_up_deal_slots();
        }
    }

    /// Accrue production for every whole interval elapsed since the last
    /// applied tick, summed across every settled (level >= 1) module's
    /// catalog `produces` entry, scaled by its current level. Each resource
    /// accrues only up to its storage cap (ROADMAP P1.11) — production past
    /// the cap is lost. A clock that went backwards re-anchors instead of
    /// freezing production. Credits are earned through trade (P1.12), never
    /// produced.
    pub(super) fn accrue_production(&mut self, now_ms: u64) {
        self.accrue_production_until(now_ms);
        self.settle_modules(now_ms);
    }

    /// Accrue through an exact timeline boundary without applying module
    /// completions. `advance_to` uses this before its ordered completion pass.
    pub(super) fn accrue_production_until(&mut self, now_ms: u64) {
        if now_ms < self.last_production_at {
            self.last_production_at = now_ms;
            return;
        }
        let interval_start = self.last_production_at;
        let tick_ms = scaled_ms(PRODUCTION_TICK_MS);
        let ticks = (now_ms - interval_start) / tick_ms;
        if ticks == 0 {
            return;
        }
        self.resources_dirty = true;
        // Storage caps (ROADMAP P1.11) read the levels as of the window
        // start: a Storage Bay that settles partway through this window only
        // raises the cap from the next accrual on — stub precision, fine at
        // a 5 s tick.
        let caps = self.storage_caps();
        // The crew staffing ratio (ROADMAP P1.10) reads the same window-start
        // state — head count and demand as of the last settle. A hire or
        // level-up completing mid-window shifts the ratio only from the next
        // accrual on (settle_hire runs after this, and the scheduler wakes at
        // those deadlines anyway, so straddling windows stay tiny) — the same
        // stub precision as the caps above.
        let required = self.crew_required();
        let staffed = self.crew.min(required);
        // Settling (bumping `level`) happens only after this loop: a module
        // whose pending build/upgrade completes partway through this window
        // must be credited its OLD level for the whole ticks fully elapsed
        // before completion, and its NEW level only for the ticks after —
        // never its new level retroactively for time it hadn't reached yet.
        // Production is catalogued per minute but accrues per tick, so a rate
        // that doesn't divide evenly into TICKS_PER_MINUTE would truncate to
        // nothing every tick (14/minute would floor to 1/tick and lose 2 a
        // minute). Every module's contribution is therefore summed in
        // "units * ticks" numerator space and divided once, below, with the
        // sub-unit part carried in `production_carry`.
        let mut earned = ResourceCounts::ZERO;
        for module in self.modules.values() {
            let (old_level, new_level, old_ticks) = match &module.pending {
                Some(p) if p.completes_at > interval_start && p.completes_at <= now_ms => {
                    let elapsed_before = p.completes_at - interval_start;
                    (module.level, p.level, (elapsed_before / tick_ms).min(ticks))
                }
                // Already due to settle at (or before) the start of this
                // window — e.g. a caller settled it directly in between
                // accrue_production calls — so it's effectively at its
                // pending level for the entire window.
                Some(p) if p.completes_at <= interval_start => (p.level, p.level, 0),
                // No pending, or still pending past the end of this window:
                // one level for the whole window.
                _ => (module.level, module.level, ticks),
            };
            let new_ticks = ticks - old_ticks;
            let Some(entry) = catalog_entry(&module.module_type) else {
                continue;
            };
            // Only modules that want crew are damped by the staffing ratio
            // (ROADMAP P1.10) — the Command Module's baseline production
            // (crew_required_per_level 0) always runs at full output.
            let damped = entry.crew_required_per_level > 0;
            let (damp_staffed, damp_required) = if damped { (staffed, required) } else { (0, 0) };
            if old_level > 0 && old_ticks > 0 {
                for &(kind, base) in entry.produces {
                    let amount = production_at_level(base, old_level).saturating_mul(old_ticks);
                    let amount = crew_scaled(amount, damp_staffed, damp_required);
                    earned.add(kind, amount);
                }
            }
            if new_level > 0 && new_ticks > 0 {
                for &(kind, base) in entry.produces {
                    let amount = production_at_level(base, new_level).saturating_mul(new_ticks);
                    let amount = crew_scaled(amount, damp_staffed, damp_required);
                    earned.add(kind, amount);
                }
            }
        }
        let carry_key = normalize_player_name(&self.player.name);
        let mut carry = self
            .production_carry
            .get(&carry_key)
            .copied()
            .unwrap_or(ResourceCounts::ZERO);
        for kind in MATERIAL_KINDS {
            let numerator = earned.get(kind).saturating_add(carry.get(kind));
            self.resources
                .add_capped(kind, numerator / TICKS_PER_MINUTE, caps.get(kind));
            carry.set(kind, numerator % TICKS_PER_MINUTE);
        }
        self.production_carry.insert(carry_key, carry);
        self.last_production_at = deadline_after(interval_start, ticks.saturating_mul(tick_ms));
    }

    /// Verify and execute a build request: the type must be a real,
    /// non-Command catalog entry unlocked by the current Command Module
    /// level, the spot must be the free canonical anchor of a room, and the
    /// player must afford the level-1 cost. Deducts the cost and returns the
    /// new module (level 0, pending its first completion).
    pub(super) fn build_module(
        &mut self,
        col: i64,
        row: i64,
        module_type: String,
        now_ms: u64,
    ) -> Result<ModuleActionResponse, String> {
        self.accrue_production(now_ms);
        let entry = catalog_entry(&module_type)
            .ok_or_else(|| format!("unknown module type: {module_type:?}"))?;
        if entry.module_type == COMMAND_MODULE_TYPE {
            return Err("the Command Module is already built".to_string());
        }
        if entry.unlock_command_level > self.command_level() {
            return Err(format!(
                "{} requires Command Module level {}",
                entry.display_name, entry.unlock_command_level
            ));
        }
        // One module per type (ROADMAP P1.18): the Command Module is exempt
        // above (it can never reach this check — build_module already
        // rejects that type outright), so this only ever catches a second
        // player-built module of the same type.
        if self.modules.values().any(|m| m.module_type == module_type) {
            return Err(format!("you already have a {}", entry.display_name));
        }
        let anchor = module_anchor_at(col, row).ok_or("build spot is not inside a room")?;
        if anchor != (col, row) {
            return Err(format!(
                "({col}, {row}) is not a module anchor; expected {anchor:?}"
            ));
        }
        let room = room_origin_at(col, row).expect("anchor implies a room");
        if self.room_occupant(room).is_some() {
            return Err(format!("room at {room:?} already has a module"));
        }
        let cost = module_cost(entry, 1);
        self.resources.spend_all(&cost)?;
        self.resources_dirty = true;
        self.next_module_seq += 1;
        let player = self.player.clone();
        let module = ModuleData {
            module_id: format!("module-{}-{}", now_ms, self.next_module_seq),
            owner_id: player.id,
            owner_name: player.name,
            module_type,
            col,
            row,
            level: 0,
            pending: Some(ModulePendingBuild {
                level: 1,
                action_id: self.next_event_id(),
                dispatched_at: now_ms,
                completes_at: deadline_after(now_ms, scaled_ms(build_time_ms(entry, 1))),
            }),
        };
        self.modules
            .insert(module.module_id.clone(), module.clone());
        Ok(ModuleActionResponse {
            action_id: module
                .pending
                .as_ref()
                .expect("new build is pending")
                .action_id
                .clone(),
            module,
            resources: self.resources,
        })
    }

    /// Verify and execute a level-up: the module must exist, belong to the
    /// player, and not already have a build/upgrade pending; a non-Command
    /// module additionally can't level past the Command Module's own level
    /// (README § Ship design: the Command Module gates everyone else's max
    /// level). Cost, build time, and production each use their own approved
    /// curve for the target level.
    pub(super) fn levelup_module(
        &mut self,
        module_id: &str,
        now_ms: u64,
    ) -> Result<ModuleActionResponse, String> {
        self.accrue_production(now_ms);
        let (owner_id, module_type, current_level, pending) = {
            let module = self
                .modules
                .get(module_id)
                .ok_or_else(|| format!("unknown module: {module_id:?}"))?;
            (
                module.owner_id.clone(),
                module.module_type.clone(),
                module.level,
                module.pending.is_some(),
            )
        };
        if owner_id != self.player.id {
            return Err(format!("module {module_id:?} belongs to another player"));
        }
        if pending {
            return Err(format!(
                "module {module_id:?} is already under construction"
            ));
        }
        let entry = catalog_entry(&module_type)
            .ok_or_else(|| format!("unknown module type: {module_type:?}"))?;
        let next_level = current_level
            .checked_add(1)
            .ok_or_else(|| format!("{} is already at the maximum level", entry.display_name))?;
        if next_level > MAX_MODULE_LEVEL {
            return Err(format!(
                "{} cannot exceed the maximum module level ({MAX_MODULE_LEVEL})",
                entry.display_name
            ));
        }
        if entry.module_type != COMMAND_MODULE_TYPE && next_level > self.command_level() {
            return Err(format!(
                "{} cannot exceed the Command Module's level ({})",
                entry.display_name,
                self.command_level()
            ));
        }
        let cost = module_cost(entry, next_level);
        self.resources.spend_all(&cost)?;
        self.resources_dirty = true;
        let completes_at = deadline_after(now_ms, scaled_ms(build_time_ms(entry, next_level)));
        let action_id = self.next_event_id();
        let module = self
            .modules
            .get_mut(module_id)
            .expect("existence checked above");
        module.pending = Some(ModulePendingBuild {
            level: next_level,
            action_id,
            dispatched_at: now_ms,
            completes_at,
        });
        Ok(ModuleActionResponse {
            action_id: module
                .pending
                .as_ref()
                .expect("level-up is pending")
                .action_id
                .clone(),
            module: module.clone(),
            resources: self.resources,
        })
    }

    /// Every module, in stable id order — the modules slice of the
    /// load_game_state snapshot.
    pub(super) fn modules_snapshot(&mut self, now_ms: u64) -> Vec<ModuleData> {
        self.settle_modules(now_ms);
        let mut modules: Vec<_> = self.modules.values().cloned().collect();
        modules.sort_by(|a, b| a.module_id.cmp(&b.module_id));
        modules
    }
}

#[cfg(test)]
mod tests {
    use super::super::test_support::*;
    use super::*;

    #[test]
    fn room_origin_maps_room_tiles_and_rejects_the_rest() {
        // Every tile of the center room resolves to its origin.
        for col in 17..=22 {
            for row in 17..=22 {
                assert_eq!(room_origin_at(col, row), Some((17, 17)));
            }
        }
        assert_eq!(room_origin_at(1, 1), Some((1, 1)));
        assert_eq!(room_origin_at(38, 38), Some((33, 33)));
        // Hull, corridors, off-map.
        for (col, row) in [(0, 0), (39, 39), (7, 3), (20, 8), (7, 8), (-5, 20)] {
            assert_eq!(room_origin_at(col, row), None, "({col}, {row})");
        }
    }

    #[test]
    fn module_anchor_is_one_tile_into_the_room() {
        assert_eq!(module_anchor_at(20, 21), Some((18, 18)));
        assert_eq!(module_anchor_at(1, 6), Some((2, 2)));
        assert_eq!(module_anchor_at(7, 7), None);
    }

    #[test]
    fn new_state_seeds_the_command_module_at_level_one() {
        let mut s = ServerState::new(0);
        let modules = s.modules_snapshot(0);
        assert_eq!(modules.len(), 1);
        let command = &modules[0];
        assert_eq!(command.module_id, "module-command");
        assert_eq!(command.module_type, COMMAND_MODULE_TYPE);
        assert_eq!((command.col, command.row), (18, 18));
        assert_eq!(command.level, 1);
        assert!(command.pending.is_none());
    }

    #[test]
    fn production_accrues_whole_ticks_with_remainder_carryover() {
        let mut s = ServerState::new(0);
        s.resources.construction = 0;
        s.resources.high_tech = 0;
        s.resources.biological = 0;
        s.resources.fuel = 0;
        s.accrue_production(TICK - 1);
        assert_eq!(s.resources.construction, 0);
        s.accrue_production(3 * TICK + TICK / 2);
        assert_eq!(s.resources.construction, 3);
        assert_eq!(s.resources.fuel, 3);
        assert_eq!(s.resources.credits, 0); // trade-only, never produced
                                            // The half-tick remainder carries over.
        s.accrue_production(4 * TICK);
        assert_eq!(s.resources.construction, 4);
    }

    #[test]
    fn production_reanchors_when_the_clock_goes_backwards() {
        let mut s = ServerState::new(10 * TICK);
        s.resources.construction = 0;
        s.accrue_production(0);
        assert_eq!(s.resources.construction, 0);
        s.accrue_production(TICK);
        assert_eq!(s.resources.construction, 1);
    }

    #[test]
    fn production_saturates_over_a_maximum_offline_window() {
        let mut s = ServerState::new(0);
        s.modules.get_mut("module-command").unwrap().level = 64;

        s.accrue_production(u64::MAX);

        assert_eq!(s.resources.construction, s.storage_caps().construction);
        assert_eq!(s.last_production_at, (u64::MAX / TICK) * TICK);
    }

    #[test]
    fn production_stops_at_the_storage_cap() {
        let mut s = ServerState::new(0);
        s.resources.construction = 0;
        // Command Module baseline (level 1): 1000 per material resource.
        let cap = s.storage_caps().construction;
        assert_eq!(cap, 1_000);
        // Far more ticks than the cap holds: every resource clamps at it.
        s.accrue_production((cap + 500) * TICK);
        assert_eq!(s.resources.construction, cap);
        assert_eq!(s.resources.fuel, cap);
        // Stock already above the cap is never confiscated — accrual just
        // has no room.
        s.resources.construction = cap + 123;
        s.accrue_production((cap + 600) * TICK);
        assert_eq!(s.resources.construction, cap + 123);
        assert_eq!(s.resources.fuel, cap);
    }

    #[test]
    fn storage_bay_raises_the_cap_once_settled() {
        let mut s = ServerState::new(0);
        let entry = catalog_entry("storage-bay").unwrap();
        s.resources.construction = module_cost(entry, 1).construction;
        let response = s.build_module(2, 2, "storage-bay".to_string(), 0).unwrap();
        let completes_at = response.module.pending.unwrap().completes_at;
        // Pending builds don't count: still the Command Module baseline.
        assert_eq!(s.storage_caps().construction, 1_000);
        s.settle_modules(completes_at);
        assert_eq!(s.storage_caps().construction, 3_000);
        assert_eq!(s.storage_caps().biological, 3_000);
        // Credits are trade-only and uncapped.
        assert_eq!(s.storage_caps().credits, u64::MAX);
    }

    #[test]
    fn build_deducts_cost_and_returns_a_pending_level_one_module() {
        let mut s = funded_state(1, 0);
        let response = s
            .build_module(2, 2, "ore-refinery".to_string(), 1_000)
            .unwrap();
        assert_eq!(s.resources.construction, 0);
        let module = response.module;
        assert_eq!((module.col, module.row), (2, 2));
        assert_eq!(module.level, 0);
        assert_eq!(module.owner_id, player_identity().id);
        let pending = module.pending.unwrap();
        assert_eq!(pending.level, 1);
        assert_eq!(pending.dispatched_at, 1_000);
        assert_eq!(pending.completes_at, 1_000 + ore_refinery_build_time());
    }

    #[test]
    fn build_deadline_near_the_timestamp_limit_does_not_wrap() {
        let now = u64::MAX - 1;
        let mut s = funded_state(1, now);

        let response = s
            .build_module(2, 2, "ore-refinery".to_string(), now)
            .unwrap();

        let pending = response.module.pending.unwrap();
        assert_eq!(pending.dispatched_at, now);
        assert_eq!(pending.completes_at, u64::MAX);
    }

    #[test]
    fn build_accrues_due_production_before_the_cost_check() {
        // 0 on hand, but by the time of the request enough ticks have passed.
        let mut s = ServerState::new(0);
        s.resources.construction = 0;
        let at = ore_refinery_cost() * TICK;
        assert!(s.build_module(2, 2, "ore-refinery".to_string(), at).is_ok());
        assert_eq!(s.resources.construction, 0);
    }

    #[test]
    fn build_rejects_insufficient_resources_without_side_effects() {
        let mut s = ServerState::new(0);
        s.resources.construction = ore_refinery_cost() - 1;
        let err = s
            .build_module(2, 2, "ore-refinery".to_string(), 0)
            .unwrap_err();
        assert!(err.contains("not enough construction"), "{err}");
        assert_eq!(s.resources.construction, ore_refinery_cost() - 1);
        // The room was not marked occupied by the failed attempt.
        s.resources.construction = ore_refinery_cost();
        assert!(s
            .build_module(2, 2, "ore-refinery".to_string(), TICK)
            .is_ok());
    }

    #[test]
    fn build_rejects_occupied_rooms_and_bad_spots() {
        let mut s = funded_state(10, 0);
        // The command module's room is pre-occupied.
        assert!(s
            .build_module(18, 18, "ore-refinery".to_string(), 0)
            .unwrap_err()
            .contains("already has a module"));
        // Corridor tile: not inside a room.
        assert!(s
            .build_module(7, 7, "ore-refinery".to_string(), 0)
            .unwrap_err()
            .contains("not inside a room"));
        // Inside a room but not the canonical anchor.
        assert!(s
            .build_module(1, 1, "ore-refinery".to_string(), 0)
            .unwrap_err()
            .contains("not a module anchor"));
        // Unknown type.
        assert!(s
            .build_module(2, 2, "turbo".to_string(), 0)
            .unwrap_err()
            .contains("unknown module type"));
        // A successful build occupies the room for the next attempt — a
        // different type, so the P1.18 one-per-type rule doesn't pre-empt
        // the room-occupancy check this test is actually after.
        assert!(s.build_module(2, 2, "ore-refinery".to_string(), 0).is_ok());
        assert!(s
            .build_module(2, 2, "storage-bay".to_string(), 0)
            .unwrap_err()
            .contains("already has a module"));
    }

    #[test]
    fn build_rejects_the_command_module_type() {
        let mut s = funded_state(1, 0);
        let err = s
            .build_module(2, 2, COMMAND_MODULE_TYPE.to_string(), 0)
            .unwrap_err();
        assert!(err.contains("already built"), "{err}");
    }

    #[test]
    fn build_rejects_a_second_module_of_the_same_type() {
        let mut s = funded_state(10, 0);
        assert!(s.build_module(2, 2, "ore-refinery".to_string(), 0).is_ok());
        // A different, still-empty room — rejected on type, not room
        // occupancy (that's build_rejects_occupied_rooms_and_bad_spots).
        let err = s
            .build_module(10, 2, "ore-refinery".to_string(), 0)
            .unwrap_err();
        assert!(err.contains("already have a"), "{err}");
        // A different type is unaffected.
        assert!(s.build_module(10, 2, "storage-bay".to_string(), 0).is_ok());
    }

    #[test]
    fn build_rejects_types_below_the_command_level_requirement() {
        let mut s = funded_state(1, 0);
        // Simulate a Command Module that hasn't reached the unlock level.
        s.modules.get_mut("module-command").unwrap().level = 0;
        let err = s
            .build_module(2, 2, "ore-refinery".to_string(), 0)
            .unwrap_err();
        assert!(err.contains("requires Command Module level"), "{err}");
    }

    #[test]
    fn levelup_rejects_while_a_build_is_pending() {
        let mut s = funded_state(2, 0);
        s.build_module(2, 2, "ore-refinery".to_string(), 0).unwrap();
        let module_id = s.modules_snapshot(0)[0].module_id.clone();
        let err = s.levelup_module(&module_id, 0).unwrap_err();
        assert!(err.contains("already under construction"), "{err}");
    }

    #[test]
    fn levelup_rejects_exceeding_the_command_level_cap() {
        let mut s = funded_state(2, 0);
        let build = s.build_module(2, 2, "ore-refinery".to_string(), 0).unwrap();
        // Let the first build complete: level 1, same as the Command Module.
        s.settle_modules(ore_refinery_build_time());
        let err = s
            .levelup_module(&build.module.module_id, ore_refinery_build_time())
            .unwrap_err();
        assert!(
            err.contains("cannot exceed the Command Module's level"),
            "{err}"
        );
    }

    #[test]
    fn levelup_rejects_the_global_level_cap_for_command_and_other_modules() {
        let mut s = funded_state(0, 0);
        s.modules.get_mut("module-command").unwrap().level = MAX_MODULE_LEVEL;
        let err = s.levelup_module("module-command", 0).unwrap_err();
        assert!(err.contains("maximum module level (30)"), "{err}");

        insert_settled(&mut s, "module-refinery", "ore-refinery", MAX_MODULE_LEVEL);
        let err = s.levelup_module("module-refinery", 0).unwrap_err();
        assert!(err.contains("maximum module level (30)"), "{err}");
    }

    #[test]
    fn levelup_scales_cost_and_time_and_sets_the_pending_target() {
        let mut s = funded_state(1, 0);
        // Level the Command Module up first so a refinery can follow it.
        s.resources.construction +=
            module_cost(catalog_entry(COMMAND_MODULE_TYPE).unwrap(), 2).construction;
        let command = s.levelup_module("module-command", 0).unwrap().module;
        let command_done = command.pending.unwrap().completes_at;
        s.settle_modules(command_done);
        assert_eq!(s.command_level(), 2);

        let build = s
            .build_module(2, 2, "ore-refinery".to_string(), command_done)
            .unwrap();
        s.settle_modules(build.module.pending.unwrap().completes_at);
        let refinery_id = build.module.module_id;

        s.resources.construction +=
            module_cost(catalog_entry("ore-refinery").unwrap(), 2).construction;
        let response = s.levelup_module(&refinery_id, command_done).unwrap();
        let pending = response.module.pending.unwrap();
        assert_eq!(pending.level, 2);
        assert_eq!(
            pending.completes_at,
            command_done + build_time_ms(catalog_entry("ore-refinery").unwrap(), 2)
        );
    }

    #[test]
    fn production_scales_with_module_level() {
        // Insert an already-settled refinery directly, bypassing the build
        // timer, to isolate the level -> production scaling in general from
        // the specific mid-window-completion split covered by
        // production_is_not_retroactively_credited_before_a_build_completes.
        let mut s = ServerState::new(0);
        s.resources.construction = 0;
        // Fully staffed throughout — the crew damping has its own tests.
        s.crew = 4;
        insert_settled(&mut s, "module-refinery", "ore-refinery", 1);
        s.accrue_production(TICK);
        // Command Module (12/minute) + refinery (24/minute) = 36 a minute,
        // which divides evenly into the 12 ticks a minute: +3 this tick.
        assert_eq!(s.resources.construction, 3);

        s.modules.get_mut("module-refinery").unwrap().level = 2;
        // Level 2 refinery: ceil(24 * 1.15) = 28/minute, so the ship now makes
        // 40 a minute — 3 whole units a tick with 4/12 left over. The carry is
        // what keeps that fraction from being truncated away every tick.
        s.accrue_production(2 * TICK);
        assert_eq!(s.resources.construction, 3 + 3);
        assert_eq!(production_carry(&s, ResourceKind::Construction), 4);
        s.accrue_production(3 * TICK);
        assert_eq!(s.resources.construction, 3 + 3 + 3);
        assert_eq!(production_carry(&s, ResourceKind::Construction), 8);
        // Third tick collects the two carried remainders: the three ticks
        // credit 10 in total, exactly 3 * 40 / 12 with nothing lost.
        s.accrue_production(4 * TICK);
        assert_eq!(s.resources.construction, 3 + 10);
        assert_eq!(production_carry(&s, ResourceKind::Construction), 0);
    }

    #[test]
    fn production_is_not_retroactively_credited_before_a_build_completes() {
        // Build a refinery (15_000ms = 3 ticks) and, with no intermediate
        // accrual, jump straight to 2 ticks past its completion.
        let mut s = funded_state(1, 0);
        let build = s.build_module(2, 2, "ore-refinery".to_string(), 0).unwrap();
        let completes_at = build.module.pending.unwrap().completes_at;
        s.accrue_production(completes_at + 2 * TICK);
        // 6 ticks elapsed in total. The Command Module (unaffected, level 1)
        // earns all 6: +6. The refinery was level 0 (no production) for the
        // first 4 ticks and only reaches level 1 (+2/tick) for the last 2:
        // +4. A naive settle-then-multiply would instead credit the
        // refinery's level-1 rate for all 5 ticks (+10) — 6 more than
        // correct.
        assert_eq!(s.resources.construction, 6 + 4);
    }

    #[test]
    fn build_completion_queues_module_push_and_notification() {
        let mut s = funded_state(1, 0);
        s.build_module(2, 2, "ore-refinery".to_string(), 0).unwrap();
        s.drain_pushes(); // discard the build's own spend push
        s.settle(ore_refinery_build_time());
        let pushes = s.drain_pushes();
        assert!(pushes
            .iter()
            .any(|p| matches!(p, ServerPush::Module(m) if m.level == 1 && m.pending.is_none())));
        assert!(pushes.iter().any(|p| matches!(
            p,
            ServerPush::Notification(n)
                if matches!(&n.payload, NotificationPayload::ModuleCompleted { module_type, operation: ModuleCompletionOperation::Build, .. } if module_type == "ore-refinery")
                    && !n.read
        )));
        assert_eq!(notification_kinds(&s), vec!["module-completed"]);
        // Settling again at the same time re-announces nothing.
        s.settle(ore_refinery_build_time());
        assert!(s.drain_pushes().is_empty());
    }

    #[test]
    fn levelup_completion_notifies_with_the_new_level() {
        let mut s = ServerState::new(0);
        s.resources.construction =
            module_cost(catalog_entry(COMMAND_MODULE_TYPE).unwrap(), 2).construction;
        let response = s.levelup_module("module-command", 0).unwrap();
        let done = response.module.pending.unwrap().completes_at;
        s.drain_pushes();
        s.settle(done);
        assert!(s.drain_pushes().iter().any(|p| matches!(
            p,
            ServerPush::Notification(n)
                if matches!(&n.payload, NotificationPayload::ModuleCompleted { level: 2, operation: ModuleCompletionOperation::Levelup, .. })
        )));
    }

    #[test]
    fn crew_capacity_and_requirement_sum_linearly() {
        let mut s = ServerState::new(0);
        // Command Module level 1: the 2-berth baseline, no demand.
        assert_eq!(s.crew_capacity(), 2);
        assert_eq!(s.crew_required(), 0);
        // Crew Quarters add five berths per settled level.
        insert_settled(&mut s, "module-quarters", "crew-quarters", 2);
        insert_settled(&mut s, "module-refinery", "ore-refinery", 3);
        assert_eq!(s.crew_capacity(), 2 + 10);
        assert_eq!(s.crew_required(), 3);
    }

    #[test]
    fn command_module_capacity_is_a_flat_baseline_that_never_grows() {
        // Deliberate: leveling the Command Module buys progression (unlocks
        // and the ship-wide level cap), never capacity, so the Storage Bay
        // and Crew Quarters stay worth building at every level. Mirrored by
        // tests/module_catalog_test.ts.
        let mut s = ServerState::new(0);
        let baseline_storage = s.storage_caps().construction;
        let baseline_berths = s.crew_capacity();
        assert_eq!((baseline_storage, baseline_berths), (1_000, 2));

        let command_id = s
            .modules
            .values()
            .find(|m| m.module_type == COMMAND_MODULE_TYPE)
            .map(|m| m.module_id.clone())
            .expect("command module");
        s.modules.get_mut(&command_id).unwrap().level = 10;
        assert_eq!(s.storage_caps().construction, baseline_storage);
        assert_eq!(s.crew_capacity(), baseline_berths);
    }

    /// A type that wants both operational materials, and one whose
    /// operational material collides with the universal high-tech charge —
    /// neither is in the catalog today, both are shapes the catalog is meant
    /// to allow (a Command Module housing crew *and* robotics; an end-game
    /// type leaning on high-tech).
    fn dual_material_entry(operational: &'static [ResourceKind]) -> ModuleCatalogEntry {
        ModuleCatalogEntry {
            module_type: "test-dual",
            display_name: "Test Dual",
            produces: &[],
            stores_base: &[],
            stores_per_level: &[],
            crew_capacity_base: 0,
            crew_capacity_per_level: 0,
            crew_required_per_level: 0,
            operational_costs: operational,
            cost_numerator: 1,
            cost_denominator: 1,
            build_time_numerator: 1,
            build_time_denominator: 1,
            unlock_command_level: 1,
        }
    }

    #[test]
    fn multi_material_costs_sum_per_material_and_spend_atomically() {
        // Both operational materials: each takes the supplemental fraction.
        let both = dual_material_entry(&[ResourceKind::Biological, ResourceKind::Fuel]);
        let cost = module_cost(&both, OPERATIONAL_COST_START_LEVEL);
        let construction = cost.construction;
        assert_eq!(cost.biological, construction.div_ceil(2));
        assert_eq!(cost.fuel, construction.div_ceil(2));
        assert_eq!(cost.high_tech, 0);

        // High-tech as an operational material *plus* the universal
        // high-tech charge: the two sum into one slot. The old
        // list-of-line-items shape checked each against the full balance
        // and then subtracted both, so this is the case that underflowed.
        let techy = dual_material_entry(&[ResourceKind::HighTech]);
        let cost = module_cost(&techy, HIGH_TECH_COST_START_LEVEL);
        let supplemental = cost.construction.div_ceil(2);
        assert_eq!(cost.high_tech, 2 * supplemental);

        // Exactly affording it spends everything and leaves nothing behind.
        let mut s = ServerState::new(0);
        s.resources = ResourceCounts::ZERO;
        s.resources.construction = cost.construction;
        s.resources.high_tech = cost.high_tech;
        assert!(s.resources.spend_all(&cost).is_ok());
        assert_eq!(s.resources.construction, 0);
        assert_eq!(s.resources.high_tech, 0);

        // One short on the summed side: rejected with every balance intact,
        // never a partial spend.
        let mut s = ServerState::new(0);
        s.resources = ResourceCounts::ZERO;
        s.resources.construction = cost.construction;
        s.resources.high_tech = cost.high_tech - 1;
        let err = s.resources.spend_all(&cost).unwrap_err();
        assert!(err.contains("not enough high-tech"), "{err}");
        assert_eq!(s.resources.construction, cost.construction);
        assert_eq!(s.resources.high_tech, cost.high_tech - 1);
    }

    #[test]
    fn the_per_entry_cost_multiplier_scales_every_material() {
        // Every other cost test derives its expectation from `module_cost`
        // itself, so none of them can tell a live multiplier from an ignored
        // one. These literals are the pin, mirrored by
        // tests/module_catalog_test.ts to keep the client preview honest.
        let refinery = catalog_entry("ore-refinery").unwrap();
        let storage = catalog_entry("storage-bay").unwrap();
        assert_eq!(module_cost(refinery, 1).construction, 13);
        assert_eq!(module_cost(storage, 1).construction, 25);

        // The multiplier reaches the supplemental materials too, rather than
        // discounting only the construction line: at the operational
        // threshold the refinery pays half of what the storage bay pays in
        // both materials, not just the first.
        let discounted = module_cost(refinery, OPERATIONAL_COST_START_LEVEL);
        let full = module_cost(storage, OPERATIONAL_COST_START_LEVEL);
        assert_eq!((discounted.construction, discounted.fuel), (65, 33));
        assert_eq!((full.construction, full.fuel), (129, 65));
    }

    #[test]
    fn production_follows_a_true_compounding_curve_not_a_per_level_round() {
        // The curve must stay near base * 1.15^(level-1). Rounding up at
        // every level instead would reach 15/minute-equivalents by level 10
        // on the command base and 120 on the refinery base — a curve two to
        // three times steeper than the approved one. These exact sequences
        // are mirrored by tests/module_catalog_test.ts, which is what keeps
        // the client preview honest.
        let command: Vec<u64> = (1..=10).map(|l| production_at_level(12, l)).collect();
        assert_eq!(command, vec![12, 14, 16, 19, 21, 25, 28, 32, 37, 43]);
        let refinery: Vec<u64> = (1..=10).map(|l| production_at_level(24, l)).collect();
        assert_eq!(refinery, vec![24, 28, 32, 37, 42, 49, 56, 64, 74, 85]);
        // Never below the true curve, never more than a unit above it.
        for level in 1..=20u32 {
            let exact = 24.0 * 1.15f64.powi(level as i32 - 1);
            let actual = production_at_level(24, level) as f64;
            assert!(
                actual >= exact - 1.0 && actual < exact + 1.0,
                "level {level}"
            );
        }
        assert_eq!(production_at_level(24, 0), 0);
    }

    #[test]
    fn sub_unit_production_carry_survives_a_system_wide_settle() {
        // `advance_to` settles every local profile by swapping each into the
        // active slot, so a single shared carry would be wiped on every
        // scheduler wake — silently truncating the fractional part of every
        // rate that doesn't divide into TICKS_PER_MINUTE.
        let mut s = ServerState::new(0);
        // Creating the second profile parks Player 1 and selects Player 2, so
        // every later settle swaps profiles in and out around the active one.
        s.create_player_profile("Player 2".to_string(), 0)
            .expect("create second local profile");
        s.resources.construction = 0;
        s.crew = 4;
        insert_settled(&mut s, "module-refinery", "ore-refinery", 2);

        // 40/minute over one tick: 3 credited, 4 carried.
        s.settle(TICK);
        assert_eq!(s.resources.construction, 3);
        assert_eq!(production_carry(&s, ResourceKind::Construction), 4);
        // The second profile's own accrual must not consume or reset it.
        s.settle(2 * TICK);
        assert_eq!(s.resources.construction, 6);
        assert_eq!(production_carry(&s, ResourceKind::Construction), 8);
    }

    #[test]
    fn understaffed_production_is_damped_with_a_half_floor() {
        let mut s = ServerState::new(0);
        s.resources.construction = 0;
        // A level-4 refinery wants 4 crew and makes ceil(24 * 1.15^3) = 37
        // construction/minute at full staff; the Command Module's 12/minute
        // baseline is never damped. Damping is applied in per-minute space,
        // before the tick division, so a floored ratio costs a fraction of a
        // unit a minute rather than a whole unit a tick.
        insert_settled(&mut s, "module-refinery", "ore-refinery", 4);
        s.crew = 4;
        s.accrue_production(TICK);
        // Fully staffed: (37 + 12) / 12 = 4, carrying 1.
        assert_eq!(s.resources.construction, 4);
        // Half staffed: 37 * (4 + 2) / (2 * 4) = 27, so (27 + 12 + 1) / 12 = 3.
        s.crew = 2;
        s.accrue_production(2 * TICK);
        assert_eq!(s.resources.construction, 4 + 3);
        // No crew at all still runs at the 50% floor: 37 * 4 / 8 = 18, so
        // (18 + 12 + 4) / 12 = 2.
        s.crew = 0;
        s.accrue_production(3 * TICK);
        assert_eq!(s.resources.construction, 4 + 3 + 2);
    }
}
