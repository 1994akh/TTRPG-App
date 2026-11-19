# Ashford Roads map from Watabou's street plan

The lore-exact Ashford Roads map (`final/ashford_roads.jpg`, and `final/ashford_roads_players.jpg` with no labels).
The owner chose this route on 19 Nov 2026 because lore accuracy matters most: an AI image model can't be held to a
layout, so the street plan comes from a procedural city generator and every lore place is drawn on it by code.

- **Street plan:** [Medieval Fantasy City Generator](https://watabou.github.io/city-generator/) by watabou, exported as
  GeoJSON (`mfcg-6631.json`; land, sea, roads, walls, about 4,800 buildings, the square, jetties, fields). Settings:
  `size=48&seed=6631&citadel=0&urban_castle=0&plaza=1&temple=1&walls=1&shantytown=1&coast=1&river=0&greens=0&gates=-1&sea=0`.
  The same URL rebuilds the same plan; add `&export=json` to download the data. Watabou's own district names are not used.
- **Drawn by** `build_map.py` (SVG, the gaslit palette, IM Fell English from `ravenmoor-manor/assets/fonts`) and
  `render.mjs` (Playwright, 3000 px JPG). Run from `ashford-roads-city/`:

```bash
python3 -X utf8 -I watabou/build_map.py
```

```bash
NODE_PATH=$(npm root -g) node watabou/render.mjs
```

## Where the lore's places are, and why

Canon gives no compass directions, so the placements follow what the lore says about each place
(`possibilities-act1/data/lore/places.json` and the answered Ashford Roads Decisions):

| Place | On the map | From the lore |
|---|---|---|
| The Refinery | walled works on the bay's north shore, stacks, domed brume tanks, a pier | "a Compact refinery running day and night"; it burns the brume of the sea, so it sits on the water |
| Refinery Row | the street from the refinery gate down to the square, lamp-lit, fog-free, a brass charge main beside it | "built where the refinery's heat keeps the fog off" |
| Undercourses outfalls | culvert mouths in the sea wall below the Row | "old stone culverts under Refinery Row, warm with refinery run-off" |
| The Long Quay | the long pier into the harbour, tall ships both sides, the sky-ship mast at its tip | "where the outbound ships berth"; sky ships rare and new (decision answer) |
| Sallow's Exchange | the brass building at the quay's landward end, by the square | "the public information broker near the port" |
| The Lantern and Lee | the lit building on the quay | "the one inn on the quay" |
| The Binding House | the white domed hall with brass coils by the square | "a white hall, brass coils" |
| The Bench Office | the clock building near the harbour | "a Bench office"; the Bench owns the charts |
| Wright Chapel | the clock-faced chapel | the Wrights' chapels keep the clocks (decision answer) |
| City Gate, the Coast Road, the Ash Fields | the west gate, the road west through grey fields | "the way into Ashford from the mainland, through the refinery's ash fields" |
| Fish Market, Beastkin Quarter | the south shore | "a big beastkin quarter by the fish market" (decision answer) |
| The Harbour, the Reach, the brume | the bay, the open sea east fading into fog | "a deepwater harbour"; Ashford is in the Reach; the sea is covered in brume |

Not placed, because the lore gives no direction for them: Coldwater, Kelder's Wall.
