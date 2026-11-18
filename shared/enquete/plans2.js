// =====================================================================
//  LES OMBRES DE BAKER STREET — plans vus de dessus du chapitre 2
//  Les murs des lieux déjà connus sont ceux du chapitre 1 ; seuls les
//  meubles, les indices et les personnages changent.
// =====================================================================
import { PLANS1 } from './plans1.js';

const meme = (id, objets, pnj, extra = {}) => ({ carte: PLANS1[id].carte, pieces: PLANS1[id].pieces, entree: PLANS1[id].entree, objets, pnj, ...extra });
const garde = (id, ...ids) => PLANS1[id].objets.filter((o) => ids.includes(o.id));

export const PLANS2 = {
  baker: meme('baker', [
    ...garde('baker', 'biblio', 'fenetre', 'chimie', 'cheminee', 'fauteuil', 'journaux', 'bureau', 'fourneau', 'gardemanger', 'tablecuisine', 'patere', 'lit'),
    { id: 'malle', nom: 'Ta malle', type: 'malle', x: 20, y: 10, l: 2, h: 1, texte: "Tes chemises et, soigneusement pliée, la coupure du Times sur l'affaire Fenwick. Ta première enquête." },
  ], { vane: [3, 3], pell: [18, 3], reed: [8, 3] }),

  banque: meme('banque', [
    { id: 'chambre', nom: 'Porte de la chambre forte', type: 'chambre_forte', x: 1, y: 1, l: 2, h: 2, zone: 'chambre' },
    { id: 'manivelle', nom: 'Manivelle de la porte', type: 'manivelle', x: 3, y: 1, l: 1, h: 1, zone: 'manivelle' },
    { id: 'etageres', nom: 'Étagères vides', type: 'etagere_vide', x: 1, y: 4, l: 2, h: 1, texte: "Les étagères de la chambre forte ont été vidées avec soin. Pas une liasse oubliée : on savait exactement quoi prendre." },
    { id: 'portrait', nom: 'Portrait du fondateur', type: 'tableau_peint', x: 7, y: 1, l: 2, h: 1, texte: "Josiah Crale, 1801. Le même regard de comptable que son petit-fils… et que son arrière-petit-fils." },
    { id: 'bureaucrale', nom: 'Bureau d’acajou', type: 'bureau', ico: '🗂️', x: 5, y: 4, l: 3, h: 1, texte: "Des bilans, des lettres d'assureurs et une note du banquier : « Rappeler à Edmund qu'il n'a PAS la procuration. »" },
    { id: 'bureau', nom: 'Table du veilleur', type: 'table', ico: '📒', x: 13, y: 3, l: 2, h: 1, zone: 'bureau' },
    { id: 'guichets', nom: 'Guichets', type: 'guichet', x: 13, y: 1, l: 8, h: 1, texte: "Les guichets sont fermés. Un employé compte et recompte la même liasse, livide." },
    { id: 'horloge', nom: 'Grande horloge', type: 'horloge', x: 22, y: 1, l: 1, h: 1, texte: "Une horloge signée Fenwick. Elle avance toujours de deux minutes." },
    { id: 'banquette', nom: 'Banquette', type: 'banc', x: 17, y: 5, l: 3, h: 1, texte: "Un constable y somnole, le casque sur les genoux." },
  ], { crale: [6, 3] }),

  yard: meme('yard', [
    ...garde('yard', 'poele', 'tableau', 'classeurs', 'barreaux', 'banc'),
    { id: 'bureau', nom: 'Bureau de Gribble', type: 'bureau', ico: '🗂️', x: 3, y: 3, l: 3, h: 1, texte: "Un dossier ouvert : « BRIGHT, Hannah — serrurière — combinaison — clés ». À côté, le dossier Fenwick, rangé avec un tampon : RÉSOLU." },
  ], { gribble: [6, 2], lusk: [18, 2] }),

  atelier: meme('atelier', [
    ...garde('atelier', 'horloges', 'poele', 'caisses', 'litcamp', 'evier', 'vitrine1', 'vitrine2'),
    { id: 'etabli', nom: 'Établi', type: 'etabli', x: 2, y: 2, l: 5, h: 1, zone: 'etabli' },
    { id: 'coffre', nom: 'Coffre-fort', type: 'coffre', x: 14, y: 1, l: 1, h: 2, texte: "Le coffre de Fenwick, réparé. Hannah y range désormais ses propres plans, sous une Sentinelle miniature." },
    { id: 'table', nom: 'Petite table', type: 'table', ico: '🫖', x: 10, y: 3, l: 2, h: 1, texte: "Deux tasses de thé chaud, cette fois. Arthur et Hannah prennent leurs pauses ensemble." },
    { id: 'porte', nom: 'Porte réparée', type: 'porte', x: 8, y: 6, l: 2, h: 1, zone: 'porte' },
    { id: 'patere', nom: 'Patère', type: 'patere', x: 23, y: 1, l: 2, h: 1, texte: "Le manteau d'Arthur, et une écharpe de laine que Hannah a dû lui tricoter." },
    { id: 'comptoir', nom: 'Comptoir', type: 'comptoir', ico: '📒', x: 10, y: 8, l: 5, h: 1, zone: 'carnet', avant: "Des factures, des carnets, des bons de commande. Sans savoir quoi chercher, tu pourrais y passer la journée." },
  ], { hannah: [17, 9], arthur: [4, 4] }),

  pub: meme('pub', [
    ...garde('pub', 'cheminee', 'flechettes', 'table', 'tonneaux', 'cartes', 'caisse'),
    { id: 'comptoir', nom: 'Comptoir', type: 'comptoir_bar', x: 4, y: 1, l: 8, h: 1, zone: 'comptoir', avant: "Des chopes, des pompes à bière… et un gros registre sous le comptoir, que Bill ne quitte pas des yeux." },
  ], { bill: [8, 2], pip: [3, 4], edmund: [18, 1] }),

  manoir: {
    carte: [
      '############################',
      '#ssssssssssssss#bbbbbbbbbbb#',
      '#ssssssssssssss#bbbbbbbbbbb#',
      '#ssssssssssssss#bbbbbbbbbbb#',
      '#ssssssssssssss+bbbbbbbbbbb#',
      '#ssssssssssssss#bbbbbbbbbbb#',
      '#######+###########+########',
      '#eeeeeeeeeeeeeeeeeeeeeeeeee#',
      '#eeeeeeeeeeeeeeeeeeeeeeeeee#',
      '####+#######################',
      '#cccccccccccc#',
      '#cccccccccccc#',
      '#cccccccccccc#',
      '##############',
    ].map((r) => r.padEnd(28, ' ')),
    pieces: { s: { nom: 'Le salon', sol: 'tapis', mur: '#24301f' }, b: { nom: 'Bureau de M. Crale', sol: 'parquet', mur: '#3a2418' }, e: { nom: 'Le grand vestibule', sol: 'marbre', mur: '#2c2a26' }, c: { nom: "Chambre d'Edmund", sol: 'tapis', mur: '#2a2238' } },
    entree: [25, 8],
    objets: [
      { id: 'cheminee', nom: 'Cheminée', type: 'cheminee', x: 6, y: 1, l: 3, h: 1, zone: 'cheminee' },
      { id: 'portraits', nom: 'Portraits de famille', type: 'tableau_peint', x: 1, y: 1, l: 3, h: 1, texte: "Trois générations de Crale. Sur le dernier portrait, Edmund enfant, une main sur l'épaule de son père." },
      { id: 'piano', nom: 'Piano', type: 'piano', x: 11, y: 1, l: 3, h: 1, texte: "Un piano à queue que personne ne joue plus depuis la mort de Mrs Crale." },
      { id: 'canape', nom: 'Canapé', type: 'fauteuil', x: 5, y: 4, l: 4, h: 1, texte: "Un canapé de velours vert. Entre les coussins, un jeton de jeu en os, marqué d'une chandelle." },
      { id: 'bureau', nom: 'Bureau du banquier', type: 'bureau', ico: '📓', x: 19, y: 2, l: 4, h: 1, zone: 'bureau' },
      { id: 'biblio', nom: 'Bibliothèque', type: 'etagere', x: 17, y: 1, l: 1, h: 1, texte: "Des traités de finance et un Debrett's Peerage annoté : le vieux Crale cherche une héritière pour son fils." },
      { id: 'coffret', nom: 'Coffret', type: 'malle', x: 25, y: 4, l: 2, h: 1, texte: "Un coffret de reconnaissances de dettes, toutes au nom d'Edmund, toutes payées par son père. La dernière date de six mois." },
      { id: 'horloge', nom: 'Horloge du vestibule', type: 'horloge', x: 1, y: 7, l: 1, h: 1, texte: "Une horloge de parquet. Le majordome la remonte chaque dimanche, dit-il." },
      { id: 'console', nom: 'Console', type: 'table', ico: '🧤', x: 12, y: 8, l: 3, h: 1, texte: "Des gants, une canne à pommeau d'ivoire et un plateau d'argent pour le courrier. Vide." },
      { id: 'lit', nom: 'Lit d’Edmund', type: 'lit', x: 1, y: 10, l: 3, h: 2, texte: "Le lit n'a pas été défait. Edmund dort ailleurs, ou il ne dort pas du tout." },
      { id: 'garderobe', nom: 'Garde-robe', type: 'armoire', x: 9, y: 10, l: 3, h: 1, zone: 'garderobe' },
      { id: 'coiffeuse', nom: 'Table de toilette', type: 'coiffeuse', x: 6, y: 12, l: 3, h: 1, texte: "Des flacons de laudanum à moitié vides et un programme du Lyre d'Or, loge 3." },
    ],
    pnj: { crale: [21, 4], edmund: [7, 3] },
  },

  music: meme('music', [...garde('music', 'scene', 'loge3', 'fauteuils', 'piano', 'costumes', 'miroir')], { margot: [19, 7] }),

  entrepot: meme('entrepot', [...garde('entrepot', 'cordages', 'treuil', 'tonneaux', 'caisses', 'autres')], { gardien: [7, 4] }),
};
