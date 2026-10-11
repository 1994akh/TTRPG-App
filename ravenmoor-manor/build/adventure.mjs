/**
 * Folders and the Adventure document that bundles every scene, actor, item, journal and macro.
 */
import { id } from "./ids.mjs";
import { IDS } from "./scenes.mjs";
import { MODULE_PATH, stats } from "./util.mjs";

export const FOLDER_NAME = "Death at Ravenmoor Manor";

/**
 * World folders created by the Adventure import.
 * @returns {{docs: object[], ids: Record<string, string>}}
 */
export function buildFolders() {
  const make = (type, name, color) => ({
    _id: id(`folder:${type}`),
    name,
    type,
    description: "",
    folder: null,
    sorting: "m",
    sort: 0,
    color,
    flags: {},
    _stats: stats(null)
  });
  const docs = [
    make("Scene", FOLDER_NAME, "#2e5e47"),
    make("Actor", FOLDER_NAME, "#2e5e47"),
    make("Item", FOLDER_NAME, "#2e5e47"),
    make("JournalEntry", FOLDER_NAME, "#2e5e47"),
    make("Macro", "Ravenmoor", "#2e5e47")
  ];
  const ids = { scene: docs[0]._id, actor: docs[1]._id, item: docs[2]._id, journal: docs[3]._id, macro: docs[4]._id };
  return { docs, ids };
}

/**
 * @param {object} context
 * @returns {object}
 */
export function buildAdventure({ scenes, actors, items, journals, macros, folders }) {
  const _id = id("adventure:main");
  return {
    _id,
    name: "Death at Ravenmoor Manor",
    img: `${MODULE_PATH}/assets/cover.webp`,
    caption: "A Halloween murder mystery for 5–6 level 5 characters",
    description: "<p>On All Hallows' Eve, Lord Silas Ravenmoor dies in a locked study minutes after the whole household "
      + "sees the family ghost glide across the gallery. The party has until the midnight bell to prove the ghost was a man "
      + "in a mask, and to unmask him.</p>"
      + "<p>A three-hour gothic mystery for the 2024 rules: a manor on three floors with walls, doors, lights and stairs "
      + "between levels, six suspects, nineteen handouts and clue cards revealed one click at a time, the Twelve Candles "
      + "clock, and one climactic fight in the chapel crypt.</p>"
      + "<p><strong>Imports:</strong> the Ravenmoor Manor scene (three levels), 11 actors, 13 items, 5 journals and the "
      + "Ravenmoor macros. Start with the <em>Ravenmoor DM Guide</em> journal.</p>",
    scenes,
    actors,
    items,
    journal: journals,
    macros,
    folders,
    tables: [],
    cards: [],
    playlists: [],
    combats: [],
    folder: null,
    sort: 0,
    flags: {
      dnd5e: {
        importActions: ["activateScene", "displayJournal"],
        initialScene: IDS.scene,
        initialJournal: IDS.journal("adventure")
      },
      ravenmoor: { version: 1 }
    },
    _stats: stats(),
    _key: `!adventures!${_id}`
  };
}
