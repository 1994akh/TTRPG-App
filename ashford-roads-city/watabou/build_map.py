"""Ashford Roads city map: Watabou's street plan, drawn in the gaslit style with the lore's places and names.

Usage (from ashford-roads-city/):
    python3 -X utf8 -I watabou/build_map.py            # writes watabou/out/ashford_roads.svg and ashford_roads_players.svg
    node watabou/render.mjs                             # rasterises both to final/ (JPG and PNG, 3000 px)

Input: watabou/mfcg-6631.json, the GeoJSON export of the Medieval Fantasy City Generator by watabou
(https://watabou.github.io/city-generator/?size=48&seed=6631&citadel=0&urban_castle=0&plaza=1&temple=1&walls=1
&shantytown=1&coast=1&river=0&greens=0&gates=-1&sea=0). Coordinates are Watabou's (y north, 1 unit about 1 m).

Every label and placed feature comes from the owner's lore (possibilities-act1/data/lore/places.json and the
answered Ashford Roads Decisions): see LORE below. Watabou's own district names are not used.
"""
from __future__ import annotations

import base64
import json
import math
from pathlib import Path

HERE = Path(__file__).resolve().parent
OUT = HERE / "out"
FONTS = HERE.parents[1] / "ravenmoor-manor" / "assets" / "fonts"

# View: Watabou units. y is flipped for the picture.
X0, X1, Y0, Y1 = -1400.0, 1400.0, -1300.0, 1300.0
PX = 3000
K = PX / (X1 - X0)

PAPER, INK, SOOT, BRASS, VERD, AMBER, FIRE, BRUME, RUST = (
    "#E6DCC3", "#1E1B18", "#4A423A", "#B5893A", "#4E8C7D", "#F2A541", "#D9622B", "#9AA3A6", "#8C2A1C")

# Where the lore's places go on this plan (Watabou coordinates). Canon gives no compass directions; these follow
# the canon's relations: the refinery burns brume from the sea (so it has a pier), Refinery Row runs from it and is
# fog-free, the Undercourses lie under the Row and drain into the harbour, the Exchange is "near the port", the
# Lantern and Lee is "on the quay", the Coast Road comes in from the mainland through the ash fields.
LORE = {
    "refinery": [(400, 640), (640, 600), (790, 760), (830, 1010), (420, 1040)],   # the compound wall, on the north shore
    "refinery_pier": [(800, 800), (1010, 790)],
    "refinery_gate": (405, 760),
    "long_quay": [(176, 10), (760, 40)],          # from the harbour wall out into the bay
    "mast": (790, 42),
    "exchange": (128, -2),                        # the building nearest this is Sallow's Exchange
    "binding_house": (38, -58),                   # the largest building by the square
    "bench": (125, -226),
    "chapel": (-102, -210),
    "inn": (262, 24),                             # drawn on the quay
    "fish_market": (430, -585),
    "outfalls": [(297, 305), (313, 334), (330, 362)],
}

LABELS = [  # (text, x, y, size, rotation, style)
    ("The Refinery", 610, 1105, 46, 0, "place"),
    ("Refinery Row", 120, 470, 34, -52, "street"),
    ("The Long Quay", 470, 78, 34, 3, "place"),
    ("Sallow's Exchange", 60, 45, 24, 0, "small"),
    ("The Lantern and Lee", 262, -62, 22, 0, "small"),
    ("The Binding House", 38, -112, 24, 0, "small"),
    ("The Bench Office", 175, -275, 24, 0, "small"),
    ("Wright Chapel", -110, -262, 24, 0, "small"),
    ("City Gate", -650, 420, 26, 0, "small"),
    ("The Coast Road", -1060, 560, 34, 22, "street"),
    ("The Ash Fields", -1030, -330, 52, 0, "region"),
    ("Fish Market", 395, -520, 24, 0, "small"),
    ("Beastkin Quarter", 290, -760, 30, -30, "place"),
    ("Undercourses outfalls", 450, 330, 20, 0, "small"),
    ("The Harbour", 470, -170, 40, 0, "water"),
    ("The Reach", 1080, -420, 64, 0, "water"),
    ("into the brume", 1180, -560, 28, 0, "water"),
]



def cog(cx, cy, r, teeth=12, fill="#B5893A", stroke="#1E1B18", sw=3.0, hole=0.42):
    """A gear wheel in screen px."""
    d = []
    for i in range(teeth * 2):
        a0 = math.pi * 2 * i / (teeth * 2)
        a1 = math.pi * 2 * (i + 1) / (teeth * 2)
        rr = r if i % 2 == 0 else r * 0.82
        for a in (a0 + 0.08, a1 - 0.08):
            d.append(f"{cx + rr * math.cos(a):.1f},{cy + rr * math.sin(a):.1f}")
    return (f'<polygon points="{" ".join(d)}" fill="{fill}" stroke="{stroke}" stroke-width="{sw}" stroke-linejoin="round"/>'
            f'<circle cx="{cx:.1f}" cy="{cy:.1f}" r="{r*hole:.1f}" fill="#E6DCC3" stroke="{stroke}" stroke-width="{sw}"/>')


def T(p):
    return ((p[0] - X0) * K, (Y1 - p[1]) * K)


def pts(ring):
    return " ".join(f"{x:.1f},{y:.1f}" for x, y in (T(p) for p in ring))


def poly(ring, **attrs):
    a = " ".join(f'{k.replace("_", "-")}="{v}"' for k, v in attrs.items())
    return f'<polygon points="{pts(ring)}" {a}/>'


def line(coords, **attrs):
    a = " ".join(f'{k.replace("_", "-")}="{v}"' for k, v in attrs.items())
    return f'<polyline points="{pts(coords)}" fill="none" {a}/>'


def centre(ring):
    return (sum(p[0] for p in ring) / len(ring), sum(p[1] for p in ring) / len(ring))


def inside(p, ring):
    x, y, c = p[0], p[1], False
    for i in range(len(ring)):
        (x1, y1), (x2, y2) = ring[i], ring[i - 1]
        if (y1 > y) != (y2 > y) and x < (x2 - x1) * (y - y1) / (y2 - y1) + x1:
            c = not c
    return c


def font_face():
    out = []
    for fam, file, style in [("Fell", "IMFellEnglish-Regular.ttf", "normal"), ("Fell", "IMFellEnglish-Italic.ttf", "italic")]:
        data = base64.b64encode((FONTS / file).read_bytes()).decode()
        out.append(f'@font-face{{font-family:"{fam}";src:url(data:font/ttf;base64,{data});font-style:{style}}}')
    return "".join(out)


def hashf(i: int) -> float:
    return ((i * 2654435761) % 1000) / 1000


def build(data: dict, labels: bool) -> str:
    F = {f["id"]: f for f in data["features"]}
    s = K  # one Watabou unit in px
    el: list[str] = []
    defs = f"""
<style>{font_face()}
.lab{{font-family:"Fell",Georgia,serif;fill:{INK};paint-order:stroke;stroke:{PAPER};stroke-width:{6*s:.1f}px;stroke-linejoin:round}}
.water{{font-style:italic;fill:#3d4a4f;stroke:#b7c2c4;letter-spacing:.12em}}
.region{{letter-spacing:.25em;fill:#3a352e}}
.street{{font-style:italic}}
.place{{letter-spacing:.06em}}
.small{{}}
</style>
<filter id="paper" x="0" y="0" width="100%" height="100%"><feTurbulence type="fractalNoise" baseFrequency=".9" numOctaves="3" seed="6631"/>
 <feColorMatrix values="0 0 0 0 .35  0 0 0 0 .3  0 0 0 0 .22  0 0 0 .22 0"/><feComposite in2="SourceGraphic" operator="in"/></filter>
<filter id="blur8" x="-100%" y="-100%" width="300%" height="300%"><feGaussianBlur stdDeviation="{8*s:.1f}"/></filter>
<filter id="blur24" x="-100%" y="-100%" width="300%" height="300%"><feGaussianBlur stdDeviation="{24*s:.1f}"/></filter>
<filter id="blur60" x="-100%" y="-100%" width="300%" height="300%"><feGaussianBlur stdDeviation="{60*s:.1f}"/></filter>
<radialGradient id="vignette" cx="50%" cy="50%" r="72%"><stop offset="60%" stop-color="#000" stop-opacity="0"/><stop offset="100%" stop-color="#3a2a14" stop-opacity=".45"/></radialGradient>
<radialGradient id="glow"><stop offset="0%" stop-color="{FIRE}" stop-opacity=".9"/><stop offset="100%" stop-color="{FIRE}" stop-opacity="0"/></radialGradient>
<radialGradient id="lamp"><stop offset="0%" stop-color="{AMBER}" stop-opacity="1"/><stop offset="100%" stop-color="{AMBER}" stop-opacity="0"/></radialGradient>
<linearGradient id="sea" x1="0" x2="1" y1="0" y2="0"><stop offset="0%" stop-color="#7f9298"/><stop offset="70%" stop-color="#93a3a7"/><stop offset="100%" stop-color="#c4c9c6"/></linearGradient>
<pattern id="brick" width="{18*s:.1f}" height="{9*s:.1f}" patternUnits="userSpaceOnUse"><rect width="100%" height="100%" fill="#5a3b2c"/><path d="M0,{4.5*s:.1f} H{18*s:.1f} M{9*s:.1f},0 V{4.5*s:.1f} M0,{4.5*s:.1f} V{9*s:.1f}" stroke="#2a1d16" stroke-width="{1*s:.1f}"/></pattern>
<pattern id="ash" width="{14*s:.1f}" height="{14*s:.1f}" patternUnits="userSpaceOnUse" patternTransform="rotate(28)">
 <rect width="100%" height="100%" fill="#c9c2b1"/><line x1="0" y1="0" x2="0" y2="{14*s:.1f}" stroke="#a39b89" stroke-width="{1.6*s:.1f}"/></pattern>
"""
    # paper
    el.append(f'<rect width="{PX}" height="{PX}" fill="{PAPER}"/>')
    el.append(f'<rect width="{PX}" height="{PX}" fill="{PAPER}" filter="url(#paper)"/>')
    # ash land west and south-west: everything west of the walls is ash-grey under the fields
    el.append(poly([(X0, Y0), (-420, Y0), (-560, -500), (-700, -150), (-720, 300), (-700, 700), (-900, Y1), (X0, Y1)],
                   fill="#cfc8b6", opacity=".55", filter="url(#blur24)"))
    for f in F["fields"]["coordinates"]:
        el.append(poly(f[0], fill="url(#ash)", stroke="#8f8775", stroke_width=f"{1.2*s:.1f}", opacity=".9"))
    # sea
    for p in F["water"]["coordinates"]:
        el.append(poly(p[0], fill="url(#sea)"))
        el.append(poly(p[0], fill="none", stroke=INK, stroke_width=f"{3*s:.1f}"))
        for k, op in [(10, .35), (22, .2), (36, .12)]:     # ripple lines inside the shore
            el.append(poly(p[0], fill="none", stroke="#e9ecea", stroke_width=f"{1.4*s:.1f}", opacity=op,
                           transform=f"translate({k*s*0.7:.1f},0)"))
    # roads (outside)
    R = F["roads"]["geometries"]
    for r in R:
        el.append(line(r["coordinates"], stroke="#6f6354", stroke_width=f"{12*s:.1f}", stroke_linecap="round"))
        el.append(line(r["coordinates"], stroke="#ddd1b6", stroke_width=f"{8*s:.1f}", stroke_linecap="round"))
    # buildings, except where the refinery stands
    ref = LORE["refinery"]
    bi = 0
    for b in F["buildings"]["coordinates"]:
        ring = b[0]
        c = centre(ring)
        if inside(c, ref):
            continue
        bi += 1
        h = hashf(bi)
        fill = VERD if h < .1 else ("#5a5047" if h < .45 else SOOT)
        el.append(poly(ring, fill=fill, stroke=INK, stroke_width=f"{1.1*s:.1f}"))
    # the square
    for q in F["squares"]["coordinates"]:
        el.append(poly(q[0], fill="#ddd1b6", stroke="#8f8775", stroke_width=f"{1*s:.1f}"))
    # Refinery Row: Watabou's road from the square to the north gate, then on to the refinery gate (lit, fog-free)
    row = [p for p in R[3]["coordinates"] if p[1] <= 760] + [(330, 760), LORE["refinery_gate"]]
    el.append(line(row, stroke="#6f6354", stroke_width=f"{20*s:.1f}", stroke_linecap="round"))
    el.append(line(row, stroke="#e4d6b5", stroke_width=f"{15*s:.1f}", stroke_linecap="round"))
    # walls and towers
    W = F["walls"]["geometries"][0]["coordinates"][0]
    el.append(poly(W, fill="none", stroke=INK, stroke_width=f"{10*s:.1f}", stroke_linejoin="round"))
    el.append(poly(W, fill="none", stroke="#5b544b", stroke_width=f"{4*s:.1f}", stroke_linejoin="round"))
    for p in W[::2]:
        x, y = T(p)
        el.append(f'<circle cx="{x:.1f}" cy="{y:.1f}" r="{8*s:.1f}" fill="#3a342e" stroke="{INK}" stroke-width="{2*s:.1f}"/>')
    # the west gate (Coast Road)
    gx, gy = T((-578, 350))
    el.append(f'<rect x="{gx-16*s:.1f}" y="{gy-16*s:.1f}" width="{32*s:.1f}" height="{32*s:.1f}" fill="#3a342e" stroke="{INK}" stroke-width="{3*s:.1f}" transform="rotate(-40 {gx:.1f} {gy:.1f})"/>')
    # small Watabou jetties
    for pl in F["planks"]["geometries"]:
        el.append(line(pl["coordinates"], stroke="#7a5c3c", stroke_width=f"{6*s:.1f}"))
    # ---- the refinery ------------------------------------------------------------------------------------------
    el.append(poly(ref, fill="#4a3a30", stroke=INK, stroke_width=f"{9*s:.1f}", stroke_linejoin="round"))
    el.append(poly(ref, fill="url(#brick)", opacity=".55"))
    pier = LORE["refinery_pier"]
    el.append(line(pier, stroke="#5a4630", stroke_width=f"{18*s:.1f}"))
    el.append(line([(520, 720), (600, 760), (700, 790), (805, 800), (1000, 790)], stroke=BRASS, stroke_width=f"{5*s:.1f}"))
    el.append(line([(500, 900), (650, 880), (760, 830), (800, 805)], stroke=BRASS, stroke_width=f"{5*s:.1f}"))
    for (x, y, w, h) in [(450, 690, 90, 60), (560, 820, 120, 70), (460, 940, 110, 60), (690, 900, 70, 80)]:
        el.append(poly([(x, y), (x + w, y), (x + w, y + h), (x, y + h)], fill="#544a40", stroke=INK, stroke_width=f"{2*s:.1f}"))
    for (x, y, r) in [(620, 700, 46), (700, 980, 40), (520, 840, 36), (760, 700, 30)]:           # domed brume tanks
        cx, cy = T((x, y))
        el.append(f'<circle cx="{cx:.1f}" cy="{cy:.1f}" r="{r*s:.1f}" fill="{BRUME}" stroke="{BRASS}" stroke-width="{5*s:.1f}"/>')
        el.append(f'<circle cx="{cx-r*s*.3:.1f}" cy="{cy-r*s*.3:.1f}" r="{r*s*.35:.1f}" fill="#d9dedc" opacity=".7"/>')
    stacks = [(470, 790), (505, 765), (540, 800), (640, 860), (672, 838), (705, 870), (600, 965), (760, 960)]
    for (x, y) in stacks:
        cx, cy = T((x, y))
        el.append(f'<circle cx="{cx:.1f}" cy="{cy:.1f}" r="{34*s:.1f}" fill="url(#glow)"/>')
        el.append(f'<circle cx="{cx:.1f}" cy="{cy:.1f}" r="{11*s:.1f}" fill="#2a2420" stroke="{INK}" stroke-width="{2*s:.1f}"/>')
        el.append(f'<circle cx="{cx:.1f}" cy="{cy:.1f}" r="{5*s:.1f}" fill="{FIRE}"/>')
    for i, (x, y) in enumerate(stacks):                                          # smoke drifting east
        for j in range(6):
            px, py = T((x + 50 + j * 85, y + 20 + j * 22 + (i % 2) * 14))
            el.append(f'<ellipse cx="{px:.1f}" cy="{py:.1f}" rx="{(34+j*16)*s:.1f}" ry="{(20+j*9)*s:.1f}" fill="#4e4943" opacity="{.34-j*.05:.2f}" filter="url(#blur8)"/>')
    # ---- the Long Quay, its ships, the mast and the sky ship ---------------------------------------------------
    q0, q1 = LORE["long_quay"]
    el.append(line([q0, q1], stroke="#4b3a28", stroke_width=f"{34*s:.1f}"))
    el.append(line([q0, q1], stroke="#8a6a45", stroke_width=f"{28*s:.1f}"))
    ang = math.atan2(q1[1] - q0[1], q1[0] - q0[0])
    for i in range(1, 60):                                                       # planking
        t = i / 60
        mx, my = q0[0] + (q1[0] - q0[0]) * t, q0[1] + (q1[1] - q0[1]) * t
        dx, dy = -math.sin(ang) * 14, math.cos(ang) * 14
        el.append(line([(mx - dx, my - dy), (mx + dx, my + dy)], stroke="#6b5236", stroke_width=f"{1*s:.1f}"))

    def ship(x, y, length, rot, masts=3):
        cx, cy = T((x, y))
        L, Wd = length * s, length * s * .24
        hull = f"M{-L/2:.1f},0 Q{-L/2:.1f},{-Wd/2:.1f} {-L/4:.1f},{-Wd/2:.1f} L{L/3:.1f},{-Wd/2:.1f} Q{L/2:.1f},{-Wd/4:.1f} {L/2+Wd*.6:.1f},0 Q{L/2:.1f},{Wd/4:.1f} {L/3:.1f},{Wd/2:.1f} L{-L/4:.1f},{Wd/2:.1f} Q{-L/2:.1f},{Wd/2:.1f} {-L/2:.1f},0Z"
        g = [f'<g transform="translate({cx:.1f},{cy:.1f}) rotate({rot:.1f})">',
             f'<path d="{hull}" fill="#5d4027" stroke="{INK}" stroke-width="{1.6*s:.1f}"/>',
             f'<path d="{hull}" transform="scale(.78)" fill="#8f6c44"/>']
        for m in range(masts):
            mx = -L * .3 + m * (L * .6 / max(1, masts - 1))
            g.append(f'<rect x="{mx-2*s:.1f}" y="{-Wd*.95:.1f}" width="{4*s:.1f}" height="{Wd*1.9:.1f}" fill="{PAPER}" stroke="#8f8775" stroke-width="{.8*s:.1f}" opacity=".9"/>')
            g.append(f'<circle cx="{mx:.1f}" cy="0" r="{2.4*s:.1f}" fill="{INK}"/>')
        g.append("</g>")
        return "".join(g)

    deg = -math.degrees(ang)
    for i, t in enumerate([.3, .48, .66, .84]):                              # tall ships both sides
        mx, my = q0[0] + (q1[0] - q0[0]) * t, q0[1] + (q1[1] - q0[1]) * t
        el.append(ship(mx + 10, my + 36, 104 - (i % 2) * 16, deg))
        if i in (1, 3, 4):
            el.append(ship(mx - 6, my - 44, 92, deg))
    el.append(ship(470, -260, 96, 18))
    el.append(ship(420, 430, 80, -30, 2))
    mx, my = T(LORE["mast"])                                                     # the mooring mast
    el.append(f'<circle cx="{mx:.1f}" cy="{my:.1f}" r="{16*s:.1f}" fill="none" stroke="{INK}" stroke-width="{4*s:.1f}"/>')
    el.append(f'<circle cx="{mx:.1f}" cy="{my:.1f}" r="{7*s:.1f}" fill="{BRASS}" stroke="{INK}" stroke-width="{2*s:.1f}"/>')
    for a in range(0, 360, 45):
        el.append(f'<line x1="{mx:.1f}" y1="{my:.1f}" x2="{mx+16*s*math.cos(math.radians(a)):.1f}" y2="{my+16*s*math.sin(math.radians(a)):.1f}" stroke="{INK}" stroke-width="{1.5*s:.1f}"/>')
    sx, sy = T((900, 120))                                                       # the sky ship, tethered, drifting north-east
    el.append(f'<ellipse cx="{sx+40*s:.1f}" cy="{sy+60*s:.1f}" rx="{95*s:.1f}" ry="{30*s:.1f}" fill="#2f3a3e" opacity=".22" filter="url(#blur8)" transform="rotate(-28 {sx+40*s:.1f} {sy+60*s:.1f})"/>')
    el.append(f'<line x1="{mx:.1f}" y1="{my:.1f}" x2="{sx-70*s:.1f}" y2="{sy+34*s:.1f}" stroke="{INK}" stroke-width="{1.6*s:.1f}" stroke-dasharray="{6*s:.1f} {4*s:.1f}"/>')
    el.append(f'<g transform="translate({sx:.1f},{sy:.1f}) scale(1.35) translate({-sx:.1f},{-sy:.1f}) rotate(-28 {sx:.1f} {sy:.1f})">'
              f'<ellipse cx="{sx:.1f}" cy="{sy:.1f}" rx="{95*s:.1f}" ry="{30*s:.1f}" fill="#d8cfb7" stroke="{INK}" stroke-width="{2.5*s:.1f}"/>'
              + "".join(f'<line x1="{sx+dx*s:.1f}" y1="{sy-28*s*math.sqrt(max(0,1-(dx/95)**2)):.1f}" x2="{sx+dx*s:.1f}" y2="{sy+28*s*math.sqrt(max(0,1-(dx/95)**2)):.1f}" stroke="{BRASS}" stroke-width="{2*s:.1f}"/>' for dx in range(-75, 80, 25))
              + f'<line x1="{sx-95*s:.1f}" y1="{sy:.1f}" x2="{sx+95*s:.1f}" y2="{sy:.1f}" stroke="{BRASS}" stroke-width="{2*s:.1f}"/>'
              f'<rect x="{sx-34*s:.1f}" y="{sy-8*s:.1f}" width="{68*s:.1f}" height="{16*s:.1f}" rx="{6*s:.1f}" fill="#6b4c2e" stroke="{INK}" stroke-width="{1.5*s:.1f}" opacity=".85"/>'
              f'<circle cx="{sx+104*s:.1f}" cy="{sy:.1f}" r="{9*s:.1f}" fill="{AMBER}" stroke="{INK}" stroke-width="{1.5*s:.1f}"/>'
              f'<line x1="{sx+97*s:.1f}" y1="{sy-14*s:.1f}" x2="{sx+111*s:.1f}" y2="{sy+14*s:.1f}" stroke="{INK}" stroke-width="{2*s:.1f}"/>'
              f'<line x1="{sx+97*s:.1f}" y1="{sy+14*s:.1f}" x2="{sx+111*s:.1f}" y2="{sy-14*s:.1f}" stroke="{INK}" stroke-width="{2*s:.1f}"/></g>')
    # ---- landmarks ----------------------------------------------------------------------------------------------
    def nearest(p):
        return min((b[0] for b in F["buildings"]["coordinates"]), key=lambda r: math.dist(centre(r), p))
    ex = nearest(LORE["exchange"])
    el.append(poly(ex, fill=BRASS, stroke=INK, stroke_width=f"{2.4*s:.1f}"))
    bh = nearest(LORE["binding_house"]); bx, by = T(centre(bh))
    el.append(poly(bh, fill="#efe9dc", stroke=INK, stroke_width=f"{2.4*s:.1f}"))
    el.append(f'<circle cx="{bx:.1f}" cy="{by:.1f}" r="{16*s:.1f}" fill="#f7f3ea" stroke="{BRASS}" stroke-width="{4*s:.1f}"/>')
    el.append(f'<circle cx="{bx:.1f}" cy="{by:.1f}" r="{9*s:.1f}" fill="none" stroke="{BRASS}" stroke-width="{2*s:.1f}" stroke-dasharray="{3*s:.1f} {2*s:.1f}"/>')
    be = nearest(LORE["bench"]); ux, uy = T(centre(be))
    el.append(poly(be, fill="#8a8275", stroke=INK, stroke_width=f"{2.4*s:.1f}"))
    el.append(f'<circle cx="{ux:.1f}" cy="{uy:.1f}" r="{9*s:.1f}" fill="{PAPER}" stroke="{INK}" stroke-width="{2*s:.1f}"/><line x1="{ux:.1f}" y1="{uy:.1f}" x2="{ux:.1f}" y2="{uy-6*s:.1f}" stroke="{INK}" stroke-width="{1.5*s:.1f}"/><line x1="{ux:.1f}" y1="{uy:.1f}" x2="{ux+4*s:.1f}" y2="{uy:.1f}" stroke="{INK}" stroke-width="{1.5*s:.1f}"/>')
    ch = nearest(LORE["chapel"]); cx, cy = T(centre(ch))
    el.append(poly(ch, fill=VERD, stroke=INK, stroke_width=f"{2.4*s:.1f}"))
    el.append(f'<circle cx="{cx:.1f}" cy="{cy:.1f}" r="{7*s:.1f}" fill="{PAPER}" stroke="{INK}" stroke-width="{1.6*s:.1f}"/>')
    ix, iy = T(LORE["inn"])
    el.append(f'<rect x="{ix-14*s:.1f}" y="{iy-10*s:.1f}" width="{28*s:.1f}" height="{20*s:.1f}" fill="#5a5047" stroke="{INK}" stroke-width="{2*s:.1f}"/>')
    el.append(f'<circle cx="{ix:.1f}" cy="{iy:.1f}" r="{18*s:.1f}" fill="url(#lamp)" opacity=".8"/>')
    fx, fy = T(LORE["fish_market"])
    for j in range(4):
        jx, jy = LORE["fish_market"][0] + 10 + j * 16, LORE["fish_market"][1] + 18 - j * 14
        el.append(line([(jx, jy), (jx + 60, jy + 44)], stroke="#7a5c3c", stroke_width=f"{5*s:.1f}"))
    el.append(f'<rect x="{fx-30*s:.1f}" y="{fy-14*s:.1f}" width="{60*s:.1f}" height="{28*s:.1f}" fill="#8f8775" stroke="{INK}" stroke-width="{2*s:.1f}"/>')
    for p in LORE["outfalls"]:                                                    # culvert mouths in the sea wall
        ox, oy = T(p)
        el.append(f'<path d="M{ox-12*s:.1f},{oy:.1f} a{12*s:.1f},{12*s:.1f} 0 0 1 {24*s:.1f},0 z" fill="{INK}" transform="rotate(-50 {ox:.1f} {oy:.1f})"/>')
        el.append(f'<ellipse cx="{ox+14*s:.1f}" cy="{oy-6*s:.1f}" rx="{12*s:.1f}" ry="{5*s:.1f}" fill="#7d6a4a" opacity=".45" filter="url(#blur8)"/>')
    # the charge main: a brass pipe beside Refinery Row, from the refinery into town
    el.append(line([(x + 14, y - 8) for x, y in row], stroke=INK, stroke_width=f"{6*s:.1f}", stroke_linecap="round"))
    el.append(line([(x + 14, y - 8) for x, y in row], stroke=BRASS, stroke_width=f"{3.5*s:.1f}", stroke_linecap="round"))
    # charge-lamps along Refinery Row
    for a, b in zip(row, row[1:]):
        n = max(1, int(math.dist(a, b) // 34))
        for i in range(n):
            t = (i + .5) / n
            lx, ly = T((a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t))
            el.append(f'<circle cx="{lx:.1f}" cy="{ly:.1f}" r="{11*s:.1f}" fill="url(#lamp)" opacity=".7"/>')
            el.append(f'<circle cx="{lx:.1f}" cy="{ly:.1f}" r="{2.4*s:.1f}" fill="{AMBER}" stroke="{INK}" stroke-width="{.6*s:.1f}"/>')
    # ---- steampunk: charge mains, lamps on every main road, chimney steam, cranes, tugs, a second sky ship -------
    ring = F["walls"]["geometries"][0]["coordinates"][0]
    def within_town(p):
        return inside(p, ring) or math.dist(p, (0, 0)) < 900
    for ri, r in enumerate(R):                                                    # brass charge mains along the main roads
        cs = [p for p in r["coordinates"] if within_town(p)]
        if len(cs) < 2 or ri == 3:
            continue
        off = [(x + 11, y + 9) for x, y in cs]
        el.append(line(off, stroke=INK, stroke_width=f"{5.5*s:.1f}", stroke_linecap="round"))
        el.append(line(off, stroke=BRASS, stroke_width=f"{3*s:.1f}", stroke_linecap="round"))
        for a, b in zip(cs, cs[1:]):                                              # lamps every ~45 units
            n = max(1, int(math.dist(a, b) // 45))
            for i in range(n):
                t = (i + .5) / n
                lx, ly = T((a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t))
                el.append(f'<circle cx="{lx:.1f}" cy="{ly:.1f}" r="{9*s:.1f}" fill="url(#lamp)" opacity=".55"/>'
                          f'<circle cx="{lx:.1f}" cy="{ly:.1f}" r="{2*s:.1f}" fill="{AMBER}" stroke="{INK}" stroke-width="{.5*s:.1f}"/>')
        gx, gy = T(off[len(off) // 2])                                            # a gauge ring on each main
        el.append(f'<circle cx="{gx:.1f}" cy="{gy:.1f}" r="{7*s:.1f}" fill="{PAPER}" stroke="{BRASS}" stroke-width="{2.5*s:.1f}"/>'
                  f'<line x1="{gx:.1f}" y1="{gy:.1f}" x2="{gx+5*s:.1f}" y2="{gy-3*s:.1f}" stroke="{INK}" stroke-width="{1.2*s:.1f}"/>')
    # the main from the refinery splits at the square into the other mains
    sq = T((0, 0))
    el.append(cog(sq[0] + 70 * s, sq[1] - 60 * s, 13 * s, 10, sw=1.6 * s))
    # chimney steam over the rooftops
    for i, b in enumerate(F["buildings"]["coordinates"]):
        if hashf(i * 7 + 3) < .045:
            c = centre(b[0])
            if inside(c, ref):
                continue
            px, py = T((c[0] + 14, c[1] + 10))
            el.append(f'<ellipse cx="{px:.1f}" cy="{py:.1f}" rx="{16*s:.1f}" ry="{9*s:.1f}" fill="#f4f2ec" opacity=".55" filter="url(#blur8)"/>')
    # iron cranes on the Long Quay and the refinery pier
    def crane(x, y, rot):
        cx, cy = T((x, y))
        return (f'<g transform="translate({cx:.1f},{cy:.1f}) rotate({rot})"><rect x="{-6*s:.1f}" y="{-6*s:.1f}" width="{12*s:.1f}" height="{12*s:.1f}" fill="#3a342e" stroke="{INK}" stroke-width="{1.5*s:.1f}"/>'
                f'<line x1="0" y1="0" x2="{46*s:.1f}" y2="0" stroke="{INK}" stroke-width="{4*s:.1f}"/><line x1="0" y1="0" x2="{46*s:.1f}" y2="0" stroke="#6b6156" stroke-width="{2*s:.1f}"/>'
                + "".join(f'<line x1="{k*s:.1f}" y1="{-2*s:.1f}" x2="{(k+6)*s:.1f}" y2="{2*s:.1f}" stroke="{INK}" stroke-width="{.8*s:.1f}"/>' for k in range(4, 44, 8))
                + f'<circle cx="{46*s:.1f}" cy="0" r="{3*s:.1f}" fill="{BRASS}" stroke="{INK}" stroke-width="{1*s:.1f}"/></g>')
    for t, rot in [(.22, -70), (.42, 110), (.6, -70), (.78, 110)]:
        el.append(crane(q0[0] + (q1[0] - q0[0]) * t, q0[1] + (q1[1] - q0[1]) * t, rot))
    el.append(crane(880, 796, -80)); el.append(crane(960, 792, 100))
    # charge-engined tugs with funnels and wakes
    def tug(x, y, rot):
        cx, cy = T((x, y))
        return (f'<g transform="translate({cx:.1f},{cy:.1f}) rotate({rot})">'
                f'<path d="M{-70*s:.1f},{-3*s:.1f} Q{-110*s:.1f},0 {-70*s:.1f},{3*s:.1f}" fill="none" stroke="#eef0ee" stroke-width="{3*s:.1f}" opacity=".7"/>'
                f'<path d="M{-60*s:.1f},{-10*s:.1f} Q{-140*s:.1f},0 {-60*s:.1f},{10*s:.1f}" fill="none" stroke="#eef0ee" stroke-width="{2*s:.1f}" opacity=".45"/>'
                f'<rect x="{-24*s:.1f}" y="{-8*s:.1f}" width="{48*s:.1f}" height="{16*s:.1f}" rx="{8*s:.1f}" fill="#3a342e" stroke="{INK}" stroke-width="{1.5*s:.1f}"/>'
                f'<circle cx="{4*s:.1f}" cy="0" r="{5*s:.1f}" fill="{BRASS}" stroke="{INK}" stroke-width="{1.5*s:.1f}"/>'
                f'<ellipse cx="{-26*s:.1f}" cy="{-4*s:.1f}" rx="{22*s:.1f}" ry="{9*s:.1f}" fill="#4e4943" opacity=".35" filter="url(#blur8)"/></g>')
    el.append(tug(600, -130, -10)); el.append(tug(560, 330, 25))
    # a second sky ship in flight over the old walls, with its shadow on the roofs
    ax, ay = T((-260, 360))
    el.append(f'<ellipse cx="{ax+60*s:.1f}" cy="{ay+80*s:.1f}" rx="{70*s:.1f}" ry="{22*s:.1f}" fill="#1E1B18" opacity=".18" filter="url(#blur8)" transform="rotate(20 {ax+60*s:.1f} {ay+80*s:.1f})"/>')
    el.append(f'<g transform="translate({ax:.1f},{ay:.1f}) scale(1.45) translate({-ax:.1f},{-ay:.1f}) rotate(20 {ax:.1f} {ay:.1f})">'
              f'<ellipse cx="{ax:.1f}" cy="{ay:.1f}" rx="{70*s:.1f}" ry="{22*s:.1f}" fill="#d8cfb7" stroke="{INK}" stroke-width="{2.2*s:.1f}"/>'
              + "".join(f'<line x1="{ax+dx*s:.1f}" y1="{ay-20*s*math.sqrt(max(0,1-(dx/70)**2)):.1f}" x2="{ax+dx*s:.1f}" y2="{ay+20*s*math.sqrt(max(0,1-(dx/70)**2)):.1f}" stroke="{BRASS}" stroke-width="{1.6*s:.1f}"/>' for dx in range(-55, 60, 18))
              + f'<line x1="{ax-70*s:.1f}" y1="{ay:.1f}" x2="{ax+70*s:.1f}" y2="{ay:.1f}" stroke="{BRASS}" stroke-width="{1.6*s:.1f}"/>'
              f'<rect x="{ax-24*s:.1f}" y="{ay-6*s:.1f}" width="{48*s:.1f}" height="{12*s:.1f}" rx="{5*s:.1f}" fill="#6b4c2e" stroke="{INK}" stroke-width="{1.2*s:.1f}" opacity=".85"/>'
              f'<circle cx="{ax-78*s:.1f}" cy="{ay:.1f}" r="{7*s:.1f}" fill="{AMBER}" stroke="{INK}" stroke-width="{1.2*s:.1f}"/>'
              f'<path d="M{ax-86*s:.1f},{ay:.1f} Q{ax-150*s:.1f},{ay-10*s:.1f} {ax-210*s:.1f},{ay+4*s:.1f}" fill="none" stroke="#f4f2ec" stroke-width="{6*s:.1f}" opacity=".5" filter="url(#blur8)"/></g>')
    # ---- fog: off the sea and over the low streets, never on Refinery Row ----------------------------------------
    defs += f'<mask id="nofog"><rect width="{PX}" height="{PX}" fill="white"/>{line(row, stroke="black", stroke_width=f"{110*s:.1f}", stroke_linecap="round", filter="url(#blur24)")}<circle cx="{T((600,830))[0]:.1f}" cy="{T((600,830))[1]:.1f}" r="{260*s:.1f}" fill="black" filter="url(#blur60)"/></mask>'
    fog = []
    for i, (x, y, rx, ry, op) in enumerate([(1330, 0, 330, 1400, .8), (1200, -300, 260, 900, .45), (1050, -700, 300, 260, .4), (1000, 600, 260, 200, .3),
                                            (620, -300, 220, 120, .22), (300, -900, 260, 120, .2), (-200, -700, 240, 90, .16),
                                            (230, 160, 160, 70, .18), (-350, 300, 220, 80, .12), (500, 350, 180, 70, .2)]):
        fx, fy = T((x, y))
        fog.append(f'<ellipse cx="{fx:.1f}" cy="{fy:.1f}" rx="{rx*s:.1f}" ry="{ry*s:.1f}" fill="#eef0ee" opacity="{op}" filter="url(#blur60)"/>')
    el.append(f'<g mask="url(#nofog)">{"".join(fog)}</g>')
    # ---- frame, title, compass, scale, credit --------------------------------------------------------------------
    el.append(f'<rect width="{PX}" height="{PX}" fill="url(#vignette)"/>')
    m = 34
    el.append(f'<rect x="{m}" y="{m}" width="{PX-2*m}" height="{PX-2*m}" fill="none" stroke="{INK}" stroke-width="6"/>')
    el.append(f'<rect x="{m+14}" y="{m+14}" width="{PX-2*m-28}" height="{PX-2*m-28}" fill="none" stroke="{BRASS}" stroke-width="3"/>')
    el.append(f'<rect x="{m+7}" y="{m+7}" width="{PX-2*m-14}" height="{PX-2*m-14}" fill="none" stroke="{BRASS}" stroke-width="10" opacity=".55"/>')
    for k in range(m + 60, PX - m - 40, 80):                                     # rivets
        for (x, y) in [(k, m + 7), (k, PX - m - 7), (m + 7, k), (PX - m - 7, k)]:
            el.append(f'<circle cx="{x}" cy="{y}" r="3.2" fill="#e0c27a" stroke="{INK}" stroke-width="1.2"/>')
    for (x, y) in [(m + 7, m + 7), (PX - m - 7, m + 7), (m + 7, PX - m - 7), (PX - m - 7, PX - m - 7)]:
        el.append(cog(x, y, 46, 12, sw=3))
    # compass rose in the north-east sea
    cx, cy, r = PX - 300, 300, 130
    rose = [cog(cx + r * 0.95, cy + r * 0.95, 58, 14, sw=3), cog(cx, cy, r * 1.22, 24, fill="#c9a45a", sw=3, hole=0.9), f'<g transform="translate({cx},{cy})">', f'<circle r="{r*1.05}" fill="{PAPER}" opacity=".85"/>', f'<circle r="{r}" fill="none" stroke="{INK}" stroke-width="3"/>',
            f'<circle r="{r*.82}" fill="none" stroke="{BRASS}" stroke-width="2"/>']
    for a in range(0, 360, 45):
        L = r * (1 if a % 90 == 0 else .62)
        ca, sa = math.cos(math.radians(a - 90)), math.sin(math.radians(a - 90))
        cl, sl = math.cos(math.radians(a - 90 + 90)), math.sin(math.radians(a - 90 + 90))
        w = 16 if a % 90 == 0 else 10
        rose.append(f'<path d="M{ca*L:.1f},{sa*L:.1f} L{cl*w:.1f},{sl*w:.1f} L0,0Z" fill="{INK}"/><path d="M{ca*L:.1f},{sa*L:.1f} L{-cl*w:.1f},{-sl*w:.1f} L0,0Z" fill="{BRASS}"/>')
    rose.append(f'<text y="{-r-14}" text-anchor="middle" class="lab place" font-size="44">N</text></g>')
    el.append("".join(rose))
    # scale bar: Watabou units are about a metre
    ft = 0.3048
    bx0, by0 = 140, PX - 150
    seg = 250 * ft * K
    for i in range(4):
        el.append(f'<rect x="{bx0+i*seg:.1f}" y="{by0}" width="{seg:.1f}" height="14" fill="{INK if i%2==0 else PAPER}" stroke="{INK}" stroke-width="2"/>')
    if labels:
        for i in range(5):
            el.append(f'<text x="{bx0+i*seg:.1f}" y="{by0-12}" text-anchor="middle" class="lab small" font-size="26">{i*250}</text>')
        el.append(f'<text x="{bx0+4*seg+18:.1f}" y="{by0+14}" class="lab small" font-size="26">feet</text>')
    # cartouche
    tx, ty = 120, 120
    el.append(f'<rect x="{tx}" y="{ty}" width="900" height="240" fill="{PAPER}" stroke="{INK}" stroke-width="5"/>'
              f'<rect x="{tx+14}" y="{ty+14}" width="872" height="212" fill="none" stroke="{BRASS}" stroke-width="3"/>')
    el.append(cog(tx + 900, ty + 240, 52, 12, sw=3) + cog(tx + 980, ty + 200, 32, 10, sw=2.4))
    el.append(f'<path d="M{tx},{ty+240} H{tx+840}" stroke="{INK}" stroke-width="9"/><path d="M{tx},{ty+240} H{tx+840}" stroke="{BRASS}" stroke-width="5"/>'
              + "".join(f'<rect x="{tx+60+i*130}" y="{ty+232}" width="14" height="16" fill="{BRASS}" stroke="{INK}" stroke-width="2"/>' for i in range(6)))
    if labels:
        el.append(f'<text x="{tx+450}" y="{ty+120}" text-anchor="middle" class="lab place" font-size="104" style="stroke-width:0">Ashford Roads</text>'
                  f'<text x="{tx+450}" y="{ty+180}" text-anchor="middle" class="lab street" font-size="38" style="stroke-width:0">the home port of the Reach · grade F</text>')
        for text, x, y, size, rot, cls in LABELS:
            px, py = T((x, y))
            el.append(f'<text x="{px:.1f}" y="{py:.1f}" text-anchor="middle" class="lab {cls}" font-size="{size*1.25:.0f}" transform="rotate({rot} {px:.1f} {py:.1f})">{text}</text>')
        el.append(f'<text x="{PX-70}" y="{PX-62}" text-anchor="end" class="lab small" font-size="20" style="stroke-width:3px">Street plan: Medieval Fantasy City Generator by watabou (seed 6631)</text>')
    return f'<svg xmlns="http://www.w3.org/2000/svg" width="{PX}" height="{PX}" viewBox="0 0 {PX} {PX}"><defs>{defs}</defs>{"".join(el)}</svg>'


def main() -> None:
    data = json.loads((HERE / "mfcg-6631.json").read_text(encoding="utf-8"))
    OUT.mkdir(exist_ok=True)
    for name, lab in [("ashford_roads", True), ("ashford_roads_players", False)]:
        (OUT / f"{name}.svg").write_text(build(data, lab), encoding="utf-8")
        print(f"wrote watabou/out/{name}.svg")


if __name__ == "__main__":
    main()
