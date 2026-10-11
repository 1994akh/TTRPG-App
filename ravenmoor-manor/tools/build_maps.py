"""Build Ravenmoor Manor maps (3 stacked levels) plus Foundry scene data.

Run:  python3 tools/build_maps.py
Writes assets/maps/*.webp, assets/tiles/*.webp, assets/previews/*.png and data/scenes/*.json
"""
import json
import math
import os
import sys

import numpy as np
from PIL import Image, ImageDraw, ImageFilter

sys.path.insert(0, os.path.dirname(__file__))
from maplib import (G, W, H, PW, PH, P, R, C, Level, Painter, compute_walls, draw_walls, composite,
                    apply_glows, grain, font, tex_grass, tex_gravel, tex_dirt, tex_rock, tex_wood, tex_flag,
                    tex_checker, tex_marble, tex_water, tex_hay, tex_roof, noise, WOOD, WOOD_D, STONE, STONE_D, IRON, GOLD)

ROOT = os.path.join(os.path.dirname(__file__), "..")
OUT_MAPS = os.path.join(ROOT, "assets", "maps")
OUT_TILES = os.path.join(ROOT, "assets", "tiles")
OUT_PREV = os.path.join(ROOT, "assets", "previews")
OUT_DATA = os.path.join(ROOT, "data", "scenes")

FLOORS = {
    "wood": lambda h, w, s: tex_wood(h, w, s),
    "wood_dark": lambda h, w, s: tex_wood(h, w, s, base=(88, 58, 36)),
    "wood_v": lambda h, w, s: tex_wood(h, w, s, vertical=True),
    "wood_light": lambda h, w, s: tex_wood(h, w, s, base=(140, 100, 62)),
    "flag": lambda h, w, s: tex_flag(h, w, s),
    "flag_dark": lambda h, w, s: tex_flag(h, w, s, base=(92, 90, 88), size=70),
    "crypt": lambda h, w, s: tex_flag(h, w, s, base=(84, 86, 90), size=80, jitter=0.12, mortar=0.45),
    "tile": lambda h, w, s: tex_checker(h, w, s, (150, 138, 118), (122, 110, 92)),
    "marble": lambda h, w, s: tex_marble(h, w, s),
    "earth": lambda h, w, s: tex_dirt(h, w, s),
    "hay": lambda h, w, s: tex_hay(h, w, s),
    "cellar": lambda h, w, s: tex_flag(h, w, s, base=(86, 74, 62), size=55, jitter=0.14, mortar=0.4),
}


# ======================================================================
#  GROUND FLOOR & GROUNDS
# ======================================================================
def ground_level():
    L = Level("ground", "Ground Floor & Grounds")
    rm = L.room
    rm("long_gallery", "Long Gallery", (16, 6, 32, 10), "wood_dark")
    rm("library", "Library", (10, 6, 16, 14), "wood")
    rm("stair_hall", "Stair Hall", (10, 14, 16, 19), "flag")
    rm("drawing_room", "Drawing Room", (10, 19, 21, 24), "wood_light")
    rm("foyer", "Foyer", (21, 19, 27, 24), "marble")
    rm("office", "Housekeeper's Office", (27, 19, 32, 24), "wood")
    rm("great_hall", "Great Hall", (16, 10, 32, 19), "flag")
    rm("kitchen", "Kitchen", (32, 6, 38, 12), "tile")
    rm("shaft", "Hidden Shaft (walled)", (37, 9, 38, 12), "solid", kind="solid")
    rm("scullery", "Scullery", (32, 12, 38, 16), "tile")
    rm("east_corridor", "East Corridor", (32, 16, 38, 19), "flag")
    rm("servants_stair", "Servants' Stair", (32, 19, 38, 24), "wood")
    rm("chapel", "Chapel", (38, 8, 46, 18), "flag_dark")
    rm("stables", "Stables", (1, 5, 9, 15), "hay")

    e = L.edge
    # doors ------------------------------------------------------------
    e("h", 24, 23, 25, "double", "Front doors")
    e("h", 19, 23, 25, "double", "Great Hall doors")
    e("v", 21, 21, 22, "door", "Foyer / Drawing Room")
    e("v", 27, 21, 22, "door", "Foyer / Office")
    e("v", 32, 21, 22, "door", "Office / Servants' Stair")
    e("h", 19, 14, 15, "door", "Drawing Room / Stair Hall")
    e("v", 16, 16, 17, "door", "Stair Hall / Great Hall")
    e("h", 14, 14, 15, "door", "Stair Hall / Library")
    e("v", 16, 7, 8, "door", "Library / Long Gallery")
    e("h", 10, 19, 20, "door", "Long Gallery / Great Hall (west)")
    e("h", 10, 28, 29, "door", "Long Gallery / Great Hall (east)")
    e("v", 32, 7, 8, "door", "Long Gallery / Kitchen")
    e("h", 6, 35, 36, "door", "Kitchen back door")
    e("h", 12, 33, 34, "door", "Kitchen / Scullery")
    e("h", 16, 34, 35, "door", "Scullery / East Corridor")
    e("v", 32, 17, 18, "door", "East Corridor / Great Hall")
    e("v", 38, 16, 17, "door", "East Corridor / Chapel")
    e("h", 19, 34, 35, "door", "East Corridor / Servants' Stair")
    e("h", 18, 41, 43, "double", "Chapel south doors")
    e("h", 15, 4, 6, "double", "Stable doors")
    # windows ----------------------------------------------------------
    for (o, line, a, b) in [("v", 10, 8, 9), ("v", 10, 11, 12), ("v", 10, 15, 16), ("v", 10, 21, 22),
                            ("h", 24, 13, 14), ("h", 24, 17, 18), ("h", 24, 29, 30), ("h", 24, 35, 36),
                            ("h", 6, 19, 20), ("h", 6, 24, 25), ("h", 6, 28, 29), ("h", 6, 33, 34),
                            ("v", 38, 6, 7), ("v", 38, 21, 22), ("v", 46, 10, 11), ("v", 46, 14, 15),
                            ("h", 8, 40, 41), ("h", 18, 39, 40), ("h", 18, 44, 45), ("v", 1, 8, 9), ("v", 1, 11, 12)]:
        e(o, line, a, b, "window")

    p = Painter(seed=11)
    # ---- grounds (objects)
    for (x, y, r) in [(2.5, 2.2, 1.6), (6.5, 1.6, 1.3), (13.5, 2.4, 1.7), (19, 1.8, 1.2), (30, 2.0, 1.5),
                      (42.5, 2.3, 1.8), (46.6, 6.0, 1.4), (46.8, 21.5, 1.5), (45.5, 34.6, 1.3), (30.5, 33.5, 1.6),
                      (16.5, 33.0, 1.7), (14.0, 27.0, 1.2), (2.2, 19.5, 1.4), (1.4, 34.6, 1.2), (31.2, 27.0, 1.0)]:
        p.tree(x, y, r)
    p.hedge(18.6, 24.6, 20.6, 25.5)
    p.hedge(27.4, 24.6, 29.4, 25.5)
    for y in (31.8, 33.2, 34.6):                         # jack-o'-lanterns lining the drive
        p.pumpkin(21.5, y, 0.24, lit=True)
        p.pumpkin(26.5, y, 0.24, lit=True)
        L.lights.append(dict(x=21.5, y=y, dim=10, bright=0, color="#ff8a2a", anim="torch", label="Jack-o'-lantern"))
        L.lights.append(dict(x=26.5, y=y, dim=10, bright=0, color="#ff8a2a", anim="torch", label="Jack-o'-lantern"))
    for (x, y) in [(23.0, 25.2), (25.0, 25.2)]:
        p.lantern_post(x, y)
        L.lights.append(dict(x=x, y=y, dim=20, bright=5, color="#ffc46b", anim="torch", label="Door lantern"))
    # pond, memorial and Bramwell's warding lanterns
    for k in range(6):
        a = k * math.pi / 3 + 0.3
        x, y = 6 + 5.2 * math.cos(a), 28.5 + 4.2 * math.sin(a)
        p.lantern_post(x, y, (255, 214, 140), 30)
        L.lights.append(dict(x=x, y=y, dim=10, bright=0, color="#ffd27a", anim="torch", label="Warding lantern"))
    p.stone_slab(11.4, 30.6)
    for (x, y) in [(2.2, 27.0), (2.0, 30.4), (9.6, 26.0), (9.9, 31.2), (5.0, 32.4), (7.6, 24.9)]:
        for k in range(5):
            p.o.line([P(x + k * 0.07), P(y), P(x + k * 0.07 + 0.05), P(y - 0.35)], fill=(96, 110, 52, 255), width=3)
    # pumpkin patch
    rng = np.random.default_rng(5)
    for _ in range(46):
        x, y = rng.uniform(34.5, 45.5), rng.integers(27, 34) + 0.5
        if (abs(x - 37.2) < 0.6 and abs(y - 28.5) < 0.6) or (abs(x - 41.5) < 0.6 and abs(y - 30.5) < 0.6) or (abs(x - 44.5) < 1.0 and abs(y - 28.5) < 0.8):
            continue
        p.pumpkin(x, y + rng.uniform(-0.15, 0.15), rng.uniform(0.15, 0.3))
    p.post(37.2, 28.5)
    p.post(41.5, 30.5)
    p.scarecrow(44.5, 28.5)
    for x in np.arange(34, 46.01, 1.0):
        p.post(x, 26.0)
        p.post(x, 34.0)
    for y in np.arange(26, 34.01, 1.0):
        p.post(34.0, y)
        p.post(46.0, y)
    p.rect(34, 25.95, 46, 26.05, (90, 62, 36, 255), None)
    p.rect(34, 33.95, 46, 34.05, (90, 62, 36, 255), None)
    p.rect(33.95, 26, 34.05, 34, (90, 62, 36, 255), None)
    p.rect(45.95, 26, 46.05, 34, (90, 62, 36, 255), None)
    # stables
    for y in (6.0, 8.5, 11.0):
        p.rect(1.1, y, 4.0, y + 0.12, WOOD_D, None)
    p.rect(3.9, 5.1, 4.02, 13.4, WOOD_D, None)
    p.carriage(5.4, 8.6, 8.2, 13.6)
    for (x0, y0) in [(1.3, 13.4), (2.4, 13.4)]:
        p.rect(x0, y0, x0 + 1.0, y0 + 1.4, (196, 168, 80, 255), (120, 96, 40, 255), 3)
    p.lantern_post(4.6, 14.2)
    L.lights.append(dict(x=4.6, y=14.2, dim=15, bright=5, color="#ffc46b", anim="torch", label="Stable lantern"))

    # ---- interiors
    # Long gallery: runner, portraits, armour
    p.rug(16.4, 7.4, 31.6, 8.6, (92, 28, 30))
    for x in (18, 21.5, 26.5, 30):
        p.frame(x - 0.6, 6.12, x + 0.6, 6.32)
        p.frame(x - 0.6, 9.68, x + 0.6, 9.88)
    p.armor(16.7, 6.7)
    p.armor(31.3, 6.7)
    # Library
    p.bookcase(10.15, 6.15, 15.85, 6.6)
    p.bookcase(10.15, 6.7, 10.6, 7.8)
    p.bookcase(10.15, 9.2, 10.6, 10.8)
    p.bookcase(10.15, 12.2, 10.6, 13.85)
    p.rug(11.4, 8.2, 15.2, 12.6, (40, 64, 50))
    p.table(12.3, 9.6, 14.6, 10.8)                    # family records desk (H5, C11)
    p.chair(13.45, 11.25, back="s")
    p.armchair(11.6, 12.6, back="s")
    p.fireplace(11.6, 13.35, 13.0, 13.9, facing="n")
    L.lights.append(dict(x=12.3, y=13.5, dim=20, bright=10, color="#ff9a45", anim="torch", label="Library fire"))
    p.frame(15.62, 10.6, 15.86, 12.8, (40, 70, 58))  # Elspeth's portrait, green lantern
    p.circle(14.9, 7.4, 0.3, (60, 90, 110, 255), GOLD, 3)
    p.candle(14.2, 9.9)
    # Stair hall
    p.stairs(10.1, 14.1, 13.0, 18.9, up="n")
    p.rug(13.4, 15.0, 15.7, 18.4, (100, 32, 36))
    p.armor(15.5, 14.5)
    # Drawing room
    p.rug(12.0, 20.0, 19.2, 23.3, (70, 36, 60))
    p.fireplace(17.0, 19.15, 19.0, 19.7, facing="s")
    L.lights.append(dict(x=18.0, y=19.5, dim=20, bright=10, color="#ff9a45", anim="torch", label="Drawing room fire"))
    p.sofa(12.6, 22.3, 15.6, 23.1)
    p.sofa(16.0, 22.3, 18.8, 23.1, (60, 70, 92, 255))
    p.table(14.6, 20.9, 16.4, 21.7)
    p.armchair(11.0, 20.6, back="w")
    p.table(19.6, 20.2, 20.6, 21.2, cloth=(40, 80, 50, 255))
    # Foyer
    p.table(23.4, 21.0, 24.6, 22.2, cloth=(90, 30, 32, 255))
    p.pumpkin(24.0, 21.6, 0.26, lit=True)
    p.armor(22.0, 19.6)
    p.armor(26.0, 19.6)
    L.lights.append(dict(x=24.0, y=21.6, dim=15, bright=5, color="#ffa64d", anim="torch", label="Foyer centrepiece"))
    # Office
    p.table(28.2, 21.6, 30.6, 22.6)
    p.chair(29.4, 23.0, back="s")
    p.shelves(27.2, 19.15, 31.8, 19.55)
    p.shelves(31.45, 22.6, 31.85, 23.85)
    p.candle(28.6, 21.9)
    # Great Hall
    p.rug(18.0, 13.0, 30.0, 16.0, (88, 26, 28))
    p.table(18.5, 13.6, 29.5, 15.4, cloth=(206, 196, 172, 255), items=14)
    for x in np.arange(19.2, 29.0, 1.25):
        p.chair(x, 13.25, back="n")
        p.chair(x, 15.75, back="s")
    p.chair(30.0, 14.5, 0.5, back="e", color=(90, 30, 30, 255))   # Silas's chair at the head
    p.chair(18.0, 14.5, back="w")
    for x in (21.0, 24.0, 27.0):
        p.candelabra(x, 14.5)
        L.lights.append(dict(x=x, y=14.5, dim=15, bright=5, color="#ffb35c", anim="torch", label="Feast candelabra", group="hall_candles"))
    p.fireplace(16.15, 12.0, 16.85, 14.4, facing="e")
    L.lights.append(dict(x=16.5, y=13.2, dim=30, bright=10, color="#ff9a45", anim="torch", label="Great Hall fire", group="hall_candles"))
    for x in (17.5, 20.5, 23.5, 26.5, 29.5):          # posts carrying the minstrels' gallery above
        p.pillar(x, 11.95, 0.22)
    for (x, y) in [(16.5, 18.5), (31.5, 18.5), (31.5, 10.5)]:
        p.candelabra(x, y)
        L.lights.append(dict(x=x, y=y, dim=15, bright=5, color="#ffb35c", anim="torch", label="Hall candelabra", group="hall_candles"))
    # Kitchen
    p.fireplace(32.15, 9.6, 32.9, 11.6, facing="e")
    L.lights.append(dict(x=32.5, y=10.6, dim=25, bright=10, color="#ff9a45", anim="torch", label="Kitchen hearth"))
    p.table(33.6, 8.0, 35.6, 9.0, items=3)
    p.shelves(32.2, 6.15, 34.9, 6.55)
    p.barrel(36.5, 6.6)
    p.barrel(36.5, 7.5, 0.28)
    p.stairs(35.05, 10.05, 36.95, 11.95, up="n", base=(110, 100, 90))   # down to the wine cellar
    # Scullery
    p.basin(36.6, 12.4, 37.8, 14.4)
    p.table(34.9, 13.2, 36.1, 14.0)                   # Mrs. Crane's tonic tray (C6)
    p.circle(35.5, 13.6, 0.08, (210, 230, 235, 255), (90, 110, 120, 255), 2)
    p.barrel(32.6, 15.3, 0.28)
    p.shelves(32.15, 12.6, 32.55, 14.6)
    # East corridor
    p.rug(32.6, 17.0, 37.4, 18.0, (80, 30, 32))
    p.candle(37.6, 16.4)
    # Servants' stair
    p.stairs(35.05, 20.05, 37.95, 23.95, up="s", base=(116, 82, 50))
    p.shelves(32.15, 23.4, 34.6, 23.85)
    # Chapel
    for x in (39.3, 40.5, 41.7, 42.9):
        p.pew(x, 8.9, x + 0.45, 12.0)
        p.pew(x, 14.0, x + 0.45, 17.1)
    p.rect(44.6, 11.6, 45.7, 14.4, (150, 144, 134, 255), STONE_D, 4)                # altar
    p.rect(44.75, 11.8, 45.55, 14.2, (220, 214, 200, 255), None)
    for y in (12.2, 13.0, 13.8):
        p.candle(45.15, y)
    L.lights.append(dict(x=45.2, y=13.0, dim=20, bright=5, color="#ffc46b", anim="torch", label="Altar candles"))
    p.stairs(44.05, 8.05, 45.95, 10.95, up="s", base=(104, 100, 94))               # down to the crypt
    p.rug(38.3, 12.3, 44.5, 13.7, (70, 22, 26))

    # map notes (journal pins) and DM key ---------------------------------
    L.notes = [
        (1, 24, 31, "Drive & jack-o'-lanterns", "drive"), (2, 24.6, 22.9, "Foyer", "foyer"),
        (3, 21.0, 17.6, "Great Hall", "great_hall"), (4, 24.0, 8.0, "Long Gallery", "long_gallery"),
        (5, 14.6, 12.7, "Library", "library"), (6, 14.6, 16.6, "Stair Hall", "stair_hall"),
        (7, 13.6, 21.2, "Drawing Room", "drawing_room"), (8, 29.4, 20.6, "Housekeeper's Office", "office"),
        (9, 34.6, 10.5, "Kitchen (cellar stairs)", "kitchen"), (10, 34.0, 14.9, "Scullery", "scullery"),
        (11, 35.0, 17.5, "East Corridor", "east_corridor"), (12, 33.4, 21.5, "Servants' Stair", "servants_stair"),
        (13, 41.2, 13.0, "Chapel (crypt stairs)", "chapel"), (14, 2.5, 10.0, "Stables", "stables"),
        (15, 6.0, 28.5, "Pond & Elspeth's memorial", "pond"), (16, 42.6, 32.4, "Pumpkin patch", "pumpkin_patch"),
    ]
    L.secret_notes = [(17, 37.5, 10.5, "Hidden shaft (inside the wall)")]
    L.note_parents = {17: "kitchen"}
    L.clues = [("H5", 13.4, 9.3), ("C11", 11.0, 7.4), ("C6", 35.5, 13.15), ("C5", 36.4, 21.6), ("C9", 39.3, 29.4), ("C12", 6.8, 11.0)]
    L.tokens = [  # (actor, col, row) — Act 1 feast and arrival
        ("Lord Silas Ravenmoor", 30, 14), ("Dr. Thaddeus Quill", 28, 12), ("Lady Morwenna Ravenmoor", 28, 16),
        ("Edric Ravenmoor", 25, 12), ("Penelope \"Pip\" Ravenmoor", 22, 16), ("Mrs. Agatha Crane", 31, 16),
        ("Bramwell Hatch", 24, 26)]
    L.party_start = (23, 33)
    L.regions = [
        dict(name="Main stair", rect=(10, 14, 13, 19), to="upper"),
        dict(name="Servants' stair", rect=(35, 20, 38, 24), to="upper"),
        dict(name="Cellar stairs", rect=(35, 10, 37, 12), to="below"),
        dict(name="Crypt stairs", rect=(44, 8, 46, 11), to="below"),
    ]
    L.tiles = [
        dict(file="evidence-bootprint.webp", rect=(35.9, 21.2, 36.9, 22.2), hidden=True,
             label="C5 buckled boot print (show from Act 2)"),
    ]
    L.outside = "grounds"
    L.painter = p
    return L


# ======================================================================
#  UPPER FLOOR
# ======================================================================
def upper_level():
    L = Level("upper", "Upper Floor")
    rm = L.room
    rm("silas_room", "Silas's Bedchamber", (10, 6, 16, 11), "wood")
    rm("landing", "Upper Landing", (10, 11, 16, 19), "wood")
    rm("quill_room", "Dr. Quill's Room", (16, 6, 21, 10), "wood")
    rm("pip_room", "Pip's Room", (21, 6, 26, 10), "wood_light")
    rm("morwenna_room", "Lady Morwenna's Room", (26, 6, 32, 10), "wood")
    rm("gallery", "Minstrels' Gallery", (16, 10, 32, 12), "wood_dark")
    rm("hall_void", "Open to the Great Hall", (16, 12, 32, 19), "void", kind="void")
    rm("linen", "Linen Closet", (32, 6, 34, 10), "wood")
    rm("east_corridor_up", "East Corridor", (32, 10, 34, 19), "wood_dark")
    rm("study", "Study", (34, 6, 38, 13), "wood")
    rm("hidden_stair", "Hidden Stair", (37, 9, 38, 12), "flag_dark")
    rm("crane_room", "Mrs. Crane's Room", (34, 13, 38, 19), "wood")
    rm("servants_stair_up", "Servants' Stair (head)", (32, 19, 38, 24), "wood")

    e = L.edge
    e("h", 11, 12, 13, "door", "Landing / Silas's Bedchamber")
    e("v", 16, 11, 12, "door", "Landing / Gallery")
    e("h", 10, 18, 19, "door", "Gallery / Quill's Room")
    e("h", 10, 23, 24, "door", "Gallery / Pip's Room")
    e("h", 10, 28, 29, "door", "Gallery / Morwenna's Room")
    e("v", 32, 10, 11, "door", "Gallery / East Corridor")
    e("h", 10, 32, 33, "door", "Linen Closet")
    e("v", 34, 11, 12, "door", "East Corridor / Study")
    e("v", 34, 15, 16, "door", "East Corridor / Mrs. Crane's Room")
    e("h", 19, 32, 34, "open", None)
    e("h", 12, 16, 32, "rail", "Gallery railing")
    e("v", 37, 10, 11, "secret", "Bookcase (secret door)")
    for (o, line, a, b) in [("h", 6, 12, 13), ("v", 10, 8, 9), ("h", 6, 18, 19), ("h", 6, 23, 24), ("h", 6, 28, 29),
                            ("h", 6, 35, 36), ("v", 10, 16, 17), ("v", 38, 15, 16), ("v", 38, 21, 22), ("v", 38, 6, 7)]:
        e(o, line, a, b, "window")

    p = Painter(seed=23)
    # Silas's bedchamber
    p.rug(11.0, 7.2, 15.2, 10.4, (60, 30, 50))
    p.bed(12.2, 6.2, 14.6, 8.9, blanket=(70, 30, 60, 255), head="n", posts=True)
    p.shelves(10.15, 9.0, 10.55, 10.85)
    p.table(14.9, 6.2, 15.8, 6.9)
    # Landing
    p.stairs(10.05, 14.05, 12.95, 18.95, up="n")
    p.rug(13.4, 12.0, 15.6, 18.4, (100, 32, 36))
    p.frame(10.12, 11.6, 10.32, 13.4)
    p.candle(15.6, 18.6)
    L.lights.append(dict(x=15.6, y=18.6, dim=10, bright=0, color="#ffb35c", anim="torch", label="Landing candle"))
    # Quill's room: unused bed, cold hearth, desk with green wax (C10) and notebook (H4)
    p.bed(16.2, 6.2, 17.9, 8.6, blanket=(40, 60, 70, 255), head="n")
    p.table(18.6, 6.2, 20.6, 7.0)
    p.rect(19.6, 6.4, 19.9, 6.55, (40, 110, 70, 255), None)            # green wax stick
    p.rect(18.9, 6.35, 19.4, 6.75, (210, 200, 170, 255), (110, 96, 70, 255), 2)
    p.chair(19.6, 7.4, back="s")
    p.fireplace(20.2, 8.7, 20.85, 9.85, facing="w", lit=False)
    p.crate(16.3, 8.9, 17.1, 9.7)
    # Pip's room: messy bed, spell notes (C13), ink spill
    p.bed(21.2, 6.2, 23.0, 8.6, blanket=(90, 60, 110, 255), head="n", messy=True)
    p.table(23.6, 6.2, 25.8, 7.0)
    for k in range(4):
        p.rect(23.8 + k * 0.45, 6.3, 24.15 + k * 0.45, 6.75, (226, 218, 196, 255), (120, 110, 90, 255), 1)
    p.circle(24.6, 7.25, 0.18, (20, 20, 40, 230), layer="d")             # ink spill
    p.chair(24.7, 7.45, back="s")
    p.candle(25.5, 6.6)
    L.lights.append(dict(x=25.5, y=6.6, dim=10, bright=0, color="#ffb35c", anim="torch", label="Pip's candle"))
    p.shelves(25.45, 7.6, 25.85, 9.8)
    # Morwenna's room
    p.rug(26.6, 7.0, 31.4, 9.6, (40, 30, 40))
    p.bed(29.0, 6.2, 31.8, 8.8, blanket=(20, 20, 24, 255), head="n", posts=True)
    p.table(26.3, 6.2, 27.9, 6.9, cloth=(70, 50, 60, 255))
    p.sofa(26.3, 8.6, 27.1, 9.85, (40, 34, 46, 255))
    p.candle(27.1, 6.55)
    L.lights.append(dict(x=27.1, y=6.55, dim=10, bright=0, color="#ffb35c", anim="torch", label="Vanity lamp"))
    # Gallery
    for x in (17.5, 20.5, 23.5, 26.5, 29.5):
        p.pillar(x, 11.9, 0.18)
    for x in (21.0, 22.0, 26.8):
        p.chair(x, 10.8, back="n")
    p.candle(16.5, 10.3)
    p.candle(31.5, 10.3)
    L.lights.append(dict(x=24.0, y=10.6, dim=15, bright=0, color="#ffb35c", anim="torch", label="Gallery sconces", group="hall_candles"))
    # Linen, corridor
    p.shelves(32.15, 6.15, 32.55, 9.85)
    p.shelves(33.45, 6.15, 33.85, 9.85)
    p.rug(32.3, 11.0, 33.7, 18.6, (80, 30, 32))
    # Study (the crime scene)
    p.rug(34.7, 7.6, 36.8, 11.6, (110, 30, 32))
    p.bookcase(34.15, 6.15, 34.6, 10.85)
    p.bookcase(36.55, 6.15, 36.95, 8.85)
    p.bookcase(36.5, 9.05, 36.95, 11.95)          # the secret bookcase in front of the hidden stair
    p.table(35.0, 8.5, 36.3, 9.4)                 # desk: lockbox and lilies
    p.rect(35.15, 8.62, 35.55, 8.92, IRON, (10, 10, 12, 255), 2)
    for k in range(3):
        p.circle(35.95 + k * 0.08, 8.75, 0.06, (240, 240, 232, 255), (160, 160, 150, 255), 1)
    p.armchair(35.65, 9.95, color=(90, 30, 30, 255), back="s")
    p.fireplace(34.8, 12.35, 36.2, 12.9, facing="n")
    L.lights.append(dict(x=35.5, y=12.6, dim=20, bright=10, color="#ff9a45", anim="torch", label="Study fire"))
    p.stairs(37.08, 9.08, 37.92, 11.92, up="s", base=(90, 84, 78))      # hidden stair heads down
    # Mrs. Crane's room
    p.bed(36.3, 13.2, 37.8, 15.3, blanket=(60, 60, 64, 255), head="n")
    p.table(34.3, 17.5, 35.6, 18.6)
    p.shelves(37.45, 16.0, 37.85, 18.8)
    # Servants' stair head
    p.stairs(35.05, 20.05, 37.95, 23.95, up="s", base=(116, 82, 50))

    L.notes = [
        (1, 14.6, 15.2, "Upper Landing", "landing"), (2, 13.2, 9.8, "Silas's Bedchamber", "silas_room"),
        (3, 18.3, 8.6, "Dr. Quill's Room", "quill_room"), (4, 22.2, 9.3, "Pip's Room", "pip_room"),
        (5, 28.3, 9.3, "Lady Morwenna's Room", "morwenna_room"), (6, 19.0, 11.0, "Minstrels' Gallery", "gallery"),
        (7, 24.0, 15.5, "Open to the Great Hall below", None), (8, 33.0, 14.0, "East Corridor", "east_corridor_up"),
        (9, 35.2, 7.2, "Study", "study"), (10, 35.6, 16.0, "Mrs. Crane's Room", "crane_room"),
        (11, 33.4, 21.6, "Servants' Stair (head)", "servants_stair_up"), (12, 33.0, 7.0, "Linen Closet", "linen"),
    ]
    L.secret_notes = [(13, 37.5, 10.5, "Hidden stair behind the bookcase")]
    L.clues = [("C1", 35.65, 10.45), ("C2", 35.6, 6.9), ("C3", 36.2, 10.6), ("C4", 24.5, 11.6), ("H4", 18.9, 6.9), ("C10", 20.1, 6.9), ("C13", 24.4, 6.85)]
    L.tokens = [("Lord Silas Ravenmoor (body, Act 2)", 35, 9, True)]   # hidden until Scene 5
    L.note_parents = {7: "great_hall", 13: "study"}
    L.party_start = None
    L.regions = [
        dict(name="Main stair", rect=(10, 14, 13, 19), to="ground"),
        dict(name="Servants' stair", rect=(35, 20, 38, 24), to="ground"),
        dict(name="Hidden stair", rect=(37, 9, 38, 12), to="below"),
    ]
    L.tiles = [
        dict(file="evidence-footprints.webp", rect=(35.2, 6.25, 36.4, 8.5), hidden=True, label="C2 wet footprints (show at Scene 5)"),
        dict(file="evidence-lilies.webp", rect=(34.6, 9.3, 36.4, 11.4), hidden=True, label="Scattered lilies (show at Scene 5)"),
        dict(file="evidence-foxfire.webp", rect=(23.0, 11.6, 26.0, 12.4), hidden=True, label="C4 foxfire smears (show after the ghost)"),
    ]
    L.outside = "transparent"
    L.roofs = [((10, 19, 32, 24), "h"), ((38, 8, 46, 18), "v"), ((1, 5, 9, 15), "v")]
    L.painter = p
    return L


# ======================================================================
#  CRYPT & CELLAR
# ======================================================================
def below_level():
    L = Level("below", "Crypt & Cellar")
    rm = L.room
    rm("cellar", "Wine Cellar", (32, 6, 37, 14), "cellar")
    rm("passage", "Secret Passage", (37, 9, 38, 15), "flag_dark")
    rm("crypt", "Chapel Crypt", (38, 8, 46, 18), "crypt")

    e = L.edge
    e("v", 37, 12, 14, "brick", "Bricked-up arch")
    e("v", 38, 14, 15, "secret", "Hidden door behind Elspeth's tomb")

    p = Painter(seed=37)
    # Wine cellar
    p.wine_rack(32.15, 6.6, 32.75, 13.6)
    for x in (33.6, 34.5, 35.4, 36.3):
        p.barrel(x, 6.55, 0.36)
    p.barrel(33.5, 8.0, 0.3)
    p.crate(36.0, 12.6, 36.8, 13.4)
    p.table(33.8, 11.6, 34.9, 12.5, items=0)        # Edric's drinking spot
    for k in range(3):
        p.circle(34.0 + k * 0.3, 11.9, 0.07, (40, 80, 50, 255), (16, 30, 18, 255), 2)
    p.chair(34.35, 12.9, back="s")
    p.candle(34.7, 11.8)
    L.lights.append(dict(x=34.7, y=11.8, dim=15, bright=5, color="#ffb35c", anim="torch", label="Edric's candle"))
    p.stairs(35.05, 10.05, 36.95, 11.95, up="n", base=(104, 96, 88))
    # Passage
    p.stairs(37.08, 9.08, 37.92, 11.92, up="n", base=(90, 84, 78))
    for (x, y) in [(37.4, 12.5), (37.6, 13.3), (37.3, 14.1)]:
        p.circle(x, y, 0.05, (230, 224, 200, 255), layer="d")           # candle-wax drips
    # Crypt
    for (x0, x1) in [(38.4, 40.2), (40.6, 42.4), (42.7, 43.9)]:
        p.coffin(x0, 8.3, x1, 9.1)
    for (x0, x1) in [(38.4, 40.2), (40.6, 42.4), (42.8, 44.6)]:
        p.coffin(x0, 17.0, x1, 17.8)
    p.sarcophagus(38.8, 12.3, 40.4, 14.8)            # Elspeth's tomb
    p.rect(38.06, 12.15, 38.5, 13.0, (22, 20, 20, 255), (60, 56, 52, 255), 2)   # wall niche (C7)
    p.chalk_circle(42.2, 13.2, 1.5)
    p.rect(44.6, 12.0, 46.0, 14.6, (104, 100, 96, 255), STONE_D, 4, layer="d")   # brazier dais
    p.brazier(45.3, 13.3)
    for (x, y) in [(40.8, 10.8), (40.8, 15.6), (44.0, 15.8)]:
        p.pillar(x, y)
    for (x, y) in [(39.6, 10.8), (44.6, 16.6)]:
        p.candelabra(x, y)
        L.lights.append(dict(x=x, y=y, dim=15, bright=5, color="#ffb35c", anim="torch", label="Crypt candelabra"))
    L.lights.append(dict(x=45.3, y=13.3, dim=30, bright=15, color="#38ff8c", anim="ghost", hidden=True,
                         label="Hallows' brazier (green fire, lit at midnight)"))
    pts = [(42.6, 15.4), (42.9, 15.7), (43.1, 15.6), (43.5, 16.0), (43.8, 15.9), (44.2, 16.4)]
    p.d.line([(P(a), P(b)) for a, b in pts], fill=(20, 18, 18, 255), width=7)
    p.d.line([(P(a), P(b)) for a, b in pts], fill=(150, 190, 220, 255), width=3)  # moonsilver glint
    for (x, y) in pts[1::2]:
        p.glow(x, y, 0.5, (160, 210, 255), 30)
    p.stairs(44.05, 8.05, 45.95, 10.95, up="n", base=(104, 100, 94))
    for y in (9.6, 11.4, 15.2, 16.4):                 # skull alcoves on the east wall
        p.rect(45.75, y, 45.98, y + 0.4, (30, 28, 26, 255), STONE_D, 2)
        p.circle(45.87, y + 0.2, 0.08, (210, 204, 186, 255))

    L.notes = [
        (1, 34.0, 9.5, "Wine Cellar", "cellar"), (2, 36.3, 13.0, "Bricked-up arch", None),
        (3, 37.5, 14.4, "Secret passage", "passage"), (4, 41.5, 9.9, "Chapel Crypt", "crypt"),
        (5, 39.6, 15.5, "Elspeth's tomb & niche", None), (6, 42.2, 13.2, "Chalk circle", None),
        (7, 45.3, 14.9, "Hallows' brazier", None), (8, 43.4, 16.6, "Moonsilver crack", None),
        (9, 45.0, 11.5, "Crypt stairs up", None),
    ]
    L.secret_notes = []
    L.clues = [("C7", 38.3, 12.0), ("C8", 43.4, 15.4)]
    # showdown layout: Quill and the skeletons start hidden; the scarecrows stand in the corner in plain sight
    L.tokens = [("Dr. Thaddeus Quill", 44, 13, True), ("Pumpkin-Headed Scarecrow", 45, 16, False), ("Pumpkin-Headed Scarecrow", 45, 17, False),
                ("Ravenmoor Skeleton", 39, 9, True), ("Ravenmoor Skeleton", 41, 9, True), ("Ravenmoor Skeleton", 39, 16, True),
                ("Ravenmoor Skeleton", 41, 16, True)]
    L.note_parents = {2: "cellar", 5: "crypt", 6: "crypt", 7: "crypt", 8: "crypt", 9: "crypt"}
    L.party_start = (44, 8)
    L.regions = [
        dict(name="Cellar stairs", rect=(35, 10, 37, 12), to="ground"),
        dict(name="Crypt stairs", rect=(44, 8, 46, 11), to="ground"),
        dict(name="Hidden stair", rect=(37, 9, 38, 12), to="upper"),
    ]
    L.tiles = [
        dict(file="evidence-costume.webp", rect=(38.05, 12.1, 38.95, 13.05), hidden=True, label="C7 costume bundle (show when found)"),
        dict(file="brazier-flame.webp", rect=(44.8, 12.8, 45.8, 13.8), hidden=True, label="Green brazier fire (show at midnight)"),
    ]
    L.outside = "rock"
    L.painter = p
    return L


# ======================================================================
#  RENDER
# ======================================================================
def render(L, ground_rgb=None):
    print("render", L.key)
    img = np.zeros((PH, PW, 4), np.float32)
    g = L.grid()
    seed = {"ground": 100, "upper": 200, "below": 300}[L.key]
    if L.outside == "grounds":
        img[..., :3] = tex_grass(PH, PW, seed)
        img[..., 3] = 255
        mask = Image.new("L", (PW, PH), 0)
        md = ImageDraw.Draw(mask)
        md.rectangle(R(22.4, 24, 25.6, 36), fill=255)                  # drive
        md.ellipse(R(19.6, 26.2, 28.4, 31.0), fill=255)                # turning circle
        md.line([P(19.8), P(28.6), P(12.2), P(26.6), P(9.2), P(21.6), P(5.0), P(16.4)], fill=255, width=P(1.2), joint="curve")
        md.line([P(5.0), P(16.6), P(5.0), P(15.1)], fill=255, width=P(1.8))
        md.line([P(28.2), P(28.6), P(33.0), P(25.6), P(39.6), P(24.6), P(41.9), P(19.4)], fill=255, width=P(1.1), joint="curve")
        md.line([P(41.9), P(19.6), P(41.9), P(18.0)], fill=255, width=P(1.8))
        md.line([P(35.5), P(6.0), P(35.5), P(4.0), P(30), P(3.6)], fill=255, width=P(1.0), joint="curve")
        m = np.asarray(mask) > 0
        grav = tex_gravel(PH, PW, seed + 1)
        img[m, :3] = grav[m]
        island = Image.new("L", (PW, PH), 0)
        ImageDraw.Draw(island).ellipse(R(22.6, 27.8, 25.4, 29.4), fill=255)
        im = np.asarray(island) > 0
        img[im, :3] = tex_grass(PH, PW, seed + 9)[im]
        pond = Image.new("L", (PW, PH), 0)
        ImageDraw.Draw(pond).ellipse(R(1.5, 25.0, 10.5, 32.0), fill=255)
        pm = np.asarray(pond) > 0
        y0, y1, x0, x1 = P(25), P(32), P(1.5), P(10.5)
        wt = tex_water(y1 - y0, x1 - x0, seed + 2)
        sub = img[y0:y1, x0:x1, :3]
        sub[pm[y0:y1, x0:x1]] = wt[pm[y0:y1, x0:x1]]
        bank = Image.new("L", (PW, PH), 0)
        ImageDraw.Draw(bank).ellipse(R(1.2, 24.7, 10.8, 32.3), outline=255, width=P(0.22))
        bm = np.asarray(bank) > 0
        img[bm, :3] = img[bm, :3] * 0.62 + np.array([70, 56, 40]) * 0.38
        y0, y1, x0, x1 = P(26), P(34), P(34), P(46)
        img[y0:y1, x0:x1, :3] = tex_dirt(y1 - y0, x1 - x0, seed + 3, furrows=True)
    elif L.outside == "rock":
        img[..., :3] = tex_rock(PH, PW, seed)
        img[..., 3] = 255
    else:
        img[..., 3] = 0
    for k, ((x0, y0, x1, y1), ridge) in enumerate(getattr(L, "roofs", [])):
        img[P(y0):P(y1), P(x0):P(x1), :3] = tex_roof(P(y1) - P(y0), P(x1) - P(x0), seed + 50 + k, ridge)
        img[P(y0):P(y1), P(x0):P(x1), 3] = 255

    for i, r in enumerate(L.rooms):
        x0, y0, x1, y1 = r["rect"]
        sel = g[y0:y1, x0:x1] == i
        sy, sx = np.where(np.kron(sel, np.ones((G, G), bool)))
        if r["kind"] == "void":
            img[P(y0):P(y1), P(x0):P(x1)] = 0
            continue
        if r["kind"] == "solid":
            hh, ww = P(y1) - P(y0), P(x1) - P(x0)
            img[P(y0):P(y1), P(x0):P(x1), :3] = np.array([94, 88, 80], np.float32) * (1 + 0.08 * noise(hh, ww, 30, seed)[..., None])
            img[P(y0):P(y1), P(x0):P(x1), 3] = 255
            continue
        tex = FLOORS[r["floor"]](P(y1) - P(y0), P(x1) - P(x0), seed + i * 7)
        block = img[P(y0):P(y1), P(x0):P(x1)]
        block[sy, sx, :3] = tex[sy, sx]
        block[sy, sx, 3] = 255

    p = L.painter
    if L.outside == "grounds":
        outside = g == -1
        p.leaves(outside, 2600, seed + 4)
    img = composite(img, p.decal, shadow=False)
    img = composite(img, p.obj, shadow=True)
    segs = compute_walls(L)
    walls = draw_walls(segs)
    img = composite(img, walls, shadow=True, offset=(9, 11), blur=8, strength=0.6)
    img = apply_glows(img, p.glows)
    img = grain(img, seed + 5, 4)
    if L.outside == "transparent":
        a = img[..., 3]
        img[..., 3] = np.where(a > 0, np.maximum(a, 0), 0)
    out = Image.fromarray(np.clip(img, 0, 255).astype(np.uint8), "RGBA")
    return out, segs


def door_mark(d, a, b, color):
    d.line([P(a[0]) // 2, P(a[1]) // 2, P(b[0]) // 2, P(b[1]) // 2], fill=color, width=8)


def dm_key(L, img, segs):
    """Half-size DM key with numbered pins, clue tags, secrets in red and a legend panel."""
    small = img.convert("RGBA").resize((PW // 2, PH // 2), Image.LANCZOS)
    bg = Image.new("RGBA", small.size, (20, 18, 20, 255))
    bg.alpha_composite(small)
    panel_w = 760
    canvas = Image.new("RGBA", (bg.width + panel_w, bg.height), (238, 230, 212, 255))
    canvas.alpha_composite(bg, (0, 0))
    d = ImageDraw.Draw(canvas)
    for s in segs:
        if s["kind"] in ("secret",):
            a, b = s["a"], s["b"]
            for t in np.arange(0, 1, 0.2):
                ax, ay = a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t
                bx, by = a[0] + (b[0] - a[0]) * (t + 0.1), a[1] + (b[1] - a[1]) * (t + 0.1)
                d.line([P(ax) // 2, P(ay) // 2, P(bx) // 2, P(by) // 2], fill=(220, 30, 30, 255), width=12)
    f_num, f_leg, f_title, f_clue = font(30), font(28, False), font(44), font(24)
    for (n, x, y, label, _) in L.notes:
        cx, cy = P(x) // 2, P(y) // 2
        d.ellipse([cx - 24, cy - 24, cx + 24, cy + 24], fill=(30, 26, 22, 235), outline=(236, 214, 150, 255), width=4)
        d.text((cx, cy), str(n), font=f_num, fill=(246, 236, 210, 255), anchor="mm")
    for (n, x, y, label) in L.secret_notes:
        cx, cy = P(x) // 2, P(y) // 2
        d.ellipse([cx - 24, cy - 24, cx + 24, cy + 24], fill=(150, 20, 20, 240), outline=(255, 220, 220, 255), width=4)
        d.text((cx, cy), str(n), font=f_num, fill=(255, 255, 255, 255), anchor="mm")
    for (cid, x, y) in L.clues:
        cx, cy = P(x) // 2, P(y) // 2
        w = 22 + 14 * len(cid)
        d.rounded_rectangle([cx - w // 2, cy - 18, cx + w // 2, cy + 18], radius=8, fill=(46, 94, 71, 240), outline=(220, 240, 226, 255), width=3)
        d.text((cx, cy), cid, font=f_clue, fill=(255, 255, 255, 255), anchor="mm")
    x0 = bg.width + 40
    d.text((x0, 50), L.name, font=f_title, fill=(35, 28, 23, 255))
    d.text((x0, 104), "Death at Ravenmoor Manor · DM key", font=f_leg, fill=(90, 74, 60, 255))
    y = 170
    for (n, _, _, label, _) in L.notes:
        d.ellipse([x0, y - 2, x0 + 40, y + 38], fill=(30, 26, 22, 255))
        d.text((x0 + 20, y + 18), str(n), font=f_clue, fill=(246, 236, 210, 255), anchor="mm")
        d.text((x0 + 56, y + 18), label, font=f_leg, fill=(35, 28, 23, 255), anchor="lm")
        y += 50
    for (n, _, _, label) in L.secret_notes:
        d.ellipse([x0, y - 2, x0 + 40, y + 38], fill=(150, 20, 20, 255))
        d.text((x0 + 20, y + 18), str(n), font=f_clue, fill=(255, 255, 255, 255), anchor="mm")
        d.text((x0 + 56, y + 18), label, font=f_leg, fill=(150, 20, 20, 255), anchor="lm")
        y += 50
    y += 20
    d.text((x0, y), "Green tags = clue cards found here", font=f_leg, fill=(46, 94, 71, 255))
    y += 44
    d.text((x0, y), "Red dashes = secret door", font=f_leg, fill=(150, 20, 20, 255))
    y += 44
    d.text((x0, y), "1 square = 5 ft", font=f_leg, fill=(90, 74, 60, 255))
    return canvas


def tile_images():
    """Small transparent overlay tiles for evidence that appears mid-session."""
    os.makedirs(OUT_TILES, exist_ok=True)

    def save(name, w, h, fn):
        im = Image.new("RGBA", (int(w * G), int(h * G)), (0, 0, 0, 0))
        fn(ImageDraw.Draw(im), im)
        im.save(os.path.join(OUT_TILES, name), "WEBP", quality=90)

    def footprints(d, im):
        r = np.random.default_rng(3)
        for k in range(6):
            x = 0.35 + (k % 2) * 0.35 + r.uniform(-0.05, 0.05)
            y = 0.25 + k * 0.36
            d.ellipse([P(x - 0.09), P(y - 0.15), P(x + 0.09), P(y + 0.12)], fill=(30, 50, 56, 170))
            d.ellipse([P(x - 0.07), P(y + 0.14), P(x + 0.07), P(y + 0.24)], fill=(30, 50, 56, 150))
    save("evidence-footprints.webp", 1.2, 2.25, footprints)

    def lilies(d, im):
        r = np.random.default_rng(4)
        for _ in range(9):
            x, y = r.uniform(0.2, 1.6), r.uniform(0.2, 1.9)
            a = r.uniform(0, math.pi)
            d.line([P(x), P(y), P(x + 0.35 * math.cos(a)), P(y + 0.35 * math.sin(a))], fill=(70, 110, 50, 255), width=4)
            for k in range(5):
                b = k * 2 * math.pi / 5
                d.ellipse([P(x + 0.07 * math.cos(b)) - 9, P(y + 0.07 * math.sin(b)) - 9,
                           P(x + 0.07 * math.cos(b)) + 9, P(y + 0.07 * math.sin(b)) + 9], fill=(244, 242, 232, 255), outline=(170, 170, 160, 255))
            d.ellipse([P(x) - 4, P(y) - 4, P(x) + 4, P(y) + 4], fill=(220, 190, 80, 255))
    save("evidence-lilies.webp", 1.8, 2.1, lilies)

    def foxfire(d, im):
        r = np.random.default_rng(5)
        for _ in range(26):
            x, y = r.uniform(0.2, 2.8), r.uniform(0.25, 0.55)
            rr = r.uniform(0.04, 0.12)
            d.ellipse([P(x - rr), P(y - rr * 0.6), P(x + rr), P(y + rr * 0.6)], fill=(110, 255, 150, 170))
        im2 = im.filter(ImageFilter.GaussianBlur(6))
        im.paste(Image.alpha_composite(im2, im))
    save("evidence-foxfire.webp", 3.0, 0.8, foxfire)

    def bootprint(d, im):
        d.ellipse([P(0.35), P(0.2), P(0.65), P(0.62)], fill=(60, 44, 30, 200))
        d.ellipse([P(0.37), P(0.64), P(0.63), P(0.82)], fill=(60, 44, 30, 200))
        d.rectangle([P(0.42), P(0.36), P(0.58), P(0.44)], outline=(150, 150, 150, 230), width=4)
        d.ellipse([P(0.5) - 6, P(0.9) - 6, P(0.5) + 6, P(0.9) + 6], fill=(50, 70, 70, 160))
    save("evidence-bootprint.webp", 1.0, 1.0, bootprint)

    def costume(d, im):
        d.polygon([(P(0.1), P(0.2)), (P(0.8), P(0.1)), (P(0.85), P(0.8)), (P(0.15), P(0.9))], fill=(196, 196, 204, 255), outline=(110, 110, 118, 255))
        d.polygon([(P(0.2), P(0.25)), (P(0.6), P(0.2)), (P(0.55), P(0.5))], fill=(232, 232, 240, 200))
        d.ellipse([P(0.5), P(0.5), P(0.75), P(0.75)], fill=(46, 120, 74, 255), outline=(20, 50, 30, 255), width=3)
        d.ellipse([P(0.25), P(0.55), P(0.4), P(0.7)], fill=(120, 255, 160, 200))
    save("evidence-costume.webp", 0.9, 0.95, costume)

    def flame(d, im):
        for (rr, c) in [(0.45, (40, 200, 110, 160)), (0.3, (90, 255, 150, 210)), (0.15, (210, 255, 220, 255))]:
            d.ellipse([P(0.5 - rr), P(0.5 - rr), P(0.5 + rr), P(0.5 + rr)], fill=c)
    save("brazier-flame.webp", 1.0, 1.0, flame)


WALL_FOUNDRY = {
    "ext": dict(move=20, sight=20, light=20, sound=20, door=0),
    "int": dict(move=20, sight=20, light=20, sound=20, door=0),
    "window": dict(move=20, sight=0, light=0, sound=10, door=0),
    "rail": dict(move=20, sight=0, light=0, sound=0, door=0),
    "brick": dict(move=20, sight=20, light=20, sound=10, door=0),
    "door": dict(move=20, sight=20, light=20, sound=20, door=1, ds=0),
    "double": dict(move=20, sight=20, light=20, sound=20, door=1, ds=0),
    "secret": dict(move=20, sight=20, light=20, sound=20, door=2, ds=0),
}


def scene_json(L, segs, file_main, file_standalone=None):
    walls = []
    for s in segs:
        spec = dict(WALL_FOUNDRY[s["kind"]])
        (ax, ay), (bx, by) = s["a"], s["b"]
        parts = [((ax, ay), (bx, by))]
        if s["kind"] == "double":
            if ax == bx:
                parts = [((ax, y), (ax, y + 1)) for y in range(ay, by)]
            else:
                parts = [((x, ay), (x + 1, ay)) for x in range(ax, bx)]
        for (a, b) in parts:
            w = dict(c=[a[0] * G, a[1] * G, b[0] * G, b[1] * G], **spec)
            w["flags"] = {"ravenmoor": {"kind": s["kind"], "label": s["label"]}}
            walls.append(w)
    lights = []
    for l in L.lights:
        lights.append(dict(x=int(l["x"] * G), y=int(l["y"] * G), hidden=bool(l.get("hidden", False)),
                           config=dict(dim=l["dim"], bright=l["bright"], color=l["color"], alpha=0.35,
                                       animation=dict(type=l.get("anim", "torch"), speed=2, intensity=3)),
                           flags={"ravenmoor": {"label": l["label"], "group": l.get("group")}}))
    parents = getattr(L, "note_parents", {})
    notes = [dict(number=n, x=int(x * G), y=int(y * G), label=label, locationKey=key, parentKey=None if key else parents.get(n), secret=False)
             for (n, x, y, label, key) in L.notes]
    notes += [dict(number=n, x=int(x * G), y=int(y * G), label=label, locationKey=None, parentKey=parents.get(n), secret=True)
              for (n, x, y, label) in L.secret_notes]
    tokens = [dict(actor=t[0], x=t[1] * G, y=t[2] * G, hidden=bool(t[3]) if len(t) > 3 else False) for t in L.tokens]
    regions = [dict(name=r["name"], connectsTo=r["to"],
                    rect=dict(x=r["rect"][0] * G, y=r["rect"][1] * G, width=(r["rect"][2] - r["rect"][0]) * G,
                              height=(r["rect"][3] - r["rect"][1]) * G)) for r in L.regions]
    tiles = [dict(texture=f"modules/ravenmoor-manor/assets/tiles/{t['file']}", x=int(t["rect"][0] * G), y=int(t["rect"][1] * G),
                  width=int((t["rect"][2] - t["rect"][0]) * G), height=int((t["rect"][3] - t["rect"][1]) * G),
                  hidden=t["hidden"], label=t["label"]) for t in L.tiles]
    rooms = [dict(key=r["id"], name=r["name"], rect=dict(x=r["rect"][0] * G, y=r["rect"][1] * G,
                                                         width=(r["rect"][2] - r["rect"][0]) * G, height=(r["rect"][3] - r["rect"][1]) * G))
             for r in L.rooms]
    return {
        "level": L.key, "name": L.name,
        "background": f"modules/ravenmoor-manor/assets/maps/{file_main}",
        "backgroundStandalone": f"modules/ravenmoor-manor/assets/maps/{file_standalone}" if file_standalone else None,
        "width": PW, "height": PH, "grid": {"type": 1, "size": G, "distance": 5, "units": "ft"},
        "padding": 0, "partyStart": dict(x=L.party_start[0] * G, y=L.party_start[1] * G) if L.party_start else None,
        "rooms": rooms, "walls": walls, "lights": lights, "notes": notes, "tokens": tokens,
        "levelRegions": regions, "tiles": tiles,
    }


def main():
    for dpath in (OUT_MAPS, OUT_PREV, OUT_DATA):
        os.makedirs(dpath, exist_ok=True)
    tile_images()
    results = {}
    for build in (ground_level, upper_level, below_level):
        L = build()
        img, segs = render(L)
        results[L.key] = (L, img, segs)
    files = {"ground": "ravenmoor-ground.webp", "upper": "ravenmoor-upper.webp", "below": "ravenmoor-below.webp"}
    gimg = results["ground"][1]
    for key, (L, img, segs) in results.items():
        img.save(os.path.join(OUT_MAPS, files[key]), "WEBP", quality=86, method=4)
        standalone = None
        view = img
        if key == "upper":
            dark = gimg.convert("RGB").point(lambda v: int(v * 0.42)).convert("RGBA")
            dark.alpha_composite(img)
            view = dark
            standalone = "ravenmoor-upper-standalone.webp"
            dark.convert("RGB").save(os.path.join(OUT_MAPS, standalone), "WEBP", quality=86, method=4)
        view.convert("RGB").resize((PW // 4, PH // 4), Image.LANCZOS).save(os.path.join(OUT_PREV, f"{key}-preview.png"))
        key_img = dm_key(L, view, segs)
        key_img.convert("RGB").save(os.path.join(OUT_MAPS, f"ravenmoor-{key}-dm-key.webp"), "WEBP", quality=88)
        key_img.convert("RGB").resize((key_img.width // 2, key_img.height // 2), Image.LANCZOS).save(os.path.join(OUT_PREV, f"{key}-dm-key-preview.png"))
        crop = None
        if key == "below":
            crop = dict(x=30 * G, y=4 * G, width=18 * G, height=16 * G)
            img.crop((crop["x"], crop["y"], crop["x"] + crop["width"], crop["y"] + crop["height"])).convert("RGB").save(
                os.path.join(OUT_MAPS, "ravenmoor-crypt-battlemap.webp"), "WEBP", quality=88, method=4)
        data = scene_json(L, segs, files[key], standalone)
        if crop:
            data["standaloneCrop"] = dict(file="modules/ravenmoor-manor/assets/maps/ravenmoor-crypt-battlemap.webp", **crop,
                                          note="For a separate crypt scene: use this image and subtract x/y from every coordinate.")
        with open(os.path.join(OUT_DATA, f"{key}.json"), "w") as fh:
            json.dump(data, fh, indent=1)
        print(key, "walls", len(data["walls"]), "lights", len(data["lights"]), "notes", len(data["notes"]))


if __name__ == "__main__":
    main()
