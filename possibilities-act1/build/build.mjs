/** npm run build: generate src/packs/** JSON sources and compile the LevelDB packs under packs/**. */
import fs from "node:fs";
import path from "node:path";
import { compilePack } from "@foundryvtt/foundryvtt-cli";
import { buildActors } from "./actors.mjs";
import { buildItems } from "./items.mjs";
import { buildJournals, registerActors } from "./journals.mjs";
import { buildScenes } from "./scenes.mjs";
import { buildMacros } from "./macros.mjs";
import { buildTables } from "./tables.mjs";
import { buildAdventure, buildFolders } from "./adventure.mjs";
import { writeGenerated } from "./content.mjs";
import { IDS } from "./keys.mjs";
import { cleanSource, clone, ROOT, writeSource } from "./util.mjs";

const EMBEDDED = {
  actors: { items: "items", effects: "effects" },
  items: { effects: "effects" },
  journal: { pages: "pages" },
  macros: {},
  tables: { results: "results" }
};

function addKeys(doc, collection, parents=[], parentPath=collection) {
  const ids = [...parents, doc._id];
  doc._key = `!${parentPath}!${ids.join(".")}`;
  for ( const [field, sub] of Object.entries(EMBEDDED[collection] ?? {}) ) {
    for ( const child of doc[field] ?? [] ) addKeys(child, sub, ids, `${parentPath}.${field}`);
  }
  return doc;
}

const { docs: folders, ids: folderIds } = buildFolders();
const items = buildItems();
const actors = buildActors();
// Enkrid carries the inventor's pocket watch from the start.
const watch = items.get("pocket_watch");
actors.get("enkrid").items.push({ ...clone(watch), _id: IDS.embedded("enkrid", "pocket_watch"), folder: null });
registerActors(actors);
const journals = buildJournals(folderIds.JournalEntry);
const scenes = buildScenes({ actors, folder: folderIds.Scene });
const macros = buildMacros(folderIds.Macro);
const tables = buildTables(folderIds.RollTable);
writeGenerated({ actors, items, scenes });

const worldActors = [...actors.values()].map(a => ({ ...clone(a), folder: folderIds.Actor }));
const worldItems = [...items.values()].map(i => ({ ...clone(i), folder: folderIds.Item }));

for ( const dir of ["adventure", "actors", "items", "macros"] ) cleanSource(dir);
for ( const a of actors.values() ) writeSource("actors", addKeys({ ...clone(a), folder: null }, "actors"));
for ( const i of items.values() ) writeSource("items", addKeys({ ...clone(i), folder: null }, "items"));
for ( const m of macros ) writeSource("macros", addKeys({ ...clone(m), folder: null }, "macros"));
const adventure = buildAdventure({ scenes: [...scenes.values()], actors: worldActors, items: worldItems, journals, tables, macros, folders });
writeSource("adventure", adventure);

for ( const pack of ["adventure", "actors", "items", "macros"] ) {
  const dest = path.join(ROOT, "packs", pack);
  fs.rmSync(dest, { recursive: true, force: true });
  await compilePack(path.join(ROOT, "src/packs", pack), dest, { log: false });
}

const placeholders = [...scenes.values()].filter(s => s.flags["possibilities-act1"].placeholder).map(s => s.name);
console.log([
  `Scenes: ${scenes.size}${placeholders.length ? ` (${placeholders.length} without map art yet: ${placeholders.join(", ")})` : ""}`,
  `Actors: ${actors.size} · Items: ${items.size} · Journals: ${journals.length} (${journals.map(j => j.pages.length).join("/")} pages) · Macros: ${macros.length} · Tables: ${tables.length}`,
  "Packs compiled: adventure, actors, items, macros"
].join("\n"));
