/**
 * Session tools: placing the party, setting up the hotbar, and resetting the night so the adventure can be tested
 * and replayed.
 */
import {
  CONTENT, esc, LEVEL_ELEVATION, levelId, mainScene, MODULE_ID, partyActors, requireGM, setSetting, whisperGM
} from "./util.mjs";

const { DialogV2 } = foundry.applications.api;

/** Party slots at the drive (offsets from partyStart): two columns up the drive between the jack-o'-lanterns. */
const DRIVE_OFFSETS = [[0, 0], [100, 0], [0, 100], [100, 100], [0, -100], [100, -100], [0, 200], [100, 200]];

/** Every night-state setting and its starting value. */
export const NIGHT_DEFAULTS = {
  act: "act1", candlesLit: 0, candlesVisible: false, splitUp: false, gustPrompted: false, sessionStart: 0,
  edges: { who: false, how: false, why: false }, clues: {}, readyNotified: false, lairRound: 0, widowRisen: false,
  quillUnmasked: false, willBurned: false, willBurnable: false, beats: {}
};

/** Reset the night-state settings. */
export async function resetSettings() {
  for ( const [key, value] of Object.entries(NIGHT_DEFAULTS) ) await setSetting(key, foundry.utils.deepClone(value));
}

/** The party's linked tokens on the main scene. */
export function partyTokens() {
  const party = new Set(partyActors().map(a => a.id));
  return mainScene()?.tokens.filter(t => t.actorLink && party.has(t.actorId)) ?? [];
}

/**
 * Put the party's tokens on a level: existing tokens move, missing ones are created from each character's
 * prototype token.
 * @param {string} level              Level key ("ground", "below").
 * @param {{x: number, y: number}} start
 * @param {number[][]} offsets
 * @returns {Promise<void>}
 */
export async function placeParty(level, start, offsets) {
  const scene = mainScene();
  if ( !scene ) return;
  const id = levelId(level);
  const elevation = LEVEL_ELEVATION[level];
  const slot = i => ({ x: start.x + offsets[i % offsets.length][0], y: start.y + offsets[i % offsets.length][1] });
  const existing = partyTokens();
  const moves = existing.map((t, i) => ({ _id: t.id, level: id, elevation, ...slot(i) }));
  if ( moves.length ) await scene.updateEmbeddedDocuments("Token", moves, { animate: false });
  const missing = partyActors().filter(a => !existing.some(t => t.actorId === a.id));
  const created = [];
  for ( const [j, actor] of missing.entries() ) {
    const td = await actor.getTokenDocument({ ...slot(existing.length + j), level: id, elevation });
    created.push(td.toObject());
  }
  if ( created.length ) await scene.createEmbeddedDocuments("Token", created);
}

/** Director / macro: the party arrives at the drive (Act 1, Scene 1). */
export async function partyArrives() {
  if ( !requireGM() ) return;
  const scene = mainScene();
  if ( !scene ) return ui.notifications.error("Ravenmoor: import the Adventure first.");
  if ( !partyActors().length ) return ui.notifications.warn("Assign each player a character first (User Configuration).");
  await placeParty("ground", CONTENT.partyStart.ground, DRIVE_OFFSETS);
  if ( !scene.active ) await scene.activate();
  await canvas.animatePan?.({ x: CONTENT.partyStart.ground.x + 100, y: CONTENT.partyStart.ground.y, scale: 0.8 });
}

/** Put the suggested Ravenmoor macros on this GM's hotbar. */
export async function setupHotbar() {
  if ( !requireGM() ) return;
  const macros = game.macros.filter(m => m.flags?.ravenmoor?.slot).sort((a, b) => a.flags.ravenmoor.slot - b.flags.ravenmoor.slot);
  if ( !macros.length ) return ui.notifications.warn("Ravenmoor: import the Adventure first; its macros come with it.");
  const slots = macros.map(m => m.flags.ravenmoor.slot);
  const yes = await DialogV2.confirm({
    window: { title: "Ravenmoor hotbar" },
    content: `<p>Put the ${macros.length} suggested Ravenmoor macros in hotbar slots ${Math.min(...slots)}–${Math.max(...slots)}? `
      + "Anything already in those slots is replaced.</p>"
  });
  if ( !yes ) return;
  for ( const m of macros ) await game.user.assignHotbarMacro(m, m.flags.ravenmoor.slot);
  ui.notifications.info("Ravenmoor: hotbar set up.");
}

/* -------------------------------------------- */
/*  Reset the night                             */
/* -------------------------------------------- */

/** The Adventure's original data from the module compendium. */
async function adventureSource() {
  const adventure = await game.packs.get(`${MODULE_ID}.adventure`)?.getDocument(CONTENT.ids.adventure);
  return adventure?.toObject() ?? null;
}

/** Replace world documents with their compendium originals, keeping their ids so every link still works. */
async function restore(cls, current, sources) {
  for ( const doc of current ) if ( doc ) await doc.delete();
  if ( sources.length ) await cls.implementation.createDocuments(sources, { keepId: true });
}

/** Director / macro: put the adventure back to its starting state. */
export async function resetNight() {
  if ( !requireGM() ) return;
  const parts = {
    map: "The map: doors, lights, tiles and NPC tokens as at the start; the party's tokens go back to the drive",
    npcs: "The NPCs: inventories, Hit Points and effects (Quill's will and key, Edric's coat)",
    handouts: "Handouts hidden again (Handout 1 stays revealed) and the Clue Tracker cleared",
    party: "The party: remove Ravenmoor items (candy, the will, counter-herb, the lantern...) and Ravenmoor effects",
    state: "The night: candles, clues, edges and showdown state; delete Ravenmoor combats"
  };
  const choice = await DialogV2.prompt({
    window: { title: "Reset the Night" },
    content: `<div class="ravenmoor ravenmoor-form"><p>Put Ravenmoor back to the start of the adventure. This cannot be undone.</p>
      ${Object.entries(parts).map(([k, label]) => `<label><input type="checkbox" name="${k}" checked> ${esc(label)}</label>`).join("")}
      <p class="ravenmoor-muted">Journals you wrote yourself, the chat log and your player characters' own items are left alone.</p></div>`,
    ok: {
      label: "Reset",
      icon: "fa-solid fa-rotate-left",
      callback: (e, button) => Object.fromEntries(Object.keys(parts).map(k => [k, button.form.elements[k].checked]))
    },
    rejectClose: false
  });
  if ( !choice || !Object.values(choice).some(Boolean) ) return;
  const source = await adventureSource();
  if ( !source && (choice.map || choice.npcs || choice.handouts) ) {
    return ui.notifications.error("Ravenmoor: the Adventure compendium could not be read.");
  }
  ui.notifications.info("Ravenmoor: resetting the night...");
  const done = [];

  if ( choice.state ) {
    const scene = mainScene();
    const combats = game.combats.filter(c => c.flags?.ravenmoor?.showdown || (scene && (c.scene?.id === scene.id)));
    for ( const c of combats ) await c.delete();
    await resetSettings();
    done.push("night state");
  }
  if ( choice.npcs ) {
    await restore(Actor, source.actors.map(a => game.actors.get(a._id)), source.actors);
    done.push("NPCs");
  }
  if ( choice.handouts ) {
    const handouts = source.journal.filter(j => j._id === CONTENT.ids.journals.handouts);
    await restore(JournalEntry, handouts.map(j => game.journal.get(j._id)), handouts);
    if ( !choice.state ) await setSetting("clues", {});
    done.push("handouts");
  }
  if ( choice.party ) {
    const keys = new Set(Object.keys(CONTENT.items));
    for ( const actor of partyActors() ) {
      const items = actor.items.filter(i => keys.has(i.flags?.ravenmoor?.key)).map(i => i.id);
      if ( items.length ) await actor.deleteEmbeddedDocuments("Item", items);
      const effects = actor.effects.filter(e => e.flags?.ravenmoor).map(e => e.id);
      if ( effects.length ) await actor.deleteEmbeddedDocuments("ActiveEffect", effects);
    }
    done.push("party items and effects");
  }
  if ( choice.map ) {
    const old = mainScene();
    const wasActive = !!old?.active;
    const data = source.scenes.find(s => s._id === CONTENT.ids.scene);
    await restore(Scene, [old], [data]);
    const scene = mainScene();
    if ( wasActive || !game.scenes.active ) await scene?.activate();
    if ( partyActors().length ) await placeParty("ground", CONTENT.partyStart.ground, DRIVE_OFFSETS);
    done.push("map");
  }
  await whisperGM("The night is reset", `<p>Restored: ${done.join(", ")}.</p>`);
}
