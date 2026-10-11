/**
 * Death at Ravenmoor Manor: runtime for the adventure's house rules and set pieces.
 *
 * API: game.modules.get("ravenmoor-manor").api.<fn>(). Every Ravenmoor macro is a one-line call into it.
 * Features are independent: a GM who uses real tealights and candy can ignore the panels and nothing breaks.
 */
import { registerSettings } from "./lib/settings.mjs";
import {
  snuffCandle, startGustTimer, startSessionClock, syncCandlePanel, toggleCandles
} from "./lib/candles.mjs";
import {
  expireScares, frightSave, markRow, onRenderChatMessage, onUseActivity, treatBagPanel, treatBagSetup
} from "./lib/treats.mjs";
import { introduceSuspects, lightsOut, revealSecretDoor, silasRetires, theBody } from "./lib/act1.mjs";
import { clueTracker, onCluesChanged, revealCard, revealHandout } from "./lib/handouts.mjs";
import {
  accusation, checkQuill, epilogue, lairAction, lanternTaken, midnight, onCombatEnd, onCombatTurn, showdownSetup,
  snatchWill, snuffAt, snuffingPowder, toppleCandelabra, unmaskQuill
} from "./lib/showdown.mjs";
import { maybeWelcome, openDirector, refreshDirector } from "./lib/director.mjs";
import { partyArrives, resetNight, resetSettings, setupHotbar } from "./lib/session.mjs";
import { CONTENT, esc, getSetting, isLeadGM, MODULE_ID, requireGM, setSetting, SOCKET } from "./lib/util.mjs";

const CONTENT_SCENE_ID = CONTENT.ids.scene;

/** Macro: module settings in one dialog. */
async function openSettings() {
  if ( !requireGM() ) return;
  const { DialogV2 } = foundry.applications.api;
  const start = getSetting("sessionStart");
  const started = start ? new Date(start).toLocaleTimeString() : "not started";
  const sound = key => `<label>${key} sound <input type="text" name="sound${key}" value="${esc(getSetting(`sound${key}`))}" placeholder="path/to/sound.ogg"></label>`;
  const result = await DialogV2.prompt({
    window: { title: "Ravenmoor Settings" },
    content: `<div class="ravenmoor ravenmoor-form">
      <label>Party size <select name="partySize">
        <option value="5" ${Number(getSetting("partySize")) === 5 ? "selected" : ""}>5 characters (1 scarecrow)</option>
        <option value="6" ${Number(getSetting("partySize")) === 6 ? "selected" : ""}>6 characters (2 scarecrows)</option></select></label>
      <label><input type="checkbox" name="runningLong" ${getSetting("runningLong") ? "checked" : ""}> Running long: Quill surrenders at 50 HP instead of 30</label>
      <label><input type="checkbox" name="startClock"> Start the real-time session clock now (currently: ${started}); you'll be asked about the gust at 1:55</label>
      ${sound("Bell")}${sound("Gust")}${sound("Scream")}
      <label><input type="checkbox" name="reset"> Reset the night's progress only (candles, clues, edges, showdown state). To reset the map, NPCs and handouts too, use Reset the Night in the Director.</label>
    </div>`,
    ok: {
      label: "Save",
      callback: (e, button) => {
        const f = button.form.elements;
        return {
          partySize: Number(f.partySize.value), runningLong: f.runningLong.checked, startClock: f.startClock.checked,
          soundBell: f.soundBell.value.trim(), soundGust: f.soundGust.value.trim(), soundScream: f.soundScream.value.trim(),
          reset: f.reset.checked
        };
      }
    },
    rejectClose: false
  });
  if ( !result ) return;
  for ( const key of ["partySize", "runningLong", "soundBell", "soundGust", "soundScream"] ) await setSetting(key, result[key]);
  if ( result.startClock ) await startSessionClock();
  if ( result.reset ) {
    await resetSettings();
    ui.notifications.info("Ravenmoor: the night's progress is reset. Map tokens, lights and doors keep their current state.");
  }
}

const api = {
  // Running the night
  openDirector, partyArrives, setupHotbar, resetNight,
  // House rule 1
  toggleCandles, snuffCandle, startSessionClock,
  // House rules 4 and 5
  treatBagSetup, treatBagPanel, frightSave,
  // Act 1
  introduceSuspects, silasRetires, lightsOut, theBody, revealSecretDoor,
  // Handouts and clues
  revealHandout, revealCard, clueTracker,
  // Act 3
  midnight, accusation, showdownSetup, lairAction, snatchWill, toppleCandelabra, snuffingPowder, unmaskQuill, epilogue,
  // Settings
  openSettings
};

Hooks.once("init", () => {
  registerSettings({ onCandles: () => syncCandlePanel(), onClues: () => onCluesChanged() });
  game.modules.get(MODULE_ID).api = api;

  // Keyboard: open the Director (Shift+R) and snuff a candle (unbound by default). GM only; rebind in Configure Controls.
  game.keybindings.register(MODULE_ID, "director", {
    name: "RAVENMOOR.Keys.Director.Name", hint: "RAVENMOOR.Keys.Director.Hint",
    editable: [{ key: "KeyR", modifiers: ["Shift"] }], restricted: true,
    onDown: () => {
      openDirector();
      return true;
    }
  });
  game.keybindings.register(MODULE_ID, "snuff", {
    name: "RAVENMOOR.Keys.Snuff.Name", hint: "RAVENMOOR.Keys.Snuff.Hint", editable: [], restricted: true,
    onDown: () => {
      snuffCandle();
      return true;
    }
  });
});

Hooks.once("ready", () => {
  syncCandlePanel();
  startGustTimer();
  // Out-of-combat scares end after a minute (there are no turns to end them).
  if ( game.user.isGM ) setInterval(() => expireScares(), 15 * 1000);
  game.socket.on(SOCKET, data => {
    if ( data?.action === "lanternTaken" ) lanternTaken(data);
    if ( (data?.action === "snuff") && isLeadGM() ) snuffAt(data.point, { level: data.level ?? null });
    if ( (data?.action === "markRow") && isLeadGM() ) markRow(data);
  });
});

// Chat card buttons (v13+ passes an HTMLElement).
Hooks.on("renderChatMessageHTML", (message, html) => onRenderChatMessage(message, html));

// Candy activities and the snuffing powder pouch.
Hooks.on("dnd5e.postUseActivity", activity => {
  onUseActivity(activity);
});

// The How edge: Advantage on saves against Banshee's Breath for counter-herb carriers. A save rolled from the
// Banshee's Breath chat card names its origin message; other Constitution saves at DC 15 count only when there is
// no origin to check (concentration saves never count).
Hooks.on("dnd5e.preRollSavingThrowV2", (config, dialog, message) => {
  const actor = config.subject;
  if ( !actor || (config.ability !== "con") || (config.saveType === "concentration") ) return;
  const origin = game.messages.get(message?.data?.system?.origin);
  const originItem = origin?.getAssociatedItem?.() ?? null;
  if ( originItem ? (originItem.name !== "Banshee's Breath") : (Number(config.target) !== 15) ) return;
  const herb = actor.effects.some(e => e.flags?.ravenmoor?.counterHerb && !e.disabled)
    || actor.items.some(i => i.flags?.ravenmoor?.key === "counter-herb");
  if ( !herb ) return;
  config.advantage = true;
  for ( const r of config.rolls ?? [] ) (r.options ??= {}).advantage = true;
});

// Quill's surrender threshold and the Widow's early rise.
Hooks.on("updateActor", actor => checkQuill(actor));
Hooks.on("updateToken", token => {
  if ( !token.actorLink ) checkQuill(token.actor);
});

// The Midnight Bell's turn, and Quill's turn by the brazier (turn changes and the first turn of the fight).
Hooks.on("updateCombat", (combat, changes) => {
  if ( ("turn" in changes) || ("round" in changes) ) onCombatTurn(combat);
});
Hooks.on("deleteCombat", combat => onCombatEnd(combat));

// Keep the Clue Tracker page in step once everything is loaded.
Hooks.once("ready", () => {
  if ( isLeadGM() ) onCluesChanged();
  maybeWelcome();
  // GM: double-click a read-aloud box in a journal to read it out in chat.
  if ( game.user.isGM ) document.addEventListener("dblclick", readAloudToChat);
});

// The welcome card also appears straight after this module's Adventure is imported.
Hooks.on("importAdventure", adventure => {
  if ( adventure.compendium?.metadata.packageName === MODULE_ID ) maybeWelcome();
});

// The Director follows the night: any Ravenmoor setting, and the map changes it reads.
for ( const hook of ["createSetting", "updateSetting"] ) {
  Hooks.on(hook, setting => {
    if ( setting.key?.startsWith(`${MODULE_ID}.`) ) refreshDirector();
  });
}
// Map changes count only on the Ravenmoor scene (a token step elsewhere never re-renders the Director).
const onRavenmoorScene = doc => {
  const scene = doc?.parent?.parent ?? doc?.parent ?? doc?.scene;
  return !scene || (scene.id === CONTENT_SCENE_ID);
};
for ( const hook of ["updateWall", "updateTile", "updateToken", "updateRegionBehavior", "createCombat", "deleteCombat"] ) {
  Hooks.on(hook, doc => {
    if ( onRavenmoorScene(doc) ) refreshDirector();
  });
}

/**
 * Post a journal read-aloud box to chat.
 * @param {MouseEvent} event
 */
function readAloudToChat(event) {
  const box = event.target.closest?.("blockquote.ravenmoor-readaloud");
  if ( !box || box.closest(".chat-message, #chat-log, .chat-log") ) return;
  // Not while editing: there a double-click selects a word.
  if ( box.isContentEditable || box.closest("[contenteditable='true'], .editor-content, prose-mirror, .ProseMirror") ) return;
  event.preventDefault();
  window.getSelection?.()?.removeAllRanges();
  ChatMessage.implementation.create({
    content: `<div class="ravenmoor ravenmoor-card ravenmoor-readaloud-card"><blockquote class="ravenmoor-readaloud">${box.innerHTML}</blockquote></div>`,
    speaker: { alias: "Ravenmoor Manor" }
  });
}
