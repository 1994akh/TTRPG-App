/**
 * Act 1's actors for the `possibilities` system (field names from possibilities-system/docs/SPEC.md):
 * the trio (hero, Unclassed), the people of Ashford and the legends (npc, not meant to fight), the foes (npc) and the
 * Into the light Scene (obstacle).
 */
import { byId, resolve } from "./lore.mjs";
import { IDS } from "./keys.mjs";
import { assetOr, DISPLAY, DISPOSITION, esc, OWNERSHIP, readJSON, SCOPE, stats } from "./util.mjs";

const DATA = readJSON("data/act1/actors.json");
const CONFIG = readJSON("data/act1/config.json");
const ABILITIES = ["STR", "DEX", "CON", "INT", "WIS", "CHA"];
const ZONES = { engaged: "engaged", near: "near", far: "far", distant: "distant" };

const portrait = key => assetOr(`assets/portraits/${key}.webp`, "icons/svg/mystery-man.svg");
const tokenImg = key => assetOr(`assets/tokens/${key}.webp`, portrait(key));

export const turn = () => ({ actions: 3, attacks: 0, guard: false });

function prototypeToken(key, name, { friendly=false, linked=false }={}) {
  return {
    name, displayName: DISPLAY.HOVER, actorLink: linked, width: 1, height: 1,
    texture: { src: tokenImg(key), scaleX: 1, scaleY: 1 },
    disposition: friendly ? DISPOSITION.FRIENDLY : DISPOSITION.HOSTILE,
    displayBars: DISPLAY.OWNER_HOVER, bar1: { attribute: "hp" }, bar2: { attribute: null },
    lockRotation: true, sight: { enabled: friendly, range: friendly ? 30 : 0 },
    ring: { enabled: false }, flags: { [SCOPE]: { actorKey: key } }
  };
}

function base(key, name, type, system, { friendly=false, linked=false, items=[], flags={} }={}) {
  return {
    _id: IDS.actor(key), name, type, img: portrait(key), system, items, effects: [], folder: null, sort: 0,
    ownership: { default: OWNERSHIP.NONE },
    prototypeToken: prototypeToken(key, name, { friendly, linked }),
    flags: { [SCOPE]: { key, ...flags } }, _stats: stats()
  };
}

function bio(c) {
  const lines = [...(c.text ?? []), ...Object.entries(c.sections ?? {}).flatMap(([t, l]) => [`${t}: ${[].concat(l).join(" ")}`])];
  return lines.map(l => `<p>${esc(resolve(l))}</p>`).join("");
}

/** A trio hero, Unclassed, as at the start of Act 1. */
function heroFor(key) {
  const c = byId.characters[key];
  const b = DATA.trio[key];
  return base(key, c.name, "hero", {
    race: c.fields.race, raceGrade: "F",
    class: { node: "", rank: "Novice" },
    profession: { node: b.profession, rank: "Novice" },
    xp: { class: 0, profession: 0 },
    hp: { value: 6, temp: 0 }, points: { value: 0 },
    dying: { value: 0, active: false, stable: false, wounded: 0 },
    turn: turn(), zone: ZONES[b.zone] ?? "near",
    training: {
      armour: "Untrained", weapon: b.weapon, spell: "Untrained",
      saves: Object.fromEntries(ABILITIES.map(a => [a, "Untrained"])),
      skills: Object.fromEntries(b.skills.map(s => [s, "Trained"]))
    },
    castAbility: "None", baseSpeed: 30, gearBonus: 0,
    currency: { cp: 0, sp: 5, gp: 1, pp: 0 },
    details: { pronouns: c.fields.pronouns ?? "", age: c.fields.age ?? "", drive: [].concat(c.sections?.Motivation ?? []).join(" "),
      appearance: "", biography: bio(c), notes: "" },
    story: { role: "trio", path: { class: c.class_path ?? [], profession: c.profession_path ?? [] } }
  }, { friendly: true, linked: true, flags: { trio: true } });
}

function weaponItem(owner, a, i) {
  return {
    _id: IDS.embedded(owner, `attack${i}`), name: a.name, type: "weapon", img: "icons/creatures/abilities/mouth-teeth-sharp.webp",
    system: { die: a.die, range: a.range ?? "engaged", traits: a.traits ?? "", grade: "F", price: { value: 0, denom: "gp" },
      equipped: true, loaned: false, condition: "intact", description: "" },
    effects: [], folder: null, sort: (i + 1) * 100, ownership: { default: OWNERSHIP.NONE }, flags: {}, _stats: stats()
  };
}

function featureItem(owner, f, i) {
  return {
    _id: IDS.embedded(owner, `feature${i}`), name: f.name, type: "feature", img: "icons/svg/aura.svg",
    system: { text: `<p>${esc(resolve(f.text))}</p>`, uses: { value: 0, max: 0, per: "" } },
    effects: [], folder: null, sort: (i + 10) * 100, ownership: { default: OWNERSHIP.NONE }, flags: {}, _stats: stats()
  };
}

function npcFor(key, b, { foe=false }={}) {
  const c = byId.characters[key];
  const name = b.name ?? c?.name ?? key;
  const hpMax = b.overrides?.hpMax ?? null;
  return base(key, name, "npc", {
    el: b.el, grade: b.grade, role: b.role,
    hp: { value: hpMax ?? Math.round((10 + 4 * b.el) * ({ minion: 0.5, standard: 1, elite: 1.5, boss: 2.5 }[b.role] ?? 1)) },
    overrides: { ac: null, attack: null, hpMax: null, damage: null, dc: null, initiative: null, ...(b.overrides ?? {}) },
    zone: "near", turn: turn(),
    description: b.description ? `<p>${esc(resolve(b.description))}</p>` : (c ? bio(c) : ""),
    tactics: b.tactics ? `<p>${esc(resolve(b.tactics))}</p>` : "",
    bestiary: { known: false, lore: c ? bio(c) : "" }
  }, {
    friendly: !foe,
    items: [...(b.attacks ?? []).map((a, i) => weaponItem(key, a, i)), ...(b.features ?? []).map((f, i) => featureItem(key, f, i))],
    flags: { foe, people: !foe }
  });
}

function lightScene() {
  const L = DATA.light;
  const cfg = CONFIG.light;
  return base("into_the_light", L.name, "obstacle", {
    resistance: { value: cfg.resistance, max: cfg.resistance }, dc: cfg.dc, el: 0, grade: "F",
    approaches: L.approaches.map(a => ({ label: a.label, skill: a.skill, full: a.full ?? [], half: a.half ?? [], none: a.none ?? [],
      default: a.default, setbackOnFail: !!a.setbackOnFail, note: a.note ?? "" })),
    setbacks: L.setbacks.map(s => ({ label: s.label, text: s.text, damage: s.damage, gearDamage: !!s.gearDamage })),
    clock: { value: 0, max: cfg.clockRounds, label: "The sun crosses the floor", onEnd: resolve(L.lose) },
    description: `<p>${esc(resolve(L.description))}</p>`,
    outcome: { win: `<p>${esc(resolve(L.win))}</p>`, lose: `<p>${esc(resolve(L.lose))}</p>` }
  }, { friendly: false, flags: { scene: "ch1_into_the_light", sun: true } });
}

/** @returns {Map<string, object>} actor key -> actor document */
export function buildActors() {
  const out = new Map();
  for ( const key of Object.keys(DATA.trio) ) out.set(key, heroFor(key));
  for ( const [key, b] of Object.entries(DATA.people) ) out.set(key, npcFor(key, b));
  for ( const [key, b] of Object.entries(DATA.foes) ) out.set(key, npcFor(key, b, { foe: true }));
  out.set("into_the_light", lightScene());
  return out;
}
