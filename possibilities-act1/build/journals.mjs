/**
 * The Adventure's journals: Act 1 (the running guide, one page per lore scene), Ashford (places), People of Ashford,
 * Stupid, Basic, and Naive Questions, Handouts, Glossary, and My Story (the user's own chronicle).
 *
 * Links: @UUID[...] for documents (world ids survive the Adventure import), and @Act1[fn]{label} / @Act1[fn:arg]{label}
 * for module actions (the runtime's enricher turns them into buttons). {pc} stays in the text; the runtime enricher
 * shows the player character's name.
 */
import { byId, isDraft, LORE, resolve, speakerName, titleCase } from "./lore.mjs";
import { IDS, MAPS, pageUuid } from "./keys.mjs";
import { assetOr, esc, OWNERSHIP, readJSON, stats, SCOPE } from "./util.mjs";

export const STEPS = readJSON("data/act1/steps.json").steps;
export const HANDOUTS = readJSON("data/act1/handouts.json").handouts;
const CONFIG = readJSON("data/act1/config.json");
const PRIMER = readJSON("data/act1/primer.json");
const WATCH = readJSON("data/act1/items.json").key.find(k => k.key === "pocket_watch");

/** Young Enkrid's choices in the flashback (narration only, no dice). Draft by Claude. */
const FLASHBACK_CHOICES = {
  2: ["Young Enkrid stays down and waits for it to be over.", "Young Enkrid gets up anyway."],
  9: ["Young Enkrid holds up his hands: look, they work.", "Young Enkrid says nothing, and stares at the chart case."]
};

const DRAFT = "<span class=\"pa1-badge pa1-draft\" data-tooltip=\"Draft by Claude: replace it with your own whenever you like\">Draft by Claude</span>";
const WRITTEN = "<span class=\"pa1-badge pa1-written\">Your canon</span>";
const badge = entry => (isDraft(entry) ? DRAFT : WRITTEN);
const draftNote = html => `<aside class="pa1-draftnote">${DRAFT} ${html}</aside>`;
const p = text => `<p>${esc(resolve(text))}</p>`;
const run = (fn, label) => `@Act1[${fn}]{${label}}`;
const actorLink = key => `@UUID[Actor.${IDS.actor(key)}]{${byId.characters[key]?.name ?? key}}`;

/** Where a map note's page lives. */
export function journalForPage(key) {
  if ( byId.scenes[key] ) return "act1";
  if ( byId.places[key] ) return "ashford";
  if ( byId.characters[key] ) return "people";
  if ( HANDOUTS.some(h => h.key === key) ) return "handouts";
  return null;
}

/** The lore scene's script as a gaslit play script. Each line can be read to chat (double-click, GM). */
export function scriptHTML(scene, extraChoices={}) {
  const out = [];
  let index = -1;
  let choices = [];
  const flushChoices = () => {
    if ( !choices.length ) return;
    out.push(`<ul class="pa1-choices">${choices.map(c => `<li>${esc(resolve(c))}</li>`).join("")}</ul>`);
    choices = [];
  };
  for ( const line of scene.script ?? [] ) {
    index++;
    if ( "choice" in line ) {
      choices.push(line.choice);
      continue;
    }
    flushChoices();
    if ( "note" in line ) out.push(`<p class="pa1-note">${esc(resolve(line.note))}</p>`);
    else {
      const who = speakerName(line.speaker);
      out.push(`<blockquote class="pa1-line pa1-readaloud" data-speaker="${esc(line.speaker)}">`
        + `<span class="pa1-speaker">${esc(who)}</span> ${esc(resolve(line.text))}</blockquote>`);
    }
    if ( extraChoices[index] ) {
      out.push(`<div class="pa1-choices pa1-draftchoices"><p class="pa1-muted">${DRAFT} A choice for young Enkrid (no dice; it colours the telling):</p>`
        + `<ul>${extraChoices[index].map(c => `<li>${esc(c)}</li>`).join("")}</ul></div>`);
    }
  }
  flushChoices();
  return `<div class="pa1-script">${out.join("")}</div>`;
}

/** Sections (Heading 2 entries) of a lore entry. */
function sectionsHTML(entry, { heading="h3" }={}) {
  return Object.entries(entry.sections ?? {}).map(([title, lines]) =>
    `<${heading}>${esc(resolve(title))}</${heading}>${(Array.isArray(lines) ? lines : [lines]).map(p).join("")}`).join("");
}

function textPage(journal, key, name, content, { sort=0, ownership={ default: -1 }, flags={} }={}) {
  return {
    _id: IDS.page(journal, key), name, type: "text",
    title: { show: true, level: 1 },
    text: { format: 1, content: `<div class="pa1-page">${content}</div>` },
    sort, ownership, flags: { [SCOPE]: { key, ...flags } }, _stats: stats()
  };
}

function entry(key, name, pages, folder, { ownership=OWNERSHIP.NONE, flags={} }={}) {
  return {
    _id: IDS.journal(key), name, pages, categories: [], folder, sort: 0,
    ownership: { default: ownership }, flags: { [SCOPE]: { key, ...flags } }, _stats: stats()
  };
}

/** Which step a lore scene belongs to. */
export const stepForScene = id => STEPS.find(s => s.scenes.includes(id));

/* -------------------------------------------- */

function act1Journal(folder) {
  const pages = [];
  let sort = 0;
  const next = () => (sort += 1000);
  const steps = STEPS.map(s => `<li><strong>${s.n}.</strong> ${esc(s.title)} <span class="pa1-muted">(${s.scenes.map(id =>
    `@UUID[${pageUuid("act1", id)}]{${esc(byId.scenes[id].name)}}`).join(", ")})</span></li>`).join("");
  const purse = CONFIG.purse;
  pages.push(textPage("act1", "solo", "How to play it", `
    <h2>Playing Act 1 on your own</h2>
    ${draftNote("How-to text written for the module.")}
    <p>You are the GM and the player. You play <strong>{pc}</strong>, your own character, and you also run Enkrid, Rook and Tova, who follow the story's paths. Everything else (the broker, the rats, the Gloam) is yours to run as GM.</p>
    <ol>
      <li><strong>Open the Act 1 Director</strong> (${run("openDirector", "Act 1 Director")}, or <kbd>Shift</kbd>+<kbd>A</kbd>). It lists the 14 steps in order: read each scene aloud, open its page, show its map, and tick it off.</li>
      <li><strong>Make your character</strong> first (${run("makeCharacter", "Make your character")}). You pick race, profession, skills and looks. No class yet: everyone starts Unclassed, and the class is chosen at the Binding House.</li>
      <li><strong>Roll in the open.</strong> Every check is d20 + modifier against a DC, and the chat card says what it means. Let the dice surprise you; that is what makes it a story rather than an outline.</li>
      <li><strong>Write as you go.</strong> Each step has a page in <em>My Story</em> with a short prompt. "Write this beat" in the Director opens it. The <em>Session log</em> page collects what happened each time you stop (${run("sessionLog", "Write the session log")}).</li>
      <li><strong>Ask the oracle</strong> when you don't know what the world would do (${run("oracle", "Ask the oracle")}): a yes/no question, likely / even / unlikely, and the answer comes back as Yes, and / Yes / Yes, but / No, but / No / No, and.</li>
      <li><strong>Change anything.</strong> Pages marked ${DRAFT} were drafted for you; your own canon is marked ${WRITTEN}. Edit freely: the story is yours.</li>
    </ol>
    <p>Money: the party needs <strong>${purse.bindings} bindings at ${purse.bindingFeeGp} gold crowns (gp)</strong> to be classed. The ${run("openPurse", "Purse")} tracks it.</p>
    <p>When you're done, ${run("copyStory", "Copy my story")} turns <em>My Story</em> into clean text you can paste into Word.</p>`, { sort: next() }));
  pages.push(textPage("act1", "glance", "The act at a glance", `
    <h2>Act 1: Ashford Roads</h2>
    <p>${esc(resolve(byId.places.ashford.text[0]))}</p>
    <p class="pa1-muted">From the story deck's events 01-05 ("But Then, Therefore"): the four meet at the broker, but they must be classed to join a ship; therefore the sewer job; they barely earn it; therefore they are bound, delayed, and miss the first ship.</p>
    <ol class="pa1-steps">${steps}</ol>
    <p>The heroes are <strong>Unclassed</strong> until step 11 (Combat EL 0, 6 hit points, only Strike, Aid, Stabilise and items; professions work in full). The act ends when the Gilded Tern leaves without them.</p>`, { sort: next() }));

  pages.push(textPage("act1", "primer", "Setting primer", `
    <h2>The Reach, for Act 1</h2>${draftNote(esc(PRIMER.note))}
    ${PRIMER.sections.map(sec => `<h3>${esc(sec.title)}</h3>${sec.paragraphs.map(t => `<p>${esc(t)}</p>`).join("")}`).join("")}`,
  { sort: next(), ownership: { default: OWNERSHIP.OBSERVER } }));

  for ( const step of STEPS ) {
    for ( const sceneId of step.scenes ) {
      const s = byId.scenes[sceneId];
      const where = byId.places[s.fields.where];
      const isMenu = s.fields.style === "menu";
      const tools = step.tools.map(fn => run(fn, TOOL_LABELS[fn] ?? fn)).join(" ");
      const actors = step.actors.filter(k => ACTOR_KEYS.has(k)).map(k => `@UUID[Actor.${IDS.actor(k)}]{${esc(ACTOR_NAMES[k] ?? k)}}`).join(", ");
      const map = step.map && MAPS.includes(step.map) ? `@UUID[Scene.${IDS.scene(step.map)}]{${esc(titleCase(byId.places[step.map]?.name ?? step.map))} map}` : "";
      const family = { ch1_intro_founding: "Founding", ch1_intro_beastkin: "Beastkin", ch1_intro_fae: "Fae", ch1_intro_monsterkin: "Monsterkin" }[sceneId];
      const content = `
        <header class="pa1-scenehead">${badge(s)} <span class="pa1-tag">Step ${step.n} · day ${step.day} · ${esc(s.fields.style)}</span>
          ${where ? `<span class="pa1-tag">${esc(titleCase(where.name))}</span>` : ""}</header>
        <p class="pa1-beat"><strong>Beat.</strong> ${esc(resolve(s.fields.beat))}</p>
        ${family ? `<p class="pa1-muted">Play this intro if {pc} is of the ${family} family.</p>` : ""}
        <div class="pa1-tools">${run(`readScene:${sceneId}`, "Read it aloud in chat")} ${run(`writeBeat:${step.key}`, "Write this beat")} ${tools}</div>
        ${map || actors ? `<p class="pa1-muted">${map}${map && actors ? " · " : ""}${actors}</p>` : ""}
        <h2>The scene</h2>
        ${(s.text ?? []).map(p).join("")}
        ${sceneId === "ch1_prologue" ? `<p class="pa1-muted">The watch's engraving is yours to write: @UUID[Actor.${IDS.actor("enkrid")}]{edit the pocket watch on Enkrid}. ${esc(WATCH.engraving)}</p>` : ""}
        ${isMenu ? `<p>The broker's answers are in @UUID[JournalEntry.${IDS.journal("questions")}]{Stupid, Basic, and Naive Questions}: show any of them to the table.</p>${sectionsHTML(s)}` : scriptHTML(s, sceneId === "ch1_prologue" ? FLASHBACK_CHOICES : {})}
        ${step.gmNotes.length && (sceneId === step.scenes.at(-1)) ? `<h2>GM notes</h2>${draftNote("From your answers on the decisions page.")}<ul>${step.gmNotes.map(t => `<li>${esc(resolve(t))}</li>`).join("")}</ul>` : ""}
        <h2>Systems</h2>
        ${draftNote(esc(resolve(step.systems)))}`;
      const page = textPage("act1", sceneId, `${step.n}. ${s.name}`, content, { sort: next(), flags: { step: step.key } });
      if ( s.fields.style === "flashback" ) page.text.content = page.text.content.replace("<div class=\"pa1-page\">", "<div class=\"pa1-page pa1-sepia\">");
      pages.push(page);
    }
  }
  return entry("act1", "Act 1: Ashford Roads", pages, folder);
}

function placesJournal(folder) {
  const pages = LORE.places.map((pl, i) => {
    const map = MAPS.includes(pl.id) ? `<p>@UUID[Scene.${IDS.scene(pl.id)}]{Show the map}</p>` : "";
    const facts = Object.entries(pl.fields ?? {}).map(([k, v]) => `<span class="pa1-tag">${esc(k)}: ${esc(resolve(v))}</span>`).join(" ");
    const scenes = LORE.scenes.filter(s => s.fields.where === pl.id).map(s => `@UUID[${pageUuid("act1", s.id)}]{${esc(s.name)}}`).join(", ");
    return textPage("ashford", pl.id, titleCase(pl.name), `<header>${badge(pl)} ${facts}</header>
      ${(pl.text ?? []).map(p).join("")}${sectionsHTML(pl)}${map}${scenes ? `<p class="pa1-muted">Scenes here: ${scenes}</p>` : ""}`,
    { sort: (i + 1) * 1000, ownership: { default: OWNERSHIP.OBSERVER } });
  });
  return entry("ashford", "Ashford", pages, folder, { ownership: OWNERSHIP.OBSERVER });
}

function peopleJournal(folder) {
  const pages = LORE.characters.map((c, i) => {
    const img = assetOr(`assets/portraits/${c.id}.webp`, null);
    const facts = Object.entries(c.fields ?? {}).filter(([k]) => !/path$/.test(k))
      .map(([k, v]) => `<li><strong>${esc(titleCase(k))}:</strong> ${esc(resolve(v))}</li>`).join("");
    const path = (label, list) => (list?.length ? `<p><strong>${label}:</strong> ${list.map((n, j) =>
      `<span class="pa1-node${j === 0 ? " pa1-now" : ""}">${esc(n)}</span>`).join(" → ")}</p>` : "");
    const evo = (c.class_path || c.profession_path)
      ? `<h3>Set evolution</h3>${path("Class", c.class_path)}${path("Profession", c.profession_path)}
         <p class="pa1-muted">The first node is where they are bound in Act 1; the rest come at story beats.</p>` : "";
    return textPage("people", c.id, c.name, `<header>${badge(c)}</header>
      ${img ? `<img class="pa1-portrait" src="${img}" alt="${esc(c.name)}">` : ""}
      <ul class="pa1-facts">${facts}</ul>${(c.text ?? []).map(p).join("")}${sectionsHTML(c)}${evo}
      ${ACTOR_KEYS.has(c.id) ? `<p>${actorLink(c.id)}</p>` : ""}`, { sort: (i + 1) * 1000 });
  });
  return entry("people", "People of Ashford", pages, folder);
}

function questionsJournal(folder) {
  const s = byId.scenes.ch1_questions;
  const pages = Object.entries(s.sections).map(([q, lines], i) => textPage("questions", `q${i + 1}`, resolve(q.replace(/^Q:\s*/, "")),
    `<header>${badge(s)}</header><blockquote class="pa1-line pa1-readaloud" data-speaker="broker"><span class="pa1-speaker">${esc(speakerName("broker"))}</span> `
    + `${(Array.isArray(lines) ? lines : [lines]).map(l => esc(resolve(l))).join(" ")}</blockquote>`,
    { sort: (i + 1) * 1000, flags: { question: q } }));
  return entry("questions", "Stupid, Basic, and Naive Questions", pages, folder);
}

function handoutsJournal(folder) {
  const pages = HANDOUTS.map((h, i) => textPage("handouts", h.key, h.title, `
    ${h.draft.length ? `<header>${h.lore.length ? WRITTEN : ""} ${DRAFT}</header>` : `<header>${WRITTEN}</header>`}
    <div class="pa1-handout">${h.lore.map(t => `<p class="pa1-lore">${esc(resolve(t))}</p>`).join("")}
    ${h.draft.map(t => `<p class="pa1-draftline">${esc(resolve(t))}</p>`).join("")}</div>`,
  { sort: (i + 1) * 1000, flags: { handout: true, step: h.step } }));
  return entry("handouts", "Act 1 Handouts", pages, folder);
}

function glossaryJournal(folder) {
  const pages = LORE.terms.map((t, i) => textPage("glossary", t.id, titleCase(t.name),
    `<header>${badge(t)}</header>${(t.text ?? []).map(p).join("")}${sectionsHTML(t)}`, { sort: (i + 1) * 1000, ownership: { default: OWNERSHIP.OBSERVER } }));
  return entry("glossary", "Glossary", pages, folder, { ownership: OWNERSHIP.OBSERVER });
}

function storyJournal(folder) {
  const pages = [textPage("story", "cover", "My Story", `
    <h2>Act 1: Ashford Roads</h2>
    <p>This is your chronicle. Each beat has a page with one question to start from; write as much or as little as you like, in {pc}'s voice or your own.</p>
    <p>The <em>Session log</em> page is filled in for you: every time you press ${run("sessionLog", "Write the session log")}, the steps you played since last time are added with the date.</p>
    <p>${run("copyStory", "Copy my story")} gives you all of it as clean text, ready to paste into Word.</p>
    ${draftNote("The prompts are suggestions.")}`, { sort: 0, ownership: { default: OWNERSHIP.OWNER } })];
  STEPS.forEach((s, i) => pages.push(textPage("story", `beat_${s.key}`, `${s.n}. ${s.title}`, `
    ${s.prompts.map(t => `<p class="pa1-prompt">${esc(resolve(t))}</p>`).join("")}
    <p class="pa1-muted">@UUID[${pageUuid("act1", s.scenes[0])}]{The scene} · ${DRAFT}</p>
    <hr><p></p>`, { sort: (i + 1) * 1000, ownership: { default: OWNERSHIP.OWNER }, flags: { step: s.key } })));
  pages.push(textPage("story", "log", "Session log", "<h2>Session log</h2><p class=\"pa1-muted\">Entries are added here by the module.</p>",
    { sort: 99000, ownership: { default: OWNERSHIP.OWNER }, flags: { log: true } }));
  return entry("story", "My Story", pages, folder, { ownership: OWNERSHIP.OWNER });
}

/** Set by build.mjs before journals are built, so pages can link the actors that exist. */
const ACTOR_KEYS = new Set();
const ACTOR_NAMES = {};
export function registerActors(actors) {
  for ( const [key, a] of actors ) {
    ACTOR_KEYS.add(key);
    ACTOR_NAMES[key] = a.name;
  }
}

export const TOOL_LABELS = {
  makeCharacter: "Make your character", addTrio: "Add the trio to the party", askBroker: "The broker's questions",
  giveLoaners: "Hand out the loaners", revealHandout: "Show a handout", startGnaw: "Start the Old Gnaw fight",
  startGloam: "Start the Gloam fight", gloamRebuff: "The Gloam throws them back", startLight: "Start the Scene",
  sunClock: "Advance the sun", openPurse: "Purse", keepLoaners: "The loaners are ours", bindAll: "Binding",
  enkridCollapses: "Enkrid collapses", innRest: "Rest at the inn", endAct: "End of Act 1", milestone: "Apply the milestone"
};

export function buildJournals(folder) {
  return [act1Journal(folder), placesJournal(folder), peopleJournal(folder), questionsJournal(folder),
    handoutsJournal(folder), glossaryJournal(folder), storyJournal(folder)];
}
