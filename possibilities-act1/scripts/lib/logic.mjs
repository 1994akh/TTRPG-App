/**
 * Act 1's bookkeeping, pure (no Foundry globals), so the tests can run it directly: the steps, the purse, the sun's
 * path and the session log.
 */
import { escapeHTML } from "./html.mjs";

/** Replace {pc} with the player character's name (escaped for HTML when asked). */
export function withPC(text, name, { html=false }={}) {
  const n = name || "the newcomer";
  return String(text ?? "").replaceAll("{pc}", html ? escapeHTML(n) : n);
}

/** The first step not yet ticked, or null when the act is done. */
export function currentStep(steps, beats) {
  return steps.find(s => !beats?.[s.key]) ?? null;
}

/** Steps done, in order. */
export const doneSteps = (steps, beats) => steps.filter(s => beats?.[s.key]);

/* -------------------------------------------- Purse -------------------------------------------- */

/**
 * The party's binding fund in gp, from the config's entries that have been applied plus anything paid out.
 * @param {object} purse     config.purse
 * @param {object} state     {applied: {entryKey: true}, spent: number (gp), extra: number (gp)}
 */
export function purseTotal(purse, state) {
  const applied = state?.applied ?? {};
  const earned = purse.entries.filter(e => applied[e.key]).reduce((t, e) => t + e.gp, 0);
  return earned + (state?.extra ?? 0) - (state?.spent ?? 0);
}

/** Everything about the purse that the panel and the Binding need. */
export function purseSummary(purse, state) {
  const total = purseTotal(purse, state);
  const needed = purse.bindingFeeGp * purse.bindings;
  const bound = !!state?.bound;
  return {
    total, needed, fee: purse.bindingFeeGp, bindings: purse.bindings, bound,
    affordable: Math.max(0, Math.floor(total / purse.bindingFeeGp)),
    short: bound ? 0 : Math.max(0, needed - total),
    spare: bound ? total : total - needed,
    exact: !bound && (total === needed)
  };
}

/** Pay for the bindings: returns the new purse state, or null if the party can't afford them. */
export function payBindings(purse, state, { force=false }={}) {
  const s = purseSummary(purse, state);
  if ( s.bound ) return null;
  if ( (s.total < s.needed) && !force ) return null;
  return { ...state, spent: (state?.spent ?? 0) + s.needed, bound: true };
}

/* -------------------------------------------- The sun -------------------------------------------- */

/** Where the sunlight sits for a clock value: the clock's 0..max mapped onto the path's points. */
export function sunPoint(path, value, max) {
  if ( !path?.length ) return null;
  if ( max <= 0 ) return path[0];
  const t = Math.min(1, Math.max(0, value / max));
  return path[Math.round(t * (path.length - 1))];
}

/* -------------------------------------------- Session log -------------------------------------------- */

/**
 * The next Session log entry: the steps ticked since the last entry.
 * @returns {{html: string, keys: string[]}|null}  null when nothing new happened
 */
export function sessionEntry({ steps, beats, logged, date, pcName, storyPage }) {
  const fresh = steps.filter(s => beats?.[s.key] && !logged?.[s.key]);
  if ( !fresh.length ) return null;
  const when = escapeHTML(date);
  const items = fresh.map(s => `<li><strong>${s.n}. ${escapeHTML(s.title)}</strong>`
    + `${storyPage ? ` · ${storyPage(s)}` : ""}</li>`).join("");
  const next = currentStep(steps, beats);
  return {
    keys: fresh.map(s => s.key),
    html: `<section class="pa1-logentry"><h3>${when}</h3><p>${escapeHTML(withPC("{pc}", pcName))} played:</p><ol>${items}</ol>`
      + `<p class="pa1-muted">${next ? `Next: ${next.n}. ${escapeHTML(next.title)}` : "Act 1 is complete."}</p></section>`
  };
}

/* -------------------------------------------- The party -------------------------------------------- */

/** Which hero gets which loaner: a blade each; the lamp to the Tinker, the pry bar to the strongest. */
export function loanerPlan(heroes) {
  const plan = heroes.map(h => ({ hero: h.key, items: ["loaner_blade"] }));
  const tinker = heroes.find(h => h.profession === "Tinker") ?? heroes[0];
  const strong = heroes.find(h => h.key === "protag3") ?? heroes.at(-1);
  plan.find(p => p.hero === tinker?.key)?.items.push("charge_lamp");
  plan.find(p => p.hero === strong?.key)?.items.push("pry_bar");
  return plan;
}

/** The race family's Coast Road intro. */
export function introFor(intros, family) {
  return intros[family] ?? intros.Founding;
}
