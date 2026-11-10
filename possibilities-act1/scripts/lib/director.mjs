/**
 * The Act 1 Director (14 steps, in order, with read-aloud, page, map, write-this-beat and the step's tools) and the
 * Purse panel. The HTML is built by pure functions so the tests can check it; the windows are ApplicationV2.
 */
import { CONTENT, actorFor, esc, getSetting, journalFor, isLeadGM, MODULE_ID, pcName, postCard, requireGM, setSetting } from "./util.mjs";
import { currentStep, purseSummary } from "./logic.mjs";

const TOOL_LABELS = {
  makeCharacter: "Make your character", addTrio: "Add the trio", askBroker: "Ask a question", giveLoaners: "Hand out the loaners",
  revealHandout: "Show a handout", startGnaw: "Start the fight", startGloam: "Start the fight", gloamRebuff: "Throw them back",
  startLight: "Start the Scene", sunClock: "Advance the sun", openPurse: "Purse", keepLoaners: "The loaners are ours",
  bindAll: "Binding", enkridCollapses: "Enkrid collapses", innRest: "Rest at the inn", endAct: "End of Act 1"
};

/** The Director's body. */
export function directorHTML({ beats, purse, pcName: name, imported, light }) {
  const now = currentStep(CONTENT.steps, beats);
  const sum = purseSummary(CONTENT.config.purse, purse);
  const btn = (fn, label, { arg=null, cls="" }={}) => `<button type="button" class="${cls}" data-action="run" data-fn="${fn}"${arg ? ` data-arg="${esc(arg)}"` : ""}>${esc(label)}</button>`;
  const status = [
    `<li><strong>${esc(name || "No player character yet")}</strong>${now ? ` · next: ${now.n}. ${esc(now.title)}` : " · Act 1 complete"}</li>`,
    `<li>Purse: ${sum.total} gp of ${sum.needed} for ${sum.bindings} bindings${sum.bound ? " (bound)" : (sum.exact ? " (exactly enough)" : "")}</li>`,
    light ? `<li>Into the light: Resistance ${light.resistance}/${light.max} · sun ${light.clock}/${light.clockMax}</li>` : ""
  ].join("");
  const rows = CONTENT.steps.map(s => {
    const done = !!beats?.[s.key];
    const reads = s.scenes.map(id => btn("readScene", s.scenes.length > 1 ? CONTENT.scripts[id].name.replace(/^The Coast Road /, "") : "Read aloud", { arg: id })).join("");
    const tools = s.tools.map(fn => btn(fn, TOOL_LABELS[fn] ?? fn, { cls: "tool" })).join("");
    return `<li class="pa1-step ${done ? "done" : ""} ${now?.key === s.key ? "now" : ""}" data-step="${s.key}">
      <button type="button" class="tick" data-action="toggle" data-step="${s.key}" aria-pressed="${done}" aria-label="${done ? "Done" : "Not yet"}">
        <i class="fa-solid ${done ? "fa-square-check" : "fa-square"}"></i></button>
      <div class="body"><div class="title"><b>${s.n}.</b> ${esc(s.title)}</div>
        <div class="row">${reads}${btn("openStepPage", "Page", { arg: s.key })}${s.map ? btn("showMap", "Map", { arg: s.map }) : ""}${btn("writeBeat", "Write this beat", { arg: s.key })}</div>
        ${tools ? `<div class="row tools">${tools}</div>` : ""}</div></li>`;
  }).join("");
  const toolsRow = [["openPurse", "Purse"], ["revealHandout", "Show a handout"], ["sessionLog", "Write the session log"],
    ["openStory", "My Story"], ["brokerBoard", "The broker's board"], ["resetAct", "Reset Act 1"]]
    .map(([fn, label]) => btn(fn, label, { cls: fn === "resetAct" ? "danger" : "" })).join("");
  return `${imported ? "" : "<p class=\"pa1-warning\">Import the <strong>Ashford Roads: Act 1</strong> Adventure from the compendium first.</p>"}
    <ul class="pa1-status">${status}</ul><ol class="pa1-steps">${rows}</ol><section class="pa1-tools"><h3>Tools</h3><div class="row">${toolsRow}</div></section>`;
}

/** The Purse panel's body. */
export function purseHTML(state) {
  const cfg = CONTENT.config.purse;
  const sum = purseSummary(cfg, state);
  const entries = cfg.entries.map(e => {
    const on = !!state?.applied?.[e.key];
    return `<li class="${on ? "on" : ""}"><button type="button" data-action="entry" data-key="${e.key}" aria-pressed="${on}">
      <i class="fa-solid ${on ? "fa-square-check" : "fa-square"}"></i> ${esc(e.label)}</button>
      <span class="amt">${e.gp > 0 ? "+" : ""}${e.gp} gp</span></li>`;
  }).join("");
  const verdict = sum.bound ? `Bound. ${sum.total} gp left over.`
    : (sum.exact ? "Just enough to bind four. Not a copper over."
      : (sum.short > 0 ? `${sum.short} gp short of ${sum.bindings} bindings (${sum.affordable} affordable).` : `${sum.spare} gp to spare.`));
  return `<p class="pa1-big">${sum.total} gp <span class="pa1-muted">of ${sum.needed} gp (${sum.bindings} × ${sum.fee} gp)</span></p>
    <ul class="pa1-entries">${entries}</ul>
    <p class="pa1-verdict">${esc(verdict)}</p>
    <div class="row"><button type="button" data-action="adjust" data-gp="-1">−1 gp</button><button type="button" data-action="adjust" data-gp="1">+1 gp</button>
    <button type="button" data-action="post">Post to chat</button></div>
    ${(state?.extra ?? 0) ? `<p class="pa1-muted">Adjustments: ${state.extra > 0 ? "+" : ""}${state.extra} gp</p>` : ""}`;
}

/** Toggle a purse entry / adjust by gp (exported for the tests). */
export async function setPurseEntry(key, on) {
  const s = foundry.utils.deepClone(getSetting("purse"));
  s.applied = { ...(s.applied ?? {}), [key]: on };
  await setSetting("purse", s);
  return s;
}

export async function adjustPurse(gp) {
  const s = foundry.utils.deepClone(getSetting("purse"));
  s.extra = (s.extra ?? 0) + gp;
  await setSetting("purse", s);
  return s;
}

function lightState() {
  const o = actorFor("into_the_light");
  if ( !o ) return null;
  return { resistance: o.system.resistance.value, max: o.system.resistance.max, clock: o.system.clock.value, clockMax: o.system.clock.max };
}

/* -------------------------------------------- Windows -------------------------------------------- */

const apps = {};

function appClass(kind) {
  const { ApplicationV2 } = foundry.applications.api;
  if ( kind === "director" ) {
    return class DirectorApp extends ApplicationV2 {
      static DEFAULT_OPTIONS = {
        id: "pa1-director", classes: ["pa1", "pa1-director"],
        window: { title: "Act 1 Director", icon: "fa-solid fa-scroll", resizable: true },
        position: { width: 460, height: 700 },
        actions: {
          run: (event, target) => runFromButton(target.dataset.fn, target.dataset.arg),
          toggle: async (event, target) => {
            const beats = { ...getSetting("beats") };
            beats[target.dataset.step] = !beats[target.dataset.step];
            await setSetting("beats", beats);
          }
        }
      };

      async _renderHTML() {
        const div = document.createElement("div");
        div.innerHTML = directorHTML({ beats: getSetting("beats"), purse: getSetting("purse"), pcName: getSetting("pcName"),
          imported: !!journalFor("act1"), light: lightState() });
        return div;
      }

      _replaceHTML(result, content) {
        content.replaceChildren(result);
      }
    };
  }
  return class PurseApp extends ApplicationV2 {
    static DEFAULT_OPTIONS = {
      id: "pa1-purse", classes: ["pa1", "pa1-purse"],
      window: { title: "Purse: four bindings", icon: "fa-solid fa-coins" },
      position: { width: 380, height: "auto" },
      actions: {
        entry: async (event, target) => setPurseEntry(target.dataset.key, !getSetting("purse").applied?.[target.dataset.key]),
        adjust: async (event, target) => adjustPurse(Number(target.dataset.gp)),
        post: async () => postCard("The purse", purseHTML(getSetting("purse")).replace(/<div class="row">[\s\S]*?<\/div>/, ""))
      }
    };

    async _renderHTML() {
      const div = document.createElement("div");
      div.innerHTML = purseHTML(getSetting("purse"));
      return div;
    }

    _replaceHTML(result, content) {
      content.replaceChildren(result);
    }
  };
}

function open(kind) {
  if ( !requireGM() ) return false;
  apps[kind] ??= new (appClass(kind))();
  apps[kind].render({ force: true });
  return true;
}

export const openDirector = () => open("director");
export const openPurse = () => open("purse");

/** Re-render whatever is open (settings and actors change often; at most every quarter second). */
let pending = null;
export function refreshApps() {
  if ( pending ) return;
  pending = setTimeout(() => {
    pending = null;
    for ( const app of Object.values(apps) ) if ( app?.rendered ) app.render();
  }, 250);
}

/** Director / chat / journal buttons run API functions by name. */
export async function runFromButton(fn, arg) {
  const api = game.modules.get(MODULE_ID).api;
  if ( typeof api[fn] !== "function" ) return false;
  try {
    return await (arg ? api[fn](arg) : api[fn]());
  } finally {
    refreshApps();
  }
}

/** Once per world, after the Adventure is imported: the GM welcome card. */
export async function maybeWelcome() {
  if ( !isLeadGM() || getSetting("welcomed") || !journalFor("act1") ) return;
  await setSetting("welcomed", true);
  await postCard("Ashford Roads: Act 1 is ready", `<p>Everything runs from the <strong>Act 1 Director</strong> (also <kbd>Shift</kbd>+<kbd>A</kbd>).</p>
    <ol><li>Make your character (${esc(pcName())} for now).</li><li>Read the Coast Road intro for their race family.</li>
    <li>Then follow the Director, step by step. Write each beat in <em>My Story</em> as you go.</li></ol>
    <div class="pa1-buttons"><button type="button" data-pa1-fn="openDirector">Open the Director</button>
    <button type="button" data-pa1-fn="makeCharacter">Make your character</button></div>`, { gmOnly: true });
}
