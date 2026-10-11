/**
 * One script macro per runtime feature. Each is a one-line call into the module API so the logic lives in the module.
 */
import { id } from "./ids.mjs";
import { MODULE_ID, stats } from "./util.mjs";

/** name, api function, icon, suggested hotbar slot, and a line for the DM Guide. */
export const MACROS = [
  { fn: "toggleCandles", name: "Twelve Candles", img: "icons/sundries/lights/candle-lit-yellow.webp", slot: 1,
    help: "Show or hide the Twelve Candles panel for everyone. Click a lit candle to snuff it (GM only)." },
  { fn: "snuffCandle", name: "Snuff a Candle", img: "icons/sundries/lights/candle-unlit-tan.webp", slot: 2,
    help: "Snuff the next candle (15 in-game minutes). Candles 4, 8 and 11 whisper the escalations; 12 runs Midnight." },
  { fn: "revealHandout", name: "Reveal Handout", img: "icons/sundries/documents/document-symbol-eye.webp", slot: 3,
    help: "Pick a card: players get Observer on its page, it is shown to them, the Clue Tracker ticks, and C3 opens the secret door." },
  { fn: "clueTracker", name: "Clue Tracker", img: "icons/sundries/documents/document-torn-diagram-tan.webp", slot: 4,
    help: "Tick testimony and speak with dead; see the four conclusions. Whispers you when they are ready to accuse." },
  { fn: "lightsOut", name: "Lights Out", img: "icons/magic/light/light-candles-lit-white.webp", slot: 5,
    help: "8:55 PM. The Widow's green lantern flashes on the gallery, the Great Hall and gallery go dark, the foxfire appears, and a DC 13 Wisdom save is posted." },
  { fn: "theBody", name: "The Body", img: "systems/dnd5e/icons/svg/statuses/dead.svg", slot: 6,
    help: "9:00 PM. Silas's body, the footprints, lilies and boot print appear, the study door opens, Handout 2 is shown, the candles light, Act 2 starts." },
  { fn: "midnight", name: "Midnight", img: "icons/tools/instruments/bell-brass.webp", slot: 7,
    help: "The bell tolls: brazier fire, Fennick on the drive, and the Accusation dialog (who / how / why)." },
  { fn: "showdownSetup", name: "Showdown Setup", img: "icons/magic/control/fear-fright-jackolantern-yellow.webp", slot: 8,
    help: "Moves the party to the crypt, reveals the foes for your party size, applies the Unmasking Edges and creates the combat with the Midnight Bell lair turn." },
  { fn: "unmaskQuill", name: "Unmask Quill", img: "icons/equipment/head/mask-plague-leather-brown.webp", slot: 9,
    help: "Runs on its own at 30 HP (50 if running long). Swaps the token, collapses the minions, posts his line and offers to end the combat." },
  { fn: "epilogue", name: "Epilogue", img: "icons/sundries/lights/lantern-iron-lit-yellow.webp", slot: 10,
    help: "Posts the ending, turns the warding lanterns green, shows the Widow on the pond and leaves Elspeth's Lantern on her stone." },
  { fn: "treatBagSetup", name: "Treat Bag Setup", img: "icons/magic/control/fear-fright-jackolantern-yellow.webp",
    help: "Gives every player character 2 Treat Bag Candy." },
  { fn: "treatBagPanel", name: "Treat Bag", img: "icons/containers/bags/sack-simple-leather-tan.webp",
    help: "GM panel: each player's candy count, with +1 buttons for great roleplay, deductions and screams." },
  { fn: "frightSave", name: "Fright Save (Scaredy-Cat)", img: "systems/dnd5e/icons/svg/statuses/frightened.svg",
    help: "Posts a Wisdom save against fright with the Scaredy-Cat button (fail on purpose, earn a candy)." },
  { fn: "silasRetires", name: "Silas Retires", img: "icons/sundries/misc/key-short-red.webp",
    help: "8:25 PM. Moves Silas to his study chair and locks the study door." },
  { fn: "revealSecretDoor", name: "Reveal Secret Door", img: "icons/svg/eye.svg",
    help: "Bookcase and tomb doors become normal doors, the bookcase swings open, and the hidden stair starts working." },
  { fn: "accusation", name: "Accusation", img: "icons/skills/social/diplomacy-writing-letter.webp",
    help: "Open the who / how / why dialog on its own and store the Unmasking Edges." },
  { fn: "lairAction", name: "Midnight Bell (lair action)", img: "icons/tools/instruments/bell-brass.webp",
    help: "Run the next lair round by hand (the Midnight Bell combatant runs it automatically on count 20)." },
  { fn: "snatchWill", name: "Snatch the Will", img: "icons/sundries/scrolls/scroll-bound-sealed-black-red.webp",
    help: "Select the snatching character: contested Athletics or Sleight of Hand against Quill; the winner holds the will." },
  { fn: "toppleCandelabra", name: "Topple a Candelabra", img: "icons/sundries/lights/candle-pillar-lit-yellow.webp",
    help: "Knocks over a crypt candelabra: a 10-ft square of fire (2d6) and its light goes out." },
  { fn: "snuffingPowder", name: "Snuffing Powder", img: "icons/commodities/gems/powder-raw-white.webp",
    help: "Click a point: every nonmagical flame within 20 ft goes out, and Quill spends a use." },
  { fn: "openSettings", name: "Ravenmoor Settings", img: "icons/svg/d20-black.svg",
    help: "Party size, running long, session start time and sound cues." }
];

/**
 * @param {string} folder
 * @returns {object[]}
 */
export function buildMacros(folder) {
  return MACROS.map((m, i) => ({
    _id: id(`macro:${m.fn}`),
    name: m.name,
    type: "script",
    img: m.img,
    scope: "global",
    command: `game.modules.get("${MODULE_ID}").api.${m.fn}();`,
    folder,
    sort: (i + 1) * 1000,
    ownership: { default: 0 },
    flags: { ravenmoor: { fn: m.fn, slot: m.slot ?? null } },
    _stats: stats(null)
  }));
}
