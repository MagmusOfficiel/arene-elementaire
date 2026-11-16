"""Dessine chaque bâtiment de la carte en vue 3/4 (toit + façade) -> client/public/art/buildings/b{i}.png
et écrit buildings.json (position du sprite pour chaque bâtiment)."""
import json, sys, math, random, os
from PIL import Image, ImageDraw, ImageFilter

data = json.load(open(sys.argv[1])); OUT = sys.argv[2]
os.makedirs(f'{OUT}/buildings', exist_ok=True)
SS = 2  # supersampling

def shade(c, f): return tuple(max(0, min(255, int(v * f))) for v in c[:3]) + ((c[3],) if len(c) > 3 else ())
def lerp(a, b, t): return tuple(int(a[i] + (b[i] - a[i]) * t) for i in range(3))

STYLE = {
    'maison': dict(wall=(222, 206, 172), roof=(168, 64, 48), trim=(96, 64, 44), win=(255, 214, 120)),
    'tour':   dict(wall=(150, 150, 156), roof=(70, 84, 112), trim=(70, 70, 76), win=(255, 214, 120)),
    'forge':  dict(wall=(86, 76, 72), roof=(96, 48, 36), trim=(50, 40, 36), win=(255, 130, 40)),
    'cabane': dict(wall=(134, 96, 62), roof=(52, 104, 132), trim=(84, 58, 36), win=(255, 220, 140)),
    'moulin': dict(wall=(226, 222, 210), roof=(206, 168, 82), trim=(120, 96, 60), win=(255, 214, 120)),
    'usine':  dict(wall=(104, 110, 120), roof=(64, 68, 76), trim=(48, 50, 56), win=(255, 190, 90)),
    'crypte': dict(wall=(70, 60, 86), roof=(44, 40, 58), trim=(32, 28, 42), win=(176, 120, 255)),
    'pylone': dict(wall=(120, 116, 100), roof=(80, 78, 66), trim=(60, 58, 50), win=(255, 230, 90)),
    'temple': dict(wall=(236, 230, 214), roof=(212, 172, 72), trim=(180, 150, 80), win=(255, 244, 190)),   # sanctuaire
    'hutte':  dict(wall=(110, 82, 52), roof=(70, 120, 52), trim=(70, 50, 30), win=(255, 230, 150)),     # forêt
}
ALIAS = {'temple': 'tour', 'hutte': 'cabane'}   # même forme, autres couleurs

def roof_tiles(d, x0, y0, x1, y1, col, s, ridge_h=True, rnd=None):
    """Toit à deux pans avec rangées de tuiles."""
    mid = (y0 + y1) / 2 if ridge_h else (x0 + x1) / 2
    if ridge_h:
        d.rectangle((x0, y0, x1, mid), fill=shade(col, 1.12))
        d.rectangle((x0, mid, x1, y1), fill=shade(col, 0.82))
        step = 7 * s
        y = y0 + step
        while y < y1:
            d.line((x0, y, x1, y), fill=shade(col, 0.62), width=s)
            off = (int((y - y0) / step) % 2) * step
            for x in range(int(x0 + off), int(x1), int(step * 2)):
                d.line((x, y - step, x, y), fill=shade(col, 0.7), width=s)
            y += step
        d.line((x0, mid, x1, mid), fill=shade(col, 1.35), width=3 * s)
    else:
        d.rectangle((x0, y0, mid, y1), fill=shade(col, 1.12))
        d.rectangle((mid, y0, x1, y1), fill=shade(col, 0.82))
        step = 7 * s
        x = x0 + step
        while x < x1:
            d.line((x, y0, x, y1), fill=shade(col, 0.62), width=s); x += step
        d.line((mid, y0, mid, y1), fill=shade(col, 1.35), width=3 * s)
    d.rectangle((x0, y0, x1, y1), outline=shade(col, 0.4), width=2 * s)

def facade(d, x0, y0, x1, y1, st, s, rnd, door=True, kind='plaster'):
    wall = st['wall']
    d.rectangle((x0, y0, x1, y1), fill=wall)
    if kind == 'stone':
        for yy in range(int(y0), int(y1), 8 * s):
            off = ((yy - int(y0)) // (8 * s)) % 2 * 7 * s
            d.line((x0, yy, x1, yy), fill=shade(wall, 0.75), width=s)
            for xx in range(int(x0) + off, int(x1), 14 * s):
                d.line((xx, yy, xx, yy + 8 * s), fill=shade(wall, 0.75), width=s)
    elif kind == 'wood':
        for yy in range(int(y0), int(y1), 6 * s):
            d.line((x0, yy, x1, yy), fill=shade(wall, 0.7), width=s)
    elif kind == 'metal':
        for xx in range(int(x0), int(x1), 8 * s):
            d.line((xx, y0, xx, y1), fill=shade(wall, 0.78), width=s)
    else:  # colombages
        d.line((x0, y0 + 3 * s, x1, y0 + 3 * s), fill=st['trim'], width=2 * s)
    # ombre sous l'avant-toit
    d.rectangle((x0, y0, x1, y0 + 4 * s), fill=shade(wall, 0.55))
    w = x1 - x0; h = y1 - y0
    nwin = max(1, int(w / (34 * s)))
    door_x = (x0 + x1) / 2
    for i in range(nwin):
        cx = x0 + (i + 0.5) * w / nwin
        if door and abs(cx - door_x) < 14 * s and nwin > 1: continue
        ww, wh = 9 * s, min(12 * s, h * 0.42)
        wy = y0 + h * 0.32
        lit = rnd.random() < 0.7
        d.rectangle((cx - ww, wy, cx + ww, wy + wh), fill=st['win'] if lit else shade(st['win'], 0.35), outline=st['trim'], width=2 * s)
        d.line((cx, wy, cx, wy + wh), fill=st['trim'], width=s)
    if door:
        dw, dh = 9 * s, h * 0.62
        d.rectangle((door_x - dw, y1 - dh, door_x + dw, y1), fill=shade(st['trim'], 0.8), outline=shade(st['trim'], 0.5), width=2 * s)
        d.ellipse((door_x + dw * 0.4, y1 - dh * 0.5, door_x + dw * 0.4 + 3 * s, y1 - dh * 0.5 + 3 * s), fill=(220, 190, 90))
    d.line((x0, y1, x1, y1), fill=shade(wall, 0.4), width=2 * s)
    d.rectangle((x0, y0, x1, y1), outline=shade(wall, 0.45), width=2 * s)

def glow(img, cx, cy, r, col, a=150):
    g = Image.new('RGBA', img.size, (0, 0, 0, 0)); gd = ImageDraw.Draw(g)
    gd.ellipse((cx - r, cy - r, cx + r, cy + r), fill=col + (a,))
    g = g.filter(ImageFilter.GaussianBlur(r * 0.45))
    img.alpha_composite(g)

meta = []
for i, b in enumerate(data['BUILDINGS']):
    rnd = random.Random(i * 7919)
    st = STYLE.get(b['type'], STYLE['maison']); t = ALIAS.get(b['type'], b['type'])
    w, h = b['w'], b['h']
    WH = int(max(24, min(46, h * 0.3)))      # hauteur de façade
    pad = 8
    extra_top = 90 if t == 'pylone' else (50 if t in ('tour', 'moulin', 'usine', 'forge') else 0)
    IW, IH = w + pad * 2, h + WH + pad + extra_top
    s = SS
    img = Image.new('RGBA', (IW * s, IH * s), (0, 0, 0, 0)); d = ImageDraw.Draw(img)
    # repère : footprint au sol = (pad, extra_top + WH + pad) .. (pad+w, extra_top+WH+pad+h) — façade = bas du footprint
    fx0, fx1 = pad * s, (pad + w) * s
    fy1 = (IH) * s                       # bas du sprite = bas du footprint
    fy0_front = fy1 - WH * s             # haut de la façade
    ry0 = (extra_top + pad) * s          # haut du toit
    ry1 = fy0_front                      # bas du toit

    if t == 'ruine':
        # sol intérieur + murs cassés + gravats
        d.rectangle((fx0, ry0 + WH * s, fx1, fy1), fill=(58, 54, 50))
        for _ in range(int(w * h / 900)):
            x = rnd.uniform(fx0 + 8 * s, fx1 - 8 * s); y = rnd.uniform(ry0 + WH * s + 8 * s, fy1 - 8 * s); r = rnd.uniform(3, 8) * s
            c = rnd.choice([(120, 112, 100), (96, 90, 82), (140, 130, 116)])
            d.polygon([(x - r, y), (x - r * 0.3, y - r * 0.8), (x + r, y - r * 0.2), (x + r * 0.5, y + r * 0.7)], fill=c)
        wallc = (132, 124, 112); th = 7 * s
        segs = [((fx0, ry0 + WH * s), (fx1, ry0 + WH * s)), ((fx0, ry0 + WH * s), (fx0, fy1)), ((fx1, ry0 + WH * s), (fx1, fy1)), ((fx0, fy1), (fx1, fy1))]
        for (a, bb) in segs:
            n = 6
            for k in range(n):
                if rnd.random() < 0.3: continue
                p0 = (a[0] + (bb[0] - a[0]) * k / n, a[1] + (bb[1] - a[1]) * k / n)
                p1 = (a[0] + (bb[0] - a[0]) * (k + 1) / n, a[1] + (bb[1] - a[1]) * (k + 1) / n)
                hgt = rnd.uniform(6, 22) * s
                d.rectangle((min(p0[0], p1[0]) - th / 2, min(p0[1], p1[1]) - hgt, max(p0[0], p1[0]) + th / 2, max(p0[1], p1[1]) + th / 2), fill=wallc, outline=shade(wallc, 0.55), width=s)
                d.rectangle((min(p0[0], p1[0]) - th / 2, min(p0[1], p1[1]) - hgt, max(p0[0], p1[0]) + th / 2, min(p0[1], p1[1]) - hgt + 3 * s), fill=shade(wallc, 1.2))
    elif t == 'igloo':
        cx, cy = (fx0 + fx1) / 2, fy1 - (h * 0.5) * s
        rx, ry = w / 2 * s, (h / 2 + WH * 0.6) * s
        d.ellipse((cx - rx, cy - ry, cx + rx, fy1 + ry * 0.15), fill=(226, 240, 250), outline=(150, 180, 205), width=2 * s)
        for k in range(1, 6):
            yy = cy - ry + (fy1 - (cy - ry)) * k / 6
            d.arc((cx - rx, cy - ry, cx + rx, fy1 + ry * 0.15), 180, 360, fill=(170, 200, 222), width=s)
            d.line((cx - rx * math.sqrt(max(0, 1 - ((yy - cy) / ry) ** 2)), yy, cx + rx * math.sqrt(max(0, 1 - ((yy - cy) / ry) ** 2)), yy), fill=(180, 205, 225), width=s)
        d.ellipse((cx - 14 * s, fy1 - 22 * s, cx + 14 * s, fy1 + 8 * s), fill=(30, 40, 56))
    elif t == 'mine':
        cx = (fx0 + fx1) / 2
        pts = [(fx0, fy1), (fx0 + 10 * s, ry0 + 20 * s), (cx - 20 * s, ry0), (cx + 30 * s, ry0 + 10 * s), (fx1 - 6 * s, ry0 + 30 * s), (fx1, fy1)]
        d.polygon(pts, fill=(112, 96, 76), outline=(60, 50, 40))
        for _ in range(40):
            x = rnd.uniform(fx0 + 10 * s, fx1 - 10 * s); y = rnd.uniform(ry0 + 20 * s, fy1 - 10 * s); r = rnd.uniform(4, 10) * s
            d.ellipse((x - r, y - r * 0.7, x + r, y + r * 0.7), fill=rnd.choice([(126, 110, 88), (96, 82, 64), (138, 122, 98)]))
        ew = min(26 * s, (fx1 - fx0) * 0.25)
        d.rectangle((cx - ew, fy1 - 34 * s, cx + ew, fy1), fill=(26, 20, 16))
        d.rectangle((cx - ew - 5 * s, fy1 - 38 * s, cx + ew + 5 * s, fy1 - 32 * s), fill=(120, 84, 46))
        d.rectangle((cx - ew - 5 * s, fy1 - 38 * s, cx - ew, fy1), fill=(120, 84, 46))
        d.rectangle((cx + ew, fy1 - 38 * s, cx + ew + 5 * s, fy1), fill=(120, 84, 46))
        glow(img, cx, fy1 - 16 * s, 14 * s, (255, 170, 60), 90)
    else:
        horiz = w >= h
        kind = {'maison': 'plaster', 'tour': 'stone', 'forge': 'stone', 'cabane': 'wood', 'moulin': 'plaster',
                'usine': 'metal', 'crypte': 'stone', 'pylone': 'stone'}[t]
        if t == 'usine':
            d.rectangle((fx0, ry0, fx1, ry1), fill=st['roof'], outline=shade(st['roof'], 0.5), width=2 * s)
            for xx in range(int(fx0) + 10 * s, int(fx1) - 6 * s, 12 * s):
                d.line((xx, ry0 + 4 * s, xx, ry1 - 4 * s), fill=shade(st['roof'], 1.25), width=s)
        else:
            roof_tiles(d, fx0 - 4 * s, ry0, fx1 + 4 * s, ry1 + 4 * s, st['roof'], s, horiz, rnd)
        facade(d, fx0, fy0_front, fx1, fy1, st, s, rnd, door=(t != 'pylone'), kind=kind)
        if t == 'tour':
            cx, cy = (fx0 + fx1) / 2, (ry0 + ry1) / 2
            r = min(w, h) * 0.32 * s
            d.ellipse((cx - r, cy - r, cx + r, cy + r), fill=shade(st['roof'], 0.9), outline=shade(st['roof'], 0.5), width=2 * s)
            d.polygon([(cx - r * 0.8, cy), (cx, cy - r * 2.2), (cx + r * 0.8, cy)], fill=shade(st['roof'], 1.2), outline=shade(st['roof'], 0.5))
            d.ellipse((cx - 4 * s, cy - r * 2.4, cx + 4 * s, cy - r * 2.0), fill=(220, 190, 90))
        if t in ('maison', 'forge', 'cabane', 'crypte'):
            chx = fx0 + (fx1 - fx0) * rnd.uniform(0.6, 0.8); chy = ry0 + (ry1 - ry0) * 0.25
            d.rectangle((chx, chy - 18 * s, chx + 12 * s, chy + 8 * s), fill=shade(st['wall'], 0.7), outline=shade(st['wall'], 0.4), width=s)
            d.rectangle((chx - 2 * s, chy - 22 * s, chx + 14 * s, chy - 16 * s), fill=shade(st['wall'], 0.55))
            if t == 'forge': glow(img, chx + 6 * s, chy - 22 * s, 16 * s, (255, 120, 30), 160)
        if t == 'forge':
            glow(img, (fx0 + fx1) / 2, fy1 - WH * s * 0.4, 26 * s, (255, 110, 30), 120)
        if t == 'crypte':
            for k in range(2):
                gx = fx0 + (fx1 - fx0) * (0.3 + 0.4 * k)
                glow(img, gx, fy0_front + WH * s * 0.45, 12 * s, (160, 90, 255), 110)
        if t == 'usine':
            for k in range(rnd.randint(2, 3)):
                cx = fx0 + (fx1 - fx0) * (0.2 + 0.3 * k); cy = ry0 + (ry1 - ry0) * 0.4
                d.rectangle((cx - 7 * s, cy - 44 * s, cx + 7 * s, cy + 6 * s), fill=(90, 70, 62), outline=(40, 32, 30), width=s)
                d.rectangle((cx - 9 * s, cy - 48 * s, cx + 9 * s, cy - 42 * s), fill=(60, 50, 46))
                for yy in range(int(cy - 40 * s), int(cy), 10 * s): d.line((cx - 7 * s, yy, cx + 7 * s, yy), fill=(70, 56, 50), width=s)
        if t == 'moulin':
            cx, cy = (fx0 + fx1) / 2, (ry0 + ry1) / 2 - 6 * s
            L = min(w, h) * 0.75 * s
            ang0 = rnd.uniform(0, 1)
            for k in range(4):
                a = ang0 + k * math.pi / 2
                ex, ey = cx + math.cos(a) * L, cy + math.sin(a) * L
                d.line((cx, cy, ex, ey), fill=(110, 80, 50), width=4 * s)
                nx, ny = -math.sin(a), math.cos(a)
                d.polygon([(cx + math.cos(a) * L * 0.25, cy + math.sin(a) * L * 0.25), (ex, ey), (ex + nx * 12 * s, ey + ny * 12 * s), (cx + math.cos(a) * L * 0.25 + nx * 12 * s, cy + math.sin(a) * L * 0.25 + ny * 12 * s)], fill=(236, 228, 210), outline=(140, 120, 90))
            d.ellipse((cx - 6 * s, cy - 6 * s, cx + 6 * s, cy + 6 * s), fill=(90, 64, 40))
        if t == 'pylone':
            cx = (fx0 + fx1) / 2; top = 6 * s; base = ry1
            bw = min(w * 0.5, 50) * s
            for k in range(0, 12):
                ya = base - (base - top) * k / 12; yb = base - (base - top) * (k + 1) / 12
                wa = bw * (1 - 0.8 * k / 12); wb = bw * (1 - 0.8 * (k + 1) / 12)
                d.line((cx - wa, ya, cx - wb, yb), fill=(150, 150, 140), width=2 * s)
                d.line((cx + wa, ya, cx + wb, yb), fill=(150, 150, 140), width=2 * s)
                d.line((cx - wa, ya, cx + wb, yb), fill=(120, 120, 112), width=s)
                d.line((cx + wa, ya, cx - wb, yb), fill=(120, 120, 112), width=s)
            glow(img, cx, top + 10 * s, 22 * s, (255, 230, 80), 200)
            d.ellipse((cx - 8 * s, top + 2 * s, cx + 8 * s, top + 18 * s), fill=(255, 250, 200))
    img = img.resize((IW, IH), Image.LANCZOS)
    img.save(f'{OUT}/buildings/b{i}.webp', 'WEBP', quality=85, method=6)
    meta.append({'x': b['x'] - pad, 'y': b['y'] + b['h'] - IH, 'w': IW, 'h': IH, 'depth': b['y'] + b['h']})

json.dump(meta, open(f'{OUT}/buildings.json', 'w'))
print('bâtiments', len(meta))
