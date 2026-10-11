# Implementation notes

Where the build differs from `docs/HANDOFF.md`, and why. The rule from the handoff applies: when the spec and the real API disagreed, the API won.

## How the APIs were checked

- **Foundry v14.** foundryvtt.com was not reachable from the build environment, so the v14 schemas were read from the community type definitions `fvtt-types@14.366.0-beta.20261009164208` (generated from the v14 sources), cross-checked against how dnd5e 6.0.6 itself uses the v14 Level API (`module/documents/token.mjs`). One field set could not be confirmed this way (the Change Level behavior's own fields, see below).
- **dnd5e 6.0.6.** Cloned at tag `release-6.0.6` and read directly: `module/data/actor/npc.mjs`, `module/data/activity/*.mjs`, `module/data/item/*.mjs`, `module/config.mjs`, and the 2024 monster sources in `packs/_source/actors24` as the model for NPC items and activities.

## Scenes

| Spec | Built | Why |
|---|---|---|
| Per-level darkness (0.9 crypt, 0.75 elsewhere) | Scene darkness 0.75, plus a full-canvas **Adjust Darkness Level** region on the crypt level (override, 0.9) | v14 Levels have no darkness field (`background`, `foreground`, `fog`, `textures`, `visibility`, `elevation` only). |
| Level background | `level.background.src` | v14 Scenes have no background of their own. |
| Upper floor composites over the ground floor | Upper level's `visibility.levels = [ground]` | The field exists; its exact rendering semantics could not be confirmed offline. If the upper floor does not show the hall beneath it, set the Upper Floor level's background to `modules/ravenmoor-manor/assets/maps/ravenmoor-upper-standalone.webp` (the path is also stored in the level's `flags.ravenmoor.backgroundStandalone`). |
| One Region per `levelRegions` entry (10) | One Region per stair (5), assigned to **both** levels it joins | A stair drawn identically on two levels is one place. With the region on both levels, the core Change Level behavior offers the other level (its default target is "the region's levels"). Two regions on the same square would prompt twice. |
| Change Level behavior fields | `type: "changeLevel"`, `system: {}` | The behavior type id is confirmed (`changeLevel` is a core v14 behavior type), but its schema is not in the type definitions. Leaving `system` empty uses Foundry's defaults, which prompt the user and limit choices to the region's levels, exactly what the stairs need. No field names were guessed. |
| Hidden stair starts disabled | The behavior's `disabled: true`; Reveal Secret Door enables it | Region behaviors have a `disabled` field. |
| Wall/light/note/tile/region level scoping | `levels: [levelId]`; tokens use `level: levelId` and the level's base elevation | Confirmed v14 fields. |
| Optional crypt battle-map scene | Not built | It belongs to the fallback layout; the preferred one-scene layout already holds the crypt. The image still ships in `assets/maps`. |
| Thumbnail generated at build or import | `tools/build_cover.py` renders `assets/maps/ravenmoor-thumb.webp` and the Adventure cover from the player map (never a DM key) | Deterministic and works before the scene is first viewed. |

Clue pins: 15 of the 19 cards have a `mapPos`, so the scene has 39 location pins plus 15 clue pins (eye icon, green, labelled with the card). The spec links each clue pin to its card's page, but revealing a card makes that page visible to players, and Foundry shows a note to anyone who can see its page. So clue pins open the GM-only **Locations** page where the card is found (that page links the card). Every pin on the map therefore links into the GM-only Locations journal, and players never see one. Secret pins use the hazard icon tinted red.

The two crypt scarecrows are placed as props: neutral, named "Scarecrow", with name and bars hidden, so hovering one during the investigation gives nothing away. Showdown Setup turns the ones that fight (one for five characters, two for six) hostile and gives them their real name; with five characters the other stays a prop and is not slumped at the unmasking.

## Actors

- **Attacks** are `weapon` items of type `natural` whose attack activity uses a flat to-hit (`attack.flat: true`) and explicit damage parts with `includeBase: false`. dnd5e adds `@mod` only to a weapon's base damage, so the listed numbers (e.g. Scalpel +6, 1d4 + 3 slashing plus 2d6 poison) roll exactly as printed. Fire Bolt (Pip) is the same kind of entry because her stat block lists it as an action, not a spell.
- **Saves** use `save.dc.calculation: ""` with a flat formula (DC 15, DC 13), which dnd5e treats as a fixed DC. Condition riders are item effects applied on a failed save.
- **Recharge** is item uses `max: 1` with a `recharge` recovery of 5; per-day uses use the `day` period.
- **Armor class** uses dnd5e's `natural` calculation (`@attributes.ac.flat`); 6.x has no plain "flat" calculation key. The armour description ("oiled leather coat") is kept in `flags.ravenmoor.acSource` and the biography.
- **Initiative** bonus lives at `attributes.init.roll.bonus` in 6.x (computed so the sheet shows the listed modifier; every listed modifier equals the Dex modifier, so the bonus is empty).
- **Reaction AC bumps** (Slippery Physician +3, Parry +2, Pip's Protective Magic +5) carry a self effect for convenience, so the GM can apply the AC change from the card.
- **Pip's spells** are copies of the SRD 5.2 spells from dnd5e 6.0.6 (`data/vendor/dnd5e/spells.json`, refreshed with `npm run vendor`) rather than a runtime compendium lookup: the actor is complete at build time and the Adventure never links into a compendium. At-will spells use method `atwill`; 2/Day and 1/Day spells use method `innate` with day-recovering uses; Material components are removed. Shield is not embedded: Protective Magic is a 1/Day reaction with the +5 AC effect.
- **Skeleton** has a fixed 1 HP and an empty formula.
- **Silas's body** is a second token of Silas's actor with `actorLink: false` and a Dead effect in its delta, so marking the body dead never touches the living Silas token.
- **Lair actions**: dnd5e 6.0.6 has lair fields on NPCs (`resources.lair`) but no lair-initiative handling in its combat code, so the **Midnight Bell** combatant from section 9 is used. The bell is a hidden utility actor the runtime creates on first use (so the module still ships exactly 11 actors), added as a hidden combatant at initiative **19.99** so it acts on count 20 but after anything that rolled 20.
- **Skeletons on one count**: Showdown Setup creates a v14 Combatant Group ("Ravenmoor Skeletons") and gives every skeleton the same initiative; if groups are unavailable, they still share one rolled count.

## Items

- Suggested images not referenced anywhere in dnd5e 6.0.6's compendiums (and so not certainly present in core v14) were swapped for close core icons; see `IMG_SUBSTITUTES` in `build/items.mjs`. The Treat Bag Candy uses the jack-o'-lantern icon because core has no wrapped-candy icon.
- **Elspeth's Lantern** is the dnd5e 6.0.6 Lantern of Revealing (vendored), renamed, with its image changed. Core items have no light data, so the green light colour is stored in `flags.ravenmoor.light`. SRD attribution is in `LICENSE-CONTENT.md`.
- Consumable "quantity" consumption is item-uses consumption with `autoDestroy`, which is how dnd5e stacks consumables.
- **Counter-Herb**: dnd5e has no change key for "Advantage on saves against one named effect". The sprig applies a flagged effect, and the runtime's `dnd5e.preRollSavingThrowV2` hook grants Advantage on Constitution saves rolled from the Banshee's Breath card (it reads the save's origin chat message). Without an origin it falls back to "Constitution save at DC 15"; concentration saves never count. Carrying an unused sprig also counts, since the How edge says every character has the Advantage.

## Journals

- Card ids (C1, H3, "Handout 1") link every time they appear in running text; suspects link on their first mention per page. Headings are never linked.
- Each handout page carries the GM details (where it is found, checks, what it proves) in a `secret` section, which Foundry shows only to owners, so the player view is just the card.
- The **Clue Tracker** page is regenerated by the runtime whenever a clue is ticked. Testimony and *speak with dead* are ticked in the Clue Tracker macro's window.
- The DM Guide gains a "Module controls and hotbar" page (suggested slots 1-10) and the three DM-key image pages.
- After import, dnd5e's own import actions (`flags.dnd5e.importActions`) activate the scene and open the Adventure journal; `module.json` also declares a v14 `quickstart` for dnd5e.

## Runtime

- Flags live in `flags.ravenmoor` as the spec asks. v14 validates flag scopes only for package-id *format* (`BasePackage.validateId`), which "ravenmoor" passes; `getFlag` additionally requires an active package, so the runtime reads these flags directly (`doc.flags.ravenmoor`) and never through `getFlag`. Chat messages created at runtime use `flags["ravenmoor-manor"]`.
- **The party** is each player's assigned character (User Configuration). Only if no player has one does the runtime fall back to every player-owned character, so assign characters before the session to keep backup characters out of the Treat Bag and the showdown.
- **Twelve Candles**: snuffing candle *n* means the *n*th candle to go out (4, 8 and 11 whisper the escalations; 12 runs Midnight). The panel shows the in-game time. The 1:55 gust needs the session clock started (Ravenmoor Settings macro).
- **Scaredy-Cat** lives on the module's own save-request card (Lights Out, lair round 2 and the Fright Save macro), not on dnd5e's generic request cards. Rolling from the card applies Frightened on a failure; Scaredy-Cat applies it and awards a candy. Each character can answer a card once (roll or Scaredy-Cat): the GM's client records the result on the card, through the socket when a player clicks.
- **Frightened outside combat**: turn-based durations only count down in combat, so a scare outside combat (Lights Out, Fright Save) is flagged to end after one minute of real time and the GM's client removes it. In combat it lasts until the end of the target's next turn.
- **Treat Bag**: "Reroll a d20" rerolls the actor's latest chat roll that contains a d20; "Ask a yes-or-no question" posts a card with GM-only Yes/No buttons.
- **Lights Out** fades the hall candles by shrinking their radii in two steps before hiding them (core has no light fade), and restores the radii so they can be relit.
- **Who edge** is an Active Effect that adds Advantage to `system.attributes.init.roll.mode`, removed when the showdown combat ends.
- **Unmask** fires in any combat that includes Quill, not only the one Showdown Setup builds. The Widow's early rise uses the same hook (Quill below half his maximum HP, 81).
- **Showdown Setup** also hides Quill's ground-floor token, and gives the will back to Quill if the party took it early ("the party catches him in the crypt with the will in one hand").
- **Snatch the Will** ties go to Quill (a contest tie keeps the status quo). It only considers a Quill token on the board, and burning the will removes it from every Quill token and the base actor, so a burned will cannot be snatched later.
- **The brazier** is grid square (45, 13). "Next to the brazier" means an adjacent square and "within 10 feet" means within two squares, counting diagonals as 5 ft (2024 rules).
- **The Midnight Bell** acts at most once per combat round, recorded on the combat (`flags.ravenmoor.bellRound`), so adding skeletons or late initiative rolls that shift the turn order cannot run a lair action twice.
- **Showdown Setup** can be run again: it asks, then deletes the previous showdown combat and its extra tokens (the Why allies and lair skeletons) before setting up afresh; characters keep at most one Counter-Herb.
- **Snuffing Powder** only affects one floor: the selected token's, else the user's character's, else (Quill's macro) Quill's floor; the GM is asked when none applies.
- **Epilogue**: core has no item piles, so Elspeth's Lantern appears as a tile on the memorial stone with a "Take the lantern" chat button; the first player to click receives the item and the tile is removed.
- **Players and items**: item data for every module item is bundled in `scripts/lib/generated.mjs`, so players can receive candy or the lantern without access to the GM-only compendium.
- Extra macros beyond the 14 features: Fright Save, Accusation (on its own), Midnight Bell (run a lair round by hand), Ravenmoor Settings (party size, running long, session clock, sounds, reset).

## Quality-of-life additions (beyond the spec)

- **Ravenmoor Director** (`scripts/lib/director.mjs`): a GM window listing every set piece in running order with a tick for each story beat, and a status block (act, candles and in-game time, cards found, Quill evidence and "ready to accuse", party, edges, session time, and in Act 3 the lair round, the Widow and the will). Ticks are read from the world where possible (Silas's token on the upper floor, the foxfire tile, the hidden stair enabled, the act, a showdown combat, Quill unmasked), so they are right however a beat was triggered; the others are ticked when run from the Director and can be toggled by hand. Opened by the Ravenmoor Director macro (hotbar slot 1), the welcome card, or <kbd>Shift</kbd>+<kbd>R</kbd>.
- **Party arrives at the drive**: places each player's character at the ground-floor `partyStart` (the spec asks for this after import; it needs assigned characters, so it is a button rather than an import step).
- **Set up my hotbar**: assigns the suggested macros to slots 1–10 (Director, Twelve Candles, Snuff a Candle, Reveal Handout, Clue Tracker, Lights Out, The Body, Midnight, Showdown Setup, Epilogue). Unmask Quill no longer has a suggested slot because it runs on its own.
- **Reset the Night**: restores the scene, the 11 NPCs and the Handouts & Clues journal from the Adventure compendium with their original ids (so every link and map pin still works), removes Ravenmoor items and effects from the party, resets the night's settings and deletes Ravenmoor combats, then puts the party back at the drive. Each part can be unticked. Journals the GM wrote, the chat log and the characters' own items are untouched.
- **Welcome card**: once per world, a GM-only chat card with the first steps and buttons for the Director and the hotbar, shown on the first load after import (and straight after importing).
- **Read-aloud to chat**: every read-aloud box in the journals has a hover hint; a GM double-click posts it to chat as a styled card.
- **Candle panel**: candles now go out left to right, so each candle's number is its snuff order and matches "candle 4/8/11". The GM sees markers and tooltips on the escalation candles and Midnight, and the real-time session timer when the session clock is running.
- **Keybindings**: Open the Director (<kbd>Shift</kbd>+<kbd>R</kbd>) and Snuff a candle (unbound), GM only, rebindable in Configure Controls.

## Art (beyond the spec)

The package's tokens are simple placeholder art (its generator says so). The module adds art in one consistent style that code can draw well: Victorian cut-paper silhouettes, black profiles in gilt oval frames on parchment, with colour only where the story has light (lanterns, candles, pumpkins, the green brazier). Everything is generated by Python in `tools/` and committed:

- `tools/build_portraits.py` → `assets/portraits/*.webp` (600 × 760): one portrait per NPC, named like its token, plus Quill unmasked. Actors use the portrait as their sheet image (`img`); prototype tokens keep the token art. Unmask Quill also swaps his sheet portrait.
- `tools/build_banners.py` → `assets/art/banner-*.webp` (1200 × 360) for seven Adventure chapters (arrival, the truth, the masque, the suspects, the Twelve Candles, the crypt, dawn) and `assets/art/suspects.webp`, the six suspects' portraits in Handout 2's order.
- The Household pages show each portrait; Locations pages show a small token face beside each person; Handout 2 shows the household strip above its table (the handout's text is unchanged); the *Introduce the suspects* Director button and macro post the six portraits with Handout 2's "who they are" and costume columns to chat for Scene 3.
- To use commissioned or hand-drawn art instead, replace the files in `assets/portraits` (and `assets/tokens`) keeping the same names, and rebuild; nothing else changes.

## Not verified in a running Foundry

Everything above was built and statically checked (`npm run check`: ESLint with `no-undef`/`no-unused-vars` over the runtime and build code, then the acceptance checks), but this environment has no Foundry v14 server. Before running it at the table, test in a v14.368 + dnd5e 6.0.6 world:

1. The Change Level prompt on each stair, and the hidden stair only after Reveal Secret Door.
2. The upper floor's compositing over the Great Hall (see the scene table above).
3. The crypt darkness region.
4. A Midnight Bell combatant without a token in the dnd5e combat tracker.
5. The Who edge's Advantage on initiative.
6. Reset the Night (recreating the scene and NPCs from the compendium with their original ids) and the Shift+R keybinding.
