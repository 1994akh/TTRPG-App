"""Placeholder token art (512x512 WebP, transparent corners). Run: python3 tools/build_tokens.py"""
import math
import os

from PIL import Image, ImageDraw, ImageFilter

S = 512
OUT = os.path.join(os.path.dirname(__file__), "..", "assets", "tokens")
SKIN = (226, 190, 160)
RING = {"villain": (46, 120, 80), "npc": (176, 140, 60), "monster": (196, 96, 30), "spirit": (120, 220, 170), "undead": (150, 150, 150)}


def base(role, bg=(40, 34, 38)):
    im = Image.new("RGBA", (S, S), (0, 0, 0, 0))
    d = ImageDraw.Draw(im)
    d.ellipse([16, 16, S - 16, S - 16], fill=bg + (255,))
    for k in range(60):                      # soft vignette
        a = int(70 * k / 60)
        d.ellipse([16 + k, 16 + k, S - 16 - k, S - 16 - k], outline=tuple(min(255, c + 30 - k // 2) for c in bg) + (255,))
    return im, d


def ring(im, role):
    d = ImageDraw.Draw(im)
    c = RING[role]
    d.ellipse([10, 10, S - 10, S - 10], outline=(20, 18, 16, 255), width=30)
    d.ellipse([14, 14, S - 14, S - 14], outline=c + (255,), width=20)
    d.ellipse([30, 30, S - 30, S - 30], outline=(255, 255, 255, 60), width=3)
    mask = Image.new("L", (S, S), 0)
    ImageDraw.Draw(mask).ellipse([6, 6, S - 6, S - 6], fill=255)
    im.putalpha(Image.composite(im.split()[3], Image.new("L", (S, S), 0), mask))
    return im


def bust(d, coat, skin=SKIN, head=(256, 230), hr=92, collar=None):
    d.rounded_rectangle([96, 330, 416, 560], radius=120, fill=coat + (255,))
    if collar:
        d.polygon([(200, 330), (256, 400), (312, 330)], fill=collar + (255,))
    d.rectangle([228, 290, 284, 350], fill=tuple(int(c * 0.9) for c in skin) + (255,))
    hx, hy = head
    d.ellipse([hx - hr, hy - hr * 1.12, hx + hr, hy + hr * 1.12], fill=skin + (255,))


def eyes(d, y=225, dx=34, r=9, color=(40, 30, 30)):
    for s in (-1, 1):
        d.ellipse([256 + s * dx - r, y - r, 256 + s * dx + r, y + r], fill=color + (255,))


def save(im, name):
    im.save(os.path.join(OUT, name), "WEBP", quality=92)


def main():
    os.makedirs(OUT, exist_ok=True)

    # Dr. Quill, masked
    im, d = base("villain", (30, 34, 32))
    bust(d, (30, 28, 26), collar=(60, 56, 50))
    d.ellipse([150, 100, 362, 330], fill=(232, 222, 196, 255), outline=(120, 110, 90, 255), width=4)
    d.polygon([(256, 230), (430, 350), (250, 300)], fill=(226, 214, 186, 255), outline=(120, 110, 90, 255))
    for s in (-1, 1):
        d.ellipse([256 + s * 48 - 30, 180, 256 + s * 48 + 30, 240], fill=(50, 90, 70, 255), outline=(30, 24, 20, 255), width=8)
        d.ellipse([256 + s * 48 - 10, 196, 256 + s * 48 + 4, 210], fill=(200, 255, 220, 200))
    d.ellipse([120, 70, 392, 130], fill=(24, 22, 22, 255))
    d.rounded_rectangle([170, 30, 342, 110], radius=20, fill=(24, 22, 22, 255))
    save(ring(im, "villain"), "quill-masked.webp")

    # Dr. Quill, unmasked
    im, d = base("villain", (30, 34, 32))
    bust(d, (30, 28, 26), collar=(220, 214, 200))
    d.pieslice([158, 110, 354, 250], 180, 360, fill=(190, 190, 196, 255))
    for s in (-1, 1):
        d.ellipse([256 + s * 38 - 26, 205, 256 + s * 38 + 26, 245], outline=(90, 80, 40, 255), width=5)
    eyes(d, 225, 38, 7)
    d.line([230, 225, 282, 225], fill=(90, 80, 40, 255), width=4)
    d.arc([206, 250, 306, 300], 20, 160, fill=(120, 60, 50, 255), width=5)
    d.polygon([(200, 270), (256, 262), (312, 270), (300, 300), (212, 300)], fill=(200, 200, 204, 255))
    save(ring(im, "villain"), "quill-unmasked.webp")

    # Lord Silas
    im, d = base("npc", (46, 24, 30))
    bust(d, (110, 30, 40), skin=(220, 196, 176), hr=80, collar=(230, 220, 200))
    d.pieslice([168, 120, 344, 230], 180, 360, fill=(236, 236, 236, 255))
    eyes(d, 228, 30, 7)
    d.line([226, 280, 286, 280], fill=(120, 80, 70, 255), width=4)
    d.ellipse([360, 250, 420, 300], fill=(30, 30, 34, 255))
    d.rectangle([384, 290, 396, 470], fill=(60, 40, 24, 255))
    save(ring(im, "npc"), "silas.webp")

    # Lady Morwenna (black swan mask)
    im, d = base("npc", (24, 22, 30))
    bust(d, (20, 18, 22), skin=(236, 206, 186), collar=(60, 50, 70))
    d.pieslice([156, 112, 356, 250], 180, 360, fill=(30, 24, 22, 255))
    d.polygon([(170, 220), (256, 200), (342, 220), (330, 250), (256, 238), (182, 250)], fill=(16, 16, 20, 255))
    for k in range(7):
        a = math.pi + k * math.pi / 6
        d.polygon([(256 + 90 * math.cos(a), 180 + 60 * math.sin(a)), (256 + 140 * math.cos(a), 150 + 100 * math.sin(a)),
                   (256 + 110 * math.cos(a + 0.2), 175 + 70 * math.sin(a + 0.2))], fill=(12, 12, 16, 255))
    eyes(d, 226, 40, 8, (200, 180, 120))
    d.arc([220, 270, 292, 300], 20, 160, fill=(140, 40, 50, 255), width=6)
    save(ring(im, "npc"), "morwenna.webp")

    # Edric (headless horseman, pumpkin head under arm)
    im, d = base("npc", (30, 24, 20))
    d.rounded_rectangle([96, 250, 416, 560], radius=120, fill=(18, 16, 18, 255))
    d.polygon([(150, 250), (256, 180), (362, 250)], fill=(18, 16, 18, 255))
    d.ellipse([300, 300, 430, 420], fill=(214, 110, 30, 255), outline=(120, 50, 14, 255), width=5)
    d.polygon([(330, 340), (350, 340), (340, 322)], fill=(255, 220, 110, 255))
    d.polygon([(380, 340), (400, 340), (390, 322)], fill=(255, 220, 110, 255))
    d.chord([330, 350, 400, 400], 20, 160, fill=(255, 220, 110, 255))
    d.ellipse([140, 170, 250, 230], fill=(140, 40, 40, 200))
    save(ring(im, "npc"), "edric.webp")

    # Pip (witch hat)
    im, d = base("npc", (38, 28, 50))
    bust(d, (70, 46, 100), skin=(236, 204, 178), hr=84, collar=(40, 26, 60))
    d.ellipse([110, 150, 402, 200], fill=(40, 26, 60, 255))
    d.polygon([(190, 170), (322, 170), (300, 30), (340, 60)], fill=(54, 36, 80, 255))
    d.rectangle([196, 150, 316, 172], fill=(196, 150, 60, 255))
    d.pieslice([172, 160, 340, 270], 180, 360, fill=(160, 70, 40, 255))
    eyes(d, 232, 32, 8)
    d.arc([226, 262, 286, 292], 20, 160, fill=(150, 60, 60, 255), width=5)
    save(ring(im, "npc"), "pip.webp")

    # Bramwell (straw hat, stubble)
    im, d = base("npc", (40, 36, 24))
    bust(d, (110, 96, 60), skin=(206, 168, 136), collar=(80, 60, 40))
    d.ellipse([120, 140, 392, 200], fill=(196, 168, 90, 255), outline=(120, 96, 40, 255), width=4)
    d.rounded_rectangle([186, 80, 326, 176], radius=30, fill=(196, 168, 90, 255), outline=(120, 96, 40, 255), width=4)
    eyes(d, 236, 34, 7)
    d.ellipse([200, 262, 312, 330], fill=(150, 140, 130, 120))
    d.line([226, 290, 286, 286], fill=(90, 60, 50, 255), width=5)
    save(ring(im, "npc"), "bramwell.webp")

    # Mrs. Crane (grey bun)
    im, d = base("npc", (30, 30, 34))
    bust(d, (24, 24, 28), skin=(226, 200, 182), hr=82, collar=(230, 226, 214))
    d.ellipse([206, 90, 306, 160], fill=(160, 160, 166, 255))
    d.pieslice([170, 130, 342, 250], 180, 360, fill=(170, 170, 176, 255))
    eyes(d, 232, 30, 6)
    d.line([230, 282, 282, 282], fill=(120, 80, 70, 255), width=5)
    for k in range(5):
        d.ellipse([120 + k * 12, 430 + k * 6, 140 + k * 12, 450 + k * 6], outline=(180, 160, 90, 255), width=4)
    save(ring(im, "npc"), "crane.webp")

    # Fennick (halfling solicitor)
    im, d = base("npc", (30, 34, 44))
    bust(d, (50, 60, 80), skin=(232, 196, 166), head=(256, 250), hr=96, collar=(230, 226, 214))
    d.pieslice([156, 130, 356, 260], 180, 360, fill=(120, 80, 40, 255))
    for s in (-1, 1):
        d.ellipse([256 + s * 40 - 28, 228, 256 + s * 40 + 28, 268], fill=(200, 220, 230, 160), outline=(60, 50, 30, 255), width=5)
    d.line([228, 248, 284, 248], fill=(60, 50, 30, 255), width=4)
    d.arc([226, 290, 286, 320], 200, 340, fill=(140, 70, 60, 255), width=5)
    d.rounded_rectangle([320, 400, 440, 480], radius=12, fill=(110, 70, 40, 255), outline=(50, 30, 14, 255), width=5)
    save(ring(im, "npc"), "fennick.webp")

    # The Lantern Widow
    im, d = base("spirit", (16, 26, 24))
    glow = Image.new("RGBA", (S, S), (0, 0, 0, 0))
    gd = ImageDraw.Draw(glow)
    gd.ellipse([300, 300, 460, 460], fill=(90, 255, 160, 160))
    glow = glow.filter(ImageFilter.GaussianBlur(30))
    im.alpha_composite(glow)
    d = ImageDraw.Draw(im)
    d.polygon([(256, 80), (360, 200), (400, 520), (112, 520), (152, 200)], fill=(214, 220, 222, 200))
    d.ellipse([196, 120, 316, 250], fill=(236, 240, 238, 230))
    d.polygon([(186, 130), (326, 130), (356, 330), (156, 330)], fill=(200, 210, 212, 150))
    d.rectangle([360, 340, 410, 410], fill=(70, 200, 120, 255), outline=(30, 40, 34, 255), width=5)
    d.line([385, 300, 385, 340], fill=(30, 40, 34, 255), width=5)
    save(ring(im, "spirit"), "lantern-widow.webp")

    # Pumpkin-headed scarecrow
    im, d = base("monster", (34, 26, 18))
    d.rounded_rectangle([110, 320, 402, 560], radius=60, fill=(140, 116, 70, 255))
    for k in range(9):
        d.line([120 + k * 34, 330, 110 + k * 36, 300], fill=(210, 180, 80, 255), width=6)
    d.ellipse([136, 90, 376, 320], fill=(214, 106, 30, 255), outline=(110, 46, 12, 255), width=6)
    for x in (196, 256, 316):
        d.arc([x - 70, 90, x + 70, 320], 0, 360, fill=(170, 80, 22, 255), width=4)
    d.rectangle([244, 64, 268, 100], fill=(80, 70, 30, 255))
    d.polygon([(186, 180), (236, 180), (211, 140)], fill=(255, 226, 120, 255))
    d.polygon([(276, 180), (326, 180), (301, 140)], fill=(255, 226, 120, 255))
    d.polygon([(176, 230), (336, 230), (316, 270), (286, 255), (256, 275), (226, 255), (196, 270)], fill=(255, 226, 120, 255))
    save(ring(im, "monster"), "pumpkin-scarecrow.webp")

    # Ravenmoor skeleton
    im, d = base("undead", (30, 30, 32))
    d.rounded_rectangle([120, 330, 392, 560], radius=80, fill=(70, 60, 60, 255))
    for k in range(4):
        d.line([176, 360 + k * 34, 336, 360 + k * 34], fill=(220, 214, 196, 255), width=10)
    d.ellipse([156, 90, 356, 300], fill=(226, 220, 204, 255))
    d.rounded_rectangle([200, 260, 312, 330], radius=16, fill=(226, 220, 204, 255))
    for s in (-1, 1):
        d.ellipse([256 + s * 44 - 30, 170, 256 + s * 44 + 30, 236], fill=(20, 18, 18, 255))
    d.polygon([(246, 250), (266, 250), (256, 230)], fill=(20, 18, 18, 255))
    for x in range(214, 300, 16):
        d.line([x, 284, x, 320], fill=(60, 54, 50, 255), width=4)
    save(ring(im, "undead"), "skeleton.webp")
    print("tokens done")


if __name__ == "__main__":
    main()
