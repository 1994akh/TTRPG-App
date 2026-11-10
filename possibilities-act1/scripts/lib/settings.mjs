/** World settings: the act's progress lives here so the Director, the Purse and the log agree. */
import { MODULE_ID } from "./util.mjs";

export const DEFAULTS = {
  pcName: "", pcActor: "", trioJoined: false, beats: {}, logged: {}, purse: { applied: {}, spent: 0, extra: 0, bound: false },
  welcomed: false, gloamCombat: "", lightCombat: "", sideWork: false
};

export function registerSettings({ onChange }) {
  const world = (key, type, extra={}) => game.settings.register(MODULE_ID, key, {
    scope: "world", config: false, type, default: DEFAULTS[key], onChange, ...extra
  });
  world("pcName", String, {
    name: "Player character's name", hint: "Shown wherever the story says {pc}. Set by Make your character.", config: true
  });
  world("pcActor", String);
  world("trioJoined", Boolean);
  world("beats", Object);
  world("logged", Object);
  world("purse", Object);
  world("welcomed", Boolean);
  world("gloamCombat", String);
  world("lightCombat", String);
  world("sideWork", Boolean, { name: "Show side work in the Director", hint: "The broker's board and the outer Undercourses rat cull (optional).", config: true });
}
