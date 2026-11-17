// Mesures de confort envoyées par les navigateurs en fin de partie (FPS, ping, temps d'attente).
// Gardées en mémoire (500 dernières), résumées sur /api/mesures (?cle=… si JOURNAL_CLE est défini).
const MAX = 500;
const liste = [];
const num = (v, min, max) => (Number.isFinite(Number(v)) && Number(v) >= min && Number(v) <= max ? Math.round(Number(v)) : null);

export function noterMesure(b, version) {
  if (!b || typeof b !== 'object') return;
  const m = {
    t: Date.now(),
    version: num(b.version, 0, 1e6) ?? version,
    mode: String(b.mode || '?').slice(0, 12),
    enLigne: !!b.enLigne,
    duree: num(b.duree, 0, 86400),
    fps: num(b.fps, 1, 400), fpsBas: num(b.fpsBas, 1, 400),
    ping: num(b.ping, 1, 3000), attente: num(b.attente, 0, 600000), menu: num(b.menu, 0, 600000),
    appareil: b.appareil === 'telephone' ? 'telephone' : 'ordinateur',
    ecran: String(b.ecran || '').slice(0, 12),
  };
  if (m.fps == null) return;
  liste.unshift(m);
  if (liste.length > MAX) liste.pop();
}

const mediane = (a) => { const s = a.filter((v) => v != null).sort((x, y) => x - y); return s.length ? s[Math.floor(s.length / 2)] : null; };
function resume(l) {
  return {
    parties: l.length,
    fps: mediane(l.map((m) => m.fps)),
    partiesSaccadees: l.length ? `${Math.round((100 * l.filter((m) => m.fpsBas != null && m.fpsBas < 30).length) / l.length)} %` : null,
    ping: mediane(l.filter((m) => m.enLigne).map((m) => m.ping)),
    attenteAvantJeu: mediane(l.map((m) => m.attente)),
    menuPret: mediane(l.map((m) => m.menu)),
  };
}
export function resumeMesures() {
  return {
    total: resume(liste),
    ordinateur: resume(liste.filter((m) => m.appareil === 'ordinateur')),
    telephone: resume(liste.filter((m) => m.appareil === 'telephone')),
    unites: 'fps = images/s (médiane) · partiesSaccadees = parties dont les 10 % pires moments sont sous 30 img/s · ping, attenteAvantJeu (clic sur Jouer → arène affichée) et menuPret en ms',
    dernieres: liste.slice(0, 20),
  };
}
