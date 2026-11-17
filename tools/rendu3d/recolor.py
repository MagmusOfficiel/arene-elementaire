from PIL import Image
import colorsys, sys
src, dst = sys.argv[1], sys.argv[2]
im = Image.open(src).convert('RGBA'); px = im.load(); C = 128
def lum(c): return (0.3*c[0]+0.59*c[1]+0.11*c[2])/255
# cellule (col, rang) -> couleur cible (teinte, saturation) et luminosité (facteur)
cible = {}
for c in range(8):
    for r in range(4):
        cible[(c, r)] = ('#5a5052', 1.0)
cible[(0,0)] = ('#b8aaac', 1.0)    # peau -> basalte
cible[(1,3)] = ('#b8aaac', 1.0)
cible[(1,0)] = ('#8a7c7e', 1.0)    # barbe -> roche sombre
cible[(0,1)] = ('#6e6264', 1.0); cible[(1,1)] = ('#6e6264', 1.0); cible[(2,2)] = ('#6e6264', 1.0)   # tissu bleu -> roche
cible[(5,0)] = ('#ff6a1a', 1.3); cible[(6,0)] = ('#ff5a12', 1.3); cible[(5,1)] = ('#ff6a1a', 1.3)  # cuir -> lave
cible[(1,2)] = ('#ff7a1a', 1.3)    # or -> lave
def hexrgb(h): h=h.lstrip('#'); return [int(h[i:i+2],16) for i in (0,2,4)]
for (c, r), (col, k) in cible.items():
    base = hexrgb(col)
    # luminosité moyenne de la cellule d'origine pour garder le dégradé relatif
    vals = [lum(px[x, y]) for x in range(c*C, c*C+C, 8) for y in range(r*C, r*C+C, 8)]
    moy = sum(vals)/len(vals) or 1
    for x in range(c*C, c*C+C):
        for y in range(r*C, r*C+C):
            p = px[x, y]; f = min(1.8, (lum(p)/moy) * k)
            px[x, y] = (min(255, int(base[0]*f)), min(255, int(base[1]*f)), min(255, int(base[2]*f)), p[3])
im.save(dst)
