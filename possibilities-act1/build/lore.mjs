/**
 * The user's lore (data/lore/*.json, copied from Possibilities-Game content/lore) and token resolution.
 * {id} tokens become lore names at build time; {pc} stays and is rendered at runtime (the player character's name).
 */
import { exists, readJSON, ROOT } from "./util.mjs";
import fs from "node:fs";
import path from "node:path";

const load = name => readJSON(`data/lore/${name}.json`).data;
export const LORE = {
  characters: load("characters"),
  places: load("places"),
  scenes: load("scenes"),
  terms: load("terms")
};

export const byId = {
  characters: Object.fromEntries(LORE.characters.map(c => [c.id, c])),
  places: Object.fromEntries(LORE.places.map(p => [p.id, p])),
  scenes: Object.fromEntries(LORE.scenes.map(s => [s.id, s])),
  terms: Object.fromEntries(LORE.terms.map(t => [t.id, t]))
};

/** Every name a token can stand for. */
export const TOKENS = Object.fromEntries([
  ...LORE.characters.map(c => [c.id, c.name]),
  ...LORE.places.map(p => [p.id, p.name]),
  ...LORE.terms.map(t => [t.id, t.name])
]);

/** Resolve {id} tokens to names; {pc} and unknown tokens are kept as written. */
export function resolve(text) {
  return String(text ?? "").replace(/\{([a-z0-9_]+)\}/g, (m, key) => (key === "pc" ? m : (TOKENS[key] ?? m)));
}

/** Speaker id -> display name. */
export function speakerName(id) {
  if ( id === "narrator" ) return "Narrator";
  if ( id === "pc" ) return "{pc}";
  return byId.characters[id]?.name ?? id;
}

/** Capitalise the first letter (lore place names start lower-case: "the Undercourses"). */
export const titleCase = s => s ? s[0].toUpperCase() + s.slice(1) : s;

/** Is this lore entry still a draft? */
export const isDraft = e => /draft/i.test(e?.status ?? "");

/**
 * The user's own prologue prose (status: Written, unfinished), kept exactly as written: one entry per paragraph,
 * typos and unfinished sentences included. Empty until the file exists.
 */
export const PROLOGUE_DRAFT = exists("data/lore/prologue_draft.txt")
  ? fs.readFileSync(path.join(ROOT, "data/lore/prologue_draft.txt"), "utf8").replace(/\r\n/g, "\n").split(/\n\s*\n/).map(p => p.replace(/\n/g, " ").trimEnd()).filter(p => p.trim())
  : [];
