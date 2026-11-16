"""Intègre des illustrations de champions dans le jeu.
Usage : python3 tools/integrer_persos.py client/public fusion=chemin.png [fusion=chemin.png ...]
Pour chaque image : détourage (rembg isnet-anime) -> sprites/<fusion>.webp (hauteur 300),
portrait -> portraits/<fusion>.webp, médaillon rond centré sur le visage -> tokens/<fusion>.webp
"""
import sys, os
import numpy as np
from PIL import Image, ImageDraw
from rembg import remove, new_session

OUT = sys.argv[1]
pairs = [a.split('=', 1) for a in sys.argv[2:]]
sess = new_session(os.environ.get('MODELE', 'isnet-anime'))
SEUIL = int(os.environ.get('SEUIL', '40'))  # monter (ex. 110) si un halo de fond reste
for key, path in pairs:
    im = Image.open(path).convert('RGB')
    cut = remove(im, session=sess)
    a = cut.getchannel('A').point(lambda v: 0 if v < SEUIL else v); cut.putalpha(a)
    box = cut.getbbox(); cut = cut.crop(box)
    h = 300; w = round(cut.width * h / cut.height)
    cut.resize((w, h), Image.LANCZOS).save(f'{OUT}/sprites/{key}.webp', 'WEBP', quality=86, method=6)
    p = im.copy(); p.thumbnail((560, 820)); p.save(f'{OUT}/portraits/{key}.webp', 'WEBP', quality=84, method=6)
    # visage : vers le haut de la silhouette (centre des pixels opaques entre 5 et 25 % de la hauteur)
    al = np.asarray(cut.getchannel('A')) > 0
    H = al.shape[0]; band = al[int(H * 0.05): int(H * 0.25)]
    ys, xs = np.nonzero(band)
    cx = box[0] + (int(np.median(xs)) if len(xs) else cut.width // 2)
    size = max(140, int(H * 0.34)); cy = box[1] + int(H * 0.17)
    x0 = max(0, min(im.width - size, cx - size // 2)); y0 = max(0, min(im.height - size, cy - size // 2))
    t = im.crop((x0, y0, x0 + size, y0 + size)).resize((128, 128), Image.LANCZOS).convert('RGBA')
    m = Image.new('L', (128, 128), 0); ImageDraw.Draw(m).ellipse((0, 0, 127, 127), fill=255); t.putalpha(m)
    t.save(f'{OUT}/tokens/{key}.webp', 'WEBP', quality=88, method=6)
    print('intégré', key, flush=True)
