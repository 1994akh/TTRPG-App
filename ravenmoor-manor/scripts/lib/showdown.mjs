/**
 * Act 3: Midnight, the Accusation, the showdown in the chapel crypt, and the epilogue.
 */
import { applyFrightened, postSaveRequest } from "./treats.mjs";
import { moveItemTo, setClue } from "./handouts.mjs";
import { placeFennick } from "./candles.mjs";
import { partyTokens, placeParty } from "./session.mjs";
import {
  actorFor, CONTENT, esc, feetBetween, getSetting, giveItem, isLeadGM, itemSource, itemsWithKey, LEVEL_ELEVATION, levelId, levelKey,
  lightsByLabel, mainScene, MODULE_ID, partyActors, pickPoint, playCue, postCard, readAloudHTML, requireGM, setSetting,
  squaresTo, tileByLabel, tokenCenter, tokensFor, userActor, wait, whisperGM
} from "./util.mjs";

const { DialogV2 } = foundry.applications.api;
/** The Hallows' brazier's grid square (column, row): the light and flame tile sit in square (45, 13). */
const BRAZIER_SQUARE = { x: 45, y: 13 };
const WIDOW_TOMB = { x: 3900, y: 1300 };
const WIDOW_POND = { x: 550, y: 2800 };
const MEMORIAL = { x: 1140, y: 3060 };
const LAIR_SKELETONS = [{ x: 4000, y: 1600 }, { x: 4200, y: 1600 }];
const WHY_POSITIONS = { edric: { x: 4000, y: 1700 }, bramwell: { x: 4200, y: 1700 } };
/** Party slots below the crypt stairs (offsets from partyStart), clear of the skeletons at (3900|4100, 900). */
const PARTY_OFFSETS = [[-100, 100], [-200, 100], [-100, 200], [-200, 200], [-100, 300], [-200, 300], [-300, 200], [-300, 300]];
const HOSTILE = CONST.TOKEN_DISPOSITIONS.HOSTILE;
const NEUTRAL = CONST.TOKEN_DISPOSITIONS.NEUTRAL;

/* -------------------------------------------- */
/*  Midnight and the accusation                 */
/* -------------------------------------------- */

/** Candle 12, or the DM rings the bell. */
export async function midnight() {
  if ( !requireGM() ) return;
  playCue("bell");
  await postCard("The midnight bell", readAloudHTML(CONTENT.text.midnight), { css: "ravenmoor-bell" });
  const scene = mainScene();
  if ( scene ) {
    const brazier = lightsByLabel("Hallows' brazier");
    if ( brazier.length ) await scene.updateEmbeddedDocuments("AmbientLight", brazier.map(l => ({ _id: l.id, hidden: false })));
    await tileByLabel("Green brazier fire")?.update({ hidden: false });
    await placeFennick();
  }
  await setSetting("act", "act3");
  await accusation();
}

/** The who / how / why dialog. */
export async function accusation() {
  if ( !requireGM() ) return;
  const edges = getSetting("edges");
  const row = key => {
    const e = CONTENT.text.edges[key];
    return `<label class="ravenmoor-edge"><input type="checkbox" name="${key}" ${edges[key] ? "checked" : ""}>`
      + `<span><strong>${key[0].toUpperCase()}${key.slice(1)}:</strong> ${e.answer}<br><em>${e.edge}</em></span></label>`;
  };
  const result = await DialogV2.prompt({
    window: { title: "The Accusation" },
    content: `<div class="ravenmoor ravenmoor-form"><p>Which did the party name correctly? Each grants one Unmasking Edge.</p>`
      + `${row("who")}${row("how")}${row("why")}</div>`,
    ok: {
      label: "Save edges",
      callback: (event, button) => ({
        who: button.form.elements.who.checked, how: button.form.elements.how.checked, why: button.form.elements.why.checked
      })
    },
    rejectClose: false
  });
  if ( !result ) return;
  await setSetting("edges", result);
  const granted = Object.entries(result).filter(([, v]) => v).map(([k]) => `<li><strong>${k}</strong>: ${CONTENT.text.edges[k].edge}</li>`);
  await whisperGM("Unmasking Edges", granted.length ? `<ul>${granted.join("")}</ul>` : "<p>No edges. Quill slips away; catch him in the crypt.</p>");
}

/* -------------------------------------------- */
/*  Showdown setup                              */
/* -------------------------------------------- */

/** The hidden utility actor that takes the lair turn. */
async function midnightBellActor() {
  let bell = game.actors.find(a => a.flags?.ravenmoor?.key === "midnight-bell");
  if ( bell ) return bell;
  const folder = game.folders.find(f => (f.type === "Actor") && (f.name === "Death at Ravenmoor Manor"));
  bell = await Actor.implementation.create({
    name: "Midnight Bell",
    type: "npc",
    img: "icons/tools/instruments/bell-brass.webp",
    folder: folder?.id ?? null,
    ownership: { default: 0 },
    system: { details: { biography: { value: "<p>Lair actions for the chapel crypt, on initiative count 20 (losing ties).</p>" } } },
    flags: { ravenmoor: { key: "midnight-bell" } }
  });
  return bell;
}


/**
 * Move the party to the crypt, reveal the foes, apply the edges and build the combat.
 */
export async function showdownSetup() {
  if ( !requireGM() ) return;
  const scene = mainScene();
  if ( !scene ) return ui.notifications.error("Ravenmoor: import the Adventure first.");
  const below = levelId("below");
  const start = CONTENT.partyStart.below;
  const edges = getSetting("edges");
  const partySize = Number(getSetting("partySize"));

  // Running it again replaces the previous showdown instead of stacking a second one.
  const previous = game.combats.filter(c => c.flags?.ravenmoor?.showdown);
  if ( previous.length ) {
    const again = await DialogV2.confirm({
      window: { title: "Showdown Setup" },
      content: "<p>A showdown combat already exists. Delete it and set the showdown up again?</p>"
    });
    if ( !again ) return;
    for ( const c of previous ) await c.delete();
    const extras = scene.tokens.filter(t => t.flags?.ravenmoor?.why || t.flags?.ravenmoor?.lair).map(t => t.id);
    if ( extras.length ) await scene.deleteEmbeddedDocuments("Token", extras);
  }
  await setSetting("lairRound", 0);
  await setSetting("widowRisen", false);
  await setSetting("willBurnable", false);
  await setSetting("quillUnmasked", false);
  await setSetting("willBurned", false);
  await restoreFoes();

  // 1. The party, just below the crypt stairs.
  const party = partyActors();
  await placeParty("below", start, PARTY_OFFSETS);

  // 2. The foes for this party size.
  const onBelow = (f, t) => t.level === below;
  const quill = tokensFor("quill", onBelow);
  const skeletons = tokensFor("skeleton", onBelow);
  const scarecrows = tokensFor("scarecrow", onBelow).slice(0, partySize >= 6 ? 2 : 1);
  const masked = actorFor("quill")?.flags?.ravenmoor?.tokenMasked;
  await scene.updateEmbeddedDocuments("Token", [...quill, ...skeletons].map(t => ({
    _id: t.id, hidden: false, disposition: HOSTILE,
    ...((t.flags?.ravenmoor?.actorKey === "quill") && masked ? { "texture.src": masked } : {})
  })));
  // The scarecrows that fight drop their disguise; with five characters the other one stays an ordinary scarecrow.
  const scarecrowName = actorFor("scarecrow")?.prototypeToken.name ?? "Pumpkin-Headed Scarecrow";
  await scene.updateEmbeddedDocuments("Token", scarecrows.map(t => ({
    _id: t.id, hidden: false, disposition: HOSTILE, name: scarecrowName,
    displayName: CONST.TOKEN_DISPLAY_MODES.HOVER, displayBars: CONST.TOKEN_DISPLAY_MODES.OWNER_HOVER,
    "flags.ravenmoor.animated": true
  })));
  // Quill fled the house: his other tokens leave the board.
  const elsewhere = tokensFor("quill", (f, t) => t.level !== below && !t.hidden);
  if ( elsewhere.length ) await scene.updateEmbeddedDocuments("Token", elsewhere.map(t => ({ _id: t.id, hidden: true })));
  // "Either way, the party catches him in the crypt with the will in one hand": if the party found it early, he
  // snatched it back.
  for ( const a of party ) {
    const held = itemsWithKey(a, "new-will");
    if ( held.length ) await a.deleteEmbeddedDocuments("Item", held.map(i => i.id));
  }
  for ( const t of quill ) if ( !itemsWithKey(t.actor, "new-will").length ) await giveItem(t.actor, "new-will");

  // 3. The Unmasking Edges.
  for ( const a of party ) {
    const old = a.effects.filter(e => e.flags?.ravenmoor?.edge).map(e => e.id);
    if ( old.length ) await a.deleteEmbeddedDocuments("ActiveEffect", old);
  }
  if ( edges.who ) {
    for ( const a of party ) await a.createEmbeddedDocuments("ActiveEffect", [{
      name: "Unmasking Edge: Who", img: "icons/svg/eye.svg", type: "base",
      system: { changes: [{ key: "system.attributes.init.roll.mode", value: "1", type: "add", phase: "initial" }] },
      duration: { value: null, units: "rounds", expiry: "combatEnd" },
      description: "<p>No surprise for Quill: Advantage on initiative for this fight.</p>",
      flags: { ravenmoor: { edge: "who" } }
    }]);
  }
  if ( edges.how ) {
    for ( const a of party ) if ( !itemsWithKey(a, "counter-herb").length ) await giveItem(a, "counter-herb", 1);
  }
  if ( edges.why ) {
    const allies = [];
    for ( const [key, pos] of Object.entries(WHY_POSITIONS) ) {
      const actor = actorFor(key);
      if ( !actor ) continue;
      const td = await actor.getTokenDocument({ ...pos, level: below, elevation: LEVEL_ELEVATION.below, disposition: CONST.TOKEN_DISPOSITIONS.FRIENDLY,
        flags: { ravenmoor: { actorKey: key, why: true } } });
      allies.push(td.toObject());
    }
    if ( allies.length ) await scene.createEmbeddedDocuments("Token", allies);
  }

  // 4. The combat, with skeletons grouped on one count and the Midnight Bell at 20 (losing ties).
  if ( !scene.active ) await scene.view();
  const combat = await Combat.implementation.create({ scene: scene.id, active: true, flags: { ravenmoor: { showdown: true } } });
  const freshParty = partyTokens().filter(t => t.level === below);
  const combatants = [...freshParty, ...quill, ...scarecrows].map(t => ({ tokenId: t.id, sceneId: scene.id, actorId: t.actorId }));
  await combat.createEmbeddedDocuments("Combatant", combatants);
  await addSkeletons(combat, skeletons);
  const bell = await midnightBellActor();
  await combat.createEmbeddedDocuments("Combatant", [{
    actorId: bell.id, sceneId: scene.id, name: "Midnight Bell", img: bell.img, initiative: 19.99, hidden: true,
    flags: { ravenmoor: { bell: true } }
  }]);

  await setSetting("beats", { ...getSetting("beats"), showdownSetup: true });
  await postCard("The showdown", readAloudHTML(CONTENT.text.showdown), { css: "ravenmoor-ghost" });
  await whisperGM("Showdown ready", `<p>${partySize} characters: Quill, ${scarecrows.length} scarecrow${scarecrows.length === 1 ? "" : "s"}, `
    + `${skeletons.length} skeletons. Edges: ${Object.entries(edges).filter(([, v]) => v).map(([k]) => k).join(", ") || "none"}.</p>`
    + "<p>Roll initiative for everyone. The Midnight Bell acts on 20 (losing ties) and runs the next lair action.</p>");
}

/**
 * Put Quill and the crypt's minions back as they were before any fight: full Hit Points, no fright, masked (token
 * and sheet portrait), scarecrows disguised, skeletons whole. Used by Showdown Setup and Reset the Night.
 */
export async function restoreFoes() {
  const scene = mainScene();
  const quill = actorFor("quill");
  const masked = quill?.flags?.ravenmoor?.tokenMasked;
  const portrait = quill?.flags?.ravenmoor?.portrait;
  if ( quill && portrait && (quill.img !== portrait) ) await quill.update({ img: portrait });
  if ( !scene ) return;
  for ( const t of tokensFor("quill") ) {
    const actor = t.actor;
    if ( !actor ) continue;
    const hp = actor.system.attributes?.hp;
    if ( hp && (hp.value !== hp.max) ) await actor.update({ "system.attributes.hp.value": hp.max });
    const frights = actor.effects.filter(e => e.flags?.ravenmoor?.fright).map(e => e.id);
    if ( frights.length ) await actor.deleteEmbeddedDocuments("ActiveEffect", frights);
  }
  const updates = [
    ...tokensFor("quill").map(t => ({ _id: t.id, ...(masked ? { "texture.src": masked } : {}), disposition: NEUTRAL })),
    ...tokensFor("scarecrow").map(t => ({ _id: t.id, name: "Scarecrow", disposition: NEUTRAL, rotation: 0,
      displayName: CONST.TOKEN_DISPLAY_MODES.NONE, displayBars: CONST.TOKEN_DISPLAY_MODES.NONE, "flags.ravenmoor.animated": false })),
    ...tokensFor("skeleton", f => !f.lair).map(t => ({ _id: t.id, alpha: 1 }))
  ];
  if ( updates.length ) await scene.updateEmbeddedDocuments("Token", updates);
  for ( const t of [...tokensFor("scarecrow"), ...tokensFor("skeleton")] ) {
    const hp = t.actor?.system.attributes?.hp;
    if ( hp && (hp.value !== hp.max) ) await t.actor.update({ "system.attributes.hp.value": hp.max });
  }
}

/**
 * Add skeleton tokens to the combat on one shared initiative count.
 * @param {Combat} combat
 * @param {TokenDocument[]} tokens
 */
async function addSkeletons(combat, tokens) {
  if ( !tokens.length ) return;
  let group = combat.groups?.find(g => g.flags?.ravenmoor?.skeletons);
  let init = group?.initiative ?? combat.combatants.find(c => c.flags?.ravenmoor?.skeleton)?.initiative;
  if ( init == null ) init = (await new Roll("1d20 + 2").evaluate()).total;
  if ( !group && combat.groups ) {
    try {
      [group] = await combat.createEmbeddedDocuments("CombatantGroup", [{
        name: "Ravenmoor Skeletons", img: "modules/ravenmoor-manor/assets/tokens/skeleton.webp", initiative: init,
        flags: { ravenmoor: { skeletons: true } }
      }]);
    } catch(err) {
      console.warn("Ravenmoor | Combatant groups unavailable; skeletons share an initiative count instead.", err);
    }
  }
  await combat.createEmbeddedDocuments("Combatant", tokens.map(t => ({
    tokenId: t.id, sceneId: combat.scene?.id ?? t.parent.id, actorId: t.actorId, initiative: init,
    group: group?.id ?? null, flags: { ravenmoor: { skeleton: true } }
  })));
}

/* -------------------------------------------- */
/*  Lair actions                                */
/* -------------------------------------------- */

let lastQuillTurn = null;

/**
 * updateCombat (turn or round changed, including combat start): the Midnight Bell's turn, and Quill's burn check.
 * The turn index shifts when combatants are added or re-sorted, so the bell is tracked by combat round: it acts at
 * most once per round, recorded on the combat so a reload cannot repeat it.
 */
export async function onCombatTurn(combat) {
  if ( !isLeadGM() || !combat.flags?.ravenmoor?.showdown || !combat.started ) return;
  const current = combat.combatant;
  if ( current?.flags?.ravenmoor?.bell ) {
    if ( combat.round <= (combat.flags.ravenmoor.bellRound ?? 0) ) return;
    await combat.update({ "flags.ravenmoor.bellRound": combat.round });
    return lairAction();
  }
  if ( current?.token && (current.token.flags?.ravenmoor?.actorKey === "quill" || current.actor?.flags?.ravenmoor?.key === "quill") ) {
    const key = `${combat.id}:${combat.round}:${current.id}`;
    if ( key === lastQuillTurn ) return;
    lastQuillTurn = key;
    return burnPrompt(current.token);
  }
}

/** Run the next lair round (macro, or the bell's turn). */
export async function lairAction() {
  if ( !requireGM() ) return;
  const round = getSetting("lairRound") + 1;
  const lair = CONTENT.lair.rounds.find(r => r.round === round);
  playCue("bell");
  if ( !lair ) {
    await whisperGM("The Midnight Bell", "<p>The bell tolls on. No lair actions remain.</p>");
    return;
  }
  await setSetting("lairRound", round);
  const title = `Lair action · Round ${round}: ${lair.name}`;
  const scene = mainScene();
  const below = levelId("below");

  if ( round === 1 ) {
    if ( getSetting("edges").why ) {
      return postCard(title, "<p>Coffin lids rattle and thump, but Edric and Bramwell lean on them with all their weight. Nothing gets out.</p>");
    }
    const skeleton = actorFor("skeleton");
    const tokens = [];
    for ( const pos of LAIR_SKELETONS ) {
      const td = await skeleton.getTokenDocument({ ...pos, level: below, elevation: LEVEL_ELEVATION.below, disposition: HOSTILE,
        flags: { ravenmoor: { actorKey: "skeleton", lair: true } } });
      tokens.push(td.toObject());
    }
    const created = await scene.createEmbeddedDocuments("Token", tokens);
    if ( game.combat ) await addSkeletons(game.combat, created);
    return postCard(title, `<p>${lair.text.split(". If")[0]}.</p>`);
  }
  if ( round === 2 ) {
    return postSaveRequest({ title, ability: "wis", dc: 13, fright: true, text: "<p>A ghostly wail fills the crypt.</p>" });
  }
  if ( round === 3 ) {
    await pulseBrazier();
    await setSetting("willBurnable", true);
    const near = scene.tokens.filter(t => (t.level === below) && !t.hidden && t.actor && (squaresTo(t, BRAZIER_SQUARE) <= 2));
    await postSaveRequest({
      title, ability: "dex", dc: 13, damage: "2d6[fire]", actors: near.map(t => t.actor),
      text: "<p>The brazier flares. Each creature within 10 feet of it saves. Failure: 7 (2d6) Fire damage.</p>"
    });
    return whisperGM("The will can burn", "<p>From now on, if Quill starts his turn next to the brazier holding the will, he can burn it as a Bonus Action. You'll be asked.</p>");
  }
  if ( round === 4 ) return widowsDue("round 4");
}

/** Pulse the brazier light. */
async function pulseBrazier() {
  const scene = mainScene();
  const lights = lightsByLabel("Hallows' brazier");
  for ( const l of lights ) {
    const { dim, bright } = l.config;
    await scene.updateEmbeddedDocuments("AmbientLight", [{ _id: l.id, hidden: false, "config.dim": dim * 1.6, "config.bright": bright * 1.6 }]);
    await wait(1200);
    await scene.updateEmbeddedDocuments("AmbientLight", [{ _id: l.id, "config.dim": dim, "config.bright": bright }]);
  }
}

/**
 * Round 4, or Quill below half his Hit Points: the Widow rises from her tomb.
 * @param {string} reason
 */
let rising = false;
export async function widowsDue(reason) {
  if ( rising || getSetting("widowRisen") ) return;
  rising = true;
  await setSetting("widowRisen", true);
  rising = false;
  const below = levelId("below");
  await showWidow(WIDOW_TOMB, below, LEVEL_ELEVATION.below);
  const lair = CONTENT.lair.rounds.find(r => r.round === 4);
  await postCard(`The Widow's due (${reason})`,
    "<p>A cold green light rises from Elspeth's tomb, and a veiled shape stands in it. It is not Pip, and it is not a costume.</p>",
    { css: "ravenmoor-ghost" });
  const quillToken = tokensFor("quill", (f, t) => t.level === below)[0];
  const quill = quillToken?.actor;
  if ( !quill ) return;
  const rolls = await quill.rollSavingThrow({ ability: "wis", target: 15 }, { configure: false });
  const total = rolls?.[0]?.total;
  if ( (total !== undefined) && (total < 15) ) {
    await applyFrightened(quill, { value: null, units: "rounds", expiry: "combatEnd" }, "Frightened (the Widow's due)");
    await whisperGM("The Widow's due", `<p>Quill fails (${total}): Frightened until the fight ends.</p><p class="ravenmoor-muted">${lair.text}</p>`);
  } else if ( total !== undefined ) {
    await whisperGM("The Widow's due", `<p>Quill holds his nerve (${total}).</p>`);
  }
}

/** Show (or create) the Lantern Widow token at a spot. */
async function showWidow(pos, level, elevation) {
  const scene = mainScene();
  const widow = actorFor("widow");
  if ( !scene || !widow ) return;
  const existing = tokensFor("widow")[0];
  const data = { x: pos.x, y: pos.y, level, elevation, hidden: false };
  if ( existing ) return existing.update(data, { animate: false });
  const td = await widow.getTokenDocument({ ...data, flags: { ravenmoor: { actorKey: "widow" } } });
  return scene.createEmbeddedDocuments("Token", [td.toObject()]);
}

/** Quill's turn: offer to burn the will if he is next to the brazier holding it. */
async function burnPrompt(token) {
  if ( !getSetting("willBurnable") || getSetting("willBurned") ) return;
  const will = itemsWithKey(token.actor, "new-will");
  if ( !will.length ) return;
  if ( squaresTo(token, BRAZIER_SQUARE) > 1 ) return;
  const yes = await DialogV2.confirm({
    window: { title: "The will" },
    content: "<p>Quill starts his turn next to the brazier, holding the will.</p><p><strong>Burn the will (Bonus Action)?</strong></p>"
  });
  if ( !yes ) return;
  // Quill is unlinked: remove the will from this token, his other tokens and the base actor alike.
  for ( const holder of [token.actor, actorFor("quill"), ...tokensFor("quill").map(t => t.actor)] ) {
    const copies = itemsWithKey(holder, "new-will");
    if ( copies.length ) await holder.deleteEmbeddedDocuments("Item", copies.map(i => i.id));
  }
  await setSetting("willBurned", true);
  await postCard("The will burns", "<p>Quill drops the scroll into the green fire. The black wax bubbles, the raven seal blurs, and Silas's last wishes curl into ash.</p>");
}

/* -------------------------------------------- */
/*  Crypt actions                               */
/* -------------------------------------------- */

/** Macro: contested Athletics or Sleight of Hand to snatch the will from Quill. */
export async function snatchWill() {
  if ( !requireGM() ) return;
  const snatcher = canvas.tokens.controlled.find(t => t.actor?.type === "character")?.actor;
  if ( !snatcher ) return ui.notifications.warn("Select the character who grabs for the will.");
  if ( getSetting("willBurned") ) return ui.notifications.warn("The will has already burned.");
  const quillToken = tokensFor("quill", (f, t) => !t.hidden && itemsWithKey(t.actor, "new-will").length)[0];
  if ( !quillToken ) return ui.notifications.warn("Quill isn't holding the will.");
  const choice = await DialogV2.prompt({
    window: { title: "Snatch the will" },
    content: `<div class="ravenmoor ravenmoor-form"><p>${esc(snatcher.name)} grabs for the will (an action). Contested check.</p>
      <label>${esc(snatcher.name)} uses <select name="pc"><option value="ath">Athletics</option><option value="slt">Sleight of Hand</option></select></label>
      <label>Quill resists with <select name="quill"><option value="ath">Athletics</option><option value="slt" selected>Sleight of Hand</option></select></label></div>`,
    ok: { label: "Roll", callback: (e, b) => ({ pc: b.form.elements.pc.value, quill: b.form.elements.quill.value }) },
    rejectClose: false
  });
  if ( !choice ) return;
  const a = (await snatcher.rollSkill({ skill: choice.pc }))?.[0]?.total;
  const q = (await quillToken.actor.rollSkill({ skill: choice.quill }, { configure: false }))?.[0]?.total;
  if ( (a === undefined) || (q === undefined) ) return;
  if ( a > q ) {
    await moveItemTo("new-will", snatcher);
    await setClue("C14", true);
    await postCard("The will is snatched!", `<p>${esc(snatcher.name)} (${a}) tears the will from Quill's grip (${q}).</p>`);
  } else {
    await postCard("Quill holds on", `<p>Quill (${q}) twists away from ${esc(snatcher.name)} (${a}), the will clutched to his chest.</p>`);
  }
}

/** Macro: knock over a crypt candelabra. */
export async function toppleCandelabra() {
  if ( !requireGM() ) return;
  const scene = mainScene();
  const candelabras = lightsByLabel("Crypt candelabra").filter(l => !l.hidden);
  if ( !candelabras.length ) return ui.notifications.warn("No standing candelabras left.");
  const which = candelabras.length === 1 ? candelabras[0].id : await DialogV2.prompt({
    window: { title: "Topple a candelabra" },
    content: `<div class="ravenmoor ravenmoor-form"><label>Candelabra <select name="light">${candelabras.map((l, i) =>
      `<option value="${l.id}">${i === 0 ? "North-west" : "South-east"} (${l.x}, ${l.y})</option>`).join("")}</select></label></div>`,
    ok: { label: "Topple", callback: (e, b) => b.form.elements.light.value },
    rejectClose: false
  });
  if ( !which ) return;
  const light = scene.lights.get(which);
  const point = await pickPoint("Click the 10-foot square that catches fire");
  if ( !point ) return;
  const size = scene.grid.size;
  const x = Math.floor(point.x / size) * size;
  const y = Math.floor(point.y / size) * size;
  const level = light.levels?.first?.() ?? [...(light.levels ?? [])][0] ?? levelId("below");
  await light.update({ hidden: true });
  await scene.createEmbeddedDocuments("Region", [{
    name: "Burning candelabra (10 ft)", color: "#ff5a1f",
    shapes: [{ type: "rectangle", x, y, width: size * 2, height: size * 2, rotation: 0 }],
    elevation: { bottom: null, top: null }, levels: [level], visibility: 2,
    flags: { ravenmoor: { fire: true } }
  }]);
  await scene.createEmbeddedDocuments("AmbientLight", [{
    x: x + size, y: y + size, elevation: LEVEL_ELEVATION[levelKey(level)] ?? 0, levels: [level],
    config: { dim: 20, bright: 10, color: "#ff7a2a", alpha: 0.5, animation: { type: "fire", speed: 5, intensity: 6 } },
    flags: { ravenmoor: { label: "Candelabra fire", fire: true } }
  }]);
  const inside = scene.tokens.filter(t => !t.hidden && (t.level === level) && t.actor && (() => {
    const c = tokenCenter(t);
    return (c.x >= x) && (c.x <= x + size * 2) && (c.y >= y) && (c.y <= y + size * 2);
  })());
  await postCard("The candelabra crashes down",
    `<p>Candle flame splashes across the flagstones: a 10-foot square ablaze. 2d6 Fire damage to anything inside${inside.length ? ` (${inside.map(t => esc(t.name)).join(", ")})` : ""}. The scarecrows hate that.</p>`
    + "<div class=\"ravenmoor-buttons ravenmoor-gm-only\"><button type=\"button\" data-ravenmoor=\"damage\" data-formula=\"2d6[fire]\">Roll 2d6 fire</button></div>",
    { flags: { type: "fire" } });
}

/**
 * Snuffing Powder: every nonmagical flame within 20 ft of a point goes out. Players using the pouch pick the point
 * and the GM's client hides the lights.
 * @param {object} [options]
 * @param {boolean} [options.spendQuill=true]  Spend one of Quill's uses (the GM's macro).
 */
export async function snuffingPowder({ spendQuill=true }={}) {
  // Which floor: Quill's for his own powder (snuffAt finds it); otherwise the selected token's, else the user's
  // character on the map.
  const own = game.user.character && mainScene()?.tokens.find(t => t.actorId === game.user.character.id);
  let level = spendQuill ? null : (canvas.tokens?.controlled[0]?.document.level ?? own?.level ?? null);
  if ( !level && !game.user.isGM ) return ui.notifications.warn("Select your token first, so the powder lands on the right floor.");
  if ( !level && game.user.isGM && !spendQuill ) level = await chooseLevel();
  if ( !level && !spendQuill ) return;
  const point = await pickPoint("Click where the snuffing powder lands");
  if ( !point ) return;
  if ( !game.user.isGM ) {
    game.socket.emit(`module.${MODULE_ID}`, { action: "snuff", point, level, user: game.user.id });
    return;
  }
  await snuffAt(point, { spendQuill, level });
}

/** Ask the GM which floor something happens on. */
async function chooseLevel() {
  const options = Object.entries(CONTENT.ids.levels).map(([key, id]) => `<option value="${id}">${{ below: "Crypt & Cellar", ground: "Ground Floor & Grounds", upper: "Upper Floor" }[key]}</option>`).join("");
  return DialogV2.prompt({
    window: { title: "Which floor?" },
    content: `<div class="ravenmoor ravenmoor-form"><label>Floor <select name="level">${options}</select></label></div>`,
    ok: { label: "OK", callback: (e, b) => b.form.elements.level.value },
    rejectClose: false
  });
}

/**
 * GM side of the snuffing powder.
 * @param {{x: number, y: number}} point
 * @param {object} [options]
 * @param {boolean} [options.spendQuill=false]
 * @param {string|null} [options.level]  Only lights on this level (defaults to Quill's level when he spends a use).
 */
export async function snuffAt(point, { spendQuill=false, level=null }={}) {
  if ( !game.user.isGM ) return;
  const scene = mainScene();
  if ( !scene ) return;
  const quillToken = tokensFor("quill", (f, t) => !t.hidden)[0];
  level ??= quillToken?.level ?? levelId("below");
  const out = scene.lights.filter(l => !l.hidden && !l.flags?.ravenmoor?.magical
    && (!level || !l.levels?.size || l.levels.has(level))
    && (feetBetween({ x: l.x, y: l.y }, point) <= 20));
  if ( out.length ) await scene.updateEmbeddedDocuments("AmbientLight", out.map(l => ({ _id: l.id, hidden: true })));
  if ( spendQuill && quillToken?.actor ) {
    const feature = quillToken.actor.items.find(i => (i.type === "feat") && (i.name === "Snuffing Powder"));
    const uses = feature?.system.uses;
    if ( uses?.max ) {
      if ( uses.value <= 0 ) ui.notifications.warn("Quill has no Snuffing Powder left.");
      else await feature.update({ "system.uses.spent": (uses.spent ?? 0) + 1 });
    }
  }
  await postCard("Snuffing powder", `<p>A cold rush of air: ${out.length} flame${out.length === 1 ? "" : "s"} go${out.length === 1 ? "es" : ""} out.</p>`);
}

/* -------------------------------------------- */
/*  Unmasking                                   */
/* -------------------------------------------- */

let unmasking = false;

/**
 * updateActor / updateToken: Quill's surrender threshold, and the Widow's early rise below half HP.
 * @param {Actor|null} actor
 */
export async function checkQuill(actor) {
  if ( !isLeadGM() || !actor || (actor.flags?.ravenmoor?.key !== "quill") ) return;
  const hp = actor.system.attributes?.hp;
  if ( !hp ) return;
  // Any combat Quill is fighting in counts, not only the one Showdown Setup builds.
  const inShowdown = !!game.combat?.combatants.some(c => c.actor?.flags?.ravenmoor?.key === "quill");
  if ( inShowdown && (hp.value < Math.ceil(hp.max / 2)) && !getSetting("widowRisen") ) await widowsDue("Quill below half his Hit Points");
  const threshold = getSetting("runningLong") ? 50 : 30;
  if ( (hp.value <= threshold) && !getSetting("quillUnmasked") && inShowdown ) await unmaskQuill();
}

/** Quill tears off his mask and surrenders. */
export async function unmaskQuill() {
  if ( !requireGM() || unmasking ) return;
  unmasking = true;
  try {
    await setSetting("quillUnmasked", true);
    const scene = mainScene();
    const unmasked = actorFor("quill")?.flags?.ravenmoor?.tokenUnmasked ?? "modules/ravenmoor-manor/assets/tokens/quill-unmasked.webp";
    const quill = tokensFor("quill");
    await scene.updateEmbeddedDocuments("Token", quill.map(t => ({ _id: t.id, "texture.src": unmasked, disposition: NEUTRAL })));
    const portrait = actorFor("quill")?.flags?.ravenmoor?.portraitUnmasked;
    if ( portrait ) await actorFor("quill").update({ img: portrait });

    const combat = game.combat;
    if ( combat ) {
      const minions = combat.combatants.filter(c => ["quill", "skeleton", "scarecrow"].includes(c.token?.flags?.ravenmoor?.actorKey ?? c.actor?.flags?.ravenmoor?.key));
      await combat.updateEmbeddedDocuments("Combatant", minions.map(c => ({ _id: c.id, defeated: true })));
    }
    // The skeletons crumble to dust; the scarecrows slump.
    const skeletons = tokensFor("skeleton", (f, t) => !t.hidden);
    for ( const alpha of [0.6, 0.3] ) {
      await scene.updateEmbeddedDocuments("Token", skeletons.map(t => ({ _id: t.id, alpha })), { animate: false });
      await wait(300);
    }
    await scene.updateEmbeddedDocuments("Token", skeletons.map(t => ({ _id: t.id, hidden: true, alpha: 1 })));
    // Only the scarecrows that came to life slump; an unanimated one is just a scarecrow.
    const scarecrows = tokensFor("scarecrow", (f, t) => !t.hidden && (f.animated || t.disposition === HOSTILE));
    await scene.updateEmbeddedDocuments("Token", scarecrows.map(t => ({ _id: t.id, disposition: NEUTRAL, rotation: 15 })));

    await postCard("The unmasking", `<p>The skeletons collapse into dust, the scarecrows slump, and Dr. Quill tears off his beaked mask.</p>${readAloudHTML(CONTENT.text.unmasking)}`,
      { css: "ravenmoor-ghost" });
    if ( combat ) {
      const end = await DialogV2.confirm({ window: { title: "Quill surrenders" }, content: "<p>End the combat?</p>" });
      if ( end ) await combat.delete();
    }
  } finally {
    unmasking = false;
  }
}

/** deleteCombat: clear the Who edge. */
export async function onCombatEnd(combat) {
  if ( !isLeadGM() || !combat.flags?.ravenmoor?.showdown ) return;
  for ( const a of partyActors() ) {
    const ids = a.effects.filter(e => e.flags?.ravenmoor?.edge === "who").map(e => e.id);
    if ( ids.length ) await a.deleteEmbeddedDocuments("ActiveEffect", ids);
  }
}

/* -------------------------------------------- */
/*  Epilogue                                    */
/* -------------------------------------------- */

export async function epilogue() {
  if ( !requireGM() ) return;
  const scene = mainScene();
  const caught = getSetting("quillUnmasked");
  const burned = getSetting("willBurned");
  const [saved, ash, escaped] = CONTENT.text.outcomes;
  const outcome = !caught ? escaped : (burned ? ash : saved);
  await setSetting("act", "epilogue");
  await postCard(`Ending: ${outcome.outcome}`,
    `<p>${outcome.what}</p><p><strong>Reward per character:</strong> ${outcome.reward}</p>`
    + (caught && !burned ? `<p class="ravenmoor-muted">The new will's last line: “${CONTENT.text.caneLine}” The raven-headed cane is a fine walking stick worth 50 gp.</p>` : ""));

  if ( scene ) {
    const lanterns = lightsByLabel("Warding lantern");
    for ( const [i, l] of lanterns.entries() ) {
      await scene.updateEmbeddedDocuments("AmbientLight", [{ _id: l.id, hidden: false, "config.color": "#38ff8c", "config.animation.type": "ghost" }]);
      if ( i < lanterns.length - 1 ) await wait(400);
    }
    await showWidow(WIDOW_POND, levelId("ground"), LEVEL_ELEVATION.ground);
    await postCard("The real ghost", readAloudHTML(CONTENT.text.realGhost), { css: "ravenmoor-ghost" });

    // Elspeth's Lantern on the memorial stone.
    const lantern = await itemSource("elspeths-lantern");
    if ( !scene.tiles.some(t => t.flags?.ravenmoor?.lantern) ) {
      await scene.createEmbeddedDocuments("Tile", [{
        texture: { src: lantern?.img ?? "icons/sundries/lights/lantern-iron-lit-yellow.webp" },
        x: MEMORIAL.x - 40, y: MEMORIAL.y - 40, width: 80, height: 80, elevation: LEVEL_ELEVATION.ground,
        levels: [levelId("ground")], hidden: false, flags: { ravenmoor: { lantern: true, label: "Elspeth's Lantern" } }
      }]);
    }
    await postCard("On Elspeth's memorial stone",
      "<p>Her old green-glass lantern sits on the stone, dry and warm. It works as a <em>lantern of revealing</em>.</p>"
      + "<div class=\"ravenmoor-buttons\"><button type=\"button\" data-ravenmoor=\"take-lantern\">Take the lantern</button></div>",
      { flags: { type: "lantern" } });
  }
}

/**
 * A player takes Elspeth's Lantern from the memorial stone.
 * @param {ChatMessage} message
 */
export async function takeLantern(message) {
  if ( message.flags?.[MODULE_ID]?.taken ) return ui.notifications.info("Someone has already taken the lantern.");
  const actor = userActor();
  if ( !actor?.isOwner ) return ui.notifications.warn("Select or assign your character first.");
  await giveItem(actor, "elspeths-lantern");
  game.socket.emit(`module.${MODULE_ID}`, { action: "lanternTaken", messageId: message.id, by: actor.name });
  if ( game.user.isGM ) await lanternTaken({ messageId: message.id, by: actor.name });
}

/** GM side: remove the tile and mark the card. */
export async function lanternTaken({ messageId, by }) {
  if ( !isLeadGM() ) return;
  const scene = mainScene();
  const tile = scene?.tiles.find(t => t.flags?.ravenmoor?.lantern);
  if ( tile ) await tile.delete();
  const message = game.messages.get(messageId);
  if ( message && !message.flags?.[MODULE_ID]?.taken ) {
    await message.update({
      [`flags.${MODULE_ID}.taken`]: by,
      content: message.content.replace(/<div class="ravenmoor-buttons">[\s\S]*?<\/div>/, () => `<p><em>${esc(by)} takes the lantern.</em></p>`)
    });
  }
}
