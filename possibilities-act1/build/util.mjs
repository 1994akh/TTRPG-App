import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

export const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
export const MODULE_ID = "possibilities-act1";
export const SYSTEM_ID = "possibilities";
export const MODULE_PATH = `modules/${MODULE_ID}`;
export const SCOPE = "possibilities-act1";

/** Fixed timestamp so rebuilding produces identical sources. */
export const BUILD_TIME = Date.UTC(2026, 10, 10);
export const CORE_VERSION = "14.370";
export const SYSTEM_VERSION = "0.1.0";

/** Read a JSON file relative to the module root. */
export function readJSON(rel) {
  return JSON.parse(fs.readFileSync(path.join(ROOT, rel), "utf8"));
}

/** Does a file exist relative to the module root? */
export function exists(rel) {
  return !!rel && fs.existsSync(path.join(ROOT, rel));
}

/** "assets/x.webp" -> "modules/possibilities-act1/assets/x.webp"; core paths unchanged. */
export function assetPath(rel) {
  if ( !rel ) return rel;
  if ( /^(modules|icons|systems)\//.test(rel) ) return rel;
  return `${MODULE_PATH}/${rel}`;
}

/** A module asset if it has been made, else a core fallback icon (the maps helper's art lands separately). */
export function assetOr(rel, fallback) {
  return exists(rel) ? assetPath(rel) : fallback;
}

export { escapeHTML as esc } from "../scripts/lib/html.mjs";

/** Document stats block shared by every generated document. */
export function stats(systemId=SYSTEM_ID) {
  return {
    coreVersion: CORE_VERSION, systemId, systemVersion: SYSTEM_VERSION,
    createdTime: BUILD_TIME, modifiedTime: BUILD_TIME, lastModifiedBy: null,
    compendiumSource: null, duplicateSource: null, exportSource: null
  };
}

export const OWNERSHIP = { NONE: 0, LIMITED: 1, OBSERVER: 2, OWNER: 3 };
export const DISPOSITION = { SECRET: -2, HOSTILE: -1, NEUTRAL: 0, FRIENDLY: 1 };
export const DISPLAY = { NONE: 0, CONTROL: 10, OWNER_HOVER: 20, HOVER: 30, OWNER: 40, ALWAYS: 50 };

/** Write one document as a JSON source file. */
export function writeSource(dir, doc) {
  const abs = path.join(ROOT, "src/packs", dir);
  fs.mkdirSync(abs, { recursive: true });
  const slug = String(doc.name ?? doc._id).toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  fs.writeFileSync(path.join(abs, `${slug}_${doc._id}.json`), `${JSON.stringify(doc, null, 2)}\n`);
}

export function cleanSource(dir) {
  fs.rmSync(path.join(ROOT, "src/packs", dir), { recursive: true, force: true });
}

export const clone = x => structuredClone(x);
export const slug = s => String(s).toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
