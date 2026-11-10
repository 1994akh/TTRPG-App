import { test } from "node:test";
import assert from "node:assert/strict";
import { loadRules, readJSON } from "./util.mjs";
import * as R from "../module/rules.mjs";

const c = loadRules();
const cases = readJSON("tests/data/possibilities_sheet_cases.json");

test("all 202 oracle cases match the workbook reference exactly", () => {
  assert.equal(cases.length, 202);
  for ( const [i, { hero, expect }] of cases.entries() ) {
    const got = R.compute(hero, c);
    for ( const key of Object.keys(expect) ) {
      assert.deepStrictEqual(got[key], expect[key], `case ${i} (${hero.race}/${hero.class_node}) field ${key}`);
    }
    assert.deepStrictEqual(Object.keys(got).sort(), Object.keys(expect).sort(), `case ${i} has the same fields`);
  }
});

test("EL and XP", () => {
  assert.equal(R.el(c, "F", "Novice"), 1);
  assert.equal(R.el(c, "S", "Master"), 35);
  assert.equal(R.el(c, "E", "Journeyman"), 8);
  assert.equal(R.xpToNext(c, 8), 3200);
  assert.equal(R.xpToNext(c, 0), 0);
});

test("degrees of success with natural 20 and 1 shifts", () => {
  assert.equal(R.degree(29, 19), 3);
  assert.equal(R.degree(19, 19), 2);
  assert.equal(R.degree(18, 19), 1);
  assert.equal(R.degree(9, 19), 0);
  assert.equal(R.degree(18, 19, 20), 2, "nat 20 lifts a failure to success");
  assert.equal(R.degree(29, 19, 20), 3, "never above critical success");
  assert.equal(R.degree(19, 19, 1), 1, "nat 1 drops success to failure");
  assert.equal(R.degree(5, 19, 1), 0, "never below critical failure");
  assert.equal(R.degree(10, 19, 1), 0);
});

test("multiple attack penalty", () => {
  assert.deepEqual([0, 1, 2, 3, 7].map(n => R.multipleAttackPenalty(n)), [0, -4, -8, -8, -8]);
});

test("standard DC and NPC benchmarks", () => {
  assert.equal(R.standardDC(c, 0, "F"), 12);
  assert.equal(R.standardDC(c, 8, "E"), 22);
  const rat = R.npcBenchmarks(c, 0, "F", "minion");
  assert.equal(rat.ac, 15); assert.equal(rat.attack, 5); assert.equal(rat.hpMax, 5); assert.equal(rat.damagePerRound, 1);
  const e = R.npcBenchmarks(c, 6, "E", "standard");
  assert.equal(e.ac, 23); assert.equal(e.attack, 13); assert.equal(e.dc, 20);
  assert.equal(e.hpMax, R.excelRound((10 + 24) * 1.3)); // 44
  assert.equal(e.damagePerRound, R.excelRound(3 * 6 * 1.3)); // 23
  assert.equal(R.npcBenchmarks(c, 4, "F", "boss").hpMax, R.excelRound(26 * 2.5));
});

test("sheet damage text to Roll formulas", () => {
  assert.equal(R.toFormula("1d6 + -1", "d6"), "1d6 - 1");
  assert.equal(R.toFormula("3d6 + 8", "d6"), "3d6 + 8");
  assert.equal(R.toFormula("12d6 + 3", "2d6"), "2d6 + 3");
  assert.equal(R.toFormula("22d8 + 0", "2d8"), "4d8");
});

test("Scene aptness and effort", () => {
  const approach = { full: ["Tinker"], half: ["Athletics"], none: ["Vanguard"], default: "half" };
  assert.equal(R.aptnessFor({ classNode: "", professionNode: "Tinker", trainedSkills: [] }, approach), "full");
  assert.equal(R.aptnessFor({ classNode: "Vanguard", professionNode: "Sailor", trainedSkills: ["Athletics"] }, approach), "half");
  assert.equal(R.aptnessFor({ classNode: "Vanguard", professionNode: "Sailor", trainedSkills: [] }, approach), "none");
  assert.equal(R.aptnessFor({ classNode: "Theorist", professionNode: "Scribe", trainedSkills: [] }, approach), "half", "default");
  assert.equal(R.sceneEffort(9, "full"), 9);
  assert.equal(R.sceneEffort(9, "half"), 4);
  assert.equal(R.sceneEffort(9, "none"), 0);
  assert.equal(R.sceneEffort(9, "full", true), 13);
  assert.deepEqual(R.resolveAttempt({ resistance: 20, degreeOfSuccess: 3, effortTotal: 8, aptness: "half", setbackOnFail: false }),
    { effort: 6, setback: false, before: 20, after: 14, won: false });
  assert.equal(R.resolveAttempt({ resistance: 20, degreeOfSuccess: 1, effortTotal: 8, aptness: "full", setbackOnFail: true }).setback, true);
  assert.equal(R.resolveAttempt({ resistance: 20, degreeOfSuccess: 1, effortTotal: 8, aptness: "full", setbackOnFail: false }).setback, false);
  assert.equal(R.resolveAttempt({ resistance: 20, degreeOfSuccess: 0, effortTotal: 8, aptness: "full", setbackOnFail: false }).setback, true);
  assert.equal(R.resolveAttempt({ resistance: 5, degreeOfSuccess: 2, effortTotal: 8, aptness: "full" }).won, true);
});

test("the Dying track", () => {
  let s = { active: false, stable: false, value: 0, wounded: 0 };
  s = R.startDying(s);
  assert.equal(s.active, true); assert.equal(s.value, 0);
  let r = R.recover(s, 1); assert.equal(r.outcome, "worse"); assert.equal(r.state.value, 1);
  r = R.recover(r.state, 2); assert.equal(r.outcome, "stable"); assert.equal(r.state.active, false); assert.equal(r.state.wounded, 1);
  s = R.startDying(r.state); assert.equal(s.value, 1, "Wounded starts with a failed pip");
  r = R.recover(s, 0); r = R.recover(r.state, 1); assert.equal(r.outcome, "dead");
  const st = R.stabilise(R.startDying({ value: 0, wounded: 0 }));
  assert.equal(st.active, false); assert.equal(st.stable, true); assert.equal(st.wounded, 1);
  const h = R.healed(R.startDying({ value: 0, wounded: 1 }));
  assert.equal(h.active, false); assert.equal(h.wounded, 2);
});

test("points and money", () => {
  assert.equal(R.pointsMax("3 + @combatEL", { combatEL: 1 }), 4);
  assert.equal(R.pointsMax("2 + @combatEL + @castMod", { combatEL: 8, castMod: 1 }), 11);
  assert.equal(R.pointsMax("alert(1)", { combatEL: 2 }), 5, "unsafe formulas fall back");
  assert.equal(R.gradePrice(c, 15, "E"), 45);
  assert.equal(R.gradePrice(c, 15, "D"), 135);
  assert.equal(R.toCopper({ gp: 2, sp: 3, cp: 4 }), 234);
  assert.deepEqual(R.fromCopper(1234), { pp: 1, gp: 2, sp: 3, cp: 4 });
});
