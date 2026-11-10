# Ashford Roads: Act 1

A Foundry VTT **v14** adventure module for the **Possibilities** game system (`possibilities-system/` in this repo): Act 1 of
the Wayfinder story. Your own character, with Enkrid, Rook and Tova, from the Coast Road into Ashford's sewers to the
morning the Gilded Tern leaves without them. Built for playing it **solo** (you are the GM and you run all four heroes)
and **writing your story** as you go.

## What you get

- **The Act 1 Director** (macro, or <kbd>Shift</kbd>+<kbd>A</kbd>): the 14 steps in order, with the day, a tick for each, *Read aloud* (each line posted to chat as its speaker, with their portrait), *Page*, *Map*, *Write this beat*, and each step's tools. Optional side work (the broker's board, a rat cull) is off by default.
- **Seven journals**: *Act 1: Ashford Roads* (how to play it, the act at a glance, a setting primer, and one page per scene with the script, the beat, GM notes and buttons), *Ashford* (places), *People of Ashford* (portraits, the trio's set evolution), *Stupid, Basic, and Naive Questions*, *Act 1 Handouts*, *Glossary*, and **My Story**: three prompts per beat, a session log the module fills in, and *Copy my story* for clean text to paste into Word.
- **21 actors**: the trio (Unclassed heroes), the people of Ashford and the legends, the rats, Old Gnaw, the Gloam, and the **Into the light** Scene (Resistance 80, DC 12, six approaches, Setbacks that damage the loaners, an 8-round sun clock).
- **Seven maps**: battle maps for the Undercourses and the Grate Chamber (the shaft of sunlight moves with the clock), and scene art for Ashford, the Exchange, the Binding House, the Lantern and Lee and the Long Quay.
- **Set pieces**: make your character (with a race-family intro), hand out the loaners, Old Gnaw, the Gloam's two-round rebuff, the Scene and its sun clock, the **Purse** (four bindings at 50 gold crowns: 160 reward − 30 loaner bill + 70 danger fee, "not a copper over"), Binding, Enkrid's collapse, the inn, the end of the act and its milestone, the **oracle** for solo play, and **Reset Act 1**.
- Seven empty playlists, one per location, for your own music.

Pages marked **Draft by Claude** were drafted for you; your own canon is marked **Your canon**. Change anything.

## Install

1. Install the **Possibilities** system first (manifest `https://github.com/1994akh/TTRPG-App/releases/latest/download/system.json`).
2. Install this module: `https://github.com/1994akh/TTRPG-App/releases/latest/download/possibilities-act1.json`, or unzip `possibilities-act1.zip` into `Data/modules/`.
3. Make a world with the Possibilities system, enable **Ashford Roads: Act 1**, open its compendium (Adventure) and **Import**.
4. Open the **Act 1 Director** and press **Make your character**.

## Playing it solo

You run the world and play all four heroes. Work down the Director: read each scene aloud (the chat log becomes the
story so far), use the step's tools, roll in the open, and press *Write this beat* to jot what happened in My Story.
When you don't know what the world would do, *Ask the oracle*. At the end of a session, *Write the session log*.

## Build from source

Requires Node 20+, and the system folder next to this one (the tests use its rules).

```sh
npm install
npm run build     # src/packs/** JSON sources, the LevelDB packs, scripts/lib/generated.mjs
npm run check     # lint, static checks (links, lore verbatim, API names, assets), the tests
npm run package   # dist/possibilities-act1.zip and dist/possibilities-act1.json
```

Inputs: `data/lore/*.json` and `data/lore/prologue_draft.txt` (the user's lore, copied from Possibilities-Game
`content/lore/`; never edit them here), `data/act1/*.json` (this module's steps, numbers, items, handouts, primer),
`data/scenes/*.json` and `assets/` (from `tools/build_maps.py` and `tools/build_portraits.py`). Every number the
decisions page settles is in `data/act1/config.json`.
