"""Décors (arbres, rochers…) et textures d'effets -> client/public/art/props/*.png et art/fx/*.png"""
import sys, math, random, os
import numpy as np
from PIL import Image, ImageDraw, ImageFilter

OUT = sys.argv[1]
os.makedirs(f'{OUT}/props', exist_ok=True); os.makedirs(f'{OUT}/fx', exist_ok=True)
S = 3

def canvas(w, h): im = Image.new('RGBA', (w * S, h * S), (0, 0, 0, 0)); return im, ImageDraw.Draw(im)
def save(im, path, w, h):
    im = im.resize((w, h), Image.LANCZOS)
    if '/props/' in path: im.save(path.replace('.png', '.webp'), 'WEBP', quality=85, method=6)
    else: im.save(path, optimize=True)
def sh(c, f): return tuple(max(0, min(255, int(v * f))) for v in c)

def blob_cluster(d, cx, cy, R, col, rnd, n=9, light=(1.25, 0.75)):
    pts = [(cx + rnd.uniform(-R, R) * 0.65, cy + rnd.uniform(-R, R) * 0.55, R * rnd.uniform(0.45, 0.7)) for _ in range(n)]
    for x, y, r in sorted(pts, key=lambda p: p[1]):
        d.ellipse((x - r, y - r, x + r, y + r), fill=sh(col, light[1]))
    for x, y, r in sorted(pts, key=lambda p: p[1]):
        d.ellipse((x - r * 0.85, y - r * 0.95, x + r * 0.75, y + r * 0.6), fill=col)
        d.ellipse((x - r * 0.6, y - r * 0.85, x + r * 0.2, y - r * 0.1), fill=sh(col, light[0]))

def tree(name, leaf, trunk=(96, 66, 42), w=110, h=140, seed=1, snow=False):
    rnd = random.Random(seed); im, d = canvas(w, h)
    cx = w / 2 * S
    d.rectangle((cx - 7 * S, (h - 50) * S, cx + 7 * S, (h - 4) * S), fill=trunk)
    d.rectangle((cx - 7 * S, (h - 50) * S, cx - 2 * S, (h - 4) * S), fill=sh(trunk, 0.7))
    blob_cluster(d, cx, (h - 82) * S, 46 * S, leaf, rnd, 11)
    if snow:
        for _ in range(9):
            x = cx + rnd.uniform(-34, 34) * S; y = (h - 112 + rnd.uniform(-12, 18)) * S; r = rnd.uniform(6, 12) * S
            d.ellipse((x - r, y - r * 0.5, x + r, y + r * 0.4), fill=(240, 248, 255))
    save(im, f'{OUT}/props/{name}.png', w, h)

def pine(name, leaf=(40, 90, 70), w=90, h=150, seed=2, snow=True):
    rnd = random.Random(seed); im, d = canvas(w, h); cx = w / 2 * S
    d.rectangle((cx - 5 * S, (h - 26) * S, cx + 5 * S, (h - 4) * S), fill=(90, 60, 40))
    for k in range(5):
        y0 = (14 + k * 22) * S; y1 = y0 + 42 * S; half = (16 + k * 8) * S
        d.polygon([(cx, y0), (cx - half, y1), (cx + half, y1)], fill=sh(leaf, 0.8 + k * 0.05))
        d.polygon([(cx, y0), (cx - half, y1), (cx, y1)], fill=sh(leaf, 1.1))
        if snow: d.polygon([(cx, y0), (cx - half * 0.55, y0 + 22 * S), (cx + half * 0.4, y0 + 18 * S)], fill=(236, 246, 255))
    save(im, f'{OUT}/props/{name}.png', w, h)

def dead_tree(name, col=(70, 56, 70), w=100, h=140, seed=3, glowc=None):
    rnd = random.Random(seed); im, d = canvas(w, h); cx = w / 2 * S
    def branch(x, y, a, L, wd, depth):
        if depth == 0 or L < 6 * S: return
        x2, y2 = x + math.cos(a) * L, y + math.sin(a) * L
        d.line((x, y, x2, y2), fill=col, width=int(wd))
        for _ in range(2): branch(x2, y2, a + rnd.uniform(-0.7, 0.7), L * 0.68, wd * 0.65, depth - 1)
    branch(cx, (h - 4) * S, -math.pi / 2, 50 * S, 9 * S, 6)
    if glowc:
        g = Image.new('RGBA', im.size, (0, 0, 0, 0)); gd = ImageDraw.Draw(g)
        for _ in range(6):
            x = cx + rnd.uniform(-35, 35) * S; y = rnd.uniform(20, 80) * S
            gd.ellipse((x - 5 * S, y - 5 * S, x + 5 * S, y + 5 * S), fill=glowc + (255,))
        im.alpha_composite(g.filter(ImageFilter.GaussianBlur(4 * S))); im.alpha_composite(g)
    save(im, f'{OUT}/props/{name}.png', w, h)

def rock(name, col, w=80, h=60, seed=4, cracks=None):
    rnd = random.Random(seed); im, d = canvas(w, h)
    pts = []
    for k in range(9):
        a = math.pi + k / 8 * math.pi
        pts.append((w / 2 * S + math.cos(a) * (w / 2 - 4) * S * rnd.uniform(0.8, 1), (h - 6) * S + math.sin(a) * (h - 10) * S * rnd.uniform(0.75, 1)))
    d.polygon(pts, fill=col)
    d.polygon(pts[:5] + [(w / 2 * S, (h - 6) * S)], fill=sh(col, 1.2))
    d.line(pts, fill=sh(col, 0.5), width=2 * S)
    if cracks:
        for _ in range(4):
            x = rnd.uniform(0.25, 0.75) * w * S; y = rnd.uniform(0.35, 0.85) * h * S
            d.line((x, y, x + rnd.uniform(-14, 14) * S, y + rnd.uniform(-10, 10) * S), fill=cracks, width=2 * S)
    save(im, f'{OUT}/props/{name}.png', w, h)

def crystal(name, col, w=70, h=100, seed=5):
    rnd = random.Random(seed); im, d = canvas(w, h)
    g = Image.new('RGBA', im.size, (0, 0, 0, 0)); gd = ImageDraw.Draw(g)
    gd.ellipse((10 * S, (h - 40) * S, (w - 10) * S, (h - 2) * S), fill=col + (120,)); im.alpha_composite(g.filter(ImageFilter.GaussianBlur(8 * S)))
    for k in range(4):
        x = (w / 2 + rnd.uniform(-18, 18)) * S; top = rnd.uniform(6, 40) * S; bw = rnd.uniform(7, 12) * S; base = (h - 6) * S
        d.polygon([(x - bw, base), (x - bw * 0.7, top + 14 * S), (x, top), (x + bw * 0.7, top + 14 * S), (x + bw, base)], fill=col, outline=sh(col, 0.6))
        d.polygon([(x, top), (x + bw * 0.7, top + 14 * S), (x + bw, base), (x, base)], fill=sh(col, 0.78))
        d.line((x - bw * 0.3, top + 16 * S, x - bw * 0.4, base - 6 * S), fill=(255, 255, 255), width=S)
    save(im, f'{OUT}/props/{name}.png', w, h)

def tomb(name, w=50, h=64):
    im, d = canvas(w, h)
    d.rounded_rectangle((8 * S, 6 * S, (w - 8) * S, (h - 6) * S), radius=14 * S, fill=(110, 104, 120), outline=(60, 56, 70), width=2 * S)
    d.line((w / 2 * S, 16 * S, w / 2 * S, 38 * S), fill=(70, 66, 80), width=3 * S)
    d.line(((w / 2 - 8) * S, 24 * S, (w / 2 + 8) * S, 24 * S), fill=(70, 66, 80), width=3 * S)
    d.rectangle((4 * S, (h - 10) * S, (w - 4) * S, (h - 2) * S), fill=(70, 80, 60))
    save(im, f'{OUT}/props/{name}.png', w, h)

def lamp(name, w=40, h=120):
    im, d = canvas(w, h); cx = w / 2 * S
    d.rectangle((cx - 3 * S, 24 * S, cx + 3 * S, (h - 6) * S), fill=(40, 40, 46))
    d.rectangle((cx - 9 * S, (h - 12) * S, cx + 9 * S, (h - 4) * S), fill=(30, 30, 34))
    g = Image.new('RGBA', im.size, (0, 0, 0, 0)); gd = ImageDraw.Draw(g)
    gd.ellipse((cx - 16 * S, 2 * S, cx + 16 * S, 36 * S), fill=(255, 200, 100, 200)); im.alpha_composite(g.filter(ImageFilter.GaussianBlur(6 * S)))
    d.polygon([(cx - 9 * S, 10 * S), (cx + 9 * S, 10 * S), (cx + 6 * S, 28 * S), (cx - 6 * S, 28 * S)], fill=(255, 226, 150), outline=(40, 40, 46), width=2 * S)
    save(im, f'{OUT}/props/{name}.png', w, h)

def crate(name, w=44, h=48):
    im, d = canvas(w, h)
    d.rectangle((4 * S, 8 * S, (w - 4) * S, (h - 4) * S), fill=(150, 108, 64), outline=(80, 56, 32), width=2 * S)
    d.rectangle((4 * S, 8 * S, (w - 4) * S, 16 * S), fill=(176, 130, 80))
    d.line((4 * S, 16 * S, (w - 4) * S, (h - 4) * S), fill=(96, 68, 40), width=3 * S)
    d.line(((w - 4) * S, 16 * S, 4 * S, (h - 4) * S), fill=(96, 68, 40), width=3 * S)
    save(im, f'{OUT}/props/{name}.png', w, h)

def reeds(name, w=60, h=70, seed=9):
    rnd = random.Random(seed); im, d = canvas(w, h)
    for _ in range(9):
        x = rnd.uniform(10, w - 10) * S; top = rnd.uniform(6, 30) * S
        d.line((x, (h - 2) * S, x + rnd.uniform(-6, 6) * S, top), fill=(60, 110, 60), width=2 * S)
        if rnd.random() < 0.6: d.rounded_rectangle((x - 3 * S, top, x + 3 * S, top + 14 * S), radius=3 * S, fill=(110, 70, 40))
    save(im, f'{OUT}/props/{name}.png', w, h)

def pipe(name, w=90, h=70):
    im, d = canvas(w, h)
    d.rectangle((6 * S, 30 * S, (w - 6) * S, 46 * S), fill=(120, 110, 100), outline=(50, 46, 42), width=2 * S)
    d.rectangle((6 * S, 30 * S, (w - 6) * S, 35 * S), fill=(160, 150, 136))
    for x in (14, w - 22): d.rectangle((x * S, 26 * S, (x + 8) * S, 50 * S), fill=(90, 82, 74))
    d.ellipse(((w / 2 - 14) * S, 4 * S, (w / 2 + 14) * S, 32 * S), fill=(150, 120, 60), outline=(70, 56, 30), width=2 * S)
    d.ellipse(((w / 2 - 5) * S, 13 * S, (w / 2 + 5) * S, 23 * S), fill=(70, 56, 30))
    save(im, f'{OUT}/props/{name}.png', w, h)

tree('arbre', (70, 130, 60), seed=1); tree('arbre2', (92, 150, 70), seed=11)
tree('arbre_bleu', (60, 140, 120), seed=21)
pine('sapin_neige'); pine('sapin', snow=False, seed=4)
dead_tree('arbre_mort', (64, 52, 70), glowc=(170, 110, 255), seed=31)
dead_tree('arbre_brule', (40, 30, 28), seed=32)
def bush(name, col=(80, 140, 64), w=70, h=54, seed=41):
    rnd = random.Random(seed); im, d = canvas(w, h)
    blob_cluster(d, w / 2 * S, (h - 22) * S, 24 * S, col, rnd, 8)
    save(im, f'{OUT}/props/{name}.png', w, h)
bush('buisson')
rock('rocher', (130, 126, 120)); rock('rocher_brun', (130, 104, 78), seed=6)
rock('roche_lave', (60, 44, 40), seed=7, cracks=(255, 120, 40))
crystal('cristal_glace', (170, 225, 255)); crystal('cristal_orage', (255, 230, 110), seed=8)
crystal('cristal_ombre', (150, 100, 240), seed=12)
tomb('tombe'); lamp('lampadaire'); crate('caisse'); reeds('roseaux'); pipe('tuyau')

# ---------------- Textures d'effets (blanches, teintées en jeu) ----------------
def fx_radial(name, size, power=2.0):
    yy, xx = np.mgrid[0:size, 0:size].astype(np.float32)
    r = np.sqrt((xx - size / 2) ** 2 + (yy - size / 2) ** 2) / (size / 2)
    a = np.clip(1 - r, 0, 1) ** power
    Image.fromarray(np.dstack([np.full_like(a, 255)] * 3 + [a * 255]).astype(np.uint8), 'RGBA').save(f'{OUT}/fx/{name}.png')
fx_radial('glow', 128, 2.2); fx_radial('core', 64, 0.8)

def fx_ring(name, size=256, width=0.12):
    yy, xx = np.mgrid[0:size, 0:size].astype(np.float32)
    r = np.sqrt((xx - size / 2) ** 2 + (yy - size / 2) ** 2) / (size / 2)
    a = np.clip(1 - np.abs(r - (1 - width)) / width, 0, 1) ** 1.5
    Image.fromarray(np.dstack([np.full_like(a, 255)] * 3 + [a * 255]).astype(np.uint8), 'RGBA').save(f'{OUT}/fx/{name}.png')
fx_ring('ring'); fx_ring('ring_thin', 256, 0.05)

def fx_spark(size=64):
    yy, xx = np.mgrid[0:size, 0:size].astype(np.float32); c = size / 2
    dx, dy = np.abs(xx - c) / c, np.abs(yy - c) / c
    a = np.clip(1 - (dx * 8 * dy + np.minimum(dx, dy) * 3 + np.sqrt(dx ** 2 + dy ** 2) * 0.9), 0, 1)
    Image.fromarray(np.dstack([np.full_like(a, 255)] * 3 + [a * 255]).astype(np.uint8), 'RGBA').save(f'{OUT}/fx/spark.png')
fx_spark()

def fx_streak(w=128, h=32):
    yy, xx = np.mgrid[0:h, 0:w].astype(np.float32)
    a = np.clip(1 - np.abs(yy - h / 2) / (h / 2), 0, 1) ** 2 * np.clip(xx / w, 0, 1) ** 1.3
    Image.fromarray(np.dstack([np.full_like(a, 255)] * 3 + [a * 255]).astype(np.uint8), 'RGBA').save(f'{OUT}/fx/streak.png')
fx_streak()

def fx_smoke(size=128, seed=3):
    r = np.random.default_rng(seed)
    small = r.random((8, 8)); n = np.asarray(Image.fromarray((small * 255).astype(np.uint8)).resize((size, size), Image.BICUBIC), np.float32) / 255
    yy, xx = np.mgrid[0:size, 0:size].astype(np.float32)
    rad = np.sqrt((xx - size / 2) ** 2 + (yy - size / 2) ** 2) / (size / 2)
    a = np.clip(1 - rad, 0, 1) ** 1.5 * (0.5 + n * 0.7)
    Image.fromarray(np.dstack([np.full_like(a, 255)] * 3 + [np.clip(a, 0, 1) * 255]).astype(np.uint8), 'RGBA').save(f'{OUT}/fx/smoke.png')
fx_smoke()

def poly_fx(name, w, h, pts):
    im, d = canvas(w, h); d.polygon([(x * S, y * S) for x, y in pts], fill=(255, 255, 255)); save(im, f'{OUT}/fx/{name}.png', w, h)
poly_fx('shard', 24, 48, [(12, 0), (22, 20), (12, 48), (2, 20)])
poly_fx('debris', 24, 24, [(4, 6), (14, 2), (22, 10), (18, 22), (6, 20)])
poly_fx('drop', 20, 28, [(10, 0), (17, 14), (16, 22), (10, 27), (4, 22), (3, 14)])
poly_fx('blade', 64, 20, [(0, 10), (20, 2), (64, 10), (20, 18)])

def fx_swirl(size=256):
    im, d = canvas(size, size); c = size / 2 * S
    for arm in range(4):
        pts = []
        for k in range(60):
            t = k / 60; a = arm * math.pi / 2 + t * math.pi * 1.6; r = t * (size / 2 - 6) * S
            pts.append((c + math.cos(a) * r, c + math.sin(a) * r))
        for k in range(len(pts) - 1):
            d.line((pts[k], pts[k + 1]), fill=(255, 255, 255, int(255 * (1 - k / 60) ** 0.6)), width=int((14 * (k / 60) + 3) * S))
    im = im.filter(ImageFilter.GaussianBlur(2 * S))
    save(im, f'{OUT}/fx/swirl.png', size, size)
fx_swirl()

def orb_crystal(w=36, h=48):
    im, d = canvas(w, h)
    g = Image.new('RGBA', im.size, (0, 0, 0, 0)); gd = ImageDraw.Draw(g)
    gd.ellipse((0, 4 * S, w * S, h * S), fill=(200, 160, 255, 160)); im.alpha_composite(g.filter(ImageFilter.GaussianBlur(5 * S)))
    cx = w / 2 * S
    d.polygon([(cx, 4 * S), (cx + 11 * S, 22 * S), (cx, 44 * S), (cx - 11 * S, 22 * S)], fill=(214, 186, 255), outline=(120, 80, 200))
    d.polygon([(cx, 4 * S), (cx + 11 * S, 22 * S), (cx, 44 * S)], fill=(176, 140, 240))
    d.line((cx - 4 * S, 14 * S, cx - 6 * S, 26 * S), fill=(255, 255, 255), width=2 * S)
    save(im, f'{OUT}/fx/orbe.png', w, h)
orb_crystal()
print('décors et effets ok')

# ---------------- Textures des nouveaux sorts (v0.6) ----------------
def fx_slash(size=256):
    """Croissant d'entaille : arc épais qui s'affine aux extrémités."""
    im, d = canvas(size, size); c = size / 2 * S
    for k in range(60):
        t = k / 59; a0 = math.radians(-70 + 140 * t); a1 = math.radians(-70 + 140 * (t + 1 / 59))
        w = math.sin(t * math.pi) ** 0.7 * 26 * S + S
        r = (size / 2 - 20) * S
        d.line((c + math.cos(a0) * r, c + math.sin(a0) * r, c + math.cos(a1) * r, c + math.sin(a1) * r), fill=(255, 255, 255, 255), width=int(w))
    im = im.filter(ImageFilter.GaussianBlur(1.5 * S))
    save(im, f'{OUT}/fx/slash.png', size, size)
fx_slash()

def fx_rays(size=512, n=18):
    yy, xx = np.mgrid[0:size, 0:size].astype(np.float32); c = size / 2
    ang = np.arctan2(yy - c, xx - c); rad = np.sqrt((xx - c) ** 2 + (yy - c) ** 2) / c
    beams = (np.cos(ang * n) * 0.5 + 0.5) ** 6
    a = np.clip(beams * np.clip(1 - rad, 0, 1) ** 0.8 + np.clip(1 - rad * 2.5, 0, 1), 0, 1)
    Image.fromarray(np.dstack([np.full_like(a, 255)] * 3 + [a * 255]).astype(np.uint8), 'RGBA').save(f'{OUT}/fx/rays.png')
fx_rays()

def fx_runes(size=512):
    im, d = canvas(size, size); c = size / 2 * S; R = (size / 2 - 8) * S
    d.ellipse((c - R, c - R, c + R, c + R), outline=(255, 255, 255, 255), width=5 * S)
    d.ellipse((c - R * 0.86, c - R * 0.86, c + R * 0.86, c + R * 0.86), outline=(255, 255, 255, 200), width=3 * S)
    d.ellipse((c - R * 0.5, c - R * 0.5, c + R * 0.5, c + R * 0.5), outline=(255, 255, 255, 180), width=3 * S)
    rnd = random.Random(9)
    for k in range(24):   # glyphes entre les deux cercles
        a = k / 24 * math.tau; x, y = c + math.cos(a) * R * 0.93, c + math.sin(a) * R * 0.93; g = 9 * S
        for _ in range(3):
            d.line((x + rnd.uniform(-g, g), y + rnd.uniform(-g, g), x + rnd.uniform(-g, g), y + rnd.uniform(-g, g)), fill=(255, 255, 255, 230), width=2 * S)
    for k in range(6):    # étoile intérieure
        a0, a1 = k / 6 * math.tau, (k + 2) / 6 * math.tau
        d.line((c + math.cos(a0) * R * 0.86, c + math.sin(a0) * R * 0.86, c + math.cos(a1) * R * 0.86, c + math.sin(a1) * R * 0.86), fill=(255, 255, 255, 170), width=2 * S)
    save(im, f'{OUT}/fx/runes.png', size, size)
fx_runes()

def fx_crater(size=256):
    yy, xx = np.mgrid[0:size, 0:size].astype(np.float32); c = size / 2
    r = np.sqrt((xx - c) ** 2 + (yy - c) ** 2) / c
    n = np.random.default_rng(4).random((size, size)).astype(np.float32)
    a = np.clip(1 - r, 0, 1) ** 0.6 * (0.75 + n * 0.25)
    rim = np.clip(1 - np.abs(r - 0.82) / 0.1, 0, 1) * 0.5
    rgb = np.dstack([np.full_like(a, 30) + rim * 60, np.full_like(a, 22) + rim * 40, np.full_like(a, 18) + rim * 30])
    Image.fromarray(np.dstack([rgb, np.clip(a, 0, 1) * 220]).astype(np.uint8), 'RGBA').save(f'{OUT}/fx/crater.png')
fx_crater()
print('textures v0.6 ok')
