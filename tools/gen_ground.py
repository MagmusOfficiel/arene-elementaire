"""Génère le sol peint de la carte (4 tuiles JPEG) à partir de shared/data.js.
Usage : node tools/export_map.mjs > /tmp/mapdata.json && python3 tools/gen_ground.py /tmp/mapdata.json client/public/art
"""
import json, sys, math
import numpy as np
from PIL import Image, ImageDraw, ImageFilter

data = json.load(open(sys.argv[1])); OUT = sys.argv[2]
AW, AH = data['ARENA']['width'], data['ARENA']['height']
S = 0.5                       # on peint à demi-résolution puis on agrandit
W, H = int(AW * S), int(AH * S)
rng = np.random.default_rng(7)

def noise(scale, seed, octaves=4):
    r = np.random.default_rng(seed); acc = np.zeros((H, W), np.float32); amp = 1; tot = 0
    for o in range(octaves):
        s = max(2, int(scale / (2 ** o)))
        small = r.random((H // s + 2, W // s + 2)).astype(np.float32)
        img = Image.fromarray((small * 255).astype(np.uint8)).resize((W + 2 * s, H + 2 * s), Image.BICUBIC)
        acc += np.asarray(img, np.float32)[s:s + H, s:s + W] / 255 * amp; tot += amp; amp *= 0.5
    return acc / tot

def ridge(scale, seed):
    n = noise(scale, seed, 3)
    return 1 - np.abs(n - 0.5) * 2          # proche de 1 sur les "fissures"

def mix(c1, c2, t):
    c1 = np.array(c1, np.float32); c2 = np.array(c2, np.float32)
    return c1 + (c2 - c1) * t[..., None]

def hexrgb(h): return ((h >> 16) & 255, (h >> 8) & 255, h & 255)

n1, n2, n3 = noise(160, 1), noise(40, 2), noise(10, 3, 2)

# ---------- textures par biome ----------
YY, XX = np.mgrid[0:H, 0:W].astype(np.float32)
def speckle(seed, density, size=1):
    """Petits points (fleurs, cailloux, étincelles) : masque 0..1"""
    r = np.random.default_rng(seed); m = (r.random((H, W)) < density).astype(np.float32)
    if size > 1: m = np.asarray(Image.fromarray((m * 255).astype(np.uint8)).filter(ImageFilter.MaxFilter(size if size % 2 else size + 1)).filter(ImageFilter.GaussianBlur(0.9)), np.float32) / 255
    return np.clip(m * 1.6, 0, 1)
def blades(seed):
    """Brins d'herbe : bruit fin étiré en diagonale (flou de mouvement)"""
    r = np.random.default_rng(seed); a = r.random((H, W)).astype(np.float32)
    acc = np.zeros_like(a)
    for k in range(-3, 4): acc += np.roll(np.roll(a, k, 0), k // 2, 1)
    return acc / 7
def tex_plaine():
    t = mix((58, 96, 44), (92, 132, 60), n1)
    t = mix(t, (40, 72, 34), np.clip((n2 - 0.55) / 0.2, 0, 1) * 0.55)
    clump = noise(14, 5, 2)
    t = mix(t, (112, 152, 70), np.clip((clump - 0.6) / 0.15, 0, 1) * 0.4)       # touffes claires
    t = mix(t, (38, 66, 32), np.clip((0.4 - clump) / 0.15, 0, 1) * 0.35)        # creux sombres
    fl = speckle(6, 0.0008, 3) * (noise(120, 7) > 0.55)
    t = mix(t, (250, 240, 200), fl * 0.8)
    fl2 = speckle(8, 0.0006, 3) * (noise(120, 9) > 0.6)
    t = mix(t, (230, 120, 170), fl2 * 0.75)
    t += ((n3 - 0.5) * 22)[..., None]
    return t
def tex_volcan():
    t = mix((44, 34, 32), (78, 58, 48), n1)
    t += ((n3 - 0.5) * 26)[..., None]
    r = ridge(90, 11); lava = np.clip((r - 0.93) / 0.07, 0, 1)
    t = mix(t, (255, 110, 30), lava * 0.95)
    glow = np.clip((r - 0.85) / 0.15, 0, 1) * 0.35
    t = mix(t, (190, 60, 20), glow)
    return t
def tex_lac():
    t = mix((70, 120, 98), (110, 150, 110), n1)
    t += ((n3 - 0.5) * 22)[..., None]
    pools = np.clip((noise(220, 21) - 0.6) / 0.05, 0, 1)
    water = mix((40, 110, 160), (80, 160, 200), n2)
    t = mix(t, water, pools)
    shore = np.clip(1 - np.abs(noise(220, 21) - 0.585) / 0.025, 0, 1) * (noise(220, 21) < 0.6)
    t = mix(t, (214, 200, 150), shore * 0.85)                                       # plage de sable
    foam = np.clip(1 - np.abs(noise(220, 21) - 0.603) / 0.004, 0, 1)
    t = mix(t, (235, 248, 255), foam * 0.8)                                         # écume
    return t
def tex_montagne():
    t = mix((92, 76, 58), (128, 108, 84), n1)
    t = mix(t, (70, 60, 50), np.clip((ridge(60, 31) - 0.9) / 0.1, 0, 1) * 0.8)
    t = mix(t, (170, 150, 120), speckle(32, 0.006, 2) * 0.6)                        # cailloux
    t += ((n3 - 0.5) * 34)[..., None]
    return t
def tex_plateau():
    stripes = (np.sin(np.arange(W)[None, :] * 0.05 + np.arange(H)[:, None] * 0.02 + n1 * 12) + 1) / 2
    t = mix((112, 140, 80), (150, 170, 100), n1 * 0.6 + stripes * 0.4)
    for sd, col in ((91, (255, 220, 90)), (92, (255, 150, 190)), (93, (240, 240, 255))):
        t = mix(t, col, speckle(sd, 0.0016, 3) * (noise(100, sd) > 0.55) * 0.8)    # prairie fleurie
    t += ((n3 - 0.5) * 24)[..., None]
    return t
def tex_pics():
    t = mix((205, 222, 235), (244, 250, 255), n1)
    t = mix(t, (150, 182, 214), np.clip((n2 - 0.58) / 0.2, 0, 1) * 0.65)
    t = mix(t, (120, 160, 205), np.clip((ridge(70, 81) - 0.94) / 0.06, 0, 1) * 0.6)   # crevasses de glace
    t = mix(t, (255, 255, 255), speckle(82, 0.002, 2) * 0.9)
    t += ((n3 - 0.5) * 12)[..., None]
    return t
def tex_fonderie():
    t = mix((58, 60, 66), (84, 86, 92), n1)
    yy, xx = np.mgrid[0:H, 0:W]
    plate = ((xx % 64 < 2) | (yy % 64 < 2)).astype(np.float32)
    t = mix(t, (34, 34, 38), plate * 0.8)
    rivet = (((xx % 64 - 6) ** 2 + (yy % 64 - 6) ** 2) < 5).astype(np.float32)
    t = mix(t, (140, 144, 150), rivet)
    t = mix(t, (30, 26, 24), np.clip((n2 - 0.55) / 0.3, 0, 1) * 0.6)   # suie
    grate = ((xx % 192 > 60) & (xx % 192 < 132) & (yy % 192 > 88) & (yy % 192 < 104)).astype(np.float32)
    t = mix(t, (255, 120, 30), grate * ((xx // 6) % 2) * 0.85)                      # grilles incandescentes
    t += ((n3 - 0.5) * 18)[..., None]
    return t
def tex_marais():
    t = mix((40, 34, 52), (62, 56, 70), n1)
    pools = np.clip((noise(150, 41) - 0.58) / 0.06, 0, 1)
    t = mix(t, (36, 52, 46), pools * 0.9)
    t = mix(t, (120, 80, 200), np.clip((ridge(70, 42) - 0.96) / 0.04, 0, 1) * 0.5)
    pe = np.clip(1 - np.abs(noise(150, 41) - 0.58) / 0.012, 0, 1)
    t = mix(t, (140, 255, 200), pe * speckle(43, 0.05, 2) * 0.8)                   # algues lumineuses au bord des mares
    t += ((n3 - 0.5) * 20)[..., None]
    return t
def tex_orage():
    t = mix((140, 120, 60), (180, 160, 86), n1)
    t = mix(t, (60, 52, 40), np.clip((noise(80, 51) - 0.7) / 0.1, 0, 1) * 0.7)   # brûlures de foudre
    lich = np.clip((ridge(45, 52) - 0.965) / 0.035, 0, 1) * np.clip((noise(80, 51) - 0.62) / 0.1, 0, 1)
    t = mix(t, (255, 230, 120), lich * 0.8)                                          # figures de foudre
    t += ((n3 - 0.5) * 26)[..., None]
    return t
def tex_sanctuaire():
    # dalles de marbre blanc et or, rayons de lumière au sol
    t = mix((214, 206, 180), (240, 234, 214), n1)
    yy, xx = np.mgrid[0:H, 0:W]
    tile = ((xx % 48 < 2) | (yy % 48 < 2)).astype(np.float32)
    t = mix(t, (190, 160, 90), tile * 0.6)
    cx, cy = W * 0.5, H * 0.5
    rays = (np.sin(np.arctan2(yy - cy, xx - cx) * 18) + 1) / 2
    t = mix(t, (255, 240, 180), rays * 0.12)
    return t
def sanctuaire_mandala(t, b):
    # grand cercle doré gravé au centre du sanctuaire
    cx, cy = (b['x'] + b['w'] / 2) * S, (b['y'] + b['h'] / 2) * S
    r = np.hypot(XX - cx, YY - cy); a = np.arctan2(YY - cy, XX - cx)
    ring = lambda R, w: np.clip(1 - np.abs(r - R) / w, 0, 1)
    m = ring(260, 3) + ring(250, 1.5) + ring(170, 2.5) + ring(90, 2) + (np.abs(np.sin(a * 6)) > 0.985) * (r < 250) * (r > 90) * 0.8
    star = np.clip(1 - np.abs(r - (130 + 40 * np.cos(a * 8))) / 2.5, 0, 1)
    m = np.clip(m + star, 0, 1)
    return mix(t, (205, 160, 60), m * 0.85)
def _unused():
    t = 0
    t += ((n3 - 0.5) * 14)[..., None]
    return t
def tex_foret():
    # sous-bois sombre, mousse et feuilles mortes
    t = mix((34, 64, 30), (60, 96, 44), n1)
    t = mix(t, (88, 70, 40), np.clip((noise(40, 71) - 0.6) / 0.15, 0, 1) * 0.55)
    t = mix(t, (110, 170, 70), np.clip((noise(18, 72) - 0.7) / 0.1, 0, 1) * 0.35)
    t = mix(t, (150, 90, 40), speckle(73, 0.004, 2) * 0.5)                         # feuilles mortes
    t = mix(t, (255, 250, 210), speckle(74, 0.0008, 3) * (noise(90, 75) > 0.6) * 0.8)   # petites fleurs
    t += ((n3 - 0.5) * 22)[..., None]
    return t
TEX = {'sanctuaire': tex_sanctuaire, 'foret': tex_foret, 'volcan': tex_volcan, 'lac': tex_lac, 'montagne': tex_montagne, 'plateau': tex_plateau,
       'pics': tex_pics, 'fonderie': tex_fonderie, 'marais': tex_marais, 'orage': tex_orage}

WARP = (noise(420, 401, 3) - 0.5, noise(420, 402, 3) - 0.5)
def rect_mask(x, y, w, h, feather, warp=110):
    # bords organiques : on déforme l'espace avec du bruit, et coins arrondis
    x, y, w, h, f = x * S, y * S, w * S, h * S, feather * S
    xx = XX + WARP[0] * warp; yy = YY + WARP[1] * warp
    dx = np.minimum(xx - x, x + w - xx); dy = np.minimum(yy - y, y + h - yy)
    R = 60 * S
    cdx = np.clip(R - dx, 0, None); cdy = np.clip(R - dy, 0, None)
    d = np.where((cdx > 0) & (cdy > 0), R - np.hypot(cdx, cdy), np.minimum(dx, dy))
    d = d + (noise(30, int(x + y)) - 0.5) * f * 0.8
    return np.clip(d / f, 0, 1)

img = tex_plaine()
for b in data['BIOMES']:
    m = rect_mask(b['x'], b['y'], b['w'], b['h'], 70, 420)
    T = TEX[b['id']]()
    if b['id'] == 'sanctuaire': T = sanctuaire_mandala(T, b)
    # liseré : bord de la zone légèrement assombri (lisibilité)
    rim = np.clip(1 - np.abs(m - 0.5) / 0.5, 0, 1) ** 3
    img = img * (1 - m[..., None]) + T * m[..., None]
    img = img * (1 - rim[..., None] * 0.18)
    print('biome', b['id'], flush=True)

# ---------- ville : pavés + rues ----------
C = data['CITY']
cm = rect_mask(C['x'] - 70, C['y'] - 70, C['w'] + 140, C['h'] + 140, 50)
yy, xx = np.mgrid[0:H, 0:W]
bw, bh = 9, 6
row = (yy // bh)
cob = (((xx + (row % 2) * bw // 2) % bw < 1) | (yy % bh < 1)).astype(np.float32)
col = (xx + (row % 2) * bw // 2) // bw
tone = ((np.sin(col * 12.9898 + row * 78.233) * 43758.5453) % 1).astype(np.float32)
stone = mix((84, 82, 80), (130, 124, 116), tone * 0.7 + noise(6, 61, 1) * 0.3)
stone = mix(stone, (60, 58, 56), cob * 0.85)
stone = mix(stone, (70, 64, 58), np.clip((n2 - 0.6) / 0.2, 0, 1) * 0.5)
img = img * (1 - cm[..., None]) + stone * cm[..., None]

# ---------- chemins de terre ----------
pil = Image.fromarray(np.clip(img, 0, 255).astype(np.uint8))
path = Image.new('L', (W, H), 0); d = ImageDraw.Draw(path)
cx, cy = (C['x'] + C['w'] / 2) * S, (C['y'] + C['h'] / 2) * S
for b in data['BIOMES']:
    bx, by = (b['x'] + b['w'] / 2) * S, (b['y'] + b['h'] / 2) * S
    pts = []
    for i in range(21):
        t = i / 20; wob = math.sin(t * math.pi * 3 + bx) * 25 * math.sin(t * math.pi)
        px = cx + (bx - cx) * t; py = cy + (by - cy) * t
        nx, ny = -(by - cy), (bx - cx); l = math.hypot(nx, ny) or 1
        pts.append((px + nx / l * wob, py + ny / l * wob))
    d.line(pts, fill=255, width=26, joint='curve')
path = path.filter(ImageFilter.GaussianBlur(2.2))
pa = np.asarray(path, np.float32) / 255
pm = np.clip((pa - 0.35) / 0.3, 0, 1) * (1 - cm)
border = np.clip(1 - np.abs(pa - 0.42) / 0.12, 0, 1) * (1 - cm)
# pavés irréguliers sur les chemins
cell = 7
cxg, cyg = (XX + noise(20, 301) * 6) // cell, (YY + noise(20, 302) * 6) // cell
tone2 = ((np.sin(cxg * 12.9898 + cyg * 78.233) * 43758.5453) % 1).astype(np.float32)
joint = (((XX + noise(20, 301) * 6) % cell < 1.2) | ((YY + noise(20, 302) * 6) % cell < 1.2)).astype(np.float32)
road = mix((120, 104, 82), (160, 142, 112), tone2 * 0.7 + n2 * 0.3)
road = mix(road, (82, 70, 56), joint * 0.7)
img = np.asarray(pil, np.float32) * (1 - pm[..., None]) + road * pm[..., None]
img = img * (1 - border[..., None] * 0.35)

# ---------- ombres portées des bâtiments (cuites dans le sol) ----------
sh = Image.new('L', (W, H), 0); d = ImageDraw.Draw(sh)
for b in data['BUILDINGS']:
    d.rounded_rectangle(((b['x'] + 14) * S, (b['y'] + 10) * S, (b['x'] + b['w'] + 22) * S, (b['y'] + b['h'] + 16) * S), 6, fill=150)
sh = np.asarray(sh.filter(ImageFilter.GaussianBlur(3)), np.float32) / 255
img = img * (1 - sh[..., None] * 0.55)

# ---------- vignette de bord de carte ----------
edge = np.minimum(np.minimum(xx, W - xx), np.minimum(yy, H - yy)).astype(np.float32)
img = img * (0.55 + 0.45 * np.clip(edge / 90, 0, 1))[..., None]

full = Image.fromarray(np.clip(img, 0, 255).astype(np.uint8)).resize((AW, AH), Image.LANCZOS)
# grain fin à pleine résolution pour garder du détail
g = (np.random.default_rng(99).random((AH, AW)).astype(np.float32) - 0.5) * 14
full = Image.fromarray(np.clip(np.asarray(full, np.float32) + g[..., None], 0, 255).astype(np.uint8))
tw, th = AW // 2, AH // 2
for i in range(2):
    for j in range(2):
        full.crop((i * tw, j * th, (i + 1) * tw, (j + 1) * th)).save(f'{OUT}/ground_{i}_{j}.webp', 'WEBP', quality=78, method=6)
full.resize((AW // 8, AH // 8), Image.LANCZOS).save('/tmp/ground_preview.jpg', quality=85)
print('sol ok')
