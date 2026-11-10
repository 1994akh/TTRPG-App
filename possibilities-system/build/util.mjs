import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

export const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
export const SYSTEM_ID = "possibilities";
export const BUILD_TIME = Date.UTC(2026, 10, 10);
export const CORE_VERSION = "14.370";
export const SYSTEM_VERSION = JSON.parse(fs.readFileSync(path.join(ROOT, "system.json"), "utf8")).version;

export const readJSON = rel => JSON.parse(fs.readFileSync(path.join(ROOT, rel), "utf8"));

/** The rules data: {engine, races, classes, professions, skills, signatures, spells}. */
export function loadRules() {
  const out = {};
  for ( const name of ["engine", "races", "classes", "professions", "skills", "signatures", "spells"] ) {
    out[name] = readJSON(`data/rules/${name}.json`).data;
  }
  return out;
}

export function stats() {
  return {
    coreVersion: CORE_VERSION, systemId: SYSTEM_ID, systemVersion: SYSTEM_VERSION,
    createdTime: BUILD_TIME, modifiedTime: BUILD_TIME, lastModifiedBy: null,
    compendiumSource: null, duplicateSource: null, exportSource: null
  };
}

export function esc(s) {
  return String(s ?? "").replace(/[&<>"']/g, ch => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[ch]);
}

export function writeSource(dir, doc) {
  const abs = path.join(ROOT, "src/packs", dir);
  fs.mkdirSync(abs, { recursive: true });
  const slug = String(doc.name ?? doc._id).toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  fs.writeFileSync(path.join(abs, `${slug}_${doc._id}.json`), `${JSON.stringify(doc, null, 2)}\n`);
}

export function cleanSource(dir) {
  fs.rmSync(path.join(ROOT, "src/packs", dir), { recursive: true, force: true });
}
