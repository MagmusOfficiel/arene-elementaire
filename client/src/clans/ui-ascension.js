// =====================================================================
//  LES CLANS ÉLÉMENTAIRES — l'Ascension (v69)
//  Niveau 20 : l'Épreuve d'ascension (combat contre la Chimère), puis le
//  choix d'une des 2 branches de sa classe. Les 6 sorts de la branche
//  n'entrent dans les tirages de l'autel que pour elle.
// =====================================================================
import { BRANCHES, CARTES, CLASSES, NIV_ASCENSION, branchesDe } from '../../../shared/clans/cartes.js';
import * as AS from '../../../shared/clans/ascension.js';
import { sfx } from '../sfx.js';
import { $, carteHTML, coutHTML, esc, niveau, p, toast } from './ui-commun.js';
import { dansMonde, menuBarre, ouvrir } from './ui-monde.js';
import { faire } from './ui-reseau.js';
import { lancerCombat } from './ui-combat.js';

// un clic de confirmation (pas de boîte de dialogue du navigateur) : le 1er clic arme le bouton
function confirmerDouble(b) { if (b.dataset.arme) return true; b.dataset.arme = '1'; b.textContent = '⚠️ Sûr ? Clique encore pour confirmer'; setTimeout(() => { if (b.isConnected) { delete b.dataset.arme; } }, 4000); return false; }
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
    const autre = branchesDe(p.classe).find((b) => b !== p.branche), np = p.parchemins || 0;
    corps = `<p class="sousTitre">Tu as choisi ta voie. Les sorts de ta branche sortent à l’autel (comme les autres cartes, selon leur rareté).</p>
      <div class="branchesAsc">${blocBranche(p.branche, { moi: true })}</div>
      <div class="parchemin">
        <h3>📜 Changer de branche</h3>
        <p>Le <b>Parchemin de réorientation</b> te fait passer à l’autre branche de ta classe. Les sorts de ton ancienne branche deviennent des éclats (leur valeur de rareté × exemplaires × niveau). Tu en as <b>${np}</b>.</p>
        <p class="cout">Fabriquer : ${coutHTML(AS.COUT_PARCHEMIN)} <button class="bouton" id="btFabParch">Fabriquer un parchemin</button></p>
        ${np > 0 ? `<button class="bouton" id="btChanger">Utiliser un parchemin : devenir ${esc(BRANCHES[autre].nom)} ${BRANCHES[autre].ico}</button>` : ''}
      </div>
      <details class="autreBranche"><summary>Voir l’autre branche : ${BRANCHES[autre].ico} ${esc(BRANCHES[autre].nom)}</summary><div class="branchesAsc">${blocBranche(autre)}</div></details>`;
  }
  ouvrir(`<div class="ascension"><h2>🌟 Ascension · ${cl.ico} ${esc(cl.nom)}${p.branche ? ` ${BRANCHES[p.branche].ico} ${esc(BRANCHES[p.branche].nom)}` : ''}</h2>${corps}</div>`);
  $('fenetreCorps').dataset.vue = 'ascension';
  const bt = $('btEpreuve');
  if (bt) bt.onclick = async () => {
    const r = await faire('ascensionDebut', {});
    if (!r.ok) return toast(esc(r.raison || 'Impossible.'));
    lancerCombat({ ...AS.defEpreuve(p), graine: r.res.graine }, 'ascension');
  };
  if ($('btFabParch')) $('btFabParch').onclick = async () => {
    const r = await faire('parcheminFabriquer', {}); if (!r.ok) return toast(esc(r.raison || 'Impossible.'));
    sfx.niveau?.(); toast('📜 Parchemin de réorientation fabriqué.'); setTimeout(fenetreAscension, 200);
  };
  if ($('btChanger')) $('btChanger').onclick = async () => {
    const b = branchesDe(p.classe).find((x) => x !== p.branche);
    if (!confirmerDouble($('btChanger'))) return;
    const r = await faire('ascensionChanger', { b }); if (!r.ok) return toast(esc(r.raison || 'Impossible.'));
    sfx.fanfare?.(); toast(`🌟 Tu deviens <b>${esc(BRANCHES[b].nom)}</b> !${r.res.n ? ` Tes ${r.res.n} sorts de l’ancienne branche sont devenus ${r.res.eclats} éclats.` : ''}`); setTimeout(fenetreAscension, 300);
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
  if (rep.res.victoire) { sfx.fanfare?.(); import('./crazygames.js').then((m) => m.cg.fete()); toast('🌟 Épreuve réussie ! Choisis ta branche.'); }
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
