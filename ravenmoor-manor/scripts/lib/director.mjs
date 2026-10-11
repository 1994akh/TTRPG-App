/**
 * The Ravenmoor Director: one GM window with every set piece in running order, what has already happened, and the
 * state of the night at a glance. Plus the welcome card shown once after the Adventure is imported.
 */
import { clockTime, elapsed } from "./candles.mjs";
import {
  CONTENT, getSetting, isLeadGM, journalFor, mainScene, MODULE_ID, partyActors, postCard, requireGM, setSetting, tokensFor,
  wallsByLabel
} from "./util.mjs";

const { ApplicationV2 } = foundry.applications.api;

/**
 * Has a beat happened? Read from the world where possible, so it is right however the beat was triggered (macro,
 * Director, chat card or automation); the rest are ticked when run from the Director and can be toggled by hand.
 */
const DERIVED = {
  silasRetires: () => tokensFor("silas", f => !f.body).some(t => t.level === CONTENT.ids.levels.upper)
    || wallsByLabel("East Corridor / Study").some(w => w.ds === 2),
  lightsOut: () => mainScene()?.tiles.some(t => (t.flags?.ravenmoor?.label ?? "").startsWith("C4 foxfire smears") && !t.hidden),
  theBody: () => getSetting("act") !== "act1",
  revealSecretDoor: () => !!mainScene()?.regions.get(CONTENT.ids.stairs["hidden-stair"])?.behaviors.some(b => !b.disabled),
  midnight: () => ["act3", "epilogue"].includes(getSetting("act")),
  showdownSetup: () => game.combats.some(c => c.flags?.ravenmoor?.showdown),
  unmaskQuill: () => getSetting("quillUnmasked"),
  epilogue: () => getSetting("act") === "epilogue"
};

/** Sections in running order. Beats get a tick; tools are just buttons. */
const SECTIONS = [
  { title: "Before the session", rows: [
    { fn: "partyArrives", label: "Party arrives at the drive", hint: "Places each player's character at the drive and shows the scene", beat: true },
    { fn: "treatBagSetup", label: "Treat Bag: 2 candy each", beat: true },
    { fn: "openSettings", label: "Settings", hint: "Party size, running long, session clock, sounds" },
    { fn: "setupHotbar", label: "Set up my hotbar" }
  ] },
  { title: "Act 1: The masque", rows: [
    { fn: "introduceSuspects", label: "Introduce the suspects (7:30)", hint: "Posts the six suspects' portraits and costumes to chat", beat: true },
    { fn: "silasRetires", label: "Silas retires (8:25)", beat: true },
    { fn: "lightsOut", label: "Lights out (8:55)", beat: true },
    { fn: "theBody", label: "The body (9:00)", hint: "Lights the twelve candles and starts Act 2", beat: true }
  ] },
  { title: "Act 2: The investigation", rows: [
    { fn: "snuffCandle", label: "Snuff a candle" },
    { fn: "toggleCandles", label: "Show / hide the candles" },
    { fn: "revealHandout", label: "Reveal a handout" },
    { fn: "clueTracker", label: "Clue Tracker" },
    { fn: "frightSave", label: "Fright save (Scaredy-Cat)" },
    { fn: "treatBagPanel", label: "Treat Bag panel" },
    { fn: "revealSecretDoor", label: "Reveal the secret door", hint: "Also happens when C3 is revealed", beat: true }
  ] },
  { title: "Act 3: Unmasking", rows: [
    { fn: "midnight", label: "Midnight", hint: "Candle 12 runs this for you", beat: true },
    { fn: "accusation", label: "Accusation (edges)" },
    { fn: "showdownSetup", label: "Showdown setup", beat: true },
    { fn: "lairAction", label: "Lair action (by hand)" },
    { fn: "snatchWill", label: "Snatch the will" },
    { fn: "toppleCandelabra", label: "Topple a candelabra" },
    { fn: "snuffingPowder", label: "Quill's snuffing powder" },
    { fn: "unmaskQuill", label: "Unmask Quill", hint: "Runs on its own at his surrender threshold", beat: true }
  ] },
  { title: "Epilogue", rows: [
    { fn: "epilogue", label: "Epilogue", beat: true }
  ] },
  { title: "Tools", rows: [
    { fn: "resetNight", label: "Reset the night", hint: "Back to the start, for testing or a replay", danger: true }
  ] }
];

const ACTS = { act1: "Act 1: The masque", act2: "Act 2: The investigation", act3: "Act 3: Unmasking", epilogue: "Epilogue" };

/** Is a beat done? */
function isDone(fn) {
  if ( getSetting("beats")[fn] ) return true;
  try {
    return !!DERIVED[fn]?.();
  } catch {
    // A derived check can fail before the Adventure is imported; treat it as not done.
    return false;
  }
}

export class DirectorApp extends ApplicationV2 {
  static DEFAULT_OPTIONS = {
    id: "ravenmoor-director",
    classes: ["ravenmoor", "ravenmoor-director"],
    window: { title: "RAVENMOOR.Director.Title", icon: "fa-solid fa-masks-theater", resizable: true },
    position: { width: 420, height: 640 },
    actions: { run: DirectorApp.#onRun, toggle: DirectorApp.#onToggle, refresh: function() { this.render(); } }
  };

  /** @override */
  async _renderHTML() {
    const lit = getSetting("candlesLit");
    const clues = getSetting("clues");
    const found = CONTENT.cards.filter(c => clues[c.id]).length;
    const quill = CONTENT.conclusions.quill;
    const quillHave = quill.evidence.filter(e => clues[e.id]).length;
    const edges = Object.entries(getSetting("edges")).filter(([, v]) => v).map(([k]) => k);
    const time = elapsed();
    const party = partyActors();
    const imported = !!journalFor("adventure") && !!mainScene();

    const status = [
      `<li><strong>${ACTS[getSetting("act")] ?? getSetting("act")}</strong></li>`,
      `<li>Candles: ${lit} of 12 lit (${clockTime(12 - lit)})</li>`,
      `<li>Cards found: ${found} of ${CONTENT.cards.length} · Quill evidence: ${quillHave} of ${quill.evidence.length}`
        + `${quillHave >= quill.readyToAccuseAt ? " <em>(ready to accuse)</em>" : ""}</li>`,
      `<li>Party: ${party.length ? `${party.length} character${party.length === 1 ? "" : "s"}` : "<em>no characters assigned</em>"}`
        + ` · showdown for ${getSetting("partySize")}${getSetting("runningLong") ? " · running long" : ""}</li>`,
      `<li>Edges: ${edges.length ? edges.join(", ") : "none yet"}${time ? ` · session ${time}` : ""}</li>`
    ];
    if ( getSetting("act") === "act3" ) status.push(`<li>Lair round ${getSetting("lairRound")} · Widow ${getSetting("widowRisen") ? "risen" : "waiting"}`
      + ` · will ${getSetting("willBurned") ? "burned" : "intact"}</li>`);

    const sections = SECTIONS.map(section => `<section><h3>${section.title}</h3><ul>${section.rows.map(row => {
      const done = row.beat && isDone(row.fn);
      const tick = row.beat
        ? `<button type="button" class="tick ${done ? "done" : ""}" data-action="toggle" data-fn="${row.fn}" data-tooltip="${done ? "Done (click to untick)" : "Not yet (click to tick)"}">`
          + `<i class="fa-solid ${done ? "fa-square-check" : "fa-square"}"></i></button>`
        : "<span class=\"tick\"></span>";
      return `<li class="${done ? "done" : ""}">${tick}<button type="button" class="run ${row.danger ? "danger" : ""}" data-action="run" data-fn="${row.fn}"`
        + `${row.hint ? ` data-tooltip="${row.hint}"` : ""}>${row.label}</button></li>`;
    }).join("")}</ul></section>`).join("");

    const div = document.createElement("div");
    div.innerHTML = (imported ? "" : "<p class=\"ravenmoor-warning\">Import the <strong>Death at Ravenmoor Manor</strong> Adventure from the compendium first.</p>")
      + `<ul class="ravenmoor-status">${status.join("")}</ul>${sections}`
      + "<footer><button type=\"button\" data-action=\"refresh\"><i class=\"fa-solid fa-rotate\"></i> Refresh</button></footer>";
    return div;
  }

  /** @override */
  _replaceHTML(result, content) {
    content.replaceChildren(result);
  }

  static async #onRun(event, target) {
    const fn = target.dataset.fn;
    const api = game.modules.get(MODULE_ID).api;
    if ( typeof api[fn] !== "function" ) return;
    target.disabled = true;
    try {
      await api[fn]();
      const row = SECTIONS.flatMap(s => s.rows).find(r => r.fn === fn);
      if ( row?.beat && !DERIVED[fn] ) await setSetting("beats", { ...getSetting("beats"), [fn]: true });
    } finally {
      if ( this.rendered ) this.render();
    }
  }

  static async #onToggle(event, target) {
    const fn = target.dataset.fn;
    const beats = { ...getSetting("beats") };
    if ( isDone(fn) ) beats[fn] = false;
    else beats[fn] = true;
    // A derived beat cannot be unticked by hand; say so instead of silently doing nothing.
    if ( !beats[fn] && DERIVED[fn]?.() ) ui.notifications.info("That beat has happened on the map; it stays ticked.");
    await setSetting("beats", beats);
    this.render();
  }
}

let director;

/** Macro / keybinding: open the Director. */
export function openDirector() {
  if ( !requireGM() ) return;
  director ??= new DirectorApp();
  director.render({ force: true });
}

/** Re-render the Director if it is open. */
export function refreshDirector() {
  if ( director?.rendered ) director.render();
}

/** Once per world, after the Adventure is imported: a GM card with the first steps. */
export async function maybeWelcome() {
  if ( !isLeadGM() || getSetting("welcomed") || !journalFor("adventure") ) return;
  await setSetting("welcomed", true);
  const button = (fn, label) => `<button type="button" data-ravenmoor="api" data-fn="${fn}">${label}</button>`;
  await postCard("Ravenmoor Manor is ready",
    "<p>Everything runs from the <strong>Ravenmoor Director</strong> (also <kbd>Shift</kbd>+<kbd>R</kbd>). Before the session:</p>"
    + "<ol><li>Assign each player their character (User Configuration).</li><li>Party arrives at the drive.</li>"
    + "<li>Treat Bag: 2 candy each.</li><li>Settings: party size and sounds.</li></ol>"
    + `<div class="ravenmoor-buttons ravenmoor-gm-only">${button("openDirector", "Open the Director")}${button("setupHotbar", "Set up my hotbar")}</div>`,
    { gmOnly: true, flags: { type: "welcome" }, css: "ravenmoor-gm" });
}
