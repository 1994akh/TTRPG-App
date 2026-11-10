# Implementation notes: Ashford Roads: Act 1

## Against the spec

- Field names follow `possibilities-system/docs/SPEC.md`; the hero schema the system actually built also has
  `hitDiceUsed` and `dying.dead`, which the Adventure leaves to their defaults.
- The system's real API (`game.possibilities`, set on `ready`) is used where it exists: `createHero`, `bind` (the trio
  take `story.path.class[0]`), `rest`, `advanceClock` (it ticks the clock, runs the round's Setback and resolves a lost
  Scene), `resolveScene`/`triggerSetback` (they damage loaners and fire `possibilities.sceneResolved` /
  `possibilities.setback`). The module only moves the sunlight, ticks the Director and posts the story. Without the
  system API, each tool has a plain fallback (used by the Node tests).
- Journal buttons use a custom enricher `@Act1[fn:arg]{label}` (v14 `CONFIG.TextEditor.enrichers`, global pattern) and a
  delegated click handler; `{pc}` is an enricher too, so the stored text stays verbatim.
- Scenes: one v14 Level per scene (backgrounds live on Levels), as in `ravenmoor-manor`.
- The dead sellswords are tokens with a "Dead" effect in their delta.
- Playlists are empty Playlist documents in the Adventure.

## Answers applied (10 Nov 2026, the Ashford Roads Decisions page)

All 57 recommendations as written, plus the two notes (brume is the power system; sky ships are ~30 years old and
fly on the brume engine), in the Setting primer and the GM notes. The sun clock is 8 rounds, matching the 8 points of
the map's sun path; Resistance was then raised from 50 to 80 so the Scene stays tense (simulated: ~90% win, ~5 rounds).

## Verified here

`npm run build && npm run check`: 178 links, 198 lore lines verbatim (17 scenes, 17 characters, 13 places, 5 terms and
the six paragraphs of the user's prologue draft), every macro/tool/journal button names a real API function, every
asset exists. Tests: the 14 steps played in a simulated world (with the system's real `compute`), the purse lands on
exactly four bindings, the sun light moves, Old Gnaw (96% win, a hero drops in 44% of fights) and Into the light (90%)
simulated 2000 times each with the system's rules.

## Not verified (needs a real Foundry v14 world)

Adventure import, the ApplicationV2 windows' look, the enrichers' rendering, `Journal.show`, `toggleStatusEffect`,
token creation from prototypes, combat creation/rounds, and the system's dialogs inside the module's flow.
