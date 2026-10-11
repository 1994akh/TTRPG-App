/**
 * Revealing handouts and clue cards, and the Clue Tracker.
 */
import { renderClueTracker } from "./clue-tracker.mjs";
import {
  CONTENT, esc, getSetting, giveItem, handoutPage, isLeadGM, itemsWithKey, journalFor, mainScene, partyActors,
  postCard, requireGM, setSetting, whisperGM
} from "./util.mjs";

const { ApplicationV2, DialogV2 } = foundry.applications.api;
const OBSERVER = CONST.DOCUMENT_OWNERSHIP_LEVELS.OBSERVER;

/** Mark evidence found or not. */
export async function setClue(id, found=true) {
  const clues = { ...getSetting("clues") };
  if ( found ) clues[id] = true;
  else delete clues[id];
  await setSetting("clues", clues);
}

/** Re-render the Clue Tracker journal page from the current state (lead GM only). */
export async function refreshTrackerPage() {
  if ( !isLeadGM() ) return;
  const entry = journalFor("handouts");
  const page = entry?.pages.get(CONTENT.ids.pages["clue-tracker"]);
  if ( !page ) return;
  const links = entry.flags?.ravenmoor?.trackerLinks ?? {};
  const content = renderClueTracker(CONTENT.conclusions, getSetting("clues"), links);
  if ( page.text.content !== content ) await page.update({ "text.content": content });

  // "They are ready to accuse."
  const quill = CONTENT.conclusions.quill;
  const have = quill.evidence.filter(e => getSetting("clues")[e.id]).length;
  if ( (have >= quill.readyToAccuseAt) && !getSetting("readyNotified") ) {
    await setSetting("readyNotified", true);
    await whisperGM("They are ready to accuse.", `<p>${have} pieces of evidence point at Dr. Quill.</p>`);
  }
}

/**
 * Reveal a card: players get Observer on its page, it is shown to them, it is ticked, and its onReveal runs.
 * @param {string} cardId
 * @param {object} [options]
 * @param {string[]|null} [options.users]   User ids to reveal to; null means everyone, an empty list means nobody.
 * @param {Actor|null} [options.giveTo]     Actor who receives the card's item.
 * @param {boolean} [options.notify=true]
 */
export async function revealCard(cardId, { users=null, giveTo=null, notify=true }={}) {
  const card = CONTENT.cards.find(c => c.id === cardId);
  const page = handoutPage(cardId);
  if ( !card || !page ) return ui.notifications.error(`Ravenmoor: handout ${cardId} not found. Import the Adventure first.`);
  if ( Array.isArray(users) && !users.length ) return ui.notifications.warn("Ravenmoor: no players chosen to reveal the card to.");

  if ( users ) {
    const ownership = { ...page.ownership };
    for ( const u of users ) ownership[u] = Math.max(ownership[u] ?? 0, OBSERVER);
    await page.update({ ownership });
  } else {
    await page.update({ "ownership.default": OBSERVER });
  }
  await foundry.documents.collections.Journal.show(page, { force: true, users: users ?? game.users.filter(u => !u.isGM).map(u => u.id) });

  await setClue(cardId, true);
  if ( giveTo && card.item ) await moveItemTo(card.item, giveTo);
  if ( card.onReveal?.startsWith("revealSecretDoor") ) {
    const { revealSecretDoor } = await import("./act1.mjs");
    await revealSecretDoor();
  }
  if ( card.id === "C7" ) {
    const tile = mainScene()?.tiles.find(t => (t.flags?.ravenmoor?.label ?? "").startsWith("C7 costume bundle"));
    if ( tile?.hidden ) await tile.update({ hidden: false });
  }
  if ( notify ) await postCard(`${card.kind === "handout" ? "Handout" : "Clue"} found: ${card.title}`,
    `<p>@UUID[${page.uuid}]{${card.id}: ${card.title}}</p>`);
}

/**
 * Move a module item to an actor, taking it from any NPC that holds it (Quill's will, Edric's letter).
 * @param {string} key
 * @param {Actor} actor
 */
export async function moveItemTo(key, actor) {
  const holders = [...game.actors.filter(a => a.type === "npc"),
    ...(mainScene()?.tokens.filter(t => !t.actorLink && t.actor).map(t => t.actor) ?? [])];
  for ( const holder of holders ) {
    const held = itemsWithKey(holder, key);
    if ( held.length ) await holder.deleteEmbeddedDocuments("Item", held.map(i => i.id));
  }
  if ( !itemsWithKey(actor, key).length ) await giveItem(actor, key);
}

/** Macro: the Reveal Handout dialog. */
export async function revealHandout() {
  if ( !requireGM() ) return;
  const clues = getSetting("clues");
  const players = game.users.filter(u => !u.isGM);
  const party = partyActors();
  const options = CONTENT.cards.map(c => `<option value="${c.id}">${clues[c.id] ? "✔ " : ""}${c.star ? "★ " : ""}`
    + `${c.id}: ${c.title} (${c.foundIn})</option>`).join("");
  const content = `<div class="ravenmoor ravenmoor-form">
    <label>Card <select name="card">${options}</select></label>
    <fieldset><legend>Show to</legend>
      <label><input type="checkbox" name="all" checked> All players</label>
      ${players.map(u => `<label><input type="checkbox" name="user" value="${u.id}"> ${esc(u.name)}</label>`).join("")}
    </fieldset>
    <label>Give its item to <select name="giveTo"><option value="">Nobody</option>
      ${party.map(a => `<option value="${a.uuid}">${esc(a.name)}</option>`).join("")}</select></label>
    <p class="ravenmoor-muted">✔ found already · ★ core clue. Items exist for H3, C7, C8 and C14.</p>
  </div>`;
  const result = await DialogV2.prompt({
    window: { title: "Reveal a handout" },
    content,
    ok: {
      label: "Reveal",
      callback: (event, button) => {
        const form = button.form;
        return {
          card: form.elements.card.value,
          all: form.elements.all.checked,
          users: [...form.querySelectorAll("input[name=user]:checked")].map(i => i.value),
          giveTo: form.elements.giveTo.value
        };
      }
    },
    rejectClose: false
  });
  if ( !result ) return;
  if ( !result.all && !result.users.length ) {
    return ui.notifications.warn("Tick \"All players\" or at least one player to reveal the card to.");
  }
  const giveTo = result.giveTo ? await fromUuid(result.giveTo) : null;
  await revealCard(result.card, { users: result.all ? null : result.users, giveTo });
}

/* -------------------------------------------- */
/*  Clue Tracker app                            */
/* -------------------------------------------- */

export class ClueTrackerApp extends ApplicationV2 {
  static DEFAULT_OPTIONS = {
    id: "ravenmoor-clue-tracker",
    classes: ["ravenmoor", "ravenmoor-tracker-app"],
    window: { title: "RAVENMOOR.Tracker.Title", icon: "fa-solid fa-magnifying-glass" },
    position: { width: 420, height: "auto" },
    actions: { toggle: ClueTrackerApp.#onToggle, openPage: ClueTrackerApp.#onOpenPage }
  };

  /** @override */
  async _renderHTML() {
    const clues = getSetting("clues");
    let html = "";
    for ( const c of Object.values(CONTENT.conclusions) ) {
      const have = c.evidence.filter(e => clues[e.id]).length;
      html += `<h3>${c.name} <span class="ravenmoor-count">${have}/${c.evidence.length}</span></h3><ul>`;
      for ( const e of c.evidence ) {
        html += `<li><label><input type="checkbox" data-action="toggle" data-id="${e.id}" ${clues[e.id] ? "checked" : ""}> `
          + `${e.id.startsWith("T-") || e.id.startsWith("spell:") ? "" : `<strong>${e.id}</strong> · `}${e.label}</label></li>`;
      }
      html += "</ul>";
    }
    const div = document.createElement("div");
    div.innerHTML = `${html}<button type="button" data-action="openPage"><i class="fa-solid fa-book-open"></i> Open the Clue Tracker page</button>`;
    return div;
  }

  /** @override */
  _replaceHTML(result, content) {
    content.replaceChildren(result);
  }

  static async #onToggle(event, target) {
    await setClue(target.dataset.id, target.checked);
  }

  static #onOpenPage() {
    const entry = journalFor("handouts");
    entry?.sheet.render({ force: true, pageId: CONTENT.ids.pages["clue-tracker"] });
  }
}

let trackerApp;
export function clueTracker() {
  if ( !requireGM() ) return;
  trackerApp ??= new ClueTrackerApp();
  trackerApp.render({ force: true });
}

/** Re-render open tracker views after the clue setting changes. */
export function onCluesChanged() {
  if ( trackerApp?.rendered ) trackerApp.render();
  refreshTrackerPage();
}
