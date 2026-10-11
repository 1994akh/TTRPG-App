import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

export const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
export const MODULE_ID = "ravenmoor-manor";
export const MODULE_PATH = `modules/${MODULE_ID}`;

/** Fixed timestamp so rebuilding produces identical sources. */
export const BUILD_TIME = Date.UTC(2026, 9, 31);
export const CORE_VERSION = "14.368";
export const SYSTEM_VERSION = "6.0.6";

/**
 * Read a JSON file relative to the module root.
 * @param {string} rel
 * @returns {any}
 */
export function readJSON(rel) {
  return JSON.parse(fs.readFileSync(path.join(ROOT, rel), "utf8"));
}

/**
 * Read a text file relative to the module root.
 * @param {string} rel
 * @returns {string}
 */
export function readText(rel) {
  return fs.readFileSync(path.join(ROOT, rel), "utf8");
}

/**
 * Turn an asset path from the data files ("assets/tokens/x.webp") into a Foundry path.
 * @param {string} rel
 * @returns {string}
 */
export function assetPath(rel) {
  if ( !rel ) return rel;
  if ( rel.startsWith("modules/") || rel.startsWith("icons/") || rel.startsWith("systems/") ) return rel;
  return `${MODULE_PATH}/${rel}`;
}

export { escapeHTML as esc } from "../scripts/lib/html.mjs";

/**
 * Document stats block shared by every generated document.
 * @param {string} [systemId]
 * @returns {object}
 */
export function stats(systemId="dnd5e") {
  return {
    coreVersion: CORE_VERSION,
    systemId,
    systemVersion: SYSTEM_VERSION,
    createdTime: BUILD_TIME,
    modifiedTime: BUILD_TIME,
    lastModifiedBy: null,
    compendiumSource: null,
    duplicateSource: null,
    exportSource: null
  };
}

/** Foundry ownership levels. */
export const OWNERSHIP = { NONE: 0, LIMITED: 1, OBSERVER: 2, OWNER: 3 };

/** Token dispositions. */
export const DISPOSITION = { SECRET: -2, HOSTILE: -1, NEUTRAL: 0, FRIENDLY: 1 };

/** Token display modes. */
export const DISPLAY = { NONE: 0, CONTROL: 10, OWNER_HOVER: 20, HOVER: 30, OWNER: 40, ALWAYS: 50 };

/**
 * Write one document as a JSON source file.
 * @param {string} dir   Directory under src/packs.
 * @param {object} doc
 */
export function writeSource(dir, doc) {
  const abs = path.join(ROOT, "src/packs", dir);
  fs.mkdirSync(abs, { recursive: true });
  const slug = String(doc.name ?? doc._id).toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  fs.writeFileSync(path.join(abs, `${slug}_${doc._id}.json`), `${JSON.stringify(doc, null, 2)}\n`);
}

/**
 * Remove a generated source directory.
 * @param {string} dir
 */
export function cleanSource(dir) {
  fs.rmSync(path.join(ROOT, "src/packs", dir), { recursive: true, force: true });
}

/**
 * Deep clone helper.
 * @template T
 * @param {T} x
 * @returns {T}
 */
export const clone = x => structuredClone(x);
