import { test } from "node:test";
import assert from "node:assert/strict";
import { makeDoc } from "./harness.mjs";
import { readJSON } from "./util.mjs";

const { default: HeroData } = await import("../module/data/hero.mjs");
const { default: NpcData } = await import("../module/data/npc.mjs");
const { default: ObstacleData } = await import("../module/data/obstacle.mjs");
const { WeaponData, ArmourData } = await import("../module/data/items.mjs");

const cases = readJSON("tests/data/possibilities_sheet_cases.json");

/** Turn an oracle hero into hero system data plus equipped items, the way a Foundry actor holds it. */
function fromOracle(h) {
  const items = [];
  if ( h.armour !== "None" ) items.push(makeDoc(ArmourData, "armour", { armourType: h.armour, equipped: true }, { id: "arm" }));
  items.push(makeDoc(WeaponData, "weapon", { die: h.weapon_die, equipped: true }, { id: "wpn" }));
  const system = {
    race: h.race, raceGrade: h.race_grade,
    class: { node: h.class_node === "Unclassed" ? "" : h.class_node, rank: h.class_rank || "Novice" },
    profession: { node: h.profession_node, rank: h.profession_rank },
    training: { armour: h.armour_rank, weapon: h.weapon_rank, spell: h.spell_rank, saves: h.save_ranks, skills: h.skill_ranks },
    castAbility: h.cast_ability, baseSpeed: h.base_speed, gearBonus: h.gear_bonus
  };
  return makeDoc(HeroData, "hero", system, { items });
}

const MAP = {
  combat_el: "combatEL", craft_el: "craftEL", rgm: "rgm", scores: "scores", mods: "mods", saves: "saves", ac: "ac",
  initiative: "initiative", speed: "speed", max_hp: "hpMax", hit_dice: "hitDice", attack: "attack", spell_dc: "spellDC",
  spell_attack: "spellAttack", passive_perception: "passivePerception", carry: "carry", damage: "damage",
  damage_avg: "damageAvg", craft_effort: "craftEffort", divergence: "divergence"
};

for ( const [i, label] of [[0, "Vera (the workbook pregen)"], [1, "NEW_PC (a fresh Unclassed hero)"]] ) {
  test(`the hero data model derives the oracle sheet for ${label}`, () => {
    const { hero, expect } = cases[i];
    const actor = fromOracle(hero);
    const d = actor.system.derived;
    for ( const [py, js] of Object.entries(MAP) ) assert.deepStrictEqual(d[js], expect[py], `${label}: ${py}`);
    for ( const [skill, total] of Object.entries(expect.skills) ) assert.equal(d.skills[skill].total, total, `${label}: ${skill}`);
    assert.equal(actor.system.hp.max, expect.max_hp);
  });
}

test("the data model matches all 202 oracle cases", () => {
  for ( const [i, { hero, expect }] of cases.entries() ) {
    const d = fromOracle(hero).system.derived;
    for ( const [py, js] of Object.entries(MAP) ) assert.deepStrictEqual(d[js], expect[py], `case ${i}: ${py}`);
  }
});

test("Vera's sheet numbers are the workbook's", () => {
  const d = fromOracle(cases[0].hero).system.derived;
  assert.equal(d.ac, 26); assert.equal(d.hpMax, 57); assert.equal(d.damage, "3d6 + 8"); assert.equal(d.damageFormula, "3d6 + 8");
  assert.equal(d.spellDC, 21); assert.equal(d.weapons.wpn.formula, "3d6 + 8");
});

test("Raise Guard adds to AC; points follow the formula; unclassed heroes", () => {
  const a = makeDoc(HeroData, "hero", { race: "Trollblood", profession: { node: "Sailor", rank: "Novice" }, turn: { guard: true } });
  assert.equal(a.system.derived.ac, a.system.derived.acBase + 2);
  assert.equal(a.system.derived.combatEL, 0);
  assert.equal(a.system.derived.pointsMax, 3);
  assert.equal(a.system.derived.hpMax, 6, "Unclassed: the d6 floor");
  assert.equal(a.system.derived.hitDiceLeft, 1);
  const b = makeDoc(HeroData, "hero", { race: "Wendlin", class: { node: "Bloodcharged", rank: "Novice" }, profession: { node: "Tinker", rank: "Novice" } });
  assert.equal(b.system.derived.combatEL, 1);
  assert.equal(b.system.derived.pointsMax, 4);
  assert.equal(b.system.derived.family, "Fae");
});

test("NPC benchmarks with overrides", () => {
  const n = makeDoc(NpcData, "npc", { el: 1, grade: "F", role: "elite" });
  assert.equal(n.system.derived.ac, 16); assert.equal(n.system.derived.attack, 6); assert.equal(n.system.derived.hpMax, 21);
  const o = makeDoc(NpcData, "npc", { el: 1, overrides: { ac: 12, damage: "1d6 + 1" } });
  assert.equal(o.system.derived.ac, 12); assert.equal(o.system.derived.damageFormula, "1d6 + 1");
  assert.equal(o.system.hp.max, 14);
});

test("Scene (obstacle) derived DC and bars", () => {
  const s = makeDoc(ObstacleData, "obstacle", { el: 4, resistance: { value: 15, max: 30 }, clock: { value: 1, max: 4 } });
  assert.equal(s.system.derived.dc, 16); assert.equal(s.system.derived.resistancePct, 50); assert.equal(s.system.derived.hasClock, true);
  const t = makeDoc(ObstacleData, "obstacle", { dc: 14 });
  assert.equal(t.system.derived.dc, 14);
});
