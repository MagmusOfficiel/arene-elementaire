// =====================================================================
//  ZONE MORTE — armes à feu : puissantes, mais on les entend de très loin
// =====================================================================
import { visible } from './physique.js';
import { ZOMBIE } from './zombies.js';

export const FUSILS = {
  pistolet: { portee: 16, degats: [0.7, 1.1], chargeur: 9, munition: 'balles', bruit: 35, cadence: 0.35, precision: 0.72, cone: 0, plombs: 1, recharge: 1.6, usure: 200 },
  fusil: { portee: 8, degats: [0.55, 0.9], chargeur: 6, munition: 'cartouches', bruit: 45, cadence: 1.0, precision: 0.9, cone: 0.32, plombs: 3, recharge: 2.6, usure: 120 },
};

// un tir : renvoie { touches: [{ z, mort }], fin: { x, y } } (fin = où s'arrête la balle, pour le dessin)
export function tirer(horde, joueur, dir, arme, bonusPrecision = 0, r = Math.random) {
  const m = horde.monde, a0 = Math.atan2(dir.y, dir.x), touches = [];
  // la balle s'arrête au premier mur
  let fin = arme.portee;
  for (let d = 0.3; d < arme.portee; d += 0.25) if (m.opaque(joueur.x + Math.cos(a0) * d, joueur.y + Math.sin(a0) * d)) { fin = d; break; }
  const cibles = horde.z.map((z) => {
    const dx = z.x - joueur.x, dy = z.y - joueur.y, d = Math.hypot(dx, dy);
    const da = Math.atan2(Math.sin(Math.atan2(dy, dx) - a0), Math.cos(Math.atan2(dy, dx) - a0));
    const lateral = Math.abs(Math.sin(da) * d);
    return { z, d, da, lateral };
  }).filter(({ z, d, da, lateral }) => d <= fin + 0.3 && Math.abs(da) < Math.PI / 2
    && (arme.cone ? Math.abs(da) < arme.cone || lateral < ZOMBIE.rayon + 0.15 : lateral < ZOMBIE.rayon + 0.15)
    && visible(m, joueur.x, joueur.y, z.x, z.y, arme.portee + 1))
    .sort((a, b) => a.d - b.d).slice(0, arme.plombs);
  for (const { z, d } of cibles) {
    const chance = Math.min(0.97, arme.precision + bonusPrecision - (d / arme.portee) * 0.35 + (z.aTerre > 0 ? -0.1 : 0));
    if (r() > chance) continue;
    z.pv -= arme.degats[0] + r() * (arme.degats[1] - arme.degats[0]);
    const k = Math.atan2(z.y - joueur.y, z.x - joueur.x); horde.glisser(z, Math.cos(k) * 0.3, Math.sin(k) * 0.3);
    if (r() < 0.25) z.aTerre = 1 + r();
    z.etat = 'chasse'; z.vu = { x: joueur.x, y: joueur.y };
    touches.push({ z, mort: z.pv <= 0 });
  }
  horde.z = horde.z.filter((z) => z.pv > 0);
  horde.bruit(joueur.x, joueur.y, arme.bruit);
  const premier = touches.length && !arme.cone ? Math.hypot(touches[0].z.x - joueur.x, touches[0].z.y - joueur.y) : fin;
  return { touches, fin: { x: joueur.x + Math.cos(a0) * premier, y: joueur.y + Math.sin(a0) * premier } };
}
// recharger depuis l'inventaire : renvoie le nombre de munitions mises
export function recharger(s, arme, entree) {
  const def = FUSILS[entree.id]; if (!def) return 0;
  const manque = def.chargeur - (entree.charge || 0); if (manque <= 0) return 0;
  const m = s.inv.find((o) => o.id === def.munition); if (!m) return 0;
  const n = Math.min(manque, m.n); m.n -= n; if (m.n <= 0) s.inv.splice(s.inv.indexOf(m), 1);
  // l'index de l'arme tenue peut glisser si la boîte de munitions était avant elle
  s.arme = s.inv.indexOf(entree);
  entree.charge = (entree.charge || 0) + n;
  return n;
}
