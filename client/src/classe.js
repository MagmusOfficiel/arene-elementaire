// Cote du mode classé gardée dans le navigateur (le serveur, s'il est en ligne, fait foi)
import { SAISON, rangDe, RANGS, saisonDe, resetDoux } from '../../shared/classe.js';
import { progress } from './progress.js';

const K = 'classe';
const load = () => { try { return JSON.parse(localStorage.getItem(K)) || {}; } catch { return {}; } };
const d = { cote: SAISON.depart, parties: 0, victoires: 0, meilleure: SAISON.depart, ...load() };
if (!d.jeton) d.jeton = (crypto.randomUUID?.() || Math.random().toString(36).slice(2) + Date.now().toString(36)).slice(0, 36);
d.recompensees ||= [];
const save = () => localStorage.setItem(K, JSON.stringify(d));

// Récompense de fin de saison (une seule fois par saison) selon le meilleur rang atteint
function recompenser(saison, meilleure) {
  if (d.recompensees.includes(saison)) return;
  d.recompensees.push(saison);
  progress.recompenseSaison(saison, rangDe(meilleure).nom);
}
// Nouvelle saison : récompense de la précédente puis remise à mi-chemin de 1000
function changementSaison() {
  const cur = saisonDe().n;
  if (!d.saison) d.saison = cur;
  if (d.saison < cur) {
    if (d.parties > 0) recompenser(d.saison, d.meilleure);
    Object.assign(d, { cote: resetDoux(d.cote), parties: 0, victoires: 0, saison: cur });
    d.meilleure = d.cote;
  }
}
changementSaison();
save();

export const classe = {
  get cote() { return d.cote; },
  get jeton() { return d.jeton; },
  get data() { return d; },
  set(cote, place) {
    changementSaison();
    d.cote = cote; d.meilleure = Math.max(d.meilleure, cote);
    if (place) { d.parties++; if (place === 1) d.victoires++; }
    save();
  },
  sync(srv) {
    changementSaison();
    if (srv?.precedente?.parties > 0) recompenser(srv.precedente.saison, srv.precedente.meilleure);
    if (srv && Number.isFinite(srv.cote) && (srv.saison || d.saison) === d.saison) Object.assign(d, { cote: srv.cote, parties: srv.parties, victoires: srv.victoires, meilleure: Math.max(d.meilleure, srv.meilleure || 0) });
    save();
  },
};

const esc = (s) => String(s).replace(/[<>&]/g, '');
export function badge(cote, small = false) {
  const R = rangDe(cote);
  return `<span class="rang ${small ? 'sm' : ''}" style="--rc:${R.css}">${R.icone} ${R.label}</span>`;
}

// Carte « Classé » du menu : rang, progression, place, top de la saison
export function renderClasse(el, top = null, place = null, palm = null) {
  changementSaison();
  const R = rangDe(d.cote), next = RANGS[R.i + 1], S = saisonDe(), reste = Math.max(0, S.fin - Date.now());
  const j = Math.floor(reste / 864e5), h = Math.floor((reste % 864e5) / 36e5);
  const pic = rangDe(d.meilleure);
  el.innerHTML = `<div class="rk-h"><span>⚔ CLASSÉ · ${SAISON.nom.toUpperCase()}</span><span>${place ? `#${place} mondial · ` : ''}fin dans ${j ? `${j} j ` : ''}${h} h</span></div>
    <div class="rk-main">${badge(d.cote)}<b>${d.cote}</b><small>points</small></div>
    <div class="bar"><i style="width:${Math.round(R.prog * 100)}%;background:${R.css}"></i></div>
    <div class="rk-rec">${d.parties ? `🎁 Récompense de fin de saison : cadre ${pic.icone} ${pic.nom} + titre « ${pic.nom} · ${S.nom} »${['Platine', 'Diamant', 'Maître'].includes(pic.nom) ? ' + couleur de nom' : ''}` : '🎁 Joue au moins un tournoi classé pour gagner un cadre et un titre de fin de saison'}</div>
    <div class="rk-sub">${next ? `Prochain palier : ${R.div === 'I' ? next.nom : `${R.nom} ${R.div === 'III' ? 'II' : 'I'}`}` : 'Rang maximal atteint'} · ${d.parties} tournois classés · ${d.victoires} 🏆 · record ${d.meilleure}</div>
    ${(() => { const n = palm && Math.max(0, ...Object.keys(palm).map(Number)); const L = n && palm[n]; return L?.length ? `<details><summary>🏆 Champions de la Saison ${n}</summary>${L.slice(0, 5).map((r, i) => `<div class="row"><span>${['🥇', '🥈', '🥉', '4.', '5.'][i]} <b>${esc(r.nom)}</b></span><span>${badge(r.cote, true)} ${r.cote}</span></div>`).join('')}</details>` : ''; })()}
    ${top?.length ? `<details><summary>Top de la saison</summary>${top.slice(0, 10).map((r, i) => `<div class="row"><span>${i + 1}. <b>${esc(r.nom)}</b></span><span>${badge(r.cote, true)} ${r.cote}</span></div>`).join('')}</details>` : ''}`;
}
