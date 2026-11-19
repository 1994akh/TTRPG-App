#!/usr/bin/env node
// Ashford Roads city art on Cloudflare Workers AI (FLUX.2 [klein] 4B), free allowance only.
//
//   node ashford-roads-city/generate.mjs style_anchor --dry-run          # the plan and its neurons; no key, nothing sent
//   node ashford-roads-city/generate.mjs style_anchor --draft --candidates 8   # 512 px composition tests (cheap)
//   node ashford-roads-city/generate.mjs style_anchor --candidates 4      # full size
//   node ashford-roads-city/generate.mjs districts --seeds 1003,1007     # a group name runs every image in it
//   node ashford-roads-city/generate.mjs --tally                         # today's neurons, shared with Game-Gumbo's cf_gen.py
//
// Keys: CLOUDFLARE_ACCOUNT_ID and CLOUDFLARE_API_TOKEN (Workers AI permission) in the environment, read at call
// time and never printed or written. The daily tally is the same file Game-Gumbo's cf_gen.py keeps
// (~/.gumbo/cloudflare-neurons.json), so both tools share one budget; a run that would pass the cap is refused
// before anything is sent. Output: out/<id>/<seed>[_draft].<ext> and out/log.json.
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const CFG = JSON.parse(fs.readFileSync(path.join(HERE, "prompts.json"), "utf8"));
const OUT = path.join(HERE, "out");
const L = CFG.limits, COST = CFG.cost, S = CFG.shared;

const args = process.argv.slice(2);
const flag = n => args.includes(n);
const opt = n => { const i = args.indexOf(n); return i >= 0 ? args[i + 1] : undefined; };
const names = args.filter((a, i) => !a.startsWith("--") && !["--candidates", "--seeds", "--guidance"].includes(args[i - 1]));
const DRY = flag("--dry-run"), DRAFT = flag("--draft");

// ---- the shared daily tally (UTC day, as Cloudflare resets at 00:00 UTC) ------------------------------------
const STATE = CFG.state_file.replace(/^~/, os.homedir());
const today = () => new Date().toISOString().slice(0, 10);
function loadState() {
  let d = {};
  try { d = JSON.parse(fs.readFileSync(STATE, "utf8")); } catch { /* none yet */ }
  return d && d.date === today() ? d : { date: today(), neurons: 0, calls: 0, exhausted: false };
}
function saveState(d) {
  fs.mkdirSync(path.dirname(STATE), { recursive: true });
  fs.writeFileSync(STATE + ".tmp", JSON.stringify(d, null, 1) + "\n");
  fs.renameSync(STATE + ".tmp", STATE);
}
const roomLeft = d => (d.exhausted ? 0 : Math.max(0, COST.daily_cap - d.neurons));
const tiles = (w, h) => Math.ceil(w / 512) * Math.ceil(h / 512);
const neurons = (w, h, refs) => Math.round((tiles(w, h) * COST.per_output_tile + refs * COST.per_input_image) * 100) / 100;

// ---- prompt, size and references ---------------------------------------------------------------------------
function sizeOf(img) {
  let { width: w, height: h } = img;
  if ( DRAFT ) { const k = 512 / Math.max(w, h); w *= k; h *= k; }
  const fit = v => Math.min(L.max_px, Math.max(L.min_px, Math.round(v / L.multiple) * L.multiple));
  return [fit(w), fit(h)];
}

// An image may override style, mood, avoid or reference_line (the map does: ink and wash, not oil paint, and its one
// reference is a layout, not a style anchor), and may set
// color_palette to false to drop the bare hex list when its `colors` line already ties every hex to an object.
function promptFor(img) {
  const refs = img.references.length;
  return JSON.stringify({
    scene: img.scene,
    references: refs ? (img.reference_line ?? S.reference_line + (refs > 1 ? S.layout_line : "")) : undefined,
    subjects: img.subjects.map(s => `${s.description} (${s.position})`),
    style: img.style ?? S.style,
    color_palette: img.color_palette === false ? undefined : S.color_palette,
    colors: img.colors ?? S.palette_use,
    lighting: img.lighting,
    mood: img.mood ?? S.mood,
    composition: img.composition,
    camera: img.camera?.angle,
    avoid: img.avoid ?? S.avoid,
  });
}

function pngSize(buf) {
  return buf.slice(1, 4).toString() === "PNG" ? [buf.readUInt32BE(16), buf.readUInt32BE(20)] : null;
}

async function reference(rel) {
  const file = path.join(HERE, rel);
  const small = file.replace(/\.(png|jpe?g|webp)$/i, ".512.png");
  for ( const f of [small, file] ) {
    if ( !fs.existsSync(f) ) continue;
    const data = fs.readFileSync(f), size = pngSize(data);
    if ( size && Math.max(...size) <= L.ref_max_px ) return { name: path.basename(f), data };
  }
  if ( !fs.existsSync(file) ) throw new Error(`Missing ${rel}: pick a candidate and copy it there first.`);
  try {
    const sharp = (await import("sharp")).default;
    return { name: path.basename(small), data: await sharp(file).resize(L.ref_max_px, L.ref_max_px, { fit: "inside" }).png().toBuffer() };
  } catch {
    throw new Error(`${rel} must be at most ${L.ref_max_px} px for a reference. Make a copy named ${path.basename(small)}:\n`
      + `  python -c "from PIL import Image; i=Image.open(r'${file}'); i.thumbnail((${L.ref_max_px},${L.ref_max_px})); i.save(r'${small}')"`);
  }
}

// ---- the call ------------------------------------------------------------------------------------------------
const HOST = "https://api.cloudflare.com";
const extOf = b => (b[0] === 0x89 ? "png" : b[0] === 0xff ? "jpg" : b.slice(8, 12).toString() === "WEBP" ? "webp" : "bin");

async function call(account, token, fields, refs) {
  const form = new FormData();
  for ( const [k, v] of Object.entries(fields) ) form.append(k, String(v));
  refs.forEach((r, i) => form.append(`input_image_${i}`, new Blob([r.data], { type: "image/png" }), r.name));
  // redirect "manual": the Authorization header must never follow a redirect to another host.
  const res = await fetch(`${HOST}/client/v4/accounts/${account}/ai/run/${CFG.model}`,
    { method: "POST", headers: { Authorization: `Bearer ${token}` }, body: form, redirect: "manual" });
  const body = await res.json().catch(() => null);
  const codes = (body?.errors ?? []).map(e => e.code);
  const text = (body?.errors ?? []).map(e => e.message).join("; ").replaceAll(token, "[token]").replaceAll(account, "[account]");
  const b64 = res.ok ? (body?.result?.image ?? body?.image) : null;
  return { status: res.status, codes, text, image: b64 ? Buffer.from(b64, "base64") : null };
}

async function generate(img, seeds, keys) {
  const [w, h] = sizeOf(img);
  const prompt = promptFor(img);
  if ( prompt.length > L.max_prompt ) throw new Error(`${img.id}: prompt is ${prompt.length} characters; the limit is ${L.max_prompt}.`);
  const each = neurons(w, h, img.references.length);
  const state = loadState();
  console.log(`${img.id}: ${w}x${h}${DRAFT ? " (draft)" : ""}, ${img.references.length} reference(s), ~${each} neurons each, `
    + `${(each * seeds.length).toFixed(0)} for ${seeds.length}; today ${state.neurons.toFixed(0)} of ${COST.daily_cap} used.`);
  if ( DRY ) { console.log(`  prompt (${prompt.length} chars): ${prompt.slice(0, 160)}…`); return; }
  if ( each * seeds.length > roomLeft(state) ) {
    const fit = Math.floor(roomLeft(state) / each);
    throw new Error(`Refused: that would pass today's cap (${fit} picture(s) still fit). Nothing sent; the day resets 00:00 UTC.`);
  }
  const refs = [];
  for ( const r of img.references ) refs.push(await reference(r));
  const dir = path.join(OUT, img.id);
  fs.mkdirSync(dir, { recursive: true });
  const logFile = path.join(OUT, "log.json");
  const log = fs.existsSync(logFile) ? JSON.parse(fs.readFileSync(logFile, "utf8")) : [];
  const guidance = Number(opt("--guidance") ?? CFG.guidance);
  for ( const seed of seeds ) {
    const st = loadState();
    if ( each > roomLeft(st) ) throw new Error(`Daily cap reached before seed ${seed}. Stopped.`);
    process.stdout.write(`  seed ${seed}… `);
    const r = await call(keys.account, keys.token, { prompt, width: w, height: h, seed, guidance }, refs);
    if ( r.image || r.status >= 500 ) { st.neurons = Math.round((st.neurons + each) * 100) / 100; st.calls += 1; }
    if ( [3036, 4006].some(c => r.codes.includes(c)) || /daily free allocation/i.test(r.text) ) {
      st.exhausted = true; saveState(st);
      throw new Error(`Cloudflare says today's free allowance is used (HTTP ${r.status}). Stopped; it resets 00:00 UTC.`);
    }
    saveState(st);
    if ( r.status === 429 ) throw new Error(`Rate limited at seed ${seed}. Wait a minute, then run again with --seeds ${seed},…`);
    if ( r.status === 401 || r.status === 403 ) throw new Error(`HTTP ${r.status}: the token lacks Workers AI permission or the account id is wrong.`);
    if ( r.codes.includes(3030) ) { console.log(`flagged by Cloudflare's output check (3030): ${r.text}. Skipped.`); continue; }
    if ( !r.image ) { console.log(`failed: HTTP ${r.status} ${r.text}`); continue; }
    const file = path.join(dir, `${seed}${DRAFT ? "_draft" : ""}.${extOf(r.image)}`);
    fs.writeFileSync(file, r.image);
    log.push({ at: new Date().toISOString(), id: img.id, model: CFG.model, seed, guidance, width: w, height: h, draft: DRAFT,
      references: img.references, neurons_estimate: each, prompt, file: path.relative(HERE, file), status: "draft" });
    fs.writeFileSync(logFile, JSON.stringify(log, null, 1));
    console.log(path.relative(HERE, file));
  }
}

// ---- main ----------------------------------------------------------------------------------------------------
if ( flag("--tally") ) { const s = loadState(); console.log(`UTC ${s.date}: ${s.neurons} of ${COST.daily_cap} neurons, ${s.calls} calls${s.exhausted ? ", allowance used" : ""}.`); process.exit(0); }
const wanted = CFG.images.filter(i => names.includes(i.id) || names.includes(i.group));
if ( !wanted.length ) {
  console.log("Name images or groups:", CFG.images.map(i => `${i.id} (${i.group})`).join(", "));
  process.exit(names.length ? 1 : 0);
}
const keys = { account: process.env.CLOUDFLARE_ACCOUNT_ID, token: process.env.CLOUDFLARE_API_TOKEN };
if ( !DRY && (!keys.account || !keys.token) ) {
  console.error("Set CLOUDFLARE_ACCOUNT_ID and CLOUDFLARE_API_TOKEN (Workers AI permission) in the environment first.");
  process.exit(1);
}
const given = (opt("--seeds") ?? "").split(",").filter(Boolean).map(Number);
const n = Number(opt("--candidates") ?? 4);
const seeds = given.length ? given : CFG.seeds.slice(0, n);
try { for ( const img of wanted ) await generate(img, seeds, keys); }
catch ( e ) { console.error(e.message); process.exit(1); }
if ( !DRY ) console.log("Pick the best of each, copy it to final/<id>.png and note it in final/CHOSEN.md.");
