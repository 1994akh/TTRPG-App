import { test, beforeEach } from "node:test";
import assert from "node:assert/strict";
import { chat, dice, hooks, registerModels, reset, setSetting, warnings } from "./runtime.mjs";

await registerModels();
const { PossibilitiesActor } = await import("../module/documents.mjs");
globalThis.Actor = PossibilitiesActor;
const D = await import("../module/dice.mjs");
const S = await import("../module/scenes.mjs");
const G = await import("../module/dialogs.mjs");

const hero = (name, system, items=[]) => {
  const a = new PossibilitiesActor({ name, type: "hero", system, items });
  game.actors.set(a.id, a);
  return a;
};
const tova = () => hero("Tova", { race: "Trollblood", profession: { node: "Sailor", rank: "Novice" }, hp: { value: 6 },
  training: { weapon: "Trained", skills: { Athletics: "Trained" } } },
  [{ name: "Loaner blade", type: "weapon", system: { die: "d6", equipped: true, loaned: true } },
   { name: "Pry bar", type: "weapon", system: { die: "d6", improvised: true, tools: "Tinker", loaned: true } }]);
const last = () => chat.at(-1).content;

beforeEach(() => reset());

test("a check posts the readout with the degree, and spends Aid", async () => {
  const a = tova();
  await a.update({ "system.turn.aid": 2 });
  dice.push(14);
  const r = await D.rollCheck(a, { label: "Athletics", mod: 5, dc: 19 });
  assert.equal(r.total, 21); assert.equal(r.degree, 2);
  assert.match(last(), /14 \+ 7 = 21 vs DC 19 · Success/);
  assert.equal(a.system.turn.aid, 0);
});

test("enter my own rolls: the setting asks, and the entered natural die is used", async () => {
  setSetting("manualRolls", true);
  globalThis.foundry.applications.api = { DialogV2: { wait: async () => 20 } };
  const a = tova();
  const r = await D.rollCheck(a, { label: "x", mod: 0, dc: 25 });
  assert.equal(r.natural, 20); assert.equal(r.total, 20); assert.equal(r.degree, 2, "nat 20 lifts a failure");
  globalThis.foundry.applications.api.DialogV2.wait = async () => null; // "Roll for me"
  dice.push(3);
  const r2 = await D.rollCheck(a, { label: "x", mod: 0 });
  assert.equal(r2.natural, 3);
});

test("Strike spends an action, applies MAP, rolls damage on a hit, and the improvised penalty", async () => {
  const a = tova();
  const rat = new PossibilitiesActor({ name: "Rat", type: "npc", system: { el: 0, role: "minion", hp: { value: 5 } } });
  game.actors.set(rat.id, rat);
  const blade = a.items.find(i => i.name === "Loaner blade");
  dice.push(15, 4);
  let r = await D.strike(a, blade, { target: rat });
  assert.equal(a.system.turn.actions, 2); assert.equal(a.system.turn.attacks, 1);
  assert.equal(r.dc, 15); assert.equal(r.degree, 2);
  assert.match(last(), /Damage <b>\d+<\/b>/);
  dice.push(15);
  r = await D.strike(a, blade, { target: rat });
  assert.equal(r.mod, a.system.derived.attack - 4, "second attack at -4");
  const bar = a.items.find(i => i.name === "Pry bar");
  assert.equal(a.system.derived.weapons[bar.id].attackMod, -2);
  assert.match(a.system.derived.weapons[bar.id].formula, /^1d4/);
  dice.push(10);
  r = await D.strike(a, bar, { target: rat });
  assert.equal(r.mod, a.system.derived.attack - 8 - 2, "third attack -8, improvised -2");
  assert.equal(a.system.turn.actions, 0);
  dice.push(10);
  await D.strike(a, bar, { target: rat });
  assert.ok(warnings.some(w => w.includes("NoActions")), "a soft warning, not a block");
});

test("damage drops a hero to Dying; recovery checks; Stabilise; healing", async () => {
  const a = tova();
  await D.applyDamage(a, 10);
  assert.equal(a.system.hp.value, 0); assert.equal(a.system.dying.active, true);
  dice.push(2);
  assert.equal(await D.recoveryCheck(a), "worse");
  assert.equal(a.system.dying.value, 1);
  const b = hero("Rook", { race: "Corvine", profession: { node: "Cartographer", rank: "Novice" } });
  await D.stabilise(b, a);
  assert.equal(a.system.dying.active, false); assert.equal(a.system.dying.stable, true); assert.equal(a.system.dying.wounded, 1);
  await D.applyDamage(a, -3);
  assert.equal(a.system.hp.value, 3); assert.equal(a.system.dying.stable, false);
  await D.applyDamage(a, 5);
  assert.equal(a.system.dying.value, 1, "Wounded: starts with a failed pip");
  dice.push(1, 1);
  await D.recoveryCheck(a);
  assert.equal(await D.recoveryCheck(a), "dead");
  assert.ok(a.statuses.has("dead"));
  assert.match(last(), /Defeated/, "Undertaking off: Defeated, not dead");
  await D.rest(a, "long");
  assert.equal(a.system.hp.value, a.system.derived.hpMax); assert.equal(a.system.dying.dead, false);
});

test("a Scene: aptness, effort off Resistance, Setbacks damage loaned gear, the clock, the win hook", async () => {
  const enkrid = hero("Enkrid", { race: "Wendlin", profession: { node: "Tinker", rank: "Novice" }, training: { skills: { Crafting: "Trained" } } },
    [{ name: "Loaner lamp", type: "gear", system: { loaned: true } }]);
  const scene = new PossibilitiesActor({ name: "Into the light", type: "obstacle", system: {
    resistance: { value: 6, max: 20 }, el: 0,
    approaches: [{ label: "Angle the light", skill: "Crafting", full: ["Tinker"], half: [], none: [], default: "half", setbackOnFail: true }],
    setbacks: [{ label: "It lashes out", text: "Teeth.", damage: "1d4", gearDamage: true }],
    clock: { value: 0, max: 3, label: "The sun" } } });
  game.actors.set(scene.id, scene);
  assert.equal(S.aptness(enkrid, scene.system.approaches[0]), "full");
  dice.push(3);  // failure (3 + mod < 12) → Setback
  let r = await S.attemptScene(enkrid, scene, 0);
  assert.equal(r.setback, true);
  assert.equal(enkrid.items.find(i => i.name === "Loaner lamp").system.condition, "damaged");
  dice.push(19, 8); // success with effort 8 → Resistance 6 → 0, won
  r = await S.attemptScene(enkrid, scene, 0);
  assert.equal(scene.system.resistance.value, 0); assert.equal(scene.system.status, "won");
  assert.ok(hooks.some(h => h.name === "possibilities.sceneResolved" && h.args[1] === true));
  await scene.update({ "system.status": "active", "system.resistance.value": 20 });
  await S.advanceClock(scene); await S.advanceClock(scene);
  assert.ok(chat.some(c => /Setback: It lashes out/.test(c.content)), "the clock moving brings a Setback");
  await S.advanceClock(scene);
  assert.equal(scene.system.status, "lost");
  assert.ok(hooks.some(h => h.name === "possibilities.sceneResolved" && h.args[1] === false));
});

test("the creator makes an Unclassed hero; binding uses the trio's story path", async () => {
  const pc = await G.makeHero({ name: "Wren", race: "Human", profession: "Herbalist", chosen: ["Stealth", "Insight", "Arcana", "Nature"] });
  assert.equal(pc.system.unclassed, true); assert.equal(pc.system.derived.combatEL, 0);
  const trained = Object.entries(pc.system.training.skills).filter(([, r]) => r === "Trained").map(([k]) => k);
  assert.ok(trained.includes("Persuasion") && trained.includes("Stealth") && trained.includes("Arcana"));
  assert.ok(!trained.includes("Nature"), "Human: 2 + 1 extra skills only");
  const enkrid = hero("Enkrid", { race: "Wendlin", profession: { node: "Tinker", rank: "Novice" }, story: { role: "trio", path: { class: ["Bloodcharged", "Overcharged"], profession: ["Tinker"] } } });
  const node = await G.bind(enkrid);
  assert.equal(node, "Bloodcharged");
  assert.equal(enkrid.system.derived.combatEL, 1);
  assert.equal(enkrid.system.hp.value, enkrid.system.derived.hpMax);
  assert.ok(enkrid.items.some(i => i.type === "signature" && i.name === "Charge Tap"));
  assert.ok(enkrid.items.some(i => i.type === "feature" && i.name === "Second Breath"));
  assert.ok(hooks.some(h => h.name === "possibilities.bound"));
});

test("short rest spends hit dice", async () => {
  const a = hero("Tova", { race: "Trollblood", class: { node: "Vanguard", rank: "Novice" }, profession: { node: "Sailor", rank: "Novice" }, hp: { value: 1 } });
  dice.push(7);
  await D.rest(a, "short", 1);
  assert.ok(a.system.hp.value > 1); assert.equal(a.system.hitDiceUsed, 1);
  await D.rest(a, "short", 1);
  assert.ok(warnings.some(w => w.includes("NoDice")));
});
