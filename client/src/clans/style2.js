// =====================================================================
//  LES CLANS ÉLÉMENTAIRES — le « nouveau style » (v112)
//  Il est là par défaut. L'ancien style reste disponible (menu ☰ → Ancien style,
//  ou l'adresse ?style=ancien ; ?style=nouveau pour revenir).
//  Il change l'accueil (écran « Jouer » illustré, création en un écran),
//  le rendu du monde (plus grand, sol adouci, lumière) et l'interface
//  (plus aérée, débloquée au fil des premiers pas).
// =====================================================================
const CLE = 'clansStyle';
const lire = () => { try { return localStorage.getItem(CLE) !== 'ancien'; } catch { return true; } };
const ecrire = (nouveau) => { try { if (nouveau) localStorage.removeItem(CLE); else localStorage.setItem(CLE, 'ancien'); } catch { /* rien */ } };

try {
  const q = new URLSearchParams(location.search).get('style');
  if (q === 'nouveau' || q === '2') ecrire(true);
  else if (q === 'ancien' || q === '1') ecrire(false);
} catch { /* rien */ }

export const style2 = lire();
if (style2) document.documentElement.classList.add('style2');

// bascule et recharge (le rendu du monde se prépare au démarrage)
export function basculerStyle() { ecrire(!style2); location.reload(); }
