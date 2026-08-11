# Voidbound Phase 3 Research

This directory contains research, competitive analysis, and strategic
documentation compiled to aid in the design of **Voidbound Phase 3 (Local
Playable Alpha)**.

The primary goal of this research was to examine similar mobile 4X strategy and
survival games, understand their core gameplay loops, identify what keeps
players engaged, and extract mechanics that can be successfully adapted for
Voidbound (while actively avoiding predatory or "pay-to-win" pitfalls).

## What Was Done

1. **Market Discovery:** Identified and researched leading games in the mobile
   4X survival genre, with a primary focus on _Whiteout Survival_, _Dark War:
   Survival_, and _Tiles Survive!_.
2. **Gameplay Analysis:** Broke down the universal "core loop" of these games
   (Resource Gathering -> Base Expansion -> Power Scaling) and analyzed how the
   pacing shifts from the early-game hook to the late-game grind.
3. **Comparative Analysis:** Compiled community feedback (via Reddit and guides)
   to determine which mechanics are universally praised (e.g., immediate base
   building, alliance camaraderie) and which are heavily criticized (e.g.,
   exponential wait timers, P2W event walls).
4. **Deep Dives:** Conducted individual feature breakdowns for 8 specific games
   to see how each title differentiates itself to keep players engaged during
   the "wait cycle."
5. **Voidbound Strategy Synthesis:** Translated these findings into actionable
   advice for Voidbound, focusing specifically on what features are necessary to
   make the single-player/local alpha engaging without relying on future
   multiplayer features.

## How to Read These Documents

If you are a developer or agent picking up this research, it is recommended to
read the documents in the following order:

### 1. The High-Level Strategy

Start here to understand the broader genre and how it applies to Voidbound.

- **[similar_games.md](./similar_games.md)** - A high-level list of the top
  games in the genre and their core thematic hooks.
- **[gameplay_analysis.md](./gameplay_analysis.md)** - Explains the universal 4X
  mobile gameplay loop and how the player experience fundamentally changes
  across the Starting, Mid-game, and End-game phases.
- **[comparison.md](./comparison.md)** - A direct comparison of our primary
  research targets, heavily focused on community feedback regarding what
  mechanics succeed and which ones cause player burnout.
- **[voidbound_strategy.md](./voidbound_strategy.md)** - **The most critical
  document.** A synthesis of how this research maps directly to Voidbound's
  Phase 3 ROADMAP tasks, detailing what to implement and what to deliberately
  ignore.

### 2. The Game Deep Dives

If you are looking to design a specific feature (like a PvE mode, tech tree, or
UI layout) and want inspiration, refer to these individual game breakdowns to
see how others handled it:

- [Whiteout Survival](./deepdive_whiteout_survival.md) - Focus on central hub
  management (The Furnace).
- [Dark War: Survival](./deepdive_dark_war_survival.md) - Focus on traditional
  zombie base defense.
- [Tiles Survive!](./deepdive_tiles_survive.md) - Focus on tile-by-tile
  exploration and physical base expansion.
- [State of Survival](./deepdive_state_of_survival.md) - Focus on integrating a
  PvE RPG mini-game to break up wait timers.
- [Frozen City](./deepdive_frozen_city.md) - Focus on stage-based progression
  and idle worker/needs management.
- [Last Fortress: Underground](./deepdive_last_fortress.md) - Focus on
  side-scrolling, subterranean room management.
- [Puzzles & Survival](./deepdive_puzzles_and_survival.md) - Focus on
  hybridizing 4X maps with Match-3 combat.
- [Age of Origins](./deepdive_age_of_origins.md) - Focus on integrating tower
  defense mini-games.

### 3. Tracking

- **[tasks.md](./tasks.md)** - The historical checklist of tasks completed
  during this specific research phase.

### 4. Technical Planning

- **[plan_p3_3_objectives.md](./plan_p3_3_objectives.md)** - A technical
  implementation plan translating the "strict linear chapters" strategy into
  Voidbound's authoritative event-modeled Rust backend and Excalibur frontend.
