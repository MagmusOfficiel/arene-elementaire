// =====================================================================
//  LES CLANS ÉLÉMENTAIRES — les fenêtres : parcelle, deck, tirages, expédition, apparence, quêtes
//  (découpé de main.js en v51 ; voir main.js pour le démarrage)
// =====================================================================
import { CARTES, ELEMENTS, CLASSES, RARES, NIV_MAX } from '../../../shared/clans/cartes.js';
import { TERRITOIRES, PALIERS, MALEDICTIONS, BOSS_CAUCHEMAR } from '../../../shared/clans/monstres.js';
import * as P from '../../../shared/clans/profil.js';
import * as X from '../../../shared/clans/expedition.js';
import { POINTS } from '../../../shared/clans/mondial.js';
import * as Q from '../../../shared/clans/quetes.js';
import * as T from '../../../shared/clans/territoires.js';
import * as AP from '../../../shared/clans/apparence.js';
import { feuillePerso, dessinerAura } from './monde.js';
import { sfx } from '../sfx.js';
import { progress } from '../progress.js';
import { lancerCombat } from './ui-combat.js';
import { $, ICO_RESS, carteHTML, coutHTML, esc, nf, p, statut, toast } from './ui-commun.js';
import { dansMonde, fermer, guide, ouvrir } from './ui-monde.js';
import { faire } from './ui-reseau.js';
import { propsSanct } from './ui-social.js';
import { bonusProjet } from './ui-projets.js';
import * as PS from '../../../shared/clans/passe.js';
import { saisonDe } from '../../../shared/clans/arene.js';
import { annonceFamilier, placerVignettes } from './ui-familiers.js';
import * as PJ from '../../../shared/clans/projets.js';

export const DECOR_PARCELLE = { feu: ['🌋', '🏠', '🔥', '⚒️'], eau: ['🏝️', '🛖', '🐚', '🌊'], plante: ['🌳', '🏡', '🌻', '🌿'] };
export function fenetreParcelle() {
  guide.vu('parcelle');
  statut('parcelle');
  const el = ELEMENTS[p.clan], pr = P.production(p), plein = pr.heures >= P.stockageHeures(p);
  ouvrir(`<h2>🏠 Ta parcelle</h2><p class="sous-titre sousTitre">Dans les ${esc(TERRITOIRES[p.clan].nom)}. Ta parcelle produit même quand tu n'es pas là, jusqu'à ${P.stockageHeures(p)} h de réserve.</p>
    <div class="parcelleScene ${p.clan}">${DECOR_PARCELLE[p.clan].map((e, i) => `<span style="font-size:${[70, 96, 48, 56][i]}px">${e}</span>`).join('')}</div>
    ${bonusProjet('production') ? `<p class="cout">${PJ.PROJETS[p.clan].ico} ${PJ.PROJETS[p.clan].nom} de ton clan : <b>+${Math.round(bonusProjet('production') * 100)} %</b> à chaque récolte cette semaine.</p>` : ''}
    ${(() => { const n = T.tenus(propsSanct(), p.clan); return `<p class="cout">🏳️ Sanctuaires tenus par ton clan : <b>${n} / ${T.SANCTUAIRES.length}</b>${n ? ` → <b>+${Math.round(T.bonusProduction(n) * 100)} %</b> à chaque récolte` : ' — prends-en pour récolter plus'}.</p>`; })()}
    <div class="recolte"><div>Production en attente (${pr.heures.toFixed(1)} h${plein ? ', <b>réserve pleine</b>' : ''}) : <b>${nf(pr.essence)} ✨</b> et <b>${nf(pr[el.materiau])} ${ICO_RESS[el.materiau]}</b></div><button class="bouton" id="btRecolter" ${pr.essence + pr[el.materiau] < 1 ? 'disabled' : ''}>Récolter</button></div>
    <div class="batiments">${Object.entries(P.BATIMENTS).map(([k, b]) => {
      const n = p.parcelle[k], max = n >= P.NIV_BAT_MAX, cout = P.coutBatiment(p, k);
      return `<div class="batiment"><h3>${b.ico} ${b.nom}</h3><div class="niv">Niveau ${n} / ${P.NIV_BAT_MAX}</div><p>${b.desc(n, p.clan)}</p>
        ${max ? '<p class="cout">Niveau maximum.</p>' : `<p class="cout">Niveau ${n + 1} : ${b.desc(n + 1, p.clan)}<br>Coût : ${coutHTML(cout)}</p><button class="bouton" data-b="${k}">Améliorer</button>`}</div>`;
    }).join('')}</div>`, () => {
    $('btRecolter').onclick = async () => { const r = await faire('recolter'); if (!r.ok) return r.raison && toast(esc(r.raison)); const g = r.res; sfx.orb(); toast(`+${nf(g.essence)} ✨ · +${nf(g[el.materiau])} ${ICO_RESS[el.materiau]}${g.bonus ? ` (dont +${Math.round(g.bonus * 100)} % de bonus)` : ''}`); fenetreParcelle(); };
    $('fenetreCorps').querySelectorAll('[data-b]').forEach((b) => b.onclick = async () => { const r = await faire('construire', { bat: b.dataset.b }); if (!r.ok) return r.raison && toast(esc(r.raison)); sfx.niveau(); toast(`${P.BATIMENTS[b.dataset.b].nom} : niveau ${r.res.niv} !`); fenetreParcelle(); });
  });
}
export let filtreDeck = 'tous';
export function fenetreDeck() {
  guide.vu('deck');
  const ids = Object.keys(p.collection).filter((id) => p.collection[id].n > 0 && (filtreDeck === 'tous' || (filtreDeck === 'classe' ? !!CARTES[id].classe : filtreDeck === 'neutre' ? CARTES[id].element === 'neutre' && !CARTES[id].classe : CARTES[id].element === filtreDeck)))
    .sort((a, b) => CARTES[a].element.localeCompare(CARTES[b].element) || CARTES[a].cout - CARTES[b].cout);
  const dansDeck = (id) => p.deck.filter((x) => x === id).length;
  const lignes = [...new Set(p.deck)].sort((a, b) => CARTES[a].cout - CARTES[b].cout).map((id) => `<div class="ligne" data-r="${id}" title="Cliquer pour retirer"><span class="cout1">${CARTES[id].cout}</span>${CARTES[id].ico} ${esc(CARTES[id].nom)}${p.collection[id].niv > 1 ? ' +'.repeat(p.collection[id].niv - 1) : ''}<span style="margin-left:auto">×${dansDeck(id)}</span></div>`).join('');
  ouvrir(`<h2>🃏 Ta collection et ton deck</h2><p class="sousTitre">Ton deck : de ${P.DECK_MIN} à ${P.DECK_MAX} cartes, ${P.COPIES_MAX} exemplaires d'une même carte au plus. Améliore tes cartes avec des éclats 💠 (tes doublons) et des matériaux.${bonusProjet('remise') ? ` <b>${PJ.PROJETS[p.clan].ico} Forge géante : −${Math.round(bonusProjet('remise') * 100)} % sur les améliorations cette semaine.</b>` : ''}</p>
    <div class="filtres">${['tous', 'classe', 'feu', 'eau', 'plante', 'neutre'].map((f) => `<button data-f="${f}" class="${f === filtreDeck ? 'actif' : ''}">${f === 'tous' ? 'Toutes' : f === 'classe' ? `${CLASSES[p.classe].ico} Classes` : `${ELEMENTS[f].ico} ${ELEMENTS[f].nom}`}</button>`).join('')}</div>
    <div class="deckZone"><div class="grilleCartes">${ids.map((id) => {
      const c = p.collection[id], cout = c.niv < NIV_MAX ? P.coutAmelioration(id, c.niv, bonusProjet('remise')) : null;
      return `<div class="carteCol">${carteHTML(id, c.niv, `<span class="cnb">×${c.n}</span>`)}<div class="actions"><button data-a="${id}" ${dansDeck(id) >= Math.min(c.n, P.COPIES_MAX) || p.deck.length >= P.DECK_MAX ? 'disabled' : ''}>+ Deck</button><button data-u="${id}" ${cout ? '' : 'disabled'} title="${cout ? Object.entries(cout).map(([k, v]) => `${v} ${k}`).join(', ') : 'Niveau max'}">⬆ ${cout ? coutHTML(cout) : 'max'}</button></div></div>`;
    }).join('') || '<p>Aucune carte de ce type. Va faire des tirages !</p>'}</div>
    <div><h3>Ton deck (${p.deck.length})</h3><div class="listeDeck">${lignes}</div></div></div>`, () => {
    $('fenetreCorps').querySelectorAll('[data-f]').forEach((b) => b.onclick = () => { filtreDeck = b.dataset.f; fenetreDeck(); });
    $('fenetreCorps').querySelectorAll('[data-a]').forEach((b) => b.onclick = async () => { const r = await faire('deckAjouter', { id: b.dataset.a }); if (!r.ok) return r.raison && toast(esc(r.raison)); fenetreDeck(); });
    $('fenetreCorps').querySelectorAll('[data-r]').forEach((b) => b.onclick = async () => { const r = await faire('deckRetirer', { id: b.dataset.r }); if (!r.ok) return toast(esc(r.raison || 'Impossible.')); fenetreDeck(); });
    $('fenetreCorps').querySelectorAll('[data-u]').forEach((b) => b.onclick = async () => { const r = await faire('ameliorer', { id: b.dataset.u }); if (!r.ok) return r.raison && toast(esc(r.raison)); sfx.niveau(); toast(`${CARTES[b.dataset.u].nom} passe au niveau ${r.res.niv} !`); fenetreDeck(); });
  });
}
export function fenetreTirages(resultat = null) {
  statut('tirage');
  ouvrir(`<h2>🔮 L'Autel des tirages</h2><p class="sousTitre">Chaque tirage invoque un sort. Les sorts de ton élément sortent plus souvent. Au-delà de ${P.COPIES_MAX} exemplaires, un doublon devient des éclats 💠.</p>
    <div class="banniere"><span class="orbe">🔮</span><p>Tu as <b>${nf(p.ress.essence)} ✨</b> · ${p.tirages.total} tirages faits · légendaire garantie dans <b>${60 - p.tirages.depuisLegendaire}</b> tirages</p>
      <button class="bouton" id="bt1" ${p.ress.essence < P.PRIX_TIRAGE ? 'disabled' : ''}>Tirer ×1 — ${P.PRIX_TIRAGE} ✨</button>
      <button class="bouton" id="bt10" ${p.ress.essence < P.PRIX_TIRAGE_10 ? 'disabled' : ''}>Tirer ×10 — ${P.PRIX_TIRAGE_10} ✨ <small>(une épique au moins)</small></button>
      <p class="taux">Commune 62 % · Rare 27 % · Épique 9 % · Légendaire 2 %</p></div>
    <h3>🏺 Reliques des territoires${bonusProjet('remise') ? ` <small>(${PJ.PROJETS[p.clan].ico} −${Math.round(bonusProjet('remise') * 100)} % cette semaine)</small>` : ''}</h3><p class="sousTitre">Ces cartes ne sortent jamais aux tirages : on les forge avec les ressources rares d'un territoire (filons sur la carte, monstres rares 🌟 et boss en expédition).</p>
    <div class="reliques">${Object.values(CARTES).filter((c) => c.exclusif).map((c) => { const cout = P.coutFabrication(c.id, bonusProjet('remise')), n = p.collection[c.id]?.n || 0; return `<div class="carteCol">${carteHTML(c.id, p.collection[c.id]?.niv || 1, n ? `<span class="cnb">×${n}</span>` : '')}<small class="cout">${coutHTML(cout)}</small><button class="bouton" data-fab="${c.id}">Forger</button></div>`; }).join('')}</div>
    ${resultat ? `<div class="grilleCartes resultatTirage">${resultat.map((x, i) => `<div style="position:relative;animation-delay:${i * 0.12}s" class="carteCol">${carteHTML(x.id, p.collection[x.id].niv)}${x.nouveau ? '<span class="nouveau">NOUVEAU</span>' : ''}${x.eclats ? `<small>+${x.eclats} 💠</small>` : ''}</div>`).join('')}</div>` : ''}`, () => {
    const t = async (n) => { const rep = await faire('tirer', { n }); if (!rep.ok) return rep.raison && toast(esc(rep.raison)); const r = rep.res; const meilleur = r.cartes.map((x) => CARTES[x.id].rarete).find((x) => x === 'legendaire') || r.cartes.map((x) => CARTES[x.id].rarete).find((x) => x === 'epique'); sfx.tirage(meilleur || (r.cartes.some((x) => CARTES[x.id].rarete === 'rare') ? 'rare' : 'commune')); if (meilleur) toast(meilleur === 'legendaire' ? '🌟 <b>LÉGENDAIRE !</b>' : '💜 Une carte épique !'); fenetreTirages(r.cartes); };
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
      <p>Ton deck : ${p.deck.length} cartes · ${P.pvMax(p)} PV</p>
      <div class="paliers">${PALIERS.map((pa) => `<button class="bouton ${pa.n > max ? 'second' : ''} ${pa.cauchemar ? 'boutonCauchemar' : ''}" data-p="${pa.n}" ${pa.n > max ? 'disabled' : ''}>${pa.cauchemar ? '💀 ' : ''}${pa.nom}${pa.n > max ? ' 🔒' : ` — butin ×${pa.butin}`}</button>`).join('')}</div>
      <p class="cout">Bats le boss d'un palier pour débloquer le suivant.</p>
      <div class="infoCauchemar ${max >= 4 ? '' : 'verrou'}"><b>💀 Le Cauchemar</b> ${max >= 4 ? '' : '(débloqué en battant le boss du Palier III ici)'}<br>Des monstres maudits, <b>2 malédictions</b> tirées au sort à chaque expédition et un titan ancien en guise de boss : <b>${esc(BOSS_CAUCHEMAR[terr].nom)}</b>. Butin ×${PALIERS[3].butin}, et des apparences rares à gagner.
        <div class="listeMal">${Object.values(MALEDICTIONS).map((m) => `<span title="${esc(m.desc)}">${m.ico} ${m.nom}</span>`).join('')}</div></div>`, () => {
      $('fenetreCorps').querySelectorAll('[data-p]').forEach((b) => b.onclick = async () => { const r = await faire('expeCommencer', { terr, palier: +b.dataset.p }); if (!r.ok) return r.raison && toast(esc(r.raison)); statut('expedition'); fenetreExpedition(terr); });
    });
  }
  statut('expedition');
  const poss = X.choixPossibles(x), etages = [...x.carte.etages, [x.carte.boss]];
  ouvrir(`<h2>${TERRITOIRES[x.territoire].ico} ${esc(TERRITOIRES[x.territoire].nom)} — ${PALIERS[x.palier - 1].nom}</h2>
    ${x.mods?.length ? `<div class="malsExpe">${x.mods.map((k) => `<span class="malediction">${MALEDICTIONS[k].ico} <b>${MALEDICTIONS[k].nom}</b> — ${esc(MALEDICTIONS[k].desc)}</span>`).join('')}</div>` : ''}
    <div class="etatExpe"><span>❤️ ${x.pv} / ${x.pvMax}</span><span>Butin : ${nf(x.butin.essence)} ✨ · ${nf(x.butin.mat)} ${ICO_RESS[ELEMENTS[x.territoire].materiau]}</span><span class="espace" style="flex:1"></span><button class="bouton second" id="btAbandon">Abandonner (moitié du butin)</button></div>
    <p class="sousTitre">Choisis ta prochaine salle (elles brillent). ⚔️ combat · 🌟 monstre rare (${RARES[x.territoire].ico}) · 💀 élite · 🏕️ feu de camp · 💎 trésor · 👑 boss</p>
    <div class="carteExpe" id="carteExpe"><svg id="liensExpe"></svg>${etages.map((et) => `<div class="etage">${et.map((s) => `<button class="salle ${s.type === 'boss' ? 'boss' : ''} ${poss.includes(s.id) ? 'possible' : ''} ${x.position === s.id ? 'ici' : ''}" data-s="${s.id}" ${poss.includes(s.id) ? '' : 'disabled'} title="${X.SALLES[s.type].nom}">${X.SALLES[s.type].ico}</button>`).join('')}</div>`).join('')}</div>`, () => {
    $('fenetreCorps').querySelectorAll('[data-s]').forEach((b) => b.onclick = () => entrerSalle(b.dataset.s));
    $('btAbandon').onclick = async () => { if (!confirm('Abandonner l’expédition ? Tu gardes la moitié du butin.')) return; const r = await faire('expeAbandon'); if (!r.ok) return r.raison && toast(esc(r.raison)); bilanExpedition(r.res); };
    requestAnimationFrame(tracerLiens);
  });
}
export function tracerLiens() {
  const svg = $('liensExpe'), boite = $('carteExpe'); if (!svg || !boite) return;
  const r0 = boite.getBoundingClientRect(), x = p.expedition; let h = '';
  svg.setAttribute('width', r0.width); svg.setAttribute('height', r0.height);
  const centre = (id) => { const b = boite.querySelector(`[data-s="${id}"]`)?.getBoundingClientRect(); return b ? [b.left - r0.left + b.width / 2, b.top - r0.top + b.height / 2] : null; };
  for (const et of x.carte.etages) for (const s of et) for (const v of s.vers) { const a = centre(s.id), b = centre(v); if (a && b) h += `<line x1="${a[0]}" y1="${a[1]}" x2="${b[0]}" y2="${b[1]}" stroke="rgba(232,192,96,.3)" stroke-width="2" stroke-dasharray="5 5"/>`; }
  svg.innerHTML = h;
}
export async function entrerSalle(id) {
  const rep = await faire('expeEntrer', { salle: id }); if (!rep.ok) return rep.raison && toast(esc(rep.raison));
  const r = rep.res;
  if (r.type === 'repos') { toast(`🏕️ Tu te reposes : +${r.soin} PV`); return fenetreExpedition(p.expedition.territoire); }
  if (r.type === 'tresor') { toast(`💎 Trésor : +${r.gain.essence} ✨, +${r.gain.mat} matériaux`); return fenetreExpedition(p.expedition.territoire); }
  lancerCombat(X.combatDe(p, id), r.type);
}
export function bilanExpedition(r) {
  const mat = ELEMENTS[r.territoire].materiau, xp = r.fin === 'victoire' ? 150 * r.palier : 40;
  try { progress.gagnerXp(xp); progress.save(); } catch { /* rien */ }
  statut('libre');
  ouvrir(`<h2>${r.fin === 'victoire' ? '👑 Expédition réussie !' : '💀 Expédition terminée'}</h2>
    <p>${r.fin === 'victoire' ? 'Le boss est tombé.' : 'Tu rentres au village en boitant, avec la moitié de ton butin.'}</p>
    <p class="recolte">Tu ramènes <b>${nf(r.gainTotal.essence)} ✨</b> et <b>${nf(r.gainTotal[mat])} ${ICO_RESS[mat]}</b>${r.gainTotal[RARES[r.territoire].id] ? ` et <b>${r.gainTotal[RARES[r.territoire].id]} ${RARES[r.territoire].ico}</b>` : ''} · +${xp} XP de compte${r.bonus ? ` <small>(dont +${Math.round(r.bonus * 100)} % du ${PJ.PROJETS.eau.ico} ${PJ.PROJETS.eau.nom})</small>` : ''}</p>
    ${annonceFamilier(r.familier)}
    ${r.debloque ? `<p>🔓 <b>${PALIERS[r.debloque - 1].nom}</b> débloqué dans les ${esc(TERRITOIRES[r.territoire].nom)} !</p>` : ''}
    <button class="bouton" id="btOk">Retour au monde</button>`, () => { placerVignettes(); $('btOk').onclick = fermer; });
}
export let ongletApp = 'tenue', apercuStop = null;
export function vignette(app, dir = 'bas', z = 3) {
  const c = document.createElement('canvas'); c.width = 16 * z; c.height = 26 * z; const g = c.getContext('2d'); g.imageSmoothingEnabled = false;
  g.drawImage(feuillePerso(p.clan, p.classe, app), 0, ['bas', 'haut', 'droite', 'gauche'].indexOf(dir) * 26, 16, 26, 0, 0, 16 * z, 26 * z);
  return c;
}
export const codeAvec = (id) => { const a = { ...AP.portee(p), [AP.PIECES[id].slot]: id }; return `${a.tenue}.${a.cheveux}.${a.chapeau}.${a.aura}`; };
export function fenetreApparence() {
  apercuStop?.();
  const porte = AP.portee(p), pieces = Object.entries(AP.PIECES).filter(([id, x]) => x.slot === ongletApp && (!x.passe || AP.possede(p, id) || PS.lotDe(saisonDe().id).pieces.includes(id)));
  ouvrir(`<h2>👕 Apparence</h2><p class="sousTitre">Ce que les autres voient sur la carte, en duel et en arène. Certaines pièces s'achètent, d'autres se gagnent.</p>
    <div class="apparence"><div class="apercu"><canvas id="apercuPerso" width="200" height="260"></canvas><small>Ton personnage</small></div>
      <div class="garde"><div class="onglets">${Object.entries(AP.EMPLACEMENTS).map(([k, e]) => `<button class="${k === ongletApp ? 'actif' : ''}" data-o="${k}">${e.ico} ${e.nom}</button>`).join('')}</div>
        <div class="pieces">${pieces.map(([id, x]) => {
          const a = AP.possede(p, id), sur = porte[x.slot] === id, pr = x.cond ? AP.progression(p, x.cond) : null;
          const etat = sur ? '<span class="porte">✓ Portée</span>' : a ? `<button class="bouton" data-porter="${id}">Porter</button>`
            : x.prix ? `<button class="bouton" data-acheter="${id}" ${p.ress.essence < x.prix.essence || (p.ress.eclats || 0) < x.prix.eclats ? 'disabled' : ''}>${x.prix.essence || x.prix.eclats ? `${x.prix.essence ? `${nf(x.prix.essence)} ✨` : ''}${x.prix.eclats ? ` ${x.prix.eclats} 💠` : ''}` : 'Gratuit'}</button>`
            : x.passe ? `<span class="verrou">🎟️ Passe de saison (lot « ${esc(x.passe)} »)</span>`
            : `<span class="verrou" title="${esc(x.cond.txt)}">🔒 ${esc(x.cond.txt)}<i><b style="width:${Math.min(100, (pr.v / x.cond.n) * 100)}%"></b></i><em>${nf(Math.min(pr.v, x.cond.n))} / ${nf(x.cond.n)}</em></span>`;
          return `<div class="piece ${sur ? 'sur' : ''} ${a ? '' : 'pas'} ${x.cond ? 'gagnee' : ''}" data-id="${id}"><div class="vig"></div><b>${esc(x.nom)}</b>${x.cond ? '<small>🏅 à gagner</small>' : x.passe ? '<small>🎟️ exclusive</small>' : ''}${etat}</div>`;
        }).join('')}</div></div></div>`, () => {
    $('fenetreCorps').querySelectorAll('[data-o]').forEach((b) => b.onclick = () => { ongletApp = b.dataset.o; fenetreApparence(); });
    $('fenetreCorps').querySelectorAll('.piece').forEach((d) => { d.querySelector('.vig').append(vignette(codeAvec(d.dataset.id), ongletApp === 'chapeau' ? 'droite' : 'bas')); d.onmouseenter = () => { essai = codeAvec(d.dataset.id); }; d.onmouseleave = () => { essai = null; }; });
    $('fenetreCorps').querySelectorAll('[data-porter]').forEach((b) => b.onclick = async () => { const r = await faire('apparencePorter', { id: b.dataset.porter }); if (!r.ok) return r.raison && toast(esc(r.raison)); sfx.orb(); fenetreApparence(); });
    $('fenetreCorps').querySelectorAll('[data-acheter]').forEach((b) => b.onclick = async () => { const x = AP.PIECES[b.dataset.acheter]; if (x.prix.essence > 0 && !confirm(`Acheter « ${x.nom} » ?`)) return; const r = await faire('apparenceAcheter', { id: b.dataset.acheter }); if (!r.ok) return r.raison && toast(esc(r.raison)); sfx.fanfare(); toast(`🎨 ${esc(x.nom)} : c'est à toi !`); fenetreApparence(); });
    // l'aperçu : le personnage qui tourne sur lui-même, avec son aura ; survoler une pièce l'essaie
    let essai = null, vivant = true, t0 = performance.now();
    const cv = $('apercuPerso'), g = cv.getContext('2d'); g.imageSmoothingEnabled = false;
    const boucle = (n) => {
      if (!vivant || !cv.isConnected) return;
      const t = (n - t0) / 1000, code = essai || AP.code(p), dir = ['bas', 'droite', 'haut', 'gauche'][Math.floor(t / 1.2) % 4];
      g.clearRect(0, 0, 200, 260); g.fillStyle = 'rgba(0,0,0,.35)'; g.beginPath(); g.ellipse(100, 236, 54, 10, 0, 0, 6.3); g.fill();
      g.drawImage(feuillePerso(p.clan, p.classe, code), (Math.floor(t * 4) % 2 ? 1 : 0) * 16, ['bas', 'haut', 'droite', 'gauche'].indexOf(dir) * 26, 16, 26, 36, 32, 128, 208);
      g.save(); g.translate(100, 238); g.scale(8, 8); dessinerAura(g, 0, 0, AP.lireCode(code).aura, t, 1); g.restore();
      requestAnimationFrame(boucle);
    };
    requestAnimationFrame(boucle);
    apercuStop = () => { vivant = false; };
  });
  $('fenetreCorps').dataset.vue = 'apparence';
}
$('btApparence').onclick = () => fenetreApparence();
export const recHTML = (r) => `+${nf(r.essence)} ✨ · +${r.eclats} 💠`;
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
    ${toutes && q.bonus ? '<p class="cout">Bravo, tout est fait pour aujourd’hui ! Reviens demain.</p>' : ''}`, () => {
    $('fenetreCorps').querySelectorAll('[data-q]').forEach((b) => b.onclick = async () => {
      const r = await faire('quete', { quel: b.dataset.q }); if (!r.ok) return r.raison && toast(esc(r.raison));
      sfx.orb(); toast(`📜 ${recHTML(r.res.rec)}`); fenetreQuetes();
    });
  });
  $('fenetreCorps').dataset.vue = 'quetes';
}
$('btQuetes').onclick = () => fenetreQuetes();
addEventListener('keydown', (e) => { if ((e.key === 'j' || e.key === 'J') && e.target.tagName !== 'INPUT' && dansMonde && $('fenetre').classList.contains('cache') && $('combat').classList.contains('cache') && $('duel').classList.contains('cache')) fenetreQuetes(); });
