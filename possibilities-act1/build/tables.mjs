/** The broker's board: a RollTable of F-grade commissions (Draft). */
import { IDS } from "./keys.mjs";
import { esc, OWNERSHIP, readJSON, SCOPE, stats } from "./util.mjs";

export function buildTables(folder) {
  const board = readJSON("data/act1/handouts.json").board;
  const n = board.results.length;
  return [{
    _id: IDS.table("board"), name: board.name, img: "icons/sundries/documents/document-pin-brown.webp",
    description: `<p>${esc(board.note)}</p>`, formula: `1d${n}`, replacement: true, displayRoll: true,
    results: board.results.map((text, i) => ({
      _id: IDS.result("board", i), type: "text", name: text, img: "icons/sundries/documents/document-pin-brown.webp",
      description: `<p>${esc(text)}</p>`, weight: 1, range: [i + 1, i + 1], drawn: false, flags: {}, _stats: stats()
    })),
    folder, sort: 0, ownership: { default: OWNERSHIP.NONE }, flags: { [SCOPE]: { key: "board", draft: true } }, _stats: stats()
  }];
}
