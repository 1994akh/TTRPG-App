/**
 * A small simulated Foundry VTT world for testing the Ravenmoor runtime in Node.
 *
 * It is built from the module's own generated Adventure (src/packs/adventure), so the scene, actors, journals, items
 * and macros under test are exactly the ones that ship. It imitates only what the runtime calls: documents with
 * update/create/delete (dot-path updates, embedded collections, hooks), settings, chat, dialogs (answered from a
 * queue), combats, sockets, rolls (fixed results) and ApplicationV2 rendering into jsdom. It is not Foundry: the
 * Foundry/dnd5e APIs themselves still need checking in a real world.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { JSDOM } from "jsdom";

export const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const ADVENTURE_DIR = path.join(ROOT, "src/packs/adventure");
export const ADVENTURE = JSON.parse(fs.readFileSync(path.join(ADVENTURE_DIR, fs.readdirSync(ADVENTURE_DIR)[0]), "utf8"));

const clone = x => structuredClone(x);

// Timers: the module's animations wait in real time and it runs background checks every 15-30 seconds. In tests,
// waits take a few milliseconds and intervals never keep Node alive.
const realSetTimeout = globalThis.setTimeout;
const realSetInterval = globalThis.setInterval;
globalThis.setTimeout = (fn, ms, ...args) => realSetTimeout(fn, Math.min(ms ?? 0, 5), ...args);
/** Real-time wait for tests: lets un-awaited hook handlers finish. */
export const settle = (ms=60) => new Promise(r => realSetTimeout(r, ms));
globalThis.setInterval = (fn, ms, ...args) => {
  const t = realSetInterval(fn, ms, ...args);
  t.unref?.();
  return t;
};
let idCounter = 0;
const newId = () => `test${String(++idCounter).padStart(12, "0")}`;

/* -------------------------------------------- */
/*  Utilities                                   */
/* -------------------------------------------- */

function setProperty(obj, key, value) {
  const parts = key.split(".");
  let target = obj;
  for ( const p of parts.slice(0, -1) ) {
    if ( (typeof target[p] !== "object") || (target[p] === null) ) target[p] = {};
    target = target[p];
  }
  target[parts.at(-1)] = value;
}

const isPlain = v => v && (typeof v === "object") && !Array.isArray(v) && !(v instanceof Set) && (Object.getPrototypeOf(v) === Object.prototype);

/** Apply an update the way Foundry does: dot keys set paths, plain objects merge recursively. */
function applyUpdate(target, changes) {
  for ( const [k, v] of Object.entries(changes) ) {
    if ( k === "_id" ) continue;
    if ( k.includes(".") ) setProperty(target, k, clone(v));
    else if ( isPlain(v) && isPlain(target[k]) ) applyUpdate(target[k], v);
    else target[k] = (k === "levels") ? new LevelSet(v) : clone(v);
  }
}

class LevelSet extends Set {
  first() {
    return this.values().next().value;
  }
}

/** A minimal Foundry Collection. */
export class Collection extends Map {
  get contents() {
    return [...this.values()];
  }

  filter(fn) {
    return this.contents.filter(fn);
  }

  find(fn) {
    return this.contents.find(fn);
  }

  some(fn) {
    return this.contents.some(fn);
  }

  map(fn) {
    return this.contents.map(fn);
  }

  [Symbol.iterator]() {
    return this.values();
  }
}

/* -------------------------------------------- */
/*  Hooks                                       */
/* -------------------------------------------- */

export const Hooks = {
  events: {},
  on(name, fn) {
    (this.events[name] ??= []).push({ fn, once: false });
  },
  once(name, fn) {
    (this.events[name] ??= []).push({ fn, once: true });
  },
  call(name, ...args) {
    for ( const h of [...(this.events[name] ?? [])] ) {
      if ( h.once ) this.events[name].splice(this.events[name].indexOf(h), 1);
      if ( h.fn(...args) === false ) return false;
    }
    return true;
  },
  callAll(name, ...args) {
    for ( const h of [...(this.events[name] ?? [])] ) {
      if ( h.once ) this.events[name].splice(this.events[name].indexOf(h), 1);
      h.fn(...args);
    }
    return true;
  }
};

/* -------------------------------------------- */
/*  Documents                                   */
/* -------------------------------------------- */

export const registry = new Map();     // uuid -> document

class Doc {
  constructor(data, { parent=null, collectionName, documentName }={}) {
    Object.assign(this, clone(data));
    this._id ??= newId();
    this.flags ??= {};
    this.parent = parent;
    Object.defineProperty(this, "_collectionName", { value: collectionName, enumerable: false });
    Object.defineProperty(this, "documentName", { value: documentName, enumerable: false });
    if ( Array.isArray(this.levels) ) this.levels = new LevelSet(this.levels);
    registry.set(this.uuid, this);
  }

  get id() {
    return this._id;
  }

  get uuid() {
    return this.parent ? `${this.parent.uuid}.${this.documentName}.${this._id}` : `${this.documentName}.${this._id}`;
  }

  get isOwner() {
    return true;
  }

  toObject() {
    const out = {};
    for ( const [k, v] of Object.entries(this) ) {
      if ( ["parent", "_synthetic"].includes(k) ) continue;
      if ( v instanceof Collection ) out[k] = v.map(d => d.toObject());
      else if ( v instanceof Set ) out[k] = [...v];
      else out[k] = clone(v);
    }
    return out;
  }

  async update(changes, options={}) {
    applyUpdate(this, changes);
    Hooks.callAll(`update${this.documentName}`, this, changes, options);
    return this;
  }

  async delete() {
    const coll = this.parent ? this.parent[this._collectionName] : game[this._collectionName];
    coll?.delete(this._id);
    registry.delete(this.uuid);
    Hooks.callAll(`delete${this.documentName}`, this);
    return this;
  }
}

/** Embedded-collection support shared by actors, scenes, journals, regions and combats. */
const EMBEDDED = {
  Actor: { Item: "items", ActiveEffect: "effects" },
  Item: { ActiveEffect: "effects" },
  Scene: { Token: "tokens", Wall: "walls", AmbientLight: "lights", Tile: "tiles", Note: "notes", Region: "regions", Level: "levels_" },
  Region: { RegionBehavior: "behaviors" },
  JournalEntry: { JournalEntryPage: "pages" },
  Combat: { Combatant: "combatants", CombatantGroup: "groups" }
};
const CLASSES = {};

function withEmbedded(Base, documentName) {
  return class extends Base {
    constructor(data, options={}) {
      super(data, { ...options, documentName });
      for ( const [type, field] of Object.entries(EMBEDDED[documentName] ?? {}) ) {
        const coll = new Collection();
        for ( const d of (data[field === "levels_" ? "levels" : field] ?? []) ) {
          const Cls = CLASSES[type] ?? Doc;
          const doc = new Cls(d, { parent: this, collectionName: field, documentName: type });
          coll.set(doc.id, doc);
        }
        if ( field === "levels_" ) Object.defineProperty(this, "sceneLevels", { value: coll, enumerable: false });
        else this[field] = coll;
      }
    }

    async createEmbeddedDocuments(type, list) {
      const field = EMBEDDED[documentName][type];
      const Cls = CLASSES[type] ?? Doc;
      const created = list.map(d => {
        const doc = new Cls(d, { parent: this, collectionName: field, documentName: type });
        this[field].set(doc.id, doc);
        return doc;
      });
      for ( const d of created ) Hooks.callAll(`create${type}`, d);
      return created;
    }

    async updateEmbeddedDocuments(type, updates, options={}) {
      const field = EMBEDDED[documentName][type];
      const out = [];
      for ( const u of updates ) {
        const doc = this[field].get(u._id);
        if ( !doc ) throw new Error(`No ${type} ${u._id}`);
        await doc.update(u, options);
        out.push(doc);
      }
      return out;
    }

    async deleteEmbeddedDocuments(type, ids) {
      const field = EMBEDDED[documentName][type];
      for ( const id of ids ) {
        const doc = this[field].get(id);
        if ( !doc ) throw new Error(`No ${type} ${id} to delete`);
        await doc.delete();
      }
      return ids;
    }
  };
}

export class Actor extends withEmbedded(Doc, "Actor") {
  get isToken() {
    return !!this._token;
  }

  get token() {
    return this._token ?? null;
  }

  get uuid() {
    return this._token ? `${this._token.uuid}.Actor.${this._id}` : `Actor.${this._id}`;
  }

  get hasPlayerOwner() {
    return Object.entries(this.ownership ?? {}).some(([u, lvl]) => (u !== "default") && (lvl >= 3) && !game.users.get(u)?.isGM);
  }

  testUserPermission(user, level) {
    return (this.ownership?.[user.id] ?? this.ownership?.default ?? 0) >= 3;
  }

  async update(changes, options) {
    await super.update(changes, options);
    return this;
  }

  async rollSavingThrow(config) {
    const total = world.rolls.save?.(this, config) ?? 10;
    game.messages.log.push({ type: "save", actor: this.name, ...config, total });
    return [{ total }];
  }

  async rollSkill(config) {
    const total = world.rolls.skill?.(this, config) ?? 10;
    return [{ total }];
  }

  async getTokenDocument(data={}) {
    const proto = clone(this.prototypeToken ?? {});
    const doc = { ...proto, ...clone(data), actorId: this.id, actorLink: proto.actorLink ?? false };
    return { toObject: () => clone(doc) };
  }
}
CLASSES.Actor = Actor;

class Item extends withEmbedded(Doc, "Item") {}
CLASSES.Item = Item;

class TokenDoc extends Doc {
  get actor() {
    const base = game.actors.get(this.actorId);
    if ( !base ) return null;
    if ( this.actorLink ) return base;
    if ( !this._synthetic ) {
      const data = base.toObject();
      const synthetic = new Actor(data, {});
      Object.defineProperty(synthetic, "_token", { value: this, enumerable: false });
      registry.set(synthetic.uuid, synthetic);
      Object.defineProperty(this, "_synthetic", { value: synthetic, enumerable: false, writable: true });
      // Updates to the synthetic actor surface as updateToken, as in Foundry.
      const update = synthetic.update.bind(synthetic);
      synthetic.update = async (changes, options) => {
        await update(changes, options);
        Hooks.callAll("updateToken", this, { delta: changes }, options);
        return synthetic;
      };
    }
    return this._synthetic;
  }

  get scene() {
    return this.parent;
  }
}
CLASSES.Token = TokenDoc;

class Region extends withEmbedded(Doc, "Region") {}
CLASSES.Region = Region;

export class Scene extends withEmbedded(Doc, "Scene") {
  get levels() {
    return this.sceneLevels;
  }

  set levels(v) {
    /* Levels come in through the constructor; ignore direct assignment of the source array. */
  }

  async activate() {
    for ( const s of game.scenes ) s.active = false;
    this.active = true;
    return this;
  }

  async view() {
    return this;
  }
}
CLASSES.Scene = Scene;

class JournalEntry extends withEmbedded(Doc, "JournalEntry") {
  get sheet() {
    return { render: opts => world.log.push({ journalSheet: this.name, opts }) };
  }
}
CLASSES.JournalEntry = JournalEntry;

class Combatant extends Doc {
  get token() {
    return game.scenes.get(this.sceneId)?.tokens.get(this.tokenId) ?? null;
  }

  get actor() {
    return this.token?.actor ?? game.actors.get(this.actorId) ?? null;
  }
}
CLASSES.Combatant = Combatant;

export class Combat extends withEmbedded(Doc, "Combat") {
  get combatant() {
    return this.combatants.get(this.currentId) ?? null;
  }

  get scene() {
    return game.scenes.get(this.sceneIdRef);
  }
}
CLASSES.Combat = Combat;

class ChatMessage extends Doc {
  get author() {
    return game.users.get(this.authorId);
  }

  get isOwner() {
    return game.user.isGM || (this.authorId === game.user.id);
  }

  static getSpeaker({ actor }={}) {
    return { actor: actor?.id ?? null, alias: actor?.name };
  }
}

/** A documentName-level class with the static create/update helpers the runtime uses. */
function documentClass(Cls, documentName, collectionName) {
  const statics = {
    async create(data) {
      const doc = new Cls(data, { collectionName, documentName });
      game[collectionName].set(doc.id, doc);
      Hooks.callAll(`create${documentName}`, doc);
      return doc;
    },
    async createDocuments(list, { keepId }={}) {
      return Promise.all(list.map(d => statics.create(keepId ? d : { ...d, _id: undefined })));
    },
    async updateDocuments(list, { diff, recursive }={}) {
      if ( (diff !== false) || (recursive !== false) ) throw new Error("restore must use diff:false, recursive:false");
      return list.map(d => {
        // diff:false + recursive:false replaces the document's data wholesale, embedded collections included.
        const doc = new Cls(d, { collectionName, documentName });
        game[collectionName].set(doc.id, doc);
        return doc;
      });
    }
  };
  return { implementation: statics };
}

/* -------------------------------------------- */
/*  Applications and dialogs                    */
/* -------------------------------------------- */

class ApplicationV2 {
  static DEFAULT_OPTIONS = {};

  constructor(options={}) {
    this.options = { ...this.constructor.DEFAULT_OPTIONS, ...options };
    this.rendered = false;
    this.element = null;
  }

  async render() {
    const result = await this._renderHTML({}, {});
    this.element ??= document.createElement("div");
    this._replaceHTML(result, this.element, {});
    this.rendered = true;
    this._onRender?.({}, {});
    world.log.push({ rendered: this.options.id });
    return this;
  }

  async close() {
    this.rendered = false;
    this._onClose?.({});
    return this;
  }

  /** Test helper: run one of the class's actions as if its button were clicked. */
  async click(action, dataset={}) {
    const target = { dataset, disabled: false, checked: dataset.checked ?? false };
    return this.options.actions[action].call(this, { target }, target);
  }
}

const DialogV2 = {
  async prompt(config) {
    const answer = world.dialogs.shift();
    world.log.push({ dialog: config.window?.title, answer });
    if ( answer === undefined ) throw new Error(`Unexpected dialog "${config.window?.title}"`);
    return answer;
  },
  async confirm(config) {
    return DialogV2.prompt(config);
  }
};

/* -------------------------------------------- */
/*  The world                                   */
/* -------------------------------------------- */

export const world = {
  log: [],
  dialogs: [],
  notifications: [],
  socket: [],
  sounds: [],
  shown: [],
  rolls: {},
  nextPoint: null
};

export let game;

/**
 * Build a fresh world: globals, the imported Adventure, a GM and players with characters.
 * @param {object} [options]
 * @param {number} [options.players=5]
 * @returns {object}  Handy references.
 */
export function createWorld({ players=5 }={}) {
  idCounter = 0;
  registry.clear();
  Object.assign(world, { log: [], dialogs: [], notifications: [], socket: [], sounds: [], shown: [], rolls: {}, nextPoint: null });
  for ( const k of Object.keys(Hooks.events) ) delete Hooks.events[k];

  const dom = new JSDOM("<!doctype html><body></body>");
  globalThis.window = dom.window;
  globalThis.document = dom.window.document;
  globalThis.HTMLElement = dom.window.HTMLElement;

  const settings = new Map();
  const settingConfig = new Map();
  const users = new Collection();
  const gm = { id: "gmUser000000000", name: "GM", isGM: true, character: null, isSelf: true };
  users.set(gm.id, gm);

  game = {
    user: gm,
    users,
    actors: new Collection(),
    items: new Collection(),
    scenes: new Collection(),
    journal: new Collection(),
    macros: new Collection(),
    combats: new Collection(),
    folders: new Collection(),
    messages: Object.assign(new Collection(), { log: [] }),
    modules: new Map([["ravenmoor-manor", { id: "ravenmoor-manor" }]]),
    packs: new Map([["ravenmoor-manor.adventure", {
      getDocument: async id => (id === ADVENTURE._id ? { toObject: () => clone(ADVENTURE) } : null)
    }]]),
    settings: {
      register(ns, key, config) {
        settingConfig.set(key, config);
        settings.set(key, clone(config.default));
      },
      get(ns, key) {
        if ( !settingConfig.has(key) ) throw new Error(`Setting ${key} is not registered`);
        return clone(settings.get(key));
      },
      async set(ns, key, value) {
        if ( !settingConfig.has(key) ) throw new Error(`Setting ${key} is not registered`);
        settings.set(key, clone(value));
        settingConfig.get(key).onChange?.(value);
        return value;
      }
    },
    keybindings: { registered: [], register(ns, action, config) {
      this.registered.push({ action, ...config });
    } },
    socket: { handlers: [], on(name, fn) {
      this.handlers.push(fn);
    }, emit(name, data) {
      world.socket.push(data);
    } },
    time: { serverTime: 1_000_000 },
    get combat() {
      return game.combats.find(c => c.active) ?? null;
    }
  };
  Object.defineProperty(users, "activeGM", { get: () => gm });

  globalThis.game = game;
  globalThis.Hooks = Hooks;
  globalThis.ui = { notifications: {
    info: m => world.notifications.push({ info: m }), warn: m => world.notifications.push({ warn: m }),
    error: m => world.notifications.push({ error: m })
  } };
  globalThis.CONST = {
    TOKEN_DISPOSITIONS: { SECRET: -2, HOSTILE: -1, NEUTRAL: 0, FRIENDLY: 1 },
    TOKEN_DISPLAY_MODES: { NONE: 0, CONTROL: 10, OWNER_HOVER: 20, HOVER: 30, OWNER: 40, ALWAYS: 50 },
    DOCUMENT_OWNERSHIP_LEVELS: { NONE: 0, LIMITED: 1, OBSERVER: 2, OWNER: 3 }
  };
  globalThis.CONFIG = { DND5E: { abilities: { str: { label: "Strength" }, dex: { label: "Dexterity" }, con: { label: "Constitution" },
    int: { label: "Intelligence" }, wis: { label: "Wisdom" }, cha: { label: "Charisma" } } } };
  globalThis.foundry = {
    utils: { deepClone: clone, debounce: fn => fn },
    applications: { api: { ApplicationV2, DialogV2 } },
    documents: { collections: { Journal: { show: async (doc, opts) => {
      world.shown.push({ uuid: doc.uuid, ...opts });
      return doc;
    } } } },
    audio: { AudioHelper: { play: data => world.sounds.push(data.src) } }
  };
  globalThis.canvas = {
    ready: true,
    tokens: { controlled: [] },
    stage: {
      on(event, fn) {
        const p = world.nextPoint;
        world.nextPoint = null;
        queueMicrotask(() => fn(p ? { button: 0, getLocalPosition: () => p } : { button: 2 }));
      },
      off() {}
    },
    animatePan: async () => {}
  };
  globalThis.fromUuid = async uuid => registry.get(uuid) ?? null;
  globalThis.Roll = class {
    constructor(formula) {
      this.formula = formula;
      this.total = 10;
      this.dice = [{ faces: 20 }];
    }

    async evaluate() {
      return this;
    }

    async reroll() {
      const r = new Roll(this.formula);
      r.total = 15;
      return r;
    }

    async toMessage(data) {
      return ChatMessage.implementation.create({ content: `${this.formula} = ${this.total}`, rolls: [this], ...data });
    }
  };
  globalThis.ChatMessage = Object.assign(ChatMessage, { implementation: {
    async create(data) {
      const { rolls, ...rest } = data;
      const doc = new ChatMessage({ authorId: game.user.id, ...rest }, { collectionName: "messages", documentName: "ChatMessage" });
      doc.rolls = rolls ?? [];   // Roll instances, as Foundry keeps them
      game.messages.set(doc.id, doc);
      return doc;
    }
  } });
  globalThis.Actor = documentClass(Actor, "Actor", "actors");
  globalThis.Combat = { implementation: { async create(data) {
    const { scene, ...rest } = data;
    const doc = new Combat({ combatants: [], groups: [], round: 0, turn: null, started: false, ...rest, sceneIdRef: scene },
      { collectionName: "combats", documentName: "Combat" });
    game.combats.set(doc.id, doc);
    Hooks.callAll("createCombat", doc);
    return doc;
  } } };
  globalThis.Scene = documentClass(Scene, "Scene", "scenes");
  globalThis.JournalEntry = documentClass(JournalEntry, "JournalEntry", "journal");

  // Import the Adventure the way Foundry would: every document with its own id.
  const adv = clone(ADVENTURE);
  for ( const f of adv.folders ) game.folders.set(f._id, f);
  for ( const a of adv.actors ) game.actors.set(a._id, new Actor(a, { collectionName: "actors" }));
  for ( const i of adv.items ) game.items.set(i._id, new Item(i, { collectionName: "items", documentName: "Item" }));
  for ( const s of adv.scenes ) game.scenes.set(s._id, new Scene(s, { collectionName: "scenes" }));
  for ( const j of adv.journal ) game.journal.set(j._id, new JournalEntry(j, { collectionName: "journal" }));
  for ( const m of adv.macros ) game.macros.set(m._id, new Doc(m, { collectionName: "macros", documentName: "Macro" }));

  // Players, each with an assigned character.
  const party = [];
  for ( let i = 0; i < players; i++ ) {
    const user = { id: `player${i}0000000000`.slice(0, 16), name: `Player ${i + 1}`, isGM: false, character: null };
    users.set(user.id, user);
    const pc = new Actor({
      _id: `pc${i}00000000000000`.slice(0, 16), name: `Hero ${i + 1}`, type: "character", img: "icons/svg/mystery-man.svg",
      system: { attributes: { hp: { value: 40, max: 40 } } }, items: [], effects: [],
      ownership: { default: 0, [user.id]: 3 },
      prototypeToken: { name: `Hero ${i + 1}`, actorLink: true, width: 1, height: 1, texture: { src: "icons/svg/mystery-man.svg" } }
    }, { collectionName: "actors" });
    game.actors.set(pc.id, pc);
    user.character = pc;
    party.push(pc);
  }
  gm.assignHotbarMacro = async (macro, slot) => world.log.push({ hotbar: slot, macro: macro.name });

  return { gm, party, scene: game.scenes.contents[0] };
}

/** Load the module and run Foundry's init and ready hooks. Returns the module API. */
export async function loadModule() {
  // One world per test file (node --test runs each file in its own process), so the module loads once.
  await import(new URL("../scripts/ravenmoor.mjs", import.meta.url).href);
  Hooks.callAll("init");
  Hooks.callAll("ready");
  return game.modules.get("ravenmoor-manor").api;
}

/** Run fn as another user. */
export async function asUser(user, fn) {
  const before = game.user;
  game.user = user;
  try {
    return await fn();
  } finally {
    game.user = before;
  }
}

/** Messages posted so far, newest last. */
export const messages = () => game.messages.contents;

/** Find placeables on the main scene by their ravenmoor label prefix. */
export const byLabel = (scene, field, prefix) => scene[field].filter(d => (d.flags?.ravenmoor?.label ?? "").startsWith(prefix));
