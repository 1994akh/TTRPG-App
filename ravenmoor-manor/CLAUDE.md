# Ravenmoor Manor: build a Foundry VTT module

This folder is a handoff package. The task is to build the Foundry VTT v14 adventure module **Death at Ravenmoor Manor** (module id `ravenmoor-manor`, system dnd5e 6.0.6) from the assets and data here.

1. Read `docs/HANDOFF.md` in full before writing code. It is the spec.
2. Do the checks in HANDOFF section 2 first (v14 Level schema, Change Level behavior, dnd5e 6.x data models, compendium names, lair handling). The real APIs win over the spec; record any differences in `docs/IMPLEMENTATION_NOTES.md`.
3. Treat `data/` and `assets/` as inputs. Never hand-edit `data/scenes/*.json` or the map images; regenerate them with `tools/build_maps.py` if a layout must change.
4. Keep adventure prose verbatim from `data/content/*.md` and `handouts.json` (they mirror the campaign doc). Entries marked `source: "module"` in `locations.json` may be edited.
5. Deterministic document ids, one `npm run build`, one `npm run package`, and the acceptance checklist in HANDOFF section 11 is the definition of done.

## Working on the built module

- `npm run build && npm run check` after any change to `build/`, `data/` or `scripts/`; `npm run package` writes `dist/ravenmoor-manor.zip`.
- `scripts/lib/generated.mjs` is written by the build; do not edit it by hand.
- Deviations from the spec are recorded in `docs/IMPLEMENTATION_NOTES.md`; keep it current.
