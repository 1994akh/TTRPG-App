"""Portraits and tokens for Ashford Roads: Act 1: gaslit cut-paper silhouettes in brass, verdigris or rust frames.

    python3 tools/build_portraits.py            # every portrait -> assets/portraits/<key>.webp, tokens -> assets/tokens/
    python3 tools/build_portraits.py enkrid     # just these

Each figure is a profile (facing right) built from a few parametric parts on a 2x canvas, then downsampled.
Heroes get brass frames on amber, people verdigris on teal, foes rust on red. Deterministic.
"""
import math
import os
import sys

import numpy as np
from PIL import Image, ImageDraw, ImageFilter

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from artlib import ROOT, font, noise, clip8, save_webp

S = 2
W, H = 400 * S, 500 * S
INK = (22, 18, 20)
ROLE = {
    "hero": dict(bg=((92, 58, 26), (226, 170, 92)), frame=((120, 84, 34), (226, 186, 106)), glow=(255, 196, 110)),
    "npc": dict(bg=((22, 52, 50), (110, 168, 150)), frame=((44, 92, 78), (130, 190, 160)), glow=(180, 230, 210)),
    "foe": dict(bg=((52, 14, 12), (170, 64, 38)), frame=((86, 40, 26), (170, 96, 60)), glow=(255, 120, 60)),
}


def spline(points, closed=True, steps=14):
    pts = [tuple(p) for p in points]
    out, n = [], len(pts)
    for i in (range(n) if closed else range(n - 1)):
        p0 = pts[(i - 1) % n] if closed or i > 0 else pts[i]
        p1, p2 = pts[i], pts[(i + 1) % n]
        p3 = pts[(i + 2) % n] if closed or i + 2 < n else pts[-1]
        for s in range(steps):
            t = s / steps
            t2, t3 = t * t, t * t * t
            out.append(tuple(0.5 * ((2 * p1[k]) + (-p0[k] + p2[k]) * t + (2 * p0[k] - 5 * p1[k] + 4 * p2[k] - p3[k]) * t2
                                    + (-p0[k] + 3 * p1[k] - 3 * p2[k] + p3[k]) * t3) for k in (0, 1)))
    if not closed:
        out.append(pts[-1])
    return out


class Fig:
    def __init__(self):
        self.m = Image.new("L", (W, H), 0)
        self.d = ImageDraw.Draw(self.m)
        self.accents = []        # (fn(draw), blur)

    def poly(self, pts, smooth=True, fill=255):
        p = [(x * S, y * S) for (x, y) in pts]
        self.d.polygon(spline(p) if smooth else p, fill=fill)

    def ell(self, cx, cy, rx, ry, fill=255):
        self.d.ellipse([(cx - rx) * S, (cy - ry) * S, (cx + rx) * S, (cy + ry) * S], fill=fill)

    def line(self, pts, w, fill=255):
        self.d.line([(x * S, y * S) for (x, y) in pts], fill=fill, width=int(w * S), joint="curve")

    def accent(self, fn, blur=0):
        self.accents.append((fn, blur))


# ---------------------------------------------------------------- parts ------
def shoulders(f, width=1.0, top=345, neck_x=200, slope=1.0):
    w = 168 * width
    f.poly([(neck_x - w - 30, 520), (neck_x - w, top + 60 * slope), (neck_x - w * 0.55, top + 8), (neck_x - 20, top - 6),
            (neck_x + 40, top - 6), (neck_x + w * 0.6, top + 14), (neck_x + w * 0.95, top + 70 * slope),
            (neck_x + w + 30, 520)])


def neck(f, x=200, y=300, w=56, h=90, lean=0):
    f.poly([(x - w / 2, y), (x + w / 2, y), (x + w / 2 + lean, y + h), (x - w / 2 + lean, y + h)], smooth=False)


def head(f, cx=205, cy=230, rx=70, ry=84, nose="human", chin=1.0, brow=0.0, jaw=1.0):
    f.ell(cx - 6, cy - 6, rx, ry)
    r = rx
    face = [(cx + r * 0.2, cy - ry * 0.95), (cx + r * 0.72, cy - ry * 0.72), (cx + r * (0.94 + brow), cy - ry * 0.28)]
    if nose == "human":
        face += [(cx + r * 1.02, cy - ry * 0.12), (cx + r * 1.2, cy + ry * 0.12), (cx + r * 1.0, cy + ry * 0.2),
                 (cx + r * 1.03, cy + ry * 0.33), (cx + r * 0.98, cy + ry * 0.42), (cx + r * 1.0, cy + ry * 0.5)]
    elif nose == "big":
        face += [(cx + r * 1.05, cy - ry * 0.1), (cx + r * 1.42, cy + ry * 0.18), (cx + r * 1.0, cy + ry * 0.3),
                 (cx + r * 1.0, cy + ry * 0.45)]
    elif nose == "small":
        face += [(cx + r * 1.0, cy - ry * 0.1), (cx + r * 1.1, cy + ry * 0.12), (cx + r * 0.98, cy + ry * 0.22),
                 (cx + r * 1.0, cy + ry * 0.4)]
    elif nose == "heavy":
        face += [(cx + r * 1.04, cy - ry * 0.14), (cx + r * 1.22, cy + ry * 0.14), (cx + r * 1.05, cy + ry * 0.26),
                 (cx + r * 1.1, cy + ry * 0.42), (cx + r * 1.05, cy + ry * 0.55)]
    face += [(cx + r * 0.86 * chin, cy + ry * 0.72), (cx + r * 0.6, cy + ry * 0.86 * jaw), (cx + r * 0.05, cy + ry * 0.84 * jaw),
             (cx - r * 0.35, cy + ry * 0.55), (cx - r * 0.2, cy)]
    f.poly(face)


def beak(f, cx, cy, L=95):
    f.poly([(cx + 40, cy - 34), (cx + 70, cy - 30), (cx + 40 + L, cy + 6), (cx + 64, cy + 18), (cx + 40, cy + 26)],
           smooth=False)
    f.poly([(cx + 20, cy - 70), (cx + 64, cy - 40), (cx + 70, cy - 20), (cx + 30, cy + 40)])


def snout(f, cx, cy, L=90):
    f.poly([(cx + 30, cy - 46), (cx + 70, cy - 20), (cx + 40 + L, cy + 18), (cx + 34 + L, cy + 30), (cx + 60, cy + 44),
            (cx + 20, cy + 50)])


def goat_horns(f, cx, cy):
    for (dx, k) in ((-10, 1.0), (16, 0.85)):
        f.line([(cx + dx + 20, cy - 70), (cx + dx - 10, cy - 112 * k), (cx + dx - 60, cy - 124 * k), (cx + dx - 92, cy - 96 * k),
                (cx + dx - 88, cy - 62 * k)], 18 * k)


def pointed_ear(f, cx, cy, L=60, up=0.8):
    f.poly([(cx - 30, cy - 10), (cx - 30 - L * 0.3, cy - L * up), (cx - 6, cy - 4), (cx - 12, cy + 26)])


def fox_ears(f, cx, cy):
    f.poly([(cx - 50, cy - 58), (cx - 70, cy - 150), (cx - 6, cy - 80)], smooth=False)
    f.poly([(cx - 10, cy - 70), (cx + 2, cy - 160), (cx + 40, cy - 70)], smooth=False)


def tusk(f, cx, cy, L=30):
    f.accent(lambda d: d.polygon([((cx + 0) * S, (cy) * S), ((cx + 10) * S, (cy - L) * S), ((cx + 16) * S, (cy) * S)],
                                 fill=(230, 220, 190)))


def tricorn(f, cx, cy):
    f.ell(cx - 6, cy - 84, 66, 40)
    f.poly([(cx - 120, cy - 48), (cx - 70, cy - 92), (cx + 50, cy - 96), (cx + 104, cy - 62), (cx + 112, cy - 44),
            (cx + 30, cy - 66), (cx - 50, cy - 62)])


def bicorne(f, cx, cy):
    f.poly([(cx - 140, cy - 54), (cx - 40, cy - 140), (cx + 60, cy - 150), (cx + 150, cy - 64), (cx + 20, cy - 70)])
    f.accent(lambda d: d.ellipse([(cx - 10) * S, (cy - 120) * S, (cx + 14) * S, (cy - 96) * S], fill=(206, 166, 86)))


def top_hat(f, cx, cy):
    f.poly([(cx - 70, cy - 70), (cx - 60, cy - 200), (cx + 60, cy - 206), (cx + 66, cy - 70)], smooth=False)
    f.poly([(cx - 120, cy - 56), (cx - 60, cy - 84), (cx + 80, cy - 84), (cx + 130, cy - 60), (cx + 30, cy - 62)])
    f.accent(lambda d: d.rectangle([(cx - 64) * S, (cy - 100) * S, (cx + 64) * S, (cy - 86) * S], fill=(120, 30, 40)))


def hood(f, cx, cy):
    f.poly([(cx - 130, cy + 150), (cx - 120, cy - 40), (cx - 60, cy - 120), (cx + 40, cy - 124), (cx + 100, cy - 70),
            (cx + 96, cy + 10), (cx + 40, cy - 40), (cx - 20, cy + 40), (cx - 40, cy + 160)])


def bun(f, cx, cy, r=34):
    f.ell(cx - 70, cy - 70, r, r)


def ponytail(f, cx, cy, L=160):
    f.line([(cx - 72, cy + 4), (cx - 92, cy + 50), (cx - 96, cy + 100), (cx - 88, cy + L * 0.8)], 26)
    f.ell(cx - 80, cy + 8, 20, 20)


def braids(f, cx, cy):
    for k in range(3):
        f.line([(cx - 60 + k * 10, cy + 10), (cx - 90 + k * 14, cy + 80), (cx - 80 + k * 14, cy + 170)], 18)


def messy_hair(f, cx, cy, n=9, L=46, seed=1):
    r = np.random.default_rng(seed)
    for k in range(n):
        a = math.radians(200 + k * 140 / n + r.uniform(-6, 6))
        x0, y0 = cx - 10 + 70 * math.cos(a), cy - 10 + 80 * math.sin(a)
        x1, y1 = cx - 10 + (70 + L * r.uniform(0.6, 1.1)) * math.cos(a - 0.25), cy - 10 + (80 + L * r.uniform(0.6, 1.1)) * math.sin(a - 0.25)
        f.poly([(x0 - 14, y0), (x1, y1), (x0 + 14, y0 + 6)], smooth=False)


def long_hair(f, cx, cy, L=200):
    f.poly([(cx - 30, cy - 92), (cx - 90, cy - 70), (cx - 110, cy + 40), (cx - 100, cy + L), (cx - 30, cy + L - 20),
            (cx - 40, cy + 40)])


def updo(f, cx, cy):
    f.ell(cx - 36, cy - 106, 62, 48)
    f.ell(cx - 80, cy - 70, 40, 40)


def feather(f, cx, cy, color=(200, 60, 80)):
    f.line([(cx - 40, cy - 130), (cx - 100, cy - 200), (cx - 150, cy - 230)], 14)
    f.accent(lambda d: d.line([((cx - 44) * S, (cy - 134) * S), ((cx - 140) * S, (cy - 222) * S)], fill=color, width=4 * S))


def beard(f, cx, cy, L=140):
    f.poly([(cx - 30, cy + 20), (cx + 70, cy + 40), (cx + 86, cy + 90), (cx + 50, cy + L), (cx + 10, cy + L + 30),
            (cx - 20, cy + L), (cx - 40, cy + 60)])


def goatee(f, cx, cy):
    f.poly([(cx + 50, cy + 60), (cx + 76, cy + 62), (cx + 68, cy + 112), (cx + 50, cy + 96)])


def goggles(f, cx, cy, color=(206, 166, 86)):
    f.accent(lambda d: (d.ellipse([(cx + 4) * S, (cy - 92) * S, (cx + 44) * S, (cy - 54) * S], outline=color, width=6 * S),
                        d.line([((cx - 70) * S, (cy - 70) * S), ((cx + 6) * S, (cy - 72) * S)], fill=color, width=6 * S)))


def spectacles(f, cx, cy):
    f.accent(lambda d: d.ellipse([(cx + 52) * S, (cy - 36) * S, (cx + 78) * S, (cy - 10) * S], outline=(206, 186, 140), width=3 * S))


def high_collar(f, cx=200, top=320):
    f.poly([(cx - 70, top + 80), (cx - 60, top - 20), (cx - 10, top + 30), (cx + 50, top - 20), (cx + 70, top + 80)], smooth=False)


def watch_chain(f, x=230, y=440):
    def fn(d):
        pts = [((x - 60 + k * 8) * S, (y + 20 * math.sin(k / 15 * math.pi)) * S) for k in range(16)]
        d.line(pts, fill=(230, 190, 110), width=3 * S)
        d.ellipse([(x + 60) * S, (y - 16) * S, (x + 92) * S, (y + 16) * S], outline=(230, 190, 110), width=4 * S)
    f.accent(fn, 1)


def strap(f, x0, y0, x1, y1, color=(120, 80, 44)):
    f.accent(lambda d: d.line([(x0 * S, y0 * S), (x1 * S, y1 * S)], fill=color, width=12 * S))


def pens(f, cx, cy):
    f.line([(cx - 20, cy - 60), (cx - 70, cy - 120)], 6)
    f.line([(cx - 8, cy - 58), (cx - 44, cy - 128)], 6)


def eye(f, cx, cy, color=(255, 240, 200), r=6):
    f.accent(lambda d: d.ellipse([(cx - r) * S, (cy - r) * S, (cx + r) * S, (cy + r) * S], fill=color), 0)


def earring(f, cx, cy):
    f.accent(lambda d: d.ellipse([(cx - 9) * S, (cy - 9) * S, (cx + 9) * S, (cy + 9) * S], outline=(230, 190, 110), width=4 * S))


def chart_tube(f):
    f.line([(80, 300), (130, 520)], 36)
    f.accent(lambda d: d.line([(78 * S, 304 * S), (90 * S, 356 * S)], fill=(206, 166, 86), width=10 * S))


def helmet(f, cx, cy):
    f.poly([(cx - 96, cy - 6), (cx - 80, cy - 90), (cx - 10, cy - 116), (cx + 70, cy - 96), (cx + 96, cy - 40),
            (cx + 100, cy - 8), (cx + 60, cy - 20), (cx - 20, cy - 10)])
    f.accent(lambda d: d.line([((cx - 90) * S, (cy - 12) * S), ((cx + 98) * S, (cy - 12) * S)], fill=(60, 100, 150), width=8 * S))


def cap(f, cx, cy):
    f.poly([(cx - 80, cy - 40), (cx - 50, cy - 100), (cx + 30, cy - 104), (cx + 70, cy - 70), (cx + 130, cy - 58),
            (cx + 60, cy - 46), (cx - 20, cy - 40)])


def ribbon(f, cx, cy):
    f.accent(lambda d: (d.polygon([((cx - 80) * S, (cy - 60) * S), ((cx - 120) * S, (cy - 90) * S), ((cx - 110) * S, (cy - 40) * S)],
                                  fill=(170, 60, 70)),
                        d.polygon([((cx - 80) * S, (cy - 60) * S), ((cx - 100) * S, (cy - 10) * S), ((cx - 60) * S, (cy - 30) * S)],
                                  fill=(170, 60, 70))))


def curls(f, cx, cy, n=7):
    for k in range(n):
        a = math.radians(170 + k * 22)
        f.ell(cx - 14 + 78 * math.cos(a), cy - 8 + 84 * math.sin(a), 24, 24)


def tonsure(f, cx, cy):
    f.accent(lambda d: d.chord([(cx - 60) * S, (cy - 96) * S, (cx + 40) * S, (cy - 60) * S], 180, 360, fill=(70, 60, 56)))


# ---------------------------------------------------------------- creatures --
def rat_shape(f, cx, cy, s=1.0, scars=False):
    pts = [(-170, 40), (-150, -30), (-80, -90), (20, -100), (90, -70), (140, -40), (200, 0), (226, 22), (190, 34),
           (130, 50), (60, 70), (-40, 80), (-120, 70)]
    f.poly([(cx + x * s, cy + y * s) for (x, y) in pts])
    f.ell(cx + 80 * s, cy - 90 * s, 34 * s, 40 * s)                        # ear
    f.line([(cx - 160 * s, cy + 30 * s), (cx - 260 * s, cy + 70 * s), (cx - 330 * s, cy + 40 * s)], 14 * s)   # tail
    for lx in (-90, -20, 60, 110):
        f.line([(cx + lx * s, cy + 60 * s), (cx + (lx + 10) * s, cy + 120 * s), (cx + (lx + 26) * s, cy + 124 * s)], 14 * s)
    eye(f, cx + 150 * s, cy - 22 * s, (255, 90, 50), 7 * s)
    for k in range(3):
        f.accent(lambda d, k=k: d.line([((cx + 214 * s) * S, (cy + 16 * s) * S), ((cx + (270 + k * 10) * s) * S, (cy + (-10 + k * 20) * s) * S)],
                                       fill=(200, 190, 170), width=2 * S))
    if scars:
        f.accent(lambda d: d.line([((cx - 20 * s) * S, (cy - 80 * s) * S), ((cx + 30 * s) * S, (cy - 20 * s) * S)],
                                  fill=(150, 60, 50), width=5 * S))
        f.accent(lambda d: d.line([((cx - 60 * s) * S, (cy - 60 * s) * S), ((cx - 10 * s) * S, (cy) * S)],
                                  fill=(150, 60, 50), width=5 * S))


def gloam_shape(f):
    r = np.random.default_rng(77)
    f.ell(200, 250, 150, 130)
    for k in range(16):
        a = r.uniform(0, 2 * math.pi)
        L = r.uniform(140, 230)
        pts = [(200 + 100 * math.cos(a), 250 + 90 * math.sin(a))]
        for j in range(1, 5):
            aa = a + math.sin(j * 1.3 + k) * 0.35
            pts.append((200 + (100 + L * j / 4) * math.cos(aa), 250 + (90 + L * j / 4) * math.sin(aa)))
        f.line(pts, 34 - 6 * (k % 3))

    def mouth(d):
        d.chord([110 * S, 230 * S, 300 * S, 330 * S], 0, 180, fill=(60, 10, 12))
        for k in range(11):
            x = 120 + k * 17
            d.polygon([(x * S, 280 * S), ((x + 8) * S, (320 - (k % 2) * 10) * S), ((x + 16) * S, 280 * S)], fill=(236, 226, 200))
            d.polygon([(x * S, 330 * S), ((x + 8) * S, 300 * S), ((x + 16) * S, 330 * S)], fill=(220, 210, 184))
    f.accent(mouth)
    for (x, y) in [(150, 200), (250, 196), (200, 170), (290, 230)]:
        eye(f, x, y, (220, 255, 240), 9)


# ---------------------------------------------------------------- the cast ---
def human_base(f, **kw):
    shoulders(f, kw.get("sw", 1.0), kw.get("top", 345))
    neck(f, 196, 290, kw.get("nw", 60), 70)
    head(f, 205, kw.get("cy", 230), kw.get("rx", 70), kw.get("ry", 84), kw.get("nose", "human"), kw.get("chin", 1.0),
         kw.get("brow", 0.0), kw.get("jaw", 1.0))


def c_enkrid(f):
    shoulders(f, 0.8, 356)
    neck(f, 196, 290, 44, 80)
    head(f, 205, 236, 62, 80, "small", 0.95)
    messy_hair(f, 205, 236, 10, 42, 3)
    goat_horns(f, 205, 236)
    pointed_ear(f, 196, 236, 70, 0.9)
    watch_chain(f)


def c_protag2(f):
    shoulders(f, 0.92, 350)
    neck(f, 196, 290, 56, 72)
    f.ell(195, 226, 70, 80)
    beak(f, 200, 232, 100)
    for k in range(6):                                    # ruffled feathers at the crown and nape
        a = math.radians(200 + k * 24)
        f.poly([(195 + 60 * math.cos(a), 226 + 70 * math.sin(a)), (195 + 110 * math.cos(a - 0.2), 226 + 120 * math.sin(a - 0.2)),
                (195 + 70 * math.cos(a + 0.25), 226 + 76 * math.sin(a + 0.25))], smooth=False)
    pens(f, 180, 230)
    eye(f, 232, 214, (200, 220, 255), 7)
    strap(f, 120, 380, 300, 520)


def c_protag3(f):
    f.ell(150, 150, 34, 30)                                               # top-knot
    shoulders(f, 1.3, 330, slope=0.7)
    neck(f, 190, 280, 90, 60)
    head(f, 205, 218, 86, 94, "heavy", 1.08, 0.08, 1.05)
    braids(f, 205, 218)
    tusk(f, 278, 296, 30)
    pointed_ear(f, 196, 220, 40, 0.5)


def c_captain(f):
    human_base(f, sw=1.05)
    ponytail(f, 205, 230)
    tricorn(f, 205, 230)
    high_collar(f)


def c_first_mate(f):
    human_base(f, sw=0.95, rx=64, nose="small")
    long_hair(f, 205, 230)
    pointed_ear(f, 196, 226, 90, 0.85)
    chart_tube(f)
    spectacles(f, 205, 230)


def c_inventor(f):
    shoulders(f, 0.86, 375)
    neck(f, 196, 330, 54, 55)
    head(f, 205, 270, 74, 80, "big", 0.95)
    messy_hair(f, 205, 270, 8, 34, 9)
    goggles(f, 205, 270)
    strap(f, 110, 430, 300, 520, (150, 110, 60))


def c_ansel(f):
    human_base(f, sw=1.0)
    hood(f, 200, 236)
    spectacles(f, 205, 230)
    f.accent(lambda d: d.line([(196 * S, 420 * S), (196 * S, 480 * S)], fill=(206, 166, 86), width=6 * S))
    f.accent(lambda d: d.line([(176 * S, 440 * S), (216 * S, 440 * S)], fill=(206, 166, 86), width=6 * S))


def c_dov(f):
    shoulders(f, 0.78, 372)
    neck(f, 196, 310, 46, 70)
    head(f, 205, 262, 62, 74, "small", 0.95)
    cap(f, 205, 262)


def c_broker(f):
    shoulders(f, 0.95, 350)
    neck(f, 196, 290, 56, 72)
    f.ell(195, 232, 70, 76)
    snout(f, 200, 232, 92)
    fox_ears(f, 200, 232)
    high_collar(f)
    f.line([(160, 190), (120, 120)], 6)                                    # the quill behind her ear
    f.accent(lambda d: d.line([(160 * S, 190 * S), (120 * S, 120 * S)], fill=(230, 220, 200), width=4 * S))
    spectacles(f, 220, 230)
    eye(f, 250, 214, (255, 210, 120), 6)


def c_merchant(f):
    human_base(f, sw=1.15)
    top_hat(f, 205, 230)
    f.poly([(150, 250), (180, 250), (190, 320), (150, 300)])               # side-whiskers
    f.accent(lambda d: d.polygon([(190 * S, 380 * S), (230 * S, 380 * S), (210 * S, 440 * S)], fill=(214, 204, 178)))
    watch_chain(f, 220, 470)


def c_petra(f):
    shoulders(f, 0.75, 376)
    neck(f, 196, 316, 44, 66)
    head(f, 205, 262, 60, 72, "small", 0.92)
    curls(f, 205, 262)
    ribbon(f, 205, 262)


def c_binder(f):
    shoulders(f, 1.2, 372, slope=0.6)
    neck(f, 196, 330, 70, 50)
    head(f, 205, 270, 74, 78, "big", 1.0)
    beard(f, 205, 270, 150)
    goggles(f, 205, 270, (150, 200, 230))
    f.accent(lambda d: d.line([(150 * S, 340 * S), (170 * S, 420 * S)], fill=(206, 166, 86), width=8 * S))


def c_innkeeper(f):
    shoulders(f, 1.3, 334, slope=0.7)
    neck(f, 192, 286, 84, 56)
    head(f, 205, 224, 80, 88, "heavy", 1.05, 0.05, 1.05)
    tusk(f, 276, 300, 26)
    pointed_ear(f, 196, 228, 44, 0.45)
    earring(f, 176, 262)


def c_rourke(f):
    human_base(f, sw=1.05, nose="human", chin=1.05)
    bicorne(f, 205, 230)
    goatee(f, 205, 230)
    f.accent(lambda d: (d.rectangle([60 * S, 400 * S, 130 * S, 416 * S], fill=(206, 166, 86)),
                        [d.line([((64 + k * 12) * S, 416 * S), ((64 + k * 12) * S, 446 * S)], fill=(206, 166, 86), width=3 * S)
                         for k in range(6)]))


def c_noble(f):
    human_base(f, sw=0.9, nose="small", rx=64)
    updo(f, 205, 230)
    feather(f, 205, 230)
    high_collar(f)
    f.accent(lambda d: [d.ellipse([(150 + k * 22) * S, 400 * S, (170 + k * 22) * S, 420 * S], fill=(230, 226, 214)) for k in range(5)])


def c_sellsword(f):
    human_base(f, sw=1.15)
    helmet(f, 205, 230)
    f.accent(lambda d: d.polygon([(110 * S, 360 * S), (300 * S, 360 * S), (280 * S, 410 * S), (130 * S, 400 * S)], fill=(52, 86, 130)))


def c_pc_default(f):
    human_base(f, sw=1.0)
    hood(f, 200, 236)
    strap(f, 120, 380, 300, 520, (110, 84, 54))


def c_rat(f):
    rat_shape(f, 200, 300, 0.7)


def c_rat_swarm(f):
    for (x, y, s) in [(150, 150, 0.36), (260, 190, 0.38), (170, 270, 0.42), (270, 320, 0.36), (130, 370, 0.34), (240, 410, 0.32)]:
        rat_shape(f, x, y, s)


def c_old_gnaw(f):
    rat_shape(f, 196, 300, 0.82, scars=True)


def c_gloam(f):
    gloam_shape(f)


CAST = {
    "enkrid": ("Enkrid", "hero", c_enkrid), "protag2": ("Rook", "hero", c_protag2), "protag3": ("Tova", "hero", c_protag3),
    "pc_default": ("Traveller", "hero", c_pc_default),
    "captain": ("Captain Isolde Varr", "npc", c_captain), "first_mate": ("Elian Marsh", "npc", c_first_mate),
    "inventor": ("Aurelio Fenn", "npc", c_inventor), "ansel": ("Brother Ansel", "npc", c_ansel), "dov": ("Dov", "npc", c_dov),
    "broker": ("Odile Sallow", "npc", c_broker), "merchant": ("Hollis Tarrant", "npc", c_merchant),
    "petra": ("Petra Tarrant", "npc", c_petra), "binder": ("Binder Maren Quell", "npc", c_binder),
    "innkeeper": ("Old Dunmore", "npc", c_innkeeper), "rourke": ("Captain Silvan Rourke", "npc", c_rourke),
    "noble": ("Lady Celestine Varenne", "npc", c_noble),
    "sellsword": ("Coldwater sellsword", "foe", c_sellsword), "rat": ("Undercourse rat", "foe", c_rat),
    "rat_swarm": ("Rat swarm", "foe", c_rat_swarm), "old_gnaw": ("Old Gnaw", "foe", c_old_gnaw),
    "gloam": ("the Gloam", "foe", c_gloam),
}


# ---------------------------------------------------------------- render -----
def backdrop(role, w, h, seed):
    c0, c1 = (np.array(c, np.float32) for c in ROLE[role]["bg"])
    yy, xx = np.mgrid[0:h, 0:w].astype(np.float32)
    d = np.sqrt(((xx - w * 0.55) / w) ** 2 + ((yy - h * 0.42) / h) ** 2) * 1.8
    t = np.clip(1 - d, 0, 1)[..., None]
    img = c0 * (1 - t) + c1 * t
    img *= (1 + 0.06 * noise(h, w, 30 * S, seed)[..., None])
    fog = np.clip(noise(h, w, 120 * S, seed + 1, sx=260 * S), 0, 1)[..., None]
    img = img * (1 - 0.25 * fog) + np.array([160, 160, 168], np.float32) * 0.25 * fog
    return img


def render_figure(key):
    name, role, fn = CAST[key]
    f = Fig()
    fn(f)
    seed = sum(map(ord, key))
    img = backdrop(role, W, H, seed)
    m = np.asarray(f.m).astype(np.float32) / 255
    rim = np.asarray(f.m.filter(ImageFilter.GaussianBlur(10 * S))).astype(np.float32) / 255
    rim = np.clip(rim - m * 0.0, 0, 1) * (1 - m)
    glow = np.array(ROLE[role]["glow"], np.float32)
    img += rim[..., None] * glow * 0.35                                     # halo around the cut-out
    # rim light on the face side of the silhouette
    sh = np.zeros_like(m)
    sh[:, :-6 * S] = m[:, 6 * S:]
    edge = np.clip(m - sh, 0, 1)
    sil = np.array(INK, np.float32)
    img = img * (1 - m[..., None]) + sil * m[..., None]
    img += gaussian_edge(edge)[..., None] * glow * 0.6
    out = Image.fromarray(clip8(img)).convert("RGBA")
    acc = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    ad = ImageDraw.Draw(acc)
    for (afn, blur) in f.accents:
        afn(ad)
    out = Image.alpha_composite(out, acc)
    return out, role, name


def gaussian_edge(e):
    return np.asarray(Image.fromarray(clip8(e * 255)).filter(ImageFilter.GaussianBlur(1.5 * S))).astype(np.float32) / 255


def frame_portrait(img, role, name):
    fr0, fr1 = ROLE[role]["frame"]
    mask = Image.new("L", (W, H), 0)
    md = ImageDraw.Draw(mask)
    ov = (34 * S, 30 * S, W - 34 * S, H - 74 * S)
    md.ellipse(ov, fill=255)
    out = Image.new("RGBA", (W, H), (20, 16, 14, 255))
    tex = backdrop(role, W, H, 5) * 0.25 + np.array([18, 14, 12], np.float32)
    out = Image.fromarray(clip8(tex)).convert("RGBA")
    out.paste(img, (0, 0), mask)
    d = ImageDraw.Draw(out)
    for k, (w, c) in enumerate([(22, fr0), (12, fr1), (4, tuple(int(v * 0.6) for v in fr0))]):
        d.ellipse([ov[0] - (11 - k * 5) * S, ov[1] - (11 - k * 5) * S, ov[2] + (11 - k * 5) * S, ov[3] + (11 - k * 5) * S],
                  outline=c, width=w * S // 2)
    for (x, y) in [(ov[0] + 10 * S, ov[1] + 10 * S), (ov[2] - 10 * S, ov[1] + 10 * S)]:
        d.ellipse([x - 12 * S, y - 12 * S, x + 12 * S, y + 12 * S], fill=fr1, outline=fr0, width=3 * S)
    # name plate
    pw, ph = 300 * S, 44 * S
    px, py = (W - pw) // 2, H - 64 * S
    d.rounded_rectangle([px, py, px + pw, py + ph], radius=10 * S, fill=(30, 24, 20), outline=fr1, width=4 * S)
    fs = 26 * S if len(name) < 20 else 21 * S
    fnt = font(fs, italic=True)
    tw = d.textlength(name, font=fnt)
    d.text(((W - tw) / 2, py + (ph - fs) / 2 - 3 * S), name, font=fnt, fill=(236, 220, 176))
    return out.resize((W // S, H // S), Image.LANCZOS).convert("RGB")


TOKEN_CROP = {"rat": (0.5, 0.6, 0.96), "rat_swarm": (0.5, 0.56, 1.0), "old_gnaw": (0.5, 0.6, 0.96), "gloam": (0.5, 0.5, 1.0),
              "inventor": (0.5, 0.46, 0.86), "binder": (0.5, 0.48, 0.86), "petra": (0.5, 0.46, 0.84), "dov": (0.5, 0.46, 0.84),
              "merchant": (0.5, 0.36, 0.92), "rourke": (0.5, 0.38, 0.92), "noble": (0.5, 0.38, 0.9), "enkrid": (0.5, 0.38, 0.9)}


def token(img, role, key):
    fr0, fr1 = ROLE[role]["frame"]
    cxr, cyr, sc = TOKEN_CROP.get(key, (0.5, 0.4, 0.88))
    side = int(W * sc)
    cx, cy = int(W * cxr), int(H * cyr)
    box = (cx - side // 2, cy - side // 2, cx + side // 2, cy + side // 2)
    crop = img.crop(box).resize((800, 800), Image.LANCZOS)
    out = Image.new("RGBA", (800, 800), (0, 0, 0, 0))
    m = Image.new("L", (800, 800), 0)
    ImageDraw.Draw(m).ellipse([40, 40, 760, 760], fill=255)
    out.paste(crop, (0, 0), m)
    d = ImageDraw.Draw(out)
    d.ellipse([28, 28, 772, 772], outline=fr0, width=36)
    d.ellipse([36, 36, 764, 764], outline=fr1, width=14)
    d.ellipse([60, 60, 740, 740], outline=tuple(int(v * 0.5) for v in fr0), width=6)
    for k in range(12):
        a = k * math.pi / 6
        x, y = 400 + 368 * math.cos(a), 400 + 368 * math.sin(a)
        d.ellipse([x - 9, y - 9, x + 9, y + 9], fill=fr1)
    return out.resize((400, 400), Image.LANCZOS)


def cover():
    """1200 x 600 title art: the refinery skyline in brume."""
    w, h = 1200 * S, 600 * S
    yy, xx = np.mgrid[0:h, 0:w].astype(np.float32)
    sky = np.array([18, 20, 26], np.float32) * (1 - yy[..., None] / h) + np.array([96, 54, 30], np.float32) * (yy[..., None] / h)
    glow = np.exp(-(((xx - 820 * S) / (380 * S)) ** 2 + ((yy - 430 * S) / (220 * S)) ** 2))[..., None]
    sky += glow * np.array([210, 100, 30], np.float32)
    img = Image.fromarray(clip8(sky)).convert("RGBA")
    d = ImageDraw.Draw(img)
    r = np.random.default_rng(11)
    # back row of roofs, then the refinery stacks and tanks, then the near quay
    x = 0
    while x < w:
        bw = int(r.integers(40, 110)) * S
        bh = int(r.integers(60, 170)) * S
        d.rectangle([x, h - 170 * S - bh, x + bw, h], fill=(34, 30, 34))
        if r.random() < 0.5:
            d.polygon([(x, h - 170 * S - bh), (x + bw // 2, h - 200 * S - bh), (x + bw, h - 170 * S - bh)], fill=(34, 30, 34))
        for _ in range(int(r.integers(0, 4))):
            wx, wy = x + int(r.integers(6, max(7, bw // S - 14))) * S, h - 170 * S - bh + int(r.integers(10, max(11, bh // S - 20))) * S
            d.rectangle([wx, wy, wx + 8 * S, wy + 12 * S], fill=(255, 196, 110))
        x += bw
    for (sx, sw_, sh_) in [(860, 34, 440), (930, 28, 380), (1010, 40, 410), (1110, 30, 300), (720, 26, 300)]:
        d.rectangle([sx * S, (600 - sh_) * S, (sx + sw_) * S, h], fill=(20, 18, 20))
        d.ellipse([(sx - 6) * S, (600 - sh_ - 10) * S, (sx + sw_ + 6) * S, (600 - sh_ + 10) * S], fill=(255, 130, 50))
    for (tx, tr) in [(640, 70), (980, 90), (1160, 60)]:
        d.ellipse([(tx - tr) * S, (470 - tr) * S, (tx + tr) * S, (470 + tr) * S], fill=(22, 20, 22))
    d.rectangle([0, 520 * S, w, h], fill=(14, 12, 14))
    for x in range(40, 1200, 160):
        d.line([(x * S, 520 * S), (x * S, 440 * S)], fill=(14, 12, 14), width=6 * S)
        d.ellipse([(x - 10) * S, 430 * S, (x + 10) * S, 450 * S], fill=(255, 200, 120))
    arr = np.asarray(img).astype(np.float32)[..., :3]
    smoke = np.clip(noise(h, w, 80 * S, 21, sx=200 * S) + 0.3, 0, 1) * np.exp(-((yy - 140 * S) / (160 * S)) ** 2)
    smoke *= np.clip((xx - 600 * S) / (300 * S), 0, 1)
    arr = arr * (1 - 0.6 * smoke[..., None]) + np.array([40, 34, 34], np.float32) * 0.6 * smoke[..., None]
    fog = np.clip(noise(h, w, 120 * S, 22, sx=400 * S) * 0.6 + (yy - 380 * S) / (240 * S), 0, 1) * 0.6
    arr = arr * (1 - fog[..., None]) + np.array([150, 150, 158], np.float32) * fog[..., None]
    out = Image.fromarray(clip8(arr))
    td = ImageDraw.Draw(out)
    f1, f2, f3 = font(118 * S), font(44 * S, True), font(28 * S, True)
    for (txt, fnt, y, fill) in [("Ashford Roads", f1, 110, (240, 214, 150)), ("Act 1", f2, 250, (232, 222, 196)),
                                ("a Possibilities adventure of the Wayfinder sea", f3, 314, (210, 200, 180))]:
        tw = td.textlength(txt, font=fnt)
        td.text((90 * S, y * S), txt, font=fnt, fill=fill, stroke_width=3 * S, stroke_fill=(16, 12, 10))
    td.line([(92 * S, 300 * S), (520 * S, 300 * S)], fill=(206, 166, 86), width=3 * S)
    return out.resize((1200, 600), Image.LANCZOS)


def main():
    keys = sys.argv[1:] or list(CAST)
    for k in keys:
        if k == "cover":
            continue
        img, role, name = render_figure(k)
        save_webp(frame_portrait(img, role, name), os.path.join(ROOT, "assets", "portraits", f"{k}.webp"), 86)
        save_webp(token(img, role, k), os.path.join(ROOT, "assets", "tokens", f"{k}.webp"), 86)
        print("portrait + token:", k)
    if not sys.argv[1:] or "cover" in sys.argv[1:]:
        save_webp(cover(), os.path.join(ROOT, "assets", "cover.webp"), 84)
        print("cover")


if __name__ == "__main__":
    main()
