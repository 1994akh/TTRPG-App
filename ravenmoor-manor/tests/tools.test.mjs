/**
 * The GM's tools on their own: map-click actions, item hand-offs, candy, read-aloud, hotbar, Director guards.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { byLabel, createWorld, game, Hooks, loadModule, messages, settle, world } from "./harness.mjs";

const { party, scene } = createWorld({ players: 3 });
const api = await loadModule();
const CONTENT = (await import("../scripts/lib/generated.mjs")).default;
const quillBelow = () => scene.tokens.find(t => t.flags.ravenmoor?.actorKey === "quill" && t.level === CONTENT.ids.levels.below);
const has = (actor, key) => actor.items.some(i => i.flags?.ravenmoor?.key === key);

test("Snuffing Powder (Quill's macro): flames within 20 ft on his floor go out, not the brazier; a use is spent", async () => {
  await quillBelow().update({ hidden: false });
  await byLabel(scene, "lights", "Hallows' brazier")[0].update({ hidden: false });
  world.nextPoint = { x: 4500, y: 1500 };
  await api.snuffingPowder();
  await settle();
  const candelabra = byLabel(scene, "lights", "Crypt candelabra").find(l => l.x === 4460);
  assert.equal(candelabra.hidden, true, "the crypt candelabra 9 ft away goes out");
  assert.equal(byLabel(scene, "lights", "Hallows' brazier")[0].hidden, false, "the magical brazier stays lit");
  assert.equal(byLabel(scene, "lights", "Altar candles")[0].hidden, false, "the chapel candles upstairs are another floor");
  const feature = quillBelow().actor.items.find(i => i.name === "Snuffing Powder" && i.type === "feat");
  assert.equal(feature.system.uses.spent, 1);
});

test("Topple a candelabra: light out, a 10-ft fire region and light, a damage button", async () => {
  const before = scene.regions.size;
  const lit = byLabel(scene, "lights", "Crypt candelabra").find(l => !l.hidden);
  world.nextPoint = { x: 3950, y: 1050 };
  await api.toppleCandelabra();
  assert.equal(lit.hidden, true);
  assert.equal(scene.regions.size, before + 1);
  const fire = scene.regions.find(r => r.flags.ravenmoor?.fire);
  assert.deepEqual([fire.shapes[0].x, fire.shapes[0].y, fire.shapes[0].width], [3900, 1000, 200]);
  assert.ok(byLabel(scene, "lights", "Candelabra fire").length === 1);
  assert.match(messages().at(-1).content, /data-formula="2d6\[fire\]"/);
});

test("Reveal Handout C14 to one player, giving the will: it leaves Quill everywhere", async () => {
  const player = [...game.users.values()].find(u => !u.isGM);
  world.dialogs.push({ card: "C14", all: false, users: [player.id], giveTo: party[0].uuid });
  await api.revealHandout();
  const page = game.journal.get(CONTENT.ids.journals.handouts).pages.get(CONTENT.ids.pages.C14);
  assert.equal(page.ownership[player.id], 2);
  assert.equal(page.ownership.default, 0, "only that player");
  assert.ok(has(party[0], "new-will"));
  assert.ok(!has(game.actors.find(a => a.flags?.ravenmoor?.key === "quill"), "new-will"));
  assert.ok(!has(quillBelow().actor, "new-will"));
});

test("Snatch the will: a winning check takes it from Quill", async () => {
  // Give it back to Quill (the showdown would), then snatch it.
  const party0 = party[0];
  await party0.deleteEmbeddedDocuments("Item", party0.items.filter(i => i.flags?.ravenmoor?.key === "new-will").map(i => i.id));
  const { giveItem } = await import("../scripts/lib/util.mjs");
  await giveItem(quillBelow().actor, "new-will");
  world.rolls.skill = actor => (actor.type === "character" ? 18 : 12);
  canvas.tokens.controlled = [{ actor: party[1] }];
  world.dialogs.push({ pc: "ath", quill: "slt" });
  await api.snatchWill();
  assert.ok(has(party[1], "new-will"));
  assert.ok(!has(quillBelow().actor, "new-will"));
  canvas.tokens.controlled = [];
});

test("Treat Bag candy: reroll the last d20, ask a question the GM answers once", async () => {
  const { onUseActivity, onRenderChatMessage } = await import("../scripts/lib/treats.mjs");
  const hero = party[2];
  await ChatMessage.implementation.create({ speaker: { actor: hero.id }, content: "save", rolls: [new Roll("1d20+3")], flavor: "Wisdom save" });
  await onUseActivity({ actor: hero, flags: { ravenmoor: { action: "treatReroll" } } });
  assert.match(messages().at(-1).flavor, /Treat Bag reroll \(was 10: Wisdom save\)/);
  await onUseActivity({ actor: hero, flags: { ravenmoor: { action: "treatQuestion" } } });
  const card = messages().at(-1);
  const el = document.createElement("div");
  el.innerHTML = card.content;
  onRenderChatMessage(card, el);
  el.querySelector("[data-answer=\"Yes\"]").dispatchEvent(new window.Event("click"));
  await settle();
  assert.match(game.messages.get(card.id).content, /The DM answers: <strong>Yes<\/strong>/);
  assert.ok(!game.messages.get(card.id).content.includes("data-answer"), "buttons removed once answered");
});

test("read-aloud: a GM double-click posts it; not while editing; not from chat", async () => {
  const before = messages().length;
  const box = document.createElement("blockquote");
  box.className = "ravenmoor-readaloud";
  box.innerHTML = "<p>Fog rolls off the moor.</p>";
  document.body.append(box);
  box.dispatchEvent(new window.MouseEvent("dblclick", { bubbles: true }));
  await settle();
  assert.equal(messages().length, before + 1);
  assert.match(messages().at(-1).content, /Fog rolls off the moor/);
  const editor = document.createElement("div");
  editor.setAttribute("contenteditable", "true");
  const inEditor = box.cloneNode(true);
  editor.append(inEditor);
  document.body.append(editor);
  inEditor.dispatchEvent(new window.MouseEvent("dblclick", { bubbles: true }));
  await settle();
  assert.equal(messages().length, before + 1, "editing: no post");
});

test("hotbar: the ten suggested macros in slots 1-10", async () => {
  world.dialogs.push(true);
  await api.setupHotbar();
  const slots = world.log.filter(l => l.hotbar).map(l => [l.hotbar, l.macro]);
  assert.equal(slots.length, 10);
  assert.deepEqual(slots[0], [1, "Ravenmoor Director"]);
  assert.deepEqual(slots.at(-1), [10, "Epilogue"]);
});

test("Director: a beat ticks only on success; a double-click runs once", async () => {
  const { DirectorApp } = await import("../scripts/lib/director.mjs");
  const app = new DirectorApp();
  await app.render();
  // No characters assigned: partyArrives warns and returns, so its beat stays unticked.
  const users = [...game.users.values()].filter(u => !u.isGM);
  const saved = users.map(u => u.character);
  for ( const u of users ) u.character = null;
  const owners = party.map(p => p.ownership);
  for ( const p of party ) p.ownership = { default: 0 };
  await app.click("run", { fn: "partyArrives" });
  assert.equal(game.settings.get("ravenmoor-manor", "beats").partyArrives, undefined);
  users.forEach((u, i) => (u.character = saved[i]));
  party.forEach((p, i) => (p.ownership = owners[i]));
  // Two clicks at once: Introduce the Suspects posts one card.
  const before = messages().filter(m => m.content?.includes("the household")).length;
  await Promise.all([app.click("run", { fn: "introduceSuspects" }), app.click("run", { fn: "introduceSuspects" })]);
  assert.equal(messages().filter(m => m.content?.includes("the household")).length, before + 1);
  assert.equal(game.settings.get("ravenmoor-manor", "beats").introduceSuspects, true);
});

test("no errors reported; every dialog answer used", () => {
  assert.deepEqual(world.notifications.filter(n => n.error), []);
  assert.equal(world.dialogs.length, 0);
  void Hooks;
});
