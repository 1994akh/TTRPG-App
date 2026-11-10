"""Reference copy of the workbook's Character Sheet formulas, used as the test oracle for module/rules.mjs (copied from Possibilities-Game tools/possibilities/rules_reference.py).

Usage:
    python3 -X utf8 -I tests/rules_reference.py            # check against Vera, the workbook's pregen
    python3 -X utf8 -I tests/rules_reference.py --cases    # also write tests/data/possibilities_sheet_cases.json

Every formula here mirrors one Character Sheet cell of Possibilities_TTRPG_System_v1_1.xlsx (cell named in the
comment). Vera's numbers are the workbook's own computed values, so this file is checked against the workbook, and
the GDScript is checked against this file over many random characters.
"""
from __future__ import annotations

import json
import math
import random
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
CONTENT = ROOT / "data" / "rules"
ABILITIES = ["STR", "DEX", "CON", "INT", "WIS", "CHA"]
UNCLASSED = "Unclassed"
UNCLASSED_HIT_DIE = "d6"


def excel_round(x: float) -> int:
    """Excel ROUND(x, 0): halves away from zero (GDScript round() does the same)."""
    return int(math.floor(abs(x) + 0.5)) * (1 if x >= 0 else -1)


def load() -> dict:
    return {name: json.loads((CONTENT / f"{name}.json").read_text(encoding="utf-8"))["data"]
            for name in ("engine", "races", "classes", "professions", "skills")}


def compute(hero: dict, c: dict) -> dict:
    eng = c["engine"]
    grade_index = {g["grade"]: g["index"] for g in eng["grades"]}
    rgm_of = {g["grade"]: g["rgm"] for g in eng["grades"]}
    rank_index = {r["rank"]: r["index"] for r in eng["ranks"]}
    prof = {p["rank"]: p["bonus"] for p in eng["proficiency"]}
    die_avg = {d["die"]: d["average"] for d in eng["weapon_dice"]}
    armour = {a["type"]: a for a in eng["armour"]}
    el_per_grade = eng["constants"]["el_per_grade"]["value"]
    race = next(r for r in c["races"] if r["id"] == hero["race"])
    pro = next(n for n in c["professions"] if n["id"] == hero["profession_node"])
    if hero.get("class_node", "") in ("", UNCLASSED):
        # Unclassed (canon, decided 3 Nov): the tier below F. Combat EL 0, no class abilities, the d6 hit-point floor.
        cls = {"grade": None, "hit_die": UNCLASSED_HIT_DIE, "abilities": {a: 0 for a in ABILITIES}}
        combat_el = 0
    else:
        cls = next(n for n in c["classes"] if n["id"] == hero["class_node"])
        combat_el = grade_index[cls["grade"]] * el_per_grade + rank_index[hero["class_rank"]]  # H6
    craft_el = grade_index[pro["grade"]] * el_per_grade + rank_index[hero["profession_rank"]]  # H7
    rgm = rgm_of[hero["race_grade"]]                                                         # H8
    scores = {a: race["grades"][hero["race_grade"]]["abilities"][a] + cls["abilities"][a] + pro["abilities"][a]
              for a in ABILITIES}                                                              # E16:E21
    mods = {a: math.floor((scores[a] - 10) / 2) for a in ABILITIES}                            # F16:F21 INT()
    saves = {a: mods[a] + prof[hero["save_ranks"].get(a, "Untrained")] + combat_el for a in ABILITIES}  # J16:J21
    arm = armour[hero["armour"]]
    ac = (10 + min(mods["DEX"], arm["dex_cap"]) + arm["base_ac"] + hero["gear_bonus"]
          + prof[hero["armour_rank"]] + combat_el)                                             # B25
    die_size = int(cls["hit_die"][1:])
    hp = max(die_size, excel_round((die_size / 2 + 0.5 + mods["CON"]) * combat_el * rgm))     # B28
    best_phys = max(mods["STR"], mods["DEX"])
    attack = best_phys + prof[hero["weapon_rank"]] + combat_el                                 # B32
    cast = hero["cast_ability"]
    spell_dc = None if cast == "None" else 10 + mods[cast] + prof[hero["spell_rank"]] + combat_el  # B33
    spell_attack = None if cast == "None" else mods[cast] + prof[hero["spell_rank"]] + combat_el   # B34
    avg = die_avg.get(hero["weapon_die"], eng["constants"]["weapon_die_average"]["value"])
    n_combat = 1 + combat_el // 4
    dmg_bonus = excel_round((n_combat * avg + best_phys) * rgm - n_combat * avg)               # B37
    dmg_avg = excel_round((n_combat * avg + best_phys) * rgm)                                  # B39
    n_craft = 1 + craft_el // 4
    best_mind = max(mods["INT"], mods["WIS"], mods["CHA"])
    craft_bonus = excel_round((n_craft * avg + best_mind) * rgm - n_craft * avg)               # B38
    skills = {}
    for s in c["skills"]:                                                                      # H42:H65
        el = combat_el if s["track"] == "Combat" else craft_el
        skills[s["id"]] = mods[s["ability"]] + prof[hero["skill_ranks"].get(s["id"], "Untrained")] + el
    return {
        "combat_el": combat_el, "craft_el": craft_el, "rgm": rgm, "scores": scores, "mods": mods, "saves": saves,
        "ac": ac, "initiative": mods["DEX"] + combat_el,                                       # B26
        "speed": excel_round(hero["base_speed"] * rgm / 5) * 5,                                # B27
        "max_hp": hp, "hit_dice": f"{combat_el}{cls['hit_die']}",                              # B31
        "attack": attack, "spell_dc": spell_dc, "spell_attack": spell_attack,
        "passive_perception": 10 + skills["Perception"],                                       # B35
        "carry": excel_round(scores["STR"] * 15 * rgm),                                        # B36
        "damage": f"{n_combat}{hero['weapon_die']} + {dmg_bonus}", "damage_avg": dmg_avg,
        "craft_effort": f"{n_craft}{hero['weapon_die']} + {craft_bonus}",
        "divergence": abs(combat_el - craft_el), "skills": skills,
    }


VERA = {
    "race": "Selkie", "race_grade": "E", "class_node": "Nightrunner", "class_rank": "Journeyman",
    "profession_node": "Sigil Scribe", "profession_rank": "Apprentice", "armour": "Light", "armour_rank": "Trained",
    "weapon_rank": "Expert", "cast_ability": "INT", "spell_rank": "Trained", "base_speed": 30, "weapon_die": "d6",
    "gear_bonus": 0, "save_ranks": {"STR": "Trained", "DEX": "Expert"},
    "skill_ranks": {"Athletics": "Expert", "Cartography": "Trained", "Endurance": "Trained", "Perception": "Expert",
                    "Skulduggery": "Trained", "Stealth": "Expert"},
}
# The workbook's computed values on the Character Sheet and Party Roster for Vera (18 Sep recalculation).
VERA_SHEET = {"combat_el": 8, "craft_el": 7, "rgm": 1.3, "ac": 26, "initiative": 12, "speed": 40, "max_hp": 57,
              "hit_dice": "8d8", "attack": 16, "spell_dc": 21, "spell_attack": 11, "passive_perception": 22,
              "carry": 195, "damage": "3d6 + 8", "damage_avg": 19, "craft_effort": "2d6 + 3",
              "scores": {"STR": 10, "DEX": 19, "CON": 12, "INT": 13, "WIS": 11, "CHA": 10},
              "saves": {"STR": 10, "DEX": 16, "CON": 9, "INT": 9, "WIS": 8, "CHA": 8},
              "skills": {"Acrobatics": 12, "Alchemy": 8, "Animal Handling": 7, "Appraisal": 7, "Arcana": 8, "Athletics": 12}}


# A fresh player character straight out of the creator: Unclassed, F-grade race, Novice profession.
NEW_PC = {
    "race": "Trollblood", "race_grade": "F", "class_node": UNCLASSED, "class_rank": "",
    "profession_node": "Sailor", "profession_rank": "Novice", "armour": "None", "armour_rank": "Untrained",
    "weapon_rank": "Untrained", "cast_ability": "None", "spell_rank": "Untrained", "base_speed": 30,
    "weapon_die": "d6", "gear_bonus": 0, "save_ranks": {},
    "skill_ranks": {"Athletics": "Trained", "Survival": "Trained", "Cartography": "Trained", "Endurance": "Trained"},
}


def check_vera(c: dict) -> None:
    got = compute(VERA, c)
    for key, want in VERA_SHEET.items():
        have = got[key]
        if isinstance(want, dict):
            for k, v in want.items():
                assert have[k] == v, f"Vera {key}[{k}]: workbook {v}, reference {have[k]}"
        else:
            assert have == want, f"Vera {key}: workbook {want}, reference {have}"
    print("Vera matches the workbook:", len(VERA_SHEET), "values")


def random_hero(rng: random.Random, c: dict) -> dict:
    grades = [g["grade"] for g in c["engine"]["grades"]]
    ranks = [r["rank"] for r in c["engine"]["ranks"]]
    profs = [p["rank"] for p in c["engine"]["proficiency"]]
    cls = rng.choice(c["classes"])
    pro = rng.choice(c["professions"])
    unclassed = rng.random() < 0.15
    return {
        "race": rng.choice(c["races"])["id"], "race_grade": "F" if unclassed else rng.choice(grades),
        "class_node": UNCLASSED if unclassed else cls["id"], "class_rank": "" if unclassed else rng.choice(ranks),
        "profession_node": pro["id"], "profession_rank": rng.choice(ranks),
        "armour": rng.choice([a["type"] for a in c["engine"]["armour"]]), "armour_rank": rng.choice(profs),
        "weapon_rank": rng.choice(profs), "cast_ability": rng.choice(ABILITIES + ["None"]),
        "spell_rank": rng.choice(profs), "base_speed": rng.choice([25, 30, 35, 40]),
        "weapon_die": rng.choice([d["die"] for d in c["engine"]["weapon_dice"] if d["die"] != "None"]),
        "gear_bonus": rng.randint(0, 3),
        "save_ranks": {a: rng.choice(profs) for a in rng.sample(ABILITIES, 2)},
        "skill_ranks": {s["id"]: rng.choice(profs[1:]) for s in rng.sample(c["skills"], 7)},
    }


def main() -> None:
    c = load()
    check_vera(c)
    if "--cases" in sys.argv:
        rng = random.Random(20261102)
        heroes = [VERA, NEW_PC] + [random_hero(rng, c) for _ in range(200)]
        cases = [{"hero": h, "expect": compute(h, c)} for h in heroes]
        out = ROOT / "tests" / "data" / "possibilities_sheet_cases.json"
        out.write_text(json.dumps(cases, ensure_ascii=False, indent=1) + "\n", encoding="utf-8", newline="\n")
        print(f"{len(cases)} cases -> {out.relative_to(ROOT)}")


if __name__ == "__main__":
    main()
