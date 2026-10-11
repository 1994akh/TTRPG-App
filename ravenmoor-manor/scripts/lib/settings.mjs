/**
 * World settings. They sync to every client, so the candle panel and other displays follow them.
 */
import { MODULE_ID } from "./util.mjs";

/**
 * @param {object} handlers
 * @param {Function} handlers.onCandles   Called on every client when the candle state changes.
 * @param {Function} handlers.onClues     Called on every client when the clue state changes.
 */
export function registerSettings({ onCandles, onClues }) {
  const world = (key, type, initial, extra={}) => game.settings.register(MODULE_ID, key, {
    scope: "world", config: false, type, default: initial, ...extra
  });

  world("act", String, "act1");
  world("candlesLit", Number, 0, { onChange: v => onCandles?.(v) });
  world("candlesVisible", Boolean, false, { onChange: () => onCandles?.() });
  world("splitUp", Boolean, false, { onChange: () => onCandles?.() });
  world("sessionStart", Number, 0);
  world("gustPrompted", Boolean, false);
  world("edges", Object, { who: false, how: false, why: false });
  world("clues", Object, {}, { onChange: () => onClues?.() });
  world("readyNotified", Boolean, false);
  world("lairRound", Number, 0);
  world("widowRisen", Boolean, false);
  world("quillUnmasked", Boolean, false);
  world("willBurned", Boolean, false);
  world("willBurnable", Boolean, false);

  game.settings.register(MODULE_ID, "partySize", {
    name: "RAVENMOOR.Settings.PartySize.Name", hint: "RAVENMOOR.Settings.PartySize.Hint",
    scope: "world", config: true, type: Number, default: 6, choices: { 5: "5", 6: "6" }
  });
  game.settings.register(MODULE_ID, "runningLong", {
    name: "RAVENMOOR.Settings.RunningLong.Name", hint: "RAVENMOOR.Settings.RunningLong.Hint",
    scope: "world", config: true, type: Boolean, default: false
  });
  for ( const cue of ["Bell", "Gust", "Scream"] ) {
    game.settings.register(MODULE_ID, `sound${cue}`, {
      name: `RAVENMOOR.Settings.Sound${cue}.Name`, hint: "RAVENMOOR.Settings.Sound.Hint",
      scope: "world", config: true, type: String, default: "",
      filePicker: "audio"
    });
  }
}
