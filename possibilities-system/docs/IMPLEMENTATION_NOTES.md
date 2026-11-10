# Implementation notes

## Checked against v14

foundryvtt.com isn't reachable from the build environment, so the APIs were read from the community type definitions
`fvtt-types@14.370.0-beta.20261107215328`:

- System manifest: `documentTypes` (per type `htmlFields`), `initiative`, `grid {type, distance, units, diagonals}`,
  `primaryTokenAttribute`, `secondaryTokenAttribute`, `packs`, `packFolders` all exist in `client/packages/system.d.mts`.
- `foundry.abstract.TypeDataModel` with `defineSchema`, `prepareDerivedData` (runs after embedded items are prepared,
  so heroes read their equipped weapon and armour there).
- `foundry.applications.api.{HandlebarsApplicationMixin, DialogV2}`, `foundry.applications.sheets.{ActorSheetV2,
  ItemSheetV2}`, `foundry.applications.apps.DocumentSheetConfig.registerSheet`, `ApplicationV2.TABS` +
  `_prepareTabs(group)`, `_processFormData`, `_onDropItem(event, item)`, `DialogV2.wait({render, buttons, rejectClose})`,
  `foundry.applications.ux.{TextEditor, FormDataExtended}`, the `<prose-mirror>` element.
- `Combat#_onStartTurn(combatant, context)` and `_onStartRound(context)`: run on one GM client only, after the update.
  The system uses them to refill actions, clear MAP and Raise Guard, roll Dying recovery checks, and tick Scene clocks
  (from round 2).
- `Actor#toggleStatusEffect(id, {active, overlay})`, the `renderChatMessageHTML(message, html)` hook (HTMLElement).

## Choices

- Rules data is compiled into `module/rules-data.mjs` (an ES module) so data models stay synchronous; the build writes it.
- Handlebars helpers are namespaced (`possSigned`, `possEq`, `possOr`) rather than relying on core `eq`/`or`.
- Approach id lists on the Scene sheet are typed as comma-separated text and split in `_processFormData`.
- Rolls use the `rolls` array on `ChatMessage.create`, so Dice So Nice and roll tooltips work.
- Condition (intact / damaged / broken) has no effect on rolls, as decided.
- NPC checks and saves use the benchmark bonus (= its attack).

## Tested here vs. needs a real Foundry

Tested in Node (`npm run check`, 24 tests): the rules port against all 202 oracle cases; the data models deriving the
same numbers; checks, own-roll entry, Strike with MAP and improvised weapons, damage, Dying, Stabilise, healing,
rests, Scene attempts / Setbacks / clocks / hooks, the creator and binding, through a fake Foundry
(`tests/runtime.mjs`); and every sheet building its context and rendering its templates (`tests/sheets.test.mjs`).

Not yet tried in a real v14 world: the sheets' look, tab switching, prose-mirror saving, drag-drop of reference items,
the combat-turn hooks, token bars, the Actors-sidebar "New hero" button placement (`.header-actions`), DialogV2
layout, and the chat-card buttons.
