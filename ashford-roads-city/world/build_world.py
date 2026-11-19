"""The known world of Wayfinder, as charted from Ashford Roads: a sea chart in the city map's gaslit style.

Usage (from ashford-roads-city/):
    python3 -X utf8 -I world/build_world.py           # world/out/known_world.svg and known_world_players.svg
    NODE_PATH=$(npm root -g) node world/render.mjs     # final/known_world.jpg and known_world_players.jpg

Only places the lore names are labelled. The layout was confirmed by the owner on 19 Nov 2026: the mainland west, the
Reach's islands east, Kelder's Wall beyond them, then the uncharted Sea of Possibility; Coldwater close to Ashford, to
the north-east; unnamed islands drawn without labels. Deterministic: fixed seeds.
"""
from __future__ import annotations

import base64
import math
import random
from pathlib import Path

HERE = Path(__file__).resolve().parent
OUT = HERE / "out"
FONTS = HERE.parents[1] / "ravenmoor-manor" / "assets" / "fonts"

W, H = 3600, 2400
PAPER, INK, SOOT, BRASS, VERD, AMBER, FIRE, BRUME = (
    "#E6DCC3", "#1E1B18", "#4A423A", "#B5893A", "#4E8C7D", "#F2A541", "#D9622B", "#9AA3A6")
LAND, LAND2, SEA, SEA2, DEEP = "#d9ccaa", "#cbbd98", "#9fb0b3", "#8c9fa4", "#6f8288"

ASHFORD = (780, 1290)
COLDWATER = (1250, 980)
WALL_X = 2620                      # Kelder's Wall, a standing brume bank running north to south
VILLAGE = (330, 1050)              # the village with no name, out on the mainland plains (no direction in the lore)


# ---- small helpers ---------------------------------------------------------------------------------------------
def noise1(seed: int):
    """Smooth 1-D value noise in [-1, 1] from a seed (several octaves)."""
    rng = random.Random(seed)
    tables = [[rng.uniform(-1, 1) for _ in range(512)] for _ in range(5)]

    def f(t: float) -> float:
        v, amp, tot = 0.0, 1.0, 0.0
        for o, tab in enumerate(tables):
            x = t * (2 ** o)
            i = int(math.floor(x)) % 511
            fr = x - math.floor(x)
            fr = fr * fr * (3 - 2 * fr)
            v += amp * (tab[i] * (1 - fr) + tab[i + 1] * fr)
            tot += amp
            amp *= 0.5
        return v / tot
    return f


def blob(cx: float, cy: float, r: float, seed: int, rough: float = 0.35, n: int = 120, stretch=(1.0, 1.0)):
    f = noise1(seed)
    pts = []
    for k in range(n):
        a = 2 * math.pi * k / n
        rr = r * (1 + rough * f(k / n * 6) + rough * 0.4 * f(k / n * 23 + 7))
        pts.append((cx + rr * math.cos(a) * stretch[0], cy + rr * math.sin(a) * stretch[1]))
    return pts


def P(pts):
    return " ".join(f"{x:.1f},{y:.1f}" for x, y in pts)


def cog(cx, cy, r, teeth=12, fill=BRASS, stroke=INK, sw=3.0, hole=0.42):
    d = []
    for i in range(teeth * 2):
        a0, a1 = math.pi * 2 * i / (teeth * 2), math.pi * 2 * (i + 1) / (teeth * 2)
        rr = r if i % 2 == 0 else r * 0.82
        for a in (a0 + 0.08, a1 - 0.08):
            d.append(f"{cx + rr * math.cos(a):.1f},{cy + rr * math.sin(a):.1f}")
    return (f'<polygon points="{" ".join(d)}" fill="{fill}" stroke="{stroke}" stroke-width="{sw}" stroke-linejoin="round"/>'
            f'<circle cx="{cx:.1f}" cy="{cy:.1f}" r="{r*hole:.1f}" fill="{PAPER}" stroke="{stroke}" stroke-width="{sw}"/>')


def font_face():
    out = []
    for file, style in [("IMFellEnglish-Regular.ttf", "normal"), ("IMFellEnglish-Italic.ttf", "italic")]:
        data = base64.b64encode((FONTS / file).read_bytes()).decode()
        out.append(f'@font-face{{font-family:"Fell";src:url(data:font/ttf;base64,{data});font-style:{style}}}')
    return "".join(out)


def text(x, y, s, size, cls="", rot=0, anchor="middle", extra=""):
    return (f'<text x="{x:.1f}" y="{y:.1f}" font-size="{size}" text-anchor="{anchor}" class="lab {cls}" '
            f'transform="rotate({rot} {x:.1f} {y:.1f})" {extra}>{s}</text>')


# ---- the chart ---------------------------------------------------------------------------------------------------
def mainland():
    """The mainland's coast: west of Ashford, a ragged line from the north edge to the south edge."""
    f, g = noise1(11), noise1(29)
    coast = []
    for k in range(0, 241):
        y = -60 + k * (H + 120) / 240
        x = 720 + 170 * f(k / 240 * 5) + 55 * g(k / 240 * 31)
        x += 60 * math.exp(-((y - ASHFORD[1]) / 90) ** 2)        # Ashford's headland: the port sits out on the coast
        x -= 90 * math.exp(-((y - (ASHFORD[1] + 170)) / 110) ** 2)  # and a bay to its south
        coast.append((x, y))
    return [(-60, -60)] + coast + [(-60, H + 60)]


def islands(land):
    """Unnamed islands of the Reach (home rocks, harbours): scattered between the coast and Kelder's Wall."""
    rng = random.Random(6631)
    placed, out = [], []
    tries = 0
    while len(placed) < 46 and tries < 5000:
        tries += 1
        x, y = rng.uniform(980, WALL_X - 180), rng.uniform(170, H - 170)
        r = rng.choice([14, 18, 22, 26, 32, 40, 52, 64]) * (1.0 if x < 2100 else 0.8)
        if math.dist((x, y), ASHFORD) < 260 or math.dist((x, y), COLDWATER) < 260 + r:
            continue
        if any(math.dist((x, y), (px, py)) < pr + r + 70 for px, py, pr in placed):
            continue
        placed.append((x, y, r))
        out.append(blob(x, y, r, 1000 + len(placed), rough=0.45, stretch=(rng.uniform(.7, 1.4), rng.uniform(.7, 1.2))))
    # a few small chains (the design doc's "harbour chains")
    for cx, cy, ang, n in [(1500, 1650, -.5, 5), (1900, 760, .35, 4), (2250, 1500, 1.2, 4)]:
        for i in range(n):
            x, y = cx + math.cos(ang) * i * 70, cy + math.sin(ang) * i * 70
            if any(math.dist((x, y), (px, py)) < pr + 40 for px, py, pr in placed):
                continue
            r = 12 + (i % 3) * 7
            placed.append((x, y, r))
            out.append(blob(x, y, r, 3000 + len(placed), rough=0.5))
    return out, placed


def build(labels: bool) -> str:
    el = []
    land = mainland()
    defs = f"""<style>{font_face()}
.lab{{font-family:"Fell",Georgia,serif;fill:{INK};paint-order:stroke;stroke:{PAPER};stroke-width:7px;stroke-linejoin:round}}
.sea{{font-style:italic;fill:#33434a;stroke:#b8c4c6;letter-spacing:.14em}}
.region{{letter-spacing:.3em;fill:#3a352e}}
.it{{font-style:italic}}
.fog{{font-style:italic;fill:#5b6569;stroke:#eef0ee;letter-spacing:.2em}}
</style>
<filter id="paper" x="0" y="0" width="100%" height="100%"><feTurbulence type="fractalNoise" baseFrequency=".85" numOctaves="3" seed="12"/>
 <feColorMatrix values="0 0 0 0 .35  0 0 0 0 .3  0 0 0 0 .22  0 0 0 .22 0"/><feComposite in2="SourceGraphic" operator="in"/></filter>
<filter id="b6" x="-100%" y="-100%" width="300%" height="300%"><feGaussianBlur stdDeviation="6"/></filter>
<filter id="b20" x="-100%" y="-100%" width="300%" height="300%"><feGaussianBlur stdDeviation="20"/></filter>
<filter id="b60" x="-100%" y="-100%" width="300%" height="300%"><feGaussianBlur stdDeviation="60"/></filter>
<linearGradient id="sea" x1="0" x2="1"><stop offset="0%" stop-color="{SEA}"/><stop offset="60%" stop-color="{SEA2}"/><stop offset="100%" stop-color="{DEEP}"/></linearGradient>
<radialGradient id="vig" cx="50%" cy="50%" r="75%"><stop offset="60%" stop-color="#000" stop-opacity="0"/><stop offset="100%" stop-color="#3a2a14" stop-opacity=".5"/></radialGradient>
<radialGradient id="glow"><stop offset="0%" stop-color="{FIRE}" stop-opacity=".9"/><stop offset="100%" stop-color="{FIRE}" stop-opacity="0"/></radialGradient>
<pattern id="grass" width="40" height="34" patternUnits="userSpaceOnUse"><rect width="40" height="34" fill="{LAND}"/>
 <path d="M8,22 l3,-8 M12,22 l0,-9 M16,22 l-3,-8 M28,10 l3,-7 M32,10 l0,-8 M36,10 l-3,-7" stroke="#8f8f62" stroke-width="1.6" fill="none"/></pattern>
<pattern id="ash" width="16" height="16" patternUnits="userSpaceOnUse" patternTransform="rotate(30)"><rect width="16" height="16" fill="#c9c2b1"/>
 <line x1="0" y1="0" x2="0" y2="16" stroke="#9e9684" stroke-width="2"/></pattern>
<pattern id="waves" width="90" height="46" patternUnits="userSpaceOnUse"><path d="M6,30 q10,-9 20,0 q10,9 20,0" fill="none" stroke="#dfe5e4" stroke-width="2" opacity=".55"/></pattern>
"""
    # sea, then the paper texture over everything
    el.append(f'<rect width="{W}" height="{H}" fill="url(#sea)"/>')
    el.append(f'<rect width="{W}" height="{H}" fill="url(#waves)"/>')
    # chart lines: rhumb lines from the compass and a faint grid
    for x in range(0, W, 300):
        el.append(f'<line x1="{x}" y1="0" x2="{x}" y2="{H}" stroke="#55666b" stroke-width="1" opacity=".25"/>')
    for y in range(0, H, 300):
        el.append(f'<line x1="0" y1="{y}" x2="{W}" y2="{y}" stroke="#55666b" stroke-width="1" opacity=".25"/>')
    rx, ry = 1750, 1300
    for a in range(0, 360, 15):
        el.append(f'<line x1="{rx}" y1="{ry}" x2="{rx+4200*math.cos(math.radians(a)):.0f}" y2="{ry+4200*math.sin(math.radians(a)):.0f}" stroke="#4d5e63" stroke-width="1.2" opacity=".22"/>')
    # the mainland
    el.append(f'<polygon points="{P(land)}" fill="{LAND}"/>')
    trng = random.Random(4)
    tufts = []
    for _ in range(1400):
        x, y = trng.uniform(40, 900), trng.uniform(40, H - 40)
        if x > min(cx_ for cx_, cy_ in land[1:-1] if abs(cy_ - y) < 12) - 30:
            continue
        h = trng.uniform(6, 12)
        tufts.append(f'<path d="M{x-4:.0f},{y:.0f} l2,{-h:.0f} M{x:.0f},{y:.0f} l0,{-h-2:.0f} M{x+4:.0f},{y:.0f} l-2,{-h:.0f}" stroke="#8a8a5c" stroke-width="1.5" fill="none" opacity="{trng.uniform(.35,.8):.2f}"/>')
    el.append("".join(tufts))
    el.append(f'<polygon points="{P(land)}" fill="#a89a6e" opacity=".18" filter="url(#b60)" transform="translate(-160,0)"/>')
    for k, op in [(14, .5), (30, .28), (50, .15)]:          # shore ripples
        el.append(f'<polygon points="{P([(x + k, y) for x, y in land[1:-1]])}" fill="none" stroke="#e8ecea" stroke-width="2" opacity="{op}"/>')
    el.append(f'<polygon points="{P(land)}" fill="none" stroke="{INK}" stroke-width="4" stroke-linejoin="round"/>')
    # the ash fields around Ashford, and the Coast Road from the plains
    defs_land = f'<clipPath id="landclip"><polygon points="{P(land)}"/></clipPath>'
    el.append(f'<g clip-path="url(#landclip)"><polygon points="{P(blob(ASHFORD[0]-130, ASHFORD[1]+10, 130, 77, rough=.3, stretch=(1.2,.9)))}" fill="url(#ash)" opacity=".95"/></g>')
    road = [VILLAGE, (420, 1120), (520, 1180), (610, 1240), (690, 1280), ASHFORD]
    el.append(f'<polyline points="{P(road)}" fill="none" stroke="#6f6354" stroke-width="9" stroke-linecap="round" stroke-linejoin="round"/>')
    el.append(f'<polyline points="{P(road)}" fill="none" stroke="#ece1c6" stroke-width="5" stroke-linecap="round" stroke-linejoin="round" stroke-dasharray="14 8"/>')
    # the village with no name: hovels round one fire
    vx, vy = VILLAGE
    for i in range(7):
        a = i / 7 * 2 * math.pi
        el.append(f'<rect x="{vx+26*math.cos(a)-7:.1f}" y="{vy+26*math.sin(a)-6:.1f}" width="14" height="12" fill="#7a7468" stroke="{INK}" stroke-width="1.6"/>')
    el.append(f'<circle cx="{vx}" cy="{vy}" r="7" fill="{FIRE}" stroke="{INK}" stroke-width="1.6"/><circle cx="{vx}" cy="{vy}" r="22" fill="url(#glow)" opacity=".7"/>')
    # islands of the Reach (unnamed)
    isl, placed = islands(land)
    for poly in isl:
        el.append(f'<polygon points="{P([(x + 10, y) for x, y in poly])}" fill="none" stroke="#e8ecea" stroke-width="2" opacity=".45"/>')
        el.append(f'<polygon points="{P(poly)}" fill="{LAND2}" stroke="{INK}" stroke-width="2.4" stroke-linejoin="round"/>')
    # Coldwater: windward, rocky (hatched cliffs on its seaward, north-east side)
    cw = blob(COLDWATER[0], COLDWATER[1], 95, 4242, rough=.38, stretch=(1.25, .85))
    el.append(f'<polygon points="{P([(x + 12, y) for x, y in cw])}" fill="none" stroke="#e8ecea" stroke-width="2.4" opacity=".5"/>')
    el.append(f'<polygon points="{P(cw)}" fill="#c7bfae" stroke="{INK}" stroke-width="3.4" stroke-linejoin="round"/>')
    for k in range(0, len(cw), 3):
        x, y = cw[k]
        if x > COLDWATER[0] - 20 and y < COLDWATER[1] + 20:
            dx, dy = (x - COLDWATER[0]), (y - COLDWATER[1])
            n = math.hypot(dx, dy) or 1
            el.append(f'<line x1="{x:.1f}" y1="{y:.1f}" x2="{x-dx/n*16:.1f}" y2="{y-dy/n*16:.1f}" stroke="{INK}" stroke-width="2"/>')
    for (x, y) in [(COLDWATER[0] - 40, COLDWATER[1] + 10), (COLDWATER[0] + 10, COLDWATER[1] - 8), (COLDWATER[0] + 40, COLDWATER[1] + 14)]:
        el.append(f'<path d="M{x-12},{y+8} L{x},{y-10} L{x+12},{y+8}Z" fill="#8f8775" stroke="{INK}" stroke-width="1.6"/>')
    el.append(f'<circle cx="{COLDWATER[0]-70}" cy="{COLDWATER[1]+38}" r="9" fill="{SOOT}" stroke="{INK}" stroke-width="2"/>')   # its harbour town
    # Ashford Roads: the home port, walls, refinery stacks and smoke
    ax, ay = ASHFORD
    el.append(f'<circle cx="{ax}" cy="{ay}" r="34" fill="{SOOT}" stroke="{INK}" stroke-width="4"/>')
    el.append(f'<circle cx="{ax}" cy="{ay}" r="24" fill="none" stroke="{BRASS}" stroke-width="3"/>')
    for i, (dx, dy) in enumerate([(6, -40), (18, -34), (30, -44)]):
        el.append(f'<circle cx="{ax+dx}" cy="{ay+dy}" r="18" fill="url(#glow)"/><rect x="{ax+dx-4}" y="{ay+dy-14}" width="8" height="22" fill="#2a2420" stroke="{INK}" stroke-width="1.5"/>')
        for j in range(5):
            el.append(f'<ellipse cx="{ax+dx+20+j*34}" cy="{ay+dy-20-j*8}" rx="{14+j*7}" ry="{9+j*4}" fill="#4e4943" opacity="{.4-j*.07:.2f}" filter="url(#b6)"/>')
    el.append(f'<line x1="{ax+30}" y1="{ay+4}" x2="{ax+110}" y2="{ay+10}" stroke="#5a4630" stroke-width="8"/>')          # the Long Quay
    # shipping lanes: dashed courses from Ashford to Coldwater and out through the islands (charted water)
    for path in [[(ax + 110, ay + 10), (950, 1180), (1120, 1060), (COLDWATER[0] - 110, COLDWATER[1] + 40)],
                 [(ax + 110, ay + 10), (1100, 1340), (1500, 1380), (1900, 1300), (2300, 1240), (WALL_X - 120, 1200)],
                 [(ax + 110, ay + 10), (1050, 1500), (1400, 1800), (1800, 1950)]]:
        el.append(f'<polyline points="{P(path)}" fill="none" stroke="#2f3c41" stroke-width="2.6" stroke-dasharray="12 10" opacity=".55"/>')
    # grade marks: the Reach is F water; the marks stop at the Wall
    for (x, y) in [(1000, 760), (1450, 1150), (1750, 600), (1650, 2000), (2150, 1050), (2350, 1800), (1150, 1900)]:
        el.append(f'<circle cx="{x}" cy="{y}" r="22" fill="{PAPER}" stroke="{INK}" stroke-width="2.4" opacity=".9"/>'
                  + (text(x, y + 10, "F", 30, "", 0, "middle", 'style="stroke-width:0"') if labels else ""))
    # limit of the charts: a dotted line just inside the Wall, "Compact waters" behind it
    lim = noise1(5)
    limit = [(WALL_X - 140 + 40 * lim(k / 60 * 4), -40 + k * (H + 80) / 60) for k in range(61)]
    el.append(f'<polyline points="{P(limit)}" fill="none" stroke="{INK}" stroke-width="3" stroke-dasharray="3 9" stroke-linecap="round" opacity=".7"/>')
    # Kelder's Wall: a standing bank of brume, and the Sea of Possibility beyond it in fog
    wall = noise1(81)
    rng = random.Random(81)
    el.append(f'<rect x="{WALL_X}" y="0" width="{W-WALL_X}" height="{H}" fill="#7b8a8f" opacity=".35"/>')
    for k in range(0, 90):
        y = -60 + k * (H + 120) / 90
        x = WALL_X + 70 * wall(k / 90 * 5)
        r = rng.uniform(70, 150)
        el.append(f'<circle cx="{x:.0f}" cy="{y:.0f}" r="{r:.0f}" fill="#eef0ee" opacity=".55" filter="url(#b20)"/>')
        el.append(f'<circle cx="{x+60:.0f}" cy="{y:.0f}" r="{r*.8:.0f}" fill="#f6f7f5" opacity=".5" filter="url(#b6)"/>')
    for k in range(0, 40):                                                          # billow outlines: the wall drawn as cloud
        y = -40 + k * (H + 80) / 40
        x = WALL_X - 50 + 70 * wall(k / 40 * 5)
        el.append(f'<path d="M{x:.0f},{y:.0f} a40,36 0 0 1 0,{H/40+10:.0f}" fill="none" stroke="#6d7a7e" stroke-width="2.2" opacity=".7"/>')
    for i in range(26):                                                             # brume over the uncharted sea
        x, y = rng.uniform(WALL_X + 150, W + 100), rng.uniform(-100, H + 100)
        el.append(f'<ellipse cx="{x:.0f}" cy="{y:.0f}" rx="{rng.uniform(180,420):.0f}" ry="{rng.uniform(90,220):.0f}" fill="#eef0ee" opacity="{rng.uniform(.35,.6):.2f}" filter="url(#b60)"/>')
    # a little brume on the Reach's far edge and between the islands
    for i in range(10):
        x, y = rng.uniform(1700, WALL_X), rng.uniform(0, H)
        el.append(f'<ellipse cx="{x:.0f}" cy="{y:.0f}" rx="{rng.uniform(120,240):.0f}" ry="{rng.uniform(50,110):.0f}" fill="#eef0ee" opacity=".25" filter="url(#b60)"/>')
    # paper over all, vignette
    el.append(f'<rect width="{W}" height="{H}" fill="{PAPER}" opacity=".18"/>')
    el.append(f'<rect width="{W}" height="{H}" fill="{PAPER}" filter="url(#paper)"/>')
    el.append(f'<rect width="{W}" height="{H}" fill="url(#vig)"/>')
    # frame: riveted brass with cogs
    m = 34
    el.append(f'<rect x="{m}" y="{m}" width="{W-2*m}" height="{H-2*m}" fill="none" stroke="{INK}" stroke-width="6"/>'
              f'<rect x="{m+7}" y="{m+7}" width="{W-2*m-14}" height="{H-2*m-14}" fill="none" stroke="{BRASS}" stroke-width="10" opacity=".6"/>'
              f'<rect x="{m+16}" y="{m+16}" width="{W-2*m-32}" height="{H-2*m-32}" fill="none" stroke="{BRASS}" stroke-width="3"/>')
    for k in range(m + 60, max(W, H) - m - 40, 80):
        for (x, y) in [(k, m + 7), (k, H - m - 7), (m + 7, k), (W - m - 7, k)]:
            if x <= W - m and y <= H - m:
                el.append(f'<circle cx="{x}" cy="{y}" r="3.2" fill="#e0c27a" stroke="{INK}" stroke-width="1.2"/>')
    for (x, y) in [(m + 7, m + 7), (W - m - 7, m + 7), (m + 7, H - m - 7), (W - m - 7, H - m - 7)]:
        el.append(cog(x, y, 48, 12))
    # compass rose with cogs, in the Reach
    cx, cy, r = 2020, 2040, 140
    el.append(cog(cx + r, cy + r, 62, 14) + cog(cx, cy, r * 1.22, 26, fill="#c9a45a", hole=0.9))
    rose = [f'<g transform="translate({cx},{cy})">', f'<circle r="{r*1.05}" fill="{PAPER}" opacity=".9"/>',
            f'<circle r="{r}" fill="none" stroke="{INK}" stroke-width="3"/>', f'<circle r="{r*.82}" fill="none" stroke="{BRASS}" stroke-width="2"/>']
    for a in range(0, 360, 45):
        L = r * (1 if a % 90 == 0 else .62)
        ca, sa = math.cos(math.radians(a - 90)), math.sin(math.radians(a - 90))
        cl, sl = math.cos(math.radians(a)), math.sin(math.radians(a))
        w = 17 if a % 90 == 0 else 11
        rose.append(f'<path d="M{ca*L:.1f},{sa*L:.1f} L{cl*w:.1f},{sl*w:.1f} L0,0Z" fill="{INK}"/><path d="M{ca*L:.1f},{sa*L:.1f} L{-cl*w:.1f},{-sl*w:.1f} L0,0Z" fill="{BRASS}"/>')
    rose.append((text(0, -r - 16, "N", 48, "", 0, "middle", 'style="stroke-width:0"') if labels else "") + "</g>")
    el.append("".join(rose))
    # one sky ship over the Reach (rare and new, so one)
    sx, sy = 1600, 760
    el.append(f'<ellipse cx="{sx+40}" cy="{sy+70}" rx="80" ry="24" fill="{INK}" opacity=".15" filter="url(#b6)" transform="rotate(-12 {sx+40} {sy+70})"/>'
              f'<g transform="rotate(-12 {sx} {sy})"><ellipse cx="{sx}" cy="{sy}" rx="80" ry="25" fill="#d8cfb7" stroke="{INK}" stroke-width="2.4"/>'
              + "".join(f'<line x1="{sx+dx}" y1="{sy-23*math.sqrt(max(0,1-(dx/80)**2)):.1f}" x2="{sx+dx}" y2="{sy+23*math.sqrt(max(0,1-(dx/80)**2)):.1f}" stroke="{BRASS}" stroke-width="2"/>' for dx in range(-60, 70, 20))
              + f'<rect x="{sx-28}" y="{sy-7}" width="56" height="14" rx="6" fill="#6b4c2e" stroke="{INK}" stroke-width="1.4" opacity=".85"/>'
              f'<circle cx="{sx+88}" cy="{sy}" r="8" fill="{AMBER}" stroke="{INK}" stroke-width="1.4"/></g>')
    # cartouche
    tx, ty, tw, th = 1080, 90, 1150, 250
    el.append(f'<rect x="{tx}" y="{ty}" width="{tw}" height="{th}" fill="{PAPER}" stroke="{INK}" stroke-width="5"/>'
              f'<rect x="{tx+14}" y="{ty+14}" width="{tw-28}" height="{th-28}" fill="none" stroke="{BRASS}" stroke-width="3"/>'
              + cog(tx + tw, ty + th, 54, 12) + cog(tx + tw + 80, ty + th - 40, 32, 10, sw=2.4))
    if labels:
        el.append(text(tx + tw / 2, ty + 120, "The Known World", 104, "", 0, "middle", 'style="stroke-width:0"'))
        el.append(text(tx + tw / 2, ty + 185, "as charted from Ashford Roads", 40, "it", 0, "middle", 'style="stroke-width:0"'))
        L = [  # every label is a place the lore names
            ("The Mainland", 330, 600, 64, "region", 0),
            ("the plains", 300, 1500, 40, "it", 0),
            ("the village with no name", VILLAGE[0] - 10, VILLAGE[1] - 46, 32, "it", 0),
            ("The Coast Road", 585, 1245, 30, "it", 28),
            ("Ashford Roads", ASHFORD[0] + 16, ASHFORD[1] + 92, 50, "", 0),
            ("home port · grade F", ASHFORD[0] + 16, ASHFORD[1] + 132, 28, "it", 0),
            ("Coldwater", COLDWATER[0] + 20, COLDWATER[1] - 120, 48, "", 0),
            ("The Reach", 1720, 1660, 96, "sea", 0),
            ("Compact waters", 1720, 1735, 34, "sea", 0),
            ("limit of the charts", WALL_X - 190, 1960, 28, "it", -90),
            ("Kelder's Wall", WALL_X + 30, 1180, 70, "fog", -90),
            ("The Sea of Possibility", 3150, 900, 64, "fog", 0),
            ("uncharted", 3150, 980, 40, "fog", 0),
        ]
        for s, x, y, size, cls, rot in L:
            el.append(text(x, y, s, size, cls, rot))
        el.append(text(W - 80, H - 66, "Only places named in the lore are labelled. Islands of the Reach unnamed.", 20, "it", 0, "end", 'style="stroke-width:3px"'))
    return f'<svg xmlns="http://www.w3.org/2000/svg" width="{W}" height="{H}" viewBox="0 0 {W} {H}"><defs>{defs}{defs_land}</defs>{"".join(el)}</svg>'


def main() -> None:
    OUT.mkdir(exist_ok=True)
    for name, lab in [("known_world", True), ("known_world_players", False)]:
        (OUT / f"{name}.svg").write_text(build(lab), encoding="utf-8")
        print(f"wrote world/out/{name}.svg")


if __name__ == "__main__":
    main()
