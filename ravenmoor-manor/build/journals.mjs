/**
 * The five journal entries that live inside the Adventure: Adventure, DM Guide, Locations, Handouts & Clues and
 * The Household. Links inside the Adventure use world UUIDs (Actor.<id>, JournalEntry.<id>.JournalEntryPage.<id>),
 * which resolve once the Adventure is imported because importing keeps every _id.
 */
import { marked } from "marked";
import { IDS } from "./scenes.mjs";
import { biographyHTML, portraitFor } from "./actors.mjs";
import { MACROS } from "./macros.mjs";
import { renderClueTracker } from "../scripts/lib/clue-tracker.mjs";
import { esc, MODULE_PATH, OWNERSHIP, readJSON, readText, stats } from "./util.mjs";

const SKILLS = {
  arc: "Arcana", ath: "Athletics", dec: "Deception", his: "History", ins: "Insight", inv: "Investigation",
  med: "Medicine", nat: "Nature", per: "Persuasion", prc: "Perception", slt: "Sleight of Hand", sur: "Survival"
};
const TOOLS = { alchemist: "Alchemist's Supplies" };
const LEVEL_ORDER = ["ground", "upper", "below"];

/** Adventure chapter banners (tools/build_banners.py), by chapter title. */
const BANNERS = [
  ["At a glance", "banner-arrival.webp"],
  ["The truth", "banner-widow.webp"],
  ["Act 1", "banner-masque.webp"],
  ["The suspects", "suspects.webp"],
  ["Act 2", "banner-candles.webp"],
  ["Act 3", "banner-crypt.webp"],
  ["Endings and epilogue", "banner-dawn.webp"]
];

/** Name forms to link to each actor, longest first. Quotes appear as &quot; in marked output. */
const NAME_FORMS = {
  quill: ["Dr. Thaddeus Quill", "Dr. Quill", "Quill"],
  morwenna: ["Lady Morwenna Ravenmoor", "Lady Morwenna", "Morwenna"],
  edric: ["Edric Ravenmoor", "Edric"],
  pip: ["Penelope &quot;Pip&quot; Ravenmoor", "Penelope \"Pip\" Ravenmoor", "Pip"],
  bramwell: ["Bramwell Hatch", "Bramwell"],
  crane: ["Mrs. Agatha Crane", "Mrs. Crane"],
  silas: ["Lord Silas Ravenmoor", "Lord Silas", "Silas"],
  fennick: ["Fennick Barrowdown", "Fennick"]
};

const pageUuid = (journal, key) => `JournalEntry.${IDS.journal(journal)}.JournalEntryPage.${IDS.page(journal, key)}`;
const cardLink = (card, label=card.id) => `@UUID[${pageUuid("handouts", card.id)}]{${label}}`;
const actorLink = (key, label) => `@UUID[Actor.${IDS.actor(key)}]{${label}}`;

/**
 * Describe a check for the DM.
 * @param {object} c
 * @returns {string}
 */
export function checkText(c) {
  if ( c.passive ) return `passive ${SKILLS[c.passive] ?? c.passive} ${c.dc}`;
  if ( c.tool ) return `${TOOLS[c.tool] ?? c.tool} DC ${c.dc}`;
  return `${SKILLS[c.skill] ?? c.skill} DC ${c.dc}${c.note ? ` (${c.note})` : ""}${c.bonus ? ` (${c.bonus})` : ""}`;
}

/**
 * A text page.
 * @param {string} journal
 * @param {string} key
 * @param {string} name
 * @param {string} content
 * @param {object} [options]
 * @returns {object}
 */
function textPage(journal, key, name, content, { sort=0, ownership={ default: -1 }, flags={}, showTitle=true }={}) {
  // The runtime posts a read-aloud box to chat when the GM double-clicks it; the tooltip says so.
  content = content.replaceAll("<blockquote class=\"ravenmoor-readaloud\">",
    "<blockquote class=\"ravenmoor-readaloud\" data-tooltip=\"Double-click to read this aloud in chat\">");
  return {
    _id: IDS.page(journal, key),
    name,
    type: "text",
    title: { show: showTitle, level: 1 },
    text: { format: 1, content },
    sort,
    ownership,
    flags: { ravenmoor: { key, ...flags } },
    _stats: stats()
  };
}

/**
 * An image page.
 * @returns {object}
 */
function imagePage(journal, key, name, src, caption, sort) {
  return {
    _id: IDS.page(journal, key),
    name,
    type: "image",
    title: { show: true, level: 1 },
    src,
    image: { caption },
    sort,
    ownership: { default: -1 },
    flags: { ravenmoor: { key } },
    _stats: stats()
  };
}

/**
 * A journal entry.
 * @returns {object}
 */
function entry(key, name, pages, folder, { ownership=OWNERSHIP.NONE, flags={} }={}) {
  return {
    _id: IDS.journal(key),
    name,
    pages,
    categories: [],
    folder,
    sort: 0,
    ownership: { default: ownership },
    flags: { ravenmoor: { key, ...flags } },
    _stats: stats()
  };
}

/**
 * Link suspects (first mention per page) and card ids in rendered HTML. Text inside tags, links and headings is
 * left alone.
 * @param {string} html
 * @param {Map<string, object>} cards
 * @returns {string}
 */
function linkify(html, cards) {
  const mentioned = new Set();
  const forms = Object.entries(NAME_FORMS).flatMap(([key, list]) => list.map(f => ({ key, f })))
    .sort((a, b) => b.f.length - a.f.length);
  const reName = forms.map(x => x.f.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("|");
  const re = new RegExp(`\\b(${reName})(?![\\w])|\\bHandout ([1-5])\\b|\\b(H[1-5]|C1[0-4]|C[1-9])\\b`, "g");
  const parts = html.split(/(<[^>]+>)/);
  let skip = 0;
  for ( let i = 0; i < parts.length; i++ ) {
    const p = parts[i];
    if ( p.startsWith("<") ) {
      if ( /^<(h[1-4]|a)\b/i.test(p) ) skip++;
      else if ( /^<\/(h[1-4]|a)>/i.test(p) ) skip = Math.max(0, skip - 1);
      continue;
    }
    if ( skip || !p ) continue;
    parts[i] = p.replace(re, (match, name, handoutNo, cardId) => {
      if ( name ) {
        const key = forms.find(x => x.f === name).key;
        if ( mentioned.has(key) ) return match;
        mentioned.add(key);
        return actorLink(key, name.replaceAll("&quot;", "\""));
      }
      const card = cards.get(handoutNo ? `H${handoutNo}` : cardId);
      return card ? cardLink(card, match) : match;
    });
  }
  return parts.join("");
}

/**
 * Markdown to journal HTML.
 * @param {string} md
 * @param {Map<string, object>} cards
 * @returns {string}
 */
function mdToHTML(md, cards) {
  let html = marked.parse(md, { gfm: true });
  html = html.replaceAll("<blockquote>", "<blockquote class=\"ravenmoor-readaloud\">")
    .replaceAll("<input disabled=\"\" type=\"checkbox\">", "☐")
    .replaceAll("<input checked=\"\" disabled=\"\" type=\"checkbox\">", "☑");
  // The DM key image becomes an image linked to its DM Guide page.
  html = html.replace(/<p><img src="([^"]+)-dm-key\.webp" alt="([^"]*)"><\/p>/g, (m, src, alt) => {
    const level = src.match(/ravenmoor-(\w+)$/)[1];
    return `<figure class="ravenmoor-dmkey"><img src="${src}-dm-key.webp" alt="${alt}">`
      + `<figcaption>@UUID[${pageUuid("dmguide", `dm-key-${level}`)}]{${alt}}</figcaption></figure>`;
  });
  return linkify(html, cards);
}

/**
 * Split a Markdown document into its `## ` sections.
 * @param {string} md
 * @returns {{title: string, body: string}[]}
 */
function sections(md) {
  return md.split(/^## /m).slice(1).map(chunk => {
    const nl = chunk.indexOf("\n");
    return { title: chunk.slice(0, nl).trim(), body: chunk.slice(nl + 1).trim() };
  });
}

const slug = s => s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

/* -------------------------------------------- */
/*  Handouts                                    */
/* -------------------------------------------- */

const SEALS = [
  [/raven/i, "raven"],
  [/mortar/i, "mortar"]
];

/**
 * A handout or clue card as a styled page.
 * @param {object} card
 * @param {object} handouts
 * @param {object} locations
 * @returns {string}
 */
function handoutHTML(card, handouts, locations) {
  const isHandout = card.kind === "handout";
  const headerLine = isHandout ? `Handout ${card.id.slice(1)} · ${card.header}` : `Clue ${card.id} · ${card.header}`;
  let html = `<div class="ravenmoor ravenmoor-handout ravenmoor-${card.kind}">`;
  html += `<p class="ravenmoor-header">${esc(headerLine)}</p>`;
  html += `<h2 class="ravenmoor-title">${esc(card.title)}</h2>`;
  if ( card.salutation ) html += `<p class="ravenmoor-salutation"><em>${esc(card.salutation)}</em></p>`;
  for ( const [i, para] of (card.body ?? []).entries() ) {
    // A notebook page opens with its title line in italics (Handout 4: "Banshee's Breath.").
    html += (card.id === "H4" && i === 0) ? `<p><em>${esc(para)}</em></p>` : `<p>${esc(para)}</p>`;
  }
  if ( card.id === "H2" ) {
    html += `<p class="ravenmoor-handout-art"><img src="${MODULE_PATH}/assets/art/suspects.webp" alt="The household in costume"></p>`;
  }
  if ( card.table ) {
    html += "<table class=\"ravenmoor-table\"><thead><tr>"
      + card.table.columns.map(c => `<th>${esc(c)}</th>`).join("") + "</tr></thead><tbody>"
      + card.table.rows.map(r => `<tr>${r.map(c => `<td>${esc(c)}</td>`).join("")}</tr>`).join("")
      + "</tbody></table>";
  }
  if ( card.signoff ) html += `<p class="ravenmoor-signoff"><em>${esc(card.signoff)}</em></p>`;
  if ( card.seal ) {
    const kind = SEALS.find(([re]) => re.test(card.seal))?.[1] ?? "raven";
    html += `<p class="ravenmoor-seal ravenmoor-seal-${kind}" title="${esc(card.seal)}">&nbsp;</p>`;
  }
  if ( card.annotation ) html += `<p class="ravenmoor-annotation"><em>${esc(card.annotation)}</em></p>`;
  html += "</div>";

  // DM-only details. Foundry shows "secret" sections only to owners of the page.
  const loc = card.foundIn?.locationKey ? locations.find(l => l.key === card.foundIn.locationKey) : null;
  const where = loc ? `@UUID[${pageUuid("locations", loc.key)}]{${loc.name}}` : esc(card.foundIn?.label ?? "");
  const actor = card.foundIn?.actor ? ` (${actorLink(card.foundIn.actor, card.foundIn.label)})` : "";
  const conclusions = (card.conclusions ?? []).map(k => handouts.conclusions[k]?.name).filter(Boolean);
  html += `<section class="secret ravenmoor-dm-note" id="secret-${card.id.toLowerCase()}">`
    + `<p><strong>DM:</strong> ${card.star ? "★ core clue. " : ""}Found: ${where}${actor}. ${esc(card.revealedBy)}</p>`
    + (card.checks?.length ? `<p><strong>Checks</strong> (speed only, never gate a ★ clue): ${card.checks.map(checkText).map(esc).join(" · ")}</p>` : "")
    + `<p><strong>Points to:</strong> ${esc(card.pointsTo)}${conclusions.length ? ` (${conclusions.map(esc).join("; ")})` : ""}`
    + `${card.unmask?.length ? `. Unmasking: ${card.unmask.join(", ")}` : ""}.</p>`
    + "</section>";
  return html;
}

/**
 * Testimony page.
 * @param {object} handouts
 * @returns {string}
 */
function testimonyHTML(handouts) {
  let html = "<div class=\"ravenmoor\"><p class=\"ravenmoor-muted\">What each witness gives up, and how to unlock it. "
    + "Tick these in the Clue Tracker macro once the party hears them.</p>";
  for ( const t of handouts.testimony ) {
    const who = actorLink(t.actor, readJSON("data/content/npcs.json").actors.find(a => a.key === t.actor).name);
    const conclusions = t.conclusions.map(k => handouts.conclusions[k].name).join("; ");
    html += `<h2>${t.star ? "★ " : ""}${esc(t.id)}</h2>`
      + `<p><strong>Who:</strong> ${who}</p>`
      + `<blockquote class="ravenmoor-readaloud"><p>${esc(t.text)}</p></blockquote>`
      + `<p><strong>Unlock:</strong> ${esc(t.unlock)}${t.checks.length ? ` (${t.checks.map(checkText).map(esc).join(" · ")})` : ""}</p>`
      + `<p class="ravenmoor-muted">Supports: ${esc(conclusions)}</p>`;
  }
  return `${html}</div>`;
}

/* -------------------------------------------- */
/*  Locations                                   */
/* -------------------------------------------- */

/**
 * @param {object} loc
 * @param {Map<string, object>} cards
 * @param {object[]} subPins   Pins on the map that open this page with their own label.
 * @returns {string}
 */
function locationHTML(loc, cards, subPins, npcs) {
  let html = "<div class=\"ravenmoor ravenmoor-location\">";
  if ( loc.readAloud ) html += `<blockquote class="ravenmoor-readaloud"><p>${esc(loc.readAloud)}</p></blockquote>`;
  if ( loc.readAloudAlt ) {
    html += `<p class="ravenmoor-readaloud-label"><strong>${esc(loc.readAloudAlt.label)}</strong></p>`
      + `<blockquote class="ravenmoor-readaloud"><p>${esc(loc.readAloudAlt.text)}</p></blockquote>`;
  }
  if ( loc.features?.length ) html += `<ul>${loc.features.map(f => `<li>${esc(f)}</li>`).join("")}</ul>`;
  if ( loc.clues?.length ) {
    html += `<p class="ravenmoor-clues"><strong>Clues here:</strong> ${loc.clues.map(c => {
      const card = cards.get(c);
      return card ? `${card.star ? "★ " : ""}${cardLink(card, `${card.id} ${card.title}`)}` : esc(c);
    }).join(" · ")}</p>`;
  }
  if ( loc.npcs?.length ) {
    html += `<p class="ravenmoor-npcs"><strong>People:</strong> ${loc.npcs.map(k => {
      const npc = npcs.find(n => n.key === k);
      const face = npc ? `<img class="ravenmoor-face" src="${MODULE_PATH}/${npc.token}" alt="">` : "";
      return `${face}${actorLink(k, npc?.name ?? k)}`;
    }).join(" · ")}</p>`;
  }
  if ( subPins.length ) {
    html += `<p class="ravenmoor-muted"><strong>Map pins on this page:</strong> ${subPins.map(p => `${p.number}. ${esc(p.label)}`).join(" · ")}</p>`;
  }
  if ( loc.dmNotes ) html += `<aside class="ravenmoor-dm-aside"><p>${esc(loc.dmNotes)}</p></aside>`;
  return `${html}</div>`;
}

/* -------------------------------------------- */
/*  DM Guide extras                             */
/* -------------------------------------------- */

function controlsHTML() {
  const rows = MACROS.map(m => `<tr><td>${m.slot ?? ""}</td><td><strong>${esc(m.name)}</strong></td><td>${esc(m.help)}</td></tr>`).join("");
  return "<div class=\"ravenmoor\">"
    + "<p>The easiest way to run the night is the <strong>Ravenmoor Director</strong> (macro, or <kbd>Shift</kbd>+<kbd>R</kbd>): "
    + "one window with every set piece below in running order, ticks for what has already happened, and the state of the night "
    + "(candles, clues, edges, session time). Its <em>Set up my hotbar</em> button puts the suggested macros in the slots below.</p>"
    + "<p>Every set piece is also a macro in the <strong>Ravenmoor</strong> macro folder. Each macro is one line that calls "
    + "<code>game.modules.get(\"ravenmoor-manor\").api</code>, so the logic updates with the module.</p>"
    + "<p><strong>Also handy:</strong> double-click any read-aloud box in these journals to post it to chat for the players. "
    + "Snuffing a candle can be bound to a key in Configure Controls. <em>Reset the Night</em> puts the map, NPCs and handouts "
    + "back to the start, for a test run or a replay.</p>"
    + "<table class=\"ravenmoor-table\"><thead><tr><th>Slot</th><th>Macro</th><th>What it does</th></tr></thead>"
    + `<tbody>${rows}</tbody></table>`
    + "<h2>Running order</h2><ol>"
    + "<li><strong>Before the session:</strong> assign each player their character (User Configuration), then in the Director: Party arrives at the drive, Treat Bag (2 candy each), and Settings for the party size and, if you like, the session clock and sound cues.</li>"
    + "<li><strong>Act 1:</strong> Silas Retires (8:25), Lights Out (8:55), The Body (9:00). The Body lights the twelve candles and starts Act 2.</li>"
    + "<li><strong>Act 2:</strong> click a candle on the Twelve Candles panel after each scene. Reveal Handout whenever a card is found; the Clue Tracker ticks itself.</li>"
    + "<li><strong>Act 3:</strong> the twelfth candle runs Midnight and opens the Accusation. Then Showdown Setup, which builds the combat and the Midnight Bell lair turn.</li>"
    + "<li><strong>Epilogue:</strong> Unmask Quill fires on its own at his surrender threshold. Finish with Epilogue.</li>"
    + "</ol>"
    + "<p class=\"ravenmoor-muted\">Every feature stands alone: if you prefer real tealights and candy, ignore the panels and nothing else breaks.</p>"
    + "</div>";
}

/* -------------------------------------------- */
/*  Build                                       */
/* -------------------------------------------- */

/**
 * @param {object} context
 * @param {object[]} context.npcs
 * @param {object} context.folders   { journal }
 * @returns {{journals: object[], cards: Map<string, object>}}
 */
export function buildJournals({ npcs, folders }) {
  const handouts = readJSON("data/content/handouts.json");
  const { locations } = readJSON("data/content/locations.json");
  const cards = new Map(handouts.cards.map(c => [c.id, c]));
  const scenes = Object.fromEntries(LEVEL_ORDER.map(k => [k, readJSON(`data/scenes/${k}.json`)]));
  const folder = folders.journal;

  // 1. Adventure
  const adventurePages = sections(readText("data/content/adventure.md")).map((s, i) => {
    const art = BANNERS.find(([prefix]) => s.title.startsWith(prefix))?.[1];
    const banner = art ? `<figure class="ravenmoor-banner"><img src="${MODULE_PATH}/assets/art/${art}" alt=""></figure>` : "";
    return textPage("adventure", slug(s.title), s.title, banner + mdToHTML(s.body, cards), { sort: (i + 1) * 1000 });
  });
  const adventure = entry("adventure", "Death at Ravenmoor Manor", adventurePages, folder);

  // 2. DM Guide
  const dmSections = sections(readText("data/content/dm-guide.md"));
  const dmPages = dmSections.map((s, i) => textPage("dmguide", slug(s.title), s.title, mdToHTML(s.body, cards), { sort: (i + 1) * 1000 }));
  let sort = (dmPages.length + 1) * 1000;
  dmPages.push(textPage("dmguide", "module-controls", "Module controls and hotbar", controlsHTML(), { sort }));
  const keyNames = { ground: "Ground Floor & Grounds", upper: "Upper Floor", below: "Crypt & Cellar" };
  for ( const level of LEVEL_ORDER ) {
    dmPages.push(imagePage("dmguide", `dm-key-${level}`, `DM key: ${keyNames[level]}`,
      `${MODULE_PATH}/assets/maps/ravenmoor-${level}-dm-key.webp`,
      "GM only: numbered pins match the map notes; green tags are clue cards; red dashes are secret doors.", sort += 1000));
  }
  const dmGuide = entry("dmguide", "Ravenmoor DM Guide", dmPages, folder);

  // 3. Locations, in map order.
  const order = [];
  for ( const level of LEVEL_ORDER ) {
    const notes = [...scenes[level].notes].sort((a, b) => a.number - b.number);
    for ( const n of notes ) if ( n.locationKey && !order.includes(n.locationKey) ) order.push(n.locationKey);
  }
  for ( const l of locations ) if ( !order.includes(l.key) ) order.push(l.key);
  const locationPages = order.map((key, i) => {
    const loc = locations.find(l => l.key === key);
    const subPins = LEVEL_ORDER.flatMap(level => scenes[level].notes.filter(n => !n.locationKey && n.parentKey === key));
    const levelName = keyNames[loc.level];
    const pinNo = scenes[loc.level].notes.find(n => n.locationKey === key)?.number;
    return textPage("locations", key, loc.name, locationHTML(loc, cards, subPins, npcs), {
      sort: (i + 1) * 1000, flags: { level: loc.level, levelName, pin: pinNo ?? null, source: loc.source }
    });
  });
  const locationsEntry = entry("locations", "Ravenmoor Locations", locationPages, folder);

  // 4. Handouts & Clues. The entry is Limited so revealed pages show; each page starts hidden except H1.
  const handoutPages = handouts.cards.map((card, i) => textPage("handouts", card.id,
    `${card.id}: ${card.title}`, handoutHTML(card, handouts, locations), {
      sort: (i + 1) * 1000,
      ownership: { default: card.showAt === "setup" ? OWNERSHIP.OBSERVER : OWNERSHIP.NONE },
      flags: { card: card.id, kind: card.kind, star: card.star, item: card.item ?? null, onReveal: card.onReveal ?? null },
      showTitle: false
    }));
  const links = Object.fromEntries(handouts.cards.map(c => [c.id, cardLink(c)]));
  handoutPages.push(textPage("handouts", "clue-tracker", "Clue Tracker (GM)", renderClueTracker(handouts.conclusions, {}, links), {
    sort: 900000, ownership: { default: OWNERSHIP.NONE }, flags: { tracker: true }
  }));
  handoutPages.push(textPage("handouts", "testimony", "Testimony (GM)", testimonyHTML(handouts), {
    sort: 910000, ownership: { default: OWNERSHIP.NONE }, flags: { testimony: true }
  }));
  const handoutsEntry = entry("handouts", "Ravenmoor Handouts & Clues", handoutPages, folder, {
    ownership: OWNERSHIP.LIMITED, flags: { trackerLinks: links }
  });

  // 5. The Household.
  const household = ["morwenna", "edric", "pip", "quill", "bramwell", "crane", "silas", "fennick", "widow"];
  const householdPages = household.map((key, i) => {
    const npc = npcs.find(n => n.key === key);
    const portraits = [npc.token, npc.tokenUnmasked].filter(Boolean).map(t =>
      `<img class="ravenmoor-portrait" src="${portraitFor(t)}" alt="${esc(npc.name)}">`).join("");
    const html = `<div class="ravenmoor ravenmoor-profile"><div class="ravenmoor-portraits">${portraits}</div>`
      + `<p class="ravenmoor-header">${esc(npc.role.charAt(0).toUpperCase() + npc.role.slice(1))}</p>`
      + `<p>${actorLink(key, `Open ${npc.name}'s sheet`)}</p>${biographyHTML(npc)}</div>`;
    return textPage("household", key, npc.name, html, { sort: (i + 1) * 1000 });
  });
  const householdEntry = entry("household", "Ravenmoor: The Household", householdPages, folder);

  return { journals: [adventure, dmGuide, locationsEntry, handoutsEntry, householdEntry], cards, handouts };
}

export { pageUuid };
