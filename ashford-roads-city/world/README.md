# The Known World (Wayfinder), as charted from Ashford Roads

`final/known_world.jpg` (labelled) and `final/known_world_players.jpg` (no labels), 3600x2400 JPG, about 1 MB each.
Drawn by `build_world.py` (SVG, the same gaslit palette, IM Fell English and brass frame as the city map) and
`render.mjs`. Deterministic: rebuilding gives the same chart.

```bash
python3 -X utf8 -I world/build_world.py
```

```bash
NODE_PATH=$(npm root -g) node world/render.mjs
```

## What is lore and what is placement

Labels are only places the lore names (`possibilities-act1/data/lore/`):

| On the chart | From the lore |
|---|---|
| The Mainland, the plains | "the mainland plains", "grassy plains that stretch with no end"; "the mundane and cruel life of the mainland" |
| the village with no name | Enkrid's village, "a cluster of stone hovels ... around one communal fire" |
| The Coast Road, the ash fields | "the way into Ashford from the mainland, through the refinery's ash fields" |
| Ashford Roads, home port, grade F | "the home port", region the Reach, grade F |
| Coldwater | "windward, rocky, salt and fish", in the Reach |
| The Reach, Compact waters | Ashford's region; binding is "licensed in Compact waters"; "the sea outside the Reach is unfixed" |
| F marks on the water | grade-rated waters; Ashford is F |
| limit of the charts, Kelder's Wall | the legends sailed "out past Kelder's Wall"; the accepted decision: a standing brume bank at the edge of the charted Reach |
| The Sea of Possibility, uncharted | "the Sea of Possibility"; the brume-covered, unfixed sea beyond |

Placement, confirmed by the owner on 19 Nov 2026 (the lore gives no directions): the mainland west, the Reach's
islands east, Kelder's Wall beyond them; Coldwater close to Ashford, to the north-east, where the wind comes in; the
islands of the Reach (the beastkin home rocks and the harbours of "every dock in the Reach") drawn without names.
The shipping lanes, the charge-engine steamers, the lit charge beacons on some islands, the two sky ships and their route (sky ships are rare and new, so only two), and where the village sits on the plains are illustration, not lore.

Not shown: book one's islands 1-5 (unnamed, and past the first ship's course, which the lore doesn't map).
