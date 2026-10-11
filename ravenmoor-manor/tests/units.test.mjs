/**
 * Small pieces in isolation: escaping, grid distances, the clue tracker, the party, the candle panel.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { createWorld, game, loadModule } from "./harness.mjs";

const { party } = createWorld({ players: 3 });
await loadModule();
const { escapeHTML } = await import("../scripts/lib/html.mjs");
const { renderClueTracker } = await import("../scripts/lib/clue-tracker.mjs");
const util = await import("../scripts/lib/util.mjs");
const { clockTime, CandlePanel } = await import("../scripts/lib/candles.mjs");
const CONTENT = (await import("../scripts/lib/generated.mjs")).default;

test("escapeHTML escapes markup and quotes; the build uses the same function", async () => {
  assert.equal(escapeHTML(`<img src=x onerror="a('b')">&`), "&lt;img src=x onerror=&quot;a(&#39;b&#39;)&quot;&gt;&amp;");
  const build = await import("../build/util.mjs");
  assert.equal(build.esc, escapeHTML);
  assert.equal(util.esc, escapeHTML);
});

test("squaresTo counts grid squares with 5-ft diagonals", () => {
  const t = (x, y, w=1) => ({ x, y, width: w, height: w });
  assert.equal(util.squaresTo(t(4500, 1300), { x: 45, y: 13 }), 0);
  assert.equal(util.squaresTo(t(4400, 1400), { x: 45, y: 13 }), 1, "diagonal neighbour is adjacent");
  assert.equal(util.squaresTo(t(4300, 1100), { x: 45, y: 13 }), 2);
  assert.equal(util.squaresTo(t(4200, 1300), { x: 45, y: 13 }), 3);
  assert.equal(util.squaresTo(t(4300, 1200, 2), { x: 45, y: 13 }), 1, "a large token measures from its nearest square");
});

test("clockTime: 9:00 PM plus 15 minutes per candle, midnight at 12", () => {
  assert.equal(clockTime(0), "9:00 PM");
  assert.equal(clockTime(4), "10:00 PM");
  assert.equal(clockTime(11), "11:45 PM");
  assert.equal(clockTime(12), "Midnight");
});

test("clue tracker: counts, ticks and ready-to-accuse", () => {
  const html = renderClueTracker(CONTENT.conclusions, { C1: true, "T-crane": true, "T-quill-mint": true, H3: true });
  assert.match(html, /It was poison, not fright <span class="ravenmoor-count">1\/4<\/span>/);
  assert.match(html, /They are ready to accuse/);
  assert.equal((html.match(/☑/g) ?? []).length, 5, "T-crane counts in two conclusions");
});

test("party: assigned characters, plus owned characters of players without one", () => {
  assert.deepEqual(util.partyActors().map(a => a.name), party.map(p => p.name));
  const user = [...game.users.values()].find(u => !u.isGM);
  const spare = party[0];
  user.character = null;
  assert.ok(util.partyActors().includes(spare), "still counted through ownership");
  user.character = spare;
});

test("candle panel: candles go out left to right; GM markers on 4, 8, 11 and 12", async () => {
  await game.settings.set("ravenmoor-manor", "candlesLit", 12);
  const panel = new CandlePanel();
  await panel.render();
  let candles = [...panel.element.querySelectorAll(".ravenmoor-candle")];
  assert.equal(candles.length, 12);
  assert.ok(candles[0].hasAttribute("data-action"), "the first candle is the next to go out");
  assert.deepEqual(candles.filter(c => c.classList.contains("milestone")).map(c => c.querySelector(".num").textContent), ["4", "8", "11", "12"]);
  await game.settings.set("ravenmoor-manor", "candlesLit", 9);
  await panel.render();
  candles = [...panel.element.querySelectorAll(".ravenmoor-candle")];
  assert.deepEqual(candles.map(c => c.classList.contains("lit")), [false, false, false, true, true, true, true, true, true, true, true, true]);
  assert.ok(candles[3].hasAttribute("data-action"));
});
