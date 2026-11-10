# TTRPG-App
Claude code ai repository for ttrpg app v1

## Projects

- [`ravenmoor-manor/`](ravenmoor-manor/README.md): **Death at Ravenmoor Manor**, a Foundry VTT v14 adventure module for dnd5e 6.x (build with `npm install && npm run build && npm run package` inside that folder).
  Install it in Foundry from the manifest URL `https://github.com/1994akh/TTRPG-App/releases/latest/download/module.json` once a release is published; publishing a GitHub release runs `.github/workflows/release.yml`, which builds the module and attaches it to the release.
- [`possibilities-system/`](possibilities-system/README.md): **Possibilities**, a Foundry VTT v14 game system for the Possibilities TTRPG (the v1_1 workbook's rules: three tracks, grades F-S, three-action turns, Scenes, the Dying track). Manifest URL `https://github.com/1994akh/TTRPG-App/releases/latest/download/system.json`.
- [`possibilities-act1/`](possibilities-act1/README.md): **Ashford Roads: Act 1**, the Wayfinder story's first act as a playable module for that system, with a Director, maps, the trio and a My Story journal. Install the system first, then the manifest URL `https://github.com/1994akh/TTRPG-App/releases/latest/download/possibilities-act1.json`. Open questions are on the Ashford Roads Decisions page, built from `possibilities-act1/docs/decisions/`.

Publishing one GitHub release builds and attaches all three packages (`.github/workflows/release.yml`).
