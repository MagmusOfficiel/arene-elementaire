// =====================================================================
//  LE CONCLAVE DES ÉLÉMENTS — une partie (logique pure, sans réseau)
//  Le serveur fait autorité : il tire les rôles, distribue et mélange.
//  Chaque joueur ne reçoit que sa propre vue (vue(id)) : impossible de
//  lire la main ou le rôle des autres dans les données du navigateur.
//
//  Machine à états : salon → déplacement → rituel → révélation → débat
//  → vote → résultat → (fin ou manche suivante), avec un minuteur par phase.
// =====================================================================
import { CONCLAVE, ROLES, SANCTUAIRES, ORDRE_SANCTUAIRES, CARTES, CHAMPIONS_CONCLAVE, repartition, nouveauPaquet, melanger, resoudreRituel } from './regles.js';

const NOMS_BOTS = ['Ilyas', 'Maëlle', 'Soren', 'Yumi', 'Kenzo', 'Livia', 'Tao', 'Nora', 'Ezra', 'Mina', 'Rayan', 'Lou'];
const pick = (a, rng) => a[Math.floor(rng() * a.length)];

export class Partie {
  constructor({ code = 'TEST', rng = Math.random, options = {} } = {}) {
    this.code = code;
    this.rng = rng;
    this.options = { bonnes: CONCLAVE.bonnesPourSceller, debat: CONCLAVE.durees.debat, ...options };
    this.phase = 'salon';
    this.manche = 0;
    this.timer = 0;
    this.joueurs = new Map();      // id -> joueur
    this.ordre = [];               // ordre d'arrivée (affichage)
    this.hote = null;
    this.sanctuaires = Object.fromEntries(ORDRE_SANCTUAIRES.map((k) => [k, 'libre']));
    this.paquet = []; this.defausse = [];
    this.journal = []; this.seqJ = 0;
    this.chat = []; this.seqC = 0;
    this.effets = { voteSecret: false, souffle: false, immobile: false, debatCourt: false, oracleBonus: 0 };
    this.manchePouvoirs = {};      // effets de pouvoirs valables pour la manche en cours
    this.dernierVote = null;
    this.fin = null;
    this.botSeq = 0;
    this.version = 0;              // augmente à chaque changement (le serveur renvoie les vues)
  }

  // ------------------------------------------------------------------ salon
  ajouter(id, nom, { bot = false } = {}) {
    if (this.phase !== 'salon') return 'La partie a déjà commencé.';
    if (this.joueurs.size >= CONCLAVE.maxJoueurs) return 'Salon complet (10 joueurs).';
    nom = String(nom || 'Champion').replace(/[<>]/g, '').trim().slice(0, 16) || 'Champion';
    const j = { id, nom, bot, connecte: true, champion: null, role: null, main: [], position: null, exile: false,
      pouvoirUtilise: false, sentinelleUtilisee: false, pret: false, vote: undefined, cartesPosees: [], aDefausse: false,
      connaissances: { oracle: [], eclair: [], miroir: [] }, dernierChat: 0, enlise: false };
    this.joueurs.set(id, j); this.ordre.push(id);
    if (!this.hote && !bot) this.hote = id;
    this.changer();
    return null;
  }
  retirer(id) {
    const j = this.joueurs.get(id); if (!j) return;
    if (this.phase === 'salon') {
      this.joueurs.delete(id); this.ordre = this.ordre.filter((x) => x !== id);
      if (this.hote === id) this.hote = this.ordre.find((x) => !this.joueurs.get(x).bot) || null;
    } else j.connecte = false;   // en partie : il reste, ses actions sont jouées au hasard
    this.changer();
  }
  ajouterBot() {
    if (this.phase !== 'salon' || this.joueurs.size >= CONCLAVE.maxJoueurs) return 'Impossible d’ajouter un bot.';
    const pris = new Set([...this.joueurs.values()].map((j) => j.nom));
    const nom = NOMS_BOTS.find((n) => !pris.has(n)) || `Bot ${this.botSeq + 1}`;
    return this.ajouter(`bot_${++this.botSeq}`, nom, { bot: true });
  }
  retirerBot() {
    const id = [...this.ordre].reverse().find((x) => this.joueurs.get(x)?.bot);
    if (id) this.retirer(id);
  }
  championLibre() {
    const pris = new Set([...this.joueurs.values()].map((j) => j.champion));
    const libres = Object.keys(CHAMPIONS_CONCLAVE).filter((c) => !pris.has(c));
    return libres.length ? pick(libres, this.rng) : null;
  }
  choisirChampion(id, fusion) {
    const j = this.joueurs.get(id);
    if (!j || this.phase !== 'salon') return 'Trop tard pour changer.';
    if (fusion !== null && !CHAMPIONS_CONCLAVE[fusion]) return 'Champion inconnu.';
    if (fusion && [...this.joueurs.values()].some((o) => o !== j && o.champion === fusion)) return 'Ce champion est déjà pris.';
    j.champion = fusion; this.changer();
    return null;
  }
  demarrer(id, { completerBots = true } = {}) {
    if (this.phase !== 'salon') return 'Déjà commencée.';
    if (id !== this.hote) return 'Seul l’hôte lance la partie.';
    if (completerBots) while (this.joueurs.size < CONCLAVE.minJoueurs) this.ajouterBot();
    if (this.joueurs.size < CONCLAVE.minJoueurs) return `Il faut au moins ${CONCLAVE.minJoueurs} joueurs.`;
    // champions : les bots et ceux qui n'ont rien choisi prennent un champion libre au lancement
    // (les bots ne « volent » donc pas le champion d'un humain ; au-delà de 8 joueurs, doublons possibles)
    for (const j of this.joueurs.values()) if (!j.champion) j.champion = this.championLibre() || pick(Object.keys(CHAMPIONS_CONCLAVE), this.rng);
    // rôles
    const r = repartition(this.joueurs.size), roles = [];
    for (const [role, n] of Object.entries(r)) for (let i = 0; i < n; i++) roles.push(role);
    melanger(roles, this.rng);
    [...this.joueurs.values()].forEach((j, i) => { j.role = roles[i]; });
    // cartes
    this.paquet = nouveauPaquet(this.rng);
    for (const j of this.joueurs.values()) j.main = this.piocher(CONCLAVE.mainDepart);
    this.noter({ t: 'debut', n: this.joueurs.size, roles: r });
    this.nouvelleManche();
    return null;
  }

  // ------------------------------------------------------------------ outils
  changer() { this.version++; }
  noter(e) { this.journal.push({ ...e, id: ++this.seqJ, manche: this.manche }); if (this.journal.length > 120) this.journal.shift(); this.changer(); }
  piocher(n) {
    const out = [];
    for (let i = 0; i < n; i++) {
      if (!this.paquet.length) { this.paquet = melanger(this.defausse, this.rng); this.defausse = []; }
      if (!this.paquet.length) break;
      out.push(this.paquet.pop());
    }
    return out;
  }
  vivants() { return [...this.joueurs.values()].filter((j) => !j.exile); }
  camp(j) { return ROLES[j.role]?.camp; }
  presents(s) { return this.vivants().filter((j) => j.position === s); }
  sanctuairesActifs() { return Object.keys(this.sanctuaires).filter((s) => this.sanctuaires[s] === 'libre' && this.presents(s).length >= CONCLAVE.sanctuaireMin); }
  nomDe(id) { return this.joueurs.get(id)?.nom || '?'; }
  aPoser(j) {   // nombre de cartes que ce joueur doit poser ce rituel
    if (j.exile || !this.sanctuairesActifs().includes(j.position)) return 0;
    return Math.min(j.main.length, this.manchePouvoirs.surcharge === j.id ? 2 : 1);
  }
  entrer(phase, duree) { this.phase = phase; this.timer = duree; for (const j of this.joueurs.values()) j.pret = false; this.botsAgir = true; this.changer(); }

  // ------------------------------------------------------------------ manches
  nouvelleManche() {
    this.manche++;
    this.manchePouvoirs = { brouillard: null, surcharge: null, courant: [] };
    if (this.manche > 1) for (const j of this.vivants()) j.main.push(...this.piocher(Math.max(0, Math.min(CONCLAVE.piocheParManche, CONCLAVE.mainMax - j.main.length))));
    const immobile = this.effets.immobile; this.effets.immobile = false;
    for (const j of this.joueurs.values()) {
      j.cartesPosees = []; j.aDefausse = false; j.vote = undefined; j.protegeManche = false;
      if (!immobile && !j.enlise) j.position = null;   // chacun rechoisit sa destination
      j.bloque = immobile || j.enlise; j.enlise = false;
      if (j.bloque && !j.position) j.position = 'parvis';
    }
    this.noter({ t: 'manche', n: this.manche, immobile });
    this.entrer('deplacement', CONCLAVE.durees.deplacement);
  }

  finDeplacement() {
    for (const j of this.vivants()) if (!j.position) j.position = 'parvis';
    // trop de monde dans un sanctuaire : les derniers arrivés retournent au parvis
    for (const s of ORDRE_SANCTUAIRES) { const p = this.presents(s); p.slice(CONCLAVE.sanctuaireMax).forEach((j) => { j.position = 'parvis'; }); }
    // Courant (Ouragan) : échange de places après les déplacements
    for (const [a, b] of this.manchePouvoirs.courant) {
      const ja = this.joueurs.get(a), jb = this.joueurs.get(b);
      if (ja && jb && !ja.exile && !jb.exile) { [ja.position, jb.position] = [jb.position, ja.position]; this.noter({ t: 'courant', a, b }); }
    }
    const actifs = this.sanctuairesActifs();
    this.noter({ t: 'positions', pos: Object.fromEntries(this.vivants().map((j) => [j.id, j.position])), actifs });
    if (!actifs.length) { this.noter({ t: 'pasDeRituel' }); }
    this.entrer('rituel', CONCLAVE.durees.rituel);
  }

  finRituel() {
    // cartes non posées : jouées au hasard
    for (const j of this.vivants()) {
      const n = this.aPoser(j);
      while (j.cartesPosees.length < n && j.main.length) j.cartesPosees.push(j.main.splice(Math.floor(this.rng() * j.main.length), 1)[0]);
    }
    const toutes = [];   // pour l'Oracle : { carte, auteur, s }
    const rituels = [];
    for (const s of this.sanctuairesActifs()) {
      const posees = [];
      for (const j of this.presents(s)) for (const c of j.cartesPosees) { posees.push({ carte: c, auteur: j.id }); toutes.push({ carte: c, auteur: j.id, s }); if (c === 'corruption' && this.camp(j) === 'corrompus') j.sabotages = (j.sabotages || 0) + 1; }
      melanger(posees, this.rng);
      const cartes = posees.map((p) => p.carte);
      const res = resoudreRituel(s, cartes, this.options.bonnes);
      const brouillard = this.manchePouvoirs.brouillard === s;
      this.sanctuaires[s] = res === 'rate' ? 'libre' : res === 'scelle' ? 'scelle' : 'corrompu';
      this.defausse.push(...cartes);
      rituels.push({ s, cartes: brouillard ? cartes.map((c) => (c === 'corruption' ? 'brouillard' : c)) : cartes, res, brouillard, presents: this.presents(s).map((j) => j.id) });
    }
    for (const j of this.vivants()) j.cartesPosees = [];
    this.noter({ t: 'revelation', rituels });
    for (const r of rituels) this.appliquerEffet(r.s, r.res);
    // Oracle : une carte (plus le bonus du Pic) avec son auteur, au hasard
    const oracle = this.vivants().find((j) => j.role === 'oracle');
    if (oracle && toutes.length) {
      const n = Math.min(toutes.length, 1 + this.effets.oracleBonus); this.effets.oracleBonus = 0;
      melanger(toutes, this.rng).slice(0, n).forEach((v) => oracle.connaissances.oracle.push({ ...v, manche: this.manche }));
    }
    if (this.verifierVictoire()) return;
    const debat = Math.max(20, this.options.debat - (this.effets.debatCourt ? CONCLAVE.debatRaccourci : 0)); this.effets.debatCourt = false;
    this.phaseApres = ['debat', debat];
    this.entrer('revelation', rituels.length ? CONCLAVE.durees.revelation : 2);
  }

  appliquerEffet(s, res) {
    if (res === 'rate') return;
    const presents = this.presents(s);
    const ok = res === 'scelle';
    const e = { t: 'effet', s, res };
    if (s === 'forge') {
      if (ok) for (const j of this.vivants()) { if (j.main.length < CONCLAVE.mainMax) j.main.push(...this.piocher(1)); }
      else for (const j of presents) if (j.main.length) this.defausse.push(j.main.splice(Math.floor(this.rng() * j.main.length), 1)[0]);
    } else if (s === 'source') {
      if (ok) {
        const exile = [...this.joueurs.values()].filter((j) => j.exile && j.role !== 'mercenaire').sort((a, b) => (b.exileManche || 0) - (a.exileManche || 0))[0];
        if (exile) { exile.exile = false; exile.position = 'parvis'; e.revient = exile.id; }
      } else this.effets.voteSecret = true;
    } else if (s === 'pic') {
      if (ok) this.effets.oracleBonus++; else this.effets.debatCourt = true;
    } else if (s === 'racines') {
      if (ok && presents.length) { const p = pick(presents, this.rng); p.protegeManche = true; e.protege = p.id; }
      else if (!ok) this.effets.immobile = true;
    } else if (s === 'cime') {
      if (ok) e.comptes = Object.fromEntries(presents.map((j) => [j.id, j.main.filter((c) => c === 'corruption').length]));
      else for (const j of this.vivants().filter((x) => this.camp(x) === 'corrompus')) {   // échange secret : une carte remplacée par une pioche
        if (j.main.length) { this.defausse.push(j.main.splice(Math.floor(this.rng() * j.main.length), 1)[0]); j.main.push(...this.piocher(1)); }
      }
    }
    this.noter(e);
  }

  finDebat() { this.entrer('vote', CONCLAVE.durees.vote); }

  finVote() {
    const vivants = this.vivants();
    const votes = {};
    for (const j of vivants) if (j.vote) votes[j.vote] = (votes[j.vote] || 0) + 1;
    const secret = this.effets.voteSecret; this.effets.voteSecret = false;
    const res = { t: 'vote', secret, comptes: votes, votants: secret ? null : Object.fromEntries(vivants.map((j) => [j.id, j.vote || null])) };
    if (this.effets.souffle) { this.effets.souffle = false; res.annule = true; }
    else {
      const max = Math.max(0, ...Object.values(votes));
      const tete = Object.keys(votes).filter((k) => votes[k] === max);
      if (max > 0 && tete.length === 1) {
        const c = this.joueurs.get(tete[0]);
        if (c.protegeManche || c.protegeSentinelle === this.manche) { res.sauve = c.id; }
        else {
          c.exile = true; c.exileManche = this.manche; c.position = null;
          res.exile = c.id; res.role = c.role;
          if (this.camp(c) === 'corrompus') for (const v of vivants) if (v.vote === c.id && this.camp(v) === 'gardiens') v.exilsJustes = (v.exilsJustes || 0) + 1;
          if (c.role === 'mercenaire') { c.mercenaireGagne = true; res.mercenaire = true; }
        }
      } else res.egalite = max > 0;
    }
    this.dernierVote = res;
    this.noter(res);
    if (this.verifierVictoire()) return;
    this.entrer('resultat', CONCLAVE.durees.resultat);
  }

  finResultat() {
    if (this.manche >= CONCLAVE.manchesMax) return this.terminer('corrompus', 'La 5e manche s’achève sans victoire des Gardiens.');
    this.nouvelleManche();
  }

  verifierVictoire() {
    const sc = Object.values(this.sanctuaires);
    const scelles = sc.filter((x) => x === 'scelle').length, corrompus = sc.filter((x) => x === 'corrompu').length;
    const v = this.vivants();
    const nbCorr = v.filter((j) => this.camp(j) === 'corrompus').length, nbGard = v.filter((j) => this.camp(j) === 'gardiens').length;
    if (scelles >= CONCLAVE.victoireSanctuaires) return this.terminer('gardiens', `${scelles} sanctuaires sont scellés.`);
    if (nbCorr === 0) return this.terminer('gardiens', 'Tous les Corrompus sont exilés.');
    if (corrompus >= CONCLAVE.victoireSanctuaires) return this.terminer('corrompus', `${corrompus} sanctuaires sont corrompus.`);
    if (nbCorr >= nbGard) return this.terminer('corrompus', 'Les Corrompus sont aussi nombreux que les Gardiens.');
    return false;
  }

  // Résumé pour les statistiques (écrit en base à la fin de la partie)
  bilan() {
    return [...this.joueurs.values()].map((j) => ({
      nom: j.nom, bot: j.bot, compte: j.compte || null, role: j.role, camp: this.camp(j), champion: j.champion,
      gagne: this.fin && (this.camp(j) === this.fin.camp || !!j.mercenaireGagne), exile: j.exile,
      exilsJustes: j.exilsJustes || 0, sabotagesCaches: !j.exile && this.camp(j) === 'corrompus' ? j.sabotages || 0 : 0,
    }));
  }

  terminer(camp, raison) {
    this.fin = { camp, raison, mercenaire: [...this.joueurs.values()].filter((j) => j.mercenaireGagne).map((j) => j.id),
      roles: Object.fromEntries([...this.joueurs.values()].map((j) => [j.id, j.role])) };
    this.noter({ t: 'fin', camp, raison });
    this.entrer('fin', 0);
    return true;
  }

  // ------------------------------------------------------------------ temps
  tick(dt) {
    if (this.phase === 'salon' || this.phase === 'fin') return;
    this.timer -= dt;
    this.botsTick(dt);
    // Miroir en attente : la cible choisit sa carte, sinon une au hasard
    if (this.miroir) { this.miroir.t -= dt; if (this.miroir.t <= 0) this.montrerCarte(this.miroir.cible, null); }
    if (this.timer <= 0 || this.toutLeMondeAFini()) this.phaseSuivante();
  }
  phaseSuivante() {
    switch (this.phase) {
      case 'deplacement': return this.finDeplacement();
      case 'rituel': return this.finRituel();
      case 'revelation': { const [p, d] = this.phaseApres; return this.entrer(p, d); }
      case 'debat': return this.finDebat();
      case 'vote': return this.finVote();
      case 'resultat': return this.finResultat();
    }
  }
  toutLeMondeAFini() {
    const v = this.vivants();
    if (this.phase === 'deplacement') return v.every((j) => j.position || j.bloque) && !this.manchePouvoirsEnAttente();
    if (this.phase === 'rituel') return v.every((j) => j.cartesPosees.length >= this.aPoser(j) && (j.position !== 'parvis' || j.aDefausse || j.pret));
    if (this.phase === 'debat') return v.filter((j) => !j.bot && j.connecte).every((j) => j.pret) && v.some((j) => !j.bot && j.connecte);
    if (this.phase === 'vote') return v.every((j) => j.vote !== undefined);
    return false;
  }
  manchePouvoirsEnAttente() { return false; }

  // ------------------------------------------------------------------ actions des joueurs
  action(id, type, d = {}) {
    const j = this.joueurs.get(id);
    if (!j) return 'Joueur inconnu.';
    if (type === 'chat') return this.parler(j, d.texte);
    if (j.exile && this.phase !== 'salon') return 'Tu es exilé : tu regardes la suite en spectateur.';
    switch (type) {
      case 'aller': {
        if (this.phase !== 'deplacement') return 'Ce n’est pas le moment de bouger.';
        if (j.bloque) return 'Tu ne peux pas bouger cette manche.';
        const lieu = d.lieu;
        if (lieu !== 'parvis') {
          if (!SANCTUAIRES[lieu]) return 'Lieu inconnu.';
          if (this.sanctuaires[lieu] !== 'libre') return 'Ce sanctuaire n’est plus jouable.';
          if (this.presents(lieu).filter((o) => o !== j).length >= CONCLAVE.sanctuaireMax) return 'Ce sanctuaire est plein (4 joueurs).';
        }
        j.position = lieu; this.changer(); return null;
      }
      case 'poser': {
        if (this.phase !== 'rituel') return 'Ce n’est pas le moment du rituel.';
        const n = this.aPoser(j);
        if (!n) return 'Tu ne participes à aucun rituel cette manche.';
        if (j.cartesPosees.length >= n) return 'Tu as déjà posé ta carte.';
        const i = d.index | 0; if (!(i >= 0 && i < j.main.length)) return 'Carte inconnue.';
        j.cartesPosees.push(j.main.splice(i, 1)[0]); this.changer(); return null;
      }
      case 'defausser': {
        if (this.phase !== 'rituel' || j.position !== 'parvis') return 'Seuls les joueurs restés au parvis défaussent, pendant le rituel.';
        if (j.aDefausse) return 'Tu as déjà défaussé.';
        const i = d.index | 0; if (!(i >= 0 && i < j.main.length)) return 'Carte inconnue.';
        this.defausse.push(j.main.splice(i, 1)[0]); j.aDefausse = true; this.changer(); return null;
      }
      case 'pret': { j.pret = true; this.changer(); return null; }
      case 'voter': {
        if (this.phase !== 'vote') return 'Ce n’est pas le moment du vote.';
        if (d.cible !== null && (!this.joueurs.get(d.cible) || this.joueurs.get(d.cible).exile || d.cible === id)) return 'Vote impossible.';
        j.vote = d.cible; this.changer(); return null;
      }
      case 'proteger': {
        if (j.role !== 'sentinelle') return 'Seule la Sentinelle protège.';
        if (j.sentinelleUtilisee) return 'Tu as déjà utilisé ta protection.';
        if (!['debat', 'vote'].includes(this.phase)) return 'Protection possible pendant le débat ou le vote.';
        const c = this.joueurs.get(d.cible); if (!c || c.exile) return 'Cible invalide.';
        c.protegeSentinelle = this.manche; j.sentinelleUtilisee = true; this.changer(); return null;
      }
      case 'miroirCarte': return this.montrerCarte(id, d.index);
      case 'pouvoir': return this.pouvoir(j, d);
    }
    return 'Action inconnue.';
  }

  parler(j, texte) {
    texte = String(texte || '').replace(/\s+/g, ' ').trim().slice(0, 160);
    if (!texte) return 'Message vide.';
    if (j.exile && this.phase !== 'fin' && this.phase !== 'salon') return 'Les exilés regardent sans parler.';
    const now = Date.now(); if (now - j.dernierChat < 1200) return 'Doucement : un message toutes les 1,2 s.';
    j.dernierChat = now;
    this.chat.push({ id: ++this.seqC, de: j.id, texte, manche: this.manche }); if (this.chat.length > 150) this.chat.shift();
    this.changer(); return null;
  }

  // ------------------------------------------------------------------ pouvoirs de fusion (une fois par partie, révélé à tous)
  pouvoir(j, d) {
    const ch = CHAMPIONS_CONCLAVE[j.champion];
    if (!ch) return 'Pas de pouvoir.';
    if (j.pouvoirUtilise) return 'Pouvoir déjà utilisé.';
    if (!ch.phases.includes(this.phase)) return `${ch.pouvoir} s’utilise pendant : ${ch.phases.join(', ')}.`;
    const cible = d.cible != null ? this.joueurs.get(d.cible) : null;
    if (ch.cible === 'joueur' && (!cible || cible.exile || cible === j)) return 'Choisis un autre joueur en jeu.';
    const pub = { t: 'pouvoir', de: j.id, champion: j.champion, pouvoir: ch.pouvoir };
    switch (j.champion) {
      case 'eau+feu': if (!SANCTUAIRES[d.sanctuaire] || this.sanctuaires[d.sanctuaire] !== 'libre') return 'Choisis un sanctuaire encore jouable.'; this.manchePouvoirs.brouillard = d.sanctuaire; pub.sanctuaire = d.sanctuaire; break;
      case 'feu+terre': { const i = d.index | 0; if (!(i >= 0 && i < j.main.length)) return 'Choisis une carte de ta main.'; j.main[i] = 'eclat'; break; }
      case 'eclair+vent': j.connaissances.eclair.push({ cible: cible.id, main: [...cible.main], manche: this.manche }); pub.cible = cible.id; break;
      case 'eau+vent': this.manchePouvoirs.courant.push([j.id, cible.id]); pub.cible = cible.id; break;
      case 'eclair+terre': if (this.miroir) return 'Un Miroir est déjà en cours.'; if (!cible.main.length) return 'Ce joueur n’a pas de carte.'; this.miroir = { de: j.id, cible: cible.id, t: CONCLAVE.durees.pouvoirMiroir }; pub.cible = cible.id; break;
      case 'feu+vent': this.effets.souffle = true; break;
      case 'eau+terre': cible.enlise = true; pub.cible = cible.id; break;
      case 'eclair+feu': this.manchePouvoirs.surcharge = j.id; break;
    }
    j.pouvoirUtilise = true;
    this.noter(pub);
    return null;
  }
  montrerCarte(id, index) {
    if (!this.miroir || this.miroir.cible !== id) return 'Personne ne te demande de carte.';
    const j = this.joueurs.get(id);
    const i = Number.isInteger(index) && index >= 0 && index < j.main.length ? index : Math.floor(this.rng() * j.main.length);
    this.noter({ t: 'miroir', de: this.miroir.de, cible: id, carte: j.main[i] });
    this.miroir = null; return null;
  }

  // ------------------------------------------------------------------ bots (et joueurs déconnectés : rien, le minuteur joue pour eux)
  botsTick(dt) {
    for (const j of this.vivants()) {
      if (!j.bot) continue;
      j.botT = (j.botT ?? 0) - dt;
      if (this.botsAgir) j.botT = 0.8 + this.rng() * 3;
      if (j.botT > 0) continue;
      j.botT = 99;
      this.botJouer(j);
    }
    this.botsAgir = false;
  }
  botJouer(j) {
    const corrompu = this.camp(j) === 'corrompus', rng = this.rng;
    if (this.miroir?.cible === j.id) this.montrerCarte(j.id, j.main.findIndex((c) => c !== 'corruption'));
    if (this.phase === 'deplacement' && !j.position && !j.bloque) {
      const libres = ORDRE_SANCTUAIRES.filter((s) => this.sanctuaires[s] === 'libre' && this.presents(s).length < CONCLAVE.sanctuaireMax);
      // un Gardien va de préférence là où il a la bonne carte ; un Corrompu suit les autres pour saboter
      const bons = libres.filter((s) => j.main.includes(SANCTUAIRES[s].element) || j.main.includes('eclat'));
      const peuples = libres.filter((s) => this.presents(s).length >= 1);
      const choix = corrompu ? (peuples.length ? peuples : libres) : (bons.length && rng() < 0.8 ? bons : libres);
      this.action(j.id, 'aller', { lieu: choix.length && rng() < 0.93 ? pick(choix, rng) : 'parvis' });
    } else if (this.phase === 'rituel') {
      const s = j.position, el = SANCTUAIRES[s]?.element;
      while (j.cartesPosees.length < this.aPoser(j)) {
        let i;
        if (corrompu && j.main.includes('corruption') && rng() < 0.65) i = j.main.indexOf('corruption');
        else if (!corrompu) { i = j.main.indexOf(el); if (i < 0) i = j.main.indexOf('eclat'); if (i < 0) i = j.main.findIndex((c) => c !== 'corruption'); }
        else { i = j.main.findIndex((c) => c !== el && c !== 'eclat'); }
        if (i < 0) i = 0;
        if (this.action(j.id, 'poser', { index: i })) break;
      }
      if (j.position === 'parvis' && !j.aDefausse && j.main.length) {
        const i = !corrompu ? j.main.indexOf('corruption') : -1;
        if (i >= 0) this.action(j.id, 'defausser', { index: i }); else j.pret = true;
      }
    } else if (this.phase === 'debat') {
      if (rng() < 0.55) this.parler(j, this.botPhrase(j));
      if (j.role === 'sentinelle' && !j.sentinelleUtilisee && rng() < 0.3) { const c = pick(this.vivants().filter((o) => o !== j), rng); if (c) this.action(j.id, 'proteger', { cible: c.id }); }
      j.pret = true;
    } else if (this.phase === 'vote') {
      const autres = this.vivants().filter((o) => o !== j && !(corrompu && this.camp(o) === 'corrompus'));
      const suspects = this.suspects().filter((id) => autres.some((o) => o.id === id));
      const cible = suspects.length && rng() < 0.7 ? pick(suspects, rng) : rng() < 0.75 && autres.length ? pick(autres, rng).id : null;
      this.action(j.id, 'voter', { cible });
    }
  }
  suspects() {   // joueurs présents aux rituels ratés ou corrompus de la dernière révélation
    const r = [...this.journal].reverse().find((e) => e.t === 'revelation');
    return r ? r.rituels.filter((x) => x.res !== 'scelle').flatMap((x) => x.presents) : [];
  }
  botPhrase(j) {
    const s = j.position && SANCTUAIRES[j.position]?.nom, sus = this.suspects().filter((id) => id !== j.id), rng = this.rng;
    const phrases = [
      s ? `J'étais à la ${s}, j'ai joué le bon élément.` : 'Je suis resté au parvis pour me débarrasser d’une carte.',
      sus.length ? `Je trouve ${this.nomDe(pick(sus, rng))} un peu louche…` : 'Pour l’instant tout le monde a l’air honnête.',
      'Qui était avec moi ? Dites ce que vous avez posé.',
      'Attention à ne pas exiler un Gardien trop vite.',
      sus.length ? `Votons ${this.nomDe(pick(sus, rng))}, il était sur le rituel raté.` : 'On attend la prochaine manche pour voter ?',
    ];
    return pick(phrases, rng);
  }

  // ------------------------------------------------------------------ vue privée d'un joueur
  vue(id) {
    const moi = this.joueurs.get(id);
    const finie = this.phase === 'fin';
    const corrompusConnus = moi && this.camp(moi) === 'corrompus' ? [...this.joueurs.values()].filter((j) => this.camp(j) === 'corrompus').map((j) => j.id) : [];
    return {
      code: this.code, phase: this.phase, manche: this.manche, manchesMax: CONCLAVE.manchesMax, timer: Math.max(0, Math.ceil(this.timer)), hote: this.hote,
      bonnes: this.options.bonnes, sanctuaires: { ...this.sanctuaires },
      effets: { voteSecret: this.effets.voteSecret, souffle: this.effets.souffle, immobile: this.effets.immobile, debatCourt: this.effets.debatCourt },
      actifs: ['rituel'].includes(this.phase) ? this.sanctuairesActifs() : null,
      miroir: this.miroir ? { de: this.miroir.de, cible: this.miroir.cible } : null,
      joueurs: this.ordre.filter((x) => this.joueurs.has(x)).map((x) => {
        const j = this.joueurs.get(x);
        return {
          id: j.id, nom: j.nom, champion: j.champion, bot: j.bot, connecte: j.connecte, exile: j.exile,
          position: j.position, bloque: !!j.bloque, pouvoirUtilise: j.pouvoirUtilise, pret: j.pret,
          aPose: this.phase === 'rituel' ? j.cartesPosees.length >= this.aPoser(j) && this.aPoser(j) > 0 : undefined,
          aVote: this.phase === 'vote' ? j.vote !== undefined : undefined,
          nbCartes: j.main.length,
          role: finie || j.exile || j.id === id || corrompusConnus.includes(j.id) ? j.role : undefined,
        };
      }),
      moi: moi ? {
        id, role: moi.role, main: [...moi.main], exile: moi.exile, position: moi.position, bloque: !!moi.bloque,
        aPoser: this.phase === 'rituel' ? this.aPoser(moi) : 0, poses: moi.cartesPosees.length, aDefausse: moi.aDefausse,
        vote: moi.vote, pouvoirUtilise: moi.pouvoirUtilise, sentinelleUtilisee: moi.sentinelleUtilisee,
        corrompus: corrompusConnus, oracle: moi.connaissances.oracle, eclair: moi.connaissances.eclair,
      } : null,
      journal: this.journal.slice(-60),
      chat: this.chat.slice(-80),
      fin: this.fin,
    };
  }
}
