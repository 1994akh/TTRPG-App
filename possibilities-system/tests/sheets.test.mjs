import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import Handlebars from "handlebars";
import { registerModels, reset } from "./runtime.mjs";
import { ROOT } from "./util.mjs";

// Minimal ApplicationV2 stand-ins: enough for the sheets' _prepareContext and their templates.
class FakeSheet {
  constructor({ document }) { this.document = document; this.isEditable = true; this.tabGroups = {}; }
  async _prepareContext() { return {}; }
  _prepareTabs(group) {
    const cfg = this.constructor.TABS[group];
    return Object.fromEntries(cfg.tabs.map(t => [t.id, { ...t, group, active: t.id === cfg.initial, cssClass: t.id === cfg.initial ? "active" : "", label: `${cfg.labelPrefix}.${t.id}` }]));
  }
}
globalThis.foundry.applications.api = { HandlebarsApplicationMixin: B => class extends B {}, DialogV2: {} };
globalThis.foundry.applications.sheets = { ActorSheetV2: FakeSheet, ItemSheetV2: FakeSheet };

const lang = JSON.parse(fs.readFileSync(path.join(ROOT, "lang/en.json"), "utf8"));
const L = k => k.split(".").reduce((o, x) => o?.[x], lang);
Handlebars.registerHelper("localize", k => { const v = L(k); if ( typeof v !== "string" ) throw new Error(`missing ${k}`); return v; });
Handlebars.registerHelper("concat", (...a) => a.slice(0, -1).join(""));
Handlebars.registerHelper("object", opts => opts.hash);
Handlebars.registerHelper("checked", v => (v ? "checked" : ""));
Handlebars.registerHelper("selectOptions", (choices, opts) => new Handlebars.SafeString(Object.entries(choices ?? {})
  .map(([k, v]) => `<option value="${k}" ${k === String(opts.hash.selected) ? "selected" : ""}>${v}</option>`).join("")));
Handlebars.registerHelper("possSigned", n => (n === null || n === undefined) ? "—" : (n >= 0 ? `+${n}` : `${n}`));
Handlebars.registerHelper("possEq", (a, b) => a === b);
Handlebars.registerHelper("possOr", (...a) => a.slice(0, -1).some(Boolean));

await registerModels();
const { PossibilitiesActor, PossibilitiesItem } = await import("../module/documents.mjs");
const { HeroSheet, NpcSheet, ObstacleSheet, PossibilitiesItemSheet } = await import("../module/sheets.mjs");

async function render(Sheet, doc) {
  const sheet = new Sheet({ document: doc });
  const ctx = await sheet._prepareContext({});
  let html = "";
  for ( const part of Object.values(Sheet.PARTS) ) {
    const file = part.template.replace("systems/possibilities/", "");
    html += Handlebars.compile(fs.readFileSync(path.join(ROOT, file), "utf8"), { strict: false })(ctx);
  }
  return html;
}

test("every sheet builds its context and renders its templates", async () => {
  reset();
  game.i18n.localize = k => L(k) ?? k;
  const hero = new PossibilitiesActor({ name: "Enkrid", type: "hero", system: {
    race: "Wendlin", class: { node: "Bloodcharged", rank: "Novice" }, profession: { node: "Tinker", rank: "Novice" },
    story: { role: "trio", path: { class: ["Bloodcharged", "Overcharged"], profession: ["Tinker", "Engineer"] } },
    dying: { active: true, value: 1 }, details: { eyes: "storm grey", bonds: "<p>The watch.</p>", languages: "Common, Fae cant" } },
  items: [{ name: "Wrench", type: "weapon", system: { die: "d6", improvised: true, tools: "Tinker", equipped: true, loaned: true } },
    { name: "Charge Tap", type: "signature", system: { cost: "1 action", points: 1, effect: "Zap." } },
    { name: "Lamp", type: "gear", system: { loaned: true, condition: "damaged" } }] });
  game.actors.set(hero.id, hero);
  const h = await render(HeroSheet, hero);
  for ( const s of ["Combat EL", "Craft EL", "Bloodcharged", "Overcharged", "Wrench", "tool", "Charge Tap", "Loaned", "Damaged", "Gold crowns", "Dying", "Athletics", "storm grey", "The watch.", "Fae cant", "Allies &amp; organisations", "Ideals"] ) {
    assert.ok(h.includes(s), `hero sheet shows ${s}`);
  }
  const unclassed = new PossibilitiesActor({ name: "Wren", type: "hero", system: { race: "Human", profession: { node: "Herbalist", rank: "Novice" } } });
  assert.ok((await render(HeroSheet, unclassed)).includes("Bind (choose a class)"));

  const npc = new PossibilitiesActor({ name: "Old Gnaw", type: "npc", system: { el: 1, role: "elite" }, items: [{ name: "Bite", type: "weapon", system: { damage: "1d6 + 1" } }] });
  const n = await render(NpcSheet, npc);
  assert.ok(n.includes("Old Gnaw") && n.includes("1d6 + 1") && n.includes("(21)"));

  const scene = new PossibilitiesActor({ name: "Into the light", type: "obstacle", system: {
    resistance: { value: 10, max: 20 }, clock: { value: 1, max: 4, label: "The sun" },
    approaches: [{ label: "Angle the light", skill: "Crafting", full: ["Tinker"], default: "half" }],
    setbacks: [{ label: "Lash", text: "Teeth", damage: "1d4", gearDamage: true }] } });
  const sc = await render(ObstacleSheet, scene);
  assert.ok(sc.includes("Angle the light") && sc.includes("apt-full") && sc.includes("The sun") && sc.includes("Lash"));
  const ed = new ObstacleSheet({ document: scene }); ed._editing = true;
  const ectx = await ed._prepareContext({});
  assert.ok(Handlebars.compile(fs.readFileSync(path.join(ROOT, "templates/actor/obstacle.hbs"), "utf8"))(ectx).includes('name="system.approaches.0.full" value="Tinker"'));

  for ( const [type, system] of [["weapon", {}], ["armour", {}], ["gear", {}], ["signature", {}], ["spell", {}], ["feature", {}], ["race", { ruleId: "Corvine" }], ["class", { ruleId: "Vanguard" }], ["profession", { ruleId: "Sailor" }]] ) {
    const item = new PossibilitiesItem({ name: type, type, system });
    const html = await render(PossibilitiesItemSheet, item);
    assert.ok(html.includes(type), `${type} sheet`);
  }
});
