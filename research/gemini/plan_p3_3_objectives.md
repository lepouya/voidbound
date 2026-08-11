# Implementation Plan: P3.3 Objectives & First-Run Onboarding

## Overview

Based on our research into the "Phase 1 / The Hook" of mobile 4X games, this
plan outlines the implementation of **ROADMAP Task P3.3**. The goal is to create
a persistent, event-modeled "Strict Linear Chapters" system that guides the
player through their first milestones (hiring, building, mining) and grants
authoritative rewards.

## 1. Data Model (Rust & TypeScript)

Following the multiplayer-ready event pattern (see `AGENTS.md`), Objectives must
be authoritative and ride the `load_game_state` snapshot.

### Wire Types (`game-state-types.ts`)

```typescript
export type ObjectiveState = "locked" | "in-progress" | "completed" | "claimed";

export interface ObjectiveData {
  objectiveId: string; // e.g., "ch1_hire_crew"
  chapterId: string; // e.g., "chapter_1"
  state: ObjectiveState;
  currentProgress: number; // for tasks like "mine 100 units"
  targetProgress: number;
}

export interface ObjectivesSnapshot {
  activeChapterId: string;
  objectives: ObjectiveData[]; // Only sends relevant/active chapter objectives
}
```

- `GameStateData` will be updated to include `objectives: ObjectivesSnapshot`.
- A new `ServerPush` type (`type: "objective"`) will be added to push real-time
  progression updates (e.g., when a build completes, the objective ticks to
  "completed").

## 2. Backend Implementation (Rust)

A new module `src-tauri/src/game_state/objectives.rs` will be created.

### The Catalog

Instead of hardcoding checks everywhere, we will create an `ObjectiveCatalog` in
the backend that defines the linear sequence. Example sequence for Chapter 1:

1. **Hire Crew** -> unlocks -> **Build Ore Refinery**
2. **Build Ore Refinery** -> unlocks -> **Mine Asteroid**
3. **Mine Asteroid** -> Chapter 1 Complete! (Reward: 500 Credits)

### Event Triggers

We will hook into existing server actions. When `request_hire_crew`,
`request_build_module`, or `asteroid_depleted` events occur, the server will:

1. Check the active objectives.
2. If a condition is met, update the `ObjectiveState` to `completed`.
3. Emit a `ServerPush::Objective(ObjectiveData)`.

### New Command

- `request_claim_objective(objective_id)`: Verifies the objective is
  `completed`, changes state to `claimed`, deposits the rewards (e.g., Credits,
  Fuel) into `ResourceCounts`, unlocks the next objective in the linear chain,
  and returns an `ObjectiveActionResponse`.

## 3. Frontend Implementation (Excalibur/UI)

### Game State Integration (`src/state/game-state.ts`)

- Add `objectives` to the `GameState` class.
- Add `applyObjectiveEvent(data)` to handle pushes.
- Provide a `subscribeToObjectives()` hook for UI updates.

### Objective HUD Widget

- Create a new HUD group in `src/ui/hud.ts` (e.g., positioned top-left, below
  the resource bar) that displays the currently active `in-progress` objective
  as a persistent label (e.g., "Objective: Hire 1 Crew").
- Tapping this widget opens the Objectives Dialog.

### Objectives Dialog (`src/ui/objectives-dialog.ts`)

- Using the `bindDialogRows` pattern from the P1.12 Trading Post / Mail panels.
- **Header:** Displays the current Chapter Name (e.g., "Chapter 1: Awakenings").
- **Rows:** Displays the linear checklist.
  - `completed` objectives show a shiny "Claim" button.
  - `in-progress` objectives show the progress bar (e.g., 0/1).
  - `claimed` objectives show a checkmark.
- Clicking "Claim" fires `request_claim_objective`, spawning a success toast
  (using `toast.ts`) and triggering a UI refresh via the state store notify.

## 4. Verification Plan

1. **New Save Validation:** Boot the app with a fresh local save. Verify the HUD
   immediately prompts the player to "Hire 1 Crew".
2. **Progression Validation:** Hire the crew. Verify the HUD automatically
   updates to the next task without a reload (confirming `ServerPush` routing
   works).
3. **Reward Validation:** Click "Claim" in the dialog. Verify resources increase
   instantly and the next Chapter unlocks.
4. **Persistence:** Close the Tauri app mid-chapter, reopen, and verify the
   `load_game_state` snapshot accurately restores the exact objective progress.
