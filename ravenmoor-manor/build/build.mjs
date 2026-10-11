/**
 * npm run build: generate every document as JSON under src/packs/** and compile the LevelDB packs under packs/**.
 */
import fs from "node:fs";
import path from "node:path";
import { compilePack } from "@foundryvtt/foundryvtt-cli";
import { buildItems } from "./items.mjs";
import { buildActors } from "./actors.mjs";
import { buildScene } from "./scenes.mjs";
import { buildJournals } from "./journals.mjs";
import { buildMacros } from "./macros.mjs";
import { buildAdventure, buildFolders } from "./adventure.mjs";
import { writeGenerated } from "./content.mjs";
import { cleanSource, clone, ROOT, writeSource } from "./util.mjs";

/** Embedded collections per document type, mirroring the CLI's hierarchy. */
const EMBEDDED = {
  actors: { items: "items", effects: "effects" },
  items: { effects: "effects" },
  journal: { pages: "pages" },
  macros: {}
};

/**
 * Add the CLI `_key` to a compendium document and its embedded documents.
 * @param {object} doc
 * @param {string} collection   actors | items | journal | macros
 * @param {string[]} [parents]
 * @param {string} [parentPath]
 * @returns {object}
 */
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
const { actors, npcs } = buildActors(items);
const { journals, handouts } = buildJournals({ npcs, folders: folderIds });
const scene = buildScene({ actors, npcs, handouts, folder: folderIds.scene });
const macros = buildMacros(folderIds.macro);
writeGenerated({ items, actors, scene });

// World copies for the Adventure.
const worldActors = [...actors.values()].map(a => ({ ...clone(a), folder: folderIds.actor }));
const worldItems = [...items.values()].map(i => ({ ...clone(i), folder: folderIds.item }));

for ( const dir of ["adventure", "actors", "items", "macros"] ) cleanSource(dir);

// Standalone compendiums: actors, items and macros (no folders inside the packs).
for ( const a of actors.values() ) writeSource("actors", addKeys({ ...clone(a), folder: null }, "actors"));
for ( const i of items.values() ) writeSource("items", addKeys({ ...clone(i), folder: null }, "items"));
for ( const m of macros ) writeSource("macros", addKeys({ ...clone(m), folder: null }, "macros"));

const adventure = buildAdventure({
  scenes: [scene], actors: worldActors, items: worldItems, journals, macros, folders
});
writeSource("adventure", adventure);

// Compile.
for ( const pack of ["adventure", "actors", "items", "macros"] ) {
  const dest = path.join(ROOT, "packs", pack);
  fs.rmSync(dest, { recursive: true, force: true });
  await compilePack(path.join(ROOT, "src/packs", pack), dest, { log: false });
}

const count = (arr, f=() => true) => arr.filter(f).length;
console.log([
  `Scene "${scene.name}": ${scene.levels.length} levels, ${scene.walls.length} walls, ${scene.lights.length} lights, `
    + `${scene.notes.length} notes (${count(scene.notes, n => n.flags.ravenmoor.clue)} clue pins), ${scene.tiles.length} tiles, `
    + `${scene.tokens.length} tokens, ${scene.regions.length} regions`,
  `Actors: ${actors.size} · Items: ${items.size} · Journals: ${journals.length} (${journals.map(j => j.pages.length).join("/")} pages) · Macros: ${macros.length}`,
  "Packs compiled: adventure, actors, items, macros"
].join("\n"));
