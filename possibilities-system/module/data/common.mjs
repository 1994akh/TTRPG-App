/** Shared schema pieces and helpers for the data models. */
import { DENOMINATIONS, GRADES, TRAINING, ZONES } from "../config.mjs";

export const fields = () => foundry.data.fields;

export function rankField(initial="Untrained") {
  return new (fields().StringField)({ required: true, initial, choices: TRAINING });
}

export function gradeField(initial="F") {
  return new (fields().StringField)({ required: true, initial, choices: GRADES });
}

export function zoneField() {
  return new (fields().StringField)({ required: true, initial: "near", choices: ZONES });
}

export function intField(initial=0, opts={}) {
  return new (fields().NumberField)({ required: true, nullable: false, integer: true, initial, ...opts });
}

export function html() {
  return new (fields().HTMLField)({ required: true, blank: true, initial: "" });
}

export function str(initial="", opts={}) {
  return new (fields().StringField)({ required: true, blank: true, initial, ...opts });
}

export function bool(initial=false) {
  return new (fields().BooleanField)({ required: true, initial });
}

/** The 3-action turn tracker shared by heroes and NPCs. */
export function turnField() {
  const f = fields();
  return new f.SchemaField({
    actions: intField(3, { min: 0 }),
    attacks: intField(0, { min: 0 }),
    guard: bool(false),
    aid: intField(0, { min: 0 })
  });
}

export function priceField() {
  const f = fields();
  return new f.SchemaField({
    value: new f.NumberField({ required: true, nullable: false, initial: 0, min: 0 }),
    denom: str("gp", { blank: false, choices: DENOMINATIONS })
  });
}

/** Read a world setting, falling back to the default outside Foundry (tests) or before settings exist. */
export function setting(key, fallback) {
  try {
    const v = game?.settings?.get("possibilities", key);
    return v ?? fallback;
  } catch {
    return fallback;
  }
}
