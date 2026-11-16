"""Découpe une planche d'animation (sprite sheet) en images prêtes pour le jeu.
Usage : python3 tools/decouper_planche.py client/public fusion planche.png [colonnes=4] [lignes=2]
Ligne 1 = course, ligne 2 = attaque. Chaque image est détourée (rembg), puis toutes sont
recadrées sur un même cadre : pieds sur la même ligne, corps centré, même échelle.
Sortie : sprites_anim/<fusion>/run_0..N.webp, atk_0..N.webp + sprites_anim/index.json
"""
import sys, os, json
import numpy as np
from PIL import Image
from rembg import remove, new_session

OUT, KEY, SRC = sys.argv[1], sys.argv[2], sys.argv[3]
COLS = int(sys.argv[4]) if len(sys.argv) > 4 else 4
ROWS = int(sys.argv[5]) if len(sys.argv) > 5 else 2
NAMES = ['run', 'atk', 'idle', 'cast'][:ROWS]
H_OUT = 300

sheet = Image.open(SRC).convert('RGB')
W, H = sheet.size
sess = new_session('isnet-anime')

# 1) détourage de toute la planche d'un coup (le fond est uni)
cut = remove(sheet, session=sess)
alpha = np.asarray(cut.getchannel('A')) > 60

# 2) repérage des cellules : colonnes/lignes vides entre les personnages (sinon grille régulière)
def splits(profile, n, size):
    """Coupe aux creux du profil près des positions régulières."""
    cuts = [0]
    for k in range(1, n):
        guess = size * k // n; win = size // (n * 3)
        seg = profile[guess - win: guess + win]
        cuts.append(guess - win + int(np.argmin(seg)))
    cuts.append(size)
    return cuts

frames = []
rows_cut = splits(alpha.sum(1), ROWS, H)
for r in range(ROWS):
    band = alpha[rows_cut[r]:rows_cut[r + 1]]
    cols_cut = splits(band.sum(0), COLS, W)
    for c in range(COLS):
        x0, x1, y0, y1 = cols_cut[c], cols_cut[c + 1], rows_cut[r], rows_cut[r + 1]
        cell = cut.crop((x0, y0, x1, y1))
        a = np.asarray(cell.getchannel('A')) > 60
        # on garde la plus grosse silhouette (supprime les miettes des voisins)
        ys, xs = np.nonzero(a)
        if not len(xs): continue
        box = cell.getbbox()
        frames.append({'row': r, 'col': c, 'img': cell, 'box': box})

# 3) cadre commun : même échelle, pieds alignés, centrés sur le buste
hs = [f['box'][3] - f['box'][1] for f in frames]
ref_h = np.median([h for f, h in zip(frames, hs) if f['row'] == 0]) if any(f['row'] == 0 for f in frames) else max(hs)
scale = H_OUT / ref_h
for f in frames:
    x0, y0, x1, y1 = f['box']
    im = f['img'].crop(f['box'])
    a = np.asarray(im.getchannel('A')) > 60
    hh = a.shape[0]
    band = a[int(hh * 0.2):int(hh * 0.55)]
    ys, xs = np.nonzero(band)
    f['cx'] = (np.median(xs) if len(xs) else a.shape[1] / 2)   # centre du buste
    f['crop'] = im
left = max(f['cx'] for f in frames); right = max(f['crop'].width - f['cx'] for f in frames)
top = max(f['crop'].height for f in frames)
CW, CH = int((left + right) * scale) + 8, int(top * scale) + 8
os.makedirs(f'{OUT}/sprites_anim/{KEY}', exist_ok=True)
counts = {}
for f in frames:
    im = f['crop'].resize((max(1, int(f['crop'].width * scale)), max(1, int(f['crop'].height * scale))), Image.LANCZOS)
    canvas = Image.new('RGBA', (CW, CH), (0, 0, 0, 0))
    px = int(left * scale - f['cx'] * scale) + 4
    canvas.paste(im, (px, CH - im.height - 4), im)
    name = NAMES[f['row']]
    i = counts.get(name, 0); counts[name] = i + 1
    canvas.save(f'{OUT}/sprites_anim/{KEY}/{name}_{i}.webp', 'WEBP', quality=88, method=6)
idx_path = f'{OUT}/sprites_anim/index.json'
idx = json.load(open(idx_path)) if os.path.exists(idx_path) else {}
idx[KEY] = {'w': CW, 'h': CH, 'pied': CH - 4, 'centre': int(left * scale) + 4, **counts}
json.dump(idx, open(idx_path, 'w'), indent=1)
print('planche découpée :', KEY, counts, f'cadre {CW}x{CH}')
