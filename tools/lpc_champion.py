"""Compose un champion en pixel art à partir des calques libres du Universal LPC Spritesheet Generator.

Usage : python3 tools/lpc_champion.py <dossier spritesheets LPC> <dossier client/public> feu+terre
Sortie : sprites_pixel/<fusion>/<anim>_<i>.webp (images x4, sans flou) + sprites_pixel/index.json
Licence des calques : CC BY-SA 3.0 / GPL 3 — les auteurs sont listés dans sprites_pixel/CREDITS.csv.
"""
import sys, os, json, colorsys, shutil
from PIL import Image

LPC, OUT, FUSION = sys.argv[1], sys.argv[2], sys.argv[3]
ECHELLE = 4
# animations du jeu -> (fichier LPC, rangée « vers la droite », nombre d'images à garder)
ANIMS = {'idle': ('idle', 3, None), 'run': ('walk', 3, None), 'atk': ('thrust', 3, None), 'cast': ('spellcast', 3, None), 'hurt': ('hurt', 0, None)}

def hexrgb(h): h = h.lstrip('#'); return tuple(int(h[i:i + 2], 16) for i in (0, 2, 4))

def rampe(img, ancienne, nouvelle):
    """Remplace une rampe de couleurs (du plus clair au plus foncé) par une autre."""
    m = {a: hexrgb(b) for a, b in zip(ancienne, nouvelle)}
    px = img.load()
    for y in range(img.height):
        for x in range(img.width):
            r, g, b, a = px[x, y]
            if a and (r, g, b) in m: px[x, y] = (*m[(r, g, b)], a)
    return img

def teinte(img, dh, ds=1.0, dv=1.0):
    px = img.load()
    for y in range(img.height):
        for x in range(img.width):
            r, g, b, a = px[x, y]
            if not a: continue
            h, s, v = colorsys.rgb_to_hsv(r / 255, g / 255, b / 255)
            r2, g2, b2 = colorsys.hsv_to_rgb((h + dh) % 1, min(1, s * ds), min(1, v * dv))
            px[x, y] = (int(r2 * 255), int(g2 * 255), int(b2 * 255), a)
    return img

def couleurs(img):
    c = [col for n, col in sorted(img.getcolors(100000), reverse=True) if col[3] > 0]
    return sorted({col[:3] for col in c}, key=lambda c: -(0.3 * c[0] + 0.59 * c[1] + 0.11 * c[2]))

# --- Fiches de style (une par champion testé) ---
FICHES = {
    'feu+terre': {   # Magma : peau de basalte aux fissures de lave, cheveux rouges, pantalon sombre
        'calques': [
            ('body/bodies/male', 'peau'), ('head/heads/human/male', 'peau'), ('eyes/human/adult/anger/{anim}/yellow.png', None),
            ('legs/armour/plate/male', 'pantalon'), ('feet/armour/plate/male', 'bottes'), ('hair/spiked/adult', 'cheveux'),
        ],
        # peau claire LPC (du plus clair au plus foncé) -> roche ; le pli le plus foncé devient de la lave
        'peau': ['#74686a', '#575052', '#443c3e', '#342d2f', '#ff7a1a', '#1a1214'],
        'pantalon': ['#ff9a3a', '#4a3b39', '#3a2e2f', '#2b2224', '#1f191b', '#140f10', '#0d0a0b'],
        'bottes': ['#ff9a3a', '#3a3030', '#2c2425', '#211b1c', '#171213', '#0f0b0c', '#0a0708'],
        'cheveux': (-0.035, 1.15, 1.05),
    },
}

def charge(chemin_calque, anim):
    if '{anim}' in chemin_calque: f = os.path.join(LPC, chemin_calque.format(anim=anim))
    else: f = os.path.join(LPC, chemin_calque, f'{anim}.png')
    return Image.open(f).convert('RGBA') if os.path.exists(f) else None

def compose(fiche, anim):
    base = None
    for chemin, style in fiche['calques']:
        im = charge(chemin, anim)
        if im is None: print('  calque manquant :', chemin, anim); continue
        if style in ('peau', 'pantalon', 'bottes'):
            ramp = couleurs(im)
            im = rampe(im, ramp, fiche[style][:len(ramp)] + fiche[style][-1:] * max(0, len(ramp) - len(fiche[style])))
        elif style == 'cheveux': im = teinte(im, *fiche['cheveux'])
        base = im if base is None else Image.alpha_composite(base, im)
    return base

fiche = FICHES[FUSION]
dossier = os.path.join(OUT, 'sprites_pixel', FUSION)
shutil.rmtree(dossier, ignore_errors=True); os.makedirs(dossier)
idx_path = os.path.join(OUT, 'sprites_pixel', 'index.json')
idx = json.load(open(idx_path)) if os.path.exists(idx_path) else {}
entree = {'w': 64 * ECHELLE, 'h': 64 * ECHELLE, 'pixel': True}
for nom, (fichier, rangee, garder) in ANIMS.items():
    sheet = compose(fiche, fichier)
    n = sheet.width // 64
    rangee = min(rangee, sheet.height // 64 - 1)
    images = [sheet.crop((i * 64, rangee * 64, i * 64 + 64, rangee * 64 + 64)) for i in range(n)]
    if nom == 'run': images = images[1:]      # la 1re image de la marche LPC est une pose immobile
    images = [im for im in images if im.getbbox()]
    for i, im in enumerate(images):
        im.resize((64 * ECHELLE, 64 * ECHELLE), Image.NEAREST).save(os.path.join(dossier, f'{nom}_{i}.webp'), lossless=True)
    entree[nom] = len(images)
    if nom == 'idle':
        x0, y0, x1, y1 = images[0].getbbox()
        entree['pied'] = y1 * ECHELLE; entree['centre'] = (x0 + x1) / 2 * ECHELLE; entree['perso'] = (y1 - y0) * ECHELLE
idx[FUSION] = entree
json.dump(idx, open(idx_path, 'w'), indent=1)
# crédits : seulement les lignes des calques utilisés (obligatoire avec CC BY-SA / GPL)
import csv
calques = [c.split('{')[0].rstrip('/') for c, _ in fiche['calques']]
cred_path = os.path.join(OUT, 'sprites_pixel', 'CREDITS.csv')
deja = set()
if os.path.exists(cred_path):
    with open(cred_path, newline='') as f: deja = {tuple(r) for r in csv.reader(f)}
with open(os.path.join(LPC, '..', 'CREDITS.csv'), newline='') as f:
    lignes = list(csv.reader(f))
garde = [lignes[0]] + [r for r in lignes[1:] if any(r and r[0].startswith(c) for c in calques)]
tout = [garde[0]] + sorted({tuple(r) for r in garde[1:]} | {r for r in deja if r != tuple(garde[0])})
with open(cred_path, 'w', newline='') as f: csv.writer(f).writerows(tout)
print(FUSION, entree)
