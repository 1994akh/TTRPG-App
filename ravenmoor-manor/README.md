# Death at Ravenmoor Manor

A Foundry VTT v14 adventure module for **dnd5e 6.x** (D&D 2024 rules): a three-hour Halloween murder mystery for 5–6 level 5 characters. A gothic manor on three floors, six suspects, nineteen handouts and clue cards, and one climactic fight in the chapel crypt.

## What you get

- **One scene, three levels.** Crypt & Cellar, Ground Floor & Grounds, and the Upper Floor, with walls, doors, two secret doors, windows, the gallery railing, lights, stairs between levels, and GM-only map pins that open the matching Locations page.
- **Five journals.** The Adventure, the DM Guide (with the three DM keys), Locations (one page per map pin), Handouts & Clues (revealed to players one card at a time, with a self-updating Clue Tracker), and The Household.
- **Eleven actors** with working 2024 stat blocks: Dr. Quill, the pumpkin-headed scarecrow, the skeleton minion, the five other suspects, Silas, Fennick and the Lantern Widow.
- **Thirteen items**, from the stolen will to the Treat Bag candy and Elspeth's Lantern.
- **Macros for every set piece**: the Twelve Candles clock, the Treat Bag and Scaredy-Cat bonus, Lights Out, The Body, revealing handouts, the secret door, Midnight and the Accusation, Showdown Setup with the Midnight Bell lair actions, Quill's unmasking, and the Epilogue.
- **Art**: a silhouette portrait for every NPC (Victorian cut-paper profiles in gilt frames, used on the actor sheets and The Household; Quill's switches to unmasked when he surrenders), banners for the Adventure's chapters, the household's portraits on Handout 2, and an *Introduce the suspects* chat card for the feast.
- **The Ravenmoor Director** (macro, or <kbd>Shift</kbd>+<kbd>R</kbd>): one GM window with every set piece in running order, ticks for what has happened, and the night at a glance (act, candles, clues found, edges, session time).
- **GM conveniences**: place the party at the drive in one click, set up the hotbar in one click, double-click any journal read-aloud box to post it to chat, escalation markers and a session timer on the candle panel, and **Reset the Night** to put the map, NPCs and handouts back to the start for a test run or a replay.

## Install

**From a manifest URL** (once a release is published; see *Publishing a release* below):

1. In Foundry's setup screen, open **Add-on Modules** and click **Install Module**.
2. Paste this into **Manifest URL** at the bottom and click **Install**:
   `https://github.com/1994akh/TTRPG-App/releases/latest/download/module.json`

**Or from the zip:** download `ravenmoor-manor.zip` (from a release, or build it below) and unzip it into your Foundry `Data/modules/` folder so you have `Data/modules/ravenmoor-manor/module.json`.

Then:

1. In a dnd5e 6.0.6 world on Foundry v14, enable **Death at Ravenmoor Manor** (Game Settings → Manage Modules).
2. Open the **Death at Ravenmoor Manor** compendium (Adventure) and click **Import**. The scene activates, the Adventure journal opens, and a GM-only welcome card appears in chat.
3. Assign each player their character (User Configuration), then open the **Ravenmoor Director** from the welcome card (or <kbd>Shift</kbd>+<kbd>R</kbd>) and work down its *Before the session* list. Its *Set up my hotbar* button fills hotbar slots 1–10.

## Publishing a release

The repository must be **public**: Foundry downloads the manifest and zip without signing in to GitHub.

1. On GitHub, open **Releases** → **Draft a new release**.
2. Under **Choose a tag**, type a new version tag, such as `v1.0.0`, and choose **Create new tag on publish** (target `main`).
3. Give it a title, leave **Set as a pre-release** unticked, and click **Publish release**.
4. The **Release** action (Actions tab) builds and checks the module, then attaches `module.json` and `ravenmoor-manor.zip` to the release, in about two minutes.

For an update, publish a new release with a higher tag (`v1.0.1`, `v1.1.0`, …). The released module takes its version from the tag, so Foundry's **Check for Updates** offers it to everyone who installed from the manifest URL.

## Build from source

Requires Node 20+.

```sh
npm install
npm run build     # generate src/packs/** and compile the LevelDB packs into packs/**
npm run check     # lint, static checks (counts, links, assets, stat blocks, macros) and the tests
npm test          # just the tests: the whole night played in a simulated Foundry world
npm run package   # dist/ravenmoor-manor.zip
```

The build reads `data/` (scene data, adventure text, stat blocks, handouts) and `assets/` (maps, tokens, tiles, fonts). Never hand-edit `data/scenes/*.json` or the map images: regenerate them with `python3 tools/build_maps.py` (and `tools/build_tokens.py`, `tools/build_cover.py`), then rebuild. The portraits and chapter banners come from `tools/build_portraits.py` and `tools/build_banners.py` (run the portraits first; the suspects strip is made from them). `npm run vendor -- <dnd5e checkout>` refreshes the SRD spells and Lantern of Revealing copied from the dnd5e system.

Document ids are derived from stable keys (`build/ids.mjs`), so rebuilding never breaks links, and re-importing the Adventure updates documents rather than duplicating them.

## Layout

```
module.json            manifest
scripts/ravenmoor.mjs  runtime entry point (API, hooks)
scripts/lib/           runtime features; generated.mjs is written by the build
styles/ lang/          stylesheet and strings
assets/                maps, tokens, tiles, fonts, cover
build/                 Node build scripts (not shipped)
data/                  inputs the build reads (not shipped)
src/packs/             generated JSON sources (tracked, so diffs are readable)
tools/                 Python that generates the art and scene data
docs/                  HANDOFF.md (the spec) and IMPLEMENTATION_NOTES.md
```

## Credits and licences

Adventure text: *Death at Ravenmoor Manor*. Third-party content (SRD 5.2 under CC-BY-4.0, and the OFL fonts) is listed in `LICENSE-CONTENT.md`.

This work includes material from the System Reference Document 5.2 ("SRD 5.2") by Wizards of the Coast LLC, available at https://www.dndbeyond.com/srd. The SRD 5.2 is licensed under the Creative Commons Attribution 4.0 International License, available at https://creativecommons.org/licenses/by/4.0/legalcode.
