# Ravenmoor Manor: Foundry VTT module handoff

This package holds everything needed to build **Death at Ravenmoor Manor** as a Foundry VTT adventure module: finished map art, tokens, wall/light/door data aligned to the art, and the full adventure content as structured data. Your job (Claude Code) is to turn it into an installable module with compendium packs, one-click import, and a small runtime script for the adventure's house rules and set pieces.

Read this whole file before writing code. Section 2 lists what to confirm against the live APIs first.

---

## 1. What the module must do

1. **Install and import.** A GM installs the module, enables it in a dnd5e world, and imports one Adventure document that creates the scenes, actors, items, journals and macros in tidy folders.
2. **Maps that just work.** The manor is three stacked floors (crypt and cellar, ground floor and grounds, upper floor) with walls, doors, secret doors, windows, lights, map pins and level transitions already placed. Players move between floors by stairs.
3. **Journals the DM can run from.** The adventure text, a DM guide, one page per map location (linked from the map pins), NPC profiles, and every player handout and clue card as a page the DM reveals with one click.
4. **Actors ready to fight or talk.** Eleven 2024-rules NPCs and monsters with working attacks, saves, recharge, reactions and lair actions.
5. **The set pieces, automated.** A Twelve Candles clock, the Treat Bag, the lights-out ghost scene, evidence reveals, the secret door, the accusation and Unmasking Edges, the Midnight Bell lair actions, and Quill's unmasking at his surrender threshold.

Out of scope: player characters, music, paid content, and any rules text beyond what is in `data/`.

---

## 2. Targets, and what to verify before coding

| Thing | Target | Notes |
|---|---|---|
| Foundry VTT | **v14**, verified on **14.368** (stable) | v14 adds native Scene Levels, a Change Level region behavior, and moves measured templates into Regions. |
| Game system | **dnd5e 6.0.6** | Requires core 14.367 or later. Uses the 2024 rules (SRD 5.2). |
| Pack tooling | `@foundryvtt/foundryvtt-cli` | Compiles JSON sources into LevelDB packs. |
| Module id | `ravenmoor-manor` | All asset paths assume `modules/ravenmoor-manor/...`. |

These were current as of October 2026. Before writing the scene and actor builders, check these against the real sources, because the details are new or change between versions:

1. **v14 Level schema.** How a Scene stores its levels (embedded collection or field), what each level holds (background, elevation range, darkness), and how walls, lights, tiles, notes, regions and tokens are tied to a level (a level id, an elevation range, or both). Sources: the v14 API docs (`https://foundryvtt.com/api/v14/`), the v14 release notes, and `resources/app/common/documents/` in an installed v14. If Levels cannot express what section 6 needs, build the fallback layout instead (also in section 6). Do not guess field names.
2. **Change Level region behavior.** Its type id and its fields (target level, and whether it moves tokens automatically or prompts).
3. **dnd5e 6.x data models.** Clone the system at its tag and read the models rather than relying on memory:
   `git clone --depth 1 --branch release-6.0.6 https://github.com/foundryvtt/dnd5e.git` (if that tag name is wrong, list tags with `git ls-remote --tags`). Read `module/data/actor/npc.mjs`, `module/data/item/*.mjs`, and `module/data/activity/*.mjs`. Export one hand-made NPC from a test world as JSON and diff it against what your builder emits.
4. **dnd5e compendium names.** Which packs hold the 2024 SRD spells and magic items (for Pip's spells and the Lantern of Revealing). Find them at runtime by searching every `Item` pack whose `metadata.packageName === "dnd5e"`, not by a hard-coded pack id.
5. **Lair actions in dnd5e.** Whether dnd5e 6.x has built-in lair-initiative handling for NPCs. If it does, use it and keep the custom lair text from `npcs.json`. If not, use the Midnight Bell combatant described in section 9.

If anything in this file conflicts with the real API, the API wins. Note what you changed in `docs/IMPLEMENTATION_NOTES.md`.

---

## 3. What is in this package

```
ravenmoor-foundry/
  CLAUDE.md                     start here (points to this file)
  docs/HANDOFF.md               this spec
  assets/
    maps/                       ship: level backgrounds, standalone upper floor, crypt battle map, DM keys
    tokens/                     ship: 12 token images, 512 x 512, ringed
    tiles/                      ship: 6 evidence and effect tiles (start hidden)
    previews/                   do not ship: PNG previews for humans
  data/
    scene-manifest.json         how to assemble scenes, levels, defaults and state triggers
    scenes/{ground,upper,below}.json   walls, lights, notes, tokens, regions, tiles per level
    content/
      npcs.json                 11 actors (2024 stat blocks, bios, lair, encounter block)
      items.json                13 items (plot items, rewards, Treat Bag candy, counter-herb)
      handouts.json             H1-H5, C1-C14, testimony, conclusions
      locations.json            30 location pages keyed to the map pins
      adventure.md              the adventure (canonical text from the campaign doc)
      dm-guide.md               DM guide: rulings, what-ifs, voices, clue table
  tools/                        Python that generated the art and scene JSON (for regeneration only)
```

**Canonical text.** The campaign doc *Death at Ravenmoor Manor* (Claude Doc: `https://claude.ai/artifact/8zhHzBAwjFAt81TjMiYUHC`) is the source of truth for adventure prose. `adventure.md`, `handouts.json` and the `source: "doc"` entries in `locations.json` are copies of it; the only edits replace references to the doc's tabs and its embedded route diagram with this module's journals and DM keys. `dm-guide.md` is the doc's DM guide tab with its prep checklist adapted for Foundry, plus the clue table from the printed DM screen. Entries marked `source: "module"` or `"mixed"` were written to give every map pin something to say; they never add or change a clue.

### Map assets

| File | Size | Use |
|---|---|---|
| `ravenmoor-ground.webp` | 4800 x 3600 | Ground floor and grounds (level 0) |
| `ravenmoor-upper.webp` | 4800 x 3600, transparent outside the house and over the open hall | Upper floor (level 20) when Levels composite |
| `ravenmoor-upper-standalone.webp` | 4800 x 3600, opaque with roofs | Upper floor as its own scene (fallback) |
| `ravenmoor-below.webp` | 4800 x 3600 | Crypt and cellar (level -20) |
| `ravenmoor-crypt-battlemap.webp` | 1800 x 1600 | Optional separate showdown scene (crop of the below level) |
| `ravenmoor-{ground,upper,below}-dm-key.webp` | 3160 x 1800 | GM-only keyed maps with numbered pins and clue tags; put them in the DM Guide journal as image pages |

All three levels share one canvas: 48 x 36 squares at 100 px, 5 ft per square. Stairs line up between levels, so a token at the top of a stair is at the same x, y on the floor above.

---

## 4. Module manifest

Start from this and adjust to the verified schema:

```json
{
  "id": "ravenmoor-manor",
  "title": "Death at Ravenmoor Manor",
  "description": "A three-hour Halloween murder mystery for 5-6 level 5 characters (D&D 2024 rules): a gothic manor on three floors, six suspects, nineteen clues and handouts, and one climactic fight in the chapel crypt.",
  "version": "1.0.0",
  "authors": [{ "name": "Your Name" }],
  "compatibility": { "minimum": "14", "verified": "14.368" },
  "relationships": {
    "systems": [{ "id": "dnd5e", "type": "system", "compatibility": { "minimum": "6.0.0", "verified": "6.0.6" } }]
  },
  "esmodules": ["scripts/ravenmoor.mjs"],
  "styles": ["styles/ravenmoor.css"],
  "languages": [{ "lang": "en", "name": "English", "path": "lang/en.json" }],
  "socket": true,
  "packs": [
    { "name": "adventure", "label": "Death at Ravenmoor Manor", "type": "Adventure", "system": "dnd5e", "path": "packs/adventure", "ownership": { "PLAYER": "NONE", "ASSISTANT": "OWNER" } },
    { "name": "actors",    "label": "Ravenmoor Actors", "type": "Actor", "system": "dnd5e", "path": "packs/actors", "ownership": { "PLAYER": "NONE", "ASSISTANT": "OWNER" } },
    { "name": "items",     "label": "Ravenmoor Items",  "type": "Item",  "system": "dnd5e", "path": "packs/items",  "ownership": { "PLAYER": "NONE", "ASSISTANT": "OWNER" } },
    { "name": "macros",    "label": "Ravenmoor Macros", "type": "Macro",                    "path": "packs/macros", "ownership": { "PLAYER": "NONE", "ASSISTANT": "OWNER" } }
  ],
  "packFolders": [{ "name": "Death at Ravenmoor Manor", "sorting": "m", "packs": ["adventure", "actors", "items", "macros"] }],
  "flags": {}
}
```

The scenes and journals live only inside the Adventure, so their cross-links always resolve (see Links, section 5). The actors, items and macros also get their own packs so a GM can reuse Quill or the scarecrow elsewhere. Leave `url`, `manifest` and `download` out until there is somewhere to host it. The GM fills in the author name.

---

## 5. Build pipeline

Use Node 20+ and plain ES modules. Suggested layout of the module repo you create:

```
ravenmoor-manor/
  module.json
  scripts/ravenmoor.mjs        runtime (section 9)
  scripts/lib/*.mjs            runtime helpers
  styles/ravenmoor.css
  lang/en.json
  assets/                      copied from this package (minus previews)
  build/                       Node build scripts, not shipped
    ids.mjs                    deterministic ids
    scenes.mjs  actors.mjs  items.mjs  journals.mjs  macros.mjs  adventure.mjs
    build.mjs                  runs all, writes src/packs/**, then compiles
  src/packs/<pack>/*.json      generated sources (git-tracked so diffs are readable)
  packs/<pack>/                compiled LevelDB (generated)
  data/                        copied from this package; the builders read it
```

**IDs.** Every document gets a 16-character alphanumeric `_id` derived from a stable key, so rebuilding never breaks links: `id = base62(sha256("ravenmoor:" + key)).slice(0, 16)`. Keys look like `actor:quill`, `item:new-will`, `journal:locations`, `page:locations:study`, `scene:main`, `wall:upper:37`, `light:ground:12`.

**Compiling.** Use the CLI's JavaScript API so the build is one command:

```js
import { compilePack } from "@foundryvtt/foundryvtt-cli";
await compilePack("src/packs/actors", "packs/actors", { log: true });
```

Each source document needs `_id` and a `_key` (`"!actors!<id>"`; embedded documents use `"!actors.items!<actorId>.<itemId>"`, `"!journal.pages!<entryId>.<pageId>"`, `"!scenes.walls!<sceneId>.<wallId>"` and so on). Check the CLI README for the current key format before relying on it.

Add `npm run build` (generate and compile) and `npm run package` (zip `module.json`, `scripts`, `styles`, `lang`, `assets` minus `previews`, and `packs` into `dist/ravenmoor-manor.zip`).

**Links between documents.** Importing an Adventure keeps every document's `_id`, so write links inside the Adventure as world UUIDs: `@UUID[Actor.<id>]{Dr. Quill}`, `@UUID[JournalEntry.<entryId>.JournalEntryPage.<pageId>]{C4}`, `@UUID[Item.<id>]{the new will}`. They resolve once the Adventure is imported. Do not use `Compendium.` UUIDs inside the Adventure; they would open the compendium copy. Verify after import that a link from the Locations journal opens the world document.

---

## 6. Scenes

Read `data/scene-manifest.json` with this section. Every coordinate in `data/scenes/*.json` is in image pixels with scene padding 0. Conventions:

| Data | Meaning |
|---|---|
| `walls[].c` | `[x1, y1, x2, y2]` |
| `walls[].move/sight/light/sound` | Foundry sense values: 0 none, 10 limited, 20 normal |
| `walls[].door` / `ds` | door type 0 none, 1 door, 2 secret; door state 0 closed, 1 open, 2 locked |
| `walls[].flags.ravenmoor.kind` | `ext`, `int`, `window`, `rail`, `brick`, `door`, `double` (one leaf of a double door), `secret`, `open` |
| `lights[].x/y` | light centre |
| `lights[].config.dim/bright` | radius in feet (scene distance units) |
| `lights[].flags.ravenmoor.group` | `hall_candles` for every light the ghost blows out |
| `notes[].x/y` | pin centre; `locationKey` links to `locations.json`; when it is null, `parentKey` names the page to open; `secret: true` marks pins that give away the passage |
| `tokens[]` | `x/y` is the top-left corner of the token's square; `actor` is the actor name; `hidden` is the starting visibility |
| `levelRegions[].rect` | top-left x, y plus width, height; `connectsTo` names the other level |
| `tiles[]` | top-left x, y, width, height; all start hidden; found by `label` prefix ("C4 foxfire smears", "Green brazier fire") |
| `partyStart` | where the party's tokens go on arrival (ground) or at the showdown (below) |

Counts to check after building: ground 109 walls, 27 lights, 17 notes; upper 58 walls, 5 lights, 13 notes; below 16 walls, 4 lights, 9 notes.

### Preferred: one Scene with three native Levels

One Scene, "Ravenmoor Manor", 4800 x 3600, grid 100 px / 5 ft, padding 0, token vision and fog exploration on, global light off. Three levels:

| Level | Elevation | Background | Darkness |
|---|---|---|---|
| Crypt & Cellar | -20 to 0 | `ravenmoor-below.webp` | 0.9 |
| Ground Floor & Grounds | 0 to 20 | `ravenmoor-ground.webp` | 0.75 |
| Upper Floor | 20 to 40 | `ravenmoor-upper.webp` (transparent) | 0.75 |

Put each level's walls, lights, notes, tiles, tokens and regions on that level. Each `levelRegions` entry becomes a Region with a Change Level behavior to its `connectsTo` level. Both **hidden stair** regions (the one on the upper level and the one on the below level) start disabled; the Reveal Secret Door macro enables them.

### Fallback: three Scenes

If Levels cannot do this cleanly, build three scenes from the same data: ground (`ravenmoor-ground.webp`), upper (`ravenmoor-upper-standalone.webp`, the opaque one) and below. Every `levelRegions` entry becomes a Region with a Teleport Token behavior that targets the same rectangle on the other scene (the rectangles match because the canvases align). Optionally add a fourth scene, the crypt battle map, by cropping the below data (`standaloneCrop` in `below.json`: subtract x 3000, y 400 and drop anything outside).

### Placement details

- **Tokens.** Match `tokens[].actor` to `npcs.json` by the name before any parenthesis. "Lord Silas Ravenmoor (body, Act 2)" is a second token of Silas's actor with the Dead status, hidden until Scene 5. On the below level, Quill and the four skeletons start hidden; the two scarecrows stand visible in the south-east corner all night (they look like ordinary scarecrows, as the adventure describes) and turn hostile at the showdown. Quill's tokens use the masked image; the unmask hook swaps it.
- **Notes.** Every pin is a GM tool: it links to a page in the GM-only Locations journal, and Foundry hides a note from any user who cannot see the page it links to (confirm in v14). Icon `icons/svg/book.svg` for locations and `icons/svg/hazard.svg` for the `secret` pins (verify both exist). A note with a `locationKey` opens that page (`entryId` plus `pageId`); a note without one opens its `parentKey` page and shows its own label as the note text.
- **Clue pins (GM only).** Every card in `handouts.json` with a `mapPos` gets a GM-only note at `mapPos x 100` linked to its page in the Handouts & Clues journal, icon `icons/svg/eye.svg`.
- **Lights.** Brazier and hall lights carry labels; the Snuffing Powder macro treats every light as a nonmagical flame except the one whose label starts with "Hallows' brazier".
- **Thumbnails.** Generate scene thumbnails at build time or after import with `scene.createThumbnail()`.

---

## 7. Actors (`data/content/npcs.json`)

Eleven actors: `quill` (antagonist), `scarecrow`, `skeleton` (minion), `morwenna`, `edric`, `pip` (suspect and possible ally), `bramwell`, `crane`, `fennick`, `widow` (spirit, not meant to be fought), `silas` (victim). All use the 2024 stat-block conventions.

Map each actor to a dnd5e `npc`:

| npcs.json | dnd5e 6.x (verify paths) |
|---|---|
| `abilities` | `system.abilities.<abl>.value` |
| `saves` | `system.abilities.<abl>.proficient = 1` |
| `skills` | `system.skills.<key>.value`: proficient 1, expertise 2 |
| `ac.value`, `ac.source` | `system.attributes.ac` with flat calculation |
| `hp.average`, `hp.formula` | `system.attributes.hp.value/max/formula` |
| `initiative.modifier` | initiative bonus so the sheet shows the listed modifier (score = 10 + modifier) |
| `speed` | `system.attributes.movement` (walk, fly, hover) |
| `senses` | the senses data (darkvision and so on) |
| `size`, `creatureType`, `alignment`, `cr` | `system.traits.size`, `system.details.type.value`, `system.details.alignment`, `system.details.cr` |
| `languages` | `system.traits.languages` (custom text for "understands Common but does not speak") |
| `immunities`, `resistances`, `vulnerabilities` | `system.traits.di/ci/dr/dv` |
| `traits[]` | `feat` items, type monster, passive |
| `actions[]` with `attack` | `weapon` or `feat` items with an **attack** activity (to-hit bonus as given, damage parts as given) |
| `actions[]` with `save` | `feat` items with a **save** activity (ability, flat DC, damage, half on success when `onSuccess: "half"`, area template from `area`) |
| `recharge: [5, 6]` | item uses with recharge recovery 5 |
| `uses: {max, per}` | item uses with the matching recovery period |
| `bonusActions[]`, `reactions[]` | activation type bonus / reaction; keep the trigger text |
| `spellcasting` (Pip) | innate spells pulled by name from the dnd5e SRD spell compendium, at will or with per-day uses, Intelligence, DC 13, no material components |
| `biography` | `system.details.biography.value` as HTML (look, wants, secret, knows, plays as, lines) |
| `token`, `tokenUnmasked` | prototype token image (`modules/ravenmoor-manor/<path>`) |

Every item's `text` is the exact stat-block wording; put it in the item description so the sheet reads like the printed block, then add activities that do the same thing mechanically.

**Prototype tokens.** All unlinked except Silas. Dispositions: Quill neutral until the showdown setup sets him hostile (the unmask hook sets him back to neutral), scarecrow and skeleton hostile, everyone else neutral, Pip friendly. Size from `size`. Leave Foundry's dynamic token rings off; the images already carry a ring.

**Special cases**

- **Skeleton (minion).** A fixed 1 HP (no formula); any damage destroys it. Run all skeletons on one initiative (group them in the tracker if v14 supports combatant groups; otherwise give them identical initiative).
- **Quill's Cornered trait.** Surrenders at 30 HP or fewer, or 50 when the DM sets "running long". Handled by the runtime hook in section 9, not by an activity.
- **Quill's lair.** `quill.lair.rounds` has the four lair actions with text and automation hints. See section 9, feature 9.
- **The Widow.** Ethereal Retreat: if anyone attacks her, she vanishes for the night. She acts only through the round 4 lair action and the epilogue.
- **Encounter block.** `npcs.json.encounter` has the 5- and 6-character compositions, difficulty, Unmasking Edges, the will rule and terrain. Use it for the showdown setup macro.

---

## 8. Items, journals and the Adventure document

### Items (`data/content/items.json`)

Thirteen items. Build each with the given `type` and `system` hints, its description as HTML, and the listed `activities`. Put the plot items in the actors that start with them:

| Item | Starts with |
|---|---|
| Edric's Debt Letter | Edric |
| Dr. Quill's Medical Bag (container: New Will, Empty Vial, Snuffing Powder as loot) | Quill |
| Lockbox Key | Quill (moves to Edric at candle 8) |
| Raven-Headed Cane | Silas (reward from the will) |
| Treat Bag Candy (quantity 2) | given to every player character by the Treat Bag setup macro |
| Sprig of Counter-Herb | given to every player character by the How edge |
| Elspeth's Lantern | placed at the epilogue |

For Elspeth's Lantern, clone "Lantern of Revealing" from the dnd5e item compendium and change only the name, image and light colour. If you must fall back to the text in `items.json`, it comes from the SRD 5.2, so add the CC-BY-4.0 attribution to the module README. Check every suggested `img` path exists and fall back to `icons/svg/item-bag.svg`.

### Journals

Build five journal entries inside the Adventure, all GM-only by default (`ownership.default = NONE`), in a "Death at Ravenmoor Manor" folder:

1. **Adventure** from `adventure.md`. One text page per `## ` heading, in order (At a glance, The truth, Six house rules, Session clock, Act 1, The suspects, The manor, Act 2, Act 3, Endings and epilogue, Handouts and quick reference). Convert Markdown to HTML at build time (use `marked` or similar). Render `>` blocks as boxed read-aloud text (`<blockquote class="ravenmoor-readaloud">`). Replace suspect names on their first mention per page with UUID links to the actors, and card ids (C1, H3...) with links to their handout pages. The DM-key image reference becomes an image link to the ground DM key.
2. **DM Guide** from `dm-guide.md`, one page per `## ` heading, plus three image pages for the DM keys (`ravenmoor-*-dm-key.webp`).
3. **Locations** from `locations.json`, one page per location in map order (ground pins 1-16, upper 1-12, below). Page layout: read-aloud box (and the alternate read-aloud with its label, when present), features as a list with ★ kept, a "Clues here" row of links to the handout pages, NPC links, DM notes in a muted aside. Map notes link to these pages.
4. **Handouts & Clues** from `handouts.json`, one page per card (H1-H5, C1-C14) rendered as a styled handout (section 10). Give the entry itself Limited for players so revealed pages show up, and each page `ownership.default = NONE` until revealed; H1 starts revealed (players get it before the session). Also add one GM page, "Clue Tracker", built from `conclusions` (four lists of evidence ids and labels, the doc's clue checklist), and one GM page, "Testimony", from `testimony[]`.
5. **The Household** (NPC profiles) from each actor's `biography`, one page per suspect plus Silas, Fennick and the Widow, GM-only. The player-safe household list is Handout 2.

### Macros

One script macro per feature in section 9, each a one-line call into the module API (`game.modules.get("ravenmoor-manor").api.<fn>()`), so the logic lives in the module and the macros survive updates. Put them in a "Ravenmoor" macro folder and suggest hotbar slots in the DM Guide.

### Adventure document

Bundle the scenes, actors, items, journals, macros and their folders into one Adventure document in the `adventure` pack, with a cover image (render a title card from the ground map; never the DM keys, which show the secret passage) and a short description. If v14 offers an adventure quick-start or auto-import option, turn it on so the GM lands on the arrival scene with the Adventure journal open. After import, activate the main scene with the ground level showing and the party start at the drive (`partyStart`).

---

## 9. Runtime features (`scripts/ravenmoor.mjs`)

Everything runs on the GM's client unless noted; players get display updates through world settings (which sync to every client) or `game.socket` on `module.ravenmoor-manor`. Expose an API object on `game.modules.get("ravenmoor-manor").api`.

### World settings

| Setting | Type | Purpose |
|---|---|---|
| `act` | string | `act1`, `act2`, `act3`, `epilogue` |
| `candlesLit` | number 0-12 | Twelve Candles state |
| `sessionStart` | number (timestamp) | for the real-time warnings |
| `edges` | object `{who, how, why}` | Unmasking Edges granted |
| `runningLong` | boolean | Quill surrenders at 50 instead of 30 |
| `clues` | object | which cards and testimony the party has (Clue Tracker) |
| `partySize` | 5 or 6 | showdown composition |
| `lairRound` | number | last lair action run |
| `widowRisen`, `quillUnmasked`, `willBurned` | booleans | showdown state |

### Features

1. **Twelve Candles clock (house rule 1).** A small always-on-top panel (ApplicationV2) showing twelve candles. Everyone sees it; only the GM can click. Snuffing a candle plays a puff animation and decrements `candlesLit`. Hooks: candle 4, 8 and 11 send the GM a whisper with that escalation's text (from `adventure.md`, Escalations); candle 12 runs **Midnight** (below). A "Split Up!" toggle reminds the GM that one round of group scenes costs one candle. If `sessionStart` is set and real time reaches 1:55, prompt the GM: "A sudden gust: snuff the remaining candles?" The panel appears, with all twelve lit, when The Body runs.
2. **Treat Bag (house rule 4) and Scaredy-Cat (rule 5).** Setup macro gives every player character 2 Treat Bag Candy. The candy item's three activities: reroll a d20 (rerolls the actor's last d20 roll in chat), add 1d4, or ask a yes-or-no question (posts a card the GM answers with Yes/No buttons). A GM panel lists each player's candy count with +1 buttons for rewards. Whenever the GM requests a Wisdom save for fright, the chat card shows players a "Fail on purpose (Scaredy-Cat)" button that marks the save failed, applies Frightened until the end of their next turn, and awards a candy.
3. **Act 1 beats.** Macros for the state triggers in `scene-manifest.json`: **Silas Retires** (8:25, lock the study door), **Lights Out** (8:55: flash a green light on the minstrels' gallery for a few seconds, then hide every `hall_candles` light with a short fade (the Great Hall's candelabras and fire, and the gallery sconces), reveal the foxfire tile, post the DC 13 Wisdom save request with the Scaredy-Cat button), **The Body** (9:00: swap Silas for the body token, reveal footprints and lilies, open the study door, show Handout 2 to everyone, light the twelve candles, set `act2`, reveal the boot-print tile).
4. **Reveal a handout.** A GM dialog lists all 19 cards with found/not found state; choosing one gives players Observer on that page, shows it to all (or chosen) players, ticks it in the Clue Tracker, and runs the card's `onReveal` (C3 reveals the secret door). Cards with a matching item also offer "Give item to..." for the finder.
5. **Reveal Secret Door.** Turns the bookcase secret door (upper, label "Bookcase (secret door)") and the tomb door (below, "Hidden door behind Elspeth's tomb") into normal doors, opens the bookcase, and enables both hidden-stair regions.
6. **Clue Tracker.** The GM page shows the four conclusions from `handouts.json` with their evidence. Cards tick automatically when revealed (each card's `conclusions` field matches these lists); testimony and *speak with dead* are ticked by the GM. When `readyToAccuseAt` (3) of the "The killer is Quill" items are ticked, whisper the GM "They are ready to accuse."
7. **Midnight.** Tolls the bell (chat card, optional sound if the GM configured one), reveals the brazier light and flame tile, adds Fennick's token on the drive if he is not there, and opens the **Accusation** dialog: three checkboxes (who: Quill; how: poisoned tonic plus passage or costume; why: Edric's debts, moonsilver or the stolen will) with the edge text beside each. Saving stores `edges`.
8. **Showdown setup.** Moves the party to the crypt `partyStart`, reveals and sets hostile the showdown tokens for `partySize` (5: one scarecrow; 6: two), applies edges (Who: an Active Effect granting Advantage on initiative to player characters for this combat; How: a Sprig of Counter-Herb to each player character; Why: places Edric and Bramwell tokens by the coffins), and creates the combat.
9. **Midnight Bell lair actions.** Unless dnd5e handles lair initiative natively, add a "Midnight Bell" combatant (a hidden utility actor) at initiative 20, sorted after any creature that also rolled 20. On its turn, run the next lair round from `quill.lair.rounds`:
   - Round 1, The dead rise: unless `edges.why`, create two skeleton tokens at (4000, 1600) and (4200, 1600) on the below level, on the skeletons' initiative.
   - Round 2, Candles gutter: post a DC 13 Wisdom save request for player characters (with the Scaredy-Cat button); on failure, Frightened until the end of the target's next turn.
   - Round 3, Green flame: pulse the brazier light, post a DC 13 Dexterity save request and 2d6 fire damage for creatures within 10 ft of the brazier (centre 4530, 1330), and set the will as burnable. From now on, if Quill starts his turn adjacent to the brazier while holding the New Will, prompt the GM: "Burn the will (Bonus Action)?" Yes sets `willBurned` and deletes the item.
   - Round 4, The Widow's due (or as soon as Quill drops below half his HP, 81): reveal the Lantern Widow token on Elspeth's tomb (3900, 1300), roll Quill's DC 15 Wisdom save, and on a failure apply Frightened until the combat ends. Set `widowRisen` so it never runs twice.
   - Ring the handbell sound on each lair turn if one is configured.
10. **Snatch the will.** A macro for a player adjacent to Quill: contested Athletics or Sleight of Hand against Quill's choice of Athletics or Sleight of Hand; on a win, move the New Will to that character.
11. **Topple a candelabra.** Hides the chosen crypt candelabra light, creates a 10-ft square fire area (Region plus a light) and posts 2d6 fire damage for anything inside.
12. **Snuffing Powder.** Pick a point; hide every light within 20 ft except the Hallows' brazier; spend one use of Quill's Snuffing Powder feature (the pouch in his bag is loot for afterwards).
13. **Unmask Quill.** Hook `updateActor`/`updateToken` on Quill's token actor: when HP is at or below 30 (50 if `runningLong`), swap the token image to `quill-unmasked.webp`, set his disposition neutral and mark him defeated, mark every skeleton and scarecrow defeated (and fade the skeletons out), post the unmasking line from `adventure.md`, and end the combat after GM confirmation.
14. **Epilogue.** Posts the outcome table result based on `quillUnmasked` and `willBurned`, tints the six "Warding lantern" lights green, shows the Lantern Widow token standing on the pond (top-left 550, 2800 on the ground level) for the read-aloud, and places Elspeth's Lantern on the memorial stone (grid 11.4, 30.6) as an item the party can take.

Keep features independent: a GM who prefers real tealights and candy can ignore the clock and the Treat Bag without anything else breaking.

---

## 10. Styling

`styles/ravenmoor.css`, scoped under `.ravenmoor`:

- **Handout pages** look like the printables: parchment background `#f4ecd8`, ink `#231c17`, accent green `#2e5e47`, rule colour `#5a4a3c`; headings in IM Fell English, body in EB Garamond, a small caps header line ("Clue C4 · Minstrels' gallery"), the annotation in italics at the foot, a wax-seal roundel (black raven for Silas's papers, green mortar and pestle for Edric's letter) when `seal` is set. Bundle the fonts in `assets/fonts` from Google Fonts (both are SIL Open Font License; include the licence files), with Georgia as fallback.
- **Read-aloud boxes** in the journals: parchment box, green left border, italic.
- **Candle panel:** twelve small candle icons in a row, lit ones flickering (CSS animation), snuffed ones grey with a wisp.

---

## 11. Acceptance checklist

- [ ] `npm run build` and `npm run package` succeed from a clean clone; the zip installs through Foundry's manual install.
- [ ] Importing the Adventure in a fresh dnd5e 6.0.6 world creates every document with no console errors, and running the import twice offers to update rather than duplicate.
- [ ] The main scene opens on the ground floor at the drive; walls block vision correctly through the house; windows let sight through but not movement; the gallery railing lets sight through but not movement; doors open and close; the two secret doors are invisible to players until revealed.
- [ ] Taking the main stair, the servants' stair, the cellar stairs and the crypt stairs moves a token to the right level at the same x, y. The hidden stair does nothing until the secret door is revealed.
- [ ] Every map pin opens the right Locations page for the GM, and a player account sees no pins at all.
- [ ] Each of the 11 actors opens without errors; Quill's Scalpel, Acid Flask and Banshee's Breath roll the listed to-hit, DC and damage; Banshee's Breath recharges on 5-6; the scarecrow's Pumpkin Burst and Grinning Glare work; a skeleton dies to 1 damage.
- [ ] The two scarecrows are visible in the crypt during the investigation; Quill and the skeletons are not.
- [ ] Lights Out flashes the green light, darkens the Great Hall and the gallery, and reveals the foxfire; The Body swaps Silas's token, reveals the evidence and starts the clock.
- [ ] Snuffing candle 4, 8 and 11 whispers the right escalation; candle 12 rings midnight and opens the Accusation dialog.
- [ ] With the Why edge, lair round 1 spawns nothing; without it, two skeletons appear. Round 4 reveals the Widow and rolls Quill's save. Dropping Quill below 81 HP triggers the Widow early, once.
- [ ] Quill at 30 HP (or 50 with "running long") swaps to the unmasked token and ends the fight.
- [ ] A player account sees revealed handouts only, and never sees GM journals, the DM keys or map pins.
- [ ] `docs/IMPLEMENTATION_NOTES.md` records every place the build differs from this spec.

---

## 12. Assumptions and open questions

1. **Levels schema.** Section 6 assumes v14 Levels can hold a per-level background and darkness and can scope walls, lights and tokens to a level. If they cannot, use the fallback scenes; the data supports both.
2. **Composited upper floor.** `ravenmoor-upper.webp` is transparent over the open Great Hall and outside the house so the floor below can show through. If v14 does not render lower levels beneath an upper one, use `ravenmoor-upper-standalone.webp` as the upper level's background instead.
3. **Light radii** are tuned for darkness 0.75 indoors. Adjust darkness first, then radii, if the house reads too dark at the table.
4. **Fennick and Silas** have minimal combat stats; they are not meant to fight.
5. **No audio** ships with the package. Leave sound hooks configurable (a module setting per cue: bell, gust, scream) and empty by default.

---

## 13. Regenerating the art

The maps, DM keys, tiles and tokens come from Python in `tools/` (Pillow, NumPy, SciPy). `python3 tools/build_maps.py` rewrites `assets/maps`, `assets/tiles`, `assets/previews` and `data/scenes/*.json` together, so walls always match the art; `python3 tools/build_tokens.py` rewrites `assets/tokens`. Room layouts, doors, windows, lights and pins live in `ground_level()`, `upper_level()` and `below_level()` in `build_maps.py`, in grid squares. If you change a layout, rerun the script and rebuild the packs; never hand-edit the scene JSON.
