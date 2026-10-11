/**
 * Active Effect source data in the v14 shape: changes live under system.changes and use change types ("add"),
 * duration is { value, units, expiry }.
 */
import { id } from "./ids.mjs";
import { stats } from "./util.mjs";

export const STATUS_IMG = {
  frightened: "systems/dnd5e/icons/svg/statuses/frightened.svg",
  dead: "systems/dnd5e/icons/svg/statuses/dead.svg"
};

/**
 * @param {string} key
 * @param {object} data
 * @param {string} data.name
 * @param {string} [data.img]
 * @param {string[]} [data.statuses]
 * @param {object[]} [data.changes]   [{ key, value, type }]
 * @param {object} [data.duration]    { value, units, expiry }
 * @param {boolean} [data.transfer]
 * @param {string} [data.description]
 * @param {object} [data.flags]
 * @returns {object}
 */
export function effect(key, {
  name, img, statuses=[], changes=[], duration={}, transfer=false, description="", flags={}
}) {
  return {
    _id: id(`effect:${key}`),
    name,
    img: img ?? STATUS_IMG[statuses[0]] ?? "icons/svg/aura.svg",
    type: "base",
    system: { changes: changes.map(c => ({ type: "add", phase: "initial", priority: null, ...c })) },
    disabled: false,
    transfer,
    statuses,
    duration: { value: null, units: "seconds", expiry: null, ...duration },
    description,
    origin: null,
    tint: "#ffffff",
    sort: 0,
    flags,
    _stats: stats()
  };
}

/** Frightened until the end of the target's next turn. */
export const UNTIL_END_OF_NEXT_TURN = { value: 1, units: "turns", expiry: "turnEnd" };

/** Lasts until the combat ends. */
export const UNTIL_COMBAT_ENDS = { value: null, units: "rounds", expiry: "combatEnd" };
