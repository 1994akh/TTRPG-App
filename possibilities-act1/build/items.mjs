/**
 * Act 1's items (system `possibilities` item types weapon / armour / gear). World items carry
 * flags["possibilities-act1"].key so the runtime can copy them onto heroes (loaners at the commission, kits, shop).
 */
import { byId, resolve } from "./lore.mjs";
import { IDS } from "./keys.mjs";
import { esc, OWNERSHIP, readJSON, SCOPE, slug, stats } from "./util.mjs";

export const ITEMS = readJSON("data/act1/items.json");

const IMG = {
  weapon: "icons/weapons/swords/sword-guard-brown.webp",
  armour: "icons/equipment/chest/coat-leather-brown.webp",
  gear: "icons/containers/bags/pack-simple-leather-brown.webp",
  charge_lamp: "icons/sundries/lights/lantern-iron-lit-yellow.webp",
  pry_bar: "icons/tools/hand/pickaxe-steel-white.webp",
  pocket_watch: "icons/tools/scribal/pocketwatch-gold.webp",
  sellswords_journal: "icons/sundries/books/book-worn-brown.webp"
};

/** system data for one item description from items.json. */
export function systemFor(d, { loaned=false }={}) {
  const common = { grade: "F", price: d.price ?? { value: 0, denom: "gp" }, loaned, condition: "intact",
    description: d.description ? `<p>${esc(resolve(d.description))}</p>` : "" };
  if ( d.type === "weapon" ) {
    return { ...common, die: d.die, range: d.range ?? "engaged", traits: d.traits ?? "", equipped: false, damage: "",
      improvised: !!d.improvised, tools: d.tools ?? "" };
  }
  if ( d.type === "armour" ) return { ...common, armourType: d.armourType, bonus: d.bonus ?? 0, equipped: false };
  return { ...common, quantity: d.quantity ?? 1, keyItem: !!d.keyItem };
}

export function itemDoc(key, d, { loaned=false, flags={}, folder=null }={}) {
  return {
    _id: IDS.item(key), name: d.name, type: d.type,
    img: IMG[d.key] ?? IMG[d.type] ?? IMG.gear, system: systemFor(d, { loaned }),
    effects: [], folder, sort: 0, ownership: { default: OWNERSHIP.NONE },
    flags: { [SCOPE]: { key, ...flags } }, _stats: stats()
  };
}

/** @returns {Map<string, object>} item key -> world item */
export function buildItems() {
  const out = new Map();
  for ( const d of ITEMS.loaners ) out.set(d.key, itemDoc(d.key, d, { loaned: true, flags: { loaner: true, count: d.count } }));
  for ( const d of ITEMS.key ) {
    const desc = [d.lore ? (byId.terms[d.lore]?.text ?? []).join(" ") : d.description, d.engraving].filter(Boolean).join(" ");
    out.set(d.key, itemDoc(d.key, { ...d, description: desc }, { flags: { keyItem: true, holder: d.holder ?? null, handout: d.handout ?? null } }));
  }
  for ( const kit of ITEMS.kits ) {
    kit.contents.forEach((d, i) => {
      const key = `${kit.key}_${i}`;
      out.set(key, itemDoc(key, d, { flags: { kit: kit.key, kitName: kit.name } }));
    });
  }
  for ( const d of ITEMS.shop ) {
    const key = `shop_${slug(d.name)}`;
    out.set(key, itemDoc(key, d, { flags: { shop: true } }));
  }
  return out;
}
