# Voidbound: Phase 3 Strategy & Vision (Reconciled & Re-architected)

> [!NOTE]
> **Reconciled 2026-08-10:** This document synthesizes research across all 3 AI
> agent tracks (`research/gemini/`, `research/claude/`, and `research/gpt/`),
> integrating primary user playtest notes, widened 12-game competitive
> precedents (including _OGame_, _Star Trek Fleet Command_, _Rise of Kingdoms_,
> and _Clash of Clans_), and the strategic setting vision.

---

## 1. Product Fiction & Setting Vision

Voidbound is a hopeful, persistent **frontier-colonization strategy game**. The
player grows a living mothership, explores an increasingly valuable star system,
makes meaningful research and expedition choices, and eventually participates in
a shared capital-world society.

### Core Values

1. **Hopeful Colonization, Not Grimdark Survival:** The fiction centers on
   settlement, survey, route-making, stewardship, and discovery. We explicitly
   reject hunger, temperature, panic, or deprivation meters.
2. **Understandable Growth:** Exactly 4 core resources (Construction, High-Tech,
   Bio, Fuel) plus Credits. No currency bloat or hidden gated dependencies.
3. **Failure is Recoverable:** PvE failure can cost fuel, time, cargo, or
   temporary vessel damage. It never destroys the only critical vessel or erases
   protected progress.
4. **Non-Predatory Economy:** Strict stance against pay-to-win mechanics,
   monetized roadblocks, gacha loot-boxes, or artificial wait inflation.

### System Geography & Lore

The star system consists of 5 radial bands surrounding a $200 \times 200$
central sector:

- **Capital World with Orbital Infrastructure:** The emotional and strategic
  heart of the star system.
- **Precursor Relays:** Orbital relay fragments that justify route discovery,
  signal decoding, logistics, and warp range expansion.
- **Helios Array:** Inner-system solar hazard offering high-yield fuel and
  high-tech opportunities.
- **Moons, Derelicts, Outposts:** Distributed discoveries across the outer and
  mid bands.

---

## 2. The P3.1 Experience Specification Gate

Before any Phase 3 feature code is implemented, a formal **P3.1 Experience
Specification** must be written to define acceptance criteria across four player
time horizons:

| Time Horizon      | Player Question                                | Required Experience Spine                                                                                                                                                                                | Systems Validated             |
| :---------------- | :--------------------------------------------- | :------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | :---------------------------- |
| **First 5 min**   | _"What am I saving, and what do I do?"_        | Stranded but operational Command Module; visible resource ticks; immediate crew assignment choice.                                                                                                       | P3.2, P3.3, HUD               |
| **First 30 min**  | _"Can I operate this ship and make progress?"_ | Hire crew $\rightarrow$ build & staff producer $\rightarrow$ mine asteroid $\rightarrow$ NPC trade $\rightarrow$ CM level-up $\rightarrow$ first expedition $\rightarrow$ decode Research Lab blueprint. | P3.3, P3.4, P3.6, P3.8        |
| **First 3 hours** | _"What kind of expedition leader am I?"_       | Branching research choice $\rightarrow$ vessel customization $\rightarrow$ safe vs. risky expedition route $\rightarrow$ first NPC hazard encounter $\rightarrow$ recoverable failure.                   | P3.4, P3.7, P3.8, P3.9, P3.10 |
| **Multi-Day Arc** | _"Can I reach and change the system center?"_  | Inward sector progression $\rightarrow$ overcomes major NPC capital threat $\rightarrow$ clear campaign climax $\rightarrow$ explicit ascension reset/carry-over choice.                                 | P3.9, P3.10, P3.11, P3.19     |

### Five Non-Negotiable Local Loops

1. **Operate:** Assign crew to modules, balance power/staffing, upgrade
   mothership.
2. **Prepare:** Configure vessels and expedition dispatches with up-front fuel,
   travel time, and risk previews.
3. **Explore:** Move inward through legible radial sectors and outposts.
4. **Resolve:** Engaged in bounded, recoverable PvE encounters (RoK Expedition
   style: combat runs in parallel without blocking space map mining).
5. **Return & Reframe:** Harvest returns, see visual mothership growth, choose
   the next research unlock.

### Tangible Spatial Ship Expansion

Command Module growth must not be an abstract number bump in a dialog menu
(Level 2 $\rightarrow$ Level 3). Each CM level-up **visibly opens new interior
tile rings and physical room slots** on `ship-level.ts`, giving players a
tangible sense of base expansion.

---

## 3. Mechanically Grounded Features for Phase 3 (Local Alpha)

### 1. P3.3 Objectives & First-Run Onboarding (Strict-Linear → Branching Spine)

A guided chapter chain embedded into setting lore:

- **Chapter 1 (Awakenings - Strict Linear Core Loop):** Stabilize CM
  $\rightarrow$ Hire 1 Crew $\rightarrow$ Build Producer $\rightarrow$ Mine
  Asteroid $\rightarrow$ Trade Deal $\rightarrow$ CM Upgrade Lvl 2 $\rightarrow$
  1st Expedition (returns Research Lab blueprint + NPC Relationship)
  $\rightarrow$ Build Research Lab $\rightarrow$ Complete 1st Tech Entry
  $\rightarrow$ 2nd Expedition (demonstrates weighted outcomes & survey meter).
  Exposes strictly 1 objective at a time to teach one full loop cycle.
- **Chapter 2+ (Relay Survey & Helios Reach - Branching Milestones):** Switches
  to concurrent optional milestones across Economy, Research, and Sector
  Progression so objectives explain priorities without replacing player choice.

### 2. P3.4 Research Lab (Multi-Branch Tech Tree)

- Three parallel branches: **Development** (mothership & crew), **Economy**
  (production, trade, fuel logistics), and **Military** (vessels & tactics).
- Clear gating by Command Module level. Normal-play accessible respec mechanism
  (no cash paywalls).

### 3. P3.7 Vessel Shipyard & Crew Captains (Lords Mobile Model)

- Vessel progression tied to crew assignment, cargo capacity, and 3
  specialization archetypes: _Scout/Speed_, _Mining/Extraction_, _PvE
  Combat/Tactics_.
- **No Gacha:** Captains and vessel blueprints are earned through direct
  progression, research, and expeditions.

### 4. P3.8 Expeditions & Fuel Economy (OGame Model + Survey Luck Protection)

- **Guaranteed First Expedition:** Target 1 is a fixed Precursor Relay fragment
  / derelict station returning an NPC relationship + a guaranteed blueprint that
  explicitly unlocks the **Research Lab**.
- **Formulaic Slot Ceiling:** Maximum concurrent expeditions
  $\text{Slots} = \lfloor\sqrt{\text{Expeditions Tech Level}}\rfloor$.
- **Authoritative Weighted Table (Expedition 2+):** Resource Cache (32%),
  Derelict/Blueprint (22%), Empty Void (19%), Research Data (9%), NPC Encounter
  (12%), Anomaly Loss (1–2%, reframed as recoverable setback).
- **Survey Track Progress (Luck Protection):** Every dispatch advances a
  target-specific 0–100% survey meter. Even on low/bad RNG rolls, completing
  100% survey guarantees a route, blueprint, or story milestone.
- **Coordinate Fatigue:** Repeated dispatches to identical coordinates produce
  diminishing yields, driving outward map exploration.

### 5. P3.9 NPC Opposition & Radial Sector Progression

- 5 distinct radial bands. Inner bands feature higher density asteroids and rare
  materials, guarded by NPC patrols (STFC distance-gated risk model).
- **Mitigating the "Phase 1 Handoff Wall":** Because Phase 3 lacks an alliance
  layer, P3.9 provides a deep solo NPC campaign runway with outposts, static
  boss encounters, and recurring solo wave-escalation events (reframed from
  _Bear Hunt/Zombie Siege_).

### 6. P3.10 PvE Combat Slice, Local Async PvP Arena & Daily Bounded Ladders

- **PvE Encounters & Vessel Dispatch Exclusivity:** Bounded tactical encounters.
  Dispatching a fitted vessel to combat or an expedition **occupies that vessel
  exclusively** until it returns; it cannot simultaneously mine asteroids or
  execute other dispatches (creates meaningful fleet allocation opportunity
  costs). Clear preview of win/loss odds before dispatch.
- **Local Asynchronous PvP Arena:** Set a defense squad $\rightarrow$ challenge
  another local profile's defense squad. Requires **no WebSockets, live server,
  or resource looting**. Reads stored `DefenseTeamData` snapshot and resolves
  synchronously through P3.10's combat engine (`AttackerLoadout` vs
  `DefenseSnapshot`).
- **Arena Rewards:** Victories grant deterministic drone/troop upgrade
  components and credit rewards—**never base resource looting, random gacha
  pulls, or hero collections**. Losses grant no material consolation rewards.
- **Daily Bounded Attempt Ladders:** Arena challenges and recurring solo boss
  operations use a daily scaling cost/reward ladder (1st free/high reward, 2–5
  scaling cost/moderate reward, 6+ glory/ranking only) to prevent automated
  macros from widening power gaps over idle players.
- **Headline Power Score (CP System):** Displayed as an explicit numeric score
  (e.g., `"Fleet Power: 14,500"`) combining Command Module level + module
  levels + vessel tiers + research level to scale NPC encounter difficulty.

### 7. Vessel / Troop Repair Mechanics (Primary Credit & Resource Sink)

- Expedition anomaly failures (~1–2% roll) and PvE combat damage result in
  **Fuel/Cargo loss + a Temporary Vessel/Troop Repair Cycle** at the Shipyard.
- **Economic Topology:** Vessel and troop repair costs serve as the primary
  natural Credit and resource sink, continuously absorbing excess production
  without artificial fee inflation.

### 8. P3.11 Campaign Climax & ARPG "Prestige" Ascension

- Reaching the central Capital World sector triggers a final NPC confrontation.
- **ARPG / Roguelike Prestige Contract (NG+ Pattern):** Inspired by
  single-player prestige loops (_Hades_, _Slay the Spire_). Completing the
  campaign allows resetting base/modules in exchange for meta-perks: cosmetics,
  ship history badges, initial expedition boosts, and a capped Ascension
  Research tree.
- **Post-Late-Game Design Task:** The exact conversion formula for Ascension
  Points and NG+ sector map seed randomization will be specified as Phase 3
  progression development matures.

### 9. P3.19 Dual-Cohort Playtesting & P0 Churn Wall Gate

- Playtest feedback must explicitly segment **First-Session Players (0–30 min)**
  from **Multi-Hour Return Players**.
- **P0 Gate Rule:** Hitting an abrupt dead-end wait wall immediately after
  scripted onboarding chapters end is classified as a **P0 blocking rebalance
  bug**.

---

## 4. Synthesis & Gap Review Summary

| Identified Gap                                      | Agreed Resolution / Phasing Status                                                                       |
| :-------------------------------------------------- | :------------------------------------------------------------------------------------------------------- |
| **Gap 1: Mobile Portrait UI Layout Drawer**         | Noted as a multi-vessel logistics requirement; deferred to iterative UI polish & user playtest feedback. |
| **Gap 2: Offline System Clock Manipulation**        | Non-issue for Phase 3 local dev/test loops; Phase 4 server-authoritative time handles it.                |
| **Gap 3: Spatial CM Ring Expansion & Audio SFX**    | Deferred to future visual and audio polishing passes.                                                    |
| **Gap 4: Ascension Point Formula & NG+ Seed Shift** | Recognized as a critical post-late-game gap; deferred to later in Phase 3 development.                   |
| **Gap 5: Credit & Resource Sink Topology**          | Resolved via expedition and PvE vessel/troop repair costs as the primary natural sink.                   |

---

## 5. Features Explicitly Deferred to Future Phases

| Feature / System                                   | Deferred To | Rationale                                                                                                                                                      |
| :------------------------------------------------- | :---------- | :------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **WebSockets, Login, Remote Storage**              | **Phase 4** | Must validate local loop & Rust event model first.                                                                                                             |
| **Alliances, Embassies, Player Territory**         | **Phase 5** | Social systems require a live multi-player server.                                                                                                             |
| **Player Social Governance (Etiquette over Code)** | **Phase 5** | Adopt STFC "Rules of Engagement" model: provide communication/tagging tools so player treaties emerge naturally rather than hardcoding brittle server rules.   |
| **Player-to-Player Trade & Economy**               | **Phase 5** | Avoid market exploitation before online state exists.                                                                                                          |
| **Full Live PvP Raiding & Base Shields**           | **Phase 6** | Requires online identity; P6.3 will enforce protected storage rules (only exposed surplus lootable; 72-hr new player shield broken only by active PvP attack). |
| **Curated Live Events & GM Operations**            | **Phase 7** | Server-curated events require Phase 4 server infrastructure.                                                                                                   |

---

## 6. Deliberately Rejected Anti-Patterns

1. **Pay-to-Win Power Widening:** Revenue will never sell power advantages.
2. **Predatory Wait Timers:** Building/research timers pace sessions; they never
   halt gameplay for weeks or require real-money skip currency.
3. **Hero Gacha & Loot Boxes:** No randomized unit acquisition.
4. **Currency Proliferation:** Strict adherence to 4 resources + Credits.
5. **Irreversible Early Traps:** Respec path built into normal gameplay.
