/**
 * Shared runtime helpers: finding the module's documents, chat, sounds and small canvas utilities.
 */
import CONTENT from "./generated.mjs";

export const MODULE_ID = "ravenmoor-manor";
export const SOCKET = `module.${MODULE_ID}`;
export const GRID = 100;

/* -------------------------------------------- */
/*  Settings                                    */
/* -------------------------------------------- */

export const getSetting = key => game.settings.get(MODULE_ID, key);
export const setSetting = (key, value) => game.settings.set(MODULE_ID, key, value);

/** Is this client the one GM that should run automation? */
export const isLeadGM = () => game.user.isGM && (game.users.activeGM?.isSelf ?? true);

/** Guard for GM-only API calls. */
export function requireGM() {
  if ( game.user.isGM ) return true;
  ui.notifications.warn("Only the GM can run the Ravenmoor set pieces.");
  return false;
}

/* -------------------------------------------- */
/*  Documents                                   */
/* -------------------------------------------- */

/** The main Ravenmoor scene. */
export function mainScene() {
  return game.scenes.get(CONTENT.ids.scene)
    ?? game.scenes.find(s => s.getFlag(MODULE_ID, "role") === "main" || s.flags?.ravenmoor?.role === "main")
    ?? null;
}

/** Level id for a level key ("ground", "upper", "below"). */
export const levelId = key => CONTENT.ids.levels[key];

/** Level key for a level id. */
export const levelKey = id => Object.entries(CONTENT.ids.levels).find(([, v]) => v === id)?.[0] ?? null;

/** Elevation at the base of each level. */
export const LEVEL_ELEVATION = { below: -20, ground: 0, upper: 20 };

const rm = doc => doc?.flags?.ravenmoor ?? {};

/**
 * Placeables on the main scene filtered by their ravenmoor flags.
 * @param {string} collection  "walls" | "lights" | "tiles" | "tokens" | "regions" | "notes"
 * @param {(flags: object, doc: Document) => boolean} test
 * @returns {Document[]}
 */
export function findPlaceables(collection, test) {
  const scene = mainScene();
  if ( !scene ) return [];
  return scene[collection].filter(d => test(rm(d), d));
}

/** Walls by label. */
export const wallsByLabel = label => findPlaceables("walls", f => f.label === label);

/** Lights by label prefix. */
export const lightsByLabel = prefix => findPlaceables("lights", f => (f.label ?? "").startsWith(prefix));

/** Lights in a group. */
export const lightsByGroup = group => findPlaceables("lights", f => f.group === group);

/** A tile by its label prefix ("C4 foxfire smears"). */
export const tileByLabel = prefix => findPlaceables("tiles", f => (f.label ?? "").startsWith(prefix))[0] ?? null;

/** Tokens for an actor key. */
export const tokensFor = (key, test=() => true) => findPlaceables("tokens", (f, d) => {
  const k = f.actorKey ?? rm(d.actor).key;
  return (k === key) && test(f, d);
});

/** A world actor by key. */
export function actorFor(key) {
  return game.actors.get(CONTENT.ids.actors[key]) ?? game.actors.find(a => rm(a).key === key) ?? null;
}

/** A world journal entry by key. */
export const journalFor = key => game.journal.get(CONTENT.ids.journals[key]) ?? null;

/** A handout page by card id. */
export function handoutPage(cardId) {
  return journalFor("handouts")?.pages.get(CONTENT.ids.pages[cardId]) ?? null;
}

/**
 * Source data for a module item: the world copy if the Adventure was imported, otherwise the copy bundled in
 * generated.mjs (players cannot open the GM-only compendium).
 * @param {string} key  items.json key
 * @returns {Promise<object|null>}
 */
export async function itemSource(key) {
  const world = game.items.get(CONTENT.ids.items[key]) ?? game.items.find(i => rm(i).key === key);
  const data = world?.toObject() ?? foundry.utils.deepClone(CONTENT.items[key] ?? null);
  if ( !data ) return null;
  delete data._id;
  delete data.folder;
  return data;
}

/**
 * Give an actor a module item, stacking quantity when they already have one.
 * @param {Actor} actor
 * @param {string} key
 * @param {number} [quantity=1]
 * @returns {Promise<Item|null>}
 */
export async function giveItem(actor, key, quantity=1) {
  const existing = actor.items.find(i => rm(i).key === key);
  if ( existing && (existing.system.quantity !== undefined) && (existing.type !== "container") ) {
    await existing.update({ "system.quantity": (existing.system.quantity ?? 0) + quantity });
    return existing;
  }
  const data = await itemSource(key);
  if ( !data ) {
    ui.notifications.error(`Ravenmoor: could not find the item "${key}".`);
    return null;
  }
  if ( data.system?.quantity !== undefined ) data.system.quantity = quantity;
  const [created] = await actor.createEmbeddedDocuments("Item", [data]);
  return created;
}

/** Items with a module key on an actor. */
export const itemsWithKey = (actor, key) => actor?.items.filter(i => rm(i).key === key) ?? [];

/* -------------------------------------------- */
/*  Party                                       */
/* -------------------------------------------- */

/** Player characters: each player's assigned character, plus any player-owned character actors. */
export function partyActors() {
  const out = new Set();
  for ( const u of game.users ) if ( !u.isGM && u.character ) out.add(u.character);
  for ( const a of game.actors ) if ( (a.type === "character") && a.hasPlayerOwner ) out.add(a);
  return [...out];
}

/** The actor a user acts as: their controlled token, else their assigned character. */
export function userActor(user=game.user) {
  const controlled = canvas?.tokens?.controlled?.find(t => t.actor?.isOwner)?.actor;
  return controlled ?? user.character ?? null;
}

/* -------------------------------------------- */
/*  Chat and sound                              */
/* -------------------------------------------- */

export const gmIds = () => game.users.filter(u => u.isGM).map(u => u.id);

/**
 * Post a styled chat card.
 * @param {string} title
 * @param {string} body      HTML.
 * @param {object} [options]
 * @param {boolean} [options.gmOnly]
 * @param {object} [options.flags]   ravenmoor flags (type, data).
 * @param {string} [options.css]     Extra card class.
 * @returns {Promise<ChatMessage>}
 */
export function postCard(title, body, { gmOnly=false, flags={}, css="", speaker } = {}) {
  const content = `<div class="ravenmoor ravenmoor-card ${css}"><header><h3>${title}</h3></header>${body}</div>`;
  return ChatMessage.implementation.create({
    content,
    speaker: speaker ?? { alias: "Ravenmoor Manor" },
    whisper: gmOnly ? gmIds() : [],
    flags: { [MODULE_ID]: flags }
  });
}

/** Whisper the GM. */
export const whisperGM = (title, body, flags) => postCard(title, body, { gmOnly: true, flags, css: "ravenmoor-gm" });

/** Read-aloud block HTML. */
export const readAloudHTML = text => `<blockquote class="ravenmoor-readaloud"><p>${text}</p></blockquote>`;

/**
 * Play a configured sound cue for everyone.
 * @param {"bell"|"gust"|"scream"} cue
 */
export function playCue(cue) {
  const src = getSetting(`sound${cue.charAt(0).toUpperCase()}${cue.slice(1)}`);
  if ( !src ) return;
  foundry.audio.AudioHelper.play({ src, volume: 0.8, autoplay: true, loop: false }, true);
}

/* -------------------------------------------- */
/*  Canvas                                      */
/* -------------------------------------------- */

/** Centre of a token document in pixels. */
export function tokenCenter(t) {
  const size = mainScene()?.grid.size ?? GRID;
  return { x: t.x + ((t.width * size) / 2), y: t.y + ((t.height * size) / 2) };
}

/** Distance in feet between two pixel points (straight line). */
export function feetBetween(a, b) {
  const scene = mainScene();
  const size = scene?.grid.size ?? GRID;
  const dist = scene?.grid.distance ?? 5;
  return (Math.hypot(a.x - b.x, a.y - b.y) / size) * dist;
}

/**
 * Wait for the GM to click a point on the canvas. Right-click cancels.
 * @param {string} prompt
 * @returns {Promise<{x: number, y: number}|null>}
 */
export function pickPoint(prompt) {
  if ( !canvas?.ready ) return Promise.resolve(null);
  ui.notifications.info(`${prompt} (right-click to cancel)`);
  return new Promise(resolve => {
    const stage = canvas.stage;
    const done = value => {
      stage.off("pointerdown", onDown);
      resolve(value);
    };
    const onDown = event => {
      if ( event.button === 2 ) return done(null);
      const p = event.getLocalPosition(stage);
      done({ x: Math.round(p.x), y: Math.round(p.y) });
    };
    stage.on("pointerdown", onDown);
  });
}

/** Sleep helper for small animations. */
export const wait = ms => new Promise(r => setTimeout(r, ms));

export { CONTENT };
