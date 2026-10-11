/**
 * The main Scene: one v14 Scene with three native Levels (Crypt & Cellar, Ground Floor & Grounds, Upper Floor).
 *
 * v14 schema used here (checked against the v14 type definitions):
 * - Scene.levels is an embedded collection; Scene.initialLevel is a Level id. Scene has no background of its own.
 * - Level: { name, elevation: { bottom, top }, background: { src }, visibility: { levels }, sort }.
 * - Walls, lights, notes, tiles and regions carry `levels` (a set of Level ids); tokens carry `level` (one id).
 * - Region behaviors: "changeLevel" (stairs) and "adjustDarknessLevel" (the crypt's darker ambience).
 */
import { id } from "./ids.mjs";
import { effect } from "./effects.mjs";
import { npcKeyForName, prototypeToken } from "./actors.mjs";
import { assetPath, DISPLAY, DISPOSITION, MODULE_PATH, readJSON, stats } from "./util.mjs";

const NOTE_ICON = { location: "icons/svg/book.svg", secret: "icons/svg/hazard.svg", clue: "icons/svg/eye.svg" };

/**
 * Ids every builder agrees on.
 */
export const IDS = {
  scene: id("scene:main"),
  level: key => id(`level:${key}`),
  journal: key => id(`journal:${key}`),
  page: (journal, key) => id(`page:${journal}:${key}`),
  actor: key => id(`actor:${key}`)
};

/**
 * Build the main scene.
 * @param {object} context
 * @param {Map<string, object>} context.actors
 * @param {object[]} context.npcs
 * @param {object} context.handouts   handouts.json
 * @param {string} context.folder     Scene folder id.
 * @returns {object}
 */
export function buildScene({ actors, npcs, handouts, folder }) {
  const manifest = readJSON("data/scene-manifest.json");
  const pref = manifest.preferred;
  const data = Object.fromEntries(pref.levels.map(l => [l.key, readJSON(l.data)]));
  const levelId = IDS.level;
  const levelByKey = Object.fromEntries(pref.levels.map(l => [l.key, l]));

  // Levels.
  const levels = pref.levels.map(l => ({
    _id: levelId(l.key),
    name: l.name,
    elevation: { bottom: l.elevation.bottom, top: l.elevation.top },
    background: { src: l.background, color: "#000000" },
    foreground: { src: null },
    // The upper floor's art is transparent over the open Great Hall and outside the house: show the ground level
    // beneath it.
    visibility: { levels: l.key === "upper" ? [levelId("ground")] : [] },
    sort: l.sort,
    flags: { ravenmoor: { key: l.key, darkness: l.darkness, backgroundStandalone: data[l.key].backgroundStandalone } }
  }));

  const walls = [];
  const lights = [];
  const notes = [];
  const tiles = [];
  const tokens = [];
  const regions = [];

  for ( const l of pref.levels ) {
    const d = data[l.key];
    const lid = levelId(l.key);
    const elevation = l.elevation.bottom;

    d.walls.forEach((w, i) => walls.push({
      _id: id(`wall:${l.key}:${i}`),
      c: w.c,
      levels: [lid],
      move: w.move,
      sight: w.sight,
      light: w.light,
      sound: w.sound,
      dir: 0,
      door: w.door ?? 0,
      ds: w.ds ?? 0,
      flags: { ravenmoor: { ...w.flags.ravenmoor, level: l.key } }
    }));

    d.lights.forEach((li, i) => lights.push({
      _id: id(`light:${l.key}:${i}`),
      x: li.x,
      y: li.y,
      elevation,
      levels: [lid],
      rotation: 0,
      walls: true,
      vision: false,
      hidden: !!li.hidden,
      config: {
        dim: li.config.dim,
        bright: li.config.bright,
        color: li.config.color,
        alpha: li.config.alpha,
        animation: { type: li.config.animation?.type ?? null, speed: li.config.animation?.speed ?? 5,
          intensity: li.config.animation?.intensity ?? 5, reverse: false }
      },
      flags: { ravenmoor: { ...li.flags.ravenmoor, level: l.key, magical: /^Hallows' brazier/.test(li.flags.ravenmoor.label ?? "") } }
    }));

    for ( const n of d.notes ) {
      const pageKey = n.locationKey ?? n.parentKey;
      notes.push({
        _id: id(`note:${l.key}:${n.number}`),
        entryId: IDS.journal("locations"),
        pageId: IDS.page("locations", pageKey),
        x: n.x,
        y: n.y,
        elevation,
        levels: [lid],
        texture: { src: n.secret ? NOTE_ICON.secret : NOTE_ICON.location, tint: n.secret ? "#ff6b6b" : "#ffffff" },
        iconSize: 48,
        text: n.locationKey ? "" : `${n.number}. ${n.label}`,
        fontSize: 32,
        textAnchor: 1,
        textColor: "#ffffff",
        global: false,
        flags: { ravenmoor: { number: n.number, label: n.label, level: l.key, secret: !!n.secret, locationKey: n.locationKey, parentKey: n.parentKey } }
      });
    }

    d.tiles.forEach((t, i) => tiles.push({
      _id: id(`tile:${l.key}:${i}`),
      texture: { src: t.texture },
      x: t.x,
      y: t.y,
      width: t.width,
      height: t.height,
      elevation,
      levels: [lid],
      sort: 100 + i,
      rotation: 0,
      alpha: 1,
      hidden: t.hidden !== false,
      locked: false,
      flags: { ravenmoor: { label: t.label, key: t.label.split("(")[0].trim(), level: l.key } }
    }));

    d.tokens.forEach((t, i) => tokens.push(placedToken({ t, i, level: l, actors, npcs })));
  }

  // Stairs: a stair drawn identically on two levels becomes one Region on both, so the Change Level behavior offers
  // the other level. Region ids are keyed by name so the macros can find them.
  const stairs = new Map();
  for ( const l of pref.levels ) {
    for ( const r of data[l.key].levelRegions ) {
      const k = `${r.name}|${r.rect.x},${r.rect.y},${r.rect.width},${r.rect.height}`;
      const entry = stairs.get(k) ?? { name: r.name, rect: r.rect, levels: new Set() };
      entry.levels.add(l.key).add(r.connectsTo);
      stairs.set(k, entry);
    }
  }
  for ( const s of stairs.values() ) {
    const slug = s.name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/-$/, "");
    const hidden = /^hidden stair/i.test(s.name);
    const levelKeys = pref.levels.map(l => l.key).filter(k => s.levels.has(k));
    regions.push({
      _id: id(`region:stair:${slug}`),
      name: `${s.name} (${levelKeys.map(k => levelByKey[k].name).join(" / ")})`,
      color: hidden ? "#8b1a1a" : "#3d7a5a",
      shapes: [{ type: "rectangle", x: s.rect.x, y: s.rect.y, width: s.rect.width, height: s.rect.height, rotation: 0 }],
      elevation: { bottom: null, top: null },
      levels: levelKeys.map(levelId),
      behaviors: [{
        _id: id(`behavior:stair:${slug}`),
        name: hidden ? "Hidden stair (enabled by Reveal Secret Door)" : s.name,
        type: "changeLevel",
        system: {},
        disabled: hidden,
        flags: { ravenmoor: { stair: slug, hiddenStair: hidden } }
      }],
      visibility: 0,
      hidden: false,
      locked: false,
      flags: { ravenmoor: { stair: slug, hiddenStair: hidden, levels: levelKeys } }
    });
  }

  // Per-level darkness: v14 Levels have no darkness of their own, so the Scene uses the ground/upper value and a
  // full-canvas Adjust Darkness region on the crypt level overrides it.
  const sceneDarkness = levelByKey.ground.darkness;
  for ( const l of pref.levels.filter(x => x.darkness !== sceneDarkness) ) {
    regions.push({
      _id: id(`region:darkness:${l.key}`),
      name: `${l.name} darkness (${l.darkness})`,
      color: "#1a1a2e",
      shapes: [{ type: "rectangle", x: 0, y: 0, width: manifest.canvas.width, height: manifest.canvas.height, rotation: 0 }],
      elevation: { bottom: null, top: null },
      levels: [levelId(l.key)],
      behaviors: [{
        _id: id(`behavior:darkness:${l.key}`),
        name: "Darker below",
        type: "adjustDarknessLevel",
        system: { mode: 0, modifier: l.darkness },
        disabled: false,
        flags: {}
      }],
      visibility: 0,
      hidden: false,
      locked: true,
      flags: { ravenmoor: { darkness: l.key } }
    });
  }

  // GM-only clue pins.
  for ( const card of handouts.cards ) {
    if ( !card.mapPos ) continue;
    const l = levelByKey[card.mapPos.level];
    notes.push({
      _id: id(`note:clue:${card.id}`),
      entryId: IDS.journal("handouts"),
      pageId: IDS.page("handouts", card.id),
      x: Math.round(card.mapPos.x * manifest.canvas.gridSize),
      y: Math.round(card.mapPos.y * manifest.canvas.gridSize),
      elevation: l.elevation.bottom,
      levels: [levelId(l.key)],
      texture: { src: NOTE_ICON.clue, tint: "#7be0a6" },
      iconSize: 36,
      text: `${card.id} ${card.title}`,
      fontSize: 24,
      textAnchor: 1,
      textColor: "#bff5d6",
      global: false,
      flags: { ravenmoor: { clue: card.id, level: l.key } }
    });
  }

  return {
    _id: IDS.scene,
    name: pref.scene.name,
    navName: pref.scene.navName,
    active: false,
    navigation: true,
    navOrder: 0,
    thumb: `${MODULE_PATH}/assets/maps/ravenmoor-thumb.webp`,
    width: manifest.canvas.width,
    height: manifest.canvas.height,
    padding: manifest.canvas.padding,
    shiftX: 0,
    shiftY: 0,
    initial: pref.scene.initialView,
    initialLevel: levelId(pref.scene.initialLevel),
    grid: {
      type: 1,
      size: manifest.canvas.gridSize,
      distance: manifest.canvas.gridDistance,
      units: manifest.canvas.gridUnits,
      style: "solidLines",
      thickness: 1,
      color: "#000000",
      alpha: 0.15
    },
    tokenVision: pref.scene.tokenVision,
    fog: { exploration: pref.scene.fog.exploration, overlay: null, colors: { explored: null, unexplored: null } },
    environment: {
      darknessLevel: sceneDarkness,
      darknessLock: false,
      globalLight: { enabled: false },
      cycle: true
    },
    levels,
    walls,
    lights,
    notes,
    tiles,
    tokens,
    regions,
    drawings: [],
    sounds: [],
    weather: "",
    folder,
    sort: 0,
    ownership: { default: 0 },
    flags: {
      ravenmoor: {
        ...pref.scene.flags.ravenmoor,
        levels: Object.fromEntries(pref.levels.map(l => [l.key, levelId(l.key)])),
        partyStart: Object.fromEntries(pref.levels.map(l => [l.key, data[l.key].partyStart ?? null]))
      }
    },
    _stats: stats()
  };
}

/**
 * A token placed on the map.
 * @returns {object}
 */
function placedToken({ t, i, level, actors, npcs }) {
  const key = npcKeyForName(npcs, t.actor);
  const actor = actors.get(key);
  const npc = npcs.find(n => n.key === key);
  const proto = prototypeToken(npc);
  const isBody = /\(body/i.test(t.actor);
  const token = {
    _id: id(`token:${level.key}:${i}`),
    name: isBody ? `${npc.name} (body)` : proto.name,
    actorId: actor._id,
    actorLink: isBody ? false : proto.actorLink,
    level: IDS.level(level.key),
    x: t.x,
    y: t.y,
    elevation: level.elevation.bottom,
    width: proto.width,
    height: proto.height,
    texture: proto.texture,
    hidden: !!t.hidden,
    disposition: proto.disposition,
    displayName: DISPLAY.HOVER,
    displayBars: DISPLAY.OWNER_HOVER,
    bar1: proto.bar1,
    bar2: proto.bar2,
    lockRotation: true,
    sight: proto.sight,
    ring: { enabled: false },
    flags: { ravenmoor: { actorKey: key, label: t.actor, level: level.key, body: isBody } }
  };
  if ( isBody ) {
    token.delta = {
      system: { attributes: { hp: { value: 0 } } },
      effects: [effect("token:silas:body:dead", { name: "Dead", statuses: ["dead"], transfer: false })]
    };
  }
  return token;
}

export const PARTY_DISPOSITION = DISPOSITION.FRIENDLY;
export { assetPath };
