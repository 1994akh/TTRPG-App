/** Ids every builder (and the runtime, through generated.mjs) agrees on. */
import { id } from "./ids.mjs";

export const MAPS = ["ashford", "sallows_exchange", "undercourses", "grate_chamber", "binding_house", "lantern_lee", "long_quay"];

export const IDS = {
  adventure: id("adventure:act1"),
  journal: key => id(`journal:${key}`),
  page: (journal, key) => id(`page:${journal}:${key}`),
  actor: key => id(`actor:${key}`),
  item: key => id(`item:${key}`),
  embedded: (actor, key) => id(`item:${actor}:${key}`),
  scene: key => id(`scene:${key}`),
  level: key => id(`level:${key}`),
  macro: fn => id(`macro:${fn}`),
  table: key => id(`table:${key}`),
  result: (table, i) => id(`result:${table}:${i}`),
  folder: type => id(`folder:${type}`)
};

export const pageUuid = (journal, key) => `JournalEntry.${IDS.journal(journal)}.JournalEntryPage.${IDS.page(journal, key)}`;
