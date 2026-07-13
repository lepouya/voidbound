use serde::Serialize;

use super::resources::{ResourceCounts, ResourceKind};
use super::state::{player_identity, ServerPush, ServerState};

/// One entry in the module catalog (ROADMAP P1.4): production, storage,
/// cost, build time, and unlock prerequisite for a module type.
/// Cost/time/production/storage all scale by `scale_for_level` — a
/// deliberate doubling-per-level stub until real balancing lands. Mirrors
/// the TS `MODULE_CATALOG` in `src/module-catalog.ts` — keep the two in
/// sync.
pub struct ModuleCatalogEntry {
    /// Wire key — the `module_type` string on `ModuleData` and build requests.
    pub module_type: &'static str,
    pub display_name: &'static str,
    /// Resources produced per production tick at level 1; doubles per level.
    pub produces: &'static [(ResourceKind, u64)],
    /// Storage capacity contributed per resource at level 1 (ROADMAP P1.11);
    /// doubles per level. Income past a resource's total cap is lost.
    pub stores: &'static [(ResourceKind, u64)],
    /// Crew berths contributed per settled level (ROADMAP P1.10) — summed
    /// **linearly** (level * this), not scale_for_level: capacity is a head
    /// count, not a production curve. Crew Quarters is the real source; the
    /// Command Module contributes a baseline like it does for production and
    /// storage.
    pub crew_capacity_per_level: u32,
    /// Crew wanted per settled level to run at full output (ROADMAP P1.10),
    /// summed linearly ship-wide. Modules with 0 are never damped; the
    /// Command Module's baseline production stays 0 so the player can never
    /// get stuck (README § Ship design).
    pub crew_required_per_level: u32,
    /// Construction-material cost to build (or level up to) level 1; doubles
    /// per level thereafter.
    pub base_cost_construction: u64,
    /// Build/level-up time in ms at level 1; doubles per level thereafter.
    pub base_build_time_ms: u64,
    /// Minimum Command Module level required before this type can be built.
    pub unlock_command_level: u32,
}

pub const COMMAND_MODULE_TYPE: &str = "command";

/// Catalog key of the Trading Post (ROADMAP P1.12) — hosts the NPC deal
/// shop; its settled level gates the deal commands and sets the slot count.
pub const TRADING_POST_MODULE_TYPE: &str = "trading-post";

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
            (ResourceKind::Construction, 1),
            (ResourceKind::HighTech, 1),
            (ResourceKind::Biological, 1),
            (ResourceKind::Fuel, 1),
        ],
        // Baseline storage, mirroring the baseline production: the player
        // always has some cap even with no Storage Bay built — sized to hold
        // a max small-tier asteroid harvest (ASTEROID_TIERS) with room over.
        stores: &[
            (ResourceKind::Construction, 1_000),
            (ResourceKind::HighTech, 1_000),
            (ResourceKind::Biological, 1_000),
            (ResourceKind::Fuel, 1_000),
        ],
        // Baseline berths too — hiring works before the first Crew Quarters
        // exists (ROADMAP P1.10).
        crew_capacity_per_level: 2,
        crew_required_per_level: 0,
        base_cost_construction: 20,
        base_build_time_ms: 30_000,
        unlock_command_level: 0,
    },
    ModuleCatalogEntry {
        module_type: "ore-refinery",
        display_name: "Ore Refinery",
        produces: &[(ResourceKind::Construction, 2)],
        stores: &[],
        crew_capacity_per_level: 0,
        crew_required_per_level: 1,
        base_cost_construction: 10,
        base_build_time_ms: 15_000,
        unlock_command_level: 1,
    },
    ModuleCatalogEntry {
        module_type: "electronics-fabricator",
        display_name: "Electronics Fabricator",
        produces: &[(ResourceKind::HighTech, 2)],
        stores: &[],
        crew_capacity_per_level: 0,
        crew_required_per_level: 1,
        base_cost_construction: 10,
        base_build_time_ms: 15_000,
        unlock_command_level: 1,
    },
    ModuleCatalogEntry {
        module_type: "hydroponics-bay",
        display_name: "Hydroponics Bay",
        produces: &[(ResourceKind::Biological, 2)],
        stores: &[],
        crew_capacity_per_level: 0,
        crew_required_per_level: 1,
        base_cost_construction: 10,
        base_build_time_ms: 15_000,
        unlock_command_level: 1,
    },
    ModuleCatalogEntry {
        module_type: "fusion-reactor",
        display_name: "Fusion Reactor",
        produces: &[(ResourceKind::Fuel, 2)],
        stores: &[],
        crew_capacity_per_level: 0,
        crew_required_per_level: 1,
        base_cost_construction: 10,
        base_build_time_ms: 15_000,
        unlock_command_level: 1,
    },
    ModuleCatalogEntry {
        module_type: "storage-bay",
        display_name: "Storage Bay",
        produces: &[],
        stores: &[
            (ResourceKind::Construction, 2_000),
            (ResourceKind::HighTech, 2_000),
            (ResourceKind::Biological, 2_000),
            (ResourceKind::Fuel, 2_000),
        ],
        crew_capacity_per_level: 0,
        crew_required_per_level: 0,
        base_cost_construction: 15,
        base_build_time_ms: 20_000,
        unlock_command_level: 1,
    },
    ModuleCatalogEntry {
        module_type: "crew-quarters",
        display_name: "Crew Quarters",
        produces: &[],
        stores: &[],
        crew_capacity_per_level: 1,
        crew_required_per_level: 0,
        base_cost_construction: 15,
        base_build_time_ms: 20_000,
        unlock_command_level: 1,
    },
    ModuleCatalogEntry {
        module_type: TRADING_POST_MODULE_TYPE,
        display_name: "Trading Post",
        // No production or storage — its function is the deal shop
        // (ROADMAP P1.12); leveling it adds deal slots instead.
        produces: &[],
        stores: &[],
        crew_capacity_per_level: 0,
        crew_required_per_level: 1,
        base_cost_construction: 15,
        base_build_time_ms: 20_000,
        // Low-mid unlock so trade arrives after the first production loop is
        // running; the exact level is a balancing stub → P2.6.
        unlock_command_level: 2,
    },
];

pub(super) fn catalog_entry(module_type: &str) -> Option<&'static ModuleCatalogEntry> {
    MODULE_CATALOG.iter().find(|e| e.module_type == module_type)
}

/// Doubles `base` for every level above 1 — the stub scaling rule shared by
/// cost, build time, and production until real balancing lands (ROADMAP
/// P1.4). Level 0 (not yet built) scales to 0.
pub(super) fn scale_for_level(base: u64, level: u32) -> u64 {
    if level == 0 {
        return 0;
    }
    base.saturating_mul(2u64.saturating_pow(level - 1))
}

/// Damp a production amount by the pooled crew staffing ratio (ROADMAP
/// P1.10): output * (0.5 + 0.5 * staffed/required), as exact integer math —
/// `amount * (required + staffed) / (2 * required)`. Fully staffed passes
/// through unchanged; a ship with no crew still runs at half speed (the 50%
/// floor — understaffing punishes, it never kills). `required == 0` means
/// nothing wants crew: no damping. The floor value is a balancing stub →
/// P2.6. Mirrored display-only as crewScaledAmount in
/// `src/module-catalog.ts` — keep the two in sync.
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
/// Mirrors the TS `ModuleData` in `src/game-state.ts` — keep the two in sync.
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

/// Mirrors the TS `ModulePendingBuild` in `src/game-state.ts` — keep the two
/// in sync.
#[derive(Serialize, serde::Deserialize, Clone, Debug)]
#[serde(rename_all = "camelCase")]
pub struct ModulePendingBuild {
    /// The level this build completes to.
    pub level: u32,
    pub dispatched_at: u64,
    pub completes_at: u64,
}

/// Result of a verified build/level-up request: the affected module's
/// current state plus the resource counts after the cost was deducted.
#[derive(Serialize, Debug)]
pub struct ModuleActionResponse {
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

/// Ship-interior room layout — mirrors SHIP_ROOM_GRID in `src/grid-math.ts`
/// and the geometry drawn in art/ship-level.tmj; keep all three in sync.
const ROOM_ORIGIN: i64 = 1;

const ROOM_SPAN: i64 = 6;

const ROOM_PITCH: i64 = 8;

const ROOM_COUNT: i64 = 5;

/// Modules occupy the 4*4 center of their 6*6 room.
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

    /// Total storage cap per resource (ROADMAP P1.11): the sum of every
    /// module's catalog `stores` contribution scaled by its settled level —
    /// a build/upgrade raises the cap only once it settles, like production.
    /// Credits are trade-only and uncapped (their economy is P1.12/P4.6
    /// design), expressed here as a u64::MAX cap.
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
            for &(kind, base) in entry.stores {
                caps.add(kind, scale_for_level(base, module.level));
            }
        }
        caps
    }

    /// Total crew berths (ROADMAP P1.10): every module's catalog
    /// `crew_capacity_per_level` times its settled level, summed linearly —
    /// a build/upgrade adds berths only once it settles, like storage caps.
    pub(super) fn crew_capacity(&self) -> u32 {
        self.modules
            .values()
            .filter_map(|m| {
                catalog_entry(&m.module_type)
                    .map(|e| e.crew_capacity_per_level.saturating_mul(m.level))
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
                    module.level = pending.level;
                    module.pending = None;
                    settled.push(module.clone());
                }
            }
        }
        for module in &settled {
            let name = catalog_entry(&module.module_type)
                .map(|e| e.display_name)
                .unwrap_or(&module.module_type);
            let (kind, message) = if module.level == 1 {
                ("build-complete", format!("{name} construction complete"))
            } else {
                (
                    "levelup-complete",
                    format!("{name} upgraded to level {}", module.level),
                )
            };
            // Modules are the player's own ship interior — always exempt
            // from interest-area filtering.
            self.queue_push(ServerPush::Module(module.clone()));
            self.push_notification(kind, message, now_ms);
        }
        // A Trading Post level-up can raise the deal slot count mid-batch —
        // make the reward visible now rather than at the next reroll
        // (ROADMAP P1.12).
        if settled
            .iter()
            .any(|m| m.module_type == TRADING_POST_MODULE_TYPE)
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
        if now_ms < self.last_production_at {
            self.last_production_at = now_ms;
            self.settle_modules(now_ms);
            return;
        }
        let interval_start = self.last_production_at;
        let ticks = (now_ms - interval_start) / PRODUCTION_TICK_MS;
        if ticks == 0 {
            self.settle_modules(now_ms);
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
        for module in self.modules.values() {
            let (old_level, new_level, old_ticks) = match &module.pending {
                Some(p) if p.completes_at > interval_start && p.completes_at <= now_ms => {
                    let elapsed_before = p.completes_at - interval_start;
                    (
                        module.level,
                        p.level,
                        (elapsed_before / PRODUCTION_TICK_MS).min(ticks),
                    )
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
                    let amount = scale_for_level(base, old_level) * old_ticks;
                    let amount = crew_scaled(amount, damp_staffed, damp_required);
                    self.resources.add_capped(kind, amount, caps.get(kind));
                }
            }
            if new_level > 0 && new_ticks > 0 {
                for &(kind, base) in entry.produces {
                    let amount = scale_for_level(base, new_level) * new_ticks;
                    let amount = crew_scaled(amount, damp_staffed, damp_required);
                    self.resources.add_capped(kind, amount, caps.get(kind));
                }
            }
        }
        self.last_production_at += ticks * PRODUCTION_TICK_MS;
        self.settle_modules(now_ms);
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
        let cost = scale_for_level(entry.base_cost_construction, 1);
        self.resources.spend(ResourceKind::Construction, cost)?;
        self.resources_dirty = true;
        self.next_module_seq += 1;
        let player = player_identity();
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
                dispatched_at: now_ms,
                completes_at: now_ms + scale_for_level(entry.base_build_time_ms, 1),
            }),
        };
        self.modules
            .insert(module.module_id.clone(), module.clone());
        Ok(ModuleActionResponse {
            module,
            resources: self.resources,
        })
    }

    /// Verify and execute a level-up: the module must exist, belong to the
    /// player, and not already have a build/upgrade pending; a non-Command
    /// module additionally can't level past the Command Module's own level
    /// (README § Ship design: the Command Module gates everyone else's max
    /// level). Cost and build time scale with the target level (doubling
    /// stub, `scale_for_level`); production scales the same way once the
    /// level-up settles, since `accrue_production` reads the current level.
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
        if owner_id != player_identity().id {
            return Err(format!("module {module_id:?} belongs to another player"));
        }
        if pending {
            return Err(format!(
                "module {module_id:?} is already under construction"
            ));
        }
        let entry = catalog_entry(&module_type)
            .ok_or_else(|| format!("unknown module type: {module_type:?}"))?;
        let next_level = current_level + 1;
        if entry.module_type != COMMAND_MODULE_TYPE && next_level > self.command_level() {
            return Err(format!(
                "{} cannot exceed the Command Module's level ({})",
                entry.display_name,
                self.command_level()
            ));
        }
        let cost = scale_for_level(entry.base_cost_construction, next_level);
        self.resources.spend(ResourceKind::Construction, cost)?;
        self.resources_dirty = true;
        let completes_at = now_ms + scale_for_level(entry.base_build_time_ms, next_level);
        let module = self
            .modules
            .get_mut(module_id)
            .expect("existence checked above");
        module.pending = Some(ModulePendingBuild {
            level: next_level,
            dispatched_at: now_ms,
            completes_at,
        });
        Ok(ModuleActionResponse {
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
        s.accrue_production(0);
        assert_eq!(s.resources.construction, 0);
        s.accrue_production(TICK);
        assert_eq!(s.resources.construction, 1);
    }

    #[test]
    fn production_stops_at_the_storage_cap() {
        let mut s = ServerState::new(0);
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
        s.resources.construction = entry.base_cost_construction;
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
    fn build_accrues_due_production_before_the_cost_check() {
        // 0 on hand, but by the time of the request enough ticks have passed.
        let mut s = ServerState::new(0);
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
        // A successful build occupies the room for the next attempt.
        assert!(s.build_module(2, 2, "ore-refinery".to_string(), 0).is_ok());
        assert!(s
            .build_module(2, 2, "ore-refinery".to_string(), 0)
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
    fn levelup_scales_cost_and_time_and_sets_the_pending_target() {
        let mut s = funded_state(1, 0);
        // Level the Command Module up first so a refinery can follow it.
        s.resources.construction += scale_for_level(
            catalog_entry(COMMAND_MODULE_TYPE)
                .unwrap()
                .base_cost_construction,
            2,
        );
        let command = s.levelup_module("module-command", 0).unwrap().module;
        let command_done = command.pending.unwrap().completes_at;
        s.settle_modules(command_done);
        assert_eq!(s.command_level(), 2);

        let build = s
            .build_module(2, 2, "ore-refinery".to_string(), command_done)
            .unwrap();
        s.settle_modules(build.module.pending.unwrap().completes_at);
        let refinery_id = build.module.module_id;

        s.resources.construction += 2 * ore_refinery_cost(); // level 2 costs double
        let response = s.levelup_module(&refinery_id, command_done).unwrap();
        let pending = response.module.pending.unwrap();
        assert_eq!(pending.level, 2);
        assert_eq!(
            pending.completes_at,
            command_done + 2 * ore_refinery_build_time()
        );
    }

    #[test]
    fn production_scales_with_module_level() {
        // Insert an already-settled refinery directly, bypassing the build
        // timer, to isolate the level -> production scaling in general from
        // the specific mid-window-completion split covered by
        // production_is_not_retroactively_credited_before_a_build_completes.
        let mut s = ServerState::new(0);
        // Fully staffed throughout — the crew damping has its own tests.
        s.crew = 4;
        insert_settled(&mut s, "module-refinery", "ore-refinery", 1);
        s.accrue_production(TICK);
        // Command Module (level 1: +1 construction) + refinery (level 1: +2).
        assert_eq!(s.resources.construction, 3);

        s.modules.get_mut("module-refinery").unwrap().level = 2;
        s.accrue_production(2 * TICK);
        // Refinery production doubles at level 2 (+4), command stays +1.
        assert_eq!(s.resources.construction, 3 + 5);
    }

    #[test]
    fn production_is_not_retroactively_credited_before_a_build_completes() {
        // Build a refinery (15_000ms = 3 ticks) and, with no intermediate
        // accrual, jump straight to 2 ticks past its completion.
        let mut s = funded_state(1, 0);
        let build = s.build_module(2, 2, "ore-refinery".to_string(), 0).unwrap();
        let completes_at = build.module.pending.unwrap().completes_at;
        s.accrue_production(completes_at + 2 * TICK);
        // 5 ticks elapsed in total. The Command Module (unaffected, level 1)
        // earns all 5: +5. The refinery was level 0 (no production) for the
        // first 3 ticks and only reaches level 1 (+2/tick) for the last 2:
        // +4. A naive settle-then-multiply would instead credit the
        // refinery's level-1 rate for all 5 ticks (+10) — 6 more than
        // correct.
        assert_eq!(s.resources.construction, 5 + 4);
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
                if n.kind == "build-complete"
                    && n.message.contains("Ore Refinery")
                    && !n.read
        )));
        assert_eq!(notification_kinds(&s), vec!["build-complete"]);
        // Settling again at the same time re-announces nothing.
        s.settle(ore_refinery_build_time());
        assert!(s.drain_pushes().is_empty());
    }

    #[test]
    fn levelup_completion_notifies_with_the_new_level() {
        let mut s = ServerState::new(0);
        s.resources.construction = scale_for_level(
            catalog_entry(COMMAND_MODULE_TYPE)
                .unwrap()
                .base_cost_construction,
            2,
        );
        let response = s.levelup_module("module-command", 0).unwrap();
        let done = response.module.pending.unwrap().completes_at;
        s.drain_pushes();
        s.settle(done);
        assert!(s.drain_pushes().iter().any(|p| matches!(
            p,
            ServerPush::Notification(n)
                if n.kind == "levelup-complete" && n.message.contains("level 2")
        )));
    }

    #[test]
    fn crew_capacity_and_requirement_sum_linearly() {
        let mut s = ServerState::new(0);
        // Command Module level 1: the 2-berth baseline, no demand.
        assert_eq!(s.crew_capacity(), 2);
        assert_eq!(s.crew_required(), 0);
        // Linear per level — deliberately not the scale_for_level doubling.
        insert_settled(&mut s, "module-quarters", "crew-quarters", 2);
        insert_settled(&mut s, "module-refinery", "ore-refinery", 3);
        assert_eq!(s.crew_capacity(), 2 + 2);
        assert_eq!(s.crew_required(), 3);
    }

    #[test]
    fn understaffed_production_is_damped_with_a_half_floor() {
        let mut s = ServerState::new(0);
        // A level-4 refinery wants 4 crew and makes 16 construction/tick at
        // full staff; the Command Module's baseline (+1) is never damped.
        insert_settled(&mut s, "module-refinery", "ore-refinery", 4);
        s.crew = 4;
        s.accrue_production(TICK);
        assert_eq!(s.resources.construction, 16 + 1);
        // Half staffed: 16 * (4 + 2) / (2 * 4) = 12.
        s.crew = 2;
        s.accrue_production(2 * TICK);
        assert_eq!(s.resources.construction, 17 + 12 + 1);
        // No crew at all still runs at the 50% floor: 16 / 2 = 8.
        s.crew = 0;
        s.accrue_production(3 * TICK);
        assert_eq!(s.resources.construction, 17 + 13 + 8 + 1);
    }
}
