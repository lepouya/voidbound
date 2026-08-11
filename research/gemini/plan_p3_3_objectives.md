# Implementation Plan: P3.3 Objectives & First-Run Onboarding

> [!NOTE]
> **Prerequisite:** This technical implementation plan is governed by the **P3.1
> Experience Specification Gate** (see
> [voidbound_strategy.md](file:///Users/pouya/projects/voidbound/research/gemini/voidbound_strategy.md)
> §2). It implements the early-game chapter spine designed to guide players
> through their first 30 minutes without forced wait dead-ends.

---

## Overview

Based on our reconciled research into the "Phase 1 / The Hook" of mobile 4X
strategy games and Voidbound's _Hopeful Frontier Colonization_ setting, this
plan outlines the technical implementation of **ROADMAP Task P3.3**.

The goal is to build a persistent, event-modeled objectives system. **Chapter
1** uses a strict linear sequence (one objective exposed at a time) up through
the first expedition to establish the core loop without overwhelming the player.
**Chapter 2 onward** switches to concurrent branching milestones, allowing
players to choose their own priorities across research, mining, and sector
exploration.

---

## 1. Data Model (Rust & TypeScript)

Following the multiplayer-ready event pattern (see `AGENTS.md`), Objectives must
be authoritative and ride the `load_game_state` snapshot.

### Wire Types (`game-state-types.ts`)

```typescript
export type ObjectiveState = "locked" | "in-progress" | "completed" | "claimed";

export interface ObjectiveData {
  objectiveId: string; // e.g., "ch1_hire_crew"
  chapterId: string; // e.g., "chapter_1"
  title: string;
  description: string;
  state: ObjectiveState;
  currentProgress: number; // for tasks like "mine 100 units"
  targetProgress: number;
  rewardCredits: number;
  rewardResource?: { type: string; amount: number };
}

export interface ObjectivesSnapshot {
  activeChapterId: string;
  objectives: ObjectiveData[]; // Only sends relevant/active chapter objectives
}
```

- `GameStateData` will be updated to include `objectives: ObjectivesSnapshot`.
- A new `ServerPush` variant (`type: "objective"`) will push real-time
  progression updates (e.g., when a module completes, the objective ticks to
  "completed").

---

## 2. Backend Implementation (Rust)

A new module `src-tauri/src/game_state/objectives.rs` will be created.

### Chapter & Objective Catalog

Instead of scattered hardcoded checks, `ObjectiveCatalog` in Rust defines the
sequence embedded into setting lore:

#### Chapter 1: Awakenings (Strict Linear Core Loop)

1. **ch1_stabilize_cm:** Stabilize Command Module $\rightarrow$ unlocks
   **ch1_hire_crew**
2. **ch1_hire_crew:** Hire First Crew Member $\rightarrow$ unlocks
   **ch1_build_producer**
3. **ch1_build_producer:** Construct Ore Refinery $\rightarrow$ unlocks
   **ch1_mine_asteroid**
4. **ch1_mine_asteroid:** Mine 50 Units of Ore $\rightarrow$ unlocks
   **ch1_trade_deal**
5. **ch1_trade_deal:** Resolve resource mismatch at Trading Post $\rightarrow$
   unlocks **ch1_upgrade_cm**
6. **ch1_upgrade_cm:** Upgrade Command Module to Level 2 (visibly unlocks room
   slots) $\rightarrow$ unlocks **ch1_first_expedition**
7. **ch1_first_expedition:** Dispatch 1st Vessel Expedition to Precursor Relay
   Fragment (Reward: 500 Credits, Guaranteed Research Lab Blueprint + NPC
   Relationship) $\rightarrow$ unlocks **ch1_build_lab**
8. **ch1_build_lab:** Construct Research Lab $\rightarrow$ unlocks
   **ch1_first_tech**
9. **ch1_first_tech:** Research 1st Tech Entry (Growth/Economy/Battle)
   $\rightarrow$ unlocks **ch1_second_expedition**
10. **ch1_second_expedition:** Dispatch 2nd Expedition (Demonstrates weighted
    outcomes & survey progress meter) $\rightarrow$ Chapter 1 Complete!

#### Chapter 2+: Relay Survey & Helios Reach (Branching Concurrent Milestones)

- **Branch A (Economy):** Mine 200 Units of Ore / Complete 3 Trade Deals.
- **Branch B (Research):** Research Tier 1 Techs across Development, Economy,
  and Military.
- **Branch C (Sector Progression):** Dispatch Vessel to Sector Band 2 / Defeat
  NPC Patrol / Challenge Local Arena Snapshot.

---

## 3. Frontend Implementation (Excalibur/UI)

### Game State Integration (`src/state/game-state.ts`)

- Add `objectives` property to the `GameState` singleton.
- Implement `applyObjectiveEvent(data)` to reconcile pushed updates.
- Provide a `subscribeToObjectives()` listener for UI components.

### Objective HUD Widget (`src/ui/hud.ts`)

- Add an persistent Objective widget to the main HUD (top-left, anchored below
  the resource bar).
- Displays the active `in-progress` objective label (e.g.
  `Objective: Hire 1 Crew`).
- Tapping the widget opens the Objectives Dialog.

### Objectives Dialog (`src/ui/objectives-dialog.ts`)

- Built using `bindDialogRows` (mirroring the Trading Post panel pattern).
- **Header Row:** Displays Chapter title (e.g., _Chapter 1: Awakenings_).
- **List Rows:** Displays chapter tasks:
  - `completed`: Interactive "Claim" button with reward badge.
  - `in-progress`: Live progress bar (e.g. `25 / 50 Ore`).
  - `claimed`: Checkmark indicator.
- Clicking "Claim" invokes `request_claim_objective`, displaying a toast
  notification (`toast.ts`) and advancing the chapter.

---

## 4. Verification & Testing

1. **Fresh Profile Validation:** Launch app with a clean save state. Verify HUD
   displays Chapter 1 prompt.
2. **Event Push Routing:** Complete an objective task (e.g. hire crew). Verify
   HUD ticks to `completed` in real-time via `ServerPush`.
3. **Claim & Reward:** Claim completed objective. Verify resources deposit into
   `GameState` and next task unlocks instantly.
4. **Snapshot Persistence:** Restart Tauri app mid-chapter. Verify
   `load_game_state` snapshot restores exact objective state.
