/** Actor, Item and Combat document classes. */
import { DEFAULTS } from "./config.mjs";
import { actorOf, button, card, esc, firstTarget, post, recoveryCheck, rollCheck, rollSave, rollSkill, spendActions, strike } from "./dice.mjs";
import { advanceClock } from "./scenes.mjs";

const RECALL_SKILLS = ["Arcana", "Nature", "History", "Religion", "Society"];

export class PossibilitiesActor extends Actor {
  async _preCreate(data, options, user) {
    const allowed = await super._preCreate(data, options, user);
    if ( allowed === false ) return false;
    const token = {
      hero: { actorLink: true, disposition: 1, bar1: { attribute: "hp" }, bar2: { attribute: "points" }, displayBars: 40, sight: { enabled: true } },
      npc: { actorLink: false, disposition: -1, bar1: { attribute: "hp" }, displayBars: 20 },
      obstacle: { actorLink: true, disposition: 0, bar1: { attribute: "resistance" }, displayBars: 50 }
    }[this.type];
    if ( token && !data.prototypeToken ) this.updateSource({ prototypeToken: token });
    if ( this.type === "hero" && !data.system?.hp ) this.updateSource({ "system.hp.value": this.system.derived?.hpMax ?? 6 });
    if ( this.type === "npc" && !data.system?.hp ) this.updateSource({ "system.hp.value": this.system.derived?.hpMax ?? 14 });
    return allowed;
  }

  rollSkill(id, opts) { return rollSkill(this, id, opts); }
  rollSave(ability, opts) { return rollSave(this, ability, opts); }
  strike(weapon, opts) { return strike(this, weapon, opts); }
  spendActions(n, label) { return spendActions(this, n, label); }

  /** A simple action with its cost and a card: Stride, Raise Guard, Interact, Withdraw. */
  async basicAction(kind, extra={}) {
    const cost = DEFAULTS.costs[kind] ?? 1;
    await spendActions(this, cost, kind);
    const update = {};
    const zone = extra.zone ? game.i18n.localize(`POSS.Zone.${extra.zone}`) : "";
    const text = game.i18n.format(`POSS.Action.${kind}Text`, { name: this.name, ...extra, zone });
    if ( kind === "guard" ) update["system.turn.guard"] = true;
    if ( (kind === "stride") && extra.zone ) update["system.zone"] = extra.zone;
    if ( Object.keys(update).length ) await this.update(update);
    return post(this, card({ title: game.i18n.localize(`POSS.Action.${kind}`), subtitle: `${cost} ${cost === 1 ? "action" : "actions"}`, body: `<p>${esc(text)}</p>` }));
  }

  /** Aid: +2 to one ally's next check. */
  async aid(ally) {
    if ( !ally?.system?.turn ) return ui.notifications.warn(game.i18n.localize("POSS.Warn.PickAlly"));
    await spendActions(this, DEFAULTS.costs.aid, "Aid");
    await ally.update({ "system.turn.aid": (ally.system.turn.aid ?? 0) + DEFAULTS.aidBonus });
    return post(this, card({ title: game.i18n.localize("POSS.Action.aid"), subtitle: ally.name, tone: "success",
      body: `<p>${esc(game.i18n.format("POSS.Action.aidText", { name: this.name, ally: ally.name, bonus: DEFAULTS.aidBonus }))}</p>` }));
  }

  /** Recall Knowledge: the hero's best lore skill vs the target's DC; success reveals its bestiary entry. */
  async recallKnowledge(target=firstTarget()) {
    await spendActions(this, DEFAULTS.costs.recall, "Recall Knowledge");
    const skills = this.system.derived.skills;
    const best = RECALL_SKILLS.map(id => skills[id]).filter(Boolean).sort((a, b) => b.total - a.total)[0];
    const foe = actorOf(target);
    const res = await rollCheck(this, { label: "Recall Knowledge", mod: best?.total ?? 0, dc: foe?.system?.derived?.dc ?? null,
      subtitle: `${best?.id ?? ""}${foe ? ` · ${foe.name}` : ""}` });
    if ( foe?.type === "npc" && res.degree >= 2 ) {
      if ( foe.isOwner ) await foe.update({ "system.bestiary.known": true });
      const lore = foe.system.bestiary.lore || foe.system.description;
      if ( lore ) {
        const html = await foundry.applications.ux.TextEditor.implementation.enrichHTML(lore, { relativeTo: foe });
        await post(this, card({ title: foe.name, subtitle: "Bestiary", body: html, tone: "success" }));
      }
    }
    return res;
  }

  /** Withdraw from the fight (3 actions). */
  withdraw() {
    return this.basicAction("withdraw");
  }

  /** Spend points for a signature or spell, then post its card. */
  async useAbility(item) {
    const s = item.system;
    const cost = item.type === "spell" ? s.actionCost : s.actions;
    if ( this.system.points && (s.points > this.system.points.value) ) {
      ui.notifications.warn(game.i18n.format("POSS.Warn.NoPoints", { name: this.name, item: item.name, need: s.points, have: this.system.points.value }));
    }
    if ( cost ) await spendActions(this, cost, item.name);
    if ( this.system.points ) await this.update({ "system.points.value": Math.max(0, this.system.points.value - s.points) });
    const d = this.system.derived;
    const lines = [
      item.type === "spell" ? `${s.tradition} · tier ${s.tier} · ${s.actions} actions${s.range ? ` · ${s.range}` : ""}${s.save ? ` · ${s.save} save` : ""}`
        : `${s.line} · tier ${s.tier} · ${s.cost}`,
      `${s.points} points`
    ];
    let buttons = "";
    if ( (item.type === "spell") && (d.spellAttack !== null) ) buttons += button("spell-attack", `Spell attack +${d.spellAttack}`, { uuid: item.uuid });
    const body = `<p class="sub">${esc(lines.join(" · "))}</p><p>${esc(s.effect)}</p>`
      + (d.spellDC !== null && item.type === "spell" ? `<p class="note">Spell DC ${d.spellDC}</p>` : "");
    return post(this, card({ title: item.name, subtitle: this.name, body, buttons }), [], { item: item.uuid });
  }
}

export class PossibilitiesItem extends Item {}

export class PossibilitiesCombat extends Combat {
  /** Refill the 3 actions, clear the attack count and Raise Guard, and roll Dying recovery checks. */
  async _onStartTurn(combatant, context) {
    await super._onStartTurn(combatant, context);
    const actor = combatant.actor;
    if ( !actor?.system?.turn ) return;
    await actor.update({ "system.turn.actions": DEFAULTS.actionsPerTurn, "system.turn.attacks": 0, "system.turn.guard": false });
    if ( (actor.type === "hero") && actor.system.dying.active && !actor.system.dying.dead ) await recoveryCheck(actor);
  }

  /** Each new round ticks the clock of every Scene in the tracker. */
  async _onStartRound(context) {
    await super._onStartRound(context);
    if ( (context?.round ?? this.round) <= 1 ) return;
    for ( const c of this.combatants ) {
      if ( (c.actor?.type === "obstacle") && c.actor.system.clock.max ) await advanceClock(c.actor);
    }
  }
}
