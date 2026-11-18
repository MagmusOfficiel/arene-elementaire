// =====================================================================
//  LES OMBRES DE BAKER STREET — moteur d'enquête (logique pure)
//  Un chapitre est un fichier de DONNÉES (lieux, zones de fouille,
//  personnages, dialogues, déductions, fins). Le moteur tient l'état
//  de la partie et applique les conditions et les effets. Pas d'affichage
//  ici : tout se teste en jouant des parties automatiquement.
//
//  Temps : en minutes depuis le jour 1 à minuit (le jour 1 à 9 h = 540).
//  Argent : en shillings (20 shillings = 1 livre).
// =====================================================================

export const JOUR = 1440;
export const heureDe = (t) => ({ jour: Math.floor(t / JOUR) + 1, h: Math.floor((t % JOUR) / 60), min: Math.floor(t % 60) });
export const estNuit = (t) => { const h = heureDe(t).h; return h >= 20 || h < 6; };
export function texteHeure(t) {
  const { jour, h, min } = heureDe(t);
  const moment = h < 6 ? 'nuit' : h < 12 ? 'matin' : h < 18 ? 'après-midi' : h < 20 ? 'soir' : 'nuit';
  return `Jour ${jour} · ${String(h).padStart(2, '0')}:${String(min).padStart(2, '0')} · ${moment}`;
}
export const texteArgent = (s) => { const l = Math.floor(s / 20), r = s % 20; return l ? `£${l}${r ? ` ${r}s` : ''}` : `${r}s`; };
// heure de la journée dans une plage [de, a[ (en heures, a peut dépasser 24 pour la nuit)
export function dansPlage(t, [de, a]) { const h = (t % JOUR) / 60; return a > 24 ? h >= de || h < a - 24 : h >= de && h < a; }

export function nouvelEtat(ch, nom = 'Toi', heritageRecu = null) {
  const e = {
    chapitre: ch.id, nom: String(nom).slice(0, 20) || 'Toi', temps: ch.debut.temps, argent: ch.debut.argent,
    lieu: ch.debut.lieu, lieux: [...ch.debut.lieux], indices: [], deductions: [], drapeaux: {}, jauges: { justice: 0, yard: 0 },
    fouilles: [], journal: [], blesse: false, mort: null, fin: null, dialogue: null, rencontre: null, sauvegardeMatin: null,
  };
  // les choix du chapitre précédent : jauges, argent, et chaque drapeau devient « prec_<drapeau> »
  if (ch.heriter) {
    const h = heritageRecu || ch.heritageParDefaut;
    e.heritage = h;
    e.jauges = { justice: h.jauges?.justice || 0, yard: h.jauges?.yard || 0 };
    e.argent += h.argent || 0;
    e.drapeaux[`prec_fin_${h.fin}`] = true;
    for (const [k, v] of Object.entries(h.drapeaux || {})) if (!k.startsWith('_') && !k.startsWith('prec_')) e.drapeaux[`prec_${k}`] = v;
    ch.heriter(e, h);
  }
  return e;
}
// ce qu'un chapitre terminé transmet au suivant
export function heritage(ch, e) {
  const fin = ch.fins[e.fin] || {};
  return { chapitre: ch.id, fin: e.fin, finTitre: fin.titre || '', titre: titre(ch, e), jauges: { ...e.jauges }, tableau: (e.accusation?.tableau || []).map((d) => { const q = ch.questions.find((x) => x.id === d.id); return { question: q.titre, reponse: q.options.find((o) => o[0] === d.rep)?.[1] || (d.rep === 'personne' ? 'Personne' : 'sans réponse'), bonne: q.options.find((o) => o[0] === q.bonne)?.[1], juste: d.juste, fondee: d.fondee }; }), argent: e.argent,
    drapeaux: Object.fromEntries(Object.entries(e.drapeaux).filter(([k]) => !k.startsWith('_') && !k.startsWith('prec_'))) };
}

// ---------- conditions ----------
// { indice, indices:[], pasIndice, deduction, drapeau, pasDrapeau, argent, nuit, jour (min), avant (minute absolue), heures:[de,a], justice, yard }
export function verifier(ch, e, c) {
  if (!c) return true;
  if (Array.isArray(c)) return c.every((x) => verifier(ch, e, x));
  if (c.ou) return c.ou.some((x) => verifier(ch, e, x));
  if (c.indice && !e.indices.includes(c.indice)) return false;
  if (c.indices && !c.indices.every((i) => e.indices.includes(i))) return false;
  if (c.pasIndice && e.indices.includes(c.pasIndice)) return false;
  if (c.deduction && !e.deductions.includes(c.deduction)) return false;
  if (c.drapeau && !e.drapeaux[c.drapeau]) return false;
  if (c.pasDrapeau && e.drapeaux[c.pasDrapeau]) return false;
  if (c.argent != null && e.argent < c.argent) return false;
  if (c.nuit != null && estNuit(e.temps) !== c.nuit) return false;
  if (c.jour != null && heureDe(e.temps).jour < c.jour) return false;
  if (c.avant != null && e.temps >= c.avant) return false;
  if (c.heures && !dansPlage(e.temps, c.heures)) return false;
  if (c.justice != null && (c.justice >= 0 ? e.jauges.justice < c.justice : e.jauges.justice > c.justice)) return false;
  if (c.yard != null && (c.yard >= 0 ? e.jauges.yard < c.yard : e.jauges.yard > c.yard)) return false;
  return true;
}

// ---------- effets ----------
// { indice:[...], deduction, drapeau:{k:v}, lieu:[...], argent, justice, yard, temps, journal, fin, mort, blesse }
// renvoie la liste des nouveautés (pour les messages du jeu)
export function appliquer(ch, e, f) {
  const nouv = [];
  if (!f) return nouv;
  for (const i of [].concat(f.indice || [])) if (!e.indices.includes(i)) { e.indices.push(i); nouv.push({ type: 'indice', id: i, nom: ch.indices[i]?.nom }); }
  if (f.deduction && !e.deductions.includes(f.deduction)) { e.deductions.push(f.deduction); nouv.push({ type: 'deduction', id: f.deduction }); }
  for (const [k, v] of Object.entries(f.drapeau || {})) e.drapeaux[k] = v;
  for (const l of [].concat(f.lieu || [])) if (!e.lieux.includes(l)) { e.lieux.push(l); nouv.push({ type: 'lieu', id: l, nom: ch.lieux[l]?.nom }); }
  if (f.argent) { e.argent = Math.max(0, e.argent + f.argent); nouv.push({ type: 'argent', n: f.argent }); }
  if (f.justice) e.jauges.justice = Math.max(-100, Math.min(100, e.jauges.justice + f.justice));
  if (f.yard) e.jauges.yard = Math.max(-100, Math.min(100, e.jauges.yard + f.yard));
  if (f.temps) e.temps += f.temps;
  if (f.journal) e.journal.push({ t: e.temps, texte: f.journal });
  if (f.blesse) { if (e.blesse) f.mort ||= 'Tes blessures ont eu raison de toi.'; e.blesse = true; nouv.push({ type: 'blesse' }); }
  if (f.soigne) e.blesse = false;
  if (f.mort) { e.mort = f.mort; nouv.push({ type: 'mort', texte: f.mort }); }
  if (f.fin) e.fin = f.fin;
  return nouv;
}

// ---------- déplacements ----------
export function distance(ch, a, b) { const p = ch.lieux[a].carte, q = ch.lieux[b].carte; return Math.hypot(p[0] - q[0], p[1] - q[1]); }
export function trajet(ch, e, vers, mode) {
  const d = distance(ch, e.lieu, vers);
  return mode === 'fiacre' ? { minutes: Math.round(15 + d * 0.5), cout: 1 } : { minutes: Math.round(20 + d * 1.2), cout: 0 };
}
export const lieuOuvert = (ch, e, id) => e.lieux.includes(id) && verifier(ch, e, ch.lieux[id].ouvert);
// aller quelque part ; à pied la nuit dans un quartier dangereux, une rencontre peut arriver
export function aller(ch, e, vers, mode = 'fiacre', r = Math.random) {
  if (e.fin || e.mort || e.dialogue || e.rencontre) return { ok: false, raison: 'occupe' };
  if (!e.lieux.includes(vers)) return { ok: false, raison: 'inconnu' };
  if (vers === e.lieu) return { ok: false, raison: 'deja' };
  const t = trajet(ch, e, vers, mode);
  if (e.argent < t.cout) return { ok: false, raison: 'argent' };
  e.argent -= t.cout; e.temps += t.minutes;
  const danger = ch.lieux[vers].danger || ch.lieux[e.lieu].danger;
  e.lieu = vers;
  if (mode === 'pied' && estNuit(e.temps) && danger && r() < danger) {
    const possibles = ch.rencontres.filter((x) => verifier(ch, e, x.cond));
    if (possibles.length) {
      e.rencontre = { id: possibles[Math.floor(r() * possibles.length)].id };
      return { ok: true, rencontre: e.rencontre, minutes: t.minutes };
    }
  }
  verifierDelai(ch, e);
  return { ok: true, minutes: t.minutes };
}
export const rencontre = (ch, e) => (e.rencontre ? ch.rencontres.find((x) => x.id === e.rencontre.id) : null);
// choix pendant une rencontre : chaque choix a des issues tirées au sort { chance, effets, texte }
export function choisirRencontre(ch, e, i, r = Math.random) {
  const rc = rencontre(ch, e); if (!rc) return null;
  const c = rc.choix[i]; if (!c || !verifier(ch, e, c.cond)) return null;
  let tirage = r(), issue = c.issues[c.issues.length - 1];
  for (const x of c.issues) { if (tirage < x.chance) { issue = x; break; } tirage -= x.chance; }
  e.rencontre = null;
  const nouv = appliquer(ch, e, issue.effets);
  verifierDelai(ch, e);
  return { texte: issue.texte, nouv };
}

// ---------- fouille ----------
export const zonesVisibles = (ch, e, lieu = e.lieu) => (ch.lieux[lieu].zones || []).filter((z) => verifier(ch, e, z.cond));
export function fouiller(ch, e, zoneId) {
  if (e.fin || e.mort || e.dialogue || e.rencontre) return null;
  const z = (ch.lieux[e.lieu].zones || []).find((x) => x.id === zoneId);
  if (!z || !verifier(ch, e, z.cond)) return null;
  const cle = `${e.lieu}:${z.id}`, deja = e.fouilles.includes(cle);
  if (!deja) e.fouilles.push(cle);
  const nouv = deja ? [] : appliquer(ch, e, { temps: z.temps ?? 10, ...z.effets });
  verifierDelai(ch, e);
  const t = deja ? (z.deja || z.texte) : z.texte;
  return { texte: typeof t === 'function' ? t(e) : t, nouv, deja };
}

// ---------- plan vu de dessus : examiner un meuble ----------
// un meuble relié à une zone donne l'indice (si la condition de la zone est remplie) ;
// sinon c'est un leurre : un texte, et un peu de temps perdu.
export function examiner(ch, e, objId) {
  if (e.fin || e.mort || e.dialogue || e.rencontre) return null;
  const l = ch.lieux[e.lieu], o = l.plan?.objets.find((x) => x.id === objId);
  if (!o) return null;
  if (o.zone) {
    const z = (l.zones || []).find((x) => x.id === o.zone);
    if (z && verifier(ch, e, z.cond)) return { ...fouiller(ch, e, o.zone), objet: o.id };
    e.temps += 3; verifierDelai(ch, e);
    return { texte: o.avant || 'Rien de particulier.', nouv: [], rien: true, objet: o.id };
  }
  const cle = `${e.lieu}:${o.id}`, deja = e.fouilles.includes(cle);
  if (!deja) { e.fouilles.push(cle); e.temps += o.temps ?? 3; }
  verifierDelai(ch, e);
  return { texte: typeof o.texte === 'function' ? o.texte(e) : o.texte, nouv: [], deja, objet: o.id };
}
export const examine = (e, lieu, o) => e.fouilles.includes(`${lieu}:${o.zone || o.id}`);

// ---------- personnages présents et dialogues ----------
export const presents = (ch, e, lieu = e.lieu) => Object.entries(ch.personnages).filter(([, p]) => (p.lieux || []).some((l) => l.lieu === lieu && verifier(ch, e, l.cond))).map(([id]) => id);
export function parler(ch, e, pnj) {
  if (e.fin || e.mort || e.dialogue || e.rencontre || !presents(ch, e).includes(pnj)) return null;
  const d = ch.dialogues[pnj]; if (!d) return null;
  const debut = (d.entree || []).find((x) => verifier(ch, e, x.cond))?.noeud || 'debut';
  e.dialogue = { pnj, noeud: debut };
  appliquer(ch, e, d[debut].effets);
  return noeudCourant(ch, e);
}
export function noeudCourant(ch, e) {
  if (!e.dialogue) return null;
  const n = ch.dialogues[e.dialogue.pnj][e.dialogue.noeud];
  const vus = e.drapeaux[`_vu_${e.dialogue.pnj}`] || [];
  const choix = (n.choix || []).map((c, i) => ({ ...c, i })).filter((c) => verifier(ch, e, c.cond) && !(c.unique && vus.includes(`${e.dialogue.noeud}:${c.i}`)));
  return { pnj: e.dialogue.pnj, id: e.dialogue.noeud, texte: typeof n.texte === 'function' ? n.texte(e) : n.texte, choix };
}
export function choisir(ch, e, i) {
  const n = noeudCourant(ch, e); if (!n) return null;
  const c = n.choix.find((x) => x.i === i); if (!c) return null;
  const vus = (e.drapeaux[`_vu_${n.pnj}`] ||= []);
  vus.push(`${n.id}:${c.i}`);
  const nouv = appliquer(ch, e, { temps: 5, ...c.effets });
  if (!c.suite || e.fin || e.mort) e.dialogue = null;
  else { e.dialogue.noeud = c.suite; nouv.push(...appliquer(ch, e, ch.dialogues[n.pnj][c.suite].effets)); }
  verifierDelai(ch, e);
  return { nouv, noeud: noeudCourant(ch, e), action: c.action || null };
}
export function quitterDialogue(e) { e.dialogue = null; }

// ---------- déductions : relier deux indices ----------
export function deduire(ch, e, a, b) {
  if (!e.indices.includes(a) || !e.indices.includes(b) || a === b) return { ok: false };
  const d = Object.entries(ch.deductions).find(([, x]) => x.indices.includes(a) && x.indices.includes(b));
  if (!d) { e.temps += 10; return { ok: false, faux: true }; }
  if (e.deductions.includes(d[0])) return { ok: true, deja: true, id: d[0] };
  return { ok: true, id: d[0], nouv: appliquer(ch, e, { deduction: d[0], ...d[1].effets }) };
}

// ---------- dormir : la nuit passe, sauvegarde du matin ----------
export function dormir(ch, e) {
  if (!ch.lieux[e.lieu].dormir || e.fin || e.mort || e.dialogue) return false;
  const { jour, h } = heureDe(e.temps);
  const reveil = (h >= 7 ? jour : jour - 1) * JOUR + 7 * 60;   // demain matin 7 h
  e.temps = reveil; e.blesse = false;
  verifierDelai(ch, e);
  if (!e.fin) e.sauvegardeMatin = JSON.stringify({ ...e, sauvegardeMatin: null });
  return true;
}
// mourir ramène au dernier matin (ou au début du chapitre)
export function reprendreMatin(ch, e) {
  const s = e.sauvegardeMatin ? JSON.parse(e.sauvegardeMatin) : nouvelEtat(ch, e.nom, e.heritage);
  const garde = e.sauvegardeMatin;
  Object.keys(e).forEach((k) => delete e[k]); Object.assign(e, s, { sauvegardeMatin: garde });
  return e;
}

// ---------- le délai du chapitre ----------
export function verifierDelai(ch, e) {
  if (e.fin || e.mort || !ch.delai || e.temps < ch.delai.temps) return;
  e.fin = ch.delai.fin; appliquer(ch, e, ch.delai.effets);
}

// ---------- accusation et rapport ----------
export function accuser(ch, e, suspect, preuves = [], options = {}) {
  if (e.fin || e.mort) return null;
  const p = preuves.filter((x) => e.indices.includes(x) || e.deductions.includes(x));
  const r = ch.accusation(e, suspect, p, options);
  appliquer(ch, e, r.effets);
  e.fin = r.fin; e.accusation = { suspect, preuves: p, verdict: r.verdict };
  return r;
}
// le tableau façon Cluedo : une réponse par question (qui, avec quoi, comment, pourquoi).
// Une réponse compte si elle est juste ET fondée sur un indice ou une déduction de la liste « preuves ».
export function jugerTableau(ch, e, rep = {}) {
  return (ch.questions || []).map((q) => {
    const r = rep[q.id] || null, juste = r === q.bonne;
    return { id: q.id, rep: r, juste, fondee: juste && (q.preuves || []).some((p) => e.indices.includes(p) || e.deductions.includes(p)) };
  });
}
export function accuserTableau(ch, e, rep = {}, options = {}) {
  if (e.fin || e.mort) return null;
  const detail = jugerTableau(ch, e, rep), force = detail.filter((d) => d.fondee).length;
  const suspect = rep.qui || 'personne';
  const r = ch.accusation(e, suspect, [], { ...options, force, tableau: detail });
  appliquer(ch, e, r.effets);
  e.fin = r.fin; e.accusation = { suspect, preuves: [], verdict: r.verdict, tableau: detail, force };
  return r;
}
export function titre(ch, e) {
  const { justice, yard } = e.jauges;
  return (ch.titres || TITRES).find((t) => verifier(ch, e, t.cond))?.nom || 'Assistant de Vane';
}
export const TITRES = [
  { nom: 'Homme de main du Doyen', cond: { yard: -40, justice: -20 } },
  { nom: 'Indic de la Chandelle', cond: { yard: -15, justice: -1 } },
  { nom: "Justicier de l'ombre", cond: { yard: -15, justice: 15 } },
  { nom: 'Flic véreux', cond: { yard: 15, justice: -15 } },
  { nom: 'Bras droit de Vane', cond: { yard: 20, justice: 40 } },
  { nom: 'Enquêteur estimé', cond: { justice: 15 } },
  { nom: 'Assistant de Vane', cond: null },
];
export function rapport(ch, e) {
  const tot = Object.keys(ch.indices).length;
  const trouves = Object.keys(ch.indices).filter((i) => e.indices.includes(i));
  const fin = ch.fins[e.mort ? 'mort' : e.fin] || ch.fins.mort;
  return {
    titreChapitre: ch.titre, fin: fin.titre, reussi: !e.mort && !!fin.bonne, texteFin: typeof fin.texte === 'function' ? fin.texte(e) : fin.texte, verite: ch.verite,
    trouves: trouves.map((i) => ch.indices[i].nom), rates: Object.keys(ch.indices).filter((i) => !e.indices.includes(i) && !ch.indices[i].secret).map((i) => ch.indices[i].nom),
    score: `${trouves.length}/${tot}`, deductions: e.deductions.map((d) => ch.deductions[d].nom), decisions: e.journal.map((j) => j.texte),
    titre: titre(ch, e), jauges: { ...e.jauges }, tableau: (e.accusation?.tableau || []).map((d) => { const q = ch.questions.find((x) => x.id === d.id); return { question: q.titre, reponse: q.options.find((o) => o[0] === d.rep)?.[1] || (d.rep === 'personne' ? 'Personne' : 'sans réponse'), bonne: q.options.find((o) => o[0] === q.bonne)?.[1], juste: d.juste, fondee: d.fondee }; }), suite: typeof fin.suite === 'function' ? fin.suite(e) : fin.suite,
    xp: e.mort ? 20 : 60 + trouves.length * 8 + e.deductions.length * 10 + (fin.bonne ? 60 : 0),
  };
}

// ---------- vérification d'un chapitre (pour les tests) ----------
export function verifierChapitre(ch) {
  const erreurs = [];
  const refsIndice = new Set(), donnes = new Set();
  const voirCond = (c, ou) => {
    if (!c) return; if (Array.isArray(c)) return c.forEach((x) => voirCond(x, ou)); if (c.ou) return c.ou.forEach((x) => voirCond(x, ou));
    for (const k of ['indice', 'pasIndice']) if (c[k]) { refsIndice.add(c[k]); if (!ch.indices[c[k]]) erreurs.push(`${ou} : indice inconnu ${c[k]}`); }
    for (const i of c.indices || []) if (!ch.indices[i]) erreurs.push(`${ou} : indice inconnu ${i}`);
    if (c.deduction && !ch.deductions[c.deduction]) erreurs.push(`${ou} : déduction inconnue ${c.deduction}`);
  };
  const voirEffets = (f, ou) => {
    if (!f) return;
    for (const i of [].concat(f.indice || [])) { donnes.add(i); if (!ch.indices[i]) erreurs.push(`${ou} : donne un indice inconnu ${i}`); }
    for (const l of [].concat(f.lieu || [])) if (!ch.lieux[l]) erreurs.push(`${ou} : ouvre un lieu inconnu ${l}`);
    if (f.fin && !ch.fins[f.fin]) erreurs.push(`${ou} : fin inconnue ${f.fin}`);
  };
  for (const [id, l] of Object.entries(ch.lieux)) { voirCond(l.ouvert, `lieu ${id}`); for (const z of l.zones || []) { voirCond(z.cond, `${id}/${z.id}`); voirEffets(z.effets, `${id}/${z.id}`); } }
  for (const [pnj, d] of Object.entries(ch.dialogues)) {
    if (!ch.personnages[pnj]) erreurs.push(`dialogue sans personnage ${pnj}`);
    for (const [nid, n] of Object.entries(d)) {
      if (nid === 'entree') { for (const x of n) { voirCond(x.cond, `${pnj}/entree`); if (!d[x.noeud]) erreurs.push(`${pnj}/entree → ${x.noeud} absent`); } continue; }
      voirEffets(n.effets, `${pnj}/${nid}`);
      for (const c of n.choix || []) { voirCond(c.cond, `${pnj}/${nid}`); voirEffets(c.effets, `${pnj}/${nid}`); if (c.suite && !d[c.suite]) erreurs.push(`${pnj}/${nid} → ${c.suite} absent`); }
    }
  }
  for (const [id, x] of Object.entries(ch.deductions)) { for (const i of x.indices) if (!ch.indices[i]) erreurs.push(`déduction ${id} : indice ${i}`); voirEffets(x.effets, `déduction ${id}`); }
  for (const rc of ch.rencontres) { voirCond(rc.cond, `rencontre ${rc.id}`); } for (const rc of ch.rencontres) for (const c of rc.choix) { voirCond(c.cond, `rencontre ${rc.id}`); for (const is of c.issues) voirEffets(is.effets, `rencontre ${rc.id}`); }
  for (const i of Object.keys(ch.indices)) if (!donnes.has(i)) erreurs.push(`indice jamais donné : ${i}`);
  for (const [id, l] of Object.entries(ch.lieux)) if (l.plan) erreurs.push(...verifierPlan(ch, id, l));
  for (const q of ch.questions || []) {
    if (!q.options.some((o) => o[0] === q.bonne)) erreurs.push(`question ${q.id} : la bonne réponse n'est pas proposée`);
    for (const p of q.preuves || []) if (!ch.indices[p] && !ch.deductions[p]) erreurs.push(`question ${q.id} : preuve inconnue ${p}`);
  }
  return erreurs;
}

// un plan est jouable : cases cohérentes, meubles et personnages sur le sol, tout accessible depuis l'entrée
export function grillePlan(plan) {
  const H = plan.carte.length, W = plan.carte[0].length;
  const libre = Array.from({ length: H }, (_, y) => Array.from({ length: W }, (_, x) => !'# '.includes(plan.carte[y][x])));
  for (const o of plan.objets) for (let y = o.y; y < o.y + o.h; y++) for (let x = o.x; x < o.x + o.l; x++) if (libre[y]?.[x] !== undefined) libre[y][x] = false;
  for (const [x, y] of Object.values(plan.pnj || {})) if (libre[y]?.[x] !== undefined) libre[y][x] = false;
  return { W, H, libre };
}
export function verifierPlan(ch, id, l) {
  const err = [], p = l.plan, { W, H, libre } = grillePlan(p);
  const sol = (x, y) => y >= 0 && y < H && x >= 0 && x < W && !'# '.includes(p.carte[y][x]);
  p.carte.forEach((r, y) => { if (r.length !== W) err.push(`${id} : rangée ${y} de longueur ${r.length} au lieu de ${W}`); for (const c of r) if (!'# +'.includes(c) && !p.pieces[c]) err.push(`${id} : sol « ${c} » sans pièce`); });
  for (const o of p.objets) {
    for (let y = o.y; y < o.y + o.h; y++) for (let x = o.x; x < o.x + o.l; x++) if (!sol(x, y)) err.push(`${id}/${o.id} : hors du sol en ${x},${y}`);
    if (o.zone && !(l.zones || []).some((z) => z.id === o.zone)) err.push(`${id}/${o.id} : zone inconnue ${o.zone}`);
  }
  for (const z of l.zones || []) if (!p.objets.some((o) => o.zone === z.id)) err.push(`${id} : la zone ${z.id} n'a pas de meuble`);
  // accessibilité depuis l'entrée
  const [ex, ey] = p.entree; if (!libre[ey]?.[ex]) err.push(`${id} : entrée bloquée`);
  const vu = new Set([`${ex},${ey}`]), file = [[ex, ey]];
  while (file.length) { const [x, y] = file.shift(); for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const k = `${x + dx},${y + dy}`; if (!vu.has(k) && libre[y + dy]?.[x + dx]) { vu.add(k); file.push([x + dx, y + dy]); } } }
  const atteint = (x0, y0, w, h) => { for (let y = y0 - 1; y <= y0 + h; y++) for (let x = x0 - 1; x <= x0 + w; x++) if (vu.has(`${x},${y}`) && (x === x0 - 1 || x === x0 + w || y === y0 - 1 || y === y0 + h) && !((x === x0 - 1 || x === x0 + w) && (y === y0 - 1 || y === y0 + h))) return true; return false; };
  for (const o of p.objets) if (!atteint(o.x, o.y, o.l, o.h)) err.push(`${id}/${o.id} : impossible à atteindre`);
  for (const [pnj, [x, y]] of Object.entries(p.pnj || {})) { if (!sol(x, y)) err.push(`${id} : ${pnj} hors du sol`); else if (!atteint(x, y, 1, 1)) err.push(`${id} : ${pnj} impossible à atteindre`); }
  return err;
}
