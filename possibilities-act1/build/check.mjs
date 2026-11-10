/**
 * Static checks on the built Adventure (npm run check, after npm run build): every link, page, actor, macro and asset
 * resolves; every lore line appears verbatim; every API name used by journals, macros and the Director exists.
 */
import fs from "node:fs";
import path from "node:path";
import { LORE, resolve } from "./lore.mjs";
import { esc, ROOT } from "./util.mjs";
import { STEPS } from "./journals.mjs";

const problems = [];
const fail = msg => problems.push(msg);

const advDir = path.join(ROOT, "src/packs/adventure");
if ( !fs.existsSync(advDir) ) {
  console.error("src/packs/adventure is missing. Run `npm run build` first.");
  process.exit(1);
}
const adv = JSON.parse(fs.readFileSync(path.join(advDir, fs.readdirSync(advDir)[0]), "utf8"));

// The API, read from the source (importing it needs Foundry).
const apiSrc = fs.readFileSync(path.join(ROOT, "scripts/act1.mjs"), "utf8");
const apiBlock = /export const api = \{([\s\S]*?)\};/.exec(apiSrc)?.[1] ?? "";
const API = new Set(apiBlock.split(/[\s,]+/).filter(Boolean));

// Documents by uuid.
const uuids = new Set();
for ( const a of adv.actors ) uuids.add(`Actor.${a._id}`);
for ( const s of adv.scenes ) uuids.add(`Scene.${s._id}`);
for ( const i of adv.items ) uuids.add(`Item.${i._id}`);
for ( const m of adv.macros ) uuids.add(`Macro.${m._id}`);
for ( const t of adv.tables ) uuids.add(`RollTable.${t._id}`);
for ( const j of adv.journal ) {
  uuids.add(`JournalEntry.${j._id}`);
  for ( const p of j.pages ) uuids.add(`JournalEntry.${j._id}.JournalEntryPage.${p._id}`);
}

const allHTML = [];
for ( const j of adv.journal ) for ( const p of j.pages ) allHTML.push({ where: `${j.name} / ${p.name}`, html: p.text?.content ?? "" });
for ( const a of adv.actors ) for ( const f of ["description", "tactics"] ) if ( a.system[f] ) allHTML.push({ where: a.name, html: a.system[f] });

let links = 0;
for ( const { where, html } of allHTML ) {
  for ( const m of html.matchAll(/@UUID\[([^\]]+)\]/g) ) {
    links++;
    if ( !uuids.has(m[1]) ) fail(`${where}: broken link ${m[1]}`);
  }
  for ( const m of html.matchAll(/@Act1\[([A-Za-z]+)(?::([A-Za-z0-9_]+))?\]/g) ) {
    links++;
    if ( !API.has(m[1]) ) fail(`${where}: @Act1[${m[1]}] is not in the API`);
  }
  for ( const m of html.matchAll(/src="([^"]+)"/g) ) {
    const rel = m[1].replace(/^modules\/possibilities-act1\//, "");
    if ( !/^(icons|systems)\//.test(rel) && !fs.existsSync(path.join(ROOT, rel)) ) fail(`${where}: missing image ${m[1]}`);
  }
}

// Macros and step tools call real API functions.
for ( const m of adv.macros ) {
  const fn = /\.api\.(\w+)\(/.exec(m.command)?.[1];
  if ( !API.has(fn) ) fail(`Macro ${m.name}: api.${fn} does not exist`);
}
for ( const s of STEPS ) for ( const fn of s.tools ) if ( !API.has(fn) ) fail(`Step ${s.n}: tool ${fn} is not in the API`);

// Every lore line, verbatim.
const corpus = allHTML.map(x => x.html).join("\n");
let lines = 0;
const want = (text, where) => {
  lines++;
  if ( !corpus.includes(esc(resolve(text))) ) fail(`Lore line missing (${where}): ${text.slice(0, 70)}`);
};
for ( const s of LORE.scenes ) {
  for ( const l of s.script ?? [] ) want(l.text ?? l.note ?? l.choice, s.id);
  for ( const [, ls] of Object.entries(s.sections ?? {}) ) for ( const l of [].concat(ls) ) want(l, s.id);
}
for ( const kind of ["characters", "places", "terms"] ) for ( const e of LORE[kind] ) for ( const t of e.text ?? [] ) want(t, e.id);

// Unresolved tokens (anything but {pc}).
for ( const { where, html } of allHTML ) {
  for ( const m of html.matchAll(/\{([a-z0-9_]+)\}/g) ) if ( m[1] !== "pc" ) fail(`${where}: unresolved token {${m[1]}}`);
}

// Assets referenced by documents.
const assetRefs = [adv.img, ...adv.actors.flatMap(a => [a.img, a.prototypeToken.texture.src]),
  ...adv.scenes.flatMap(s => [s.thumb, ...s.levels.map(l => l.background.src)])].filter(Boolean);
for ( const ref of assetRefs ) {
  if ( !ref.startsWith("modules/possibilities-act1/") ) continue;
  if ( !fs.existsSync(path.join(ROOT, ref.replace("modules/possibilities-act1/", ""))) ) fail(`Missing asset ${ref}`);
}

// Map notes and tokens point inside the Adventure.
for ( const s of adv.scenes ) {
  for ( const n of s.notes ) if ( !uuids.has(`JournalEntry.${n.entryId}.JournalEntryPage.${n.pageId}`) ) fail(`${s.name}: note ${n.text} has no page`);
  for ( const t of s.tokens ) if ( !uuids.has(`Actor.${t.actorId}`) ) fail(`${s.name}: token ${t.name} has no actor`);
}

// Ids are unique.
const ids = new Set();
const walk = (docs, kind) => {
  for ( const d of docs ) {
    if ( ids.has(`${kind}:${d._id}`) ) fail(`Duplicate ${kind} id ${d._id}`);
    ids.add(`${kind}:${d._id}`);
  }
};
walk(adv.actors, "Actor"); walk(adv.items, "Item"); walk(adv.journal, "JournalEntry"); walk(adv.scenes, "Scene"); walk(adv.macros, "Macro");

const placeholders = adv.scenes.filter(s => s.flags["possibilities-act1"].placeholder).map(s => s.name);
if ( problems.length ) {
  console.error(`${problems.length} problem(s):\n${problems.map(p => `  - ${p}`).join("\n")}`);
  process.exit(1);
}
console.log(`Check passed: ${links} links, ${lines} lore lines verbatim, ${adv.macros.length} macros, ${API.size} API functions, `
  + `${adv.scenes.length} scenes${placeholders.length ? ` (${placeholders.length} still without map art: ${placeholders.join(", ")})` : ""}.`);
