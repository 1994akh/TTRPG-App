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

Clue pins: 15 of the 19 cards have a `mapPos`, so the scene has 39 location pins plus 15 clue pins (eye icon, green). Secret pins use the hazard icon tinted red.

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

- Flags live in `flags.ravenmoor` as the spec asks. Because "ravenmoor" is not a package id, the runtime reads them directly (`doc.flags.ravenmoor`) and never through `getFlag`. Chat messages created at runtime use `flags["ravenmoor-manor"]`.
- **Twelve Candles**: snuffing candle *n* means the *n*th candle to go out (4, 8 and 11 whisper the escalations; 12 runs Midnight). The panel shows the in-game time. The 1:55 gust needs the session clock started (Ravenmoor Settings macro).
- **Scaredy-Cat** lives on the module's own save-request card (Lights Out, lair round 2 and the Fright Save macro), not on dnd5e's generic request cards. Rolling from the card applies Frightened on a failure; Scaredy-Cat applies it and awards a candy.
- **Treat Bag**: "Reroll a d20" rerolls the actor's latest chat roll that contains a d20; "Ask a yes-or-no question" posts a card with GM-only Yes/No buttons.
- **Lights Out** fades the hall candles by shrinking their radii in two steps before hiding them (core has no light fade), and restores the radii so they can be relit.
- **Who edge** is an Active Effect that adds Advantage to `system.attributes.init.roll.mode`, removed when the showdown combat ends.
- **Unmask** fires in any combat that includes Quill, not only the one Showdown Setup builds. The Widow's early rise uses the same hook (Quill below half his maximum HP, 81).
- **Showdown Setup** also hides Quill's ground-floor token, and gives the will back to Quill if the party took it early ("the party catches him in the crypt with the will in one hand").
- **Snatch the Will** ties go to Quill (a contest tie keeps the status quo).
- **Epilogue**: core has no item piles, so Elspeth's Lantern appears as a tile on the memorial stone with a "Take the lantern" chat button; the first player to click receives the item and the tile is removed.
- **Players and items**: item data for every module item is bundled in `scripts/lib/generated.mjs`, so players can receive candy or the lantern without access to the GM-only compendium.
- Extra macros beyond the 14 features: Fright Save, Accusation (on its own), Midnight Bell (run a lair round by hand), Ravenmoor Settings (party size, running long, session clock, sounds, reset).

## Not verified in a running Foundry

Everything above was built and statically checked (`npm run check`), but this environment has no Foundry v14 server. Before running it at the table, test in a v14.368 + dnd5e 6.0.6 world:

1. The Change Level prompt on each stair, and the hidden stair only after Reveal Secret Door.
2. The upper floor's compositing over the Great Hall (see the scene table above).
3. The crypt darkness region.
4. A Midnight Bell combatant without a token in the dnd5e combat tracker.
5. The Who edge's Advantage on initiative.
