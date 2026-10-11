/**
 * Helpers that emit dnd5e 6.x Activity source data. Field layout follows module/data/activity/*.mjs in
 * dnd5e release-6.0.6.
 */
import { id } from "./ids.mjs";

/**
 * Parse "1d4 + 3" into a dnd5e DamageField source. Anything that is not NdM[+/-K] becomes a custom formula.
 * @param {string} formula
 * @param {string} type
 * @returns {object}
 */
export function damagePart(formula, type) {
  const m = String(formula).replace(/\s+/g, "").match(/^(\d+)d(\d+)(?:([+-])(\d+))?$/);
  const types = type ? [type] : [];
  if ( m ) return {
    number: Number(m[1]),
    denomination: Number(m[2]),
    bonus: m[3] ? `${m[3] === "-" ? "-" : ""}${m[4]}` : "",
    types,
    custom: { enabled: false, formula: "" },
    scaling: { number: 1 }
  };
  return {
    number: null,
    denomination: null,
    bonus: "",
    types,
    custom: { enabled: true, formula: String(formula) },
    scaling: { number: 1 }
  };
}

/**
 * Common activity fields.
 * @param {string} key          Stable key for the activity id.
 * @param {string} type         Activity type.
 * @param {object} [options]
 * @returns {object}
 */
function base(key, type, {
  name="", activation="action", condition="", range={}, target={}, consumption=[], effects=[], flags={}, sort=0
}={}) {
  const _id = id(`activity:${key}`);
  return {
    _id,
    type,
    name,
    img: null,
    sort,
    activation: { type: activation, value: null, condition, override: false },
    consumption: { targets: consumption, scaling: { allowed: false, max: "" }, spellSlot: true },
    description: { chatFlavor: "" },
    duration: { units: "inst", value: "", special: "", concentration: false, override: false },
    effects,
    range: { value: "", units: "", special: "", override: false, ...range },
    target: {
      template: { count: "", contiguous: false, type: "", size: "", width: "", height: "", units: "ft",
        ...(target.template ?? {}) },
      affects: { count: "", type: "", choice: false, special: "", ...(target.affects ?? {}) },
      prompt: true,
      override: false
    },
    uses: { spent: 0, max: "", recovery: [] },
    flags,
    visibility: { level: {}, requireAttunement: false, requireIdentification: false, requireMagic: false }
  };
}

/** Consume one use of the parent item. */
export const ITEM_USE = [{ type: "itemUses", value: "1", target: "", scaling: {} }];

/**
 * Attack activity with a flat to-hit bonus and explicit damage parts.
 * @param {string} key
 * @param {object} attack   { kind, bonus, reach, range }
 * @param {object[]} damage [{ formula, type }]
 * @param {object} [options]
 * @returns {object}
 */
export function attackActivity(key, attack, damage, options={}) {
  const ranged = /ranged/i.test(attack.kind);
  const spell = /spell/i.test(attack.kind);
  const range = ranged ? { value: String(attack.range?.[0] ?? ""), units: "ft" } : { value: String(attack.reach ?? 5), units: "ft" };
  const a = base(key, "attack", {
    ...options, range, target: { affects: { count: "1", type: "creature" } }
  });
  a.attack = {
    ability: "",
    bonus: String(attack.bonus),
    critical: { threshold: null },
    flat: true,
    type: { value: ranged ? "ranged" : "melee", classification: spell ? "spell" : "weapon" }
  };
  a.damage = {
    critical: { bonus: "" },
    includeBase: false,
    parts: (damage ?? []).map(d => damagePart(d.formula, d.type))
  };
  return a;
}

/**
 * Save activity with a flat DC.
 * @param {string} key
 * @param {object} save     { ability, dc, area, range, targets, onSuccess }
 * @param {object[]} damage [{ formula, type }]
 * @param {object} [options]
 * @returns {object}
 */
export function saveActivity(key, save, damage, options={}) {
  const areaTypes = { cone: "cone", emanation: "radius", sphere: "sphere", cube: "cube", line: "line" };
  const target = save.area
    ? { template: { type: areaTypes[save.area.shape] ?? "radius", size: String(save.area.size) },
      affects: { type: "creature" } }
    : { affects: { count: String(save.targets ?? 1), type: "creature" } };
  const range = save.area ? { units: "self" } : { value: String(save.range ?? ""), units: save.range ? "ft" : "" };
  const a = base(key, "save", { ...options, range, target });
  a.damage = {
    onSave: save.onSuccess === "half" ? "half" : "none",
    parts: (damage ?? []).map(d => damagePart(d.formula, d.type))
  };
  a.save = {
    ability: [save.ability],
    dc: { calculation: "", formula: String(save.dc) },
    visible: true
  };
  return a;
}

/**
 * Utility activity (no attack or save), optionally with a roll.
 * @param {string} key
 * @param {object} [options]
 * @param {string} [options.roll]      Roll formula.
 * @param {string} [options.rollName]  Roll label.
 * @returns {object}
 */
export function utilityActivity(key, { roll="", rollName="", ...options }={}) {
  const a = base(key, "utility", options);
  a.roll = { formula: roll, name: rollName, prompt: false, visible: !!roll };
  return a;
}

/**
 * Turn a list of activities into the keyed object dnd5e stores.
 * @param {object[]} list
 * @returns {object}
 */
export function keyed(list) {
  return Object.fromEntries(list.map((a, i) => {
    a.sort = (i + 1) * 100000;
    return [a._id, a];
  }));
}
