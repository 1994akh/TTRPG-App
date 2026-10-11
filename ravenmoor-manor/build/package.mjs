/**
 * npm run package: zip the installable module into dist/ravenmoor-manor.zip, with a copy of module.json beside it.
 * Contents: module.json, scripts, styles, lang, assets (minus previews), packs, README and licences.
 *
 * npm run package -- --release v1.2.0: the same, for a GitHub release with that tag (the Release workflow runs this).
 * The packaged module.json takes its version from the tag and its download link from that release, so an installed
 * copy keeps pointing at the zip it came from while `manifest` keeps pointing at the latest release for updates.
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

const flag = process.argv.indexOf("--release");
if ( flag !== -1 ) {
  const tag = process.argv[flag + 1] ?? "";
  const version = /^v?(\d+(?:\.\d+)*)$/.exec(tag)?.[1];
  if ( !version ) {
    console.error(`Release tag "${tag}" is not a version number (expected something like v1.0.0).`);
    process.exit(1);
  }
  manifest.version = version;
  manifest.download = `${manifest.url}/releases/download/${tag}/${MODULE_ID}.zip`;
  files["module.json"] = [Buffer.from(`${JSON.stringify(manifest, null, 2)}\n`), { level: 6 }];
}

const zip = zipSync(files);
fs.mkdirSync(path.join(ROOT, "dist"), { recursive: true });
const dest = path.join(ROOT, "dist", `${MODULE_ID}.zip`);
fs.writeFileSync(dest, zip);
fs.writeFileSync(path.join(ROOT, "dist", "module.json"), files["module.json"][0]);
console.log(`Wrote dist/${MODULE_ID}.zip (${Object.keys(files).length} files, ${(zip.length / 1048576).toFixed(1)} MB) for v${manifest.version}`);
