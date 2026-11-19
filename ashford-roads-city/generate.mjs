#!/usr/bin/env node
// Generates the Ashford Roads city art with Cloudflare Workers AI (FLUX.2), from prompts.json.
//
//   CF_ACCOUNT_ID=... CF_API_TOKEN=... node ashford-roads-city/generate.mjs --probe
//   node ashford-roads-city/generate.mjs style_anchor --candidates 4
//   node ashford-roads-city/generate.mjs skyline_key_art city_map --candidates 4
//   node ashford-roads-city/generate.mjs districts --candidates 3      (a group name runs every image in it)
//   add --draft to use the fast klein model for composition tests
//
// Output: out/<id>/<seed>.<ext> and out/log.json (prompt, settings, seed, file for every run).
// Reference images (final/*.png) must be 512x512 or smaller; if `sharp` is installed they are shrunk
// automatically, otherwise make 512px copies named <name>.512.png next to them.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const CFG = JSON.parse(fs.readFileSync(path.join(HERE, "prompts.json"), "utf8"));
const OUT = path.join(HERE, "out");
const { CF_ACCOUNT_ID: ACCOUNT, CF_API_TOKEN: TOKEN } = process.env;

const args = process.argv.slice(2);
const flag = n => args.includes(n);
const opt = (n, d) => { const i = args.indexOf(n); return i >= 0 ? args[i + 1] : d; };
const names = args.filter((a, i) => !a.startsWith("--") && !["--candidates", "--seeds"].includes(args[i - 1]));

if ( !ACCOUNT || !TOKEN ) {
  console.error("Set CF_ACCOUNT_ID and CF_API_TOKEN (a token with Workers AI permission) first.");
  process.exit(1);
}

const model = flag("--draft") ? CFG.draftModel : CFG.model;
const url = m => `https://api.cloudflare.com/client/v4/accounts/${ACCOUNT}/ai/run/${m}`;
const extOf = buf => (buf[0] === 0x89 ? "png" : buf[0] === 0xff ? "jpg" : buf.slice(8, 12).toString() === "WEBP" ? "webp" : "bin");

// Which optional fields this account's model accepts; --probe finds out, otherwise read from out/probe.json.
function accepted() {
  try { return JSON.parse(fs.readFileSync(path.join(OUT, "probe.json"), "utf8")); }
  catch { return { seed: false, guidance: false }; }
}

async function run(m, fields, files=[]) {
  const form = new FormData();
  for ( const [k, v] of Object.entries(fields) ) form.append(k, String(v));
  files.forEach((f, i) => form.append(`input_image_${i}`, new Blob([f.data], { type: f.type }), f.name));
  const res = await fetch(url(m), { method: "POST", headers: { Authorization: `Bearer ${TOKEN}` }, body: form });
  const body = await res.json().catch(() => ({}));
  if ( !res.ok || body.success === false ) {
    const msg = (body.errors ?? []).map(e => e.message).join("; ") || res.statusText;
    throw Object.assign(new Error(`${res.status} ${msg}`), { status: res.status });
  }
  const b64 = body.result?.image ?? body.image;
  if ( !b64 ) throw new Error("No image in the response: " + JSON.stringify(body).slice(0, 300));
  return Buffer.from(b64, "base64");
}

async function probe() {
  fs.mkdirSync(OUT, { recursive: true });
  const base = { prompt: "A brass charge-lamp glowing color #F2A541 in grey fog, oil painting.", steps: 4, width: 256, height: 256 };
  const result = { model: CFG.model, seed: false, guidance: false };
  for ( const key of ["seed", "guidance"] ) {
    try { await run(CFG.model, { ...base, [key]: key === "seed" ? 1001 : CFG.guidance }); result[key] = true; }
    catch ( e ) { console.log(`${key}: refused (${e.message})`); }
  }
  if ( result.seed ) {     // is the same seed reproducible?
    const a = await run(CFG.model, { ...base, seed: 7 });
    const b = await run(CFG.model, { ...base, seed: 7 });
    result.reproducible = a.equals(b);
  }
  fs.writeFileSync(path.join(OUT, "probe.json"), JSON.stringify(result, null, 1));
  console.log("Probe:", result);
}

async function reference(rel) {
  const file = path.join(HERE, rel);
  const small = file.replace(/\.(png|jpe?g|webp)$/i, ".512.png");
  if ( fs.existsSync(small) ) return { name: path.basename(small), type: "image/png", data: fs.readFileSync(small) };
  if ( !fs.existsSync(file) ) throw new Error(`Missing reference ${rel}: pick a candidate and copy it there first.`);
  try {
    const sharp = (await import("sharp")).default;
    const data = await sharp(file).resize(512, 512, { fit: "inside" }).png().toBuffer();
    return { name: path.basename(small), type: "image/png", data };
  } catch {
    throw new Error(`Make a 512px copy of ${rel} named ${path.basename(small)} (e.g. magick ${rel} -resize 512x512 ${path.relative(HERE, small)}), or npm install sharp.`);
  }
}

function promptFor(img) {
  const s = CFG.shared;
  const p = {
    scene: img.scene,
    references: img.references.length ? s.reference_line + (img.references.length > 1 ? " Follow the layout and rooflines of image 1." : "") : undefined,
    subjects: img.subjects,
    style: s.style,
    color_palette: s.color_palette,
    color_use: s.palette_use,
    lighting: img.lighting,
    mood: s.mood,
    composition: img.composition,
    camera: img.camera,
  };
  return JSON.stringify(p);
}

async function generate(img, seeds) {
  const ok = accepted();
  const files = [];
  for ( const r of img.references ) files.push(await reference(r));
  const dir = path.join(OUT, img.id);
  fs.mkdirSync(dir, { recursive: true });
  const logFile = path.join(OUT, "log.json");
  const log = fs.existsSync(logFile) ? JSON.parse(fs.readFileSync(logFile, "utf8")) : [];
  for ( const seed of seeds ) {
    const fields = { prompt: promptFor(img), width: img.width, height: img.height };
    if ( model === CFG.model ) fields.steps = CFG.steps;
    if ( ok.seed ) fields.seed = seed;
    if ( ok.guidance && model === CFG.model ) fields.guidance = CFG.guidance;
    process.stdout.write(`${img.id} seed ${seed}… `);
    try {
      const buf = await run(model, fields, files);
      const file = path.join(dir, `${seed}.${extOf(buf)}`);
      fs.writeFileSync(file, buf);
      log.push({ at: new Date().toISOString(), id: img.id, model, seed: ok.seed ? seed : null, run: seed, fields: { ...fields, prompt: undefined }, references: img.references, prompt: fields.prompt, file: path.relative(HERE, file) });
      console.log(path.relative(HERE, file));
    } catch ( e ) {
      console.log("failed: " + e.message);
      if ( e.status === 401 || e.status === 403 ) process.exit(1);
    }
    fs.writeFileSync(logFile, JSON.stringify(log, null, 1));
  }
}

if ( flag("--probe") ) { await probe(); process.exit(0); }
const wanted = CFG.images.filter(i => names.includes(i.id) || names.includes(i.group));
if ( !wanted.length ) {
  console.log("Name images or groups to make:", CFG.images.map(i => `${i.id} (${i.group})`).join(", "));
  process.exit(names.length ? 1 : 0);
}
const n = Number(opt("--candidates", 4));
const seeds = (opt("--seeds") ?? "").split(",").filter(Boolean).map(Number);
const list = seeds.length ? seeds : Array.from({ length: n }, (_, i) => CFG.seeds[i] ?? 1001 + i);
try { for ( const img of wanted ) await generate(img, list); }
catch ( e ) { console.error(e.message); process.exit(1); }
console.log("Done. Pick the best of each, copy it to final/<id>.png, and note the seed in final/CHOSEN.md.");
