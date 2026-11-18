// =====================================================================
//  LES OMBRES DE BAKER STREET — Chapitre 2 : La Chambre forte de la City
//  Données seulement. Ce chapitre hérite des choix du chapitre 1 :
//  chaque drapeau du chapitre 1 y devient « prec_<drapeau> », la fin
//  devient « prec_fin_<fin> », et les jauges et l'argent sont repris.
// =====================================================================
import { TITRES } from './moteur.js';

const J = 1440;
const ED_FORTES = ['interieur', 'visiteur_2h', 'arme_manivelle', 'mobile_edmund', 'edmund_banque', 'cle_du_pere', 'chemise', 'temoin_pip2', 'lettre_doyen', 'dettes_edmund', 'faux_alibi_e', 'registre_garde', 'aveu_edmund', 'manivelle'];

export const chapitre2 = {
  id: 'ch2',
  titre: 'Chapitre 2 — La Chambre forte de la City',
  resume: "Une semaine plus tard. Dans la nuit de mardi, la chambre forte de la banque Crale & Fils a été ouverte sans effraction : trente mille livres d'obligations au porteur ont disparu, et le veilleur de nuit, Tobias Reed, gît mort au pied de la porte d'acier. Le Yard soupçonne Hannah Bright, qui a posé la nouvelle serrure.",
  debut: { temps: 9 * 60, argent: 10, lieu: 'baker', lieux: ['baker', 'banque', 'yard', 'atelier'] },
  delai: { temps: 2 * J + 20 * 60, fin: 'delai', texte: "Gribble veut inculper Hannah Bright avant le jour 3 à 20 h.", effets: { journal: 'Le délai a expiré : Gribble a fait inculper Hannah Bright.' } },
  verite: "Edmund Crale, le fils du banquier, devait trois mille livres à la table de jeu de Gros Bill, que tient la Chandelle. Le Doyen lui a proposé d'effacer sa dette contre une nuit. Mardi à 2 h, Edmund s'est présenté au veilleur Tobias Reed (« dossiers oubliés »), a ouvert la chambre forte avec la combinaison lue dans le carnet de son père, et quand Reed a compris, il l'a frappé avec la manivelle de la porte. Un homme de la Chandelle attendait dans un fiacre : les obligations ont fini à l'entrepôt 7 de Limehouse.",

  // ---------------------------------------------------------------- héritage du chapitre 1
  heritageParDefaut: { chapitre: 'ch1', fin: 'justice', finTitre: 'Justice rendue', titre: 'Enquêteur estimé', jauges: { justice: 20, yard: 15 }, argent: 20, drapeaux: { plans_rendus: true } },
  heriter(e, h) {
    const d = e.drapeaux, fin = (x) => !!d[`prec_fin_${x}`];
    d.arthur_libre = fin('justice') || fin('double_jeu');
    d.lusk_cellule = fin('justice') || fin('double_jeu');
    d.lusk_libre = !d.lusk_cellule && !d.prec_lusk_parti;
    d.doyen_ami = !!(d.prec_plans_doyen || fin('recrue'));
    d.doyen_ennemi = !d.doyen_ami && !!(d.prec_trahi_doyen || d.prec_plans_rendus);
    if (d.doyen_ami) { d.mission_doyen = true; e.lieux.push('music'); }
    if (d.lusk_libre) e.lieux.push('boutique');
    e.journal.push({ t: e.temps, texte: `Chapitre 1 : ${h.finTitre || h.fin}. On te connaît désormais comme « ${h.titre || 'l’assistant de Vane'} ».` });
    if (d.mission_doyen) e.journal.push({ t: e.temps, texte: "Un billet glissé sous ta porte, une chandelle dessinée : « Le Yard doit regarder l'apprentie. Aide-le. — D. »" });
  },

  // ---------------------------------------------------------------- indices
  indices: {
    porte_intacte: { nom: 'Porte sans une rayure', desc: "La porte de la chambre forte n'a pas été forcée : on l'a ouverte avec la combinaison." },
    manivelle: { nom: 'Manivelle essuyée', desc: "La lourde manivelle de laiton de la porte a été essuyée à la hâte ; il reste du sang dans les cannelures." },
    registre_garde: { nom: 'Registre du veilleur', desc: "Dernière ligne de Tobias Reed : « 2 h 10 — M. E. — dossiers oubliés. Ouvert. »" },
    combinaison: { nom: 'Les trois qui savent', desc: "Seuls Oswin Crale, son fils Edmund et Hannah Bright connaissent la combinaison de la Sentinelle." },
    legiste2: { nom: 'Rapport du légiste', desc: "Tobias Reed est mort vers 2 h 15, frappé à la tempe par un objet lourd en laiton." },
    temoin_reed: { nom: 'Les inquiétudes de Reed', desc: "D'après sa veuve, Tobias s'inquiétait des visites nocturnes du jeune M. Edmund et de ses soirées au Lion Rouge." },
    dettes_edmund: { nom: 'L’ardoise de Bill', desc: "Dans le registre de Gros Bill : « E.C. — 3 000 livres » rayé, avec la mention « effacé par ordre du D. »" },
    temoin_pip2: { nom: 'Le fiacre de 2 h', desc: "Pip a vu un fiacre devant la banque vers 2 h : un jeune monsieur en habit, une chevalière qui brillait, et un gars de la Chandelle sur le siège." },
    chemise: { nom: 'Chemise tachée', desc: "Dans la garde-robe d'Edmund, une chemise de soirée : manchette tachée de sang et de graisse de laiton." },
    lettre_doyen: { nom: 'Billet à demi brûlé', desc: "Dans la cheminée des Crale : une chandelle dessinée et « …la dette sera effacée. Mardi, 2 h. D. »" },
    carnet_crale: { nom: 'Carnet du banquier', desc: "Au dos du carnet d'Oswin Crale, d'une écriture tremblée : la combinaison de la Sentinelle." },
    faux_alibi_e: { nom: 'Faux alibi d’Edmund', desc: "Edmund dit avoir passé la nuit au Reform Club, dont il a été radié l'an dernier pour dettes de jeu." },
    alibi_hannah: { nom: 'Alibi de Hannah', desc: "À 2 h, Hannah réglait l'horloge de l'église St Bride ; le bedeau a signé son carnet." },
    tuyau_lusk: { nom: 'Le tuyau de Lusk', desc: "Selon Victor Lusk, le Doyen a un homme dans la famille Crale : le fils, qui joue chez Bill." },
    aveu_margot2: { nom: 'Confidence de la Fauvette', desc: "Les obligations attendent le Doyen à l'entrepôt 7 de Limehouse." },
    aveu_edmund: { nom: 'Aveux d’Edmund', desc: "Edmund a craqué : la dette, la combinaison, Reed qui voulait donner l'alerte, la manivelle." },
    obligations: { nom: 'Les obligations au porteur', desc: "Trente mille livres en papier, payables à qui les tient. De quoi acheter un quartier de Londres… ou une corde." },
  },

  // ---------------------------------------------------------------- déductions
  deductions: {
    interieur: { nom: 'Quelqu’un de l’intérieur', indices: ['porte_intacte', 'combinaison'], texte: "La porte n'a pas été forcée : celui qui l'a ouverte faisait partie des trois qui connaissaient la combinaison." },
    cle_du_pere: { nom: 'La combinaison du père', indices: ['porte_intacte', 'carnet_crale'], texte: "Pas besoin d'être serrurier : n'importe qui chez les Crale pouvait lire la combinaison dans le carnet du banquier." },
    visiteur_2h: { nom: 'Le visiteur de 2 h 10', indices: ['registre_garde', 'legiste2'], texte: "Reed a ouvert à un certain « M. E. » à 2 h 10, et il est mort cinq minutes plus tard. Il connaissait son assassin." },
    arme_manivelle: { nom: 'L’arme du crime', indices: ['legiste2', 'manivelle'], texte: "L'objet lourd en laiton, c'est la manivelle de la chambre forte elle-même." },
    mobile_edmund: { nom: 'Une dette effacée', indices: ['dettes_edmund', 'lettre_doyen'], texte: "La Chandelle a effacé les trois mille livres de dettes d'Edmund Crale… contre une nuit à la banque." },
    edmund_banque: { nom: 'Edmund était à la banque', indices: ['temoin_pip2', 'chemise'], texte: "Le jeune monsieur à la chevalière, c'était Edmund, et il en est revenu avec du sang sur la manchette." },
    hannah_innocente: { nom: 'Hannah est innocente', indices: ['alibi_hannah', 'legiste2'], texte: "À l'heure du crime, Hannah était à St Bride, à l'autre bout de la City." },
  },

  // ---------------------------------------------------------------- lieux
  lieux: {
    baker: {
      nom: '7 Baker Street', quartier: 'Marylebone', carte: [22, 28], dormir: true, decor: 'baker',
      intro: "Le cabinet de Vane. Le violon a perdu une corde, et une veuve en noir attend sur le fauteuil des clients.",
      zones: [
        { id: 'journaux', nom: 'Journaux du matin', x: 0, y: 57, l: 20, h: 16, texte: "Le Times : « CAMBRIOLAGE À LA BANQUE CRALE — un veilleur tué, trente mille livres envolées. Le Yard interroge la serrurière. »", temps: 5 },
        { id: 'tiroir', nom: 'Tiroir du bureau', x: 68, y: 70, l: 19, h: 15, texte: (e) => (e.drapeaux.prec_vane_vole ? "Vane a mis un cadenas sur son tiroir. Il ne dit rien, mais il sait." : "Quelques shillings, un pistolet de poche et une lettre de Mycroft… non, d'un certain M. Holder. Tu refermes."), temps: 2 },
        { id: 'fenetre', nom: 'Fenêtre', x: 29, y: 2, l: 20, h: 50, texte: "Un homme en casquette fait les cent pas sous le réverbère d'en face. Il lève les yeux vers ta fenêtre, puis s'éloigne.", temps: 2 },
      ],
    },
    banque: {
      nom: 'Banque Crale & Fils', quartier: 'City', carte: [68, 50], decor: 'banque', ouvert: { heures: [9, 17] },
      intro: "Des constables gardent l'entrée. Dans le bureau du banquier, la porte d'acier de la chambre forte est grande ouverte sur des étagères vides.",
      zones: [
        { id: 'chambre', nom: 'Porte de la chambre forte', x: 71, y: 36, l: 12, h: 33, texte: "La Sentinelle de Hannah Bright, intacte. Pas une rayure, pas une trace de pince : on l'a ouverte avec la combinaison.", effets: { indice: 'porte_intacte' } },
        { id: 'manivelle', nom: 'Manivelle de la porte', x: 83, y: 38, l: 12, h: 24, texte: "La lourde manivelle de laiton brille un peu trop : on l'a essuyée. Mais dans les cannelures, il reste du sang séché.", effets: { indice: 'manivelle', temps: 15 } },
        { id: 'bureau', nom: 'Registre du veilleur', x: 14, y: 47, l: 46, h: 20, texte: "Le registre de Tobias Reed est resté sur le bureau. Dernière ligne, d'une main appliquée : « 2 h 10 — M. E. — dossiers oubliés. Ouvert. »", effets: { indice: 'registre_garde' } },
      ],
    },
    yard: {
      nom: 'Scotland Yard', quartier: 'Whitehall', carte: [40, 61], decor: 'yard',
      intro: "Le bureau de Gribble sent le poêle et le café brûlé. Au fond du couloir, les cellules.",
      zones: [
        { id: 'tableau', nom: 'Tableau des affaires', x: 64, y: 10, l: 33, h: 34, texte: "À la craie : « CRALE — Bright (serrure, combinaison, clés) — À INCULPER AVANT JEUDI ». Le mot « Bright » est souligné trois fois.", temps: 5 },
      ],
    },
    atelier: {
      nom: 'Atelier Fenwick', quartier: 'Clerkenwell', carte: [58, 26], decor: 'atelier',
      intro: "Les horloges ont été remontées, l'établi rangé. Une enseigne neuve, encore à peindre : « Bright & Cie, serrures ».",
      zones: [
        { id: 'etabli', nom: 'Établi', x: 46, y: 54, l: 22, h: 12, texte: "Le prototype de la Sentinelle, démonté. Hannah a noté en marge : « Incrochetable. Sans combinaison, il faudrait de la dynamite. »", temps: 5 },
        { id: 'carnet', nom: 'Carnet de Hannah', x: 31, y: 55, l: 12, h: 9, cond: { drapeau: 'stbride' }, texte: "Le carnet des réglages de Hannah. Mardi : « St Bride, horloge du clocher, 1 h 45 – 2 h 40 », et la signature du bedeau.", effets: { indice: 'alibi_hannah' } },
        { id: 'porte', nom: 'Porte réparée', x: 6, y: 22, l: 9, h: 62, texte: "La porte enfoncée la semaine dernière a été remplacée. Une Sentinelle miniature la ferme désormais.", temps: 2 },
      ],
    },
    pub: {
      nom: 'Le Lion Rouge', quartier: 'Whitechapel', carte: [80, 46], danger: 0.45, decor: 'pub', ouvert: { heures: [11, 26] },
      intro: "Fumée et sciure. Derrière le comptoir, une porte mène à l'arrière-salle où l'on joue gros, d'après la rumeur.",
      zones: [
        { id: 'cartes', nom: 'Table de jeu', x: 8, y: 63, l: 34, h: 17, texte: "Une partie de pharaon s'est terminée tard. Sous la table, un bouton de manchette en or gravé d'un « C ».", temps: 5 },
        { id: 'comptoir', nom: 'Sous le comptoir', x: 60, y: 45, l: 38, h: 30, cond: { ou: [{ drapeau: 'bill_occupe' }, { drapeau: 'bill_allie' }] }, texte: "Le gros registre des dettes de Bill. À la lettre C : « E.C. — 3 000 livres », rayé d'un trait, et en marge « effacé par ordre du D. »", effets: { indice: 'dettes_edmund' } },
      ],
    },
    manoir: {
      nom: 'Hôtel Crale, Mayfair', quartier: 'Mayfair', carte: [33, 38], decor: 'manoir', ouvert: { heures: [9, 23] },
      intro: "Un hôtel particulier de Mayfair, trop grand et trop silencieux. Un majordome t'introduit sans un mot.",
      zones: [
        { id: 'bureau', nom: 'Bureau du banquier', x: 0, y: 62, l: 42, h: 16, texte: "Sur le bureau d'Oswin Crale, un carnet de cuir. Au dos, d'une écriture tremblée de vieil homme qui oublie : une suite de chiffres. La combinaison.", effets: { indice: 'carnet_crale' } },
        { id: 'garderobe', nom: 'Garde-robe d’Edmund', x: 79, y: 10, l: 20, h: 76, texte: "Au fond de la garde-robe, roulée en boule : une chemise de soirée. La manchette droite est raide de sang et de graisse de laiton.", effets: { indice: 'chemise', temps: 15 } },
        { id: 'cheminee', nom: 'Cheminée', x: 44, y: 50, l: 17, h: 27, texte: "Dans les cendres, un billet à demi brûlé. Une chandelle dessinée, et : « …la dette sera effacée. Mardi, 2 h. D. »", effets: { indice: 'lettre_doyen' } },
      ],
    },
    boutique: {
      nom: 'Boutique de Victor Lusk', quartier: 'Hatton Garden', carte: [54, 38], decor: 'boutique', ouvert: { heures: [8, 19] },
      intro: "Les volets sont à moitié tirés. Lusk travaille toujours, mais il sursaute à chaque bruit de pas.",
      zones: [
        { id: 'trousse', nom: 'Trousse à outils', x: 9, y: 65, l: 30, h: 13, texte: "Un petit marteau d'horloger tout neuf a pris la place vide dans le feutre.", temps: 2 },
      ],
    },
    music: {
      nom: 'Le Lyre d’Or', quartier: 'Strand', carte: [44, 52], decor: 'music', ouvert: { heures: [18, 26] },
      intro: "La Fauvette chante ce soir. Dans la loge 3, un jeune homme à chevalière applaudit un peu trop fort.",
      zones: [
        { id: 'loge3', nom: 'Loge 3', x: 72, y: 22, l: 23, h: 28, texte: "Sur le rebord de la loge, des violettes fraîches et une carte : « Pour M., de la part d'un ami de la City. E. »", temps: 5 },
      ],
    },
    entrepot: {
      nom: 'Entrepôt 7, Limehouse', quartier: 'Docks de Limehouse', carte: [90, 64], danger: 0.55, decor: 'entrepot', ouvert: { nuit: true },
      intro: "L'eau noire, les caisses, la lanterne. Rien n'a changé à l'entrepôt 7, sauf la caisse à la chandelle, neuve.",
      zones: [
        { id: 'caisses', nom: 'Caisse marquée d’une chandelle', x: 54, y: 40, l: 17, h: 27, cond: { ou: [{ drapeau: 'gardien_ecarte' }, { drapeau: 'gribble_entrepot2' }] }, texte: "Sous la toile cirée, des liasses épaisses, cachetées de cire rouge : les obligations au porteur de la banque Crale.", effets: { indice: 'obligations', journal: 'Tu as mis la main sur les obligations volées à Limehouse.' } },
      ],
    },
  },

  // ---------------------------------------------------------------- personnages
  personnages: {
    vane: { nom: 'Cornelius Vane', role: 'Détective consultant', couleur: '#3a4a3a', lieux: [{ lieu: 'baker', cond: { heures: [7, 24] } }] },
    pell: { nom: 'Mrs Agatha Pell', role: 'Logeuse', couleur: '#6a4a5a', lieux: [{ lieu: 'baker' }] },
    reed: { nom: 'Martha Reed', role: 'La veuve du veilleur', couleur: '#2a2a3a', lieux: [{ lieu: 'baker', cond: { avant: 18 * 60 } }] },
    gribble: { nom: 'Inspecteur Gribble', role: 'Scotland Yard', couleur: '#2a3a5a', lieux: [{ lieu: 'yard', cond: { heures: [8, 21] } }] },
    crale: { nom: 'Oswin Crale', role: 'Banquier', couleur: '#4a4a2a', lieux: [{ lieu: 'banque' }, { lieu: 'manoir', cond: { heures: [18, 23] } }] },
    edmund: { nom: 'Edmund Crale', role: 'Le fils du banquier', couleur: '#3a2a4a', lieux: [{ lieu: 'manoir', cond: [{ heures: [10, 20] }, { pasDrapeau: 'edmund_fui' }] }, { lieu: 'pub', cond: [{ heures: [21, 26] }, { pasDrapeau: 'edmund_fui' }] }] },
    hannah: { nom: 'Hannah Bright', role: 'Serrurière', couleur: '#5a6a7a', lieux: [{ lieu: 'atelier', cond: { heures: [9, 18] } }] },
    arthur: { nom: 'Arthur Fenwick', role: 'Le neveu', couleur: '#8a5a2a', lieux: [{ lieu: 'atelier', cond: [{ drapeau: 'arthur_libre' }, { heures: [9, 18] }] }, { lieu: 'yard', cond: { pasDrapeau: 'arthur_libre' } }] },
    lusk: { nom: 'Victor Lusk', role: 'Serrurier', couleur: '#5a2a2a', lieux: [{ lieu: 'yard', cond: { drapeau: 'lusk_cellule' } }, { lieu: 'boutique', cond: { drapeau: 'lusk_libre' } }] },
    pip: { nom: 'Pip', role: 'Chef des Moineaux', couleur: '#6a6a4a', lieux: [{ lieu: 'pub', cond: { heures: [12, 23] } }] },
    bill: { nom: 'Gros Bill', role: 'Patron du Lion Rouge', couleur: '#4a2a1a', lieux: [{ lieu: 'pub' }] },
    margot: { nom: 'Margot « la Fauvette »', role: 'Chanteuse du Lyre d’Or', couleur: '#7a2a4a', lieux: [{ lieu: 'music', cond: { heures: [20, 25] } }] },
    gardien: { nom: 'Le gardien', role: 'Docker de la Chandelle', couleur: '#2a2a2a', lieux: [{ lieu: 'entrepot', cond: { pasDrapeau: 'gardien_ecarte' } }] },
    doyen: { nom: 'Le Doyen', role: '???', couleur: '#111111', lieux: [{ lieu: 'entrepot', cond: [{ drapeau: 'doyen_ami' }, { pasDrapeau: 'trahi_doyen2' }] }] },
  },

  // ---------------------------------------------------------------- dialogues
  dialogues: {
    vane: {
      entree: [{ cond: { pasDrapeau: 'briefing' }, noeud: 'briefing' }, { cond: null, noeud: 'aide' }],
      briefing: {
        texte: (e) => {
          const d = e.drapeaux;
          let souvenir = "« L'affaire Fenwick est derrière nous. »";
          if (d.prec_fin_justice) souvenir = "« Ton nom était dans le Times la semaine dernière. Le Doyen sait lire, lui aussi. Prends garde. »";
          else if (d.prec_fin_double_jeu) souvenir = `« Tu as fait arrêter Lusk… et ${d.prec_plans_vendus ? 'tu as un manteau neuf' : 'tu fermes ta malle à clé'}. Je ne pose pas de questions. Pas encore. »`;
          else if (d.prec_fin_erreur || d.prec_fin_delai) souvenir = "« Un innocent attend son procès à Newgate par notre faute. Je n'aime pas ce goût-là. Ne le refaisons pas. »";
          else if (d.prec_fin_relache) souvenir = "« Lusk court toujours, faute de preuves. Cette fois, apporte-moi des faits. »";
          else if (d.prec_fin_marche) souvenir = "« Tu connais le nom du Doyen. Moi aussi, maintenant. C'est un savoir qui se paie. »";
          else if (d.prec_fin_recrue) souvenir = "« Tu rentres tard, ces temps-ci. Tu sens le fleuve et la cire de chandelle. » Il te fixe longuement.";
          return `${souvenir} « Banque Crale & Fils : chambre forte vidée cette nuit, le veilleur assassiné. Gribble tient déjà une coupable : Hannah Bright, qui a posé la serrure. Mrs Reed, la veuve, est là. Écoute-la, puis va voir la banque. »`;
        },
        effets: { drapeau: { briefing: true } },
        choix: [{ texte: 'J’y vais.', effets: { journal: "Vane t'a confié l'affaire de la banque Crale." } }],
      },
      aide: {
        texte: (e) => {
          const a = e.jauges.justice <= -25 ? "« Je ne sais plus très bien pour qui tu travailles. » " : '';
          if (!e.indices.includes('porte_intacte')) return `${a}« Commence par la porte. Une serrure raconte toujours comment on l'a ouverte. »`;
          if (!e.deductions.includes('interieur') && !e.deductions.includes('cle_du_pere')) return `${a}« Une porte intacte, c'est une porte qu'on a ouverte avec le secret. Qui le connaît ? Relie ça dans ton carnet. »`;
          if (!e.lieux.includes('manoir')) return `${a}« Les banquiers ont des fils, des maisons et des carnets. Va voir à Mayfair. »`;
          if (!e.deductions.includes('mobile_edmund') && !e.deductions.includes('edmund_banque')) return `${a}« Un jeune homme riche qui fréquente Whitechapel a toujours une dette quelque part. Les gamins des rues voient tout, la nuit. »`;
          if (!e.indices.includes('obligations')) return `${a}« Les obligations ne valent rien tant qu'elles dorment dans une caisse. Quelqu'un attend de les toucher. La Fauvette chante toujours au Lyre d'Or… »`;
          return `${a}« Tu en sais assez. Va voir Gribble avant qu'il ne pende la petite Bright. »`;
        },
        choix: [
          { texte: 'Merci, je repars.' },
          { texte: 'Pourriez-vous m’avancer un peu d’argent ?', cond: { pasDrapeau: 'avance' }, suite: 'avance' },
        ],
      },
      avance: {
        texte: (e) => (e.drapeaux.prec_plans_vendus || e.drapeaux.prec_crale_paye ? "« Toi ? Tu me sembles bien plus riche que moi, ces temps-ci. » Il ne bouge pas." : "« Dix shillings. Ne les perds pas au pharaon. »"),
        effets: { drapeau: { avance: true } },
        choix: [{ texte: 'Merci.', cond: { pasDrapeau: 'prec_plans_vendus' }, effets: { argent: 10 } }, { texte: 'Je vois.', cond: { drapeau: 'prec_plans_vendus' } }],
      },
    },

    pell: {
      debut: {
        texte: (e) => (e.blesse ? "« Encore du sang sur mon tapis ! Asseyez-vous. »" : "« Du thé, mon petit ? Cette pauvre Mrs Reed n'a rien avalé depuis hier. »"),
        choix: [
          { texte: 'Volontiers.', effets: { soigne: true, temps: 20 }, suite: 'the' },
          { texte: 'On dit quoi, du fils Crale ?', unique: true, suite: 'rumeur' },
          { texte: 'Plus tard, Mrs Pell.' },
        ],
      },
      the: { texte: "« Voilà. Et fermez votre porte à clé, ce soir : un drôle de type rôde dans la rue depuis deux jours. »", choix: [{ texte: 'Merci, Mrs Pell.' }] },
      rumeur: { texte: "« Le petit Edmund ? Ma cousine fait la cuisine à Mayfair. Elle dit qu'il rentre à l'aube en sentant le gin de Whitechapel, et que son père paie ses dettes en pleurant. »", effets: { lieu: 'pub' }, choix: [{ texte: 'Intéressant.', suite: 'debut' }] },
    },

    reed: {
      debut: {
        texte: "Une femme en grand deuil serre un mouchoir. « Mon Tobias a gardé cette banque vingt ans. Le Yard ne cherche que la jeune serrurière. Moi, je sais que mon mari avait peur de quelqu'un. »",
        choix: [
          { texte: 'De qui avait-il peur ?', unique: true, suite: 'peur' },
          { texte: 'Je trouverai qui l’a tué.', unique: true, suite: 'paie' },
          { texte: 'Je reviendrai vers vous.' },
        ],
      },
      peur: { texte: "« Du fils Crale, monsieur Edmund. Il venait parfois la nuit, pour des “dossiers”. Tobias disait qu'il traînait dans un tripot de Whitechapel, le Lion Rouge, et qu'un jour ça finirait mal. »", effets: { indice: 'temoin_reed', lieu: ['pub', 'manoir'] }, choix: [{ texte: 'Merci, madame.', suite: 'debut' }] },
      paie: {
        texte: "Elle ouvre un petit porte-monnaie usé. « Deux livres. C'est tout ce qu'on avait mis de côté. Prenez-les, et trouvez-le. »",
        choix: [
          { texte: 'Gardez votre argent, madame.', effets: { justice: 5, journal: "Tu as refusé les économies de la veuve Reed." }, suite: 'debut' },
          { texte: '(Prendre les deux livres)', effets: { argent: 40, justice: -6, journal: 'Tu as pris les deux dernières livres de la veuve Reed.' }, suite: 'debut' },
        ],
      },
    },

    gribble: {
      entree: [{ cond: { pasDrapeau: 'vu_gribble' }, noeud: 'debut' }, { cond: null, noeud: 'menu' }],
      debut: {
        texte: (e) => {
          const y = e.jauges.yard;
          const accueil = y >= 15 ? "« Ah, mon ami du cabinet Vane ! Entrez donc. »" : y <= -15 ? "« Tiens. On dit que vous fréquentez du drôle de monde, ces temps-ci. »" : "« Encore vous. »";
          return `${accueil} « Écoutez : la porte n'a pas été forcée. Trois personnes ont la combinaison, et une seule n'est pas un gentleman : la petite Bright. Elle a posé la serrure, elle a les clés. Je l'inculpe jeudi. »`;
        },
        effets: { drapeau: { vu_gribble: true } },
        choix: [{ texte: 'Vous allez vite en besogne.', suite: 'menu' }],
      },
      menu: {
        texte: "Gribble tamponne un formulaire. « Je vous écoute. »",
        choix: [
          { texte: 'Qu’a trouvé le légiste ?', cond: { pasIndice: 'legiste2' }, suite: 'legiste' },
          { texte: 'Je peux vous aider, inspecteur ?', cond: { pasDrapeau: 'offre_gribble2' }, suite: 'marche' },
          { texte: 'Les obligations sont à l’entrepôt 7 de Limehouse.', cond: [{ ou: [{ indice: 'aveu_margot2' }, { indice: 'aveu_edmund' }] }, { pasDrapeau: 'gribble_entrepot2' }, { pasIndice: 'obligations' }], suite: 'entrepot' },
          { texte: 'Je sais qui a tué Tobias Reed.', action: 'accuser' },
          { texte: 'Rien. Au revoir.' },
        ],
      },
      legiste: { texte: "« Mort vers 2 h 15. Un coup à la tempe, avec quelque chose de lourd, en laiton d'après les traces. Une grosse clé, un chandelier… On cherche. »", effets: { indice: 'legiste2' }, choix: [{ texte: 'Merci.', suite: 'menu' }] },
      marche: {
        texte: "« Simple : signez que le cabinet Vane soutient l'inculpation de Hannah Bright. La presse aime les serrurières meurtrières, mes chefs aussi. »",
        effets: { drapeau: { offre_gribble2: true } },
        choix: [
          { texte: 'Je signe.', effets: { drapeau: { soutien2: true }, yard: 15, justice: -15, journal: "Tu as signé le soutien à l'inculpation de Hannah Bright." }, suite: 'menu' },
          { texte: 'Pas sans preuve. Encore une fois.', effets: { justice: 5, yard: -5, journal: "Tu as refusé d'appuyer l'inculpation de Hannah Bright." }, suite: 'menu' },
        ],
      },
      entrepot: { texte: (e) => (e.drapeaux.prec_gribble_entrepot ? "« Encore Limehouse ? La dernière fois, vous aviez raison. J'y envoie mes hommes cette nuit. »" : "« Limehouse ? Si c'est vrai, j'y serai cette nuit avec six constables. »"), effets: { drapeau: { gribble_entrepot2: true }, lieu: 'entrepot', yard: 10, justice: 3, journal: "Tu as prévenu Gribble pour l'entrepôt de Limehouse." }, choix: [{ texte: 'Bonne chasse.', suite: 'menu' }] },
    },

    crale: {
      debut: {
        texte: (e) => {
          const d = e.drapeaux;
          if (d.prec_innocent === 'crale') return "Oswin Crale se raidit. « Vous ! Vous m'avez fait passer une nuit dans une cellule du Yard. Faites vite, et sortez. »";
          if (d.prec_plans_rendus) return "Oswin Crale vous serre la main à deux mains. « Vous m'avez rendu les plans de la Sentinelle, et voilà comment on me remercie… On m'a quand même dévalisé. Aidez-moi. »";
          if (d.prec_crale_paye) return "Oswin Crale baisse la voix. « Vous avez su vous taire, la dernière fois. J'espère que vous saurez aussi chercher. »";
          return "Oswin Crale a vieilli de dix ans en une nuit. « Trente mille livres, et ce pauvre Reed… Que voulez-vous savoir ? »";
        },
        choix: [
          { texte: 'Qui connaît la combinaison de la Sentinelle ?', cond: { pasIndice: 'combinaison' }, suite: 'comb' },
          { texte: 'Votre fils dit avoir passé la nuit au Reform Club.', cond: [{ drapeau: 'alibi_edmund' }, { pasIndice: 'faux_alibi_e' }], suite: 'reform' },
          { texte: 'Puis-je voir votre maison, à Mayfair ?', cond: { pasDrapeau: 'manoir_permis' }, suite: 'maison' },
          { texte: 'Votre fils a tué Tobias Reed. Combien vaut mon silence ?', cond: { ou: [{ deduction: 'edmund_banque' }, { indice: 'aveu_edmund' }] }, suite: 'chantage' },
          { texte: 'Au revoir, monsieur.' },
        ],
      },
      comb: { texte: "« Trois personnes : moi, mon fils Edmund, et Miss Bright, qui l'a réglée. Mon fils, vous n'y pensez pas. Quant à moi… j'ai la mémoire qui flanche, je la garde dans mon carnet. »", effets: { indice: 'combinaison' }, choix: [{ texte: 'Dans votre carnet…', suite: 'debut' }] },
      reform: { texte: "Le vieil homme pâlit. « Au Reform ? Edmund en a été radié l'an dernier. Pour… dettes de jeu. » Il s'assoit lourdement.", effets: { indice: 'faux_alibi_e' }, choix: [{ texte: 'Je suis désolé.', suite: 'debut' }] },
      maison: { texte: "« Si cela peut servir… Le majordome vous ouvrira. Je n'y suis que le soir, et mon fils… mon fils dort jusqu'à midi. »", effets: { drapeau: { manoir_permis: true }, lieu: 'manoir' }, choix: [{ texte: 'Merci.', suite: 'debut' }] },
      chantage: {
        texte: "Le banquier ferme les yeux très longtemps. « Cinq cents livres. Et la même somme chaque année, tant que vous vous tairez. Mon fils partira pour les Indes. Et Miss Bright… Miss Bright sera défendue par le meilleur avocat de Londres, je vous le promets. »",
        choix: [
          { texte: 'Marché conclu.', effets: { argent: 10000, justice: -30, yard: -10, drapeau: { chantage: true }, journal: 'Tu as vendu ton silence à Oswin Crale : cinq cents livres par an.', fin: 'chantage' } },
          { texte: 'Non. Votre fils répondra de ce qu’il a fait.', effets: { justice: 5 }, suite: 'debut' },
        ],
      },
    },

    edmund: {
      debut: {
        texte: "Un jeune homme blond, chevalière à l'auriculaire, cernes jusqu'aux joues. « Edmund Crale. Vous êtes de la police ? Quelle horreur, ce pauvre Reed. Je le connaissais depuis que j'étais tout petit. »",
        choix: [
          { texte: 'Où étiez-vous mardi, à 2 h du matin ?', unique: true, suite: 'alibi' },
          { texte: 'Vous jouez gros au Lion Rouge, paraît-il.', cond: { ou: [{ indice: 'dettes_edmund' }, { indice: 'temoin_reed' }] }, unique: true, suite: 'jeu' },
          { texte: 'Le fiacre, la chemise, la dette effacée : vous étiez à la banque.', cond: [{ deduction: 'edmund_banque' }, { ou: [{ deduction: 'mobile_edmund' }, { indice: 'faux_alibi_e' }, { deduction: 'visiteur_2h' }] }], suite: 'craque' },
          { texte: 'Au revoir.' },
        ],
      },
      alibi: { texte: "« Au Reform Club, jusqu'à trois heures. Whist, cigares, ennui. Tout le monde vous le dira. »", effets: { drapeau: { alibi_edmund: true } }, choix: [{ texte: 'Je vérifierai.', suite: 'debut' }] },
      jeu: { texte: "Ses doigts tournent sa chevalière. « Un gentleman a le droit de s'amuser. Mes dettes sont… réglées. Toutes. » Il a dit « réglées » comme on avale une arête.", choix: [{ texte: 'Réglées par qui ?', suite: 'debut' }] },
      craque: {
        texte: "Edmund s'effondre dans un fauteuil. « Je ne voulais pas… Le Doyen effaçait tout, trois mille livres, contre une nuit. J'avais lu la combinaison dans le carnet de mon père. Reed m'a ouvert, il me connaissait. Et puis il a vu le fiacre, il a voulu siffler… J'avais la manivelle dans la main. » Il relève la tête. « J'ai deux cents livres en billets. Laissez-moi prendre le bateau de Calais. »",
        effets: { indice: 'aveu_edmund' },
        choix: [
          { texte: '(Prendre l’argent et le laisser partir)', effets: { argent: 4000, justice: -20, yard: -5, drapeau: { edmund_paye: true, edmund_fui: true }, journal: "Tu as laissé Edmund Crale fuir pour Calais contre deux cents livres." } },
          { texte: 'Où sont les obligations ?', suite: 'ou' },
        ],
      },
      ou: { texte: "« À Limehouse, l'entrepôt 7, dans une caisse marquée d'une chandelle. Le Doyen doit venir les chercher. Mon Dieu, il va me tuer… »", effets: { lieu: 'entrepot', journal: 'Edmund Crale a avoué le meurtre de Tobias Reed.' }, choix: [{ texte: 'Vous direz tout à l’inspecteur Gribble.', effets: { justice: 3 } }] },
    },

    hannah: {
      debut: {
        texte: (e) => {
          const d = e.drapeaux;
          const intro = d.prec_innocent === 'hannah' ? "Hannah te fixe, glaciale. « Le mois dernier, c'est vous qui m'avez envoyée en cellule. Et voilà qu'ils recommencent. »" : d.arthur_libre ? "Hannah relève ses lunettes. « Arthur et moi avons repris l'atelier. Et maintenant, le Yard dit que j'ai tué ce pauvre veilleur. »" : "Hannah serre son chiffon. « La Sentinelle, c'était le dernier travail de M. Fenwick. Je l'ai finie pour lui. Et maintenant, on m'accuse. »";
          return intro;
        },
        choix: [
          { texte: 'Qui connaît la combinaison ?', cond: { pasIndice: 'combinaison' }, unique: true, suite: 'comb' },
          { texte: 'Où étiez-vous mardi, à 2 h du matin ?', unique: true, suite: 'stbride' },
          { texte: 'La Sentinelle peut-elle être crochetée ?', unique: true, suite: 'crochet' },
          { texte: 'Au revoir, Hannah.' },
        ],
      },
      comb: { texte: "« M. Crale, son fils, et moi. Je la lui ai donnée en main propre, en lui disant de l'apprendre par cœur. Il a ri. Il a dit qu'il avait un carnet pour ça. »", effets: { indice: 'combinaison' }, choix: [{ texte: 'Un carnet…', suite: 'debut' }] },
      stbride: { texte: "« À St Bride. Je règle l'horloge du clocher tous les mardis à 2 h, quand les cloches se taisent. Le bedeau signe mon carnet de réglages, il est sur l'établi. »", effets: { drapeau: { stbride: true } }, choix: [{ texte: 'Je vais le regarder.', suite: 'debut' }] },
      crochet: { texte: "« Jamais. J'y ai mis six goupilles folles et un faux pêne. Sans la combinaison, il faudrait de la dynamite, et on aurait entendu le boum jusqu'à Brighton. »", choix: [{ texte: 'Donc quelqu’un connaissait le code.', suite: 'debut' }] },
    },

    arthur: {
      entree: [{ cond: { drapeau: 'arthur_libre' }, noeud: 'libre' }, { cond: null, noeud: 'cellule' }],
      libre: {
        texte: "Arthur Fenwick, rasé de frais, un tablier de cuir sur le dos. « Vous ! Je vous dois la vie. Demandez-moi ce que vous voulez. »",
        choix: [
          { texte: 'Où était Hannah mardi soir ?', unique: true, suite: 'alibi' },
          { texte: 'Vous connaissez encore du monde au Lion Rouge ?', unique: true, suite: 'tuyau' },
          { texte: 'Au revoir, Arthur.' },
        ],
      },
      alibi: { texte: "« Avec moi ! Je l'ai accompagnée à St Bride pour régler l'horloge, et ramenée à trois heures. Le bedeau nous a même offert du thé. »", effets: { indice: 'alibi_hannah', drapeau: { stbride: true } }, choix: [{ texte: 'Merci, Arthur.', suite: 'libre' }] },
      tuyau: { texte: "« J'y ai laissé assez d'argent pour le savoir : un jeune rupin perd des fortunes dans l'arrière-salle de Bill. Un fils de banquier, un Crale. Pip vous en dira plus. »", effets: { lieu: 'pub' }, choix: [{ texte: 'Bien.', suite: 'libre' }] },
      cellule: {
        texte: "Derrière les barreaux, Arthur Fenwick a maigri. « Vous revenez voir votre œuvre ? J'attends mon procès pour un meurtre que je n'ai pas commis. »",
        choix: [
          { texte: 'Je suis désolé, Arthur.', unique: true, effets: { justice: 2 }, suite: 'tuyau2' },
          { texte: 'Je reviendrai.' },
        ],
      },
      tuyau2: { texte: "Il soupire. « Si vous voulez vous rendre utile… Au Lion Rouge, un fils de banquier perdait des fortunes à la table de Bill. Un Crale. Ça vous intéresse ? »", effets: { lieu: 'pub' }, choix: [{ texte: 'Beaucoup.' }] },
    },

    lusk: {
      entree: [{ cond: { drapeau: 'lusk_cellule' }, noeud: 'cellule' }, { cond: null, noeud: 'boutique' }],
      cellule: {
        texte: "Victor Lusk, en tenue de prisonnier, sourit sans joie. « Tiens, mon bourreau. Vous venez me demander un service ? »",
        choix: [
          { texte: '(Promettre un mot au juge) Que savez-vous de la Chandelle et des Crale ?', cond: { pasIndice: 'tuyau_lusk' }, effets: { justice: -3, yard: -3 }, suite: 'tuyau' },
          { texte: 'Rien. Pourrissez ici.' },
        ],
      },
      boutique: {
        texte: "Lusk sursaute en te voyant. « Encore vous… Je n'ai rien fait, cette fois. Je ne sors même plus. »",
        choix: [
          { texte: '(Une livre) Qui, chez les Crale, travaille pour le Doyen ?', cond: [{ argent: 20 }, { pasIndice: 'tuyau_lusk' }], effets: { argent: -20 }, suite: 'tuyau' },
          { texte: 'Je pourrais rouvrir l’affaire Fenwick, vous savez.', cond: [{ yard: 10 }, { pasIndice: 'tuyau_lusk' }], effets: { yard: 3 }, suite: 'tuyau' },
          { texte: 'Au revoir.' },
        ],
      },
      tuyau: { texte: "« Le Doyen a un homme dans la famille Crale. Pas le vieux : le fils. Il joue chez Bill, et la Fauvette lui fait des yeux doux. Le reste, je ne veux pas le savoir. »", effets: { indice: 'tuyau_lusk', lieu: ['manoir', 'music', 'pub'] }, choix: [{ texte: 'Merci, Victor.' }] },
    },

    pip: {
      debut: {
        texte: (e) => (e.drapeaux.prec_fin_justice || e.drapeaux.prec_fin_double_jeu ? "« M'sieur ! C'est grâce à vous qu'Arthur est sorti ! Pour vous, l'info est à moitié prix. »" : "« M'sieur ! Une info, c'est un penny. Deux si elle est bonne. »"),
        choix: [
          { texte: '(Un shilling) Tu as vu quelque chose près de la banque Crale, mardi dans la nuit ?', cond: [{ argent: 1 }, { pasIndice: 'temoin_pip2' }], effets: { argent: -1 }, suite: 'fiacre' },
          { texte: '(Deux shillings) Occupe Bill une minute.', cond: [{ argent: 2 }, { pasDrapeau: 'bill_occupe' }], effets: { argent: -2 }, suite: 'diversion' },
          { texte: 'Pas maintenant, Pip.' },
        ],
      },
      fiacre: { texte: "« Les Moineaux dorment pas dans la City, m'sieur. Vers deux heures, un fiacre devant la banque. Un jeune monsieur en habit est sorti, avec une chevalière qui brillait sous le bec de gaz. Et sur le siège, Jem le Borgne, un gars de la Chandelle. »", effets: { indice: 'temoin_pip2' }, choix: [{ texte: 'Merci, Pip.' }] },
      diversion: { texte: "Pip file vers le fond de la salle. Une seconde plus tard, un fracas de chopes brisées et des hurlements : Bill se rue vers l'arrière-salle en jurant. Le comptoir est libre.", effets: { drapeau: { bill_occupe: true } }, choix: [{ texte: '(Vite.)' }] },
    },

    bill: {
      debut: {
        texte: (e) => (e.drapeaux.prec_travail_bill ? "« Tiens, mon coursier de la semaine dernière ! T'as soif, ou t'as faim d'un nouveau boulot ? »" : "Gros Bill essuie une chope sans te quitter des yeux. « On ferme pas pour les gens comme toi. Mais on parle pas non plus. »"),
        choix: [
          { texte: 'Le jeune Crale te devait de l’argent ?', unique: true, suite: 'muet' },
          { texte: 'Le Doyen se fait vieux, Bill. Et si on travaillait ensemble, toi et moi ?', cond: [{ ou: [{ drapeau: 'prec_travail_bill' }, { yard: -15 }] }, { pasDrapeau: 'bill_allie' }], suite: 'allie' },
          { texte: '(Montrer les obligations) Avec ça, on n’a plus besoin du Doyen.', cond: [{ indice: 'obligations' }, { drapeau: 'bill_allie' }], suite: 'chef' },
          { texte: 'Rien, Bill.' },
        ],
      },
      muet: { texte: "« Mes clients, c'est comme mes tonneaux : je les ouvre pas devant les étrangers. »", choix: [{ texte: 'Dommage.', suite: 'debut' }] },
      allie: {
        texte: "Bill pose sa chope. Longtemps. « Le vieux paie mal et punit fort. Si t'as un plan, je t'écoute. Et pour te prouver ma bonne foi… » Il tapote le comptoir. « Mon registre est là-dessous. Sers-toi. »",
        choix: [
          { texte: 'Marché conclu, Bill.', effets: { drapeau: { bill_allie: true }, justice: -10, yard: -10, journal: "Tu t'es allié à Gros Bill, dans le dos du Doyen." } },
          { texte: 'Je vais réfléchir.', suite: 'debut' },
        ],
      },
      chef: {
        texte: "Bill siffle entre ses dents en voyant les liasses. « Trente mille… Avec ça, on achète tous les flics de Whitechapel et la moitié des dockers. Le vieux n'aura plus que ses chandelles pour pleurer. Alors, patron ? »",
        choix: [
          { texte: 'On prend la Chandelle. Cette nuit.', effets: { drapeau: { chef: true }, argent: 2000, justice: -25, yard: -25, journal: 'Avec Gros Bill et les obligations, tu as pris la tête de la pègre de Whitechapel.', fin: 'chef' } },
          { texte: 'Pas encore.', suite: 'debut' },
        ],
      },
    },

    margot: {
      debut: {
        texte: (e) => (e.drapeaux.doyen_ami ? "Margot t'embrasse sur les deux joues. « Notre nouvel ami ! Le Doyen est content de toi, tu sais. »" : e.drapeaux.prec_fin_justice ? "Margot se raidit. « Vous. Victor est à Newgate à cause de vous. Que voulez-vous, cette fois ? »" : "Margot se poudre devant son miroir. « Encore un admirateur sans fleurs. »"),
        choix: [
          { texte: 'Où sont les obligations, Margot ?', cond: [{ drapeau: 'doyen_ami' }, { pasIndice: 'aveu_margot2' }], suite: 'aveu' },
          { texte: 'Silas Crane vous salue.', cond: [{ drapeau: 'prec_nom_doyen' }, { pasIndice: 'aveu_margot2' }], unique: true, suite: 'crane' },
          { texte: '(Deux livres) Le jeune Edmund Crale vous fait la cour, je crois ?', cond: [{ argent: 40 }, { pasIndice: 'aveu_margot2' }], effets: { argent: -40, justice: -2 }, suite: 'aveu' },
          { texte: 'Je travaille avec Vane. Parlez, ou c’est Newgate.', cond: [{ yard: 10 }, { pasIndice: 'aveu_margot2' }], effets: { yard: 3 }, suite: 'aveu' },
          { texte: 'Et si je rejoignais la Chandelle ?', cond: [{ pasDrapeau: 'doyen_ami' }, { pasDrapeau: 'doyen_ennemi' }], suite: 'offre' },
          { texte: 'Au revoir, Margot.' },
        ],
      },
      crane: { texte: "Margot laisse tomber sa houppette. « Ce nom-là ne se prononce pas ici. » Elle regarde la porte. « Très bien. Je vous dis ce que vous voulez, et vous m'oubliez. »", choix: [{ texte: 'Je vous écoute.', suite: 'aveu' }] },
      aveu: { texte: "« Edmund m'a tout raconté, il parle quand il boit. Les obligations sont à Limehouse, entrepôt 7. Le Doyen viendra les prendre une de ces nuits. »", effets: { indice: 'aveu_margot2', lieu: 'entrepot', journal: "La Fauvette t'a dit où dorment les obligations." }, choix: [{ texte: 'Merci, Margot.' }] },
      offre: {
        texte: "Elle sourit dans le miroir. « Le Doyen aime les gens utiles. Va à l'entrepôt 7, la nuit. Il y sera. Et s'il te demande un service, rends-le-lui. »",
        effets: { drapeau: { doyen_ami: true }, yard: -15, journal: 'Tu as proposé tes services à la Chandelle.' },
        choix: [{ texte: 'J’y serai.', suite: 'aveu' }],
      },
    },

    gardien: {
      debut: {
        texte: "Le docker trapu, une lanterne et un gourdin. « Encore toi ? T'as la mémoire courte. »",
        choix: [
          { texte: 'Le Doyen m’attend.', cond: { drapeau: 'doyen_ami' }, effets: { drapeau: { gardien_ecarte: true } }, suite: 'passe' },
          { texte: '(Lui offrir une livre)', cond: { argent: 20 }, effets: { argent: -20, justice: -2, drapeau: { gardien_ecarte: true } }, suite: 'passe' },
          { texte: '(L’attaquer)', suite: 'combat' },
          { texte: '(Reculer lentement)' },
        ],
      },
      passe: { texte: "Il s'écarte en grognant. « Fais vite. »", choix: [{ texte: '…' }] },
      combat: {
        texte: (e) => (e.blesse ? "Ton bras blessé ne suit pas. Le gourdin s'abat…" : "Il frappe fort, mais tu l'envoies rouler entre les caisses. Ta main saigne."),
        effets: { blesse: true, drapeau: { gardien_ecarte: true } },
        choix: [{ texte: '…' }],
      },
    },

    doyen: {
      debut: {
        texte: (e) => `La silhouette au long manteau sort de l'ombre. « Mon jeune ami. ${e.drapeaux.mission_doyen ? "Le Yard regarde-t-il bien l'apprentie, comme je te l'ai demandé ?" : 'Margot m’a dit que tu voulais me rendre service.'} »`,
        choix: [
          { texte: '(Lui remettre les obligations)', cond: { indice: 'obligations' }, effets: { drapeau: { bras_droit: true }, argent: 2000, justice: -20, yard: -20, journal: 'Tu as remis les obligations au Doyen.', fin: 'bras_droit' } },
          { texte: 'Que voulez-vous de moi ?', cond: { pasDrapeau: 'mission_doyen' }, suite: 'mission' },
          { texte: 'Je ne travaille plus pour vous.', effets: { drapeau: { trahi_doyen2: true, doyen_ami: false, doyen_ennemi: true }, yard: 5, journal: 'Tu as tourné le dos au Doyen.' }, suite: 'menace' },
          { texte: '(Te retirer)' },
        ],
      },
      mission: { texte: "« Que le Yard pende la petite Bright. Le fils Crale doit rester propre, il me sert encore. Et apporte-moi la caisse à la chandelle, si mes dockers ne l'ont pas déjà fait. »", effets: { drapeau: { mission_doyen: true } }, choix: [{ texte: 'Bien, Doyen.' }] },
      menace: { texte: "« Dommage. Les ingrats vivent rarement vieux, à Londres. » Il disparaît dans le brouillard. Tu entends des pas derrière toi, et puis plus rien.", choix: [{ texte: '…' }] },
    },
  },

  // ---------------------------------------------------------------- ruelles la nuit
  rencontres: [
    {
      id: 'surineur',
      texte: "Une silhouette surgit d'une porte cochère, une lame à la main. « Ta bourse, ou ta gorge. »",
      choix: [
        { texte: 'Fuir', issues: [{ chance: 0.6, texte: 'Tu le perds dans le brouillard.', effets: { temps: 10 } }, { chance: 0.4, texte: 'La lame t’entaille le bras pendant que tu fuis.', effets: { blesse: true, temps: 10 } }] },
        { texte: 'Donner ta bourse', issues: [{ chance: 1, texte: 'Il prend l’argent et disparaît.', effets: { argent: -15 } }] },
        { texte: 'Te battre', issues: [{ chance: 0.45, texte: 'Tu le désarmes ; il s’enfuit en jurant.', effets: { justice: 1 } }, { chance: 0.35, texte: 'Tu le repousses, mais la lame t’a touché.', effets: { blesse: true } }, { chance: 0.2, texte: 'La lame trouve ton ventre. Le pavé est froid…', effets: { mort: 'Poignardé dans une ruelle de Londres.' } }] },
        { texte: 'Parler l’argot de la Chandelle', cond: { yard: -15 }, issues: [{ chance: 1, texte: '« Désolé, l’ami, je t’avais pas reconnu. »', effets: {} }] },
      ],
    },
    {
      id: 'bande',
      texte: "Trois gaillards t'encerclent sous un bec de gaz éteint. « Un monsieur bien mis, si loin de chez lui… »",
      choix: [
        { texte: 'Fuir', issues: [{ chance: 0.5, texte: 'Tu glisses entre eux et tu détales.', effets: { temps: 10 } }, { chance: 0.5, texte: 'Un coup de gourdin t’atteint à l’épaule.', effets: { blesse: true, temps: 10 } }] },
        { texte: 'Payer (10 shillings)', cond: { argent: 10 }, issues: [{ chance: 1, texte: 'Ils empochent l’argent en ricanant.', effets: { argent: -10 } }] },
        { texte: 'Te réclamer de l’inspecteur Gribble', cond: { yard: 15 }, issues: [{ chance: 0.7, texte: '« Un ami des cognes… » Ils s’écartent.', effets: {} }, { chance: 0.3, texte: '« Raison de plus ! » Les coups pleuvent.', effets: { blesse: true } }] },
        { texte: 'Parler l’argot de la Chandelle', cond: { yard: -15 }, issues: [{ chance: 1, texte: '« Un gars du Doyen ? Passe ton chemin. »', effets: {} }] },
      ],
    },
    {
      id: 'vengeance',
      cond: { drapeau: 'doyen_ennemi' },
      texte: "Deux hommes t'attendent au coin de la rue, une chandelle peinte sur la manche. « Le Doyen n'oublie personne. Il te fait ses amitiés. »",
      choix: [
        { texte: 'Fuir', issues: [{ chance: 0.5, texte: 'Tu sautes une palissade et tu disparais.', effets: { temps: 15 } }, { chance: 0.5, texte: 'Une matraque te cueille à la nuque avant que tu ne t’échappes.', effets: { blesse: true, temps: 15 } }] },
        { texte: 'Te battre', issues: [{ chance: 0.35, texte: 'Tu en assommes un ; l’autre détale.', effets: { justice: 2 } }, { chance: 0.4, texte: 'Tu t’en sors, mais en sang.', effets: { blesse: true } }, { chance: 0.25, texte: 'Ils étaient payés pour finir le travail. Ils le finissent.', effets: { mort: 'Exécuté par les hommes du Doyen.' } }] },
        { texte: 'Siffler les constables de Gribble', cond: { yard: 20 }, issues: [{ chance: 0.8, texte: 'Des sifflets répondent au tien ; les deux hommes s’évaporent.', effets: {} }, { chance: 0.2, texte: 'Personne ne répond. Les coups pleuvent.', effets: { blesse: true } }] },
      ],
    },
  ],

  // ---------------------------------------------------------------- accusation
  suspects: ['hannah', 'edmund', 'crale', 'bill'],
  option: { indice: 'obligations', cle: 'obligations', nom: 'Les obligations au porteur', cache: ['bras_droit', 'chef'], choix: [['rendre', 'Les rendre à la banque Crale (récompense)'], ['garder', 'En garder une partie pour toi']] },
  accusation(e, suspect, preuves, options = {}) {
    const has = (x) => preuves.includes(x);
    const avecObl = e.indices.includes('obligations');
    if (suspect === 'edmund') {
      if (e.drapeaux.edmund_fui) return { fin: 'relache', verdict: "Edmund Crale a pris le bateau de Calais : on ne l'arrêtera pas.", effets: { yard: -10, journal: 'Tu as accusé Edmund Crale après l’avoir laissé fuir.' } };
      const force = ED_FORTES.filter(has).length;
      if (force < 3) return { fin: 'relache', verdict: `Trop peu de preuves (${force}/3) : les avocats de Crale font libérer Edmund en une heure.`, effets: { yard: -10, journal: 'Tu as accusé Edmund Crale sans assez de preuves.' } };
      const choix = avecObl ? options.obligations || 'rendre' : null;
      if (choix === 'garder') return { fin: 'double_jeu', verdict: "Edmund Crale est arrêté. On ne retrouve qu'une partie des obligations.", effets: { argent: 3000, justice: -25, drapeau: { obligations_gardees: true }, journal: 'Tu as gardé une liasse d’obligations pour toi.' } };
      return { fin: 'justice', verdict: choix ? 'Edmund Crale est arrêté et les obligations rendues à la banque.' : 'Edmund Crale est arrêté. Mais les obligations restent introuvables.', effets: { justice: 20, yard: 15, argent: choix ? 1000 : 0, drapeau: choix ? { obligations_rendues: true } : {}, journal: choix ? 'Tu as rendu les obligations à la banque Crale (cinquante livres de récompense).' : 'Les obligations sont restées entre les mains de la Chandelle.' } };
    }
    if (suspect === 'personne') return { fin: 'delai', verdict: 'Sans autre suspect, Gribble fait inculper Hannah Bright.', effets: { journal: 'Tu as renoncé à accuser qui que ce soit.' } };
    if (suspect === 'hannah' && e.drapeaux.mission_doyen && e.drapeaux.doyen_ami) return { fin: 'complice', verdict: 'Hannah Bright est inculpée pour le meurtre de Tobias Reed.', effets: { yard: 10, justice: -30, argent: 400, drapeau: { innocent: 'hannah', complice: true }, journal: 'Tu as livré Hannah Bright au Yard, comme le voulait le Doyen.' } };
    const nom = { hannah: 'Hannah Bright', crale: 'Oswin Crale', bill: 'Gros Bill' }[suspect] || suspect;
    const savait = suspect === 'hannah' && e.deductions.includes('hannah_innocente');
    return { fin: 'erreur', verdict: `${nom} est inculpé${suspect === 'hannah' ? 'e' : ''} pour le meurtre de Tobias Reed.`, effets: { yard: 10, justice: savait ? -30 : -15, drapeau: { innocent: suspect }, journal: `Tu as fait inculper ${nom}${savait ? ', en sachant que c’était faux' : ''}.` } };
  },

  titres: [
    { nom: 'Le nouveau Doyen', cond: { drapeau: 'chef' } },
    { nom: 'Bras droit du Doyen', cond: { drapeau: 'bras_droit' } },
    { nom: 'Maître chanteur', cond: { drapeau: 'chantage' } },
    { nom: 'Complice de la Chandelle', cond: { drapeau: 'complice' } },
    ...TITRES,
  ],

  // ---------------------------------------------------------------- fins
  fins: {
    justice: { titre: 'Justice rendue', bonne: true, texte: (e) => `Edmund Crale sort de Mayfair entre deux constables, sous les yeux de son père. Hannah Bright est libre. ${e.drapeaux.obligations_rendues ? "Les obligations retrouvent la chambre forte, et le vieux Crale te remet cinquante livres d'une main qui tremble." : 'Mais quelque part à Limehouse, trente mille livres attendent le Doyen.'} Mrs Reed vient te serrer la main, sans un mot.`, suite: (e) => (e.drapeaux.obligations_rendues ? 'Au chapitre 3, le Doyen a perdu deux fois à cause de toi. Il ne perdra pas une troisième.' : 'Au chapitre 3, la Chandelle est plus riche que jamais.') },
    double_jeu: { titre: 'Le double jeu', texte: "Edmund Crale est arrêté, la presse t'acclame, et personne ne compte les liasses qui manquent. Sauf peut-être Vane, qui regarde tes chaussures neuves.", suite: 'Au chapitre 3, quelqu’un essaie d’écouler une obligation de la banque Crale… et la piste mène chez toi.' },
    erreur: { titre: 'L’erreur', texte: (e) => `${e.accusation?.suspect === 'hannah' ? 'Hannah Bright' : e.accusation?.suspect === 'crale' ? 'Oswin Crale' : 'Gros Bill'} est conduit${e.accusation?.suspect === 'hannah' ? 'e' : ''} à Newgate sous les sifflets de la foule. Edmund Crale assiste à l'audience, très pâle, et part pour les Indes la semaine suivante.`, suite: 'Au chapitre 3, un innocent attend son procès. Et le vrai coupable a quitté l’Angleterre.' },
    complice: { titre: 'Le complice', texte: "Hannah Bright est inculpée. Le soir même, une enveloppe glissée sous ta porte : vingt livres et une chandelle dessinée. Vane ne te parle plus.", suite: 'Au chapitre 3, le Doyen a une nouvelle mission pour toi. Et Vane a commencé sa propre enquête… sur toi.' },
    relache: { titre: 'Faute de preuves', texte: (e) => (e.drapeaux.edmund_fui ? "Edmund Crale vogue vers Calais avec tes remerciements dans sa poche. Gribble te regarde comme on regarde un menteur." : "Les avocats du vieux Crale font libérer son fils en une heure. Gribble te fusille du regard, et Hannah Bright reste suspecte."), suite: 'Au chapitre 3, Edmund Crale court toujours. Le Doyen aussi.' },
    delai: { titre: 'Trop tard', texte: "Jeudi soir, Gribble inculpe Hannah Bright. La presse applaudit. Mrs Reed, elle, ne croit pas un mot de ce qu'elle lit.", suite: 'Au chapitre 3, une innocente attend son procès, et le meurtrier dort dans un lit de Mayfair.' },
    bras_droit: { titre: 'Le bras droit', texte: "Le Doyen soupèse les liasses, puis te tend la main. Pour la première fois, tu vois son visage : un vieil homme aux yeux très doux. « Désormais, tu parles en mon nom. »", suite: 'Au chapitre 3, tu es le bras droit du Doyen. Et Vane a juré de te faire tomber.' },
    chef: { titre: 'Le nouveau Doyen', texte: "Cette nuit-là, les hommes de Bill vident l'entrepôt 7. Au matin, toute la pègre de Whitechapel sait qu'il y a un nouveau nom à craindre. Le Doyen, lui, a disparu. Pour l'instant.", suite: 'Au chapitre 3, tu règnes sur Whitechapel. Mais un roi a toujours des ennemis : le Yard, Vane… et un vieil homme qui n’a pas dit son dernier mot.' },
    chantage: { titre: 'Le maître chanteur', texte: "Edmund Crale part pour Bombay. Le vieux Crale paie, et paiera chaque année. L'avocat de Hannah Bright est excellent, comme promis. Mrs Reed n'aura jamais de réponse.", suite: 'Au chapitre 3, tu es riche. Et un homme riche a beaucoup à perdre.' },
    mort: { titre: 'Mort à Londres', texte: (e) => `${e.mort || 'Ton enquête s’arrête là.'} Le brouillard recouvre tout.`, suite: 'Tu reprends au dernier matin.' },
  },
};
