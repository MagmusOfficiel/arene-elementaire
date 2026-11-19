// =====================================================================
//  LES CLANS ÉLÉMENTAIRES — l'Ascension (v69)
//  Niveau 20 : l'Épreuve d'ascension (combat contre la Chimère), puis le
//  choix d'une des 2 branches de sa classe. Les 6 sorts de la branche
//  n'entrent dans les tirages de l'autel que pour elle.
// =====================================================================
import { BRANCHES, CARTES, CLASSES, NIV_ASCENSION, branchesDe } from '../../../shared/clans/cartes.js';
import * as AS from '../../../shared/clans/ascension.js';
import { sfx } from '../sfx.js';
import { $, carteHTML, esc, niveau, p, toast } from './ui-commun.js';
import { dansMonde, menuBarre, ouvrir } from './ui-monde.js';
import { faire } from './ui-reseau.js';
import { lancerCombat } from './ui-combat.js';

const ORDRE = { rare: 0, epique: 1, legendaire: 2 };
const sortsDe = (b) => Object.values(CARTES).filter((c) => c.branche === b).sort((x, y) => ORDRE[x.rarete] - ORDRE[y.rarete] || x.cout - y.cout);

function blocBranche(b, { choix = false, moi = false } = {}) {
  const B = BRANCHES[b];
  return `<div class="brancheAsc ${moi ? 'choisie' : ''}">
    <h3>${B.ico} ${esc(B.nom)}</h3>
    <p class="talentAsc"><b>${esc(B.talent)}</b> : ${esc(B.desc)}</p>
    <div class="cartesAsc">${sortsDe(b).map((c) => carteHTML(c.id, 1)).join('')}</div>
    ${choix ? `<button class="bouton" data-branche="${b}">Devenir ${esc(B.nom)}</button>` : ''}
  </div>`;
}

export function fenetreAscension() {
  if (!p?.classe) return;
  const cl = CLASSES[p.classe], et = AS.etat(p), n = niveau();
  let corps = '';
  if (et === 'verrou') {
    corps = `<p class="sousTitre">Au <b>niveau ${NIV_ASCENSION}</b>, l’Épreuve d’ascension s’ouvre. Bats la Chimère de l’ascension et choisis la voie de ton ${esc(cl.nom)} : un nouveau talent, et 6 sorts plus puissants qui n’apparaissent à l’autel <b>que pour ta branche</b>.</p>
      <div class="progAsc"><i style="width:${Math.min(100, (n / NIV_ASCENSION) * 100)}%"></i></div><p>Niveau ${n} / ${NIV_ASCENSION} <small>(gagne des combats et bats des boss pour monter)</small></p>
      <div class="branchesAsc">${branchesDe(p.classe).map((b) => blocBranche(b)).join('')}</div>`;
  } else if (et === 'epreuve') {
    corps = `<p class="sousTitre">Tu es prêt. Bats la gardienne de l’Épreuve avec ton deck actuel pour débloquer le choix de ta branche. Si tu perds, tu peux retenter autant de fois que tu veux.</p>
      <div class="gardienAsc"><img src="${import.meta.env.BASE_URL}clans/monstres/chimere.webp" alt=""><div><b>${esc(AS.GARDIEN.nom)}</b><br>${AS.GARDIEN.pv} PV · frappe fort, se protège et affaiblit.<br><button class="bouton" id="btEpreuve">⚔️ Affronter l’épreuve</button></div></div>
      <div class="branchesAsc">${branchesDe(p.classe).map((b) => blocBranche(b)).join('')}</div>`;
  } else if (et === 'choix') {
    corps = `<p class="sousTitre">Épreuve réussie ! Choisis ta branche. Tu gardes ta classe, son talent et ses cartes : la branche s’y ajoute. <b>Ce choix ne pourra être changé que grâce à un objet rare, plus tard.</b></p>
      <div class="branchesAsc">${branchesDe(p.classe).map((b) => blocBranche(b, { choix: true })).join('')}</div>`;
  } else {
    corps = `<p class="sousTitre">Tu as choisi ta voie. Les sorts de ta branche sortent à l’autel (comme les autres cartes, selon leur rareté).</p>
      <div class="branchesAsc">${blocBranche(p.branche, { moi: true })}</div>`;
  }
  ouvrir(`<div class="ascension"><h2>🌟 Ascension · ${cl.ico} ${esc(cl.nom)}${p.branche ? ` ${BRANCHES[p.branche].ico} ${esc(BRANCHES[p.branche].nom)}` : ''}</h2>${corps}</div>`);
  $('fenetreCorps').dataset.vue = 'ascension';
  const bt = $('btEpreuve');
  if (bt) bt.onclick = async () => {
    const r = await faire('ascensionDebut', {});
    if (!r.ok) return toast(esc(r.raison || 'Impossible.'));
    lancerCombat({ ...AS.defEpreuve(p), graine: r.res.graine }, 'ascension');
  };
  $('fenetreCorps').querySelectorAll('[data-branche]').forEach((b) => b.onclick = async () => {
    const r = await faire('ascensionChoisir', { b: b.dataset.branche });
    if (!r.ok) return toast(esc(r.raison || 'Impossible.'));
    sfx.fanfare?.(); toast(`🌟 Tu deviens <b>${esc(BRANCHES[b.dataset.branche].nom)}</b> ! Ses sorts entrent dans tes tirages.`);
    setTimeout(fenetreAscension, 300);
  });
}
export function apresEpreuve(rep) {
  if (!rep?.ok) { toast(esc(rep?.raison || 'Épreuve refusée par le serveur.')); return fenetreAscension(); }
  if (rep.res.victoire) { sfx.fanfare?.(); toast('🌟 Épreuve réussie ! Choisis ta branche.'); }
  else toast('💀 La Chimère t’a vaincu. Renforce ton deck et retente !');
  setTimeout(fenetreAscension, 400);
}
// prévenir une fois quand l'Épreuve s'ouvre
let prevenu = false;
export function suivreAscension() {
  if (!p || prevenu || AS.etat(p) !== 'epreuve') return;
  prevenu = true; $('pastilleA')?.classList.remove('cache');
  toast(`🌟 Niveau ${NIV_ASCENSION} atteint : l’<b>Épreuve d’ascension</b> est ouverte ! Menu ☰ → Ascension (touche U).`);
}
$('btAscension').onclick = () => { $('pastilleA')?.classList.add('cache'); fenetreAscension(); };
addEventListener('keydown', (e) => { if ((e.key === 'u' || e.key === 'U') && e.target.tagName !== 'INPUT' && dansMonde && $('fenetre').classList.contains('cache') && $('combat').classList.contains('cache') && $('duel').classList.contains('cache')) { menuBarre(false); fenetreAscension(); } });
