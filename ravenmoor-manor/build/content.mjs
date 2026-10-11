/**
 * Generate scripts/lib/generated.mjs: ids, card metadata and the adventure text the runtime needs (escalations,
 * read-alouds, edges, outcomes, lair rounds). Text is copied verbatim from data/content.
 */
import fs from "node:fs";
import path from "node:path";
import { id } from "./ids.mjs";
import { IDS } from "./scenes.mjs";
import { portraitFor } from "./actors.mjs";
import { readJSON, readText, ROOT } from "./util.mjs";

/** Strip Markdown emphasis. */
const plain = s => s.replace(/\*\*([^*]+)\*\*/g, "$1").replace(/\*([^*]+)\*/g, "$1").trim();

/**
 * Text under a "### " heading of adventure.md, up to the next heading.
 * @param {string} md
 * @param {string} heading
 * @returns {string}
 */
function under(md, heading) {
  const start = md.indexOf(`### ${heading}`);
  if ( start < 0 ) throw new Error(`adventure.md has no "### ${heading}"`);
  const rest = md.slice(md.indexOf("\n", start) + 1);
  const end = rest.search(/^#{2,3} /m);
  return end < 0 ? rest : rest.slice(0, end);
}

/** First "> " block in a chunk. */
const readAloud = chunk => plain(chunk.split("\n").filter(l => l.startsWith("> ")).map(l => l.slice(2)).join(" "));

/** Rows of a Markdown table. */
const tableRows = chunk => chunk.split("\n").filter(l => /^\|/.test(l) && !/^\|\s*-/.test(l)).slice(1)
  .map(l => l.split("|").slice(1, -1).map(c => plain(c)));

/**
 * @param {object} context
 * @param {Map<string, object>} context.items
 * @param {Map<string, object>} context.actors
 * @param {object} context.scene
 */
export function writeGenerated({ items, actors, scene }) {
  const md = readText("data/content/adventure.md");
  const handouts = readJSON("data/content/handouts.json");
  const npcs = readJSON("data/content/npcs.json");

  const escalations = {};
  for ( const line of under(md, "Escalations").split("\n").filter(l => l.startsWith("- **Candle")) ) {
    const m = line.match(/^- \*\*Candle (\d+): ([^*]+)\*\* (.*)$/);
    escalations[m[1]] = { title: `Candle ${m[1]}: ${m[2].replace(/\.$/, "")}`, text: plain(m[3]) };
  }

  const accusation = under(md, "The accusation (15 minutes)");
  const edges = {};
  for ( const [who, edge] of tableRows(accusation) ) {
    const m = who.match(/^(Who|How|Why): (.*)$/);
    if ( m ) edges[m[1].toLowerCase()] = { answer: m[2], edge };
  }
  const endingsSection = md.slice(md.indexOf("## Endings and epilogue"));
  const outcomes = tableRows(endingsSection.slice(0, endingsSection.indexOf("### The real ghost")))
    .map(([outcome, what, reward]) => ({ outcome, what, reward }));

  const content = {
    ids: {
      scene: scene._id,
      levels: scene.flags.ravenmoor.levels,
      journals: Object.fromEntries(["adventure", "dmguide", "locations", "handouts", "household"].map(k => [k, IDS.journal(k)])),
      pages: Object.fromEntries([...handouts.cards.map(c => c.id), "clue-tracker", "testimony"].map(k => [k, IDS.page("handouts", k)])),
      items: Object.fromEntries([...items].map(([k, v]) => [k, v._id])),
      actors: Object.fromEntries([...actors].map(([k, v]) => [k, v._id])),
      stairs: Object.fromEntries(scene.regions.filter(r => r.flags.ravenmoor.stair).map(r => [r.flags.ravenmoor.stair, r._id])),
      adventure: id("adventure:main")
    },
    partyStart: scene.flags.ravenmoor.partyStart,
    cards: handouts.cards.map(c => ({
      id: c.id, title: c.title, kind: c.kind, star: !!c.star, item: c.item ?? null, onReveal: c.onReveal ?? null,
      conclusions: c.conclusions ?? [], showAt: c.showAt, givenTo: c.givenTo, foundIn: c.foundIn?.label ?? ""
    })),
    testimony: handouts.testimony.map(t => ({ id: t.id, actor: t.actor, conclusions: t.conclusions })),
    conclusions: handouts.conclusions,
    unmask: handouts.unmask,
    text: {
      escalations,
      lightsOut: readAloud(under(md, "Scene 4: The Lantern Widow (8:55 PM)")),
      body: readAloud(under(md, "Scene 5: The body (9:00 PM)")),
      midnight: readAloud(accusation),
      showdown: readAloud(under(md, "The showdown (35 minutes)")),
      unmasking: readAloud(under(md, "The unmasking")),
      realGhost: readAloud(under(md, "The real ghost")),
      edges,
      outcomes,
      caneLine: "To whoever unmasks my killer, should it come to that: my cane, and my thanks."
    },
    // Item data for every module item, so players can receive items without access to the GM-only compendium.
    items: Object.fromEntries([...items].map(([k, v]) => {
      const { _id, folder, ...data } = v;
      return [k, data];
    })),
    // Handout 2's household, in its order, with each suspect's portrait (Scene 3: introduce the suspects).
    suspects: handouts.cards.find(c => c.id === "H2").table.rows.map(([name, who, costume]) => {
      const npc = npcs.actors.find(a => a.name === name);
      if ( !npc ) throw new Error(`Handout 2 names "${name}", who is not in npcs.json`);
      return { key: npc.key, name, who, costume, portrait: portraitFor(npc.token) };
    }),
    lair: npcs.actors.find(a => a.key === "quill").lair,
    encounter: npcs.encounter
  };

  const out = `// Generated by build/content.mjs from data/content. Do not edit; run npm run build.\n`
    + `export default ${JSON.stringify(content, null, 2)};\n`;
  fs.writeFileSync(path.join(ROOT, "scripts/lib/generated.mjs"), out);
  return content;
}
