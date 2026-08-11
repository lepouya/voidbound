# Voidbound — Phase 3 Competitive Research (Claude track)

This folder is Claude's independent research workspace for planning **Phase 3 —
Local playable alpha** (see `../../ROADMAP.md`). It is not shared with the
concurrent `docs/gemini/` or `docs/gpt/` research tracks — don't read or edit
those, and don't expect this folder to match their structure or conclusions.

## Purpose

Phase 3's goal is "a complete local single-player arc" that's understandable,
engaging, and worth returning to (ROADMAP P3.1-P3.19: objectives/onboarding,
research tech tree, vessel/combat progression, expeditions, NPC opposition,
campaign completion/ascension, plus UI/art/audio polish). Before designing that
arc, we're studying how three mobile games the user already plays — **Dark War:
Survival**, **Whiteout Survival**, and **Tiles Survive!** — and their genre
peers solve the same problem: base-building + resource + hero/army progression
games with a single-player-feeling campaign layered under alliance/PvP systems.

## How this folder is organized

- **[00-task-list.md](00-task-list.md)** — the living task tracker for this
  research effort. Read this first when resuming after a compact/session break;
  it's the source of truth for what's done, in progress, and next.
- **[games/](games/)** — one file per game researched, one consistent template
  (see task list for the template shape). Primary three games plus discovered
  genre peers.
- **[user-notes.md](user-notes.md)** — the user's own firsthand play
  observations, appended over time. Treat as higher-trust than any `games/`
  secondary source where they conflict — it's the only primary-source community
  voice in this folder (reddit.com was unreachable to every research agent; see
  the task list's decisions log).
- **[comparison/](comparison/)** — cross-game synthesis documents: core loop vs.
  additional features, early/mid/late-game arcs, community sentiment themes, and
  monetization/engagement patterns.
- **voidbound-application.md** (once written) — the payoff document: what of
  this applies to Phase 3 specifically, what's relevant but belongs in a later
  phase (Phase 5 alliances/economy, Phase 6 PvP/combat, Phase 7 events), and
  what doesn't fit Voidbound's design principles at all (README.md's design
  principles are the filter — e.g. no hard energy caps, exactly 4 resources,
  server-authoritative event pattern).

## Ground rules for this research

- Every game doc cites sources (official pages, subreddits, YouTube guides,
  wikis) — this is a synthesis of public information plus the user's own
  first-hand play experience, added conversationally as we go.
- Findings are separated into **core gameplay loop** (what you do every session)
  vs. **additional features** (events, side modes, engagement/retention hooks)
  per the user's request — conflating the two makes the Voidbound application
  section muddy.
- Findings are broken into **early / mid / late game** per game — a mechanic
  that's great on day 1 (guided chapters) can be exactly what feels bad at
  end-game (nothing left to build), and Phase 3 needs to work across that whole
  arc for a single player.
- This is research and planning only — no code changes happen from this folder.
  Per AGENTS.md's review gate, even the eventual planning docs need the user's
  read-through before we start implementing against them.
