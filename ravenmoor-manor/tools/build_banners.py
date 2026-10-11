"""Chapter banners for the Adventure journal, in the same cut-paper silhouette style as the portraits.

    python3 tools/build_banners.py

Writes assets/art/banner-*.webp (1200 x 360) and assets/art/suspects.webp (the six suspects' portraits in a row).
"""
import math
import random
from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw, ImageFilter

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / "assets/art"
W, H = 1200, 360
INK = (14, 12, 12)


def gradient(top, bottom, h=H, w=W):
    t = np.linspace(0, 1, h)[:, None]
    arr = np.zeros((h, w, 3), dtype=np.float32)
    for i in range(3):
        arr[..., i] = top[i] * (1 - t) + bottom[i] * t
    return Image.fromarray(arr.astype(np.uint8), "RGB")


def fog(img, y, height, color, alpha, seed):
    rng = np.random.default_rng(seed)
    n = rng.normal(0, 1, (8, 24)).astype(np.float32)
    n = np.asarray(Image.fromarray(n).resize((W, height), Image.BICUBIC))
    n = (n - n.min()) / (np.ptp(n) + 1e-6)
    t = np.linspace(0, 1, height)[:, None]
    band = np.sin(t * math.pi)
    a = np.clip(n * band * alpha, 0, 255).astype(np.uint8)
    layer = Image.new("RGBA", (W, height), color + (0,))
    layer.putalpha(Image.fromarray(a))
    base = img.convert("RGBA")
    base.alpha_composite(layer, (0, y))
    return base.convert("RGB")


def glow(img, center, radius, color, strength=1.0):
    layer = Image.new("RGBA", img.size, (0, 0, 0, 0))
    d = ImageDraw.Draw(layer)
    cx, cy = center
    for k in range(radius, 0, -4):
        a = int(120 * strength * (1 - k / radius) ** 1.7)
        d.ellipse([cx - k, cy - k, cx + k, cy + k], fill=color + (a,))
    layer = layer.filter(ImageFilter.GaussianBlur(radius / 8))
    base = img.convert("RGBA")
    base.alpha_composite(layer)
    return base.convert("RGB")


def stars(img, n, seed, max_y=200):
    rnd = random.Random(seed)
    d = ImageDraw.Draw(img)
    for _ in range(n):
        x, y = rnd.randrange(W), rnd.randrange(max_y)
        v = rnd.randrange(150, 240)
        d.point((x, y), fill=(v, v, v))
    return img


def vignette(img, strength=0.55):
    y, x = np.mgrid[0:img.height, 0:img.width]
    r = np.sqrt(((x - img.width / 2) / (img.width * 0.62)) ** 2 + ((y - img.height / 2) / (img.height * 0.9)) ** 2)
    f = 1 - np.clip(r - 0.35, 0, 1) * strength
    arr = np.asarray(img).astype(np.float32) * f[..., None]
    return Image.fromarray(np.clip(arr, 0, 255).astype(np.uint8), "RGB")


def tree(d, x, base, h, seed, fill=INK):
    rnd = random.Random(seed)
    d.polygon([(x - 8, base), (x - 4, base - h * 0.5), (x + 4, base - h * 0.5), (x + 8, base)], fill=fill)

    def branch(px, py, ang, length, width, depth):
        if depth == 0 or length < 6:
            return
        nx, ny = px + length * math.cos(ang), py - length * math.sin(ang)
        d.line([(px, py), (nx, ny)], fill=fill, width=max(1, int(width)))
        for da in (-0.5, 0.45):
            branch(nx, ny, ang + da + rnd.uniform(-0.25, 0.25), length * rnd.uniform(0.62, 0.78), width * 0.65, depth - 1)
    branch(x, base - h * 0.45, math.pi / 2, h * 0.3, 7, 6)


def manor(d, x0, base, scale=1.0, lit=(255, 190, 90)):
    """The manor's silhouette: central hall, two wings, the chapel with its bell tower, chimneys."""
    s = scale
    P = lambda pts: [(x0 + px * s, base - py * s) for px, py in pts]
    d.polygon(P([(0, 0), (0, 120), (60, 170), (120, 120), (120, 0)]), fill=INK)                       # west wing
    d.polygon(P([(110, 0), (110, 150), (180, 210), (250, 150), (320, 210), (390, 150), (390, 0)]), fill=INK)  # hall
    d.polygon(P([(380, 0), (380, 130), (450, 180), (520, 130), (520, 0)]), fill=INK)                   # east wing
    d.polygon(P([(500, 0), (500, 190), (530, 260), (560, 190), (560, 0)]), fill=INK)                   # chapel tower
    d.polygon(P([(522, 260), (530, 300), (538, 260)]), fill=INK)
    for cx, top in ((40, 190), (200, 240), (300, 240), (470, 200)):
        d.rectangle(P([(cx, top), (cx + 14, top - 70)])[0] + P([(cx + 14, top - 70)])[0], fill=INK)
    windows = [(25, 60), (75, 60), (140, 50), (180, 50), (230, 50), (270, 50), (320, 50), (355, 50), (140, 100), (355, 100),
               (405, 55), (470, 55), (240, 110)]
    return [(x0 + (wx + 9) * s, base - (wy + 12) * s) for wx, wy in windows], P


def banner_arrival():
    img = gradient((20, 26, 44), (70, 60, 70))
    img = stars(img, 160, 1)
    img = glow(img, (930, 90), 120, (230, 226, 200), 0.9)
    d = ImageDraw.Draw(img)
    d.ellipse([890, 50, 970, 130], fill=(238, 232, 210))
    img = fog(img, 150, 140, (180, 180, 200), 120, 3)
    d = ImageDraw.Draw(img)
    windows, P = manor(d, 300, 300, 1.0)
    for wx, wy in windows:
        d.rectangle([wx - 6, wy - 9, wx + 6, wy + 9], fill=(255, 196, 96))
    for t, (tx, th) in enumerate([(60, 220), (170, 170), (1050, 230), (1150, 180), (900, 150)]):
        tree(d, tx, 330, th, t + 5)
    d.rectangle([0, 300, W, H], fill=INK)
    d.polygon([(560, 300), (640, 300), (760, 360), (440, 360)], fill=(40, 34, 30))                    # the drive
    img = fog(img, 250, 110, (150, 150, 170), 90, 7)
    for i, (x, y) in enumerate([(548, 312), (652, 312), (520, 330), (680, 330), (488, 350), (712, 350)]):
        img = glow(img, (x, y), 30, (255, 140, 30), 1.0)
        d = ImageDraw.Draw(img)
        d.ellipse([x - 6, y - 5, x + 6, y + 5], fill=(240, 120, 30))
    return vignette(img)


def banner_masque():
    img = gradient((58, 34, 26), (30, 18, 14))
    img = glow(img, (600, 230), 420, (255, 150, 60), 0.55)
    d = ImageDraw.Draw(img)
    for x in range(80, W, 260):                                                                      # arched windows
        d.rounded_rectangle([x, 30, x + 90, 190], radius=45, fill=(40, 38, 70))
        d.line([(x + 45, 30), (x + 45, 190)], fill=INK, width=4)
        d.line([(x, 120), (x + 90, 120)], fill=INK, width=4)
    for x in range(90, W, 130):                                                                      # paper bats
        d.polygon([(x, 22), (x + 10, 14), (x + 16, 22), (x + 22, 14), (x + 32, 22), (x + 16, 28)], fill=INK)
    # Masked guests behind the table: plague doctor, black swan, witch, headless horseman, scarecrow coat.
    for x, mask in ((230, "beak"), (430, "swan"), (640, "witch"), (840, "horse"), (1020, "hat")):
        if mask != "horse":
            d.ellipse([x - 24, 170, x + 24, 226], fill=INK)
        d.rounded_rectangle([x - 52, 214, x + 52, 300], radius=34, fill=INK)
        if mask == "beak":
            d.polygon([(x + 18, 190), (x + 74, 214), (x + 16, 208)], fill=INK)
            d.ellipse([x - 40, 160, x + 40, 176], fill=INK)
            d.rounded_rectangle([x - 24, 132, x + 24, 172], radius=10, fill=INK)
        if mask == "witch":
            d.polygon([(x - 56, 180), (x + 56, 174), (x + 4, 92)], fill=INK)
        if mask == "swan":
            for k in range(4):
                d.polygon([(x - 6, 172), (x - 40 - k * 8, 120 + k * 10), (x - 14, 168)], fill=INK)
        if mask == "horse":
            d.polygon([(x - 34, 220), (x - 30, 190), (x + 30, 190), (x + 34, 220)], fill=INK)
            d.ellipse([x + 44, 230, x + 84, 266], fill=(214, 104, 26))
        if mask == "hat":
            d.polygon([(x - 50, 180), (x + 50, 176), (x + 52, 186), (x - 50, 190)], fill=INK)
            d.rounded_rectangle([x - 24, 146, x + 24, 182], radius=8, fill=INK)
    d.rectangle([0, 262, W, H], fill=INK)                                                            # the long table
    d.rectangle([40, 248, 1160, 266], fill=(30, 20, 16))
    candles = []
    for x in range(110, 1120, 180):
        d.line([(x, 250), (x, 212)], fill=INK, width=6)
        for dx in (-24, 0, 24):
            d.line([(x, 218), (x + dx, 204)], fill=INK, width=4)
            d.rectangle([x + dx - 3, 186, x + dx + 3, 204], fill=(232, 222, 196))
            candles.append((x + dx, 180))
    for x, y in candles:
        img = glow(img, (x, y), 34, (255, 170, 70), 0.8)
    d = ImageDraw.Draw(img)
    for x, y in candles:
        d.ellipse([x - 3, y - 7, x + 3, y + 4], fill=(255, 220, 140))
    return vignette(img)


def banner_widow():
    img = gradient((12, 20, 18), (6, 10, 10))
    img = glow(img, (600, 150), 260, (70, 255, 150), 0.9)
    d = ImageDraw.Draw(img)
    # The Widow on the minstrels' gallery: veil, gown, lantern held high.
    d.polygon([(560, 260), (566, 150), (584, 100), (606, 90), (626, 104), (640, 160), (652, 260)], fill=(10, 18, 16))
    d.line([(632, 130), (676, 96)], fill=(10, 18, 16), width=8)
    d.line([(676, 96), (676, 110)], fill=(10, 18, 16), width=3)
    img = glow(img, (676, 128), 70, (120, 255, 170), 1.2)
    d = ImageDraw.Draw(img)
    d.rectangle([666, 112, 686, 142], fill=(170, 255, 200))
    # Gallery railing and balusters across the whole banner.
    d.rectangle([0, 250, W, 264], fill=INK)
    for x in range(10, W, 36):
        d.rounded_rectangle([x, 264, x + 14, 330], radius=6, fill=INK)
    d.rectangle([0, 326, W, H], fill=INK)
    # Smoke from the candles she blew out.
    for x in (180, 320, 880, 1020):
        d.line([(x, 250), (x, 236)], fill=(200, 196, 180), width=6)
        for k in range(6):
            d.arc([x - 10 + (k % 2) * 6, 200 - k * 16, x + 10 + (k % 2) * 6, 230 - k * 16], 90, 270, fill=(120, 130, 125), width=2)
    return vignette(img, 0.5)


def banner_candles():
    img = gradient((26, 20, 16), (8, 6, 6))
    d = ImageDraw.Draw(img)
    lit = 7
    xs = [130 + i * 85 for i in range(12)]
    for i, x in enumerate(xs):
        on = i >= 12 - lit
        if on:
            img = glow(img, (x, 150), 70, (255, 170, 60), 0.9)
    d = ImageDraw.Draw(img)
    for i, x in enumerate(xs):
        on = i >= 12 - lit
        d.rectangle([x - 14, 176, x + 14, 290], fill=(232, 220, 190) if on else (110, 104, 92))
        d.line([(x, 176), (x, 164)], fill=INK, width=3)
        if on:
            d.polygon([(x, 130), (x + 8, 156), (x, 166), (x - 8, 156)], fill=(255, 196, 90))
            d.ellipse([x - 3, 150, x + 3, 162], fill=(255, 248, 220))
        else:
            for k in range(4):
                d.arc([x - 8 + (k % 2) * 5, 120 - k * 14, x + 8 + (k % 2) * 5, 150 - k * 14], 90, 270, fill=(130, 126, 118), width=2)
    d.rectangle([0, 290, W, H], fill=INK)
    return vignette(img, 0.45)


def banner_crypt():
    img = gradient((44, 48, 54), (16, 18, 22))
    img = glow(img, (900, 230), 260, (60, 255, 140), 1.0)
    d = ImageDraw.Draw(img)
    # Vaulted bays: dark recesses with rounded heads between stone pillars.
    for x in range(20, W, 240):
        d.rounded_rectangle([x, 70, x + 190, 340], radius=95, fill=(20, 22, 26))
    for x in range(-20, W, 240):
        d.rectangle([x, 0, x + 40, H], fill=INK)
        d.rectangle([x - 8, 60, x + 48, 76], fill=INK)
    d.rectangle([0, 0, W, 26], fill=INK)
    for x in (110, 350):                                                                             # coffins
        d.polygon([(x, 336), (x + 22, 292), (x + 172, 292), (x + 194, 336)], fill=INK)
        d.polygon([(x + 30, 292), (x + 46, 270), (x + 150, 270), (x + 166, 292)], fill=(26, 28, 32))
    d.polygon([(560, 336), (580, 300), (720, 300), (740, 336)], fill=INK)                            # a lid ajar
    d.polygon([(590, 300), (640, 240), (760, 262), (712, 300)], fill=(26, 28, 32))
    d.polygon([(860, 300), (870, 250), (930, 250), (940, 300)], fill=INK)                            # brazier
    d.rectangle([878, 300, 922, 340], fill=INK)
    for k, (dx, h) in enumerate([(-20, 70), (0, 110), (20, 80), (-8, 90), (12, 95)]):
        x = 900 + dx
        d.polygon([(x - 12, 252), (x, 252 - h), (x + 12, 252)], fill=(80, 255, 150) if k % 2 else (170, 255, 200))
    for x in (1040, 1120):                                                                           # scarecrows
        d.line([(x, 360), (x, 210)], fill=INK, width=8)
        d.line([(x - 50, 250), (x + 50, 250)], fill=INK, width=8)
        img = glow(img, (x, 200), 40, (255, 140, 30), 0.9)
        d = ImageDraw.Draw(img)
        d.ellipse([x - 24, 180, x + 24, 220], fill=(214, 104, 26))
        d.polygon([(x - 12, 196), (x - 4, 190), (x - 4, 200)], fill=(255, 226, 110))
        d.polygon([(x + 4, 190), (x + 12, 196), (x + 4, 200)], fill=(255, 226, 110))
        d.line([(x - 12, 208), (x + 12, 208)], fill=(255, 226, 110), width=3)
    d.rectangle([0, 334, W, H], fill=INK)
    img = fog(img, 250, 110, (90, 200, 140), 70, 11)
    return vignette(img)


def banner_dawn():
    img = gradient((70, 74, 96), (196, 160, 150))
    img = fog(img, 120, 160, (220, 214, 220), 150, 13)
    d = ImageDraw.Draw(img)
    for t, (tx, th) in enumerate([(80, 200), (200, 150), (1000, 190), (1120, 220)]):
        tree(d, tx, 300, th, t + 21, fill=(40, 38, 46))
    d.rectangle([0, 290, W, H], fill=(30, 30, 38))
    d.ellipse([260, 270, 940, 350], fill=(84, 96, 110))                                              # the pond
    for x in (300, 420, 560, 680, 800, 900):                                                         # warding lanterns, now green
        img = glow(img, (x, 270), 34, (90, 255, 160), 1.0)
        d = ImageDraw.Draw(img)
        d.line([(x, 300), (x, 274)], fill=(30, 30, 38), width=4)
        d.rectangle([x - 6, 260, x + 6, 276], fill=(150, 255, 190))
    # The Widow standing on the still water, bowing her head.
    img = glow(img, (600, 220), 120, (110, 255, 170), 0.7)
    d = ImageDraw.Draw(img)
    d.polygon([(570, 312), (576, 214), (590, 176), (606, 168), (620, 178), (628, 214), (636, 312)], fill=(32, 40, 44))
    d.ellipse([618, 230, 640, 252], fill=(150, 255, 190))
    d.polygon([(560, 316), (646, 316), (640, 330), (566, 330)], fill=(60, 72, 82))                   # her reflection
    return vignette(img, 0.4)


def suspects_strip():
    keys = ["morwenna", "edric", "pip", "quill-masked", "bramwell", "crane"]
    tiles = [Image.open(ROOT / f"assets/portraits/{k}.webp").convert("RGB").resize((200, 253)) for k in keys]
    strip = Image.new("RGB", (200 * 6, 253), (18, 20, 19))
    for i, t in enumerate(tiles):
        strip.paste(t, (i * 200, 0))
    return strip


def main():
    OUT.mkdir(parents=True, exist_ok=True)
    for name, fn in [("arrival", banner_arrival), ("masque", banner_masque), ("widow", banner_widow),
                     ("candles", banner_candles), ("crypt", banner_crypt), ("dawn", banner_dawn)]:
        out = OUT / f"banner-{name}.webp"
        fn().save(out, "WEBP", quality=86)
        print("wrote", out.relative_to(ROOT))
    out = OUT / "suspects.webp"
    suspects_strip().save(out, "WEBP", quality=86)
    print("wrote", out.relative_to(ROOT))


if __name__ == "__main__":
    main()
