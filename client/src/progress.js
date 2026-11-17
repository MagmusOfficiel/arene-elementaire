// =====================================================================
//  DÉFIS DU JOUR, GLOIRE ET TITRES
//  Tout est gardé dans le navigateur (localStorage). Les 3 défis sont les
//  mêmes pour tout le monde le même jour (tirage à partir de la date).
// =====================================================================
import { ELEMENTS, FUSIONS } from '../../shared/data.js';
import { CLASSES } from '../../shared/champions.js';
import { COULEURS, CADRES, TITRES_NIVEAU, xpPourNiveau, NIV_MAX, valideCouleur, valideCadre } from '../../shared/cosmetiques.js';

// XP de compte gagnée par événement (tous les modes comptent)
const XP_EV = { kill: 30, zombie: 2, ult: 10, dodge: 1, orb: 2, evenement: 25, duel: 50, titan: 120, legend: 40,
  winRoyale: 300, winTournoi: 300, winDuo: 200, comboEquipe: 15, vague: 20, manche: 40 };

const today = () => new Date().toLocaleDateString('fr-CA');   // AAAA-MM-JJ, heure locale
function rng(seed) {
  let h = 2166136261; for (const c of seed) h = Math.imul(h ^ c.charCodeAt(0), 16777619);
  return () => { h += 0x6D2B79F5; let t = h; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}

const EL = Object.keys(ELEMENTS);
const CL = Object.keys(CLASSES);
const DU = { feu: 'du Feu', eau: 'de l’Eau', terre: 'de la Terre', vent: 'du Vent', eclair: 'de l’Éclair', glace: 'de la Glace', ombre: 'de l’Ombre', metal: 'du Métal', lumiere: 'de la Lumière', nature: 'de la Nature' };

// Modèles de défis : n = objectif [facile, moyen, difficile]
const MODELES = [
  { id: 'kills',    ev: 'kill',   n: [3, 6, 10],      txt: (n) => `Élimine ${n} joueurs` },
  { id: 'kills_el', ev: 'kill',   n: [2, 4, 6],       cond: 'el', txt: (n, x) => `Élimine ${n} joueurs avec un champion ${ELEMENTS[x].nom}` },
  { id: 'kills_cl', ev: 'kill',   n: [2, 4, 6],       cond: 'cl', txt: (n, x) => `Élimine ${n} joueurs avec un ${CLASSES[x].nom}` },
  { id: 'zombies',  ev: 'zombie', n: [15, 30, 60],    txt: (n) => `Tue ${n} zombies` },
  { id: 'lvl',      ev: 'lvl',    n: [4, 6, 8], max: true, txt: (n) => `Atteins le niveau ${n} en une seule vie` },
  { id: 'combo',    ev: 'combo',  n: [8, 15, 25], max: true, txt: (n) => `Réalise un combo de ${n} coups` },
  { id: 'degats',   ev: 'dmg',    n: [800, 2000, 4000], txt: (n) => `Inflige ${n} dégâts` },
  { id: 'ultimes',  ev: 'ult',    n: [2, 4, 7],       txt: (n) => `Lance ${n} ultimes` },
  { id: 'esquives', ev: 'dodge',  n: [15, 30, 60],    txt: (n) => `Esquive ${n} fois` },
  { id: 'orbes',    ev: 'orb',    n: [10, 20, 40],    txt: (n) => `Ramasse ${n} orbes` },
  { id: 'events',   ev: 'evenement', n: [1, 2, 3],    txt: (n) => `Vis ${n} événement${n > 1 ? 's' : ''} de carte` },
  { id: 'duels',    ev: 'duel',   n: [1, 2, 4],       txt: (n) => `Gagne ${n} duel${n > 1 ? 's' : ''} en tournoi` },
  // uniquement en défi difficile
  { id: 'titan',    ev: 'titan',  n: [1, 1, 1], dur: true, txt: () => 'Achève un Titan de la horde' },
  { id: 'legend',   ev: 'legend', n: [1, 1, 1], dur: true, txt: () => 'Ramasse un orbe légendaire' },
  { id: 'royale',   ev: 'winRoyale', n: [1, 1, 1], dur: true, txt: () => 'Gagne une partie de Battle royale' },
  { id: 'tournoi',  ev: 'winTournoi', n: [1, 1, 1], dur: true, txt: () => 'Remporte un tournoi' },
  { id: 'combosEq', ev: 'comboEquipe', n: [3, 6, 12], txt: (n) => `Déclenche ${n} combos d'équipe en Duo` },
  { id: 'duo',      ev: 'winDuo', n: [1, 1, 1], dur: true, txt: () => 'Gagne un match en Duo 2v2' },
];
const GAINS = [50, 100, 200];

// ---------- Maîtrise par champion : 5 niveaux gagnés en jouant ce champion ----------
// points gagnés avec le champion en cours ; récompenses : titre « Disciple · Nom » (niv. 3) et « Maître · Nom » (niv. 5)
export const MAITRISE_PALIERS = [100, 300, 700, 1400, 2500];
const MAITRISE_EV = { kill: 12, ult: 4, dodge: 0.3, orb: 0.5, zombie: 0.6, duel: 25, legend: 10, titan: 30, vague: 6, manche: 10, winRoyale: 80, winTournoi: 80, winDuo: 60, comboEquipe: 3 };
export const niveauMaitrise = (pts = 0) => MAITRISE_PALIERS.filter((p) => pts >= p).length;
export const titresMaitrise = (fusion) => { const nom = FUSIONS[fusion]?.nom || fusion; return { 3: `Disciple · ${nom}`, 5: `Maître · ${nom}` }; };

// Titres permanents : condition sur les statistiques cumulées
const grimoireSize = () => JSON.parse(localStorage.getItem('grimoire') || '[]').length;
export const TITRES = [
  { nom: 'Novice', desc: 'Toujours disponible', ok: () => true },
  { nom: 'Chasseur de zombies', desc: 'Tuer 100 zombies', ok: (s) => s.zombie >= 100 },
  { nom: 'Fléau des morts', desc: 'Tuer 500 zombies', ok: (s) => s.zombie >= 500 },
  { nom: 'Tueur de Titans', desc: 'Achever un Titan', ok: (s) => s.titan >= 1 },
  { nom: 'Dernier survivant', desc: 'Gagner un Battle royale', ok: (s) => s.winRoyale >= 1 },
  { nom: 'Champion du tournoi', desc: 'Remporter un tournoi', ok: (s) => s.winTournoi >= 1 },
  { nom: 'Duelliste', desc: 'Gagner 10 duels', ok: (s) => s.duel >= 10 },
  { nom: 'Insaisissable', desc: 'Esquiver 150 fois', ok: (s) => s.dodge >= 150 },
  { nom: 'Maître des combos', desc: 'Combo de 25 coups', ok: (s) => s.combo >= 25 },
  { nom: 'Élu de l’orbe', desc: 'Prendre 3 orbes légendaires', ok: (s) => s.legend >= 3 },
  { nom: 'Collectionneur', desc: `Découvrir les ${Object.keys(FUSIONS).length} fusions`, ok: () => grimoireSize() >= Object.keys(FUSIONS).length },
  { nom: 'Assidu', desc: 'Réussir 15 défis du jour', ok: (s) => s.defis >= 15 },
  { nom: 'Légende', desc: 'Atteindre 3000 de gloire', ok: (s) => s.gloire >= 3000 },
  ...EL.map((el) => ({ nom: `Maître ${DU[el]}`, desc: `30 éliminations avec un champion ${ELEMENTS[el].nom}`, ok: (s) => (s.killsEl?.[el] || 0) >= 30 })),
];

function load() {
  const d = JSON.parse(localStorage.getItem('progression') || '{}');
  d.stats ||= {}; d.stats.killsEl ||= {}; d.titre ||= 'Novice'; d.titres ||= ['Novice'];
  d.maitrise ||= {};
  d.niv ||= 1; d.xp ||= 0; d.coul ||= ''; d.cadre ||= ''; d.saisonCadres ||= []; d.saisonCouleurs ||= [];
  return d;
}

class Progression {
  constructor() { this.d = load(); this.onToast = null; this.ensureDay(); }
  save() { localStorage.setItem('progression', JSON.stringify(this.d)); }
  get titre() { return this.d.titre === 'Novice' ? '' : this.d.titre; }
  set titre(t) { if (this.d.titres.includes(t)) { this.d.titre = t; this.save(); } }
  get gloire() { return this.d.stats.gloire || 0; }

  // ---------- Niveau de compte & cosmétiques ----------
  get niv() { return this.d.niv; }
  get xpProg() { return this.d.niv >= NIV_MAX ? 1 : this.d.xp / xpPourNiveau(this.d.niv); }
  get coul() { return this.couleurOk(this.d.coul) ? this.d.coul : ''; }
  get cadre() { return this.cadreOk(this.d.cadre) ? this.d.cadre : ''; }
  set coul(id) { if (this.couleurOk(id)) { this.d.coul = valideCouleur(id); this.save(); } }
  set cadre(id) { if (this.cadreOk(id)) { this.d.cadre = valideCadre(id); this.save(); } }
  couleurOk(id) { const c = COULEURS.find((x) => x.id === id); return !!c && (c.rang ? this.d.saisonCouleurs.includes(id) : this.d.niv >= c.niv); }
  cadreOk(id) { const c = CADRES.find((x) => x.id === id); return !!c && (c.rang ? this.d.saisonCadres.includes(id) : this.d.niv >= c.niv); }

  gagnerXp(n) {
    if (!(n > 0) || this.d.niv >= NIV_MAX) return;
    this.d.xp += Math.round(n);
    while (this.d.niv < NIV_MAX && this.d.xp >= xpPourNiveau(this.d.niv)) {
      this.d.xp -= xpPourNiveau(this.d.niv); this.d.niv++;
      const n2 = this.d.niv, gains = [
        ...COULEURS.filter((c) => c.niv === n2).map((c) => `couleur ${c.nom}`),
        ...CADRES.filter((c) => c.niv === n2).map((c) => `cadre ${c.nom}`),
        ...TITRES_NIVEAU.filter((t) => t.niv === n2).map((t) => `titre « ${t.nom} »`),
      ];
      for (const t of TITRES_NIVEAU) if (t.niv === n2 && !this.d.titres.includes(t.nom)) this.d.titres.push(t.nom);
      this.onToast?.(`⭐ Niveau de compte ${n2} !${gains.length ? ` Débloqué : ${gains.join(', ')}` : ''}`, '#ffcf3a');
    }
    if (this.d.niv >= NIV_MAX) this.d.xp = 0;
  }

  // Fin de saison du Classé : cadre du meilleur rang + titre, et couleur pour Platine et plus
  recompenseSaison(saison, rangNom) {
    const cadre = CADRES.find((c) => c.rang === rangNom), coul = COULEURS.find((c) => c.rang === rangNom);
    if (cadre && !this.d.saisonCadres.includes(cadre.id)) this.d.saisonCadres.push(cadre.id);
    if (coul && !this.d.saisonCouleurs.includes(coul.id)) this.d.saisonCouleurs.push(coul.id);
    const titre = `${rangNom} · Saison ${saison}`;
    if (!this.d.titres.includes(titre)) this.d.titres.push(titre);
    this.save();
    this.recompenseEnAttente = `🎁 Fin de la Saison ${saison} : tu termines ${rangNom} ! Débloqué : cadre ${rangNom}, titre « ${titre} »${coul ? `, couleur ${coul.nom}` : ''}`;
  }

  // Nouveau jour : 3 nouveaux défis
  ensureDay() {
    const day = today();
    if (this.d.day === day && this.d.defis?.length === 3) return;
    const r = rng(`arene-${day}`);
    const pick = (list) => list[Math.floor(r() * list.length)];
    const used = new Set(), defis = [];
    for (let tier = 0; tier < 3; tier++) {
      const pool = MODELES.filter((m) => !used.has(m.id) && (tier === 2 || !m.dur));
      const m = pick(pool); used.add(m.id);
      const x = m.cond === 'el' ? pick(EL) : m.cond === 'cl' ? pick(CL) : null;
      defis.push({ id: m.id, ev: m.ev, cond: m.cond || null, x, n: m.n[tier], max: !!m.max, txt: m.txt(m.n[tier], x), gain: GAINS[tier], v: 0, done: false });
    }
    this.d.day = day; this.d.defis = defis; this.save();
  }

  // Maîtrise : points pour le champion joué en ce moment (fusionActive, posé à chaque tirage)
  maitriseDe(fusion) { const pts = this.d.maitrise[fusion] || 0, niv = niveauMaitrise(pts); return { pts, niv, prochain: MAITRISE_PALIERS[niv] || null }; }
  gagnerMaitrise(n) {
    const f = this.fusionActive; if (!f || !FUSIONS[f] || !(n > 0)) return;
    const avant = niveauMaitrise(this.d.maitrise[f]);
    this.d.maitrise[f] = Math.round(((this.d.maitrise[f] || 0) + n) * 10) / 10;
    const apres = niveauMaitrise(this.d.maitrise[f]);
    if (apres > avant) {
      const titre = titresMaitrise(f)[apres];
      if (titre && !this.d.titres.includes(titre)) this.d.titres.push(titre);
      this.onToast?.(`${'★'.repeat(apres)} Maîtrise ${FUSIONS[f].nom} niveau ${apres} !${titre ? ` Titre débloqué : « ${titre} »` : ''}`, '#ffcf3a');
      this.save();
    }
  }

  // Événement de jeu : met à jour statistiques, défis et titres
  on(ev, val = 1, ctx = {}) {
    this.ensureDay();
    const s = this.d.stats;
    if (MAITRISE_EV[ev]) this.gagnerMaitrise(MAITRISE_EV[ev] * (ev === 'vague' ? val : 1));
    if (ev === 'dmg') this.gagnerMaitrise(val * 0.02);
    if (XP_EV[ev]) this.gagnerXp(XP_EV[ev] * (ev === 'vague' ? val : 1));
    if (ev === 'dmg') this.gagnerXp(val * 0.04);
    if (ev === 'combo' || ev === 'lvl') s[ev] = Math.max(s[ev] || 0, val);
    else s[ev] = (s[ev] || 0) + val;
    if (ev === 'kill' && ctx.a) { for (const el of new Set([ctx.a, ctx.b])) s.killsEl[el] = (s.killsEl[el] || 0) + 1; }
    for (const df of this.d.defis) {
      if (df.done || df.ev !== ev) continue;
      if (df.cond === 'el' && ctx.a !== df.x && ctx.b !== df.x) continue;
      if (df.cond === 'cl' && ctx.classe !== df.x) continue;
      df.v = df.max ? Math.max(df.v, val) : df.v + val;
      if (df.v >= df.n) {
        df.done = true; df.v = df.n;
        s.gloire = (s.gloire || 0) + df.gain; s.defis = (s.defis || 0) + 1; this.gagnerXp(df.gain * 0.6);
        this.onToast?.(`✅ Défi réussi : ${df.txt}  (+${df.gain} ✦ gloire)`, '#7fe0c2');
        this.save();
      }
    }
    this.checkTitles();
    // sauvegarde regroupée (les dégâts arrivent plusieurs fois par seconde)
    if (!this._pending) { this._pending = true; setTimeout(() => { this._pending = false; this.save(); }, 1500); }
  }

  checkTitles() {
    for (const t of TITRES) {
      if (!this.d.titres.includes(t.nom) && t.ok(this.d.stats)) {
        this.d.titres.push(t.nom);
        this.onToast?.(`🏅 Nouveau titre : « ${t.nom} »`, '#ffcf3a');
      }
    }
  }

  msAvantDemain() { const n = new Date(), m = new Date(n); m.setHours(24, 0, 0, 0); return m - n; }
}

export const progress = new Progression();
