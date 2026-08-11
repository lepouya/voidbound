# Research task list

Living tracker for the Phase 3 competitive research effort. Check items off as
they land; add new ones as scope grows rather than letting them float unrecorded
in conversation (this file is the compaction-proof memory for this effort — see
`README.md`).

## Per-game doc template

Every file in `games/` follows this shape so the comparison docs can be built
mechanically from them:

1. Overview — genre, developer/publisher, release date, platforms, rough scale
   (downloads/revenue if findable), monetization model
2. Core gameplay loop — the thing a player does every session, end to end
3. Base building & progression systems — building/upgrade structure, hero or
   army systems, tech trees, power/CP score
4. Resource economy — resource types, production, cap/storage, spend sinks
5. Combat systems — PvE (stages/chapters/rally bosses), PvP (rallies, kill
   events, alliance wars, garrisons/traps)
6. Alliance/social systems — alliance structure, chat, cross-alliance diplomacy,
   gifting
7. Additional/side features — events, mini-games, side stories, battle passes,
   collection systems — kept **separate** from the core loop per the user's
   request
8. Early game (first session / first few days) — onboarding, guided chapters,
   pacing
9. Mid game — what sustains play once the tutorial ends
10. Late/end game — what top players actually do; where the game runs out of
    content or becomes a grind/whale treadmill
11. Community sentiment — themes from the subreddit, App Store/Play reviews, and
    YouTube guides/creators — what's praised, what's the recurring complaint
12. Sources — every link used

## Status

### 0. Setup

- [x] Read root docs (`README.md`, `ROADMAP.md`, `AGENTS.md`/`CLAUDE.md`,
      `SERVER.md` already known from project memory) to ground Phase 3 scope
- [x] Create `docs/claude/` structure (`games/`, `comparison/`, this file)

### 1. Primary three games (user-specified)

- [x] `games/dark-war-survival.md`
- [x] `games/whiteout-survival.md`
- [x] `games/tiles-survive.md`

### 2. Genre-peer discovery

- [x] Scoping search: identify the actual closest genre peers (not guessed —
      verified via search) to the three primary games. Record the candidate
      list + why each was picked/rejected below.
- [x] `games/state-of-survival.md`
- [x] `games/last-war-survival.md`
- [x] `games/rise-of-kingdoms.md`
- [x] `games/lords-mobile.md`
- [x] `games/top-war.md`
- [x] `games/star-trek-fleet-command.md`
- [x] `games/eve-online.md`
- [x] `games/clash-of-clans.md`
- [x] `games/ogame.md`

**Round 2 additions (2026-08-10, user directive: "wide angle view of
everything... don't want to stick to the survival genre that is overdone"):**

- **Star Trek Fleet Command** (Scopely) — space-set SLG: motherships, fleet
  dispatch, mining, alliances. The single closest thematic peer to Voidbound of
  any game in this research set (space setting, not a zombie/apocalypse reskin)
  — high value even though it wasn't in the original 3+5.
- **EVE Online** (CCP Games) — not mobile, not a "state-building game" in the
  SLG sense, but the reference-class sandbox space MMO: genuine player-driven
  economy, alliance sovereignty warfare, and politics/loyalty dynamics Rise of
  Kingdoms' own doc already compares its governance system to. Voidbound's
  SERVER.md ambitions (event-sourced authoritative multiplayer, alliance
  economy) sit closer to EVE's lineage than to any mobile SLG researched so far
  — worth a dedicated look specifically for that reason, even though its actual
  UI/onboarding/monetization shape will mostly _not_ transfer to a mobile-first
  game.
- **Clash of Clans** (Supercell) — the genre's root ancestor: base-building
  - asynchronous attack/defense with no survival narrative wrapper, no
    hero-gacha bloat. Useful as a "what does this genre look like with the
    apocalypse-survival skin stripped off, and half the systems this research
    set has been full of" contrast.
- **OGame** (Gameforge) — browser-native MMORTS classic (2002), also
  space-themed (planets, fleets, resource production) — closer to Voidbound's
  own "MMORTS" self-description (`README.md` §1) than the mobile SLGs researched
  so far, and old/mature enough to show what design choices from that era did
  and didn't hold up.

**Candidate list (from discovery step, Aug 2026):**

The genre is commonly called **SLG** ("strategy-lite game") or mobile "4X-lite"
/ "state-building game" — base building + resource management + hero/army
collection + alliance PvP, wrapped in a guided chapter campaign.
`Tiles Survive!` and `Dark War: Survival` are both explicitly compared to
`Whiteout Survival`/`Last War: Survival` in press and community discussion ("if
Whiteout Survival & Last War had a baby" — Dark War review). Selected peers,
chosen for variety of angle rather than just "more of the same":

- **State of Survival** (FunPlus) — same publisher as Tiles Survive!, zombie
  theme, been live since 2019 — the mature-endgame data point the three primary
  games (all newer) can't give us on their own.
- **Last War: Survival** (FunPlus) — the other half of the "if X and Y had a
  baby" comparison for Dark War; huge celebrity-ad marketing spend, hero-squad
  system, frequently cited alongside Whiteout as redefining the genre's
  monetization/onboarding for a broader (less hardcore-4X) audience.
- **Rise of Kingdoms** (Lilith Games) — older, more traditional historical 4X
  with real-time combat/formations and civilization choice; contrast point for a
  _harder_, less streamlined version of the same genre.
- **Lords Mobile** (IGG) — long-running (2016) fantasy kingdom-battle SLG;
  contrast point for a mature game's guild/kingdom social layer and gacha hero
  system.
- **Top War: Battle Game** (RiverGame) — merge mechanic (combine low-tier units
  into high-tier) bolted onto the same base-building/alliance shell; contrast
  point for a differently-shaped core loop within the same genre.

Rejected/deferred: Frozen City, Last Fortress: Underground, Last Shelter:
Survival, Doomsday: Last Survivors, Puzzles & Survival, Age of Origins, King of
Avalon, Evony — all genuine peers but largely redundant with the five picked
above (same zombie-survival-SLG shape as State of Survival/Last War, or same
historical-fantasy-SLG shape as Rise of Kingdoms/Lords Mobile). Revisit this
list if a specific mechanic search turns up something none of the eight games
already cover.

### 3. Comparison / synthesis docs

- [x] `comparison/core-loop-vs-features.md` — core gameplay loop compared across
      all researched games, separate section for additional/engagement features
- [x] `comparison/early-mid-late-game.md` — per-game breakdown of the starting
      experience, mid game, and end game, then cross-game patterns
- [x] `comparison/community-sentiment.md` — Reddit/review/YouTube themes per
      game: what's praised, what's the recurring complaint, what churns players
- [x] `voidbound-application.md` — synthesis against Voidbound's README design
      principles and ROADMAP Phase 3 task list: what transfers directly into
      P3.1-P3.19, what's relevant but belongs in a later phase (call out which
      phase), what conflicts with Voidbound's stated design principles and
      should be deliberately rejected

### 3.5. User firsthand notes

- [x] `user-notes.md` created — 2026-08-10 entry: the four-phase arc (solo
      growth sprint → alliance/group content → center-map war → seasons/server
      wars) observed across the games tried, plus its mapping onto Voidbound's
      own Phase 3/5/6 boundaries. **Append here, don't overwrite**, as more
      firsthand input comes in — treat as higher-trust than any `games/*.md`
      secondary source where they conflict (reddit.com was unreachable to every
      research agent, so this file is the only primary-source community voice we
      have).
- [x] 2026-08-10 follow-up round: protection-bubble decision recorded (72h,
      broken by synchronous PvP action) — see `user-notes.md` and
      `voidbound-application.md` Part 2/P6.3.

### 4. Round 2 peer research (space-SLG / non-survival widening)

- [x] `games/star-trek-fleet-command.md`
- [x] `games/eve-online.md`
- [x] `games/clash-of-clans.md`
- [x] `games/ogame.md`
- [x] Fold round-2 findings into the three `comparison/*.md` docs (add a "round
      2" pass rather than rewriting from scratch — only touch sections a new
      game's data actually changes)
- [x] Update `voidbound-application.md` if round 2 changes/adds to Parts 1-4
      (expected candidate: EVE Online's alliance/sovereignty economy vs.
      Voidbound's Phase 5 alliance design; Star Trek Fleet Command as maybe the
      single most load-bearing comparison game given the shared space setting)
      — landed as a new **Part 5** since round 2 was additive, not corrective

### 5. Preliminary plan document

- [x] `preliminary-phase3-plan.md` — task-by-task notes for P3.1-P3.19 drawing
      on all `games/`, `comparison/`, `user-notes.md`, and
      `voidbound-application.md` (Parts 1-5 + Decisions). Framed at the top as
      one of three inputs pending reconciliation with docs/gemini + docs/gpt,
      per `AGENTS.md`'s review gate. Still subject to `AGENTS.md`'s gate: no
      code, not a
      substitute for the user's own read-through.

## Open questions / decisions log

(Record decisions made along the way here so we don't re-litigate them after a
compact — e.g. "decided to treat X as out of scope because Y".)

- **reddit.com is not fetchable by WebFetch in this environment** (confirmed
  during `whiteout-survival.md` research, Aug 2026 — old.reddit.com blocked
  too). Every per-game doc's "Community sentiment" section is therefore sourced
  from independent reviews, aggregated App Store/Play review summaries,
  YouTube-adjacent writeups, and (per-game) forum/HN threads where findable —
  not primary subreddit quotes, despite the README/task-list instructions asking
  for them. This is a real gap for the `comparison/community-sentiment.md` doc:
  the user has first-hand experience with the three primary games and reads
  these subreddits themselves, so that doc should lean on **the user's own
  input** for subreddit-flavor sentiment rather than pretend the agents captured
  it. Flag this plainly when presenting the community-sentiment synthesis rather
  than let secondary sources masquerade as subreddit consensus.
- **Rise of Kingdoms flag worth carrying into the synthesis:** its "Expedition"
  mode (a staged, singleplayer-vs-AI campaign with star ratings, playable
  without pulling troops off map tasks) and its unusually deep
  kingdom-governance/politics layer (elected King, buffable/punishable titles,
  cross-alliance diplomacy gating content) are probably its most distinctive
  features vs. lighter SLGs — directly relevant to P3.9 (NPC opposition) and
  P3.10 (PvE combat vertical slice) as a "harder mode" reference point.
- **Star Trek Fleet Command flag worth carrying into the synthesis:** its
  space-flavored mechanics are the most directly transferable of any peer
  researched — warp-range-gated mining/territory, cargo-hold-based raid exposure
  (a spatial analog to Voidbound's Warehouse-cap pattern), and especially
  **player-invented "Rules of Engagement" governance** (community norms like
  Survey-ships-only mining and "Node-Ninja" etiquette, enforced socially by
  player-appointed RoE Officers, not by game code). That last one is a
  real-world example of player self-governance emerging around a
  resource-scarcity mechanic with no dev-coded rule forcing it — relevant to
  Rise of Kingdoms' king/title governance layer as a second data point, and
  worth keeping in mind for Phase 5/6 alliance design as a case where _not_
  hard-coding a rule (and instead giving players the tools to self-enforce one)
  was apparently sufficient.

## Next session pickup

If resuming cold: read this file's Status section top to bottom, pick up the
first unchecked box. `games/` files already present don't need to be redone —
read them instead of re-researching.
