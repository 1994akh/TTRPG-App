"""Shared painting engine for the Ashford Roads maps (Dungeonpunk / Gaslit fantasy).

A map is a grid of cells (1 cell = 1 Foundry square = G px). Each cell holds a floor material or 0 (solid
masonry/rock). Foundry walls are traced from the same cell mask, so art and walls always agree. Decor is drawn on
an RGBA layer in square units and composited with a soft shadow. Everything is seeded, so output is deterministic.
"""
import math
import os

import numpy as np
from PIL import Image, ImageDraw, ImageFilter, ImageFont

G = 100
HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.normpath(os.path.join(HERE, ".."))
FONT_DIR = os.path.normpath(os.path.join(ROOT, "..", "ravenmoor-manor", "assets", "fonts"))

def _box(a, r, axis):
    if r < 1:
        return a
    n = a.shape[axis]
    pad = [(0, 0)] * a.ndim
    pad[axis] = (r + 1, r)
    c = np.cumsum(np.pad(a, pad, mode="edge"), axis=axis, dtype=np.float64)
    hi = np.take(c, np.arange(2 * r + 1, 2 * r + 1 + n), axis=axis)
    lo = np.take(c, np.arange(0, n), axis=axis)
    return ((hi - lo) / (2 * r + 1)).astype(np.float32)


def gaussian_filter(a, sigma):
    """Three box blurs per axis: a close stand-in for a Gaussian (no scipy needed)."""
    a = np.asarray(a, np.float32)
    r = max(1, int(round(math.sqrt(12 * sigma * sigma / 3 + 1) / 2)))
    for axis in (0, 1):
        for _ in range(3):
            a = _box(a, r, axis)
    return a


# Palette ---------------------------------------------------------------
SOOT = (22, 21, 22)
STONE = (92, 90, 86)
STONE_D = (58, 56, 54)
BRICK = (98, 58, 44)
BRASS = (176, 132, 58)
BRASS_L = (222, 184, 104)
BRASS_D = (110, 78, 34)
VERDI = (72, 132, 112)
IRON = (34, 34, 38)
WOOD = (98, 64, 38)
WOOD_D = (60, 38, 24)
WOOD_L = (138, 96, 58)
PAPER = (214, 202, 172)
AMBER = (255, 176, 86)
REFINE = (255, 118, 38)
CHARGE = (150, 220, 255)
BRUME = (150, 152, 160)


def P(v):
    return int(round(v * G))


def font(size, italic=False):
    name = "IMFellEnglish-Italic.ttf" if italic else "IMFellEnglish-Regular.ttf"
    path = os.path.join(FONT_DIR, name)
    if os.path.exists(path):
        return ImageFont.truetype(path, size)
    return ImageFont.truetype("/usr/share/texmf/fonts/opentype/public/tex-gyre/texgyrepagella-bold.otf", size)


# Noise and textures ------------------------------------------------------
def noise(h, w, scale, seed, sx=None):
    r = np.random.default_rng(seed)
    sy, sx = scale, sx or scale
    gh = max(2, int(math.ceil(h / sy)) + 1)
    gw = max(2, int(math.ceil(w / sx)) + 1)
    base = r.standard_normal((gh, gw)).astype(np.float32)
    a = np.asarray(Image.fromarray(base).resize((w, h), Image.BICUBIC))
    return np.clip(a / (np.std(a) * 2.2 + 1e-6), -1, 1)


def fbm(h, w, scales, weights, seed):
    out = np.zeros((h, w), np.float32)
    for i, (s, wt) in enumerate(zip(scales, weights)):
        out += wt * noise(h, w, s, seed + i * 17)
    return out


def clip8(a):
    return np.clip(a, 0, 255).astype(np.uint8)


def tex_flag(h, w, seed, base=(96, 94, 90), size=66, jitter=0.11, mortar=0.42):
    r = np.random.default_rng(seed)
    base = np.array(base, np.float32)
    img = np.empty((h, w, 3), np.float32)
    img[:] = base * mortar
    y = -int(r.integers(0, size))
    while y < h:
        rh = int(size * r.uniform(0.75, 1.25))
        x = -int(r.integers(0, size))
        while x < w:
            sw = int(size * r.uniform(0.8, 1.7))
            c = base * (1 + r.normal(0, jitter)) + r.normal(0, 3) * np.array([1.0, 0.95, 0.9], np.float32)
            x0, x1 = max(x + 3, 0), min(x + sw - 1, w)
            y0, y1 = max(y + 3, 0), min(y + rh - 1, h)
            if x1 > x0 and y1 > y0:
                img[y0:y1, x0:x1] = c
                img[y0:min(y0 + 2, y1), x0:x1] *= 1.12
            x += sw
        y += rh
    img *= (1 + 0.14 * fbm(h, w, [90, 14, 3], [0.5, 0.3, 0.2], seed + 7)[..., None])
    return clip8(img)


def tex_brick(h, w, seed, base=BRICK, bw=50, bh=22):
    r = np.random.default_rng(seed)
    base = np.array(base, np.float32)
    img = np.empty((h, w, 3), np.float32)
    img[:] = base * 0.35
    y, row = 0, 0
    while y < h:
        x = -(row % 2) * bw // 2
        while x < w:
            c = base * (1 + r.normal(0, 0.12))
            img[y + 2:y + bh, max(x + 2, 0):min(x + bw, w)] = c
            x += bw
        y += bh
        row += 1
    img *= (1 + 0.12 * fbm(h, w, [80, 10], [0.6, 0.4], seed + 3)[..., None])
    return clip8(img)


def tex_cobble(h, w, seed, base=(66, 64, 62), size=26):
    r = np.random.default_rng(seed)
    img = np.empty((h, w, 3), np.float32)
    img[:] = np.array(base, np.float32) * 0.4
    pil = Image.fromarray(clip8(img))
    d = ImageDraw.Draw(pil)
    for yy in range(-size, h + size, int(size * 0.8)):
        off = r.integers(0, size)
        for xx in range(-size + int(off), w + size, size):
            j = r.normal(0, 4, 2)
            c = tuple(int(v) for v in np.array(base) * (1 + r.normal(0, 0.12)))
            s = size * r.uniform(0.38, 0.5)
            d.ellipse([xx + j[0] - s, yy + j[1] - s * 0.8, xx + j[0] + s, yy + j[1] + s * 0.8], fill=c)
    img = np.asarray(pil).astype(np.float32)
    img *= (1 + 0.1 * fbm(h, w, [120, 12], [0.6, 0.4], seed + 5)[..., None])
    return clip8(img)


def tex_wood(h, w, seed, base=WOOD, pw=24, vertical=False, jitter=0.08):
    if vertical:
        return np.ascontiguousarray(tex_wood(w, h, seed, base, pw, False, jitter).transpose(1, 0, 2))
    r = np.random.default_rng(seed)
    base = np.array(base, np.float32)
    img = np.zeros((h, w, 3), np.float32)
    y = 0
    while y < h:
        x = -int(r.integers(0, 320))
        while x < w:
            L = int(r.integers(160, 440))
            c = base * (1 + r.normal(0, jitter)) + r.normal(0, 3, 3)
            x0, x1 = max(x, 0), min(x + L, w)
            if x1 > x0:
                img[y:y + pw, x0:x1] = c
                img[y:y + pw, x0:min(x0 + 2, w)] *= 0.55
            x += L
        img[y:min(y + 2, h), :] *= 0.5
        y += pw
    img *= (1 + 0.10 * noise(h, w, 4, seed + 3, sx=140)[..., None])
    img *= (1 + 0.06 * noise(h, w, 200, seed + 4)[..., None])
    return clip8(img)


def tex_rock(h, w, seed, base=(30, 29, 30)):
    n = fbm(h, w, [300, 90, 25, 6], [0.4, 0.3, 0.2, 0.1], seed)
    img = np.array(base, np.float32) + n[..., None] * np.array([12, 11, 11], np.float32)
    return clip8(img)


def tex_water(h, w, seed, deep=(14, 26, 30), shallow=(34, 52, 50)):
    n = fbm(h, w, [220, 60, 14], [0.5, 0.35, 0.15], seed)
    rip = noise(h, w, 9, seed + 1, sx=60) * 6
    t = ((n + 1) / 2)[..., None]
    img = np.array(deep, np.float32) * (1 - t) + np.array(shallow, np.float32) * t + rip[..., None]
    return clip8(img)


def tex_ash(h, w, seed):
    n = fbm(h, w, [400, 120, 30, 6], [0.4, 0.3, 0.2, 0.1], seed)
    img = np.array([112, 108, 104], np.float32) + n[..., None] * np.array([20, 19, 18], np.float32)
    return clip8(img)


MATERIALS = {
    "flag": lambda h, w, s: tex_flag(h, w, s),
    "flag_wet": lambda h, w, s: tex_flag(h, w, s, base=(62, 64, 60), size=58, mortar=0.32),
    "ledge": lambda h, w, s: tex_flag(h, w, s, base=(92, 88, 80), size=44, mortar=0.4),
    "culvert": lambda h, w, s: tex_brick(h, w, s, base=(84, 60, 48), bw=46, bh=20),
    "brick_floor": lambda h, w, s: tex_brick(h, w, s, base=(110, 70, 52)),
    "wood": lambda h, w, s: tex_wood(h, w, s),
    "wood_dark": lambda h, w, s: tex_wood(h, w, s, base=(70, 46, 30)),
    "wood_v": lambda h, w, s: tex_wood(h, w, s, base=(92, 66, 42), vertical=True),
    "cobble": lambda h, w, s: tex_cobble(h, w, s),
    "marble": lambda h, w, s: tex_flag(h, w, s, base=(170, 166, 158), size=G, jitter=0.03, mortar=0.7),
    "water": lambda h, w, s: tex_water(h, w, s),
}


# Map model -------------------------------------------------------------
class Map:
    def __init__(self, key, name, w, h, solid="rock", seed=1):
        self.key, self.name, self.w, self.h, self.seed = key, name, w, h, seed
        self.cells = np.zeros((h, w), dtype=object)
        self.cells[:] = 0
        self.solid = solid
        self.doors = []          # (o, line, a, b, kind)
        self.lights = []
        self.notes = []
        self.tokens = []
        self.glows = []          # (x, y, r, rgb, strength 0-100)
        self.water = []          # polygons in squares, painted over the floor (no walls)
        self.extra_walls = []    # raw [x0,y0,x1,y1] in squares, door code
        self.water_rims = []     # polygons that get a stone coping (cisterns)

    def rect(self, x0, y0, x1, y1, mat):
        self.cells[y0:y1, x0:x1] = mat

    def fill(self, x0, y0, x1, y1):
        self.cells[y0:y1, x0:x1] = 0

    def door(self, o, line, a, b, kind="door"):
        self.doors.append((o, line, a, b, kind))

    def floor_mask(self):
        return np.vectorize(lambda v: v != 0)(self.cells)

    # Walls ---------------------------------------------------------------
    def walls(self):
        f = self.floor_mask()
        H, W = f.shape
        hseg, vseg = {}, {}
        for y in range(H + 1):
            for x in range(W):
                a = f[y - 1, x] if y > 0 else False
                b = f[y, x] if y < H else False
                if a != b:
                    hseg.setdefault(y, []).append(x)
        for x in range(W + 1):
            for y in range(H):
                a = f[y, x - 1] if x > 0 else False
                b = f[y, x] if x < W else False
                if a != b:
                    vseg.setdefault(x, []).append(y)
        cut = {"h": {}, "v": {}}
        out = []
        for (o, line, a, b, kind) in self.doors:
            for i in range(a, b):
                cut[o].setdefault(line, set()).add(i)
            code = {"door": 1, "grille": 1, "hatch": 1, "secret": 2, "open": 0}[kind]
            if kind == "open":
                continue
            if o == "h":
                out.append(dict(c=[P(a), P(line), P(b), P(line)], door=code, kind=kind))
            else:
                out.append(dict(c=[P(line), P(a), P(line), P(b)], door=code, kind=kind))

        def runs(cells):
            cells = sorted(cells)
            if not cells:
                return []
            res, s, p = [], cells[0], cells[0]
            for c in cells[1:]:
                if c == p + 1:
                    p = c
                else:
                    res.append((s, p + 1))
                    s = p = c
            res.append((s, p + 1))
            return res

        for y, xs in hseg.items():
            for (s, e) in runs([x for x in xs if x not in cut["h"].get(y, set())]):
                out.append(dict(c=[P(s), P(y), P(e), P(y)], door=0, kind="wall"))
        for x, ys in vseg.items():
            for (s, e) in runs([y for y in ys if y not in cut["v"].get(x, set())]):
                out.append(dict(c=[P(x), P(s), P(x), P(e)], door=0, kind="wall"))
        for (x0, y0, x1, y1, code) in self.extra_walls:
            out.append(dict(c=[P(x0), P(y0), P(x1), P(y1)], door=code, kind="wall"))
        return out

    # Render --------------------------------------------------------------
    def render_base(self):
        W, H = self.w * G, self.h * G
        s = self.seed
        if self.solid == "brick":
            img = tex_brick(H, W, s + 900, base=(60, 40, 34)).astype(np.float32)
        else:
            img = tex_rock(H, W, s + 900).astype(np.float32)
        mats = {v for v in self.cells.flat if v != 0}
        for i, m in enumerate(sorted(mats)):
            t = MATERIALS[m](H, W, s + 31 * (i + 1)).astype(np.float32)
            mk = np.kron((self.cells == m).astype(np.uint8), np.ones((G, G), np.uint8)).astype(bool)
            img[mk] = t[mk]
        floor = np.kron(self.floor_mask().astype(np.float32), np.ones((G, G), np.float32))
        self.floor_px = floor
        # Water overlays (polygons in squares)
        if self.water:
            wl = Image.new("L", (W, H), 0)
            d = ImageDraw.Draw(wl)
            for poly in self.water:
                d.polygon([(P(x), P(y)) for (x, y) in poly], fill=255)
            wm = gaussian_filter(np.asarray(wl).astype(np.float32) / 255, 3)
            wt = tex_water(H, W, s + 77).astype(np.float32)
            # dark edge where stone meets water
            edge = np.clip(gaussian_filter(wm, 14) - wm, 0, 1)
            img = img * (1 - wm[..., None]) + wt * wm[..., None]
            img *= (1 - 0.9 * edge[..., None])
            r = np.random.default_rng(s + 78)
            glint = Image.new("L", (W, H), 0)
            gd = ImageDraw.Draw(glint)
            for _ in range(int(wm.sum() / 9000)):
                x, y = r.integers(0, W), r.integers(0, H)
                if wm[y, x] > 0.9:
                    L = r.integers(12, 40)
                    gd.line([x, y, x + L, y], fill=int(r.integers(60, 140)), width=2)
            img += (np.asarray(glint).astype(np.float32) / 255 * wm)[..., None] * np.array([150, 170, 170], np.float32) * 0.5
            self.water_px = wm
        else:
            self.water_px = np.zeros((H, W), np.float32)
        # soot and grime blotches, green-brown damp stains
        grime = np.clip(fbm(H, W, [260, 70, 18], [0.5, 0.3, 0.2], s + 11) * 1.4, 0, 1)
        img *= (1 - 0.42 * grime * floor)[..., None]
        damp = np.clip(noise(H, W, 120, s + 12) - 0.2, 0, 1)
        img += (damp * floor)[..., None] * np.array([-5, 2, -2], np.float32) * 2
        # ambient occlusion along walls; damp sheen on the floor
        solid = 1 - floor
        ao = gaussian_filter(solid, 38)
        img *= (1 - 0.62 * np.clip(ao * 1.6, 0, 1) * floor)[..., None]
        sheen = np.clip(noise(H, W, 160, s + 5), 0, 1) ** 2
        img += (sheen * floor * (1 - self.water_px))[..., None] * 22
        # solid ground: soot-dark
        img = img * (1 - solid[..., None] * 0.55)
        return img

    def wall_layer(self, segs):
        W, H = self.w * G, self.h * G
        lay = Image.new("RGBA", (W, H), (0, 0, 0, 0))
        d = ImageDraw.Draw(lay)
        for sg in segs:
            if sg["kind"] != "wall":
                continue
            x0, y0, x1, y1 = sg["c"]
            d.line([x0, y0, x1, y1], fill=(46, 38, 36, 255), width=26)
        for sg in segs:
            if sg["kind"] != "wall":
                continue
            x0, y0, x1, y1 = sg["c"]
            d.line([x0, y0, x1, y1], fill=(82, 64, 56, 255), width=14)
            d.line([x0, y0, x1, y1], fill=(112, 92, 80, 255), width=4)
        for x0, y0, x1, y1 in [s["c"] for s in segs if s["kind"] == "wall"]:
            for (x, y) in ((x0, y0), (x1, y1)):
                d.rectangle([x - 15, y - 15, x + 15, y + 15], fill=(66, 54, 50, 255))
        for sg in segs:
            if sg["kind"] == "wall":
                continue
            x0, y0, x1, y1 = sg["c"]
            if sg["kind"] in ("grille", "hatch"):
                d.line([x0, y0, x1, y1], fill=IRON + (255,), width=16)
                horiz = y0 == y1
                L = abs(x1 - x0) if horiz else abs(y1 - y0)
                for k in range(0, L + 1, 18):
                    if horiz:
                        d.line([x0 + k, y0 - 12, x0 + k, y0 + 12], fill=(70, 70, 76, 255), width=5)
                    else:
                        d.line([x0 - 12, y0 + k, x0 + 12, y0 + k], fill=(70, 70, 76, 255), width=5)
            elif sg["kind"] == "door":
                d.line([x0, y0, x1, y1], fill=WOOD_D + (255,), width=20)
                d.line([x0, y0, x1, y1], fill=WOOD_L + (255,), width=10)
                mx, my = (x0 + x1) / 2, (y0 + y1) / 2
                d.ellipse([mx - 6, my - 6, mx + 6, my + 6], fill=BRASS + (255,))
        return lay

    def rim_layer(self):
        lay = Image.new("RGBA", (self.w * G, self.h * G), (0, 0, 0, 0))
        d = ImageDraw.Draw(lay)
        for poly in self.water_rims:
            pts = [(P(x), P(y)) for (x, y) in poly] + [(P(poly[0][0]), P(poly[0][1]))]
            d.line(pts, fill=(46, 44, 42, 255), width=30, joint="curve")
            d.line(pts, fill=(104, 100, 92, 255), width=18, joint="curve")
            d.line(pts, fill=(130, 126, 116, 255), width=4, joint="curve")
        return lay

    def finish(self, img, decor, segs, vignette=0.55):
        img = np.dstack([img, np.full(img.shape[:2], 255, np.float32)])
        if self.water_rims:
            img = composite(img, self.rim_layer(), offset=(4, 6), blur=6, strength=0.5)
        img = composite(img, decor, offset=(8, 10), blur=8, strength=0.6)
        img = composite(img, self.wall_layer(segs), offset=(6, 8), blur=10, strength=0.5)
        img = apply_glows(img, self.glows)
        H, W = img.shape[:2]
        yy, xx = np.mgrid[0:H, 0:W].astype(np.float32)
        dd = np.sqrt(((xx - W / 2) / (W / 2)) ** 2 + ((yy - H / 2) / (H / 2)) ** 2)
        img[..., :3] *= (1 - vignette * np.clip(dd - 0.55, 0, 1) ** 1.4)[..., None]
        r = np.random.default_rng(self.seed + 4)
        img[..., :3] += r.normal(0, 4, (H, W)).astype(np.float32)[..., None]
        return Image.fromarray(clip8(img[..., :3]))

    def scene_json(self, darkness, segs, extra=None):
        d = dict(id=self.key, name=self.name, width=self.w * G, height=self.h * G, gridSize=G, gridType="square",
                 background=f"assets/maps/{self.key}.webp", darkness=darkness,
                 walls=[dict(c=s["c"], door=s["door"]) for s in segs],
                 lights=self.lights, notes=self.notes, tokens=self.tokens)
        if extra:
            d.update(extra)
        return d


# Compositing -----------------------------------------------------------
def composite(base, layer, shadow=True, offset=(7, 9), blur=7, strength=0.55):
    la = np.asarray(layer).astype(np.float32) / 255.0
    if shadow:
        a = la[..., 3]
        sh = np.zeros_like(a)
        dx, dy = offset
        sh[dy:, dx:] = a[:-dy, :-dx]
        sh = gaussian_filter(sh, blur) * strength
        base[..., :3] *= (1 - sh[..., None])
    al = la[..., 3:4]
    base[..., :3] = base[..., :3] * (1 - al) + la[..., :3] * 255 * al
    return base


def apply_glows(img, glows):
    H, W = img.shape[:2]
    for (x, y, r, rgb, s) in glows:
        x0, y0 = max(0, P(x - r)), max(0, P(y - r))
        x1, y1 = min(W, P(x + r)), min(H, P(y + r))
        if x1 <= x0 or y1 <= y0:
            continue
        yy, xx = np.mgrid[y0:y1, x0:x1].astype(np.float32)
        dist = np.sqrt((xx - x * G) ** 2 + (yy - y * G) ** 2) / (r * G)
        f = np.clip(1 - dist, 0, 1) ** 2 * (s / 100.0)
        img[y0:y1, x0:x1, :3] += f[..., None] * np.array(rgb, np.float32) * 0.55
    return img


# Decor painter (square units) ----------------------------------------------
class Decor:
    def __init__(self, w, h, seed=1):
        self.img = Image.new("RGBA", (w * G, h * G), (0, 0, 0, 0))
        self.d = ImageDraw.Draw(self.img)
        self.r = np.random.default_rng(seed)

    def pipe(self, pts, width=0.22, color=BRASS, joints=True):
        d = self.d
        pp = [(P(x), P(y)) for (x, y) in pts]
        wpx = P(width)
        d.line(pp, fill=tuple(int(c * 0.55) for c in color) + (255,), width=wpx + 6, joint="curve")
        d.line(pp, fill=color + (255,), width=wpx, joint="curve")
        hl = tuple(min(255, int(c * 1.35)) for c in color)
        d.line([(x - wpx // 5, y - wpx // 5) for (x, y) in pp], fill=hl + (200,), width=max(2, wpx // 5), joint="curve")
        if joints:
            for (x, y) in pp:
                rr = wpx * 0.75
                d.ellipse([x - rr, y - rr, x + rr, y + rr], fill=tuple(int(c * 0.8) for c in color) + (255,),
                          outline=(30, 24, 18, 255), width=2)

    def valve(self, x, y, r=0.22):
        d = self.d
        cx, cy, rr = P(x), P(y), P(r)
        d.ellipse([cx - rr, cy - rr, cx + rr, cy + rr], outline=(150, 40, 30, 255), width=7)
        for k in range(4):
            a = k * math.pi / 2
            d.line([cx, cy, cx + rr * math.cos(a), cy + rr * math.sin(a)], fill=(150, 40, 30, 255), width=5)

    def gauge(self, x, y, r=0.16):
        d = self.d
        cx, cy, rr = P(x), P(y), P(r)
        d.ellipse([cx - rr, cy - rr, cx + rr, cy + rr], fill=PAPER + (255,), outline=BRASS_D + (255,), width=6)
        d.line([cx, cy, cx + rr * 0.6, cy - rr * 0.5], fill=(40, 20, 20, 255), width=3)

    def crate(self, x, y, s=0.8, rot=0):
        d = self.d
        x0, y0, x1, y1 = P(x), P(y), P(x + s), P(y + s)
        d.rectangle([x0, y0, x1, y1], fill=WOOD + (255,), outline=WOOD_D + (255,), width=5)
        d.line([x0, y0, x1, y1], fill=WOOD_D + (255,), width=5)
        d.line([x0, y1, x1, y0], fill=WOOD_D + (255,), width=5)

    def barrel(self, x, y, r=0.35):
        d = self.d
        cx, cy, rr = P(x), P(y), P(r)
        d.ellipse([cx - rr, cy - rr, cx + rr, cy + rr], fill=WOOD + (255,), outline=WOOD_D + (255,), width=4)
        d.ellipse([cx - rr * 0.7, cy - rr * 0.7, cx + rr * 0.7, cy + rr * 0.7], outline=IRON + (255,), width=4)

    def table(self, x0, y0, x1, y1, color=WOOD_L):
        d = self.d
        d.rounded_rectangle([P(x0), P(y0), P(x1), P(y1)], radius=10, fill=color + (255,),
                            outline=WOOD_D + (255,), width=5)

    def papers(self, x0, y0, x1, y1, n=12):
        d, r = self.d, self.r
        for _ in range(n):
            x, y = r.uniform(x0, x1), r.uniform(y0, y1)
            w, h = r.uniform(0.12, 0.25), r.uniform(0.15, 0.3)
            c = tuple(int(v * r.uniform(0.85, 1.05)) for v in PAPER)
            d.rectangle([P(x), P(y), P(x + w), P(y + h)], fill=c + (255,))
            d.line([P(x + 0.03), P(y + 0.05), P(x + w - 0.03), P(y + 0.05)], fill=(90, 80, 70, 255), width=2)
            d.ellipse([P(x + w / 2) - 3, P(y) - 3, P(x + w / 2) + 3, P(y) + 3], fill=(160, 30, 30, 255))

    def board(self, x0, y0, x1, y1, n=18):
        d = self.d
        d.rectangle([P(x0), P(y0), P(x1), P(y1)], fill=(72, 52, 36, 255), outline=BRASS_D + (255,), width=6)
        self.papers(x0 + 0.05, y0 + 0.05, x1 - 0.3, y1 - 0.35, n)

    def rubble(self, x, y, rad=0.8, n=14, color=(70, 68, 64)):
        d, r = self.d, self.r
        for _ in range(n):
            a, rr = r.uniform(0, 2 * math.pi), r.uniform(0, rad)
            cx, cy, s = x + rr * math.cos(a), y + rr * math.sin(a), r.uniform(0.06, 0.2)
            k = r.uniform(0.7, 1.25)
            c = tuple(int(v * k) for v in color)
            pts = [(P(cx + s * math.cos(t) * r.uniform(0.6, 1.1)), P(cy + s * math.sin(t) * r.uniform(0.6, 1.1)))
                   for t in np.linspace(0, 2 * math.pi, 6, endpoint=False)]
            d.polygon(pts, fill=c + (255,))

    def bones(self, x, y, n=6):
        d, r = self.d, self.r
        for _ in range(n):
            a = r.uniform(0, math.pi)
            cx, cy, L = x + r.uniform(-0.5, 0.5), y + r.uniform(-0.5, 0.5), r.uniform(0.15, 0.32)
            x0, y0 = cx - L * math.cos(a), cy - L * math.sin(a)
            x1, y1 = cx + L * math.cos(a), cy + L * math.sin(a)
            d.line([P(x0), P(y0), P(x1), P(y1)], fill=(200, 192, 170, 255), width=6)
            for (bx, by) in ((x0, y0), (x1, y1)):
                d.ellipse([P(bx) - 5, P(by) - 5, P(bx) + 5, P(by) + 5], fill=(200, 192, 170, 255))

    def body(self, x, y, angle=0.0, cloth=(40, 74, 110)):
        """A fallen sellsword seen from above (Coldwater blue)."""
        d = self.d
        ca, sa = math.cos(angle), math.sin(angle)

        def T(px, py):
            return (P(x + px * ca - py * sa), P(y + px * sa + py * ca))
        d.polygon([T(-0.22, -0.45), T(0.22, -0.45), T(0.26, 0.25), T(-0.26, 0.25)], fill=cloth + (255,))
        d.line([T(-0.22, -0.35), T(-0.5, 0.1)], fill=cloth + (255,), width=16)
        d.line([T(0.22, -0.35), T(0.45, -0.6)], fill=cloth + (255,), width=16)
        d.line([T(-0.12, 0.25), T(-0.16, 0.8)], fill=(50, 44, 40, 255), width=18)
        d.line([T(0.12, 0.25), T(0.2, 0.78)], fill=(50, 44, 40, 255), width=18)
        hx, hy = T(0, -0.62)
        d.ellipse([hx - 16, hy - 16, hx + 16, hy + 16], fill=(120, 96, 80, 255))
        d.ellipse([P(x) - 40, P(y) - 30, P(x) + 46, P(y) + 40], fill=(70, 14, 14, 110))

    def journal(self, x, y):
        d = self.d
        d.rectangle([P(x) - 14, P(y) - 18, P(x) + 14, P(y) + 18], fill=(110, 40, 30, 255), outline=(40, 20, 10, 255),
                    width=3)
        d.line([P(x) - 10, P(y) - 18, P(x) - 10, P(y) + 18], fill=(200, 170, 100, 255), width=2)

    def lamp(self, x, y, color=AMBER):
        d = self.d
        cx, cy = P(x), P(y)
        d.ellipse([cx - 14, cy - 14, cx + 14, cy + 14], fill=BRASS + (255,), outline=BRASS_D + (255,), width=3)
        d.ellipse([cx - 7, cy - 7, cx + 7, cy + 7], fill=color + (255,))

    def grate(self, x0, y0, x1, y1, bars=7):
        d = self.d
        d.rectangle([P(x0), P(y0), P(x1), P(y1)], outline=IRON + (255,), width=12)
        for k in range(1, bars):
            xx = x0 + (x1 - x0) * k / bars
            d.line([P(xx), P(y0), P(xx), P(y1)], fill=IRON + (255,), width=8)

    def rats(self, x, y, rad=1.0, n=8):
        d, r = self.d, self.r
        for _ in range(n):
            a, rr = r.uniform(0, 2 * math.pi), r.uniform(0, rad)
            cx, cy = x + rr * math.cos(a), y + rr * math.sin(a)
            h = r.uniform(0, 2 * math.pi)
            bx, by = P(cx), P(cy)
            d.ellipse([bx - 9, by - 6, bx + 9, by + 6], fill=(40, 34, 30, 230))
            d.line([bx, by, bx - 22 * math.cos(h), by - 22 * math.sin(h)], fill=(60, 44, 40, 200), width=2)

    def channel_glow(self, pts, width):
        pass

    def rug(self, x0, y0, x1, y1, color=(110, 34, 34)):
        d = self.d
        d.rectangle([P(x0), P(y0), P(x1), P(y1)], fill=color + (235,), outline=BRASS_D + (255,), width=6)
        d.rectangle([P(x0) + 18, P(y0) + 18, P(x1) - 18, P(y1) - 18], outline=BRASS + (200,), width=3)

    def label(self, x, y, text, size=48, fill=(230, 214, 170, 255)):
        f = font(size, italic=True)
        tw = self.d.textlength(text, font=f)
        self.d.text((P(x) - tw / 2, P(y) - size / 2), text, font=f, fill=fill, stroke_width=3,
                    stroke_fill=(20, 16, 14, 230))


def save_webp(img, path, quality=80):
    os.makedirs(os.path.dirname(path), exist_ok=True)
    img.save(path, "WEBP", quality=quality, method=6)
