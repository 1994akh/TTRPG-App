/** Shared runtime helpers. */
import { CONTENT } from "./generated.mjs";
import { escapeHTML } from "./html.mjs";
import { withPC } from "./logic.mjs";

export { CONTENT };
export const MODULE_ID = "possibilities-act1";
export const SCOPE = "possibilities-act1";
export const esc = escapeHTML;

export const getSetting = key => game.settings.get(MODULE_ID, key);
export const setSetting = (key, value) => game.settings.set(MODULE_ID, key, value);

/** The system's API (possibilities-system), or {} before it is ready. */
export const sys = () => game.possibilities ?? game.system?.api ?? {};

/** The one active GM who runs automation. */
export function isLeadGM() {
  if ( !game.user.isGM ) return false;
  const active = game.users.filter(u => u.isGM && u.active).sort((a, b) => a.id.localeCompare(b.id));
  return !active.length || (active[0].id === game.user.id);
}

export function requireGM() {
  if ( game.user.isGM ) return true;
  ui.notifications.warn("Only the GM can run that.");
  return false;
}

export const pcName = () => getSetting("pcName") || "the newcomer";
export const pc = (text, { html=true }={}) => withPC(text, pcName(), { html });

/* World documents from the Adventure (importing keeps every _id). */
export const journalFor = key => game.journal.get(CONTENT.ids.journals[key]) ?? null;
export const pageFor = (journal, key) => journalFor(journal)?.pages.get(CONTENT.ids.pages[journal]?.[key]) ?? null;
export const actorFor = key => game.actors.get(CONTENT.ids.actors[key]) ?? null;
export const sceneFor = key => game.scenes.get(CONTENT.ids.scenes[key]) ?? null;
export const pcActor = () => game.actors.get(getSetting("pcActor")) ?? null;
export const trio = () => CONTENT.trio.map(actorFor).filter(Boolean);

/** Every hero in the party: the player character (once made) and the trio (once joined). */
export function partyHeroes() {
  const out = [];
  const me = pcActor();
  if ( me ) out.push(me);
  if ( getSetting("trioJoined") ) out.push(...trio());
  return out;
}

/** A hero's Act 1 key: the trio's lore id, or "pc". */
export const heroKey = actor => actor?.flags?.[SCOPE]?.key ?? (actor?.id === getSetting("pcActor") ? "pc" : null);

/** Post a card to chat. */
export async function postCard(title, body, { gmOnly=false, speaker="Ashford Roads", css="" }={}) {
  const content = `<div class="pa1 pa1-card ${css}"><h3>${esc(title)}</h3>${body}</div>`;
  const data = { content, speaker: { alias: speaker } };
  if ( gmOnly ) data.whisper = game.users.filter(u => u.isGM).map(u => u.id);
  return ChatMessage.implementation.create(data);
}

/** Show a page in its journal. */
export function openPage(journal, key) {
  const entry = journalFor(journal);
  if ( !entry ) {
    ui.notifications.warn("Import the Ashford Roads: Act 1 Adventure first.");
    return false;
  }
  const page = pageFor(journal, key);
  entry.sheet.render({ force: true, pageId: page?.id });
  return true;
}

/** Add `n` to an actor's tokens on a scene, or place new ones from the prototype. */
export async function ensureTokens(scene, actor, positions, { hidden=false }={}) {
  if ( !scene || !actor ) return [];
  const have = scene.tokens.filter(t => t.actorId === actor.id);
  const missing = positions.slice(have.length);
  if ( !missing.length ) return have;
  const proto = (await actor.getTokenDocument?.()) ?? null;
  const base = proto?.toObject?.() ?? { ...actor.prototypeToken, actorId: actor.id };
  const created = await scene.createEmbeddedDocuments("Token", missing.map(p => ({ ...base, actorId: actor.id, x: p.x, y: p.y, hidden })));
  return [...have, ...created];
}

/** Position for the n-th of a group around a point, a square apart. */
export function around(x, y, n, size=100) {
  const offsets = [[0, 0], [1, 0], [0, 1], [-1, 0], [0, -1], [1, 1], [-1, 1], [1, -1], [-1, -1]];
  return Array.from({ length: n }, (_, i) => ({ x: x + (offsets[i % 9][0] * size), y: y + (offsets[i % 9][1] * size) }));
}
