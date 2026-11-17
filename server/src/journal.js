// Journal des erreurs : les 100 dernières (serveur et navigateurs des joueurs), regroupées par message.
// Consultable sur /api/erreurs (ajoute ?cle=… si la variable JOURNAL_CLE est définie sur Render).
const MAX = 100;
const erreurs = [];

export function noterErreur(ou, err, extra = {}) {
  const msg = String(err?.message || err || 'erreur inconnue').slice(0, 300);
  const pile = String(err?.stack || '').split('\n').slice(0, 6).join('\n').slice(0, 900);
  const deja = erreurs.find((e) => e.ou === ou && e.msg === msg);
  if (deja) { deja.n++; deja.derniere = new Date().toISOString(); return; }
  erreurs.unshift({ ou, msg, pile, n: 1, premiere: new Date().toISOString(), derniere: new Date().toISOString(), ...extra });
  if (erreurs.length > MAX) erreurs.pop();
  console.error(`⚠️  [${ou}] ${msg}`);
}
export const listeErreurs = () => erreurs;
