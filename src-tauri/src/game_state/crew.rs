use serde::Serialize;

use super::resources::{ResourceCounts, ResourceKind};
use super::state::{scaled_ms, ServerPush, ServerState};

/// A crew recruitment in flight (ROADMAP P1.10) — one at a time, same timer
/// shape as a module's pending build. Mirrors the TS `PendingHire` in
/// `src/state/game-state.ts` — keep the two in sync.
#[derive(Serialize, serde::Deserialize, Clone, Debug)]
#[serde(rename_all = "camelCase")]
pub struct PendingHire {
    pub dispatched_at: u64,
    pub completes_at: u64,
}

/// The ship's crew state (ROADMAP P1.10): head count plus any recruitment in
/// flight. Like ModuleData, the struct doubles as its own event payload — a
/// crew push carries the full current snapshot. Capacity is not on the wire:
/// it derives from the module snapshot (crew_capacity / the TS
/// crewCapacityForModules mirror). Mirrors the TS `CrewData` in
/// `src/state/game-state.ts` — keep the two in sync.
#[derive(Serialize, serde::Deserialize, Clone, Debug)]
#[serde(rename_all = "camelCase")]
pub struct CrewData {
    pub crew: u32,
    pub pending_hire: Option<PendingHire>,
}

/// Result of a verified hire request: the crew state with the recruitment
/// pending, plus the resource counts after the cost was deducted.
#[derive(Serialize, Debug)]
pub struct CrewActionResponse {
    pub crew: CrewData,
    pub resources: ResourceCounts,
}

/// Biological-material cost of one crew hire, multiplied by the new head
/// count — linear, not the doubling stub: hiring is a repeat purchase
/// (ROADMAP P1.10). Balancing stub → P2.6. Mirrored display-only as
/// HIRE_COST_BIOLOGICAL in `src/ship/module-catalog.ts` — keep the two in sync.
const HIRE_COST_BIOLOGICAL: u64 = 20;

/// Recruitment time per hire. Balancing stub → P2.6. Mirrored display-only
/// as HIRE_TIME_MS in `src/ship/module-catalog.ts` — keep the two in sync.
const HIRE_TIME_MS: u64 = 30_000;

/// A new player starts with no crew (ROADMAP P1.10) and hires from scratch —
/// the first recruitment is a natural early goal (and a future tutorial
/// step). The Command Module's baseline berths make it possible before any
/// Crew Quarters exists, and its baseline production is crew-independent, so
/// an empty ship still runs.
pub(super) const STARTING_CREW: u32 = 0;

impl ServerState {
    pub(super) fn crew_data(&self) -> CrewData {
        CrewData {
            crew: self.crew,
            pending_hire: self.pending_hire.clone(),
        }
    }

    /// Verify and execute a hire request (ROADMAP P1.10): one recruitment at
    /// a time, the new head must fit the berths (a pending hire counts
    /// against them), and the biological cost — linear in the new head count
    /// — must be affordable. Deducts the cost and returns the crew state
    /// with the recruitment pending.
    pub(super) fn hire_crew(&mut self, now_ms: u64) -> Result<CrewActionResponse, String> {
        self.accrue_production(now_ms);
        self.settle_hire(now_ms);
        if self.pending_hire.is_some() {
            return Err("a crew member is already being recruited".to_string());
        }
        let capacity = self.crew_capacity();
        if self.crew + 1 > capacity {
            return Err(format!(
                "no berths free: crew {} of {capacity} — build or upgrade Crew Quarters",
                self.crew
            ));
        }
        let cost = HIRE_COST_BIOLOGICAL.saturating_mul(self.crew as u64 + 1);
        self.resources.spend(ResourceKind::Biological, cost)?;
        self.resources_dirty = true;
        self.pending_hire = Some(PendingHire {
            dispatched_at: now_ms,
            completes_at: now_ms + scaled_ms(HIRE_TIME_MS),
        });
        Ok(CrewActionResponse {
            crew: self.crew_data(),
            resources: self.resources,
        })
    }

    /// Complete a recruitment whose timer has run out (ROADMAP P1.10):
    /// production must already be settled to the completion moment (see
    /// settle() / hire_crew ordering) so the staffing-ratio change is never
    /// credited retroactively. Queues the Crew push and a feed notification.
    pub(super) fn settle_hire(&mut self, now_ms: u64) {
        let Some(pending) = &self.pending_hire else {
            return;
        };
        if now_ms < pending.completes_at {
            return;
        }
        let completed_at = pending.completes_at;
        self.crew += 1;
        self.pending_hire = None;
        // Crew is the player's own ship state — never interest-area
        // filtered.
        self.queue_push(ServerPush::Crew(self.crew_data()));
        self.push_notification(
            "crew-hired",
            format!("A new crew member came aboard ({} total)", self.crew),
            completed_at,
        );
    }
}

#[cfg(test)]
mod tests {
    use super::super::test_support::*;
    use super::*;

    #[test]
    fn hire_verifies_berths_cost_and_single_recruitment() {
        let mut s = ServerState::new(0);
        // A full ship (head count at the berth total) can't recruit.
        s.crew = s.crew_capacity();
        let err = s.hire_crew(0).unwrap_err();
        assert!(err.contains("no berths"), "{err}");
        insert_settled(&mut s, "module-quarters", "crew-quarters", 1);
        let err = s.hire_crew(0).unwrap_err();
        assert!(err.contains("not enough biological"), "{err}");
        // Linear cost: the third head costs 3 * the base.
        s.resources.biological = HIRE_COST_BIOLOGICAL * 3;
        let response = s.hire_crew(0).unwrap();
        assert_eq!(response.crew.crew, 2);
        assert_eq!(
            response.crew.pending_hire.unwrap().completes_at,
            HIRE_TIME_MS
        );
        assert_eq!(response.resources.biological, 0);
        let err = s.hire_crew(1).unwrap_err();
        assert!(err.contains("already being recruited"), "{err}");
    }

    #[test]
    fn hire_completion_queues_crew_push_and_notification() {
        let mut s = ServerState::new(0);
        // A new player's very first recruitment: no crew, baseline berths.
        s.resources.biological = HIRE_COST_BIOLOGICAL;
        s.hire_crew(0).unwrap();
        s.drain_pushes(); // discard the hire's own spend push
        s.settle(HIRE_TIME_MS);
        let pushes = s.drain_pushes();
        assert!(pushes.iter().any(|p| matches!(
            p,
            ServerPush::Crew(c) if c.crew == 1 && c.pending_hire.is_none()
        )));
        assert!(pushes.iter().any(|p| matches!(
            p,
            ServerPush::Notification(n) if n.kind == "crew-hired" && !n.read
        )));
        assert_eq!(s.crew, 1);
        // Settling again at the same time re-announces nothing.
        s.settle(HIRE_TIME_MS);
        assert!(s.drain_pushes().is_empty());
    }

    #[test]
    fn hire_settles_after_production_so_the_ratio_is_not_retroactive() {
        let mut s = ServerState::new(0);
        // A level-4 refinery with no crew at all: the floor rate, 8/tick.
        insert_settled(&mut s, "module-refinery", "ore-refinery", 4);
        s.crew = 0;
        s.resources.biological = HIRE_COST_BIOLOGICAL;
        s.hire_crew(0).unwrap();
        // Settling exactly at the completion accrues every elapsed tick at
        // the *old* staffing first; only then does the new head land.
        s.settle(HIRE_TIME_MS);
        let ticks = HIRE_TIME_MS / TICK;
        assert_eq!(s.resources.construction, ticks * (8 + 1));
        assert_eq!(s.crew, 1);
        // The next tick runs at the improved ratio: 16 * (4 + 1) / 8 = 10.
        s.accrue_production(HIRE_TIME_MS + TICK);
        assert_eq!(s.resources.construction, ticks * 9 + 10 + 1);
    }
}
