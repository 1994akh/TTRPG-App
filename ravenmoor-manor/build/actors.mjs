/**
 * Actors from data/content/npcs.json, mapped to dnd5e 6.x npc data (2024 rules).
 */
import { id } from "./ids.mjs";
import { attackActivity, ITEM_USE, keyed, saveActivity, utilityActivity } from "./activities.mjs";
import { effect, UNTIL_COMBAT_ENDS, UNTIL_END_OF_NEXT_TURN } from "./effects.mjs";
import { embedItem } from "./items.mjs";
import { assetPath, clone, DISPLAY, DISPOSITION, esc, readJSON, stats } from "./util.mjs";

const ABILITIES = ["str", "dex", "con", "int", "wis", "cha"];
const LANGUAGE_CODES = { common: "common", elvish: "elvish", halfling: "halfling" };
const SIZE_SCALE = { tiny: 0.5, sm: 1, med: 1, lg: 2, huge: 3, grg: 4 };

/** Starting inventory. Keys are items.json keys; `in` puts the item inside another of the actor's items. */
const STARTING_ITEMS = {
  edric: [{ key: "debt-letter" }],
  quill: [
    { key: "medical-bag" },
    { key: "new-will", in: "medical-bag" },
    { key: "empty-vial", in: "medical-bag" },
    { key: "snuffing-powder", in: "medical-bag" },
    { key: "lockbox-key" }
  ],
  silas: [{ key: "raven-cane" }]
};

const mod = score => Math.floor((score - 10) / 2);

/**
 * Portrait for an actor sheet: assets/portraits/<same name as the token>.webp (tools/build_portraits.py).
 * @param {string} token  The token path from npcs.json.
 * @returns {string}
 */
export const portraitFor = token => assetPath(token.replace("assets/tokens/", "assets/portraits/"));

/**
 * Item description for a stat-block entry: the printed wording, plus the trigger for reactions.
 * @param {object} entry
 * @returns {string}
 */
function entryHTML(entry) {
  let html = `<p>${esc(entry.text)}</p>`;
  if ( entry.automation ) html += `<p class="ravenmoor-automation"><em>Module:</em> ${esc(entry.automation)}</p>`;
  return html;
}

/**
 * Uses data for an entry with recharge or limited uses.
 * @param {object} entry
 * @returns {object}
 */
function usesFor(entry) {
  if ( entry.recharge ) return {
    max: "1", spent: 0, recovery: [{ period: "recharge", formula: String(entry.recharge[0]), type: "recoverAll" }]
  };
  if ( entry.uses ) return {
    max: String(entry.uses.max), spent: 0, recovery: [{ period: entry.uses.per === "day" ? "day" : "lr", type: "recoverAll" }]
  };
  return { max: "", spent: 0, recovery: [] };
}

/**
 * Build one stat-block entry as an item.
 * @param {string} actorKey
 * @param {object} entry
 * @param {string} activation  action | bonus | reaction | passive
 * @param {number} sort
 * @returns {object}
 */
function statBlockItem(actorKey, entry, activation, sort) {
  const key = `actor:${actorKey}:${activation}:${entry.name.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`;
  const uses = usesFor(entry);
  const consumption = uses.max ? ITEM_USE : [];
  const effects = [];
  const activities = [];
  const condition = entry.trigger ?? "";
  const activationType = activation === "passive" ? "" : activation;

  // Condition riders become item effects applied on a failed save.
  let appliedEffects = [];
  if ( entry.condition?.status ) {
    const duration = /encounter|fight/.test(entry.condition.duration) ? UNTIL_COMBAT_ENDS : UNTIL_END_OF_NEXT_TURN;
    const changes = /Speed 0/.test(entry.condition.extra ?? "")
      ? [{ key: "system.attributes.movement.walk", value: "0", type: "override" }] : [];
    const fx = effect(`${key}:${entry.condition.status}`, {
      name: entry.condition.extra ? `${entry.name}: Frightened (Speed 0)` : `${entry.name}: Frightened`,
      statuses: [entry.condition.status], duration, changes,
      description: `<p>${esc(entry.condition.duration)}${entry.condition.extra ? `. ${esc(entry.condition.extra)}` : ""}.</p>`
    });
    effects.push(fx);
    appliedEffects = [{ _id: fx._id, onSave: false }];
  }

  if ( entry.attack ) {
    activities.push(attackActivity(key, entry.attack, entry.damage, { activation: activationType || "action", condition, consumption }));
  } else if ( entry.save ) {
    activities.push(saveActivity(key, entry.save, entry.damage, {
      activation: activationType || "special", condition, consumption, effects: appliedEffects
    }));
  } else if ( activation !== "passive" ) {
    activities.push(utilityActivity(key, { activation: activationType, condition, consumption }));
  }

  const isWeapon = !!entry.attack && !/spell/i.test(entry.attack.kind);
  const system = {
    description: { value: entryHTML(entry), chat: "" },
    source: { custom: "Death at Ravenmoor Manor", rules: "2024", revision: 1, book: "", page: "", license: "" },
    identifier: key.split(":").pop(),
    uses,
    activities: keyed(activities)
  };
  if ( isWeapon ) Object.assign(system, {
    type: { value: "natural", baseItem: "" },
    range: /ranged/i.test(entry.attack.kind)
      ? { value: entry.attack.range[0], long: entry.attack.range[1] !== entry.attack.range[0] ? entry.attack.range[1] : null, units: "ft", reach: null }
      : { value: null, long: null, units: "ft", reach: entry.attack.reach ?? 5 },
    damage: { base: { number: null, denomination: null, bonus: "", types: [], custom: { enabled: false, formula: "" }, scaling: { number: 1 } } },
    properties: [],
    equipped: true,
    proficient: null,
    quantity: 1,
    identified: true
  });
  else Object.assign(system, { type: { value: "monster", subtype: "" }, properties: [], requirements: "" });

  return {
    _id: id(`item:${key}`),
    name: entry.name,
    type: isWeapon ? "weapon" : "feat",
    img: imgFor(entry, activation),
    system,
    effects,
    flags: { ravenmoor: { statBlock: activation, automation: entry.automation ?? null } },
    sort,
    ownership: { default: 0 },
    _stats: stats()
  };
}

/**
 * A reasonable core icon per entry type.
 * @param {object} entry
 * @param {string} activation
 * @returns {string}
 */
function imgFor(entry, activation) {
  const dir = "systems/dnd5e/icons/svg/activity";
  if ( entry.spellcasting ) return `${dir}/cast.svg`;
  if ( entry.attack ) return `${dir}/attack.svg`;
  if ( entry.save ) return `${dir}/save.svg`;
  return `${dir}/utility.svg`;
}

/**
 * Pip's innate spellcasting: copies of the SRD 5.2 spells vendored from dnd5e 6.0.6.
 * @param {object} spellcasting
 * @returns {object[]}
 */
function spellItems(spellcasting) {
  const vendored = readJSON("data/vendor/dnd5e/spells.json").documents;
  const out = [];
  const add = (name, perDay) => {
    const src = vendored.find(s => s.name === name);
    if ( !src ) throw new Error(`Spell "${name}" is not in data/vendor/dnd5e/spells.json`);
    const doc = clone(src);
    const originalId = doc._id;
    doc._id = id(`item:actor:pip:spell:${src.system.identifier ?? name}`);
    delete doc.system.preparation;
    doc.system.method = perDay ? "innate" : "atwill";
    doc.system.prepared = 2;
    doc.system.ability = spellcasting.ability;
    if ( spellcasting.noMaterial ) doc.system.properties = doc.system.properties.filter(p => p !== "material");
    doc.system.uses = perDay
      ? { max: String(perDay), spent: 0, recovery: [{ period: "day", type: "recoverAll" }] }
      : { max: "", spent: 0, recovery: [] };
    if ( perDay ) {
      for ( const activity of Object.values(doc.system.activities ?? {}) ) {
        activity.consumption ??= {};
        activity.consumption.targets = ITEM_USE;
        activity.consumption.spellSlot = false;
      }
    }
    doc.folder = null;
    doc.sort = out.length * 1000;
    doc._stats = { ...stats(), compendiumSource: `Compendium.dnd5e.spells24.Item.${originalId}` };
    doc.flags = { ...(doc.flags ?? {}), ravenmoor: { innate: true } };
    out.push(doc);
  };
  for ( const name of spellcasting.atWill ?? [] ) add(name, 0);
  for ( const [n, names] of Object.entries(spellcasting.perDay ?? {}) ) for ( const name of names ) add(name, Number(n));
  return out;
}

/**
 * Biography HTML for the actor sheet.
 * @param {object} npc
 * @returns {string}
 */
export function biographyHTML(npc) {
  const b = npc.biography ?? {};
  const row = (label, text) => text ? `<p><strong>${label}.</strong> ${esc(text)}</p>` : "";
  let html = row("Look", b.look) + row("Wants", b.wants) + row("Secret", b.secret) + row("Knows", b.knows)
    + row("Tells", b.tells) + row("Plays as", b.playsAs) + row("Appears", b.appears);
  if ( b.speakWithDead?.length ) {
    html += "<p><strong><em>Speak with dead</em> (five questions).</strong></p><ul>"
      + b.speakWithDead.map(q => `<li><em>${esc(q.q)}</em> “${esc(q.a)}”</li>`).join("") + "</ul>";
  }
  if ( b.lines?.length ) html += "<p><strong>Lines.</strong></p><ul>" + b.lines.map(l => `<li>“${esc(l)}”</li>`).join("") + "</ul>";
  if ( npc.gear?.length ) html += `<p><strong>Gear.</strong> ${esc(npc.gear.join("; "))}.</p>`;
  if ( npc.notes ) html += row("Note", npc.notes);
  if ( npc.lair ) {
    html += `<h3>${esc(npc.lair.name)}</h3><p>${esc(npc.lair.intro)}</p><ol>`
      + npc.lair.rounds.map(r => `<li><strong>Round ${r.round}, ${esc(r.name)}.</strong> ${esc(r.text)}</li>`).join("")
      + "</ol>";
  }
  return html;
}

/**
 * Disposition for an actor's prototype token.
 * @param {object} npc
 * @returns {number}
 */
function dispositionFor(npc) {
  if ( npc.key === "pip" ) return DISPOSITION.FRIENDLY;
  if ( ["scarecrow", "skeleton"].includes(npc.key) ) return DISPOSITION.HOSTILE;
  return DISPOSITION.NEUTRAL;
}

/**
 * Prototype token data.
 * @param {object} npc
 * @returns {object}
 */
export function prototypeToken(npc) {
  const size = SIZE_SCALE[npc.size] ?? 1;
  return {
    name: npc.name,
    displayName: DISPLAY.HOVER,
    displayBars: DISPLAY.OWNER_HOVER,
    actorLink: npc.key === "silas",
    appendNumber: ["skeleton", "scarecrow"].includes(npc.key),
    width: size,
    height: size,
    texture: {
      src: assetPath(npc.token), anchorX: 0.5, anchorY: 0.5, fit: "contain",
      scaleX: npc.size === "sm" ? 0.8 : 1, scaleY: npc.size === "sm" ? 0.8 : 1, tint: "#ffffff", alphaThreshold: 0.75
    },
    lockRotation: true,
    disposition: dispositionFor(npc),
    bar1: { attribute: "attributes.hp" },
    bar2: { attribute: null },
    sight: { enabled: false, range: 0, angle: 360, visionMode: "basic" },
    ring: { enabled: false },
    flags: {}
  };
}

/**
 * Build one actor.
 * @param {object} npc
 * @param {Map<string, object>} items
 * @returns {object}
 */
function buildActor(npc, items) {
  const _id = id(`actor:${npc.key}`);
  const abilities = Object.fromEntries(ABILITIES.map(a => [a, {
    value: npc.abilities[a],
    proficient: npc.saves.includes(a) ? 1 : 0
  }]));
  const skills = Object.fromEntries(Object.entries(npc.skills).map(([k, v]) => [k, { value: v === "expertise" ? 2 : 1 }]));
  const initBonus = npc.initiative.modifier - mod(npc.abilities.dex);
  const languages = { value: [], custom: "" };
  for ( const l of npc.languages ) {
    if ( LANGUAGE_CODES[l] ) languages.value.push(LANGUAGE_CODES[l]);
    else languages.custom = l.charAt(0).toUpperCase() + l.slice(1);
  }
  const senses = { ranges: {}, units: "ft", special: "" };
  for ( const [k, v] of Object.entries(npc.senses ?? {}) ) senses.ranges[k] = v;

  // Stat-block entries in printed order.
  const embedded = [];
  let sort = 0;
  const push = (list, activation) => {
    for ( const entry of list ?? [] ) {
      if ( entry.spellcasting ) {
        embedded.push(statBlockItem(npc.key, entry, "passive", sort += 1000));
        embedded.push(...spellItems(entry.spellcasting));
        continue;
      }
      embedded.push(statBlockItem(npc.key, entry, activation, sort += 1000));
    }
  };
  push(npc.traits, "passive");
  push(npc.actions, "action");
  push(npc.bonusActions, "bonus");
  push(npc.reactions, "reaction");

  // Reaction-style AC bumps (Parry, Slippery Physician) and Pip's Shield get a self effect for convenience.
  for ( const item of embedded ) {
    const bump = { "Slippery Physician": 3, "Parry": 2, "Protective Magic": 5 }[item.name];
    if ( !bump ) continue;
    const fx = effect(`item:actor:${npc.key}:${item.name}:ac`, {
      name: item.name, img: "systems/dnd5e/icons/svg/checked-shield.svg",
      changes: [{ key: "system.attributes.ac.bonus", value: `+${bump}` }],
      duration: item.name === "Protective Magic" ? { value: 1, units: "turns", expiry: "turnStart" } : { value: 1, units: "turns", expiry: "turnEnd" }
    });
    item.effects.push(fx);
    for ( const a of Object.values(item.system.activities) ) a.effects = [{ _id: fx._id }];
  }

  // Starting inventory.
  const inventoryIds = {};
  for ( const { key, in: parent } of STARTING_ITEMS[npc.key] ?? [] ) {
    const doc = embedItem(items, key, npc.key, parent ? { container: inventoryIds[parent] } : {});
    inventoryIds[key] = doc._id;
    doc.sort = sort += 1000;
    embedded.push(doc);
  }

  const hp = npc.hp.average;
  const system = {
    abilities,
    skills,
    attributes: {
      ac: { calc: "natural", flat: npc.ac.value },
      hp: { value: hp, max: hp, temp: null, tempmax: null, formula: npc.hp.formula ?? "" },
      init: { ability: "", roll: { bonus: initBonus ? String(initBonus) : "", min: null, max: null, mode: 0 } },
      movement: {
        walk: String(npc.speed.walk ?? 0),
        fly: npc.speed.fly ? String(npc.speed.fly) : "",
        hover: !!npc.speed.hover,
        units: null
      },
      senses,
      spellcasting: npc.actions?.find(a => a.spellcasting)?.spellcasting.ability ?? ""
    },
    details: {
      biography: { value: biographyHTML(npc), public: "" },
      alignment: npc.alignment,
      type: { value: npc.creatureType, subtype: "", swarm: "", custom: "" },
      cr: npc.cr,
      habitat: { value: [], custom: "" },
      treasure: { value: [] }
    },
    resources: {
      legact: { max: 0, spent: 0 },
      legres: { max: 0, spent: 0 },
      lair: { value: false, initiative: null, inside: false }
    },
    source: { custom: "Death at Ravenmoor Manor", rules: "2024", revision: 1, book: "", page: "", license: "" },
    traits: {
      size: npc.size,
      di: { value: npc.immunities.damage, bypasses: [], custom: "" },
      ci: { value: npc.immunities.condition, custom: "" },
      dr: { value: npc.resistances, bypasses: [], custom: "" },
      dv: { value: npc.vulnerabilities, bypasses: [], custom: "" },
      languages,
      important: ["quill", "silas"].includes(npc.key)
    }
  };
  if ( npc.ac.source ) system.attributes.ac.calc = "natural";

  return {
    _id,
    name: npc.name,
    type: "npc",
    img: portraitFor(npc.token),
    system,
    prototypeToken: prototypeToken(npc),
    items: embedded,
    effects: [],
    folder: null,
    sort: 0,
    ownership: { default: 0 },
    flags: {
      ravenmoor: {
        key: npc.key,
        role: npc.role,
        acSource: npc.ac.source || null,
        tokenMasked: npc.tokenUnmasked ? assetPath(npc.token) : null,
        tokenUnmasked: npc.tokenUnmasked ? assetPath(npc.tokenUnmasked) : null,
        portrait: portraitFor(npc.token),
        portraitUnmasked: npc.tokenUnmasked ? portraitFor(npc.tokenUnmasked) : null,
        lair: npc.lair ?? null,
        cornered: npc.key === "quill" ? { threshold: 30, runningLong: 50 } : null
      }
    },
    _stats: stats()
  };
}

/**
 * Build all actors.
 * @param {Map<string, object>} items
 * @returns {{actors: Map<string, object>, npcs: object[], encounter: object}}
 */
export function buildActors(items) {
  const data = readJSON("data/content/npcs.json");
  const actors = new Map();
  for ( const npc of data.actors ) actors.set(npc.key, buildActor(npc, items));
  return { actors, npcs: data.actors, encounter: data.encounter };
}

/**
 * Find an npc key from a token's actor name ("Lord Silas Ravenmoor (body, Act 2)" -> "silas").
 * @param {object[]} npcs
 * @param {string} name
 * @returns {string}
 */
export function npcKeyForName(npcs, name) {
  const bare = name.split("(")[0].trim();
  const npc = npcs.find(n => n.name === bare);
  if ( !npc ) throw new Error(`No actor named "${bare}"`);
  return npc.key;
}
