/**
 * Balance, with the system's own rules (possibilities-system/module/rules.mjs) and Act 1's real actors:
 * Old Gnaw is fair but tense for four Unclassed heroes, and Into the light can be won (but not always easily).
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { ADVENTURE, rng, rollFormula, setup } from "./harness.mjs";

await setup();
const R = await import("../../possibilities-system/module/rules.mjs");
const { RULES } = await import("../../possibilities-system/module/rules-data.mjs");
const { computeInput } = await import("../../possibilities-system/module/data/hero.mjs");
const CONFIG = (await import("../scripts/lib/generated.mjs")).CONTENT.config;

const byKey = key => ADVENTURE.actors.find(a => a.flags["possibilities-act1"].key === key);
const blade = { type: "weapon", system: { die: "d6", equipped: true } };

/** Four Unclassed heroes with loaned blades: the trio and a sample player character. */
function party() {
  const pcSystem = structuredClone(byKey("protag3").system);
  Object.assign(pcSystem, { race: "Human", profession: { node: "Merchant", rank: "Novice" } });
  pcSystem.training.skills = { Persuasion: "Trained", Society: "Trained", Appraisal: "Trained", Deception: "Trained" };
  return [...["enkrid", "protag2", "protag3"].map(k => byKey(k).system), pcSystem].map(system => {
    const s = R.compute(computeInput(system, [blade]), RULES);
    return { system, s, hp: s.max_hp, ac: s.ac, attack: s.attack, damage: R.toFormula(s.damage, "d6"),
      craft: R.toFormula(s.craft_effort, "d6"), skills: s.skills };
  });
}

function foe(key) {
  const a = byKey(key);
  const b = R.npcBenchmarks(RULES, a.system.el, a.system.grade, a.system.role);
  const o = a.system.overrides;
  return { key, hp: o.hpMax ?? b.hpMax, ac: o.ac ?? b.ac, attack: o.attack ?? b.attack, damage: o.damage ?? b.damage };
}

function strike(attacker, target, map, rand) {
  const d20 = 1 + Math.floor(rand() * 20);
  const deg = R.degree(d20 + attacker.attack + map, target.ac, d20);
  if ( deg < 2 ) return 0;
  const dmg = Math.max(1, rollFormula(attacker.damage, rand));
  return deg === 3 ? R.critDamage(dmg) : dmg;
}

function gnawFight(seed) {
  const rand = rng(seed);
  const heroes = party();
  const foes = [foe("old_gnaw"), foe("rat"), foe("rat"), foe("rat")];
  let downs = 0;
  for ( let round = 1; round <= 20; round++ ) {
    for ( const h of heroes.filter(x => x.hp > 0) ) {
      for ( const map of [0, -4] ) {
        const t = foes.filter(f => f.hp > 0).sort((a, b) => a.hp - b.hp)[0];
        if ( t ) t.hp -= strike(h, t, map, rand);
      }
    }
    if ( foes.every(f => f.hp <= 0) ) return { won: true, downs };
    for ( const f of foes.filter(x => x.hp > 0) ) {
      const bites = f.key === "old_gnaw" ? [0, -4] : [0];
      for ( const map of bites ) {
        const up = heroes.filter(x => x.hp > 0);
        if ( !up.length ) return { won: false, downs };
        const t = up[Math.floor(rand() * up.length)];
        const before = t.hp;
        t.hp -= strike(f, t, map, rand);
        if ( (before > 0) && (t.hp <= 0) ) downs++;
      }
    }
    if ( heroes.every(x => x.hp <= 0) ) return { won: false, downs };
  }
  return { won: false, downs };
}

test("Old Gnaw: fair but tense for four Unclassed heroes", () => {
  const N = 2000;
  const runs = Array.from({ length: N }, (_, i) => gnawFight(i + 1));
  const win = runs.filter(r => r.won).length / N;
  const someoneDown = runs.filter(r => r.downs > 0).length / N;
  const avgDowns = runs.reduce((t, r) => t + r.downs, 0) / N;
  console.log(`Old Gnaw: win ${(win * 100).toFixed(1)}%, a hero drops in ${(someoneDown * 100).toFixed(1)}%, ${avgDowns.toFixed(2)} drops per fight (no Stabilise or tactics simulated)`);
  assert.ok(win >= 0.9, "the party nearly always wins");
  assert.ok(someoneDown >= 0.2 && someoneDown <= 0.9, "a careless party can lose a hero for a while");
  assert.ok(avgDowns < 1.6);
});

function lightScene(seed) {
  const rand = rng(seed);
  const heroes = party();
  const scene = byKey("into_the_light").system;
  const dc = CONFIG.light.dc;
  let resistance = CONFIG.light.resistance;
  const trackOf = sk => RULES.skills.find(s => s.id === sk)?.track;
  const options = h => scene.approaches.map(ap => {
    const apt = R.aptnessFor({ classNode: "", professionNode: h.system.profession.node,
      trainedSkills: Object.keys(h.system.training.skills) }, ap);
    let bonus;
    let effort;
    if ( ap.skill === "combat" ) [bonus, effort] = [h.attack, h.damage];
    else if ( ap.skill === "craft" ) [bonus, effort] = [Math.max(...RULES.skills.filter(s => s.track === "Craft").map(s => h.skills[s.id])), h.craft];
    else [bonus, effort] = [h.skills[ap.skill], trackOf(ap.skill) === "Combat" ? h.damage : h.craft];
    const p = Math.min(0.95, Math.max(0.05, (21 - (dc - bonus)) / 20));
    return { ap, apt, bonus, effort, value: p * (R.DEFAULTS?.aptness?.[apt] ?? { full: 1, half: 0.5, none: 0 }[apt]) * 4.5 - (ap.setbackOnFail ? (1 - p) * 1.5 : 0) };
  }).sort((a, b) => b.value - a.value)[0];
  for ( let round = 1; round <= CONFIG.light.clockRounds; round++ ) {
    for ( const h of heroes.filter(x => x.hp > 0) ) {
      const o = options(h);
      for ( let a = 0; a < 2; a++ ) {
        const d20 = 1 + Math.floor(rand() * 20);
        const deg = R.degree(d20 + o.bonus, dc, d20);
        const res = R.resolveAttempt({ resistance, degreeOfSuccess: deg, effortTotal: Math.max(1, rollFormula(o.effort, rand)),
          aptness: o.apt, setbackOnFail: o.ap.setbackOnFail });
        resistance = res.after;
        if ( res.setback ) h.hp -= rollFormula("1d2", rand);
        if ( res.won ) return { won: true, round };
      }
    }
    // The round's Setback as the sun crawls: the Gloam lashes out at someone.
    const up = heroes.filter(x => x.hp > 0);
    if ( up.length ) up[Math.floor(rand() * up.length)].hp -= rollFormula("1d2", rand);
  }
  return { won: false, round: CONFIG.light.clockRounds };
}

test("Into the light: winnable before the sun moves off, but tense", () => {
  const N = 2000;
  const runs = Array.from({ length: N }, (_, i) => lightScene(i + 1));
  const win = runs.filter(r => r.won).length / N;
  const rounds = runs.filter(r => r.won).reduce((t, r) => t + r.round, 0) / Math.max(1, runs.filter(r => r.won).length);
  console.log(`Into the light: win ${(win * 100).toFixed(1)}%, won in ${rounds.toFixed(1)} rounds on average of ${CONFIG.light.clockRounds} (Resistance ${CONFIG.light.resistance}, DC ${CONFIG.light.dc})`);
  assert.ok(win >= 0.7, "usually won");
  assert.ok(rounds >= 3, "not over in a round or two");
});
