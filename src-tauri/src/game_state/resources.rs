use serde::Serialize;

/// One of the four material resources a module can produce, a build can
/// cost, or an asteroid can yield. Excludes `credits`, which is trade-only
/// and never produced by a module. Serializes to the TS `ResourceKind` key
/// strings ("construction", "highTech", ...) in `src/state/game-state-types.ts` — keep
/// the two in sync.
#[derive(Serialize, serde::Deserialize, Clone, Copy, PartialEq, Eq, Debug)]
#[serde(rename_all = "camelCase")]
pub enum ResourceKind {
    Construction,
    HighTech,
    Biological,
    Fuel,
}

/// Player-facing name of a resource for server-composed notification text.
pub(super) fn resource_display_name(kind: ResourceKind) -> &'static str {
    match kind {
        ResourceKind::Construction => "construction material",
        ResourceKind::HighTech => "high-tech material",
        ResourceKind::Biological => "biological material",
        ResourceKind::Fuel => "fuel",
    }
}

/// One of the five trade-eligible types a Trading Post deal can exchange
/// (ROADMAP P1.12): the four material resources plus the trade currency.
/// Serializes to the full TS `ResourceKind` key set in `src/state/game-state-types.ts`
/// ("construction", ..., "credits") — keep the two in sync.
#[derive(Serialize, serde::Deserialize, Clone, Copy, PartialEq, Eq, Debug)]
#[serde(rename_all = "camelCase")]
pub enum TradeKind {
    Construction,
    HighTech,
    Biological,
    Fuel,
    Credits,
}

pub(super) const TRADE_KINDS: [TradeKind; 5] = [
    TradeKind::Construction,
    TradeKind::HighTech,
    TradeKind::Biological,
    TradeKind::Fuel,
    TradeKind::Credits,
];

impl TradeKind {
    /// The material resource behind this trade type, or None for credits.
    pub(super) fn material(self) -> Option<ResourceKind> {
        match self {
            TradeKind::Construction => Some(ResourceKind::Construction),
            TradeKind::HighTech => Some(ResourceKind::HighTech),
            TradeKind::Biological => Some(ResourceKind::Biological),
            TradeKind::Fuel => Some(ResourceKind::Fuel),
            TradeKind::Credits => None,
        }
    }
}

/// The four material resources, in wire order — the iteration order for any
/// pass that has to touch every material (production accrual, sub-unit
/// carry). Credits are excluded: they are trade-only, never produced.
pub(super) const MATERIAL_KINDS: [ResourceKind; 4] = [
    ResourceKind::Construction,
    ResourceKind::HighTech,
    ResourceKind::Biological,
    ResourceKind::Fuel,
];

/// Player-facing name of a trade-eligible type for error/notification text.
pub(super) fn trade_display_name(kind: TradeKind) -> &'static str {
    match kind.material() {
        Some(res) => resource_display_name(res),
        None => "credits",
    }
}

/// The player's stock of the four material resources plus the generic trade
/// currency ("credits" — placeholder term, renamed in the display layer if
/// needed). Mirrors the TS `ResourceCounts` in `src/state/game-state-types.ts` — keep
/// the two in sync.
#[derive(Serialize, serde::Deserialize, Clone, Copy, Debug)]
#[serde(rename_all = "camelCase")]
pub struct ResourceCounts {
    pub construction: u64,
    pub high_tech: u64,
    pub biological: u64,
    pub fuel: u64,
    pub credits: u64,
}

impl ResourceCounts {
    pub(super) fn get(&self, kind: ResourceKind) -> u64 {
        match kind {
            ResourceKind::Construction => self.construction,
            ResourceKind::HighTech => self.high_tech,
            ResourceKind::Biological => self.biological,
            ResourceKind::Fuel => self.fuel,
        }
    }

    fn slot_mut(&mut self, kind: ResourceKind) -> &mut u64 {
        match kind {
            ResourceKind::Construction => &mut self.construction,
            ResourceKind::HighTech => &mut self.high_tech,
            ResourceKind::Biological => &mut self.biological,
            ResourceKind::Fuel => &mut self.fuel,
        }
    }

    pub(super) fn add(&mut self, kind: ResourceKind, amount: u64) {
        let slot = self.slot_mut(kind);
        *slot = slot.saturating_add(amount);
    }

    pub(super) fn set(&mut self, kind: ResourceKind, amount: u64) {
        *self.slot_mut(kind) = amount;
    }

    pub(super) const ZERO: Self = Self {
        construction: 0,
        high_tech: 0,
        biological: 0,
        fuel: 0,
        credits: 0,
    };

    /// Add at most what fits under `cap`, returning the amount actually
    /// stored — income past the storage cap is lost (ROADMAP P1.11). Stock
    /// already above the cap is never confiscated; it just leaves no room.
    pub(super) fn add_capped(&mut self, kind: ResourceKind, amount: u64, cap: u64) -> u64 {
        let accepted = amount.min(cap.saturating_sub(self.get(kind)));
        self.add(kind, accepted);
        accepted
    }

    /// Deduct `amount` of a material resource, failing (untouched) when the
    /// stock doesn't cover it. Every module cost is stubbed as
    /// construction-only for now (ROADMAP P1.4) — fine-tuned to a real
    /// per-resource mix later; crew hiring spends biological (ROADMAP P1.10).
    pub(super) fn spend(&mut self, kind: ResourceKind, amount: u64) -> Result<(), String> {
        let have = self.get(kind);
        if have < amount {
            return Err(format!(
                "not enough {}: need {amount}, have {have}",
                resource_display_name(kind)
            ));
        }
        *self.slot_mut(kind) -= amount;
        Ok(())
    }

    /// Deduct a verified multi-material cost atomically: every material is
    /// checked before any balance changes, so a rejected mixed cost never
    /// partially spends the player's resources.
    ///
    /// The cost is a `ResourceCounts` — one keyed slot per material —
    /// rather than a list of (kind, amount) line items, deliberately. A list
    /// can name the same material twice, and each entry would then be
    /// checked against the *full* balance while both are subtracted: 100
    /// construction "affords" two 60-construction entries and then
    /// underflows. Keyed slots make that unrepresentable, and match the
    /// client's `ModuleCost` map shape so the two sides can't disagree about
    /// what a mixed cost means.
    ///
    /// Credits are not spendable here — they are trade-only (P1.12) and go
    /// through the trade path. A credits cost would be a new concept, so it
    /// trips in tests rather than being silently free.
    pub(super) fn spend_all(&mut self, costs: &ResourceCounts) -> Result<(), String> {
        debug_assert_eq!(costs.credits, 0, "credits are trade-only, not a cost");
        for kind in MATERIAL_KINDS {
            let amount = costs.get(kind);
            if self.get(kind) < amount {
                return Err(format!(
                    "not enough {}: need {amount}, have {}",
                    resource_display_name(kind),
                    self.get(kind)
                ));
            }
        }
        for kind in MATERIAL_KINDS {
            *self.slot_mut(kind) -= costs.get(kind);
        }
        Ok(())
    }

    /// Trade-side accessors (ROADMAP P1.12) — like get/add/spend, but over
    /// the five trade-eligible types: the four materials plus credits.
    pub(super) fn get_trade(&self, kind: TradeKind) -> u64 {
        match kind.material() {
            Some(res) => self.get(res),
            None => self.credits,
        }
    }

    pub(super) fn add_trade(&mut self, kind: TradeKind, amount: u64) {
        match kind.material() {
            Some(res) => self.add(res, amount),
            None => self.credits = self.credits.saturating_add(amount),
        }
    }

    pub(super) fn spend_trade(&mut self, kind: TradeKind, amount: u64) -> Result<(), String> {
        match kind.material() {
            Some(res) => self.spend(res, amount),
            None => {
                if self.credits < amount {
                    return Err(format!(
                        "not enough credits: need {amount}, have {}",
                        self.credits
                    ));
                }
                self.credits -= amount;
                Ok(())
            }
        }
    }
}
