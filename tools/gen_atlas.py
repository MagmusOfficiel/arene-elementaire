"""Regroupe les images de décor (bâtiments + décors) dans un seul atlas de texture.
Moins de textures différentes = le GPU dessine tout le décor en quelques appels au lieu d'une centaine.
Usage : python3 tools/gen_atlas.py client/public/art
Sortie : art/atlas_decor.webp + art/atlas_decor.json (format Phaser « JSON hash »)
"""
import sys, glob, json, os
from PIL import Image
ART = sys.argv[1]
items = []
for f in sorted(glob.glob(f'{ART}/buildings/b*.webp'), key=lambda p: int(os.path.basename(p)[1:-5])):
    items.append((os.path.basename(f)[:-5], Image.open(f).convert('RGBA')))
for f in sorted(glob.glob(f'{ART}/props/*.webp')):
    items.append(('p_' + os.path.basename(f)[:-5], Image.open(f).convert('RGBA')))
items.sort(key=lambda it: -it[1].height)
PAD = 2
for W in (2048, 2560, 3072, 4096):
    MAXH = 4096
    x = y = rowh = 0; pos = {}; ok = True
    for name, im in items:
        w, h = im.width + PAD * 2, im.height + PAD * 2
        if x + w > W: x = 0; y += rowh; rowh = 0
        if y + h > MAXH: ok = False; break
        pos[name] = (x, y); x += w; rowh = max(rowh, h)
    if ok: break
H = y + rowh
atlas = Image.new('RGBA', (W, H), (0, 0, 0, 0))
frames = {}
for name, im in items:
    px, py = pos[name]
    # bords répétés d'un pixel : évite les liserés quand la texture est agrandie/filtrée
    ext = im.resize((im.width + 2, im.height + 2), Image.NEAREST)
    atlas.paste(ext, (px + PAD - 1, py + PAD - 1)); atlas.paste(im, (px + PAD, py + PAD))
    frames[name] = {'frame': {'x': px + PAD, 'y': py + PAD, 'w': im.width, 'h': im.height}, 'rotated': False, 'trimmed': False,
                    'spriteSourceSize': {'x': 0, 'y': 0, 'w': im.width, 'h': im.height}, 'sourceSize': {'w': im.width, 'h': im.height}}
atlas.save(f'{ART}/atlas_decor.webp', 'WEBP', quality=88, method=6)
json.dump({'frames': frames, 'meta': {'image': 'atlas_decor.webp', 'size': {'w': W, 'h': H}, 'scale': 1}}, open(f'{ART}/atlas_decor.json', 'w'))
print(f'atlas {W}x{H}, {len(items)} images, {os.path.getsize(f"{ART}/atlas_decor.webp") // 1024} Ko')
