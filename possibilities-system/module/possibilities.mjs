/**
 * Possibilities for Foundry VTT v14: the entry point. Registers the data models, documents, sheets and settings, and
 * exposes the runtime API on game.possibilities (see docs/SPEC.md).
 */
import { DEFAULTS, SYSTEM_ID } from "./config.mjs";
import { RULES } from "./rules-data.mjs";
import * as rules from "./rules.mjs";
import HeroData from "./data/hero.mjs";
import NpcData from "./data/npc.mjs";
import ObstacleData from "./data/obstacle.mjs";
import * as itemModels from "./data/items.mjs";
import { PossibilitiesActor, PossibilitiesCombat, PossibilitiesItem } from "./documents.mjs";
import { HeroSheet, NpcSheet, ObstacleSheet, PossibilitiesItemSheet } from "./sheets.mjs";
import * as dice from "./dice.mjs";
import * as scenes from "./scenes.mjs";
import * as dialogs from "./dialogs.mjs";

const SETTINGS = {
  pointsFormula: { type: String, default: DEFAULTS.pointsFormula },
  recoveryDC: { type: Number, default: DEFAULTS.recoveryDC },
  undertaking: { type: Boolean, default: false },
  guardBonus: { type: Number, default: DEFAULTS.guardBonus },
  creatorExtraSkills: { type: Number, default: 2 },
  sceneAttemptCost: { type: Number, default: 1 }
};

Hooks.once("init", () => {
  console.log("Possibilities | Initialising the Possibilities system");
  CONFIG.Actor.documentClass = PossibilitiesActor;
  CONFIG.Item.documentClass = PossibilitiesItem;
  CONFIG.Combat.documentClass = PossibilitiesCombat;
  Object.assign(CONFIG.Actor.dataModels, { hero: HeroData, npc: NpcData, obstacle: ObstacleData });
  Object.assign(CONFIG.Item.dataModels, {
    weapon: itemModels.WeaponData, armour: itemModels.ArmourData, gear: itemModels.GearData,
    signature: itemModels.SignatureData, spell: itemModels.SpellData, feature: itemModels.FeatureData,
    race: itemModels.RaceData, class: itemModels.ClassData, profession: itemModels.ProfessionData
  });
  CONFIG.Actor.trackableAttributes = {
    hero: { bar: ["hp", "points"], value: ["turn.actions"] },
    npc: { bar: ["hp"], value: ["turn.actions"] },
    obstacle: { bar: ["resistance", "clock"], value: [] }
  };
  CONFIG.Combat.initiative = { formula: "1d20 + @derived.initiative", decimals: 0 };
  CONFIG.POSSIBILITIES = { rules: RULES, defaults: DEFAULTS };

  const DSC = foundry.applications.apps.DocumentSheetConfig;
  DSC.registerSheet(Actor, SYSTEM_ID, HeroSheet, { types: ["hero"], makeDefault: true, label: "POSS.Sheet.Hero" });
  DSC.registerSheet(Actor, SYSTEM_ID, NpcSheet, { types: ["npc"], makeDefault: true, label: "POSS.Sheet.Npc" });
  DSC.registerSheet(Actor, SYSTEM_ID, ObstacleSheet, { types: ["obstacle"], makeDefault: true, label: "POSS.Sheet.Scene" });
  DSC.registerSheet(Item, SYSTEM_ID, PossibilitiesItemSheet, { makeDefault: true, label: "POSS.Sheet.Item" });

  for ( const [key, s] of Object.entries(SETTINGS) ) {
    game.settings.register(SYSTEM_ID, key, {
      name: `POSS.Setting.${key}.name`, hint: `POSS.Setting.${key}.hint`,
      scope: "world", config: true, type: s.type, default: s.default,
      onChange: () => game.actors?.forEach(a => { a.reset?.(); a.sheet?.rendered && a.sheet.render(); })
    });
  }

  Handlebars.registerHelper("possSigned", n => (n === null || n === undefined || n === "") ? "—" : (Number(n) >= 0 ? `+${n}` : `${n}`));
  Handlebars.registerHelper("possEq", (a, b) => a === b);
  Handlebars.registerHelper("possOr", (...args) => args.slice(0, -1).some(Boolean));
});

Hooks.once("ready", () => {
  game.possibilities = {
    rules: RULES,
    defaults: DEFAULTS,
    compute: hero => rules.compute(hero, RULES),
    math: rules,
    rollCheck: dice.rollCheck,
    rollSkill: dice.rollSkill,
    rollSave: dice.rollSave,
    strike: (actor, weapon, opts) => dice.strike(actor, weapon, opts),
    applyDamage: dice.applyDamage,
    spendActions: dice.spendActions,
    rest: (actor, kind="long", n=null) => dice.rest(actor, kind, n),
    recoveryCheck: dice.recoveryCheck,
    stabilise: dice.stabilise,
    attemptScene: scenes.attemptScene,
    advanceClock: scenes.advanceClock,
    triggerSetback: scenes.triggerSetback,
    resolveScene: scenes.resolveScene,
    aptness: scenes.aptness,
    partyHeroes: scenes.partyHeroes,
    createHero: dialogs.createHero,
    makeHero: dialogs.makeHero,
    bind: dialogs.bind,
    applyBinding: dialogs.applyBinding,
    postCard: (actor, { title, subtitle="", body="", tone="" }) => dice.post(actor, dice.card({ title, subtitle, body, tone }))
  };
  Hooks.callAll("possibilities.ready", game.possibilities);
});

Hooks.on("renderChatMessageHTML", (message, html) => dice.onRenderChatMessage(message, html));

/** A "New hero" button in the Actors sidebar opens the creator. */
Hooks.on("renderActorDirectory", (app, html) => {
  const root = html instanceof HTMLElement ? html : html?.[0];
  if ( !root || !game.user.can("ACTOR_CREATE") || root.querySelector(".poss-new-hero") ) return;
  const bar = root.querySelector(".header-actions") ?? root.querySelector(".directory-header");
  if ( !bar ) return;
  const btn = document.createElement("button");
  btn.type = "button";
  btn.className = "poss-new-hero";
  btn.innerHTML = `<i class="fa-solid fa-user-plus"></i> ${game.i18n.localize("POSS.Creator.Button")}`;
  btn.addEventListener("click", () => game.possibilities.createHero());
  bar.append(btn);
});
