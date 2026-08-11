# Voidbound Phase 3 Research (Reconciled & Re-architected)

This directory contains research, competitive analysis, and strategic
documentation compiled to aid in the design of **Voidbound Phase 3 (Local
Playable Alpha)**.

> [!NOTE]
> **Reconciliation Status (2026-08-10):** This plan was synthesized with
> parallel research from `research/claude/` (which analyzed user playtest notes
> and expanded to 12 games including _OGame_, _STFC_, _RoK_, and _Clash of
> Clans_) and `research/gpt/` (which established the setting fiction, experience
> spine, and system geography).

## Key Strategy Highlights

1. **Setting Fiction:** Hopeful frontier colonization (survey, logistics,
   stewardship). Explicitly rejects post-apocalyptic grimdark and survival
   meters (hunger, temperature).
2. **Geography & Lore:** Central $200 \times 200$ sector designated as the
   **Capital World with Orbital Infrastructure** (Precursor Relays, Helios
   Array, outposts).
3. **P3.1 Experience Specification Gate:** Mandates formal acceptance criteria
   across 5-minute, 30-minute, 3-hour, and multi-day horizons before code
   implementation begins.
4. **OGame Expedition Engine (P3.8):** Formulaic slot scaling
   ($\lfloor\sqrt{\text{Tech Level}}\rfloor$), authoritative outcome table, and
   coordinate fatigue.
5. **Mitigating Solo Churn Wall:** Deep solo NPC campaign runway (P3.9), vessel
   dispatch exclusivity (opportunity cost decisions across mining vs. combat
   dispatches), and an aggregate Power Score (CP).

## Reading Order

- **[voidbound_strategy.md](./voidbound_strategy.md)** — **The Primary Strategy
  Document.** Synthesizes core design values, experience spine, OGame expedition
  mechanics, and future phase boundaries.
- **[plan_p3_3_objectives.md](./plan_p3_3_objectives.md)** — Technical
  implementation plan for Rust event-modeled linear chapter onboarding.
- **[comparison.md](./comparison.md)** — Direct comparison of primary research
  targets (_Whiteout Survival_, _Dark War: Survival_, _Tiles Survive!_).
- **[similar_games.md](./similar_games.md)** — High-level index of researched
  games in the genre.
- **[gameplay_analysis.md](./gameplay_analysis.md)** — Breakdown of early, mid,
  and end-game pacing shifts.
- **Game Deep Dives:** Detailed breakdowns for 8 specific games
  ([Whiteout Survival](./deepdive_whiteout_survival.md),
  [Dark War](./deepdive_dark_war_survival.md),
  [Tiles Survive!](./deepdive_tiles_survive.md),
  [State of Survival](./deepdive_state_of_survival.md),
  [Frozen City](./deepdive_frozen_city.md),
  [Last Fortress](./deepdive_last_fortress.md),
  [Puzzles & Survival](./deepdive_puzzles_and_survival.md),
  [Age of Origins](./deepdive_age_of_origins.md)).
