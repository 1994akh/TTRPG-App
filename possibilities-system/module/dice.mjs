/**
 * Rolls and chat cards: checks with degrees of success, Strike with the multiple attack penalty, damage and healing.
 */
import { DEFAULTS, DEGREES, SYSTEM_ID } from "./config.mjs";
import * as R from "./rules.mjs";

export const esc = s => String(s ?? "").replace(/[&<>"']/g, ch => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[ch]);
const signed = n => (n >= 0 ? `+ ${n}` : `- ${Math.abs(n)}`);
const DEGREE_CLASS = ["crit-fail", "fail", "success", "crit-success"];

/** The actor a token, token document or actor stands for. */
export function actorOf(x) {
  if ( !x ) return null;
  if ( x instanceof Actor ) return x;
  return x.actor ?? x.document?.actor ?? null;
}

/** The first targeted token's actor, if any. */
export function firstTarget() {
  const t = game.user?.targets?.first?.() ?? [...(game.user?.targets ?? [])][0];
  return actorOf(t);
}

/** Tokens the damage buttons apply to: targets first, then controlled tokens. */
function recipients(mode) {
  const list = mode === "target" ? [...(game.user.targets ?? [])] : (canvas?.tokens?.controlled ?? []);
  return list.map(actorOf).filter(Boolean);
}

/** "14 + 7 = 21 vs DC 19 · Success" */
export function readout({ natural, mod, total, dc, deg, against="DC" }) {
  const left = `${natural} ${signed(mod)} = ${total}`;
  return dc === null || dc === undefined ? left : `${left} vs ${against} ${dc} · ${DEGREES[deg]}`;
}

function card({ title, subtitle="", body="", deg=null, buttons="", tone="" }) {
  const cls = deg === null ? tone : DEGREE_CLASS[deg];
  return `<div class="poss-card ${cls}"><header><h3>${esc(title)}</h3>${subtitle ? `<span class="sub">${esc(subtitle)}</span>` : ""}</header>`
    + `${body}${buttons ? `<div class="poss-card-buttons">${buttons}</div>` : ""}</div>`;
}

const button = (action, label, data={}) => `<button type="button" data-poss-action="${action}" ${Object.entries(data)
  .map(([k, v]) => `data-${k}="${esc(v)}"`).join(" ")}>${esc(label)}</button>`;

async function post(actor, content, rolls=[], flags={}) {
  return ChatMessage.create({
    speaker: ChatMessage.getSpeaker({ actor }), content, rolls, flags: { [SYSTEM_ID]: flags }
  });
}

/**
 * Ask for the player's own roll when the "Enter my own rolls" world setting is on. Returns a number, or null to let
 * Foundry roll ("Roll for me", or the setting is off).
 */
async function askOwnRoll(label, formula) {
  if ( !setting("manualRolls", false) ) return null;
  const DialogV2 = foundry.applications.api.DialogV2;
  const v = await DialogV2.wait({
    window: { title: label, icon: "fa-solid fa-dice-d20" },
    content: `<div class="poss-dialog"><label>${esc(game.i18n.format("POSS.OwnRoll.Prompt", { formula }))}
      <input type="number" name="value" autofocus inputmode="numeric"></label></div>`,
    rejectClose: false,
    buttons: [
      { action: "mine", label: game.i18n.localize("POSS.OwnRoll.Use"), default: true,
        callback: (e, b) => { const n = b.form.elements.value.valueAsNumber; return Number.isFinite(n) ? n : null; } },
      { action: "auto", label: game.i18n.localize("POSS.OwnRoll.Auto"), callback: () => null }
    ]
  });
  return typeof v === "number" ? v : null;
}

/** Roll a formula, or take the player's own total for it. */
export async function rollFormula(formula, label="Roll") {
  const own = await askOwnRoll(label, formula);
  return new Roll(own === null ? formula : String(own)).evaluate();
}

/**
 * A check: d20 + mod (+ any Aid bonus waiting on the actor) against an optional DC.
 * @returns {Promise<{roll, natural, mod, total, dc, degree}>}
 */
export async function rollCheck(actor, { label="Check", mod=0, dc=null, track="", subtitle="", against="DC", chat=true, extra="" }={}) {
  const aid = actor?.system?.turn?.aid ?? 0;
  const total = mod + aid;
  const own = await askOwnRoll(label, "d20");
  const nat = own === null ? null : Math.max(1, Math.min(20, Math.round(own)));
  const roll = await new Roll(nat === null ? `1d20 ${signed(total)}` : `${nat} ${signed(total)}`).evaluate();
  const natural = nat ?? roll.dice[0]?.total ?? (roll.total - total);
  const deg = (dc === null || dc === undefined) ? null : R.degree(roll.total, dc, natural, DEFAULTS.critMargin);
  if ( aid && actor?.isOwner ) await actor.update({ "system.turn.aid": 0 });
  const result = { roll, natural, mod: total, total: roll.total, dc, degree: deg };
  if ( chat ) {
    const nat = natural === 20 ? " <b>Natural 20</b>" : natural === 1 ? " <b>Natural 1</b>" : "";
    const body = `<p class="readout">${esc(readout({ ...result, deg, against }))}${nat}</p>`
      + (aid ? `<p class="note">Includes Aid +${aid}.</p>` : "") + extra;
    result.message = await post(actor, card({ title: label, subtitle: subtitle || track, body, deg }), [roll]);
  }
  return result;
}

/** A skill check by skill id. */
export function rollSkill(actor, skillId, opts={}) {
  const sk = actor.system.derived.skills?.[skillId];
  if ( !sk ) return rollCheck(actor, { label: skillId, mod: actor.system.derived.check ?? 0, ...opts });
  return rollCheck(actor, { label: skillId, mod: sk.total, track: `${sk.track} · ${sk.ability}`, dc: opts.dc ?? targetDC(), ...opts });
}

/** A save by ability. */
export function rollSave(actor, ability, opts={}) {
  const mod = actor.system.derived.saves?.[ability] ?? actor.system.derived.check ?? 0;
  return rollCheck(actor, { label: `${ability} save`, mod, ...opts });
}

/** The DC of the first targeted NPC or Scene, else null. */
export function targetDC() {
  const t = firstTarget();
  return t?.system?.derived?.dc ?? null;
}

/** Spend actions from the 3-action turn. Soft: warns when there aren't enough, never blocks. */
export async function spendActions(actor, n, label="") {
  if ( !actor?.system?.turn || !n ) return true;
  const have = actor.system.turn.actions;
  if ( have < n ) ui.notifications?.warn(game.i18n.format("POSS.Warn.NoActions", { name: actor.name, label, n, have }));
  if ( actor.isOwner ) await actor.update({ "system.turn.actions": Math.max(0, have - n) });
  return have >= n;
}

/** Strike with a weapon (or unarmed / an NPC attack). */
export async function strike(actor, weapon=null, { target=null }={}) {
  const sys = actor.system;
  const d = sys.derived;
  const made = sys.turn?.attacks ?? 0;
  const map = R.multipleAttackPenalty(made, DEFAULTS.map);
  const foe = actorOf(target) ?? firstTarget();
  const ac = foe?.system?.derived?.ac ?? null;
  await spendActions(actor, DEFAULTS.costs.strike, "Strike");
  if ( actor.isOwner ) await actor.update({ "system.turn.attacks": made + 1 });
  const name = weapon?.name ?? game.i18n.localize("POSS.Unarmed");
  const subtitle = [map ? `MAP ${map}` : "", (actor.type === "hero" && d.weapons?.[weapon?.id]?.attackMod) ? "improvised −2" : "", foe ? `vs ${foe.name}` : ""].filter(Boolean).join(" · ");
  const wmod = (actor.type === "hero") ? (d.weapons?.[weapon?.id]?.attackMod ?? 0) : 0;
  const res = await rollCheck(actor, { label: `Strike: ${name}`, mod: d.attack + map + wmod, dc: ac, against: "AC", subtitle, chat: false });
  const formula = actor.type === "hero"
    ? (weapon ? (d.weapons?.[weapon.id]?.formula ?? d.damageFormula) : d.unarmedFormula)
    : (weapon?.system?.damage || d.damageFormula);
  const hit = (res.degree === null) || (res.degree >= 2);
  const rolls = [res.roll];
  let body = `<p class="readout">${esc(readout({ ...res, deg: res.degree, against: "AC" }))}</p>`;
  let buttons = "";
  if ( hit ) {
    const dmg = await rollFormula(formula, `${name}: damage`);
    rolls.push(dmg);
    const crit = res.degree === 3;
    const amount = crit ? R.critDamage(dmg.total) : dmg.total;
    body += `<p class="damage">Damage <b>${amount}</b> <span class="formula">(${esc(formula)} = ${dmg.total}${crit ? ` × ${DEFAULTS.critDamageMultiplier}, critical` : ""})</span></p>`;
    buttons = button("damage", game.i18n.localize("POSS.Chat.ApplyTarget"), { amount, mode: "target", target: foe?.uuid ?? "" })
      + button("damage", game.i18n.localize("POSS.Chat.ApplySelected"), { amount, mode: "selected" })
      + button("damage", game.i18n.localize("POSS.Chat.ApplyHalf"), { amount: Math.floor(amount / 2), mode: "selected" });
  } else if ( res.degree !== null ) body += `<p class="note">${game.i18n.localize("POSS.Chat.Miss")}</p>`;
  res.message = await post(actor, card({ title: `Strike: ${name}`, subtitle, body, deg: res.degree, buttons }), rolls);
  return res;
}

/** Apply damage (positive) or healing (negative) to an actor; heroes at 0 start Dying. */
export async function applyDamage(actor, amount) {
  if ( !actor?.isOwner || !actor.system?.hp ) return;
  if ( actor.type === "obstacle" ) return;
  const hp = actor.system.hp;
  const max = actor.system.hp.max ?? actor.system.derived?.hpMax ?? hp.value;
  const update = {};
  if ( amount >= 0 ) {
    const fromTemp = Math.min(hp.temp ?? 0, amount);
    update["system.hp.temp"] = (hp.temp ?? 0) - fromTemp;
    update["system.hp.value"] = Math.max(0, hp.value - (amount - fromTemp));
  } else {
    update["system.hp.value"] = Math.min(max, hp.value - amount);
  }
  const after = update["system.hp.value"];
  if ( actor.type === "hero" ) {
    const dying = actor.system.dying;
    if ( (after === 0) && (hp.value > 0 || amount > 0) && !dying.active && !dying.dead ) {
      const next = R.startDying(dying);
      Object.assign(update, prefix("system.dying", next));
      await post(actor, card({ title: game.i18n.format("POSS.Dying.Starts", { name: actor.name }), tone: "crit-fail",
        body: `<p>${game.i18n.format("POSS.Dying.Explain", { dc: DEFAULTS.recoveryDC, pips: DEFAULTS.dyingPips })}</p>` }));
    } else if ( (after > 0) && (dying.active || dying.stable || dying.dead) ) {
      Object.assign(update, prefix("system.dying", R.healed(dying)));
    }
  } else if ( (actor.type === "npc") && (after === 0) ) {
    await actor.toggleStatusEffect?.("dead", { active: true, overlay: true });
  }
  await actor.update(update);
}

const prefix = (p, obj) => Object.fromEntries(Object.entries(obj).map(([k, v]) => [`${p}.${k}`, v]));

/** The recovery check at the start of a Dying hero's turn. */
export async function recoveryCheck(actor) {
  const dying = actor.system.dying;
  if ( !dying.active || dying.dead ) return null;
  const dc = setting("recoveryDC", DEFAULTS.recoveryDC);
  const res = await rollCheck(actor, { label: game.i18n.localize("POSS.Dying.Recovery"), mod: actor.system.derived.saves.CON, dc, subtitle: "CON save", chat: false });
  const { state, outcome } = R.recover(dying, res.degree);
  const undertaking = setting("undertaking", false);
  const text = {
    stable: game.i18n.format("POSS.Dying.Stable", { name: actor.name }),
    worse: game.i18n.format("POSS.Dying.Worse", { name: actor.name, n: state.value, pips: DEFAULTS.dyingPips }),
    dead: game.i18n.format(undertaking ? "POSS.Dying.Dead" : "POSS.Dying.Defeated", { name: actor.name })
  }[outcome];
  await actor.update(prefix("system.dying", state));
  if ( outcome === "dead" ) await actor.toggleStatusEffect?.("dead", { active: true, overlay: true });
  await post(actor, card({ title: game.i18n.localize("POSS.Dying.Recovery"), subtitle: actor.name, deg: res.degree,
    body: `<p class="readout">${esc(readout({ ...res, deg: res.degree }))}</p><p>${esc(text)}</p>` }), [res.roll]);
  return outcome;
}

/** Stabilise an ally (1 action). */
export async function stabilise(actor, ally) {
  if ( !ally?.system?.dying?.active ) return ui.notifications?.info(game.i18n.format("POSS.Dying.NotDying", { name: ally?.name ?? "?" }));
  await spendActions(actor, DEFAULTS.costs.stabilise, "Stabilise");
  await ally.update(prefix("system.dying", R.stabilise(ally.system.dying)));
  return post(actor, card({ title: "Stabilise", subtitle: ally.name, tone: "success",
    body: `<p>${esc(game.i18n.format("POSS.Dying.Stabilised", { name: actor.name, ally: ally.name }))}</p>` }));
}

/** Short or long rest. */
export async function rest(actor, kind="long", dice=null) {
  const sys = actor.system;
  if ( actor.type !== "hero" ) return;
  const d = sys.derived;
  if ( kind === "long" ) {
    await actor.update({
      "system.hp.value": d.hpMax, "system.points.value": d.pointsMax, "system.hitDiceUsed": 0,
      ...prefix("system.dying", { value: 0, active: false, stable: false, wounded: 0, dead: false }),
      ...prefix("system.turn", { actions: DEFAULTS.actionsPerTurn, attacks: 0, guard: false, aid: 0 })
    });
    await actor.toggleStatusEffect?.("dead", { active: false });
    return post(actor, card({ title: game.i18n.localize("POSS.Rest.Long"), subtitle: actor.name, tone: "success",
      body: `<p>${esc(game.i18n.format("POSS.Rest.LongDone", { name: actor.name }))}</p>` }));
  }
  const n = Math.max(0, Math.min(dice ?? d.hitDiceLeft, d.hitDiceLeft));
  if ( !n ) return ui.notifications?.info(game.i18n.format("POSS.Rest.NoDice", { name: actor.name }));
  const roll = await rollFormula(`${n}${d.hitDie} ${signed(n * d.mods.CON)}`, game.i18n.localize("POSS.Rest.Short"));
  const heal = Math.max(0, roll.total);
  await actor.update({ "system.hitDiceUsed": sys.hitDiceUsed + n });
  await applyDamage(actor, -heal);
  return post(actor, card({ title: game.i18n.localize("POSS.Rest.Short"), subtitle: actor.name, tone: "success",
    body: `<p>${esc(game.i18n.format("POSS.Rest.ShortDone", { name: actor.name, n, heal }))}</p>` }), [roll]);
}

/** Read a world setting with a fallback. */
export function setting(key, fallback) {
  try {
    return game.settings.get(SYSTEM_ID, key) ?? fallback;
  } catch {
    return fallback;
  }
}

/** Chat card buttons. */
export function onRenderChatMessage(message, html) {
  html.querySelectorAll?.("[data-poss-action]").forEach(btn => btn.addEventListener("click", async ev => {
    ev.preventDefault();
    const { possAction, amount, mode, target, uuid } = btn.dataset;
    if ( possAction === "damage" ) {
      let list = recipients(mode);
      if ( (mode === "target") && !list.length && target ) list = [actorOf(await fromUuid(target))].filter(Boolean);
      if ( !list.length ) return ui.notifications.warn(game.i18n.localize("POSS.Warn.NoRecipients"));
      for ( const a of list ) await applyDamage(a, Number(amount));
    } else if ( possAction === "spell-attack" ) {
      const item = await fromUuid(uuid);
      const caster = item?.parent;
      if ( !caster ) return;
      const foe = firstTarget();
      await rollCheck(caster, { label: `${item.name}: spell attack`, mod: caster.system.derived.spellAttack ?? 0,
        dc: foe?.system?.derived?.ac ?? null, against: "AC", subtitle: foe ? `vs ${foe.name}` : "" });
    } else if ( possAction === "setback" ) {
      const a = actorOf(await fromUuid(uuid));
      const hero = target ? actorOf(await fromUuid(target)) : null;
      if ( a ) await game.possibilities.triggerSetback(a, hero, Number(btn.dataset.index ?? -1));
    }
  }));
}

export { card, button, post, prefix };
