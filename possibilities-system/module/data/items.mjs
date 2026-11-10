/** Item data models. */
import { ARMOUR_TYPES, CONDITIONS } from "../config.mjs";
import { RULES } from "../rules-data.mjs";
import { bool, fields, gradeField, html, intField, priceField, str } from "./common.mjs";

const WEAPON_DICE = RULES.engine.weapon_dice.map(d => d.die).filter(d => d !== "None");

/** Fields every piece of equipment has. */
function equipment() {
  return {
    grade: gradeField("F"), price: priceField(), loaned: bool(false),
    condition: str("intact", { blank: false, choices: CONDITIONS }), description: html()
  };
}

export class WeaponData extends foundry.abstract.TypeDataModel {
  static defineSchema() {
    return {
      die: str("d6", { blank: false, choices: [...new Set(["d4", ...WEAPON_DICE])] }),
      range: str("engaged", { blank: false, choices: ["engaged", "near", "far"] }),
      traits: str(""), equipped: bool(false),
      /** Improvised (a pry bar, a lamp): d4 at -2, unless the hero's profession is in `tools` (then d6, no penalty). */
      improvised: bool(false),
      /** Profession ids that use this as a tool, comma-separated ("Tinker, Miner"). */
      tools: str(""),
      /** Optional damage formula; used by NPCs (blank = the NPC's benchmark damage). Heroes use the sheet formula. */
      damage: str(""),
      ...equipment()
    };
  }
}

export class ArmourData extends foundry.abstract.TypeDataModel {
  static defineSchema() {
    return {
      armourType: str("Light", { blank: false, choices: ARMOUR_TYPES }), bonus: intField(0),
      equipped: bool(false), ...equipment()
    };
  }
}

export class GearData extends foundry.abstract.TypeDataModel {
  static defineSchema() {
    return { quantity: intField(1, { min: 0 }), keyItem: bool(false), ...equipment() };
  }
}

export class SignatureData extends foundry.abstract.TypeDataModel {
  static defineSchema() {
    return {
      line: str(""), tier: intField(1, { min: 0 }), grade: gradeField("F"), points: intField(1, { min: 0 }),
      cost: str("1 action"), effect: str("")
    };
  }

  /** Actions this costs: the first number in `cost` ("1 action", "2 actions", "Reaction" = 0). */
  get actions() {
    const m = /(\d+)/.exec(this.cost ?? "");
    return m ? Number(m[1]) : 0;
  }
}

export class SpellData extends foundry.abstract.TypeDataModel {
  static defineSchema() {
    return {
      tradition: str(""), tier: intField(1, { min: 0 }), grade: gradeField("F"), points: intField(1, { min: 0 }),
      actions: str("2"), range: str(""), save: str(""), effect: str("")
    };
  }

  get actionCost() {
    const m = /(\d+)/.exec(this.actions ?? "");
    return m ? Number(m[1]) : 0;
  }
}

export class FeatureData extends foundry.abstract.TypeDataModel {
  static defineSchema() {
    const f = fields();
    return {
      text: html(),
      uses: new f.SchemaField({
        value: intField(0, { min: 0 }), max: intField(0, { min: 0 }),
        per: str("", { choices: ["", "scene", "rest", "day"] })
      })
    };
  }
}

/** Reference items: race, class and profession entries from the rules data. */
function referenceModel(collection) {
  return class ReferenceData extends foundry.abstract.TypeDataModel {
    static defineSchema() {
      return { ruleId: str("") };
    }

    /** The rules entry this item points at. */
    get entry() {
      return RULES[collection].find(e => e.id === this.ruleId) ?? null;
    }
  };
}

export const RaceData = referenceModel("races");
export const ClassData = referenceModel("classes");
export const ProfessionData = referenceModel("professions");
