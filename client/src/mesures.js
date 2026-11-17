// =====================================================================
//  MESURES DE CONFORT (anonymes)
//  Pendant une partie on note les images/s et le ping ; à la fin, un petit
//  résumé part au serveur (/api/mesures). Aucune donnée personnelle :
//  seulement le mode, la durée, les FPS, le ping, le type d'appareil.
// =====================================================================
const menuPret = Math.round(performance.now());   // ms entre l'ouverture de la page et le menu prêt
let cur = null;
let menuEnvoye = false;

const mediane = (a) => { if (!a.length) return null; const s = [...a].sort((x, y) => x - y); return s[Math.floor(s.length / 2)]; };
const centile = (a, p) => { if (!a.length) return null; const s = [...a].sort((x, y) => x - y); return s[Math.floor((s.length - 1) * p)]; };

export function debutPartie(mode, enLigne, url, version) {
  cur = { mode, enLigne, url, version, t0: performance.now(), attente: null, fps: [], ping: [] };
}
// la scène de jeu est affichée : temps écoulé depuis le clic sur « Jouer »
export function scenePrete() { if (cur && cur.attente == null) cur.attente = Math.round(performance.now() - cur.t0); }
export function noterFps(n) { if (cur && n > 0 && n < 400) cur.fps.push(n); }
export function noterPing(ms) { if (cur?.enLigne && ms > 0 && ms < 3000) cur.ping.push(ms); }

export function finPartie() {
  const c = cur; cur = null;
  if (!c) return;
  const duree = Math.round((performance.now() - c.t0) / 1000);
  if (duree < 20 || !c.fps.length) return;   // partie trop courte : pas représentative
  const corps = {
    version: c.version, mode: c.mode, enLigne: c.enLigne, duree,
    fps: mediane(c.fps), fpsBas: centile(c.fps, 0.1), ping: mediane(c.ping), attente: c.attente,
    menu: menuEnvoye ? null : menuPret,
    appareil: /Mobi|Android|iPad|iPhone/i.test(navigator.userAgent) ? 'telephone' : 'ordinateur',
    ecran: `${screen.width}x${screen.height}`,
  };
  menuEnvoye = true;
  try {
    fetch(`${c.url}/api/mesures`, { method: 'POST', keepalive: true, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(corps) }).catch(() => {});
  } catch (e) { /* tant pis */ }
}
// onglet fermé en pleine partie : on envoie quand même
addEventListener('pagehide', finPartie);
