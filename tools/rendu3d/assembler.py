"""Assemble les images rendues par rendu.py en animations pour le jeu.
Usage : python3 assembler.py <dossier rendu> <client/public> <fusion>
Retourne les images (le modèle regarde à gauche), recadre toutes les images pareil, sortie en 256x256.
Sortie : sprites_3d/<fusion>/<anim>_<i>.webp + sprites_3d/index.json
"""
import sys, os, glob, json, shutil
from PIL import Image, ImageOps
SRC, OUT, FUSION = sys.argv[1:4]
T = 256
fichiers = sorted(glob.glob(os.path.join(SRC, '*.png')))
imgs = {os.path.basename(f)[:-4]: ImageOps.mirror(Image.open(f).convert('RGBA')) for f in fichiers}
boites = [im.getbbox() for im in imgs.values() if im.getbbox()]
x0 = min(b[0] for b in boites); y0 = min(b[1] for b in boites); x1 = max(b[2] for b in boites); y1 = max(b[3] for b in boites)
cote = max(x1 - x0, y1 - y0) + 8
cx = (x0 + x1) // 2; bas = y1 + 4
cadre = (cx - cote // 2, bas - cote, cx - cote // 2 + cote, bas)
dossier = os.path.join(OUT, 'sprites_3d', FUSION); shutil.rmtree(dossier, ignore_errors=True); os.makedirs(dossier)
compte = {}
for nom, im in imgs.items():
    anim, i = nom.rsplit('_', 1)
    im.crop(cadre).resize((T, T), Image.LANCZOS).save(os.path.join(dossier, f'{anim}_{i}.webp'), quality=88)
    compte[anim] = max(compte.get(anim, 0), int(i) + 1)
k = T / cote
repos = imgs.get('idle_0') or next(iter(imgs.values())); b = repos.getbbox()
entree = {'w': T, 'h': T, 'pied': round((b[3] - cadre[1]) * k), 'centre': round(((b[0] + b[2]) / 2 - cadre[0]) * k), 'perso': round((b[3] - b[1]) * k), **compte}
idx_path = os.path.join(OUT, 'sprites_3d', 'index.json')
idx = json.load(open(idx_path)) if os.path.exists(idx_path) else {}
idx[FUSION] = entree; json.dump(idx, open(idx_path, 'w'), indent=1)
print(FUSION, entree)
