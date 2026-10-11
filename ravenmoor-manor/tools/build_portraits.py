"""Silhouette portraits for the Ravenmoor household: Victorian cut-paper profiles in gilt oval frames.

    python3 tools/build_portraits.py            # all portraits -> assets/portraits/*.webp
    python3 tools/build_portraits.py quill pip  # just these

Each figure is drawn as smooth outlines (Catmull-Rom splines through hand-placed points) in a 600 x 760 canvas,
facing right. Black silhouette, a faint rim light, and colour only where the story has light: lanterns, candles,
pumpkins, the green brazier.
"""
import math
import sys
from pathlib import Path

import numpy as np
from PIL import Image, ImageChops, ImageDraw, ImageFilter, ImageFont

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / "assets/portraits"
FONTS = ROOT / "assets/fonts"
W, H = 600, 760
OVAL = (70, 60, 530, 640)          # cameo window
INK = (24, 20, 18)


# ---------------------------------------------------------------- geometry ---
def spline(points, closed=True, steps=14):
    """Smooth curve through points (Catmull-Rom). A point given twice in a row makes a sharp corner."""
    pts = [tuple(p) for p in points]
    out = []
    n = len(pts)
    rng = range(n) if closed else range(n - 1)
    for i in rng:
        p0 = pts[(i - 1) % n] if closed or i > 0 else pts[i]
        p1 = pts[i]
        p2 = pts[(i + 1) % n]
        p3 = pts[(i + 2) % n] if closed or i + 2 < n else pts[min(i + 2, n - 1)]
        if p1 == p2:
            continue
        for s in range(steps):
            t = s / steps
            t2, t3 = t * t, t * t * t
            x = 0.5 * ((2 * p1[0]) + (-p0[0] + p2[0]) * t + (2 * p0[0] - 5 * p1[0] + 4 * p2[0] - p3[0]) * t2
                       + (-p0[0] + 3 * p1[0] - 3 * p2[0] + p3[0]) * t3)
            y = 0.5 * ((2 * p1[1]) + (-p0[1] + p2[1]) * t + (2 * p0[1] - 5 * p1[1] + 4 * p2[1] - p3[1]) * t2
                       + (-p0[1] + 3 * p1[1] - 3 * p2[1] + p3[1]) * t3)
            out.append((x, y))
    if not closed:
        out.append(pts[-1])
    return out


class Figure:
    """A silhouette built from filled shapes on a mask, plus coloured light layers drawn over it."""

    def __init__(self):
        self.mask = Image.new("L", (W, H), 0)
        self.d = ImageDraw.Draw(self.mask)
        self.lights = []      # (callable(draw_rgba), blur), drawn over the silhouette
        self.behind = []      # (callable(draw_rgba), blur), drawn behind it
        self.cut = Image.new("L", (W, H), 0)   # holes cut back out of the silhouette (eyes of a mask, etc.)
        self.dc = ImageDraw.Draw(self.cut)

    def shape(self, points, smooth=True):
        self.d.polygon(spline(points) if smooth else points, fill=255)

    def poly(self, points):
        self.d.polygon(points, fill=255)

    def ellipse(self, box):
        self.d.ellipse(box, fill=255)

    def line(self, points, width):
        self.d.line(points, fill=255, width=width, joint="curve")

    def hole(self, points=None, ellipse=None):
        if ellipse:
            self.dc.ellipse(ellipse, fill=255)
        else:
            self.dc.polygon(spline(points), fill=255)

    def glow(self, fn, blur=0):
        self.lights.append((fn, blur))

    def halo(self, fn, blur=0):
        self.behind.append((fn, blur))


# ------------------------------------------------------------------ bodies ---
def profile(f, *, nose=1.0, chin=1.0, age=0.0, dx=0, dy=0, jaw=0):
    """Head and neck in profile, facing right. nose/chin scale the features; age droops them a little."""
    a = age * 6
    pts = [
        (232, 392), (210, 340), (200, 280), (214, 218), (252, 180), (305, 168), (348, 182),
        (372, 214), (380, 248), (384, 266),                                   # forehead, brow
        (384 + 2 * nose, 276), (398 + 18 * nose, 312 + a), (398 + 18 * nose, 312 + a),   # nose tip (corner)
        (391 + 4 * nose, 324 + a), (384, 330 + a),                             # nostril
        (389, 340 + a), (383, 349 + a), (388, 357 + a),                        # lips
        (382 + 4 * chin, 376 + a), (372 + 3 * chin, 392 + a + jaw),            # chin
        (348, 400 + a + jaw), (336, 410), (338, 446),                           # under the jaw, neck
        (330, 470), (232, 470), (234, 430),
    ]
    f.shape([(x + dx, y + dy) for x, y in pts])


def shoulders(f, *, slope=0, width=1.0, dx=0, dy=0, stoop=0):
    """Bust down to the bottom of the cameo."""
    cx = 290 + dx
    pts = [
        (cx - 60, 430 + dy), (cx + 46, 430 + dy),
        (cx + 70 * width, 470 + dy), (cx + 150 * width, 520 + dy + slope), (cx + 205 * width, 600 + dy), (cx + 230 * width, 700),
        (cx + 230 * width, 760), (cx - 260 * width, 760), (cx - 250 * width, 690),
        (cx - 210 * width - stoop, 560 + dy - stoop), (cx - 150 * width - stoop, 500 + dy - stoop), (cx - 90, 455 + dy),
    ]
    f.shape(pts)


# ------------------------------------------------------------------ props ---
def candle_glow(color, center, radius, strength=1.0):
    def fn(img):
        d = ImageDraw.Draw(img)
        cx, cy = center
        for k in range(radius, 0, -6):
            a = int(110 * strength * (1 - k / radius) ** 1.6)
            d.ellipse([cx - k, cy - k, cx + k, cy + k], fill=color + (a,))
    return fn


def flame(center, size=1.0, color=(255, 196, 90)):
    def fn(img):
        d = ImageDraw.Draw(img)
        cx, cy = center
        pts = spline([(cx, cy - 22 * size), (cx + 7 * size, cy - 4 * size), (cx + 5 * size, cy + 6 * size),
                      (cx, cy + 9 * size), (cx - 5 * size, cy + 6 * size), (cx - 7 * size, cy - 4 * size)])
        d.polygon(pts, fill=color + (255,))
        d.ellipse([cx - 3 * size, cy - 2 * size, cx + 3 * size, cy + 6 * size], fill=(255, 250, 220, 255))
    return fn


def pumpkin(f, box, face=True):
    """A carved jack-o'-lantern lit from within: orange body, darker ribs, glowing yellow face."""
    x0, y0, x1, y1 = box
    cx, cy = (x0 + x1) / 2, (y0 + y1) / 2
    w, h = x1 - x0, y1 - y0
    f.glow(candle_glow((255, 140, 30), (cx, cy), int(max(w, h) * 0.85), 1.0), 10)

    def body(img):
        d = ImageDraw.Draw(img)
        d.ellipse(box, fill=(214, 104, 26, 255))
        for k in (0.18, 0.36):
            d.arc([x0 + w * k, y0 + 2, x1 - w * k, y1 - 2], 95, 265, fill=(150, 66, 14, 255), width=3)
            d.arc([x0 + w * k, y0 + 2, x1 - w * k, y1 - 2], -85, 85, fill=(150, 66, 14, 255), width=3)
        d.polygon([(cx - w * 0.04, y0 + 4), (cx - w * 0.02, y0 - h * 0.16), (cx + w * 0.06, y0 - h * 0.18), (cx + w * 0.04, y0 + 4)],
                  fill=(70, 60, 30, 255))
        if face:
            lit = (255, 226, 110, 255)
            d.polygon([(cx - w * 0.30, cy - h * 0.06), (cx - w * 0.18, cy - h * 0.26), (cx - w * 0.08, cy - h * 0.04)], fill=lit)
            d.polygon([(cx + w * 0.08, cy - h * 0.04), (cx + w * 0.18, cy - h * 0.26), (cx + w * 0.30, cy - h * 0.06)], fill=lit)
            d.polygon([(cx - w * 0.04, cy + h * 0.02), (cx, cy - h * 0.08), (cx + w * 0.04, cy + h * 0.02)], fill=lit)
            mouth = [(cx - w * 0.34, cy + h * 0.10), (cx - w * 0.22, cy + h * 0.16), (cx - w * 0.14, cy + h * 0.12),
                     (cx - w * 0.06, cy + h * 0.20), (cx + w * 0.04, cy + h * 0.13), (cx + w * 0.12, cy + h * 0.20),
                     (cx + w * 0.22, cy + h * 0.13), (cx + w * 0.34, cy + h * 0.10), (cx + w * 0.22, cy + h * 0.30),
                     (cx, cy + h * 0.34), (cx - w * 0.22, cy + h * 0.30)]
            d.polygon(mouth, fill=lit)
    f.glow(body, 0)


# --------------------------------------------------------------- characters ---
def quill(f, masked=True):
    shoulders(f, width=1.05)
    # Long oiled coat collar standing up behind the head.
    f.shape([(206, 520), (196, 420), (214, 360), (236, 352), (250, 430), (262, 500)])
    if masked:
        # Plague doctor: wide-brimmed hat, round hood, long beak.
        f.shape([(214, 400), (196, 330), (204, 262), (240, 214), (300, 198), (352, 214), (380, 252), (388, 292),
                 (382, 330), (360, 372), (330, 404), (290, 420)])
        f.shape([(372, 262), (472, 330), (520, 372), (520, 372), (470, 360), (400, 344), (366, 330)])  # beak
        f.poly([(138, 222), (468, 210), (474, 222), (140, 236)])                                      # brim
        f.shape([(206, 222), (214, 150), (236, 118), (300, 108), (356, 118), (372, 150), (380, 214)])  # crown
        f.poly([(212, 196), (376, 192), (378, 206), (210, 210)])
        f.hole(ellipse=[318, 252, 350, 284])                                                         # goggle lens
        f.glow(lambda img: ImageDraw.Draw(img).ellipse([322, 256, 346, 280], fill=(120, 220, 160, 255)), 0)
        f.glow(candle_glow((80, 230, 140), (334, 268), 40, 0.8), 6)
        f.glow(lambda img: ImageDraw.Draw(img).ellipse([152, 668, 168, 684], fill=(70, 150, 100, 255)), 0)  # signet
    else:
        profile(f, nose=1.1, chin=0.9, age=0.6)
        # Swept silver hair and whiskers, half-moon spectacles.
        f.shape([(214, 360), (198, 290), (210, 222), (250, 182), (306, 170), (348, 184), (366, 206), (330, 200),
                 (290, 204), (262, 230), (250, 290), (256, 360)])
        f.shape([(330, 392), (344, 420), (372, 420), (386, 398), (370, 404), (350, 400)])           # whiskers
        f.hole(ellipse=[352, 262, 384, 280])
        f.glow(lambda img: ImageDraw.Draw(img).ellipse([352, 262, 384, 280], outline=(200, 190, 160, 255), width=3), 0)
        # The mask, torn off, held low.
        f.shape([(330, 540), (370, 500), (420, 494), (430, 470), (444, 472), (440, 500), (490, 520), (490, 520),
                 (440, 540), (392, 576), (346, 578)])
        f.glow(lambda img: ImageDraw.Draw(img).ellipse([380, 508, 398, 526], fill=(120, 220, 160, 220)), 0)


def morwenna(f):
    shoulders(f, width=0.92, slope=-10)
    profile(f, nose=0.75, chin=0.8, dx=4)
    # Swept-up hair with a crown of black swan feathers.
    f.shape([(222, 370), (200, 300), (212, 228), (256, 186), (318, 176), (352, 196), (330, 206), (284, 214),
             (262, 252), (252, 320), (258, 370)])
    # Feathers swept back from the crown, each curving down at the tip like a swan's plume.
    for i, (bx, by, ang) in enumerate([(232, 200, -168), (240, 190, -150), (252, 182, -134), (266, 176, -118), (226, 214, -186)]):
        L = 150 - i * 12
        r = math.radians(ang)
        mid = (bx + 0.55 * L * math.cos(r), by + 0.55 * L * math.sin(r) - 18)
        tip = (bx + L * math.cos(r), by + L * math.sin(r) + 14)
        nx, ny = -math.sin(r) * 11, math.cos(r) * 11
        f.shape([(bx - nx, by - ny), (mid[0] - nx * 1.3, mid[1] - ny * 1.3), tip, tip,
                 (mid[0] + nx * 1.3, mid[1] + ny * 1.3), (bx + nx, by + ny)])
    # Swan mask over the eyes.
    f.shape([(318, 236), (360, 228), (392, 244), (392, 244), (366, 268), (330, 270), (312, 254)])
    f.hole(ellipse=[346, 244, 362, 256])
    # Long neck, feathered collar, and a closed fan.
    f.shape([(240, 470), (300, 448), (370, 470), (420, 500), (330, 520), (250, 520)])
    f.shape([(420, 640), (500, 520), (512, 528), (440, 650)])
    f.glow(lambda img: ImageDraw.Draw(img).ellipse([346, 244, 362, 256], fill=(210, 200, 255, 160)), 0)


def edric(f):
    shoulders(f, width=1.12)
    # Headless horseman: the cloak collar hitched above the shoulders, no head.
    f.shape([(196, 470), (190, 380), (206, 300), (226, 268), (226, 268), (290, 290), (360, 280), (360, 280),
             (380, 330), (388, 400), (384, 470)])
    f.hole(ellipse=[246, 286, 346, 318])            # the empty collar, seen from just above
    f.glow(lambda img: ImageDraw.Draw(img).ellipse([252, 292, 340, 312], fill=(60, 30, 26, 255)), 0)
    # The papier-mache pumpkin head under one arm.
    f.shape([(340, 600), (380, 540), (470, 530), (500, 580), (470, 620), (380, 630)])
    pumpkin(f, (356, 444, 496, 560))
    # A glass in the other hand.
    f.shape([(150, 600), (190, 600), (182, 640), (172, 646), (172, 680), (190, 690), (150, 690), (166, 680), (166, 646), (156, 640)])


def pip(f):
    shoulders(f, width=0.9, dy=10)
    profile(f, nose=0.7, chin=0.7, dy=12, dx=-4)
    # Enormous witch's hat sliding over her eyes, hair bunched behind.
    f.poly([(116, 254), (452, 222), (458, 238), (126, 272)])                     # brim, tilted
    f.shape([(196, 252), (226, 160), (262, 96), (300, 52), (352, 38), (352, 38), (318, 78), (316, 150), (350, 236)])
    f.shape([(214, 290), (184, 330), (176, 390), (204, 420), (236, 380), (246, 320)])  # curls
    f.shape([(196, 330), (168, 360), (166, 410), (188, 440), (206, 400)])
    # Ink-stained hand holding a candle up.
    f.shape([(380, 540), (410, 496), (436, 496), (436, 540), (400, 580)])
    f.poly([(414, 430), (432, 430), (432, 498), (414, 498)])
    f.glow(lambda img: ImageDraw.Draw(img).rectangle([414, 430, 432, 498], fill=(240, 228, 200, 255)), 0)
    f.glow(candle_glow((255, 190, 90), (423, 400), 170, 1.2), 12)
    f.glow(flame((423, 408), 1.8), 0)


def bramwell(f):
    shoulders(f, width=1.15, stoop=18, dx=-6)
    profile(f, nose=1.3, chin=1.2, age=1.0, dx=-10, dy=14)
    # Floppy wide-brimmed hat, beard stubble, pipe.
    f.poly([(150, 232), (450, 216), (462, 236), (150, 254)])
    f.shape([(206, 236), (214, 176), (262, 150), (330, 152), (366, 180), (376, 228)])
    f.shape([(326, 380), (356, 420), (382, 418), (390, 396), (370, 404), (350, 398)])   # beard
    f.line([(380, 360), (426, 372), (432, 356)], 8)                                       # pipe
    f.glow(candle_glow((255, 160, 70), (432, 354), 24, 0.8), 4)
    # Shovel over the shoulder and a lantern hanging low.
    f.line([(150, 760), (126, 300)], 14)
    f.shape([(104, 300), (148, 300), (152, 236), (126, 214), (100, 236)])
    f.line([(440, 440), (440, 486)], 4)
    f.shape([(416, 486), (464, 486), (470, 556), (410, 556)])
    f.glow(candle_glow((255, 180, 80), (440, 522), 120, 1.0), 10)
    f.glow(lambda img: ImageDraw.Draw(img).rectangle([422, 498, 458, 546], fill=(255, 200, 110, 255)), 0)


def crane(f):
    shoulders(f, width=0.95, slope=-6)
    profile(f, nose=1.05, chin=1.0, age=0.9, dx=2)
    # Iron-grey bun and a high starched collar.
    f.shape([(226, 360), (204, 290), (214, 220), (258, 182), (318, 172), (356, 192), (360, 214), (300, 210), (270, 250), (260, 320), (262, 362)])
    f.ellipse([168, 214, 238, 284])
    f.shape([(250, 470), (240, 420), (300, 410), (348, 420), (352, 470)])
    # Ring of keys at the waist, glinting.
    f.line([(380, 470), (420, 500)], 5)
    f.d.ellipse([396, 496, 456, 556], outline=255, width=7)
    for ang in (40, 75, 110, 140):
        r = math.radians(ang)
        x0, y0 = 426 + 30 * math.cos(r), 526 + 30 * math.sin(r)
        f.line([(x0, y0), (x0 + 10 * math.cos(r), y0 + 38)], 7)
    f.glow(lambda img: ImageDraw.Draw(img).arc([396, 496, 456, 556], 200, 320, fill=(220, 200, 150, 255), width=3), 0)


def silas(f):
    shoulders(f, width=0.88, stoop=10)
    profile(f, nose=1.25, chin=1.1, age=1.2, dx=-2)
    # Thin swept hair, velvet robe collar, raven-headed cane.
    f.shape([(222, 360), (204, 290), (214, 226), (254, 188), (306, 178), (340, 190), (310, 196), (272, 214), (256, 270), (262, 360)])
    f.shape([(240, 470), (232, 430), (290, 420), (300, 470), (360, 470), (330, 520), (280, 540)])
    f.line([(450, 760), (452, 470)], 12)
    f.shape([(430, 470), (440, 440), (470, 430), (500, 440), (516, 450), (496, 456), (478, 462), (476, 480), (452, 486)])
    f.hole(ellipse=[466, 440, 474, 448])
    f.glow(lambda img: ImageDraw.Draw(img).ellipse([466, 440, 474, 448], fill=(220, 220, 230, 255)), 0)


def fennick(f):
    # A halfling: smaller, lower in the frame, with a dripping cloak and fogged spectacles.
    shoulders(f, width=0.85, dy=70)
    profile(f, nose=0.9, chin=0.9, dy=70, dx=-6)
    f.shape([(206, 420), (196, 350), (214, 290), (258, 252), (318, 244), (350, 262), (340, 274), (300, 270), (268, 300), (258, 380)])
    f.shape([(170, 760), (176, 520), (224, 480), (300, 470), (378, 490), (420, 560), (430, 760)])   # cloak
    for x in (186, 230, 300, 380, 414):
        f.line([(x, 700), (x + 2, 740)], 3)
        f.ellipse([x - 3, 744, x + 5, 752])
    f.hole(ellipse=[344, 328, 374, 348])
    f.glow(lambda img: ImageDraw.Draw(img).ellipse([344, 328, 374, 348], fill=(225, 228, 230, 230)), 0)
    # Satchel clutched to the chest.
    f.shape([(330, 560), (430, 560), (436, 640), (326, 640)])
    f.glow(lambda img: ImageDraw.Draw(img).line([(326, 590), (436, 590)], fill=(160, 140, 110, 200), width=2), 0)


def widow(f):
    # The Lantern Widow: veiled, a long gown, and a lantern of green glass. Drawn pale against a dark cameo.
    shoulders(f, width=0.9, slope=-8)
    profile(f, nose=0.8, chin=0.8, dx=4)
    f.shape([(160, 760), (176, 560), (196, 400), (204, 260), (246, 180), (318, 166), (370, 196), (394, 260),
             (404, 330), (420, 420), (440, 560), (460, 760)])                                            # veil
    f.line([(430, 410), (430, 470)], 4)
    f.shape([(404, 470), (456, 470), (464, 548), (396, 548)])
    f.halo(candle_glow((90, 255, 160), (300, 360), 300, 0.9), 30)
    f.glow(candle_glow((70, 255, 150), (430, 510), 170, 1.1), 14)
    f.glow(lambda img: ImageDraw.Draw(img).rectangle([410, 480, 450, 540], fill=(150, 255, 190, 255)), 0)


def scarecrow(f):
    shoulders(f, width=1.2, slope=10)
    # Burlap shoulders bursting with straw, a carved pumpkin head lit from within.
    f.shape([(250, 470), (262, 400), (350, 400), (360, 470)])
    for x in range(130, 480, 22):
        f.line([(x, 470), (x + (x % 3 - 1) * 14, 430)], 4)
    f.poly([(150, 252), (460, 238), (466, 256), (152, 270)])                                              # hat brim
    f.shape([(214, 250), (228, 176), (300, 156), (368, 172), (386, 244)])
    pumpkin(f, (196, 236, 414, 420))


def skeleton(f):
    shoulders(f, width=0.95)
    # Skull in profile, a rusted helm, rotted finery.
    f.shape([(222, 380), (204, 310), (214, 236), (258, 190), (318, 182), (362, 206), (384, 252), (386, 300),
             (372, 330), (360, 370), (330, 392), (300, 400), (270, 398)])
    f.hole(ellipse=[318, 252, 356, 290])
    f.hole(points=[(370, 302), (380, 318), (366, 322)])
    for i in range(5):
        f.dc.rectangle([314 + i * 10, 352, 320 + i * 10, 372], fill=255)
    f.shape([(198, 280), (204, 196), (256, 150), (330, 146), (380, 180), (396, 240), (300, 222)])           # helm
    f.glow(candle_glow((120, 255, 170), (337, 271), 30, 0.7), 4)


CHARACTERS = {
    "quill-masked": ("Dr. Thaddeus Quill", "Family physician · plague doctor", quill, "cream"),
    "quill-unmasked": ("Dr. Thaddeus Quill", "Unmasked", lambda f: quill(f, masked=False), "cream"),
    "morwenna": ("Lady Morwenna Ravenmoor", "Silas's second wife · black swan", morwenna, "cream"),
    "edric": ("Edric Ravenmoor", "Silas's eldest son · headless horseman", edric, "cream"),
    "pip": ("Penelope “Pip” Ravenmoor", "Granddaughter, illusionist · witch", pip, "cream"),
    "bramwell": ("Bramwell Hatch", "Groundskeeper and gravedigger", bramwell, "cream"),
    "crane": ("Mrs. Agatha Crane", "Housekeeper", crane, "cream"),
    "silas": ("Lord Silas Ravenmoor", "Lord of Ravenmoor", silas, "cream"),
    "fennick": ("Fennick Barrowdown", "Solicitor", fennick, "cream"),
    "lantern-widow": ("The Lantern Widow", "Elspeth Ravenmoor", widow, "mist"),
    "pumpkin-scarecrow": ("Pumpkin-Headed Scarecrow", "Animated by the chalk circle", scarecrow, "dusk"),
    "skeleton": ("Ravenmoor Skeleton", "Raised from the family crypt", skeleton, "crypt"),
}

BACKDROPS = {
    "cream": ((246, 236, 212), (214, 196, 160), INK),
    "mist": ((96, 132, 116), (16, 30, 26), (14, 26, 22)),
    "dusk": ((92, 52, 40), (28, 16, 18), INK),
    "crypt": ((58, 64, 70), (18, 20, 24), INK),
}


# ---------------------------------------------------------------- rendering ---
def radial(size, inner, outer, center=None, power=1.4):
    w, h = size
    cx, cy = center or (w / 2, h * 0.42)
    y, x = np.mgrid[0:h, 0:w]
    r = np.sqrt(((x - cx) / (w * 0.62)) ** 2 + ((y - cy) / (h * 0.62)) ** 2)
    t = np.clip(r, 0, 1) ** power
    arr = np.zeros((h, w, 3), dtype=np.float32)
    for i in range(3):
        arr[..., i] = inner[i] * (1 - t) + outer[i] * t
    return Image.fromarray(arr.astype(np.uint8), "RGB")


def paper(img, amount=10, seed=3):
    rng = np.random.default_rng(seed)
    n = rng.normal(0, amount, (img.height // 2, img.width // 2)).astype(np.float32)
    n = np.asarray(Image.fromarray(n).resize(img.size, Image.BICUBIC))
    arr = np.asarray(img).astype(np.float32) + n[..., None]
    return Image.fromarray(np.clip(arr, 0, 255).astype(np.uint8), "RGB")


def render(key):
    name, subtitle, draw_fn, backdrop = CHARACTERS[key]
    inner, outer, ink = BACKDROPS[backdrop]

    # Card background: dark damask green-black.
    card = radial((W, H), (34, 40, 36), (12, 14, 13), center=(W / 2, H / 2), power=1.2)
    card = paper(card, 6, seed=11)

    # Cameo interior.
    cameo = paper(radial((W, H), inner, outer), 7 if backdrop == "cream" else 4, seed=len(key))
    f = Figure()
    draw_fn(f)
    sil = ImageChops.subtract(f.mask, f.cut)

    # Silhouette with a faint rim light from the upper left.
    for fn, blur in f.behind:
        layer = Image.new("RGBA", (W, H), (0, 0, 0, 0))
        fn(layer)
        if blur:
            layer = layer.filter(ImageFilter.GaussianBlur(blur))
        cameo = Image.alpha_composite(cameo.convert("RGBA"), layer).convert("RGB")
    rim_src = (255, 236, 200) if backdrop != "mist" else (160, 255, 200)
    shifted = ImageChops.offset(sil, 3, 3)
    rim = ImageChops.subtract(sil, shifted).filter(ImageFilter.GaussianBlur(1.2))
    body = Image.new("RGB", (W, H), ink)
    cameo.paste(body, (0, 0), sil)
    rim_layer = Image.new("RGB", (W, H), rim_src)
    cameo.paste(rim_layer, (0, 0), rim.point(lambda v: int(v * (0.35 if backdrop == "cream" else 0.6))))

    # Lights.
    for fn, blur in f.lights:
        layer = Image.new("RGBA", (W, H), (0, 0, 0, 0))
        fn(layer)
        if blur:
            layer = layer.filter(ImageFilter.GaussianBlur(blur))
        cameo = Image.alpha_composite(cameo.convert("RGBA"), layer).convert("RGB")

    # Clip the cameo to the oval and lay it on the card.
    oval_mask = Image.new("L", (W, H), 0)
    ImageDraw.Draw(oval_mask).ellipse(OVAL, fill=255)
    oval_mask = oval_mask.filter(ImageFilter.GaussianBlur(0.8))
    card.paste(cameo, (0, 0), oval_mask)

    # Inner shadow inside the oval.
    shade = Image.new("L", (W, H), 0)
    ImageDraw.Draw(shade).ellipse(OVAL, outline=150, width=26)
    shade = ImageChops.multiply(shade.filter(ImageFilter.GaussianBlur(14)), oval_mask)
    card.paste(Image.new("RGB", (W, H), (0, 0, 0)), (0, 0), shade)

    # Gilt frame.
    d = ImageDraw.Draw(card)
    x0, y0, x1, y1 = OVAL
    for i, col in enumerate([(70, 52, 24), (160, 122, 58), (222, 186, 110), (168, 128, 60), (96, 70, 30)]):
        d.ellipse([x0 - 18 + i * 3, y0 - 18 + i * 3, x1 + 18 - i * 3, y1 + 18 - i * 3], outline=col, width=4)
    d.ellipse([x0 - 4, y0 - 4, x1 + 4, y1 + 4], outline=(60, 44, 20), width=3)

    # Nameplate.
    plate = [110, 662, 490, 742]
    d.rounded_rectangle(plate, radius=10, fill=(30, 26, 22), outline=(190, 150, 80), width=3)
    d.rounded_rectangle([plate[0] + 6, plate[1] + 6, plate[2] - 6, plate[3] - 6], radius=7, outline=(110, 84, 40), width=1)
    title = fit_font("IMFellEnglish-Regular.ttf", name, 34, plate[2] - plate[0] - 30)
    sub = ImageFont.truetype(str(FONTS / "IMFellEnglish-Italic.ttf"), 19)
    tw = d.textlength(name, font=title)
    d.text(((W - tw) / 2, plate[1] + 10), name, font=title, fill=(240, 226, 196))
    sw = d.textlength(subtitle, font=sub)
    d.text(((W - sw) / 2, plate[1] + 48), subtitle, font=sub, fill=(150, 210, 170))

    out = OUT / f"{key}.webp"
    card.save(out, "WEBP", quality=88)
    return out


def fit_font(file, text, size, width):
    while size > 16:
        font = ImageFont.truetype(str(FONTS / file), size)
        if ImageDraw.Draw(Image.new("L", (1, 1))).textlength(text, font=font) <= width:
            return font
        size -= 1
    return ImageFont.truetype(str(FONTS / file), size)


def main(keys):
    OUT.mkdir(parents=True, exist_ok=True)
    for key in keys or CHARACTERS:
        print("wrote", render(key).relative_to(ROOT))


if __name__ == "__main__":
    main(sys.argv[1:])
