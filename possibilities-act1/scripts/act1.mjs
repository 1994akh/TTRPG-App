/**
 * Ashford Roads: Act 1, runtime. API: game.modules.get("possibilities-act1").api.<fn>(); every macro, Director button,
 * chat-card button and journal @Act1[...] link is a call into it. The rules themselves come from the Possibilities
 * system (game.possibilities); this module never re-implements them.
 */
import { registerSettings } from "./lib/settings.mjs";
import {
  addTrio, askBroker, bindAll, brokerBoard, damageLoaner, endAct, enkridCollapses, giveLoaners, innRest, keepLoaners,
  makeCharacter, milestone, openStory, oracle, copyStory, readLine, readScene, resetAct, revealHandout, sessionLog, writeBeat
} from "./lib/story.mjs";
import {
  gloamRebuff, onCombatEnd, onCombatRound, onObstacleUpdate, onSetback, ratCull, resolveLight, startGloam, startGnaw, startLight, sunClock
} from "./lib/fights.mjs";
import { maybeWelcome, openDirector, openPurse, refreshApps, runFromButton } from "./lib/director.mjs";
import { CONTENT, esc, MODULE_ID, openPage, pcName, sceneFor } from "./lib/util.mjs";

/** Show a map (view it; the GM can activate it from there). */
async function showMap(key) {
  const scene = sceneFor(key);
  if ( !scene ) return false;
  await scene.view?.();
  return true;
}

/** Show or hide the Director's optional side work (off by default). */
async function toggleSideWork() {
  await game.settings.set(MODULE_ID, "sideWork", !game.settings.get(MODULE_ID, "sideWork"));
  return true;
}

/** Open a step's first scene page. */
function openStepPage(stepKey) {
  const s = CONTENT.steps.find(x => x.key === stepKey);
  return s ? openPage("act1", s.scenes[0]) : false;
}

export const api = {
  openDirector, openPurse, makeCharacter, addTrio, readScene, askBroker, revealHandout,
  giveLoaners, keepLoaners, damageLoaner, startGnaw, startGloam, gloamRebuff, startLight, sunClock, resolveLight,
  bindAll, enkridCollapses, innRest, endAct, milestone, sessionLog, writeBeat, openStory, copyStory, oracle, brokerBoard, ratCull,
  toggleSideWork, resetAct, showMap, openStepPage
};

/** Text enrichers: {pc} → the player character's name; @Act1[fn:arg]{label} → a button into the API. */
export const ENRICHERS = [
  {
    id: "pa1-pc", pattern: /\{pc\}/g,
    enricher: () => {
      const span = document.createElement("span");
      span.className = "pa1-pc";
      span.textContent = pcName();
      return span;
    }
  },
  {
    id: "pa1-run", pattern: /@Act1\[([A-Za-z]+)(?::([A-Za-z0-9_]+))?\]\{([^}]+)\}/g,
    enricher: match => {
      const a = document.createElement("a");
      a.className = "pa1-run";
      a.dataset.fn = match[1];
      if ( match[2] ) a.dataset.arg = match[2];
      a.innerHTML = `<i class="fa-solid fa-play"></i> ${esc(match[3])}`;
      return a;
    }
  }
];

Hooks.once("init", () => {
  registerSettings({ onChange: () => refreshApps() });
  game.modules.get(MODULE_ID).api = api;
  CONFIG.TextEditor.enrichers.push(...ENRICHERS);
  game.keybindings.register(MODULE_ID, "director", {
    name: "Open the Act 1 Director", editable: [{ key: "KeyA", modifiers: ["Shift"] }], restricted: true,
    onDown: () => {
      openDirector();
      return true;
    }
  });
});

Hooks.once("ready", () => {
  maybeWelcome();
  document.addEventListener("click", onDocumentClick);
  if ( game.user.isGM ) document.addEventListener("dblclick", onReadAloud);
});

Hooks.on("importAdventure", adventure => {
  if ( adventure.compendium?.metadata?.packageName === MODULE_ID ) maybeWelcome();
});

// Chat-card buttons.
Hooks.on("renderChatMessageHTML", (message, html) => {
  for ( const b of html.querySelectorAll?.("[data-pa1-fn]") ?? [] ) {
    if ( !game.user.isGM ) {
      b.hidden = true;
      continue;
    }
    b.addEventListener("click", () => runFromButton(b.dataset.pa1Fn, b.dataset.arg));
  }
});

Hooks.on("updateCombat", (combat, changes) => onCombatRound(combat, changes));
Hooks.on("deleteCombat", combat => onCombatEnd(combat));
Hooks.on("updateActor", actor => {
  onObstacleUpdate(actor);
  refreshApps();
});
// The Possibilities system's own Scene hooks (see possibilities-system/docs/SPEC.md).
Hooks.on("possibilities.sceneResolved", (obstacle, won) => {
  if ( obstacle?.id === CONTENT.ids.actors.into_the_light ) resolveLight(obstacle, won);
});
Hooks.on("possibilities.setback", (obstacle, hero, setback) => {
  if ( obstacle?.id === CONTENT.ids.actors.into_the_light ) onSetback(obstacle, hero, setback);
});

/** Journal @Act1 links (rendered as a.pa1-run) run the API. */
function onDocumentClick(event) {
  const a = event.target.closest?.("a.pa1-run");
  if ( !a ) return;
  event.preventDefault();
  if ( !game.user.isGM ) {
    ui.notifications.info("That button is for the GM.");
    return;
  }
  runFromButton(a.dataset.fn, a.dataset.arg);
}

/** GM: double-click a script line in a journal to read it to chat. */
function onReadAloud(event) {
  const box = event.target.closest?.("blockquote.pa1-readaloud");
  if ( !box || box.closest(".chat-message, #chat-log, .chat-log") ) return;
  if ( box.isContentEditable || box.closest("[contenteditable='true'], prose-mirror, .ProseMirror") ) return;
  event.preventDefault();
  window.getSelection?.()?.removeAllRanges();
  readLine(box.innerHTML);
}
