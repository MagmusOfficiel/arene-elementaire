// =====================================================================
//  RÉGLAGES DU JOUEUR (gardés dans le navigateur)
//  qualite : auto | haut | moyen | bas   — interface : échelle de l'interface en jeu
//  joystick : zone morte du joystick tactile (plus petit = plus sensible)
// =====================================================================
const DEFAUT = { qualite: 'auto', ping: true, fps: false, interface: 1, joystick: 0.38, vibration: true, styleChamps: 'auto', testChamp: '', secousses: 'normales' };
let r = { ...DEFAUT };
try { Object.assign(r, JSON.parse(localStorage.getItem('reglages')) || {}); } catch { /* réglages par défaut */ }
const ecouteurs = [];
export const reglages = r;
export function changerReglage(k, v) {
  r[k] = v;
  try { localStorage.setItem('reglages', JSON.stringify(r)); } catch { /* stockage indisponible */ }
  appliquerInterface();
  ecouteurs.forEach((f) => f(k, v));
}
export const surReglage = (f) => ecouteurs.push(f);
// Échelle de l'interface en jeu (variable CSS utilisée par le HUD)
export function appliquerInterface() { document.documentElement.style.setProperty('--ui', String(r.interface || 1)); }
appliquerInterface();
// Multiplicateur de particules selon la qualité
export const fxMul = () => ({ bas: 0.35, moyen: 0.65 }[r.qualite] ?? 1);
