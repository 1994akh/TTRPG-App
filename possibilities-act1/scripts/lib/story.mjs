/**
 * The story beats: making the PC, the trio joining, reading scenes aloud, the broker's questions, handouts, loaners,
 * binding, the collapse, the inn, the end of the act, and My Story (beats and the session log).
 */
import {
  actorFor, CONTENT, esc, getSetting, heroKey, journalFor, MODULE_ID, openPage, pageFor, partyHeroes, pc, pcActor, pcName,
  postCard, requireGM, SCOPE, setSetting, sys, trio
} from "./util.mjs";
import { currentStep, introFor, loanerPlan, oracleAnswer, payBindings, purseSummary, sessionEntry, storyText, withPC } from "./logic.mjs";

const DialogV2 = () => foundry.applications.api.DialogV2;
const step = key => CONTENT.steps.find(s => s.key === key);

/** Tick a step in the Director. */
export async function tickStep(key, done=true) {
  const beats = { ...getSetting("beats") };
  if ( !!beats[key] === done ) return;
  beats[key] = done;
  await setSetting("beats", beats);
}

/* -------------------------------------------- Scenes to chat -------------------------------------------- */

/** The lines of a lore scene as chat HTML ({pc} filled in). */
export function sceneCardHTML(sceneId) {
  const s = CONTENT.scripts[sceneId];
  if ( !s ) return "";
  return s.lines.map(l => {
    if ( l.note ) return `<p class="pa1-note">${pc(esc(l.note))}</p>`;
    if ( l.choice ) return `<p class="pa1-choice">▸ ${pc(esc(l.choice))}</p>`;
    return `<p class="pa1-line"><span class="pa1-speaker">${pc(esc(l.name))}</span> ${pc(esc(l.text))}</p>`;
  }).join("");
}

/** The portrait for a speaker (lore character id), if their actor is in the world. */
function speakerImg(id) {
  if ( id === "narrator" ) return null;
  return actorFor(id)?.img ?? null;
}

/** One read-aloud line as a chat message from its speaker, with their portrait. */
export async function postLine(line) {
  if ( line.note || line.choice ) {
    const cls = line.note ? "pa1-note" : "pa1-choice";
    return ChatMessage.implementation.create({ speaker: { alias: "Narrator" },
      content: `<div class="pa1 pa1-card pa1-readaloud-card"><p class="${cls}">${line.choice ? "▸ " : ""}${pc(esc(line.note ?? line.choice))}</p></div>` });
  }
  const img = speakerImg(line.speaker);
  return ChatMessage.implementation.create({
    speaker: { alias: pc(line.name, { html: false }), actor: actorFor(line.speaker)?.id ?? null },
    content: `<div class="pa1 pa1-card pa1-readaloud-card pa1-says">${img ? `<img class="pa1-face" src="${esc(img)}" alt="">` : ""}`
      + `<p class="pa1-line">${pc(esc(line.text))}</p></div>`
  });
}

/** Read a lore scene aloud: each line posted as its speaker, so the chat log becomes the story so far. */
export async function readScene(sceneId) {
  if ( !requireGM() ) return false;
  const s = CONTENT.scripts[sceneId];
  if ( !s ) return false;
  if ( sceneId === "ch1_broker" ) await addTrio({ quiet: true });
  await postCard(s.name, "", { css: "pa1-scenehead-card" });
  for ( const line of s.lines ) await postLine(line);
  const st = CONTENT.steps.find(x => x.scenes.includes(sceneId));
  if ( st && ["broker", "prologue", "sewer"].includes(st.key) ) await tickStep(st.key);
  return true;
}

/** Post one read-aloud line (a journal blockquote double-clicked by the GM). */
export async function readLine(html) {
  return postCard("", `<blockquote class="pa1-line">${pc(html)}</blockquote>`, { css: "pa1-readaloud-card" });
}

/* -------------------------------------------- The player character -------------------------------------------- */

/** Make your character: the system's creator, then the matching Coast Road intro. */
export async function makeCharacter() {
  if ( !requireGM() ) return false;
  let actor = null;
  if ( typeof sys().createHero === "function" ) actor = await sys().createHero();
  else {
    const name = await DialogV2().prompt({
      window: { title: "Make your character" },
      content: "<label>Name <input type=\"text\" name=\"name\" autofocus></label><p>The Possibilities system's creator was not found, so a blank hero is made; fill in the sheet.</p>",
      ok: { label: "Create", callback: (e, button) => button.form.elements.name.value.trim() },
      rejectClose: false
    });
    if ( !name ) return false;
    actor = await Actor.implementation.create({ name, type: "hero", system: { race: "Human", profession: { node: "Sailor", rank: "Novice" } } });
    actor?.sheet?.render({ force: true });
  }
  if ( !actor ) return false;
  const why = actor.system?.details?.drive ? null : await DialogV2().prompt({
    window: { title: `${actor.name}: why I need a ship` },
    content: "<label>One line, in their words. The journal prompts come back to it. <input type=\"text\" name=\"why\" autofocus></label>",
    ok: { label: "Save", callback: (e, button) => button.form.elements.why.value.trim() },
    rejectClose: false
  });
  if ( why ) await actor.update({ "system.details.drive": why });
  // Until you have art: the default silhouette portrait and token (one image each, swap them on the actor).
  if ( !actor.img || /mystery-man/.test(actor.img) ) {
    await actor.update({ img: `modules/${MODULE_ID}/assets/portraits/pc_default.webp`,
      "prototypeToken.texture.src": `modules/${MODULE_ID}/assets/tokens/pc_default.webp` });
  }
  const start = CONTENT.config.pcStart;
  await actor.update({ [`flags.${SCOPE}.key`]: "pc", "system.story.role": "pc", "system.currency.gp": start.gp,
    "system.currency.sp": start.sp, "system.currency.cp": start.cp });
  await setSetting("pcActor", actor.id);
  await setSetting("pcName", actor.name);
  const family = actor.system?.derived?.family || sys().rules?.races?.find(r => r.id === actor.system?.race)?.family || "Founding";
  const intro = introFor(CONTENT.intros, family);
  await postCard(`${esc(actor.name)} sets out`, `<p>${esc(actor.name)} is of the ${esc(family)} family: their story starts with
    <em>${esc(CONTENT.scripts[intro].name)}</em>.</p>
    <div class="pa1-buttons"><button type="button" data-pa1-fn="readScene" data-arg="${intro}">Read the intro</button>
    <button type="button" data-pa1-fn="openDirector">Act 1 Director</button></div>`, { gmOnly: true });
  openPage("act1", intro);
  await tickStep("pc");
  return true;
}

/** The trio join: they become party members you control, and their tokens join yours on the current map. */
export async function addTrio({ quiet=false }={}) {
  if ( !requireGM() ) return false;
  const heroes = trio();
  if ( !heroes.length ) {
    if ( !quiet ) ui.notifications.warn("Import the Ashford Roads: Act 1 Adventure first.");
    return false;
  }
  const players = game.users.filter(u => !u.isGM);
  for ( const a of heroes ) {
    const ownership = { ...a.ownership };
    for ( const u of players ) ownership[u.id] = 3;
    await a.update({ ownership });
  }
  await setSetting("trioJoined", true);
  if ( !quiet ) await postCard("The four of them", `<p>${heroes.map(a => esc(a.name)).join(", ")} and ${esc(pcName())}: you control all four in a fight.</p>`, { gmOnly: true });
  return true;
}

/* -------------------------------------------- The broker -------------------------------------------- */

/** The broker's question menu: pick one, the answer is read to chat. */
export async function askBroker(key=null) {
  if ( !requireGM() ) return false;
  let q = CONTENT.questions.find(x => x.key === key);
  if ( !q ) {
    const choice = await DialogV2().wait({
      window: { title: "Stupid, basic, and naive questions" },
      content: "<p>Which question?</p>",
      buttons: CONTENT.questions.map(x => ({ action: x.key, label: x.question })),
      rejectClose: false
    });
    q = CONTENT.questions.find(x => x.key === choice);
  }
  if ( !q ) return false;
  await postCard(q.question, `<p class="pa1-line"><span class="pa1-speaker">${esc(actorFor("broker")?.name ?? "The broker")}</span> ${esc(q.answer)}</p>`,
    { css: "pa1-readaloud-card" });
  await tickStep("questions");
  return true;
}

/* -------------------------------------------- Handouts -------------------------------------------- */

/** Show a handout to the table (and let players read it in the Handouts journal). */
export async function revealHandout(key=null) {
  if ( !requireGM() ) return false;
  let h = CONTENT.handouts.find(x => x.key === key);
  if ( !h ) {
    const choice = await DialogV2().wait({
      window: { title: "Show a handout" }, content: "<p>Which handout?</p>",
      buttons: CONTENT.handouts.map(x => ({ action: x.key, label: x.title })), rejectClose: false
    });
    h = CONTENT.handouts.find(x => x.key === choice);
  }
  if ( !h ) return false;
  const page = pageFor("handouts", h.key);
  if ( page ) {
    await page.update({ "ownership.default": 2 });
    const Journal = foundry.documents?.collections?.Journal ?? game.journal?.constructor;
    if ( typeof Journal?.show === "function" ) await Journal.show(page, { force: true });
  }
  await postCard(h.title, page?.text?.content ?? "", { css: "pa1-handout-card" });
  if ( h.key === "sellswords_journal" ) await tickStep("sewer");
  return true;
}

/* -------------------------------------------- Loaners -------------------------------------------- */

const isLoaner = i => !!i.flags?.[SCOPE]?.loaner;

/** One loaned blade each, the charge lamp to the Tinker and the pry bar to Tova. */
export async function giveLoaners() {
  if ( !requireGM() ) return false;
  if ( !getSetting("trioJoined") ) await addTrio({ quiet: true });
  const heroes = partyHeroes();
  if ( !heroes.length ) {
    ui.notifications.warn("Make your character and add the trio first.");
    return false;
  }
  const plan = loanerPlan(heroes.map(a => ({ key: heroKey(a), profession: a.system?.profession?.node })));
  for ( const { hero, items } of plan ) {
    const actor = heroes.find(a => heroKey(a) === hero);
    const have = new Set(actor.items.filter(isLoaner).map(i => i.flags[SCOPE].key));
    const add = items.filter(k => !have.has(k)).map(k => {
      const t = foundry.utils.deepClone(CONTENT.itemTemplates[k]);
      if ( t.type === "weapon" ) t.system.equipped = true;
      return t;
    });
    if ( add.length ) await actor.createEmbeddedDocuments("Item", add);
  }
  await postCard("Loaners", "<p>Basic blades, a lamp, a pry bar. Marked <strong>Loaned</strong>: bring them back whole or pay for them.</p>");
  await tickStep("commission");
  return true;
}

/** A Setback damages one loaner: intact → damaged → broken. */
export async function damageLoaner(actor) {
  const items = actor?.items?.filter(i => isLoaner(i) && i.system?.loaned) ?? [];
  const item = items.find(i => i.system.condition === "intact") ?? items.find(i => i.system.condition === "damaged");
  if ( !item ) return null;
  const next = item.system.condition === "intact" ? "damaged" : "broken";
  await item.update({ "system.condition": next });
  await postCard("A loaner is damaged", `<p>${esc(actor.name)}'s ${esc(item.name)} is now <strong>${next}</strong>.</p>`);
  return item;
}

/** After the danger fee: the loaners are the party's own. */
export async function keepLoaners() {
  if ( !requireGM() ) return false;
  let n = 0;
  for ( const a of partyHeroes() ) {
    for ( const i of a.items.filter(x => isLoaner(x) && x.system?.loaned) ) {
      await i.update({ "system.loaned": false });
      n++;
    }
  }
  await postCard("The loaners are yours", `<p>${n} loaned item${n === 1 ? "" : "s"} paid for and kept, damage and all.</p>`);
  await tickStep("fee");
  return true;
}

/* -------------------------------------------- Binding -------------------------------------------- */

/** Bind every hero: the PC chooses a class; the trio take the first node of their story path. */
export async function bindAll() {
  if ( !requireGM() ) return false;
  const heroes = partyHeroes();
  if ( !heroes.length ) return false;
  const purse = CONTENT.config.purse;
  const state = getSetting("purse");
  const sum = purseSummary(purse, state);
  if ( !sum.bound && (sum.total < sum.needed) ) {
    const go = await DialogV2().confirm({ window: { title: "Binding" },
      content: `<p>The purse holds ${sum.total} gp; ${purse.bindings} bindings cost ${sum.needed} gp. Bind anyway?</p>`, rejectClose: false });
    if ( !go ) return false;
  }
  for ( const a of heroes ) {
    if ( a.system?.class?.node ) continue;
    if ( typeof sys().bind === "function" ) await sys().bind(a);
    else {
      const path = a.system?.story?.path?.class ?? [];
      let node = path[0];
      if ( !node ) {
        node = await DialogV2().wait({ window: { title: `Binding: ${a.name}` }, content: "<p>Choose your binding.</p>",
          buttons: CONTENT.config.fClasses.map(c => ({ action: c, label: c })), rejectClose: false });
      }
      if ( node ) await a.update({ "system.class.node": node, "system.class.rank": "Novice" });
    }
    if ( a.system?.class?.node && (a.system?.derived?.hpMax > 0) ) await a.update({ "system.hp.value": a.system.derived.hpMax });
  }
  const paid = payBindings(purse, state, { force: true });
  if ( paid ) await setSetting("purse", paid);
  await revealHandout("binding_receipt");
  await tickStep("binding");
  return true;
}

/** Enkrid collapses after binding; he is down until the inn. */
export async function enkridCollapses() {
  if ( !requireGM() ) return false;
  const e = actorFor("enkrid");
  if ( !e ) return false;
  await e.setFlag?.(MODULE_ID, "collapsed", true);
  if ( typeof e.toggleStatusEffect === "function" ) await e.toggleStatusEffect("unconscious", { active: true });
  openPage("act1", "ch1_collapse");
  await tickStep("collapse");
  return true;
}

/** A long rest at the Lantern and Lee. */
export async function innRest() {
  if ( !requireGM() ) return false;
  for ( const a of partyHeroes() ) {
    if ( typeof sys().rest === "function" ) await sys().rest(a, "long");
    else if ( a.system?.derived?.hpMax ) await a.update({ "system.hp.value": a.system.derived.hpMax });
    if ( a.getFlag?.(MODULE_ID, "collapsed") ) {
      await a.unsetFlag?.(MODULE_ID, "collapsed");
      if ( typeof a.toggleStatusEffect === "function" ) await a.toggleStatusEffect("unconscious", { active: false });
    }
  }
  await postCard("The Lantern and Lee", "<p>One room. They slept late. Much too late.</p>");
  await tickStep("inn");
  return true;
}

/** The end of Act 1: the title card, then the session log. */
export async function endAct() {
  if ( !requireGM() ) return false;
  await postLine({ note: "On the next berth, a scruffy captain with his boots on a crate has been watching the four of them the whole time." });
  await postCard("", `<div class="pa1-titlecard"><p class="pa1-tc-small">The first ship left without them.</p>
    <p class="pa1-tc-title">Possibilities</p><p class="pa1-tc-small">End of Act 1 · to be continued with the Second Captain</p></div>`,
  { css: "pa1-titlecard-card" });
  await tickStep("ship");
  await sessionLog();
  await postCard("Milestone", `<p>The end of Act 1 is a milestone: ${esc(CONTENT.config.milestone.note.replace(/^Draft: /, ""))}</p>
    <div class="pa1-buttons"><button type="button" data-pa1-fn="milestone">Apply the milestone</button>
    <button type="button" data-pa1-fn="writeBeat" data-arg="ship">Write the end of Act 1</button></div>`, { gmOnly: true });
  writeBeat("ship");
  return true;
}

/** The end-of-act milestone: each hero's profession goes up one rank (to the configured rank). */
export async function milestone() {
  if ( !requireGM() ) return false;
  const rank = CONTENT.config.milestone.profession;
  for ( const a of partyHeroes() ) if ( a.system?.profession?.rank === "Novice" ) await a.update({ "system.profession.rank": rank });
  await postCard("Milestone", `<p>Every hero's profession is now ${esc(rank)}.</p>`);
  return true;
}

/* -------------------------------------------- Solo play -------------------------------------------- */

/** The oracle: a yes/no question, likely / even / unlikely. */
export async function oracle() {
  const cfg = CONTENT.config.oracle;
  const asked = await DialogV2().wait({
    window: { title: "Ask the oracle" },
    content: "<label>Your question (optional) <input type=\"text\" name=\"q\"></label><p>How likely is it?</p>",
    buttons: ["likely", "even", "unlikely"].map(o => ({ action: o, label: o[0].toUpperCase() + o.slice(1),
      callback: (e, button) => ({ odds: o, q: button.form?.elements?.q?.value?.trim() ?? "" }) })),
    rejectClose: false
  });
  if ( !asked ) return false;
  const odds = typeof asked === "string" ? asked : asked.odds;
  const roll = await new Roll("1d20").evaluate();
  const { total, answer } = oracleAnswer(roll.total, odds, cfg);
  await postCard("The oracle", `${asked.q ? `<p class="pa1-muted">${esc(asked.q)}</p>` : ""}<p class="pa1-big">${esc(answer)}</p>
    <p class="pa1-muted">d20 ${roll.total} ${cfg.odds[odds] ? `${cfg.odds[odds] > 0 ? "+" : "−"} ${Math.abs(cfg.odds[odds])} ` : ""}= ${total} · ${esc(odds)}</p>`);
  return answer;
}

/** Copy my story: My Story as clean text, to the clipboard and in a window to copy by hand. */
export async function copyStory() {
  const journal = journalFor("story");
  if ( !journal ) return false;
  const pages = [...journal.pages.contents].sort((a, b) => (a.sort ?? 0) - (b.sort ?? 0));
  const text = storyText(pages, pcName());
  try {
    await navigator.clipboard?.writeText(text);
    ui.notifications.info("My Story is on the clipboard: paste it into Word.");
  } catch {
    // Clipboard may be blocked; the window below still has it.
  }
  await DialogV2().prompt({ window: { title: "My Story as text" }, position: { width: 640 },
    content: `<textarea class="pa1-storytext" rows="20" readonly>${esc(text)}</textarea>`, ok: { label: "Close" }, rejectClose: false });
  return text;
}


/* -------------------------------------------- My Story -------------------------------------------- */

/** Open My Story at a beat. */
export function writeBeat(stepKey) {
  return openPage("story", `beat_${stepKey}`);
}

/** Open My Story at the current beat (or the log when the act is done). */
export function openStory() {
  const s = currentStep(CONTENT.steps, getSetting("beats"));
  return s ? writeBeat(s.key) : openPage("story", "log");
}

/** Append today's entry to the Session log page: the steps ticked since the last entry. */
export async function sessionLog() {
  if ( !requireGM() ) return false;
  const page = pageFor("story", "log");
  if ( !page ) return false;
  const journal = journalFor("story");
  const entry = sessionEntry({
    steps: CONTENT.steps, beats: getSetting("beats"), logged: getSetting("logged"), pcName: pcName(),
    date: new Date().toLocaleString(),
    storyPage: s => `@UUID[JournalEntry.${journal.id}.JournalEntryPage.${CONTENT.ids.pages.story[`beat_${s.key}`]}]{your page}`
  });
  if ( !entry ) {
    ui.notifications.info("Nothing new to log since the last entry.");
    return false;
  }
  await page.update({ "text.content": `${page.text?.content ?? ""}${entry.html}` });
  await setSetting("logged", { ...getSetting("logged"), ...Object.fromEntries(entry.keys.map(k => [k, true])) });
  ui.notifications.info(`Session log: ${entry.keys.length} beat${entry.keys.length === 1 ? "" : "s"} added to My Story.`);
  return true;
}

/** The broker's board (side work): draw an F-grade commission. */
export async function brokerBoard() {
  if ( !requireGM() ) return false;
  const table = game.tables.get(CONTENT.ids.table);
  if ( !table ) return false;
  await table.draw();
  return true;
}

/* -------------------------------------------- Reset -------------------------------------------- */

/** Back to the start for a replay. My Story's pages are kept. */
export async function resetAct({ confirm=true }={}) {
  if ( !requireGM() ) return false;
  if ( confirm ) {
    const ok = await DialogV2().confirm({ window: { title: "Reset Act 1" },
      content: "<p>Put the trio back to Unclassed, take back the loaners, reset the purse, the Scene and the Director's ticks? Your <em>My Story</em> pages are kept.</p>",
      rejectClose: false });
    if ( !ok ) return false;
  }
  for ( const a of trio() ) {
    await a.update({ "system.class.node": "", "system.class.rank": "Novice", "system.profession.rank": "Novice", "system.hp.value": 6,
      "system.points.value": 3, "system.dying": { value: 0, active: false, stable: false, wounded: 0 },
      "system.turn": { actions: 3, attacks: 0, guard: false } });
    const loaners = a.items.filter(isLoaner).map(i => i.id);
    if ( loaners.length ) await a.deleteEmbeddedDocuments("Item", loaners);
    if ( a.getFlag?.(MODULE_ID, "collapsed") ) await a.unsetFlag(MODULE_ID, "collapsed");
  }
  const me = pcActor();
  if ( me ) {
    const loaners = me.items.filter(isLoaner).map(i => i.id);
    if ( loaners.length ) await me.deleteEmbeddedDocuments("Item", loaners);
  }
  const light = actorFor("into_the_light");
  if ( light ) await light.update({ "system.status": "active", "system.resistance.value": light.system.resistance.max, "system.clock.value": 0, [`flags.${SCOPE}.resolved`]: null });
  for ( const c of game.combats.filter(x => x.flags?.[SCOPE]) ) await c.delete();
  for ( const key of ["beats", "logged"] ) await setSetting(key, {});
  await setSetting("purse", { applied: {}, spent: 0, extra: 0, bound: false });
  await setSetting("trioJoined", false);
  await setSetting("gloamCombat", "");
  await setSetting("lightCombat", "");
  ui.notifications.info("Act 1 is back at the start. The player character and My Story are kept.");
  return true;
}

export { withPC, step };
