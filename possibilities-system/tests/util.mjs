import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

export const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
export const readJSON = rel => JSON.parse(fs.readFileSync(path.join(ROOT, rel), "utf8"));

/** The rules data as rules.mjs expects it: {engine, races, classes, professions, skills, signatures, spells}. */
export function loadRules() {
  const out = {};
  for ( const name of ["engine", "races", "classes", "professions", "skills", "signatures", "spells"] ) {
    out[name] = readJSON(`data/rules/${name}.json`).data;
  }
  return out;
}
