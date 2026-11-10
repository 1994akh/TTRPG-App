/**
 * The Possibilities rules, pure: no Foundry globals. `compute()` is a line-for-line port of compute() in
 * tests/rules_reference.py (the workbook's Character Sheet), checked against its 202 cases in tests/rules.test.mjs.
 * Every function takes the rules data `c` = {engine, races, classes, professions, skills, ...} (each file's `data`).
 */
import { ABILITIES, DEFAULTS, GRADES, RANKS, UNCLASSED_HIT_DIE } from "./config.mjs";

export const UNCLASSED = "Unclassed";

/** Excel ROUND(x, 0): halves away from zero. */
export function excelRound(x) {
  const r = Math.floor(Math.abs(x) + 0.5) * (x >= 0 ? 1 : -1);
  return r === 0 ? 0 : r;
}

const k = c => c.engine.constants;
export const gradeIndex = g => Math.max(0, GRADES.indexOf(g));
export const rankIndex = r => RANKS.indexOf(r) + 1;
export const rgmOf = (c, grade) => (c.engine.grades.find(g => g.grade === grade) ?? c.engine.grades[0]).rgm;
export const profBonus = (c, rank) => c.engine.proficiency.find(p => p.rank === rank)?.bonus ?? 0;

/** EL = grade index × EL per grade + rank index (F-Novice 1 … S-Master 35). */
export function el(c, grade, rank) {
  return gradeIndex(grade) * k(c).el_per_grade.value + rankIndex(rank);
}

/** XP needed to reach the next rank: coefficient × EL². EL 0 (Unclassed) has no next rank. */
export function xpToNext(c, level) {
  return level > 0 ? k(c).xp_coefficient.value * level * level : 0;
}

/**
 * The whole Character Sheet. `hero` uses the reference's keys:
 * race, race_grade, class_node, class_rank, profession_node, profession_rank, armour, armour_rank, weapon_rank,
 * cast_ability, spell_rank, base_speed, weapon_die, gear_bonus, save_ranks, skill_ranks.
 */
export function compute(hero, c) {
  const eng = c.engine;
  const elPerGrade = k(c).el_per_grade.value;
  const prof = rank => profBonus(c, rank ?? "Untrained");
  const dieAvg = Object.fromEntries(eng.weapon_dice.map(d => [d.die, d.average]));
  const armour = eng.armour.find(a => a.type === hero.armour) ?? eng.armour[0];
  const race = c.races.find(r => r.id === hero.race);
  if ( !race ) throw new Error(`Unknown race "${hero.race}"`);
  const pro = c.professions.find(n => n.id === hero.profession_node);
  if ( !pro ) throw new Error(`Unknown profession "${hero.profession_node}"`);
  let cls;
  let combatEL;
  if ( !hero.class_node || (hero.class_node === UNCLASSED) ) {
    cls = { grade: null, hit_die: UNCLASSED_HIT_DIE, abilities: Object.fromEntries(ABILITIES.map(a => [a, 0])) };
    combatEL = 0;
  } else {
    cls = c.classes.find(n => n.id === hero.class_node);
    if ( !cls ) throw new Error(`Unknown class "${hero.class_node}"`);
    combatEL = gradeIndex(cls.grade) * elPerGrade + rankIndex(hero.class_rank);
  }
  const craftEL = gradeIndex(pro.grade) * elPerGrade + rankIndex(hero.profession_rank);
  const rgm = rgmOf(c, hero.race_grade);
  const raceGrade = race.grades[hero.race_grade] ?? race.grades.F;
  const scores = {};
  const mods = {};
  const saves = {};
  for ( const a of ABILITIES ) {
    scores[a] = raceGrade.abilities[a] + cls.abilities[a] + pro.abilities[a];
    mods[a] = Math.floor((scores[a] - 10) / 2);
  }
  for ( const a of ABILITIES ) saves[a] = mods[a] + prof(hero.save_ranks?.[a]) + combatEL;
  const ac = 10 + Math.min(mods.DEX, armour.dex_cap) + armour.base_ac + hero.gear_bonus + prof(hero.armour_rank) + combatEL;
  const dieSize = Number(cls.hit_die.slice(1));
  const maxHP = Math.max(dieSize, excelRound(((dieSize / 2) + 0.5 + mods.CON) * combatEL * rgm));
  const bestPhys = Math.max(mods.STR, mods.DEX);
  const attack = bestPhys + prof(hero.weapon_rank) + combatEL;
  const cast = hero.cast_ability;
  const spellDC = (!cast || cast === "None") ? null : 10 + mods[cast] + prof(hero.spell_rank) + combatEL;
  const spellAttack = (!cast || cast === "None") ? null : mods[cast] + prof(hero.spell_rank) + combatEL;
  const avg = dieAvg[hero.weapon_die] ?? k(c).weapon_die_average.value;
  const nCombat = 1 + Math.floor(combatEL / 4);
  const dmgBonus = excelRound(((nCombat * avg) + bestPhys) * rgm - (nCombat * avg));
  const dmgAvg = excelRound(((nCombat * avg) + bestPhys) * rgm);
  const nCraft = 1 + Math.floor(craftEL / 4);
  const bestMind = Math.max(mods.INT, mods.WIS, mods.CHA);
  const craftBonus = excelRound(((nCraft * avg) + bestMind) * rgm - (nCraft * avg));
  const skills = {};
  for ( const s of c.skills ) {
    const level = s.track === "Combat" ? combatEL : craftEL;
    skills[s.id] = mods[s.ability] + prof(hero.skill_ranks?.[s.id]) + level;
  }
  return {
    combat_el: combatEL, craft_el: craftEL, rgm, scores, mods, saves, ac,
    initiative: mods.DEX + combatEL,
    speed: excelRound(hero.base_speed * rgm / 5) * 5,
    max_hp: maxHP, hit_dice: `${combatEL}${cls.hit_die}`,
    attack, spell_dc: spellDC, spell_attack: spellAttack,
    passive_perception: 10 + skills.Perception,
    carry: excelRound(scores.STR * 15 * rgm),
    damage: `${nCombat}${hero.weapon_die} + ${dmgBonus}`, damage_avg: dmgAvg,
    craft_effort: `${nCraft}${hero.weapon_die} + ${craftBonus}`,
    divergence: Math.abs(combatEL - craftEL), skills
  };
}

/**
 * The sheet's "n<die> + bonus" text (e.g. "1d6 + -1", or "12d6 + 3" for one 2d6 die) as a Roll formula ("1d6 - 1",
 * "2d6 + 3"). `die` is the weapon die the text was built from.
 */
export function toFormula(sheetText, die) {
  const [left, right] = String(sheetText ?? "").split(" + ");
  if ( (right === undefined) || !die || !left.endsWith(die) ) return sheetText;
  const n = Number(left.slice(0, left.length - die.length)) || 1;
  const m = /^(\d*)d(\d+)$/.exec(die);
  const dice = m ? `${n * (Number(m[1]) || 1)}d${m[2]}` : left;
  const b = Number(right);
  return b === 0 ? dice : `${dice} ${b > 0 ? "+" : "-"} ${Math.abs(b)}`;
}

/* -------------------------------------------- Checks -------------------------------------------- */

/** Degree of success, 0 critical failure … 3 critical success. Natural 20 raises a step, natural 1 lowers one. */
export function degree(total, dc, natural=null, margin=DEFAULTS.critMargin) {
  let d;
  if ( total >= dc + margin ) d = 3;
  else if ( total >= dc ) d = 2;
  else if ( total <= dc - margin ) d = 0;
  else d = 1;
  if ( natural === 20 ) d = Math.min(3, d + 1);
  else if ( natural === 1 ) d = Math.max(0, d - 1);
  return d;
}

/** Multiple attack penalty for the next attack, given attacks already made this turn. */
export function multipleAttackPenalty(attacksMade, map=DEFAULTS.map) {
  return map[Math.min(Math.max(0, attacksMade), map.length - 1)];
}

/** Standard DC = base + target EL + grade compensation × grade index. */
export function standardDC(c, level, grade="F") {
  return k(c).standard_dc_base.value + level + (k(c).grade_compensation.value * gradeIndex(grade));
}

/** Critical damage: × 1.5, rounded down. */
export function critDamage(total, mult=DEFAULTS.critDamageMultiplier) {
  return Math.floor(total * mult);
}

/* -------------------------------------------- NPCs -------------------------------------------- */

/** Dice that average about `avg`: d6s plus a flat bonus. */
export function damageFormulaFor(avg) {
  if ( avg <= 2.5 ) return "1d4";
  if ( avg < 4.5 ) return "1d6";
  const n = Math.max(1, Math.floor(avg / 3.5));
  const b = Math.round(avg - (n * 3.5));
  return b === 0 ? `${n}d6` : `${n}d6 ${b > 0 ? "+" : "-"} ${Math.abs(b)}`;
}

/** The Engine sheet's benchmark foe for an EL, grade and role. */
export function npcBenchmarks(c, level, grade="F", role="standard") {
  const gi = gradeIndex(grade);
  const comp = k(c).grade_compensation.value * gi;
  const rgm = rgmOf(c, grade);
  const roleHP = DEFAULTS.roleHP[role] ?? 1;
  const damagePerRound = Math.max(1, excelRound(k(c).enemy_damage_per_el.value * level * rgm));
  return {
    ac: k(c).enemy_ac_base.value + level + comp,
    attack: k(c).enemy_attack_base.value + level + comp,
    hpMax: Math.max(1, excelRound((k(c).enemy_hp_base.value + (k(c).enemy_hp_per_el.value * level)) * rgm * roleHP)),
    damagePerRound,
    damage: damageFormulaFor(damagePerRound),
    dc: standardDC(c, level, grade),
    initiative: level + comp,
    rgm
  };
}

/* -------------------------------------------- Scenes -------------------------------------------- */

const APT_ORDER = { none: 0, half: 1, full: 2 };

/**
 * A hero's aptness for one approach: the best of the approach's lists that names the hero's class, profession or a
 * skill they are trained in; otherwise the approach's default.
 * @param {{classNode:string, professionNode:string, trainedSkills:string[]}} hero
 */
export function aptnessFor(hero, approach) {
  const ids = new Set([hero.classNode, hero.professionNode, ...(hero.trainedSkills ?? [])].filter(Boolean));
  let best = null;
  for ( const apt of ["full", "half", "none"] ) {
    if ( (approach[apt] ?? []).some(id => ids.has(id)) ) {
      if ( (best === null) || (APT_ORDER[apt] > APT_ORDER[best]) ) best = apt;
    }
  }
  return best ?? approach.default ?? "full";
}

/** Effort removed from Resistance: rolled effort × aptness, × 1.5 on a critical, rounded down. */
export function sceneEffort(effortTotal, aptness, critical=false) {
  const mult = DEFAULTS.aptness[aptness] ?? 0;
  return Math.max(0, Math.floor(effortTotal * mult * (critical ? DEFAULTS.critDamageMultiplier : 1)));
}

/** Resolve an attempt: degree (0-3) and rolled effort → {effort, setback, resistance}. */
export function resolveAttempt({ resistance, degreeOfSuccess, effortTotal, aptness, setbackOnFail }) {
  const success = degreeOfSuccess >= 2;
  const effort = success ? sceneEffort(effortTotal, aptness, degreeOfSuccess === 3) : 0;
  const setback = (degreeOfSuccess === 0) || ((degreeOfSuccess === 1) && !!setbackOnFail);
  const after = Math.max(0, resistance - effort);
  return { effort, setback, before: resistance, after, won: after === 0 };
}

/* -------------------------------------------- Dying -------------------------------------------- */

/** Dropping to 0 HP. Wounded adds failed pips when Dying starts again. */
export function startDying(state) {
  if ( state.active ) return { ...state };
  return { ...state, active: true, stable: false, value: Math.min(DEFAULTS.dyingPips, state.wounded ?? 0) };
}

/** A recovery check result (degree 0-3). Returns the new state and "stable" | "worse" | "dead". */
export function recover(state, degreeOfSuccess) {
  if ( degreeOfSuccess >= 2 ) {
    return { state: { ...state, active: false, stable: true, value: 0, wounded: (state.wounded ?? 0) + 1 }, outcome: "stable" };
  }
  const value = Math.min(DEFAULTS.dyingPips, (state.value ?? 0) + 1);
  const dead = value >= DEFAULTS.dyingPips;
  return { state: { ...state, value, dead }, outcome: dead ? "dead" : "worse" };
}

/** Stabilise (an ally's action) ends Dying, no roll. */
export function stabilise(state) {
  if ( !state.active ) return { ...state };
  return { ...state, active: false, stable: true, value: 0, wounded: (state.wounded ?? 0) + 1 };
}

/** Healed above 0 HP. */
export function healed(state) {
  return { ...state, active: false, stable: false, value: 0, dead: false,
    wounded: (state.wounded ?? 0) + (state.active ? 1 : 0) };
}

/* -------------------------------------------- Points, money -------------------------------------------- */

/** Evaluate the points formula ("3 + @combatEL") safely. */
export function pointsMax(formula, vars) {
  const expr = String(formula ?? DEFAULTS.pointsFormula).replace(/@(\w+)/g, (_, v) => String(Number(vars[v] ?? 0)));
  if ( !/^[\d\s+\-*/().]+$/.test(expr) ) return 3 + (vars.combatEL ?? 0);
  const value = Function(`"use strict"; return (${expr});`)();
  return Number.isFinite(value) ? Math.max(0, Math.floor(value)) : 0;
}

/** Price at a grade: base × multiplier ^ grade index. */
export function gradePrice(c, base, grade="F") {
  return base * (k(c).grade_price_multiplier.value ** gradeIndex(grade));
}

export function toCopper(cur) {
  return (cur.cp ?? 0) + (10 * (cur.sp ?? 0)) + (100 * (cur.gp ?? 0)) + (1000 * (cur.pp ?? 0));
}

export function fromCopper(total) {
  const t = Math.max(0, Math.floor(total));
  return { pp: Math.floor(t / 1000), gp: Math.floor((t % 1000) / 100), sp: Math.floor((t % 100) / 10), cp: t % 10 };
}

/** Race family of a race id. */
export const familyOf = (c, raceId) => c.races.find(r => r.id === raceId)?.family ?? "";
