# Star Trek Fleet Command

## 1. Overview

- **Genre:** Space-set 4X-lite base-building strategy / "SLG" (the mobile-market
  term the dev's other 8 research subjects share) — starbase building, ship
  collection/upgrade, resource mining, PvE combat, and alliance PvP on a
  persistent shared galaxy map. Licensed IP: Star Trek.
- **Developer/Publisher:** Originally developed by **Digit Game Studios**
  (Ireland), published by **Tilting Point** in partnership with **CBS
  Interactive**; **Scopely** later took over publishing (and by extension is the
  entity referenced in all current store listings, press, and revenue
  reporting). Built on Unity (2018.4.2f1 per Wikipedia).
- **Release date:** Launched **November 29, 2018** (Wikipedia); other sources
  describe a 2018 soft launch on iOS ahead of wider rollout. Initially built
  around the _Star Trek_ Kelvin (reboot-film) timeline; expanded over time to
  add content from _Discovery_ (August 2020), _The Original Series_, _The Next
  Generation_, _Lower Decks_, _Strange New Worlds_, _Deep Space Nine_, and
  _Enterprise_ — i.e., the whole license, not just one continuity.
- **Platforms:** iOS, Android, iPadOS, macOS, and Windows (PC client via the
  official site/Steam-adjacent launcher), per Wikipedia. Free to download.
- **Scale:** One of Scopely's flagship long-tail earners, live for nearly 8
  years as of this research (August 2026).
  - Sensor Tower reported it passing **$10 million/month** in revenue as early
    as March 2019, within months of launch.
  - AppMagic data cited via press (October 2023) put **lifetime revenue at
    ~$604.6 million**, described as Scopely's second-highest-grossing title
    after Marvel Strike Force at that time.
  - Scopely's overall portfolio was reported at a **$400 million run rate**
    partly on the strength of this title (per Wikipedia's reception summary).
  - Current-period Sensor Tower snapshots (per-country, recent month) show it
    still pulling meaningful but much-reduced revenue relative to its peak —
    figures on the order of low-single-digit millions per month per major market
    (e.g., ~40k downloads / ~$1M in the US and UK, ~70k downloads /
    ~$2M in Germany, in the snapshot month reviewed) — consistent with a
    long-tail, still-monetizing-well but past-peak live-service game.
  - Google Play user rating: **4.1 stars** across roughly 161k ratings (per a
    review-aggregator source found in research). This is a much softer picture
    than the harsh Metacritic and App Store review sentiment described in §11 —
    the store-rating aggregate and the vocal long-time-player critical reviews
    diverge sharply.
- **Monetization model:** Free-to-play with in-app purchases ranging roughly
  **$4.99 to $99.99** per Wikipedia's summary, plus a real-money **Battle Pass**
  with free/Elite/Mythic (purchasable) reward tracks, gacha-style officer
  recruitment, ship blueprint packs, resource/speed-up bundles, and "Alliance
  Gift" chests triggered when any member buys a real-money pack. Common Sense
  Media's review (aimed at a general/parent audience) rated the monetization
  comparatively mild ("the game isn't overly monetized"), while the Metacritic
  user-review base — skewed toward long-term, invested players — was
  overwhelmingly negative on monetization pressure (see §11); the two audiences
  are evaluating very different things (a first session vs. years of endgame
  spend pressure).

## 2. Core gameplay loop

A session braids several concurrent activities around one persistent open-galaxy
map (not instanced per-player like the land-based SLGs' city tiles — every
player's starbase and every mining node sit on one shared coordinate space):

1. **Check the starbase queue.** Advance building upgrades, officer training
   (Academy), and R&D/research queued while away — the same "return to a base
   that kept working" idle-management loop common to the genre.
2. **Send ships out to mine.** Dispatch **Survey ships** to resource nodes
   (ore/gas/crystal grades, plus Latinum and Data specialty nodes) scattered
   across the galaxy; ships fly there in real time (gated by warp range), sit on
   the node accumulating cargo, and must be recalled/return to base to bank the
   haul — cargo in transit or sitting on a node is raid-vulnerable (see §5).
3. **Grind hostiles / run missions.** Attack NPC "hostile" ships and stations
   scattered through the galaxy (leveled/graded by system) with combat fleets
   for loot, faction reputation, ship-blueprint parts, and event currency;
   complete the main mission chain and side missions for guided progression and
   rewards.
4. **Run Away Team assignments.** Officers not currently seated on a ship can be
   sent on **Away Team** assignments (Common/Uncommon/Rare/Epic, needing 1-3
   officers, each with a rollable Chance of Success and Critical Bonus) for
   shards, materials, blueprints, faction credits, and research currencies — a
   way to extract value from your officer roster's "bench."
5. **Engage the social/PvP layer.** Check alliance chat for coordinated Armada
   targets, contribute to Alliance Help requests (speeds other members' queues),
   watch for incoming attacks on your own cargo/base, and opportunistically raid
   weaker players' unprotected cargo.
6. **Work the event/battle-pass layer.** Complete daily/event missions tied to
   the current month-long story **Arc** and Battle Pass track for officers,
   resources, and blueprints (see §7).

## 3. Base building & progression systems

- **Starbase core buildings.** Beginner-guide material calls out four pillars:
  **Operations** (the level-gate building — raising it unlocks other buildings
  and raises overall base capability, directly analogous to a "town
  hall"/Furnace/Command-Module-style gate), **Shipyard** (build/repair ships),
  **Academy** (houses officers not assigned to a ship; leveling it buffs _every_
  officer's core stats — cited figures: a level-40 Academy adds +40% to officer
  core stats, a maxed level-80 Academy adds +400%), and **R&D** (the research
  tree building — reaching R&D level 20 unlocks the "Galaxy Tree" of further
  research).
- **Research/tech tree.** Nine distinct research fields were cited, covering
  combat, station, and mining/refining bonuses, plus improved loot and officer
  effectiveness — i.e., a broad multi-branch permanent-bonus tree rather than
  one linear list. A newer **Ascension Research Tree** was added specifically
  for "G3" (endgame-tier) commanders as an additional progression layer once the
  base tree is exhausted.
  - **Officer promotion currency:** "Officer Laurels," a universal promotion
    currency usable on any officer, earned via an Academy Refinery process that
    consumes "Academy Command Credits" — i.e., a two-stage currency-conversion
    sink layered onto officer leveling.
- **Ships.** Four ship classes in an explicit rock-paper-scissors triangle:
  **Interceptor** beats **Battleship**, **Battleship** beats **Explorer**,
  **Explorer** beats **Interceptor** (guide sources state the triangle in
  slightly different orders but agree on the three-way cycle). A fourth class,
  **Survey**, sits outside the triangle — high speed, minimal armor, built
  purely for mining/cargo and explicitly weak in combat (dedicated guide
  language: "completely useless for battle missions"). A well-rounded fleet
  keeps ships of every class, since node etiquette (see §5) and combat targeting
  both punish using the wrong class for the job. Ships are individually
  leveled/upgraded and can receive **refits** (e.g., the "D4" ship's refits
  grant bonus mitigation stats) — a per-ship gear/upgrade layer distinct from
  base officer/research bonuses.
- **Officers.** Described in one guide as "the most important system" in the
  game — "the right crew for the right job can beat a stronger ship or hold your
  station against a bigger attacker." Officers slot into two roles per ship: the
  **Captain's Chair** (activates a ship-wide "Captain Maneuver" ability) and
  **Bridge Seats** (activate standard "Officer Abilities"); a third tier,
  **Below Decks**, holds officers not on the active bridge but still
  contributing smaller passive bonuses. Officers span rarity tiers (Common
  through at least Epic/Legendary) and are organized into named **synergy
  groups** (e.g., "Enterprise Crew," "Khan's Crew," "TNG Crew") — seating
  multiple officers from the same group together triggers bonus synergy effects,
  distinct from each officer's individual ability. Named canon characters (Kirk,
  Spock, Nero, Sisko, Kira Nerys, O'Brien, T'Pring, Stonn, etc.) are the actual
  collectible unit — recruited via gacha-style recruitment tied to Battle Pass
  tracks, faction stores, and event currencies.
- **Power/CP score.** A ship-strength/power formula exists (referenced via a
  community wiki blog "Ship strength formula" and third-party calculator tools),
  computed from the ship's stats as configured (hull, officers, research
  bonuses, refits) — used ambiently as the game's overall strength-comparison
  metric the way other SLGs use "Power" or "CP," though this research did not
  surface the exact formula in usable detail.
- **Factions & reputation.** Three major lore factions — **Federation**,
  **Klingon**, **Romulan** — each have a reputation track with **five reputation
  locks** at escalating thresholds (10M, 1B, 15B, 500B, and 450,000B points
  cited by one source) that act as a ratchet: reputation won't fall below the
  last-cleared lock even if it drops afterward. Raising reputation with one
  faction generally lowers it with rival factions ("raising rep with one usually
  drops it with the others"), forcing a loyalty choice. Each faction has its own
  **Faction Store** — spend faction-specific credits on ship blueprints,
  loyalty/recruit packs, raw materials, cosmetic avatars, and named commendation
  ranks. A separate, smaller **Maverick** faction was also mentioned as an
  independent peacekeeper faction outside the big three's conflict.

## 4. Resource economy

- **Core resources:** **Parsteel**, **Tritanium**, and **Dilithium** are the
  primary currencies for building/upgrading the starbase and ships.
- **Refined materials:** **Ore, Gas, and Crystal** are each mined in three
  star-grades (2-star/3-star/4-star, referred to elsewhere as G2/G3/G4 systems)
  and refined into common/uncommon/rare-tier materials consumed by ships,
  station upgrades, and research — i.e., a two-stage raw-resource-then-refine
  economy layered on top of the three base currencies.
- **Specialty resources:** **Raw Latinum** (refined into Latinum via a Refinery
  process unlocked at building level 16, on a 22-hour cooldown) and **Data** are
  separate specialty tracks with their own dedicated mining ships (Ferengi D'Vor
  for Latinum, Botany Bay/D'Vor-family for Data). Latinum nodes have a 1-in-8
  chance to spawn as a "rich" node mining at double rate; the fastest Latinum
  nodes in the game sit inside **Borg space**, gated behind special "Latinum
  Cells" earned by raiding assimilated Borg-space traders and refining their
  "Latinum Antiques" drop.
- **Node/warp gating:** Higher-warp-range systems (i.e., farther/more dangerous
  space, requiring a higher ship warp-range stat to enter) mine faster —
  resource yield rate is explicitly tied to how deep into contested space a node
  sits, not just its star-grade.
- **Storage & cargo protection:** Ships (not the base) hold the cargo-in-
  transit risk. Each ship has a **Protected Cargo** hold (cannot be raided) and
  can carry additional **Over-Protected Cargo** beyond that threshold (raidable
  by hostile players). Players actively manage how much they mine per trip
  against how much of it is protected — hauling more than your protection covers
  is a deliberate risk/reward call, not a passive cap like a warehouse.
- **Spend sinks:** Building/officer/ship upgrades, research tree nodes, Academy
  officer promotion (via the two-stage Command Credits→Laurels conversion),
  faction store purchases, Battle Pass purchases, and Armada/event participation
  costs (Armada "directives" to start an armada attack) all draw on this
  resource pool. Community "Rules of Engagement" etiquette (see §5) also treats
  resource-node courtesy (vacating or resetting an exhausted "Zero-Node") as a
  resource-economy norm, not just combat behavior.

## 5. Combat systems

- **PvE — Hostiles.** NPC "hostile" ships/stations are graded by level and by
  the star-system grade they spawn in (systems are informally called G1-G4+,
  with "Deep Space"/"Dark Space" denoting G4+ areas unlocked after completing
  the Dark Space mission chain). One source's level banding for Federation-space
  hostiles: everyday grind targets level ~20-50, "Baelosian" and Section 31
  targets level 50-60, Starfleet capital-ship hostiles level 60+, and "Forsaken"
  ships level 70-80 — a long, steadily-scaling PvE ladder rather than a fixed
  endgame boss list. Grinding hostiles is explicitly the loop for ship-blueprint
  parts, faction reputation, event materials, and Armada credits "at every stage
  of the game."
- **PvE — Armadas.** Cooperative alliance-scale PvE targets: a player starts an
  Armada with directives, alliance members join during a countdown before battle
  begins, and the group fights the encounter together for significant shared
  rewards. Armadas can be intercepted/contested by rival players trying to
  disrupt the forming attack, and armada tournament events score alliances
  competitively on their armada performance — PvE and PvP pressure overlap at
  this layer.
- **PvE — Away Team assignments.** A separate, non-combat-loop PvE system (see
  §2/§3) rather than a fight — officers succeed/fail a roll rather than engaging
  in ship combat.
- **PvP — ship combat triangle.** The Interceptor/Battleship/Explorer
  rock-paper-scissors (§3) is the core PvP counter-building mechanic — scouting
  an opponent's fleet composition and countering it is a stated skill, not just
  raw power comparison.
- **PvP — cargo raiding & "Rules of Engagement."** Attacking another player's
  mining ship to steal its Over-Protected Cargo is a core, sanctioned PvP
  activity, but the _community_ (not the developer) layered an informal but
  widely-enforced code of conduct on top: **RoE** ("Rules of Engagement,"
  described as "a self-imposed code of conduct — devised for players by
  players," built on "Fair Play" principles) discourages griefing and hoarding
  while still allowing orderly conflict. Concrete community norms found:
  **mining must use Survey ships only** — using a warship to mine is an "Illegal
  Ship" violation that voids RoE protection and legitimizes attacking even
  _protected_ cargo; **exhausted ("Zero-Node") nodes must be vacated or reset**,
  or it's a violation; **"Node-Ninja"ing** (sneaking onto an occupied node) is
  treated as hostile; **warships get no RoE protection at all** — pure combat
  ships are fair game any time. Alliances designate **RoE Officers** to enforce
  these norms and coordinate disputes over Discord (i.e., server-culture
  governance largely happens _outside_ the app, on Discord).
- **PvP — diplomacy states.** A Diplomacy Panel tracks a seven-step relation
  scale between alliances: Allied, Friendly, Civil, Neutral, Caution,
  Unfriendly, Enemy — a graduated diplomatic status system rather than a binary
  war/peace toggle.
- **Territory PvP.** An "Origin Sector" hosts **Territory Capture events** where
  alliances contest and hold zones via "Takeover" events to earn alliance-wide
  services and bonuses — the game's answer to guild-vs-guild territory war,
  layered on the open star-map rather than a separate battlefield instance.
- **Combat resolution.** Described by outside reviewers (Common Sense Media) as
  low-interactivity — battles largely auto-resolve with players watching small
  ships exchange fire until one explodes, rather than active real-time input —
  "battles would be more thrilling if the action differed significantly in each
  one" (paraphrased reviewer sentiment). This lines up with the rest of the SLG
  genre's PvE encounters (outcome pre-determined by loadout/stats going in)
  rather than being a distinguishing feature.

## 6. Alliance/social systems

- **Alliance structure.** Standard guild-equivalent: an Admiral (leader) and
  ranked membership; group raid/Armada authorization runs through the Admiral;
  members post attack targets in alliance chat and coordinate with leadership
  before committing forces.
- **Chat.** Three tiers found: **Galaxy chat** (server-wide), **Alliance chat**
  (members-only), and **Private chat** (DMs) — community-authored etiquette
  guides explicitly ask members to keep political/religious discussion off all
  three channels.
- **Alliance Help.** Members can request help on their build/research/ training
  queues; other alliance members click to contribute, reducing wait time — the
  standard genre-wide "tap to help" cooperative-progression mechanic.
- **Alliance gifting.** When any member spends real money on an in-game pack, an
  **Alliance Gift** chest is (per one source) sent to the whole alliance,
  anonymously, typically containing resources or tokens — a design that turns
  individual whale spending into a shared, visible alliance-wide benefit (and by
  extension a soft social pressure toward spending, since a spender's purchase
  visibly benefits everyone). (Research did not turn up confirmation of an
  alliance level/bank/ cooperative-construction system comparable to some peer
  SLGs' "alliance fortress" mechanics — the fandom wiki forum thread found
  suggests players can transfer resources directly to alliance members, but full
  mechanics weren't confirmed in available sources.)
- **Cross-alliance diplomacy.** The seven-tier Diplomacy Panel (§5) is the
  formal cross-alliance relationship system; Discord is repeatedly cited as the
  _de facto_ real coordination layer both within and between alliances (RoE
  negotiation, armada callouts, etc.) — the in-game tools are a thin layer over
  an off-app social structure, a pattern found across most of this dev's other 8
  researched SLGs as well.
- **Territory-linked cooperation.** The Deep Space Nine "Arc 46" content (§7)
  introduced an **Alliance Starbase** — a collaborative structure alliance
  members build together by destroying Cardassian armadas for materials, then
  position on galaxy-map "plasma storms" for shared resource extraction
  (explicitly compared in the source guide to how a player's own starbase
  attaches to a planet) — a genuinely space-flavored spin on the "build a shared
  alliance structure on the map" mechanic other SLGs implement as a stationary
  fortress/keep.

## 7. Additional/side features

- **Battle Pass.** A recurring monthly pass released alongside each major
  update, with a **Free Path**, a paid **Elite Path**, and an even higher-value
  **Mythic Path** (purchased separately via the Offers tab). Rewards include
  resources, materials, officer shards, and ship blueprints.
- **Story Arcs.** Roughly month-long themed campaigns (an "Arc") bundling a
  sequence of special-mission events (referred to by community shorthand like
  "SMS"/"SLB"), heroic battles, and narrative beats tied to a specific Star Trek
  series or storyline — e.g., a Borg seasonal arc that ran three months as
  sequential "acts" (Jan 23, 2020 onward) each unveiling new story, tougher
  enemies, and rewards; a Deep Space Nine arc ("Arc 46") introducing three new
  officers (Sisko, Kira, O'Brien) plus a four-month "Find the Spy" narrative
  event with rewards deferred to a later reveal date; a TNG-themed arc; a
  Strange New Worlds arc; etc. This is the game's primary vehicle for tying new
  licensed content (officers, ships, story beats) to ongoing live-ops cadence,
  and effectively is Voidbound's peer concept to a seasonal content drop.
  - One reviewer's own commentary on the DS9 arc, worth preserving verbatim for
    candor about the format's limits: "it should go without saying that getting
    this kind of depth into a phone-based video game is impossible."
- **Faction recruiting chests / veteran content.** Level-30+-gated faction
  recruiting chests were called out as a distinct late-arc content addition
  aimed at retaining veteran players rather than onboarding new ones.
- **Away Team assignments.** Already covered under core loop/combat (§2, §5)
  since they function as a distinct PvE side-activity for bench officers rather
  than the main ship-combat loop.
- **Events calendar.** A community-run site (stfc.ovh) exists specifically to
  track/forecast the game's dense, near-daily event calendar — evidence of a
  heavily event-driven live-ops cadence typical of the genre.
- **Trivia events.** Franchise-trivia mini-events tied to specific show arcs
  (e.g., DS9-themed trivia during the DS9 arc) — lightweight IP-engagement side
  content distinct from core progression.

## 8. Early game (first session / first few days)

- **Guided, on-rails tutorial.** Per wiki/guide sources, the very first mission
  sequence takes place entirely in the player's starter system, cannot be
  failed, must be completed strictly in order, and unlocks the main mission line
  only once finished. Framing: the player is a new commander assigned to their
  first starbase and first ship, initially operating under the direction of an
  NPC superior (Geordi La Forge is named) before being handed full command.
- **Concrete tutorial beats found:** an early "Distress Call" mission requires
  defeating a Gavolar ship (reward: 320 Parsteel); building a Parsteel generator
  (30 Parsteel) then a Parsteel warehouse (50 Parsteel) walks the player through
  the build queue; a fourth mission has the player defeat a Nausicaan
  Dreadnought (60 Parsteel) — each step both teaches a system and pays out the
  resource needed for the next step, a fairly tight drip-feed.
  - One reviewer (Irish Times) headlined a review "It's not difficult to get
    into the game" — corroborating the low-friction onboarding read from the
    guide sources.
- **Beginner-guide advice found:** join an alliance early ("a strong alliance
  will help you a great deal," with real value coming from Discord-based peer
  learning); don't spend resources on low-rarity units/officers, bank them for
  stronger pulls; do dailies and login rewards for steady, low-effort progress;
  follow the main questline over side quests early; save premium recruit tickets
  for limited-time rate-boosted events rather than spending them immediately.
- **Common Sense Media's outside read** (aimed at a general/parent audience
  rather than a strategy-genre veteran) called the early experience "consistent
  yet unengaging action," rating monetization pressure as comparatively light at
  this stage and flagging content concerns around uncensored player chat and
  mild sci-fi violence rather than predatory spend mechanics — a notably softer
  take than veteran players' later-game sentiment (§11).

## 9. Mid game

- **Research/Academy investment plateau breaking.** The nine-branch research
  tree and Academy leveling (with its escalating +40%/+400% officer-stat buff
  bands) are the primary long-horizon systems that keep paying off well past the
  tutorial — described as unlocking "more effective navigation," better
  mining/refining, improved loot, better officers, and stronger combat
  progressively.
  - Guides do note **Reputation Locks** exist specifically to preserve mid- and
    late-game progress against backsliding (§3), implying the systems around
    them (faction switching, reputation loss from rival-faction actions) are a
    real mid-game tension point players actively manage.
- **Warp-range/node-tier chasing.** As base and ship stats grow, players push
  into higher-warp, higher-grade (G2→G3→G4) systems for better mining rates and
  hostile loot — this is the game's core "the frontier keeps moving outward as
  you grow" mid-game structure, distinctly space-flavored versus land-SLGs'
  concentric "safe zone → contested zone" rings. Reaching Dark Space/Deep Space
  (G4+) is explicitly gated behind completing the Dark Space mission chain,
  marking it as a deliberate mid-to-late gate rather than something reachable
  purely by grinding stats.
- **Ship/officer diversification.** Mid game is where the four-class ship
  triangle and officer synergy-group system stop being tutorial trivia and start
  mattering — building out a _roster_ (multiple ship classes, multiple officer
  synergy sets) for different jobs (mining vs. PvE grind vs. PvP defense) rather
  than one "best" fleet.
- **Alliance-scale content unlocks.** Armadas, Territory Capture, and
  alliance-cooperative structures (the Alliance Starbase) become the sustaining
  social-progression loop once solo base/ship growth slows — consistent with the
  genre pattern of alliance-gated content being the mid- game retention hook.

## 10. Late/end game

- **The endgame ladder keeps extending upward rather than capping.** The hostile
  level bands found (grind targets to level ~50, capital-ship hostiles 60+,
  "Forsaken" ships 70-80) and the separate G3/G4+ "Ascension Research Tree"
  (explicitly added _for_ endgame "G3 Commanders" once the base research tree is
  exhausted) both indicate the developer keeps adding vertical headroom rather
  than letting top players hit a hard wall — consistent with a live-service game
  nearly 8 years old needing to keep veteran accounts engaged.
- **Territory/Armada-scale PvP is the top-player activity.** Territory Capture
  events, armada tournaments, and RoE-negotiated inter-alliance conflict (§5,
  §6) are what large, established alliances actually spend their time on — this
  is corroborated by the fact that a _player-invented_ governance system (RoE,
  RoE Officers, Discord-run dispute resolution) grew up specifically to manage
  that endgame conflict, which only happens because top-level PvP is intense and
  frequent enough to need it.
  - Deep Space/Dark Space (G4+) is called out repeatedly as the destination zone
    for high-level hostile grinding and materials.
- **Whale-treadmill signal.** The most consistent, and most negative, community
  theme found (see §11 for full detail) is that the game is explicitly
  whale-optimized at the endgame: reviewers describe recent changes that "vastly
  reduced reward value, increased costs to players, reduced abilities of
  officers, and voided currencies that players purchased with real money" —
  i.e., users reporting the live-ops team actively re-tuning value _downward_
  over time on paying, invested players, a sharper and more specific complaint
  than generic "it's grindy." One Metacritic review's blunt summary: "The strong
  bully the weak, your dominance in game is based on the size of your wallet."
- **Grind volume.** Beyond spend pressure, reviewers describe the daily time
  commitment itself as heavy at the top: the game "demands many hours daily to
  complete tasks, despite the presence of unnecessary content" — language
  pointing to bloat (more systems added over 8 years of live-ops) compounding
  the grind rather than replacing it.

## 11. Community sentiment

Sentiment on this game is unusually **bimodal** across sources — a soft,
positive-leaning store-rating aggregate and general-audience press sits
alongside a scathing, detail-rich body of veteran-player criticism. Both halves
are worth preserving because they likely represent different populations
(new/casual players vs. multi-year invested spenders).

- **Store ratings (broad, likely casual-weighted):** Google Play average
  **4.1/5** across ~161k ratings (per an aggregator source). Early professional
  reviews (2018-2019 launch window) were also positive: **Pocket Gamer 4.5/5**,
  **GameZebo 4/5**, **COG Connect 80/100**, **multiplayer.it 8.2/10** — and the
  game won a Webby Award (People's Voice, Strategy/Simulation) plus a Technical
  Achievement Webby in 2019, with further SXSW Gaming and Hollywood Music in
  Media nominations. This paints launch-era STFC as a well-received,
  polished-for-its-genre entry, not a scrappy clone.
- **Metacritic user reviews (veteran-weighted, harshest data found): 2.2/10
  aggregate** ("Generally Unfavorable"), with only ~9% positive, ~13% mixed, and
  **78% negative** in the sample reviewed. Representative quotes:
  - On pay-to-win: _"The strong bully the weak, your dominance in game is based
    on the size of your wallet."_
  - On live-ops erosion of value: recent changes "vastly reduced reward value,
    increased costs to players, reduced abilities of officers, and voided
    currencies that players purchased with real money."
  - On bugs/support: _"Constant grinding with more and more releases attempting
    to get money from you without fixing the numerous bugs, lags, crashes,"_ and
    _"The help desk is horrid, they rarely if ever address the problem and
    constantly demand screen shots."_
  - On grind: the game _"demands many hours daily to complete tasks, despite the
    presence of unnecessary content."_
  - A rare positive note, still backhanded: one reviewer praised _"a very
    impressive-looking universe"_ and the UI, while still criticizing a lack of
    strategic depth.
- **App Store review sentiment (search-aggregated, similar tone to
  Metacritic):** described as free-to-play but "pay to win," with monetization
  "gotten steadily worse, with acceleration in recent weeks"; one paraphrase:
  _"a very heavily monetized 'game' that feels more like a 2nd job than a fun
  game."_ Reviewers reported bugs going unfixed while developers "constantly
  remove existing strategies to make the game manageable for low-spenders, with
  a focus on making huge whales successful" — i.e., a perception that balance
  changes are whale-retention tools, not fairness fixes. Some more recent
  reviews acknowledged modest improvement ("developers have made some strides in
  allowing certain paywalls to be unlocked for free and reduced the grind"),
  though "the grind remains significant."
- **Common Sense Media (general-audience/parent lens, softer):** called gameplay
  _"consistent yet unengaging action,"_ noted graphics as "uninspiring" and
  battle sequences as low-interactivity ("players simply watch small ships
  exchange fire until one explodes"), but explicitly said _"the game isn't
  overly monetized"_ and that purchases aren't necessary — a much gentler
  monetization take than the player-review sources, likely because a
  parent/reviewer sampling the early game doesn't hit the years-in spend
  pressure veteran players describe.
- **Reddit (r/STFC / r/STFleetCommand):** could not be accessed — reddit.com is
  unreachable via this session's WebFetch tool (consistent with every prior
  research session on this project) and WebSearch returned no usable
  Reddit-sourced snippets despite repeated targeted queries (including
  `site:reddit.com`). Subreddit sentiment is **not represented** in this
  writeup; treat the community-sentiment section as press/review/wiki- sourced
  only, not Reddit-verified.
- **Player-invented governance as an indirect sentiment signal:** the existence
  and evident seriousness of the community-authored "Rules of Engagement" system
  (§5) — with designated enforcement officers and Discord-run dispute processes
  — is itself a data point: it implies a playerbase organized and invested
  enough to build real self-governance around PvP fairness, which doesn't happen
  in a community that's given up on a game, whatever the review scores say.
- **YouTube guides/creators:** this research surfaced titles (e.g., "Power In
  Star Trek Fleet Command | Does It Matter?") indicating an active creator
  ecosystem producing power-formula breakdowns and system guides, but WebFetch
  cannot reach YouTube video content directly and no transcript/written recap
  was pulled — creator sentiment is not directly represented here beyond
  confirming the ecosystem exists.

## 12. Sources

- [Star Trek Fleet Command — Wikipedia](https://en.wikipedia.org/wiki/Star_Trek_Fleet_Command)
- [Star Trek Fleet Command — App Store (Apple)](https://apps.apple.com/us/app/star-trek-fleet-command/id1427744264)
- [Star Trek Fleet Command — Google Play](https://play.google.com/store/apps/details?id=com.scopely.startrek)
- [Scopely: Star Trek Fleet Command is now available worldwide](https://www.scopely.com/en/news/scopelys-newest-game-has-arrived-star-trek-fleet-command-is-now-available-worldwide)
- [Star Trek Fleet Command official site](https://startrekfleetcommand.com/)
- [Academy - Game Overview — startrekfleetcommand.com](https://startrekfleetcommand.com/academy/academy-game-overview/)
- [Academy - Ships & Combat — startrekfleetcommand.com](https://startrekfleetcommand.com/academy/academy-ships-combat/)
- [Academy - Station Guide — startrekfleetcommand.com](https://startrekfleetcommand.com/academy/academy-station-guide/)
- [Star Trek Database — startrekfleetcommand.com](https://startrekfleetcommand.com/star-trek-fleet-command-database/)
- [Away Teams — startrekfleetcommand.com news](https://startrekfleetcommand.com/news/away-teams/)
- [Away Team Assignments: Priority 1 Assignments and Rewards — startrekfleetcommand.com](https://startrekfleetcommand.com/news/away-team-assignments-priority-1-assignments-and-rewards/)
- [The Battle Pass — startrekfleetcommand.com](https://startrekfleetcommand.com/news/the-battle-pass/)
- [Star Trek Fleet Command Adds New TNG Story Arc — Scopely news](https://www.scopely.com/en/news/star-trek-fleet-command-adds-all-new-content-featuring-star-trek-the-next-generation-story-arc)
- [Arena Combat: Star Trek Fleet Command's New PvP Experience — startrekfleetcommand.com](https://startrekfleetcommand.com/news/arena-combat-star-trek-fleet-commands-new-pvp-experience/)
- [Star Trek Fleet Command Officers - Officer Guide — 1337 Wiki](https://star-trek-fleet-command.1337wiki.com/star-trek-fleet-command-officers/)
- [Star Trek Fleet Command Map — 1337 Wiki](https://star-trek-fleet-command.1337wiki.com/map/)
- [Armada Locations & Strength — 1337 Wiki](https://star-trek-fleet-command.1337wiki.com/armada-locations/)
- [STFC Hostile Guide: Every Hostile by Faction — 1337 Wiki](https://star-trek-fleet-command.1337wiki.com/hostile-guide/)
- [STFC Federation Hostiles: Locations, Levels & Drops — 1337 Wiki](https://star-trek-fleet-command.1337wiki.com/federation-hostiles/)
- [Star Trek Fleet Command Systems - List of all Star Systems — 1337 Wiki](https://star-trek-fleet-command.1337wiki.com/systems/)
- [Raw Ore Systems by Grade, Refining, and Best Crew — 1337 Wiki](https://star-trek-fleet-command.1337wiki.com/ore/)
- [Academy building guide — 1337 Wiki](https://star-trek-fleet-command.1337wiki.com/academy/)
- [The Original Series Arc — 1337 Wiki](https://star-trek-fleet-command.1337wiki.com/the-original-series-arc/)
- [Mining Basics — Carnac's Guide to Star Trek Fleet Command](https://carnacsguide.com/mining-basics/)
- [Deep Space Nine, Arc 46 — Carnac's Guide to Star Trek Fleet Command](https://carnacsguide.com/deep-space-nine-arc-46/)
- [Faction Reputation, and How to Get It — Carnac's Guide](https://carnacsguide.com/faction-reputation/)
- [Faction Rep in Star Trek Fleet Command — Carnac's Guide (Medium)](https://medium.com/@carnacsguide/faction-rep-in-star-trek-fleet-command-7377a76e45b0)
- [Player's Guide & Glossary of Star Trek Fleet Command Terminology — pvptarget.com](https://www.pvptarget.com/guide)
- [STFC Database - Hostiles — stfc.space](https://stfc.space/hostiles)
- [STFC Daily Events Calendar — stfc.ovh](https://www.stfc.ovh/)
- [Star Trek Fleet Command guide for beginners — Pocket Gamer](https://www.pocketgamer.com/star-trek-fleet-command/guide-for-beginners/)
- [Star Trek Fleet Command review: It's not difficult to get into the game — Irish Times](https://www.irishtimes.com/culture/games/game-reviews/star-trek-fleet-command-review-it-s-not-difficult-to-get-into-the-game-1.3754913)
- [Star Trek Fleet Command App Review — Common Sense Media](https://www.commonsensemedia.org/app-reviews/star-trek-fleet-command)
- [Star Trek Fleet Command Reviews — Metacritic](https://www.metacritic.com/game/star-trek-fleet-command/)
- [Star Trek Fleet Command user reviews — Metacritic](https://www.metacritic.com/game/star-trek-fleet-command/user-reviews/)
- [Star Trek Fleet Command on PC: Ships Guide — BlueStacks](https://www.bluestacks.com/blog/game-guides/star-trek-fleet-command/star-trek-fleet-command-ships-guide-en.html)
- [Star Trek Fleet Command on PC: Useful Tips & Tricks — BlueStacks](https://www.bluestacks.com/blog/game-guides/star-trek-fleet-command/star-trek-fleet-command-useful-tips-tricks-en.html)
- [How to Mine Latinum in Star Trek: Fleet Command — Touch Tap Play](https://www.touchtapplay.com/how-to-mine-latinum-in-star-trek-fleet-command/)
- [Star Trek Fleet Command (STFC) Mining Locations — Lone Wolf Online](https://lonewolfonline.net/gaming/star-trek-fleet-command-mining-locations/)
- [Automatic Mining in STFC — FastTrek Docs](https://fasttrek.space/docs/mining/)
- [Hostile Hunt — FastTrek Docs](https://fasttrek.space/docs/ship-automations/hostile-hunt/)
- [Star Trek Fleet Command resources guide — Sportskeeda](https://sportskeeda.com/esports/star-trek-fleet-command-resources-guide-how-obtain-use)
- [Crew Combos That Win in STFC — KashKick](https://kashkick.com/guide/game-tips/crew-combos-that-win-in-stfc-best-loadouts-for-pvp-mining-and-hostile-grinding/)
- [Star Trek Fleet Command Tips: Master Your Power — KashKick](https://kashkick.com/guide/game-tips/faction-reputation-101-master-your-rep-master-your-power-in-stfc/)
- [Missions in Star Trek Fleet Command — mobi.gg](https://mobi.gg/en/tips/star-trek-fleet-command-mission-guide/)
- [Star Trek Fleet Command Guide to getting started — mobi.gg](https://mobi.gg/en/tips/star-trek-fleet-command-beginner-guide/)
- [Star Trek: Fleet Command Beginner's Guide — Level Winner](https://www.levelwinner.com/star-trek-fleet-command-beginners-guide-10-tips-cheats-strategies-progress-faster/)
- [Star Trek Fleet Command - Beginners Guide — gamesguideinfo.com](https://www.gamesguideinfo.com/star-trek-fleet-command/guide/beginners)
- [Star Trek Fleet Command - Resources Guide — gamesguideinfo.com](https://www.gamesguideinfo.com/star-trek-fleet-command/guide/resources)
- [Star Trek Fleet Command - Space Ships Guide — gamesguideinfo.com](https://www.gamesguideinfo.com/star-trek-fleet-command/guide/space-ships)
- [Star Trek Fleet Command guide: tips, cheats & strategies — MrGuider](https://www.mrguider.org/cheats/star-trek-fleet-command-guide-tips-cheats-strategy/)
- [STFC Away Missions Guide: Best Officers & Traits for Beginners — Casual Nerdery](https://casualnerdery.com/2026/04/25/stfc-away-missions-guide-best-officers-traits-for-beginners/)
- [Away Team Missions — stfc.johnwsiskar.com](https://stfc.johnwsiskar.com/away-team-missions/)
- [Away Teams Missions Guide — stfc.johnwsiskar.com](https://stfc.johnwsiskar.com/away-teams-missions/)
- [Battle Pass and Story Arcs — stfc.johnwsiskar.com](https://stfc.johnwsiskar.com/battle-pass-and-story-arcs/)
- [Romulan, Klingon and Federation Reputation — stfc.johnwsiskar.com](https://stfc.johnwsiskar.com/romulan/)
- [Combat Overview — Scopely Help Center](https://scopely.helpshift.com/hc/en/19-star-trek-fleet-command/faq/3733-combat-overview/)
- [Ships Guide — Scopely Help Center](https://scopely.helpshift.com/hc/en/19-star-trek-fleet-command/faq/3734-ships-guide/)
- [Away Teams — Scopely Help Center](https://scopely.helpshift.com/hc/en/19-star-trek-fleet-command/faq/5557-away-teams/)
- [Battle Pass — Scopely Help Center](https://scopely.helpshift.com/hc/en/19-star-trek-fleet-command/faq/7039-battle-pass/)
- [Deep space — Scopely Help Center](https://scopely.helpshift.com/hc/en/19-star-trek-fleet-command/faq/7041-deep-space/)
- [Federation — Scopely Help Center](https://scopely.helpshift.com/hc/en/19-star-trek-fleet-command/faq/7047-federation/)
- [Reputation Locks — Scopely Help Center](https://scopely.helpshift.com/hc/en/19-star-trek-fleet-command/faq/7046-reputation-locks/)
- [Alliance Help and Contributions — Scopely Help Center](https://scopely.helpshift.com/hc/en/19-star-trek-fleet-command/faq/2937-alliance-help-and-contributions/)
- [How Do I Play? — Scopely Help Center](https://scopely.helpshift.com/hc/en/19-star-trek-fleet-command/faq/2943-how-do-i-play/)
- [Where Do I Find Hostiles? (Level 3+) — Scopely Help Center](https://scopely.helpshift.com/hc/en/19-star-trek-fleet-command/faq/2964-where-do-i-find-hostiles-level-3/)
- [Sections: Events — Scopely Help Center](https://scopely.helpshift.com/hc/en/19-star-trek-fleet-command/section/1482-events/)
- [Sections: Alliances — Scopely Help Center](https://scopely.helpshift.com/hc/en/19-star-trek-fleet-command/section/1604-alliances/)
- [Sections: Factions — Scopely Help Center](https://scopely.helpshift.com/hc/en/19-star-trek-fleet-command/section/1606-factions/)
- [Star Trek Fleet Command Revenue Warps Past $10 Million Per Month — Sensor Tower](https://sensortower.com/blog/star-trek-fleet-command-revenue-march-2019)
- [Star Trek Fleet Command — Sensor Tower app overview (US)](https://app.sensortower.com/overview/1427744264?country=US)
- [Scopely games top $7 billion in revenue — Game World Observer](https://gameworldobserver.com/2023/10/12/scopely-revenue-7-billion-monopoly-go-appmagic)
- [Star Trek Fleet Command — AppMagic data overview](https://appmagic.rocks/ipad/star-trek-fleet-command/1427744264/info?metrics=top_grossing)
- [Officers — Star Trek: Fleet Command Wiki (Fandom) — cited via search only, WebFetch returned HTTP 402](https://star-trek-fleet-command.fandom.com/wiki/Officers)
- [Starbase — Star Trek: Fleet Command Wiki (Fandom) — cited via search only, WebFetch returned HTTP 402](https://star-trek-fleet-command.fandom.com/wiki/Starbase)
- [User blog:Ahjegs/Ship strength formula — Star Trek: Fleet Command Wiki (Fandom), cited via search only](https://star-trek-fleet-command.fandom.com/wiki/User_blog:Ahjegs/Ship_strength_formula)

**Note on access limits:** the official Star Trek Fleet Command Fandom wiki
(star-trek-fleet-command.fandom.com) returned **HTTP 402 Payment Required** on
every direct WebFetch attempt in this session — it was still used as a source,
but only via WebSearch result snippets, not full-page fetches. Reddit (r/STFC,
r/STFleetCommand) was **completely unreachable** via WebFetch, consistent with
prior research sessions on this project, and WebSearch surfaced no usable
Reddit-sourced content despite several attempts — subreddit sentiment is not
represented in §11. YouTube video content could not be fetched directly;
creator-ecosystem existence was confirmed via search titles only, not
transcripts.
