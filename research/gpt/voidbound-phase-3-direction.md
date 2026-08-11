# Voidbound Phase 3 direction — working recommendation

## Recommended product promise

**Build a living mothership, colonize and discover an increasingly valuable star
system, and earn a deliberate ascension through exploration, research, and
recoverable PvE.**

This is deliberately a local campaign, not a reduced MMO or a generic survival
game. The references show that base growth alone retains attention only while it
changes the player’s reachable decisions. Voidbound’s distinctive asset is the
relationship between ship interior (crew, modules, production) and star map
(asteroids, routes, sectors, expeditions, NPCs). Phase 3 should make that
relationship the game.

Voidbound's value boundary is equally important: it must not use predation,
monetized roadblocks, currency proliferation, or irreversible progression loss
as a substitute for compelling content. Future monetization is undecided, but
the local-alpha economy must be small, legible, and earned through play.

Voidbound's value boundary is equally important: it must not use predation,
monetized roadblocks, currency proliferation, or irreversible progression loss
as a substitute for compelling content. Future monetization is undecided, but
the local-alpha economy must be small, legible, and earned through play.

## Phase 3 experience spine

The research uses two meanings of “phase.” This document's **Phase 3** is
Voidbound's development-roadmap phase. The reference games' player-lifecycle
phases are recorded separately in `player-lifecycle-model.md`; their first,
rapid solo-discovery phase is the immediate target.

| Time horizon     | Player question                                    | Required experience                                                                                                                                                                                                    | Candidate Phase 3 systems                                    |
| ---------------- | -------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------ |
| First 5 minutes  | “What am I saving, and what do I do?”              | A stranded but functioning Command Module, visible resource needs, one immediate objective, and a choice that produces a visible change.                                                                               | P3.2 profile entry, P3.3 onboarding, current crew/module UI. |
| First 30 minutes | “Can I operate this ship and make progress?”       | Hire first crew; build and staff first producer; mine; use an NPC trade; upgrade Command Module; complete the first vessel expedition, whose discovery feeds the next choice. State the next reason before every wait. | P3.1, P3.3, P3.4, P3.6, P3.8.                                |
| First 3 hours    | “What kind of expedition leader am I?”             | Make a meaningful research/path choice; improve a vessel; weigh a safe resource route against a risky discovery; encounter the first NPC/hazard; recover from a setback.                                               | P3.4, P3.7, P3.8, P3.9, P3.10.                               |
| Several days     | “Can I reach and change the heart of this system?” | Discover progressively harder sectors, overcome a major threat through prepared ship/vessel choices, complete a clear campaign objective, then choose ascension.                                                       | P3.9, P3.10, P3.11, P3.19.                                   |

This is a direction, not yet an approved P3.1 specification. The user’s own
experience with the three references should set the desired pace and emotional
tone before targets/numbers are locked.

## The five non-negotiable local loops

1. **Operate:** assign scarce crew to modules, read output consequences, and
   improve the mothership. Existing crew staffing is a strong base; its choices
   must grow through research/prerequisites rather than become a tax.
2. **Prepare:** choose a vessel configuration and expedition plan with an
   up-front travel time, fuel cost, risk, and expected reward. A player should
   know what they are committing to before dispatch.
3. **Explore:** move inward through legible radial sectors. Each region should
   offer a new resource relation, hazard, NPC behavior, or strategic question.
4. **Resolve:** take bounded PvE decisions with a clear preview and a
   recoverable failure. P3.10 must validate a reusable combat interaction, not
   merely add a damage number.
5. **Return and reframe:** harvest/receive outcomes, see the ship visibly
   change, make the next unlock choice, and leave with an explicit return hook.

These loops must be available concurrently early on. The desired feeling is a
fast, goal-directed braid of construction, resource work, active missions/PvE,
and eventually research—not a serial queue in which the player finishes one
system before meeting the next.

## Principles inherited from research

- **One visible spine, not one mandatory rush.** The Command Module is the
  central icon, as the furnace is in Whiteout, but module/research choices must
  create alternate approaches rather than a prerequisite conveyor belt.
- **Geography should unlock agency.** Borrow Tiles Survive’s outward expansion,
  using inner sectors, routes, moons, planets, and hazards rather than literal
  tiles. A new area must change a decision, not just increase a deposit number.
- **Three session lengths must coexist.** A 5-10 minute return, a scheduled
  several-hours-away plan, and an optional longer active session must each give
  legitimate progress without allowing unlimited active grinding to dominate.
- **People should explain the system.** Crew make the mothership feel lived-in.
  Show where they work, what they enable, and the effect of understaffing.
- **Timers are commitments, not content.** Preserve the existing live countdown
  standard. The player needs an immediate alternative activity while a timer
  runs, and a finished timer must change plans.
- **Failure creates a story, never a soft lock.** A damaged or delayed vessel,
  lost opportunity, depleted route, or temporary hazard is acceptable. Permanent
  loss of the only vessel, required crew, or protected progression is not.
- **No false promise.** The onboarding must showcase the actual campaign loop,
  not an isolated activity that disappears after the tutorial.
- **Goals teach without replacing choice.** Chapters/milestones should name the
  next useful action and why it matters, then offer enough simultaneous work
  that the player decides what to prioritize.
- **Active and idle play are both respected.** Active sessions unlock choices,
  discoveries, and tactical expression; they must not become an unlimited source
  of raw power that invalidates a player who returns in short sessions.
- **Build reversal into branching systems.** Research and ascension branches may
  offer different openings, but a player must be able to respec through normal
  play. Do not monetize recovery from a choice that the game allowed them to
  make without sufficient information.

## What a successful Phase 3 must contain

### Essential before P3.19

- A clear first-run objective chain with persistent optional objectives and
  authoritative rewards (P3.3).
- Research decisions that change available plans (P3.4), and prerequisites that
  explain rather than hide missing requirements (P3.6).
- Vessel progression tied to crew, dispatch, cargo, and a small number of
  legible specializations (P3.7), not a broad collectible-hero system.
- Fuel-powered expeditions whose result is not always a numeric reward (P3.8):
  discovery, choice, resource conversion, a story fragment, or a future route
  can all be valid outcomes. Start with a relay fragment or derelict station;
  later procedural targets include moons, anomalies, and distress signals. The
  first expedition should establish an NPC relationship and yield an item or
  blueprint that opens the first Research Lab or military/Vessel Shipyard path.
- Persistent NPC sectors and hazards that make radial movement feel like a
  campaign map (P3.9), then a bounded combat vertical slice (P3.10).
- A finite completion and explicit ascension/reset contract (P3.11), including
  cosmetics, a better first expedition, and a strictly bounded ascension
  research tree as likely carry-over candidates.
- Readability/polish necessary to understand the loop: shop layout, minimap,
  resource details, module/map art, audio, and growing crew costs (P3.12-P3.18).
- Repeated fresh-profile playtests with documented outcome criteria (P3.19).

### Necessary acceptance criteria for P3.1 to make testable

- A fresh player completes the 30-minute spine without external documentation or
  a forced real-time wait that leaves no useful action.
- At three hours, two players can make different research/expedition choices and
  explain their tradeoffs; neither is objectively trapped by an early hidden
  choice.
- After a normal offline return, the player sees a concise outcome summary and
  has a new decision within one minute.
- Any early/mid-campaign failure can be recovered with known actions and bounded
  cost; no reset is required.
- A campaign has an estimated completion range and a clearly explained ascension
  choice. It is not merely a promise of future events.
- The first three hours contain overlapping ship, resource, map/PvE, and
  research decisions; players never experience the intended core as a single
  waiting queue.

## Explicitly defer to later phases

| Do not solve in Phase 3                                                             | Why it waits                                                                     | Planned home |
| ----------------------------------------------------------------------------------- | -------------------------------------------------------------------------------- | ------------ |
| Simultaneous multiplayer, login, remote storage, web sockets, anti-cheat            | Local loop and state contracts must be proven first.                             | P4.1-P4.6    |
| Alliances, player territorial conflict, cohort worlds, online seasons, player trade | Value depends on a real population; it would mask rather than validate solo fun. | P5.1-P5.9    |
| Full weapons economy, player raids, defence modules, adversarial loss               | PvE combat rules need a safe/recoverable vertical slice first.                   | P6.1-P6.7    |
| Curated live events, mobile release, broad item inventory, map transport work       | Presentation/content/platform scope should not block local-alpha proof.          | P7.1-P7.6    |

The future capital-control event belongs with the online territorial/conflict
work, not P3: a first captor shifts to defender, holds against challengers for a
short window, then receives one week of stewardship. Any actual implementation
needs a dedicated design review for fairness and anti-snowball rules. Its reward
should be alliance-wide, capped, and chosen to reinforce cooperation rather than
make individual players uncatchably stronger. Temporary ministry positions may
add personal construction/research convenience bonuses, but require automatic
fair rotation and must never be essential for progression or depend on players
watching a short appointment timer.

## Architecture constraints that support the direction

Every objective, research, expedition, NPC decision, combat outcome, completion,
and ascension must be server-authoritative, event-modeled, revisioned, and
snapshot-replayable. Timed actions use server timestamps; offline settlement
must produce the same durable state. This preserves the Phase 4 migration path
while allowing the Phase 3 game to be fully local today.

## Decisions to take with the user next

1. Rank the three references by the moments the user actually enjoyed, rather
   than by their feature lists.
2. Agree on target campaign length, frequency of meaningful return sessions, and
   desired risk intensity.
3. Select 2-3 research/expedition archetypes for the first playable arc.
4. Write P3.1 as a concrete experience specification with explicit content
   exclusions and playtest measures.
