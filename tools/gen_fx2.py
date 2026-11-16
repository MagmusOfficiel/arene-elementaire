"""Formes d'effets supplémentaires (blanches, teintées en jeu) -> client/public/art/fx/*.png
Chaque champion pioche dans ces formes pour ses projectiles, traînées et impacts."""
import sys, math, os
from PIL import Image, ImageDraw, ImageFilter

OUT = sys.argv[1] if len(sys.argv) > 1 else 'client/public/art/fx'
os.makedirs(OUT, exist_ok=True)
S = 4
W = (255, 255, 255, 255)


def canvas(w, h):
    im = Image.new('RGBA', (w * S, h * S), (0, 0, 0, 0))
    return im, ImageDraw.Draw(im)


def save(im, name, w, h, glow=0):
    im = im.resize((w, h), Image.LANCZOS)
    if glow:   # léger halo autour de la forme
        a = im.getchannel('A').filter(ImageFilter.GaussianBlur(glow))
        halo = Image.new('RGBA', im.size, (255, 255, 255, 0)); halo.putalpha(a.point(lambda v: int(v * 0.55)))
        im = Image.alpha_composite(halo, im)
    im.save(f'{OUT}/{name}.png', optimize=True)


def P(pts, k=1):
    return [(x * S * k, y * S * k) for x, y in pts]


# Kunaï : lame + anneau (pointe vers la droite)
im, d = canvas(64, 24)
d.polygon(P([(64, 12), (34, 4), (30, 12), (34, 20)]), fill=W)
d.rectangle([14 * S, 10 * S, 30 * S, 14 * S], fill=W)
d.ellipse([3 * S, 6 * S, 15 * S, 18 * S], outline=W, width=3 * S)
save(im, 'kunai', 64, 24, 1.5)

# Shuriken : étoile à 4 branches avec trou
im, d = canvas(64, 64)
pts = []
for i in range(8):
    a = i * math.pi / 4 - math.pi / 2; r = 31 if i % 2 == 0 else 9
    pts.append((32 + math.cos(a) * r, 32 + math.sin(a) * r))
d.polygon(P(pts), fill=W)
d.ellipse([27 * S, 27 * S, 37 * S, 37 * S], fill=(0, 0, 0, 0))
save(im, 'shuriken', 64, 64, 1.5)

# Flèche
im, d = canvas(96, 24)
d.rectangle([10 * S, 11 * S, 74 * S, 13 * S], fill=W)
d.polygon(P([(96, 12), (72, 3), (78, 12), (72, 21)]), fill=W)
for x in (4, 12):
    d.polygon(P([(x, 4), (x + 12, 11), (x + 8, 11)]), fill=W)
    d.polygon(P([(x, 20), (x + 12, 13), (x + 8, 13)]), fill=W)
save(im, 'arrow', 96, 24, 1.5)

# Plume (Phénix)
im, d = canvas(80, 32)
d.line(P([(4, 16), (78, 16)]), fill=W, width=2 * S)
for i in range(16):
    x = 8 + i * 4.3; L = 13 * math.sin(math.pi * (i + 1) / 17)
    d.line(P([(x, 16), (x + 9, 16 - L)]), fill=W, width=2 * S)
    d.line(P([(x, 16), (x + 9, 16 + L)]), fill=W, width=2 * S)
save(im, 'feather', 80, 32, 2)

# Bulle
im, d = canvas(64, 64)
d.ellipse([4 * S, 4 * S, 60 * S, 60 * S], outline=W, width=4 * S)
d.ellipse([16 * S, 13 * S, 28 * S, 22 * S], fill=W)
save(im, 'bubble', 64, 64, 2)

# Crâne
im, d = canvas(56, 64)
d.ellipse([4 * S, 2 * S, 52 * S, 46 * S], fill=W)
d.rectangle([14 * S, 36 * S, 42 * S, 58 * S], fill=W)
for x in (14, 31):
    d.ellipse([x * S, 18 * S, (x + 11) * S, 31 * S], fill=(0, 0, 0, 0))
d.polygon(P([(28, 33), (24, 41), (32, 41)]), fill=(0, 0, 0, 0))
for x in range(17, 40, 6):
    d.rectangle([x * S, 48 * S, (x + 2) * S, 58 * S], fill=(0, 0, 0, 0))
save(im, 'skull', 56, 64, 2)

# Éclair (zigzag)
im, d = canvas(96, 32)
d.polygon(P([(0, 16), (30, 4), (36, 13), (64, 2), (60, 14), (96, 16), (62, 20), (66, 30), (38, 19), (32, 28)]), fill=W)
save(im, 'bolt', 96, 32, 2)

# Croissant (lune / faux)
im, d = canvas(96, 96)
d.ellipse([4 * S, 4 * S, 92 * S, 92 * S], fill=W)
d.ellipse([20 * S, 0, 106 * S, 86 * S], fill=(0, 0, 0, 0))
save(im, 'crescent', 96, 96, 2)

# Flocon à 6 branches
im, d = canvas(64, 64)
for i in range(6):
    a = i * math.pi / 3; c, s = math.cos(a), math.sin(a)
    d.line(P([(32, 32), (32 + c * 29, 32 + s * 29)]), fill=W, width=3 * S)
    for t in (0.45, 0.72):
        bx, by = 32 + c * 29 * t, 32 + s * 29 * t
        for sg in (-1, 1):
            a2 = a + sg * 0.7
            d.line(P([(bx, by), (bx + math.cos(a2) * 8, by + math.sin(a2) * 8)]), fill=W, width=2 * S)
save(im, 'flake', 64, 64, 1.5)

# Rocher anguleux
im, d = canvas(64, 64)
d.polygon(P([(10, 40), (6, 22), (22, 6), (44, 8), (58, 24), (56, 46), (36, 58), (16, 54)]), fill=W)
save(im, 'rock', 64, 64, 1)

# Flammèche (goutte de feu, pointe vers la gauche = traînée)
im, d = canvas(80, 40)
d.ellipse([40 * S, 6 * S, 76 * S, 34 * S], fill=W)
d.polygon(P([(0, 20), (48, 6), (48, 34)]), fill=W)
d.polygon(P([(10, 6), (46, 12), (40, 18)]), fill=W)
d.polygon(P([(10, 34), (46, 28), (40, 22)]), fill=W)
save(im, 'flame', 80, 40, 2.5)

# Feuille / pétale
im, d = canvas(48, 24)
d.ellipse([2 * S, 4 * S, 46 * S, 20 * S], fill=W)
d.line(P([(4, 12), (44, 12)]), fill=(0, 0, 0, 0), width=1 * S)
save(im, 'leaf', 48, 24, 1)

# Engrenage
im, d = canvas(64, 64)
pts = []
for i in range(40):
    a = i * 2 * math.pi / 40; r = 30 if (i // 2) % 2 == 0 else 23
    pts.append((32 + math.cos(a) * r, 32 + math.sin(a) * r))
d.polygon(P(pts), fill=W)
d.ellipse([22 * S, 22 * S, 42 * S, 42 * S], fill=(0, 0, 0, 0))
save(im, 'gear', 64, 64, 1)

# Vague (croissant d'eau épais)
im, d = canvas(96, 48)
d.pieslice([4 * S, 4 * S, 92 * S, 92 * S], 190, 350, fill=W)
d.pieslice([16 * S, 14 * S, 80 * S, 92 * S], 180, 360, fill=(0, 0, 0, 0))
save(im, 'wave', 96, 48, 2)

# Griffes (3 entailles)
im, d = canvas(96, 96)
for k in (-1, 0, 1):
    off = k * 16
    d.polygon(P([(14 + off, 86), (60 + off, 10), (66 + off, 12), (24 + off, 88)]), fill=W)
save(im, 'claw', 96, 96, 2)

# Lame large (épée vue de côté, pointe à droite)
im, d = canvas(96, 24)
d.polygon(P([(96, 12), (78, 4), (22, 5), (22, 19), (78, 20)]), fill=W)
d.rectangle([14 * S, 1 * S, 20 * S, 23 * S], fill=W)
d.rectangle([2 * S, 9 * S, 14 * S, 15 * S], fill=W)
save(im, 'sword', 96, 24, 1.5)

# Poing / onde d'impact (anneau épais coupé)
im, d = canvas(96, 96)
d.arc([6 * S, 6 * S, 90 * S, 90 * S], 200, 340, fill=W, width=10 * S)
d.arc([20 * S, 20 * S, 76 * S, 76 * S], 210, 330, fill=W, width=6 * S)
save(im, 'impact', 96, 96, 2)

# Spirale (tentacule / ombre)
im, d = canvas(64, 64)
pts = [(32 + math.cos(t) * t * 2.6, 32 + math.sin(t) * t * 2.6) for t in [i * 0.15 for i in range(80)]]
d.line(P(pts), fill=W, width=4 * S)
save(im, 'spiral', 64, 64, 1.5)

# Prisme (losange facetté)
im, d = canvas(48, 64)
d.polygon(P([(24, 2), (46, 24), (24, 62), (2, 24)]), fill=W)
d.line(P([(2, 24), (46, 24)]), fill=(0, 0, 0, 0), width=1 * S)
d.line(P([(24, 2), (24, 62)]), fill=(0, 0, 0, 0), width=1 * S)
save(im, 'prism', 48, 64, 1.5)

print('formes générées dans', OUT)
