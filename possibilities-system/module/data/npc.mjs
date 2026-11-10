/** Actor type `npc`: foes, creatures and people who might fight. Stats default to the Engine sheet's benchmarks. */
import { ROLES } from "../config.mjs";
import { RULES } from "../rules-data.mjs";
import * as R from "../rules.mjs";
import { bool, fields, gradeField, html, intField, str, turnField, zoneField } from "./common.mjs";

export default class NpcData extends foundry.abstract.TypeDataModel {
  static defineSchema() {
    const f = fields();
    const over = () => new f.NumberField({ required: true, nullable: true, integer: true, initial: null });
    return {
      el: intField(1, { min: 0, max: 35 }),
      grade: gradeField("F"),
      role: str("standard", { blank: false, choices: ROLES }),
      hp: new f.SchemaField({ value: intField(14, { min: 0 }), temp: intField(0, { min: 0 }) }),
      overrides: new f.SchemaField({
        ac: over(), attack: over(), hpMax: over(), dc: over(), initiative: over(),
        damage: new f.StringField({ required: true, nullable: true, blank: false, initial: null })
      }),
      zone: zoneField(),
      turn: turnField(),
      description: html(),
      tactics: html(),
      bestiary: new f.SchemaField({ known: bool(false), lore: html() })
    };
  }

  prepareDerivedData() {
    const b = R.npcBenchmarks(RULES, this.el, this.grade, this.role);
    const o = this.overrides;
    const pick = (key) => (o[key] ?? b[key]);
    const guard = this.turn.guard ? 2 : 0;
    this.derived = {
      benchmarks: b,
      acBase: pick("ac"), ac: pick("ac") + guard, attack: pick("attack"), hpMax: pick("hpMax"), dc: pick("dc"),
      initiative: pick("initiative"), damage: o.damage ?? b.damage, damageFormula: o.damage ?? b.damage,
      damagePerRound: b.damagePerRound,
      /** Benchmark bonus for the NPC's own checks and saves: the same as its attack. */
      check: pick("attack"),
      rgm: b.rgm
    };
    this.hp.max = this.derived.hpMax;
  }
}
