/**
 * npm run check (static part): system.json, files, templates, language keys and packs line up.
 */
import fs from "node:fs";
import path from "node:path";
import { APTNESS, CONDITIONS, DENOMINATIONS, ROLES, ZONES } from "../module/config.mjs";
import Handlebars from "handlebars";
import { readJSON, ROOT } from "./util.mjs";

const errors = [];
const fail = msg => errors.push(msg);
const exists = rel => fs.existsSync(path.join(ROOT, rel));
const read = rel => fs.readFileSync(path.join(ROOT, rel), "utf8");
const walk = dir => fs.readdirSync(path.join(ROOT, dir), { withFileTypes: true })
  .flatMap(e => e.isDirectory() ? walk(path.join(dir, e.name)) : [path.join(dir, e.name)]);

const sys = readJSON("system.json");
if ( sys.id !== "possibilities" ) fail("system.json id must be possibilities");
for ( const f of [...sys.esmodules, ...sys.styles, ...sys.languages.map(l => l.path)] ) if ( !exists(f) ) fail(`missing ${f}`);
for ( const p of sys.packs ) if ( !exists(p.path) ) fail(`pack ${p.name} not built (${p.path}); run npm run build`);
for ( const p of sys.packs ) if ( !sys.packFolders[0].packs.includes(p.name) ) fail(`pack ${p.name} not in packFolders`);
if ( !sys.manifest.endsWith("/system.json") || !sys.download.endsWith("/possibilities.zip") ) fail("manifest/download URLs");

// Every document type has a data model registered, and a TYPES label.
const entry = read("module/possibilities.mjs");
const lang = readJSON("lang/en.json");
for ( const [doc, types] of Object.entries(sys.documentTypes) ) {
  for ( const t of Object.keys(types) ) {
    if ( !new RegExp(`\\b${t}: [A-Za-z.]+Data\\b`).test(entry) ) fail(`${doc}.${t} has no data model in possibilities.mjs`);
    if ( !lang.TYPES?.[doc]?.[t] ) fail(`lang TYPES.${doc}.${t} missing`);
  }
}

// Templates referenced by the sheets exist.
const sheets = read("module/sheets.mjs");
for ( const m of sheets.matchAll(/`\$\{T\}\/([^`]+)`/g) ) if ( !exists(`templates/${m[1]}`) ) fail(`missing template templates/${m[1]}`);

// Templates compile.
for ( const f of walk("templates").filter(x => x.endsWith(".hbs")) ) {
  try {
    Handlebars.precompile(read(f));
  } catch ( err ) {
    fail(`${f}: ${err.message.split("\n")[0]}`);
  }
}

// Language keys.
const get = key => key.split(".").reduce((o, k) => (o && typeof o === "object") ? o[k] : undefined, lang);
const DYNAMIC = new Set(["POSS.Action", "POSS.Aptness", "POSS.Coin", "POSS.Condition", "POSS.Details", "POSS.Per", "POSS.Role", "POSS.Scene.Status",
  "POSS.Setting", "POSS.Tab", "POSS.Track", "POSS.Zone"]);
const files = [...walk("module"), ...walk("templates")].filter(f => /\.(mjs|hbs)$/.test(f) && !f.endsWith("rules-data.mjs"));
for ( const f of files ) {
  for ( const m of read(f).matchAll(/POSS\.[A-Za-z0-9_.]+[A-Za-z0-9_]/g) ) {
    if ( DYNAMIC.has(m[0]) ) continue;
    if ( typeof get(m[0]) !== "string" ) fail(`${f}: language key ${m[0]} missing`);
  }
}
const families = {
  "POSS.Zone": ZONES, "POSS.Aptness": APTNESS, "POSS.Condition": CONDITIONS, "POSS.Coin": DENOMINATIONS, "POSS.Role": ROLES,
  "POSS.Scene.Status": ["active", "won", "lost"], "POSS.Tab": ["main", "actions", "inventory", "story"], "POSS.Track": ["Combat", "Craft"],
  "POSS.Per": ["scene", "rest", "day"],
  "POSS.Details": ["height", "weight", "eyes", "skin", "hair", "languages", "otherProficiencies", "traits", "ideals", "bonds", "flaws", "backstory", "allies"],
  "POSS.Action": ["strike", "stride", "guard", "aid", "stabilise", "recall", "interact", "withdraw", "strideText", "guardText", "interactText", "withdrawText", "aidText"]
};
for ( const [prefix, keys] of Object.entries(families) ) for ( const k of keys ) if ( typeof get(`${prefix}.${k}`) !== "string" ) fail(`language key ${prefix}.${k} missing`);
for ( const k of read("module/possibilities.mjs").matchAll(/^ {2}(\w+): \{ type:/gm) ) {
  for ( const part of ["name", "hint"] ) if ( typeof get(`POSS.Setting.${k[1]}.${part}`) !== "string" ) fail(`setting ${k[1]} ${part} missing`);
}

// Fonts the stylesheet loads exist.
for ( const m of read("styles/possibilities.css").matchAll(/url\("\.\.\/([^"]+)"\)/g) ) if ( !exists(m[1]) ) fail(`missing font ${m[1]}`);

// Generated rules data is current.
const gen = read("module/rules-data.mjs");
for ( const name of ["races", "classes", "professions", "skills"] ) {
  const n = readJSON(`data/rules/${name}.json`).data.length;
  const m = new RegExp(`"${name}":\\[`).test(gen);
  if ( !m ) fail(`rules-data.mjs lacks ${name}; run npm run build`);
  else if ( (gen.match(new RegExp(`"id":"`, "g")) ?? []).length < n ) fail(`rules-data.mjs looks stale for ${name}`);
}

// Packs have the right counts.
for ( const [pack, src] of [["races", "races"], ["classes", "classes"], ["professions", "professions"], ["signatures", "signatures"], ["spells", "spells"]] ) {
  const n = exists(`src/packs/${pack}`) ? fs.readdirSync(path.join(ROOT, "src/packs", pack)).length : 0;
  const want = readJSON(`data/rules/${src}.json`).data.length;
  if ( n !== want ) fail(`src/packs/${pack} has ${n} documents, expected ${want}`);
}

if ( errors.length ) {
  console.error(`check: ${errors.length} problem(s)\n - ${errors.join("\n - ")}`);
  process.exit(1);
}
console.log("check: system.json, files, templates, language keys and packs line up");
