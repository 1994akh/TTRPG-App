# Possibilities for Foundry VTT: the shared spec

Two packages in this repo, built together:

| Folder | Package | Id | What it is |
|---|---|---|---|
| `possibilities-system/` | Game system | `possibilities` | The Possibilities TTRPG rules (the v1_1 workbook) for Foundry VTT v14: data models, sheets, rolls, the 3-action turn, Scenes (Resistance), the Dying track, rules compendia. |
| `possibilities-act1/` | Adventure module | `possibilities-act1` | **Ashford Roads: Act 1**, the Wayfinder story's Act 1 (Enkrid's trio + the player character, from arriving in Ashford to the Gilded Tern leaving without them), playable, with a story journal the player writes in as they go. |

Foundry **v14** (`compatibility.minimum "14"`, `verified "14.370"`), as `ravenmoor-manor/` does. APIs are checked against
`fvtt-types@14.370.0-beta.20261107215328` (download with `npm pack` into the scratchpad; never into the repo). Record any
difference between this spec and the real API in each package's `docs/IMPLEMENTATION_NOTES.md`. Use ApplicationV2 /
`HandlebarsApplicationMixin`, `foundry.abstract.TypeDataModel`, `foundry.applications.api.DialogV2`; no AppV1 sheets.

Personal use: the user plays it themselves (solo, as GM and player), usually on a laptop; must also work on a tablet
(no hover-only UI). Style words the user gave for the world: **Dungeonpunk** and **Gaslit fantasy**: soot, brass,
charge-lamps, refinery glow, wet stone, ledgers and licences, a sea of brume.

## Source data (do not edit by hand)

- `possibilities-system/data/rules/*.json`: copied from Possibilities-Game `content/possibilities/` (imported there from
  `Possibilities_TTRPG_System_v1_1.xlsx`). Each file is `{source, data}`. engine (grades, ranks, proficiency,
  weapon_dice, armour, constants), races (41), classes (92), professions (69), signatures (84), spells (70), skills (24).
- `possibilities-system/tests/rules_reference.py` + `tests/data/possibilities_sheet_cases.json`: the oracle (202 heroes
  with expected sheet values). The JS rules must reproduce every case exactly.
- `possibilities-act1/data/lore/*.json`: copied from Possibilities-Game `content/lore/` (characters, places, scenes,
  terms). Text tokens like `{ashford}`, `{enkrid}`, `{pc}` refer to lore ids; `{pc}` is the player character's name.
  Entries have `status` "Written" (the user's canon) or "Draft by Claude" (may be replaced by the user). Names, plot
  and characters are the user's; Claude may only add minor text (shop signs, item blurbs, GM procedure), and every
  Claude addition in the module is visibly marked "Draft".

## The rules the system implements

All from the workbook oracle and the Possibilities-Game decisions (docs/DESIGN.md there). Where the tabletop text is
missing, the default below is used and the question is on the decisions page (`possibilities-act1/docs/decisions.json`);
every such default must be a **world setting** or a constant in one place (`module/config.mjs`), so an answer is a
one-line change.

- **EL** = grade index × 5 + rank index (F-Novice 1 … S-Master 35). Unclassed = Combat EL 0, hit die d6, no class
  abilities. Combat EL from class, Craft EL from profession. RGM from race grade. XP to next rank = 50 × EL².
- **Sheet values**: exactly `compute()` in `rules_reference.py` (scores, mods with floor, saves, AC, initiative, speed,
  max HP, hit dice, attack, spell DC/attack, passive Perception, carry, damage, craft effort, divergence, skills).
  `excel_round` is half away from zero.
- **Checks**: d20 + modifier ≥ DC. Degrees: ≥ DC+10 critical success, ≥ DC success, ≤ DC−10 critical failure, else
  failure; natural 20 raises one step, natural 1 lowers one step. Standard DC = 12 + target EL + grade compensation
  (2 × grade index). Chat cards show the roll readout "14 + 7 = 21 vs DC 19 · Success".
- **Strike** (1 action): attack vs target AC. Multiple attack penalty −4 on the 2nd attack in a turn, −8 on the 3rd+.
  Damage = the sheet's damage (`n dice + bonus`, n = 1 + Combat EL // 4, die from the equipped weapon, d4 unarmed).
  Critical: damage × 1.5 (round down).
- **Turn**: 3 actions. Costs: Strike 1, Stride 1 (move one zone), Raise Guard 1 (+2 AC until your next turn),
  Aid 1 (+2 to one ally's next check), Stabilise 1 (an Engaged ally at 0 HP stops Dying, no roll), Recall Knowledge 1,
  Interact 1, signatures/spells per their `cost`/`actions` field, Withdraw 3. A tracker on the actor
  (`system.turn.actions`, `system.turn.attacks`) resets at the start of the actor's combat turn; the sheet shows 3 pips.
  Spending is a soft check (warn, don't block) so the user can bend rules mid-play.
- **Zones**: Engaged, Near, Far, Distant (`system.zone`), shown on the sheet and token HUD-free (no hover).
- **Dying**: at 0 HP a hero gains Dying. At the start of each of their turns, a recovery check: d20 + CON save vs
  DC 12 (`CONFIG.POSSIBILITIES.recoveryDC`); success = stable at 0 HP; a failure marks a pip; 3 failed pips in one
  fight = dead (or, with the "Undertaking" world setting off — the default — Defeated: down until healed or rested).
  Stabilise ends Dying. Healing above 0 ends Dying. Wounded is tracked (`system.dying.wounded`) and adds 1 failed pip
  when Dying starts again in the same day.
- **Points**: one pool for signatures and spells (tier = point cost). Max = 3 + Combat EL (world setting
  `pointsFormula`). Refilled by a long rest.
- **Scenes** (the tabletop's non-combat challenge engine; called **Scenes** in the UI as in the books, actor type
  `obstacle` internally to avoid Foundry's own Scene): Resistance (like HP), a DC, approaches each with aptness
  **Full / Half / None** per profession, class or skill, Setbacks, and an optional **clock** (e.g. the sun crossing the
  floor). An attempt = the hero's skill check vs the Scene DC; success removes the hero's effort from Resistance
  (Craft effort for Craft-track skills, Combat effort = Strike damage for Combat-track), × 1 Full, × ½ Half, × 0 None,
  × 1.5 on a critical. A failure triggers a Setback if the approach says so; a critical failure always does. At 0
  Resistance the Scene is won. The clock advances once per round; when it runs out the Scene is lost (or its
  `onClockEnd` text applies).
- **Rest**: short rest (spend hit dice: roll `hit_die + CON mod` each, up to Combat EL dice — default) and long rest
  (full HP, full points, Dying/Wounded cleared).
- **Money**: cp/sp/gp/pp (10 cp = 1 sp, 10 sp = 1 gp, 10 gp = 1 pp). Prices × 3 per grade index
  (`grade_price_multiplier`).
- **Loaned gear**: items have `system.loaned` (bool) and `system.condition` ("intact" | "damaged" | "broken").

## Document types (system.json `documentTypes`)

Field names are the contract between the two packages. Derived values (in `prepareDerivedData`) are not stored.

### Actor `hero`
```
system.race            string  race id ("Wendlin")         system.raceGrade  "F".."S" (default "F")
system.class.node      string  class id, "" = Unclassed   system.class.rank "Novice".."Master"
system.profession.node string  profession id               system.profession.rank
system.xp.class, system.xp.profession   number
system.hp.value, system.hp.temp          number   (max derived)
system.points.value                      number   (max derived)
system.dying.value (0-3 failed pips), system.dying.active (bool), system.dying.stable (bool), system.dying.wounded (number)
system.turn.actions (0-3, default 3), system.turn.attacks (number), system.turn.guard (bool)
system.zone            "engaged"|"near"|"far"|"distant"
system.training.armour  rank   system.training.weapon rank   system.training.spell rank
system.castAbility      "STR".."CHA"|"None"
system.training.saves   {STR..CHA: rank}   system.training.skills {skillId: rank}   (ranks: Untrained..Legendary)
system.baseSpeed (30)  system.gearBonus (0)
system.currency {cp, sp, gp, pp}
system.details {pronouns, age, drive, height, weight, eyes, skin, hair, languages, otherProficiencies (strings),
                appearance, biography, notes, traits, ideals, bonds, flaws, backstory, allies (html)}   (shown on the Details tab)
system.story {role: "pc"|"trio"|"guest", path: {class: [ids], profession: [ids]}}   (the trio's set evolution)
derived: system.derived {combatEL, craftEL, rgm, scores{}, mods{}, saves{}, ac, initiative, speed, hpMax, hitDice,
         attack, spellDC, spellAttack, passivePerception, carry, damage, damageAvg, craftEffort, divergence,
         skills{id:{total, ability, track}}, pointsMax, xpNext:{class, profession}, family}
```
Armour type comes from the equipped `armour` item (`None` if none); the weapon die from the equipped `weapon` (d4
unarmed); `gear_bonus` = `system.gearBonus` + the equipped armour's `bonus`.

### Actor `npc` (foes, creatures, people who might fight)
```
system.el (number), system.grade ("F".."S"), system.role "minion"|"standard"|"elite"|"boss"
system.hp.value; system.overrides {ac, attack, hpMax, damage (formula string), dc, initiative} (null = benchmark)
system.zone; system.turn {...as hero}; system.description (html); system.tactics (html); system.bestiary {known (bool), lore (html)}
derived: ac = 15 + EL + 2·gi; attack = 5 + EL + 2·gi; hpMax = round((10 + 4·EL) × RGM × roleHP); damage per
round = 3 × EL × RGM (min 1) shown as a formula; dc = 12 + EL + 2·gi. roleHP: minion 0.5, standard 1, elite 1.5, boss 2.5.
```
Attacks and abilities are embedded `weapon` / `feature` items.

### Actor `obstacle` (a Possibilities Scene)
```
system.resistance.value, system.resistance.max, system.dc, system.el, system.grade
system.approaches [{label, skill (skill id or "combat"/"craft"), full: [ids], half: [ids], none: [ids],
                    default: "full"|"half"|"none", setbackOnFail (bool), note}]
   — ids in full/half/none may be class ids, profession ids or skill ids; the best match for a hero wins.
system.setbacks [{label, text, damage (formula, may be ""), gearDamage (bool)}]
system.clock {value, max, label, onEnd (text)}
system.description (html), system.outcome {win (html), lose (html)}
```

### Items
```
weapon  : die, range ("engaged"|"near"|"far"), traits (string), grade, price {value, denom}, equipped, loaned, condition, description
armour  : armourType ("Light"|"Medium"|"Heavy"), bonus, grade, price, equipped, loaned, condition, description
gear    : quantity, grade, price, loaned, condition, keyItem (bool), description
signature: line, tier, grade, points, cost, effect          (mirrors signatures.json)
spell   : tradition, tier, grade, points, actions, range, save, effect   (mirrors spells.json)
feature : text, uses {value, max, per ("scene"|"rest"|"day"|"")}
race | class | profession : ruleId (id into the rules data) — reference items; dropping one on a hero sets
          system.race / system.class.node / system.profession.node. Their sheet shows the rules entry read-only.
```

## Runtime API

`game.possibilities` (system) exposes: `rules` (loaded rules data), `compute(input)` (the oracle port, pure),
`rollCheck(actor, {label, mod, dc, track})`, `strike(actor, weapon, {target})`, `attemptScene(hero, obstacle,
approachIndex)`, `advanceClock(obstacle)`, `spendActions(actor, n, label)`, `rest(actor, "short"|"long")`,
`createHero()` (the creator dialog: name, race, profession, skills, pronouns, look; no class), `bind(actor)` (the
class-pick dialog from the 12 F-grade class nodes; for trio heroes it applies `story.path.class[0]` instead).
Everything posts readable chat cards. Hooks: `possibilities.sceneResolved(obstacle, won)`, `possibilities.bound(actor)`.

The module (`possibilities-act1`) builds on that API and never re-implements the math.

## Build, test, ship (both packages, same pattern as `ravenmoor-manor/`)

- Node 20+. `npm install && npm run build` (JSON sources in `src/packs/**` compiled to LevelDB with
  `@foundryvtt/foundryvtt-cli`), `npm run check` (eslint + static checks + `node --test`), `npm run package`
  (`dist/<id>.zip` + `dist/<system|module>.json`, version from `--release vX.Y.Z`).
- Deterministic document ids from stable keys (copy `ravenmoor-manor/build/ids.mjs`).
- Tests run in plain Node against a small fake of the Foundry globals (see `ravenmoor-manor/tests/harness.mjs`); the
  rules port must pass all 202 oracle cases.
- `.github/workflows/release.yml` builds and attaches every package; manifest URLs
  `https://github.com/1994akh/TTRPG-App/releases/latest/download/system.json` and `.../possibilities-act1.json`
  (module manifest renamed so it doesn't clash with Ravenmoor's `module.json`).

## Additions made while building the system (10 Nov 2026, additive only)

Nothing above was renamed or removed. These fields and calls were added:

- `hero`: `system.hitDiceUsed` (short rests), `system.dying.dead` (3 failed pips), `system.turn.aid` (a pending Aid
  bonus, used up by the next check). Derived extras: `derived.acBase`, `derived.weapons[itemId] = {formula, text, avg,
  die, attackMod, attack, tool}`, `derived.unarmedFormula`, `derived.damageFormula`/`craftEffortFormula` (Roll-ready),
  `derived.hitDie`, `derived.hitDiceLeft`, `derived.castMod`, `derived.dc`, `derived.complete`. `system.hp.max` and
  `system.points.max` are set at derive time so token bars work.
- `npc`: `system.hp.temp`; `derived.{acBase, ac, attack, hpMax, dc, initiative, damage, damageFormula, damagePerRound,
  check, benchmarks}`; `system.hp.max` at derive time.
- `obstacle`: `system.status` ("active" | "won" | "lost"); `system.dc` may be `null` (= standard DC from EL and grade);
  `derived.dc`.
- `weapon`: `damage` (formula; NPC attacks, blank = benchmark), `improvised` (bool) and `tools` (comma-separated
  profession ids). Improvised: d4 at −2, unless the hero's profession is in `tools` (then d6, no penalty).
- Settings (world): `pointsFormula`, `recoveryDC`, `undertaking`, `guardBonus`, `creatorExtraSkills`,
  `sceneAttemptCost`, `manualRolls` ("Enter my own rolls": every check, Strike, damage and effort roll asks for the
  player's number, with a "Roll for me" button).
- API extras on `game.possibilities`: `rollSkill`, `rollSave`, `applyDamage`, `recoveryCheck`, `stabilise`,
  `triggerSetback(obstacle, hero, index)`, `resolveScene`, `aptness(hero, approach)`, `partyHeroes()`,
  `makeHero(data)` (the creator without the dialog), `applyBinding(actor, classId)`, `postCard(actor, {title, subtitle,
  body, tone})`, `math` (rules.mjs), `defaults`. Hooks also: `possibilities.setback(obstacle, hero, setback)`,
  `possibilities.ready(api)`. Actor methods: `rollSkill`, `rollSave`, `strike`, `basicAction(kind)`, `aid(ally)`,
  `recallKnowledge(target)`, `withdraw()`, `useAbility(item)`.
- A Scene attempt costs 1 action (`sceneAttemptCost`). When a Scene's clock moves (once per round, when the Scene is
  in the combat tracker, or by the sheet's Tick button), one Setback strikes a random party hero.
- Coins show as copper bits, silver marks, gold crowns, platinum charters (keys stay cp/sp/gp/pp).
