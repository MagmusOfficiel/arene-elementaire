// =====================================================================
//  LES CLANS ÉLÉMENTAIRES — les quêtes des habitants (v76)
//  Pur (client + serveur). Chaque habitant a une quête (une seule fois par
//  joueur). On l'accepte en lui parlant ; elle avance avec les mêmes
//  événements que les quêtes du jour (le serveur les voit passer), ou on lui
//  apporte des ressources. On revient le voir pour être payé.
//  Finir les 6 quêtes d'un village donne le titre « Ami du village ».
// =====================================================================
import { niveau as niveauDe } from './profil.js';
import { REPERE, RAYON_VISITE, RAYON_OBJET, posObjet } from './reperes.js';
const T = { feu: 'Terres de Braise', eau: 'Lagons d’Azur', plante: 'Sylve d’Émeraude', brisees: 'Terres Brisées', cimes: 'Cimes Orageuses', ambre: 'Désert d’Ambre', ciel: 'Îles Célestes' };
// ev : l'événement compté (comme quetes.js) et f son filtre ; donner : ce qu'on apporte au moment de rendre la quête
export const QUETES = {
  bram: { xp: 13, txt: 'Montre-moi que tu sais te servir d’une forge : améliore 2 cartes.', ev: 'ameliorer', n: 2, rec: { essence: 200, eclats: 40 }, merci: 'Pas mal du tout ! Tiens, des éclats pour la suite.' },
  ignis: { xp: 20, txt: 'Le boss des Terres de Braise rôde encore. Va le terrasser.', ev: 'victoire', f: { terr: 'feu', type: ['boss'] }, n: 1, rec: { essence: 400, cristal: 3 }, merci: 'Le portail est plus calme grâce à toi. Prends ces cristaux.' },
  cendrillon: { xp: 10, txt: 'J’ai perdu ma toupie dans une salle mystère… ou deux. Tu peux regarder ?', ev: 'mystere', n: 2, rec: { essence: 150, eclats: 12 }, merci: 'Tu l’as pas trouvée ? Bah, c’est pas grave. Merci quand même !' },
  mordred: { xp: 12, txt: 'Pour finir mon histoire, il me faut 2 cristaux de lave. Tu m’en apportes ?', donner: { cristal: 2 }, rec: { essence: 350, eclats: 15 }, merci: '… et c’est ainsi que la lave devint la mémoire du clan. Merci, jeune âme.' },
  pyra: { xp: 13, txt: 'Mon étal est vide ! Apporte-moi 80 braises, je te paierai bien.', donner: { braises: 80 }, rec: { essence: 300, eclats: 15 }, merci: 'Voilà de quoi rallumer mon commerce. Marché conclu !' },
  gorran: { xp: 12, txt: 'Un sanctuaire mal gardé, c’est une porte ouverte. Aide à en prendre un.', ev: 'sanctuaire', n: 1, rec: { essence: 300, eclats: 20 }, merci: 'Voilà du travail de garde. Bienvenue dans la ronde.' },
  marin: { xp: 16, txt: 'Des filons rares brillent sur la carte. Ramasses-en 2, moussaillon.', ev: 'filon', n: 2, rec: { essence: 250, perle_noire: 2 }, merci: 'Bon œil ! Voilà deux perles noires de ma réserve.' },
  nerea: { xp: 16, txt: 'Bats 3 élites ou monstres rares dans les Lagons d’Azur.', ev: 'victoire', f: { terr: 'eau', type: ['elite', 'rare'] }, n: 3, rec: { essence: 350, eclats: 20 }, merci: 'Les Lagons te respectent. Moi aussi.' },
  loupiot: { xp: 14, txt: 'Je veux faire un collier ! Tu m’apportes 30 perles ?', donner: { perles: 30 }, rec: { essence: 200, eclats: 10 }, merci: 'Il est trop beau ! Je le garde pour toujours. Ou jusqu’à demain.' },
  oracle: { xp: 14, txt: 'Les cartes parlent à ceux qui les invoquent. Fais 10 tirages à l’autel.', ev: 'tirage', n: 10, rec: { eclats: 45 }, merci: 'Je vois… de belles cartes dans ton avenir. Et ces éclats dans ta main.' },
  coralie: { xp: 16, txt: 'Les champions de l’arène portent mes tenues. Gagne 2 combats d’arène !', ev: 'arene', n: 2, rec: { essence: 350 }, merci: 'Superbe ! Tu ferais un très bon mannequin.' },
  tholos: { xp: 14, txt: 'Quand le boss mondial revient, frappe-le : 100 dégâts, au moins.', ev: 'mondial', n: 100, rec: { essence: 300, eclats: 15 }, merci: 'Joli coup. Le clan se souviendra de toi.' },
  sylvain: { xp: 10, txt: 'Une parcelle bien tenue nourrit tout le monde. Récolte la tienne 3 fois.', ev: 'recolter', n: 3, rec: { essence: 200, seve: 60 }, merci: 'Voilà un jardinier ! Prends de la sève de ma serre.' },
  faune: { xp: 20, txt: 'Le boss de la Sylve d’Émeraude est réveillé. Endors-le pour de bon.', ev: 'victoire', f: { terr: 'plante', type: ['boss'] }, n: 1, rec: { essence: 400, graine_or: 3 }, merci: 'La forêt respire à nouveau. Ces graines d’or sont pour toi.' },
  mousse: { xp: 10, txt: 'Il paraît qu’il y a des salles mystère en expédition. Visite-en 3 et raconte-moi !', ev: 'mystere', n: 3, rec: { essence: 150, eclats: 12 }, merci: 'Waouh ! Un couloir piégé ?! Un jour j’irai aussi.' },
  aelia: { xp: 12, txt: 'Le grand ouvrage du village a besoin de bras. Donne-lui 60 points.', ev: 'projet', n: 60, rec: { essence: 300, eclats: 15 }, merci: 'La Sylve te remercie, et moi aussi.' },
  brindille: { xp: 10, txt: 'Il me manque de la sève pour mes poutres : 60, s’il te plaît.', donner: { seve: 60 }, rec: { essence: 250, eclats: 15 }, merci: 'Avec ça, je te bâtis une charpente qui tiendra cent ans.' },
  ronce: { xp: 12, txt: 'Prouve ta valeur : gagne 10 combats en expédition.', ev: 'victoire', n: 10, rec: { essence: 300, eclats: 20 }, merci: 'Tu as la peau dure. Comme les ronces.' },
  // ---- v87 : Chapitre 2, l'histoire des Terres Brisées (5 quêtes qui se suivent ; niv = niveau requis, apres = quête à finir avant)
  orin: { xp: 18, histoire: 1, niv: 30, txt: 'La Faille s’est ouverte il y a trois nuits. Des choses en sortent : ni Feu, ni Eau, ni Plante… les trois à la fois. Abats 3 de ces monstres et dis-moi ce que tu as vu.', ev: 'victoire', f: { terr: 'brisees' }, n: 3, rec: { essence: 600, fragments: 40 }, merci: 'Fusionnés… Alors les vieilles histoires étaient vraies. Va voir Lyra aux archives, elle saura.' },
  lyra: { xp: 18, histoire: 2, niv: 30, apres: 'orin', txt: 'Les fragments que laissent ces monstres gardent la mémoire du monde d’avant les clans. Rapporte-m’en 60, je les lirai.', donner: { fragments: 60 }, rec: { eclats: 50, eclat_vide: 2 }, merci: 'Les trois clans n’en faisaient qu’un, jadis. Le Cœur de la Faille les a séparés… et il se réveille. Prends ces éclats du vide : Varda en fera des invocations.' },
  varda: { xp: 24, histoire: 3, niv: 34, apres: 'lyra', txt: 'Avec des éclats du vide, je forge des cartes qui appellent des alliés. Mais d’abord, prouve que tu tiens debout là-bas : bats 3 élites ou monstres rares des Terres Brisées.', ev: 'victoire', f: { terr: 'brisees', type: ['elite', 'rare'] }, n: 3, rec: { essence: 800, eclat_vide: 4 }, merci: 'Tu as l’étoffe. Va à l’atelier : avec ces éclats, forge ta première invocation. Sel t’attend près du Cœur.' },
  sel: { xp: 30, histoire: 4, niv: 38, apres: 'varda', txt: 'Le Cœur de la Faille bat au bout du portail. Chaque battement fend la terre un peu plus. Fais-le taire.', ev: 'victoire', f: { terr: 'brisees', type: ['boss'] }, n: 1, rec: { essence: 1000, eclat_vide: 6 }, merci: 'Le silence… enfin. Mais sous le Cœur, il y avait autre chose. Quelque chose de vide. Nyx t’en dira plus.' },
  // ---- v96 : Chapitre 3, l'histoire des Cimes Orageuses (niveaux 50, 60, 70) — 'chap: 3' les distingue de celles de la Faille
  brann: { xp: 25, chap: 3, histoire: 1, niv: 50, txt: 'Depuis que le Néant s’est rendormi, le ciel gronde au-dessus des Cimes. Des bêtes d’orage descendent du col. Abats-en 4 et reviens me voir — si tu reviens.', ev: 'victoire', f: { terr: 'cimes' }, n: 4, rec: { essence: 1200, plumes: 50 }, merci: 'Tu tiens debout. Bien. Va voir Aela, là-haut : elle lit les aurores comme d’autres lisent les livres.' },
  aela: { xp: 25, chap: 3, histoire: 2, niv: 50, apres: 'brann', txt: 'Les plumes d’orage gardent la trace des éclairs qui les ont touchées. Rapporte-m’en 80 : je saurai d’où vient la tempête.', donner: { plumes: 80 }, rec: { cristal_foudre: 3, eclats: 80 }, merci: 'Je vois… Quand le Néant a été vaincu, sa force s’est envolée vers le ciel. Le Roi des Tempêtes l’a avalée. Torvald forge des armes contre la foudre : va le trouver.' },
  torvald: { xp: 32, chap: 3, histoire: 3, niv: 54, apres: 'aela', txt: 'Mes cartes de tempête étourdissent les monstres : ils ratent leur tour. Mais il me faut un bras qui tienne : bats 3 élites ou monstres rares des Cimes.', ev: 'victoire', f: { terr: 'cimes', type: ['elite', 'rare'] }, n: 3, rec: { cristal_foudre: 5, essence: 1500 }, merci: 'Voilà des cristaux de foudre : à l’atelier, ils deviennent des cartes qui font trembler le ciel. Skadi chasse le Roi depuis des années.' },
  skadi: { xp: 40, chap: 3, histoire: 4, niv: 58, apres: 'torvald', txt: 'Le Roi des Tempêtes et sa sœur, la Reine du Blizzard, tiennent le sommet. Abats l’un des deux. Je te couvrirai… de loin.', ev: 'victoire', f: { terr: 'cimes', type: ['boss'] }, n: 1, rec: { cristal_foudre: 8, essence: 2000 }, merci: 'Il est tombé ! Mais le ciel tourne toujours. Au-dessus du sommet, il y a l’Œil. Odra sait ce que c’est.' },
  odra: { xp: 50, chap: 3, histoire: 5, niv: 64, apres: 'skadi', txt: 'L’Œil du Cyclone : la force du Néant, devenue tempête. Il ne se montre que dans le Cauchemar. Ferme-le, et le ciel redeviendra le ciel.', ev: 'victoire', f: { terr: 'cimes', type: ['boss'], cauchemar: true }, n: 1, rec: { cristal_foudre: 12, eclats: 200, essence: 4000 }, merci: 'Le vent est tombé. Pour la première fois depuis des siècles, on voit les étoiles depuis les Cimes. Merci, Maître des Tempêtes.' },
  // ---- v99 : Chapitre 5, l'histoire des Îles Célestes (niveaux 90, 95, 100)
  elio: { xp: 20, chap: 5, histoire: 1, niv: 90, txt: 'Le Soleil noir s’est éteint, mais l’étoile qui l’avait nourri venait d’ici, des îles qui flottent au-dessus du monde. Ses enfants sont devenus voraces. Abats-en 4.', ev: 'victoire', f: { terr: 'ciel' }, n: 4, rec: { essence: 2000, poussiere_etoile: 70 }, merci: 'Ils boivent la vie de ceux qu’ils frappent… Va voir Astrée, à l’Observatoire : elle sait lire le ciel.' },
  astree: { xp: 20, chap: 5, histoire: 2, niv: 90, apres: 'elio', txt: 'La poussière d’étoile garde la mémoire du ciel. Apporte-m’en 120 et je te dirai d’où vient l’étoile tombée.', donner: { poussiere_etoile: 120 }, rec: { coeur_etoile: 3, eclats: 120 }, merci: 'Elle vient d’une Étoile mère, qui dévore la lumière des autres pour grandir. Corvin forge des armes qui font comme elle : va le voir.' },
  corvin: { xp: 26, chap: 5, histoire: 3, niv: 92, apres: 'astree', txt: 'Mes cartes volent la vie : chaque coup te soigne. Ici, c’est la seule façon de tenir. Montre-moi que tu as compris : bats 3 élites ou monstres rares des îles.', ev: 'victoire', f: { terr: 'ciel', type: ['elite', 'rare'] }, n: 3, rec: { coeur_etoile: 7, essence: 2500 }, merci: 'Prends ces cœurs d’étoile : à l’atelier, ils deviennent des cartes qui volent la vie. Séléné garde le pont de l’Archange.' },
  selene: { xp: 32, chap: 5, histoire: 4, niv: 94, apres: 'corvin', txt: 'L’Archange d’argent et la Dévoreuse d’étoiles gardent l’Observatoire. Abats l’un des deux. Ne les laisse pas frapper trop longtemps : ils se soignent sur toi.', ev: 'victoire', f: { terr: 'ciel', type: ['boss'] }, n: 1, rec: { coeur_etoile: 12, essence: 3000 }, merci: 'Le passage est libre. Là-haut, l’Étoile mère t’attend. Ysolde t’y conduira, si tu es prêt.' },
  ysolde: { xp: 42, chap: 5, histoire: 5, niv: 97, apres: 'selene', txt: 'L’Étoile mère ne se montre que dans le Cauchemar. Éteins-la, et toutes les étoiles du ciel brilleront à nouveau pour tout le monde.', ev: 'victoire', f: { terr: 'ciel', type: ['boss'], cauchemar: true }, n: 1, rec: { coeur_etoile: 18, eclats: 300, essence: 6000 }, merci: 'Le Néant, la tempête, le soleil noir, l’étoile mère… tu as tout affronté. Le ciel te connaît désormais : Gardien des Étoiles.' },
  // ---- v98 : Chapitre 4, l'histoire du Désert d'Ambre (niveaux 70, 80, 90)
  kesh: { xp: 32, chap: 4, histoire: 1, niv: 70, txt: 'Le soir où l’Œil s’est fermé, une étoile est tombée à l’est, dans les sables. Depuis, la cité ensevelie s’est réveillée et ses gardiens rôdent. Abats-en 4 et reviens me voir.', ev: 'victoire', f: { terr: 'ambre' }, n: 4, rec: { essence: 1500, sable_dore: 60 }, merci: 'Tu sais te battre dans le sable, c’est rare. Neferet fouille les ruines : elle aura besoin de toi.' },
  neferet: { xp: 32, chap: 4, histoire: 2, niv: 70, apres: 'kesh', txt: 'Le sable doré garde les mots des anciens rois. Apporte-m’en 100 et je lirai ce que dit la cité.', donner: { sable_dore: 100 }, rec: { larme_ambre: 3, eclats: 100 }, merci: 'Les murs parlent d’un pharaon qui voulait voler le soleil. L’étoile tombée l’a réveillé. Hakim forge des armes qui marquent l’ennemi : va le voir.' },
  hakim: { xp: 40, chap: 4, histoire: 3, niv: 74, apres: 'neferet', txt: 'Mes cartes posent des marques : à trois, elles explosent, et aucun bouclier ne tient. Mais les monstres d’ici font pareil avec toi. Prouve que tu tiens : bats 3 élites ou monstres rares du désert.', ev: 'victoire', f: { terr: 'ambre', type: ['elite', 'rare'] }, n: 3, rec: { larme_ambre: 6, essence: 2000 }, merci: 'Prends ces larmes d’ambre : à l’atelier, elles deviennent des cartes qui marquent. Saïa sait où dort le Pharaon.' },
  saia: { xp: 50, chap: 4, histoire: 4, niv: 78, apres: 'hakim', txt: 'Le Pharaon maudit et la Reine-scorpion gardent la porte de la cité. Abats l’un des deux. Méfie-toi des marques : à trois, ça fait très mal.', ev: 'victoire', f: { terr: 'ambre', type: ['boss'] }, n: 1, rec: { larme_ambre: 10, essence: 2500 }, merci: 'Il est tombé ! Mais regarde le ciel : le soleil devient noir. Imhet sait ce que ça veut dire.' },
  imhet: { xp: 64, chap: 4, histoire: 5, niv: 82, apres: 'saia', txt: 'Le Soleil noir : l’étoile tombée, nourrie par le Pharaon. Il ne se montre que dans le Cauchemar. Éteins-le, et le désert redeviendra doré.', ev: 'victoire', f: { terr: 'ambre', type: ['boss'], cauchemar: true }, n: 1, rec: { larme_ambre: 15, eclats: 250, essence: 5000 }, merci: 'Le vrai soleil est revenu. Les sables chantent ton nom, Seigneur des Sables.' },
  nyx: { xp: 40, histoire: 5, niv: 44, apres: 'sel', txt: 'Sous le Cœur dort le Néant originel, ce qui restait avant les éléments. Il ne s’éveille que dans le Cauchemar. Va le chercher, et finis cette histoire.', ev: 'victoire', f: { terr: 'brisees', type: ['boss'], cauchemar: true }, n: 1, rec: { essence: 2000, eclat_vide: 10, eclats: 100 }, merci: 'Le Néant est retombé dans le sommeil. Les trois clans te doivent leur monde — même s’ils ne le sauront jamais. Merci, Héros de la Faille.' },
};
// ---- v108 : 5 quêtes de plus par zone, plus longues et plus dures. Elles se suivent chez le même habitant
// (pnj : qui la donne ; il propose la suivante quand la précédente est rendue). Nouveaux types :
//   lieux : [id des lieux à aller voir] (reperes.js) ; objets : [[lieu, dx, dy, icône, nom]] à ramasser par terre ;
//   on peut les combiner avec donner (« apporte ceci à la statue »). f.palierMin : au moins ce palier.
// titre : le nom court de la quête (journal) ; xp : l'expérience qu'elle rapporte (voir les tests : finir
// toutes les quêtes d'une zone amène au niveau de la zone suivante, ou un niveau en dessous).
const NOUVELLES = {
  // ======== Terres de Braise : la légende du Premier Forgeron
  feu_statue: { pnj: 'mordred', zone: 'feu', niv: 5, xp: 16, titre: 'La statue oubliée', lieux: ['statue_forgeron'],
    txt: 'Au sud, tout au bord de la Faille, se dresse la statue du Premier Forgeron : celui qui a allumé la première forge du clan, quand le Feu n’était encore qu’une étincelle. Plus personne ne va la voir. Va lui rendre visite, et dis-moi si son marteau est toujours levé vers le ciel.',
    rec: { essence: 400, braises: 60 }, merci: 'Toujours levé ? Alors il veille encore sur nous. Bram voudra entendre ça : ses outils ont une histoire.' },
  feu_outils: { pnj: 'bram', zone: 'feu', niv: 10, xp: 18, titre: 'Les outils du Premier Forgeron',
    objets: [['cratere', -50, 22, '🔨', 'le marteau ancien'], ['cratere', 46, 26, '🗜️', 'la pince ancienne'], ['cratere', 0, 44, '🪓', 'le burin ancien']],
    txt: 'La légende dit que le Premier Forgeron a jeté ses outils dans le Cratère des Cendres, à l’ouest, le jour où il a éteint sa forge. Je n’y croyais pas… jusqu’à ce qu’un éclaireur les voie briller dans les cendres. Rapporte-moi le marteau, la pince et le burin.',
    rec: { essence: 500, eclats: 40, cristal: 2 }, merci: 'Ils sont tièdes. Après tout ce temps… Tiens, prends ces éclats : avec ces outils, mes cartes vont devenir terribles.' },
  feu_cratere: { pnj: 'ignis', zone: 'feu', niv: 14, xp: 20, titre: 'Ce qui dormait sous la cendre', ev: 'victoire', f: { terr: 'feu', type: ['elite', 'rare'], palierMin: 2 }, n: 3,
    txt: 'Depuis que les outils ont quitté le cratère, les bêtes de lave sortent du portail plus fortes, plus nombreuses. Quelque chose les a réveillées. Bats 3 élites ou monstres rares des Terres de Braise, au Palier II ou plus.',
    rec: { essence: 650, cristal: 3, eclats: 30 }, merci: 'Tu tiens le portail mieux que mes propres gardes. Mais ces bêtes ont faim de chaleur : Pyra parle d’une flamme qui s’éteint.' },
  feu_flamme: { pnj: 'pyra', zone: 'feu', niv: 18, xp: 20, titre: 'Ranimer la Flamme éternelle', lieux: ['flamme'], donner: { braises: 250, cristal: 4 },
    txt: 'L’Autel de la Flamme éternelle, sur la route du Carrefour, n’a jamais cessé de brûler… sauf que ce matin, elle vacillait. Si elle meurt, nos braises ne prendront plus. Va à l’autel avec 250 braises et 4 cristaux de lave, et nourris-la. Puis reviens me dire qu’elle brûle.',
    rec: { essence: 900, eclats: 50 }, merci: 'Je la vois d’ici, plus haute que jamais ! Les marchands vont revenir. Gorran, lui, dit que ce n’est pas fini.' },
  feu_gardien: { pnj: 'gorran', zone: 'feu', niv: 22, xp: 22, titre: 'Le gardien du Palier III', ev: 'victoire', f: { terr: 'feu', type: ['boss'], palierMin: 3 }, n: 1,
    txt: 'Une flamme qui renaît attire les convoitises. Au bout du portail, au Palier III, le gardien des Terres de Braise rassemble les bêtes pour venir l’éteindre. Va le trouver avant qu’il ne vienne à nous, et abats-le.',
    rec: { essence: 1200, cristal: 5, eclats: 60 }, merci: 'Le Palier III est à nous. Les anciens disaient que seuls les héros du clan passaient ce portail. Tu en es un, maintenant.' },
  // ======== Lagons d'Azur : le naufrage du Grand Nautile
  eau_phare: { pnj: 'loupiot', zone: 'eau', niv: 5, xp: 16, titre: 'La lumière du vieux phare', lieux: ['phare'],
    txt: 'Mon grand-père gardait le vieux phare, tout au nord des Lagons. Il dit qu’il voit encore sa lumière la nuit… mais tout le monde dit que le phare est éteint depuis le naufrage. Tu peux aller voir s’il tourne toujours ? Moi on ne me laisse pas y aller.',
    rec: { essence: 400, perles: 60 }, merci: 'Il tourne ?! Grand-père avait raison ! Le Capitaine Marin connaît l’histoire du naufrage, va lui raconter.' },
  eau_epave: { pnj: 'marin', zone: 'eau', niv: 10, xp: 18, titre: 'L’épave du Grand Nautile',
    objets: [['epave', -56, 26, '🧭', 'la boussole du capitaine'], ['epave', 50, 30, '📓', 'le journal de bord'], ['epave', -6, 48, '🧰', 'le coffret scellé']],
    txt: 'Le Grand Nautile s’est échoué à l’est du village, il y a quarante ans, le soir où le phare s’est mis à tourner tout seul. Mon capitaine y a laissé sa boussole, son journal de bord et un coffret scellé. Récupère-les, moussaillon, et ne fais pas attention aux craquements.',
    rec: { essence: 500, eclats: 40, perle_noire: 2 }, merci: 'Le journal parle d’une dame dans l’eau qui a fermé les yeux… L’Oracle saura. Garde ces éclats, c’est le salaire de l’équipage.' },
  eau_dame: { pnj: 'oracle', zone: 'eau', niv: 14, xp: 20, titre: 'Les yeux de la Dame des Marées', lieux: ['statue_marees'], donner: { perles: 220, perle_noire: 3 },
    txt: 'La Dame des Marées garde les Lagons depuis toujours. Le soir du naufrage, elle a fermé les yeux, et les eaux sont devenues sourdes. Va à sa statue, à l’ouest, et dépose à ses pieds 220 perles et 3 perles noires. Si elle rouvre les yeux, les profondeurs nous parleront à nouveau.',
    rec: { essence: 900, eclats: 50 }, merci: 'Elle a ouvert les yeux. Et ce qu’elle voit… ne me plaît pas. Néréa sent les profondeurs remuer.' },
  eau_profondeurs: { pnj: 'nerea', zone: 'eau', niv: 18, xp: 20, titre: 'Ce qui remonte des profondeurs', ev: 'victoire', f: { terr: 'eau', type: ['elite', 'rare'], palierMin: 2 }, n: 4,
    txt: 'Depuis que la Dame a rouvert les yeux, ce qui dormait au fond des Lagons remonte vers le portail. Des bêtes que je n’avais jamais vues. Bats 4 élites ou monstres rares des Lagons d’Azur, au Palier II ou plus, avant qu’elles n’atteignent le village.',
    rec: { essence: 700, perle_noire: 3, eclats: 30 }, merci: 'Elles reculent. Mais derrière elles, il y a plus gros. Tholos l’a vu passer sous le portail.' },
  eau_leviathan: { pnj: 'tholos', zone: 'eau', niv: 22, xp: 22, titre: 'L’ombre sous le portail', ev: 'victoire', f: { terr: 'eau', type: ['boss'], palierMin: 3 }, n: 1,
    txt: 'Les pêcheurs ont vu une ombre immense sous le portail, plus longue que trois barques. C’est le gardien des Lagons, au Palier III : c’est lui qui a coulé le Grand Nautile. Ramène-moi la preuve que tu l’as vaincu.',
    rec: { essence: 1200, perle_noire: 5, eclats: 60 }, merci: 'Le Nautile est vengé. Ce soir, tout le village allume des lanternes pour toi.' },
  // ======== Sylve d'Émeraude : les graines de l'Arbre-Mère
  plante_cercle: { pnj: 'mousse', zone: 'plante', niv: 5, xp: 16, titre: 'Les pierres qui chantent', lieux: ['cercle'],
    txt: 'Ma grand-mère dit que les pierres levées, entre la Sylve et le Carrefour, chantent quand on s’approche. Les grands disent que c’est le vent. Moi j’ai peur d’y aller tout seul… Tu vas voir, et tu me dis si elles chantent vraiment ?',
    rec: { essence: 400, seve: 60 }, merci: 'Elles chantent ! Je le savais ! Aélia dit que c’est l’Arbre-Mère qui les fait chanter, va la voir !' },
  plante_graines: { pnj: 'aelia', zone: 'plante', niv: 10, xp: 18, titre: 'Les graines de l’Arbre-Mère',
    objets: [['arbre_mere', -58, 24, '🌰', 'une graine lumineuse'], ['arbre_mere', 54, 28, '🌰', 'une graine lumineuse'], ['arbre_mere', 0, 50, '🌰', 'une graine lumineuse']],
    txt: 'L’Arbre-Mère, tout à l’est de la Sylve, ne laisse tomber que trois graines lumineuses par siècle. Les pierres ont chanté : c’est cette année. Ramasse-les avant les écureuils, la Sylve en aura besoin.',
    rec: { essence: 500, eclats: 40, graine_or: 2 }, merci: 'Elles sont chaudes comme un cœur qui bat. Brindille saura où les planter : le Gardien Sylvestre a soif.' },
  plante_gardien: { pnj: 'brindille', zone: 'plante', niv: 14, xp: 20, titre: 'Les racines du Gardien', lieux: ['statue_gardien'], donner: { seve: 250, graine_or: 4 },
    txt: 'La statue du Gardien Sylvestre, au sud-est, se fend de partout : ses racines de pierre ont soif depuis des années. Porte-lui 250 sève et 4 graines d’or, verse-les à ses pieds, et la pierre se refermera. Enfin, c’est ce que dit ma grand-tante.',
    rec: { essence: 900, eclats: 50 }, merci: 'Les fissures se referment ! Et la forêt… elle bouge. Faune dit qu’elle se réveille un peu trop.' },
  plante_reveil: { pnj: 'faune', zone: 'plante', niv: 18, xp: 20, titre: 'La forêt qui se réveille', ev: 'victoire', f: { terr: 'plante', type: ['elite', 'rare'], palierMin: 2 }, n: 4,
    txt: 'Le Gardien a bu, et toute la Sylve s’est réveillée avec lui… y compris ce qui dormait au fond. Des bêtes de ronce et de spores remontent au portail. Bats 4 élites ou monstres rares de la Sylve d’Émeraude, au Palier II ou plus.',
    rec: { essence: 700, graine_or: 3, eclats: 30 }, merci: 'La forêt se calme. Mais Ronce a vu quelque chose de bien plus gros prendre racine au Palier III.' },
  plante_ronces: { pnj: 'ronce', zone: 'plante', niv: 22, xp: 22, titre: 'Le cœur des ronces', ev: 'victoire', f: { terr: 'plante', type: ['boss'], palierMin: 3 }, n: 1,
    txt: 'Au Palier III, le gardien de la Sylve a pris racine au milieu des ronces, et il pousse vers nous. Encore une saison et il étouffera le village. Coupe-le à la racine.',
    rec: { essence: 1200, graine_or: 5, eclats: 60 }, merci: 'Les ronces se retirent. La Sylve te doit une fière chandelle, et moi aussi.' },
  // ======== Terres Brisées : le Premier Peuple
  faille_monolithe: { pnj: 'orin', zone: 'brisees', niv: 31, xp: 18, titre: 'Le Monolithe fêlé', lieux: ['monolithe'],
    txt: 'Tout à l’est des Terres Brisées, un monolithe noir se dresse au bord du vide. Ses fissures bougent, je le jure : elles dessinent des mots. Va le voir de près, et rapporte-moi ce qu’il montre. Ne le touche pas.',
    rec: { essence: 900, fragments: 50 }, merci: 'Trois signes, un seul mot… C’est la langue d’avant les clans. Lyra doit voir ça.' },
  faille_tablettes: { pnj: 'lyra', zone: 'brisees', niv: 33, xp: 20, titre: 'Les tablettes du Premier Peuple',
    objets: [['ruines', -60, 22, '🪨', 'une tablette gravée'], ['ruines', 56, 26, '🪨', 'une tablette gravée'], ['ruines', -26, 52, '🪨', 'une tablette gravée'], ['ruines', 30, 54, '🪨', 'une tablette gravée']],
    txt: 'Les Ruines du Premier Peuple, tout à l’ouest de la Faille, gardent des tablettes gravées dans les trois langues à la fois. Avec le mot du monolithe, je pourrai enfin tout lire. Rapporte-m’en quatre. Les monstres rôdent autour : ils n’aiment pas qu’on fouille.',
    rec: { essence: 1100, eclats: 60, eclat_vide: 2 }, merci: 'Le Premier Peuple a scellé le Néant avec le monolithe… et la fissure s’élargit. Varda sait comment la combler.' },
  faille_sceau: { pnj: 'varda', zone: 'brisees', niv: 37, xp: 22, titre: 'Refermer le sceau', lieux: ['monolithe'], donner: { fragments: 160, eclat_vide: 6 },
    txt: 'Les fissures du monolithe, c’est le sceau du Premier Peuple qui cède. Je peux le refondre : il me faut 160 fragments de faille et 6 éclats du vide, portés jusqu’au monolithe et versés dans la plus grande fissure. Moi, je ne peux pas quitter la forge.',
    rec: { essence: 1400, eclats: 80 }, merci: 'Le sceau tient. Pour l’instant. Sel dit que les monstres du Palier III le sentent, et qu’ils s’agitent.' },
  faille_assaut: { pnj: 'sel', zone: 'brisees', niv: 40, xp: 22, titre: 'Ceux qui veulent briser le sceau', ev: 'victoire', f: { terr: 'brisees', type: ['elite', 'rare'], palierMin: 3 }, n: 4,
    txt: 'Les monstres fusionnés ont senti le sceau se refermer. Ils se regroupent derrière le portail, au Palier III, pour venir le briser. Bats-en 4 parmi les élites ou les monstres rares, avant qu’ils ne passent.',
    rec: { essence: 1500, eclat_vide: 5, fragments: 80 }, merci: 'Ils ne passeront pas. Mais leur maître, lui, n’attend que le Cauchemar pour revenir. Nyx en sait plus.' },
  faille_cauchemar: { pnj: 'nyx', zone: 'brisees', niv: 44, xp: 23, titre: 'Le Cauchemar sans fin', ev: 'victoire', f: { terr: 'brisees', cauchemar: true }, n: 8,
    txt: 'Le Néant dort, mais ses rêves continuent : dans le Cauchemar, ses enfants se battent encore pour lui. Va dans le Cauchemar des Terres Brisées et abats-en 8. Chaque victoire l’enfonce un peu plus dans le sommeil.',
    rec: { essence: 2200, eclat_vide: 8, eclats: 120 }, merci: 'Le sommeil du Néant est profond, maintenant. Le Premier Peuple serait fier de toi.' },
  // ======== Cimes Orageuses : le Roi pris dans la glace
  cimes_statue: { pnj: 'brann', zone: 'cimes', niv: 51, xp: 34, titre: 'Le Roi pris dans la glace', lieux: ['statue_roi'],
    txt: 'Au nord-est des Cimes, il y a une statue que personne n’a sculptée : un roi couronné, pris dans la glace d’un seul coup. Les anciens disent que c’est le premier Roi des Tempêtes, foudroyé par son propre orage. Va la voir, et regarde bien ses yeux.',
    rec: { essence: 1600, plumes: 60 }, merci: 'Ils brillent encore ? Alors il n’est pas mort. Aela doit le savoir.' },
  cimes_plumes: { pnj: 'aela', zone: 'cimes', niv: 53, xp: 36, titre: 'Les plumes du Cairn',
    objets: [['cairn', -56, 24, '🪶', 'une plume d’aurore'], ['cairn', 52, 28, '🪶', 'une plume d’aurore'], ['cairn', -24, 52, '🪶', 'une plume d’aurore'], ['cairn', 28, 52, '🪶', 'une plume d’aurore']],
    txt: 'Au Cairn des Disparus, chaque grimpeur laisse une plume avant de monter vers le sommet. Quatre plumes d’aurore y brillent encore : celles des quatre gardiens qui ont enfermé le Roi dans la glace. Rapporte-les : elles me diront comment le garder endormi.',
    rec: { essence: 1800, cristal_foudre: 3, eclats: 80 }, merci: 'Les plumes disent qu’il faut nourrir la glace d’éclairs, sinon elle fond. Torvald sait forger la foudre.' },
  cimes_glace: { pnj: 'torvald', zone: 'cimes', niv: 57, xp: 38, titre: 'Nourrir la glace', lieux: ['statue_roi'], donner: { plumes: 220, cristal_foudre: 8 },
    txt: 'La glace qui tient le vieux Roi fond un peu plus chaque nuit d’orage. Porte 220 plumes d’orage et 8 cristaux de foudre à la statue, et enfonce-les dans la glace : la foudre gèlera avec elle, et la prison tiendra encore cent ans.',
    rec: { essence: 2200, eclats: 100 }, merci: 'La glace a chanté. Il dort. Mais Skadi dit que ses serviteurs tentent de le libérer depuis le Palier III.' },
  cimes_serviteurs: { pnj: 'skadi', zone: 'cimes', niv: 60, xp: 39, titre: 'Les serviteurs du vieux Roi', ev: 'victoire', f: { terr: 'cimes', type: ['elite', 'rare'], palierMin: 3 }, n: 5,
    txt: 'Ses serviteurs ne l’ont pas oublié. Au Palier III, ils creusent vers la statue à coups d’éclairs. Abats 5 élites ou monstres rares des Cimes. Je surveille la glace pendant ce temps.',
    rec: { essence: 2400, cristal_foudre: 6, plumes: 100 }, merci: 'Plus un éclair ne touche la glace. Odra dit que la vraie tempête, elle, gronde dans le Cauchemar.' },
  cimes_cauchemar: { pnj: 'odra', zone: 'cimes', niv: 63, xp: 42, titre: 'La tempête du Cauchemar', ev: 'victoire', f: { terr: 'cimes', cauchemar: true }, n: 10,
    txt: 'Dans le Cauchemar, l’orage ne s’arrête jamais, et chaque monstre qui y tombe nourrit la colère du vieux Roi. Abats-en 10 dans le Cauchemar des Cimes : sans eux, sa colère retombera pour de bon.',
    rec: { essence: 3200, cristal_foudre: 10, eclats: 150 }, merci: 'Le ciel est clair au-dessus des Cimes. Pour la première fois, même la statue semble sourire.' },
  // ======== Désert d'Ambre : le Sphinx et le Soleil
  ambre_sphinx: { pnj: 'kesh', zone: 'ambre', niv: 71, xp: 42, titre: 'La question du Sphinx', lieux: ['sphinx'],
    txt: 'Au nord du désert, le vent a dégagé la tête d’un sphinx immense. Les caravaniers disent qu’il pose une question à ceux qui s’approchent, et que ceux qui ne répondent pas finissent ensablés. Va le voir. Écoute sa question, ne réponds rien, et reviens.',
    rec: { essence: 2200, sable_dore: 70 }, merci: '« Qui gardera le soleil quand il tombera ? » C’est ce qu’il t’a demandé ? Neferet doit l’entendre.' },
  ambre_papyrus: { pnj: 'neferet', zone: 'ambre', niv: 73, xp: 44, titre: 'Les papyrus de l’Obélisque',
    objets: [['obelisque_soleil', -56, 24, '📜', 'un papyrus scellé'], ['obelisque_soleil', 52, 28, '📜', 'un papyrus scellé'], ['obelisque_soleil', -24, 52, '📜', 'un papyrus scellé'], ['obelisque_soleil', 28, 54, '📜', 'un papyrus scellé']],
    txt: 'La réponse du Sphinx est écrite au pied de l’Obélisque du Soleil, au sud du désert, sur quatre papyrus que les prêtres ont enterrés dans le sable. Les tempêtes les ont fait remonter. Rapporte-les avant qu’elles ne les emportent.',
    rec: { essence: 2600, larme_ambre: 3, eclats: 100 }, merci: '« Celui qui offrira l’ambre au Sphinx. » Il faut lui apporter de quoi garder le soleil. Hakim saura quoi.' },
  ambre_offrande: { pnj: 'hakim', zone: 'ambre', niv: 77, xp: 46, titre: 'L’offrande au Sphinx', lieux: ['sphinx'], donner: { sable_dore: 260, larme_ambre: 10 },
    txt: 'Le Sphinx veut une offrande digne du soleil : 260 sables dorés et 10 larmes d’ambre, déposés entre ses pattes. Si l’offrande lui plaît, il protégera le désert. Sinon… eh bien, tu auras fait une belle promenade.',
    rec: { essence: 3000, eclats: 120 }, merci: 'Il a fermé les yeux en souriant, paraît-il. Saïa dit que la cité ensevelie n’a pas aimé ça.' },
  ambre_cite: { pnj: 'saia', zone: 'ambre', niv: 80, xp: 47, titre: 'La colère de la cité ensevelie', ev: 'victoire', f: { terr: 'ambre', type: ['elite', 'rare'], palierMin: 3 }, n: 6,
    txt: 'La cité ensevelie a senti le Sphinx changer de camp. Ses gardiens remontent du sable au Palier III, et ils marquent tout ce qui bouge. Abats 6 élites ou monstres rares du désert. Méfie-toi des marques.',
    rec: { essence: 3400, larme_ambre: 8, sable_dore: 120 }, merci: 'Les gardiens sont retournés sous le sable. Imhet dit que leur roi, lui, ne dort que dans le Cauchemar.' },
  ambre_cauchemar: { pnj: 'imhet', zone: 'ambre', niv: 83, xp: 50, titre: 'Les sables du Cauchemar', ev: 'victoire', f: { terr: 'ambre', cauchemar: true }, n: 12,
    txt: 'Dans le Cauchemar, la cité n’est pas ensevelie : elle est debout, et elle se bat. Chaque monstre que tu y abats fait retomber un grain de sable sur elle. Abats-en 12 dans le Cauchemar du désert.',
    rec: { essence: 4500, larme_ambre: 14, eclats: 200 }, merci: 'La cité dort sous une dune de plus. Le Sphinx garde le soleil, et le désert te garde dans son cœur.' },
  // ======== Îles Célestes : l'Archange déchu
  ciel_archange: { pnj: 'elio', zone: 'ciel', niv: 90, xp: 20, titre: 'L’Archange déchu', lieux: ['statue_archange'],
    txt: 'À l’est des îles, une statue d’archange regarde le vide, les ailes brisées. On dit qu’il est tombé en voulant protéger les étoiles de l’Étoile mère. Va la voir, et regarde ce qu’il tient dans ses mains.',
    rec: { essence: 3000, poussiere_etoile: 80 }, merci: 'Rien ? Ses mains sont vides ? Alors quelqu’un a pris ses éclats d’étoile. Astrée doit savoir où.' },
  ciel_eclats: { pnj: 'astree', zone: 'ciel', niv: 91, xp: 21, titre: 'Les éclats du Cadran',
    objets: [['cadran', -58, 22, '⭐', 'un éclat d’étoile'], ['cadran', 54, 26, '⭐', 'un éclat d’étoile'], ['cadran', -30, 50, '⭐', 'un éclat d’étoile'], ['cadran', 30, 52, '⭐', 'un éclat d’étoile'], ['cadran', 0, -40, '⭐', 'un éclat d’étoile']],
    txt: 'L’Étoile mère a arraché les éclats des mains de l’Archange et les a jetés sur le Cadran des Étoiles, à l’ouest des îles, pour qu’ils s’éteignent. Il y en a cinq. Rapporte-les tant qu’ils brillent encore.',
    rec: { essence: 3400, coeur_etoile: 4, eclats: 120 }, merci: 'Ils brillent encore. Corvin sait comment les rendre à l’Archange.' },
  ciel_ailes: { pnj: 'corvin', zone: 'ciel', niv: 93, xp: 22, titre: 'Rendre ses ailes à l’Archange', lieux: ['statue_archange'], donner: { poussiere_etoile: 300, coeur_etoile: 12 },
    txt: 'Pour réparer ses ailes, il faut de la lumière d’étoile pure : 300 poussières d’étoile et 12 cœurs d’étoile, déposés aux pieds de l’Archange. Avec les éclats, ses ailes se recolleront. S’il se relève, il protégera les îles à notre place.',
    rec: { essence: 4000, eclats: 150 }, merci: 'Ses ailes brillent à nouveau. Séléné dit que les serviteurs de l’Étoile mère sont furieux.' },
  ciel_serviteurs: { pnj: 'selene', zone: 'ciel', niv: 95, xp: 23, titre: 'Les serviteurs de l’Étoile mère', ev: 'victoire', f: { terr: 'ciel', type: ['elite', 'rare'], palierMin: 3 }, n: 6,
    txt: 'Les serviteurs de l’Étoile mère veulent rebriser les ailes de l’Archange. Au Palier III, ils boivent la vie de tout ce qu’ils touchent. Abats 6 élites ou monstres rares des îles, et ne les laisse pas frapper trop longtemps.',
    rec: { essence: 4500, coeur_etoile: 8, poussiere_etoile: 150 }, merci: 'Ils reculent vers le Cauchemar, là où l’Étoile mère les attend. Ysolde t’y conduira une dernière fois.' },
  ciel_cauchemar: { pnj: 'ysolde', zone: 'ciel', niv: 96, xp: 24, titre: 'Le dernier Cauchemar', ev: 'victoire', f: { terr: 'ciel', cauchemar: true }, n: 12,
    txt: 'Dans le Cauchemar des îles, les étoiles mortes se battent encore pour leur mère. Abats-en 12. Quand la dernière tombera, l’Archange pourra enfin veiller en paix, et toi, tu auras fini ce que le Premier Peuple avait commencé.',
    rec: { essence: 6000, coeur_etoile: 16, eclats: 300 }, merci: 'Tout est calme, de la Faille jusqu’aux étoiles. Il n’y a plus de légende à écrire : tu es devenu la légende.' },
};
Object.assign(QUETES, NOUVELLES);
export const PAR_CLAN = { ciel: ['elio', 'astree', 'corvin', 'selene', 'ysolde'], ambre: ['kesh', 'neferet', 'hakim', 'saia', 'imhet'], cimes: ['brann', 'aela', 'torvald', 'skadi', 'odra'], brisees: ['orin', 'lyra', 'varda', 'sel', 'nyx'], feu: ['bram', 'ignis', 'cendrillon', 'mordred', 'pyra', 'gorran'], eau: ['marin', 'nerea', 'loupiot', 'oracle', 'coralie', 'tholos'], plante: ['sylvain', 'faune', 'mousse', 'aelia', 'brindille', 'ronce'] };
export const TITRES = { ciel: 'Gardien des Étoiles', ambre: 'Seigneur des Sables', cimes: 'Maître des Tempêtes', brisees: 'Héros de la Faille', feu: 'Ami des Terres de Braise', eau: 'Ami des Lagons d’Azur', plante: 'Ami de la Sylve' };
export const valide = (id) => typeof id === 'string' && Object.hasOwn(QUETES, id);
// v108 : qui donne la quête (par défaut, l'habitant du même nom) et la zone où elle compte
export const pnjDe = (id) => QUETES[id]?.pnj || id;
const ZONE_DE = {}; for (const [z, l] of Object.entries(PAR_CLAN)) for (const id of l) ZONE_DE[id] = z;
export const zoneDe = (id) => QUETES[id]?.zone || ZONE_DE[id] || null;
// les quêtes d'un habitant, dans l'ordre où il les propose
export const QUETES_DE = {};
for (const id of Object.keys(QUETES)) (QUETES_DE[pnjDe(id)] ||= []).push(id);
for (const l of Object.values(QUETES_DE)) l.sort((a, b) => (a === pnjDe(a) ? -1 : b === pnjDe(b) ? 1 : 0));
// toutes les quêtes d'une zone (celles d'origine puis les nouvelles)
export const QUETES_ZONE = {};
for (const id of Object.keys(QUETES)) { const z = zoneDe(id); if (z) (QUETES_ZONE[z] ||= []).push(id); }
const VILLAGES = new Set(['feu', 'eau', 'plante']);
// l'XP d'une quête pour ce joueur : les quêtes de village ne rapportent de l'XP que dans son propre village
// v112 : les quêtes rapportaient trop (les joueurs dépassaient le niveau de la zone suivante) : 40 % de moins.
// Les quêtes d’une zone donnent maintenant environ 60 % de l’XP pour atteindre la zone suivante ;
// les expéditions font le reste. Pour régler, il suffit de changer ce coefficient (et le test de calibrage).
export const COEF_XP_QUETES = 0.6;
export const xpQuete = (p, id) => { const q = QUETES[id]; if (!q?.xp) return 0; const z = zoneDe(id); return VILLAGES.has(z) && z !== p?.clan ? 0 : Math.max(1, Math.round(q.xp * COEF_XP_QUETES)); };
export function xpQuetes(p) { let x = 0; for (const [id, s] of Object.entries(p?.pnjQ || {})) if (s?.fait) x += xpQuete(p, id); return x; }
// la quête qu'un habitant propose en ce moment : la première pas encore rendue (null : il n'a plus rien)
export function queteDe(p, pnj) { for (const id of QUETES_DE[pnj] || []) if (!p?.pnjQ?.[id]?.fait) return id; return null; }
// l'état côté habitant (pour le « ! » et le « ? » au-dessus de sa tête)
export const etatPnj = (p, pnj) => { const id = queteDe(p, pnj); return id ? etat(p, id) : (QUETES_DE[pnj] ? 'faite' : null); };

// l'état d'une quête pour ce joueur : 'verrou', 'libre' (à proposer), 'cours', 'prete' (à rendre), 'faite'
export const suivi = (p) => (p.pnjQ ||= {});
const aTout = (p, q) => !q.donner || Object.entries(q.donner).every(([k, v]) => (p.ress[k] || 0) >= v);
export const objectif = (q) => (q.lieux ? q.lieux.length : q.objets ? q.objets.length : q.ev ? q.n : 0);
export function etat(p, id) {
  const q = QUETES[id], s = p.pnjQ?.[id];
  if (!q) return null;
  if (!s) return verrou(p, id) ? 'verrou' : 'libre';
  if (s.fait) return 'faite';
  return (s.n || 0) >= objectif(q) && aTout(p, q) ? 'prete' : 'cours';
}
// v90 : combien de parties de l'histoire de la Faille sont finies (0 à 5)
export const histoireFaille = (p) => PAR_CLAN.brisees.filter((id) => p.pnjQ?.[id]?.fait).length;
export const histoireCimes = (p) => PAR_CLAN.cimes.filter((id) => p.pnjQ?.[id]?.fait).length;   // v96
export const histoireCiel = (p) => PAR_CLAN.ciel.filter((id) => p.pnjQ?.[id]?.fait).length;   // v99
export const histoireAmbre = (p) => PAR_CLAN.ambre.filter((id) => p.pnjQ?.[id]?.fait).length;   // v98
// v87 : les quêtes d'histoire attendent un niveau et la quête d'avant ; v108 : et la quête d'avant chez le même habitant
export function verrou(p, id) {
  const q = QUETES[id];
  if (q.apres && !p.pnjQ?.[q.apres]?.fait) return `Pas encore : il te faut d’abord finir la quête de ${q.apres[0].toUpperCase() + q.apres.slice(1)}.`;
  const l = QUETES_DE[pnjDe(id)] || [], k = l.indexOf(id);
  if (k > 0 && !p.pnjQ?.[l[k - 1]]?.fait) return 'Finis d’abord ce que je t’ai demandé avant.';
  if (q.niv && niveauDe(p) < q.niv) return `Reviens au niveau ${q.niv}.`;
  return null;
}
// l'avancement à afficher : null pour une quête où il n'y a qu'à apporter des ressources
export const progres = (p, id) => { const q = QUETES[id]; const m = objectif(q); return m ? { n: Math.min(m, p.pnjQ?.[id]?.n || 0), max: m } : null; };

export function accepter(p, id) {
  if (!valide(id)) return { ok: false };
  const v = verrou(p, id); if (!p.pnjQ?.[id] && v) return { ok: false, raison: v };
  if (etat(p, id) !== 'libre') return { ok: false, raison: 'Tu as déjà cette quête.' };
  suivi(p)[id] = { n: 0 };
  return { ok: true };
}
export function rendre(p, id) {
  if (!valide(id)) return { ok: false };
  if (etat(p, id) !== 'prete') return { ok: false, raison: 'Ce n’est pas encore fait.' };
  const q = QUETES[id];
  if (q.donner) for (const [k, v] of Object.entries(q.donner)) p.ress[k] -= v;
  for (const [k, v] of Object.entries(q.rec)) p.ress[k] = (p.ress[k] || 0) + v;
  p.pnjQ[id].fait = true; delete p.pnjQ[id].pris;
  return { ok: true, rec: q.rec, merci: q.merci, xp: xpQuete(p, id) };
}
// chaque événement fait avancer les quêtes des habitants en cours (appelé par quetes.js)
const filtreOk = (f, info) => !f || Object.entries(f).every(([k, v]) => (k === 'palierMin' ? (info?.palier || 0) >= v : Array.isArray(v) ? v.includes(info?.[k]) : info?.[k] === v));
export function avancer(p, ev, n = 1, info = {}) {
  if (!p.pnjQ) return;
  for (const [id, s] of Object.entries(p.pnjQ)) {
    const q = QUETES[id]; if (!q || s.fait || q.ev !== ev || !filtreOk(q.f, info)) continue;
    s.n = Math.min(q.n, (s.n || 0) + Math.max(0, n | 0));
  }
}
// v108 : aller voir un lieu (x, y : la position du joueur, vérifiée par le serveur)
export function visiter(p, id, x, y) {
  const q = QUETES[id], s = p.pnjQ?.[id];
  if (!q?.lieux || !s || s.fait) return { ok: false };
  let fait = false;
  q.lieux.forEach((l, i) => { const r = REPERE[l]; if (!(s.vus & (1 << i)) && Math.hypot(x - r.x, y - r.y) < RAYON_VISITE + 30) { s.vus = (s.vus || 0) | (1 << i); fait = true; } });
  if (!fait) return { ok: false, raison: 'Ce n’est pas ici.' };
  s.n = popcount(s.vus);
  return { ok: true, n: s.n, max: q.lieux.length };
}
// v108 : ramasser un objet de quête posé par terre
export const posObjetQuete = (q, i) => { const o = q.objets[i]; return { ...posObjet(o), ico: o[3], nom: o[4] }; };
export function ramasser(p, id, i, x, y) {
  const q = QUETES[id], s = p.pnjQ?.[id]; i = Math.floor(Number(i));
  if (!q?.objets || !s || s.fait || !(i >= 0 && i < q.objets.length) || s.pris & (1 << i)) return { ok: false };
  const o = posObjetQuete(q, i);
  if (Math.hypot(x - o.x, y - o.y) > RAYON_OBJET + 30) return { ok: false, raison: 'Approche-toi.' };
  s.pris = (s.pris || 0) | (1 << i); s.n = popcount(s.pris);
  return { ok: true, n: s.n, max: q.objets.length, nom: o.nom };
}
// les objets encore à ramasser pour ce joueur (pour les dessiner sur la carte)
export function objetsAVoir(p) {
  const l = [];
  for (const [id, s] of Object.entries(p?.pnjQ || {})) { const q = QUETES[id]; if (!q?.objets || s.fait) continue; q.objets.forEach((_, i) => { if (!(s.pris & (1 << i))) l.push({ id, i, ...posObjetQuete(q, i) }); }); }
  return l;
}
// les lieux encore à voir (pour les montrer sur la carte et guider le joueur)
export function lieuxAVoir(p) {
  const l = [];
  for (const [id, s] of Object.entries(p?.pnjQ || {})) { const q = QUETES[id]; if (!q?.lieux || s.fait) continue; q.lieux.forEach((r, i) => { if (!(s.vus & (1 << i))) l.push({ id, ...REPERE[r] }); }); }
  return l;
}
const popcount = (v) => { let n = 0; while (v) { n += v & 1; v >>>= 1; } return n; };
export const amiDe = (p, clan) => PAR_CLAN[clan].every((id) => p.pnjQ?.[id]?.fait);
export const nomTerre = (clan) => T[clan];
