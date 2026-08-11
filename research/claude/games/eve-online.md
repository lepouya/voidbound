# EVE Online

> **Note on fit:** EVE Online is a PC subscription/F2P-hybrid sandbox MMO, not a
> mobile "SLG" — it was picked deliberately to widen the research past that
> genre. Several sections below (base building, events calendar) don't map
> cleanly onto EVE's shape; where that happens this doc says so plainly instead
> of forcing the template.

## 1. Overview

- **Genre:** Space sandbox MMORPG — player-driven economy, open-world PvP, and
  territorial conquest, with PvE (missions, exploration, incursions) as a
  secondary/supporting activity rather than the main draw.
- **Developer/Publisher:** CCP Games (Reykjavík, Iceland). Founded 1997,
  self-published EVE since taking back publishing rights from Simon & Schuster
  Interactive in late 2003. CCP was independent for most of its history, was
  acquired by Pearl Abyss (South Korea, makers of Black Desert Online) in
  October 2018, and — per a 2025 industry report found in research — has since
  gone through some form of renewed independence/ restructuring from Pearl Abyss
  while Pearl Abyss remains involved; sources on the exact current ownership
  structure were not fully consistent and this should be treated as
  directionally true rather than pinned down precisely.
- **Release date:** May 6, 2003 (Windows, North America and Europe). Native
  Linux and macOS clients followed November 6, 2007; macOS got a further
  native-client update October 13, 2021.
- **Platforms:** Windows, macOS, Linux. No official mobile client for the core
  game (CCP has since built separate, related titles — see §7 — rather than
  porting EVE proper to mobile).
- **Scale:**
  - **~25 million registered accounts created since 2003** (cumulative, not
    concurrent/active).
  - CCP Games reported **$82.7 million in revenue for 2025**, its strongest year
    in over a decade — up from $60.2M (2024) and $73.2M (2023). December 2025
    alone was $9.2M, the single best month, driven by the Revenant expansion,
    the Equinox update, and a December PLEX sale that converted players to
    subscriptions.
  - Historical benchmark: CCP reported **$66M revenue for 2011** and was
    reportedly considering an IPO at that time (TechCrunch) — useful as a
    reminder that EVE's revenue has stayed in the tens-of-millions range for
    well over a decade, a very different shape from a hit mobile SLG's
    hundreds-of-millions-to-billions.
  - Active subscriber/concurrent-player counts are not published by CCP in the
    way mobile SLGs report DAU; third-party trackers (Steam charts, community
    blogs) are the closest proxies and were not independently verified for this
    doc.
- **Monetization model:** Hybrid **subscription + microtransaction**, one of the
  oldest and most-studied hybrid models in MMO history:
  - **Omega** subscription (~$15-20/month list price, frequently discounted
    via multi-month packages; research found a promotional low as cheap as
    ~$4.93/month) unlocks full skill training breadth and 2x training speed.
  - **Alpha clones** are a permanently free-to-play tier (introduced 2016): can
    fly Tech 1 frigates through battleships across all four factions, train a
    restricted skill list capped around 5,000,000 skill points, at half the
    SP/minute rate of Omega.
  - **PLEX** (originally "Pilot's License Extension") is a tradeable premium
    currency bought with real money that can be redeemed for 30 days of Omega
    time, sold on the in-game player market for ISK (the in-game currency), or
    spent in the microtransaction store on cosmetics/skins/ships. This is the
    mechanism that lets players who are good at making ISK in-game play entirely
    "for free" by buying their subscription from other players — and it is also
    a real-money-value anchor that makes ISK-denominated battle losses (see §5,
    §11) convertible to approximate USD figures that press coverage regularly
    cites.
  - A cosmetics store (ship skins, clothing for the "Incarna" avatar/captain's
    quarters system, MCT/multiple-character training add-ons) supplements
    subscription + PLEX revenue.

## 2. Core gameplay loop

There is no single universal "session loop" the way a mobile SLG has one — EVE's
loop is defined by whichever of several parallel professions a player has chosen
(industrialist, miner, mission-runner, explorer, PvP roamer, null-sec fleet
member, market trader), and it looks very different session to session. What is
common across almost all playstyles:

1. **Log in, check the passive systems.** Skill queue still running (it trains
   in real time even offline — see §3), planetary interaction colonies
   generating commodities, industry jobs (manufacturing/research) that may have
   completed, market orders that may have filled, mining/ratting corp-mates to
   catch up with in voice chat (EVE is unusually voice-chat-and-Discord-centric
   for a "sandbox" game).
2. **Pick an activity for the session**, session length ranges from a
   fifteen-minute market/industry check-in to a multi-hour null-sec fleet
   operation. Common session shapes: run a chain of PvE missions or anomalies
   for ISK and standings; mine or scan down exploration sites; haul goods
   between trade hubs; build/sell items on the market; join a corp/alliance
   fleet for a scheduled PvP operation, roam, or defensive sovereignty timer.
3. **Manage risk against reward constantly.** Nearly every ship taken out of a
   station can be destroyed permanently by other players (in low-sec/
   null-sec/wormhole space) or NPCs, and losses are real — there is no
   "insurance refunds everything" safety net beyond a partial ISK payout on
   certain hull losses. This risk calculus (what am I willing to lose to do
   this?) is the throughline of essentially every EVE session, and is widely
   cited by both fans and critics as the single most defining trait of the game
   (see §11).
4. **Talk to people.** Because so much of EVE's substance (fleet ops,
   corp/alliance politics, market manipulation, scams, diplomacy) is
   player-to-player rather than player-to-content, a large fraction of
   "gameplay" happens in chat/Discord/voice comms rather than in the 3D client
   itself.
5. **End the session by re-queuing skills / re-setting market orders / parking
   the ship somewhere safe** — the asynchronous systems (skill training,
   industry jobs, market orders, PI extraction) are what carry progress forward
   between sessions, functionally similar in shape (if not in presentation) to a
   mobile SLG's "set a timer and come back later" loop, but generally on longer,
   subscription-style time horizons (skills train over days/weeks, not
   minutes/hours).

## 3. Base building & progression systems

EVE has no direct analog to a mobile SLG's single upgradable home base —
progression is split across several independent systems:

- **Skill training (the defining, unusual mechanic).** Character power comes
  entirely from **skills**, trained in **real time, continuously, including
  while logged off**, via a **skill queue** (drag skills into an ordered list;
  the first trains, then the next starts automatically). There is no active
  "grinding" involved in training itself — a character with a 100-day queue set
  will be exactly as trained in 100 days whether the player logs in once or
  never during that span. As of March 2025 there were 494 trainable skills.
  Skill levels (I-V) require sharply increasing skill-point investment (Level I
  = 250 SP, II = 1,414, III = 8,000, IV = 45,255, V = 256,000 — for a rank-1
  skill; higher-rank skills multiply all of these), so going from "capable"
  (level III/IV in relevant skills) to "fully maxed" (level V everywhere
  relevant) can cost 5-10x the time for the last increment of a stat. Training
  speed is governed by five attributes (Intelligence, Perception, Charisma,
  Willpower, Memory), each skill having a primary and secondary attribute:
  `SP/minute = primary + secondary/2` for a paying (Omega) account, half that
  for a free (Alpha) account. A default new character trains around 29-30
  SP/minute; an optimized veteran with implants can reach ~45/minute. **There is
  deliberately no level cap** — training every skill to V for a single character
  has been estimated at over 24 years of continuous training — so the game is
  structured around specialization (a young character can be excellent at one
  thing quickly) rather than a race to a ceiling. **Skill injectors**
  (consumable items, bought/sold on the market) let players convert ISK directly
  into skill points for a chosen character, and **skill extractors** do the
  reverse (pull trained SP back out as a sellable item) — together these turn
  "time played" into a tradeable commodity, letting wealthy players buy
  character power directly and letting trained veterans monetize skill points
  they don't need. This whole system means a brand-new EVE character can, in
  principle, fly the exact same ship as a 20-year veteran within weeks if the
  right skills are injected — a very different progression philosophy from a
  mobile SLG's building-level gates.
- **Ship tiers/classes** function as the "what can I do today" progression axis
  more than skills do moment-to-moment: Frigates (smallest, fastest, cheapest —
  new players start here) → Destroyers → Cruisers (EVE's do-everything mid-tier)
  → Battlecruisers → Battleships, with Tech 2 specialized variants of most hulls
  (e.g., Marauders — mission-running battleships — and Black Ops battleships —
  covert fleet insertion — as the two Tech 2 battleship lines) and Tech 3
  "strategic cruisers." Above that sit **capital ships**, restricted to
  low-sec/null-sec/wormhole space and requiring deep skill investment: Carriers
  (fighter-drone platforms, subcapital-ship counters), Dreadnoughts (siege-mode
  anti-structure/ anti-capital damage dealers), Force Auxiliaries (capital-fleet
  remote-repair logistics, triage mode), Supercarriers (upgraded carriers that
  field fighter-bombers capable of hurting other capitals), Titans (the largest
  ships in the game, mounting Doomsday superweapons and Jump Portal Generators
  that can bridge whole fleets across the map), and the Rorqual (a capital
  industrial ship built around ore compression and mining support, occasionally
  refit for combat). Losing any of these ships is permanent — there is no
  auto-respawn of the hull, only whatever ISK a player can earn to build/buy a
  replacement.
- **Corporation structures** are EVE's analog to "guild/alliance" scaffolding
  and are themselves a progression axis players build up over time (see §6 for
  the social/political dimension). A **corporation** has a single **CEO** (only
  one at a time; the only role that can appoint/remove **Directors**) and a
  granular role system (Directors hold every permission and can grant any
  non-Director role to members) governing hangar access, market/contract rights,
  structure fueling, recruitment, and more. Corporations then join **alliances**
  — "a collection of corporations under one flag" — where no single person has
  direct control over a member corporation's internal affairs; corporations opt
  in to shared alliance goals (mutual defense, joint sovereignty holdings,
  shared logistics) while remaining internally autonomous. This two-tier (corp →
  alliance) plus informal third tier (alliance → coalition, an
  alliance-of-alliances with no hard game-mechanical backing, purely political —
  see §6) structure is the scaffolding all of EVE's null-sec warfare and
  politics is built on.
- **Planetary Interaction (PI)** and **industry/research jobs** (blueprint
  research, manufacturing, invention) are the closest things to "base building":
  players establish automated extraction/processing chains on planets (5 tiers
  of commodities, from raw-extracted Tier 0 up through processed Tier 4) and
  build/upgrade citadels, engineering complexes, and refineries
  (player-deployable structures that function as bases, complete with their own
  fuel/vulnerability/defense mechanics) in space — the structure itself can be
  attacked and destroyed by hostile players, making "base building" in EVE
  inseparable from the PvP/territorial systems in §5-6 rather than a safe,
  purely economic activity.

## 4. Resource economy

EVE's economy is widely regarded — including by outside academic and industry
observers — as the most sophisticated genuinely player-run economy in any
commercial MMO, to the point that CCP has employed real economists to study it.

- **Resource types:**
  - **Ore** (mined from asteroids), varying by security-space tier: simple ores
    (Veldspar, Scordite) in high-sec, coherent ores (Omber, Kernite) in low-sec,
    complex ores (Bistot, Arkonor) plus rare Mercoxit in null-sec, special
    border/"A0" ores in rare cosmic anomalies, Abyssal ores (Bezdnacine,
    Rakovene, Talassonite) in Triglavian/Abyssal space, and mixed ore types in
    wormhole space.
  - **Ice**, harvested with dedicated ships/equipment, refines into fuel
    materials for structures and capital ships.
  - **Gas**, harvested from gas clouds, feeds booster and Tech 3 production
    chains.
  - **Moon ores**, extractable only via player-anchored refineries with a Moon
    Drill module within range of a mining beacon in 0.5-security space or lower;
    moon ore is the sole source of certain Tech 2/capital construction
    materials, historically making moon-rich null-sec systems major strategic
    and political prizes (moon mining rights have driven entire alliance wars).
  - **Planetary commodities** (5 tiers, Tier 0 mined directly, Tiers 1-4 built
    via planetary processors) feed into higher-tier manufacturing, especially
    structure fuel and advanced components.
- **Production chain:** Ore is refined into minerals ("the fundamental driver of
  industrial production" per EVE University), which industrialists combine via
  blueprints (which themselves can be researched to reduce material waste or
  production time, or "invented" from Tech 1 into Tech 2 variants) into modules,
  ships, ammunition, and structures. Because ships and structures are constantly
  being destroyed in PvP, mining products stay in perpetual demand — EVE's
  economy is explicitly built around a **destruction-driven demand loop**:
  nothing is manufactured for its own sake, it's manufactured because something
  else got blown up.
- **The player-driven market:** Trading uses a **regional order-book market**
  (buy/sell orders, not fixed developer-set prices) with major hubs at **Jita**
  (by far the largest, in The Forge region), Amarr, Dodixie, Rens, and Hek.
  Prices are set entirely by player supply and demand — CCP does not set item
  prices — which is what makes the economy "genuinely player-run" rather than
  developer-tuned: mining booms, wars, blockades, and speculation move prices
  exactly as they would in a real commodity market, including periodic mineral
  shortages, price crashes, and speculative bubbles.
- **CCP's economist:** CCP hired **Dr. Eyjólfur Guðmundsson** (from the
  University of Akureyri, previously a research associate at the University of
  Rhode Island's environmental/natural-resource economics department) as the
  game's dedicated in-world economist/"Lead Economist" — reportedly the first
  time an MMO studio commissioned a dedicated professional economist to monitor
  a virtual economy at this level. He described his role as equivalent to "a
  research scientist for a central bank" whose currency (ISK) simply doesn't
  exist in the real world, and published detailed quarterly/monthly economic
  reports (sometimes running up to 50 pages) analyzing money supply, mineral
  production, mission-generated ISK faucets, and market activity — a practice
  CCP has continued in some form for years (e.g., the referenced January 2026
  monthly economic report), and recently extended by hiring an economist for the
  newer spin-off EVE Frontier (2025) as well.
- **Notable disruption events** (also historically significant socially — see
  §11): **Hulkageddon** (recurring player-organized event, first run April-May,
  targeting mining "Hulk" barges in high-security space for destruction) caused
  real mineral-supply shocks and price spikes each time it ran. **Burn Jita**
  (April-May 2012, repeated as "Burn Jita 2" and "3" in following years) was an
  organized player campaign to disrupt trading at the Jita hub specifically —
  trade volume at Jita reportedly fell roughly 50% over the event weekend while
  trade at the secondary hub Amarr reportedly doubled, a direct, measurable
  market reaction to a purely player-driven event with no CCP involvement.

## 5. Combat systems

Combat is central to EVE and split cleanly into PvE and PvP tracks, with the PvP
side — especially null-sec sovereignty warfare — being the game's most famous
and most heavily press-covered feature.

- **PvE:**
  - **Missions** from NPC agents (combat, mining, courier), including
    faction-specific **Epic Arcs** (multi-mission story chains; Caldari and
    Minmatar arcs are approachable in a battleship, Amarr and Gallente arcs are
    harder and expect a Marauder or a well-fit battleship, long-range weapons,
    and careful play).
  - **Exploration**: scanning down cosmic signatures to find **data sites** and
    **relic sites**, then hacking their loot containers for salvage and
    blueprints; a low-combat, skill-and-risk-based playstyle, especially
    lucrative (and dangerous) in wormhole space.
  - **Incursions**: scripted large-scale invasions by the NPC faction Sansha's
    Nation (led by the character Sansha Kuvakei), requiring organized
    multi-player fleets to clear high-value sites — high risk tolerance for
    coordination, high ISK reward, effectively EVE's version of organized PvE
    "raid" content.
  - **Wormhole PvE** against **Sleepers**, NPCs considerably tougher than
    standard pirate factions, guarding some of the most lucrative PvE content in
    the game.
- **PvP:**
  - **High-security ("high-sec") ganking**: even in the safest space (protected
    by the NPC police force CONCORD, which will kill an aggressor — but only
    after the aggressor has already gotten its shot off), organized "ganker"
    groups destroy valuable, poorly-defended targets (AFK miners, cargo haulers,
    even NPC-owned "Bowhead" freighters) for profit and notoriety, exploiting
    the gap between an attack landing and CONCORD's response.
  - **Low-security ("low-sec") and wormhole space**: unpoliced or
    lightly-policed space with its own PvP culture; wormhole space in particular
    ("w-space," roughly 2,500 systems connected only by temporary,
    player-scannable wormhole links) functions like null-sec-without-sovereignty
    and has bred a distinctive mix of cloak-and-dagger stalking and
    honor-duel-style small-gang brawling.
  - **Null-security ("null-sec") sovereignty warfare**: the headline PvP system
    (detailed further in §6) — alliances hold territory via sovereignty
    structures, defend them during alliance-set vulnerability windows, and fight
    for control in fleet battles that range from small skirmishes to the largest
    engagements in gaming history.
  - **The Bloodbath of B-R5RB (January 27, 2014)** is the single most-cited
    example of EVE's PvP scale, and worth detailing precisely: triggered when
    the alliance H A V O C accidentally let its automatic sovereignty bill
    payment lapse in the B-R5RB system, exposing its sovereignty structure
    during an active war. The resulting battle ran ~21 hours, involved **7,548
    unique participating characters** (6,058 directly in the fight, peaking at
    2,670 pilots in-system simultaneously), and destroyed **75 Titans, 13
    Supercarriers, 370 Dreadnoughts, and 123 Carriers** (roughly 775 Doomsday
    superweapon activations), for a total loss CCP itself put at **11 trillion
    ISK, approximately $300,000- $330,000 USD** at contemporary PLEX conversion
    rates. CCP later placed a permanent in-game monument, "Titanomachy," built
    from Titan wreck models, at the seventh planet of the B-R5RB system. It is
    routinely cited by outside press as one of the largest, most destructive
    battles in any video game, and as evidence that EVE's economy has genuine
    real-world monetary stakes.

## 6. Alliance/social systems

This is EVE's single most distinctive and most heavily analyzed system, and the
specific reason it was chosen for this research pass.

- **Structure:** individual players belong to **corporations** (see §3 for the
  CEO/Director role mechanics); corporations join **alliances** ("a collection
  of corporations under one flag," no single person able to directly control a
  member corp's internals); alliances then informally band into **coalitions** —
  groups of allied alliances with no hard game-mechanical backing at all, purely
  a political/diplomatic arrangement, yet coalitions are "far more powerful than
  any other group in EVE" and are the actual unit of null-sec great-power
  politics.
- **Sovereignty warfare mechanics:** null-sec space is claimed via
  player-deployed sovereignty structures. Alliance directors set an
  **alliance-wide "primetime" vulnerability window** — sovereignty structures
  can only be reinforced/attacked during that window, though attackers can
  disable non-sovereignty station services at other times. The **Equinox**
  (2024) and **Legion** (May 27, 2025) expansions substantially reworked this
  system: Equinox introduced a revamped sovereignty-upgrade suite letting
  alliances convert between resource types (Power ↔ Workforce) more flexibly and
  removed old hard caps on how many upgrade types a system's sovereignty hub
  could hold at once; Legion continued the overhaul, including new options for
  converting captured "skyhooks" (resource-extraction structures) after a
  sovereignty takeover. The overall direction of these changes, per CCP's own
  framing, is to give alliances "deeper control over nullsec systems" and let
  players "customize sovereign space" and "craft missions" — i.e., CCP has been
  deliberately pushing more of null-sec's governance and content-creation power
  into player hands over 2024-2025.
- **The Council of Stellar Management (CSM):** a genuinely distinctive piece of
  EVE's social architecture — a **player advocacy body, democratically elected
  by the EVE playerbase**, established in 2007 (the idea reportedly dates back
  to the game's pre-launch design discussions circa 2001, on the premise that
  EVE's unique socioeconomic dynamics would eventually need a formal governance
  channel). Ten members are directly elected, with two further seats filled from
  the remaining top vote-getters; the council meets with CCP developers
  regularly (including biannual summits at CCP's Reykjavík HQ) to represent
  player interests in ongoing development. As of the most recent (17th) CSM
  election referenced in research, "null-blocs" — candidates backed by the
  dominant null-sec power blocs — continue to dominate the results, itself a
  recurring point of community commentary about whether the CSM meaningfully
  represents casual/non-null-sec players.
- **Diplomacy and politics:** because sovereignty, moon resources, and logistics
  access are all scarce and contestable, alliance-level diplomacy
  (non-aggression pacts, staging rights, tribute/protection arrangements,
  coalition membership) is a full-time activity for null-sec leadership, and its
  breakdowns are historically EVE's biggest news events. Recent (2024-2025)
  null-sec history found in research: the **Imperium** (anchored by Goonswarm
  Federation, historically the largest single alliance, holding Impass and major
  parts of Catch, Immensea, Tenerifis, and Scalding Pass), **B2** (which
  collapsed into the Imperium in late 2023 after 18 months under sustained
  attack from Fraternity and PanFam allies), **PanFam** (a coalition grouping
  including Winter Coalition and various proxies), **Fraternity**, **Pandemic
  Horde**, and **The Initiative** have been the major named power blocs; a
  "Southeastern Agreement" between blocs lapsed in February 2024, opening
  southeast null-sec to conquest, and by mid-to-late 2024 observers projected
  2025 would settle into roughly four major poles (Imperium south, Fraternity
  north, Pandemic Horde west, The Initiative east) rather than the more bipolar
  structure of prior years — with some discussion of the risk of "perpetual war"
  once blocs share borders with no buffering third parties left. This kind of
  multi-year, named, tracked geopolitical narrative (chronicled in detail by
  independent blogs like _The Ancient Gaming Noob_) has no real equivalent in
  mobile SLG "alliance wars," which tend to reset far more often.
- **Espionage, betrayal, and scams as legitimate gameplay:** unlike almost every
  other MMO, EVE's rules explicitly permit scamming, spying, and betrayal
  between players as core, sanctioned gameplay (only real-money trading and a
  few other categories are actually against the EULA). This has produced a
  two-decade history of documented, named incidents, several with real financial
  stakes and outside press coverage:
  - **The Guiding Hand Social Club heist (2005):** a mercenary corp spent about
    a year infiltrating the target corporation Ubiqua Seraph with planted
    double-agents, culminating in the assassination of Ubiqua Seraph's CEO
    "Mirial" (ambushed after being lured into a fabricated show-of-strength) and
    the simultaneous, coordinated looting of the corporation's hangars across
    multiple systems — roughly 30 billion ISK (about $16,500 real-money
    equivalent at the time) stolen in total, plus a paid 1 billion ISK
    assassination contract. Widely cited (including by Guinness World Records,
    for "most hostile corporate takeover") as possibly the single most famous
    engineered story in EVE's history, and still referenced as the archetype of
    what "EVE journalism" covers that no other MMO can.
  - **The Phaser Inc. Ponzi scheme (August 2011):** a four-member corporation
    ran a fraudulent "investment bank" promising 5% weekly returns, drew in over
    4,000 player-investors via word of mouth and testimonials, took in roughly
    1.8 trillion ISK total (paying out ~345 billion in "interest" and letting
    ~~452 billion be withdrawn by wary investors to maintain credibility), then
    vanished with roughly **1.033 trillion ISK** (~~$50,000 real-money
    equivalent) — reported at the time as the largest scam in EVE's history and
    entirely legal under the game's rules.
  - These sit alongside a broader, ongoing genre of "EVE stories" — corporate
    espionage, multi-month spy operations, market manipulation, and mercenary
    contracts — that gaming press (PC Gamer, GamesRadar+, Kotaku, and others)
    return to repeatedly over 20 years specifically because EVE's rules make
    them possible in a way scripted-content MMOs cannot replicate.

## 7. Additional/side features

This section looks different from a mobile SLG's event calendar — EVE's
"content" is disproportionately community-generated rather than a developer-run
rotating event schedule.

- **CCP-run expansions**, delivered as free major content updates (not paid DLC)
  on a roughly multi-times-a-year cadence: recent examples found in research
  include **Equinox** (2024, sovereignty rework), **Revenant** (November 2024,
  continuing a Drifters/"the Deathless" narrative arc and new gameplay
  tech/incentives), and **Legion** (May 27, 2025, described as the sixth full
  expansion since the studio returned to the "named expansion" content format in
  November 2022) — Legion added a Freelancer system letting corporations hire
  non-members for jobs without full membership, new capital-adjacent warships,
  and further sovereignty changes.
- **Fanfest**, CCP's annual (in-person, Reykjavík) community convention — the
  2023 edition marked the game's 20th anniversary and was described as possibly
  the most memorable Fanfest yet; it is also where CCP and the CSM meet in
  person, and where community documentary content (e.g., the Escapist's
  "Belonging: An EVE Fanfest Documentary" and its "Making of EVE Online"
  documentary) has historically been produced.
- **Player-organized, developer-tolerated mega-events** are arguably EVE's real
  "events calendar": **Hulkageddon** (recurring mining-ship massacre campaigns)
  and **Burn Jita** (2012, repeated 2013/2014, coordinated disruption of the
  game's largest trade hub) were entirely player-run, had measurable economic
  effects on the live market (see §4), and are retrospectively treated by CCP
  and press alike as some of the medium's more remarkable emergent-gameplay
  stories — CCP did not design these events, players did, using only the game's
  existing systems. Council of Stellar Management summits and CSM elections (§6)
  are themselves a recurring "event" in the sense that the null-sec power blocs
  actively campaign for seats.
- **Spin-off titles:** CCP has, in recent years, built related but separate
  games rather than porting EVE itself to new platforms — **EVE Frontier** (a
  newer, blockchain/decentralization-flavored spin-off that reportedly got its
  own dedicated economist hire in 2025, mirroring EVE proper's economist
  tradition) and **EVE Vanguard** (a shooter spin-off referenced in research)
  were both found as CCP's current answer to reaching new platforms/audiences,
  rather than a mobile version of EVE Online itself.

## 8. Early game (first session / first few days)

EVE Online has one of the most widely and consistently criticized new-player
experiences in the MMO genre, a reputation the game itself leans into.

- **The reputation:** a veteran player quote surfaced repeatedly in research
  captures it exactly: _"In Eve, you don't have a learning curve, you have a
  cliff."_ New players face genuine information overload — core game knowledge
  (fitting ships, understanding security-space rules, market mechanics, how
  skill training actually works, basic fleet doctrine) is widely regarded as
  living **outside the client itself**, in third-party wikis (the EVE University
  wiki is the community-standard reference used for this research), Discord
  servers, YouTube tutorials, and player-maintained spreadsheets — a player who
  only uses the in-client tutorial is not considered well-equipped.
- **CCP's onboarding efforts:** CCP has iterated on new-player tooling for
  years, including **Career Agents** (a structured set of one-time,
  non-repeatable introductory missions covering combat, mining, exploration,
  industry — meant to be a guided sampler of EVE's different professions) and,
  more recently, **"Gateway"**, a themed series of activities/new characters
  designed to teach ship piloting, firefight survival basics, and early
  money-making in a more narrative, immersive way than older tutorials —
  explicitly built so brand-new players need less real-time intervention from
  developers or senior players just to grasp the basics. The Legion expansion's
  Freelancer system (§7) was also framed partly as a barrier-reduction feature,
  letting new players work with/for a corporation without committing to full
  membership (and the trust risk that implies — see below).
- **The community's role:** despite EVE's reputation for betrayal and cutthroat
  play (§6), the community is described (thegamer.com interview, Fanfest 2025)
  as **actively wanting new players to succeed** — veteran players and streamers
  volunteer ships, ISK, and mentorship "because that keeps the game alive." A
  structural friction point specific to EVE: because espionage/spying is
  legitimate gameplay, veteran corporations routinely use third-party
  verification tools to screen new applicants for being spies before granting
  them trust/access — a trust-establishment step that has no equivalent in most
  other MMOs' new-player experience.
- **Net assessment from research:** even accounting for CCP's onboarding
  investment and the community's welcoming instinct, sources agree the early
  game remains **objectively hard relative to the rest of the genre**; the
  honest framing found repeatedly is "better than it used to be, still a cliff."

## 9. Mid game

Once a character is past the tutorial/career-agent phase, "mid game" in EVE is
less a fixed content tier (as in a themepark MMO) and more the point where a
player commits to one or more of the professions sketched in §2 and starts
building real infrastructure around it: joining a corporation suited to that
playstyle, running higher-value mission/exploration/mining content solo or in
small groups, starting to specialize skill training toward a ship class or
industry chain, and building enough ISK and hull familiarity to survive
occasional PvP losses without those losses being catastrophic. For
null-sec-oriented players, mid game is where they move out of high-security
"empire" space and into an alliance's null-sec or low-sec holdings, taking on
the shared risk/reward (and shared defense obligations) of sovereignty life. For
industry/market-oriented players, mid game is building out production chains,
structure ownership, and market-making capital. Research did not surface a
single canonical "mid-game content tier" the way a themepark MMO would have one
(e.g., a level-cap raid tier); EVE's structure makes "mid game" closer to "the
point where a player has picked a lane and is now deepening it," which is itself
a notable structural difference from mobile SLG mid-game (usually a fixed
sequence of building tiers/hero tiers everyone passes through in roughly the
same order).

## 10. Late/end game

- **What veteran/top players do:** for PvP-oriented veterans, end game is
  effectively **null-sec sovereignty life at scale** — participating in alliance
  fleet doctrine, structure defense/offense timers, capital-fleet operations,
  and the diplomacy/politics layer covered in §6; for the most invested, that
  can mean holding leadership or diplomatic roles in an alliance or coalition,
  which is a substantial ongoing time and social commitment, not a "content"
  activity in the traditional sense. For industry/economy-oriented veterans, end
  game is running large-scale production, structure, and market operations —
  sometimes at a scale where a single veteran player's economic footprint is a
  meaningful fraction of a whole trade hub's activity.
- **Longevity and sustainability, 20+ years in:** EVE is one of the very few
  MMOs from the 2003-era cohort still actively developed and monetizing at a
  meaningful scale two decades later. Research did not find evidence of "server
  death" in the traditional MMO sense (EVE has always run as a single unified
  shard/"cluster," not multiple servers, which is itself structurally different
  from most MMOs and avoids the classic server-consolidation death spiral other
  games face) — instead the narrative found in research is one of **revenue
  volatility around a persistent floor**: 2025's
  $82.7M was the best year in over a decade, but
  that followed a 2024 dip, and the whole multi-year revenue band ($60-83M in
  2023-2025, vs. $66M all the way back in 2011) suggests a mature,
  roughly-steady-state game rather than one still growing or in freefall. What
  appears to sustain it long-term, per the sources gathered: (a) the null-sec
  sovereignty metagame is self-perpetuating — alliances and coalitions have
  multi-year institutional memory, standing grudges, and organizational
  continuity that content updates don't reset; (b) the player-driven economy and
  CSM give players real influence over the game's direction, which appears to
  build unusually durable player investment; (c) CCP continues to ship free
  expansions on a multi-times-a-year cadence rather than treating the game as a
  legacy title in maintenance mode; and (d) CCP has hedged its long-term bet by
  building adjacent spin-off titles (EVE Frontier, EVE Vanguard) rather than
  relying solely on the 2003 game client to carry the franchise forward.
- **Consolidation at the top of the null-sec power structure:** research found a
  clear multi-year trend (2023-2025) toward **fewer, larger power blocs** — B2's
  collapse into the Imperium (2023), the lapsed Southeastern Agreement reopening
  territory to conquest (Feb 2024), and 2025 projected to settle around roughly
  four dominant coalitions rather than a more fragmented map — which several
  observers frame as a long-run risk to null-sec's political dynamism (fewer
  independent third parties means fewer opportunities for the shifting-alliance
  drama that made null-sec politics famous in the first place, and raises the
  specter of static/entrenched "perpetual war" borders between a small number of
  mega-coalitions).

## 11. Community sentiment

- **What's praised:**
  - The emergent, player-authored narrative and social experience is the most
    consistently cited strength. A Steam review from **Raiyne** (over 1,000
    hours): _"I felt like one of them and they wanted me to join them on their
    adventures"_ — praising the game's capacity to generate genuine belonging
    and stories. Another, **HerrQuatsch** (2,330+ hours): calls it _"the most
    satisfying games ever if you stick with it,"_ crediting community
    helpfulness and the payoff of persistence. A third, **BlueDagger** (3,576+
    hours), calls it a _"masterpiece"_ and "truly unique" in gaming,
    acknowledging its flaws but rating the whole unparalleled.
  - The depth and realism of the player-driven economy is repeatedly singled out
    by both players and outside press/academic sources as unmatched in the genre
    — CCP employing a real economist and publishing detailed economic reports is
    treated as a mark of unusual seriousness/prestige, not a gimmick.
  - The community's willingness to mentor new players (§8) is praised
    specifically as counter to the game's reputation for backstabbing — multiple
    sources frame EVE's community as unusually generous toward newcomers even
    though the game's core systems reward betrayal.
- **What's criticized:**
  - The learning cliff (§8) is the single most consistent complaint across every
    source type (Steam reviews, press, forums).
  - **Tedium in core activities**: Steam reviewer **Trackrise** (1,268 hours,
    not recommended): _"right-click from gate to gate and wait...mind-numbing,
    tedious"_ — describing how activities like mining reduce to passive waiting
    punctuated by gank risk.
  - **Monetization/cost complaints**: Steam reviewer **WashedUp** (2,352+ hours,
    not recommended) calls it _"THE MOST expensive MMORPG on the market,"_
    criticizing rising subscription costs and what they frame as predatory
    monetization layered on top of a subscription that's already not cheap by
    genre standards.
  - **Frustration with balance changes ("nerfs") among veterans**: Steam
    reviewer **warriorofthewind** (11,375+ hours(!), not recommended) is a
    striking data point — an extremely long-tenured player turning negative,
    quoting a paraphrased developer attitude as _"we want you to lose everything
    you own and be happy about it"_ and arguing that repeated balance changes
    over the years have driven away entire communities of players who used to be
    invested.
  - Steam's aggregate rating is **"Mostly Positive" overall (72% positive of
    ~38,944 total reviews** per one source's snapshot, ~23,116 recent-window
    total per another), but recent 30-day sentiment was measured as **"Mixed"
    (62% positive of 245 reviews)** at time of research — i.e. even a game with
    a strongly positive long-run reputation is currently running cooler in the
    recent window, consistent with the "loyal long-term base, but real current
    friction" picture the qualitative reviews above paint.
  - Complaints surfaced about botting and toxicity pushing some longtime players
    out of high-sec/low-sec space, and a broader tension some players raised:
    that EVE markets itself as "player driven" while, in their view, its
    structures still funnel players toward particular playstyles CCP favors.
  - **Reddit (r/Eve) could not be directly accessed** for this research —
    `reddit.com` was unreachable via the available web-fetch tool, consistent
    with prior research sessions on this project. Community sentiment above is
    therefore sourced from Steam reviews, gaming press (PC Gamer, GamesRadar+,
    TheGamer, Kotaku, Engadget, MMORPG.com), and community/ industry blogs (The
    Ancient Gaming Noob, The Nosy Gamer) rather than the subreddit directly;
    r/Eve-specific sentiment should be treated as a gap in this doc's coverage.

## 12. Sources

- [Icon Era — Live EVE Online Player Count And Statistics 2026](https://icon-era.com/statistics/eve-online/)
- [The Nosy Gamer — A Different Look At EVE Online's Monthly Economic Report For January 2026](https://nosygamer.blogspot.com/2026/02/a-different-look-at-eve-onlines-monthly.html)
- [EJS Computers — EVE Online's Absolutely Wild 2025 By The Numbers](https://ejscomputers.com/blogs/news/eve-online-s-absolutely-wild-2025-by-the-numbers)
- [The Ancient Gaming Noob — More Ripples in the EVE Online PLEX Market](https://tagn.wordpress.com/2025/04/26/more-ripples-in-the-eve-online-plex-market/)
- [The Ancient Gaming Noob — CCP Experiments with More PLEX Changes and Cleans Up the Store a Bit](https://tagn.wordpress.com/2025/07/28/ccp-experiments-with-more-plex-changes-and-cleans-up-the-store-a-bit/)
- [TechCrunch — EVE Online Saw $66M In Revenue Last Year, Mulls IPO](https://techcrunch.com/2012/02/21/eve-online-saw-66m-in-revenue-last-year-mulls-ipo)
- [EVE University Wiki — Skills and learning](https://wiki.eveuniversity.org/Skills_and_learning)
- [EVE University Wiki — Skill Queue / Skill Plans](https://wiki.eveuniversity.org/Skill_Queue)
- [EVE Online Support — Skill Training](https://support.eveonline.com/hc/en-us/articles/203217062-Skill-Training)
- [EVE Online Support — Skill Plans and How They Work](https://support.eveonline.com/hc/en-us/articles/4406388028178-Skill-Plans-and-How-They-Work)
- [050nor Substack — EVE Online Economic System and Its Impact on How Players Play](https://050nor.substack.com/p/eve-online-economic-system-design-player-motication-emotion)
- [EVE Online — Global PLEX Market and Friction-Free Trade](https://www.eveonline.com/news/view/global-plex-market-and-friction-free-trade)
- [Devzery — Guide to EVE Markets: Master Trading in New Eden](https://www.devzery.com/post/eve-markets)
- [Entertainment for Business — Mastering EVE Online's Complex Player-Driven Economy](https://entertainmentforbusiness.com/economy/mastering-eve-onlines-complex-player-driven-economy/)
- [Know Your Meme — EVE Online: The Bloodbath of B-R5RB](https://knowyourmeme.com/memes/events/eve-online-the-bloodbath-of-b-r5rb)
- [EVE Online — The Bloodbath of B-R5RB, Gaming's Most Destructive Battle Ever](https://www.eveonline.com/news/view/the-bloodbath-of-b-r5rb)
- [Ketasandlanders — EVE Online's Most Expensive Battle: The Epic Bloodbath of B-R5RB](https://ketasandlanders.com/eve-online-most-expensive-battle/)
- [3rd Drawer Down — The Bloodbath of B-R5RB](https://www.3rddrawerdown.com/blog/the-bloodbath-of-b-r5rb)
- [EVE Online — Politics by Other Means: Sovereignty Phase Two](https://www.eveonline.com/news/view/politics-by-other-means)
- [The Ancient Gaming Noob — EVE Online: The Null Sec Alliance Influence Map 2007-2022](https://tagn.wordpress.com/2023/04/15/eve-online-the-null-sec-alliance-influence-map-2007-2022/)
- [The Ancient Gaming Noob — EVE Online and the Summer of Change in Southern Null Sec](https://tagn.wordpress.com/2025/07/18/eve-online-and-the-summer-of-change-in-southern-null-sec/)
- [The Ancient Gaming Noob — A Brief Timeline of the Imperium](https://tagn.wordpress.com/2023/08/19/a-brief-timeline-of-the-imperium/)
- [The Ancient Gaming Noob — Pandemic Horde OUTRAGED, Claim Goons LIED to Them about the Southeast Agreement](https://tagn.wordpress.com/2024/10/10/pandemic-horde-outraged-claim-goons-lied-to-them-about-the-southeast-agreement/)
- [The Ancient Gaming Noob — Collapse in the North: B2 Joins the Imperium after 18 Months Under Attack](https://tagn.wordpress.com/2023/11/05/collapse-in-the-north-b2-joins-the-imperium-after-18-months-under-attack/)
- [GamesBeat — Eve Online emphasizes new player accessibility with latest update](https://gamesbeat.com/eve-online-emphasizes-new-player-accessibility-with-newest-update/)
- [TheGamer — "In Eve, You Don't Have A Learning Curve, You Have A Cliff," Eve Online Players Are More Than Willing To Teach Newbies](https://www.thegamer.com/eve-online-interview-fanfest-2025-community-wants-to-teach-new-players/)
- [PC Gamer — EVE Online's biggest scammer tells us his secrets](https://www.pcgamer.com/eve-onlines-biggest-scammer-tells-us-his-secrets/)
- [Guinness World Records — Most hostile corporate takeover in Eve Online](https://www.guinnessworldrecords.com/world-records/88183-most-hostile-corporate-takeover-in-eve-online)
- [PC Gamer — Murder Incorporated: ten months of deception for one kill in Eve Online](https://www.pcgamer.com/murder-incorporated-ten-months-of-deception-for-one-kill-in-eve-online/)
- [3rd Drawer Down — The True Stories of Eve Online](https://www.3rddrawerdown.com/blog/the-true-stories-of-eve-online)
- [MMORPG.com — Ponzi Scheme Biggest Scam in EVE Online History](https://www.mmorpg.com/eve-online/news/ponzi-scheme-biggest-scam-in-eve-online-history-2000075075)
- [Engadget — Biggest EVE Online scam ever recorded nets over a trillion ISK](https://www.engadget.com/2011-08-12-biggest-eve-online-scam-ever-recorded-nets-over-a-trillion-isk.html)
- [Gamerant — Biggest 'EVE Online' Scam Ever Successfully Nets Big Money](https://gamerant.com/eve-online-scame-trillion-isk/)
- [EVE University Wiki — Mining](https://wiki.eveuniversity.org/Mining)
- [EVE University Wiki — Moon mining](https://wiki.eveuniversity.org/Moon_mining)
- [EVE Online — From Extraction to Production](https://www.eveonline.com/news/view/from-extraction-to-production)
- [all-out.github.io — A guide to planetary interaction in EVE Online](https://all-out.github.io/guides/planetary-interaction/)
- [EVE University Wiki — Capital ships](https://wiki.eveuniversity.org/Capital_ships)
- [EVE University Wiki — Category:Ship Database / Cruisers / Battleships / Frigates](https://wiki.eveuniversity.org/Category:Ship_Database)
- [EVE Online Support — Roles Listing](https://support.eveonline.com/hc/en-us/articles/203217712-Roles-Listing)
- [EVE Online Support — CEO and Directors](https://support.eveonline.com/hc/en-us/articles/203279841-CEO-and-Directors)
- [EVE University Wiki — Managing corporation members](https://wiki.eveuniversity.org/Managing_corporation_members)
- [EVE Community — CSM - Council of Stellar Management](https://community.eveonline.com/community/csm/)
- [EVE Community — CCP announces the Council of Stellar Management](https://community.eveonline.com/news/news-channels/press-releases/ccp-announces-the-council-of-stellar-management-to-empower-players-through-representative-democracy-in-eve-online-1/)
- [MMORPG.com — EVE Online Players Elect Its 17th Council Of Stellar Management, Null-Blocs Still Dominate](https://www.mmorpg.com/news/eve-online-players-elect-its-17th-council-of-stellar-management-null-blocs-still-dominate-2000125320)
- [EVE University Wiki — Council of Stellar Management](https://wiki.eveuniversity.org/Council_of_Stellar_Management)
- [Steam Community — EVE Online Reviews](https://steamcommunity.com/app/8500/reviews/)
- [Steambase — EVE Online Reviews](https://steambase.io/games/eve-online/reviews)
- [Steam — EVE Online store page](https://store.steampowered.com/app/8500/EVE_Online/)
- [The Ancient Gaming Noob — Hulkageddon tag](https://tagn.wordpress.com/tag/hulkageddon/)
- [The Ancient Gaming Noob — Burn Jita tag](https://tagn.wordpress.com/tag/burn-jita/)
- [Kotaku — The Recent EVE Online Riots Where Thousands of Fans Burned Their In-Game Money, Explained](https://kotaku.com/the-recent-eve-online-riots-where-thousands-of-fans-bur-1848113326)
- [PC Gamer — EVE Online interview: betrayal at Fanfest, Burn Jita, virtual reality, and the President of Iceland](https://www.pcgamer.com/eve-online-interview-betrayal-at-fanfest-burn-jita-virtual-reality-and-the-president-of-iceland/)
- [Sand, Cider and Spaceships — Burn Hulks and Jita-geddon](https://sandciderandspaceships.blogspot.com/2012/04/burn-hulks-and-jita-geddon.html)
- [EVE Community — Eve Online Appoints In-World Economist](https://community.eveonline.com/news/news-channels/press-releases/eve-online-appoints-in-world-economist-1/)
- [Fast Company — Meet The Alan Greenspan Of Virtual Currency In "EVE Online"](https://www.fastcompany.com/3024392/meet-the-alan-greenspan-of-virtual-currency-in-eve-online)
- [The Nosy Gamer — CCP Games Hires An Economist For EVE Frontier](https://nosygamer.blogspot.com/2025/03/ccp-games-hires-economist-for-eve.html)
- [Game Developer — CCP Economist On EVE Online's 'Pure Capitalist' Market](https://www.gamedeveloper.com/pc/ccp-economist-on-i-eve-online-i-s-pure-capitalist-market)
- [Engadget — Massively interviews EVE Online Lead Economist Dr. EyjoG](https://www.engadget.com/2009-02-19-massively-interviews-eve-online-lead-economist-dr-eyjog.html)
- [EVE University Wiki — Career Agents](https://wiki.eveuniversity.org/Career_Agents)
- [EVE University Wiki — Exploration Career Agent](https://wiki.eveuniversity.org/Exploration_Career_Agent)
- [EVE University Wiki — History of Incursions](https://wiki.eveuniversity.org/History_of_Incursions)
- [EVE University Wiki — Incursions](https://wiki.eveuniversity.org/Incursions)
- [Just EVE Online — Talk us through EVE's PvE options!](https://justabout.com/eve-online/38221/talk-us-through-eves-pve-options)
- [The Nosy Gamer — EVE Online: Legion Patch Notes - Sovereignty / Equinox Upgrades](https://nosygamer.blogspot.com/2025/05/eve-online-legion-patch-notes_01226725162.html)
- [MMOs.com — EVE Online's Legion Expansion Launches May 27](https://mmos.com/news/mmorpg-news/eve-onlines-legion-expansion-launches-may-27-with-freelance-jobs-new-warships-and-sovereignty-overhauls)
- [The Ancient Gaming Noob — A Peek at the Big March 2025 EVE Online Update](https://tagn.wordpress.com/2025/03/18/a-peek-at-the-big-march-2025-eve-online-update/)
- [EVE Online — The Equinox Expansion is Now Live](https://www.eveonline.com/news/view/the-equinox-expansion-is-now-live)
- [EVE Online — Legion: Expansion Notes](https://www.eveonline.com/news/view/legion-expansion-notes)
- [EVE Online — Equinox: Expansion Notes](https://www.eveonline.com/news/view/equinox-expansion-notes)
- [New Eden Post — EVE Online: Legion – The Next Era of Empire](https://www.newedenpost.com/2025/05/eve-online-legion-the-next-era-of-empire/)
- [Wikipedia — Eve Online](https://en.wikipedia.org/wiki/Eve_Online)
- [Wikipedia — Expansions of Eve Online](https://en.wikipedia.org/wiki/Eve_Online_expansions)
- [EVE University Wiki — CCP Games](http://wiki.eveuniversity.org/CCP_Games)
- [TheGlobalGaming — EVE Online: Omega and Plex Prices](https://theglobalgaming.com/gaming/how-much-plex-for-game-time-eve-online)
- [EVE University Wiki — Clone states](https://wiki.eveuniversity.org/Clone_states)
- [EVE Online Support — Alpha and Omega Clone](https://support.eveonline.com/hc/en-us/articles/213020969-Alpha-and-Omega-Clone)
- [MMORPG.com — The Making Of EVE Online Documentary From The Escapist Now Live](https://www.mmorpg.com/news/the-making-of-eve-online-documentary-from-the-escapist-now-live-2000128976)
- [EVE Online — New EVE Fanfest Documentary out now](https://www.eveonline.com/news/view/new-eve-fanfest-documentary-out-now)
- [The Ancient Gaming Noob — EVE Online Down the Rabbit Hole – Watching the Six Hour Documentary](https://tagn.wordpress.com/2023/11/18/eve-online-down-the-rabbit-hole-watching-the-six-hour-documentary/)

**Note:** `reddit.com` (r/Eve) was unreachable via WebFetch for this research
session, consistent with prior sessions on this project — this is a known
tooling limitation, not an indication that r/Eve lacks relevant discussion.
