use serde::Serialize;
use std::collections::BTreeMap;

use super::resources::{ResourceCounts, ResourceKind};
use super::state::{deadline_after, scaled_ms, NotificationPayload, ServerPush, ServerState};

/// A crew recruitment in flight (ROADMAP P1.10) — one at a time, same timer
/// shape as a module's pending build. Mirrors the TS `PendingHire` in
/// `src/state/game-state-types.ts` — keep the two in sync.
#[derive(Serialize, serde::Deserialize, Clone, Debug)]
#[serde(rename_all = "camelCase")]
pub struct PendingHire {
    pub action_id: String,
    pub dispatched_at: u64,
    pub completes_at: u64,
}

/// The ship's crew state (ROADMAP P1.10): head count plus any recruitment in
/// flight. Like ModuleData, the struct doubles as its own event payload — a
/// crew push carries the full current snapshot. Capacity is not on the wire:
/// it derives from the module snapshot (crew_capacity / the TS
/// crewCapacityForModules mirror). Mirrors the TS `CrewData` in
/// `src/state/game-state-types.ts` — keep the two in sync.
#[derive(Serialize, serde::Deserialize, Clone, Debug)]
#[serde(rename_all = "camelCase")]
pub struct CrewData {
    pub crew: u32,
    pub pending_hire: Option<PendingHire>,
    /// Complete server-calculated staffing state for every settled module
    /// that demands crew. P2.8's client renders this directly rather than
    /// reproducing allocation rules locally.
    pub assignments: Vec<CrewAssignmentData>,
}

/// One module's current crew allocation. Mirrors `CrewAssignmentData` in
/// `src/state/game-state-types.ts` — keep the two in sync.
#[derive(Serialize, serde::Deserialize, Clone, Debug)]
#[serde(rename_all = "camelCase")]
pub struct CrewAssignmentData {
    pub module_id: String,
    pub assigned: u32,
    pub required: u32,
}

/// Result of a verified hire request: the crew state with the recruitment
/// pending, plus the resource counts after the cost was deducted.
#[derive(Serialize, Debug)]
pub struct CrewActionResponse {
    pub action_id: String,
    pub crew: CrewData,
    pub resources: ResourceCounts,
}

/// Result of a verified P2.8 crew reassignment. `CrewData` is its own
/// snapshot event: the response and a future server push take the same
/// client apply path.
#[derive(Serialize, Debug)]
pub struct CrewAssignmentResponse {
    pub action_id: String,
    pub crew: CrewData,
}

/// Biological-material cost of one crew hire, multiplied by the new head
/// count — linear, not the doubling stub: hiring is a repeat purchase
/// (ROADMAP P1.10). Sent to the client in the server-owned balance catalog.
pub(super) const HIRE_COST_BIOLOGICAL: u64 = 20;

/// Recruitment time per hire. Sent to the client in the server-owned balance
/// catalog.
pub(super) const HIRE_TIME_MS: u64 = 60_000;

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
            assignments: self.crew_assignments_data(),
        }
    }

    fn crew_assignments_data(&self) -> Vec<CrewAssignmentData> {
        let mut assignments = BTreeMap::new();
        for module in self.modules.values() {
            let required = self.crew_required_for_module(module);
            if required == 0 {
                continue;
            }
            assignments.insert(
                module.module_id.clone(),
                CrewAssignmentData {
                    module_id: module.module_id.clone(),
                    assigned: self
                        .crew_assignments
                        .get(&module.module_id)
                        .copied()
                        .unwrap_or(0),
                    required,
                },
            );
        }
        assignments.into_values().collect()
    }

    pub(super) fn assigned_crew(&self, module_id: &str) -> u32 {
        self.crew_assignments.get(module_id).copied().unwrap_or(0)
    }

    /// Verify and apply one module's requested head count. Production is
    /// accrued first, so a reassignment only affects time after its server
    /// timestamp. No client can assign more than the current crew pool or a
    /// module's own demand.
    pub(super) fn assign_crew(
        &mut self,
        module_id: &str,
        assigned: u32,
        now_ms: u64,
    ) -> Result<CrewAssignmentResponse, String> {
        self.accrue_production(now_ms);
        self.settle_hire(now_ms);
        let module = self
            .modules
            .get(module_id)
            .ok_or_else(|| format!("unknown module: {module_id:?}"))?;
        let required = self.crew_required_for_module(module);
        if required == 0 {
            return Err(format!("module {module_id:?} does not use crew"));
        }
        if assigned > required {
            return Err(format!(
                "module {module_id:?} needs at most {required} crew"
            ));
        }
        let assigned_elsewhere = self
            .crew_assignments
            .iter()
            .filter(|(id, _)| id.as_str() != module_id)
            .map(|(_, count)| *count)
            .sum::<u32>();
        if assigned_elsewhere.saturating_add(assigned) > self.crew {
            return Err(format!(
                "only {} unassigned crew available",
                self.crew.saturating_sub(assigned_elsewhere)
            ));
        }
        if assigned == 0 {
            self.crew_assignments.remove(module_id);
        } else {
            self.crew_assignments
                .insert(module_id.to_string(), assigned);
        }
        let action_id = self.next_event_id();
        Ok(CrewAssignmentResponse {
            action_id,
            crew: self.crew_data(),
        })
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
            action_id: self.next_event_id(),
            dispatched_at: now_ms,
            completes_at: deadline_after(now_ms, scaled_ms(HIRE_TIME_MS)),
        });
        Ok(CrewActionResponse {
            action_id: self
                .pending_hire
                .as_ref()
                .expect("hire is pending")
                .action_id
                .clone(),
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
        let action_id = pending.action_id.clone();
        self.crew += 1;
        self.pending_hire = None;
        // Crew is the player's own ship state — never interest-area
        // filtered.
        self.queue_push(ServerPush::Crew(self.crew_data()));
        self.push_notification(
            action_id,
            NotificationPayload::CrewHired { crew: self.crew },
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
        s.resources.biological = 0;
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
    fn hire_deadline_near_the_timestamp_limit_does_not_wrap() {
        let now = u64::MAX - 1;
        let mut s = ServerState::new(now);
        s.resources.biological = HIRE_COST_BIOLOGICAL;

        let response = s.hire_crew(now).unwrap();

        let pending = response.crew.pending_hire.unwrap();
        assert_eq!(pending.dispatched_at, now);
        assert_eq!(pending.completes_at, u64::MAX);
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
            ServerPush::Notification(n) if n.payload.kind() == "crew-hired" && !n.read
        )));
        assert_eq!(s.crew, 1);
        // Settling again at the same time re-announces nothing.
        s.settle(HIRE_TIME_MS);
        assert!(s.drain_pushes().is_empty());
    }

    #[test]
    fn hiring_crew_does_not_implicitly_staff_a_module() {
        let mut s = ServerState::new(0);
        s.resources.construction = 0;
        // A level-4 refinery (37 construction/minute) with no assigned crew.
        insert_settled(&mut s, "module-refinery", "ore-refinery", 4);
        s.crew = 0;
        s.resources.biological = HIRE_COST_BIOLOGICAL;
        s.hire_crew(0).unwrap();
        // Settling exactly at completion accrues every elapsed tick before the
        // new head arrives. The head remains in the unassigned pool until the
        // player deliberately allocates it.
        s.settle(HIRE_TIME_MS);
        assert_eq!(s.resources.construction, 19);
        assert_eq!(s.crew, 1);
        // The next tick has the Command Module plus the refinery's unassigned
        // 1/(level+1) baseline output.
        s.accrue_production(HIRE_TIME_MS + TICK);
        assert_eq!(s.resources.construction, 20);
    }

    #[test]
    fn assigning_crew_settles_old_production_before_changing_output() {
        let mut s = ServerState::new(0);
        s.resources.construction = 0;
        s.crew = 1;
        insert_settled(&mut s, "module-refinery", "ore-refinery", 1);
        s.assign_crew("module-refinery", 1, 0).unwrap();

        // Removing the crew at one tick first credits that full staffed
        // interval: Command Module 12 + refinery 24 = 36/minute.
        let response = s.assign_crew("module-refinery", 0, TICK).unwrap();
        assert_eq!(s.resources.construction, 3);
        assert_eq!(response.crew.assignments[0].assigned, 0);

        // The following interval keeps the refinery's 1/(level+1) baseline.
        s.accrue_production(2 * TICK);
        assert_eq!(s.resources.construction, 5);
    }
}
