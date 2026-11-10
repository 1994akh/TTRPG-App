# Art tools

Python 3 with Pillow and numpy (no scipy). Every generator uses fixed seeds, so a rebuild gives byte-identical files.
Fonts are read from `../ravenmoor-manor/assets/fonts/` (IM Fell English, OFL).

```sh
python3 tools/build_maps.py                  # every map -> assets/maps/<id>.webp + data/scenes/<id>.json
python3 tools/build_maps.py grate_chamber    # just one
python3 tools/build_maps.py --debug DIR      # also write overlays (grid, walls, doors, lights, notes, tokens) to DIR
python3 tools/build_portraits.py             # portraits, tokens and the cover
python3 tools/build_portraits.py enkrid      # just one (portrait + token); "cover" for the cover only
```

- `artlib.py`: the painting engine. A map is a grid of cells (1 cell = one 100 px square) holding a floor material or
  solid rock/brick. Foundry walls are traced from the same cells, so art and walls always agree; doors (`door`,
  `grille`, `hatch`, `secret`, `open`) cut the wall runs.
- `build_maps.py`: the seven maps. Never hand-edit `data/scenes/*.json` or the map images; change the layout here.
- `build_portraits.py`: cut-paper profile silhouettes. Heroes brass on amber, people verdigris on teal, foes rust on red.

## Scene JSON

`{id, name, width, height, gridSize, gridType, background, darkness, walls:[{c:[x0,y0,x1,y1], door}], lights:[{key?, x, y,
dim, bright, color, alpha, animation?}], notes:[{x, y, page, label}], tokens:[{actor, x, y, hidden?}], sunPath?}`.
Coordinates are pixels of the background. Light `dim`/`bright` are in scene distance units (5 per square, so 10 = two
squares). `door`: 0 wall, 1 door, 2 secret door. Note `page` keys are lore place ids or lore scene ids (`ch1_*`).

| Map | Size | Notes |
|---|---|---|
| `ashford` | 3000×2000, no grid | City overview; notes for every landmark (the culvert hatch → `undercourses`). |
| `undercourses` | 40×28 | Hatch landing (A), junction (B), the sellswords' room (C), Old Gnaw's chamber (D), the sump (E), the pump room (F); exit south to the Grate Chamber. Hidden rat/Gnaw tokens. |
| `grate_chamber` | 20×14 | Cistern, Petra's ledge, four exits (west doorway the party enters by, north drain, east outfall, south overflow). `sunPath`: 8 points; light `key: "sun"` starts at point 0. |
| `sallows_exchange` | 18×14 | Counting-room, high desk, commissions board, door to the steps (the bonding beat). |
| `binding_house` | 16×12 | Four binding cradles, the binder's table, vestibule. |
| `lantern_lee` | 16×12 | Common room, the one room (four bunks), kitchen. |
| `long_quay` | 24×14 | The quay and the Gilded Tern at her gangway; the harbour is open water (no walls). |
