/**
 * Possibilities Scenes (actor type `obstacle`): attempts against Resistance, Setbacks and the clock.
 */
import { DEFAULTS } from "./config.mjs";
import { button, card, esc, post, readout, rollCheck, spendActions, applyDamage } from "./dice.mjs";
import * as R from "./rules.mjs";

/** The party a Scene sheet lists: heroes in the current combat if any, else every hero with a player owner, else all heroes. */
export function partyHeroes() {
  const inCombat = (game.combat?.combatants ?? []).map(c => c.actor).filter(a => a?.type === "hero");
  if ( inCombat.length ) return [...new Set(inCombat)];
  const heroes = game.actors.filter(a => a.type === "hero");
  const owned = heroes.filter(a => a.hasPlayerOwner);
  return owned.length ? owned : heroes;
}

/** The hero facts aptness reads. */
export function heroFacts(hero) {
  const s = hero.system;
  return {
    classNode: s.class.node, professionNode: s.profession.node,
    trainedSkills: Object.entries(s.training.skills).filter(([, r]) => r !== "Untrained").map(([id]) => id)
  };
}

/** Which check and which effort an approach uses for a hero. */
export function approachCheck(hero, approach) {
  const d = hero.system.derived;
  const skill = approach.skill || "craft";
  if ( skill === "combat" ) return { label: "Combat effort", mod: d.attack, track: "Combat", effort: d.damageFormula };
  if ( skill === "craft" ) {
    const craft = Object.values(d.skills).filter(s => s.track === "Craft").sort((a, b) => b.total - a.total)[0];
    return { label: `Craft effort (${craft?.id ?? "best"})`, mod: craft?.total ?? d.craftEL, track: "Craft", effort: d.craftEffortFormula };
  }
  const sk = d.skills[skill];
  if ( !sk ) return { label: skill, mod: d.craftEL, track: "Craft", effort: d.craftEffortFormula };
  return { label: skill, mod: sk.total, track: sk.track, effort: sk.track === "Combat" ? d.damageFormula : d.craftEffortFormula };
}

export function aptness(hero, approach) {
  return R.aptnessFor(heroFacts(hero), approach);
}

/** One hero tries one approach. */
export async function attemptScene(hero, obstacle, index) {
  const sys = obstacle.system;
  const approach = sys.approaches[index];
  if ( !approach ) throw new Error(`No approach ${index} on ${obstacle.name}`);
  if ( sys.status !== "active" ) return ui.notifications.info(game.i18n.format("POSS.Scene.Over", { name: obstacle.name }));
  const apt = aptness(hero, approach);
  const chk = approachCheck(hero, approach);
  await spendActions(hero, setting("sceneAttemptCost", 1), approach.label);
  const res = await rollCheck(hero, { label: approach.label, mod: chk.mod, dc: sys.derived.dc, chat: false });
  let effortTotal = 0;
  const rolls = [res.roll];
  if ( res.degree >= 2 ) {
    const eroll = await new Roll(chk.effort).evaluate();
    rolls.push(eroll);
    effortTotal = eroll.total;
  }
  const out = R.resolveAttempt({
    resistance: sys.resistance.value, degreeOfSuccess: res.degree, effortTotal, aptness: apt, setbackOnFail: approach.setbackOnFail
  });
  const aptLabel = game.i18n.localize(`POSS.Aptness.${apt}`);
  let body = `<p class="readout">${esc(readout({ ...res, deg: res.degree }))}</p>`
    + `<p>${esc(chk.label)} · <b>${esc(aptLabel)}</b></p>`;
  if ( res.degree >= 2 ) {
    body += `<p class="damage">Effort ${effortTotal} × ${DEFAULTS.aptness[apt]}${res.degree === 3 ? ` × ${DEFAULTS.critDamageMultiplier}` : ""} = <b>${out.effort}</b></p>`;
  }
  body += `<p class="resistance">Resistance <b>${out.before} → ${out.after}</b> / ${sys.resistance.max}</p>`;
  if ( approach.note ) body += `<p class="note">${esc(approach.note)}</p>`;
  const update = { "system.resistance.value": out.after };
  if ( out.won ) update["system.status"] = "won";
  await obstacle.update(update);
  await post(hero, card({ title: `${obstacle.name}: ${approach.label}`, subtitle: hero.name, body, deg: res.degree }), rolls);
  if ( out.setback && sys.setbacks.length ) await triggerSetback(obstacle, hero);
  if ( out.won ) await resolveScene(obstacle, true);
  return { ...res, ...out, aptness: apt };
}

/** A Setback hits a hero: damage, and/or one loaned item gets worse. `index` -1 = random. */
export async function triggerSetback(obstacle, hero=null, index=-1) {
  const list = obstacle.system.setbacks;
  if ( !list.length ) return null;
  const i = (index >= 0 && index < list.length) ? index : Math.floor(Math.random() * list.length);
  const sb = list[i];
  const rolls = [];
  let body = `<p>${esc(sb.text)}</p>`;
  let buttons = "";
  if ( sb.damage ) {
    const roll = await new Roll(sb.damage).evaluate();
    rolls.push(roll);
    body += `<p class="damage">Damage <b>${roll.total}</b> <span class="formula">(${esc(sb.damage)})</span></p>`;
    if ( hero ) await applyDamage(hero, roll.total);
    else buttons = button("damage", game.i18n.localize("POSS.Chat.ApplySelected"), { amount: roll.total, mode: "selected" });
  }
  if ( sb.gearDamage && hero ) {
    const gear = worsenGear(hero);
    const item = gear ? hero.items.get(gear.id) : null;
    if ( item ) {
      await item.update({ "system.condition": gear.next });
      body += `<p class="gear">${esc(game.i18n.format("POSS.Scene.GearDamaged", { item: item.name, condition: game.i18n.localize(`POSS.Condition.${gear.next}`) }))}</p>`;
    }
  }
  await post(hero ?? obstacle, card({ title: `Setback: ${sb.label}`, subtitle: hero ? hero.name : obstacle.name, tone: "crit-fail", body, buttons }), rolls);
  Hooks.callAll("possibilities.setback", obstacle, hero, sb);
  return sb;
}

/** The hero's loaned item to damage next: intact loaners first (weapons, then the rest), then damaged ones. */
export function worsenGear(hero) {
  const order = { weapon: 0, armour: 1, gear: 2 };
  const loaned = hero.items.filter(i => i.system?.loaned && (i.system.condition !== "broken"))
    .sort((a, b) => ((a.system.condition === "intact" ? 0 : 10) + (order[a.type] ?? 3)) - ((b.system.condition === "intact" ? 0 : 10) + (order[b.type] ?? 3)));
  const it = loaned[0];
  if ( !it ) return null;
  return { id: it.id, next: it.system.condition === "intact" ? "damaged" : "broken" };
}

/** Tick the clock once. When it runs out, the Scene is lost. */
export async function advanceClock(obstacle, by=1) {
  const c = obstacle.system.clock;
  if ( !c.max || (obstacle.system.status !== "active") ) return null;
  const value = Math.min(c.max, c.value + by);
  await obstacle.update({ "system.clock.value": value });
  await post(obstacle, card({ title: c.label || game.i18n.localize("POSS.Scene.Clock"), subtitle: obstacle.name, tone: "clock",
    body: `<p class="resistance">${value} / ${c.max}</p>` }));
  if ( value >= c.max ) {
    await obstacle.update({ "system.status": "lost" });
    await resolveScene(obstacle, false);
  }
  return value;
}

/** Post the outcome and fire possibilities.sceneResolved(obstacle, won). */
export async function resolveScene(obstacle, won) {
  const sys = obstacle.system;
  const text = won ? sys.outcome.win : (sys.outcome.lose || `<p>${esc(sys.clock.onEnd)}</p>`);
  const enriched = text ? await foundry.applications.ux.TextEditor.implementation.enrichHTML(text, { relativeTo: obstacle }) : "";
  await post(obstacle, card({ title: game.i18n.localize(won ? "POSS.Scene.Won" : "POSS.Scene.Lost"), subtitle: obstacle.name,
    tone: won ? "crit-success" : "crit-fail", body: enriched }));
  Hooks.callAll("possibilities.sceneResolved", obstacle, won);
}

function setting(key, fallback) {
  try {
    return game.settings.get("possibilities", key) ?? fallback;
  } catch ( err ) {
    return fallback;
  }
}
