# Ashford Roads: city art and map for D&D Beyond (Cloudflare prompt pack)

A brief for the session that has Cloudflare Workers AI connected (Halcrya Lead 2). It makes the art for a D&D
Beyond page about **Ashford Roads**, the home port of the owner's Wayfinder setting, drawn as a **D&D steampunk
city**: the owner's words for the world are **Dungeonpunk** and **Gaslit fantasy**.

Machine-readable prompts: [`prompts.json`](prompts.json). Runner: [`generate.mjs`](generate.mjs). Written 19 Nov 2026
from the Ashford lore in `possibilities-act1/data/lore/` and the answers on the Ashford Roads Decisions page
(`possibilities-act1/docs/decisions/ANSWERS.md`). **Add your own Halcyra art research where it sharpens a prompt;
keep the canon list below as it is.**

## 1. What to make

| # | Id | Image | Size (px) | Why |
|---|---|---|---|---|
| 0 | `style_anchor` | A style swatch: one painted vignette of a brass-and-soot Ashford street corner at dusk, with the palette shown as paint chips along the bottom | 1024×1024 | Reference image for every later call (downscaled to 512×512) |
| 1 | `skyline_key_art` | Ashford from the harbour at dusk: refinery stacks, Long Quay, one airship, fog | 2048×1152 | Page banner / hero image |
| 2 | `city_map` | Illustrated bird's-eye city map, no labels | 1920×1920 | The D&D Beyond map (labels added afterwards) |
| 3 | `refinery_row` | District vignette | 1536×1024 | Section art |
| 4 | `sallows_exchange` | Interior: the information broker's counting-room | 1536×1024 | Section art |
| 5 | `long_quay` | The outbound quay, ships and gangways, an airship mast | 1536×1024 | Section art |
| 6 | `binding_house` | Interior: the Compact's binding hall | 1536×1024 | Section art |
| 7 | `lantern_lee` | The one quay inn that takes monsterkin | 1536×1024 | Section art |
| 8 | `undercourses` | The sewers under Refinery Row (the dungeon) | 1536×1024 | Section art |
| 9 | `coast_road_gate` | The Coast Road through the ash fields to the city gate | 1536×1024 | Section art |

All sizes are multiples of 16 and at most 4 megapixels (FLUX.2's limit). Make them in this order: the anchor first,
then the skyline, then the map, then the districts. Each later image takes the anchor (and, for the districts, the
map) as reference images.

## 2. Model and settings (Cloudflare Workers AI)

- **Model:** `@cf/black-forest-labs/flux-2-dev`. It takes structured JSON prompts and hex colours, and up to
  4 reference images (`input_image_0` … `input_image_3`, 512×512 each), sent as multipart form data. Output is base64
  in `image`, up to 4 MP.
- **Settings to lock for the whole set:** `steps` 28, the same `width`/`height` per image type, and `guidance` and
  `seed` **if your account accepts them**. Cloudflare's model page doesn't list `seed` or `guidance` for FLUX.2
  [dev], so run `node generate.mjs --probe` first. It sends one small request with and without them and reports
  which fields are accepted. If `seed` is refused, consistency comes from the reference images and the fixed style
  block, and you pick the best of several runs.
- **FLUX.2 has no negative prompt.** State what you want ("crisp ink linework, clean margins"), never "no blur".
  Earlier words weigh more: subject first, then style, then context.
- **Fast drafts:** `@cf/black-forest-labs/flux-2-klein-9b` (4 fixed steps) for composition tests only; final art on
  `flux-2-dev`. FLUX.1 [schnell] is not used: it caps at 8 steps and handles hex palettes and references poorly.

## 3. Consistency rules

1. **One style block, verbatim, in every prompt** (the `style` and `color_palette` fields in `prompts.json`). Change
   only the `scene`, `subjects`, `composition` and `camera` fields between images.
2. **Hex colours tied to objects**, not "use these colours": FLUX.2 matches a hex code best when it's named next to
   the thing it colours ("charge-lamp glow color #F2A541").
3. **Reference images:** after the anchor is chosen, every call sends it as `input_image_0` with the prompt line
   "Match the painting style, brushwork and colour palette of image 0." The district calls also send the chosen
   map, cropped to that district and downscaled, as `input_image_1` ("the layout and rooflines of image 1"). Keep
   references at 512×512 or smaller.
4. **Same settings per type:** all district vignettes 1536×1024, same steps, same seed range. One variable at a time.
5. **Pick and log:** run 3-4 candidates per image (seeds `1001`-`1004`, or repeated runs). `generate.mjs` writes
   `log.json` with the prompt, settings, seed and file of every run. The chosen one is copied to `final/`, so the
   set can be redone exactly.
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

On a machine with Node 20+ and `CF_ACCOUNT_ID` and `CF_API_TOKEN` (Workers AI permission) set in the environment:

```bash
node ashford-roads-city/generate.mjs --probe
```

```bash
node ashford-roads-city/generate.mjs style_anchor --candidates 4
```

Pick the best anchor and copy it to `ashford-roads-city/final/style_anchor.png`, then:

```bash
node ashford-roads-city/generate.mjs skyline_key_art city_map --candidates 4
```

Pick, copy to `final/`, then the districts (they read `final/style_anchor.png` and `final/city_map.png`):

```bash
node ashford-roads-city/generate.mjs districts --candidates 3
```

Output goes to `ashford-roads-city/out/<id>/<seed>.png` with `out/log.json`. `out/` is gitignored; commit only
`final/`.

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
