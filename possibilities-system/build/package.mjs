/**
 * npm run package: dist/possibilities.zip (the installable system) and dist/system.json beside it.
 * npm run package -- --release v0.2.0: the same for a GitHub release; the version comes from the tag and the
 * download link points at that release's zip, while `manifest` keeps pointing at the latest release.
 */
import fs from "node:fs";
import path from "node:path";
import { zipSync } from "fflate";
import { ROOT, SYSTEM_ID } from "./util.mjs";

const INCLUDE = ["system.json", "README.md", "module", "templates", "styles", "lang", "fonts", "packs"];
const EXCLUDE = [/(^|\/)\.DS_Store$/, /(^|\/)LOCK$/, /(^|\/)LOG(\.old)?$/];

if ( !fs.existsSync(path.join(ROOT, "packs/races")) ) {
  console.error("packs/ is missing. Run `npm run build` first.");
  process.exit(1);
}

function collect(rel, out) {
  const abs = path.join(ROOT, rel);
  if ( !fs.existsSync(abs) ) return;
  if ( fs.statSync(abs).isDirectory() ) {
    for ( const name of fs.readdirSync(abs).sort() ) collect(path.posix.join(rel, name), out);
    return;
  }
  if ( EXCLUDE.some(re => re.test(rel)) ) return;
  out[rel] = [fs.readFileSync(abs), { level: /\.(ttf|ldb|webp|png)$/i.test(rel) ? 0 : 6 }];
}

const files = {};
for ( const rel of INCLUDE ) collect(rel, files);
const manifest = JSON.parse(fs.readFileSync(path.join(ROOT, "system.json"), "utf8"));
const flag = process.argv.indexOf("--release");
if ( flag !== -1 ) {
  const tag = process.argv[flag + 1] ?? "";
  const version = /^v?(\d+(?:\.\d+)*)$/.exec(tag)?.[1];
  if ( !version ) {
    console.error(`Release tag "${tag}" is not a version number (expected something like v0.1.0).`);
    process.exit(1);
  }
  manifest.version = version;
  manifest.download = `${manifest.url}/releases/download/${tag}/${SYSTEM_ID}.zip`;
}
const json = Buffer.from(`${JSON.stringify(manifest, null, 2)}\n`);
files["system.json"] = [json, { level: 6 }];
const zip = zipSync(files);
fs.mkdirSync(path.join(ROOT, "dist"), { recursive: true });
fs.writeFileSync(path.join(ROOT, "dist", `${SYSTEM_ID}.zip`), zip);
fs.writeFileSync(path.join(ROOT, "dist", "system.json"), json);
console.log(`Wrote dist/${SYSTEM_ID}.zip (${Object.keys(files).length} files, ${(zip.length / 1048576).toFixed(1)} MB) for v${manifest.version}`);
