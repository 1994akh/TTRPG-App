/** Folders and the Adventure that bundles every scene, actor, item, journal, table and macro. */
import { IDS } from "./keys.mjs";
import { assetOr, SCOPE, stats } from "./util.mjs";

export const FOLDER_NAME = "Ashford Roads: Act 1";

export function buildFolders() {
  const make = (type, name) => ({
    _id: IDS.folder(type), name, type, description: "", folder: null, sorting: "m", sort: 0,
    color: "#7a4a1c", flags: {}, _stats: stats(null)
  });
  const docs = ["Scene", "Actor", "Item", "JournalEntry", "RollTable", "Playlist"].map(t => make(t, FOLDER_NAME));
  docs.push(make("Macro", "Act 1"));
  const ids = Object.fromEntries(docs.map(d => [d.type, d._id]));
  return { docs, ids };
}

/** One empty playlist per location, for the user's own tracks. */
export function buildPlaylists(names, folder) {
  return names.map((name, i) => ({
    _id: IDS.folder(`playlist:${name}`), name, description: "Empty: add your own tracks for this place.", sounds: [],
    channel: "music", mode: 0, playing: false, fade: null, folder, sorting: "a", seed: null, sort: i * 1000,
    ownership: { default: 0 }, flags: { [SCOPE]: { location: name } }, _stats: stats(null)
  }));
}

export function buildAdventure({ scenes, actors, items, journals, tables, macros, folders, playlists=[] }) {
  const _id = IDS.adventure;
  return {
    _id, name: "Ashford Roads: Act 1",
    img: assetOr("assets/cover.webp", "icons/environment/settlement/ship-sail.webp"),
    caption: "Possibilities · Wayfinder · Act 1",
    description: "<p>Four would-be crew with a profession each and no class. No captain in Ashford signs on the unbound, so "
      + "they take the only job that pays enough to bind four: a merchant's daughter, lost in the sewers under Refinery Row.</p>"
      + "<p>Act 1 of the Wayfinder story for the Possibilities system: your own character plus Enkrid, Rook and Tova, from the "
      + "Coast Road to the day the Gilded Tern leaves without them. Seven maps, the Act 1 Director, the Purse, the Into the "
      + "light Scene with its sun clock, and <em>My Story</em>, a journal for writing it up as you play.</p>"
      + "<p><strong>Start with</strong> the <em>Act 1: Ashford Roads</em> journal, or the Act 1 Director (<kbd>Shift</kbd>+<kbd>A</kbd>).</p>",
    scenes, actors, items, journal: journals, tables, macros, folders, cards: [], playlists, combats: [],
    folder: null, sort: 0, flags: { [SCOPE]: { version: 1 } }, _stats: stats(), _key: `!adventures!${_id}`
  };
}
