"""Procedural battle-map engine for Ravenmoor Manor.

Coordinates are in grid squares (1 square = 5 ft = G px). A Level holds rooms,
door/window/railing edges, decor and light data; render_level() paints the
image and compute_walls() turns the same layout into Foundry wall segments,
so art and walls always agree.
"""
import math
import numpy as np
from PIL import Image, ImageDraw, ImageFilter, ImageFont
from scipy.ndimage import gaussian_filter

G = 100            # px per grid square
W, H = 48, 36      # canvas in squares (identical for every level so they stack)
PW, PH = W * G, H * G


def P(v):
    return int(round(v * G))


def R(x0, y0, x1, y1):
    return [P(x0), P(y0), P(x1), P(y1)]


def C(x, y, r):
    return [P(x - r), P(y - r), P(x + r), P(y + r)]


# ----------------------------------------------------------------- noise ---
def noise(h, w, scale, seed, sx=None):
    """Smooth value noise, roughly in [-1, 1]. sx stretches it horizontally."""
    r = np.random.default_rng(seed)
    sy = scale
    sx = sx or scale
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


# -------------------------------------------------------------- textures ---
def tex_grass(h, w, seed):
    n = fbm(h, w, [500, 160, 40, 8], [0.45, 0.3, 0.17, 0.08], seed)
    base = np.array([66, 74, 42], np.float32)
    img = base + n[..., None] * np.array([18, 20, 11], np.float32)
    dry = noise(h, w, 260, seed + 5)
    img += (dry > 0.35)[..., None] * np.array([18, 8, -4], np.float32) * ((dry - 0.35) / 0.65)[..., None]
    return clip8(img)


def tex_gravel(h, w, seed):
    r = np.random.default_rng(seed)
    n = fbm(h, w, [120, 20, 4], [0.4, 0.35, 0.25], seed)
    img = np.array([128, 120, 106], np.float32) + n[..., None] * 22
    sp = r.random((h, w))
    img[sp > 0.985] *= 0.6
    img[sp < 0.012] *= 1.18
    return clip8(img)


def tex_dirt(h, w, seed, furrows=False):
    n = fbm(h, w, [200, 50, 10, 3], [0.4, 0.3, 0.2, 0.1], seed)
    img = np.array([86, 62, 42], np.float32) + n[..., None] * np.array([20, 16, 12], np.float32)
    if furrows:
        yy = np.arange(h)[:, None]
        wave = (np.sin((yy % G) / G * 2 * math.pi) + 1) / 2
        img *= (0.82 + 0.25 * wave)[..., None]
    return clip8(img)


def tex_rock(h, w, seed):
    n = fbm(h, w, [300, 90, 25, 6], [0.4, 0.3, 0.2, 0.1], seed)
    img = np.array([40, 37, 35], np.float32) + n[..., None] * np.array([14, 13, 12], np.float32)
    return clip8(img)


def tex_wood(h, w, seed, base=(118, 80, 48), pw=25, vertical=False, jitter=0.07):
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
    grain = noise(h, w, 4, seed + 3, sx=140)
    img *= (1 + 0.10 * grain[..., None])
    img *= (1 + 0.05 * noise(h, w, 200, seed + 4)[..., None])
    return clip8(img)


def tex_flag(h, w, seed, base=(116, 110, 100), size=62, jitter=0.10, mortar=0.5):
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
            c = base * (1 + r.normal(0, jitter)) + r.normal(0, 3) * np.array([1.0, 0.85, 0.7], np.float32)
            x0, x1 = max(x + 3, 0), min(x + sw - 1, w)
            y0, y1 = max(y + 3, 0), min(y + rh - 1, h)
            if x1 > x0 and y1 > y0:
                img[y0:y1, x0:x1] = c
                img[y0:min(y0 + 2, y1), x0:x1] *= 1.12
            x += sw
        y += rh
    img *= (1 + 0.12 * fbm(h, w, [90, 14, 3], [0.5, 0.3, 0.2], seed + 7)[..., None])
    return clip8(img)


def tex_roof(h, w, seed, ridge="h"):
    """Slate roof; ridge runs along the long axis ("h" = east-west)."""
    if ridge == "v":
        return np.ascontiguousarray(tex_roof(w, h, seed, "h").transpose(1, 0, 2)[:, ::-1])
    r = np.random.default_rng(seed)
    base = np.array([60, 62, 70], np.float32)
    img = np.zeros((h, w, 3), np.float32)
    rh, tw = 22, 40
    y, i = 0, 0
    while y < h:
        x = -(i % 2) * (tw // 2)
        while x < w:
            img[y:y + rh, max(x, 0):min(x + tw, w)] = base * (1 + r.normal(0, 0.07))
            img[y:y + rh, max(x, 0):min(x + 2, w)] *= 0.6
            x += tw
        img[y:min(y + 3, h), :] *= 0.5
        y += rh
        i += 1
    yy = np.arange(h, dtype=np.float32)[:, None]
    img *= np.where(yy < h / 2, 1.1, 0.78)[..., None]
    mid = h // 2
    img[mid - 6:mid + 6, :] = np.array([44, 44, 50], np.float32)
    img[mid - 6:mid - 3, :] = np.array([88, 88, 96], np.float32)
    img *= (1 + 0.06 * noise(h, w, 120, seed + 1)[..., None])
    return clip8(img)


def tex_checker(h, w, seed, c1, c2, size=50, grout=(58, 55, 50)):
    yy, xx = np.mgrid[0:h, 0:w]
    chk = ((yy // size + xx // size) % 2).astype(bool)
    img = np.where(chk[..., None], np.array(c1, np.float32), np.array(c2, np.float32))
    g = (yy % size < 2) | (xx % size < 2)
    img[g] = grout
    img *= (1 + 0.08 * fbm(h, w, [60, 6], [0.6, 0.4], seed)[..., None])
    return clip8(img)


def tex_marble(h, w, seed):
    base = tex_checker(h, w, seed, (200, 194, 182), (52, 50, 54), size=G, grout=(90, 86, 80)).astype(np.float32)
    v = noise(h, w, 70, seed + 9)
    veins = np.exp(-(v * 9) ** 2)
    base -= veins[..., None] * 28
    return clip8(base)


def tex_water(h, w, seed):
    yy, xx = np.mgrid[0:h, 0:w].astype(np.float32)
    cy, cx = h / 2, w / 2
    d = np.sqrt(((yy - cy) / (h / 2)) ** 2 + ((xx - cx) / (w / 2)) ** 2)
    n = fbm(h, w, [160, 40], [0.6, 0.4], seed)
    rip = np.sin(d * 40 + n * 4) * 5
    deep = np.array([24, 42, 48], np.float32)
    shallow = np.array([46, 66, 58], np.float32)
    t = np.clip(d, 0, 1)[..., None]
    img = deep * (1 - t) + shallow * t + rip[..., None] + n[..., None] * 8
    return clip8(img)


def tex_hay(h, w, seed):
    img = tex_dirt(h, w, seed).astype(np.float32)
    straw = noise(h, w, 3, seed + 2, sx=30)
    img += (straw > 0.25)[..., None] * np.array([70, 58, 18], np.float32)
    return clip8(img)


# ---------------------------------------------------------------- palette ---
WOOD_D = (64, 40, 24, 255)
WOOD = (112, 72, 42, 255)
WOOD_L = (150, 104, 62, 255)
IRON = (38, 38, 42, 255)
STONE = (126, 120, 110, 255)
STONE_D = (78, 74, 68, 255)
CLOTH_W = (214, 206, 186, 255)
GOLD = (176, 140, 60, 255)
BOOKS = [(120, 36, 30), (40, 70, 52), (52, 60, 98), (130, 92, 40), (86, 40, 70), (150, 130, 96), (60, 44, 32)]


class Painter:
    """Two RGBA layers: decals (no shadow) and objects (cast shadows)."""

    def __init__(self, seed=1):
        self.decal = Image.new("RGBA", (PW, PH), (0, 0, 0, 0))
        self.obj = Image.new("RGBA", (PW, PH), (0, 0, 0, 0))
        self.d = ImageDraw.Draw(self.decal)
        self.o = ImageDraw.Draw(self.obj)
        self.rng = np.random.default_rng(seed)
        self.glows = []   # (x, y, r_sq, rgb, strength)

    # ---- generic
    def rect(self, x0, y0, x1, y1, fill, outline=None, width=3, layer="o", radius=0):
        dr = self.o if layer == "o" else self.d
        if radius:
            dr.rounded_rectangle(R(x0, y0, x1, y1), radius=P(radius), fill=fill, outline=outline, width=width)
        else:
            dr.rectangle(R(x0, y0, x1, y1), fill=fill, outline=outline, width=width)

    def circle(self, x, y, r, fill, outline=None, width=3, layer="o"):
        dr = self.o if layer == "o" else self.d
        dr.ellipse(C(x, y, r), fill=fill, outline=outline, width=width)

    def glow(self, x, y, r, rgb=(255, 170, 80), strength=60):
        self.glows.append((x, y, r, rgb, strength))

    # ---- furniture
    def table(self, x0, y0, x1, y1, cloth=None, items=0):
        self.rect(x0, y0, x1, y1, WOOD, WOOD_D, 5, radius=0.06)
        if cloth:
            self.rect(x0 + 0.08, y0 + 0.08, x1 - 0.08, y1 - 0.08, cloth, None, radius=0.04)
        for _ in range(items):
            cx = self.rng.uniform(x0 + 0.25, x1 - 0.25)
            cy = self.rng.uniform(y0 + 0.2, y1 - 0.2)
            self.circle(cx, cy, 0.11, (220, 214, 200, 255), (120, 110, 96, 255), 2)
            self.circle(cx, cy, 0.05, (150, 60, 40, 255))

    def chair(self, x, y, s=0.38, back="n", color=WOOD_D):
        h = s / 2
        self.rect(x - h, y - h, x + h, y + h, color, (30, 20, 12, 255), 2, radius=0.05)
        bx = {"n": (x - h, y - h, x + h, y - h + 0.09), "s": (x - h, y + h - 0.09, x + h, y + h),
              "w": (x - h, y - h, x - h + 0.09, y + h), "e": (x + h - 0.09, y - h, x + h, y + h)}[back]
        self.rect(*bx, (36, 22, 12, 255), None)

    def armchair(self, x, y, color=(110, 40, 36, 255), back="n"):
        self.rect(x - 0.4, y - 0.4, x + 0.4, y + 0.4, color, (50, 20, 18, 255), 3, radius=0.12)
        self.rect(x - 0.25, y - 0.22, x + 0.25, y + 0.28, tuple(min(255, c + 22) for c in color[:3]) + (255,), None, radius=0.08)
        dark = tuple(int(c * 0.6) for c in color[:3]) + (255,)
        bar = {"n": (x - 0.4, y - 0.4, x + 0.4, y - 0.26), "s": (x - 0.4, y + 0.26, x + 0.4, y + 0.4),
               "w": (x - 0.4, y - 0.4, x - 0.26, y + 0.4), "e": (x + 0.26, y - 0.4, x + 0.4, y + 0.4)}[back]
        self.rect(*bar, dark, None, radius=0.05)

    def sofa(self, x0, y0, x1, y1, color=(98, 34, 40, 255)):
        self.rect(x0, y0, x1, y1, color, (40, 14, 16, 255), 3, radius=0.12)
        lite = tuple(min(255, c + 25) for c in color[:3]) + (255,)
        horiz = (x1 - x0) > (y1 - y0)
        n = max(2, int(round((x1 - x0 if horiz else y1 - y0) / 0.8)))
        for i in range(n):
            if horiz:
                a = x0 + 0.15 + i * (x1 - x0 - 0.3) / n
                self.rect(a + 0.03, y0 + 0.2, a + (x1 - x0 - 0.3) / n - 0.03, y1 - 0.1, lite, None, radius=0.06)
            else:
                a = y0 + 0.15 + i * (y1 - y0 - 0.3) / n
                self.rect(x0 + 0.2, a + 0.03, x1 - 0.1, a + (y1 - y0 - 0.3) / n - 0.03, lite, None, radius=0.06)

    def bed(self, x0, y0, x1, y1, blanket=(120, 30, 34, 255), head="n", posts=False, messy=False):
        self.rect(x0, y0, x1, y1, WOOD_D, (30, 18, 10, 255), 4, radius=0.05)
        self.rect(x0 + 0.08, y0 + 0.08, x1 - 0.08, y1 - 0.08, CLOTH_W, None)
        if head in ("n", "s"):
            hy0 = y0 + 0.15 if head == "n" else y1 - 0.55
            pw = (x1 - x0 - 0.4) / 2
            for i in range(2):
                px = x0 + 0.15 + i * (pw + 0.1)
                self.rect(px, hy0, px + pw, hy0 + 0.4, (236, 232, 220, 255), (160, 150, 130, 255), 2, radius=0.08)
            by0, by1 = (y0 + 0.75, y1 - 0.08) if head == "n" else (y0 + 0.08, y1 - 0.75)
            self.rect(x0 + 0.08, by0, x1 - 0.08, by1, blanket, None)
            if messy:
                self.o.polygon([(P(x0 + 0.1), P(by0)), (P(x1 - 0.3), P(by0 - 0.25)), (P(x1 - 0.1), P(by0 + 0.4))], fill=blanket)
        else:
            hx0 = x0 + 0.15 if head == "w" else x1 - 0.55
            ph = (y1 - y0 - 0.4) / 2
            for i in range(2):
                py = y0 + 0.15 + i * (ph + 0.1)
                self.rect(hx0, py, hx0 + 0.4, py + ph, (236, 232, 220, 255), (160, 150, 130, 255), 2, radius=0.08)
            bx0, bx1 = (x0 + 0.75, x1 - 0.08) if head == "w" else (x0 + 0.08, x1 - 0.75)
            self.rect(bx0, y0 + 0.08, bx1, y1 - 0.08, blanket, None)
        if posts:
            for (px, py) in ((x0, y0), (x1, y0), (x0, y1), (x1, y1)):
                self.circle(px, py, 0.09, WOOD_D)

    def bookcase(self, x0, y0, x1, y1):
        self.rect(x0, y0, x1, y1, (54, 34, 20, 255), (24, 14, 8, 255), 3)
        horiz = (x1 - x0) >= (y1 - y0)
        L = (x1 - x0) if horiz else (y1 - y0)
        t = 0.0
        while t < L - 0.08:
            bw = self.rng.uniform(0.04, 0.09)
            c = BOOKS[self.rng.integers(0, len(BOOKS))]
            col = tuple(int(v * self.rng.uniform(0.8, 1.15)) for v in c) + (255,)
            if horiz:
                self.rect(x0 + 0.04 + t, y0 + 0.05, x0 + 0.04 + t + bw, y1 - 0.05, col, None)
            else:
                self.rect(x0 + 0.05, y0 + 0.04 + t, x1 - 0.05, y0 + 0.04 + t + bw, col, None)
            t += bw + 0.008

    def shelves(self, x0, y0, x1, y1):
        self.rect(x0, y0, x1, y1, (70, 46, 28, 255), (30, 18, 10, 255), 3)
        horiz = (x1 - x0) >= (y1 - y0)
        L = (x1 - x0) if horiz else (y1 - y0)
        t = 0.1
        while t < L - 0.1:
            c = [(160, 150, 120), (110, 70, 40), (90, 110, 80), (200, 190, 170)][self.rng.integers(0, 4)]
            cx = (x0 + t) if horiz else (x0 + x1) / 2
            cy = (y0 + y1) / 2 if horiz else (y0 + t)
            self.circle(cx, cy, 0.09, c + (255,), (40, 30, 20, 255), 2)
            t += self.rng.uniform(0.22, 0.34)

    def fireplace(self, x0, y0, x1, y1, facing="s", lit=True):
        self.rect(x0, y0, x1, y1, STONE, STONE_D, 4)
        ix = 0.18
        self.rect(x0 + ix, y0 + ix, x1 - ix, y1 - ix, (24, 18, 16, 255), None)
        cx, cy = (x0 + x1) / 2, (y0 + y1) / 2
        if lit:
            self.circle(cx, cy, min(x1 - x0, y1 - y0) * 0.22, (230, 120, 40, 255))
            self.circle(cx, cy, min(x1 - x0, y1 - y0) * 0.11, (255, 210, 120, 255))
            self.glow(cx, cy, 3.2, (255, 150, 70), 70)
        else:
            self.circle(cx, cy, min(x1 - x0, y1 - y0) * 0.2, (60, 56, 52, 255))
        hx = {"s": (x0 - 0.15, y1, x1 + 0.15, y1 + 0.3), "n": (x0 - 0.15, y0 - 0.3, x1 + 0.15, y0),
              "e": (x1, y0 - 0.15, x1 + 0.3, y1 + 0.15), "w": (x0 - 0.3, y0 - 0.15, x0, y1 + 0.15)}[facing]
        self.rect(*hx, (100, 96, 90, 255), STONE_D, 2, layer="d")

    def stairs(self, x0, y0, x1, y1, up="n", step=0.28, base=(122, 86, 54)):
        """Steps run across the climb direction; the low end is shaded dark."""
        horiz = up in ("e", "w")
        L = (x1 - x0) if horiz else (y1 - y0)
        n = max(3, int(L / step))
        for i in range(n):
            t = i / (n - 1)
            hi = t if up in ("s", "e") else 1 - t     # 1 at the top of the flight
            shade = 0.45 + 0.6 * hi
            col = tuple(int(c * shade) for c in base) + (255,)
            if horiz:
                a = x0 + i * L / n
                self.rect(a, y0, a + L / n, y1, col, (30, 20, 12, 255), 2, layer="d")
            else:
                a = y0 + i * L / n
                self.rect(x0, a, x1, a + L / n, col, (30, 20, 12, 255), 2, layer="d")

    def rug(self, x0, y0, x1, y1, color=(110, 30, 32), trim=(176, 140, 60)):
        self.rect(x0, y0, x1, y1, color + (255,), None, layer="d")
        self.rect(x0 + 0.1, y0 + 0.1, x1 - 0.1, y1 - 0.1, None, trim + (255,), 4, layer="d")
        self.rect(x0 + 0.22, y0 + 0.22, x1 - 0.22, y1 - 0.22, None, trim + (200,), 2, layer="d")
        cx, cy = (x0 + x1) / 2, (y0 + y1) / 2
        rx, ry = (x1 - x0) * 0.25, (y1 - y0) * 0.25
        self.d.polygon([(P(cx), P(cy - ry)), (P(cx + rx), P(cy)), (P(cx), P(cy + ry)), (P(cx - rx), P(cy))],
                       outline=trim + (230,), width=3)

    def barrel(self, x, y, r=0.32):
        self.circle(x, y, r, (110, 72, 40, 255), (36, 24, 14, 255), 4)
        self.circle(x, y, r * 0.72, None, (40, 40, 44, 255), 3)
        self.circle(x, y, r * 0.3, (86, 56, 32, 255))

    def crate(self, x0, y0, x1, y1):
        self.rect(x0, y0, x1, y1, (140, 104, 60, 255), (60, 40, 22, 255), 4)
        self.o.line(R(x0, y0, x1, y1), fill=(80, 56, 30, 255), width=4)
        self.o.line([P(x1), P(y0), P(x0), P(y1)], fill=(80, 56, 30, 255), width=4)

    def coffin(self, x0, y0, x1, y1, stone=True):
        fill = (96, 92, 86, 255) if stone else (70, 44, 26, 255)
        if (x1 - x0) >= (y1 - y0):
            m = (y0 + y1) / 2
            pts = [(x0, m - 0.22), (x0 + 0.35, y0), (x1, y0 + 0.08), (x1, y1 - 0.08), (x0 + 0.35, y1), (x0, m + 0.22)]
        else:
            m = (x0 + x1) / 2
            pts = [(m - 0.22, y0), (x1, y0 + 0.35), (x1 - 0.08, y1), (x0 + 0.08, y1), (x0, y0 + 0.35), (m + 0.22, y0)]
        self.o.polygon([(P(a), P(b)) for a, b in pts], fill=fill, outline=(36, 34, 32, 255), width=4)
        inset = [(a * 0.85 + (x0 + x1) / 2 * 0.15, b * 0.85 + (y0 + y1) / 2 * 0.15) for a, b in pts]
        self.o.polygon([(P(a), P(b)) for a, b in inset], outline=(60, 58, 54, 255), width=2)

    def sarcophagus(self, x0, y0, x1, y1):
        self.rect(x0, y0, x1, y1, (176, 170, 160, 255), (70, 66, 60, 255), 5)
        self.rect(x0 + 0.12, y0 + 0.12, x1 - 0.12, y1 - 0.12, (196, 190, 178, 255), (120, 114, 104, 255), 2)
        cx = (x0 + x1) / 2
        self.circle(cx, y0 + 0.45, 0.18, (210, 204, 192, 255), (120, 114, 104, 255), 2)          # effigy head
        self.o.polygon([(P(cx - 0.3), P(y0 + 0.65)), (P(cx + 0.3), P(y0 + 0.65)),
                        (P(cx + 0.22), P(y1 - 0.3)), (P(cx - 0.22), P(y1 - 0.3))],
                       fill=(204, 198, 186, 255), outline=(120, 114, 104, 255), width=2)
        for dx in (-0.12, 0, 0.12):                                                                # carved lily
            self.o.line([P(cx + dx), P(y0 + 1.0), P(cx), P(y0 + 1.25)], fill=(150, 144, 134, 255), width=3)

    def pew(self, x0, y0, x1, y1):
        self.rect(x0, y0, x1, y1, WOOD, WOOD_D, 3)
        if (x1 - x0) < (y1 - y0):
            self.rect(x0, y0, x0 + 0.12, y1, (70, 44, 26, 255), None)
        else:
            self.rect(x0, y0, x1, y0 + 0.12, (70, 44, 26, 255), None)

    def candle(self, x, y, glow=True):
        self.circle(x, y, 0.06, (236, 228, 200, 255), (120, 110, 90, 255), 1)
        self.circle(x, y, 0.025, (255, 200, 90, 255))
        if glow:
            self.glow(x, y, 1.2, (255, 170, 80), 26)

    def candelabra(self, x, y, lit=True):
        self.circle(x, y, 0.28, None, IRON, 6)
        self.circle(x, y, 0.07, IRON)
        for a in range(3):
            ang = a * 2 * math.pi / 3 - math.pi / 2
            self.candle(x + 0.22 * math.cos(ang), y + 0.22 * math.sin(ang), glow=lit)

    def pillar(self, x, y, r=0.38):
        self.circle(x, y, r + 0.06, STONE_D)
        self.circle(x, y, r, (138, 132, 122, 255), (70, 66, 60, 255), 3)
        self.circle(x - r * 0.25, y - r * 0.25, r * 0.4, (160, 154, 144, 255))

    def pumpkin(self, x, y, r=0.22, lit=False):
        self.circle(x, y, r, (206, 104, 30, 255), (110, 50, 14, 255), 3)
        for k in (-0.5, 0, 0.5):
            self.o.arc(C(x + k * r * 0.6, y, r * 0.55), 0, 360, fill=(150, 70, 20, 255), width=2)
        self.circle(x, y - r * 0.05, r * 0.16, (90, 70, 30, 255))
        if lit:
            self.o.polygon([(P(x - r * .5), P(y - r * .2)), (P(x - r * .2), P(y - r * .2)), (P(x - r * .35), P(y - r * .5))], fill=(255, 220, 110, 255))
            self.o.polygon([(P(x + r * .5), P(y - r * .2)), (P(x + r * .2), P(y - r * .2)), (P(x + r * .35), P(y - r * .5))], fill=(255, 220, 110, 255))
            self.o.chord(C(x, y + r * 0.1, r * 0.5), 20, 160, fill=(255, 220, 110, 255))
            self.glow(x, y, 1.0, (255, 150, 60), 30)

    def tree(self, x, y, r=1.4):
        palette = [(54, 66, 34), (70, 74, 36), (120, 70, 30), (150, 92, 34), (96, 46, 26), (46, 56, 30)]
        for _ in range(16):
            a = self.rng.uniform(0, 2 * math.pi)
            d = self.rng.uniform(0, r * 0.55)
            rr = r * self.rng.uniform(0.35, 0.6)
            c = palette[self.rng.integers(0, len(palette))]
            self.circle(x + d * math.cos(a), y + d * math.sin(a), rr, c + (255,), None)
        for _ in range(9):
            a = self.rng.uniform(0, 2 * math.pi)
            d = self.rng.uniform(0, r * 0.6)
            self.circle(x + d * math.cos(a) - 0.1, y + d * math.sin(a) - 0.1, r * 0.18, (180, 120, 50, 160), None)

    def hedge(self, x0, y0, x1, y1):
        self.rect(x0, y0, x1, y1, (40, 56, 30, 255), (24, 34, 18, 255), 3, radius=0.25)
        n = int(max(x1 - x0, y1 - y0) * 4)
        for _ in range(n):
            cx = self.rng.uniform(x0 + 0.15, x1 - 0.15)
            cy = self.rng.uniform(y0 + 0.15, y1 - 0.15)
            self.circle(cx, cy, self.rng.uniform(0.08, 0.16), (56, 74, 38, 255))

    def lantern_post(self, x, y, color=(255, 200, 110), strength=34):
        self.circle(x, y, 0.13, IRON)
        self.rect(x - 0.09, y - 0.09, x + 0.09, y + 0.09, (255, 214, 140, 255), IRON, 3)
        self.glow(x, y, 1.6, color, strength)

    def post(self, x, y):
        self.rect(x - 0.1, y - 0.1, x + 0.1, y + 0.1, (90, 62, 36, 255), (40, 26, 14, 255), 3)

    def scarecrow(self, x, y):
        self.rect(x - 0.75, y - 0.08, x + 0.75, y + 0.08, (100, 70, 40, 255), (40, 26, 14, 255), 2)
        self.rect(x - 0.35, y - 0.25, x + 0.35, y + 0.45, (120, 96, 60, 255), (60, 40, 20, 255), 3, radius=0.1)
        self.pumpkin(x, y - 0.32, 0.26)
        for k in (-0.8, 0.8):
            self.o.line([P(x + k), P(y), P(x + k * 1.15), P(y + 0.12)], fill=(200, 170, 80, 255), width=4)

    def carriage(self, x0, y0, x1, y1):
        for (wx, wy) in ((x0, y0 + 0.4), (x1 - 0.15, y0 + 0.4), (x0, y1 - 0.75), (x1 - 0.15, y1 - 0.75)):
            self.rect(wx - 0.05, wy, wx + 0.2, wy + 0.4, (40, 30, 22, 255), (20, 14, 10, 255), 2)
        self.rect(x0 + 0.15, y0, x1 - 0.15, y1, (28, 26, 30, 255), (10, 10, 12, 255), 4, radius=0.2)
        self.rect(x0 + 0.3, y0 + 0.3, x1 - 0.3, y1 - 0.9, (44, 40, 46, 255), (90, 76, 40, 255), 2, radius=0.1)
        self.rect(x0 + 0.35, y1 - 0.8, x1 - 0.35, y1 - 0.15, (110, 74, 40, 255), (50, 30, 14, 255), 3)   # strapped trunk
        self.o.line(R(x0 + 0.35, y1 - 0.5, x1 - 0.35, y1 - 0.5), fill=(40, 26, 14, 255), width=4)
        self.rect((x0 + x1) / 2 - 0.05, y0 - 1.0, (x0 + x1) / 2 + 0.05, y0, (60, 44, 28, 255), None)  # shaft

    def chalk_circle(self, x, y, r):
        self.circle(x, y, r, None, (225, 222, 210, 210), 6, layer="d")
        self.circle(x, y, r * 0.78, None, (225, 222, 210, 170), 3, layer="d")
        for k in range(12):
            a = k * math.pi / 6
            ax, ay = x + r * 0.89 * math.cos(a), y + r * 0.89 * math.sin(a)
            self.d.line([P(ax - 0.06), P(ay - 0.06), P(ax + 0.06), P(ay + 0.06)], fill=(230, 226, 214, 200), width=3)
            self.d.line([P(ax + 0.06), P(ay - 0.06), P(ax - 0.06), P(ay + 0.06)], fill=(230, 226, 214, 160), width=2)
        pts = [(x + r * 0.78 * math.cos(k * 2 * math.pi / 5 * 2 - math.pi / 2),
                y + r * 0.78 * math.sin(k * 2 * math.pi / 5 * 2 - math.pi / 2)) for k in range(6)]
        self.d.line([(P(a), P(b)) for a, b in pts], fill=(225, 222, 210, 150), width=3)

    def brazier(self, x, y):
        for k in range(3):
            a = k * 2 * math.pi / 3 + 0.5
            self.o.line([P(x), P(y), P(x + 0.45 * math.cos(a)), P(y + 0.45 * math.sin(a))], fill=IRON, width=8)
        self.circle(x, y, 0.38, (52, 50, 54, 255), (20, 20, 22, 255), 5)
        self.circle(x, y, 0.27, (34, 30, 28, 255))
        for _ in range(8):
            self.circle(x + self.rng.uniform(-0.15, 0.15), y + self.rng.uniform(-0.15, 0.15), 0.05, (70, 60, 56, 255))

    def wine_rack(self, x0, y0, x1, y1):
        self.rect(x0, y0, x1, y1, (50, 32, 20, 255), (24, 14, 8, 255), 3)
        horiz = (x1 - x0) >= (y1 - y0)
        L = (x1 - x0) if horiz else (y1 - y0)
        W2 = (y1 - y0) if horiz else (x1 - x0)
        t = 0.12
        while t < L - 0.08:
            s = 0.12
            while s < W2 - 0.06:
                cx, cy = (x0 + t, y0 + s) if horiz else (x0 + s, y0 + t)
                self.circle(cx, cy, 0.05, (36, 66, 40, 255), (14, 22, 14, 255), 1)
                s += 0.16
            t += 0.16

    def basin(self, x0, y0, x1, y1):
        self.rect(x0, y0, x1, y1, STONE, STONE_D, 4, radius=0.1)
        self.rect(x0 + 0.12, y0 + 0.12, x1 - 0.12, y1 - 0.12, (70, 90, 96, 255), None, radius=0.08)

    def frame(self, x0, y0, x1, y1, inner=(60, 50, 40)):
        self.rect(x0, y0, x1, y1, GOLD, (110, 84, 30, 255), 2)
        self.rect(x0 + 0.04, y0 + 0.04, x1 - 0.04, y1 - 0.04, inner + (255,), None)

    def armor(self, x, y):
        self.circle(x, y, 0.32, (150, 150, 156, 255), (60, 60, 66, 255), 3)
        self.circle(x, y - 0.05, 0.14, (110, 110, 118, 255), (50, 50, 56, 255), 2)
        self.o.line([P(x + 0.3), P(y - 0.35), P(x + 0.3), P(y + 0.35)], fill=(90, 90, 96, 255), width=5)

    def stone_slab(self, x, y):
        self.rect(x - 0.3, y - 0.15, x + 0.3, y + 0.15, (150, 146, 138, 255), (70, 66, 60, 255), 3, radius=0.08)
        for k in (-0.15, 0, 0.15):
            self.circle(x + k, y + 0.32, 0.07, (232, 230, 220, 255), (150, 150, 140, 255), 1)

    def leaves(self, mask, count, seed):
        """Scatter fallen autumn leaves as decals wherever mask (squares grid of bools) is True."""
        r = np.random.default_rng(seed)
        cols = [(170, 86, 30), (140, 60, 26), (190, 130, 44), (110, 52, 24)]
        n = 0
        while n < count:
            x, y = r.uniform(0, W), r.uniform(0, H)
            if not mask[int(y), int(x)]:
                continue
            c = cols[r.integers(0, len(cols))]
            s = r.uniform(0.04, 0.08)
            a = r.uniform(0, math.pi)
            pts = [(x + s * math.cos(a), y + s * math.sin(a)), (x + s * 0.4 * math.cos(a + 1.6), y + s * 0.4 * math.sin(a + 1.6)),
                   (x - s * math.cos(a), y - s * math.sin(a)), (x + s * 0.4 * math.cos(a - 1.6), y + s * 0.4 * math.sin(a - 1.6))]
            self.d.polygon([(P(px), P(py)) for px, py in pts], fill=c + (220,))
            n += 1


# ------------------------------------------------------------------ walls ---
WALL_T = {"ext": 30, "int": 18, "brick": 20, "rail": 8, "window": 30, "secret_ext": 30, "secret": 18}


class Level:
    def __init__(self, key, name):
        self.key, self.name = key, name
        self.rooms = []        # dict(id, name, rect, floor, kind)
        self.edges = {}        # unit edge key -> (kind, group_id)
        self.lights, self.notes, self.tokens, self.regions, self.tiles = [], [], [], [], []

    def room(self, rid, name, rect, floor, kind="room"):
        self.rooms.append(dict(id=rid, name=name, rect=rect, floor=floor, kind=kind))

    def edge(self, o, line, a, b, kind, label=None):
        gid = f"{kind}:{o}{line}:{a}-{b}"
        for p in range(a, b):
            self.edges[(o, line, p)] = (kind, gid, label)

    def grid(self):
        g = np.full((H, W), -1, int)
        for i, r in enumerate(self.rooms):
            x0, y0, x1, y1 = r["rect"]
            g[y0:y1, x0:x1] = i
        return g


def compute_walls(level):
    """Return merged segments: dict(kind, a=(x,y), b=(x,y), gid, label) in squares."""
    g = level.grid()
    units = []
    for x in range(W + 1):
        for y in range(H):
            L = g[y, x - 1] if x > 0 else -1
            Rr = g[y, x] if x < W else -1
            key = ("v", x, y)
            if key in level.edges:
                kind, gid, label = level.edges[key]
                if kind != "open":
                    units.append(("v", x, y, kind, gid, label))
            elif L != Rr:
                units.append(("v", x, y, "ext" if -1 in (L, Rr) else "int", None, None))
    for y in range(H + 1):
        for x in range(W):
            T = g[y - 1, x] if y > 0 else -1
            B = g[y, x] if y < H else -1
            key = ("h", y, x)
            if key in level.edges:
                kind, gid, label = level.edges[key]
                if kind != "open":
                    units.append(("h", y, x, kind, gid, label))
            elif T != B:
                units.append(("h", y, x, "ext" if -1 in (T, B) else "int", None, None))
    units.sort(key=lambda u: (u[0], u[1], u[3], u[4] or "", u[2]))
    segs = []
    for u in units:
        o, line, p, kind, gid, label = u
        if segs:
            s = segs[-1]
            if (s["o"], s["line"], s["kind"], s["gid"]) == (o, line, kind, gid) and s["end"] == p and kind not in ("door", "secret", "locked"):
                s["end"] = p + 1
                continue
        segs.append(dict(o=o, line=line, start=p, end=p + 1, kind=kind, gid=gid, label=label))
    out = []
    for s in segs:
        if s["o"] == "v":
            a, b = (s["line"], s["start"]), (s["line"], s["end"])
        else:
            a, b = (s["start"], s["line"]), (s["end"], s["line"])
        out.append(dict(kind=s["kind"], a=a, b=b, gid=s["gid"], label=s["label"]))
    return out


def draw_walls(segs, show_secret=False):
    """Paint walls, doors and windows onto a fresh RGBA layer."""
    layer = Image.new("RGBA", (PW, PH), (0, 0, 0, 0))
    d = ImageDraw.Draw(layer)
    stone, edge = (94, 88, 80, 255), (34, 30, 27, 255)
    solid = [s for s in segs if s["kind"] in ("ext", "int", "window", "secret", "secret_ext", "brick")]
    for s in solid:
        t = WALL_T[s["kind"]] / G
        (ax, ay), (bx, by) = s["a"], s["b"]
        if ax == bx:
            box = (ax - t / 2, ay - t / 2, ax + t / 2, by + t / 2)
        else:
            box = (ax - t / 2, ay - t / 2, bx + t / 2, ay + t / 2)
        if s["kind"] == "brick":
            d.rectangle(R(*box), fill=(118, 62, 46, 255), outline=edge, width=3)
            x0, y0, x1, y1 = R(*box)
            for k in range(y0, y1, 14):
                d.line([x0, k, x1, k], fill=(70, 40, 30, 255), width=2)
            continue
        d.rectangle(R(*box), fill=stone, outline=edge, width=3)
    for s in solid:                                   # windows on top of the wall body
        if s["kind"] != "window":
            continue
        (ax, ay), (bx, by) = s["a"], s["b"]
        if ax == bx:
            d.rectangle(R(ax - 0.05, ay + 0.08, ax + 0.05, by - 0.08), fill=(150, 172, 182, 255), outline=(40, 46, 50, 255), width=2)
            d.line([P(ax - 0.12), P((ay + by) / 2), P(ax + 0.12), P((ay + by) / 2)], fill=edge, width=4)
        else:
            d.rectangle(R(ax + 0.08, ay - 0.05, bx - 0.08, ay + 0.05), fill=(150, 172, 182, 255), outline=(40, 46, 50, 255), width=2)
            d.line([P((ax + bx) / 2), P(ay - 0.12), P((ax + bx) / 2), P(ay + 0.12)], fill=edge, width=4)
    for s in segs:
        k = s["kind"]
        (ax, ay), (bx, by) = s["a"], s["b"]
        vert = ax == bx
        if k == "rail":
            if vert:
                d.rectangle(R(ax - 0.05, ay, ax + 0.05, by), fill=(70, 44, 26, 255), outline=(30, 18, 10, 255), width=2)
                n = int((by - ay) * 4)
                for i in range(n + 1):
                    d.ellipse(C(ax, ay + i / 4, 0.06), fill=(150, 104, 62, 255), outline=(30, 18, 10, 255))
            else:
                d.rectangle(R(ax, ay - 0.05, bx, ay + 0.05), fill=(70, 44, 26, 255), outline=(30, 18, 10, 255), width=2)
                n = int((bx - ax) * 4)
                for i in range(n + 1):
                    d.ellipse(C(ax + i / 4, ay, 0.06), fill=(150, 104, 62, 255), outline=(30, 18, 10, 255))
        if k in ("door", "locked", "double"):
            jam = 0.08
            if vert:
                d.rectangle(R(ax - 0.12, ay, ax + 0.12, ay + jam), fill=stone, outline=edge, width=2)
                d.rectangle(R(ax - 0.12, by - jam, ax + 0.12, by), fill=stone, outline=edge, width=2)
                d.rectangle(R(ax - 0.05, ay + jam, ax + 0.05, by - jam), fill=(120, 78, 42, 255), outline=(40, 24, 12, 255), width=3)
            else:
                d.rectangle(R(ax, ay - 0.12, ax + jam, ay + 0.12), fill=stone, outline=edge, width=2)
                d.rectangle(R(bx - jam, ay - 0.12, bx, ay + 0.12), fill=stone, outline=edge, width=2)
                d.rectangle(R(ax + jam, ay - 0.05, bx - jam, ay + 0.05), fill=(120, 78, 42, 255), outline=(40, 24, 12, 255), width=3)
            if k == "double":
                mx, my = (ax + bx) / 2, (ay + by) / 2
                d.line([P(mx - (0.08 if not vert else 0)), P(my - (0.08 if vert else 0)), P(mx + (0.08 if not vert else 0)), P(my + (0.08 if vert else 0))], fill=(40, 24, 12, 255), width=4)
                if vert:
                    d.line([P(ax - 0.08), P(my), P(ax + 0.08), P(my)], fill=(40, 24, 12, 255), width=4)
                else:
                    d.line([P(mx), P(ay - 0.08), P(mx), P(ay + 0.08)], fill=(40, 24, 12, 255), width=4)
    return layer


# --------------------------------------------------------------- compose ---
def composite(base_rgba, layer, shadow=True, offset=(7, 9), blur=7, strength=0.55):
    """Alpha-composite `layer` over `base_rgba` (float arrays HxWx4), casting a soft shadow."""
    la = np.asarray(layer).astype(np.float32) / 255.0
    if shadow:
        a = la[..., 3]
        sh = np.zeros_like(a)
        dx, dy = offset
        sh[dy:, dx:] = a[:-dy, :-dx]
        sh = gaussian_filter(sh, blur) * strength
        base_rgba[..., :3] *= (1 - sh[..., None])
        base_rgba[..., 3] = np.maximum(base_rgba[..., 3], sh * 0.9)
    al = la[..., 3:4]
    base_rgba[..., :3] = base_rgba[..., :3] * (1 - al) + la[..., :3] * 255 * al
    base_rgba[..., 3] = np.maximum(base_rgba[..., 3], la[..., 3])
    return base_rgba


def apply_glows(img, glows):
    for (x, y, r, rgb, s) in glows:
        x0, y0 = max(0, P(x - r)), max(0, P(y - r))
        x1, y1 = min(PW, P(x + r)), min(PH, P(y + r))
        if x1 <= x0 or y1 <= y0:
            continue
        yy, xx = np.mgrid[y0:y1, x0:x1].astype(np.float32)
        dist = np.sqrt((xx - x * G) ** 2 + (yy - y * G) ** 2) / (r * G)
        f = np.clip(1 - dist, 0, 1) ** 2 * (s / 100.0)
        img[y0:y1, x0:x1, :3] += f[..., None] * (np.array(rgb, np.float32) - img[y0:y1, x0:x1, :3]) * 0.9
    return img


def grain(img, seed, amt=5):
    r = np.random.default_rng(seed)
    n = r.normal(0, amt, (PH, PW)).astype(np.float32)
    img[..., :3] += n[..., None]
    return img


def font(size, bold=True):
    base = "/usr/share/texmf/fonts/opentype/public/tex-gyre/"
    return ImageFont.truetype(base + ("texgyrepagella-bold.otf" if bold else "texgyrepagella-regular.otf"), size)
