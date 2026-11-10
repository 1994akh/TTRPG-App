/** One script macro per runtime feature, each a one-line call into the module API. */
import { IDS } from "./keys.mjs";
import { MODULE_ID, SCOPE, stats } from "./util.mjs";

export const MACROS = [
  { fn: "openDirector", name: "Act 1 Director", img: "icons/sundries/documents/document-sealed-signatures-red.webp", slot: 1,
    help: "The 14 steps of Act 1 in order, with read-aloud, pages, maps and ticks (also Shift+A)." },
  { fn: "makeCharacter", name: "Make your character", img: "icons/svg/mystery-man.svg", slot: 2,
    help: "The creator: race, profession, skills, looks, name. Picks your race family's Coast Road intro." },
  { fn: "openPurse", name: "Purse", img: "icons/commodities/currency/coins-assorted-mix-copper.webp", slot: 3,
    help: "The party's coin against four bindings, with the reward, the loaner bill and the danger fee." },
  { fn: "revealHandout", name: "Show a handout", img: "icons/sundries/documents/document-symbol-eye.webp", slot: 4,
    help: "Pick a handout: it is shown to the table and kept in the Handouts journal." },
  { fn: "gloamRebuff", name: "The Gloam throws them back", img: "icons/magic/unholy/silhouette-evil-horned-giant.webp", slot: 5,
    help: "Ends the first Gloam fight: everyone is pushed back to the doorway, nobody is lost." },
  { fn: "sunClock", name: "Advance the sun", img: "icons/magic/light/beam-rays-yellow.webp", slot: 6,
    help: "Ticks the Into the light Scene's clock and moves the shaft of sunlight one step across the Grate Chamber." },
  { fn: "bindAll", name: "Binding", img: "icons/magic/control/silhouette-hold-change-blue.webp", slot: 7,
    help: "Binds every hero: you pick your class; the trio take theirs from the story." },
  { fn: "sessionLog", name: "Write the session log", img: "icons/sundries/books/book-open-brown.webp", slot: 8,
    help: "Adds today's entry to My Story: the steps you played since the last entry." },
  { fn: "brokerBoard", name: "The broker's board", img: "icons/sundries/documents/document-pin-brown.webp", slot: 9,
    help: "Draws an F-grade commission for after the act." },
  { fn: "openStory", name: "My Story", img: "icons/sundries/books/book-red-exclamation.webp", slot: 10,
    help: "Opens your chronicle at the current beat." },
  { fn: "giveLoaners", name: "Hand out the loaners", img: "icons/weapons/swords/sword-guard-brown.webp",
    help: "One loaned blade each, plus the charge lamp and the pry bar." },
  { fn: "keepLoaners", name: "The loaners are ours", img: "icons/commodities/currency/coin-embossed-crown-gold.webp",
    help: "After the danger fee: every loaner becomes the party's own (damage and all)." },
  { fn: "addTrio", name: "Add the trio to the party", img: "icons/environment/people/group.webp",
    help: "Gives you ownership of Enkrid, Rook and Tova and puts their tokens on the current map." },
  { fn: "startGnaw", name: "Start the Old Gnaw fight", img: "icons/creatures/mammals/rodent-rat-diseaed-gray.webp",
    help: "Places Old Gnaw and three rats in the Undercourses and starts the combat." },
  { fn: "startGloam", name: "Start the Gloam fight", img: "icons/magic/unholy/silhouette-evil-horned-giant.webp",
    help: "The Grate Chamber: the Gloam uncoils. Ends itself after two rounds." },
  { fn: "startLight", name: "Start Into the light", img: "icons/magic/light/beam-rays-yellow.webp",
    help: "Opens the Into the light Scene, resets its Resistance and the sun clock." },
  { fn: "enkridCollapses", name: "Enkrid collapses", img: "icons/svg/unconscious.svg",
    help: "Enkrid drops after his binding; he is down until the inn." },
  { fn: "innRest", name: "Rest at the inn", img: "icons/environment/settlement/house-cottage.webp",
    help: "A long rest at the Lantern and Lee for every hero; Enkrid gets up." },
  { fn: "endAct", name: "End of Act 1", img: "icons/environment/settlement/ship-sail.webp",
    help: "The Gilded Tern leaves: the title card, and the session log." },
  { fn: "askBroker", name: "The broker's questions", img: "icons/skills/social/diplomacy-writing-letter.webp",
    help: "Pick a question; the broker's answer is read to chat." },
  { fn: "resetAct", name: "Reset Act 1", img: "icons/svg/clockwork.svg",
    help: "Back to the start for a replay. Asks first. Your My Story pages are kept." }
];

export function buildMacros(folder) {
  return MACROS.map((m, i) => ({
    _id: IDS.macro(m.fn), name: m.name, type: "script", img: m.img, scope: "global",
    command: `game.modules.get("${MODULE_ID}").api.${m.fn}();`,
    folder, sort: (i + 1) * 1000, ownership: { default: 0 },
    flags: { [SCOPE]: { fn: m.fn, slot: m.slot ?? null } }, _stats: stats(null)
  }));
}
