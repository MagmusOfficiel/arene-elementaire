"""Découpe une planche de pièces détachées (tête, buste, cape, bras, avant-bras, arme, cuisse, tibia)
et les enregistre pour l'animation par squelette.
Usage : python3 tools/decouper_pieces.py client/public fusion planche.png
Les pièces sont repérées automatiquement (taches détourées), rangées par ligne puis de gauche à droite :
  ligne 1 : tete, buste, cape   ·   ligne 2 : bras, avbras, arme   ·   ligne 3 : cuisse, tibia
Sortie : heros/<fusion>/<piece>.webp + heros/index.json (tailles, à la même échelle)
"""
import sys, os, json
import numpy as np
from PIL import Image
from rembg import remove, new_session
from scipy import ndimage

OUT, KEY, SRC = sys.argv[1], sys.argv[2], sys.argv[3]
NOMS = [['tete', 'buste', 'cape'], ['bras', 'avbras', 'arme'], ['cuisse', 'tibia']]
im = Image.open(SRC).convert('RGB')
cut = remove(im, session=new_session('isnet-anime'))
A = np.asarray(cut.getchannel('A'))
mask = A > 50
# on relie les morceaux d'une même pièce (mèches, pans) sans fusionner les pièces voisines
lab, n = ndimage.label(ndimage.binary_closing(mask, iterations=6))
objs = []
for i, sl in enumerate(ndimage.find_objects(lab), start=1):
    ys, xs = sl
    area = (lab[sl] == i).sum()
    if area < mask.size * 0.002: continue
    objs.append({'i': i, 'y0': ys.start, 'y1': ys.stop, 'x0': xs.start, 'x1': xs.stop, 'cy': (ys.start + ys.stop) / 2, 'cx': (xs.start + xs.stop) / 2, 'area': area})
# Attribution : chaque pièce attendue prend la tache la plus proche de sa position dans la planche
W, H = im.size
ATTENDU = {'tete': (0.16, 0.15), 'buste': (0.45, 0.25), 'cape': (0.80, 0.25), 'bras': (0.14, 0.48), 'avbras': (0.47, 0.56),
           'arme': (0.81, 0.66), 'cuisse': (0.20, 0.80), 'tibia': (0.54, 0.80)}
os.makedirs(f'{OUT}/heros/{KEY}', exist_ok=True)
meta, pris = {}, set()
def axe(a):
    """angle de l'axe principal d'une silhouette (degrés, 0 = horizontal)"""
    ys, xs = np.nonzero(a); xs = xs - xs.mean(); ys = ys - ys.mean()
    cov = np.cov(np.vstack([xs, ys])); w, v = np.linalg.eigh(cov); vx, vy = v[:, 1]
    return np.degrees(np.arctan2(vy, vx))
for nom, (fx, fy) in ATTENDU.items():
    best = min((o for o in objs if o['i'] not in pris), key=lambda o: (o['cx'] / W - fx) ** 2 + (o['cy'] / H - fy) ** 2)
    pris.add(best['i'])
    sl = (slice(best['y0'], best['y1']), slice(best['x0'], best['x1']))
    piece = cut.crop((best['x0'], best['y0'], best['x1'], best['y1']))
    a = np.asarray(piece.getchannel('A')).copy(); a[~(lab[sl] == best['i'])] = 0
    piece.putalpha(Image.fromarray(a)); piece = piece.crop(piece.getchannel('A').point(lambda v: 255 if v > 30 else 0).getbbox())
    # les membres doivent pendre verticalement, articulation du haut (épaule, hanche, coude) en haut
    al = np.asarray(piece.getchannel('A')) > 60
    if nom == 'cuisse' or (nom in ('avbras', 'bras', 'tibia') and al.shape[1] > al.shape[0] * 1.15):
        # pièce couchée : l'extrémité gauche (hanche, coude) passe en haut, puis on corrige l'inclinaison
        # extrémités de la pièce le long de son axe : articulation du haut = bout de gauche
        ys, xs = np.nonzero(al); P = np.vstack([xs - xs.mean(), ys - ys.mean()])
        w_, v_ = np.linalg.eigh(np.cov(P)); ax = v_[:, 1]; proj = ax @ P
        lo, hi = proj < np.percentile(proj, 8), proj > np.percentile(proj, 92)
        e1 = np.array([xs[lo].mean(), ys[lo].mean()]); e2 = np.array([xs[hi].mean(), ys[hi].mean()])
        haut, bas = (e1, e2) if e1[0] < e2[0] else (e2, e1)
        th = np.degrees(np.arctan2(bas[1] - haut[1], bas[0] - haut[0]))     # 90 = déjà vertical
        piece = piece.rotate(-(90 - th), expand=True, resample=Image.BICUBIC)
        piece = piece.crop(piece.getchannel('A').point(lambda v: 255 if v > 30 else 0).getbbox())
    if nom == 'cape': piece = piece.transpose(Image.FLIP_LEFT_RIGHT)   # la cape flotte derrière (vers la gauche)
    piece.save(f'{OUT}/heros/{KEY}/{nom}.webp', 'WEBP', quality=90, method=6)
    meta[nom] = {'w': piece.width, 'h': piece.height}
    print(nom, piece.size)
idx_path = f'{OUT}/heros/index.json'
idx = json.load(open(idx_path)) if os.path.exists(idx_path) else {}
idx[KEY] = meta
json.dump(idx, open(idx_path, 'w'), indent=1)
