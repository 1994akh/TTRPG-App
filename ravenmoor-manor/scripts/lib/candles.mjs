/**
 * House rule 1: the Twelve Candles clock. Everyone sees the panel; only the GM can snuff.
 */
import {
  actorFor, CONTENT, getSetting, giveItem, isLeadGM, itemsWithKey, LEVEL_ELEVATION, levelId, mainScene, MODULE_ID,
  postCard, requireGM, setSetting, tokensFor, whisperGM
} from "./util.mjs";

const { ApplicationV2 } = foundry.applications.api;
const TOTAL = 12;

/** In-game time for a number of snuffed candles (9:00 PM plus 15 minutes per candle). */
export function clockTime(snuffed) {
  const minutes = (21 * 60) + (snuffed * 15);
  const h = Math.floor(minutes / 60) % 24;
  const m = minutes % 60;
  if ( h === 0 ) return "Midnight";
  return `${((h + 11) % 12) + 1}:${String(m).padStart(2, "0")} PM`;
}

/** Real time since the session clock started, as h:mm, or null. */
export function elapsed() {
  const start = getSetting("sessionStart");
  if ( !start ) return null;
  const minutes = Math.floor((Date.now() - start) / 60000);
  return `${Math.floor(minutes / 60)}:${String(minutes % 60).padStart(2, "0")}`;
}

/** GM reminders on the candles that trigger something (by snuff order). */
function milestone(n) {
  if ( n === TOTAL ) return "Midnight: the bell tolls and the accusation begins";
  const esc = CONTENT.text.escalations[n];
  return esc ? `Escalation: ${esc.title}` : null;
}

export class CandlePanel extends ApplicationV2 {
  static DEFAULT_OPTIONS = {
    id: "ravenmoor-candles",
    classes: ["ravenmoor", "ravenmoor-candle-panel"],
    tag: "aside",
    window: { title: "RAVENMOOR.Candles.Title", icon: "fa-solid fa-fire", minimizable: true, resizable: false },
    position: { width: 520, height: "auto", top: 70 },
    actions: {
      snuff: CandlePanel.#onSnuff,
      relight: CandlePanel.#onRelight,
      split: CandlePanel.#onSplit
    }
  };

  /** Last count rendered, so the candle that just went out can puff. */
  #lastLit = null;

  /** Session timer refresh for the GM. */
  #timer = null;

  /** @override */
  async _renderHTML() {
    // Candles go out left to right, so each candle's number is its snuff order (candle 4 is the fourth to go out).
    const lit = getSetting("candlesLit");
    const next = TOTAL - lit;
    const last = this.#lastLit;
    const puff = (last !== null) && (lit < last) ? new Set(Array.from({ length: last - lit }, (_, i) => TOTAL - last + i)) : new Set();
    this.#lastLit = lit;
    const gm = game.user.isGM;
    const candles = Array.from({ length: TOTAL }, (_, i) => {
      const n = i + 1;
      const isLit = i >= next;
      const note = gm ? milestone(n) : null;
      const cls = ["ravenmoor-candle", isLit ? "lit" : "snuffed", puff.has(i) ? "puff" : "", note ? "milestone" : ""].join(" ");
      const tip = [gm && isLit && (i === next) ? "Snuff this candle" : null, note].filter(Boolean).join(" · ");
      const attrs = (gm && isLit && (i === next) ? "data-action=\"snuff\" " : "") + (tip ? `data-tooltip="${tip.replaceAll("\"", "&quot;")}"` : "");
      return `<button type="button" class="${cls}" ${attrs} ${gm ? "" : "disabled"} aria-label="Candle ${n}${isLit ? ", lit" : ", out"}">`
        + "<span class=\"wick\"></span><span class=\"flame\"></span><span class=\"wax\"></span><span class=\"wisp\"></span>"
        + `<span class="num">${n}</span></button>`;
    }).join("");
    const session = gm ? elapsed() : null;
    const split = getSetting("splitUp");
    const div = document.createElement("div");
    div.className = "ravenmoor-candles-body";
    div.innerHTML = `<div class="ravenmoor-candle-row">${candles}</div>`
      + `<footer><span class="time">${clockTime(TOTAL - lit)}</span><span class="left">${lit} of ${TOTAL} lit</span>`
      + (session ? `<span class="session" data-tooltip="Real time since the session clock started (the gust comes at 1:55)">${session}</span>` : "")
      + (gm ? `<button type="button" data-action="split" class="${split ? "active" : ""}" data-tooltip="Split Up! One round of group scenes costs one candle.">Split Up!</button>`
        + "<button type=\"button\" data-action=\"relight\" data-tooltip=\"Relight one candle (undo)\"><i class=\"fa-solid fa-rotate-left\"></i></button>" : "")
      + "</footer>"
      + (split ? "<p class=\"ravenmoor-split\">Split Up! Give each group about 5 minutes; the whole round of scenes costs one candle.</p>" : "");
    return div;
  }

  /** @override */
  _replaceHTML(result, content) {
    content.replaceChildren(result);
  }

  /** @override */
  _onRender(context, options) {
    super._onRender?.(context, options);
    if ( !game.user.isGM || this.#timer ) return;
    this.#timer = setInterval(() => {
      const span = this.element?.querySelector(".session");
      const time = elapsed();
      if ( span && time ) span.textContent = time;
    }, 30 * 1000);
  }

  /** @override */
  _onClose(options) {
    super._onClose?.(options);
    clearInterval(this.#timer);
    this.#timer = null;
  }

  static #onSnuff() {
    snuffCandle();
  }

  static async #onRelight() {
    if ( !game.user.isGM ) return;
    await setSetting("candlesLit", Math.min(TOTAL, getSetting("candlesLit") + 1));
  }

  static async #onSplit() {
    if ( !game.user.isGM ) return;
    await setSetting("splitUp", !getSetting("splitUp"));
  }
}

let panel;

/** Show or hide the panel on this client to match the world setting. */
export function syncCandlePanel() {
  const visible = getSetting("candlesVisible");
  panel ??= new CandlePanel();
  if ( visible ) panel.render({ force: true });
  else if ( panel.rendered ) panel.close({ animate: false });
}

/** Macro: show or hide the panel for everyone. */
export async function toggleCandles() {
  if ( !requireGM() ) return;
  await setSetting("candlesVisible", !getSetting("candlesVisible"));
}

/** Light all twelve and show the panel (The Body). */
export async function lightCandles() {
  await setSetting("candlesLit", TOTAL);
  await setSetting("gustPrompted", false);
  await setSetting("candlesVisible", true);
}

/**
 * Snuff one or more candles and run the hooks for candles 4, 8, 11 and 12.
 * @param {number} [count=1]
 */
let snuffing = false;
export async function snuffCandle(count=1) {
  if ( !requireGM() || snuffing ) return;
  snuffing = true;
  try {
    const before = getSetting("candlesLit");
    if ( before <= 0 ) return ui.notifications.info("Every candle is already out.");
    const after = Math.max(0, before - count);
    await setSetting("candlesLit", after);
    for ( let lit = before - 1; lit >= after; lit-- ) await onCandleSnuffed(TOTAL - lit);
  } finally {
    // Ignore clicks until this candle's effects (escalation whispers, Fennick, Midnight) have run.
    snuffing = false;
  }
}

/**
 * @param {number} n  Which candle went out, 1-12.
 */
async function onCandleSnuffed(n) {
  const esc = CONTENT.text.escalations[n];
  if ( esc ) await whisperGM(`Escalation · ${esc.title}`, `<p>${esc.text}</p>`, { type: "escalation", candle: n });
  if ( n === 8 ) await plantLockboxKey();
  if ( n === 11 ) await placeFennick();
  if ( n === TOTAL ) {
    const { midnight } = await import("./showdown.mjs");
    await midnight();
  }
}

/** Candle 8: the lockbox key moves from Quill to Edric's coat, if Quill still has it. */
async function plantLockboxKey() {
  const quill = actorFor("quill");
  const edric = actorFor("edric");
  const keys = itemsWithKey(quill, "lockbox-key");
  if ( !keys.length || !edric ) return;
  await quill.deleteEmbeddedDocuments("Item", keys.map(i => i.id));
  if ( !itemsWithKey(edric, "lockbox-key").length ) await giveItem(edric, "lockbox-key");
  await whisperGM("The lockbox key", "<p>Moved from Dr. Quill's inventory to Edric's coat.</p>");
}

/** Candle 11 and Midnight: Fennick's token on the drive. */
export async function placeFennick() {
  const scene = mainScene();
  const fennick = actorFor("fennick");
  if ( !scene || !fennick || tokensFor("fennick").length ) return;
  const proto = (await fennick.getTokenDocument({
    x: 2400, y: 2900, level: levelId("ground"), elevation: LEVEL_ELEVATION.ground, hidden: false,
    flags: { ravenmoor: { actorKey: "fennick" } }
  })).toObject();
  await scene.createEmbeddedDocuments("Token", [proto]);
}

/* -------------------------------------------- */
/*  Real-time gust (1:55)                       */
/* -------------------------------------------- */

const GUST_AFTER = 115 * 60 * 1000;

/** Start the session clock now. */
export async function startSessionClock() {
  await setSetting("sessionStart", Date.now());
  await setSetting("gustPrompted", false);
  ui.notifications.info("Ravenmoor: session clock started. You will be asked about the gust at 1:55.");
}

/** GM client timer: at 1:55 of real time, offer to snuff the remaining candles. */
export function startGustTimer() {
  if ( !game.user.isGM ) return;
  setInterval(async () => {
    if ( !isLeadGM() ) return;
    const start = getSetting("sessionStart");
    if ( !start || getSetting("gustPrompted") || (getSetting("candlesLit") <= 0) ) return;
    if ( Date.now() - start < GUST_AFTER ) return;
    await setSetting("gustPrompted", true);
    const yes = await foundry.applications.api.DialogV2.confirm({
      window: { title: "Twelve Candles" },
      content: "<p>It is 1:55. <strong>A sudden gust: snuff the remaining candles?</strong></p>"
    });
    if ( yes ) {
      const { playCue } = await import("./util.mjs");
      playCue("gust");
      await postCard("A sudden gust", "<p>A cold wind howls through Ravenmoor, and every remaining candle gutters out.</p>");
      await snuffCandle(getSetting("candlesLit"));
    }
  }, 30 * 1000);
}

export { MODULE_ID };
