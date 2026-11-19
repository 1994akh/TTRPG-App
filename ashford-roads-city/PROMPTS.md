# Ashford Roads: city art and map for D&D Beyond (Cloudflare prompt pack)

A brief for the session that has Cloudflare Workers AI connected (Halcrya Lead 2). It makes the art for a D&D
Beyond page about **Ashford Roads**, the home port of the owner's Wayfinder setting, drawn as a **D&D steampunk
city**: the owner's words for the world are **Dungeonpunk** and **Gaslit fantasy**.

Machine-readable prompts: [`prompts.json`](prompts.json). Runner: [`generate.mjs`](generate.mjs). Written 19 Nov 2026,
revised the same day after reading Game-Gumbo's tested Cloudflare skill (section 2a),
from the Ashford lore in `possibilities-act1/data/lore/` and the answers on the Ashford Roads Decisions page
(`possibilities-act1/docs/decisions/ANSWERS.md`). **Add your own Halcyra art research where it sharpens a prompt;
keep the canon list below as it is.**

## Scope now: the map only

The owner, 19 Nov 2026: "Just make the map then to reduce costs." Make only `city_map`, with no reference image (the
style anchor only mattered for keeping a set alike). Cost: 8 drafts at 512 px (~208 neurons) and 2 finals at
1920×1920 (~834), about **1,040 neurons, a tenth of one free day**. Everything below about the other images is kept
for later and not run now.

```bash
node ashford-roads-city/generate.mjs city_map --dry-run --draft --candidates 8
```

```bash
node ashford-roads-city/generate.mjs city_map --draft --candidates 8
```

Show the owner the 8 drafts. Make the finals from the 2 seeds they like (for example 1003 and 1006):

```bash
node ashford-roads-city/generate.mjs city_map --seeds 1003,1006
```

Copy the pick to `final/city_map.png`, note it in `final/CHOSEN.md`, and add the labels from section 6 in an editor.
For D&D Beyond, save a JPG or WEBP under 10 MB (a 1920×1920 high-quality JPG is about 1-2 MB), and keep the
unlabelled copy as the player version.

## 1. What to make (later; only the map now)

| # | Id | Image | Size (px) | Why |
|---|---|---|---|---|
| 0 | `style_anchor` | A style swatch: one painted vignette of a brass-and-soot Ashford street corner at dusk, with the palette shown as paint chips along the bottom | 1024×1024 | Reference image for every later call (downscaled to 512×512) |
| 1 | `skyline_key_art` | Ashford from the harbour at dusk: refinery stacks, Long Quay, one airship, fog | 1920×1024 | Page banner / hero image |
| 2 | `city_map` | Illustrated bird's-eye city map, no labels | 1920×1920 | The D&D Beyond map (labels added afterwards) |
| 3 | `refinery_row` | District vignette | 1536×1024 | Section art |
| 4 | `sallows_exchange` | Interior: the information broker's counting-room | 1536×1024 | Section art |
| 5 | `long_quay` | The outbound quay, ships and gangways, an airship mast | 1536×1024 | Section art |
| 6 | `binding_house` | Interior: the Compact's binding hall | 1536×1024 | Section art |
| 7 | `lantern_lee` | The one quay inn that takes monsterkin | 1536×1024 | Section art |
| 8 | `undercourses` | The sewers under Refinery Row (the dungeon) | 1536×1024 | Section art |
| 9 | `coast_road_gate` | The Coast Road through the ash fields to the city gate | 1536×1024 | Section art |

All sizes are multiples of 16, between 256 and 1920 px (klein 4B's range). Make them in this order: the anchor first,
then the skyline, then the map, then the districts. Each later image takes the anchor (and, for the districts, the
map) as reference images.

## 2. Model, cost and limits (Cloudflare Workers AI, free allowance only)

- **Model:** `@cf/black-forest-labs/flux-2-klein-4b`, the model Game-Gumbo tested on 19 Nov 2026. A multipart form
  with `prompt`, `width`, `height`, `seed`, `guidance` and `input_image_0` … `input_image_3`; steps are fixed at 4 and
  never sent. Prompts at most 2,048 characters; references under 512 px (511 at most); output 256-1920 px a side.
- **Free allowance only** (the owner, 18 Nov 2026: "Cloudflare only"; Workers Paid is not on, so a call past the
  allowance fails rather than bills). 10,000 neurons a day, reset 00:00 UTC; the runner stops at 9,000 by its own
  count and shares the tally file with Gumbo's `cf_gen.py` (`~/.gumbo/cloudflare-neurons.json`), so the two never
  overspend together. The dashboard holds the true count.
- **Cost** (per 512×512 tile, a part tile counts as one): about 26 neurons an output tile, plus about 26 per reference
  image (measured by the Gumbo run; Cloudflare's pricing page says 5.37, which undercounts).

  | Image | Size | Refs | Each | Plan |
  |---|---|---|---|---|
  | style_anchor | 1024×1024 | 0 | ~104 | 8 drafts (208) + 4 finals (417) |
  | skyline_key_art | 1920×1024 | 1 | ~234 | 8 drafts (416) + 4 finals (938) |
  | city_map | 1920×1920 | 1 | ~443 | 8 drafts (416) + 4 finals (1,771) |
  | 7 districts | 1536×1024 | 1-2 | ~182-208 | 3 drafts each (~1,100) + 3 finals each (4,063) |

  **Two days:** day 1 the anchor, skyline and map (about 4,200); day 2 the districts (about 5,200). `--dry-run`
  prints the plan and its neurons without a key and sends nothing.
- **Why not FLUX.2 [dev]:** it costs 37.5 neurons per output tile *per step*: one 28-step 1920×1024 banner is about
  8,400 neurons, the whole day. [klein] 9B prices by megapixel (about 1,364 for the first): also too dear.
- **Drafts:** `--draft` makes the same prompt at 512 px on the long side (about 26-52 neurons) to choose a composition
  and seed cheaply; the finals then reuse the winning seeds with `--seeds`.

## 2a. What Game-Gumbo already learned (cf_gen.py and the ds_npc recipe, 19 Nov 2026)

From `Game-Gumbo/.claude/skills/image-gen/` on `helper/claude-alt/cf-ds-npc-recipe` (the Cabbage Merchant run):
- **Seeds work on klein 4B:** the same seed, prompt and references give the same picture. Keep the seed of every pick.
- **Structured JSON prompts with hex colours per item** worked and kept a set consistent. The owner then: "copy or
  model prompt structures to reduce our waste and keep consistency." The prompts here follow the same shape (a fixed
  style block, named parts with hex colours, an `avoid` line).
- **Output flag, error 3030:** franchise, show or character names, ages, and words like "old" or "elderly" set off
  Cloudflare's output check. None are in these prompts ("the town", "weathered paper"). The flag rate was about 11%,
  so plan for one candidate in eight to be skipped.
- **Error 3036** (HTTP 429) means the day's free allowance is used: stop until 00:00 UTC.
- **Reference order matters:** the image that sets the look goes first (`input_image_0`); a second image is read as a
  layout or pose guide.
- **The look test:** variants × seeds on one contact sheet for the owner to pick from; nothing is used until picked,
  and every sidecar says `status: draft`.
- **The token goes only to `https://api.cloudflare.com`**, with redirects refused, and is never printed or written.

**Map prompt refinement, 18 Nov** (the owner: "Refine the prompts first, then proceed"; only `city_map` changed, the
other nine prompts come out byte-for-byte as before). Folded in from our klein 4B runs and the BFL FLUX.2 guide:
- **Most important first:** the `scene` now opens with what the picture is (an unlabelled top-down city map, north
  up, land west, sea east) and the medium (bold ink line, flat watercolour wash, ledger paper), because earlier words
  weigh more. Subjects run in map order, each with its compass position.
- **A map style, not the street-painting style:** the shared block asks for oil paint, atmospheric depth and soft
  haze, which blurs a map. The map has its own `style` (hand-inked, small hand-drawn buildings, pale roads, strong
  land/water contrast) that keeps the shared words gaslamp fantasy, black stone, brass and verdigris; "Dungeonpunk"
  is written as "grimy industrial" there, since "dungeon" is close to a franchise word that can trip flag 3030.
  Critique pass: the compass rose moved from the south-west (land) to the north-east sea, the sky-ship mast is
  pinned to the pier tip, the avenue is placed north, the sea no longer shares the ash fields' colour, and the
  Compact banners are written as "banner flags" (no faction name in the prompt).
  Fog is kept to the sea edge so districts stay readable at D&D Beyond display size.
- **Hex only next to objects:** the bare eight-hex list is dropped for the map (`"color_palette": false`); every
  hex sits in `colors` or a subject next to the thing it colours.
- **No names in the prompt:** places are described, not named (no "Ashford Roads", no brand or franchise words),
  since names invite garbled lettering and can trip flag 3030; no age words.
- **Text:** the `avoid` line asks for no text, letters, numbers, labels, compass letters or cartouche writing (it
  helps only a little; klein has no negative prompt), the compass is a plain star, the cartouche blank, and open
  water, fields and plazas are left plain as space for the section 6 labels.
- **Runner:** `generate.mjs` now lets an image override `style`, `mood` and `avoid` and drop the hex list; images
  without those fields are unchanged. Prompt length 2,003 of 2,048 characters (`--dry-run --draft`).
- **Canon:** every section 6 layout fact is still in the prompt (gate and ash fields west, refinery and its pier
  north-west, the fog-free avenue east from its gate, courthouse with clock tower, clock chapel and white domed hall
  in the centre, the long pier with tall ships, the inn, the mast and its sky ship south-east, the broker's hall at
  the pier's landward end, the fish market and quarter, the outfalls below the avenue, sea into fog to the east).
  Sections 4 and 6 are unchanged.

**Map round 2, 18 Nov: steampunk and sky ships.** Round 1 (seeds 1001-1008, `out/city_map/drafts_contact.png`) came
out as a pleasant inked watercolour harbour town, oblique bird's-eye, with garbled fake labels on most; the refinery's
stacks were the only industrial part and the sky ship at the mast was tiny or missing. The owner looked and asked:
"Where is the steam punk elements and sky ships." Round 2 changes only `city_map`:
- **Steampunk and sky ships first:** the `scene` now opens "Steampunk sky-port city map: big airships with gas
  envelopes and propellers over the harbour; brass pipes, steam plumes, clock towers and iron cranes
  everywhere", then the map facts (unlabelled, near top-down, north up, land west, sea east, paper `#E6DCC3`).
  Critique pass: "iron girder bridges" became "iron cranes" (the map has no river, so bridges could invent one), and
  the white domed hall keeps its "brass roof coils" (canon: coils on the Binding House roof).
- **Sky ships:** the first subject is now the canon mast at the pier tip with a *large* moored airship (it was "one
  small sky ship"), and a second subject adds two airships in flight over the bay and the centre; the composition says
  "Airships drawn large" so they read at map scale. Three in all, because section 4 has sky ships rare and watched.
  The `colors` line ties the airships to brass `#B5893A`.
- **Steampunk everywhere, not just the refinery:** iron paddle steamers with funnels berth beside the tall ships;
  the centre's roofs vent steam with pipes over the lanes; the avenue gains a tram line; the refinery has "many
  smokestacks"; the lighting asks for steam and smoke plumes from many roofs; the style adds "steampunk", riveted iron
  and brass gears (still no "dungeon" word; "Dungeonpunk and Gaslit fantasy" stays as "grimy industrial, gaslamp
  fantasy").
- **More top-down:** camera "near top-down, buildings slightly oblique".
- **Text:** `avoid` adds "words" (now: text, letters, words, numbers, labels, compass letters, cartouche writing,
  neon); "castles", "cars" and "watermarks" were dropped for room.
- **Canon kept:** every section 6 fact is still placed (ash-field road to the gatehouse west, walled refinery and its
  pier north-west, fog-free avenue east from its gate, courthouse with clock tower, clock chapel and white domed hall
  centre, long pier with tall ships, inn, mast and moored sky ship south-east, broker's hall at the pier's landward
  end, fish market and quarter, outfalls below the avenue, sea into fog east). The extra airships, steamers, pipes,
  tram and steam are ambient style, not new named places. Sections 4 and 6 are unchanged.
- **Length and run:** 2,045 of 2,048 characters (`--dry-run --draft`). Round-2 drafts use seeds 1101-1108
  (`--draft --seeds 1101,...,1108`, about 208 neurons) so round 1's files stay.

**Map round 3, 18 Nov: round-1 layout as a reference.** Round 2 (seeds 1101-1108, `out/city_map/drafts_contact_r2.png`)
had the steampunk and airships but the layouts drifted, and none had the moored airship at the mast, the compass or the
cartouche. The owner said "Round 3": keep the round-2 prompt and give it round-1 #3 (seed 1003, the best canon layout:
refinery north-west, avenue east from it, domed halls centre, long pier with tall ships south-east, lattice mast at
the pier tip, walls, grey fields west) as a layout reference. Changes, `city_map` only:
- **Reference:** `refs/city_map_layout.png`, 511 px (the `ref_max_px` limit), made from `out/city_map/1003_draft.jpg`
  with its four fake labels inpainted out (OpenCV) so the reference does not teach lettering. Tracked name on purpose
  (`*.512.png` is gitignored); `reference()` uses it directly because it is already within 511 px.
- **Runner:** `generate.mjs` lets an image override `reference_line`; the shared line ("match the painting style ... of
  image 0") is a style-anchor line and wrong for a layout image. The map's line: "Image 0 is the layout: keep its
  coastline, walls, roads, refinery, pier and districts in place; restyle as steampunk."
- **Mast airship explicit:** the first subject now opens "A large airship moored to an iron mast at the far end of the
  pier, east".
- **Trimmed for room (the reference now carries the layout):** "land west, sea east" and the paper hex in the scene
  (the `colors` line keeps the hex); "clock towers" in the scene (the courthouse keeps its clock tower); "Small
  buildings, pale roads, strong land/water contrast" in the style; "Square," in the composition; "stone" in the pier;
  "numbers" and "cartouche writing" in `avoid` (now: text, letters, words, labels, compass letters, neon).
- **Length and cost:** 2,043 of 2,048 characters; 52.05 neurons a draft (26 output + 26 reference), 416 for seeds
  1201-1208; tally 3,225 to 3,641 of 9,000 (UTC 19 Nov).
- **Result** (`out/city_map/drafts_contact_r3.png`, numbered 17-24; `compare_r1_r2_r3.png` against round-1 #3 and
  round-2 #11, #16): the reference worked. All eight keep the round-1 #3 layout closely, and the steampunk carries over
  (airships, steam plumes, brass pipelines). Still missing: no draft has an airship moored at the mast. The mast is
  always drawn, but empty. A few drafts give a compass or a blank cartouche. Best two: **#20 (1204)**, with five airships, a
  clock tower, a domed hall on the pier and the most steampunk, and **#24 (1208)**, with a blank cartouche, compass stars, three airships and
  heavy smoke. For the next round, try a guidance raise, or put the moored airship in `composition`.

## 3. Consistency rules

1. **One style block, verbatim, in every prompt** (the `style` and `color_palette` fields in `prompts.json`). Change
   only the `scene`, `subjects`, `composition` and `camera` fields between images.
2. **Hex colours tied to objects**, not "use these colours": FLUX.2 matches a hex code best when it's named next to
   the thing it colours ("charge-lamp glow color #F2A541").
3. **Reference images:** after the anchor is chosen, every call sends it as `input_image_0` with the prompt line
   "Match the painting style, brushwork and colour palette of image 0." The street-level districts (Refinery Row,
   the Long Quay, the Coast Road gate) also send the chosen map as `input_image_1` ("follow the street layout and
   rooflines of image 1"); crop it to that district first for a closer match. References at most 511 px a side.
4. **Same settings per type:** all district vignettes 1536×1024, same steps, same seed range. One variable at a time.
5. **Draft, pick, then final:** 8 cheap 512 px drafts per main image (3 per district), pick the composition, then the
   finals with those seeds (`--seeds 1003,1007`). `out/log.json` keeps the prompt, size, seed, guidance and references
   of every picture; the chosen one goes to `final/` and a row in `final/CHOSEN.md`, so the set can be redone exactly.
6. **Text:** AI lettering on maps is unreliable. The map is made **without labels**; labels go on afterwards in an
   editor from the list in section 6. The skyline may carry one title in quotes ("Ashford Roads") only if it comes
   out clean; otherwise add it in an editor too.
7. **Canon over invention:** nothing in a prompt may contradict section 4. Add detail, never new named places,
   factions or people.

## 4. Canon (from the owner's lore; keep as written)

- **Ashford Roads** ("Ashford" to everyone but the Compact): the home port of the Reach, grade F. A deepwater harbour,
  a Compact **refinery running day and night**, a **Bench office**, and **eleven thousand people** who mostly work for
  one or the other. Everything a crew needs is here, at a price, and everything they do is noticed.
- **The refinery** burns **brume**, the grey fog of unfixed Possibility lying on the open sea, into **charge**:
  refined brume in glass cells that lights lamps and runs lifts, pumps and engines. Brume is the power behind
  everything: binding, charge, spells.
- **Refinery Row:** the rich street, built where the refinery's heat keeps the fog off. The Tarrant house (charge-lamp
  importers) is here.
- **Sallow's Exchange:** the public information broker near the port. A counting-room full of pinned notices, a
  commissions board, and Odile Sallow (fox-kin, sharp-dressed) at the high desk.
- **The Binding House:** the Compact's licensed binding hall. A white hall, brass coils, glass cylinders of warm grey
  brume. People leave it classed; most leave with debt.
- **The Lantern and Lee:** the one inn on the quay that takes monsterkin. Cheap, loud, warm; run by Old Dunmore, a
  half-orc.
- **The Long Quay:** where the outbound ships berth.
- **The Coast Road:** the way in from the mainland, through the refinery's **ash fields**, to a gated city wall with
  notices pinned at the gate.
- **The Undercourses:** the sewers under Refinery Row: old stone culverts, warm with refinery run-off, full of rats,
  with a cistern under a street grate where one shaft of noon sun falls.
- **Powers:** the **Compact** (a chartered company that is a government in all but name: refinery, licences,
  insurance, Wardens, debt), the **Bench** (courts and record-keepers; owns the charts), the **Wrights** (a faith of
  makers; chapels keep the clocks). Two forces on the street: the underpaid city **Watch** and the well-paid Compact
  **Wardens**.
- **Sky ships** are new (about thirty years old), slow to build, and flown by the **brume engine**: rare, expensive,
  a sight people stop to watch.
- **People:** mostly Founding peoples (humans, dwarves, half-orcs), a beastkin quarter by the fish market, few fae,
  and monsterkin only on the quay.
- **Weather:** fog rolls in off the brume every night and burns off by mid-morning, except on Refinery Row. Night
  streets are pools of amber charge-light in grey.
- **Tone:** grim streets, hopeful crew. Industry made the dungeons; class lines show in clothes and streets.

## 5. The style block (identical in every prompt)

> Painterly gaslamp-fantasy illustration, Dungeonpunk: a soot-stained industrial harbour city of wet black stone,
> riveted brass and verdigris copper, lit by amber charge-lamps in drifting grey brume fog. Loose confident oil-paint
> brushwork over precise ink line, muted desaturated colours with warm light accents, atmospheric depth, high detail
> in the foreground, soft haze in the distance. A tabletop RPG sourcebook painting, grounded and lived-in.

Palette (hex, each tied to its object in the prompts):

| Colour | Hex | Used for |
|---|---|---|
| Soot black | `#1E1B18` | wet stone, shadows, coal smoke |
| Brass | `#B5893A` | pipes, fittings, lamp housings, gauges |
| Verdigris | `#4E8C7D` | copper roofs, domes, old gutters |
| Charge-lamp amber | `#F2A541` | every lamp, lit windows, the glow of charge cells |
| Refinery orange | `#D9622B` | furnace mouths and the refinery's light on the fog |
| Brume grey | `#9AA3A6` | the fog, the brume, the sea haze |
| Ledger paper | `#E6DCC3` | the map's paper, notices, sails |
| Blood rust | `#8C2A1C` | Compact banners, warning paint |

## 6. The map

An illustrated bird's-eye map of the whole city in one frame, on aged ledger paper, ink and watercolour wash, north
up, a compass rose and an empty title cartouche. Layout (from the lore; it fixes the geography for every other image):

- **West edge:** the **Coast Road** comes in from the mainland across grey **ash fields** to the **city gate** in the
  landward wall.
- **North-west:** the **refinery**: a walled complex of tall stacks and domed brume tanks, pipelines running down to
  its own pier. **Refinery Row** runs east from its gate: wide street, big houses, no fog.
- **Centre:** dense old town of steep roofs and narrow lanes, the **Bench office** (columned, a clock tower), a Wright
  chapel with a clock face, the **Binding House** (white, domed, brass coils on the roof).
- **South-east waterfront:** the harbour. The **Long Quay** juts out with tall ships berthed along it and one sky-ship
  mooring mast at its end; **Sallow's Exchange** stands just off the quay's landward end; the **Lantern and Lee**
  on the quay itself; the **fish market** with the beastkin quarter behind it.
- **Under it all:** culvert outfalls of the **Undercourses** open into the harbour below Refinery Row.
- **East, out to sea:** open water fading into brume at the map's edge.

Labels to add afterwards (in this spelling): Ashford Roads · The Coast Road · The Ash Fields · City Gate · The Refinery
· Refinery Row · The Bench · Wright Chapel · The Binding House · Sallow's Exchange · The Long Quay · The Lantern and Lee
· Fish Market · The Undercourses (outfalls) · The Reach (sea, east).

## 7. Running it

Node 20+, with `CLOUDFLARE_ACCOUNT_ID` and `CLOUDFLARE_API_TOKEN` (Workers AI permission) set in the environment, the
same names Gumbo's `cf_gen.py` uses.

**Day 1**

```bash
node ashford-roads-city/generate.mjs style_anchor skyline_key_art city_map --dry-run
```

```bash
node ashford-roads-city/generate.mjs style_anchor --draft --candidates 8
```

Show the owner the drafts, then make the finals with the chosen seeds:

```bash
node ashford-roads-city/generate.mjs style_anchor --seeds 1003,1007
```

Copy the pick to `ashford-roads-city/final/style_anchor.png`, then do the same for `skyline_key_art` and `city_map`.
Each sends the anchor as a reference; the runner shrinks it with `sharp` if installed, otherwise it prints a
one-line Python (Pillow) command that makes the 511 px copy.

**Day 2:** the districts, which read `final/style_anchor.png` and `final/city_map.png`:

```bash
node ashford-roads-city/generate.mjs districts --draft --candidates 3
```

```bash
node ashford-roads-city/generate.mjs districts --seeds 1001,1002,1003
```

```bash
node ashford-roads-city/generate.mjs --tally
```

Output goes to `ashford-roads-city/out/<id>/<seed>[_draft].<ext>` with `out/log.json`; `out/` is gitignored.
Commit only `final/`.

## 8. For D&D Beyond

- Formats JPG, PNG or WEBP; keep each file under 10 MB (the upload limit). Export finals as high-quality JPG or WEBP.
- The map goes into the campaign's **Maps** tool (labelled version); the skyline as the campaign banner; the
  vignettes in the campaign description or homebrew pages, one per district section.
- Keep an unlabelled map too, for a player version without secrets.

## 9. Review checklist (for each candidate)

- Matches the anchor's brushwork and palette; amber lamps and grey fog present; no clean modern look.
- Geography matches section 6 (refinery north-west, quay south-east, gate west).
- Nothing contradicts section 4 (no castles, no generic medieval village, no neon, no cars).
- Architecture is gaslit industrial: brick, black stone, iron, brass, copper; ships with masts; at most one sky ship
  per image unless the image is about the quay.
- No garbled lettering (if any appears, pick another candidate or paint it out).
