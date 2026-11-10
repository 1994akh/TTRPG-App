/**
 * ApplicationV2 sheets: hero, NPC, Scene (obstacle) and items. Every control is a tap target; nothing depends on hover.
 */
import { ABILITIES, ARMOUR_TYPES, CONDITIONS, DEFAULTS, DENOMINATIONS, GRADES, RANKS, ROLES, TRAINING, ZONES } from "./config.mjs";
import { RULES } from "./rules-data.mjs";
import * as R from "./rules.mjs";
import { esc, firstTarget, rest, rollSave, rollSkill, stabilise, strike } from "./dice.mjs";
import { aptness, attemptScene, advanceClock, approachCheck, partyHeroes, triggerSetback } from "./scenes.mjs";
import { bind, pickAlly, pickHitDice } from "./dialogs.mjs";

const { HandlebarsApplicationMixin } = foundry.applications.api;
const { ActorSheetV2, ItemSheetV2 } = foundry.applications.sheets;
const T = "systems/possibilities/templates";
const enrich = (html, doc) => foundry.applications.ux.TextEditor.implementation.enrichHTML(html ?? "", { relativeTo: doc, secrets: doc.isOwner });
const choices = (list, label=x => x) => Object.fromEntries(list.map(x => [x, label(x)]));
const loc = key => game.i18n.localize(key);
const signed = n => (n === null || n === undefined) ? "—" : (n >= 0 ? `+${n}` : `${n}`);

function nodeOptions(list, selected, { blank=null }={}) {
  const groups = {};
  for ( const n of list ) (groups[n.grade] ??= []).push(n);
  let out = blank ? `<option value="" ${!selected ? "selected" : ""}>${esc(blank)}</option>` : "";
  for ( const g of GRADES ) {
    if ( !groups[g] ) continue;
    out += `<optgroup label="${g}-grade">${groups[g].sort((a, b) => a.name.localeCompare(b.name))
      .map(n => `<option value="${esc(n.id)}" ${n.id === selected ? "selected" : ""}>${esc(n.name)} · ${esc(n.line)}</option>`).join("")}</optgroup>`;
  }
  return out;
}

function raceOptions(selected) {
  const fams = [...new Set(RULES.races.map(r => r.family))];
  return fams.map(f => `<optgroup label="${esc(f)}">${RULES.races.filter(r => r.family === f).sort((a, b) => a.name.localeCompare(b.name))
    .map(r => `<option value="${esc(r.id)}" ${r.id === selected ? "selected" : ""}>${esc(r.name)}</option>`).join("")}</optgroup>`).join("");
}

/** Shared action handlers for actor sheets. `this` is the sheet. */
const ACTOR_ACTIONS = {
  rollSkill(event, target) { return rollSkill(this.document, target.dataset.skill); },
  rollSave(event, target) { return rollSave(this.document, target.dataset.ability, { dc: firstTarget()?.system?.derived?.dc ?? null }); },
  strike(event, target) { return strike(this.document, this.document.items.get(target.dataset.itemId) ?? null); },
  setActions(event, target) {
    const n = Number(target.dataset.n);
    const cur = this.document.system.turn.actions;
    return this.document.update({ "system.turn.actions": cur === n ? n - 1 : n });
  },
  resetTurn() { return this.document.update({ "system.turn.actions": DEFAULTS.actionsPerTurn, "system.turn.attacks": 0, "system.turn.guard": false }); },
  stride(event, target) { return this.document.basicAction("stride", { zone: target.dataset.zone }); },
  guard() { return this.document.basicAction("guard"); },
  interact() { return this.document.basicAction("interact"); },
  withdraw() { return this.document.withdraw(); },
  recall() { return this.document.recallKnowledge(); },
  async aid() {
    const ally = await pickAlly(this.document, { title: loc("POSS.Action.aid") });
    if ( ally ) return this.document.aid(ally);
  },
  async stabilise() {
    const ally = await pickAlly(this.document, { title: loc("POSS.Action.stabilise"), filter: a => a.system.dying.active });
    if ( ally ) return stabilise(this.document, ally);
  },
  useItem(event, target) { return this.document.useAbility(this.document.items.get(target.dataset.itemId)); },
  editItem(event, target) { return this.document.items.get(target.closest("[data-item-id]").dataset.itemId)?.sheet.render(true); },
  async deleteItem(event, target) {
    const item = this.document.items.get(target.closest("[data-item-id]").dataset.itemId);
    if ( !item ) return;
    const ok = await foundry.applications.api.DialogV2.confirm({ window: { title: item.name }, content: `<p>${esc(game.i18n.format("POSS.ConfirmDelete", { name: item.name }))}</p>`, rejectClose: false });
    if ( ok ) return item.delete();
  },
  toggleEquip(event, target) {
    const item = this.document.items.get(target.closest("[data-item-id]").dataset.itemId);
    return item?.update({ "system.equipped": !item.system.equipped });
  },
  cycleCondition(event, target) {
    const item = this.document.items.get(target.closest("[data-item-id]").dataset.itemId);
    if ( !item ) return;
    const next = CONDITIONS[(CONDITIONS.indexOf(item.system.condition) + 1) % CONDITIONS.length];
    return item.update({ "system.condition": next });
  },
  createItem(event, target) {
    const type = target.dataset.type;
    return this.document.createEmbeddedDocuments("Item", [{ name: game.i18n.format("POSS.NewItem", { type: loc(`TYPES.Item.${type}`) }), type }])
      .then(([i]) => i?.sheet.render(true));
  },
  async restShort() { const n = await pickHitDice(this.document); if ( n ) return rest(this.document, "short", n); },
  restLong() { return rest(this.document, "long"); },
  bind() { return bind(this.document); },
  setDying(event, target) {
    const n = Number(target.dataset.n);
    const d = this.document.system.dying;
    return this.document.update({ "system.dying.value": d.value === n ? n - 1 : n, "system.dying.active": true });
  },
  clearDying() { return this.document.update({ "system.dying.value": 0, "system.dying.active": false, "system.dying.stable": false, "system.dying.dead": false }); }
};

class PossibilitiesActorSheet extends HandlebarsApplicationMixin(ActorSheetV2) {
  static DEFAULT_OPTIONS = {
    classes: ["possibilities", "poss-sheet"],
    form: { submitOnChange: true },
    window: { resizable: true },
    actions: ACTOR_ACTIONS
  };

  async _prepareContext(options) {
    const ctx = await super._prepareContext(options);
    const doc = this.document;
    Object.assign(ctx, {
      actor: doc, system: doc.system, derived: doc.system.derived, owner: doc.isOwner, editable: this.isEditable,
      zones: choices(ZONES, z => loc(`POSS.Zone.${z}`)), grades: choices(GRADES), signed
    });
    if ( this.constructor.TABS?.primary ) ctx.tabs = this._prepareTabs("primary");
    return ctx;
  }

  /** Common item lists. */
  itemContext(doc) {
    const by = type => doc.items.filter(i => i.type === type).sort((a, b) => (a.sort - b.sort) || a.name.localeCompare(b.name));
    const badge = i => ({ id: i.id, name: i.name, img: i.img, system: i.system, condLabel: loc(`POSS.Condition.${i.system.condition ?? "intact"}`) });
    return {
      weapons: by("weapon").map(i => ({ ...badge(i), damage: doc.system.derived.weapons?.[i.id]?.formula ?? i.system.damage ?? doc.system.derived.damageFormula })),
      armour: by("armour").map(badge), gear: by("gear").map(badge),
      signatures: by("signature").map(badge), spells: by("spell").map(badge), features: by("feature").map(badge)
    };
  }
}

/* -------------------------------------------- Hero -------------------------------------------- */

export class HeroSheet extends PossibilitiesActorSheet {
  static DEFAULT_OPTIONS = { classes: ["hero"], position: { width: 780, height: 860 } };

  static PARTS = {
    header: { template: `${T}/actor/hero-header.hbs` },
    tabs: { template: `${T}/actor/tabs.hbs` },
    main: { template: `${T}/actor/hero-main.hbs`, scrollable: [""] },
    actions: { template: `${T}/actor/hero-actions.hbs`, scrollable: [""] },
    inventory: { template: `${T}/actor/hero-inventory.hbs`, scrollable: [""] },
    story: { template: `${T}/actor/hero-story.hbs`, scrollable: [""] }
  };

  static TABS = {
    primary: { tabs: [{ id: "main" }, { id: "actions" }, { id: "inventory" }, { id: "story" }], initial: "main", labelPrefix: "POSS.Tab" }
  };

  async _prepareContext(options) {
    const ctx = await super._prepareContext(options);
    const doc = this.document;
    const s = doc.system;
    const d = s.derived;
    const cls = RULES.classes.find(c => c.id === s.class.node);
    const pro = RULES.professions.find(p => p.id === s.profession.node);
    const race = RULES.races.find(r => r.id === s.race);
    const pct = (v, m) => (m ? Math.min(100, Math.round(100 * v / m)) : 0);
    const map = R.multipleAttackPenalty(s.turn.attacks, DEFAULTS.map);
    const path = (list, current) => {
      const at = list.indexOf(current);
      return list.map((id, i) => ({ id, state: i < at ? "done" : i === at ? "current" : "future" }));
    };
    Object.assign(ctx, this.itemContext(doc), {
      race, cls, pro, unclassed: s.unclassed,
      raceOptions: raceOptions(s.race),
      classOptions: nodeOptions(RULES.classes, s.class.node, { blank: loc("POSS.Unclassed") }),
      professionOptions: nodeOptions(RULES.professions, s.profession.node),
      ranks: choices(RANKS), training: choices(TRAINING), abilitiesList: choices([...ABILITIES, "None"]),
      tracks: {
        class: { el: d.combatEL, xp: s.xp.class, next: d.xpNext.class, pct: pct(s.xp.class, d.xpNext.class), grade: cls?.grade ?? "—", line: cls?.line ?? "", feature: cls ? `${cls.feature}: ${cls.feature_text}` : "" },
        profession: { el: d.craftEL, xp: s.xp.profession, next: d.xpNext.profession, pct: pct(s.xp.profession, d.xpNext.profession), grade: pro?.grade ?? "—", line: pro?.line ?? "", feature: pro ? `${pro.feature}: ${pro.feature_text}` : "" },
        race: { family: d.family, trait: race?.trait ?? "", gate: race?.grades?.[s.raceGrade]?.gate ?? "" }
      },
      divergenceWarn: d.divergence >= d.divergenceCap - 2,
      divergenceBlock: d.divergence >= d.divergenceCap,
      abilities: ABILITIES.map(a => ({ key: a, score: d.scores[a], mod: signed(d.mods[a]), save: signed(d.saves[a]), rank: s.training.saves[a] })),
      skillGroups: ["Combat", "Craft"].map(track => ({
        track, label: loc(`POSS.Track.${track}`),
        skills: Object.values(d.skills).filter(k => k.track === track).map(k => ({ ...k, totalLabel: signed(k.total) }))
      })),
      hpPct: pct(s.hp.value, d.hpMax), pointsPct: pct(s.points.value, d.pointsMax),
      pips: Array.from({ length: DEFAULTS.actionsPerTurn }, (_, i) => ({ n: i + 1, on: i < s.turn.actions })),
      dyingPips: Array.from({ length: DEFAULTS.dyingPips }, (_, i) => ({ n: i + 1, on: i < s.dying.value })),
      mapLabel: map ? `${map}` : "",
      nextAttack: signed(d.attack + map),
      strideZones: ZONES.filter(z => z !== s.zone).map(z => ({ z, label: loc(`POSS.Zone.${z}`) })),
      path: { class: path(s.story.path.class, s.class.node), profession: path(s.story.path.profession, s.profession.node) },
      currencyList: DENOMINATIONS.map(k => ({ k, v: s.currency[k] })),
      enriched: {
        appearance: await enrich(s.details.appearance, doc), biography: await enrich(s.details.biography, doc), notes: await enrich(s.details.notes, doc)
      },
      costs: DEFAULTS.costs
    });
    return ctx;
  }

  /** Dropping a race, class or profession reference item sets that track instead of adding an item. */
  async _onDropItem(event, item) {
    const map = { race: "system.race", class: "system.class.node", profession: "system.profession.node" };
    if ( map[item.type] ) {
      if ( !this.isEditable ) return null;
      await this.document.update({ [map[item.type]]: item.system.ruleId });
      return null;
    }
    return super._onDropItem(event, item);
  }
}

/* -------------------------------------------- NPC -------------------------------------------- */

export class NpcSheet extends PossibilitiesActorSheet {
  static DEFAULT_OPTIONS = { classes: ["npc"], position: { width: 620, height: 720 } };
  static PARTS = { body: { template: `${T}/actor/npc.hbs`, scrollable: [""] } };

  async _prepareContext(options) {
    const ctx = await super._prepareContext(options);
    const doc = this.document;
    const s = doc.system;
    Object.assign(ctx, this.itemContext(doc), {
      roles: choices(ROLES, r => loc(`POSS.Role.${r}`)),
      b: s.derived.benchmarks,
      pips: Array.from({ length: DEFAULTS.actionsPerTurn }, (_, i) => ({ n: i + 1, on: i < s.turn.actions })),
      nextAttack: signed(s.derived.attack + R.multipleAttackPenalty(s.turn.attacks, DEFAULTS.map)),
      hpPct: s.derived.hpMax ? Math.round(100 * s.hp.value / s.derived.hpMax) : 0,
      enriched: { description: await enrich(s.description, doc), tactics: await enrich(s.tactics, doc), lore: await enrich(s.bestiary.lore, doc) }
    });
    return ctx;
  }
}

/* -------------------------------------------- Scene (obstacle) -------------------------------------------- */

export class ObstacleSheet extends PossibilitiesActorSheet {
  static DEFAULT_OPTIONS = {
    classes: ["obstacle"], position: { width: 720, height: 780 },
    actions: {
      attempt(event, target) {
        const hero = game.actors.get(target.dataset.heroId);
        if ( !hero ) return;
        return attemptScene(hero, this.document, Number(target.dataset.index));
      },
      setback(event, target) {
        const heroId = this.element.querySelector("[data-setback-hero]")?.value;
        return triggerSetback(this.document, game.actors.get(heroId) ?? null, Number(target.dataset.index));
      },
      tick() { return advanceClock(this.document); },
      untick() { return this.document.update({ "system.clock.value": Math.max(0, this.document.system.clock.value - 1) }); },
      resetScene() {
        const s = this.document.system;
        return this.document.update({ "system.resistance.value": s.resistance.max, "system.clock.value": 0, "system.status": "active" });
      },
      addApproach() {
        const list = this.document.system.toObject?.().approaches ?? foundry.utils.deepClone(this.document._source.system.approaches);
        list.push({ label: loc("POSS.Scene.NewApproach"), skill: "craft", full: [], half: [], none: [], default: "full", setbackOnFail: true, note: "" });
        return this.document.update({ "system.approaches": list });
      },
      removeApproach(event, target) {
        const list = foundry.utils.deepClone(this.document._source.system.approaches);
        list.splice(Number(target.dataset.index), 1);
        return this.document.update({ "system.approaches": list });
      },
      addSetback() {
        const list = foundry.utils.deepClone(this.document._source.system.setbacks);
        list.push({ label: loc("POSS.Scene.NewSetback"), text: "", damage: "", gearDamage: false });
        return this.document.update({ "system.setbacks": list });
      },
      removeSetback(event, target) {
        const list = foundry.utils.deepClone(this.document._source.system.setbacks);
        list.splice(Number(target.dataset.index), 1);
        return this.document.update({ "system.setbacks": list });
      },
      toggleEdit() { this._editing = !this._editing; return this.render(); }
    }
  };
  static PARTS = { body: { template: `${T}/actor/obstacle.hbs`, scrollable: [""] } };

  async _prepareContext(options) {
    const ctx = await super._prepareContext(options);
    const doc = this.document;
    const s = doc.system;
    const heroes = partyHeroes();
    const skillChoices = { craft: loc("POSS.Scene.CraftEffort"), combat: loc("POSS.Scene.CombatEffort"), ...choices(RULES.skills.map(k => k.id)) };
    Object.assign(ctx, {
      editing: !!this._editing && this.isEditable,
      heroes: heroes.map(h => ({ id: h.id, name: h.name })),
      skillChoices,
      aptChoices: choices(["full", "half", "none"], a => loc(`POSS.Aptness.${a}`)),
      statuses: choices(["active", "won", "lost"], x => loc(`POSS.Scene.Status.${x}`)),
      approaches: s.approaches.map((a, index) => ({
        ...a, index, fullText: a.full.join(", "), halfText: a.half.join(", "), noneText: a.none.join(", "),
        skillLabel: skillChoices[a.skill] ?? a.skill,
        heroes: heroes.map(h => {
          const apt = aptness(h, a);
          const chk = approachCheck(h, a);
          return { id: h.id, name: h.name, apt, aptLabel: loc(`POSS.Aptness.${apt}`), mod: signed(chk.mod), actions: h.system.turn.actions };
        })
      })),
      setbacks: s.setbacks.map((x, index) => ({ ...x, index })),
      clockPips: Array.from({ length: s.clock.max }, (_, i) => ({ on: i < s.clock.value })),
      enriched: { description: await enrich(s.description, doc), win: await enrich(s.outcome.win, doc), lose: await enrich(s.outcome.lose, doc) }
    });
    return ctx;
  }

  /** Approach id lists are typed as comma-separated text. */
  _processFormData(event, form, formData) {
    const data = super._processFormData(event, form, formData);
    const list = data.system?.approaches;
    if ( list && typeof list === "object" ) {
      const arr = Array.isArray(list) ? list : Object.keys(list).sort((a, b) => a - b).map(k => list[k]);
      data.system.approaches = arr.map(a => ({
        ...a,
        full: typeof a.full === "string" ? splitIds(a.full) : a.full,
        half: typeof a.half === "string" ? splitIds(a.half) : a.half,
        none: typeof a.none === "string" ? splitIds(a.none) : a.none
      }));
    }
    const sb = data.system?.setbacks;
    if ( sb && typeof sb === "object" && !Array.isArray(sb) ) data.system.setbacks = Object.keys(sb).sort((a, b) => a - b).map(k => sb[k]);
    return data;
  }
}

const splitIds = s => s.split(",").map(x => x.trim()).filter(Boolean);

/* -------------------------------------------- Items -------------------------------------------- */

export class PossibilitiesItemSheet extends HandlebarsApplicationMixin(ItemSheetV2) {
  static DEFAULT_OPTIONS = {
    classes: ["possibilities", "poss-sheet", "item"],
    position: { width: 520, height: 560 },
    form: { submitOnChange: true },
    window: { resizable: true }
  };
  static PARTS = { body: { template: `${T}/item/item.hbs`, scrollable: [""] } };

  async _prepareContext(options) {
    const ctx = await super._prepareContext(options);
    const doc = this.document;
    const s = doc.system;
    const entry = s.entry ?? null;
    ctx.item = doc; ctx.system = s; ctx.editable = this.isEditable;
    ctx.type = doc.type;
    ctx.is = Object.fromEntries(["weapon", "armour", "gear", "signature", "spell", "feature", "race", "class", "profession"].map(t => [t, doc.type === t]));
    ctx.equipment = ["weapon", "armour", "gear"].includes(doc.type);
    ctx.reference = ["race", "class", "profession"].includes(doc.type);
    ctx.grades = choices(GRADES);
    ctx.conditions = choices(CONDITIONS, c => loc(`POSS.Condition.${c}`));
    ctx.denoms = choices(DENOMINATIONS);
    ctx.armourTypes = choices(ARMOUR_TYPES);
    ctx.dice = choices([...new Set(["d4", ...RULES.engine.weapon_dice.map(x => x.die)])]);
    ctx.ranges = choices(["engaged", "near", "far"], z => loc(`POSS.Zone.${z}`));
    ctx.per = { "": "—", scene: loc("POSS.Per.scene"), rest: loc("POSS.Per.rest"), day: loc("POSS.Per.day") };
    if ( ctx.reference && entry ) {
      const ab = entry.abilities ? Object.entries(entry.abilities).filter(([, v]) => v).map(([k, v]) => `${k} +${v}`).join(", ") : "";
      ctx.entry = {
        ...entry, abilitiesText: ab,
        raceRows: entry.grades ? Object.entries(entry.grades).map(([g, x]) => ({ g, rgm: x.rgm, abilities: Object.entries(x.abilities).map(([k, v]) => `${k} ${v}`).join(" · "), gate: x.gate })) : null
      };
    }
    ctx.enriched = { description: await enrich(s.description ?? "", doc), text: await enrich(s.text ?? "", doc) };
    return ctx;
  }
}
