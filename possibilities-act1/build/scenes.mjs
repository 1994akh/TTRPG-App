/**
 * One v14 Scene per Act 1 map, from data/scenes/<id>.json (written by tools/build_maps.py). A map whose data has not
 * been made yet gets a blank placeholder scene, so every link still resolves.
 *
 * v14 (as ravenmoor-manor/build/scenes.mjs, checked against the v14 types): the background lives on a Level; walls,
 * lights and notes carry `levels`, tokens carry `level`.
 */
import { byId, titleCase } from "./lore.mjs";
import { IDS, MAPS, pageUuid } from "./keys.mjs";
import { journalForPage } from "./journals.mjs";
import { assetPath, DISPLAY, exists, readJSON, SCOPE, stats } from "./util.mjs";
import { id } from "./ids.mjs";

const NOTE_ICON = "icons/svg/book.svg";

export function sceneData(key) {
  const rel = `data/scenes/${key}.json`;
  if ( exists(rel) ) return { ...readJSON(rel), placeholder: false };
  return { id: key, name: titleCase(byId.places[key]?.name ?? key), width: 1600, height: 1000, gridSize: 100, gridType: "square",
    background: null, darkness: 0, walls: [], lights: [], notes: [], tokens: [], placeholder: true };
}

function buildOne(key, { actors, folder }) {
  const d = sceneData(key);
  const lid = IDS.level(key);
  const bg = d.background && exists(d.background) ? assetPath(d.background) : null;
  const walls = d.walls.map((w, i) => ({
    _id: id(`wall:${key}:${i}`), c: w.c, levels: [lid],
    move: w.move ?? 20, sight: w.sight ?? 20, light: w.light ?? w.sight ?? 20, sound: w.sound ?? 20,
    dir: 0, door: w.door ?? 0, ds: 0, flags: {}
  }));
  const lights = d.lights.map((li, i) => ({
    _id: id(`light:${key}:${li.key ?? i}`), x: li.x, y: li.y, elevation: 0, levels: [lid], rotation: 0,
    walls: true, vision: false, hidden: !!li.hidden,
    config: { dim: li.dim, bright: li.bright, color: li.color ?? null, alpha: li.alpha ?? 0.5,
      animation: { type: li.animation?.type ?? null, speed: li.animation?.speed ?? 5, intensity: li.animation?.intensity ?? 5, reverse: false } },
    flags: { [SCOPE]: { key: li.key ?? null } }
  }));
  const notes = d.notes.map((n, i) => {
    const journal = journalForPage(n.page);
    if ( !journal ) throw new Error(`Map ${key}: note "${n.label}" points at unknown page "${n.page}"`);
    return {
      _id: id(`note:${key}:${i}`), entryId: IDS.journal(journal), pageId: IDS.page(journal, n.page),
      x: n.x, y: n.y, elevation: 0, levels: [lid],
      texture: { src: n.icon ?? NOTE_ICON, tint: "#f3c77a" }, iconSize: 48, text: n.label ?? "", fontSize: 28,
      textAnchor: 1, textColor: "#fbe7c2", global: false, flags: { [SCOPE]: { page: n.page, journal } }
    };
  });
  const tokens = d.tokens.map((t, i) => {
    const a = actors.get(t.actor);
    if ( !a ) return null;
    const proto = a.prototypeToken;
    return {
      _id: id(`token:${key}:${i}`), name: proto.name, actorId: a._id, actorLink: proto.actorLink, level: lid,
      x: t.x, y: t.y, elevation: 0, width: proto.width, height: proto.height, texture: proto.texture,
      hidden: !!t.hidden, disposition: proto.disposition, displayName: DISPLAY.HOVER, displayBars: proto.displayBars,
      bar1: proto.bar1, bar2: proto.bar2, lockRotation: true, sight: proto.sight, ring: { enabled: false },
      flags: { [SCOPE]: { actorKey: t.actor } }
    };
  }).filter(Boolean);
  return {
    _id: IDS.scene(key), name: d.name, navName: d.name, active: false, navigation: true, navOrder: MAPS.indexOf(key),
    thumb: exists(`assets/maps/${key}-thumb.webp`) ? assetPath(`assets/maps/${key}-thumb.webp`) : null,
    width: d.width, height: d.height, padding: 0.1, shiftX: 0, shiftY: 0, initial: null, initialLevel: lid,
    grid: { type: d.gridType === "none" ? 0 : 1, size: d.gridSize, distance: 5, units: "ft", style: "solidLines",
      thickness: 1, color: "#000000", alpha: 0.12 },
    tokenVision: false,
    fog: { exploration: false, overlay: null, colors: { explored: null, unexplored: null } },
    environment: { darknessLevel: d.darkness ?? 0, darknessLock: false, globalLight: { enabled: false }, cycle: true },
    levels: [{ _id: lid, name: d.name, elevation: { bottom: 0, top: 20 }, background: { src: bg, color: "#120d0a" },
      foreground: { src: null }, visibility: { levels: [] }, sort: 0, flags: {} }],
    walls, lights, notes, tiles: [], tokens, regions: [], drawings: [], sounds: [], weather: "",
    folder, sort: MAPS.indexOf(key), ownership: { default: 0 },
    flags: { [SCOPE]: { key, placeholder: d.placeholder, sunPath: d.sunPath ?? null,
      pages: d.notes.map(n => pageUuid(journalForPage(n.page), n.page)) } },
    _stats: stats()
  };
}

/** @returns {Map<string, object>} map id -> scene */
export function buildScenes(ctx) {
  return new Map(MAPS.map(k => [k, buildOne(k, ctx)]));
}
