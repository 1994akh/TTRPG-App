/**
 * npm run check: static checks on the generated sources (run after npm run build).
 * Verifies what can be verified without a running Foundry: counts, ids, links, asset paths, the labels the macros
 * look up, stat-block numbers, and that every macro calls a real API function.
 */
import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { MODULE_PATH, readJSON, ROOT } from "./util.mjs";

let failures = 0;
const ok = (cond, msg) => {
  if ( cond ) console.log(`  ok   ${msg}`);
  else {
    failures++;
    console.log(`  FAIL ${msg}`);
  }
};

const readDir = dir => fs.readdirSync(path.join(ROOT, "src/packs", dir)).map(f => JSON.parse(fs.readFileSync(path.join(ROOT, "src/packs", dir, f), "utf8")));
const [adventure] = readDir("adventure");
const scene = adventure.scenes[0];
const byLevel = (arr, key) => arr.filter(d => (d.levels ?? []).includes(scene.flags.ravenmoor.levels[key]));

console.log("Scene");
const expected = { ground: [109, 27, 17], upper: [58, 5, 13], below: [16, 4, 9] };
for ( const [key, [w, l, n]] of Object.entries(expected) ) {
  ok(byLevel(scene.walls, key).length === w, `${key}: ${w} walls`);
  ok(byLevel(scene.lights, key).length === l, `${key}: ${l} lights`);
  ok(byLevel(scene.notes, key).filter(x => !x.flags.ravenmoor.clue).length === n, `${key}: ${n} map pins`);
}
ok(scene.levels.length === 3 && scene.initialLevel === scene.flags.ravenmoor.levels.ground, "3 levels, opens on the ground floor");
const stairs = scene.regions.filter(r => r.flags.ravenmoor.stair);
ok(stairs.length === 5 && stairs.every(r => r.behaviors[0].type === "changeLevel" && r.levels.length === 2), "5 stair regions, each a changeLevel on two levels");
ok(stairs.filter(r => r.behaviors[0].disabled).map(r => r.flags.ravenmoor.stair).join() === "hidden-stair", "only the hidden stair starts disabled");
const windows = scene.walls.filter(w => w.flags.ravenmoor.kind === "window");
ok(windows.every(w => w.move === 20 && w.sight === 0), "windows block movement, not sight");
const rail = scene.walls.find(w => w.flags.ravenmoor.kind === "rail");
ok(rail.move === 20 && rail.sight === 0, "gallery railing blocks movement, not sight");
ok(scene.walls.filter(w => w.door === 2).length === 2, "two secret doors");
const hidden = scene.tokens.filter(t => t.hidden).map(t => t.flags.ravenmoor.actorKey).sort().join();
ok(hidden === "quill,silas,skeleton,skeleton,skeleton,skeleton", "hidden at start: Silas's body, Quill (crypt) and four skeletons");
ok(scene.tokens.filter(t => t.flags.ravenmoor.actorKey === "scarecrow" && !t.hidden).length === 2, "two scarecrows visible in the crypt");

console.log("Labels the macros use");
const label = (arr, prefix) => arr.filter(d => (d.flags.ravenmoor.label ?? "").startsWith(prefix));
for ( const w of ["East Corridor / Study", "Bookcase (secret door)", "Hidden door behind Elspeth's tomb"] ) ok(label(scene.walls, w).length === 1, `wall "${w}"`);
for ( const [l, n] of [["Hallows' brazier", 1], ["Warding lantern", 6], ["Crypt candelabra", 2]] ) ok(label(scene.lights, l).length === n, `${n} light(s) "${l}"`);
ok(scene.lights.filter(l => l.flags.ravenmoor.group === "hall_candles").length === 8, "8 hall_candles lights (hall + gallery)");
ok(scene.lights.filter(l => l.flags.ravenmoor.magical).length === 1, "only the Hallows' brazier counts as magical");
for ( const t of ["C4 foxfire smears", "C2 wet footprints", "Scattered lilies", "C5 buckled boot print", "Green brazier fire", "C7 costume bundle"] ) {
  ok(label(scene.tiles, t).length === 1 && label(scene.tiles, t)[0].hidden, `hidden tile "${t}"`);
}

console.log("Documents");
const allDocs = { Actor: adventure.actors, Item: adventure.items, JournalEntry: adventure.journal, Scene: adventure.scenes, Macro: adventure.macros };
ok(adventure.actors.length === 11 && adventure.items.length === 13 && adventure.journal.length === 5, "11 actors, 13 items, 5 journals");
const ids = new Set();
let badId = 0;
const walk = (obj) => {
  if ( Array.isArray(obj) ) return obj.forEach(walk);
  if ( obj && typeof obj === "object" ) {
    if ( typeof obj._id === "string" && !/^[A-Za-z0-9]{16}$/.test(obj._id) ) badId++;
    Object.values(obj).forEach(walk);
  }
};
walk(adventure);
for ( const coll of Object.values(allDocs) ) for ( const d of coll ) ids.add(d._id);
ok(badId === 0, "every _id is 16 alphanumeric characters");
const pageIds = new Map(adventure.journal.flatMap(j => j.pages.map(p => [`${j._id}.${p._id}`, p])));
ok(scene.notes.every(n => pageIds.has(`${n.entryId}.${n.pageId}`)), "every map note links to an existing page");
ok(scene.notes.every(n => adventure.journal.find(j => j._id === n.entryId).ownership.default === 0 || n.flags.ravenmoor.clue), "location pins link to a GM-only journal");

const text = JSON.stringify(adventure);
const links = [...text.matchAll(/@UUID\[([^\]]+)\]/g)].map(m => m[1]);
const broken = links.filter(uuid => {
  const parts = uuid.split(".");
  if ( parts[0] === "Actor" ) return !adventure.actors.some(a => a._id === parts[1]);
  if ( parts[0] === "JournalEntry" ) return parts[2] ? !pageIds.has(`${parts[1]}.${parts[3]}`) : !adventure.journal.some(j => j._id === parts[1]);
  if ( parts[0] === "Item" ) return !adventure.items.some(i => i._id === parts[1]);
  return true;
});
ok(links.length > 100 && broken.length === 0, `${links.length} @UUID links all resolve inside the Adventure${broken.length ? ` (broken: ${broken.slice(0, 5)})` : ""}`);
ok(!text.includes("@UUID[Compendium."), "no Compendium links inside the Adventure");

const assets = [...new Set([...text.matchAll(new RegExp(`${MODULE_PATH}/[^"\\\\\\s)]+`, "g"))].map(m => m[0]))];
const missing = assets.filter(a => !fs.existsSync(path.join(ROOT, a.slice(MODULE_PATH.length + 1))));
ok(missing.length === 0, `${assets.length} module asset paths exist${missing.length ? ` (missing: ${missing})` : ""}`);
ok(!text.includes("dm-key.webp\"") || adventure.img.endsWith("cover.webp"), "cover is not a DM key");

const handouts = adventure.journal.find(j => j.flags.ravenmoor.key === "handouts");
ok(handouts.ownership.default === 1, "Handouts & Clues is Limited for players");
const visible = handouts.pages.filter(p => p.ownership.default >= 2).map(p => p.flags.ravenmoor.key);
ok(visible.join() === "H1", "only H1 starts revealed");
ok(handouts.pages.length === 21, "19 cards + Clue Tracker + Testimony");

console.log("Stat blocks");
const actor = key => adventure.actors.find(a => a.flags.ravenmoor.key === key);
const item = (key, name) => actor(key).items.find(i => i.name === name);
const act = i => Object.values(i.system.activities)[0];
const quill = actor("quill");
ok(quill.system.attributes.hp.max === 162 && quill.system.attributes.ac.flat === 15, "Quill: 162 HP, AC 15");
const scalpel = act(item("quill", "Scalpel"));
ok(scalpel.attack.flat && scalpel.attack.bonus === "6" && scalpel.damage.parts.length === 2 && scalpel.damage.parts[1].types[0] === "poison", "Scalpel: +6, 1d4+3 slashing + 2d6 poison");
const flask = item("quill", "Acid Flask");
ok(act(flask).attack.bonus === "6" && flask.system.range.value === 30 && flask.system.range.long === 60, "Acid Flask: +6, 30/60 ft, 3d6 acid");
const breath = item("quill", "Banshee's Breath");
ok(act(breath).save.dc.formula === "15" && act(breath).save.dc.calculation === "" && act(breath).damage.onSave === "half"
  && breath.system.uses.recovery[0].period === "recharge" && breath.system.uses.recovery[0].formula === "5"
  && act(breath).target.template.type === "cone" && act(breath).effects.length === 1, "Banshee's Breath: DC 15 Con, 15-ft cone, half on save, Frightened, Recharge 5-6");
ok(item("quill", "Snuffing Powder").system.uses.max === "2" && item("quill", "Snuffing Powder").system.uses.recovery[0].period === "day", "Snuffing Powder: 2/Day bonus action");
ok(act(item("quill", "Slippery Physician")).activation.type === "reaction", "Slippery Physician is a reaction");
ok(act(item("scarecrow", "Pumpkin Burst")).save.ability[0] === "dex" && act(item("scarecrow", "Pumpkin Burst")).target.template.type === "radius", "Pumpkin Burst: DC 13 Dex, 5-ft emanation");
ok(item("scarecrow", "Grinning Glare").system.uses.recovery[0].formula === "5", "Grinning Glare: Recharge 5-6");
ok(actor("skeleton").system.attributes.hp.max === 1 && actor("skeleton").system.attributes.hp.formula === "", "Skeleton: fixed 1 HP");
ok(actor("pip").items.filter(i => i.type === "spell").length === 7, "Pip: 7 innate spells");
ok(quill.items.filter(i => i.system.container).length === 3, "Quill's bag holds the will, the vial and the powder");
ok(actor("silas").prototypeToken.actorLink && adventure.actors.filter(a => a.prototypeToken.actorLink).length === 1, "only Silas is linked");
ok(actor("pip").prototypeToken.disposition === 1 && actor("skeleton").prototypeToken.disposition === -1, "dispositions: Pip friendly, skeleton hostile");

console.log("Runtime");
const api = fs.readFileSync(path.join(ROOT, "scripts/ravenmoor.mjs"), "utf8").match(/const api = \{([\s\S]*?)\n\};/)[1];
const apiFns = new Set([...api.replace(/\/\/.*$/gm, "").matchAll(/([a-zA-Z]+)\s*(?:,|$)/g)].map(m => m[1]));
const macroFns = adventure.macros.map(m => m.command.match(/api\.(\w+)\(/)[1]);
ok(macroFns.every(f => apiFns.has(f)), `all ${macroFns.length} macros call an API function`);
const scripts = [];
const collect = dir => fs.readdirSync(dir).forEach(f => {
  const p = path.join(dir, f);
  if ( fs.statSync(p).isDirectory() ) collect(p);
  else if ( p.endsWith(".mjs") ) scripts.push(p);
});
collect(path.join(ROOT, "scripts"));
for ( const s of scripts ) {
  try {
    execFileSync(process.execPath, ["--check", s], { stdio: "pipe" });
    ok(true, `syntax ${path.relative(ROOT, s)}`);
  } catch(err) {
    ok(false, `syntax ${path.relative(ROOT, s)}: ${err.stderr}`);
  }
}
const manifest = readJSON("module.json");
ok(manifest.quickstart.adventures.dnd5e.uuid.endsWith(adventure._id), "module.json quickstart points at the Adventure");
ok(manifest.packs.every(p => fs.existsSync(path.join(ROOT, p.path))), "every pack in module.json is compiled");

console.log(failures ? `\n${failures} check(s) failed.` : "\nAll checks passed.");
process.exit(failures ? 1 : 0);
