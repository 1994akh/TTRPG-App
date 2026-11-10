/** The manifest and the built packs agree. */
import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { ADVENTURE, ROOT } from "./harness.mjs";

const manifest = JSON.parse(fs.readFileSync(path.join(ROOT, "module.json"), "utf8"));

test("manifest", () => {
  assert.equal(manifest.id, "possibilities-act1");
  assert.equal(manifest.relationships.systems[0].id, "possibilities");
  assert.equal(manifest.compatibility.minimum, "14");
  assert.match(manifest.manifest, /releases\/latest\/download\/possibilities-act1\.json$/);
  assert.equal(manifest.quickstart.adventures.possibilities.uuid, `Compendium.possibilities-act1.adventure.Adventure.${ADVENTURE._id}`);
  for ( const p of manifest.packs ) assert.ok(fs.existsSync(path.join(ROOT, p.path)), `pack ${p.name} is built`);
  for ( const f of [...manifest.esmodules, ...manifest.styles, ...manifest.languages.map(l => l.path)] ) assert.ok(fs.existsSync(path.join(ROOT, f)), f);
});

test("the Adventure has everything Act 1 needs", () => {
  assert.equal(ADVENTURE.scenes.length, 7);
  assert.equal(ADVENTURE.playlists.length, 7);
  assert.ok(ADVENTURE.scenes.every(s => !s.flags["possibilities-act1"].placeholder), "every map has art");
  const names = ADVENTURE.journal.map(j => j.name);
  for ( const n of ["Act 1: Ashford Roads", "Ashford", "People of Ashford", "Stupid, Basic, and Naive Questions", "Act 1 Handouts", "Glossary", "My Story"] ) assert.ok(names.includes(n), n);
  const act1 = ADVENTURE.journal.find(j => j.name === "Act 1: Ashford Roads");
  assert.ok(act1.pages.some(p => p.name === "Setting primer"));
  const types = new Set(ADVENTURE.actors.map(a => a.type));
  assert.deepEqual([...types].sort(), ["hero", "npc", "obstacle"]);
  const corpses = ADVENTURE.scenes.find(s => s.flags["possibilities-act1"].key === "undercourses").tokens.filter(t => t.flags["possibilities-act1"].actorKey === "sellsword");
  assert.equal(corpses.length, 3);
  assert.ok(corpses.every(t => t.delta.effects[0].statuses.includes("dead")));
});
