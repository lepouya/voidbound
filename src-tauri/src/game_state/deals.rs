use serde::Serialize;

use super::modules::{scale_for_level, TRADING_POST_MODULE_TYPE};
use super::resources::{trade_display_name, ResourceCounts, TradeKind, TRADE_KINDS};
use super::state::{player_identity, NotificationPayload, SeedRng, ServerPush, ServerState};

/// One UTC day in ms. The deal shop resets at fixed 00:00 UTC boundaries
/// (README's "resetting at a fixed point" principle), not a rolling window.
pub(super) const DAY_MS: u64 = 86_400_000;

/// UTC day index of an epoch-ms timestamp — the `day` in deal ids and the
/// daily-reset boundary test.
pub(super) fn utc_day_index(now_ms: u64) -> u64 {
    now_ms / DAY_MS
}

/// Credits-per-resource-unit exchange rate. With the four resources still
/// value-equivalent (all balancing is stubbed until P2.6), deal sizing works
/// in "units" and converts a credits side through this. Balancing stub →
/// P2.6.
const CREDITS_PER_RESOURCE_UNIT: u64 = 1;

/// Deal give-side size in units at Trading Post level 1; doubles per level
/// (scale_for_level). Balancing stub → P2.6.
const DEAL_GIVE_BASE_UNITS: u64 = 40;

/// The give side is capped at this fraction of the player's current storage
/// cap for the resource (cap / 5 = 20%) — the single rule that keeps deals
/// affordable at every progression stage and makes "trade a million
/// resources" structurally impossible. Credits are uncapped and skip it.
/// Balancing stub → P2.6.
const DEAL_GIVE_CAP_DIVISOR: u64 = 5;

/// Freebie get-amount band in units (inclusive) — a separate, deliberately
/// small band, not the deal-sizing rule: the daily freebie is a growth
/// nudge, never a big win. Balancing stub → P2.6.
const DEAL_FREEBIE_MIN_UNITS: u64 = 10;

const DEAL_FREEBIE_MAX_UNITS: u64 = 30;

/// Credits cost of each refresh within a day, indexed by refreshes already
/// used: the first is free, then doubling, hard-capped at the array length
/// (5/day). Mirrored display-only as DEAL_REFRESH_COSTS_CREDITS in
/// `src/ship/trade-catalog.ts` — keep the two in sync. Balancing stub → P2.6.
const DEAL_REFRESH_COSTS_CREDITS: [u64; 5] = [0, 10, 20, 40, 80];

/// Deal slot count by Trading Post level: 3 at level 1, +1 every 2 levels,
/// capped at 6. Level 0 (no settled post yet — deals still generate, the
/// shop just can't open) uses the level-1 count. Slot count is server data
/// (the deal list's length) — the client never derives it.
fn deal_slot_count(trading_post_level: u32) -> u32 {
    (3 + trading_post_level.saturating_sub(1) / 2).min(6)
}

/// How player-favorable a deal is: the rarity's bonus multiplies the get
/// side only (the give side keeps the affordability cap). Serializes to the
/// TS `DealRarity` strings in `src/state/game-state-types.ts` — keep the two in sync.
#[derive(Serialize, serde::Deserialize, Clone, Copy, PartialEq, Eq, Debug)]
#[serde(rename_all = "camelCase")]
pub enum DealRarity {
    Common,
    Uncommon,
    Rare,
}

/// (rarity, roll weight out of 100, get-side bonus percent). Weights and
/// bonuses are balancing stubs → P2.6; display styling lives in
/// `src/ship/trade-catalog.ts`.
const DEAL_RARITIES: [(DealRarity, u64, u64); 3] = [
    (DealRarity::Common, 70, 20),
    (DealRarity::Uncommon, 25, 50),
    (DealRarity::Rare, 5, 100),
];

fn rarity_bonus_pct(rarity: DealRarity) -> u64 {
    DEAL_RARITIES
        .iter()
        .find(|(r, ..)| *r == rarity)
        .map(|&(_, _, bonus)| bonus)
        .unwrap_or(0)
}

fn roll_rarity(rng: &mut SeedRng) -> DealRarity {
    let mut roll = rng.range(1, 100);
    for &(rarity, weight, _) in &DEAL_RARITIES {
        if roll <= weight {
            return rarity;
        }
        roll -= weight;
    }
    DealRarity::Common
}

/// One side of a deal: a trade-eligible type and its amount. Mirrors the TS
/// `DealSide` in `src/state/game-state-types.ts` — keep the two in sync.
#[derive(Serialize, serde::Deserialize, Clone, Copy, Debug)]
#[serde(rename_all = "camelCase")]
pub struct DealSide {
    pub kind: TradeKind,
    pub amount: u64,
}

/// One deal slot in the Trading Post shop (ROADMAP P1.12). Give and get
/// types always differ (server-enforced at generation *and* acceptance);
/// `give: None` is the once-daily freebie — refreshes never mint a new one.
/// Mirrors the TS `DealData` in `src/state/game-state-types.ts` — keep the two in sync.
#[derive(Serialize, serde::Deserialize, Clone, Debug)]
#[serde(rename_all = "camelCase")]
pub struct DealData {
    /// Stable id: "deal-<day>-<slot>-<generation>" (generation = refreshes
    /// used when this batch was rolled; 0 for the daily set).
    pub deal_id: String,
    /// 0..slots-1, stable within a batch.
    pub slot: u32,
    pub rarity: DealRarity,
    /// What the player pays; None = the daily freebie.
    pub give: Option<DealSide>,
    pub get: DealSide,
    /// Greyed out client-side once true; a refresh replaces the whole batch.
    pub accepted: bool,
}

/// The whole deal-shop state — day, refreshes used, and every current slot.
/// Following the ModuleData pattern, the struct doubles as its own event
/// payload: a deals push/response carries the full current list. Mirrors the
/// TS `DealsData` in `src/state/game-state-types.ts` — keep the two in sync.
#[derive(Serialize, serde::Deserialize, Clone, Debug)]
#[serde(rename_all = "camelCase")]
pub struct DealsData {
    pub day_index: u64,
    /// Refreshes used since the daily reset — indexes the doubling cost
    /// table client-side for the Refresh button's price tag.
    pub refreshes_used: u32,
    pub deals: Vec<DealData>,
}

/// Result of a verified accept/refresh request: the full deal state plus the
/// resource counts after the exchange/cost.
#[derive(Serialize, Debug)]
pub struct DealActionResponse {
    pub action_id: String,
    pub deals: DealsData,
    pub resources: ResourceCounts,
}

/// Deterministic per-deal RNG seed from (player id, day, slot, generation) —
/// the same reproducibility precedent as seed_asteroids: regeneration is
/// server-cheap and replayable. FNV-1a over the player id, then odd-constant
/// mixing; never 0 (xorshift's fixed point).
fn deal_seed(player_id: &str, day: u64, slot: u32, generation: u32) -> u64 {
    let mut seed: u64 = 0xcbf2_9ce4_8422_2325;
    for byte in player_id.bytes() {
        seed ^= byte as u64;
        seed = seed.wrapping_mul(0x0000_0100_0000_01b3);
    }
    seed ^= day.wrapping_mul(0x9E37_79B9_7F4A_7C15);
    seed ^= (slot as u64 + 1).wrapping_mul(0xBF58_476D_1CE4_E5B9);
    seed ^= (generation as u64 + 1).wrapping_mul(0x94D0_49BB_1331_11EB);
    seed.max(1)
}

/// Units → wire amount for one deal side: a credits side converts through
/// the exchange rate, materials pass through. Never 0.
fn trade_amount(kind: TradeKind, units: u64) -> u64 {
    let amount = match kind {
        TradeKind::Credits => units.saturating_mul(CREDITS_PER_RESOURCE_UNIT),
        _ => units,
    };
    amount.max(1)
}

impl ServerState {
    /// Append fresh deal slots when the Trading Post's settled level raised
    /// the slot count mid-batch (ROADMAP P1.12), so the level-up reward shows
    /// up immediately. Only appends — existing deals (and their accepted
    /// state) are never rerolled: a free reroll on level-up would bypass the
    /// refresh cost. New slots roll deterministically at the current
    /// (day, generation) like the rest of the batch, and are never a freebie.
    pub(super) fn top_up_deal_slots(&mut self) {
        let slots = deal_slot_count(self.trading_post_level()) as usize;
        if self.deals.len() >= slots {
            return;
        }
        for slot in self.deals.len()..slots {
            let deal = self.generate_deal(
                self.deals_day_index,
                slot as u32,
                self.deal_refreshes_used,
                false,
            );
            self.deals.push(deal);
        }
        // Deals are the player's own shop state — never interest-area
        // filtered.
        self.queue_push(ServerPush::Deals(self.deals_data()));
    }

    /// The highest settled Trading Post level, or 0 when none is built —
    /// gates the deal commands and sets slot count / give sizing (ROADMAP
    /// P1.12).
    fn trading_post_level(&self) -> u32 {
        self.modules
            .values()
            .filter(|m| m.module_type == TRADING_POST_MODULE_TYPE)
            .map(|m| m.level)
            .max()
            .unwrap_or(0)
    }

    fn deals_data(&self) -> DealsData {
        DealsData {
            day_index: self.deals_day_index,
            refreshes_used: self.deal_refreshes_used,
            deals: self.deals.clone(),
        }
    }

    /// Roll one deal slot deterministically from (player, day, slot,
    /// generation). A freebie slot gets a small banded gift; a regular slot
    /// exchanges two distinct trade types — give sized by Trading Post level
    /// but capped at a fraction of the player's storage cap, get boosted by
    /// the rolled rarity.
    fn generate_deal(&self, day: u64, slot: u32, generation: u32, freebie: bool) -> DealData {
        let mut rng = SeedRng(deal_seed(&player_identity().id, day, slot, generation));
        let deal_id = format!("deal-{day}-{slot}-{generation}");
        if freebie {
            // Deliberately basic — its own band, not the sizing rule below:
            // a daily growth nudge, never a big win.
            let kind = TRADE_KINDS[(rng.next() % 5) as usize];
            let units = rng.range(DEAL_FREEBIE_MIN_UNITS, DEAL_FREEBIE_MAX_UNITS) / 5 * 5;
            return DealData {
                deal_id,
                slot,
                rarity: DealRarity::Common,
                give: None,
                get: DealSide {
                    kind,
                    amount: trade_amount(kind, units),
                },
                accepted: false,
            };
        }
        let rarity = roll_rarity(&mut rng);
        let give_kind = TRADE_KINDS[(rng.next() % 5) as usize];
        // give ≠ get, always — the get side draws from the other four.
        let others: Vec<TradeKind> = TRADE_KINDS
            .iter()
            .copied()
            .filter(|k| *k != give_kind)
            .collect();
        let get_kind = others[(rng.next() % 4) as usize];
        let base = scale_for_level(DEAL_GIVE_BASE_UNITS, self.trading_post_level().max(1));
        let mut give_units = rng.range(base / 2, base);
        if let Some(res) = give_kind.material() {
            give_units = give_units.min(self.storage_caps().get(res) / DEAL_GIVE_CAP_DIVISOR);
        }
        // Snap to a friendly multiple of 5 (asteroid deposits snap to 10).
        let give_units = (give_units / 5 * 5).max(5);
        let get_units = give_units * (100 + rarity_bonus_pct(rarity)) / 100;
        DealData {
            deal_id,
            slot,
            rarity,
            give: Some(DealSide {
                kind: give_kind,
                amount: trade_amount(give_kind, give_units),
            }),
            get: DealSide {
                kind: get_kind,
                amount: trade_amount(get_kind, get_units),
            },
            accepted: false,
        }
    }

    /// Replace every deal slot with a fresh roll for (day, generation) —
    /// slot count from the current Trading Post level; the freebie only in
    /// the daily (generation 0) batch, in slot 0.
    pub(super) fn regenerate_deals(&mut self, day: u64, generation: u32, with_freebie: bool) {
        let slots = deal_slot_count(self.trading_post_level());
        self.deals = (0..slots)
            .map(|slot| self.generate_deal(day, slot, generation, with_freebie && slot == 0))
            .collect();
    }

    /// Roll the shop over when a new UTC day has started (ROADMAP P1.12):
    /// fresh deals (freebie included), refresh counter reset, the new state
    /// pushed. Runs lazily from the deal commands and snapshot plus eagerly
    /// from the scheduler (the boundary is a deadline). A clock that went
    /// backwards keeps the current batch — the day index only advances.
    pub(super) fn settle_deals(&mut self, now_ms: u64) {
        let today = utc_day_index(now_ms);
        if today <= self.deals_day_index {
            return;
        }
        self.deals_day_index = today;
        self.deal_refreshes_used = 0;
        self.regenerate_deals(today, 0, true);
        // Deals are the player's own shop state — never interest-area
        // filtered.
        self.queue_push(ServerPush::Deals(self.deals_data()));
        // Only worth announcing once the player can actually open the shop.
        if self.trading_post_level() >= 1 {
            let event_id = self.next_event_id();
            self.push_notification(
                event_id,
                NotificationPayload::DealsRefreshed { day_index: today },
                now_ms,
            );
        }
    }

    /// Verify and execute a deal acceptance (ROADMAP P1.12): a settled
    /// Trading Post, a current deal not yet accepted, give ≠ get (a
    /// malformed request can never trade a type against itself), the give
    /// side affordable, and the get side fitting in storage — an explicit
    /// player action is rejected outright rather than clamp-and-lose
    /// (contrast P1.11's passive production overflow). Applies the exchange
    /// and returns the full deal state plus updated counts.
    pub(super) fn accept_deal(
        &mut self,
        deal_id: &str,
        now_ms: u64,
    ) -> Result<DealActionResponse, String> {
        self.accrue_production(now_ms);
        self.settle_deals(now_ms);
        if self.trading_post_level() < 1 {
            return Err("no settled Trading Post to trade at".to_string());
        }
        let deal = self
            .deals
            .iter()
            .find(|d| d.deal_id == deal_id)
            .ok_or_else(|| format!("unknown deal: {deal_id:?}"))?
            .clone();
        if deal.accepted {
            return Err(format!("deal {deal_id:?} was already accepted"));
        }
        if deal.give.is_some_and(|give| give.kind == deal.get.kind) {
            return Err("malformed deal: give and get types match".to_string());
        }
        let cap = self.storage_caps().get_trade(deal.get.kind);
        let have = self.resources.get_trade(deal.get.kind);
        if have.saturating_add(deal.get.amount) > cap {
            return Err(format!(
                "not enough storage for {} {}: {have} of {cap} used",
                deal.get.amount,
                trade_display_name(deal.get.kind),
            ));
        }
        if let Some(give) = deal.give {
            self.resources.spend_trade(give.kind, give.amount)?;
        }
        self.resources.add_trade(deal.get.kind, deal.get.amount);
        self.resources_dirty = true;
        self.deals
            .iter_mut()
            .find(|d| d.deal_id == deal_id)
            .expect("existence checked above")
            .accepted = true;
        Ok(DealActionResponse {
            action_id: self.next_event_id(),
            deals: self.deals_data(),
            resources: self.resources,
        })
    }

    /// Verify and execute a deal refresh (ROADMAP P1.12): a settled Trading
    /// Post and a refresh left today; the first is free, then credits
    /// doubling per use. Replaces every slot — accepted deals included, and
    /// an unclaimed freebie is forfeited: a refresh batch never contains a
    /// new one. Returns the full deal state plus updated counts.
    pub(super) fn refresh_deals(&mut self, now_ms: u64) -> Result<DealActionResponse, String> {
        self.accrue_production(now_ms);
        self.settle_deals(now_ms);
        if self.trading_post_level() < 1 {
            return Err("no settled Trading Post to trade at".to_string());
        }
        let used = self.deal_refreshes_used as usize;
        let Some(&cost) = DEAL_REFRESH_COSTS_CREDITS.get(used) else {
            return Err(format!(
                "no refreshes left today ({used} of {} used)",
                DEAL_REFRESH_COSTS_CREDITS.len()
            ));
        };
        if cost > 0 {
            self.resources.spend_trade(TradeKind::Credits, cost)?;
            self.resources_dirty = true;
        }
        self.deal_refreshes_used += 1;
        self.regenerate_deals(self.deals_day_index, self.deal_refreshes_used, false);
        Ok(DealActionResponse {
            action_id: self.next_event_id(),
            deals: self.deals_data(),
            resources: self.resources,
        })
    }

    /// The current deal state, first rolled over to a new day if one started
    /// — the deals slice of the load_game_state snapshot.
    pub(super) fn deals_snapshot(&mut self, now_ms: u64) -> DealsData {
        self.settle_deals(now_ms);
        self.deals_data()
    }
}

#[cfg(test)]
mod tests {
    use super::super::modules::ModulePendingBuild;
    use super::super::test_support::*;
    use super::*;

    // -- Trading Post deals (ROADMAP P1.12) -----------------------------------

    #[test]
    fn deal_slot_count_grows_every_two_levels_capped_at_six() {
        for (level, expected) in [
            (0, 3),
            (1, 3),
            (2, 3),
            (3, 4),
            (4, 4),
            (5, 5),
            (7, 6),
            (12, 6),
        ] {
            assert_eq!(deal_slot_count(level), expected, "level {level}");
        }
    }

    #[test]
    fn new_state_seeds_the_daily_deals_deterministically() {
        let s1 = ServerState::new(0);
        let s2 = ServerState::new(0);
        assert_eq!(s1.deals.len(), 3);
        assert_eq!(format!("{:?}", s1.deals), format!("{:?}", s2.deals));
        // Slot 0 is the daily freebie; every other slot is a real exchange.
        assert!(s1.deals[0].give.is_none());
        assert!(s1.deals[0].get.amount > 0);
        for deal in &s1.deals[1..] {
            let give = deal.give.expect("only slot 0 is the freebie");
            assert_ne!(give.kind, deal.get.kind);
            assert!(give.amount > 0);
            assert!(deal.get.amount > 0);
            assert!(!deal.accepted);
        }
    }

    #[test]
    fn generated_deals_never_trade_a_type_against_itself_and_respect_the_cap() {
        let s = ServerState::new(0);
        // Baseline storage caps are 1000 per material → give ≤ 200 units.
        for day in 0..40 {
            for generation in 0..6 {
                for slot in 0..6 {
                    let deal = s.generate_deal(day, slot, generation, false);
                    let give = deal.give.expect("non-freebie roll");
                    assert_ne!(give.kind, deal.get.kind, "{}", deal.deal_id);
                    assert!(give.amount >= 1 && deal.get.amount >= 1);
                    if give.kind != TradeKind::Credits {
                        assert!(
                            give.amount <= 200,
                            "{}: give {} exceeds the storage-cap fraction",
                            deal.deal_id,
                            give.amount
                        );
                    }
                }
            }
        }
    }

    #[test]
    fn deal_commands_require_a_settled_trading_post() {
        let mut s = ServerState::new(0);
        let deal_id = s.deals[1].deal_id.clone();
        assert!(s.accept_deal(&deal_id, 0).is_err());
        assert!(s.refresh_deals(0).is_err());
        // A pending (level 0) post doesn't count.
        insert_settled(&mut s, "module-tp", TRADING_POST_MODULE_TYPE, 0);
        assert!(s.accept_deal(&deal_id, 0).is_err());
        assert!(s.refresh_deals(0).is_err());
    }

    #[test]
    fn accept_deal_applies_the_exchange_once() {
        let mut s = ServerState::new(0);
        insert_settled(&mut s, "module-tp", TRADING_POST_MODULE_TYPE, 1);
        let deal = s.deals[1].clone();
        let give = deal.give.unwrap();
        // Fund exactly the give side.
        s.resources.add_trade(give.kind, give.amount);
        let response = s.accept_deal(&deal.deal_id, 0).unwrap();
        assert_eq!(s.resources.get_trade(give.kind), 0);
        assert_eq!(s.resources.get_trade(deal.get.kind), deal.get.amount);
        assert!(response.deals.deals[1].accepted);
        // A second accept is rejected outright and touches nothing.
        let counts = s.resources;
        assert!(s.accept_deal(&deal.deal_id, 0).is_err());
        assert_eq!(format!("{:?}", s.resources), format!("{counts:?}"));
    }

    #[test]
    fn accept_deal_rejects_an_unaffordable_give_side() {
        let mut s = ServerState::new(0);
        insert_settled(&mut s, "module-tp", TRADING_POST_MODULE_TYPE, 1);
        let deal = s.deals[1].clone();
        // One short of the give amount: rejected, nothing gained.
        let give = deal.give.unwrap();
        s.resources.add_trade(give.kind, give.amount - 1);
        assert!(s.accept_deal(&deal.deal_id, 0).is_err());
        assert_eq!(s.resources.get_trade(deal.get.kind), 0);
        assert!(!s.deals[1].accepted);
    }

    #[test]
    fn freebie_accepts_without_cost() {
        let mut s = ServerState::new(0);
        insert_settled(&mut s, "module-tp", TRADING_POST_MODULE_TYPE, 1);
        let freebie = s.deals[0].clone();
        assert!(freebie.give.is_none());
        s.accept_deal(&freebie.deal_id, 0).unwrap();
        assert_eq!(s.resources.get_trade(freebie.get.kind), freebie.get.amount);
    }

    #[test]
    fn accept_rejects_when_the_get_side_overflows_storage() {
        let mut s = ServerState::new(0);
        insert_settled(&mut s, "module-tp", TRADING_POST_MODULE_TYPE, 1);
        // Hand-rolled deal so the get side and its overflow are exact: an
        // explicit player action must reject, never clamp-and-lose (P1.11's
        // rule is for passive production only).
        s.deals.push(DealData {
            deal_id: "deal-test-overflow".to_string(),
            slot: 99,
            rarity: DealRarity::Common,
            give: Some(DealSide {
                kind: TradeKind::Credits,
                amount: 10,
            }),
            get: DealSide {
                kind: TradeKind::Construction,
                amount: 300,
            },
            accepted: false,
        });
        s.resources.credits = 10;
        s.resources.construction = 900; // cap 1000 — 300 won't fit
        let err = s.accept_deal("deal-test-overflow", 0).unwrap_err();
        assert!(err.contains("storage"), "unexpected error: {err}");
        // Nothing was spent or gained, and the deal stays open.
        assert_eq!(s.resources.credits, 10);
        assert_eq!(s.resources.construction, 900);
        assert!(!s.deals.last().unwrap().accepted);
    }

    #[test]
    fn accept_rejects_a_malformed_same_type_deal() {
        let mut s = ServerState::new(0);
        insert_settled(&mut s, "module-tp", TRADING_POST_MODULE_TYPE, 1);
        s.deals.push(DealData {
            deal_id: "deal-test-same".to_string(),
            slot: 99,
            rarity: DealRarity::Common,
            give: Some(DealSide {
                kind: TradeKind::Fuel,
                amount: 10,
            }),
            get: DealSide {
                kind: TradeKind::Fuel,
                amount: 12,
            },
            accepted: false,
        });
        s.resources.fuel = 100;
        assert!(s.accept_deal("deal-test-same", 0).is_err());
        assert_eq!(s.resources.fuel, 100);
    }

    #[test]
    fn refresh_costs_follow_the_doubling_table_and_cap() {
        let mut s = ServerState::new(0);
        insert_settled(&mut s, "module-tp", TRADING_POST_MODULE_TYPE, 1);
        s.resources.credits = 150; // 0 + 10 + 20 + 40 + 80
        let first = s.refresh_deals(0).unwrap();
        assert_eq!(s.resources.credits, 150); // first is free
        assert_eq!(first.deals.refreshes_used, 1);
        // A refresh batch never contains a new freebie.
        assert!(first.deals.deals.iter().all(|d| d.give.is_some()));
        for expected_remaining in [140, 120, 80, 0] {
            s.refresh_deals(0).unwrap();
            assert_eq!(s.resources.credits, expected_remaining);
        }
        // Hard cap: 5 refreshes a day.
        assert!(s.refresh_deals(0).is_err());
    }

    #[test]
    fn failed_paid_refresh_does_not_consume_the_daily_slot() {
        // CR5.1 regression: spend_trade rejects the credits spend before
        // deal_refreshes_used is bumped, so an unaffordable paid refresh must
        // leave the day's refresh count and credits untouched.
        let mut s = ServerState::new(0);
        insert_settled(&mut s, "module-tp", TRADING_POST_MODULE_TYPE, 1);
        s.refresh_deals(0).unwrap(); // first refresh is free
        assert_eq!(s.deal_refreshes_used, 1);
        s.resources.credits = 5; // second refresh costs 10 — not enough
        let err = s.refresh_deals(0).unwrap_err();
        assert!(err.contains("not enough credits"), "{err}");
        assert_eq!(s.deal_refreshes_used, 1);
        assert_eq!(s.resources.credits, 5);
    }

    #[test]
    fn refresh_replaces_accepted_deals_and_scales_slots_with_level() {
        let mut s = ServerState::new(0);
        insert_settled(&mut s, "module-tp", TRADING_POST_MODULE_TYPE, 5);
        let freebie_id = s.deals[0].deal_id.clone();
        s.accept_deal(&freebie_id, 0).unwrap();
        let response = s.refresh_deals(0).unwrap();
        // Level 5 → 5 slots, all fresh, unaccepted, and freebie-less (the
        // claimed freebie is gone for the day).
        assert_eq!(response.deals.deals.len(), 5);
        assert!(response
            .deals
            .deals
            .iter()
            .all(|d| !d.accepted && d.give.is_some() && d.deal_id != freebie_id));
    }

    #[test]
    fn a_new_utc_day_rolls_the_shop_over() {
        let mut s = ServerState::new(0);
        insert_settled(&mut s, "module-tp", TRADING_POST_MODULE_TYPE, 1);
        s.resources.credits = 10;
        s.refresh_deals(0).unwrap();
        s.refresh_deals(0).unwrap(); // paid: credits now 0
        assert_eq!(s.deal_refreshes_used, 2);
        assert_eq!(s.resources.credits, 0);
        let old_ids: Vec<String> = s.deals.iter().map(|d| d.deal_id.clone()).collect();
        s.settle(DAY_MS + 1);
        assert_eq!(s.deals_day_index, 1);
        assert_eq!(s.deal_refreshes_used, 0);
        // Fresh daily batch: freebie back in slot 0, all-new ids.
        assert!(s.deals[0].give.is_none());
        assert!(s.deals.iter().all(|d| !old_ids.contains(&d.deal_id)));
        // The rollover was pushed, plus a feed notification (a Trading Post
        // is settled, so the player can act on it).
        let pushes = s.drain_pushes();
        assert!(pushes.iter().any(|p| matches!(p, ServerPush::Deals(_))));
        assert!(pushes.iter().any(
            |p| matches!(p, ServerPush::Notification(n) if n.payload.kind() == "deals-refreshed")
        ));
    }

    #[test]
    fn a_trading_post_level_up_adds_deal_slots_mid_batch() {
        let mut s = ServerState::new(0);
        assert_eq!(s.deals.len(), 3);
        // A settled level-2 post with a level-up to 3 in flight (3 → 4
        // slots once it settles).
        insert_settled(&mut s, "module-tp", TRADING_POST_MODULE_TYPE, 2);
        s.modules.get_mut("module-tp").unwrap().pending = Some(ModulePendingBuild {
            action_id: "event-test".to_string(),
            level: 3,
            dispatched_at: 0,
            completes_at: 1_000,
        });
        // Accept a deal first: the top-up must not reroll it.
        let deal = s.deals[1].clone();
        let give = deal.give.unwrap();
        s.resources.add_trade(give.kind, give.amount);
        s.accept_deal(&deal.deal_id, 0).unwrap();
        s.drain_pushes();
        s.settle_modules(1_000);
        // One new slot appended; the existing batch — accepted state
        // included — is untouched, and a top-up never mints a freebie.
        assert_eq!(s.deals.len(), 4);
        assert_eq!(s.deals[1].deal_id, deal.deal_id);
        assert!(s.deals[1].accepted);
        assert!(s.deals[0].give.is_none()); // the day's freebie stays put
        assert!(s.deals[3].give.is_some());
        assert!(!s.deals[3].accepted);
        // The change was pushed so an open shop dialog re-renders.
        let pushes = s.drain_pushes();
        assert!(pushes.iter().any(|p| matches!(p, ServerPush::Deals(_))));
        // Settling again (every read path calls this) is a no-op.
        s.settle_modules(2_000);
        assert_eq!(s.deals.len(), 4);
    }
}
