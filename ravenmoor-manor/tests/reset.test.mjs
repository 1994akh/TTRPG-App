/**
 * Reset the Night after a played-through evening: everything back to the start, in place, with the same ids.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { ADVENTURE, byLabel, createWorld, game, loadModule, settle, world } from "./harness.mjs";

const { party } = createWorld({ players: 4 });
const api = await loadModule();
const CONTENT = (await import("../scripts/lib/generated.mjs")).default;
const scene = () => game.scenes.get(CONTENT.ids.scene);
const setting = key => game.settings.get("ravenmoor-manor", key);
const quill = () => game.actors.find(a => a.flags?.ravenmoor?.key === "quill");

test("play part of the night, then Reset the Night restores everything", async () => {
  await api.partyArrives();
  await api.treatBagSetup();
  await api.silasRetires();
  await api.lightsOut();
  await api.theBody();
  await api.revealCard("C3");
  for ( let i = 0; i < 11; i++ ) await api.snuffCandle();
  world.dialogs.push({ who: true, how: true, why: false });
  await api.snuffCandle();
  await api.showdownSetup();
  const quillToken = scene().tokens.find(t => t.flags.ravenmoor?.actorKey === "quill" && t.level === CONTENT.ids.levels.below);
  world.dialogs.push(true);
  await quillToken.actor.update({ "system.attributes.hp.value": 20 });
  await settle(150);
  assert.equal(setting("quillUnmasked"), true);
  await quill().update({ img: "something-else.webp" });
  const idsBefore = { scene: scene().id, quill: quill().id, handouts: game.journal.get(CONTENT.ids.journals.handouts).id };

  world.dialogs.push({ map: true, npcs: true, handouts: true, party: true, state: true });
  await api.resetNight();

  // Same ids, so every link and map pin still works.
  assert.equal(scene().id, idsBefore.scene);
  assert.equal(quill().id, idsBefore.quill);
  assert.equal(game.journal.get(CONTENT.ids.journals.handouts).id, idsBefore.handouts);
  // The map as imported: doors, lights, tiles, NPC tokens; extra tokens gone; party back at the drive.
  const original = ADVENTURE.scenes[0];
  assert.equal(scene().walls.size, original.walls.length);
  assert.equal(byLabel(scene(), "walls", "East Corridor / Study")[0].ds, 0);
  assert.equal(byLabel(scene(), "walls", "Bookcase (secret door)")[0].door, 2);
  assert.ok(byLabel(scene(), "lights", "Feast candelabra").every(l => !l.hidden));
  assert.equal(byLabel(scene(), "lights", "Hallows' brazier")[0].hidden, true);
  assert.ok(scene().tiles.contents.every(t => t.hidden));
  const npcTokens = scene().tokens.filter(t => !party.some(p => p.id === t.actorId));
  assert.equal(npcTokens.length, original.tokens.length, "Fennick, the Widow and the Why allies are gone");
  const pcs = scene().tokens.filter(t => party.some(p => p.id === t.actorId));
  assert.equal(pcs.length, 4);
  assert.ok(pcs.every(t => t.level === CONTENT.ids.levels.ground && t.y >= 3200));
  assert.ok(scene().regions.get(CONTENT.ids.stairs["hidden-stair"]).behaviors.contents.every(b => b.disabled));
  // NPCs: Quill masked with his will and key back; Edric's coat without the key.
  assert.ok(quill().img.endsWith("portraits/quill-masked.webp"));
  assert.ok(quill().items.some(i => i.flags.ravenmoor?.key === "new-will"));
  assert.ok(quill().items.some(i => i.flags.ravenmoor?.key === "lockbox-key"));
  const edric = game.actors.find(a => a.flags?.ravenmoor?.key === "edric");
  assert.ok(!edric.items.some(i => i.flags.ravenmoor?.key === "lockbox-key"));
  // Handouts hidden again except H1; tracker cleared.
  const pages = game.journal.get(CONTENT.ids.journals.handouts).pages;
  assert.equal(pages.get(CONTENT.ids.pages.H1).ownership.default, 2);
  assert.equal(pages.get(CONTENT.ids.pages.H2).ownership.default, 0);
  assert.equal(pages.get(CONTENT.ids.pages.C3).ownership.default, 0);
  assert.ok(!pages.get(CONTENT.ids.pages["clue-tracker"]).text.content.includes("☑"));
  // The party: no Ravenmoor items or effects; the night's settings at their defaults; no combats.
  assert.ok(party.every(p => !p.items.some(i => i.flags?.ravenmoor?.key)));
  assert.ok(party.every(p => !p.effects.some(e => e.flags?.ravenmoor)));
  assert.equal(setting("act"), "act1");
  assert.equal(setting("candlesLit"), 0);
  assert.deepEqual(setting("clues"), {});
  assert.deepEqual(setting("beats"), {});
  assert.equal(setting("quillUnmasked"), false);
  assert.equal(game.combats.size, 0);
  assert.deepEqual(world.notifications.filter(n => n.error), []);
});
