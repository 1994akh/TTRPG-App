/**
 * A fake Foundry runtime for the system's own logic (dice.mjs, scenes.mjs, documents.mjs, dialogs.mjs): documents
 * with dot-path updates and derived data, a Roll with queued dice, chat, hooks, settings and notifications. It proves
 * the module logic and wiring, not that Foundry behaves the same.
 */
import "./harness.mjs";

export const chat = [];
export const hooks = [];
export const warnings = [];
const settings = new Map();
export const dice = [];   // queued die results, consumed left to right

function setPath(obj, key, value) {
  const parts = key.split(".");
  let o = obj;
  for ( const p of parts.slice(0, -1) ) o = (o[p] ??= {});
  o[parts.at(-1)] = value;
}
function expand(update) {
  const out = {};
  for ( const [k, v] of Object.entries(update) ) setPath(out, k, v);
  return out;
}
function merge(target, src) {
  for ( const [k, v] of Object.entries(src) ) {
    if ( v && typeof v === "object" && !Array.isArray(v) && target[k] && typeof target[k] === "object" ) merge(target[k], v);
    else target[k] = v;
  }
  return target;
}

class Collection extends Map {
  filter(fn) { return [...this.values()].filter(fn); }
  find(fn) { return [...this.values()].find(fn); }
  some(fn) { return [...this.values()].some(fn); }
  map(fn) { return [...this.values()].map(fn); }
  forEach(fn) { return [...this.values()].forEach(fn); }
  [Symbol.iterator]() { return this.values(); }
}

let nextId = 1;
class FakeDocument {
  constructor(data, parent=null) {
    this.id = data._id ?? `id${nextId++}`;
    this.uuid = `${this.constructor.documentName}.${this.id}`;
    this.name = data.name;
    this.type = data.type;
    this.parent = parent;
    this.items = new Collection();
    this._sourceSystem = structuredClone(data.system ?? {});
    for ( const i of data.items ?? [] ) { const it = new FakeItem(i, this); this.items.set(it.id, it); }
    this.statuses = new Set();
    this.isOwner = true;
    this.hasPlayerOwner = data.hasPlayerOwner ?? true;
    this.prepare();
  }
  get _source() { return { system: this._sourceSystem }; }
  prepare() {
    const Model = this.constructor.models[this.type];
    this.system = new Model(this._sourceSystem, { parent: this });
    this.system.prepareDerivedData?.();
  }
  async update(update) {
    const exp = expand(update);
    if ( exp.system ) merge(this._sourceSystem, exp.system);
    if ( exp.name ) this.name = exp.name;
    this.prepare();
    this.parent?.prepare?.();
    return this;
  }
  async toggleStatusEffect(id, { active }={}) { if ( active === false ) this.statuses.delete(id); else this.statuses.add(id); }
  async createEmbeddedDocuments(type, list) {
    const made = list.map(d => new FakeItem(d, this));
    for ( const m of made ) this.items.set(m.id, m);
    this.prepare();
    return made;
  }
}

export class FakeItem extends FakeDocument {
  static documentName = "Item";
  static models = {};
}
export class FakeActor extends FakeDocument {
  static documentName = "Actor";
  static models = {};
  static async create(data) {
    const a = new globalThis.Actor(data);
    globalThis.game.actors.set(a.id, a);
    return a;
  }
}

class FakeRoll {
  constructor(formula) { this.formula = String(formula); }
  async evaluate() {
    const terms = this.formula.replace(/\s+/g, "").match(/[+-]?[^+-]+/g) ?? [];
    this.total = 0;
    this.dice = [];
    for ( const t of terms ) {
      const sign = t.startsWith("-") ? -1 : 1;
      const body = t.replace(/^[+-]/, "");
      const m = /^(\d*)d(\d+)$/.exec(body);
      if ( m ) {
        const n = Number(m[1] || 1);
        const faces = Number(m[2]);
        let sum = 0;
        for ( let i = 0; i < n; i++ ) sum += dice.length ? dice.shift() : Math.ceil(faces / 2);
        this.dice.push({ faces, total: sum });
        this.total += sign * sum;
      } else this.total += sign * Number(body);
    }
    return this;
  }
}

globalThis.Actor = FakeActor;
globalThis.Item = FakeItem;
globalThis.Combat = class {};
globalThis.Roll = FakeRoll;
globalThis.Hooks = { callAll: (name, ...args) => hooks.push({ name, args }), on() {}, once() {} };
globalThis.ChatMessage = {
  getSpeaker: ({ actor }) => ({ alias: actor?.name }),
  create: async data => { chat.push(data); return data; }
};
globalThis.ui = { notifications: { warn: m => warnings.push(m), info: m => warnings.push(m) } };
globalThis.fromUuid = async uuid => [...globalThis.game.actors.values()].find(a => a.uuid === uuid) ?? null;
globalThis.foundry.applications = { ux: { TextEditor: { implementation: { enrichHTML: async html => html } } } };
globalThis.foundry.utils = { deepClone: x => structuredClone(x) };
globalThis.game = {
  actors: new Collection(),
  user: { targets: new Set() },
  combat: null,
  settings: { get: (s, k) => settings.get(k), set: (k, v) => settings.set(k, v) },
  i18n: { localize: k => k, format: (k, data) => `${k} ${JSON.stringify(data)}` }
};
export const setSetting = (k, v) => settings.set(k, v);

/** Register the data models on the fake documents. */
export async function registerModels() {
  const { default: HeroData } = await import("../module/data/hero.mjs");
  const { default: NpcData } = await import("../module/data/npc.mjs");
  const { default: ObstacleData } = await import("../module/data/obstacle.mjs");
  const I = await import("../module/data/items.mjs");
  Object.assign(FakeActor.models, { hero: HeroData, npc: NpcData, obstacle: ObstacleData });
  Object.assign(FakeItem.models, { weapon: I.WeaponData, armour: I.ArmourData, gear: I.GearData, signature: I.SignatureData,
    spell: I.SpellData, feature: I.FeatureData, race: I.RaceData, class: I.ClassData, profession: I.ProfessionData });
}

export function reset() {
  chat.length = 0; hooks.length = 0; warnings.length = 0; dice.length = 0;
  game.actors.clear(); game.user.targets.clear(); settings.clear();
}
