/**
 * House rules 4 and 5: the Treat Bag and the Scaredy-Cat Bonus, plus the shared save-request chat card.
 */
import {
  esc, giveItem, gmIds, inCombat, isLeadGM, itemsWithKey, MODULE_ID, partyActors, postCard, requireGM, SOCKET
} from "./util.mjs";

const { ApplicationV2, DialogV2 } = foundry.applications.api;
const CANDY = "treat-candy";
const FRIGHT_IMG = "systems/dnd5e/icons/svg/statuses/frightened.svg";
/** Outside combat there are no turns, so a scare's Frightened ends after this much real time (house rule 5). */
const SCARE_MS = 60 * 1000;

/** Total candy an actor holds. */
export const candyCount = actor => itemsWithKey(actor, CANDY).reduce((n, i) => n + (i.system.quantity ?? 0), 0);

/** Macro: give every player character 2 candy. */
export async function treatBagSetup() {
  if ( !requireGM() ) return;
  const party = partyActors();
  if ( !party.length ) return ui.notifications.warn("No player characters found. Assign characters to your players first.");
  for ( const actor of party ) {
    const have = candyCount(actor);
    if ( have < 2 ) await giveItem(actor, CANDY, 2 - have);
  }
  await postCard("The Treat Bag", `<p>Every guest receives two pieces of wrapped candy (${party.map(a => esc(a.name)).join(", ")}).</p>`
    + "<p>Eat one to <strong>reroll a d20</strong>, to <strong>add 1d4</strong> to a roll after seeing it, or to <strong>ask the DM one yes-or-no question</strong> about the case.</p>");
}

/** GM panel: candy per player with +1 buttons. */
export class TreatBagPanel extends ApplicationV2 {
  static DEFAULT_OPTIONS = {
    id: "ravenmoor-treat-bag",
    classes: ["ravenmoor", "ravenmoor-treat-panel"],
    window: { title: "RAVENMOOR.Treats.Title", icon: "fa-solid fa-candy-cane" },
    position: { width: 340, height: "auto" },
    actions: { give: TreatBagPanel.#onGive, refresh: function() { this.render(); } }
  };

  /** @override */
  async _renderHTML() {
    const rows = partyActors().map(a => `<li><img src="${esc(a.img)}" alt=""><span class="name">${esc(a.name)}</span>`
      + `<span class="count">${candyCount(a)}</span>`
      + `<button type="button" data-action="give" data-actor="${a.uuid}" data-tooltip="Give a candy">+1</button></li>`).join("");
    const div = document.createElement("div");
    div.innerHTML = `<ul class="ravenmoor-candy-list">${rows || "<li>No player characters yet.</li>"}</ul>`
      + "<p class=\"ravenmoor-muted\">Hand out candy for great roleplay, sharp deductions, excellent screams and the Scaredy-Cat Bonus.</p>"
      + "<button type=\"button\" data-action=\"refresh\"><i class=\"fa-solid fa-rotate\"></i> Refresh</button>";
    return div;
  }

  /** @override */
  _replaceHTML(result, content) {
    content.replaceChildren(result);
  }

  static async #onGive(event, target) {
    const actor = await fromUuid(target.dataset.actor);
    if ( !actor ) return;
    await giveItem(actor, CANDY, 1);
    await postCard("A treat!", `<p>${esc(actor.name)} earns a piece of candy.</p>`);
    this.render();
  }
}

let treatPanel;
export function treatBagPanel() {
  if ( !requireGM() ) return;
  treatPanel ??= new TreatBagPanel();
  treatPanel.render({ force: true });
}

/* -------------------------------------------- */
/*  Candy activities                            */
/* -------------------------------------------- */

/**
 * dnd5e.postUseActivity handler for the module's flagged activities.
 * @param {Activity} activity
 */
export async function onUseActivity(activity) {
  const action = activity.flags?.ravenmoor?.action;
  const actor = activity.actor;
  if ( !action || !actor ) return;
  if ( action === "treatReroll" ) return rerollLastD20(actor);
  if ( action === "treatQuestion" ) return postCard("A question for the DM",
    `<p><strong>${esc(actor.name)}</strong> eats a candy and asks the DM one yes-or-no question about the case.</p>`
    + "<div class=\"ravenmoor-buttons ravenmoor-gm-only\"><button type=\"button\" data-ravenmoor=\"answer\" data-answer=\"Yes\">Yes</button>"
    + "<button type=\"button\" data-ravenmoor=\"answer\" data-answer=\"No\">No</button></div>",
    { flags: { type: "question" }, speaker: ChatMessage.getSpeaker({ actor }) });
  if ( action === "snuffFlames" ) {
    const { snuffingPowder } = await import("./showdown.mjs");
    return snuffingPowder({ spendQuill: false });
  }
}

/** Reroll the actor's most recent d20 roll in chat. */
async function rerollLastD20(actor) {
  const message = game.messages.contents.slice().reverse().find(m => (m.speaker?.actor === actor.id)
    && m.rolls?.some(r => r.dice.some(d => d.faces === 20)));
  const roll = message?.rolls.find(r => r.dice.some(d => d.faces === 20));
  if ( !roll ) return ui.notifications.warn(`${actor.name} has no d20 roll in chat to reroll.`);
  const fresh = await roll.reroll();
  await fresh.toMessage({
    speaker: ChatMessage.getSpeaker({ actor }),
    flavor: `Treat Bag reroll (was ${roll.total}${message.flavor ? `: ${message.flavor}` : ""})`
  });
}

/* -------------------------------------------- */
/*  Save requests (fright, lair, brazier)       */
/* -------------------------------------------- */

/**
 * Post a save request card. Each listed actor's owner can roll from it; fright saves also offer Scaredy-Cat.
 * @param {object} options
 * @param {string} options.title
 * @param {string} options.ability   "wis" | "dex" | ...
 * @param {number} options.dc
 * @param {string} [options.text]    Extra HTML.
 * @param {Actor[]} [options.actors] Defaults to the party.
 * @param {boolean} [options.fright] Frightened on a failure, and the Scaredy-Cat button.
 * @param {string} [options.damage]  Damage formula rolled once for the GM (e.g. "2d6[fire]").
 * @param {object} [options.duration] Frightened duration (default: until the end of the target's next turn).
 */
export async function postSaveRequest({ title, ability, dc, text="", actors, fright=false, damage=null, duration=null }) {
  actors ??= partyActors();
  const label = CONFIG.DND5E.abilities[ability]?.label ?? ability;
  const rows = actors.map(a => `<li data-actor="${a.uuid}"><span class="name">${esc(a.name)}</span>`
    + `<button type="button" data-ravenmoor="save">Roll</button>`
    + (fright ? "<button type=\"button\" data-ravenmoor=\"scaredy\" data-tooltip=\"Fail on purpose and play it for laughs. Earn a candy.\">Scaredy-Cat</button>" : "")
    + "<span class=\"result\"></span></li>").join("");
  const body = `${text}<p><strong>${label} saving throw, DC ${dc}.</strong>${fright ? " Failure: Frightened until the end of your next turn." : ""}</p>`
    + `<ul class="ravenmoor-save-list">${rows}</ul>`
    + (damage ? `<div class="ravenmoor-buttons ravenmoor-gm-only"><button type="button" data-ravenmoor="damage" data-formula="${damage}">Roll ${damage}</button></div>` : "")
    + (fright ? "<p class=\"ravenmoor-muted\">Scaredy-Cat Bonus: fail on purpose (shriek, dive into a suit of armor, leap into an ally's arms) and earn a candy.</p>" : "");
  return postCard(title, body, { flags: { type: "save", ability, dc, fright, duration } });
}

/** Macro: a fright save for the party (Lights Out and any jump scare). */
export const frightSave = () => requireGM() && postSaveRequest({
  title: "A chill runs through you", ability: "wis", dc: 13, fright: true
});

/**
 * Apply Frightened. In combat it lasts until the end of the target's next turn (or the given duration); outside
 * combat there are no turns, so it is flagged to expire after a minute and the GM's client removes it.
 * @param {Actor} actor
 * @param {object} [duration]
 * @param {string} [name]
 */
export async function applyFrightened(actor, duration=null, name="Frightened") {
  const fighting = inCombat(actor);
  return actor.createEmbeddedDocuments("ActiveEffect", [{
    name,
    img: FRIGHT_IMG,
    type: "base",
    statuses: ["frightened"],
    duration: fighting ? (duration ?? { value: 1, units: "turns", expiry: "turnEnd" }) : { value: 6, units: "seconds", expiry: null },
    flags: { ravenmoor: { fright: true, expiresAt: fighting ? null : Date.now() + SCARE_MS } }
  }]);
}

/** Lead GM: remove out-of-combat fright effects whose minute is up. */
export async function expireScares() {
  if ( !isLeadGM() ) return;
  const now = Date.now();
  for ( const actor of partyActors() ) {
    const ids = actor.effects.filter(e => e.flags?.ravenmoor?.fright && e.flags.ravenmoor.expiresAt
      && (e.flags.ravenmoor.expiresAt <= now)).map(e => e.id);
    if ( ids.length ) await actor.deleteEmbeddedDocuments("ActiveEffect", ids);
  }
}

/** Rows already used on this client (guards double-clicks before the GM records them). */
const used = new Set();

/**
 * Wire up the module's chat card buttons.
 * @param {ChatMessage} message
 * @param {HTMLElement} html
 */
export function onRenderChatMessage(message, html) {
  const flags = message.flags?.[MODULE_ID];
  if ( !flags?.type ) return;
  if ( !game.user.isGM ) html.querySelectorAll(".ravenmoor-gm-only").forEach(e => e.remove());

  html.querySelectorAll("[data-ravenmoor]").forEach(button => button.addEventListener("click", async event => {
    event.preventDefault();
    const kind = button.dataset.ravenmoor;
    const row = button.closest("[data-actor]");
    const actor = row ? await fromUuid(row.dataset.actor) : null;

    if ( kind === "answer" ) {
      if ( !game.user.isGM || flags.answered ) return;
      const content = message.content.replace(/<div class="ravenmoor-buttons ravenmoor-gm-only">[\s\S]*?<\/div>/, "")
        .replace(/<\/div>$/, () => `<p class="ravenmoor-answer">The DM answers: <strong>${esc(button.dataset.answer)}</strong></p></div>`);
      return message.update({ content, [`flags.${MODULE_ID}.answered`]: button.dataset.answer });
    }
    if ( kind === "damage" ) {
      if ( !game.user.isGM ) return;
      const roll = await new Roll(button.dataset.formula).evaluate();
      return roll.toMessage({ flavor: "Ravenmoor damage", speaker: { alias: "Ravenmoor Manor" } });
    }
    if ( kind === "take-lantern" ) {
      const { takeLantern } = await import("./showdown.mjs");
      return takeLantern(message);
    }
    if ( !actor ) return;
    if ( !actor.isOwner ) return ui.notifications.warn(`You don't control ${actor.name}.`);

    // One roll or Scaredy-Cat per character per card.
    const key = `${message.id}:${actor.uuid}`;
    if ( used.has(key) || flags.done?.[actor.id] ) return ui.notifications.info(`${actor.name} has already answered this one.`);
    used.add(key);

    if ( kind === "save" ) {
      const rolls = await actor.rollSavingThrow({ ability: flags.ability, target: flags.dc });
      const total = rolls?.[0]?.total;
      if ( total === undefined ) {
        used.delete(key);
        return;
      }
      const failed = total < flags.dc;
      if ( failed && flags.fright ) await applyFrightened(actor, flags.duration);
      return recordRow(message, actor, failed ? `failed (${total})` : `saved (${total})`);
    }
    if ( kind === "scaredy" ) {
      await applyFrightened(actor, flags.duration, "Frightened (Scaredy-Cat)");
      await giveItem(actor, CANDY, 1);
      await postCard("Scaredy-Cat!", `<p><strong>${esc(actor.name)}</strong> fails on purpose, gloriously, and earns a candy.</p>`,
        { speaker: ChatMessage.getSpeaker({ actor }) });
      return recordRow(message, actor, "Scaredy-Cat!");
    }
  }));
}

/** Record a row's result: directly on the GM's client, otherwise through the socket. */
function recordRow(message, actor, text) {
  if ( game.user.isGM ) return markRow({ messageId: message.id, actorUuid: actor.uuid, text });
  game.socket.emit(SOCKET, { action: "markRow", messageId: message.id, actorUuid: actor.uuid, text });
}

/**
 * GM side: replace the row's buttons with its result and mark the character as done on this card.
 * @param {{messageId: string, actorUuid: string, text: string}} data
 */
export async function markRow({ messageId, actorUuid, text }) {
  if ( !game.user.isGM ) return;
  const message = game.messages.get(messageId);
  const actor = await fromUuid(actorUuid);
  if ( !message || !actor || message.flags?.[MODULE_ID]?.done?.[actor.id] ) return;
  const uuid = actorUuid.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const row = `<li data-actor="${actorUuid}"><span class="name">${esc(actor.name)}</span><span class="result">${esc(text)}</span></li>`;
  // A function replacement, so "$" in a character's name is never read as a replacement pattern.
  const content = message.content.replace(new RegExp(`<li data-actor="${uuid}">[\\s\\S]*?</li>`), () => row);
  await message.update({ content, [`flags.${MODULE_ID}.done.${actor.id}`]: text });
}

export { gmIds, DialogV2 };
