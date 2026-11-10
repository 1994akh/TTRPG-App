/** scripts/lib/generated.mjs: the data the runtime needs, written by the build (do not edit by hand). */
import fs from "node:fs";
import path from "node:path";
import { byId, LORE, PROLOGUE_DRAFT, resolve, speakerName } from "./lore.mjs";
import { IDS, MAPS } from "./keys.mjs";
import { HANDOUTS, STEPS } from "./journals.mjs";
import { MACROS } from "./macros.mjs";
import { readJSON, ROOT } from "./util.mjs";

export function generatedContent({ actors, items, scenes }) {
  const config = readJSON("data/act1/config.json");
  const scripts = Object.fromEntries(LORE.scenes.map(s => [s.id, {
    name: s.name, style: s.fields.style,
    lines: (s.script ?? []).map(l => ("note" in l ? { note: resolve(l.note) }
      : ("choice" in l ? { choice: resolve(l.choice) } : { speaker: l.speaker, name: speakerName(l.speaker), text: resolve(l.text) })))
  }]));
  // The user's own prologue prose is read first, as narration.
  if ( PROLOGUE_DRAFT.length ) scripts.ch1_prologue.lines.unshift(...PROLOGUE_DRAFT.map(t => ({ speaker: "narrator", name: "Narrator", text: t, draft: true })));
  const questions = Object.entries(byId.scenes.ch1_questions.sections).map(([q, lines], i) => ({
    key: `q${i + 1}`, question: resolve(q.replace(/^Q:\s*/, "")), answer: [].concat(lines).map(resolve).join(" ")
  }));
  const pageIds = {};
  const add = (journal, key) => ((pageIds[journal] ??= {})[key] = IDS.page(journal, key));
  for ( const s of LORE.scenes ) add("act1", s.id);
  add("act1", "solo"); add("act1", "glance");
  for ( const p of LORE.places ) add("ashford", p.id);
  for ( const c of LORE.characters ) add("people", c.id);
  questions.forEach(q => add("questions", q.key));
  for ( const h of HANDOUTS ) add("handouts", h.key);
  for ( const s of STEPS ) add("story", `beat_${s.key}`);
  add("story", "log"); add("story", "cover");
  return {
    steps: STEPS, config, scripts, questions,
    handouts: HANDOUTS.map(h => ({ key: h.key, title: h.title, step: h.step })),
    intros: { Founding: "ch1_intro_founding", Beastkin: "ch1_intro_beastkin", Fae: "ch1_intro_fae", Monsterkin: "ch1_intro_monsterkin" },
    trio: ["enkrid", "protag2", "protag3"],
    sunPath: scenes.get("grate_chamber").flags["possibilities-act1"].sunPath,
    ids: {
      adventure: IDS.adventure,
      journals: Object.fromEntries(["act1", "ashford", "people", "questions", "handouts", "glossary", "story"].map(k => [k, IDS.journal(k)])),
      pages: pageIds,
      actors: Object.fromEntries([...actors.keys()].map(k => [k, IDS.actor(k)])),
      scenes: Object.fromEntries(MAPS.map(k => [k, IDS.scene(k)])),
      items: Object.fromEntries([...items.keys()].map(k => [k, IDS.item(k)])),
      macros: Object.fromEntries(MACROS.map(m => [m.fn, IDS.macro(m.fn)])),
      table: IDS.table("board"),
      sunLight: scenes.get("grate_chamber").lights.find(l => l.flags["possibilities-act1"].key === "sun")?._id ?? null
    },
    itemTemplates: Object.fromEntries([...items].map(([k, i]) => [k, { name: i.name, type: i.type, img: i.img, system: i.system,
      flags: i.flags }])),
    macros: MACROS.map(({ fn, name, slot, help }) => ({ fn, name, slot: slot ?? null, help }))
  };
}

export function writeGenerated(ctx) {
  const content = generatedContent(ctx);
  const out = "/* Written by build/content.mjs. Do not edit by hand. */\n"
    + `export const CONTENT = ${JSON.stringify(content, null, 1)};\n`;
  fs.writeFileSync(path.join(ROOT, "scripts/lib/generated.mjs"), out);
  return content;
}
