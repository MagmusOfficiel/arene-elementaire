// =====================================================================
//  LES OMBRES DE BAKER STREET — Chapitre 1 : L'Horloger de Clerkenwell
//  Données seulement (le moteur est dans moteur.js).
//  Temps en minutes depuis le jour 1 à minuit ; argent en shillings.
// =====================================================================

const J = 1440;

export const chapitre1 = {
  id: 'ch1',
  titre: "Chapitre 1 — L'Horloger de Clerkenwell",
  resume: "Elias Fenwick, horloger et serrurier de génie, est retrouvé mort dans son atelier fermé de l'intérieur. Son coffre est vide. Le Yard veut faire pendre son neveu avant la fin du troisième jour.",
  debut: { temps: 9 * 60, argent: 30, lieu: 'baker', lieux: ['baker', 'atelier', 'yard'] },
  suivant: 'ch2',
  delai: { temps: 2 * J + 20 * 60, fin: 'delai', texte: 'Gribble veut inculper quelqu’un avant le jour 3 à 20 h.', effets: { journal: "Le délai a expiré : Gribble a fait inculper Arthur Fenwick." } },
  verite: "Victor Lusk, serrurier de Hatton Garden payé par la Chandelle, est venu à 21 h se faire passer pour un client. Il a tué Elias Fenwick d'un coup de marteau d'horloger, vidé le coffre des plans de la Sentinelle — la serrure commandée par la banque Crale & Fils — puis refermé le verrou avec un ressort de sa fabrication qui l'a fait tomber après son départ. Il a confié les plans à Margot, « la Fauvette », au Lyre d'Or ; ils attendaient le Doyen dans l'entrepôt 7 de Limehouse.",

  // ---------------------------------------------------------------- indices
  indices: {
    verrou: { nom: 'Verrou fermé de l’intérieur', desc: "Le verrou de l'atelier était tiré de l'intérieur ; les constables ont dû enfoncer la porte." },
    ressort: { nom: 'Ressort dans la serrure', desc: "Un petit ressort neuf et une goupille de laiton, ajoutés à la gâche : de quoi faire tomber le verrou après coup." },
    limaille: { nom: 'Limaille argentée', desc: "Sur l'établi, une limaille de laiton d'une teinte argentée, différente de celle des outils de Fenwick." },
    tasses: { nom: 'Deux tasses de thé', desc: "Deux tasses sur la table, dont une à peine entamée : Fenwick recevait quelqu'un." },
    page: { nom: 'Page arrachée', desc: "Le carnet de commandes a perdu sa dernière page ; en relief sur la suivante, on lit « V.L. — 21 h »." },
    legiste: { nom: 'Rapport du légiste', desc: "Mort vers 21 h, d'un coup porté avec un petit marteau, de ceux qu'utilisent les horlogers. L'arme n'a pas été retrouvée." },
    dette: { nom: 'Reconnaissance de dette', desc: "Arthur Fenwick doit quarante livres au Lion Rouge, à Whitechapel." },
    crale_lettre: { nom: 'Lettre de la banque Crale', desc: "La banque Crale & Fils commandait à Fenwick la « Sentinelle », une serrure de chambre forte. Les plans étaient au coffre, désormais vide." },
    temoin_hannah: { nom: 'Témoignage de Hannah', desc: "À 20 h 30, l'apprentie a croisé un homme qui entrait : chapeau melon, canne à pommeau d'argent. Fenwick attendait un client." },
    temoin_pip: { nom: 'Témoignage de Pip', desc: "Arthur a joué au pharaon au Lion Rouge de 20 h jusqu'à minuit passé." },
    outils_lusk: { nom: 'Trousse de Lusk', desc: "Dans la trousse de Victor Lusk, chaque outil a sa place… sauf le petit marteau d'horloger." },
    alliage: { nom: 'Laiton de Lusk', desc: "Lusk coule lui-même un laiton argenté, son alliage maison." },
    billet: { nom: 'Billet du Lyre d’Or', desc: "Dans le manteau de Lusk : un billet pour la loge 3 du music-hall le Lyre d'Or, daté du soir du meurtre." },
    faux_alibi: { nom: 'Faux alibi de Lusk', desc: "Lusk prétend avoir passé la soirée chez sa sœur à Islington, mais il s'est trahi face aux preuves." },
    aveu_margot: { nom: 'Aveu de la Fauvette', desc: "Le paquet de Lusk attend le Doyen à l'entrepôt 7 de Limehouse, la nuit." },
    plans: { nom: 'Plans de la Sentinelle', desc: "Les plans volés dans le coffre de Fenwick. Ils valent une fortune… pour la banque, comme pour la pègre." },
  },

  // ---------------------------------------------------------------- déductions
  deductions: {
    porte_auto: { nom: 'La porte s’est fermée toute seule', indices: ['verrou', 'ressort'], texte: "Le verrou a été tiré par un mécanisme à retardement : l'assassin est sorti avant que la porte ne se ferme. Il faut un serrurier de grand talent pour ça." },
    lusk_atelier: { nom: 'La limaille vient de chez Lusk', indices: ['limaille', 'alliage'], texte: "La limaille trouvée sur l'établi de Fenwick est faite du laiton maison de Victor Lusk." },
    client_21h: { nom: 'Le client de 21 h', indices: ['page', 'temoin_hannah'], texte: "« V.L. — 21 h » : l'homme au chapeau melon croisé par Hannah était le client attendu. Ses initiales sont V.L." },
    arthur_innocent: { nom: 'Arthur est innocent', indices: ['legiste', 'temoin_pip'], texte: "Fenwick est mort vers 21 h, et Arthur jouait aux cartes à Whitechapel à la même heure." },
    arme: { nom: 'L’arme du crime', indices: ['legiste', 'outils_lusk'], texte: "Le marteau d'horloger qui manque dans la trousse de Lusk est exactement l'arme décrite par le légiste." },
  },

  // ---------------------------------------------------------------- lieux
  // carte : position en % sur la carte de Londres ; zones : x, y, l, h en % du décor
  lieux: {
    baker: {
      nom: '7 Baker Street', quartier: 'Marylebone', carte: [22, 28], dormir: true, decor: 'baker',
      intro: "Le cabinet de Cornelius Vane : des piles de journaux, une odeur de tabac fort, un violon sur le fauteuil.",
      zones: [
        { id: 'journaux', nom: 'Journaux du matin', x: 0, y: 57, l: 20, h: 16, texte: "Le Penny Gazette titre : « MYSTÈRE À CLERKENWELL — l'horloger Fenwick retrouvé mort dans un atelier clos ! Le Yard tient le neveu. »", temps: 5 },
        { id: 'tiroir', nom: 'Tiroir du bureau', x: 68, y: 70, l: 19, h: 15, texte: "Quelques pièces traînent dans le tiroir de Vane. Tu en glisses cinq dans ta poche. Il ne s'en apercevra sans doute pas.", deja: "Le tiroir est vide, maintenant.", effets: { argent: 5, justice: -2, drapeau: { vane_vole: true }, journal: "Tu as pris cinq shillings dans le tiroir de Vane." } },
        { id: 'fenetre', nom: 'Fenêtre', x: 29, y: 2, l: 20, h: 50, texte: "Baker Street sous le brouillard. Un fiacre attend au coin, le cocher somnole.", temps: 2 },
      ],
    },
    atelier: {
      nom: 'Atelier Fenwick', quartier: 'Clerkenwell', carte: [58, 26], decor: 'atelier',
      intro: "Des centaines d'horloges tic-taquent dans la pénombre. La porte, enfoncée par les constables, pend sur ses gonds. Une tache sombre marque le parquet près de l'établi.",
      zones: [
        { id: 'porte', nom: 'Porte enfoncée', x: 6, y: 22, l: 9, h: 62, texte: "Le verrou est encore tiré, arraché avec le chambranle : la porte était bien fermée de l'intérieur.", effets: { indice: 'verrou' } },
        { id: 'serrure', nom: 'Serrure de la porte', x: 15, y: 44, l: 5, h: 10, cond: { indice: 'verrou' }, texte: "En approchant la loupe de la gâche, tu découvres un petit ressort neuf et une goupille de laiton qui n'ont rien à faire là.", effets: { indice: 'ressort', temps: 15 } },
        { id: 'etabli', nom: 'Établi', x: 46, y: 54, l: 22, h: 12, texte: "Des engrenages, des loupes, des limes. Dans une rainure, une pincée de limaille de laiton argentée, plus claire que celle de Fenwick.", effets: { indice: 'limaille' } },
        { id: 'table', nom: 'Petite table', x: 71, y: 66, l: 20, h: 12, texte: "Deux tasses de thé froid. L'une est presque pleine : le visiteur n'a fait que tremper les lèvres.", effets: { indice: 'tasses' } },
        { id: 'carnet', nom: 'Carnet de commandes', x: 31, y: 55, l: 12, h: 9, texte: "La dernière page a été arrachée. En inclinant la suivante sous la lampe, tu lis les lettres imprimées par la plume : « V.L. — 21 h ».", effets: { indice: 'page', temps: 15 } },
        { id: 'coffre', nom: 'Coffre-fort', x: 80, y: 27, l: 14, h: 36, texte: "Le coffre est ouvert et vide. Au fond, une lettre à en-tête de la banque Crale & Fils : « …pour la serrure Sentinelle de notre chambre forte… »", effets: { indice: 'crale_lettre', lieu: 'banque' } },
        { id: 'patere', nom: 'Manteau sur la patère', x: 23, y: 14, l: 6, h: 40, texte: "Un manteau de jeune homme, oublié la veille. Dans la poche : le double d'une reconnaissance de dette de quarante livres, au Lion Rouge, Whitechapel.", effets: { indice: 'dette', lieu: 'pub' } },
      ],
    },
    yard: {
      nom: 'Scotland Yard', quartier: 'Whitehall', carte: [40, 61], decor: 'yard',
      intro: "Le bureau de l'inspecteur Gribble : des dossiers jusqu'au plafond, un poêle qui fume, et au fond du couloir, les cellules.",
      zones: [
        { id: 'tableau', nom: 'Tableau des affaires', x: 64, y: 10, l: 33, h: 34, texte: "À la craie : « FENWICK — neveu Arthur, dettes, dispute — À INCULPER AVANT JEUDI ». Gribble est pressé.", temps: 5 },
      ],
    },
    pub: {
      nom: 'Le Lion Rouge', quartier: 'Whitechapel', carte: [80, 46], danger: 0.45, decor: 'pub', ouvert: { heures: [11, 25] },
      intro: "Fumée, sciure et chansons à boire. Ici, on parle plus volontiers à une pièce qu'à un monsieur.",
      zones: [
        { id: 'cartes', nom: 'Table de jeu', x: 8, y: 63, l: 34, h: 17, texte: "Un jeu de pharaon abandonné, des chopes à moitié vides. On a joué gros, hier soir.", temps: 5 },
      ],
    },
    banque: {
      nom: 'Banque Crale & Fils', quartier: 'City', carte: [68, 50], decor: 'banque', ouvert: { heures: [9, 17] },
      intro: "Marbre, cuivre et murmures. Un employé vous conduit au bureau de M. Crale.",
      zones: [
        { id: 'chambre', nom: 'Porte de la chambre forte', x: 71, y: 36, l: 24, h: 33, texte: "Une porte d'acier provisoire. Sans la Sentinelle, la banque n'a qu'une vieille serrure à opposer aux voleurs.", temps: 5 },
      ],
    },
    boutique: {
      nom: 'Boutique de Victor Lusk', quartier: 'Hatton Garden', carte: [54, 38], decor: 'boutique', ouvert: { heures: [8, 19] },
      intro: "Une boutique étroite pleine de serrures, de clés et de coffres en démonstration. Un creuset fume encore dans l'arrière-boutique.",
      zones: [
        { id: 'trousse', nom: 'Trousse à outils', x: 9, y: 65, l: 30, h: 13, texte: "Une trousse de cuir où chaque outil a sa forme découpée dans le feutre. Une seule place est vide : celle d'un petit marteau d'horloger.", effets: { indice: 'outils_lusk' } },
        { id: 'creuset', nom: 'Creuset et lingots', x: 84, y: 62, l: 14, h: 16, texte: "Des lingots d'un laiton étrangement argenté, coulés ici même. Personne d'autre à Londres n'utilise ce mélange.", effets: { indice: 'alliage' } },
        { id: 'manteau', nom: 'Manteau suspendu', x: 0, y: 16, l: 18, h: 46, texte: "Dans une poche du manteau, un billet froissé : loge 3 du Lyre d'Or, Strand, daté du soir du meurtre. Et un chapeau melon sur la patère…", effets: { indice: 'billet', lieu: 'music' } },
      ],
    },
    music: {
      nom: 'Le Lyre d’Or', quartier: 'Strand', carte: [44, 52], decor: 'music', ouvert: { heures: [18, 26] },
      intro: "Velours rouge, cuivres et fumée. Sur scène, une chanteuse fait taire la salle d'un seul regard : Margot Linnet, la Fauvette.",
      zones: [
        { id: 'loge3', nom: 'Loge 3', x: 72, y: 22, l: 23, h: 28, texte: "La loge 3 est vide. Sur le rebord, un bouquet de violettes fanées et une carte : « Pour M. — merci pour le paquet. V. »", temps: 10 },
      ],
    },
    entrepot: {
      nom: 'Entrepôt 7, Limehouse', quartier: 'Docks de Limehouse', carte: [90, 64], danger: 0.55, decor: 'entrepot', ouvert: { nuit: true, jour: 2 },
      intro: "L'eau noire clapote contre les pilotis. Des caisses empilées jusqu'aux poutres, une lanterne qui vacille.",
      zones: [
        { id: 'caisses', nom: 'Caisse marquée d’une chandelle', x: 54, y: 40, l: 17, h: 27, cond: { ou: [{ drapeau: 'gardien_ecarte' }, { drapeau: 'gribble_entrepot' }] }, texte: "Une chandelle peinte sur le bois. Dedans, enveloppés dans de la toile cirée : les plans de la Sentinelle.", effets: { indice: 'plans', journal: 'Tu as récupéré les plans de la Sentinelle à Limehouse.' } },
      ],
    },
  },

  // ---------------------------------------------------------------- personnages
  personnages: {
    vane: { nom: 'Cornelius Vane', role: 'Détective consultant', couleur: '#3a4a3a', lieux: [{ lieu: 'baker', cond: { heures: [7, 24] } }] },
    pell: { nom: 'Mrs Agatha Pell', role: 'Logeuse', couleur: '#6a4a5a', lieux: [{ lieu: 'baker' }] },
    gribble: { nom: 'Inspecteur Gribble', role: 'Scotland Yard', couleur: '#2a3a5a', lieux: [{ lieu: 'yard', cond: { heures: [8, 21] } }] },
    arthur: { nom: 'Arthur Fenwick', role: 'Le neveu, en cellule', couleur: '#8a5a2a', lieux: [{ lieu: 'yard' }] },
    hannah: { nom: 'Hannah Bright', role: "L'apprentie", couleur: '#5a6a7a', lieux: [{ lieu: 'atelier', cond: { heures: [9, 18] } }] },
    crale: { nom: 'Oswin Crale', role: 'Banquier', couleur: '#4a4a2a', lieux: [{ lieu: 'banque' }] },
    lusk: { nom: 'Victor Lusk', role: 'Serrurier', couleur: '#5a2a2a', lieux: [{ lieu: 'boutique', cond: { pasDrapeau: 'lusk_parti' } }] },
    margot: { nom: 'Margot « la Fauvette »', role: 'Chanteuse du Lyre d’Or', couleur: '#7a2a4a', lieux: [{ lieu: 'music', cond: { heures: [20, 25] } }] },
    pip: { nom: 'Pip', role: 'Chef des Moineaux', couleur: '#6a6a4a', lieux: [{ lieu: 'pub', cond: { heures: [12, 23] } }] },
    bill: { nom: 'Gros Bill', role: 'Patron du Lion Rouge', couleur: '#4a2a1a', lieux: [{ lieu: 'pub' }] },
    gardien: { nom: 'Le gardien', role: 'Docker de la Chandelle', couleur: '#2a2a2a', lieux: [{ lieu: 'entrepot', cond: { pasDrapeau: 'gardien_ecarte' } }] },
    doyen: { nom: 'Le Doyen', role: '???', couleur: '#111111', lieux: [{ lieu: 'entrepot', cond: [{ drapeau: 'offre_acceptee' }, { indice: 'plans' }, { pasDrapeau: 'trahi_doyen' }] }] },
  },

  // ---------------------------------------------------------------- dialogues
  dialogues: {
    vane: {
      entree: [{ cond: { pasDrapeau: 'briefing' }, noeud: 'briefing' }, { cond: null, noeud: 'aide' }],
      briefing: {
        texte: (e) => `« Ah, te voilà, ${e.nom}. Le Yard nous fait l'honneur de nous déranger : Elias Fenwick, horloger à Clerkenwell, retrouvé mort dans son atelier fermé de l'intérieur. Gribble a déjà son coupable, le neveu. Moi, je n'aime pas les coupables trouvés avant le petit-déjeuner. Va voir l'atelier, puis le Yard. Et souviens-toi : un fait n'a pas d'opinion. »`,
        effets: { drapeau: { briefing: true } },
        choix: [
          { texte: 'Je m’en occupe.', effets: { journal: "Vane t'a confié l'affaire Fenwick." } },
          { texte: 'Et vous, vous ne venez pas ?', suite: 'pasvenir' },
        ],
      },
      pasvenir: { texte: "« J'ai un violon à accorder et un orgueil à ménager. Si tu échoues, ce sera ta faute ; si tu réussis, ce sera mon enseignement. »", choix: [{ texte: 'Charmant.', effets: { journal: "Vane t'a confié l'affaire Fenwick." } }] },
      aide: {
        texte: (e) => {
          const a = e.jauges.justice <= -20 ? `« Je sens sur toi une odeur que je n'aime pas, ${e.nom} : celle de l'argent facile. » ` : '';
          if (!e.indices.includes('ressort')) return `${a}« Une pièce fermée de l'intérieur n'est qu'une pièce dont on n'a pas encore compris la serrure. Regarde-la de près. »`;
          if (!e.deductions.includes('porte_auto')) return `${a}« Relie ce que tu as vu, dans ton carnet. Un verrou et un ressort, ça raconte une histoire. »`;
          if (!e.lieux.includes('boutique')) return `${a}« Qui, à Londres, sait fabriquer un tel mécanisme ? L'apprentie le sait sûrement. Les registres du Yard aussi. »`;
          if (!e.indices.includes('billet')) return `${a}« Un homme qui vient de tuer a besoin de passer la main. Fouille ses affaires, pas seulement ses yeux. »`;
          if (!e.indices.includes('aveu_margot')) return `${a}« Les music-halls sont pleins d'oreilles. Va écouter la Fauvette, le soir. »`;
          return `${a}« Tu en sais assez pour accuser quelqu'un. Va voir Gribble, et choisis bien tes preuves. Une accusation sans preuve n'est qu'une opinion. »`;
        },
        choix: [
          { texte: 'Merci, je repars.' },
          { texte: 'Pourriez-vous m’avancer un peu d’argent ?', cond: { pasDrapeau: 'avance' }, suite: 'avance' },
        ],
      },
      avance: { texte: "« Dix shillings. Je les déduirai de ta gloire. »", effets: { argent: 10, drapeau: { avance: true } }, choix: [{ texte: 'Merci.' }] },
    },

    pell: {
      debut: {
        texte: (e) => (e.blesse ? "« Seigneur ! Vous saignez sur mon tapis ! Asseyez-vous, que je vous panse ça. »" : "« Une tasse de thé, mon petit ? Vous avez une mine à faire peur. »"),
        choix: [
          { texte: 'Volontiers.', effets: { soigne: true, temps: 20 }, suite: 'the' },
          { texte: 'Vous avez entendu parler de Fenwick ?', unique: true, suite: 'rumeur' },
          { texte: 'Plus tard, Mrs Pell.' },
        ],
      },
      the: { texte: "« Voilà. Du thé, des bandages, et un conseil : ne traînez pas à Whitechapel après la tombée de la nuit. »", choix: [{ texte: 'Merci, Mrs Pell.' }] },
      rumeur: { texte: "« Tout le quartier en parle. Le neveu, Arthur, passait ses nuits au Lion Rouge, à Whitechapel, à perdre l'argent de son oncle. On dit qu'ils se sont disputés la veille. »", effets: { lieu: 'pub' }, choix: [{ texte: 'Merci.', suite: 'debut' }] },
    },

    gribble: {
      entree: [{ cond: { pasDrapeau: 'vu_gribble' }, noeud: 'debut' }, { cond: null, noeud: 'menu' }],
      debut: {
        texte: "« Ah, l'assistant de Vane. Écoutez : on tient le neveu, Arthur Fenwick. Endetté jusqu'au cou, héritier, et il s'est disputé avec l'oncle la veille. Mes chefs veulent l'affaire bouclée en trois jours. Ne me compliquez pas la vie. »",
        effets: { drapeau: { vu_gribble: true } },
        choix: [{ texte: 'Bien, inspecteur.', suite: 'menu' }],
      },
      menu: {
        texte: "Gribble fouille dans ses dossiers sans lever les yeux. « Je vous écoute. »",
        choix: [
          { texte: 'Qu’a trouvé le légiste ?', cond: { pasIndice: 'legiste' }, suite: 'legiste' },
          { texte: 'Vos registres : quel serrurier signe « V.L. » ?', cond: { indice: 'page', pasDrapeau: 'registre' }, suite: 'registre' },
          { texte: 'Comment puis-je vous aider, inspecteur ?', cond: { pasDrapeau: 'offre_gribble' }, suite: 'marche' },
          { texte: 'J’ai trouvé où sont cachés les plans volés.', cond: { indice: 'aveu_margot', pasDrapeau: 'gribble_entrepot', pasIndice: 'plans' }, suite: 'entrepot' },
          { texte: 'Je sais qui a tué Elias Fenwick.', action: 'accuser' },
          { texte: 'Rien. Au revoir.' },
        ],
      },
      legiste: { texte: "« Mort vers 21 h. Crâne enfoncé par un petit marteau, genre marteau d'horloger. On ne l'a pas retrouvé. Le neveu a dû le jeter dans la Tamise. »", effets: { indice: 'legiste' }, choix: [{ texte: 'Merci.', suite: 'menu' }] },
      registre: { texte: (e) => `${e.drapeaux.soutien ? '« Pour un ami du Yard, tout de suite. » ' : "Gribble soupire, puis ouvre un gros registre. "}« V.L.… Victor Lusk, serrurier à Hatton Garden. Un concurrent de Fenwick. Pas de casier. »`, effets: { drapeau: { registre: true }, lieu: 'boutique', journal: 'Les registres du Yard mènent à Victor Lusk, serrurier à Hatton Garden.' }, choix: [{ texte: 'Intéressant.', suite: 'menu' }] },
      marche: {
        texte: "« Simple. Signez ce papier : le cabinet Vane soutient l'inculpation d'Arthur Fenwick. Mes chefs seront contents, la presse aussi, et je saurai m'en souvenir. »",
        effets: { drapeau: { offre_gribble: true } },
        choix: [
          { texte: 'Je signe.', effets: { drapeau: { soutien: true }, yard: 15, justice: -15, journal: "Tu as signé le soutien à l'inculpation d'Arthur Fenwick pour plaire au Yard." }, suite: 'menu' },
          { texte: 'Pas sans preuve.', effets: { justice: 5, yard: -5, journal: "Tu as refusé d'appuyer l'inculpation d'Arthur sans preuve." }, suite: 'menu' },
        ],
      },
      entrepot: { texte: "« Limehouse, entrepôt 7 ? Si c'est vrai, j'y serai la nuit prochaine avec quatre constables. Si c'est faux, vous me devrez une bouteille. »", effets: { drapeau: { gribble_entrepot: true }, yard: 10, justice: 5, journal: "Tu as prévenu Gribble pour l'entrepôt de Limehouse." }, choix: [{ texte: 'Marché conclu.', suite: 'menu' }] },
    },

    arthur: {
      debut: {
        texte: "Un grand rouquin aux yeux rougis se lève derrière les barreaux. « Je ne l'ai pas tué ! Oui, on s'est disputés, il refusait de payer mes dettes. Mais ce soir-là, j'étais au Lion Rouge à perdre aux cartes, jusqu'à minuit ! »",
        choix: [
          { texte: 'Qui peut le confirmer ?', unique: true, suite: 'temoin' },
          { texte: 'Combien devez-vous, et à qui ?', unique: true, suite: 'dette' },
          { texte: 'Avouez, ce sera plus simple.', unique: true, effets: { justice: -3 }, suite: 'nie' },
          { texte: 'Je reviendrai.' },
        ],
      },
      temoin: { texte: "« Pip, le gamin qui fait les courses du pub. Il m'a vu toute la soirée. Et Gros Bill, mais lui ne vous dira rien. »", effets: { lieu: 'pub' }, choix: [{ texte: 'Je vais vérifier.', suite: 'debut' }] },
      dette: { texte: "« Quarante livres, au Lion Rouge. Bill a ma reconnaissance de dette ; j'en ai laissé le double dans mon manteau, à l'atelier. »", effets: { lieu: 'pub' }, choix: [{ texte: 'Bien.', suite: 'debut' }] },
      nie: { texte: "« Je n'avouerai pas ce que je n'ai pas fait ! Trouvez le vrai coupable, ou ils me pendront ! »", choix: [{ texte: '…', suite: 'debut' }] },
    },

    hannah: {
      debut: {
        texte: "Une jeune femme en tablier de cuir serre un chiffon entre ses doigts. « Je suis Hannah, l'apprentie de M. Fenwick. Je… je n'arrive pas à y croire. »",
        choix: [
          { texte: 'Qu’avez-vous vu hier soir ?', unique: true, suite: 'soir' },
          { texte: 'Quelqu’un a ajouté un ressort à cette serrure. Qui en serait capable ?', cond: { ou: [{ indice: 'ressort' }, { deduction: 'porte_auto' }] }, unique: true, suite: 'serrure' },
          { texte: 'Vous avez une clé de l’atelier, n’est-ce pas ?', unique: true, suite: 'cle' },
          { texte: 'Au revoir, Hannah.' },
        ],
      },
      soir: { texte: "« Je suis partie à 20 h 30. En sortant, j'ai croisé un homme qui entrait : chapeau melon, canne à pommeau d'argent. M. Fenwick attendait un client, il me l'avait dit. »", effets: { indice: 'temoin_hannah' }, choix: [{ texte: 'Merci, c’est précieux.', suite: 'debut' }] },
      serrure: { texte: "« Un ressort à retardement ? C'est du travail de maître… À Londres, à part M. Fenwick, je ne vois que Victor Lusk, à Hatton Garden. Ils se détestaient. »", effets: { lieu: 'boutique', journal: "Hannah t'a parlé de Victor Lusk, serrurier à Hatton Garden." }, choix: [{ texte: 'Victor Lusk…', suite: 'debut' }] },
      cle: {
        texte: "« Oui… mais je ne l'ai pas utilisée ! J'avais trop peur pour entrer ce matin. C'est le laitier qui a appelé la police. »",
        choix: [
          { texte: 'Je vous crois.', effets: { justice: 2 }, suite: 'debut' },
          { texte: 'C’est ce que dirait une coupable.', effets: { justice: -2 }, suite: 'debut' },
        ],
      },
    },

    crale: {
      debut: {
        texte: "Un homme aux favoris gris vous reçoit derrière un bureau d'acajou. « Oswin Crale. Fenwick fabriquait pour nous la Sentinelle, une serrure de chambre forte. Que voulez-vous ? »",
        choix: [
          { texte: 'Les plans de la Sentinelle ont disparu du coffre de Fenwick.', cond: { indice: 'crale_lettre', pasDrapeau: 'offre_crale' }, suite: 'plans' },
          { texte: 'Où étiez-vous avant-hier soir ?', unique: true, suite: 'alibi' },
          { texte: 'Au revoir, monsieur.' },
        ],
      },
      plans: {
        texte: "Crale blêmit. « C'est une catastrophe. Si ces plans circulent, ma banque est à la merci du premier cambrioleur venu. » Il ouvre un tiroir. « Dix livres pour que le nom de ma banque n'apparaisse dans aucun journal ni aucun rapport. Et vingt de plus si vous me rapportez ces plans. »",
        effets: { drapeau: { offre_crale: true } },
        choix: [
          { texte: 'J’accepte les dix livres.', effets: { argent: 200, justice: -12, drapeau: { crale_paye: true }, journal: 'Tu as accepté dix livres de Crale pour taire le nom de sa banque.' } },
          { texte: 'Gardez votre argent. Je chercherai vos plans.', effets: { justice: 5, journal: "Tu as refusé l'argent de Crale." } },
        ],
      },
      alibi: { texte: "« Au Reform Club, avec trois membres du Parlement. Demandez-leur, si vous osez. »", choix: [{ texte: 'Je n’oserai pas.', suite: 'debut' }] },
    },

    lusk: {
      debut: {
        texte: "Un homme maigre aux mains fines lève les yeux de son établi. Une canne à pommeau d'argent est posée contre le mur. « Victor Lusk. Que puis-je pour vous ? »",
        choix: [
          { texte: 'Où étiez-vous avant-hier à 21 h ?', unique: true, suite: 'alibi' },
          { texte: 'Vous connaissiez Elias Fenwick ?', unique: true, suite: 'fenwick' },
          { texte: 'La limaille trouvée chez Fenwick vient de votre creuset.', cond: { deduction: 'lusk_atelier' }, unique: true, suite: 'limaille' },
          { texte: 'Votre sœur d’Islington ? « V.L. — 21 h » : le client de Fenwick, c’était vous.', cond: [{ deduction: 'client_21h' }, { drapeau: 'alibi_lusk' }], unique: true, suite: 'confronte' },
          { texte: 'Bill te fait dire que tu lui dois sa part.', cond: { drapeau: 'travail_bill' }, unique: true, suite: 'bill' },
          { texte: 'Au revoir.' },
        ],
      },
      alibi: { texte: "« Chez ma sœur, à Islington. Toute la soirée. Elle vous le confirmera. »", effets: { drapeau: { alibi_lusk: true } }, choix: [{ texte: 'Bien sûr.', suite: 'debut' }] },
      fenwick: { texte: "« Un vieux fou qui se croyait le seul à savoir tourner une clé. Paix à son âme. »", choix: [{ texte: 'Charmant.', suite: 'debut' }] },
      limaille: { texte: "« Du laiton argenté ? Beaucoup de gens en utilisent… » Ses mains tremblent légèrement sur l'établi.", choix: [{ texte: 'Vraiment ?', suite: 'debut' }] },
      bill: { texte: "Lusk devient livide. « Dites à Bill… dites-lui qu'il aura sa part quand le Doyen aura payé. » Il se mord la langue, trop tard.", effets: { argent: 20, journal: 'Lusk a laissé échapper le nom du Doyen.' }, choix: [{ texte: 'Je transmettrai.', suite: 'debut' }] },
      confronte: {
        texte: "Lusk pâlit. « Vous… vous ne pouvez rien prouver. » Son regard file vers la porte. « Ma sœur… je n'ai pas de sœur, voilà. Écoutez-moi. »",
        effets: { indice: 'faux_alibi' },
        choix: [
          { texte: 'Je vous écoute.', suite: 'marche' },
          { texte: 'Vous direz tout ça à l’inspecteur Gribble.', effets: { justice: 3 } },
        ],
      },
      marche: {
        texte: "« Je n'ai fait qu'exécuter. On m'a payé pour les plans, c'est tout. Laissez-moi quitter Londres, et je vous donne le nom de celui qui tire les ficelles. »",
        choix: [
          { texte: 'Le nom. Et disparaissez.', effets: { drapeau: { lusk_parti: true, nom_doyen: true }, justice: -10, journal: 'Tu as laissé filer Victor Lusk contre un nom.' }, suite: 'nom' },
          { texte: 'Cinq livres, et je n’ai rien vu.', effets: { argent: 100, justice: -15, yard: -5, drapeau: { lusk_paye: true }, journal: 'Tu as fait chanter Victor Lusk : cinq livres pour ton silence.' } },
          { texte: 'Non. Vous paierez pour Fenwick.', effets: { justice: 5 } },
        ],
      },
      nom: { texte: "« Silas Crane. On l'appelle le Doyen. Que Dieu vous garde s'il apprend que c'est moi qui vous l'ai dit. » Lusk attrape son manteau et s'enfonce dans le brouillard.", choix: [{ texte: '…' }] },
    },

    margot: {
      debut: {
        texte: "Dans sa loge, une femme en robe de scène se poudre le visage sans vous regarder. « Un admirateur ? Les admirateurs apportent des fleurs, d'habitude. »",
        choix: [
          { texte: '(Lui offrir une bouteille de champagne — 10 shillings)', cond: { argent: 10, pasDrapeau: 'champagne' }, effets: { argent: -10, drapeau: { champagne: true } }, suite: 'parle' },
          { texte: 'Victor Lusk était dans la loge 3, le soir du meurtre.', cond: { indice: 'billet' }, suite: 'lusk' },
          { texte: 'Pardon de vous avoir dérangée.' },
        ],
      },
      parle: { texte: "« Du champagne… vous savez parler aux dames. » Elle sourit enfin. « Que voulez-vous savoir ? »", choix: [{ texte: 'Parlez-moi de Victor Lusk.', cond: { indice: 'billet' }, suite: 'lusk' }, { texte: 'Rien. Je voulais vous entendre chanter.' }] },
      lusk: {
        texte: "Elle pose sa houppette. « Victor… Ce pauvre Victor m'a confié un paquet, ce soir-là, et quelqu'un est venu le prendre. Je ne pose pas de questions. Vous non plus, si vous tenez à vos dents. »",
        choix: [{ texte: 'Où est ce paquet, maintenant ?', suite: 'ou' }, { texte: 'Je travaille avec Cornelius Vane.', effets: { yard: 3 }, suite: 'menace' }],
      },
      ou: {
        texte: "Elle vous jauge longuement. « Il y a deux façons de sortir de cette loge, mon joli : en ami de la Chandelle, ou en ennemi. »",
        choix: [
          { texte: 'En ami. Que dois-je faire ?', suite: 'offre' },
          { texte: 'Dites-le-moi, ou je vous fais arrêter pour recel.', suite: 'menace' },
          { texte: '(Lui glisser deux livres)', cond: { argent: 40 }, effets: { argent: -40, justice: -3 }, suite: 'aveu' },
        ],
      },
      menace: { texte: "« M'arrêter ? Mon pauvre ami… » Elle soupire. « Très bien. Je préfère encore les policiers aux cadavres. »", choix: [{ texte: 'Je vous écoute.', suite: 'aveu' }] },
      aveu: { texte: "« Entrepôt 7, à Limehouse. Le paquet y attend le Doyen, la nuit prochaine. Et ne dites jamais que ça vient de moi. »", effets: { indice: 'aveu_margot', lieu: 'entrepot', journal: "La Fauvette t'a révélé la cachette de Limehouse." }, choix: [{ texte: 'Merci, Margot.' }] },
      offre: {
        texte: "« Le Doyen aime les gens utiles. Allez à l'entrepôt 7 de Limehouse, de nuit. Prenez le paquet avant que la police ne le trouve, et remettez-le-lui en main propre. Après ça, vous serez des nôtres. »",
        effets: { indice: 'aveu_margot', lieu: 'entrepot', drapeau: { offre_acceptee: true }, yard: -15, journal: 'Tu as accepté de travailler pour la Chandelle.' },
        choix: [{ texte: 'Marché conclu.' }],
      },
    },

    pip: {
      debut: {
        texte: "Un gamin aux genoux écorchés vous barre la route. « M'sieur ! Une info, c'est un penny. Deux si elle est bonne. »",
        choix: [
          { texte: '(Lui donner un shilling) Arthur Fenwick était ici avant-hier soir ?', cond: [{ argent: 1 }, { pasIndice: 'temoin_pip' }], effets: { argent: -1 }, suite: 'arthur' },
          { texte: 'Dégage, gamin.', effets: { justice: -2 } },
          { texte: 'Pas maintenant, Pip.' },
        ],
      },
      arthur: { texte: "« Le grand rouquin qui perd tout le temps ? Ouais ! Il a joué au pharaon avec Bill de huit heures jusqu'à minuit passé. J'ai porté ses bières toute la soirée. »", effets: { indice: 'temoin_pip' }, choix: [{ texte: 'Merci, Pip.' }] },
    },

    bill: {
      debut: {
        texte: "Un colosse au nez cassé essuie un verre. « Si t'es là pour la dette du petit Fenwick, c'est quarante livres, et ça court toujours. »",
        choix: [
          { texte: 'Tu as du travail pour moi ?', cond: { pasDrapeau: 'travail_bill' }, suite: 'travail' },
          { texte: 'Le Yard s’intéresse beaucoup à ton établissement.', cond: { yard: 10 }, unique: true, suite: 'menace' },
          { texte: 'Je ne suis pas là pour ça.' },
        ],
      },
      travail: {
        texte: "« Un malin, hein ? Y a un gars à Hatton Garden, un serrurier, qui a de l'or plein les poches depuis deux jours. Il me doit ma part. Va lui rappeler. Une livre pour toi, et la Chandelle se souviendra de ton nom. »",
        choix: [
          { texte: 'C’est d’accord.', effets: { drapeau: { travail_bill: true }, lieu: 'boutique', yard: -10, justice: -5, argent: 20, journal: 'Tu as accepté une course pour Gros Bill, de la pègre de Whitechapel.' } },
          { texte: 'Sans moi.' },
        ],
      },
      menace: { texte: "« Le Yard ? Ici ? » Il crache par terre. « Va-t'en, l'ami du Yard, avant que mes clients te reconnaissent. »", effets: { yard: 2 }, choix: [{ texte: 'Je m’en vais.' }] },
    },

    gardien: {
      debut: {
        texte: "Un docker trapu se lève d'une caisse, une barre de fer à la main. « T'as rien à faire ici. »",
        choix: [
          { texte: 'Le Doyen m’envoie.', cond: { drapeau: 'offre_acceptee' }, effets: { drapeau: { gardien_ecarte: true } }, suite: 'passe' },
          { texte: '(Lui offrir une livre)', cond: { argent: 20 }, effets: { argent: -20, justice: -2, drapeau: { gardien_ecarte: true } }, suite: 'passe' },
          { texte: '(L’attaquer)', suite: 'combat' },
          { texte: '(Reculer lentement)' },
        ],
      },
      passe: { texte: "Il grogne et s'écarte. « Fais vite. Et t'as rien vu. »", choix: [{ texte: '…' }] },
      combat: {
        texte: (e) => (e.blesse ? "Tu te jettes sur lui, mais ton bras blessé te trahit. La barre de fer s'abat…" : "Vous roulez dans la poussière entre les caisses. Il frappe fort, mais tu finis par l'assommer. Ton bras saigne."),
        effets: { blesse: true, drapeau: { gardien_ecarte: true } },
        choix: [{ texte: '…' }],
      },
    },

    doyen: {
      debut: {
        texte: "Une silhouette en manteau long sort de l'ombre. Vous ne voyez pas son visage. « Le nouvel ami de Margot. Vous avez quelque chose pour moi. »",
        choix: [
          { texte: '(Lui remettre les plans)', effets: { drapeau: { plans_doyen: true }, yard: -20, justice: -15, argent: 100, journal: 'Tu as remis les plans de la Sentinelle au Doyen.', fin: 'recrue' } },
          { texte: 'Les plans restent avec moi.', effets: { yard: 5, justice: 5, drapeau: { trahi_doyen: true }, journal: 'Tu as refusé de remettre les plans au Doyen.' }, suite: 'menace' },
        ],
      },
      menace: { texte: "« Dommage. Les ingrats vivent rarement vieux, à Londres. » La silhouette se fond dans le brouillard. Vous sentez des regards dans votre dos.", choix: [{ texte: '…' }] },
    },
  },

  // ---------------------------------------------------------------- ruelles la nuit
  rencontres: [
    {
      id: 'surineur',
      texte: "Une silhouette surgit d'une porte cochère, une lame à la main. « Ta bourse, ou ta gorge. »",
      choix: [
        { texte: 'Fuir', issues: [{ chance: 0.6, texte: 'Tu cours à perdre haleine et le perds dans le brouillard.', effets: { temps: 10 } }, { chance: 0.4, texte: 'La lame t’entaille le bras pendant que tu fuis.', effets: { blesse: true, temps: 10 } }] },
        { texte: 'Donner ta bourse', issues: [{ chance: 1, texte: 'Il prend l’argent et disparaît.', effets: { argent: -15 } }] },
        { texte: 'Te battre', issues: [{ chance: 0.45, texte: 'Tu le désarmes ; il s’enfuit en jurant.', effets: { justice: 1 } }, { chance: 0.35, texte: 'Tu le repousses, mais la lame t’a touché.', effets: { blesse: true } }, { chance: 0.2, texte: 'La lame trouve ton ventre. Le pavé est froid…', effets: { mort: 'Poignardé dans une ruelle de Londres.' } }] },
        { texte: 'Parler l’argot de la Chandelle', cond: { yard: -15 }, issues: [{ chance: 1, texte: '« Désolé, l’ami, je t’avais pas reconnu. »', effets: {} }] },
      ],
    },
    {
      id: 'bande',
      texte: "Trois gaillards t'encerclent sous un bec de gaz éteint. « Un monsieur bien mis, si loin de chez lui… »",
      choix: [
        { texte: 'Fuir', issues: [{ chance: 0.5, texte: 'Tu glisses entre eux et tu détales.', effets: { temps: 10 } }, { chance: 0.5, texte: 'Un coup de gourdin t’atteint à l’épaule avant que tu ne leur échappes.', effets: { blesse: true, temps: 10 } }] },
        { texte: 'Payer (10 shillings)', cond: { argent: 10 }, issues: [{ chance: 1, texte: 'Ils empochent l’argent en ricanant.', effets: { argent: -10 } }] },
        { texte: 'Te réclamer de l’inspecteur Gribble', cond: { yard: 15 }, issues: [{ chance: 0.7, texte: '« Un ami des cognes… » Ils s’écartent en grommelant.', effets: {} }, { chance: 0.3, texte: '« Raison de plus ! » Les coups pleuvent.', effets: { blesse: true } }] },
        { texte: 'Parler l’argot de la Chandelle', cond: { yard: -15 }, issues: [{ chance: 1, texte: '« Un gars du Doyen ? Passe ton chemin, l’ami. »', effets: {} }] },
      ],
    },
  ],

  // ---------------------------------------------------------------- accusation
  suspects: ['arthur', 'hannah', 'crale', 'lusk'],
  option: { indice: 'plans', cle: 'plans', nom: 'Les plans de la Sentinelle', cache: ['plans_doyen'], choix: [['rendre', 'Les rendre à la banque Crale (récompense)'], ['vendre', 'Les vendre en douce à un receleur'], ['garder', 'Les garder pour toi']] },
  // options.plans : 'rendre' | 'vendre' | 'garder' (si l'on a les plans)
  accusation(e, suspect, preuves, options = {}) {
    const has = (x) => preuves.includes(x);
    if (suspect === 'lusk') {
      if (e.drapeaux.lusk_parti) return { fin: e.drapeaux.nom_doyen ? 'marche' : 'relache', verdict: 'Victor Lusk a quitté Londres : on ne peut plus l’arrêter.' };
      const force = ['lusk_atelier', 'client_21h', 'arme', 'outils_lusk', 'faux_alibi', 'temoin_hannah', 'page', 'limaille', 'alliage', 'porte_auto'].filter(has).length;
      if (force < 3) return { fin: 'relache', verdict: `Trop peu de preuves (${force}/3) : Lusk est relâché, Arthur reste en cellule.`, effets: { yard: -10, journal: 'Tu as accusé Victor Lusk sans assez de preuves.' } };
      const plans = e.indices.includes('plans') && !e.drapeaux.plans_doyen ? options.plans || 'rendre' : null;
      if (plans === 'vendre') return { fin: 'double_jeu', verdict: 'Lusk est arrêté. Les plans de la Sentinelle, eux, finissent chez un receleur de Wapping.', effets: { argent: 1000, justice: -25, yard: -10, drapeau: { plans_vendus: true }, journal: 'Tu as vendu les plans de la Sentinelle à un receleur.' } };
      if (plans === 'garder') return { fin: 'double_jeu', verdict: 'Lusk est arrêté. Personne ne sait que les plans dorment dans ta malle.', effets: { justice: -15, drapeau: { plans_gardes: true }, journal: 'Tu as gardé les plans de la Sentinelle pour toi.' } };
      return { fin: 'justice', verdict: plans ? 'Lusk est arrêté et les plans sont rendus à la banque Crale.' : 'Lusk est arrêté. Mais les plans de la Sentinelle restent introuvables.', effets: { justice: 20, yard: 15, argent: plans ? 400 : 0, drapeau: plans ? { plans_rendus: true } : {}, journal: plans ? 'Tu as rendu les plans à la banque Crale (vingt livres de récompense).' : 'Les plans de la Sentinelle sont restés dans la nature.' } };
    }
    if (suspect === 'personne') return e.drapeaux.nom_doyen ? { fin: 'marche', verdict: 'Tu n’accuses personne. Mais tu connais désormais le nom du Doyen.' } : { fin: 'delai', verdict: 'Sans autre suspect, Gribble fait inculper Arthur.', effets: { journal: 'Tu as renoncé à accuser qui que ce soit.' } };
    const nom = { arthur: 'Arthur Fenwick', hannah: 'Hannah Bright', crale: 'Oswin Crale' }[suspect] || suspect;
    const savait = e.deductions.includes('arthur_innocent') && suspect === 'arthur';
    return { fin: 'erreur', verdict: `${nom} est inculpé pour le meurtre d'Elias Fenwick.`, effets: { yard: 10, justice: savait ? -30 : -15, drapeau: { innocent: suspect }, journal: `Tu as fait inculper ${nom}${savait ? ', en le sachant innocent' : ''}.` } };
  },

  // ---------------------------------------------------------------- fins
  fins: {
    justice: { titre: 'Justice rendue', bonne: true, texte: (e) => `Victor Lusk est conduit à Newgate sous les flashs de magnésium du Penny Gazette. Arthur Fenwick sort de cellule en pleurant. ${e.drapeaux.plans_rendus ? 'Oswin Crale serre ta main un peu trop longtemps et glisse vingt livres dans ta poche.' : 'Mais quelque part, les plans de la Sentinelle changent de mains.'} Ce soir-là, Vane lève son verre : « Pas mal, pour un débutant. »`, suite: (e) => (e.drapeaux.plans_rendus ? 'Au chapitre 2, le Doyen sait désormais qui a contrarié ses plans.' : 'Au chapitre 2, une chambre forte de la City est vidée sans un bruit…') },
    double_jeu: { titre: 'Le double jeu', texte: (e) => `Lusk est arrêté, le Yard te félicite, et personne ne remarque ${e.drapeaux.plans_vendus ? 'les cinquante livres qui gonflent ta bourse' : 'la toile cirée cachée au fond de ta malle'}. Vane, lui, te regarde un peu trop longtemps.`, suite: 'Au chapitre 2, quelqu’un dans la pègre a remarqué ton nom. Et ce n’est peut-être pas une mauvaise chose.' },
    erreur: { titre: 'L’erreur', texte: (e) => `Le juge est rapide, la foule satisfaite. ${e.accusation?.suspect === 'arthur' ? 'Arthur Fenwick' : e.accusation?.suspect === 'hannah' ? 'Hannah Bright' : 'Oswin Crale'} clame son innocence jusqu'au bout. Victor Lusk, lui, rentre tranquillement chez lui.`, suite: 'Au chapitre 2, le vrai tueur frappe de nouveau. Et cette fois, il sait que tu ne l’as pas vu venir.' },
    delai: { titre: 'Trop tard', texte: "Trois jours ont passé. Gribble a obtenu ce que voulaient ses chefs : Arthur Fenwick est inculpé. Les journaux parlent d'une affaire rondement menée. Toi, tu sais que non.", suite: 'Au chapitre 2, le vrai tueur court toujours.' },
    relache: { titre: 'Faute de preuves', texte: "Lusk ressort du Yard en ajustant son chapeau melon. Gribble te fusille du regard : « La prochaine fois, apportez-moi des preuves, pas des intuitions. » Arthur reste en cellule.", suite: 'Au chapitre 2, Lusk se sait surveillé. La Chandelle aussi.' },
    marche: { titre: 'Le marché', texte: "Lusk a quitté Londres par le premier train. Tu n'as livré personne, mais tu connais un nom que peu de gens osent prononcer : Silas Crane, le Doyen.", suite: 'Au chapitre 2, tu pars à la recherche du Doyen… à moins que ce ne soit lui qui te trouve.' },
    recrue: { titre: 'La recrue', texte: "Le Doyen glisse les plans sous son manteau et cinq livres dans ta main. « Bienvenue dans la famille. » Au matin, le Yard inculpe Arthur Fenwick, et Lusk disparaît. Personne ne saura jamais ce que tu as fait cette nuit-là.", suite: 'Au chapitre 2, la Chandelle a une première mission pour toi.' },
    mort: { titre: 'Mort à Londres', texte: (e) => `${e.mort || 'Ton enquête s’arrête là.'} Le brouillard recouvre tout.`, suite: 'Tu reprends au dernier matin.' },
  },
};
