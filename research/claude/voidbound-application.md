# Applying the research to Voidbound Phase 3

The payoff document. Synthesizes `games/*.md`, the three `comparison/*.md` docs,
and `user-notes.md` against Voidbound's own `README.md` design principles and
`ROADMAP.md`'s Phase 3 task list (P3.1-P3.19). Organized in four parts: what
transfers directly into Phase 3, what's relevant but belongs in a later phase,
what should be deliberately rejected, and the open questions this research
surfaced that are the user's to decide, not this document's to assume.

**This is planning, not implementation.** Per `AGENTS.md`'s review gate nothing
here authorizes writing code — it's material for the P3.1 design-review
conversation (and for `/roadmap-task`'s design-review pause on any Phase 3 task
that touches the server model).

## Part 1 — What transfers directly into Phase 3

### P3.1 (playable-alpha spec) & P3.3 (objectives/onboarding)

The genre's onboarding pattern — a guided chapter/mission chain that _is_ the
game, not a disposable tutorial bolted onto it, with deliberately front-loaded
generous rewards and a concrete "first day" checklist — is exactly the shape
P3.3 already describes ("The first campaign walks through hiring the starting
crew member, building the first producer, mining, trading, and upgrading").
`early-mid-late-game.md`'s Phase-1 section is a strong, cross-validated
confirmation that this is the right shape, not a novel idea to import. Two
specific, concrete borrows:

- **Meaningful unlock every task, not periodic ones.** Multiple reviews praise
  this exact property ("genuine momentum during the first week"); the
  counter-example (Rise of Kingdoms dumping every system on a player at once) is
  a reason to keep P3.3's chapter granularity tight.
- **State the reward and gate structure honestly up front**, which is already a
  Voidbound convention (`AGENTS.md`'s UX principle: timed actions "state the
  wait before it is committed to"). None of the 8 games do this as consistently
  as Voidbound already requires — a place Voidbound is ahead of the genre, worth
  defending rather than a place to catch up.

### P3.4 (Research Lab + tech tree)

Every game researched runs 2-3 **parallel** research trees (Whiteout Survival:
Growth/Economy/Battle; Dark War: Develop/Battle/Economy/Alliance Tech; Last War:
an Economy+Development-first, Hero-later, Units-last sequencing) gated by the
central building's level, with near-universal community guidance to sequence
Economy/Development before Military. This is a validated shape for P3.4 to
reuse: parallel trees, each gated by Command Module level, rather than one
linear tree. The specific sequencing advice (economy-first almost everywhere) is
a useful default for whatever curve P3.4 lands on.

### P3.6 (module build prerequisites)

The "central building gates everything else's max level" pattern
(`core-loop-vs-features.md` §1) is precisely what P3.6 wants to generalize
(`unlock_command_level` → explicit prerequisites: other modules at a level,
research, items, objectives). This is already how the whole genre works, not a
new pattern for Voidbound to invent — the useful new information is in the UX
layer: multiple games' guides exist specifically to explain gating players find
opaque (e.g. "Waterfall Training" mechanics nobody could fully document).
**Concrete lesson for P3.6: show unmet reasons, not just a locked icon** —
P3.6's own task description already says this; this research is confirmation
it's the right call, since the alternative (silent gating) is what generates
confused third-party guide content in every peer game.

### P3.9 (NPC opposition + radial sector progression) & P3.10 (PvE combat vertical slice)

The closest real-world analogs found in this research:

- **Rise of Kingdoms' Expedition mode** — a staged, singleplayer-vs-AI campaign
  with star ratings, explicitly designed so troops/commanders already gathering
  or garrisoned on the open map can still fight Expedition battles _without
  being pulled off their map task_. This is a direct, concrete answer to a
  design question P3.9/P3.10 will have to solve (does engaging NPC content
  compete with or run alongside economic activity?) — RoK's answer (run
  alongside, deliberately) is worth adopting as a default unless there's a
  specific reason Voidbound wants the tension of choosing between them.
- **State of Survival's Explorer Trail** — a 3-hero, troopless squad campaign,
  explicitly separated from the troop-based world-map/PvP layer, praised by an
  independent reviewer as "a fantastic single player experience" in its own
  right, not just a tutorial funnel. This validates giving P3.10's PvE vertical
  slice its own identity distinct from vessel/combat-power grinding, rather than
  making it just "the same combat system pointed at NPCs."
- **Dark War/Whiteout Survival's wave-defense events** (Zombie Siege / Bear
  Hunt) — cooperative, escalating-difficulty combat against a shared threat,
  with individual contribution tracked and rewarded. This is alliance-scale
  content in the source games (needs other players), but the wave-escalation
  _structure_ — repeatable, scaling difficulty, clear win/loss state — is a
  reusable shape for solo NPC encounters even without the cooperative framing.
- **Rise of Kingdoms' radial map structure** (Holy Sites/Ancient Ruins in outer
  zones, contestable and time-held) is a near-literal precedent for Voidbound's
  own radial asteroid grades (P2.6) extended with NPC-held territory, which is
  exactly what P3.9 asks for.

### P3.11 (local campaign completion + ascension)

This is the one task in all of Phase 3 with **no usable peer template** — see
`early-mid-late-game.md`'s conclusion: every one of the 8 games is explicitly,
deliberately open-ended with no designed completion state ("no source described
a defined 'campaign completion' or end state" is stated almost verbatim in three
separate docs). The genre's climax content (SvS, KvK, Capital Clash — see the
table in `early-mid-late-game.md`) is built to be repeated forever by a live
population, not resolved once by a single player. P3.11 has to be designed from
outside this research set — worth explicitly telling the user this rather than
implying the genre research answers it. What _does_ transfer: the genre's climax
structures universally grant a **title/governance reward** (President, Governor)
on top of loot — P3.11's "reaching the center and defeating a major threat"
already implies something similar; the pattern confirms that a status/title
reward alongside material ones is worth keeping, even in solo form.

### P3.18 (progressive crew recruitment cost)

Every game with a comparable recruitment/training cost runs an escalating curve
tied to population size, not a flat price — directly matches P3.18's goal. No
single game's exact curve shape was documented precisely enough to copy a
formula, but the direction (rises gradually, tune against progression) is
confirmed as the genre-standard approach rather than a novel design.

### P3.19 (structured playtest + rebalance)

`early-mid-late-game.md`'s "honeymoon-then-wall" pattern is the most
consistently documented failure mode in this entire research set, named almost
identically across every game's mid-game section. **This should be a named thing
P3.19's playtest explicitly hunts for** — not just "confusion, dead time,
dominant choices" generically, but specifically: _does the pacing in the
first-week content abruptly collapse into a grind wall the moment scripted
objectives run out, the way every peer game's does?_ Voidbound has no alliance
layer yet to catch a player on the other side of that wall (see Part 4's risk
flag), which makes this failure mode more dangerous for Voidbound during Phase 3
than it is for the peer games, not less.

## Part 2 — Relevant, but belongs in a later phase

Flagging these here (rather than silently ignoring them) so a future session
designing Phase 5/6/7 tasks has this research available without re-deriving it.

- **Alliance mechanics wholesale** (Alliance Tech, rallies, garrisons,
  reinforcement, R4/R5-style officer roles, diplomacy/NAPs) → **P5.1 (Alliance
  Embassy)** and **P5.2 (alliance territories)**. This is the genre's single
  most-praised system (`community-sentiment.md`) — worth investing real design
  effort here when Phase 5 arrives, more than almost anything else in this
  research.
- **PvP raiding, rallies, and center-map war structures** (State of Supremacy,
  Capital Clash, KvK, Territory Wars — see the table in
  `early-mid-late-game.md`) → **P6.3 (PvP combat resolution)**. Directly
  relevant: P6.3 already scopes raiding to "only P2.13's exposed surplus may be
  looted, never protected stock" — this is Voidbound's own version of the
  new-player-shielding pattern every peer game implements (protected early-game
  bases, Warehouse/Vault/Storehouse caps on lootable resources). Validates
  P6.3's existing scope rather than changing it. **Decided 2026-08-10** (see
  `user-notes.md`): P6.3 should implement a **72-hour protection bubble** per
  new player/account, broken early specifically by taking an active synchronous
  PvP action (not a passive timer alone) — accepted tradeoff:
  experienced/ascended players can play around this deliberately in a way a
  genuinely new player can't, and that's fine.
- **Server/state aging and consolidation** → **P5.5 (online seasons and world
  merging)**. State of Survival's "State Merge" (periodic, ~1 week's notice,
  only-15+-day-inactive accounts pruned rather than merged) is the single best
  reference implementation found in this research for this exact task — worth a
  direct read of that game's approach when P5.5 comes up.
- **The near-continuous event calendar** (`core-loop-vs-features.md` §2) →
  **P7.1 (Curated Events panel)**. Real and load-bearing for retention in every
  peer game, but P7.1 already correctly scopes this behind P4.1 (needs a live
  server to curate events _onto_) — nothing here argues for moving it earlier.
- **Licensed-IP crossovers, battle passes, VIP ladders** → all downstream of
  **P5.9 (monetization model)**, which hasn't been decided yet. These are
  genuinely effective retention/revenue mechanisms in every peer game, but
  adopting their _shape_ (a battle pass, a VIP ladder) before deciding _whether
  Voidbound monetizes at all_ would be designing the tail before the dog.
  Nothing in this research should be read as pre-deciding P5.9.
- **Hero/gacha-based unit collection.** Voidbound has no equivalent system and
  the README doesn't describe wanting one — crew are workers with a staffing
  formula, not named collectible individuals with skills/rarity tiers. If a
  future phase (P3.7's vessel tiers? a later "commander" concept for combat?)
  wants something in this space, Lords Mobile's non-gacha model (heroes unlocked
  via campaign/event progression and direct purchase, not randomized pulls) is
  the one peer example that avoids the loot-box mechanics — worth citing
  specifically if that door ever opens, given Part 3's rejection of gacha
  mechanics below.

## Part 3 — What conflicts with Voidbound's principles and should be rejected

- **Permanent, structurally-widening pay-to-win gaps.** The single most repeated
  complaint in the entire research set (`community-sentiment.md` #1), described
  by players and even by sympathetic reviewers as deliberately engineered, not
  incidental. Voidbound has made no monetization decision (P5.9 is explicitly
  open), but this research is a strong, concrete argument for deciding
  conservatively when that conversation happens — the genre's dominant revenue
  model is also its most consistently despised feature, which is worth having in
  view before P5.9 gets decided by default.
- **Bait-and-switch advertising.** The second most repeated complaint
  (`community-sentiment.md` #2), specific to Dark War, Last War, Tiles Survive!,
  and Top War — all games explicitly named by the user as direct comparisons or
  genre peers. Not a Phase 3 concern mechanically, but worth recording now as a
  values statement: whatever Voidbound's eventual marketing looks like, this is
  a well-documented trap to avoid on purpose.
- **The engineered "honeymoon then wall" pacing.** Not every game's version of
  this is a deliberate choice — some of it is a side effect of timers needing to
  scale for monetization reasons — but the _shape itself_ (generous scripted
  content, then an abrupt collapse into grind) is something Voidbound can avoid
  by design, since Phase 3 doesn't need monetization-driven timer inflation.
  P3.19 should treat any sign of this shape as a defect to fix, not a normal
  genre trait to accept.
- **Gacha/loot-box mechanics for hero or unit acquisition.** Present in 6 of 8
  games as the primary hero-acquisition method, and specifically called out in
  Dark War's own App Store metadata as "simulated gambling via loot boxes" (an
  official age-rating flag, not a critic's editorializing). Nothing in
  Voidbound's README suggests wanting this, and this research gives a concrete
  reason not to reach for it later without a deliberate decision: it's the
  mechanical engine most directly linked to the pay-to-win complaints in Part
  3's first bullet.
- **System bloat beyond what a single player can hold in their head.** Lords
  Mobile's community is explicitly split on whether its large system count is
  depth or bloat, with the same reviewers sometimes calling it both in one
  piece. Voidbound's README's "exactly 4 resources... to avoid information
  exhaustion" principle is already a deliberate stance against this outcome —
  this research is validation to hold that line as Phase 3 adds research trees,
  expeditions, and NPC opposition, not a reason to loosen it. Concretely:
  **P3.4's research tree and P3.9's sector progression should resist growing new
  currencies or resources of their own**, the way every peer game's did over
  time (see `core-loop-vs-features.md`'s resource table — none of the 8 held a
  fixed resource count for long).
- **In-game chat as the only coordination surface.** Multiple peer games' guides
  recommend supplementing in-game alliance chat with Discord, implying the
  built-in tooling is treated by its own playerbase as insufficient. Not a Phase
  3 concern (no alliances yet), but worth flagging now for whoever designs P4.4
  (Mail) and P5.1 (Alliance Embassy) later: aim higher than genre-norm chat
  rather than treating "good enough that players route around it via Discord" as
  an acceptable bar.

## Part 4 — Risk flag carried from `user-notes.md`

Restated because it's the single highest-leverage finding from this whole
research effort: **Phase 3 can only ever build the "Phase 1" shape** (solo
growth sprint) from the user's four-phase framing, since Voidbound has no
alliance layer to transition a player into once that content runs out — and
every peer game's "Phase 1" content is explicitly designed to run out and hand
off to alliance-driven "Phase 2" content at almost exactly the point Phase 3's
local alpha will end. If P3.9's NPC-opposition sector progression and P3.11's
ascension loop don't provide enough runway on their own, a solo Voidbound player
hits the genre's most common churn point with nothing on the other side of it —
a risk none of the 8 peer games actually face, since they all have a live
alliance layer waiting right where Voidbound's Phase 3 currently ends. This
isn't a reason to rush Phase 5 forward — it's a reason to make sure P3.19's
playtest specifically measures whether P3.9/P3.11 content lasts long enough to
matter on its own, not just whether it's fun in isolation.

## Decisions (resolved 2026-08-10)

The four open questions this research surfaced were put to the user directly and
resolved as follows. Recorded here so a future session doesn't re-litigate them;
each carries forward into the relevant Part 1/3 section above.

1. **Power score for P3.9/P3.10 NPC difficulty: yes, add one now.** Voidbound
   should design a headline aggregate power stat (Command Module + module
   levels + vessel tiers + research, in the spirit of the genre's CP/Power) even
   before Phase 6 PvP exists to consume it — it drives NPC/sector difficulty
   scaling in the interim and gets the concept validated early rather than
   retrofitted later. Concretely relevant to P3.9's design: NPC opposition
   strength and P3.11's campaign difficulty curve should be readable against
   this number, the way every peer game's CP is legible against its own PvE/PvP
   content.
2. **P3.7 vessel/crew hero layer: worth exploring, non-gacha.** Not a commitment
   to build it, but a green light to design P3.7 with room for named individuals
   (vessel captains? specialist crew?) with skills, acquired through progression
   or direct action rather than randomized pulls — Lords Mobile's model (§
   Part 2) is the reference to reach for specifically, not the 6-of-8-games
   gacha default Part 3 rejects.
3. **Event-calendar rhythm: in scope for Phase 3, not deferred to P7.1.** P3.9's
   sector progression and/or P3.11's campaign should include some
   returning/escalating structure — a solo, reframed analog of Bear Hunt/Zombie
   Siege's wave-escalation shape (this doc's Part 1 P3.9/P3.10 section already
   names this pattern) — rather than leaving all recurring-content design to
   P7.1's later curated-events system. P7.1 remains the place for server-curated
   live content once P4.1 exists; this is about Phase 3 not being solely
   one-shot content.
4. **P5.9 monetization stance: write one down now.** Record a working direction
   — **no real-money purchases that affect gameplay power** — as the likely
   shape of P5.9's eventual decision, informed directly by
   `comparison/community-sentiment.md`'s #1 finding (permanent P2W gaps are the
   single most universal complaint across all 8 games). This doesn't formally
   close P5.9 (that's still a task to do properly when Phase 5 arrives, and
   "whether real-money purchases fit Voidbound at all" per ROADMAP's own framing
   is broader than just P2W), but it means P5.9 shouldn't be treated as a blank
   slate — cosmetic/convenience monetization remains open, power-affecting
   monetization is now the thing to argue _for_, not the default to argue
   against.

## Part 5 — Round 2 (space-SLG and non-survival widening)

Four more games (Star Trek Fleet Command, EVE Online, Clash of Clans, OGame —
see `00-task-list.md` §4 for why) were added per the user's 2026-08-10 direction
to widen past the "overdone" survival-SLG subgenre. Full detail in each
`comparison/*.md`'s "Round 2" section; this is the load-bearing subset for Phase
3 planning specifically.

**P3.8 (Expeditions + fuel economy) has a near-literal precedent now: OGame's
Expedition system.** Send a fleet to unclaimed deep space; a concrete
outcome-odds table (~32% resources, ~22% a found ship, ~19% nothing, ~9% premium
currency, ~6-12% hostile encounter, ~1% chance of losing the _entire fleet_ with
no return); slot count scaling with a research stat
(`floor(sqrt(Astrophysics level))`); diminishing returns from repeatedly
targeting the same system. This is closer to ROADMAP's own P3.8 description
("consume fuel, expose up-front risk/reward, return choices or rewards through
authoritative events") than anything found in the original 8 — worth a direct,
detailed read of `games/ogame.md` §5 when P3.8 is actually designed, not just a
general risk/reward gesture.

**P3.9 (NPC opposition + radial sectors) gets a second concrete precedent: Star
Trek Fleet Command's warp-range-gated mining and its player-invented "Rules of
Engagement" governance.** STFC ties resource yield directly to how deep into
contested/dangerous space a node sits (not just its grade) — close to
Voidbound's own radial asteroid-grade design (P2.6), just with an extra "how far
are you willing to fly into danger for this" axis layered on. More strikingly:
STFC's community _invented its own etiquette code_ around mining
(Survey-ships-only, vacate exhausted nodes, no "node-ninja"ing) with
player-appointed enforcement officers, entirely without developer code forcing
it. Combined with Rise of Kingdoms' king/title governance (Part 1) and EVE's
Council of Stellar Management (below), this is now a third independent data
point that **giving players real tools and letting social norms fill the gaps
can work as well as, or better than, hard-coding a rule** — relevant less to
Phase 3 (no other players yet) and more to how P5.1/P5.2's alliance design
should think about what to encode vs. what to leave to player culture.

**P5.1/P5.2 (Alliance Embassy, territories) gain a genuinely new reference
class: EVE Online's corp → alliance → coalition structure and the Council of
Stellar Management.** Two things worth carrying forward specifically: (1) EVE's
**three-tier social structure** (corporation → alliance → informal,
game-mechanically-unbacked coalition) is richer than any mobile SLG's flat
alliance-only model, and its coalitions — "far more powerful than any other
group in EVE" despite having zero special game mechanics — are a real example of
politics emerging from _social_ stakes (shared enemies, standing grudges,
multi-year institutional memory) rather than anything coded; (2) the **Council
of Stellar Management** — ten-plus players democratically elected by the entire
playerbase, meeting regularly with the developer — is a genuinely distinctive
governance mechanism with no equivalent anywhere else in this research. Neither
is a Phase 3 concern, and CSM-style formal player governance is very likely too
heavy for Voidbound's scale even at Phase 5 — but both are worth having on file
as the deep end of "how far could alliance/social design go" when P5.1/P5.2
actually get designed.

**P6.3 (PvP combat resolution) gains a design philosophy worth naming: EVE's
destruction-driven economy.** Nothing in EVE is manufactured for its own sake —
it's manufactured because something else got blown up in PvP, which keeps
mining/industry in perpetual demand rather than a one-way accumulation
treadmill. Voidbound's README already has a version of this instinct (fuel
"leaves the system," mothership warp is a sink), but EVE's economy is the
clearest real-world proof that **combat losses feeding back into the production
economy** (not just redistributing loot) is a viable, even celebrated design —
worth keeping in mind when P6.3 designs what actually happens to lost
vessels/modules, beyond "loser loses, winner gains."

**Part 3's rejection of system bloat gets its strongest confirmation yet: Clash
of Clans.** Two of the four round-2 games (CoC and OGame) run entirely without a
hero-gacha layer, and CoC in particular runs the leanest additional-feature
surface of any of the 12 games researched (§7 of its own doc is close to its
_entire_ side-feature list) while remaining one of the highest-grossing,
longest-running mobile games ever made. This is direct, commercially-proven
evidence that Part 3's stance (resist growing new currencies/systems the way
every survival-SLG did) is not a purity position that trades away success — CoC
is the existence proof that it doesn't have to.

**One decision-adjacent note, not a reopening:** OGame's new-player protection
is **ratio-based** (can only attack/be attacked by accounts within ~5-10x your
own point total) rather than the flat 72-hour timer already decided for
Voidbound (see Decisions, item 1 is the closest analog — actually recorded under
the protection-bubble entry in `user-notes.md`). Not proposing a change — the
flat-bubble decision stands — but recording the alternative model here in case
the accepted tradeoff ("ascended players can play around a flat timer
deliberately") ever resurfaces as a real problem worth revisiting.
