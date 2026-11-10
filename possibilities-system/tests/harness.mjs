/**
 * A very small fake of the Foundry globals the data models touch: foundry.data.fields (initial values and choices
 * only) and foundry.abstract.TypeDataModel (source = schema initials deep-merged with the given data). It proves the
 * models' own logic and the oracle numbers, not Foundry itself.
 */
class DataField {
  constructor(options={}) { this.options = options; }
  initial() {
    const i = this.options.initial;
    return typeof i === "function" ? i() : structuredClone(i);
  }
  clean(v) {
    if ( v === undefined ) return this.initial();
    const ch = this.options.choices;
    if ( Array.isArray(ch) && (v !== null) && !ch.includes(v) ) throw new Error(`${v} is not one of ${ch.join(", ")}`);
    return v;
  }
}
class SchemaField extends DataField {
  constructor(fields, options={}) { super(options); this.fields = fields; }
  initial() { return Object.fromEntries(Object.entries(this.fields).map(([k, f]) => [k, f.initial()])); }
  clean(v={}) {
    return Object.fromEntries(Object.entries(this.fields).map(([k, f]) => [k, f.clean(v?.[k])]));
  }
}
class ArrayField extends DataField {
  constructor(element, options={}) { super(options); this.element = element; }
  initial() { return []; }
  clean(v) { return (v ?? []).map(x => this.element.clean(x)); }
}
const fields = {
  DataField, SchemaField, ArrayField,
  StringField: class extends DataField {}, NumberField: class extends DataField {}, BooleanField: class extends DataField {},
  HTMLField: class extends DataField {}, ObjectField: class extends DataField {}
};

class TypeDataModel {
  constructor(data={}, { parent=null }={}) {
    Object.defineProperty(this, "parent", { value: parent, enumerable: false });
    const schema = new SchemaField(this.constructor.defineSchema());
    Object.assign(this, schema.clean(data));
    this.prepareBaseData?.();
  }
}

globalThis.foundry = { data: { fields }, abstract: { TypeDataModel } };

/** A fake actor or item: {type, system (a model instance), items}. */
export function makeDoc(Model, type, data, { items=[], id="x" }={}) {
  const doc = { id, type, items };
  doc.system = new Model(data, { parent: doc });
  doc.system.prepareDerivedData?.();
  return doc;
}
