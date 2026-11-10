# Possibilities (Foundry VTT game system)

The **Possibilities** tabletop RPG for Foundry VTT **v14**, from the `Possibilities_TTRPG_System_v1_1.xlsx` workbook:
three tracks (race, class, profession), grades F to S, every roll d20 + modifier + training + EL against a DC, three
actions a turn, **Scenes** (Resistance, approaches with Full / Half / None aptness, Setbacks, a clock) and the Dying
track. Built for the Wayfinder setting and the **Ashford Roads: Act 1** module (`../possibilities-act1/`).

## Install

In Foundry's setup screen, **Game Systems → Install System**, paste this **Manifest URL** and click **Install**:

`https://github.com/1994akh/TTRPG-App/releases/latest/download/system.json`

(or unzip `possibilities.zip` into `Data/systems/possibilities/`). Then create a world with the Possibilities system.

## Playing

- **New hero** (button in the Actors sidebar): name, race (41, by family), F-grade profession, skills, pronouns, look.
  Heroes start **Unclassed**; the sheet's **Bind** button (or `game.possibilities.bind(actor)`) picks one of the twelve
  F-grade classes. Heroes with a story path (the trio) take the next class on it.
- **Hero sheet**: the three tracks with Combat EL / Craft EL and XP, abilities and saves, 24 skills (tap to roll), the
  three action pips, zone, Dying pips, an Actions tab (Strike per weapon with the multiple attack penalty shown, Stride,
  Raise Guard, Aid, Stabilise, Recall Knowledge, Interact, Withdraw, signatures, spells, rests), gear with Loaned and
  condition badges, coins, and a Story tab (drive, appearance, biography, notes, the set evolution path).
- Target a token before rolling: checks use its DC, Strikes its AC. Damage cards have Apply buttons.
- **Scenes** are an actor type: put one in the combat tracker and its clock ticks each round. Its sheet lists every
  approach with each hero's aptness and an Attempt button.
- World settings: *Enter my own rolls* (type in physical dice), *Undertaking* (permanent death), the points formula,
  recovery DC and more.
- Compendia: Rules of Possibilities (journal), Races, Classes, Professions, Signatures, Spells. Drag a race, class or
  profession onto a hero to set that track.

## Build from source

Node 20+.

```sh
npm install
npm run build     # module/rules-data.mjs from data/rules, compendium sources in src/packs, LevelDB packs in packs/
npm run check     # eslint, static checks (manifest, templates compile, language keys, packs), node tests
npm run package   # dist/possibilities.zip and dist/system.json (add -- --release vX.Y.Z for a release)
```

The rules core (`module/rules.mjs`) is a port of `tests/rules_reference.py`, the workbook's Character Sheet formulas,
and passes all 202 of its cases (including Vera, the workbook's pregen). Rules data in `data/rules/` is copied from the
Possibilities-Game repo (`content/possibilities/`, imported from the workbook); never edit it here.

## Layout

```
system.json              manifest
module/possibilities.mjs entry: registration, settings, game.possibilities API
module/rules.mjs         pure rules (EL, the sheet, degrees, MAP, NPC benchmarks, Scenes, Dying, money)
module/config.mjs        every rules default in one place
module/rules-data.mjs    generated from data/rules (do not edit)
module/data/             data models: hero, npc, obstacle (Scene), items
module/documents.mjs     Actor, Item, Combat (turn reset, recovery checks, Scene clocks)
module/dice.mjs          checks, Strike, damage, Dying, rests, chat cards
module/scenes.mjs        Scene attempts, Setbacks, clocks
module/dialogs.mjs       the creator, binding, pickers
module/sheets.mjs        ApplicationV2 sheets; templates/ for their Handlebars
styles/ lang/ fonts/     look (OFL fonts: IM Fell English, EB Garamond), strings
build/                   build, check, package (not shipped)
tests/                   oracle, models, runtime and sheet tests in plain Node
docs/                    SPEC.md (the contract with the module), IMPLEMENTATION_NOTES.md
```
