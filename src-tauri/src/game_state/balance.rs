use serde::Serialize;

use super::crew::{HIRE_COST_BIOLOGICAL, HIRE_TIME_MS};
use super::modules::{
    module_catalog_data, ModuleCatalogData, BASE_BUILD_TIMES_MS, CONSTRUCTION_COST_DENOMINATOR,
    CONSTRUCTION_COST_LEVEL_ONE, CONSTRUCTION_COST_NUMERATOR, HIGH_TECH_COST_START_LEVEL,
    MAX_MODULE_LEVEL, OPERATIONAL_COST_START_LEVEL, POST_LEVEL_10_BUILD_TIME_MS,
    PRODUCTION_DENOMINATOR, PRODUCTION_NUMERATOR, PRODUCTION_PRECISION,
    SUPPLEMENTAL_COST_DENOMINATOR, SUPPLEMENTAL_COST_NUMERATOR, TICKS_PER_MINUTE,
};
use super::world::{asteroid_balance_data, AsteroidBalanceData};

/// Wire format version of the balance payload. The client refuses a version
/// it does not recognize rather than guessing at it — an out-of-date client
/// would otherwise render wrong numbers, which is worse than saying it
/// cannot render them. Bump this whenever the payload's shape or the meaning
/// of a field changes, in step with `BALANCE_SCHEMA_VERSION` in
/// `src/state/balance-catalog.ts`.
pub(super) const BALANCE_SCHEMA_VERSION: u32 = 3;

/// The authoritative balance rules, projected for the client (ROADMAP P2.6).
///
/// This type exists because the client carries **no** balance numbers of its
/// own: it computes every cost, duration, and production preview from these
/// parameters, so a preview can never quietly disagree with what the server
/// charges. It deliberately spans domains — module catalog, crew, asteroids —
/// because it is one wire payload, and lives here rather than in any one of
/// those modules so no domain owns the others' constants. Mirrors the TS
/// `BalanceCatalogData` in `src/state/game-state-types.ts` — keep the two in
/// sync, and bump `BALANCE_SCHEMA_VERSION` when they change together.
///
/// Server-side-only parameters stay off this payload: asteroid `seed_count`
/// and `max_miners` parameterize seeding and mining verification, and the
/// client has nothing to render from them.
#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct BalanceCatalogData {
    pub schema_version: u32,
    pub modules: Vec<ModuleCatalogData>,
    pub base_build_times_ms: &'static [u64; 10],
    pub post_level_10_build_time_ms: u64,
    pub construction_cost_level_one: u64,
    pub construction_cost_numerator: u64,
    pub construction_cost_denominator: u64,
    pub production_numerator: u64,
    pub production_denominator: u64,
    pub production_precision: u64,
    pub ticks_per_minute: u64,
    pub operational_cost_start_level: u32,
    pub high_tech_cost_start_level: u32,
    /// Global progression ceiling. The Command Module is subject to this cap
    /// too; it continues to gate every non-Command module below it.
    pub max_module_level: u32,
    pub supplemental_cost_numerator: u64,
    pub supplemental_cost_denominator: u64,
    pub hire_cost_biological: u64,
    pub hire_time_ms: u64,
    pub asteroids: AsteroidBalanceData,
}

/// Assemble the balance payload from the authoritative constants. Every
/// field reads its own domain's constant rather than repeating a literal, so
/// the wire payload cannot drift from the rules it describes.
pub(super) fn balance_catalog_data() -> BalanceCatalogData {
    BalanceCatalogData {
        schema_version: BALANCE_SCHEMA_VERSION,
        modules: module_catalog_data(),
        base_build_times_ms: &BASE_BUILD_TIMES_MS,
        post_level_10_build_time_ms: POST_LEVEL_10_BUILD_TIME_MS,
        construction_cost_level_one: CONSTRUCTION_COST_LEVEL_ONE,
        construction_cost_numerator: CONSTRUCTION_COST_NUMERATOR,
        construction_cost_denominator: CONSTRUCTION_COST_DENOMINATOR,
        production_numerator: PRODUCTION_NUMERATOR,
        production_denominator: PRODUCTION_DENOMINATOR,
        production_precision: PRODUCTION_PRECISION,
        ticks_per_minute: TICKS_PER_MINUTE,
        operational_cost_start_level: OPERATIONAL_COST_START_LEVEL,
        high_tech_cost_start_level: HIGH_TECH_COST_START_LEVEL,
        max_module_level: MAX_MODULE_LEVEL,
        supplemental_cost_numerator: SUPPLEMENTAL_COST_NUMERATOR,
        supplemental_cost_denominator: SUPPLEMENTAL_COST_DENOMINATOR,
        hire_cost_biological: HIRE_COST_BIOLOGICAL,
        hire_time_ms: HIRE_TIME_MS,
        asteroids: asteroid_balance_data(),
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn the_payload_reports_the_constants_the_rules_actually_use() {
        // The client reproduces the cost and production curves from these
        // parameters, so a payload that disagrees with the server's own
        // constants would desync every preview without failing anywhere.
        let balance = balance_catalog_data();
        assert_eq!(
            balance.construction_cost_level_one,
            CONSTRUCTION_COST_LEVEL_ONE
        );
        assert_eq!(
            (
                balance.construction_cost_numerator,
                balance.construction_cost_denominator
            ),
            (CONSTRUCTION_COST_NUMERATOR, CONSTRUCTION_COST_DENOMINATOR)
        );
        assert_eq!(
            (balance.production_numerator, balance.production_denominator),
            (PRODUCTION_NUMERATOR, PRODUCTION_DENOMINATOR)
        );
        assert_eq!(balance.ticks_per_minute, TICKS_PER_MINUTE);
        assert_eq!(
            (
                balance.operational_cost_start_level,
                balance.high_tech_cost_start_level
            ),
            (OPERATIONAL_COST_START_LEVEL, HIGH_TECH_COST_START_LEVEL)
        );
        assert_eq!(balance.max_module_level, MAX_MODULE_LEVEL);
        // Every catalog entry reaches the client; the ship cannot render a
        // type it was never told about.
        assert_eq!(
            balance.modules.len(),
            super::super::modules::MODULE_CATALOG.len()
        );
    }
}
