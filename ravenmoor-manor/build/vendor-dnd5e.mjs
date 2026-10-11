/**
 * Copy the SRD 5.2 documents the module embeds (Pip's spells, the Lantern of Revealing) out of a dnd5e source
 * checkout into data/vendor/dnd5e. Run once per dnd5e release:
 *
 *   git clone --depth 1 --branch release-6.0.6 https://github.com/foundryvtt/dnd5e.git ../dnd5e
 *   npm run vendor -- ../dnd5e
 *
 * The copies are SRD 5.2 content (CC-BY-4.0); see README.md for the attribution.
 */
import fs from "node:fs";
import path from "node:path";
import yaml from "js-yaml";
import { ROOT } from "./util.mjs";

const SOURCES = {
  spells: [
    "spells24/cantrips/fire-bolt.yml",
    "spells24/cantrips/light.yml",
    "spells24/cantrips/mage-hand.yml",
    "spells24/cantrips/minor-illusion.yml",
    "spells24/cantrips/prestidigitation.yml",
    "spells24/1st-level/disguise-self.yml",
    "spells24/1st-level/silent-image.yml",
    "spells24/1st-level/shield.yml",
    "spells24/2nd-level/invisibility.yml"
  ],
  equipment: [
    "equipment24/equipment/lantern-of-revealing.yml"
  ]
};

const repo = process.argv[2];
if ( !repo ) {
  console.error("Usage: npm run vendor -- <path to a dnd5e source checkout>");
  process.exit(1);
}
const system = JSON.parse(fs.readFileSync(path.join(repo, "system.json"), "utf8"));
const outDir = path.join(ROOT, "data/vendor/dnd5e");
fs.mkdirSync(outDir, { recursive: true });

for ( const [group, files] of Object.entries(SOURCES) ) {
  const docs = files.map(f => {
    const doc = yaml.load(fs.readFileSync(path.join(repo, "packs/_source", f), "utf8"));
    delete doc._key;
    delete doc.folder;
    return doc;
  });
  const out = {
    _source: `dnd5e ${system.version} packs/_source (SRD 5.2, CC-BY-4.0)`,
    documents: docs
  };
  fs.writeFileSync(path.join(outDir, `${group}.json`), `${JSON.stringify(out, null, 2)}\n`);
  console.log(`Wrote ${docs.length} ${group} from dnd5e ${system.version}`);
}
