/**
 * A small simulated Foundry VTT world for the Act 1 runtime, built from the module's own generated Adventure
 * (src/packs/adventure). Heroes get their derived sheet from the real Possibilities rules
 * (possibilities-system/module/rules.mjs and the system's own computeInput), so numbers here are the system's numbers.
 * It imitates only what the runtime calls; it is not Foundry.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

export const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const SYSTEM = path.resolve(ROOT, "../possibilities-system/module");
const ADV_DIR = path.join(ROOT, "src/packs/adventure");
export const ADVENTURE = JSON.parse(fs.readFileSync(path.join(ADV_DIR, fs.readdirSync(ADV_DIR)[0]), "utf8"));

const clone = x => structuredClone(x);
let counter = 0;
const newId = () => `t${String(++counter).padStart(15, "0")}`;

/* -------------------------------------------- Seeded dice -------------------------------------------- */

export function rng(seed) {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6D2B79F5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Roll a formula like "2d6 + 3", "1d4+1" or "1d6 - 1". */
export function rollFormula(formula, rand) {
  let total = 0;
  const f = String(formula).replace(/\s+/g, "");
  for ( const m of f.matchAll(/([+-]?)(\d*)d(\d+)|([+-]?)(\d+)(?!d)/g) ) {
    if ( m[3] ) {
      const n = Number(m[2] || 1);
      let sum = 0;
      for ( let i = 0; i < n; i++ ) sum += 1 + Math.floor(rand() * Number(m[3]));
      total += m[1] === "-" ? -sum : sum;
    } else if ( m[5] ) total += (m[4] === "-" ? -1 : 1) * Number(m[5]);
  }
  return total;
}

/* -------------------------------------------- Foundry globals -------------------------------------------- */

function setProperty(obj, key, value) {
  const parts = key.split(".");
  let t = obj;
  for ( const p of parts.slice(0, -1) ) {
    if ( (typeof t[p] !== "object") || (t[p] === null) ) t[p] = {};
    t = t[p];
  }
  t[parts.at(-1)] = value;
}
const isPlain = v => v && (typeof v === "object") && !Array.isArray(v) && (Object.getPrototypeOf(v) === Object.prototype);
function applyUpdate(target, changes) {
  for ( const [k, v] of Object.entries(changes) ) {
    if ( k === "_id" ) continue;
    if ( k.includes(".") ) setProperty(target, k, clone(v));
    else if ( isPlain(v) && isPlain(target[k]) ) applyUpdate(target[k], v);
    else target[k] = clone(v);
  }
}

export class Collection extends Map {
  get contents() { return [...this.values()]; }
  filter(fn) { return this.contents.filter(fn); }
  find(fn) { return this.contents.find(fn); }
  some(fn) { return this.contents.some(fn); }
  map(fn) { return this.contents.map(fn); }
  [Symbol.iterator]() { return this.values(); }
}

export const Hooks = {
  events: {},
  on(name, fn) { (this.events[name] ??= []).push({ fn, once: false }); },
  once(name, fn) { (this.events[name] ??= []).push({ fn, once: true }); },
  callAll(name, ...args) {
    const out = [];
    for ( const h of [...(this.events[name] ?? [])] ) {
      if ( h.once ) this.events[name].splice(this.events[name].indexOf(h), 1);
      out.push(h.fn(...args));
    }
    return out;
  },
  call(name, ...args) { return this.callAll(name, ...args); }
};

const EMBED = { Actor: { Item: "items" }, JournalEntry: { JournalEntryPage: "pages" }, Combat: { Combatant: "combatants" },
  Scene: { Token: "tokens", AmbientLight: "lights", Note: "notes", Wall: "walls" }, RollTable: { TableResult: "results" } };

class Doc {
  constructor(data, documentName, parent=null) {
    Object.assign(this, clone(data));
    this._id ??= newId();
    this.flags ??= {};
    Object.defineProperty(this, "documentName", { value: documentName });
    Object.defineProperty(this, "parent", { value: parent, writable: true });
    for ( const [type, field] of Object.entries(EMBED[documentName] ?? {}) ) {
      const coll = new Collection();
      for ( const d of data[field] ?? [] ) {
        const doc = makeDoc(d, type, this);
        coll.set(doc.id, doc);
      }
      this[field] = coll;
    }
    this.prepare?.();
  }

  get id() { return this._id; }
  get uuid() { return this.parent ? `${this.parent.uuid}.${this.documentName}.${this.id}` : `${this.documentName}.${this.id}`; }
  get actor() { return this.documentName === "Token" ? game.actors.get(this.actorId) : undefined; }
  get sheet() { return { render: opts => { world.rendered.push({ doc: this, opts }); } }; }
  getFlag(scope, key) { return this.flags?.[scope]?.[key]; }
  async setFlag(scope, key, v) { return this.update({ [`flags.${scope}.${key}`]: v }); }
  async unsetFlag(scope, key) { delete this.flags?.[scope]?.[key]; return this; }

  async update(changes) {
    applyUpdate(this, changes);
    this.prepare?.();
    this.parent?.prepare?.();
    Hooks.callAll(`update${this.documentName}`, this, changes);
    await settle();
    return this;
  }

  async delete() {
    const coll = this.parent ? this.parent[EMBED[this.parent.documentName][this.documentName]] : COLLECTIONS[this.documentName]();
    coll.delete(this.id);
    Hooks.callAll(`delete${this.documentName}`, this);
    await settle();
    return this;
  }

  async createEmbeddedDocuments(type, list) {
    const field = EMBED[this.documentName][type];
    const out = list.map(d => {
      const doc = makeDoc({ ...clone(d), _id: undefined }, type, this);
      this[field].set(doc.id, doc);
      return doc;
    });
    this.prepare?.();
    await settle();
    return out;
  }

  async deleteEmbeddedDocuments(type, ids) {
    const field = EMBED[this.documentName][type];
    for ( const id of ids ) this[field].delete(id);
    this.prepare?.();
    return ids;
  }

  async updateEmbeddedDocuments(type, updates) {
    const field = EMBED[this.documentName][type];
    for ( const u of updates ) applyUpdate(this[field].get(u._id), u);
    Hooks.callAll(`update${type}`, null, updates);
    return updates;
  }

  toObject() { return clone({ ...this }); }
}

let R;
let RULES;
let computeInput;

class ActorDoc extends Doc {
  prepare() {
    if ( !R || !this.items ) return;
    if ( this.type === "hero" ) {
      const items = this.items.contents;
      const s = R.compute(computeInput(this.system, items), RULES);
      this.system.derived = { combatEL: s.combat_el, craftEL: s.craft_el, hpMax: s.max_hp, ac: s.ac, attack: s.attack,
        damage: s.damage, damageFormula: R.toFormula(s.damage, computeInput(this.system, items).weapon_die),
        craftEffortFormula: R.toFormula(s.craft_effort, computeInput(this.system, items).weapon_die),
        skills: Object.fromEntries(RULES.skills.map(k => [k.id, { total: s.skills[k.id], track: k.track }])),
        mods: s.mods, family: R.familyOf(RULES, this.system.race) };
    } else if ( this.type === "npc" ) {
      const b = R.npcBenchmarks(RULES, this.system.el, this.system.grade, this.system.role);
      const o = this.system.overrides ?? {};
      this.system.derived = { ac: o.ac ?? b.ac, attack: o.attack ?? b.attack, hpMax: o.hpMax ?? b.hpMax, damage: o.damage ?? b.damage };
    }
  }

  async toggleStatusEffect(id, { active }) {
    this.statuses ??= new Set();
    if ( active ) this.statuses.add(id);
    else this.statuses.delete(id);
  }

  get ownership() { return this._ownership ?? {}; }
  set ownership(v) { this._ownership = v; }
}

class SceneDoc extends Doc {
  async activate() { world.activeScene = this; return this; }
  async view() { world.viewed = this; return this; }
  get grid() { return { size: this._grid?.size ?? 100 }; }
  set grid(v) { this._grid = v; }
}

class CombatDoc extends Doc {
  async rollAll() { return this; }
  async startCombat() { this.round = 1; return this; }
  async nextRound() { return this.update({ round: (this.round ?? 1) + 1 }); }
}

class TableDoc extends Doc {
  async draw() {
    const r = this.results.contents[Math.floor(world.rand() * this.results.size)];
    world.chat.push({ content: r.name, table: true });
    return { results: [r] };
  }
}

function makeDoc(data, type, parent) {
  const Cls = { Actor: ActorDoc, Scene: SceneDoc, Combat: CombatDoc, RollTable: TableDoc }[type] ?? Doc;
  return new Cls(data, type, parent);
}

const COLLECTIONS = {
  Actor: () => game.actors, JournalEntry: () => game.journal, Scene: () => game.scenes, Combat: () => game.combats,
  Item: () => game.items, Macro: () => game.macros, RollTable: () => game.tables
};

export const settle = (ms=0) => new Promise(r => setImmediate(r, ms));

/** The world, and what happened in it. */
export const world = { chat: [], rendered: [], dialogs: [], notes: [], activeScene: null, viewed: null, rand: rng(1) };

function collect(list, type) {
  const c = new Collection();
  for ( const d of list ?? [] ) {
    const doc = makeDoc(d, type, null);
    c.set(doc.id, doc);
  }
  return c;
}

/** Dialog answers, consumed in order: {prompt|wait|confirm: value}. */
const answer = kind => {
  const a = world.dialogs.shift();
  if ( !a || !(kind in a) ) throw new Error(`Unexpected ${kind} dialog (queued: ${JSON.stringify(a)})`);
  return a[kind];
};

/** Build the world and load the runtime. Returns the module API. */
export async function setup({ seed=1 }={}) {
  world.rand = rng(seed);
  globalThis.foundry = {
    abstract: { TypeDataModel: class {} },
    data: { fields: {} },
    utils: { deepClone: clone, debounce: fn => fn },
    documents: { collections: { Journal: { show: async page => world.rendered.push({ shown: page }) } } },
    applications: {
      api: {
        ApplicationV2: class {
          constructor() { this.rendered = false; }
          async render() { this.rendered = true; this.html = await this._renderHTML(); return this; }
        },
        DialogV2: {
          prompt: async () => answer("prompt"),
          wait: async () => answer("wait"),
          confirm: async () => answer("confirm")
        }
      }
    }
  };
  ({ computeInput } = await import(path.join(SYSTEM, "data/hero.mjs")));
  R = await import(path.join(SYSTEM, "rules.mjs"));
  ({ RULES } = await import(path.join(SYSTEM, "rules-data.mjs")));

  const settings = new Map();
  const registered = new Map();
  globalThis.Hooks = Hooks;
  globalThis.CONFIG = { TextEditor: { enrichers: [] } };
  globalThis.ui = { notifications: { info: m => world.notes.push(m), warn: m => world.notes.push(m), error: m => world.notes.push(m) } };
  const users = new Collection([["gm", { id: "gm", isGM: true, active: true }], ["p1", { id: "p1", isGM: false, active: true }]]);
  const mod = { id: "possibilities-act1" };
  globalThis.game = {
    user: users.get("gm"), users,
    modules: { get: id => (id === "possibilities-act1" ? mod : undefined) },
    settings: {
      register: (ns, key, cfg) => registered.set(key, cfg),
      get: (ns, key) => clone(settings.has(key) ? settings.get(key) : registered.get(key)?.default),
      set: async (ns, key, v) => { settings.set(key, clone(v)); registered.get(key)?.onChange?.(v); return v; }
    },
    keybindings: { register: () => {} },
    actors: collect(ADVENTURE.actors, "Actor"),
    items: collect(ADVENTURE.items, "Item"),
    journal: collect(ADVENTURE.journal, "JournalEntry"),
    scenes: collect(ADVENTURE.scenes, "Scene"),
    macros: collect(ADVENTURE.macros, "Macro"),
    tables: collect(ADVENTURE.tables, "RollTable"),
    combats: new Collection(),
    possibilities: fakeSystem()
  };
  for ( const a of game.actors ) a.prepare();
  globalThis.ChatMessage = { implementation: { create: async d => { world.chat.push(d); return d; } } };
  globalThis.Actor = { implementation: { create: async d => {
    const a = makeDoc({ items: [], ...d, system: { ...defaultHero(), ...d.system } }, "Actor", null);
    game.actors.set(a.id, a);
    a.prepare();
    return a;
  } } };
  globalThis.Combat = { implementation: { create: async d => {
    const c = makeDoc({ round: 0, combatants: [], ...d }, "Combat", null);
    game.combats.set(c.id, c);
    return c;
  } } };
  globalThis.document = { addEventListener: () => {}, createElement: () => ({ dataset: {}, className: "", innerHTML: "", textContent: "" }) };
  globalThis.window = { getSelection: () => null };
  await import(path.join(ROOT, "scripts/act1.mjs"));
  Hooks.callAll("init");
  Hooks.callAll("ready");
  await settle();
  return mod.api;
}

function defaultHero() {
  return {
    race: "Human", raceGrade: "F", class: { node: "", rank: "Novice" }, profession: { node: "Sailor", rank: "Novice" },
    xp: { class: 0, profession: 0 }, hp: { value: 6, temp: 0 }, points: { value: 3 }, hitDiceUsed: 0,
    dying: { value: 0, active: false, stable: false, wounded: 0 }, turn: { actions: 3, attacks: 0, guard: false }, zone: "near",
    training: { armour: "Untrained", weapon: "Trained", spell: "Untrained", saves: {}, skills: {} },
    castAbility: "None", baseSpeed: 30, gearBonus: 0, currency: { cp: 0, sp: 0, gp: 0, pp: 0 },
    details: {}, story: { role: "pc", path: { class: [], profession: [] } }
  };
}

/** game.possibilities as the system's SPEC describes it, enough for Act 1: createHero, bind, rest, rules. */
function fakeSystem() {
  return {
    get rules() { return RULES; },
    createHero: async () => {
      const spec = answer("createHero");
      return Actor.implementation.create({ name: spec.name, type: "hero", system: { race: spec.race,
        profession: { node: spec.profession, rank: "Novice" },
        training: { armour: "Untrained", weapon: "Trained", spell: "Untrained", saves: {}, skills: Object.fromEntries(spec.skills.map(s => [s, "Trained"])) } } });
    },
    bind: async actor => {
      const node = actor.system.story?.path?.class?.[0] ?? answer("bind");
      await actor.update({ "system.class.node": node, "system.class.rank": "Novice" });
    },
    rest: async (actor, kind) => actor.update({ "system.hp.value": actor.system.derived.hpMax })
  };
}

export { R, RULES };
export const rulesModule = () => R;
