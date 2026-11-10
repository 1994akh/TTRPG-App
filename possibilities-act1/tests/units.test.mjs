/** The pure parts: purse, sun path, oracle, Copy my story, the Director's body and the text enrichers. */
import { test } from "node:test";
import assert from "node:assert/strict";
import { setup } from "./harness.mjs";

await setup();
const L = await import("../scripts/lib/logic.mjs");
const { CONTENT } = await import("../scripts/lib/generated.mjs");
const { directorHTML, purseHTML } = await import("../scripts/lib/director.mjs");
const { ENRICHERS } = await import("../scripts/act1.mjs");

test("the purse lands on exactly four bindings, not a copper over", () => {
  const purse = CONTENT.config.purse;
  const all = { applied: Object.fromEntries(purse.entries.map(e => [e.key, true])) };
  const s = L.purseSummary(purse, all);
  assert.equal(s.total, purse.bindingFeeGp * purse.bindings);
  assert.ok(s.exact);
  assert.match(purseHTML(all), /Just enough to bind four\. Not a copper over\./);
  assert.ok(L.purseSummary(purse, { applied: { reward: true } }).short > 0, "the reward alone is not enough");
  assert.equal(L.payBindings(purse, { applied: { reward: true } }), null, "can't bind short without forcing");
  assert.equal(L.purseSummary(purse, L.payBindings(purse, all)).total, 0);
});

test("the sun walks the whole path over the clock", () => {
  const path = CONTENT.sunPath;
  const max = CONTENT.config.light.clockRounds;
  assert.equal(path.length, max, "one path point per clock tick (8 rounds, 8 points)");
  assert.deepEqual(L.sunPoint(path, 0, max), path[0]);
  assert.deepEqual(L.sunPoint(path, max, max), path.at(-1));
  const seen = new Set(Array.from({ length: max + 1 }, (_, v) => String(L.sunPoint(path, v, max))));
  assert.ok(seen.size >= path.length - 1);
});

test("the oracle reads d20 + odds", () => {
  const cfg = CONTENT.config.oracle;
  assert.equal(L.oracleAnswer(1, "even", cfg).answer, "No, and");
  assert.equal(L.oracleAnswer(20, "even", cfg).answer, "Yes, and");
  assert.equal(L.oracleAnswer(10, "likely", cfg).answer, "Yes");
  assert.equal(L.oracleAnswer(10, "unlikely", cfg).answer, "No");
  const answers = new Set(Array.from({ length: 20 }, (_, i) => L.oracleAnswer(i + 1, "even", cfg).answer));
  assert.equal(answers.size, 6);
});

test("Copy my story gives clean text", () => {
  const text = L.storyText([
    { name: "1. Make your character", text: { content: "<div class=\"pa1-page\"><p class=\"pa1-prompt\">Who is {pc}?</p><p>She came on foot &amp; alone.</p><aside class=\"pa1-draftnote\"><span class=\"pa1-badge\">Draft</span> x</aside><p>@UUID[Actor.x]{Tova} laughed.</p></div>" } }
  ], "Wren");
  assert.equal(text, "1. MAKE YOUR CHARACTER\n\nWho is Wren?\nShe came on foot & alone.\nTova laughed.");
});

test("the Director lists all 14 steps, with days, and hides side work by default", () => {
  const html = directorHTML({ beats: {}, purse: { applied: {} }, pcName: "", imported: true, light: null });
  assert.equal((html.match(/class="pa1-step /g) ?? []).length, 14);
  assert.match(html, /day 4/);
  assert.doesNotMatch(html, /ratCull/);
  assert.match(directorHTML({ beats: {}, purse: {}, pcName: "", imported: true, light: null, sideWork: true }), /ratCull/);
});

test("enrichers: {pc} and @Act1 buttons", () => {
  const [pcE, runE] = ENRICHERS;
  assert.ok(pcE.pattern.global && runE.pattern.global, "enricher patterns must be global");
  const m = [..."Read @Act1[readScene:ch1_broker]{Read it aloud} now".matchAll(runE.pattern)][0];
  assert.deepEqual([m[1], m[2], m[3]], ["readScene", "ch1_broker", "Read it aloud"]);
  assert.equal([..."And you, {pc}.".matchAll(pcE.pattern)].length, 1);
});
