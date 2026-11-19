// =====================================================================
//  LES CLANS ÉLÉMENTAIRES — statistiques d'équilibrage
//  Le serveur note, à chaque combat qu'il valide (il le rejoue avec le
//  journal d'événements) : les cartes jouées et ce qu'elles ont fait,
//  ce que chaque monstre a infligé, qui a gagné. Et pour les duels et
//  l'arène : la classe, le clan et les cartes du deck du gagnant et du
//  perdant. Tout est agrégé en compteurs (quelques Ko, gardés dans les
//  stats) ; la page /clans/admin.html les affiche.
// =====================================================================
import { equilibrage } from './stats.js';

const inc = (o, k, n = 1) => { o[k] = (o[k] || 0) + n; };
const ligne = (table, cle) => (table[cle] ||= {});

// un combat d'expédition validé : def (ce qui a été combattu), c (le combat rejoué AVEC son journal)
export function noterCombat({ classe, clan, terr, palier, type, deck, c, pvAvant }) {
  try {
    const E = equilibrage(), gagne = c.fini === 'victoire';
    // les rencontres : territoire × palier × type de salle
    const r = ligne(E.rencontres, `${terr}|${palier}|${type}`);
    inc(r, 'n'); if (gagne) inc(r, 'v'); inc(r, 'tours', c.tour); inc(r, 'pvPerdus', Math.max(0, pvAvant - c.joueur.pv));
    // les classes (et par palier)
    const cl = ligne(E.classes, `${classe}|${palier}`); inc(cl, 'n'); if (gagne) inc(cl, 'v');
    const cc = ligne(E.clans, `${clan}|${palier}`); inc(cc, 'n'); if (gagne) inc(cc, 'v');
    // les cartes du deck : présence (une fois par combat) et victoires
    // clés « carte|palier » et « monstre|palier » : un deck du palier III n'a rien à voir avec un deck du palier I
    const perdus = Math.max(0, pvAvant - c.joueur.pv);
    for (const id of new Set(deck.map((k) => k.id))) { const x = ligne(E.cartes, `${id}|${palier}`); inc(x, 'deck'); if (gagne) inc(x, 'deckV'); inc(x, 'pv', perdus); }
    // ce que chaque carte jouée a produit (dégâts, bouclier, soin), et ce que chaque monstre a infligé
    const monstreDe = Object.fromEntries(c.ennemis.map((e) => [e.uid, e.id]));
    let carte = null;
    for (const e of c.ev || []) {
      if (e.t === 'carte') { carte = `${e.id}|${palier}`; const x = ligne(E.cartes, carte); inc(x, 'joue'); if (gagne) inc(x, 'joueV'); }
      else if (e.t === 'tourEnnemi') carte = null;
      else if (e.t === 'coup' && e.de === 'j' && carte) inc(E.cartes[carte], 'deg', e.deg + (e.bloque || 0));
      else if (e.t === 'bloc' && e.a === 'j' && carte) inc(E.cartes[carte], 'bloc', e.n);
      else if (e.t === 'soin' && e.a === 'j' && carte) inc(E.cartes[carte], 'soin', e.n);
      else if (e.t === 'coup' && e.a === 'j' && monstreDe[e.de]) inc(ligne(E.monstres, `${monstreDe[e.de]}|${palier}`), 'deg', e.deg);
      else if (e.t === 'brule' && e.a !== 'j') { /* brûlure : attribuée à personne */ }
    }
    for (const e of c.ennemis) {
      const m = ligne(E.monstres, `${e.id}|${palier}`); inc(m, 'n'); if (e.pv <= 0) inc(m, 'tues'); if (!gagne) inc(m, 'defaites'); inc(m, 'tours', c.tour);
      if (e.maudit) inc(m, 'maudit');
    }
    inc(E, 'nCombats');
  } catch (err) { console.warn('Statistiques d’équilibrage :', err.message); }
}

// un duel (ou un match d'arène) terminé : gagnant et perdant = { classe, clan, deck }
export function noterDuel({ gagnant, perdant, arene, reflet }) {
  try {
    if (!gagnant || !perdant) return;
    const E = equilibrage(), mode = arene ? (reflet ? 'reflet' : 'arene') : 'duel';
    for (const [j, v] of [[gagnant, 1], [perdant, 0]]) {
      const cl = ligne(E.duels, `${mode}|${j.classe}`); inc(cl, 'n'); inc(cl, 'v', v);
      const cc = ligne(E.duels, `${mode}|clan:${j.clan}`); inc(cc, 'n'); inc(cc, 'v', v);
      for (const id of new Set((j.deck || []).map((k) => k.id))) { const x = ligne(E.cartes, `${id}|duel`); inc(x, 'n'); inc(x, 'v', v); }
    }
    inc(E, 'nDuels');
  } catch (err) { console.warn('Statistiques d’équilibrage :', err.message); }
}
