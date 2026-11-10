/** Play Act 1 from the Director's first step to its fourteenth in the simulated world. */
import { test } from "node:test";
import assert from "node:assert/strict";
import { setup, world, settle } from "./harness.mjs";

const api = await setup({ seed: 7 });
const { CONTENT } = await import("../scripts/lib/generated.mjs");
const { setPurseEntry, directorHTML } = await import("../scripts/lib/director.mjs");
const { purseSummary, currentStep } = await import("../scripts/lib/logic.mjs");
const S = key => game.settings.get("possibilities-act1", key);
const actor = key => game.actors.get(CONTENT.ids.actors[key]);
const ticked = key => !!S("beats")[key];
const scene = key => game.scenes.get(CONTENT.ids.scenes[key]);

test("all 14 steps play in order", async () => {
  // 1. The player character: a Vulpine (Beastkin) gets the Beastkin intro.
  world.dialogs.push({ createHero: { name: "Wren", race: "Vulpine", profession: "Merchant", skills: ["Deception", "Society", "Appraisal", "Persuasion"] } });
  assert.equal(await api.makeCharacter(), true);
  assert.equal(S("pcName"), "Wren");
  const pc = game.actors.get(S("pcActor"));
  assert.equal(pc.system.derived.family, "Beastkin");
  assert.equal(world.rendered.at(-1).opts.pageId, CONTENT.ids.pages.act1.ch1_intro_beastkin);
  assert.ok(ticked("pc"));
  await api.readScene("ch1_intro_beastkin");
  assert.match(world.chat.at(-1).content, /Sallow/);

  // 2-3. The broker: the trio join; a question.
  await api.readScene("ch1_broker");
  assert.ok(S("trioJoined"));
  assert.ok(world.chat.at(-1).content.includes("And you, Wren. Let me guess."), "{pc} is filled in when read aloud");
  world.dialogs.push({ wait: "q4" });
  await api.askBroker();
  assert.match(world.chat.at(-1).content, /unfixed water eats the unbound/);
  assert.ok(ticked("broker") && ticked("questions"));

  // 4. The commission: loaners.
  await api.giveLoaners();
  for ( const a of [pc, actor("enkrid"), actor("protag2"), actor("protag3")] ) {
    const blade = a.items.find(i => i.flags["possibilities-act1"]?.key === "loaner_blade");
    assert.ok(blade?.system.loaned && blade.system.equipped, `${a.name} has an equipped loaned blade`);
  }
  assert.ok(actor("enkrid").items.some(i => i.flags["possibilities-act1"]?.key === "charge_lamp"));
  assert.ok(actor("protag3").items.some(i => i.flags["possibilities-act1"]?.key === "pry_bar"));
  assert.ok(actor("enkrid").items.some(i => i.flags["possibilities-act1"]?.key === "pocket_watch"));
  assert.ok(ticked("commission"));

  // 5-6. The flashback; the sewer and the sellswords' journal.
  await api.readScene("ch1_prologue");
  await api.readScene("ch1_sewer_enter");
  await api.revealHandout("sellswords_journal");
  assert.match(world.chat.at(-1).content, /Lamps don&#39;t scare it. Light does./);
  assert.ok(ticked("prologue") && ticked("sewer"));

  // 7. Old Gnaw.
  await api.startGnaw();
  const gnawFight = game.combats.find(c => c.flags["possibilities-act1"]?.gnaw);
  assert.ok(gnawFight);
  assert.equal(gnawFight.combatants.size, 4 + 1 + 3, "four heroes, Old Gnaw and three rats");
  await gnawFight.delete();
  await settle();
  assert.ok(ticked("gnaw"));

  // 8. The Gloam throws them back after two rounds, on its own.
  await api.startGloam();
  const gloamFight = game.combats.get(S("gloamCombat"));
  await gloamFight.update({ round: 2 });
  assert.ok(game.combats.get(gloamFight.id), "still fighting in round 2");
  await gloamFight.update({ round: 3 });
  await settle();
  assert.ok(!game.combats.get(gloamFight.id), "the rebuff ended the fight");
  assert.equal(pc.system.zone, "far");
  assert.ok(ticked("gloam"));

  // 9. Into the light: the sun moves each round; a Setback damages a loaner; Resistance 0 wins.
  await api.startLight();
  const light = actor("into_the_light");
  const sunId = CONTENT.ids.sunLight;
  const grate = scene("grate_chamber");
  const start = { x: grate.lights.get(sunId).x, y: grate.lights.get(sunId).y };
  assert.deepEqual([start.x, start.y], CONTENT.sunPath[0]);
  const lightFight = game.combats.get(S("lightCombat"));
  await lightFight.update({ round: 2 });
  await settle();
  assert.equal(light.system.clock.value, 1);
  assert.notDeepEqual([grate.lights.get(sunId).x, grate.lights.get(sunId).y], [start.x, start.y], "the sunlight moved");
  Hooks.callAll("possibilities.setback", light, actor("protag3"), { gearDamage: true });
  await settle(); await settle();
  assert.ok(actor("protag3").items.some(i => i.system.condition === "damaged"));
  await light.update({ "system.resistance.value": 0 });
  await settle(); await settle();
  assert.equal(light.flags["possibilities-act1"].resolved, "won");
  assert.ok(ticked("light"));

  // 10. The purse lands on exactly four bindings; the loaners are kept.
  for ( const e of CONTENT.config.purse.entries ) await setPurseEntry(e.key, true);
  const sum = purseSummary(CONTENT.config.purse, S("purse"));
  assert.equal(sum.total, 200);
  assert.ok(sum.exact, "just enough to bind four, not a copper over");
  await api.keepLoaners();
  assert.ok(pc.items.filter(i => i.flags["possibilities-act1"]?.loaner).every(i => !i.system.loaned));
  assert.ok(ticked("fee"));

  // 11. Binding: the PC chooses; the trio take their story path.
  world.dialogs.push({ bind: "Duelist" });
  await api.bindAll();
  assert.equal(pc.system.class.node, "Duelist");
  assert.equal(actor("enkrid").system.class.node, "Bloodcharged");
  assert.equal(actor("protag2").system.class.node, "Theorist");
  assert.equal(actor("protag3").system.class.node, "Vanguard");
  assert.equal(actor("protag3").system.derived.combatEL, 1);
  assert.equal(actor("protag3").system.hp.value, 12, "Tova's Vanguard d12 at F-Novice");
  assert.ok(S("purse").bound);
  assert.ok(ticked("binding"));

  // 12-14. The collapse, the inn, the ship.
  await api.enkridCollapses();
  assert.ok(actor("enkrid").statuses.has("unconscious"));
  await api.innRest();
  assert.ok(!actor("enkrid").statuses.has("unconscious"));
  await api.readScene("ch1_missed_ship");
  await api.endAct();
  assert.match(world.chat.find(c => c.content.includes("pa1-titlecard")).content, /Possibilities/);

  for ( const s of CONTENT.steps ) assert.ok(ticked(s.key), `step ${s.n} ${s.title} is ticked`);
  assert.equal(currentStep(CONTENT.steps, S("beats")), null);

  // The session log has all fourteen beats, once.
  const log = game.journal.get(CONTENT.ids.journals.story).pages.get(CONTENT.ids.pages.story.log);
  for ( const s of CONTENT.steps ) assert.ok(log.text.content.includes(`${s.n}. `), `log mentions step ${s.n}`);
  assert.equal(await api.sessionLog(), false, "nothing new to log");
  assert.match(directorHTML({ beats: S("beats"), purse: S("purse"), pcName: "Wren", imported: true, light: null }), /Act 1 complete/);
});

test("reset puts the act back at the start and keeps My Story", async () => {
  const log = game.journal.get(CONTENT.ids.journals.story).pages.get(CONTENT.ids.pages.story.log).text.content;
  world.dialogs.push({ confirm: true });
  assert.equal(await api.resetAct(), true);
  assert.deepEqual(S("beats"), {});
  assert.equal(actor("protag3").system.class.node, "");
  assert.ok(!actor("protag3").items.some(i => i.flags["possibilities-act1"]?.loaner));
  assert.equal(game.journal.get(CONTENT.ids.journals.story).pages.get(CONTENT.ids.pages.story.log).text.content, log);
  assert.equal(S("purse").bound, false);
});
