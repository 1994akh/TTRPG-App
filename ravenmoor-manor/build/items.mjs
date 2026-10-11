/**
 * Items from data/content/items.json, mapped to dnd5e 6.x item data.
 */
import { id } from "./ids.mjs";
import { ITEM_USE, keyed, utilityActivity } from "./activities.mjs";
import { effect, UNTIL_COMBAT_ENDS } from "./effects.mjs";
import { clone, esc, readJSON, stats } from "./util.mjs";

/**
 * Core icon substitutions. The images suggested in items.json were checked against every core icon the dnd5e
 * 6.0.6 compendiums reference; suggestions not in that set are swapped for the closest icon that is.
 */
const IMG_SUBSTITUTES = {
  "icons/sundries/scrolls/scroll-bound-sealed-black.webp": "icons/sundries/scrolls/scroll-bound-sealed-black-red.webp",
  "icons/sundries/documents/envelope-sealed-green.webp": "icons/sundries/documents/envelope-sealed-red-tan.webp",
  "icons/containers/chest/chest-reinforced-steel-black.webp": "icons/containers/chest/chest-reinforced-steel-walnut-brown.webp",
  "icons/sundries/misc/key-ornate-iron-black.webp": "icons/sundries/misc/key-short-red.webp",
  "icons/consumables/potions/bottle-round-corked-grey.webp": "icons/commodities/gems/powder-raw-white.webp",
  "icons/equipment/back/cloak-hooded-grey.webp": "icons/equipment/back/cloak-layered-white.webp",
  "icons/commodities/stone/ore-chunk-blue.webp": "icons/commodities/gems/gem-fragments-teal.webp",
  "icons/sundries/lights/lantern-iron-green.webp": "icons/sundries/lights/lantern-iron-lit-yellow.webp",
  "icons/consumables/plants/leaf-herb-green.webp": "icons/consumables/plants/herb-marjoram-basil-oregano-leaf-bunch-green.webp",
  "icons/consumables/candy/candy-wrapped-pink.webp": "icons/magic/control/fear-fright-jackolantern-yellow.webp"
};

/** @param {string} img */
export const iconFor = img => IMG_SUBSTITUTES[img] ?? img ?? "icons/svg/item-bag.svg";

/**
 * Build an item's description HTML from items.json fields.
 * @param {object} src
 * @returns {{value: string, chat: string, unidentified: string}}
 */
function description(src) {
  let html = `<p>${esc(src.description)}</p>`;
  if ( src.dmNote ) html += `<section class="secret ravenmoor-dm-note" id="secret-${src.key}"><p><strong>DM:</strong> ${esc(src.dmNote)}</p></section>`;
  return html;
}

const common = src => ({
  description: { value: description(src), chat: "" },
  source: { custom: "Death at Ravenmoor Manor", book: "", page: "", license: "", rules: "2024", revision: 1 },
  identifier: src.key,
  quantity: src.system?.quantity ?? 1,
  weight: src.system?.weight ?? { value: 0, units: "lb" },
  price: src.system?.price ?? { value: 0, denomination: "gp" },
  rarity: src.system?.rarity ?? "",
  identified: true,
  container: null
});

/**
 * Build the system data for one items.json entry.
 * @param {object} src
 * @returns {{system: object, effects: object[]}}
 */
function systemFor(src) {
  const system = common(src);
  const effects = [];
  const activities = [];
  switch ( src.type ) {
    case "loot":
      system.type = { value: "", subtype: "" };
      break;
    case "container":
      system.capacity = { count: null, volume: { value: null, units: "cubicFoot" }, weight: { value: null, units: "lb" } };
      system.currency = { pp: 0, gp: 0, ep: 0, sp: 0, cp: 0 };
      break;
    case "weapon":
      Object.assign(system, {
        type: src.system.type,
        properties: src.system.properties,
        damage: { base: { ...src.system.damage.base, bonus: "", custom: { enabled: false, formula: "" }, scaling: { number: 1 } } },
        mastery: src.system.mastery,
        range: { value: null, long: null, units: "ft", reach: null },
        equipped: true,
        proficient: null
      });
      activities.push({ ...utilityActivity(`item:${src.key}:attack`), type: "attack",
        attack: { ability: "", bonus: "", critical: { threshold: null }, flat: false,
          type: { value: "melee", classification: "weapon" } },
        damage: { critical: { bonus: "" }, includeBase: true, parts: [] },
        range: { value: "5", units: "ft", special: "", override: false },
        target: { template: { count: "", contiguous: false, type: "", size: "", width: "", height: "", units: "ft" },
          affects: { count: "1", type: "creature", choice: false, special: "" }, prompt: true, override: false }
      });
      delete activities[0].roll;
      break;
    case "consumable":
      system.type = { value: src.system.type.value, subtype: "" };
      system.uses = {
        max: String(src.system.uses.max),
        spent: 0,
        recovery: src.system.uses.recovery ?? [],
        autoDestroy: src.system.uses.autoDestroy
      };
      system.properties = [];
      break;
    case "equipment":
      system.type = { value: src.system.type.value, baseItem: "" };
      break;
  }

  // Item-specific activities.
  if ( src.key === "snuffing-powder" ) {
    activities.push(utilityActivity(`item:${src.key}:snuff`, {
      name: "Snuff the flames", activation: "bonus", range: { value: "60", units: "ft" },
      target: { template: { type: "sphere", size: "20" } }, consumption: ITEM_USE,
      flags: { ravenmoor: { action: "snuffFlames" } }
    }));
  }
  if ( src.key === "treat-candy" ) {
    activities.push(
      utilityActivity(`item:${src.key}:reroll`, { name: "Reroll a d20", activation: "special", consumption: ITEM_USE,
        flags: { ravenmoor: { action: "treatReroll" } } }),
      utilityActivity(`item:${src.key}:d4`, { name: "Add 1d4", activation: "special", consumption: ITEM_USE,
        roll: "1d4", rollName: "Treat Bag: add 1d4", flags: { ravenmoor: { action: "treatAdd" } } }),
      utilityActivity(`item:${src.key}:question`, { name: "Ask a yes-or-no question", activation: "special",
        consumption: ITEM_USE, flags: { ravenmoor: { action: "treatQuestion" } } })
    );
  }
  if ( src.key === "counter-herb" ) {
    const fx = effect(`item:${src.key}:counter-herb`, {
      name: "Counter-Herb",
      img: iconFor(src.img),
      duration: UNTIL_COMBAT_ENDS,
      description: "<p>Advantage on saving throws against Banshee's Breath until the fight ends.</p>",
      flags: { ravenmoor: { counterHerb: true } }
    });
    effects.push(fx);
    activities.push(utilityActivity(`item:${src.key}:chew`, {
      name: "Chew the sprig", activation: "bonus", consumption: ITEM_USE, effects: [{ _id: fx._id }],
      flags: { ravenmoor: { action: "counterHerb" } }
    }));
  }
  system.activities = keyed(activities);
  return { system, effects };
}

/**
 * Elspeth's Lantern: the dnd5e Lantern of Revealing (vendored from dnd5e 6.0.6), renamed.
 * @param {object} src
 * @returns {object}
 */
function lanternOfRevealing(src) {
  const vendored = readJSON("data/vendor/dnd5e/equipment.json").documents.find(d => d.name === src.sourceCompendium.name);
  if ( !vendored ) return null;
  const doc = clone(vendored);
  const originalId = doc._id;
  doc._id = id(`item:${src.key}`);
  doc.name = src.sourceCompendium.rename;
  doc.img = iconFor(src.img);
  doc.system.description.value = `<p><em>${esc(src.description.split(" Fallback rules text")[0])}</em></p>${doc.system.description.value}`
    + `<section class="secret ravenmoor-dm-note" id="secret-${src.key}"><p><strong>DM:</strong> ${esc(src.dmNote)}</p></section>`;
  doc.system.identifier = src.key;
  doc.flags = { ...(doc.flags ?? {}), ravenmoor: { ...src.flags.ravenmoor, key: src.key, light: src.light } };
  doc._stats = { ...stats(), compendiumSource: `Compendium.dnd5e.equipment24.Item.${originalId}` };
  doc.effects = (doc.effects ?? []).map((e, i) => ({ ...e, _id: id(`effect:item:${src.key}:${i}`) }));
  // Activities keep their ids; they only need to be unique within the item.
  return doc;
}

/**
 * Build all compendium items.
 * @returns {Map<string, object>}  Keyed by items.json key.
 */
export function buildItems() {
  const out = new Map();
  for ( const src of readJSON("data/content/items.json").items ) {
    let doc = src.sourceCompendium ? lanternOfRevealing(src) : null;
    if ( !doc ) {
      const { system, effects } = systemFor(src);
      doc = {
        _id: id(`item:${src.key}`),
        name: src.name,
        type: src.type,
        img: iconFor(src.img),
        system,
        effects,
        flags: { ravenmoor: { ...(src.flags?.ravenmoor ?? {}), key: src.key, journalLink: src.journalLink ?? null } },
        folder: null,
        sort: 0,
        ownership: { default: 0 },
        _stats: stats()
      };
    }
    out.set(src.key, doc);
  }
  return out;
}

/**
 * Embedded copy of an item for an actor, with an id unique to that actor.
 * @param {Map<string, object>} items
 * @param {string} key
 * @param {string} ownerKey
 * @param {object} [systemOverrides]
 * @returns {object}
 */
export function embedItem(items, key, ownerKey, systemOverrides={}) {
  const doc = clone(items.get(key));
  doc._id = id(`actor:${ownerKey}:item:${key}`);
  doc.folder = null;
  Object.assign(doc.system, systemOverrides);
  doc._stats = { ...doc._stats, compendiumSource: null };
  doc.flags.ravenmoor = { ...doc.flags.ravenmoor, sourceId: items.get(key)._id };
  // Effect ids stay as they are: activities reference them, and they only need to be unique within the item.
  return doc;
}
