"""Build the Ashford Roads: Act 1 maps and their Foundry scene data.

Run:  python3 tools/build_maps.py [map ...]        (all maps if none named)
      python3 tools/build_maps.py --debug DIR       (also write wall/light overlays as PNGs into DIR)
Writes assets/maps/<id>.webp and data/scenes/<id>.json. Deterministic (fixed seeds).

Light radii (dim/bright) are in scene distance units: 5 per square (gridDistance 5 ft).
"""
import json
import math
import os
import sys

import numpy as np
from PIL import Image, ImageDraw, ImageFilter

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from artlib import (G, P, ROOT, Map, Decor, save_webp, font, composite, apply_glows, clip8, noise, fbm,
                    tex_ash, tex_water, tex_cobble, tex_rock, BRASS, BRASS_D, VERDI, IRON, WOOD, WOOD_D, WOOD_L,
                    PAPER, AMBER, REFINE, CHARGE, gaussian_filter)

OUT_MAPS = os.path.join(ROOT, "assets", "maps")
OUT_DATA = os.path.join(ROOT, "data", "scenes")


def L(x, y, dim, bright, color, alpha=0.5, anim=None, key=None, speed=2, intensity=3):
    d = dict(x=P(x), y=P(y), dim=dim, bright=bright, color=color, alpha=alpha)
    if anim:
        d["animation"] = dict(type=anim, speed=speed, intensity=intensity)
    if key:
        d = dict(key=key, **d)
    return d


def N(x, y, page, label):
    return dict(x=P(x), y=P(y), page=page, label=label)


def T(actor, x, y, hidden=False):
    d = dict(actor=actor, x=P(x), y=P(y))
    if hidden:
        d["hidden"] = True
    return d


# ======================================================================
#  1. THE GRATE CHAMBER (the Gloam's lair, the Into the Light Scene)
# ======================================================================
def grate_chamber():
    m = Map("grate_chamber", "The Grate Chamber", 20, 14, seed=101)
    m.rect(2, 1, 19, 13, "flag_wet")          # the cistern hall
    m.rect(0, 6, 2, 8, "culvert")             # west doorway (from the Undercourses)
    m.rect(9, 0, 11, 1, "culvert")            # north drain
    m.rect(19, 9, 20, 11, "culvert")          # east outfall
    m.rect(15, 13, 17, 14, "culvert")         # south overflow
    m.fill(2, 1, 4, 3)                        # broken corners
    m.fill(17, 11, 19, 13)
    m.door("v", 2, 6, 8, "open")
    m.rect(15, 1, 19, 4, "ledge")
    m.water = m.water_rims = [[(4.6, 4.2), (7.5, 3.4), (11.2, 3.6), (13.6, 4.6), (14.2, 7.0), (13.4, 9.6), (10.5, 10.4),
                (6.8, 10.2), (4.4, 9.0), (3.9, 6.5)]]
    dc = Decor(m.w, m.h, seed=102)
    # Petra's ledge (raised stone lip, top right)
    dc.d.line([P(15), P(1.0), P(15), P(4.0), P(19), P(4.0)], fill=(40, 36, 34, 255), width=18)
    dc.d.line([P(15), P(1.0), P(15), P(4.0), P(19), P(4.0)], fill=(126, 120, 110, 255), width=8)
    for k in range(4):                                   # worn steps up to the ledge
        dc.d.rectangle([P(13.9 + k * 0.0), P(1.4 + k * 0.6), P(14.95), P(1.8 + k * 0.6)], fill=(92, 88, 82, 255),
                       outline=(40, 36, 34, 255), width=3)
    dc.d.ellipse([P(16.0), P(2.2), P(17.4), P(3.5)], fill=(60, 52, 70, 200))     # Petra's blanket and lamp-stub
    dc.d.ellipse([P(17.6), P(1.6), P(17.9), P(1.9)], fill=(230, 200, 140, 255))
    # pipes along the walls
    dc.pipe([(2.4, 3.3), (2.4, 12.6), (14.5, 12.6)], 0.26)
    dc.pipe([(4.3, 1.4), (8.6, 1.4)], 0.2, color=(120, 110, 96))
    dc.pipe([(11.4, 1.4), (13.5, 1.4)], 0.24)
    dc.pipe([(18.6, 5.0), (18.6, 8.8)], 0.3, color=(96, 120, 104))
    for (x, y) in [(2.4, 5.2), (2.4, 10.8), (9.0, 12.6)]:
        dc.valve(x, y)
    dc.gauge(13.0, 1.4)
    dc.gauge(18.6, 6.6)
    # rubble, bones, sludge, the drain grilles
    dc.rubble(4.2, 11.6, 0.8, 16)
    dc.rubble(16.8, 10.2, 0.7, 12)
    dc.bones(12.6, 11.4, 7)
    dc.bones(5.6, 3.0, 4)
    dc.grate(9.05, 0.05, 10.95, 0.9, 5)
    dc.d.rectangle([P(19.1), P(9.0), P(19.95), P(11.0)], outline=(40, 40, 44, 255), width=8)
    # faint dust band where the noon shaft falls
    sun = [(4.6, 11.4), (6.2, 11.2), (7.8, 10.9), (9.4, 10.6), (11.0, 10.4), (12.6, 10.1), (14.2, 9.7), (15.8, 9.2)]
    haze = Image.new("RGBA", dc.img.size, (0, 0, 0, 0))
    hd = ImageDraw.Draw(haze)
    for (x, y) in sun:
        hd.rectangle([P(x - 0.8), P(y - 0.8), P(x + 0.8), P(y + 0.8)], fill=(255, 236, 190, 26))
    dc.img = Image.alpha_composite(dc.img, haze.filter(ImageFilter.GaussianBlur(30)))
    dc.d = ImageDraw.Draw(dc.img)
    m.glows += [(16.8, 2.8, 1.8, (200, 180, 140), 30), (19.5, 10.0, 2.0, (255, 120, 40), 40),
                (10.0, 0.6, 2.0, (255, 230, 170), 35)]
    m.lights += [L(*sun[0], 7.5, 5, "#fff1c8", 0.6, key="sun"),
                 L(19.5, 10.0, 15, 0, "#ff7a2a", 0.35, "torch"),
                 L(16.8, 2.8, 10, 0, "#9a8cc8", 0.2)]
    m.notes += [N(1, 7, "ch1_the_gloam", "The thing in the dark"), N(10, 11.5, "ch1_into_the_light", "Into the light"),
                N(16.8, 2.8, "grate_chamber", "Petra's ledge")]
    m.tokens += [T("petra", 16.6, 2.8), T("gloam", 9.2, 6.8, hidden=True),
                 T("enkrid", 1.0, 6.5), T("protag2", 1.0, 7.5), T("protag3", 2.5, 6.5)]
    m.decor = dc
    m.darkness = 0.85
    m.extra = dict(sunPath=[[P(x), P(y)] for (x, y) in sun])
    return m


# ======================================================================
#  2. THE UNDERCOURSES (the sewer dungeon)
# ======================================================================
def undercourses():
    m = Map("undercourses", "The Undercourses", 40, 28, seed=201)
    r = m.rect
    r(2, 2, 6, 6, "flag_wet")            # A: hatch landing under Refinery Row
    r(6, 3, 18, 5, "culvert")            # main culvert east
    r(18, 2, 24, 8, "flag_wet")          # B: the junction (run-off channels meet)
    r(9, 5, 11, 13, "culvert")           # side tunnel south
    r(6, 13, 14, 18, "flag_wet")         # C: the side room, dead sellswords
    r(24, 4, 34, 6, "culvert")           # culvert on east
    r(32, 6, 34, 12, "culvert")
    r(28, 12, 38, 22, "flag_wet")        # D: Old Gnaw's chamber
    r(20, 8, 22, 18, "culvert")          # rat run south from junction
    r(14, 18, 28, 20, "culvert")         # low run to the chamber
    r(16, 20, 18, 28, "culvert")         # on to the Grate Chamber (runs off the map edge)
    r(26, 6, 28, 8, "culvert")           # F: the old pump room, off the east culvert
    r(24, 8, 31, 11, "brick_floor")
    r(14, 24, 16, 26, "culvert")
    r(2, 22, 10, 26, "flag_wet")         # E: the overflow sump (rat nests)
    r(10, 24, 14, 26, "culvert")
    r(36, 8, 39, 10, "culvert")          # dead-end with grille (refinery outfall)
    r(34, 8, 36, 10, "culvert")
    m.door("h", 2, 3, 5, "hatch")        # the culvert hatch, up to Refinery Row
    m.door("v", 38, 8, 10, "grille")
    m.door("h", 8, 26, 28, "grille")
    # channels of warm run-off down the middle of the culverts
    m.water = [[(6, 3.75), (18, 3.75), (18, 4.25), (6, 4.25)],
               [(18.5, 4.6), (23.5, 4.6), (23.5, 5.4), (18.5, 5.4)],
               [(24, 4.8), (33, 4.8), (33.4, 11.8), (32.6, 11.8), (32.6, 5.2), (24, 5.2)],
               [(20.75, 8), (21.25, 8), (21.25, 18.8), (20.75, 18.8)],
               [(14, 18.8), (28, 18.8), (28, 19.2), (14, 19.2)],
               [(29.4, 13.6), (30.6, 12.7), (32.6, 12.6), (34.4, 13.2), (35.4, 14.4), (35.0, 15.8), (33.2, 16.5), (31.0, 16.3), (29.6, 15.2)],
               [(3.0, 23.0), (8.8, 22.6), (9.2, 25.2), (3.4, 25.4)]]
    dc = Decor(m.w, m.h, seed=202)
    # hatch ladder
    for k in range(5):
        dc.d.line([P(3.1), P(2.2 + k * 0.35), P(4.9), P(2.2 + k * 0.35)], fill=IRON + (255,), width=8)
    dc.d.line([P(3.1), P(2.1), P(3.1), P(3.8)], fill=IRON + (255,), width=10)
    dc.d.line([P(4.9), P(2.1), P(4.9), P(3.8)], fill=IRON + (255,), width=10)
    dc.crate(2.3, 4.8, 0.7)
    dc.barrel(5.3, 5.3)
    # pipes along the main runs
    dc.pipe([(6.2, 3.2), (17.8, 3.2)], 0.18)
    dc.pipe([(18.3, 2.3), (23.7, 2.3), (23.7, 7.7)], 0.28)
    dc.pipe([(24.2, 4.2), (33.8, 4.2), (33.8, 11.5)], 0.18, color=(100, 120, 106))
    dc.pipe([(28.3, 12.3), (37.7, 12.3), (37.7, 21.7)], 0.26)
    dc.pipe([(2.3, 22.3), (9.7, 22.3)], 0.2, color=(110, 100, 92))
    for (x, y) in [(23.7, 5.0), (37.7, 16.0), (13.0, 3.2), (29.5, 12.3)]:
        dc.valve(x, y)
    dc.gauge(18.9, 2.3)
    dc.gauge(37.7, 19.0)
    # C: three Coldwater sellswords, their journal, signs of rats
    dc.body(8.0, 15.0, 0.4)
    dc.body(10.4, 16.6, -1.2)
    dc.body(12.4, 14.4, 2.2)
    dc.journal(9.3, 14.1)
    dc.lamp(7.0, 17.2, (120, 110, 90))
    dc.d.line([P(11.8), P(13.6), P(12.9), P(16.8)], fill=(150, 150, 160, 255), width=6)   # dropped blade
    dc.rats(10.0, 15.5, 2.4, 14)
    dc.bones(6.8, 13.6, 4)
    # D: Old Gnaw's chamber: nest of rags, bones, gnawed crates
    dc.d.ellipse([P(34.2), P(17.2), P(37.6), P(21.4)], fill=(76, 64, 50, 255))
    dc.rubble(35.9, 19.3, 1.6, 40, color=(96, 80, 60))
    dc.bones(35.6, 19.4, 14)
    dc.bones(30.4, 20.4, 6)
    dc.crate(28.5, 19.8, 0.8)
    dc.crate(29.4, 20.6, 0.7)
    dc.barrel(31.5, 21.2)
    dc.rats(32.0, 18.5, 3.0, 22)
    # E: sump with rat nests
    dc.rubble(4.0, 24.8, 1.0, 20)
    dc.rats(6.0, 24.0, 2.6, 18)
    dc.bones(8.2, 23.4, 5)
    # dead-end outfall grille glow; scattered rubble
    for (x, y) in [(15.0, 4.6), (22.6, 12.0), (19.0, 18.3), (12.0, 25.4), (25.4, 4.4)]:
        dc.rubble(x, y, 0.35, 6)
    dc.rats(21.0, 13.0, 3.5, 10)
    dc.label(19.9, 26.8, "to the Grate Chamber", 40)
    dc.label(4.6, 1.4, "hatch to Refinery Row", 34)
    # F: the pump room: a dead beam engine, flywheel, gauges
    dc.d.ellipse([P(24.7), P(8.3), P(27.1), P(10.7)], outline=IRON + (255,), width=24)
    for k in range(6):
        a = k * math.pi / 3
        dc.d.line([P(25.9), P(9.5), P(25.9 + 1.15 * math.cos(a)), P(9.5 + 1.15 * math.sin(a))], fill=IRON + (255,), width=12)
    dc.d.rectangle([P(27.8), P(8.9), P(30.6), P(10.3)], fill=(70, 66, 62, 255), outline=BRASS_D + (255,), width=8)
    dc.pipe([(28.2, 8.4), (30.6, 8.4)], 0.22)
    for x in (28.4, 29.2, 30.0):
        dc.gauge(x, 9.6, 0.2)
    dc.rubble(24.6, 10.6, 0.3, 6)
    dc.rats(29.0, 10.6, 0.6, 6)
    m.glows += [(38.5, 9.0, 2.5, (255, 110, 30), 70), (21.0, 5.0, 2.6, (255, 130, 50), 30),
                (33.0, 14.5, 2.8, (255, 120, 40), 26), (4.0, 3.0, 1.6, (255, 220, 160), 40),
                (5.8, 24.0, 2.2, (255, 120, 40), 18)]
    m.lights += [L(38.4, 9.0, 20, 5, "#ff6a1e", 0.45, "torch"),
                 L(21.0, 5.0, 15, 0, "#ff8a3a", 0.3, "torch"),
                 L(33.0, 14.5, 15, 0, "#ff7a2a", 0.3, "torch"),
                 L(4.0, 2.8, 10, 5, "#ffe2a8", 0.4),
                 L(6.0, 24.0, 10, 0, "#ff7a2a", 0.25, "torch")]
    m.notes += [N(4, 3, "ch1_sewer_enter", "Into the Undercourses"),
                N(9.5, 15.5, "undercourses", "The Coldwater sellswords"),
                N(33, 17, "ch1_old_gnaw", "Old Gnaw"),
                N(17, 25, "grate_chamber", "To the Grate Chamber"),
                N(6, 24, "undercourses", "The sump (rat culls)"),
                N(27.5, 10, "undercourses", "The old pump room")]
    m.tokens += [T("enkrid", 3.5, 4.5), T("protag2", 4.5, 4.5), T("protag3", 3.5, 5.5),
                 T("sellsword", 8.0, 15.0), T("sellsword", 10.4, 16.6), T("sellsword", 12.4, 14.4),
                 T("old_gnaw", 35.5, 19.0, hidden=True), T("rat_swarm", 31.5, 17.5, hidden=True),
                 T("rat_swarm", 33.0, 20.5, hidden=True), T("rat", 30.5, 15.5, hidden=True),
                 T("rat", 31.5, 14.5, hidden=True), T("rat", 34.5, 15.5, hidden=True),
                 T("rat", 29.5, 18.5, hidden=True), T("rat_swarm", 21.0, 14.0, hidden=True),
                 T("rat_swarm", 5.5, 24.0, hidden=True)]
    m.decor = dc
    m.darkness = 0.9
    return m


# ======================================================================
#  3. SALLOW'S EXCHANGE (the broker)
# ======================================================================
def sallows_exchange():
    m = Map("sallows_exchange", "Sallow's Exchange", 18, 14, solid="brick", seed=301)
    m.rect(1, 1, 17, 10, "wood")            # the counting-room
    m.rect(9, 1, 17, 4, "wood_dark")        # behind the high desk (Odile's side)
    m.rect(5, 10, 13, 14, "cobble")         # the Exchange steps (outside, open to the street)
    m.door("h", 10, 8, 10, "door")
    dc = Decor(m.w, m.h, seed=302)
    # steps
    for k in range(4):
        dc.d.rectangle([P(5), P(10.1 + k * 0.7), P(13), P(10.1 + k * 0.7) + 8], fill=(64, 62, 60, 255))
    dc.d.line([P(5.2), P(13.9), P(12.8), P(13.9)], fill=IRON + (255,), width=6)
    # the high desk
    dc.table(9.0, 4.4, 15.6, 5.6, (88, 58, 34))
    dc.d.rectangle([P(9.0), P(4.4), P(15.6), P(4.6)], fill=BRASS + (255,))
    dc.papers(9.3, 4.6, 15.2, 5.4, 18)
    dc.lamp(9.6, 5.0)
    dc.lamp(15.1, 5.0)
    dc.d.ellipse([P(12.0), P(3.0), P(12.8), P(3.8)], fill=(70, 40, 30, 255))   # her stool
    # pigeonholes, ledger shelves
    for k in range(10):
        dc.d.rectangle([P(13.1 + (k % 5) * 0.75), P(1.15 + (k // 5) * 0.45), P(13.7 + (k % 5) * 0.75),
                        P(1.5 + (k // 5) * 0.45)], fill=(54, 36, 22, 255), outline=BRASS_D + (255,), width=2)
    # the commissions board and pinned notices
    dc.board(1.2, 1.15, 6.2, 1.9, 22)
    dc.label(3.7, 2.35, "COMMISSIONS", 34)
    dc.board(6.6, 1.15, 10.8, 1.75, 14)
    dc.papers(1.15, 2.6, 1.6, 8.6, 14)
    # benches and the queue rope
    for y in (6.6, 8.2):
        dc.table(2.0, y, 6.5, y + 0.5, WOOD_L)
    dc.d.line([P(8), P(7), P(11), P(7)], fill=(150, 30, 30, 255), width=6)
    for x in (8, 11):
        dc.d.ellipse([P(x) - 12, P(7) - 12, P(x) + 12, P(7) + 12], fill=BRASS + (255,))
    dc.rug(7.4, 7.6, 12.4, 9.6, (90, 40, 34))
    dc.barrel(16.3, 9.2, 0.3)
    dc.crate(15.6, 6.6, 0.7)
    dc.pipe([(16.7, 4.4), (16.7, 9.6)], 0.16)
    m.glows += [(9.6, 5.0, 2.2, (255, 190, 100), 45), (15.1, 5.0, 2.2, (255, 190, 100), 45),
                (3.7, 4.0, 3.0, (255, 210, 140), 20)]
    m.lights += [L(9.6, 5.0, 20, 10, "#ffbf6a", 0.4, "torch"), L(15.1, 5.0, 20, 10, "#ffbf6a", 0.4, "torch"),
                 L(4.0, 5.0, 25, 10, "#ffd9a0", 0.25), L(9.0, 12.0, 25, 10, "#c9d2d8", 0.15)]
    m.notes += [N(12.3, 5.9, "ch1_broker", "A hard time at the Exchange"),
                N(3.7, 1.9, "ch1_questions", "Stupid, basic, and naive questions"),
                N(8.8, 1.9, "ch1_commission", "The commission"),
                N(9.0, 11.8, "ch1_prologue", "On the steps (the watch)")]
    m.tokens += [T("broker", 12.4, 3.4), T("protag2", 11.5, 6.5), T("protag3", 12.5, 6.5)]
    m.decor = dc
    m.darkness = 0.2
    return m


# ======================================================================
#  5. SMALL SCENES: the Binding House, the Lantern and Lee, the Long Quay
# ======================================================================
def binding_house():
    m = Map("binding_house", "The Binding House", 16, 12, solid="brick", seed=501)
    m.rect(1, 1, 15, 8, "marble")
    m.rect(5, 8, 11, 11, "flag")            # vestibule
    m.door("h", 8, 7, 9, "door")
    m.door("h", 11, 7, 9, "door")
    dc = Decor(m.w, m.h, seed=502)
    # four binding cradles with glass cylinders of brume
    for i, x in enumerate((3.0, 6.3, 9.7, 13.0)):
        dc.d.ellipse([P(x - 1.0), P(2.0), P(x + 1.0), P(4.0)], fill=(60, 58, 64, 255), outline=BRASS + (255,), width=8)
        dc.d.ellipse([P(x - 0.55), P(2.45), P(x + 0.55), P(3.55)], fill=(170, 174, 184, 220))
        dc.pipe([(x, 1.15), (x, 2.0)], 0.2)
        for a in range(6):
            t = a * math.pi / 3
            dc.d.ellipse([P(x + 1.0 * math.cos(t)) - 8, P(3 + 1.0 * math.sin(t)) - 8,
                          P(x + 1.0 * math.cos(t)) + 8, P(3 + 1.0 * math.sin(t)) + 8], fill=BRASS_D + (255,))
        m.glows.append((x, 3.0, 1.6, (200, 210, 230), 45))
        m.lights.append(L(x, 3.0, 10, 5, "#d8e0f0", 0.4, "pulse", speed=2, intensity=2))
    dc.pipe([(1.3, 1.15), (14.7, 1.15)], 0.3)
    dc.table(5.5, 5.8, 10.5, 6.6, (60, 50, 44))
    dc.papers(5.8, 5.9, 10.2, 6.5, 10)
    dc.label(8.0, 7.3, "CASH OR COMPACT DEBT", 30)
    dc.d.rectangle([P(1.3), P(5.0), P(2.3), P(7.7)], fill=(50, 46, 44, 255), outline=BRASS + (255,), width=5)
    m.notes += [N(8, 4.8, "ch1_binding", "Binding"), N(8, 9.5, "ch1_collapse", "It hurts")]
    m.tokens += [T("binder", 8.0, 5.3)]
    m.decor = dc
    m.darkness = 0.3
    return m


def lantern_lee():
    m = Map("lantern_lee", "The Lantern and Lee", 16, 12, solid="brick", seed=601)
    m.rect(1, 1, 11, 11, "wood")             # the common room
    m.rect(11, 1, 15, 6, "wood_dark")        # the one room
    m.rect(11, 6, 15, 11, "flag")            # kitchen / back
    m.door("v", 11, 3, 4, "door")
    m.door("v", 11, 8, 9, "door")
    m.door("h", 11, 4, 6, "door")
    m.cells[10, 4:6] = "wood"
    dc = Decor(m.w, m.h, seed=602)
    dc.table(1.4, 1.4, 8.6, 2.4, (80, 52, 30))        # the bar
    for x in (2.5, 4.5, 6.5):
        dc.barrel(x, 1.0 + 0.4, 0.3)
    for (x, y) in [(3.0, 5.0), (7.0, 5.0), (3.0, 8.5), (7.0, 8.5)]:
        dc.d.ellipse([P(x - 0.8), P(y - 0.8), P(x + 0.8), P(y + 0.8)], fill=WOOD_L + (255,), outline=WOOD_D + (255,),
                     width=5)
        dc.lamp(x, y)
        m.glows.append((x, y, 1.6, (255, 190, 100), 35))
    dc.d.rectangle([P(9.0), P(9.8), P(10.8), P(10.8)], fill=(60, 30, 20, 255))     # hearth
    m.glows.append((9.9, 10.0, 2.6, (255, 120, 40), 60))
    for i in range(4):                                                            # four bunks in one room
        x = 11.4 + (i % 2) * 2.0
        y = 1.4 + (i // 2) * 2.2
        dc.d.rectangle([P(x), P(y), P(x + 1.4), P(y + 1.8)], fill=(120, 100, 80, 255), outline=WOOD_D + (255,), width=5)
        dc.d.rectangle([P(x + 0.1), P(y + 0.1), P(x + 1.3), P(y + 0.5)], fill=PAPER + (255,))
    dc.table(11.5, 7.0, 14.5, 8.0, (90, 70, 50))
    dc.barrel(14.3, 10.3)
    m.lights += [L(9.9, 10.0, 25, 10, "#ff8a3a", 0.45, "torch"), L(5, 6.5, 30, 15, "#ffc27a", 0.3, "torch"),
                 L(13, 3.5, 10, 5, "#ffc27a", 0.25)]
    m.notes += [N(5.0, 2.8, "ch1_inn_night", "A night at the Lantern and Lee"), N(13, 3.5, "lantern_lee", "The one room")]
    m.tokens += [T("innkeeper", 5.0, 2.8)]
    m.decor = dc
    m.darkness = 0.45
    return m


def long_quay():
    m = Map("long_quay", "The Long Quay", 24, 14, seed=701)
    m.rect(0, 0, 24, 8, "cobble")            # the quay
    m.rect(0, 8, 24, 14, "water")            # the harbour (open water, no walls)
    m.rect(9, 8, 13, 9, "wood_v")            # gangway
    dc = Decor(m.w, m.h, seed=702)
    # the Gilded Tern: hull, deck, masts
    dc.d.polygon([(P(5.0), P(9.6)), (P(21.0), P(9.2)), (P(23.6), P(11.2)), (P(21.0), P(13.4)), (P(5.0), P(13.0)),
                  (P(4.0), P(11.3))], fill=(70, 42, 26, 255), outline=(200, 160, 70, 255))
    dc.d.polygon([(P(5.6), P(10.1)), (P(20.6), P(9.8)), (P(22.6), P(11.2)), (P(20.6), P(12.8)), (P(5.6), P(12.5))],
                 fill=(150, 110, 70, 255))
    for x in (9.5, 14.5, 19.0):
        dc.d.ellipse([P(x) - 22, P(11.2) - 22, P(x) + 22, P(11.2) + 22], fill=(60, 40, 24, 255))
        dc.d.line([P(x), P(9.9), P(x), P(12.5)], fill=(60, 40, 24, 255), width=10)
    for k in range(1, 9):                                                   # deck planks
        yk = 10.0 + k * 0.3
        dc.d.line([P(5.8), P(yk), P(20.6), P(yk)], fill=(120, 86, 54, 255), width=3)
    dc.d.line([P(5.0), P(11.2), P(23.5), P(11.2)], fill=(200, 160, 70, 200), width=4)
    dc.d.line([P(22.6), P(11.2), P(24.0), P(11.0)], fill=(60, 40, 24, 255), width=12)   # bowsprit
    for x in (9.5, 14.5, 19.0):                                              # furled sails on the yards
        dc.d.rounded_rectangle([P(x) - 14, P(9.6), P(x) + 14, P(12.8)], radius=12, fill=(214, 204, 178, 235),
                               outline=(120, 100, 70, 255), width=3)
        dc.d.ellipse([P(x) - 20, P(11.2) - 20, P(x) + 20, P(11.2) + 20], fill=(60, 40, 24, 255))
    dc.d.rectangle([P(5.6), P(10.6), P(7.6), P(11.8)], fill=(110, 70, 40, 255), outline=BRASS + (255,), width=4)
    dc.label(14.5, 13.7, "the Gilded Tern", 40)
    dc.d.line([P(0), P(8.0), P(24), P(8.0)], fill=(40, 38, 36, 255), width=28)              # quay coping
    dc.d.line([P(0), P(7.95), P(24), P(7.95)], fill=(110, 106, 98, 255), width=14)
    for x in range(0, 24):
        dc.d.line([P(x + 0.5), P(7.85), P(x + 0.5), P(8.1)], fill=(40, 38, 36, 255), width=3)
    dc.d.rectangle([P(9.1), P(8.0), P(12.9), P(9.8)], fill=(120, 90, 60, 255), outline=WOOD_D + (255,), width=5)
    # bollards, cargo, lamp posts
    for x in range(1, 24, 3):
        dc.d.ellipse([P(x) - 16, P(7.6) - 16, P(x) + 16, P(7.6) + 16], fill=IRON + (255,))
    for (x, y) in [(2.0, 3.0), (2.9, 3.2), (16.5, 2.4), (17.3, 2.8), (20.0, 4.5)]:
        dc.crate(x, y, 0.8)
    for (x, y) in [(5.0, 2.0), (18.6, 5.6), (7.4, 4.6)]:
        dc.barrel(x, y)
    for x in (4.0, 12.0, 20.0):
        dc.lamp(x, 1.0)
        m.glows.append((x, 1.0, 1.8, (255, 200, 120), 30))
    dc.rug(10.0, 5.0, 14.0, 6.6, (120, 30, 60))     # the noble household's baggage
    m.lights += [L(4, 1, 20, 5, "#ffc27a", 0.3, "torch"), L(12, 1, 20, 5, "#ffc27a", 0.3, "torch"),
                 L(20, 1, 20, 5, "#ffc27a", 0.3, "torch")]
    m.notes += [N(11, 7, "ch1_missed_ship", "The Gilded Tern leaves without them"),
                N(14.5, 11.2, "gilded_tern", "The Gilded Tern")]
    m.tokens += [T("rourke", 11.0, 7.4), T("noble", 12.2, 5.8)]
    m.decor = dc
    m.darkness = 0.0
    return m


# ======================================================================
#  4. ASHFORD ROADS (the city overview, no grid)
# ======================================================================
def _seg_dist(px, py, pts):
    best = 1e9
    for (x0, y0), (x1, y1) in zip(pts, pts[1:]):
        dx, dy = x1 - x0, y1 - y0
        t = max(0.0, min(1.0, ((px - x0) * dx + (py - y0) * dy) / (dx * dx + dy * dy + 1e-9)))
        best = min(best, math.hypot(px - x0 - t * dx, py - y0 - t * dy))
    return best


def ashford():
    W, H = 3000, 2000
    rng = np.random.default_rng(401)
    yy, xx = np.mgrid[0:H, 0:W].astype(np.float32)

    def coast_y(x):
        return 1230 + 0.00034 * (x - 2050) ** 2

    wob = noise(H, W, 160, 402) * 26
    land = yy < (1230 + 0.00034 * (xx - 2050) ** 2 + wob)
    # ground: pale ash fields in the west, sooty grass and yards toward the city
    ash = tex_ash(H, W, 403).astype(np.float32) * 1.08
    grass = (np.array([70, 76, 58], np.float32) + fbm(H, W, [300, 60, 12], [0.5, 0.3, 0.2], 404)[..., None] * 14)
    t = np.clip((xx - 900 + noise(H, W, 300, 408) * 160) / 500, 0, 1)[..., None]
    img = ash * (1 - t) + grass * t
    # furrows of drifted ash
    img *= (1 - 0.035 * (np.sin(xx / 38 + noise(H, W, 200, 409) * 3) > 0.6)[..., None] * (1 - t))
    sea = tex_water(H, W, 405, deep=(14, 30, 40), shallow=(40, 62, 66)).astype(np.float32)
    lm = gaussian_filter(land.astype(np.float32), 4)
    img = img * lm[..., None] + sea * (1 - lm[..., None])
    shore = np.clip(gaussian_filter(land.astype(np.float32), 22) - land, 0, 1)
    img += shore[..., None] * np.array([34, 36, 30], np.float32)
    base = np.dstack([img, np.full((H, W), 255, np.float32)])
    lay = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    d = ImageDraw.Draw(lay)
    cx, cy, rad = 2050, 1230, 820
    gate = (cx + rad * math.cos(math.radians(205)), cy + rad * math.sin(math.radians(205)))
    # the Coast Road through the ash fields to the gate
    road = [(0, 640), (240, 700), (470, 640), (700, 720), (930, 760), gate]
    d.line(road, fill=(58, 50, 42, 255), width=40, joint="curve")
    d.line(road, fill=(132, 116, 94, 255), width=24, joint="curve")
    for k in range(9):                         # dead trees and ash cairns beside the road
        x = 80 + k * 105 + rng.uniform(-30, 30)
        y = 640 + rng.choice([-1, 1]) * rng.uniform(70, 260)
        d.line([(x, y), (x + rng.uniform(-14, 14), y - 46)], fill=(36, 32, 30, 255), width=6)
        d.line([(x, y - 30), (x + 22, y - 52)], fill=(36, 32, 30, 255), width=4)
    # streets inside the wall
    streets = [[gate, (1520, 930), (1790, 1010), (2050, 1080)],
               [(1520, 930), (1720, 720), (1960, 560)],
               [(1790, 1010), (1890, 800), (2050, 600), (2300, 520)],
               [(2050, 1080), (2300, 960), (2560, 880)],
               [(1720, 720), (2050, 760), (2400, 760)],
               [(2050, 600), (2050, 1100)]]
    # the city wall (an arc open to the sea)
    wall = [(cx + rad * math.cos(t_), cy + rad * math.sin(t_)) for t_ in np.linspace(math.radians(178), math.radians(352), 70)]
    gi = min(range(len(wall)), key=lambda i: math.hypot(wall[i][0] - gate[0], wall[i][1] - gate[1]))
    for part in (wall[:gi - 1], wall[gi + 2:]):
        d.line(part, fill=(40, 36, 34, 255), width=30, joint="curve")
        d.line(part, fill=(112, 104, 94, 255), width=14, joint="curve")
    for (x, y) in wall[::7]:
        d.rectangle([x - 18, y - 18, x + 18, y + 18], fill=(84, 78, 72, 255), outline=(30, 26, 24, 255), width=3)
    d.rectangle([gate[0] - 30, gate[1] - 30, gate[0] + 30, gate[1] + 30], fill=(66, 58, 50, 255), outline=(176, 132, 58, 255), width=5)
    for s in streets:
        d.line(s, fill=(54, 50, 46, 255), width=34, joint="curve")
        d.line(s, fill=(98, 92, 84, 255), width=22, joint="curve")
    # landmarks (centres)
    exch = (1780, 1120)
    bind = (1860, 650)
    rx, ry = 2560, 600
    row = (2290, 830)
    lee = (2470, int(coast_y(2470)) - 80)
    hatch = (2200, 880)
    keep_out = [exch, bind, (rx, ry), lee]
    # dense blocks of slate and brick roofs
    for _ in range(2400):
        x, y = rng.uniform(1240, 2780), rng.uniform(380, 1500)
        if y > coast_y(x) - 70 or math.hypot(x - cx, y - cy) > rad - 40:
            continue
        if any(_seg_dist(x, y, s) < 34 for s in streets):
            continue
        if math.hypot(x - rx, y - ry) < 300 or any(math.hypot(x - a, y - b) < 110 for (a, b) in keep_out):
            continue
        w, h = rng.uniform(34, 62), rng.uniform(26, 48)
        if rng.random() < 0.5:
            w, h = h, w
        c = [(64, 66, 76), (98, 58, 46), (80, 78, 76), (56, 58, 66), (110, 72, 52)][int(rng.integers(0, 5))]
        k = rng.uniform(0.8, 1.15)
        c = tuple(int(v * k) for v in c)
        bb = [x - w / 2, y - h / 2, x + w / 2, y + h / 2]
        if lay.getpixel((int(x), int(y)))[3] > 0:
            continue
        d.rectangle(bb, fill=c + (255,), outline=(22, 20, 20, 255), width=3)
        if w > h:
            d.line([bb[0], y, bb[2], y], fill=tuple(int(v * 1.25) for v in c) + (255,), width=2)
        else:
            d.line([x, bb[1], x, bb[3]], fill=tuple(int(v * 1.25) for v in c) + (255,), width=2)
    # the Compact refinery: a fenced yard of tanks, stacks and pipe racks
    d.rectangle([rx - 250, ry - 210, rx + 260, ry + 220], fill=(40, 36, 34, 255), outline=(176, 132, 58, 255), width=6)
    d.line([(rx - 240, ry - 40), (rx + 250, ry - 40)], fill=(176, 132, 58, 255), width=12)
    d.line([(rx - 40, ry - 200), (rx - 40, ry + 210)], fill=(176, 132, 58, 255), width=12)
    d.line([(rx - 240, ry + 120), (rx + 250, ry + 120)], fill=(110, 78, 34, 255), width=8)
    for (tx, ty, tr) in [(rx - 150, ry - 120, 62), (rx + 70, ry - 120, 54), (rx - 150, ry + 50, 66), (rx + 90, ry + 40, 72),
                         (rx + 200, ry - 140, 40)]:
        d.ellipse([tx - tr, ty - tr, tx + tr, ty + tr], fill=(118, 108, 94, 255), outline=(176, 132, 58, 255), width=6)
        d.ellipse([tx - tr * 0.45, ty - tr * 0.45, tx + tr * 0.45, ty + tr * 0.45], fill=(78, 70, 62, 255))
    stacks = [(rx + 190, ry + 170), (rx - 200, ry + 180), (rx + 220, ry - 40)]
    for (sx, sy) in stacks:
        d.ellipse([sx - 30, sy - 30, sx + 30, sy + 30], fill=(26, 22, 20, 255), outline=(255, 120, 40, 255), width=8)
        d.ellipse([sx - 14, sy - 14, sx + 14, sy + 14], fill=(255, 150, 60, 255))
    # pipeline from the refinery down to the quay
    d.line([(rx - 120, ry + 220), (rx - 120, coast_y(rx - 120) - 40)], fill=(176, 132, 58, 255), width=12)
    # Refinery Row: grander houses with brass trim
    for k in range(6):
        x = row[0] - 170 + k * 66
        d.rectangle([x, row[1] - 40, x + 56, row[1] + 34], fill=(126, 80, 58, 255), outline=(206, 166, 86, 255), width=4)
    # landmark buildings
    def landmark(p, fill, w=120, h=90):
        d.rectangle([p[0] - w / 2, p[1] - h / 2, p[0] + w / 2, p[1] + h / 2], fill=fill + (255,), outline=(206, 166, 86, 255), width=7)
    landmark(exch, (120, 82, 50))
    landmark(bind, (188, 186, 184), 140, 100)
    d.ellipse([bind[0] - 30, bind[1] - 30, bind[0] + 30, bind[1] + 30], fill=(160, 170, 190, 255), outline=(176, 132, 58, 255), width=5)
    landmark(lee, (110, 62, 40), 100, 70)
    d.ellipse([hatch[0] - 20, hatch[1] - 20, hatch[0] + 20, hatch[1] + 20], fill=(30, 30, 34, 255), outline=(206, 166, 86, 255), width=6)
    # the Long Quay along the shore, piers and ships in the bay
    qx = np.linspace(1480, 2660, 40)
    quay = [(x, coast_y(x) - 18) for x in qx]
    d.line(quay, fill=(40, 38, 36, 255), width=60, joint="curve")
    d.line(quay, fill=(104, 98, 90, 255), width=44, joint="curve")
    ships = []
    for k, x in enumerate(range(1560, 2640, 150)):
        y0 = coast_y(x)
        d.rectangle([x - 16, y0, x + 16, y0 + 200], fill=(96, 70, 44, 255), outline=(40, 28, 18, 255), width=4)
        if k % 2 == 0:
            ships.append((x + 60, y0 + 130, 60 + (k % 3) * 18))
    for (hx, hy, Ls) in ships:
        hull = [(hx, hy - Ls), (hx + 26, hy - Ls * 0.55), (hx + 26, hy + Ls * 0.8), (hx - 26, hy + Ls * 0.8), (hx - 26, hy - Ls * 0.55)]
        d.polygon(hull, fill=(78, 48, 28, 255), outline=(206, 166, 86, 255))
        for f in (-0.3, 0.25):
            d.line([hx - 24, hy + Ls * f, hx + 24, hy + Ls * f], fill=(214, 204, 178, 255), width=7)
    base = composite(base, lay, offset=(6, 8), blur=6, strength=0.6)
    # glows: the refinery stacks, the Exchange, the inn, lamps along the quay
    glows = [(sx, sy, 300, (255, 110, 30), 75) for (sx, sy) in stacks] + [(rx, ry, 600, (255, 120, 40), 30)]
    for p in [exch, lee, bind] + [(x, coast_y(x) - 18) for x in range(1500, 2660, 110)]:
        glows.append((p[0], p[1], 80, (255, 196, 110), 55))
    for (x, y, r_, rgb, s) in glows:
        x0, y0, x1, y1 = int(max(0, x - r_)), int(max(0, y - r_)), int(min(W, x + r_)), int(min(H, y + r_))
        gy, gx = np.mgrid[y0:y1, x0:x1].astype(np.float32)
        f = np.clip(1 - np.sqrt((gx - x) ** 2 + (gy - y) ** 2) / r_, 0, 1) ** 2 * s / 100
        base[y0:y1, x0:x1, :3] += f[..., None] * np.array(rgb, np.float32) * 0.6
    # brume rolling in over the far sea; smoke from the stacks drifting west
    fog = np.clip(fbm(H, W, [520, 160, 40], [0.6, 0.3, 0.1], 406) * 0.9 + (yy - 1450) / 650 + (xx - 1800) / 2600, 0, 1)
    fog = fog * (1 - lm) * 0.7
    smoke = np.clip(fbm(H, W, [240, 70], [0.7, 0.3], 407) + 0.25, 0, 1)
    smoke *= np.exp(-((xx - 2250) / 650) ** 2 - ((yy - 330) / 260) ** 2) * 0.55
    base[..., :3] = base[..., :3] * (1 - fog[..., None]) + np.array([156, 158, 166], np.float32) * fog[..., None]
    base[..., :3] = base[..., :3] * (1 - smoke[..., None]) + np.array([52, 48, 46], np.float32) * smoke[..., None]
    out = Image.fromarray(clip8(base[..., :3]))
    td = ImageDraw.Draw(out)

    def lab(x, y, text, size=40, italic=True):
        f = font(size, italic)
        tw = td.textlength(text, font=f)
        td.text((x - tw / 2, y - size / 2), text, font=f, fill=(238, 222, 178), stroke_width=4, stroke_fill=(18, 14, 12))
    lab(700, 150, "ASHFORD ROADS", 110, False)
    lab(700, 250, "home port of the Reach", 44)
    lab(420, 900, "the ash fields", 54)
    lab(360, 580, "the Coast Road", 40)
    lab(gate[0] - 10, gate[1] + 62, "the gate", 34)
    lab(rx, ry - 260, "the Compact refinery", 44)
    lab(row[0], row[1] - 70, "Refinery Row", 36)
    lab(exch[0], exch[1] + 74, "Sallow's Exchange", 36)
    lab(bind[0], bind[1] - 78, "the Binding House", 36)
    lab(lee[0] + 40, lee[1] + 64, "the Lantern and Lee", 32)
    lab(2050, coast_y(2050) + 46, "the Long Quay", 40)
    lab(hatch[0], hatch[1] + 42, "culvert hatch", 28)
    lab(2550, 1820, "the brume", 62)
    lab(1150, 1700, "the harbour", 50)
    cx_, cy_ = 220, 1760
    for k in range(8):
        a = k * math.pi / 4 - math.pi / 2
        rr = 110 if k % 2 == 0 else 60
        td.polygon([(cx_ + rr * math.cos(a), cy_ + rr * math.sin(a)), (cx_ + 16 * math.cos(a + 1.2), cy_ + 16 * math.sin(a + 1.2)),
                    (cx_ + 16 * math.cos(a - 1.2), cy_ + 16 * math.sin(a - 1.2))], fill=(176, 132, 58), outline=(30, 24, 18))
    lab(cx_, cy_ - 140, "N", 40, False)
    arr = np.asarray(out).astype(np.float32)
    dd = np.sqrt(((xx - W / 2) / (W / 2)) ** 2 + ((yy - H / 2) / (H / 2)) ** 2)
    arr *= (1 - 0.5 * np.clip(dd - 0.6, 0, 1) ** 1.3)[..., None]
    arr += np.random.default_rng(410).normal(0, 3, (H, W)).astype(np.float32)[..., None]
    out = Image.fromarray(clip8(arr))
    iq = lambda p: (int(p[0]), int(p[1]))
    notes = [dict(x=int(gate[0]), y=int(gate[1]), page="coast_road", label="The Coast Road"),
             dict(x=1550, y=760, page="ashford", label="Ashford Roads"),
             dict(x=exch[0], y=exch[1], page="sallows_exchange", label="Sallow's Exchange"),
             dict(x=row[0], y=row[1], page="refinery_row", label="Refinery Row"),
             dict(x=hatch[0], y=hatch[1], page="undercourses", label="The culvert hatch (the Undercourses)"),
             dict(x=bind[0], y=bind[1], page="binding_house", label="The Binding House"),
             dict(x=lee[0], y=lee[1], page="lantern_lee", label="The Lantern and Lee"),
             dict(x=2050, y=int(coast_y(2050) - 18), page="long_quay", label="The Long Quay")]
    for n in notes:
        n["x"], n["y"] = iq((n["x"], n["y"]))
    scene = dict(id="ashford", name="Ashford Roads", width=W, height=H, gridSize=G, gridType="none",
                 background="assets/maps/ashford.webp", darkness=0.0, walls=[], lights=[], notes=notes, tokens=[])
    return out, scene


# ======================================================================
BUILDERS = {"grate_chamber": grate_chamber, "undercourses": undercourses, "sallows_exchange": sallows_exchange,
            "binding_house": binding_house, "lantern_lee": lantern_lee, "long_quay": long_quay}


def build_grid_map(m):
    segs = m.walls()
    base = m.render_base()
    img = m.finish(base, m.decor.img, segs)
    scene = m.scene_json(m.darkness, segs, getattr(m, "extra", None))
    return img, scene


def debug_overlay(img, scene, path):
    im = img.convert("RGB").copy()
    d = ImageDraw.Draw(im)
    gs = scene["gridSize"]
    if scene["gridType"] == "square":
        for x in range(0, scene["width"] + 1, gs):
            d.line([x, 0, x, scene["height"]], fill=(255, 255, 255), width=1)
        for y in range(0, scene["height"] + 1, gs):
            d.line([0, y, scene["width"], y], fill=(255, 255, 255), width=1)
    for w in scene["walls"]:
        col = {0: (255, 40, 40), 1: (40, 255, 40), 2: (255, 40, 255)}[w["door"]]
        d.line(w["c"], fill=col, width=8)
    for li in scene["lights"]:
        r = li["dim"] / 5 * gs
        d.ellipse([li["x"] - r, li["y"] - r, li["x"] + r, li["y"] + r], outline=(255, 230, 0), width=4)
    for n in scene["notes"]:
        d.rectangle([n["x"] - 18, n["y"] - 18, n["x"] + 18, n["y"] + 18], fill=(0, 160, 255))
    for t in scene["tokens"]:
        d.ellipse([t["x"] - 30, t["y"] - 30, t["x"] + 30, t["y"] + 30], outline=(0, 255, 255), width=6)
    for (x, y) in scene.get("sunPath", []):
        d.rectangle([x - 12, y - 12, x + 12, y + 12], fill=(255, 255, 160))
    im.thumbnail((2000, 2000))
    im.save(path)


def validate(scene):
    W, H = scene["width"], scene["height"]
    pts = [(c[0], c[1]) for w in scene["walls"] for c in (w["c"][:2], w["c"][2:])]
    pts += [(o["x"], o["y"]) for k in ("lights", "notes", "tokens") for o in scene[k]]
    pts += [tuple(p) for p in scene.get("sunPath", [])]
    bad = [p for p in pts if not (0 <= p[0] <= W and 0 <= p[1] <= H)]
    assert not bad, f"{scene['id']}: points outside the image: {bad[:5]}"


def main():
    args = sys.argv[1:]
    dbg = None
    if "--debug" in args:
        i = args.index("--debug")
        dbg = args[i + 1]
        del args[i:i + 2]
        os.makedirs(dbg, exist_ok=True)
    names = args or ["ashford"] + list(BUILDERS)
    os.makedirs(OUT_DATA, exist_ok=True)
    for name in names:
        if name == "ashford":
            img, scene = ashford()
        else:
            img, scene = build_grid_map(BUILDERS[name]())
        validate(scene)
        save_webp(img, os.path.join(OUT_MAPS, f"{name}.webp"))
        with open(os.path.join(OUT_DATA, f"{name}.json"), "w", encoding="utf-8", newline="\n") as fh:
            json.dump(scene, fh, ensure_ascii=False, indent=1)
            fh.write("\n")
        if dbg:
            debug_overlay(img, scene, os.path.join(dbg, f"{name}.png"))
            img.copy().resize((img.width // 2, img.height // 2)).save(os.path.join(dbg, f"{name}_art.png"))
        print(f"{name}: {scene['width']}x{scene['height']}, {len(scene['walls'])} walls, {len(scene['lights'])} lights")


if __name__ == "__main__":
    main()
