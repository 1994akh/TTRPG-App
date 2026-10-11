/**
 * The whole night, in order, against the simulated world: arrival, the masque, the investigation with all twelve
 * candles, the accusation, the showdown with every lair round, the unmasking and the epilogue.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { asUser, byLabel, createWorld, game, Hooks, loadModule, messages, settle, world } from "./harness.mjs";

const { party, scene } = createWorld({ players: 5 });
const api = await loadModule();
const CONTENT = (await import("../scripts/lib/generated.mjs")).default;
const levels = CONTENT.ids.levels;
const lastCard = () => messages().at(-1);
const cardsWith = text => messages().filter(m => m.content?.includes(text));
const actorByKey = key => game.actors.find(a => a.flags?.ravenmoor?.key === key);
const tokens = key => scene.tokens.filter(t => (t.flags?.ravenmoor?.actorKey ?? t.actor?.flags?.ravenmoor?.key) === key);
const setting = key => game.settings.get("ravenmoor-manor", key);
const candy = actor => actor.items.filter(i => i.flags?.ravenmoor?.key === "treat-candy").reduce((n, i) => n + i.system.quantity, 0);

/** Render a chat message into the DOM and wire its buttons, like Foundry's renderChatMessageHTML hook. */
function renderMessage(message) {
  const el = document.createElement("div");
  el.innerHTML = message.content;
  Hooks.callAll("renderChatMessageHTML", message, el, {});
  return el;
}

/** Click a button in a rendered message and let its async handler finish. */
async function click(el, selector) {
  const button = el.querySelector(selector);
  assert.ok(button, `button ${selector}`);
  button.dispatchEvent(new window.Event("click"));
  await settle(120);
}

test("start-up: settings, keybindings, welcome card once", async () => {
  assert.equal(setting("act"), "act1");
  assert.deepEqual(game.keybindings.registered.map(k => k.action).sort(), ["director", "snuff"]);
  assert.equal(cardsWith("Ravenmoor Manor is ready").length, 1);
  assert.equal(setting("welcomed"), true);
});

test("Director opens; candle status reads 'not lit yet' in Act 1", async () => {
  await api.openDirector();
  assert.ok(world.log.some(l => l.rendered === "ravenmoor-director"));
  const { DirectorApp } = await import("../scripts/lib/director.mjs");
  const app = new DirectorApp();
  await app.render();
  assert.match(app.element.textContent, /Candles: not lit yet/);
  assert.ok(app.element.querySelectorAll("button.run").length >= 25);
});

test("party arrives at the drive", async () => {
  assert.equal(await api.partyArrives(), true);
  const placed = scene.tokens.filter(t => party.some(p => p.id === t.actorId));
  assert.equal(placed.length, 5);
  assert.ok(placed.every(t => t.level === levels.ground));
  assert.ok(placed.every(t => t.y >= 3200 && t.y <= 3500), "on the drive");
  assert.equal(new Set(placed.map(t => `${t.x},${t.y}`)).size, 5, "no two tokens on one square");
  // Running it again moves, never duplicates.
  await api.partyArrives();
  assert.equal(scene.tokens.filter(t => party.some(p => p.id === t.actorId)).length, 5);
});

test("Treat Bag: two candy each, once", async () => {
  assert.equal(await api.treatBagSetup(), true);
  await api.treatBagSetup();
  assert.ok(party.every(p => candy(p) === 2));
});

test("introduce the suspects: six portraits in Handout 2's order", async () => {
  assert.equal(await api.introduceSuspects(), true);
  const card = lastCard().content;
  assert.equal((card.match(/<figure class="ravenmoor-suspect">/g) ?? []).length, 6);
  assert.ok(card.indexOf("Lady Morwenna") < card.indexOf("Mrs. Agatha Crane"));
  assert.ok(card.includes("assets/portraits/quill-masked.webp"));
});

test("Silas retires: study door locked, Silas in his chair upstairs", async () => {
  await api.silasRetires();
  assert.equal(byLabel(scene, "walls", "East Corridor / Study")[0].ds, 2);
  const silas = tokens("silas").find(t => !t.flags.ravenmoor.body);
  assert.equal(silas.level, levels.upper);
  assert.deepEqual([silas.x, silas.y, silas.elevation], [3500, 900, 20]);
});

test("Lights out: hall candles out (radii kept), foxfire, fright card", async () => {
  const hall = scene.lights.filter(l => l.flags.ravenmoor.group === "hall_candles");
  const radii = hall.map(l => l.config.dim);
  const lightsBefore = scene.lights.size;
  await api.lightsOut();
  assert.ok(hall.every(l => l.hidden), "every hall candle hidden");
  assert.deepEqual(hall.map(l => l.config.dim), radii, "radii restored for relighting");
  assert.equal(scene.lights.size, lightsBefore, "the Widow's temporary lantern is removed");
  assert.equal(byLabel(scene, "tiles", "C4 foxfire smears")[0].hidden, false);
  const card = lastCard();
  assert.equal(card.flags["ravenmoor-manor"].type, "save");
  assert.equal((card.content.match(/data-row=/g) ?? []).length, 5, "one row per character");
});

test("Scaredy-Cat: frightened for a minute outside combat, a candy, once per row", async () => {
  const card = lastCard();
  const hero = party[0];
  const stale = renderMessage(card);
  await click(stale, `li[data-row="0"] [data-ravenmoor="scaredy"]`);
  assert.equal(candy(hero), 3);
  const fright = hero.effects.find(e => e.statuses?.includes("frightened"));
  assert.ok(fright?.flags.ravenmoor.expiresAt, "outside combat it expires after a minute");
  assert.ok(game.messages.get(card.id).flags["ravenmoor-manor"].done["0"], "row recorded on the card");
  // The re-rendered card has no buttons on that row, and clicking the stale copy again does nothing.
  assert.equal(renderMessage(game.messages.get(card.id)).querySelector(`li[data-row="0"] button`), null);
  await click(stale, `li[data-row="0"] [data-ravenmoor="scaredy"]`);
  assert.equal(candy(hero), 3, "no second candy");
  // Another character's row still works: a rolled save (fixed at 10) fails DC 13.
  await click(stale, `li[data-row="1"] [data-ravenmoor="save"]`);
  assert.equal(game.messages.get(card.id).flags["ravenmoor-manor"].done["1"], "failed (10)");
  assert.ok(party[1].effects.some(e => e.statuses?.includes("frightened")));
  // The GM's expiry check removes it once the minute is up (server time).
  game.time.serverTime += 61_000;
  const { expireScares } = await import("../scripts/lib/treats.mjs");
  await expireScares();
  assert.equal(hero.effects.filter(e => e.flags?.ravenmoor?.fright).length, 0);
  assert.equal(party[1].effects.filter(e => e.flags?.ravenmoor?.fright).length, 0);
});

test("chat API buttons only work on GM-written cards and safe actions", async () => {
  const player = [...game.users.values()].find(u => !u.isGM);
  const forged = await asUser(player, () => ChatMessage.implementation.create({
    content: "<div><button data-ravenmoor=\"api\" data-fn=\"epilogue\">x</button></div>", flags: { "ravenmoor-manor": { type: "x" } }
  }));
  await click(renderMessage(forged), "[data-ravenmoor=\"api\"]");
  assert.equal(setting("act"), "act1", "a player's forged button cannot run the epilogue");
});

test("The Body: Silas's body, evidence, open door, Handout 2, twelve candles, Act 2", async () => {
  await api.theBody();
  assert.equal(tokens("silas").find(t => !t.flags.ravenmoor.body).hidden, true);
  assert.equal(tokens("silas").find(t => t.flags.ravenmoor.body).hidden, false);
  for ( const t of ["C2 wet footprints", "Scattered lilies", "C5 buckled boot print"] ) assert.equal(byLabel(scene, "tiles", t)[0].hidden, false, t);
  assert.equal(byLabel(scene, "walls", "East Corridor / Study")[0].ds, 1);
  const h2 = game.journal.get(CONTENT.ids.journals.handouts).pages.get(CONTENT.ids.pages.H2);
  assert.equal(h2.ownership.default, 2);
  assert.ok(world.shown.some(s => s.uuid === h2.uuid));
  assert.equal(setting("candlesLit"), 12);
  assert.equal(setting("candlesVisible"), true);
  assert.equal(setting("act"), "act2");
});

test("Reveal Handout: an empty player list reveals nothing", async () => {
  world.dialogs.push({ card: "C1", all: false, users: [], giveTo: "" });
  await api.revealHandout();
  const c1 = game.journal.get(CONTENT.ids.journals.handouts).pages.get(CONTENT.ids.pages.C1);
  assert.equal(c1.ownership.default, 0);
  assert.ok(world.notifications.some(n => n.warn?.includes("at least one player")));
});

test("C3 opens the secret door and the hidden stair; the tracker page ticks", async () => {
  const stair = scene.regions.get(CONTENT.ids.stairs["hidden-stair"]);
  assert.ok(stair.behaviors.contents.every(b => b.disabled));
  await api.revealCard("C3");
  assert.equal(byLabel(scene, "walls", "Bookcase (secret door)")[0].door, 1);
  assert.equal(byLabel(scene, "walls", "Hidden door behind Elspeth's tomb")[0].door, 1);
  assert.ok(stair.behaviors.contents.every(b => !b.disabled));
  const tracker = game.journal.get(CONTENT.ids.journals.handouts).pages.get(CONTENT.ids.pages["clue-tracker"]);
  assert.match(tracker.text.content, /☑ @UUID\[[^\]]+\]\{C3\}/);
});

test("ready to accuse: whispered once at three pieces of Quill evidence", async () => {
  const { setClue } = await import("../scripts/lib/handouts.mjs");
  for ( const id of ["T-crane", "T-quill-mint", "T-quill-nails", "H5"] ) await setClue(id, true);
  await settle(120);
  assert.equal(cardsWith("They are ready to accuse.").length, 1);
});

test("Twelve Candles: escalations at 4, 8, 11; key planted; Fennick once; Midnight at 12", async () => {
  const quill = actorByKey("quill");
  const edric = actorByKey("edric");
  assert.ok(quill.items.some(i => i.flags.ravenmoor.key === "lockbox-key"));
  // Two clicks at once count once.
  await Promise.all([api.snuffCandle(), api.snuffCandle()]);
  assert.equal(setting("candlesLit"), 11);
  for ( let i = 0; i < 10; i++ ) await api.snuffCandle();
  assert.equal(setting("candlesLit"), 1);
  for ( const n of [4, 8, 11] ) assert.equal(cardsWith(`Escalation · Candle ${n}:`).length, 1, `escalation ${n}`);
  assert.ok(!quill.items.some(i => i.flags.ravenmoor.key === "lockbox-key"), "key gone from Quill");
  assert.ok(edric.items.some(i => i.flags.ravenmoor.key === "lockbox-key"), "key in Edric's coat");
  assert.equal(tokens("fennick").length, 1);
  // Candle 12: the bell and the accusation (the party names who and why).
  world.dialogs.push({ who: true, how: false, why: true });
  await api.snuffCandle();
  assert.equal(setting("candlesLit"), 0);
  assert.equal(setting("act"), "act3");
  assert.equal(byLabel(scene, "lights", "Hallows' brazier")[0].hidden, false);
  assert.equal(byLabel(scene, "tiles", "Green brazier fire")[0].hidden, false);
  assert.deepEqual(setting("edges"), { who: true, how: false, why: true });
  assert.equal(tokens("fennick").length, 1, "Fennick is not placed twice");
});

test("Showdown Setup (five characters): party below, foes, edges, combat", async () => {
  await game.settings.set("ravenmoor-manor", "partySize", 5);
  await api.showdownSetup();
  const below = levels.below;
  const pcs = scene.tokens.filter(t => party.some(p => p.id === t.actorId));
  assert.ok(pcs.every(t => t.level === below && t.elevation === -20));
  const skeletons = tokens("skeleton");
  const squares = new Set(skeletons.map(t => `${t.x},${t.y}`));
  assert.ok(pcs.every(t => !squares.has(`${t.x},${t.y}`)), "no character starts on a skeleton");
  const quillBelow = tokens("quill").find(t => t.level === below);
  assert.equal(quillBelow.hidden, false);
  assert.equal(quillBelow.disposition, -1);
  assert.ok(tokens("quill").filter(t => t.level !== below).every(t => t.hidden), "Quill has left the ground floor");
  const scarecrows = tokens("scarecrow");
  assert.equal(scarecrows.filter(t => t.disposition === -1).length, 1, "one scarecrow fights with five characters");
  assert.equal(scarecrows.filter(t => t.disposition === 0 && t.name === "Scarecrow").length, 1, "the other stays a prop");
  assert.ok(party.every(p => p.effects.some(e => e.flags?.ravenmoor?.edge === "who")), "Who edge on everyone");
  assert.ok(party.every(p => !p.items.some(i => i.flags.ravenmoor.key === "counter-herb")), "no How edge, no herb");
  assert.equal(tokens("edric").filter(t => t.flags.ravenmoor.why).length, 1, "Why: Edric at the coffins");
  const combat = game.combats.find(c => c.flags.ravenmoor?.showdown);
  const bell = combat.combatants.find(c => c.flags.ravenmoor?.bell);
  assert.equal(bell.initiative, 19.99);
  assert.equal(bell.hidden, true);
  const skel = combat.combatants.filter(c => c.flags.ravenmoor?.skeleton);
  assert.equal(skel.length, 4);
  assert.equal(new Set(skel.map(c => c.initiative)).size, 1, "skeletons share one count");
  assert.ok(itemsOf(quillBelow.actor, "new-will"), "Quill holds the will");
});

function itemsOf(actor, key) {
  return actor.items.some(i => i.flags?.ravenmoor?.key === key);
}

test("Showdown Setup again: replaces, never stacks", async () => {
  world.dialogs.push(true);
  await api.showdownSetup();
  assert.equal(game.combats.filter(c => c.flags.ravenmoor?.showdown).length, 1);
  assert.equal(tokens("edric").filter(t => t.flags.ravenmoor.why).length, 1);
});

test("lair rounds: once per round, Why stops round 1, round 3 lists creatures within 10 ft", async () => {
  const combat = game.combats.find(c => c.flags.ravenmoor?.showdown);
  const bell = combat.combatants.find(c => c.flags.ravenmoor?.bell);
  Object.assign(combat, { started: true, round: 1, turn: 3, currentId: bell.id });
  Hooks.callAll("updateCombat", combat, { round: 1 });
  await settle(120);
  assert.equal(setting("lairRound"), 1);
  assert.match(lastCard().content, /Edric and Bramwell lean on them/);
  // The turn index shifts (combatants re-sorted) while the bell is still current: no second lair action.
  Object.assign(combat, { turn: 5 });
  Hooks.callAll("updateCombat", combat, { turn: 5 });
  await settle(120);
  assert.equal(setting("lairRound"), 1);
  // Round 2: fright card. Round 3: the brazier.
  Object.assign(combat, { round: 2 });
  Hooks.callAll("updateCombat", combat, { round: 2 });
  await settle(120);
  assert.equal(setting("lairRound"), 2);
  assert.equal(lastCard().flags["ravenmoor-manor"].fright, true);
  // Put Quill next to the brazier (square 45,13) and a character two squares away; one character far off.
  const quillBelow = tokens("quill").find(t => t.level === levels.below);
  await quillBelow.update({ x: 4400, y: 1300 });
  const pcs = scene.tokens.filter(t => party.some(p => p.id === t.actorId));
  await pcs[0].update({ x: 4300, y: 1100 });
  await pcs[1].update({ x: 3900, y: 1700 });
  Object.assign(combat, { round: 3 });
  Hooks.callAll("updateCombat", combat, { round: 3 });
  await settle(120);
  assert.equal(setting("lairRound"), 3);
  assert.equal(setting("willBurnable"), true);
  const dexCard = cardsWith("Dexterity saving throw, DC 13").at(-1).content;
  assert.ok(dexCard.includes(pcs[0].actor.name), "two squares from the brazier is within 10 ft");
  assert.ok(!dexCard.includes(`>${pcs[1].actor.name}<`), "far away is not");
  assert.ok(dexCard.includes("Dr. Thaddeus Quill"), "Quill, adjacent, saves too");
});

test("two skeletons on one save card can both be recorded", async () => {
  const { markRow, postSaveRequest } = await import("../scripts/lib/treats.mjs");
  const skels = tokens("skeleton").slice(0, 2).map(t => t.actor);
  const card = await postSaveRequest({ title: "t", ability: "dex", dc: 13, actors: skels });
  await markRow({ messageId: card.id, actorUuid: skels[0].uuid, rowId: "0", text: "saved (14)" });
  await markRow({ messageId: card.id, actorUuid: skels[1].uuid, rowId: "1", text: "failed (8)" });
  const done = game.messages.get(card.id).flags["ravenmoor-manor"].done;
  assert.deepEqual(done, { 0: "saved (14)", 1: "failed (8)" });
});

test("Quill's turn by the brazier: offered the burn; burning removes every copy", async () => {
  const combat = game.combats.find(c => c.flags.ravenmoor?.showdown);
  const quillCombatant = combat.combatants.find(c => c.token?.flags?.ravenmoor?.actorKey === "quill");
  world.dialogs.push(true);
  Object.assign(combat, { turn: 1, currentId: quillCombatant.id });
  Hooks.callAll("updateCombat", combat, { turn: 1 });
  await settle(120);
  assert.equal(setting("willBurned"), true);
  assert.ok(!itemsOf(quillCombatant.actor, "new-will"));
  assert.ok(!itemsOf(actorByKey("quill"), "new-will"), "base actor too");
  assert.ok(tokens("quill").every(t => !itemsOf(t.actor, "new-will")), "and the hidden ground-floor token");
  await api.snatchWill();
  assert.ok(world.notifications.some(n => n.warn === "The will has already burned." || n.warn?.includes("Select the character")));
});

test("the Widow rises once below half HP; Quill unmasks at 30", async () => {
  world.rolls.save = (actor, config) => (actor.name === "Dr. Thaddeus Quill" ? 9 : 12);
  const quillToken = tokens("quill").find(t => t.level === levels.below);
  await quillToken.actor.update({ "system.attributes.hp.value": 80 });
  await quillToken.actor.update({ "system.attributes.hp.value": 70 });
  await settle(120);
  assert.equal(setting("widowRisen"), true);
  assert.equal(cardsWith("The Widow's due").length >= 1, true);
  assert.equal(tokens("widow").length, 1);
  assert.deepEqual([tokens("widow")[0].x, tokens("widow")[0].y], [3900, 1300]);
  assert.ok(quillToken.actor.effects.some(e => e.statuses?.includes("frightened") && e.duration.expiry === "combatEnd"),
    "frightened until the fight ends");
  // Unmasking at 30 (End the combat? yes).
  world.dialogs.push(true);
  await quillToken.actor.update({ "system.attributes.hp.value": 28 });
  await settle(120);
  assert.equal(setting("quillUnmasked"), true);
  assert.ok(quillToken.texture.src.endsWith("quill-unmasked.webp"));
  assert.ok(actorByKey("quill").img.endsWith("portraits/quill-unmasked.webp"));
  assert.ok(tokens("skeleton").every(t => t.hidden), "skeletons crumble");
  assert.equal(game.combats.filter(c => c.flags.ravenmoor?.showdown).length, 0, "combat ended");
  assert.ok(party.every(p => !p.effects.some(e => e.flags?.ravenmoor?.edge)), "Who edge removed with the combat");
  assert.match(cardsWith("The unmasking").at(-1).content, /You lot were supposed to stay scared/);
});

test("Director after the fight: the showdown beat stays ticked", async () => {
  const { DirectorApp } = await import("../scripts/lib/director.mjs");
  const app = new DirectorApp();
  await app.render();
  const tick = app.element.querySelector("button.tick[data-fn=\"showdownSetup\"]");
  assert.ok(tick.classList.contains("done"));
  assert.equal(app.element.querySelectorAll("button.run").length, 25);
});

test("epilogue: caught but burned; green lanterns; the Widow on the pond; the lantern", async () => {
  await api.epilogue();
  assert.equal(setting("act"), "epilogue");
  assert.ok(cardsWith("Ending: Quill caught, will burned").length === 1);
  const lanterns = byLabel(scene, "lights", "Warding lantern");
  assert.equal(lanterns.length, 6);
  assert.ok(lanterns.every(l => l.config.color === "#38ff8c"));
  const widow = tokens("widow")[0];
  assert.deepEqual([widow.x, widow.y, widow.level], [550, 2800, levels.ground]);
  const tile = scene.tiles.find(t => t.flags.ravenmoor?.lantern);
  assert.ok(tile);
  // A player takes it; the GM's client removes the tile.
  const card = cardsWith("On Elspeth's memorial stone").at(-1);
  const player = [...game.users.values()].find(u => !u.isGM);
  await asUser(player, async () => {
    await click(renderMessage(card), "[data-ravenmoor=\"take-lantern\"]");
  });
  assert.ok(player.character.items.some(i => i.flags.ravenmoor?.key === "elspeths-lantern"));
  const relay = world.socket.find(s => s.action === "lanternTaken");
  for ( const fn of game.socket.handlers ) await fn(relay);
  await settle(120);
  assert.ok(!scene.tiles.some(t => t.flags.ravenmoor?.lantern), "tile removed");
});

test("no errors were reported along the way", () => {
  assert.deepEqual(world.notifications.filter(n => n.error), []);
  assert.equal(world.dialogs.length, 0, "every queued dialog answer was used");
});
