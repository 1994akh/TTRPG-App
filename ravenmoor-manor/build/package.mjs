/**
 * npm run package: zip the installable module into dist/ravenmoor-manor.zip.
 * Contents: module.json, scripts, styles, lang, assets (minus previews), packs, README and licences.
 */
import fs from "node:fs";
import path from "node:path";
import { zipSync } from "fflate";
import { MODULE_ID, ROOT } from "./util.mjs";

const INCLUDE = ["module.json", "README.md", "LICENSE-CONTENT.md", "scripts", "styles", "lang", "assets", "packs"];
const EXCLUDE = [/^assets\/previews\//, /(^|\/)\.DS_Store$/, /(^|\/)LOCK$/, /(^|\/)LOG(\.old)?$/];

if ( !fs.existsSync(path.join(ROOT, "packs/adventure")) ) {
  console.error("packs/ is missing. Run `npm run build` first.");
  process.exit(1);
}

/** Recursively collect files. */
function collect(rel, out) {
  const abs = path.join(ROOT, rel);
  if ( !fs.existsSync(abs) ) return;
  if ( fs.statSync(abs).isDirectory() ) {
    for ( const name of fs.readdirSync(abs).sort() ) collect(path.posix.join(rel, name), out);
    return;
  }
  if ( EXCLUDE.some(re => re.test(rel)) ) return;
  out[rel] = [fs.readFileSync(abs), { level: /\.(webp|png|jpg|ttf|ldb)$/i.test(rel) ? 0 : 6 }];
}

const files = {};
for ( const rel of INCLUDE ) collect(rel, files);
const manifest = JSON.parse(fs.readFileSync(path.join(ROOT, "module.json"), "utf8"));
const zip = zipSync(files);
fs.mkdirSync(path.join(ROOT, "dist"), { recursive: true });
const dest = path.join(ROOT, "dist", `${MODULE_ID}.zip`);
fs.writeFileSync(dest, zip);
fs.copyFileSync(path.join(ROOT, "module.json"), path.join(ROOT, "dist", "module.json"));
console.log(`Wrote dist/${MODULE_ID}.zip (${Object.keys(files).length} files, ${(zip.length / 1048576).toFixed(1)} MB) for v${manifest.version}`);
