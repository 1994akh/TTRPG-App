"""Render the Adventure cover card and the main scene thumbnail from the ground-floor map.

Uses the player map only (never a DM key, which shows the secret passage).

    python3 tools/build_cover.py

Writes assets/cover.webp (1200 x 700) and assets/maps/ravenmoor-thumb.webp (300 x 200).
"""
from pathlib import Path

from PIL import Image, ImageDraw, ImageEnhance, ImageFilter, ImageFont

ROOT = Path(__file__).resolve().parent.parent
GROUND = ROOT / "assets/maps/ravenmoor-ground.webp"
FONTS = ROOT / "assets/fonts"


def fit_crop(img, w, h, box):
    """Crop `box` from img and scale it to cover w x h."""
    crop = img.crop(box)
    scale = max(w / crop.width, h / crop.height)
    crop = crop.resize((round(crop.width * scale), round(crop.height * scale)), Image.LANCZOS)
    left = (crop.width - w) // 2
    top = (crop.height - h) // 2
    return crop.crop((left, top, left + w, top + h))


def cover():
    src = Image.open(GROUND).convert("RGB")
    # The manor and drive, from the stables to the pumpkin patch.
    art = fit_crop(src, 1200, 700, (0, 300, 4800, 3500))
    art = ImageEnhance.Brightness(art).enhance(0.55)
    art = ImageEnhance.Color(art).enhance(0.8)

    # Vignette and a dark band for the title.
    shade = Image.new("L", art.size, 0)
    d = ImageDraw.Draw(shade)
    d.rectangle((0, 430, 1200, 700), fill=200)
    shade = shade.filter(ImageFilter.GaussianBlur(60))
    art = Image.composite(Image.new("RGB", art.size, (14, 12, 10)), art, shade)

    draw = ImageDraw.Draw(art)
    title = ImageFont.truetype(str(FONTS / "IMFellEnglish-Regular.ttf"), 88)
    sub = ImageFont.truetype(str(FONTS / "IMFellEnglish-Italic.ttf"), 34)
    tag = ImageFont.truetype(str(FONTS / "EBGaramond-Variable.ttf"), 26)

    def centred(y, text, font, fill):
        w = draw.textlength(text, font=font)
        draw.text(((1200 - w) / 2 + 3, y + 3), text, font=font, fill=(0, 0, 0))
        draw.text(((1200 - w) / 2, y), text, font=font, fill=fill)

    centred(470, "Death at Ravenmoor Manor", title, (244, 236, 216))
    centred(575, "A Halloween murder mystery for 5–6 level 5 characters", sub, (120, 210, 160))
    centred(628, "Twelve candles · six suspects · one unmasking", tag, (214, 200, 176))
    out = ROOT / "assets/cover.webp"
    art.save(out, "WEBP", quality=88)
    print("wrote", out.relative_to(ROOT))


def thumb():
    src = Image.open(GROUND).convert("RGB")
    t = fit_crop(src, 300, 200, (900, 1100, 4900, 3500))
    out = ROOT / "assets/maps/ravenmoor-thumb.webp"
    t.save(out, "WEBP", quality=85)
    print("wrote", out.relative_to(ROOT))


if __name__ == "__main__":
    cover()
    thumb()
