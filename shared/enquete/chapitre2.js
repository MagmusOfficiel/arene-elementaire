// =====================================================================
//  LES OMBRES DE BAKER STREET — Chapitre 2 : La Chambre forte de la City
//  Une enquête indépendante, débloquée quand le chapitre 1 est résolu.
// =====================================================================
import { PLANS2 } from './plans2.js';

const J = 1440;
const NOMS = { hannah: 'Hannah Bright', edmund: 'Edmund Crale', crale: 'Oswin Crale', bill: 'Gros Bill' };

export const chapitre2 = {
  id: 'ch2',
  titre: 'Chapitre 2 — La Chambre forte de la City',
  resume: "Une semaine après l'affaire Fenwick. Dans la nuit de mardi, la chambre forte de la banque Crale & Fils a été ouverte sans effraction : trente mille livres d'obligations au porteur ont disparu, et le veilleur de nuit, Tobias Reed, gît mort au pied de la porte d'acier. Le Yard soupçonne Hannah Bright, qui a posé la nouvelle serrure.",
  debut: { temps: 9 * 60, argent: 30, lieu: 'baker', lieux: ['baker', 'banque', 'yard', 'atelier'] },
  delai: { temps: 2 * J + 20 * 60, fin: 'delai', texte: 'Gribble veut inculper Hannah Bright avant le jour 3 à 20 h.', effets: { journal: 'Le délai a expiré : Gribble a fait inculper Hannah Bright.' } },
  verite: "Edmund Crale, le fils du banquier, devait trois mille livres à la table de jeu de Gros Bill, que tient la Chandelle. Le Doyen lui a proposé d'effacer sa dette contre une nuit. Mardi à 2 h, Edmund s'est présenté au veilleur Tobias Reed (« dossiers oubliés »), a ouvert la chambre forte avec la combinaison lue dans le carnet de son père, et quand Reed a compris, il l'a frappé avec la manivelle de la porte. Un homme de la Chandelle attendait dans un fiacre : les obligations ont fini à l'entrepôt 7 de Limehouse.",

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
    tuyau_lusk: { nom: 'Le tuyau de Lusk', desc: "Selon Victor Lusk, la Chandelle a un homme dans la famille Crale : le fils, qui joue chez Bill." },
    aveu_margot2: { nom: 'Confidence de la Fauvette', desc: "Les obligations attendent le Doyen à l'entrepôt 7 de Limehouse." },
    aveu_edmund: { nom: 'Aveux d’Edmund', desc: "Edmund a craqué : la dette, la combinaison, Reed qui voulait donner l'alerte, la manivelle." },
    obligations: { nom: 'Les obligations au porteur', desc: "Trente mille livres en papier, payables à qui les tient. La banque Crale les attend." },
  },

  // ---------------------------------------------------------------- déductions
  deductions: {
    interieur: { nom: 'Quelqu’un de l’intérieur', indices: ['porte_intacte', 'combinaison'], texte: "La porte n'a pas été forcée : celui qui l'a ouverte faisait partie des trois qui connaissaient la combinaison… ou l'a lue quelque part." },
    cle_du_pere: { nom: 'La combinaison du père', indices: ['porte_intacte', 'carnet_crale'], texte: "Pas besoin d'être serrurier : n'importe qui chez les Crale pouvait lire la combinaison dans le carnet du banquier." },
    visiteur_2h: { nom: 'Le visiteur de 2 h 10', indices: ['registre_garde', 'legiste2'], texte: "Reed a ouvert à un certain « M. E. » à 2 h 10, et il est mort cinq minutes plus tard. Il connaissait son assassin." },
    arme_manivelle: { nom: 'L’arme du crime', indices: ['legiste2', 'manivelle'], texte: "L'objet lourd en laiton, c'est la manivelle de la chambre forte elle-même." },
    mobile_edmund: { nom: 'Une dette effacée', indices: ['dettes_edmund', 'lettre_doyen'], texte: "La Chandelle a effacé les trois mille livres de dettes d'Edmund Crale… contre une nuit à la banque." },
    edmund_banque: { nom: 'Edmund était à la banque', indices: ['temoin_pip2', 'chemise'], texte: "Le jeune monsieur à la chevalière, c'était Edmund, et il en est revenu avec du sang sur la manchette." },
    hannah_innocente: { nom: 'Hannah est innocente', indices: ['alibi_hannah', 'legiste2'], texte: "À l'heure du crime, Hannah était à St Bride, à l'autre bout de la City." },
  },

  // ---------------------------------------------------------------- lieux (les meubles sont dans plans2.js)
  lieux: {
    baker: {
      nom: '7 Baker Street', quartier: 'Marylebone', carte: [22, 28], dormir: true, decor: 'baker',
      intro: "Le cabinet de Vane. Une veuve en noir attend sur le fauteuil des clients.",
      zones: [
        { id: 'journaux', texte: "Le Times : « CAMBRIOLAGE À LA BANQUE CRALE — un veilleur tué, trente mille livres envolées. Le Yard interroge la serrurière. »", temps: 5 },
        { id: 'tiroir', texte: "Le tiroir de Vane : du tabac, des factures et une coupure de presse sur l'arrestation de Victor Lusk, encadrée au crayon rouge.", temps: 2 },
        { id: 'fenetre', texte: "Un homme en casquette fait les cent pas sous le réverbère d'en face. Il lève les yeux vers ta fenêtre, puis s'éloigne.", temps: 2 },
      ],
    },
    banque: {
      nom: 'Banque Crale & Fils', quartier: 'City', carte: [68, 50], decor: 'banque', ouvert: { heures: [9, 17] },
      intro: "Des constables gardent l'entrée. Dans le bureau du banquier, la porte d'acier de la chambre forte est grande ouverte sur des étagères vides.",
      zones: [
        { id: 'chambre', texte: "La Sentinelle de Hannah Bright, intacte. Pas une rayure, pas une trace de pince : on l'a ouverte avec la combinaison.", effets: { indice: 'porte_intacte' } },
        { id: 'manivelle', texte: "La lourde manivelle de laiton brille un peu trop : on l'a essuyée. Mais dans les cannelures, il reste du sang séché.", effets: { indice: 'manivelle', temps: 15 } },
        { id: 'bureau', texte: "Le registre de Tobias Reed est resté sur sa table de veille. Dernière ligne, d'une main appliquée : « 2 h 10 — M. E. — dossiers oubliés. Ouvert. »", effets: { indice: 'registre_garde' } },
      ],
    },
    yard: {
      nom: 'Scotland Yard', quartier: 'Whitehall', carte: [40, 61], decor: 'yard',
      intro: "Le bureau de Gribble sent le poêle et le café brûlé. Au fond du couloir, dans une cellule, Victor Lusk attend son procès.",
      zones: [
        { id: 'tableau', texte: "À la craie : « CRALE — Bright (serrure, combinaison, clés) — À INCULPER AVANT JEUDI ». Le mot « Bright » est souligné trois fois.", temps: 5 },
      ],
    },
    atelier: {
      nom: 'Atelier Fenwick', quartier: 'Clerkenwell', carte: [58, 26], decor: 'atelier',
      intro: "Les horloges ont été remontées, l'établi rangé. Une enseigne neuve, encore à peindre : « Bright & Fenwick, serrures ».",
      zones: [
        { id: 'etabli', texte: "Le prototype de la Sentinelle, démonté. Hannah a noté en marge : « Incrochetable. Sans combinaison, il faudrait de la dynamite. »", temps: 5 },
        { id: 'carnet', cond: { drapeau: 'stbride' }, texte: "Le carnet des réglages de Hannah. Mardi : « St Bride, horloge du clocher, 1 h 45 – 2 h 40 », et la signature du bedeau.", effets: { indice: 'alibi_hannah' } },
        { id: 'porte', texte: "La porte enfoncée la semaine dernière a été remplacée. Une Sentinelle miniature la ferme désormais.", temps: 2 },
      ],
    },
    pub: {
      nom: 'Le Lion Rouge', quartier: 'Whitechapel', carte: [80, 46], danger: 0.45, decor: 'pub', ouvert: { heures: [11, 26] },
      intro: "Fumée et sciure. Gros Bill trône derrière son comptoir ; dans l'arrière-salle, on joue gros.",
      zones: [
        { id: 'cartes', texte: "Une partie de pharaon s'est terminée tard. Sous la table, un bouton de manchette en or gravé d'un « C ».", temps: 5 },
        { id: 'comptoir', cond: { drapeau: 'bill_occupe' }, texte: "Le gros registre des dettes de Bill. À la lettre C : « E.C. — 3 000 livres », rayé d'un trait, et en marge « effacé par ordre du D. »", effets: { indice: 'dettes_edmund' } },
      ],
    },
    manoir: {
      nom: 'Hôtel Crale, Mayfair', quartier: 'Mayfair', carte: [33, 38], decor: 'manoir', ouvert: { heures: [9, 23] },
      intro: "Un hôtel particulier de Mayfair, trop grand et trop silencieux. Un majordome t'introduit sans un mot.",
      zones: [
        { id: 'bureau', texte: "Sur le bureau d'Oswin Crale, un carnet de cuir. Au dos, d'une écriture tremblée de vieil homme qui oublie : une suite de chiffres. La combinaison.", effets: { indice: 'carnet_crale' } },
        { id: 'garderobe', texte: "Au fond de la garde-robe d'Edmund, roulée en boule : une chemise de soirée. La manchette droite est raide de sang et de graisse de laiton.", effets: { indice: 'chemise', temps: 15 } },
        { id: 'cheminee', texte: "Dans les cendres, un billet à demi brûlé. Une chandelle dessinée, et : « …la dette sera effacée. Mardi, 2 h. D. »", effets: { indice: 'lettre_doyen' } },
      ],
    },
    music: {
      nom: 'Le Lyre d’Or', quartier: 'Strand', carte: [44, 52], decor: 'music', ouvert: { heures: [18, 26] },
      intro: "La Fauvette chante ce soir. Dans la loge 3, un jeune homme à chevalière applaudit un peu trop fort.",
      zones: [
        { id: 'loge3', texte: "Sur le rebord de la loge, des violettes fraîches et une carte : « Pour M., de la part d'un ami de la City. E. »", temps: 5 },
      ],
    },
    entrepot: {
      nom: 'Entrepôt 7, Limehouse', quartier: 'Docks de Limehouse', carte: [90, 64], danger: 0.55, decor: 'entrepot', ouvert: { nuit: true },
      intro: "L'eau noire, les caisses, la lanterne. Rien n'a changé à l'entrepôt 7, sauf la caisse à la chandelle, neuve.",
      zones: [
        { id: 'caisses', cond: { ou: [{ drapeau: 'gardien_ecarte' }, { drapeau: 'gribble_entrepot2' }] }, texte: "Sous la toile cirée, des liasses épaisses, cachetées de cire rouge : les obligations au porteur de la banque Crale.", effets: { indice: 'obligations', journal: 'Tu as retrouvé les obligations volées à Limehouse.' } },
      ],
    },
  },

  // ---------------------------------------------------------------- personnages
  personnages: {
    vane: { nom: 'Cornelius Vane', role: 'Détective consultant', couleur: '#3a4a3a', lieux: [{ lieu: 'baker', cond: { heures: [7, 24] } }] },
    pell: { nom: 'Mrs Agatha Pell', role: 'Logeuse', couleur: '#6a4a5a', lieux: [{ lieu: 'baker' }] },
    reed: { nom: 'Martha Reed', role: 'La veuve du veilleur', couleur: '#2a2a3a', lieux: [{ lieu: 'baker', cond: { avant: 18 * 60 } }] },
    gribble: { nom: 'Inspecteur Gribble', role: 'Scotland Yard', couleur: '#2a3a5a', lieux: [{ lieu: 'yard', cond: { heures: [8, 21] } }] },
    lusk: { nom: 'Victor Lusk', role: 'En cellule', couleur: '#5a2a2a', lieux: [{ lieu: 'yard' }] },
    crale: { nom: 'Oswin Crale', role: 'Banquier', couleur: '#4a4a2a', lieux: [{ lieu: 'banque' }, { lieu: 'manoir', cond: { heures: [18, 23] } }] },
    edmund: { nom: 'Edmund Crale', role: 'Le fils du banquier', couleur: '#3a2a4a', lieux: [{ lieu: 'manoir', cond: { heures: [10, 20] } }, { lieu: 'pub', cond: { heures: [21, 26] } }] },
    hannah: { nom: 'Hannah Bright', role: 'Serrurière', couleur: '#5a6a7a', lieux: [{ lieu: 'atelier', cond: { heures: [9, 18] } }] },
    arthur: { nom: 'Arthur Fenwick', role: 'Associé de Hannah', couleur: '#8a5a2a', lieux: [{ lieu: 'atelier', cond: { heures: [9, 18] } }] },
    pip: { nom: 'Pip', role: 'Chef des Moineaux', couleur: '#6a6a4a', lieux: [{ lieu: 'pub', cond: { heures: [12, 23] } }] },
    bill: { nom: 'Gros Bill', role: 'Patron du Lion Rouge', couleur: '#4a2a1a', lieux: [{ lieu: 'pub' }] },
    margot: { nom: 'Margot « la Fauvette »', role: 'Chanteuse du Lyre d’Or', couleur: '#7a2a4a', lieux: [{ lieu: 'music', cond: { heures: [20, 25] } }] },
    gardien: { nom: 'Le gardien', role: 'Docker de la Chandelle', couleur: '#2a2a2a', lieux: [{ lieu: 'entrepot', cond: { pasDrapeau: 'gardien_ecarte' } }] },
  },

  // ---------------------------------------------------------------- dialogues
  dialogues: {
    vane: {
      entree: [{ cond: { pasDrapeau: 'briefing' }, noeud: 'briefing' }, { cond: null, noeud: 'aide' }],
      briefing: {
        texte: "« Lusk est sous les verrous, mais la Chandelle n'a pas dit son dernier mot. Banque Crale & Fils : chambre forte vidée cette nuit, le veilleur assassiné. Gribble tient déjà une coupable : Hannah Bright, qui a posé la serrure. Mrs Reed, la veuve, est là. Écoute-la, puis va voir la banque. »",
        effets: { drapeau: { briefing: true } },
        choix: [{ texte: 'J’y vais.', effets: { journal: "Vane t'a confié l'affaire de la banque Crale." } }],
      },
      aide: {
        texte: (e) => {
          if (!e.indices.includes('porte_intacte')) return "« Commence par la porte. Une serrure raconte toujours comment on l'a ouverte. »";
          if (!e.deductions.includes('interieur') && !e.deductions.includes('cle_du_pere')) return "« Une porte intacte, c'est une porte qu'on a ouverte avec le secret. Qui le connaît ? Où l'a-t-on écrit ? Relie ça dans ton carnet. »";
          if (!e.lieux.includes('manoir')) return "« Les banquiers ont des fils, des maisons et des carnets. Va voir à Mayfair. »";
          if (!e.deductions.includes('mobile_edmund') && !e.deductions.includes('edmund_banque')) return "« Un jeune homme riche qui fréquente Whitechapel a toujours une dette quelque part. Et les gamins des rues voient tout, la nuit. »";
          return "« Tu en sais assez. Remplis ton tableau, puis va voir Gribble avant qu'il ne fasse pendre la petite Bright. »";
        },
        choix: [{ texte: 'Merci, je repars.' }, { texte: 'Pourriez-vous m’avancer un peu d’argent ?', cond: { pasDrapeau: 'avance' }, suite: 'avance' }],
      },
      avance: { texte: "« Dix shillings. Ne les perds pas au pharaon. »", effets: { argent: 10, drapeau: { avance: true } }, choix: [{ texte: 'Merci.' }] },
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
          { texte: 'Je trouverai qui l’a tué, madame.', unique: true, suite: 'promesse' },
          { texte: 'Je reviendrai vers vous.' },
        ],
      },
      peur: { texte: "« Du fils Crale, monsieur Edmund. Il venait parfois la nuit, pour des “dossiers”. Tobias disait qu'il traînait dans un tripot de Whitechapel, le Lion Rouge, et qu'un jour ça finirait mal. »", effets: { indice: 'temoin_reed', lieu: ['pub', 'manoir'] }, choix: [{ texte: 'Merci, madame.', suite: 'debut' }] },
      promesse: { texte: "Elle te serre la main de ses doigts glacés. « Dieu vous entende. Trouvez-le avant jeudi, ou ils pendront cette pauvre fille à sa place. »", choix: [{ texte: 'Je vous le promets.', suite: 'debut' }] },
    },

    gribble: {
      entree: [{ cond: { pasDrapeau: 'vu_gribble' }, noeud: 'debut' }, { cond: null, noeud: 'menu' }],
      debut: {
        texte: "« Encore vous. Bon travail sur Lusk, je l'admets. Mais cette fois, c'est simple : la porte n'a pas été forcée. Trois personnes ont la combinaison, et une seule n'est pas un gentleman : la petite Bright. Elle a posé la serrure, elle a les clés. Je l'inculpe jeudi. »",
        effets: { drapeau: { vu_gribble: true } },
        choix: [{ texte: 'Vous allez vite en besogne.', suite: 'menu' }],
      },
      menu: {
        texte: "Gribble tamponne un formulaire. « Je vous écoute. »",
        choix: [
          { texte: 'Qu’a trouvé le légiste ?', cond: { pasIndice: 'legiste2' }, suite: 'legiste' },
          { texte: 'Les obligations sont à l’entrepôt 7 de Limehouse.', cond: [{ ou: [{ indice: 'aveu_margot2' }, { indice: 'aveu_edmund' }] }, { pasDrapeau: 'gribble_entrepot2' }, { pasIndice: 'obligations' }], suite: 'entrepot' },
          { texte: 'Je sais qui a tué Tobias Reed.', action: 'accuser' },
          { texte: 'Rien. Au revoir.' },
        ],
      },
      legiste: { texte: "« Mort vers 2 h 15. Un coup à la tempe, avec quelque chose de lourd, en laiton d'après les traces. Une grosse clé, un chandelier… On cherche. »", effets: { indice: 'legiste2' }, choix: [{ texte: 'Merci.', suite: 'menu' }] },
      entrepot: { texte: "« Limehouse ? La dernière fois, vous aviez raison. J'y envoie six constables cette nuit. »", effets: { drapeau: { gribble_entrepot2: true }, lieu: 'entrepot', journal: "Tu as prévenu Gribble pour l'entrepôt de Limehouse." }, choix: [{ texte: 'Bonne chasse.', suite: 'menu' }] },
    },

    lusk: {
      debut: {
        texte: "Victor Lusk, en tenue de prisonnier, sourit sans joie derrière les barreaux. « Tiens, mon bourreau. Vous venez me demander un service ? »",
        choix: [
          { texte: 'Que savez-vous de la Chandelle et des Crale ? Le juge saura que vous avez aidé.', cond: { pasIndice: 'tuyau_lusk' }, suite: 'tuyau' },
          { texte: 'Rien. Au revoir, Lusk.' },
        ],
      },
      tuyau: { texte: "Il hésite, puis baisse la voix. « Le Doyen a un homme dans la famille Crale. Pas le vieux : le fils. Il joue chez Bill, et la Fauvette lui fait des yeux doux. Le reste, je ne veux pas le savoir. »", effets: { indice: 'tuyau_lusk', lieu: ['manoir', 'music', 'pub'] }, choix: [{ texte: 'Merci, Victor.' }] },
    },

    crale: {
      debut: {
        texte: "Oswin Crale a vieilli de dix ans en une nuit. « Vous m'aviez rendu les plans de la Sentinelle… et voilà qu'on m'a quand même dévalisé. Trente mille livres, et ce pauvre Reed. Que voulez-vous savoir ? »",
        choix: [
          { texte: 'Qui connaît la combinaison de la Sentinelle ?', cond: { pasIndice: 'combinaison' }, suite: 'comb' },
          { texte: 'Votre fils dit avoir passé la nuit au Reform Club.', cond: [{ drapeau: 'alibi_edmund' }, { pasIndice: 'faux_alibi_e' }], suite: 'reform' },
          { texte: 'Puis-je voir votre maison, à Mayfair ?', cond: { pasDrapeau: 'manoir_permis' }, suite: 'maison' },
          { texte: 'Au revoir, monsieur.' },
        ],
      },
      comb: { texte: "« Trois personnes : moi, mon fils Edmund, et Miss Bright, qui l'a réglée. Mon fils, vous n'y pensez pas. Quant à moi… j'ai la mémoire qui flanche, je la garde dans mon carnet. »", effets: { indice: 'combinaison' }, choix: [{ texte: 'Dans votre carnet…', suite: 'debut' }] },
      reform: { texte: "Le vieil homme pâlit. « Au Reform ? Edmund en a été radié l'an dernier. Pour… dettes de jeu. » Il s'assoit lourdement.", effets: { indice: 'faux_alibi_e' }, choix: [{ texte: 'Je suis désolé.', suite: 'debut' }] },
      maison: { texte: "« Si cela peut servir… Le majordome vous ouvrira. Je n'y suis que le soir, et mon fils… mon fils dort jusqu'à midi. »", effets: { drapeau: { manoir_permis: true }, lieu: 'manoir' }, choix: [{ texte: 'Merci.', suite: 'debut' }] },
    },

    edmund: {
      debut: {
        texte: "Un jeune homme blond, chevalière à l'auriculaire, cernes jusqu'aux joues. « Edmund Crale. Vous êtes de la police ? Quelle horreur, ce pauvre Reed. Je le connaissais depuis que j'étais tout petit. »",
        choix: [
          { texte: 'Où étiez-vous mardi, à 2 h du matin ?', unique: true, suite: 'alibi' },
          { texte: 'Vous jouez gros au Lion Rouge, paraît-il.', cond: { ou: [{ indice: 'dettes_edmund' }, { indice: 'temoin_reed' }, { indice: 'tuyau_lusk' }] }, unique: true, suite: 'jeu' },
          { texte: 'Le fiacre, la chemise, la dette effacée : vous étiez à la banque.', cond: [{ deduction: 'edmund_banque' }, { ou: [{ deduction: 'mobile_edmund' }, { indice: 'faux_alibi_e' }, { deduction: 'visiteur_2h' }] }], suite: 'craque' },
          { texte: 'Au revoir.' },
        ],
      },
      alibi: { texte: "« Au Reform Club, jusqu'à trois heures. Whist, cigares, ennui. Tout le monde vous le dira. »", effets: { drapeau: { alibi_edmund: true } }, choix: [{ texte: 'Je vérifierai.', suite: 'debut' }] },
      jeu: { texte: "Ses doigts tournent sa chevalière. « Un gentleman a le droit de s'amuser. Mes dettes sont… réglées. Toutes. » Il a dit « réglées » comme on avale une arête.", choix: [{ texte: 'Réglées par qui ?', suite: 'debut' }] },
      craque: {
        texte: "Edmund s'effondre dans un fauteuil. « Je ne voulais pas… Le Doyen effaçait tout, trois mille livres, contre une nuit. J'avais lu la combinaison dans le carnet de mon père. Reed m'a ouvert, il me connaissait. Et puis il a vu le fiacre, il a voulu siffler… J'avais la manivelle dans la main. »",
        effets: { indice: 'aveu_edmund' },
        choix: [{ texte: 'Où sont les obligations ?', suite: 'ou' }],
      },
      ou: { texte: "« À Limehouse, l'entrepôt 7, dans une caisse marquée d'une chandelle. Le Doyen doit venir les chercher. Mon Dieu, il va me tuer… »", effets: { lieu: 'entrepot', journal: 'Edmund Crale a avoué le meurtre de Tobias Reed.' }, choix: [{ texte: 'Vous direz tout à l’inspecteur Gribble.' }] },
    },

    hannah: {
      debut: {
        texte: "Hannah relève ses lunettes. « Arthur et moi avons repris l'atelier. Et maintenant, le Yard dit que j'ai tué ce pauvre veilleur. La Sentinelle, c'était le dernier travail de M. Fenwick. Je l'ai finie pour lui. »",
        choix: [
          { texte: 'Qui connaît la combinaison ?', cond: { pasIndice: 'combinaison' }, unique: true, suite: 'comb' },
          { texte: 'Où étiez-vous mardi, à 2 h du matin ?', unique: true, suite: 'stbride' },
          { texte: 'La Sentinelle peut-elle être crochetée ?', unique: true, suite: 'crochet' },
          { texte: 'Au revoir, Hannah.' },
        ],
      },
      comb: { texte: "« M. Crale, son fils, et moi. Je la lui ai donnée en main propre, en lui disant de l'apprendre par cœur. Il a ri. Il a dit qu'il avait un carnet pour ça. »", effets: { indice: 'combinaison' }, choix: [{ texte: 'Un carnet…', suite: 'debut' }] },
      stbride: { texte: "« À St Bride. Je règle l'horloge du clocher tous les mardis à 2 h, quand les cloches se taisent. Le bedeau signe mon carnet de réglages ; il est sur le comptoir. »", effets: { drapeau: { stbride: true } }, choix: [{ texte: 'Je vais le regarder.', suite: 'debut' }] },
      crochet: { texte: "« Jamais. J'y ai mis six goupilles folles et un faux pêne. Sans la combinaison, il faudrait de la dynamite, et on aurait entendu le boum jusqu'à Brighton. »", choix: [{ texte: 'Donc quelqu’un connaissait le code.', suite: 'debut' }] },
    },

    arthur: {
      debut: {
        texte: "Arthur Fenwick, rasé de frais, un tablier de cuir sur le dos. « Vous ! Je vous dois la vie. Demandez-moi ce que vous voulez. »",
        choix: [
          { texte: 'Où était Hannah mardi soir ?', unique: true, suite: 'alibi' },
          { texte: 'Vous connaissez encore du monde au Lion Rouge ?', unique: true, suite: 'tuyau' },
          { texte: 'Au revoir, Arthur.' },
        ],
      },
      alibi: { texte: "« Avec moi ! Je l'ai accompagnée à St Bride pour régler l'horloge, et ramenée à trois heures. Le bedeau nous a même offert du thé. »", effets: { indice: 'alibi_hannah', drapeau: { stbride: true } }, choix: [{ texte: 'Merci, Arthur.', suite: 'debut' }] },
      tuyau: { texte: "« J'y ai laissé assez d'argent pour le savoir : un jeune rupin perd des fortunes dans l'arrière-salle de Bill. Un fils de banquier, un Crale. Pip vous en dira plus. »", effets: { lieu: 'pub' }, choix: [{ texte: 'Bien.', suite: 'debut' }] },
    },

    pip: {
      debut: {
        texte: "« M'sieur ! C'est grâce à vous qu'Arthur est sorti ! Pour vous, l'info est à moitié prix. »",
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
        texte: "Gros Bill essuie une chope sans te quitter des yeux. « C'est toi qui as fait tomber Lusk. On ferme pas pour les gens comme toi. Mais on parle pas non plus. »",
        choix: [
          { texte: 'Le jeune Crale te devait de l’argent ?', unique: true, suite: 'muet' },
          { texte: 'Le Yard s’intéresse beaucoup à ton établissement.', cond: { drapeau: 'vu_gribble' }, unique: true, suite: 'menace' },
          { texte: 'Rien, Bill.' },
        ],
      },
      muet: { texte: "« Mes clients, c'est comme mes tonneaux : je les ouvre pas devant les étrangers. » Il pose une main lourde sur son comptoir, comme pour le protéger.", choix: [{ texte: 'Dommage.', suite: 'debut' }] },
      menace: { texte: "« Le Yard ? Ici ? » Il crache par terre. « Va-t'en, l'ami du Yard. Et dis à Gribble que mes registres sont propres. » Il jette un coup d'œil sous son comptoir.", choix: [{ texte: 'Je m’en vais.' }] },
    },

    margot: {
      debut: {
        texte: "Margot se raidit devant son miroir. « Vous. Victor est à Newgate à cause de vous. Que voulez-vous, cette fois ? »",
        choix: [
          { texte: '(Deux livres) Le jeune Edmund Crale vous fait la cour, je crois ?', cond: [{ argent: 40 }, { pasIndice: 'aveu_margot2' }], effets: { argent: -40 }, suite: 'aveu' },
          { texte: 'Je travaille avec le Yard. Parlez, ou c’est Newgate pour recel.', cond: [{ drapeau: 'vu_gribble' }, { pasIndice: 'aveu_margot2' }], suite: 'aveu' },
          { texte: 'Au revoir, Margot.' },
        ],
      },
      aveu: { texte: "Elle pose sa houppette. « Edmund parle quand il boit. Les obligations sont à Limehouse, entrepôt 7. Le Doyen viendra les prendre une de ces nuits. Et ne dites jamais que ça vient de moi. »", effets: { indice: 'aveu_margot2', lieu: 'entrepot', journal: "La Fauvette t'a dit où dorment les obligations." }, choix: [{ texte: 'Merci, Margot.' }] },
    },

    gardien: {
      debut: {
        texte: "Le docker trapu, une lanterne et un gourdin. « Encore toi ? T'as la mémoire courte. »",
        choix: [
          { texte: '(Lui offrir une livre pour aller boire un verre)', cond: { argent: 20 }, effets: { argent: -20, drapeau: { gardien_ecarte: true } }, suite: 'passe' },
          { texte: '(L’attaquer)', suite: 'combat' },
          { texte: '(Reculer lentement)' },
        ],
      },
      passe: { texte: "Il empoche la pièce et s'éloigne vers le quai en sifflotant.", choix: [{ texte: '…' }] },
      combat: {
        texte: (e) => (e.blesse ? "Ton bras blessé ne suit pas. Le gourdin s'abat…" : "Il frappe fort, mais tu l'envoies rouler entre les caisses. Ta main saigne."),
        effets: { blesse: true, drapeau: { gardien_ecarte: true } },
        choix: [{ texte: '…' }],
      },
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
        { texte: 'Te battre', issues: [{ chance: 0.45, texte: 'Tu le désarmes ; il s’enfuit en jurant.', effets: {} }, { chance: 0.35, texte: 'Tu le repousses, mais la lame t’a touché.', effets: { blesse: true } }, { chance: 0.2, texte: 'La lame trouve ton ventre. Le pavé est froid…', effets: { mort: 'Poignardé dans une ruelle de Londres.' } }] },
      ],
    },
    {
      id: 'vengeance',
      texte: "Deux hommes t'attendent au coin de la rue, une chandelle peinte sur la manche. « Le Doyen n'a pas oublié Lusk. Il te fait ses amitiés. »",
      choix: [
        { texte: 'Fuir', issues: [{ chance: 0.5, texte: 'Tu sautes une palissade et tu disparais.', effets: { temps: 15 } }, { chance: 0.5, texte: 'Une matraque te cueille à la nuque avant que tu ne t’échappes.', effets: { blesse: true, temps: 15 } }] },
        { texte: 'Te battre', issues: [{ chance: 0.35, texte: 'Tu en assommes un ; l’autre détale.', effets: {} }, { chance: 0.4, texte: 'Tu t’en sors, mais en sang.', effets: { blesse: true } }, { chance: 0.25, texte: 'Ils étaient payés pour finir le travail. Ils le finissent.', effets: { mort: 'Exécuté par les hommes du Doyen.' } }] },
        { texte: 'Siffler les constables de Gribble', cond: { drapeau: 'vu_gribble' }, issues: [{ chance: 0.8, texte: 'Des sifflets répondent au tien ; les deux hommes s’évaporent.', effets: {} }, { chance: 0.2, texte: 'Personne ne répond. Les coups pleuvent.', effets: { blesse: true } }] },
      ],
    },
  ],

  // ---------------------------------------------------------------- le tableau et l'accusation
  suspects: ['hannah', 'edmund', 'crale', 'bill'],
  questions: [
    { id: 'qui', titre: 'Qui a tué Tobias Reed ?', bonne: 'edmund', preuves: ['edmund_banque', 'aveu_edmund', 'visiteur_2h'],
      options: [['hannah', 'Hannah Bright, la serrurière'], ['edmund', 'Edmund Crale, le fils du banquier'], ['crale', 'Oswin Crale, le banquier'], ['bill', 'Gros Bill, du Lion Rouge']] },
    { id: 'arme', titre: 'Avec quoi ?', bonne: 'manivelle', preuves: ['arme_manivelle'],
      options: [['chandelier', 'Un chandelier du hall'], ['manivelle', 'La manivelle de la chambre forte'], ['matraque', "La matraque d'un homme de la Chandelle"], ['revolver', "La crosse d'un revolver"]] },
    { id: 'entree', titre: 'Comment la chambre forte a-t-elle été ouverte ?', bonne: 'carnet', preuves: ['cle_du_pere'],
      options: [['crochet', 'Crochetée par un as de la serrure'], ['hannah', 'Avec le code de Hannah Bright'], ['carnet', 'Avec la combinaison notée dans le carnet du banquier'], ['dynamite', 'À la dynamite, en silence']] },
    { id: 'mobile', titre: 'Pourquoi ?', bonne: 'dette', preuves: ['mobile_edmund', 'dettes_edmund', 'lettre_doyen'],
      options: [['assurance', "Toucher l'assurance de la banque"], ['vengeance', 'Se venger du vieux Crale'], ['dette', 'Effacer une dette de jeu envers la Chandelle'], ['salaire', 'Une serrurière mal payée']] },
  ],
  accusation(e, suspect, preuves, options = {}) {
    if (suspect === 'personne') return { fin: 'delai', verdict: 'Sans autre suspect, Gribble fait inculper Hannah Bright.', effets: { journal: 'Tu as renoncé à accuser qui que ce soit.' } };
    if (suspect !== 'edmund') return { fin: 'erreur', verdict: `${NOMS[suspect] || suspect} est inculpé${suspect === 'hannah' ? 'e' : ''} à tort pour le meurtre de Tobias Reed.`, effets: { drapeau: { innocent: suspect }, journal: `Tu as fait inculper ${NOMS[suspect] || suspect}.` } };
    const force = options.force ?? 0;
    if (force < 3) return { fin: 'relache', verdict: `Ton raisonnement ne tient pas (${force}/4 réponses justes et prouvées, il en faut 3) : les avocats de Crale font libérer Edmund en une heure.`, effets: { journal: 'Tu as accusé Edmund Crale sans assez de preuves.' } };
    const obl = e.indices.includes('obligations');
    return { fin: 'resolu', verdict: obl ? 'Edmund Crale est arrêté, et les obligations rendues à la banque.' : 'Edmund Crale est arrêté pour le meurtre de Tobias Reed.', effets: { journal: 'Tu as résolu l’affaire de la banque Crale.' } };
  },

  // ---------------------------------------------------------------- fins
  fins: {
    resolu: { titre: 'Affaire résolue', bonne: true, texte: (e) => `Edmund Crale sort de Mayfair entre deux constables, sous les yeux de son père. Hannah Bright est libre. ${e.indices.includes('obligations') ? "Les obligations retrouvent la chambre forte, et le vieux Crale te remercie d'une main qui tremble." : 'Mais quelque part à Limehouse, trente mille livres attendent le Doyen.'} Mrs Reed vient te serrer la main, sans un mot.`, suite: 'Le chapitre 3 arrive bientôt.' },
    relache: { titre: 'Faute de preuves', texte: "Les avocats du vieux Crale font libérer son fils en une heure. Gribble te fusille du regard, et Hannah Bright reste suspecte.", suite: 'Tu avais le bon suspect, mais pas le raisonnement. Rejoue le chapitre pour le confondre.' },
    erreur: { titre: 'L’erreur', texte: (e) => `${NOMS[e.accusation?.suspect] || 'L’accusé'} est conduit à Newgate sous les sifflets de la foule. Edmund Crale assiste à l'audience, très pâle, et part pour les Indes la semaine suivante.`, suite: 'Le vrai coupable court toujours. Rejoue le chapitre pour le démasquer.' },
    delai: { titre: 'Trop tard', texte: "Jeudi soir, Gribble inculpe Hannah Bright. La presse applaudit. Mrs Reed, elle, ne croit pas un mot de ce qu'elle lit.", suite: 'Le vrai coupable court toujours. Rejoue le chapitre pour le démasquer.' },
    mort: { titre: 'Mort à Londres', texte: (e) => `${e.mort || 'Ton enquête s’arrête là.'} Le brouillard recouvre tout.`, suite: 'Tu reprends au dernier matin.' },
  },
};

for (const [id, plan] of Object.entries(PLANS2)) chapitre2.lieux[id].plan = plan;
