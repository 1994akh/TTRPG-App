/**
 * Clue Tracker page renderer. Shared by the build (initial page) and the runtime (re-rendered whenever a clue is
 * ticked), so it must not depend on Foundry globals.
 */

const escape = text => String(text ?? "")
  .replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll("\"", "&quot;");

/**
 * @param {object} conclusions        handouts.json `conclusions`.
 * @param {Record<string, boolean>} found  Evidence ids the party has.
 * @param {Record<string, string>} [links]  Evidence id -> enricher link text (e.g. "@UUID[...]{C4}").
 * @returns {string}
 */
export function renderClueTracker(conclusions, found={}, links={}) {
  let html = "<div class=\"ravenmoor ravenmoor-tracker\">";
  html += "<p class=\"ravenmoor-muted\">Cards tick themselves when revealed with the Reveal Handout macro. Tick testimony "
    + "and <em>speak with dead</em> with the Clue Tracker macro.</p>";
  for ( const [key, c] of Object.entries(conclusions) ) {
    const total = c.evidence.length;
    const have = c.evidence.filter(e => found[e.id]).length;
    const ready = c.readyToAccuseAt && (have >= c.readyToAccuseAt);
    html += `<h2 data-conclusion="${escape(key)}">${escape(c.name)} <span class="ravenmoor-count">${have}/${total}</span></h2>`;
    if ( c.readyToAccuseAt ) {
      html += `<p class="ravenmoor-muted">${ready ? "<strong>They are ready to accuse.</strong>" : `Ready to accuse at ${c.readyToAccuseAt}.`}</p>`;
    }
    html += "<ul class=\"ravenmoor-checklist\">";
    for ( const e of c.evidence ) {
      const mark = found[e.id] ? "☑" : "☐";
      const label = links[e.id] ? `${links[e.id]} · ${escape(e.label)}` : escape(e.label);
      html += `<li class="${found[e.id] ? "found" : "missing"}" data-evidence="${escape(e.id)}">${mark} ${label}</li>`;
    }
    html += "</ul>";
  }
  return `${html}</div>`;
}
