// =====================================================================
//  LES CLANS ÉLÉMENTAIRES — les fenêtres : parcelle, deck, tirages, expédition, apparence, quêtes
//  (découpé de main.js en v51 ; voir main.js pour le démarrage)
// =====================================================================
import * as MY from '../../../shared/clans/mystere.js';
import * as QP from '../../../shared/clans/quetesPnj.js';
import { PNJ_PAR_ID } from '../../../shared/clans/pnj.js';
import { REPERE } from '../../../shared/clans/reperes.js';
import { NOMS_RESS } from './ui-icones.js';
import * as RQ from '../../../shared/clans/reliques.js';
import { BRANCHES, CARTES, ELEMENTS, CLASSES, RARES, NIV_MAX, decrire } from '../../../shared/clans/cartes.js';
import { TERRITOIRES, PALIERS, MALEDICTIONS, BOSS_CAUCHEMAR } from '../../../shared/clans/monstres.js';
import * as P from '../../../shared/clans/profil.js';
import * as X from '../../../shared/clans/expedition.js';
import { POINTS } from '../../../shared/clans/mondial.js';
import * as Q from '../../../shared/clans/quetes.js';
import * as T from '../../../shared/clans/territoires.js';
import * as AP from '../../../shared/clans/apparence.js';
import { feuillePerso, dessinerAura } from './monde.js';
import { sfx } from '../sfx.js';
import { lancerCombat } from './ui-combat.js';
import { $, ICO_RESS, ILLUS, carteHTML, coutHTML, esc, etoiles, nf, p, statut, texteCarte, toast } from './ui-commun.js';
import { dansMonde, fermer, guide, ouvrir, monde } from './ui-monde.js';
import { faire } from './ui-reseau.js';
import { ouvrirTirage } from './ui-ouverture.js';
import { groupe, panneauGroupe, brancherGroupe, suisChef } from './ui-groupe.js';
import { room } from './ui-commun.js';
import { propsSanct } from './ui-social.js';
import { bonusProjet } from './ui-projets.js';
import * as PS from '../../../shared/clans/passe.js';
import * as DCS from '../../../shared/clans/decksConseilles.js';
import { saisonDe } from '../../../shared/clans/arene.js';
import { annonceFamilier, placerVignettes } from './ui-familiers.js';
import * as PJ from '../../../shared/clans/projets.js';

export const DECOR_PARCELLE = { feu: ['🌋', '🏠', '🔥', '⚒️'], eau: ['🏝️', '🛖', '🐚', '🌊'], plante: ['🌳', '🏡', '🌻', '🌿'] };
// v97 : la vie se garde entre les expéditions ; on la remonte d'un coup en se reposant chez soi
function blocVie() {
  const v = P.vie(p), m = P.pvMax(p), pct = Math.round((v / m) * 100);
  const m0 = monde.maison(), j = monde.joueur, ici = !!j && Math.hypot(j.x - m0.x, j.y - (m0.y + 30)) < 140;
  return `<div class="parcVie ${v < m ? 'blesse' : ''}"><span>❤️ <b>${v} / ${m}</b> PV</span><div class="vieJauge"><i style="width:${pct}%"></i></div>
    ${v >= m ? '<small>En pleine forme</small>' : ici ? '<button class="bouton pulse" id="btReposer">🛌 Se reposer (PV au max)</button>' : '<small>Rentre devant ta maison pour te reposer</small>'}</div>`;
}
export function fenetreParcelle() {
  guide.vu('parcelle');
  statut('parcelle');
  const el = ELEMENTS[p.clan], pr = P.production(p), plein = pr.heures >= P.stockageHeures(p);
  // v85 : parcelle refaite — jauge de réserve dans la scène, bonus en pastilles, bâtiments avec niveaux et coûts lisibles
  const st = P.stockageHeures(p), pct = Math.min(100, (pr.heures / st) * 100), nSanct = T.tenus(propsSanct(), p.clan), bp = bonusProjet('production');
  const coutLisible = (c) => Object.entries(c).map(([k, v]) => `<span class="${(p.ress[k] || 0) >= v ? '' : 'manque'}">${nf(v)} ${ICO_RESS[k] || k}</span>`).join(' ');
  ouvrir(`<h2>🏠 Ta parcelle <small class="parcLieu">${esc(TERRITOIRES[p.clan].nom)}</small></h2>
    <div class="parcActions"><span>🏡 ${p.maisonPos ? 'Maison posée sur ta terre' : 'Maison au village'}</span><button class="lien" id="btDeplacerMaison">${p.maisonPos ? 'Déménager (1 000 ✨)' : 'La poser où tu veux (gratuit la 1re fois)'}</button><button class="lien" id="btDecorer">🎨 Décorer</button></div>
    ${blocVie()}
    <div class="parcelleScene ${p.clan}">${DECOR_PARCELLE[p.clan].map((e, i) => `<span style="font-size:${[70, 96, 48, 56][i]}px">${e}</span>`).join('')}

    </div>
    <div class="parcReserve"><div class="parcJauge ${plein ? 'pleine' : ''}"><i style="width:${pct}%"></i></div>
        <div class="parcProd"><span>⏳ ${pr.heures.toFixed(1)} h / ${st} h${plein ? ' · <b>réserve pleine</b>' : ''}</span><span><b>${nf(pr.essence)}</b> ${ICO_RESS.essence} · <b>${nf(pr[el.materiau])}</b> ${ICO_RESS[el.materiau]}</span></div>
        <button class="bouton ${plein ? 'pulse' : ''}" id="btRecolter" ${pr.essence + pr[el.materiau] < 1 ? 'disabled' : ''}>🧺 Récolter</button></div>
    <div class="parcBonus">${bp ? `<span>${PJ.PROJETS[p.clan].ico} Projet du clan <b>+${Math.round(bp * 100)} %</b></span>` : ''}<span title="Sanctuaires tenus par ton clan">🏳️ ${nSanct} / ${T.SANCTUAIRES.length} sanctuaires${nSanct ? ` <b>+${Math.round(T.bonusProduction(nSanct) * 100)} %</b>` : ' — prends-en pour récolter plus'}</span><span>Produit même quand tu n’es pas là</span></div>
    <div class="batiments">${Object.entries(P.BATIMENTS).map(([k, b]) => {
      const n = p.parcelle[k], nm = P.nivMax(p, k), max = n >= nm, chap = k === 'maison' && max && P.chapitreAFinir(p), cout = max ? null : P.coutBatiment(p, k), ok = cout && Object.entries(cout).every(([r, v]) => (p.ress[r] || 0) >= v);
      return `<div class="batiment"><div class="batTete"><span class="batIco">${b.ico}</span><div><h3>${b.nom}</h3><div class="pips">${Array.from({ length: k === 'maison' ? Math.max(nm, n + (chap ? 1 : 0)) : nm }, (_, i) => `<i class="${i < n ? 'on' : ''}${i >= P.NIV_BAT_MAX ? ' chap' : ''}"></i>`).join('')}</div></div></div>
        <p class="batMaint">${b.desc(n, p.clan)}</p>
        ${chap ? `<p class="batChap">🔒 Niveau ${n + 1} (${esc(b.desc(n + 1, p.clan).split('.')[0])}) : finis l’histoire du <b>${esc(chap.nom)}</b> pour agrandir encore ta maison.</p>` : max ? '<p class="batMax">★ Niveau maximum</p>' : `<p class="batSuiv"><small>Niveau ${n + 1}</small>${b.desc(n + 1, p.clan)}</p><div class="batCout">${coutLisible(cout)}</div><button class="bouton" data-b="${k}" ${ok ? '' : 'disabled title="Ressources insuffisantes"'}>⬆️ Améliorer</button>`}</div>`;
    }).join('')}</div>`, () => {
    $('btDecorer').onclick = () => import('./ui-deco.js').then((m) => m.fenetreDeco());
    const br = $('btReposer'); if (br) br.onclick = async () => { const r = await faire('seReposer'); if (!r.ok) return r.raison && toast(esc(r.raison)); sfx.orb(); toast(`🛌 Bien reposé : <b>+${r.res.soin} PV</b>, te voilà en pleine forme !`); fenetreParcelle(); };
    $('btDeplacerMaison').onclick = () => { fermer(); import('./ui-maison.js').then((m) => m.commencerPlacement()); };
    $('btRecolter').onclick = async () => { const r = await faire('recolter'); if (!r.ok) return r.raison && toast(esc(r.raison)); const g = r.res; sfx.orb(); toast(`+${nf(g.essence)} ${ICO_RESS.essence} · +${nf(g[el.materiau])} ${ICO_RESS[el.materiau]}${g.bonus ? ` (dont +${Math.round(g.bonus * 100)} % de bonus)` : ''}`); fenetreParcelle(); };
    $('fenetreCorps').querySelectorAll('[data-b]').forEach((b) => b.onclick = async () => { const r = await faire('construire', { bat: b.dataset.b }); if (!r.ok) return r.raison && toast(esc(r.raison)); sfx.niveau(); toast(`${P.BATIMENTS[b.dataset.b].nom} : niveau ${r.res.niv} !`); fenetreParcelle(); });
  });
}
export let filtreDeck = 'tous';
// ---------- le deck et l'amélioration des cartes (refaits en v61) ----------
const TYPES = { attaque: '⚔️ Attaques', defense: '🛡️ Défenses', pouvoir: '✨ Pouvoirs' };
function statsDeck() {
  const cartes = p.deck.map((id) => CARTES[id]), n = cartes.length, courbe = [0, 0, 0, 0];
  for (const c of cartes) courbe[Math.min(3, c.cout)]++;
  const types = Object.fromEntries(Object.keys(TYPES).map((t) => [t, cartes.filter((c) => c.type === t).length]));
  const moy = n ? cartes.reduce((x, c) => x + c.cout, 0) / n : 0, max = Math.max(1, ...courbe);
  return `<div class="statsDeck">
    <div class="sdNombre ${n < P.DECK_MIN ? 'manque' : ''}"><b>${n}</b><small>cartes (${P.DECK_MIN} à ${P.DECK_MAX})</small></div>
    <div class="sdCourbe" title="Combien de cartes coûtent 0, 1, 2 ou 3+ énergie">${courbe.map((k, i) => `<div><i style="height:${(k / max) * 100}%"></i><b>${k}</b><small>${i === 3 ? '3+' : i}⚡</small></div>`).join('')}</div>
    <div class="sdTypes">${Object.entries(types).map(([t, k]) => `<span>${TYPES[t]} <b>${k}</b></span>`).join('')}<span>Coût moyen <b>${moy.toFixed(1)}</b> ⚡</span></div>
  </div>`;
}
// pourquoi « + Deck » est grisé
function raisonAjout(id) {
  const c = p.collection[id], k = p.deck.filter((x) => x === id).length;
  if (p.deck.length >= P.DECK_MAX) return `Ton deck est plein (${P.DECK_MAX} cartes) : retire une carte d'abord.`;
  if (k >= P.copiesMax(id)) return P.copiesMax(id) === 1 ? 'Une seule légendaire de chaque sorte par deck.' : `Déjà ${P.COPIES_MAX} exemplaires dans le deck (le maximum).`;
  if (k >= c.n) return `Tous tes exemplaires (×${c.n}) sont déjà dans le deck. Tire-en d'autres à l'autel.`;
  return '';
}
const peutPayer = (cout) => Object.entries(cout).every(([k, v]) => (p.ress[k] || 0) >= v);
// v73 : survoler une ligne du deck montre la carte en grand (comme dans Hearthstone)
function brancherApercu(racine) {
  let bulle = null;
  const cacher = () => { bulle?.remove(); bulle = null; };
  racine.querySelectorAll('[data-apercu]').forEach((l) => {
    l.onmouseenter = () => {
      cacher(); const id = l.dataset.apercu, r = l.getBoundingClientRect();
      bulle = document.createElement('div'); bulle.className = 'apercuCarte';
      bulle.innerHTML = carteHTML(id, p.collection[id]?.niv || 1);
      document.body.append(bulle);
      const h = 300, top = Math.max(8, Math.min(innerHeight - h - 8, r.top + r.height / 2 - h / 2));
      bulle.style.top = `${top}px`; bulle.style.left = `${Math.max(8, r.left - 230)}px`;
    };
    l.onmouseleave = cacher;
  });
  racine.addEventListener('click', cacher);
}
export function fenetreDeck() {
  guide.vu('deck');
  const ids = Object.keys(p.collection).filter((id) => p.collection[id].n > 0 && (filtreDeck === 'tous' || (filtreDeck === 'classe' ? !!CARTES[id].classe : filtreDeck === 'neutre' ? CARTES[id].element === 'neutre' && !CARTES[id].classe : CARTES[id].element === filtreDeck)))
    .sort((a, b) => CARTES[a].element.localeCompare(CARTES[b].element) || CARTES[a].cout - CARTES[b].cout);
  const dansDeck = (id) => p.deck.filter((x) => x === id).length, remise = bonusProjet('remise');
  const lignes = [...new Set(p.deck)].sort((a, b) => CARTES[a].cout - CARTES[b].cout || CARTES[a].nom.localeCompare(CARTES[b].nom)).map((id) => { const c = CARTES[id], img = ILLUS.has(id) ? `background-image:url(${import.meta.env.BASE_URL}clans/cartes/${id}.webp)` : '';
    return `<div class="ligne ${c.element} r-${c.rarete}${c.branche ? ` br-${c.branche}` : ''}${img ? ' aImg' : ''}" data-r="${id}" data-apercu="${id}">
      <span class="artL" style="${img}">${img ? '' : c.ico}</span><span class="cout1">${c.cout}</span><span class="nomL">${esc(c.nom)}</span>${p.collection[id].niv > 1 ? `<span class="nivL">${etoiles(p.collection[id].niv)}</span>` : ''}<span class="nbL">${dansDeck(id) > 1 ? `×${dansDeck(id)}` : c.rarete === 'legendaire' ? '★' : ''}</span><span class="moins" title="Retirer un exemplaire">−</span></div>`; }).join('');
  const nbAmeliorables = ids.filter((id) => { const c = p.collection[id]; return c.niv < NIV_MAX && peutPayer(P.coutAmelioration(id, c.niv, remise)); }).length;
  ouvrir(`<h2>🃏 Ta collection et ton deck</h2>
    <p class="sousTitre">Clique sur <b>+ Deck</b> pour jouer une carte en combat, sur une ligne du deck pour la retirer. <b>Améliore</b> tes cartes avec des éclats ${ICO_RESS.eclats} (tes doublons) et des matériaux : elles deviennent plus fortes partout (expéditions, arène, duels).${remise ? ` <b>${PJ.PROJETS[p.clan].ico} Forge géante : −${Math.round(remise * 100)} % cette semaine.</b>` : ''}</p>
    ${selecteurDeck(true)}
    ${statsDeck()}
    <div class="filtres">${['tous', 'classe', p.clan, 'neutre'].map((f) =>   /* v117 : seulement l'élément de son clan */ `<button data-f="${f}" class="${f === filtreDeck ? 'actif' : ''}">${f === 'tous' ? 'Toutes' : f === 'classe' ? `${CLASSES[p.classe].ico} Classes` : `${ELEMENTS[f].ico} ${ELEMENTS[f].nom}`}</button>`).join('')}${nbAmeliorables ? `<span class="pastilleAm">⬆ ${nbAmeliorables} carte${nbAmeliorables > 1 ? 's' : ''} améliorable${nbAmeliorables > 1 ? 's' : ''}</span>` : ''}</div>
    <div class="deckZone"><div class="grilleCartes">${ids.map((id) => {
      const c = p.collection[id], cout = c.niv < NIV_MAX ? P.coutAmelioration(id, c.niv, remise) : null, k = dansDeck(id), raison = raisonAjout(id), ok = cout && peutPayer(cout);
      return `<div class="carteCol ${k ? 'enDeck' : ''}">${carteHTML(id, c.niv, `<span class="cnb" title="Exemplaires possédés">×${c.n}</span>${k ? `<span class="ruban">Deck ×${k}</span>` : ''}${ok ? '<span class="amPossible" title="Tu peux l’améliorer">⬆</span>' : ''}`)}
        <div class="actions"><button data-a="${id}" ${raison ? `disabled title="${esc(raison)}"` : 'title="Ajouter un exemplaire au deck"'}>+ Deck</button><button data-u="${id}" class="${ok ? 'pret' : ''}" ${cout ? '' : 'disabled title="Niveau maximum atteint"'}>${cout ? '⬆ Améliorer' : `${etoiles(c.niv)} max`}</button></div></div>`;
    }).join('') || '<p>Aucune carte de ce type. Va faire des tirages !</p>'}</div>
    <div class="colDeck"><h3>Ton deck <button class="lien" id="btConseils" title="Des decks tout prêts pour ton clan et ta classe">📋 Decks conseillés</button></h3><div class="listeDeck">${lignes || '<p>Ton deck est vide.</p>'}</div></div></div>`, () => {
    $('fenetreCorps').dataset.vue = 'deck';
    setTimeout(() => import('./ui-coach.js').then((m) => m.tutoDeck()), 350);   // v94 : la 1re fois
    brancherSelecteur(fenetreDeck);
    $('btConseils').onclick = () => fenetreConseils();
    $('fenetreCorps').querySelectorAll('[data-f]').forEach((b) => b.onclick = () => { filtreDeck = b.dataset.f; fenetreDeck(); });
    $('fenetreCorps').querySelectorAll('[data-a]').forEach((b) => b.onclick = async () => { const r = await faire('deckAjouter', { id: b.dataset.a }); if (!r.ok) return r.raison && toast(esc(r.raison)); fenetreDeck(); });
    brancherApercu($('fenetreCorps'));
    $('fenetreCorps').querySelectorAll('[data-r]').forEach((b) => b.onclick = async () => { const r = await faire('deckRetirer', { id: b.dataset.r }); if (!r.ok) return toast(esc(r.raison || 'Impossible.')); fenetreDeck(); });
    $('fenetreCorps').querySelectorAll('[data-u]').forEach((b) => b.onclick = () => panneauAmelioration(b.dataset.u));
  });
}
// ---------- plusieurs decks (v64) : le sélecteur, réutilisé dans le deck, l'expédition et l'arène ----------
export function selecteurDeck(renommer = false) {
  const e = P.emplacements(p);
  return `<div class="selDeck"><span class="selTitre">Deck :</span>${e.l.map((d, i) => `<button class="${i === e.actif ? 'actif' : ''}" data-deck="${i}" title="${i === e.actif ? 'Le deck que tu joues' : d.cartes ? 'Passer à ce deck' : 'Emplacement vide : il commencera comme une copie de ton deck actuel'}">${['⚔️', '🏟️', '💀'][i]} <b>${esc(d.nom)}</b> <small>${d.cartes ? `${d.cartes.length} cartes` : 'vide'}</small>${renommer && i === e.actif ? `<i class="renommer" data-ren="${i}" title="Renommer">✏️</i>` : ''}</button>`).join('')}</div>`;
}
export function brancherSelecteur(apres) {
  $('fenetreCorps').querySelectorAll('[data-deck]').forEach((b) => b.onclick = async (ev) => {
    const i = +b.dataset.deck;
    if (ev.target.closest('[data-ren]')) {
      const champ = document.createElement('input'); champ.className = 'champDeck'; champ.maxLength = 20; champ.value = P.emplacements(p).l[i].nom;
      b.replaceWith(champ); champ.focus(); champ.select();
      const valider = async () => { if (champ.dataset.fait) return; champ.dataset.fait = 1; const r = await faire('deckRenommer', { i, nom: champ.value }); if (!r.ok && r.raison) toast(esc(r.raison)); apres(); };
      champ.onkeydown = (k) => { k.stopPropagation(); if (k.key === 'Enter') valider(); if (k.key === 'Escape') apres(); };
      champ.onblur = valider; return;
    }
    if (b.classList.contains('actif')) return;
    const r = await faire('deckChoisir', { i }); if (!r.ok) return toast(esc(r.raison || 'Impossible.'));
    sfx.melange(); toast(`🃏 Deck « ${esc(P.emplacements(p).l[i].nom)} » prêt (${p.deck.length} cartes).`); apres();
  });
}
// le panneau d'amélioration : la carte maintenant → au niveau suivant, ce qui change, ce que ça coûte
function panneauAmelioration(id, juste = false) {
  const c = p.collection[id], niv = c.niv, cout = niv < NIV_MAX ? P.coutAmelioration(id, niv, bonusProjet('remise')) : null;
  const avant = decrire(id, niv), apres = cout ? decrire(id, niv + 1) : null;
  // ce qui change : on compare les phrases une à une
  const pa = avant.split(/(?<=\.) /), pb = apres ? apres.split(/(?<=\.) /) : [];
  // même phrase avec d'autres nombres : on montre « 4 → 5 »
  const forme = (x) => x.replace(/\d+/g, '#');
  const diff = pb.map((x) => {
    if (pa.includes(x)) return `<li class="pareil">${texteCarte(x)}</li>`;
    const y = pa.find((z) => forme(z) === forme(x));
    if (y) { const na = y.match(/\d+/g), nb = x.match(/\d+/g); let i = 0; return `<li class="mieux">${esc(x).replace(/\d+/g, (n) => { const k = i++; return na[k] !== nb[k] ? `<s>${na[k]}</s> → <b class="nb">${n}</b>` : n; })}</li>`; }
    return `<li class="mieux">${texteCarte(x)} <em>(nouveau)</em></li>`;
  }).join('');
  const fond = document.createElement('div'); fond.className = 'panneauAm';
  fond.innerHTML = `<div class="boiteAm"><button class="fermerAm" title="Fermer">✕</button>
    <h3>⬆ Améliorer ${esc(CARTES[id].nom)}</h3>
    <div class="avantApres"><div>${carteHTML(id, niv)}<small>Niveau ${niv} ${etoiles(niv)}</small></div>
      ${cout ? `<span class="fleche">➜</span><div class="suivante ${juste ? '' : 'apparait'}">${carteHTML(id, niv + 1)}<small>Niveau ${niv + 1} ${etoiles(niv + 1)}</small></div>` : '<div class="maxAtteint">🏆 Niveau maximum atteint</div>'}</div>
    ${cout ? `<div class="changements"><b>Au niveau ${niv + 1} :</b><ul>${diff}</ul></div>
      <div class="coutAm">${Object.entries(cout).map(([k, v]) => { const a = p.ress[k] || 0; return `<span class="${a >= v ? 'ok' : 'manque'}">${ICO_RESS[k]} <b>${nf(v)}</b> <small>(tu as ${nf(a)})</small></span>`; }).join('')}</div>
      <button class="bouton" id="btAmeliorer" ${peutPayer(cout) ? '' : 'disabled'}>${peutPayer(cout) ? `Améliorer au niveau ${niv + 1}` : 'Ressources insuffisantes'}</button>
      ${peutPayer(cout) ? '' : `<p class="cout">Les éclats ${ICO_RESS.eclats} viennent de tes doublons aux tirages ; les matériaux, de ta parcelle et des expéditions${CARTES[id].element !== 'neutre' && CARTES[id].element !== p.clan ? ` (ou du marchand ambulant, qui échange les matériaux des autres clans)` : ''}.</p>`}` : ''}
  </div>`;
  $('fenetreCorps').querySelector('.panneauAm')?.remove();
  $('fenetreCorps').append(fond);
  const fermerP = () => { fond.remove(); fenetreDeck(); };
  fond.querySelector('.fermerAm').onclick = fermerP;
  fond.onclick = (e) => { if (e.target === fond) fermerP(); };
  const bt = fond.querySelector('#btAmeliorer');
  if (bt) bt.onclick = async () => {
    bt.disabled = true;
    const r = await faire('ameliorer', { id }); if (!r.ok) { bt.disabled = false; return r.raison && toast(esc(r.raison)); }
    sfx.niveau(); toast(`⬆ <b>${esc(CARTES[id].nom)}</b> passe au niveau ${r.res.niv} ${etoiles(r.res.niv)} !`);
    panneauAmelioration(id, true);
    fond.querySelector('.avantApres .carte')?.classList.add('ameliore');
  };
}
export function fenetreTirages(resultat = null) {
  statut('tirage');
  ouvrir(`<h2>🔮 L'Autel des tirages</h2><p class="sousTitre">Chaque tirage invoque un sort. Les sorts de ton élément sortent plus souvent. Au-delà de ${P.COPIES_MAX} exemplaires (1 pour une légendaire), un doublon devient des éclats ${ICO_RESS.eclats}.</p>
    <div class="banniere"><span class="orbe">🔮</span><p>Tu as <b>${nf(p.ress.essence)} ${ICO_RESS.essence}</b> · ${p.tirages.total} tirages faits · légendaire garantie dans <b>${60 - p.tirages.depuisLegendaire}</b> tirages</p>
      <button class="bouton" id="bt1" ${p.ress.essence < P.PRIX_TIRAGE ? 'disabled' : ''}>Tirer ×1 — ${P.PRIX_TIRAGE} ${ICO_RESS.essence}</button>
      <button class="bouton" id="bt10" ${p.ress.essence < P.PRIX_TIRAGE_10 ? 'disabled' : ''}>Tirer ×10 — ${P.PRIX_TIRAGE_10} ${ICO_RESS.essence} <small>(une épique au moins)</small></button>
      <p class="taux">Commune 62 % · Rare 27 % · Épique 9 % · Légendaire 2 %</p></div>
    <h3>🏺 Reliques des territoires${bonusProjet('remise') ? ` <small>(${PJ.PROJETS[p.clan].ico} −${Math.round(bonusProjet('remise') * 100)} % cette semaine)</small>` : ''}</h3><p class="sousTitre">Ces cartes ne sortent jamais aux tirages : on les forge avec les ressources rares d'un territoire (filons sur la carte, monstres rares 🌟 et boss en expédition).</p>
    <div class="reliques">${Object.values(CARTES).filter((c) => c.exclusif && P.pourClan(c.id, p.clan)).map((c) => { const cout = P.coutFabrication(c.id, bonusProjet('remise')), n = p.collection[c.id]?.n || 0; return `<div class="carteCol">${carteHTML(c.id, p.collection[c.id]?.niv || 1, n ? `<span class="cnb">×${n}</span>` : '')}<small class="cout">${coutHTML(cout)}</small><button class="bouton" data-fab="${c.id}">Forger</button></div>`; }).join('')}</div>
    ${resultat ? `<div class="grilleCartes resultatTirage">${resultat.map((x, i) => `<div style="position:relative;animation-delay:${i * 0.12}s" class="carteCol">${carteHTML(x.id, p.collection[x.id].niv)}${x.nouveau ? '<span class="nouveau">NOUVEAU</span>' : ''}${x.eclats ? `<small>+${x.eclats} ${ICO_RESS.eclats}</small>` : ''}</div>`).join('')}</div>` : ''}`, () => {
    // v119 : le résultat s'ouvre comme un paquet (ui-ouverture.js), puis la fenêtre montre le récapitulatif
    const t = async (n) => { const rep = await faire('tirer', { n }); if (!rep.ok) return rep.raison && toast(esc(rep.raison)); const r = rep.res; ouvrirTirage(r.cartes, () => fenetreTirages(r.cartes)); };
    $('bt1').onclick = () => t(1); $('bt10').onclick = () => t(10);
    $('fenetreCorps').querySelectorAll('[data-fab]').forEach((b) => b.onclick = async () => { const r = await faire('fabriquer', { id: b.dataset.fab }); if (!r.ok) return toast(esc(r.raison || 'Impossible.')); toast(`🏺 ${CARTES[b.dataset.fab].nom} forgée ! Ajoute-la à ton deck.`); fenetreTirages(); });
  });
}
export function fenetreExpedition(terr) {
  const x = p.expedition;
  if (x && x.territoire !== terr) return ouvrir(`<h2>Expédition en cours</h2><p>Tu es déjà en expédition dans les ${esc(TERRITOIRES[x.territoire].nom)}.</p><button class="bouton" id="btReprendre">Reprendre</button>`, () => { $('btReprendre').onclick = () => fenetreExpedition(x.territoire); });
  if (!x) {
    const max = p.paliers[terr], T = TERRITOIRES[terr];
    return ouvrir(`<h2>${T.ico} ${esc(T.nom)}</h2><p class="sousTitre">Six étages de salles à choisir, puis le boss du territoire. Tes PV se gardent d'un combat à l'autre. Mourir fait perdre la moitié du butin. ${terr === p.clan ? 'C’est ton territoire.' : `Ici, tu récoltes des ${ELEMENTS[terr].nomMat.toLowerCase()} ${ICO_RESS[ELEMENTS[terr].materiau]}, introuvables chez toi.`}</p>
      ${selecteurDeck()}<p class="cout">${p.deck.length} cartes · ❤️ ${P.vie(p)} / ${P.pvMax(p)} PV${P.blesse(p) ? ' <b class="rouge">(blessé : repose-toi chez toi 🏠 avant de partir)</b>' : ''} — le deck choisi reste le même pendant toute l'expédition.</p>
      <div class="paliers">${PALIERS.map((pa) => `<button class="bouton ${pa.n > max ? 'second' : ''} ${pa.cauchemar ? 'boutonCauchemar' : ''}" data-p="${pa.n}" ${pa.n > max ? 'disabled' : ''}>${pa.cauchemar ? '💀 ' : ''}${pa.nom}${pa.n > max ? ' 🔒' : ` — butin ×${pa.butin}`}</button>`).join('')}</div>
      <p class="cout">Bats le boss d'un palier pour débloquer le suivant.</p>
      ${panneauGroupe(terr)}
      <div class="infoCauchemar ${max >= 4 ? '' : 'verrou'}"><b>💀 Le Cauchemar</b> ${max >= 4 ? '' : '(débloqué en battant le boss du Palier III ici)'}<br>Des monstres maudits, <b>2 malédictions</b> tirées au sort à chaque expédition et un titan ancien en guise de boss : <b>${esc(BOSS_CAUCHEMAR[terr].nom)}</b>. Butin ×${PALIERS[3].butin}, et des apparences rares à gagner.
        <div class="listeMal">${Object.values(MALEDICTIONS).map((m) => `<span title="${esc(m.desc)}">${m.ico} ${m.nom}</span>`).join('')}</div></div>`, () => {
      $('fenetreCorps').dataset.vue = 'expedition';
      brancherSelecteur(() => fenetreExpedition(terr)); brancherGroupe();
      $('fenetreCorps').querySelectorAll('[data-p]').forEach((b) => b.onclick = async () => {
        if (groupe) { if (!suisChef()) return toast('C’est le chef du groupe qui choisit le palier.'); return room?.send('groupePartir', { terr, palier: +b.dataset.p }); } const r = await faire('expeCommencer', { terr, palier: +b.dataset.p }); if (!r.ok) return r.raison && toast(esc(r.raison)); statut('expedition'); fenetreExpedition(terr); });
    });
  }
  statut('expedition');
  if (x.choixRelique) return fenetreRelique(x);
  if (x.mystere) return fenetreMystere(x);
  const poss = X.choixPossibles(x), etages = [...x.carte.etages, [x.carte.boss]];
  ouvrir(`<h2>${TERRITOIRES[x.territoire].ico} ${esc(TERRITOIRES[x.territoire].nom)} — ${PALIERS[x.palier - 1].nom}</h2>
    ${x.mods?.length ? `<div class="malsExpe">${x.mods.map((k) => `<span class="malediction">${MALEDICTIONS[k].ico} <b>${MALEDICTIONS[k].nom}</b> — ${esc(MALEDICTIONS[k].desc)}</span>`).join('')}</div>` : ''}
    <div class="etatExpe"><span>❤️ ${x.pv} / ${x.pvMax}</span><span>Butin : ${nf(x.butin.essence)} ${ICO_RESS.essence} · ${nf(x.butin.mat)} ${ICO_RESS[ELEMENTS[x.territoire].materiau]}</span>${reliquesHTML(x.reliques)}<span class="espace" style="flex:1"></span><button class="bouton second" id="btAbandon">Abandonner (moitié du butin)</button></div>
    <p class="sousTitre">Choisis ta prochaine salle (elles brillent). ⚔️ combat · 🌟 monstre rare (${ICO_RESS[RARES[x.territoire].id]}) · 💀 élite · 🏕️ feu de camp · 💎 trésor · ❓ mystère · 👑 boss</p>
    ${groupe ? panneauGroupe(x.territoire) : ''}${x.aTerre ? '<p class="aTerre">💀 Tu es à terre : tu suis ton groupe sans combattre. Le prochain feu de camp te relèvera (30 % de tes PV).</p>' : ''}
    <div class="carteExpe" id="carteExpe"><svg id="liensExpe"></svg>${etages.map((et) => `<div class="etage">${et.map((s) => `<button class="salle ${s.type === 'boss' ? 'boss' : ''} ${poss.includes(s.id) ? 'possible' : ''} ${x.position === s.id ? 'ici' : ''}" data-s="${s.id}" ${poss.includes(s.id) ? '' : 'disabled'} title="${X.SALLES[s.type].nom}">${X.SALLES[s.type].ico}</button>`).join('')}</div>`).join('')}</div>`, () => {
    $('fenetreCorps').dataset.vue = 'expedition'; brancherGroupe();
    $('fenetreCorps').querySelectorAll('[data-s]').forEach((b) => b.onclick = () => (groupe ? (suisChef() ? room?.send('groupeEntrer', { salle: b.dataset.s }) : toast('C’est le chef du groupe qui choisit la salle.')) : entrerSalle(b.dataset.s)));
    $('btAbandon').onclick = async () => { if (!confirm('Abandonner l’expédition ? Tu gardes la moitié du butin.')) return; const r = await faire('expeAbandon'); if (!r.ok) return r.raison && toast(esc(r.raison)); bilanExpedition(r.res); };
    requestAnimationFrame(tracerLiens);
  });
}
// ---------- les salles mystère (v75) ----------
function fenetreMystere(x) {
  const v = MY.vue(x); if (!v) return fenetreExpedition(x.territoire);
  ouvrir(`<div class="mystere"><div class="icoMystere">${v.ico}</div><h2>❓ ${esc(v.nom)}</h2>
    <p class="recit">${esc(v.txt)}</p>
    <p class="etatMystere">❤️ ${x.pv} / ${x.pvMax} · butin : ${nf(x.butin.essence)} ${ICO_RESS.essence}</p>
    <div class="choixMystere">${v.choix.map((c, i) => `<button class="bouton ${c.ok ? '' : 'second'}" data-my="${i}" ${c.ok ? '' : 'disabled title="Pas possible pour l’instant"'}>${esc(c.txt)}</button>`).join('')}</div></div>`, () => {
    $('fenetreCorps').querySelectorAll('[data-my]').forEach((b) => b.onclick = async () => {
      const r = await faire('expeMystere', { i: +b.dataset.my }); if (!r.ok) return toast(esc(r.raison || 'Impossible.'));
      toast(`${v.ico} ${esc(r.res.issue)}`); if (/relique/.test(r.res.issue)) sfx.fanfare(); fenetreExpedition(x.territoire);
    });
  });
}
// ---------- les reliques d'expédition (v59) ----------
export const reliquesHTML = (l) => (l?.length ? `<span class="reliquesExpe">${l.map((id) => `<i title="${esc(RQ.RELIQUES[id].nom)} : ${esc(RQ.RELIQUES[id].desc)}">${RQ.RELIQUES[id].ico}</i>`).join('')}</span>` : '');
function fenetreRelique(x) {
  ouvrir(`<h2>🏺 Une relique pour la route</h2>
    <p class="sousTitre">L'élite vaincu gardait un trésor. Choisis <b>une</b> relique : elle t'accompagne jusqu'à la fin de cette expédition.${x.reliques?.length ? ` Tu as déjà : ${reliquesHTML(x.reliques)}` : ''}</p>
    <div class="choixReliques">${x.choixRelique.map((id) => { const rq = RQ.RELIQUES[id]; return `<button class="relique" data-rq="${id}"><span class="ico">${rq.ico}</span><b>${esc(rq.nom)}</b><small>${esc(rq.desc)}</small><em>${rq.quand === 'combat' ? 'en combat' : 'pour l’expédition'}</em></button>`; }).join('')}</div>
    <p class="cout"><button class="lien" id="btPasserRelique">Passer (40 ${ICO_RESS.essence} à la place)</button></p>`, () => {
    const choisir = async (id) => { const r = await faire('expeRelique', { id }); if (!r.ok) return toast(esc(r.raison || 'Impossible.')); if (id) { sfx.fanfare(); toast(`🏺 <b>${RQ.RELIQUES[id].ico} ${esc(RQ.RELIQUES[id].nom)}</b> t'accompagne.`); } fenetreExpedition(x.territoire); };
    $('fenetreCorps').querySelectorAll('[data-rq]').forEach((b) => b.onclick = () => choisir(b.dataset.rq));
    $('btPasserRelique').onclick = () => choisir(null);
  });
}
export function tracerLiens() {
  const svg = $('liensExpe'), boite = $('carteExpe'); if (!svg || !boite) return;
  const r0 = boite.getBoundingClientRect(), x = p.expedition; let h = '';
  if (!x) return;
  svg.setAttribute('width', r0.width); svg.setAttribute('height', r0.height);
  const centre = (id) => { const b = boite.querySelector(`[data-s="${id}"]`)?.getBoundingClientRect(); return b ? [b.left - r0.left + b.width / 2, b.top - r0.top + b.height / 2] : null; };
  for (const et of x.carte.etages) for (const s of et) for (const v of s.vers) { const a = centre(s.id), b = centre(v); if (a && b) h += `<line x1="${a[0]}" y1="${a[1]}" x2="${b[0]}" y2="${b[1]}" stroke="rgba(232,192,96,.3)" stroke-width="2" stroke-dasharray="5 5"/>`; }
  svg.innerHTML = h;
}
export async function entrerSalle(id) {
  const rep = await faire('expeEntrer', { salle: id }); if (!rep.ok) return rep.raison && toast(esc(rep.raison));
  traiterSalle(id, rep.res);
}
// ce qui se passe dans la salle où l'on vient d'entrer (seul, ou quand le chef du groupe l'a choisie)
export function traiterSalle(id, r) {
  if (!p.expedition) return;
  if (r.aTerre) { toast('💀 Tu es à terre : tes compagnons affrontent cette salle.'); return fenetreExpedition(p.expedition.territoire); }
  if (r.releve) { sfx.niveau?.(); toast(`🏕️ Le feu de camp te relève : ${r.soin} PV !`); return fenetreExpedition(p.expedition.territoire); }
  if (r.type === 'mystere') { sfx.melange?.(); return fenetreMystere(p.expedition); }
  if (r.type === 'repos') { toast(`🏕️ Tu te reposes : +${r.soin} PV`); return fenetreExpedition(p.expedition.territoire); }
  if (r.type === 'tresor') { const rq = r.relique && RQ.RELIQUES[r.relique]; toast(`💎 Trésor : +${r.gain.essence} ${ICO_RESS.essence}, +${r.gain.mat} matériaux${rq ? `, et une relique : <b>${rq.ico} ${esc(rq.nom)}</b> — ${esc(rq.desc)}` : ''}`); if (rq) sfx.fanfare(); return fenetreExpedition(p.expedition.territoire); }
  lancerCombat(X.combatDe(p, id), r.type);
}
export function bilanExpedition(r) {
  const mat = ELEMENTS[r.territoire].materiau;
  statut('libre');
  ouvrir(`<h2>${r.fin === 'victoire' ? '👑 Expédition réussie !' : '💀 Expédition terminée'}</h2>
    <p>${r.fin === 'victoire' ? 'Le boss est tombé.' : 'Tu rentres au village en boitant, avec la moitié de ton butin.'}</p>
    <p class="recolte">Tu ramènes <b>${nf(r.gainTotal.essence)} ${ICO_RESS.essence}</b> et <b>${nf(r.gainTotal[mat])} ${ICO_RESS[mat]}</b>${r.gainTotal[RARES[r.territoire].id] ? ` et <b>${r.gainTotal[RARES[r.territoire].id]} ${ICO_RESS[RARES[r.territoire].id]}</b>` : ''}${r.bonus ? ` <small>(dont +${Math.round(r.bonus * 100)} % du ${PJ.PROJETS.eau.ico} ${PJ.PROJETS.eau.nom})</small>` : ''}</p>
    ${annonceFamilier(r.familier)}
    ${r.pv < r.pvMax ? `<p class="cout">❤️ Tu rentres avec <b>${r.pv} / ${r.pvMax} PV</b>. Ils ne remontent pas tout seuls : repose-toi devant ta maison 🏠 (bouton 🛌).</p>` : ''}
    ${r.debloque ? `<p>🔓 <b>${PALIERS[r.debloque - 1].nom}</b> débloqué dans les ${esc(TERRITOIRES[r.territoire].nom)} !</p>` : ''}
    <button class="bouton" id="btOk">Retour au monde</button>`, () => { placerVignettes(); $('btOk').onclick = fermer; });
}
export let ongletApp = 'tenue', apercuStop = null;
export function vignette(app, dir = 'bas', z = 3) {
  const c = document.createElement('canvas'); c.width = 24 * z; c.height = 26 * z; const g = c.getContext('2d'); g.imageSmoothingEnabled = false;
  g.drawImage(feuillePerso(p.clan, p.classe, app), 0, ['bas', 'haut', 'droite', 'gauche'].indexOf(dir) * 26, 24, 26, 0, 0, 24 * z, 26 * z);
  return c;
}
export const codeAvec = (id) => { const a = { ...AP.portee(p), [AP.PIECES[id].slot]: id }; return `${a.tenue}.${a.cheveux}.${a.chapeau}.${a.aura}.${a.ailes}.${a.arme}.${a.cape}`; };
export function fenetreApparence() {
  apercuStop?.();
  const porte = AP.portee(p), pieces = Object.entries(AP.PIECES).filter(([id, x]) => x.slot === ongletApp && (!x.passe || AP.possede(p, id) || PS.lotDe(saisonDe().id).pieces.includes(id)));
  ouvrir(`<h2>👕 Apparence</h2><p class="sousTitre">Ce que les autres voient sur la carte, en duel et en arène. Certaines pièces s'achètent, d'autres se gagnent.</p>
    <div class="apparence"><div class="apercu"><canvas id="apercuPerso" width="200" height="260"></canvas><small>Ton personnage</small></div>
      <div class="garde"><div class="onglets">${Object.entries(AP.EMPLACEMENTS).map(([k, e]) => `<button class="${k === ongletApp ? 'actif' : ''}" data-o="${k}">${e.ico} ${e.nom}</button>`).join('')}</div>
        <div class="pieces">${pieces.map(([id, x]) => {
          const a = AP.possede(p, id), sur = porte[x.slot] === id, pr = x.cond ? AP.progression(p, x.cond) : null;
          const etat = sur ? '<span class="porte">✓ Portée</span>' : a ? `<button class="bouton" data-porter="${id}">Porter</button>`
            : x.prix ? `<button class="bouton" data-acheter="${id}" ${p.ress.essence < x.prix.essence || (p.ress.eclats || 0) < x.prix.eclats ? 'disabled' : ''}>${x.prix.essence || x.prix.eclats ? `${x.prix.essence ? `${nf(x.prix.essence)} ${ICO_RESS.essence}` : ''}${x.prix.eclats ? ` ${x.prix.eclats} ${ICO_RESS.eclats}` : ''}` : 'Gratuit'}</button>`
            : x.passe ? (() => { const q = PS.quandPiece(id); return `<span class="verrou">🎟️ ${q?.maintenant ? `Ce mois-ci : niveau ${q.niv} du passe de saison` : `Exclusive du passe « ${esc(x.passe)} » : revient dans ${q?.dansMois || '?'} mois (niveau ${q?.niv || '?'})`}</span>`; })()
            : `<span class="verrou" title="${esc(x.cond.txt)}">🔒 ${esc(x.cond.txt)}<i><b style="width:${Math.min(100, (pr.v / x.cond.n) * 100)}%"></b></i><em>${nf(Math.min(pr.v, x.cond.n))} / ${nf(x.cond.n)}</em></span>`;
          return `<div class="piece ${sur ? 'sur' : ''} ${a ? '' : 'pas'} ${x.cond ? 'gagnee' : ''}" data-id="${id}"><div class="vig"></div><b>${esc(x.nom)}</b>${x.cond ? '<small>🏅 à gagner</small>' : x.passe ? '<small>🎟️ exclusive</small>' : ''}${etat}</div>`;
        }).join('')}</div></div></div>`, () => {
    $('fenetreCorps').querySelectorAll('[data-o]').forEach((b) => b.onclick = () => { ongletApp = b.dataset.o; fenetreApparence(); });
    $('fenetreCorps').querySelectorAll('.piece').forEach((d) => { d.querySelector('.vig').append(vignette(codeAvec(d.dataset.id), ongletApp === 'chapeau' ? 'droite' : ongletApp === 'ailes' || ongletApp === 'cape' ? 'haut' : 'bas')); d.onmouseenter = () => { essai = codeAvec(d.dataset.id); }; d.onmouseleave = () => { essai = null; }; });
    $('fenetreCorps').querySelectorAll('[data-porter]').forEach((b) => b.onclick = async () => { const r = await faire('apparencePorter', { id: b.dataset.porter }); if (!r.ok) return r.raison && toast(esc(r.raison)); sfx.orb(); fenetreApparence(); });
    $('fenetreCorps').querySelectorAll('[data-acheter]').forEach((b) => b.onclick = async () => { const x = AP.PIECES[b.dataset.acheter]; if (x.prix.essence > 0 && !confirm(`Acheter « ${x.nom} » ?`)) return; const r = await faire('apparenceAcheter', { id: b.dataset.acheter }); if (!r.ok) return r.raison && toast(esc(r.raison)); sfx.fanfare(); toast(`🎨 ${esc(x.nom)} : c'est à toi !`); fenetreApparence(); });
    // l'aperçu : le personnage qui tourne sur lui-même, avec son aura ; survoler une pièce l'essaie
    let essai = null, vivant = true, t0 = performance.now();
    const cv = $('apercuPerso'), g = cv.getContext('2d'); g.imageSmoothingEnabled = false;
    const boucle = (n) => {
      if (!vivant || !cv.isConnected) return;
      const t = (n - t0) / 1000, code = essai || AP.code(p), dir = ['bas', 'droite', 'haut', 'gauche'][Math.floor(t / 1.2) % 4];
      g.clearRect(0, 0, 200, 260); g.fillStyle = 'rgba(0,0,0,.35)'; g.beginPath(); g.ellipse(100, 236, 54, 10, 0, 0, 6.3); g.fill();
      g.drawImage(feuillePerso(p.clan, p.classe, code), (Math.floor(t * 4) % 2 ? 1 : 0) * 24, ['bas', 'haut', 'droite', 'gauche'].indexOf(dir) * 26, 24, 26, 4, 32, 192, 208);
      g.save(); g.translate(100, 238); g.scale(8, 8); dessinerAura(g, 0, 0, AP.lireCode(code).aura, t, 1); g.restore();
      requestAnimationFrame(boucle);
    };
    requestAnimationFrame(boucle);
    apercuStop = () => { vivant = false; };
  });
  $('fenetreCorps').dataset.vue = 'apparence';
}
$('btApparence').onclick = () => fenetreApparence();
export const recHTML = (r) => `+${nf(r.essence)} ${ICO_RESS.essence} · +${r.eclats} ${ICO_RESS.eclats}`;
export function ligneQuete(x, quel) {
  const d = Q.DEFS[x.id]; if (!d) return '';
  const pct = Math.min(100, (x.n / d.n) * 100), pret = Q.prete(x);
  return `<div class="quete${x.ok ? ' faite' : pret ? ' prete' : ''}"><span class="qIco">${d.ico}</span><div class="qCorps"><b>${esc(d.txt)}</b>
    <div class="qBarre"><i style="width:${pct}%"></i><em>${nf(x.n)} / ${nf(d.n)}</em></div></div>
    <div class="qRec"><small>${recHTML(d.rec)}</small>${x.ok ? '<span class="qOk">✓ Reçue</span>' : `<button class="bouton" data-q="${quel}" ${pret ? '' : 'disabled'}>Réclamer</button>`}</div></div>`;
}
export function dureeAvant(t) { const ms = Math.max(0, t - Date.now()), j = Math.floor(ms / 864e5), h = Math.floor((ms % 864e5) / 36e5), m = Math.floor((ms % 36e5) / 6e4); return j ? `${j} j ${h} h` : `${h} h ${String(m).padStart(2, '0')}`; }
export function fenetreQuetes() {
  guide.vu('quetes');
  const q = Q.etat(p), demain = Date.UTC(...q.jour.split('-').map((n, i) => (i === 1 ? n - 1 : +n))) + 864e5, finSem = Date.UTC(...q.semaine.split('-').map((n, i) => (i === 1 ? n - 1 : +n))) + 7 * 864e5;
  const toutes = q.j.every((x) => x.ok);
  ouvrir(`<h2>📜 Quêtes</h2><p class="sousTitre">Elles avancent toutes seules pendant que tu joues. Réclame la récompense quand une quête est terminée : le clan gagne aussi ${POINTS.quete} points (${POINTS.queteSemaine} pour une quête de la semaine).</p>
    <h3>Aujourd'hui <small class="qTemps">nouvelles quêtes dans ${dureeAvant(demain)}</small></h3>
    <div class="quetes">${q.j.map((x, i) => ligneQuete(x, `j${i}`)).join('')}</div>
    <div class="quete bonus${q.bonus ? ' faite' : Q.bonusPret(q) ? ' prete' : ''}"><span class="qIco">🎁</span><div class="qCorps"><b>Bonus : termine les 3 quêtes du jour</b><div class="qBarre"><i style="width:${(q.j.filter((x) => x.ok).length / 3) * 100}%"></i><em>${q.j.filter((x) => x.ok).length} / 3</em></div></div>
      <div class="qRec"><small>${recHTML(Q.BONUS_JOUR)}</small>${q.bonus ? '<span class="qOk">✓ Reçu</span>' : `<button class="bouton" data-q="bonus" ${Q.bonusPret(q) ? '' : 'disabled'}>Réclamer</button>`}</div></div>
    <h3>Cette semaine <small class="qTemps">fin dans ${dureeAvant(finSem)}</small></h3>
    <div class="quetes">${q.s.map((x, i) => ligneQuete(x, `s${i}`)).join('')}</div>
    ${toutes && q.bonus ? '<p class="cout">Bravo, tout est fait pour aujourd’hui ! Reviens demain.</p>' : ''}
    ${(() => { const l = Object.keys(p.pnjQ || {}).filter((id) => !p.pnjQ[id].fait); const libres = Object.keys(QP.QUETES).filter((id) => !p.pnjQ?.[id]).length;
      // v108 : le titre de la quête, ce qu'il reste à faire, l'XP, et un bouton pour y aller (lieux et objets)
      return `<h3>Quêtes des habitants <small class="qTemps">${libres} encore à découvrir (cherche les « ! » au-dessus des habitants)</small></h3>${l.length ? `<div class="quetes">${l.map((id) => { const q = QP.QUETES[id], n = PNJ_PAR_ID[QP.pnjDe(id)], pr = QP.progres(p, id), et = QP.etat(p, id), xp = QP.xpQuete(p, id);
        const cible = et === 'prete' ? null : q.lieux ? QP.lieuxAVoir(p).find((x) => x.id === id) : q.objets ? QP.objetsAVoir(p).find((x) => x.id === id) : null;
        return `<div class="quete${et === 'prete' ? ' prete' : ''}"><span class="qIco">${q.lieux ? '🗺️' : q.objets ? '🎒' : q.donner ? '📦' : '📜'}</span><div class="qCorps"><b>${esc(q.titre || n.nom)}</b> <small>· ${esc(n.nom)} (${esc(QP.nomTerre(n.clan))})</small><br>${esc(objectifTexte(q))}<div class="qBarre"><i style="width:${pr ? Math.round((pr.n / pr.max) * 100) : et === 'prete' ? 100 : 0}%"></i></div></div><div class="qRec"><small>${et === 'prete' ? `Va voir ${esc(n.nom)} !` : pr ? `${pr.n} / ${pr.max}` : 'à apporter'}</small>${xp ? `<small class="qXp">+${xp} XP</small>` : ''}${cible ? `<button class="lien" data-guide="${cible.x},${cible.y}" data-nom="${esc(cible.nom)}">📍 Y aller</button>` : et === 'prete' ? `<button class="lien" data-pnj="${esc(n.id)}">📍 Le retrouver</button>` : ''}</div></div>`; }).join('')}</div>` : '<p class="cout">Aucune en cours.</p>'}`; })()}`, () => {
    $('fenetreCorps').querySelectorAll('[data-q]').forEach((b) => b.onclick = async () => {
      const r = await faire('quete', { quel: b.dataset.q }); if (!r.ok) return r.raison && toast(esc(r.raison));
      sfx.orb(); toast(`📜 ${recHTML(r.res.rec)}`); fenetreQuetes();
    });
    $('fenetreCorps').querySelectorAll('[data-guide]').forEach((b) => b.onclick = () => { const [x, y] = b.dataset.guide.split(',').map(Number); monde.guider({ x, y, nom: b.dataset.nom }); fermer(); toast(`📍 La flèche te guide vers <b>${esc(b.dataset.nom)}</b>.`); });
    $('fenetreCorps').querySelectorAll('[data-pnj]').forEach((b) => b.onclick = () => { const h = monde.etatCarte().pnj.find((x) => x.n.id === b.dataset.pnj); if (!h) return; monde.guider({ x: h.x, y: h.y, nom: h.n.nom }); fermer(); toast(`📍 La flèche te guide vers <b>${esc(h.n.nom)}</b>.`); });
  });
  $('fenetreCorps').dataset.vue = 'quetes';
}
$('btQuetes').onclick = () => fenetreQuetes();
// v108 : ce qu'une quête d'habitant demande, en une ligne
export function objectifTexte(q) {
  const morceaux = [];
  if (q.lieux) morceaux.push(`Aller voir : ${q.lieux.map((l) => REPERE[l].nom).join(', ')}`);
  if (q.objets) morceaux.push(`Ramasser : ${[...new Set(q.objets.map((o) => o[4]))].join(', ')} (près de : ${REPERE[q.objets[0][0]].nom})`);
  if (q.donner) morceaux.push(`Apporter : ${Object.entries(q.donner).map(([k, v]) => `${nf(v)} ${NOMS_RESS[k] || k}`).join(', ')}`);
  if (q.ev && !q.lieux && !q.objets) morceaux.push(q.txt.split(/(?<=[.!?])\s+/).filter((x) => /\d/.test(x)).at(-1) || q.txt);
  return morceaux.join(' · ') || q.txt;
}
addEventListener('keydown', (e) => { if ((e.key === 'j' || e.key === 'J') && e.target.tagName !== 'INPUT' && dansMonde && $('fenetre').classList.contains('cache') && $('combat').classList.contains('cache') && $('duel').classList.contains('cache')) fenetreQuetes(); });

// ---------- v85 : les decks conseillés ----------
export function fenetreConseils() {
  const l = DCS.conseilles(p.clan, p.classe, p.branche || null), a = (id) => p.collection[id]?.n || 0;
  ouvrir(`<h2>📋 Decks conseillés</h2><p class="sousTitre">Pour le ${esc(ELEMENTS[p.clan].clan)} et la classe ${esc(CLASSES[p.classe]?.nom || '')}${p.branche ? ` (${esc(BRANCHES[p.branche]?.nom || '')})` : ''}. « Utiliser » remplace ton deck actif : les cartes que tu n’as pas encore sont remplacées par tes meilleures cartes pour ce style.</p>
    <div class="conseils">${l.map((d) => {
      const vus = {}, possedees = d.cartes.filter((id) => { vus[id] = (vus[id] || 0) + 1; return vus[id] <= a(id); }).length;
      const uniques = [...new Set(d.cartes)];
      return `<div class="conseil ${d.conseille ? 'top' : ''}"><div class="consTete"><span class="consIco">${d.ico}</span><div><h3>${esc(d.nom)} ${d.conseille ? '<span class="ruban">⭐ Conseillé</span>' : ''}</h3><small>${'●'.repeat(d.diff)}${'○'.repeat(3 - d.diff)} difficulté · ${possedees} / ${d.cartes.length} cartes possédées</small></div></div>
        <p>${esc(d.desc)}</p>
        <div class="consListe">${uniques.map((id) => { const n = d.cartes.filter((x) => x === id).length, ok = a(id) >= n; return `<span class="consCarte r-${CARTES[id].rarete} ${ok ? '' : 'manque'}" data-apercu="${id}" title="${ok ? 'Tu l’as' : 'Pas encore (ou pas assez d’exemplaires)'}"><i>${CARTES[id].cout}</i>${CARTES[id].ico} ${esc(CARTES[id].nom)}${n > 1 ? ` <em>×${n}</em>` : ''}${ok ? '' : ' 🔒'}</span>`; }).join('')}</div>
        <button class="bouton" data-style="${d.style}">Utiliser ce deck</button></div>`;
    }).join('')}</div>`, () => {
    brancherApercu($("fenetreCorps"));
    $('fenetreCorps').querySelectorAll('[data-style]').forEach((b) => b.onclick = async () => {
      const r = await faire('deckConseille', { style: b.dataset.style }); if (!r.ok) return toast(esc(r.raison || 'Impossible.'));
      sfx.melange(); toast(`📋 Deck « ${esc(DCS.STYLES[b.dataset.style].nom)} » appliqué (${r.res.n} cartes)${r.res.manque ? ` : ${r.res.manque} carte${r.res.manque > 1 ? 's' : ''} remplacée${r.res.manque > 1 ? 's' : ''} en attendant de les tirer` : ''}.`);
      fenetreDeck();
    });
  });
}
