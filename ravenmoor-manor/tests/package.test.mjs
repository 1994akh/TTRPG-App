/**
 * The shipped artefacts: the compiled LevelDB packs read back to the source documents, and the release zip holds
 * everything the manifest and the documents reference.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { extractPack } from "@foundryvtt/foundryvtt-cli";
import { unzipSync } from "fflate";
import { ROOT } from "./harness.mjs";

const PACKS = ["adventure", "actors", "items", "macros"];

test("every compiled pack reads back with the same documents as its sources", async () => {
  for ( const pack of PACKS ) {
    const out = fs.mkdtempSync(path.join(os.tmpdir(), `rm-${pack}-`));
    await extractPack(path.join(ROOT, "packs", pack), out, { log: false });
    const read = fs.readdirSync(out).map(f => JSON.parse(fs.readFileSync(path.join(out, f), "utf8")));
    const src = fs.readdirSync(path.join(ROOT, "src/packs", pack)).map(f => JSON.parse(fs.readFileSync(path.join(ROOT, "src/packs", pack, f), "utf8")));
    assert.deepEqual(read.map(d => d._id).sort(), src.map(d => d._id).sort(), pack);
    if ( pack === "actors" ) {
      const quill = read.find(d => d.name === "Dr. Thaddeus Quill");
      assert.equal(quill.items.length, src.find(d => d._id === quill._id).items.length, "embedded items survive packing");
    }
    if ( pack === "adventure" ) {
      const [adv] = read;
      assert.equal(adv.scenes[0].walls.length, 183);
      assert.equal(adv.journal.length, 5);
      assert.equal(adv.actors.length, 11);
    }
    fs.rmSync(out, { recursive: true, force: true });
  }
});

test("packaging for a GitHub release stamps the tag's version and that release's zip; a bad tag is refused", () => {
  const run = (...args) => execFileSync(process.execPath, [path.join(ROOT, "build/package.mjs"), ...args], { cwd: ROOT, stdio: "pipe" });
  const source = JSON.parse(fs.readFileSync(path.join(ROOT, "module.json"), "utf8"));
  try {
    run("--release", "v1.2.3");
    const files = unzipSync(fs.readFileSync(path.join(ROOT, "dist/ravenmoor-manor.zip")));
    const packed = JSON.parse(new TextDecoder().decode(files["module.json"]));
    assert.deepEqual(JSON.parse(fs.readFileSync(path.join(ROOT, "dist/module.json"), "utf8")), packed, "dist/module.json matches the zip");
    assert.equal(packed.version, "1.2.3");
    assert.equal(packed.download, "https://github.com/1994akh/TTRPG-App/releases/download/v1.2.3/ravenmoor-manor.zip");
    assert.equal(packed.manifest, source.manifest, "updates still check the latest release");
    assert.deepEqual({ ...packed, version: source.version, download: source.download }, source, "nothing else changes");
    assert.equal(JSON.parse(fs.readFileSync(path.join(ROOT, "module.json"), "utf8")).version, source.version, "the source manifest is untouched");
    assert.throws(() => run("--release", "nightly"), /not a version number/);
  } finally {
    run();
  }
});

test("the release zip installs: manifest at the root and every referenced file present", () => {
  execFileSync(process.execPath, [path.join(ROOT, "build/package.mjs")], { cwd: ROOT, stdio: "pipe" });
  const files = unzipSync(fs.readFileSync(path.join(ROOT, "dist/ravenmoor-manor.zip")));
  const names = new Set(Object.keys(files));
  const manifest = JSON.parse(new TextDecoder().decode(files["module.json"]));
  assert.equal(manifest.id, "ravenmoor-manor");
  for ( const f of [...manifest.esmodules, ...manifest.styles, ...manifest.languages.map(l => l.path)] ) assert.ok(names.has(f), f);
  for ( const p of manifest.packs ) assert.ok([...names].some(n => n.startsWith(`${p.path}/`)), p.path);
  assert.ok(![...names].some(n => n.startsWith("assets/previews/") || n.startsWith("build/") || n.startsWith("data/") || n.startsWith("tests/")),
    "nothing that should not ship");
  // Every module asset the documents, styles and scripts point at is in the zip.
  const text = [...names].filter(n => /\.(json|mjs|css)$/.test(n) || n.startsWith("packs/")).map(n => new TextDecoder().decode(files[n])).join("\n")
    + fs.readFileSync(path.join(ROOT, "src/packs/adventure", fs.readdirSync(path.join(ROOT, "src/packs/adventure"))[0]), "utf8");
  const refs = new Set([...text.matchAll(/modules\/ravenmoor-manor\/(assets\/[A-Za-z0-9_\-/.[\]]+?\.(?:webp|png|ttf|svg))/g)].map(m => m[1]));
  for ( const m of text.matchAll(/url\("\.\.\/(assets\/[^"]+)"\)/g) ) refs.add(m[1]);
  assert.ok(refs.size > 40, `found ${refs.size} asset references`);
  const missing = [...refs].filter(r => !names.has(r));
  assert.deepEqual(missing, []);
  // Every script import inside the zip resolves inside the zip.
  for ( const n of [...names].filter(x => x.endsWith(".mjs")) ) {
    const src = new TextDecoder().decode(files[n]);
    for ( const m of src.matchAll(/from "(\.{1,2}\/[^"]+)"/g) ) {
      const target = path.posix.normalize(path.posix.join(path.posix.dirname(n), m[1]));
      assert.ok(names.has(target), `${n} imports ${m[1]}`);
    }
  }
});
