/** Actor type `obstacle`: a Possibilities Scene (Resistance, DC, approaches with aptness, Setbacks, a clock). */
import { APTNESS } from "../config.mjs";
import { RULES } from "../rules-data.mjs";
import * as R from "../rules.mjs";
import { bool, fields, gradeField, html, intField, str } from "./common.mjs";

export default class ObstacleData extends foundry.abstract.TypeDataModel {
  static defineSchema() {
    const f = fields();
    const ids = () => new f.ArrayField(new f.StringField({ blank: false }));
    return {
      resistance: new f.SchemaField({ value: intField(20, { min: 0 }), max: intField(20, { min: 0 }) }),
      dc: new f.NumberField({ required: true, nullable: true, integer: true, initial: null }),
      el: intField(1, { min: 0, max: 35 }),
      grade: gradeField("F"),
      status: str("active", { blank: false, choices: ["active", "won", "lost"] }),
      approaches: new f.ArrayField(new f.SchemaField({
        label: str("Approach"),
        skill: str("craft"),
        full: ids(), half: ids(), none: ids(),
        default: str("full", { blank: false, choices: APTNESS }),
        setbackOnFail: bool(true),
        note: str("")
      })),
      setbacks: new f.ArrayField(new f.SchemaField({
        label: str("Setback"), text: str(""), damage: str(""), gearDamage: bool(false)
      })),
      clock: new f.SchemaField({ value: intField(0, { min: 0 }), max: intField(0, { min: 0 }), label: str(""), onEnd: str("") }),
      description: html(),
      outcome: new f.SchemaField({ win: html(), lose: html() })
    };
  }

  prepareDerivedData() {
    this.derived = {
      dc: this.dc ?? R.standardDC(RULES, this.el, this.grade),
      resistancePct: this.resistance.max ? Math.round(100 * this.resistance.value / this.resistance.max) : 0,
      clockPct: this.clock.max ? Math.round(100 * this.clock.value / this.clock.max) : 0,
      hasClock: this.clock.max > 0
    };
  }
}
