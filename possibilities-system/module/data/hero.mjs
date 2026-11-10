/** Actor type `hero`: a player character or one of the trio. Derived sheet values come from rules.compute(). */
import { ABILITIES, DEFAULTS, RANKS, UNARMED_DIE } from "../config.mjs";
import { RULES } from "../rules-data.mjs";
import * as R from "../rules.mjs";
import { bool, fields, gradeField, html, intField, rankField, setting, str, turnField, zoneField } from "./common.mjs";

/** The fields `rules.compute()` needs, read from a hero's system data and items. */
export function computeInput(system, items=[], { weaponDie }={}) {
  const armour = items.find(i => (i.type === "armour") && i.system.equipped);
  const weapon = items.find(i => (i.type === "weapon") && i.system.equipped);
  const profile = weapon ? R.weaponProfile(weapon.system, system.profession.node) : null;
  return {
    race: system.race, race_grade: system.raceGrade,
    class_node: system.class.node || R.UNCLASSED, class_rank: system.class.rank,
    profession_node: system.profession.node, profession_rank: system.profession.rank,
    armour: armour?.system.armourType ?? "None", armour_rank: system.training.armour,
    weapon_rank: system.training.weapon, cast_ability: system.castAbility, spell_rank: system.training.spell,
    base_speed: system.baseSpeed, weapon_die: weaponDie ?? profile?.die ?? UNARMED_DIE,
    gear_bonus: system.gearBonus + (armour?.system.bonus ?? 0),
    save_ranks: { ...system.training.saves }, skill_ranks: { ...system.training.skills }
  };
}

export default class HeroData extends foundry.abstract.TypeDataModel {
  static defineSchema() {
    const f = fields();
    const ranks = initial => new f.StringField({ required: true, initial, choices: RANKS });
    return {
      race: str("Human"),
      raceGrade: gradeField("F"),
      class: new f.SchemaField({ node: str(""), rank: ranks("Novice") }),
      profession: new f.SchemaField({ node: str("Sailor"), rank: ranks("Novice") }),
      xp: new f.SchemaField({ class: intField(0, { min: 0 }), profession: intField(0, { min: 0 }) }),
      hp: new f.SchemaField({ value: intField(6, { min: 0 }), temp: intField(0, { min: 0 }) }),
      points: new f.SchemaField({ value: intField(3, { min: 0 }) }),
      hitDiceUsed: intField(0, { min: 0 }),
      dying: new f.SchemaField({
        value: intField(0, { min: 0, max: DEFAULTS.dyingPips }), active: bool(), stable: bool(),
        wounded: intField(0, { min: 0 }), dead: bool()
      }),
      turn: turnField(),
      zone: zoneField(),
      training: new f.SchemaField({
        armour: rankField(), weapon: rankField(), spell: rankField(),
        saves: new f.SchemaField(Object.fromEntries(ABILITIES.map(a => [a, rankField()]))),
        skills: new f.SchemaField(Object.fromEntries(RULES.skills.map(s => [s.id, rankField()])))
      }),
      castAbility: str("None", { blank: false, choices: [...ABILITIES, "None"] }),
      baseSpeed: intField(30, { min: 0 }),
      gearBonus: intField(0),
      currency: new f.SchemaField({ cp: intField(0, { min: 0 }), sp: intField(0, { min: 0 }), gp: intField(0, { min: 0 }), pp: intField(0, { min: 0 }) }),
      details: new f.SchemaField({
        pronouns: str(""), age: str(""), drive: str(""),
        height: str(""), weight: str(""), eyes: str(""), skin: str(""), hair: str(""),
        languages: str(""), otherProficiencies: str(""),
        appearance: html(), biography: html(), notes: html(),
        traits: html(), ideals: html(), bonds: html(), flaws: html(), backstory: html(), allies: html()
      }),
      story: new f.SchemaField({
        role: str("pc", { blank: false, choices: ["pc", "trio", "guest"] }),
        path: new f.SchemaField({
          class: new f.ArrayField(new f.StringField({ blank: false })),
          profession: new f.ArrayField(new f.StringField({ blank: false }))
        })
      })
    };
  }

  /** Is the race and profession set to something the rules know? */
  get complete() {
    return RULES.races.some(r => r.id === this.race) && RULES.professions.some(p => p.id === this.profession.node);
  }

  get unclassed() {
    return !this.class.node || (this.class.node === R.UNCLASSED);
  }

  prepareDerivedData() {
    const items = [...(this.parent?.items ?? [])];
    const complete = this.complete;
    const input = computeInput(this, items);
    if ( !complete ) Object.assign(input, { race: "Human", profession_node: "Sailor" });
    if ( !this.unclassed && !RULES.classes.some(cl => cl.id === this.class.node) ) input.class_node = R.UNCLASSED;
    const s = R.compute(input, RULES);
    const castMod = (this.castAbility in s.mods) ? s.mods[this.castAbility] : 0;
    const skills = {};
    for ( const sk of RULES.skills ) {
      skills[sk.id] = { id: sk.id, total: s.skills[sk.id], ability: sk.ability, track: sk.track, rank: this.training.skills[sk.id] };
    }
    const weapons = {};
    for ( const w of items.filter(i => i.type === "weapon") ) {
      const p = R.weaponProfile(w.system, this.profession.node);
      const ws = R.compute(computeInput(this, items, { weaponDie: p.die }), RULES);
      weapons[w.id] = { text: ws.damage, formula: R.toFormula(ws.damage, p.die), avg: ws.damage_avg, die: p.die,
        attackMod: p.attackMod, attack: ws.attack + p.attackMod, tool: p.tool };
    }
    const die = input.weapon_die;
    const unarmed = R.compute(computeInput(this, items, { weaponDie: UNARMED_DIE }), RULES);
    const guard = this.turn.guard ? setting("guardBonus", DEFAULTS.guardBonus) : 0;
    const cls = RULES.classes.find(cl => cl.id === this.class.node);
    this.derived = {
      complete,
      combatEL: s.combat_el, craftEL: s.craft_el, rgm: s.rgm, scores: s.scores, mods: s.mods, saves: s.saves,
      acBase: s.ac, ac: s.ac + guard, initiative: s.initiative, speed: s.speed, hpMax: s.max_hp, hitDice: s.hit_dice,
      hitDie: cls?.hit_die ?? "d6",
      hitDiceLeft: Math.max(DEFAULTS.minShortRestDice, s.combat_el) - this.hitDiceUsed,
      attack: s.attack, spellDC: s.spell_dc, spellAttack: s.spell_attack, passivePerception: s.passive_perception,
      carry: s.carry, damage: s.damage, damageFormula: R.toFormula(s.damage, die), damageAvg: s.damage_avg,
      unarmedFormula: R.toFormula(unarmed.damage, UNARMED_DIE),
      craftEffort: s.craft_effort, craftEffortFormula: R.toFormula(s.craft_effort, die),
      divergence: s.divergence,
      divergenceCap: RULES.engine.constants.max_track_divergence_el.value,
      skills, weapons, castMod,
      pointsMax: R.pointsMax(setting("pointsFormula", DEFAULTS.pointsFormula), { combatEL: s.combat_el, craftEL: s.craft_el, castMod }),
      xpNext: { class: R.xpToNext(RULES, s.combat_el), profession: R.xpToNext(RULES, s.craft_el) },
      family: R.familyOf(RULES, this.race),
      dc: R.standardDC(RULES, s.combat_el, this.raceGrade)
    };
    this.hp.max = s.max_hp;
    this.points.max = this.derived.pointsMax;
  }
}
