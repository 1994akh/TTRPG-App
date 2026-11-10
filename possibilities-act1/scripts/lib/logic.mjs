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

/** Which hero gets which loaner: a blade each; the pry bar to the Tinker (a tool they use at d6), the lamp to Rook. */
export function loanerPlan(heroes) {
  const plan = heroes.map(h => ({ hero: h.key, items: ["loaner_blade"] }));
  const tinker = heroes.find(h => h.profession === "Tinker") ?? heroes[0];
  const lamp = heroes.find(h => h.key === "protag2") ?? heroes.find(h => h !== tinker) ?? tinker;
  plan.find(p => p.hero === tinker?.key)?.items.push("pry_bar");
  plan.find(p => p.hero === lamp?.key)?.items.push("charge_lamp");
  return plan;
}

/** The race family's Coast Road intro. */
export function introFor(intros, family) {
  return intros[family] ?? intros.Founding;
}

/* -------------------------------------------- Oracle -------------------------------------------- */

/**
 * The solo oracle: d20 + the odds' modifier, read against the bands (at or under each band's number).
 * @param {number} d20
 * @param {"likely"|"even"|"unlikely"} odds
 * @param {{odds: object, bands: Array<[number, string]>}} cfg
 */
export function oracleAnswer(d20, odds, cfg) {
  const total = d20 + (cfg.odds[odds] ?? 0);
  return { total, answer: cfg.bands.find(([max]) => total <= max)?.[1] ?? cfg.bands.at(-1)[1] };
}

/* -------------------------------------------- Copy my story -------------------------------------------- */

/** Journal HTML → clean text for pasting into Word: paragraphs and headings kept, links reduced to their labels. */
export function htmlToText(html, pcName) {
  let t = String(html ?? "");
  t = t.replace(/@UUID\[[^\]]+\]\{([^}]*)\}/g, "$1").replace(/@Act1\[[^\]]+\]\{([^}]*)\}/g, "");
  t = t.replace(/<span class="pa1-badge[^>]*>[\s\S]*?<\/span>/g, "").replace(/<aside[\s\S]*?<\/aside>/g, "");
  t = t.replace(/<(br|hr)\s*\/?>/gi, "\n").replace(/<\/(p|h[1-6]|li|blockquote|section|div)>/gi, "\n").replace(/<li[^>]*>/gi, "• ");
  t = t.replace(/<[^>]+>/g, "");
  t = t.replace(/&nbsp;/g, " ").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, "\"").replace(/&#39;/g, "'").replace(/&amp;/g, "&");
  t = withPC(t, pcName);
  return t.split("\n").map(l => l.trim()).filter((l, i, a) => l || (a[i - 1] ?? "")).join("\n").trim();
}

/** All of My Story as text: each page's title, then what was written (prompts kept as lead-ins). */
export function storyText(pages, pcName) {
  return pages.filter(p => p.text?.content).map(p => {
    const body = htmlToText(p.text.content, pcName);
    return `${withPC(p.name, pcName).toUpperCase()}\n\n${body}`;
  }).join("\n\n\n");
}
