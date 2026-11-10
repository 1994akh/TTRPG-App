/**
 * The Undercourses' set pieces: Old Gnaw, the Gloam's rebuff, and the Into the light Scene with its sun clock.
 */
import {
  actorFor, around, CONTENT, ensureTokens, esc, getSetting, isLeadGM, openPage, partyHeroes, postCard, requireGM, sceneFor,
  SCOPE, setSetting
} from "./util.mjs";
import { sunPoint } from "./logic.mjs";
import { damageLoaner, sceneCardHTML, tickStep } from "./story.mjs";

/** Show a map to everyone. */
async function showMap(key) {
  const scene = sceneFor(key);
  if ( !scene ) {
    ui.notifications.warn("Import the Ashford Roads: Act 1 Adventure first.");
    return null;
  }
  await scene.activate?.();
  return scene;
}

/** Put the party's tokens on a map, around a point. */
async function placeParty(scene, x, y) {
  const heroes = partyHeroes();
  const spots = around(x, y, heroes.length, scene.grid?.size ?? 100);
  const tokens = [];
  for ( const [i, a] of heroes.entries() ) tokens.push(...await ensureTokens(scene, a, [spots[i]]));
  return tokens;
}

/** A note's position on a map (where a page's pin is), or the map's middle. */
function notePos(scene, page) {
  const n = scene.notes?.find(x => x.flags?.[SCOPE]?.page === page);
  return n ? { x: n.x, y: n.y } : { x: Math.round((scene.width ?? 1600) / 2), y: Math.round((scene.height ?? 1000) / 2) };
}

/** Start a combat with every token on the scene that belongs to one of `actorKeys` or the party. */
async function startCombat(scene, tokens, flag) {
  const combat = await Combat.implementation.create({ scene: scene.id, active: true, flags: { [SCOPE]: { [flag]: true } } });
  await combat.createEmbeddedDocuments("Combatant", tokens.map(t => ({ tokenId: t.id, sceneId: scene.id, actorId: t.actorId, hidden: !!t.hidden })));
  await combat.rollAll?.();
  await combat.startCombat?.();
  return combat;
}

/* -------------------------------------------- Old Gnaw -------------------------------------------- */

export async function startGnaw() {
  if ( !requireGM() ) return false;
  const scene = await showMap("undercourses");
  if ( !scene ) return false;
  const at = notePos(scene, "ch1_old_gnaw");
  const party = await placeParty(scene, at.x - 300, at.y);
  const gnaw = await ensureTokens(scene, actorFor("old_gnaw"), [at]);
  const rats = await ensureTokens(scene, actorFor("rat"), around(at.x + 100, at.y, 3, scene.grid?.size ?? 100));
  for ( const t of [...gnaw, ...rats] ) if ( t.hidden ) await t.update({ hidden: false });
  await startCombat(scene, [...party, ...gnaw, ...rats], "gnaw");
  await postCard("Old Gnaw", sceneCardHTML("ch1_old_gnaw"));
  return true;
}

/* -------------------------------------------- The Gloam -------------------------------------------- */

export async function startGloam() {
  if ( !requireGM() ) return false;
  const scene = await showMap("grate_chamber");
  if ( !scene ) return false;
  const door = notePos(scene, "ch1_the_gloam");
  const party = await placeParty(scene, door.x + 200, door.y);
  const gloam = await ensureTokens(scene, actorFor("gloam"), [{ x: Math.round(scene.width / 2), y: Math.round(scene.height / 2) }]);
  for ( const t of gloam ) if ( t.hidden ) await t.update({ hidden: false });
  const combat = await startCombat(scene, [...party, ...gloam], "gloam");
  await setSetting("gloamCombat", combat.id);
  await postCard("The thing in the dark", `${sceneCardHTML("ch1_the_gloam")}<p class="pa1-muted">After ${CONTENT.config.gloam.rebuffRounds} rounds the Gloam throws them back (automatic).</p>`);
  return true;
}

/** The Gloam throws the party back to the doorway; the fight ends, nobody is lost. */
export async function gloamRebuff() {
  if ( !requireGM() ) return false;
  const scene = sceneFor("grate_chamber");
  const combat = game.combats.get(getSetting("gloamCombat")) ?? game.combats.find(c => c.flags?.[SCOPE]?.gloam);
  if ( scene ) {
    const door = notePos(scene, "ch1_the_gloam");
    const spots = around(door.x, door.y, 9, scene.grid?.size ?? 100);
    const heroes = partyHeroes();
    const updates = scene.tokens.filter(t => heroes.some(a => a.id === t.actorId)).map((t, i) => ({ _id: t.id, x: spots[i].x, y: spots[i].y }));
    if ( updates.length ) await scene.updateEmbeddedDocuments("Token", updates);
  }
  for ( const a of partyHeroes() ) {
    const update = { "system.zone": "far", "system.turn.actions": 3, "system.turn.attacks": 0 };
    if ( (a.system?.hp?.value ?? 1) <= 0 ) update["system.hp.value"] = 1;
    await a.update(update);
  }
  if ( combat ) await combat.delete();
  await setSetting("gloamCombat", "");
  await postCard("Thrown back", "<p>It throws them back to the doorway. Nobody is lost.</p><p class=\"pa1-muted\">Then: the shaft of daylight through the grate, and what Petra says about noon.</p>");
  openPage("act1", "ch1_the_gloam");
  await tickStep("gloam");
  return true;
}

/* -------------------------------------------- Into the light -------------------------------------------- */

/** Move the sunlight to match the clock. */
async function placeSun(value, max) {
  const scene = sceneFor("grate_chamber");
  const id = CONTENT.ids.sunLight;
  const point = sunPoint(CONTENT.sunPath, value, max);
  if ( !scene || !id || !point || !scene.lights?.get(id) ) return null;
  await scene.updateEmbeddedDocuments("AmbientLight", [{ _id: id, x: point[0], y: point[1], hidden: value >= max }]);
  return point;
}

export async function startLight() {
  if ( !requireGM() ) return false;
  const obstacle = actorFor("into_the_light");
  const scene = await showMap("grate_chamber");
  if ( !obstacle || !scene ) return false;
  const cfg = CONTENT.config.light;
  await obstacle.update({ "system.resistance.value": cfg.resistance, "system.resistance.max": cfg.resistance, "system.dc": cfg.dc,
    "system.clock.value": 0, "system.clock.max": cfg.clockRounds, [`flags.${SCOPE}.resolved`]: null });
  await placeSun(0, cfg.clockRounds);
  const party = await placeParty(scene, Math.round(scene.width / 2) - 300, Math.round(scene.height / 2));
  const gloam = scene.tokens.filter(t => t.actorId === actorFor("gloam")?.id);
  const combat = await startCombat(scene, [...party, ...gloam], "light");
  await setSetting("lightCombat", combat.id);
  obstacle.sheet?.render({ force: true });
  const approaches = obstacle.system.approaches.map(a => `<li><strong>${esc(a.label)}</strong> · ${esc(a.note)}</li>`).join("");
  await postCard("Into the light", `${sceneCardHTML("ch1_into_the_light")}
    <p><strong>Resistance ${cfg.resistance}</strong> · DC ${cfg.dc} · the sun is on the floor for ${cfg.clockRounds} rounds.</p><ul>${approaches}</ul>`);
  return true;
}

/** One tick of the sun clock: the light moves one step; when it runs out, the Scene is lost. */
export async function sunClock() {
  if ( !requireGM() ) return false;
  const obstacle = actorFor("into_the_light");
  if ( !obstacle ) return false;
  const { value, max } = obstacle.system.clock;
  if ( obstacle.flags?.[SCOPE]?.resolved ) return false;
  const next = Math.min(max, value + 1);
  await obstacle.update({ "system.clock.value": next });
  await placeSun(next, max);
  if ( next >= max ) await resolveLight(obstacle, false);
  else await postCard("The sun crawls", `<p>The light moves across the floor. ${max - next} round${max - next === 1 ? "" : "s"} of sun left.</p>`);
  return true;
}

/** The Scene ends. */
export async function resolveLight(obstacle, won) {
  if ( obstacle.flags?.[SCOPE]?.resolved ) return false;
  await obstacle.update({ [`flags.${SCOPE}.resolved`]: won ? "won" : "lost" });
  const html = won ? obstacle.system.outcome?.win : obstacle.system.outcome?.lose;
  await postCard(won ? "Into the light" : "The light is gone", html ?? "");
  if ( won ) {
    const gloam = sceneFor("grate_chamber")?.tokens.filter(t => t.actorId === actorFor("gloam")?.id) ?? [];
    for ( const t of gloam ) await t.update({ hidden: true });
    const combat = game.combats.get(getSetting("lightCombat"));
    if ( combat ) await combat.delete();
    await setSetting("lightCombat", "");
    await tickStep("light");
  }
  return true;
}

/* -------------------------------------------- Hooks -------------------------------------------- */

/** Rounds: the Gloam's rebuff after N rounds; the sun clock each new round of the light combat. */
export async function onCombatRound(combat, changes) {
  if ( !isLeadGM() || !("round" in changes) ) return;
  const f = combat.flags?.[SCOPE] ?? {};
  if ( f.gloam && (combat.round > CONTENT.config.gloam.rebuffRounds) ) await gloamRebuff();
  if ( f.light && (combat.round > 1) ) await sunClock();
}

/** The Old Gnaw fight ends: tick the step. */
export async function onCombatEnd(combat) {
  if ( !isLeadGM() ) return;
  if ( combat.flags?.[SCOPE]?.gnaw ) await tickStep("gnaw");
}

/** Resistance reaches 0: the Scene is won (also from the system's sceneResolved hook). */
export async function onObstacleUpdate(actor) {
  if ( !isLeadGM() || (actor.id !== CONTENT.ids.actors.into_the_light) ) return;
  if ( (actor.system?.resistance?.value ?? 1) <= 0 ) await resolveLight(actor, true);
}

/** A Setback with gearDamage marks one of the acting hero's loaners. */
export async function onSetback(obstacle, hero, setback) {
  if ( !isLeadGM() || !setback?.gearDamage || !hero ) return;
  await damageLoaner(hero);
}
