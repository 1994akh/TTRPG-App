/**
 * Act 1 beats: Silas Retires (8:25), Lights Out (8:55), The Body (9:00), and the secret door.
 */
import { lightCandles } from "./candles.mjs";
import { postSaveRequest } from "./treats.mjs";
import { revealCard } from "./handouts.mjs";
import {
  CONTENT, esc, LEVEL_ELEVATION, levelId, lightsByGroup, mainScene, playCue, postCard, readAloudHTML, requireGM,
  setSetting, tileByLabel, tokensFor, wait, wallsByLabel, whisperGM
} from "./util.mjs";

const STUDY_DOOR = "East Corridor / Study";
const STUDY_CHAIR = { x: 3500, y: 900 };

/** Door state constants. */
const DOOR = { NONE: 0, DOOR: 1, SECRET: 2 };
const DS = { CLOSED: 0, OPEN: 1, LOCKED: 2 };

async function setWalls(label, data) {
  const scene = mainScene();
  const walls = wallsByLabel(label);
  if ( !walls.length ) return ui.notifications.warn(`Ravenmoor: no wall labelled "${label}".`);
  await scene.updateEmbeddedDocuments("Wall", walls.map(w => ({ _id: w.id, ...data })));
}

async function showTile(prefix, hidden=false) {
  const tile = tileByLabel(prefix);
  if ( tile ) await tile.update({ hidden });
}

/** Scene 3 (7:30 PM): introduce each suspect in one line, in costume, with their portraits (Handout 2's order). */
export async function introduceSuspects() {
  if ( !requireGM() ) return;
  const cards = CONTENT.suspects.map(s => `<figure class="ravenmoor-suspect">`
    + `<img src="${s.portrait}" alt="${esc(s.name)}"><figcaption><strong>${esc(s.name)}</strong>`
    + `<span>${esc(s.who)}</span><em>Costume: ${esc(s.costume)}</em></figcaption></figure>`).join("");
  await postCard("The Hallows' feast: the household", `<div class="ravenmoor-suspects">${cards}</div>`, { css: "ravenmoor-gallery" });
}

/** 8:25 PM: Silas locks himself in his study. */
export async function silasRetires() {
  if ( !requireGM() ) return;
  await setWalls(STUDY_DOOR, { ds: DS.LOCKED });
  const silas = tokensFor("silas", f => !f.body)[0];
  if ( silas ) await silas.update({
    level: levelId("upper"), elevation: LEVEL_ELEVATION.upper, ...STUDY_CHAIR
  }, { animate: false });
  await whisperGM("Silas retires (8:25 PM)", "<p>Silas is in his study chair and the study door is locked from inside. "
    + "Quill leaves at 8:30 \"to fetch medicines from my room\"; Morwenna, Pip and Bramwell drift away.</p>");
}

/**
 * Fade a set of lights out over about a second, then hide them and restore their radii.
 * @param {AmbientLightDocument[]} lights
 */
async function fadeOut(lights) {
  const scene = mainScene();
  const original = lights.map(l => ({ _id: l.id, dim: l.config.dim, bright: l.config.bright }));
  for ( const f of [0.66, 0.33] ) {
    await scene.updateEmbeddedDocuments("AmbientLight", original.map(o => ({
      _id: o._id, "config.dim": Math.round(o.dim * f * 10) / 10, "config.bright": Math.round(o.bright * f * 10) / 10
    })), { animate: false });
    await wait(300);
  }
  await scene.updateEmbeddedDocuments("AmbientLight", original.map(o => ({
    _id: o._id, hidden: true, "config.dim": o.dim, "config.bright": o.bright
  })));
}

/** 8:55 PM: the Lantern Widow appears on the gallery and every candle dies. */
export async function lightsOut() {
  if ( !requireGM() ) return;
  const scene = mainScene();
  if ( !scene ) return ui.notifications.error("Ravenmoor: import the Adventure first.");
  await postCard("The Lantern Widow (8:55 PM)", readAloudHTML(CONTENT.text.lightsOut), { css: "ravenmoor-ghost" });

  // The Widow's green lantern on the minstrels' gallery (grid 24, 11 on the upper level).
  const [flash] = await scene.createEmbeddedDocuments("AmbientLight", [{
    x: 2450, y: 1150, elevation: LEVEL_ELEVATION.upper, levels: [levelId("upper")],
    config: { dim: 25, bright: 8, color: "#38ff8c", alpha: 0.6, animation: { type: "ghost", speed: 3, intensity: 6 } },
    flags: { ravenmoor: { label: "Widow's lantern (temporary)" } }
  }]);
  await wait(4000);
  playCue("gust");
  await fadeOut(lightsByGroup("hall_candles"));
  await flash?.delete();
  await showTile("C4 foxfire smears");
  playCue("scream");
  await postSaveRequest({
    title: "In the dark, a scream", ability: "wis", dc: 13, fright: true,
    text: "<p>A scream rings out from the servants' stair. Everyone makes a Wisdom save against fright.</p>"
  });
}

/** 9:00 PM: the body is found. */
export async function theBody() {
  if ( !requireGM() ) return;
  const scene = mainScene();
  if ( !scene ) return ui.notifications.error("Ravenmoor: import the Adventure first.");

  // Silas's living token leaves the board; his body appears in the study chair.
  const alive = tokensFor("silas", f => !f.body);
  const body = tokensFor("silas", f => f.body);
  await scene.updateEmbeddedDocuments("Token", [
    ...alive.map(t => ({ _id: t.id, hidden: true })),
    ...body.map(t => ({ _id: t.id, hidden: false }))
  ]);
  await showTile("C2 wet footprints");
  await showTile("Scattered lilies");
  await setWalls(STUDY_DOOR, { ds: DS.OPEN });
  await postCard("The body (9:00 PM)", readAloudHTML(CONTENT.text.body), { css: "ravenmoor-ghost" });

  await revealCard("H2", { notify: false });
  await lightCandles();
  await setSetting("act", "act2");
  // Act 2 starts: the buckled boot print can be found.
  await showTile("C5 buckled boot print");
  await whisperGM("Act 2 begins", "<p>Twelve candles lit. Each scene snuffs one (15 minutes). Escalations at candles 4, 8 and 11.</p>");
}

/** C3 or stuck-ladder rung 3: the bookcase and the tomb door become doors, and the hidden stair works. */
export async function revealSecretDoor() {
  if ( !requireGM() ) return;
  const scene = mainScene();
  if ( !scene ) return;
  await setWalls("Bookcase (secret door)", { door: DOOR.DOOR, ds: DS.OPEN });
  await setWalls("Hidden door behind Elspeth's tomb", { door: DOOR.DOOR, ds: DS.CLOSED });
  const stair = scene.regions.get(CONTENT.ids.stairs["hidden-stair"]);
  if ( stair ) {
    await stair.updateEmbeddedDocuments("RegionBehavior", stair.behaviors.map(b => ({ _id: b.id, disabled: false })));
  }
  await whisperGM("The secret passage", "<p>The bookcase swings open on a cold draft. The hidden stair (study ↔ crypt) "
    + "now works, and the door behind Elspeth's tomb is an ordinary door.</p>");
}
