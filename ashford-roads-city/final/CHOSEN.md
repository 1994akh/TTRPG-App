# Chosen images

| Image | File | Seed / run | Notes |
|---|---|---|---|
| city_map | final/city_map.jpg (1920x1920 JPEG, 3.1 MB) | seed 1207, round 3, full size, layout reference refs/city_map_layout.png | Chosen by the owner, 18 Nov 2026 (ET): "23 and 20", then "Good enough for Ashford, you can stop". Round 3 draft #23, made at full size. |

## How the city map was made (18 Nov 2026, ET)

- Model: @cf/black-forest-labs/flux-2-klein-4b on the Cloudflare free allowance. About 1,720 neurons in all (drafts 3 rounds x 8, plus 2 full-size finals).
- Round 1 (seeds 1001-1008): refined map prompt, no reference. Good layouts, but little steampunk and fake labels.
- Round 2 (seeds 1101-1108), after the owner asked "Where is the steam punk elements and sky ships.": airships and steampunk moved to the front of the prompt. Strong steampunk, but the layouts drifted.
- Round 3 (seeds 1201-1208), owner: "Round 3": round 1's #3 (seed 1003, fake labels painted out) used as a layout reference (refs/city_map_layout.png) with round 2's prompt. Best of the three rounds.
- Finals: seeds 1207 (#23) and 1204 (#20) at 1920x1920. The full-size images recomposed compared with their drafts. The independent check preferred 1207 for canon.

Known gaps in the chosen map (left as is, owner: "Good enough"):
- No airship is moored at a pier-tip mast, and no mast is drawn.
- The model drew its own compass rose (top left, with a small stray mark on its east point), a blank title box at the top and a ruled border. Cover or paint these out when the labels from PROMPTS.md section 6 go on as an overlay.
- The south-east quay is shorter than the brief's Long Quay.

Other candidates are kept locally in out/ (not committed): all 24 drafts and the 1204 final.
