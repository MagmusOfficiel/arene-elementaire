// =====================================================================
//  LES CLANS ÉLÉMENTAIRES — les habitants des terres (v74)
//  Pur (client + serveur). Six PNJ par terre : ils se promènent dans leur
//  village ou près de leur poste, et parlent quand on s'approche (E).
//  Leur position se déduit de l'heure (comme le marchand) : tous les
//  joueurs les voient au même endroit, sans rien envoyer sur le réseau.
//  Leur apparence réutilise les tenues, cheveux et coiffes des joueurs.
// =====================================================================
import { CENTRES, CENTRE_FAILLE, CENTRE_CIMES, CENTRE_AMBRE, CENTRE_CIEL, LIEUX, OUVRAGES, obstacles, praticable, alea } from './geo.js';

const portail = (t) => LIEUX.find((l) => l.terr === t);
const pres = ([x, y], dx, dy) => [x + dx, y + dy];
// ancre : [x, y] ; r : rayon de promenade (0 = il reste à son poste) ; app : tenue.cheveux.coiffe.aura
export const PNJ = [
  // ---- Terres de Braise (Feu)
  { id: 'bram', clan: 'feu', nom: 'Bram', role: 'forgeron', classe: 'combattant', app: 't_clan.c_noir.h_aucun.a_aucune', ancre: pres([OUVRAGES.feu.x, OUVRAGES.feu.y], 40, 50), r: 40,
    dits: ['Une carte améliorée tape plus fort partout : en expédition, en duel et dans l’arène.', 'Les éclats viennent de tes doublons à l’autel. Garde-les pour la forge !', 'Le grand ouvrage du village avance quand chacun y met du sien. Passe y donner un coup de main.'] },
  { id: 'ignis', clan: 'feu', nom: 'Ignis', role: 'gardienne du portail', classe: 'escrimeur', app: 't_clan.c_roux.h_casque.a_aucune', ancre: pres([portail('feu').x, portail('feu').y], 60, -40), r: 0,
    dits: ['Au-delà du portail, chaque étage est plus dur que le précédent. Le boss attend tout au bout.', 'Si tu tombes en expédition, tu perds la moitié de ce que tu as ramassé. Sache t’arrêter.', 'Le Cauchemar… je n’y retournerai jamais. Mais ceux qui en reviennent ont un loup spectral.'] },
  { id: 'cendrillon', clan: 'feu', nom: 'Tison', role: 'gamin du village', classe: 'tireur', app: 't_corail.c_roux.h_paille.a_aucune', ancre: CENTRES.feu, r: 170,
    dits: ['T’as vu le boss mondial ? Paraît qu’il faut être plein pour le battre !', 'Moi plus tard je serai Berserker. Ou Gardien. Ou les deux !', 'Chut ! Je joue à cache-cache avec les braises.'] },
  { id: 'mordred', clan: 'feu', nom: 'Vieux Mordred', role: 'conteur', classe: 'mage', app: 't_nuit.c_blanc.h_capuche.a_aucune', ancre: pres(CENTRES.feu, -90, 30), r: 30,
    dits: ['Jadis, les trois clans ne faisaient qu’un. Puis le Feu a voulu brûler plus fort que les autres…', 'Les sanctuaires tenus par ton clan font pousser la production de toutes les parcelles.', 'La lave ne pardonne pas. Mais elle réchauffe les cœurs, gamin.'] },
  { id: 'pyra', clan: 'feu', nom: 'Pyra', role: 'marchande de braises', classe: 'mage', app: 't_or.c_noir.h_fleurs.a_braises', ancre: pres(CENTRES.feu, 110, -40), r: 25,
    dits: ['Les braises servent à améliorer les cartes de Feu. Ta parcelle en produit même quand tu dors.', 'Le marchand ambulant ne passe qu’une fois par heure. Guette-le sur les routes !', 'Une monture ? Le Destrier de braise, voyons. Rien n’est plus beau.'] },
  { id: 'gorran', clan: 'feu', nom: 'Gorran', role: 'garde du clan', classe: 'combattant', app: 't_clan.c_clan.h_casque.a_aucune', ancre: pres(CENTRES.feu, 0, 150), r: 120,
    dits: ['Un intrus sur nos terres ? Défie-le en duel : approche-toi et appuie sur E.', 'Les étrangers viennent piller nos filons rares. Ouvre l’œil.', 'Ma ronde ne s’arrête jamais. Enfin… sauf pour manger.'] },
  // ---- Lagons d'Azur (Eau)
  { id: 'marin', clan: 'eau', nom: 'Capitaine Marin', role: 'vieux loup de mer', classe: 'tireur', app: 't_faille.c_blanc.h_paille.a_aucune', ancre: pres(CENTRES.eau, -120, 40), r: 30,
    dits: ['Les perles améliorent les cartes d’Eau. La mer les donne à ceux qui sont patients.', 'J’ai vu une raie si grande qu’on pouvait monter dessus. Va voir à l’écurie, tiens !', 'La marée monte, la marée descend. Comme les classements de l’arène.'] },
  { id: 'nerea', clan: 'eau', nom: 'Néréa', role: 'gardienne du portail', classe: 'mage', app: 't_clan.c_bleu.h_aucun.a_bulles', ancre: pres([portail('eau').x, portail('eau').y], -60, 50), r: 0,
    dits: ['Les Lagons d’Azur regorgent de monstres rares. Ils donnent des perles noires.', 'Prends le temps de choisir ta route : les salles d’élite rapportent plus, mais elles mordent.', 'Un deck pour l’expédition, un autre pour l’arène : tu peux en garder trois.'] },
  { id: 'loupiot', clan: 'eau', nom: 'Écume', role: 'petite pêcheuse', classe: 'escrimeur', app: 't_jade.c_rose.h_aucun.a_aucune', ancre: CENTRES.eau, r: 170,
    dits: ['J’ai pêché un poisson qui parlait ! Bon… il ne disait pas grand-chose.', 'Tu veux voir mon coquillage ? Non ? Tant pis.', 'Quand je serai grande, j’irai jusqu’au rang Maître de l’arène !'] },
  { id: 'oracle', clan: 'eau', nom: 'L’Oracle', role: 'voyante', classe: 'mage', app: 't_pourpre.c_blanc.h_capuche.a_givre', ancre: pres(CENTRES.eau, 100, 60), r: 15,
    dits: ['Je vois… une Épreuve d’ascension dans ton avenir. Au niveau 20, si mes eaux ne mentent pas.', 'Les cartes de branche ne sortent qu’à l’autel. Et seulement pour la tienne.', 'Ton destin n’est pas gravé : un Parchemin de réorientation peut tout changer.'] },
  { id: 'coralie', clan: 'eau', nom: 'Coralie', role: 'tisserande', classe: 'tireur', app: 't_corail.c_blond.h_fleurs.a_aucune', ancre: pres(CENTRES.eau, 40, -90), r: 40,
    dits: ['Une nouvelle tenue ? Va voir la garde-robe : tenues, cheveux, coiffes et auras.', 'Certaines tenues ne s’achètent pas : elles se méritent, en arène ou dans le Cauchemar.', 'Les couleurs des Abysses vont si bien aux gens de l’Eau…'] },
  { id: 'tholos', clan: 'eau', nom: 'Tholos', role: 'garde du clan', classe: 'combattant', app: 't_clan.c_clan.h_casque.a_aucune', ancre: pres(CENTRES.eau, 0, 160), r: 120,
    dits: ['Halte ! Ah, tu es des nôtres. Passe.', 'Si un étranger traîne ici, défie-le : la victoire rapporte de l’essence et des points au clan.', 'Les sanctuaires se prennent en restant dans leur cercle. Plus on est, plus ça va vite.'] },
  // ---- Sylve d'Émeraude (Plante)
  { id: 'sylvain', clan: 'plante', nom: 'Sylvain', role: 'herboriste', classe: 'mage', app: 't_seve.c_vert.h_fleurs.a_lucioles', ancre: pres(CENTRES.plante, 110, 40), r: 30,
    dits: ['La sève améliore les cartes de Plante. Ma serre en est pleine, mais je ne la donne pas !', 'Les régénérations, c’est ma spécialité. Un peu chaque tour, et le combat est gagné.', 'Les graines d’or ne poussent que chez les monstres rares de la Sylve.'] },
  { id: 'faune', clan: 'plante', nom: 'Faune', role: 'gardien du portail', classe: 'tireur', app: 't_jade.c_clan.h_capuche.a_aucune', ancre: pres([portail('plante').x, portail('plante').y], -60, -40), r: 0,
    dits: ['La Sylve d’Émeraude est vaste. Reviens vite si tes PV baissent trop.', 'Un familier t’accompagne en expédition. Le mien ronfle, mais il mord fort.', 'Un cerf aux bois fleuris… on dit qu’il se laisse monter par les gens du clan.'] },
  { id: 'mousse', clan: 'plante', nom: 'Mousse', role: 'petit cueilleur', classe: 'escrimeur', app: 't_clan.c_blond.h_paille.a_aucune', ancre: CENTRES.plante, r: 170,
    dits: ['J’ai trouvé un champignon qui brille ! Je le mange ? Non ? D’accord.', 'Tu sais grimper aux arbres, toi ? Moi oui. Enfin, presque.', 'Ma grand-mère dit que la forêt écoute. Alors je dis bonjour aux arbres.'] },
  { id: 'aelia', clan: 'plante', nom: 'Aélia', role: 'druidesse', classe: 'mage', app: 't_seve.c_blanc.h_fleurs.a_seve', ancre: pres(CENTRES.plante, -100, -30), r: 20,
    dits: ['Chaque semaine, le village bâtit un grand ouvrage. Son bonus profite à tout le clan.', 'Les quêtes du jour se renouvellent chaque matin. Celles de la semaine rapportent bien plus.', 'Le Passe de saison récompense tout ce que tu fais. Même cueillir des fleurs, presque.'] },
  { id: 'brindille', clan: 'plante', nom: 'Brindille', role: 'charpentière', classe: 'combattant', app: 't_clan.c_roux.h_bandeau.a_aucune', ancre: pres([OUVRAGES.plante.x, OUVRAGES.plante.y], -40, 50), r: 40,
    dits: ['Ta maison, tu peux la poser où tu veux sur nos terres. Choisis un coin tranquille !', 'Améliore ta parcelle : plus de production, plus de réserve, et ta maison s’embellit.', 'Le bois de la Sylve est le meilleur du monde. Je ne suis pas objective, je sais.'] },
  { id: 'ronce', clan: 'plante', nom: 'Ronce', role: 'garde du clan', classe: 'combattant', app: 't_clan.c_clan.h_casque.a_aucune', ancre: pres(CENTRES.plante, 0, 160), r: 120,
    dits: ['Les ronces protègent la Sylve. Et moi, je protège les ronces.', 'Un intrus ? Défie-le. S’il gagne, il te prend de l’essence, alors prépare ton deck.', 'Les gens du Feu sont passés ce matin. Ils sentaient le brûlé.'] },
  // ---- v87 : les Terres Brisées (Chapitre 2) — ceux qui veillent sur la Faille
  { id: 'orin', clan: 'brisees', nom: 'Orin', role: 'veilleur de la Faille', classe: 'tireur', app: 't_faille.c_blanc.h_capuche.a_aucune', ancre: pres(CENTRE_FAILLE, -70, -440), r: 0,
    dits: ['Au-delà de cette porte, la terre est brisée. Il faut le niveau 30 pour tenir debout là-dedans.', 'Les monstres d’ici mélangent les trois éléments. Aucun clan n’a d’avantage sur eux.', 'Je veille. Je ne dors plus beaucoup, depuis la Faille.'] },
  { id: 'lyra', clan: 'brisees', nom: 'Lyra', role: 'archiviste', classe: 'mage', app: 't_faille.c_noir.h_aucun.a_givre', ancre: pres(CENTRE_FAILLE, -170, -40), r: 25,
    dits: ['Les fragments de faille sont des souvenirs. Je les lis comme des livres.', 'Avant les clans, il n’y avait qu’un peuple. Puis la Faille s’est fermée… une première fois.', 'Ne marche pas sur les cristaux. Ils écoutent.'] },
  { id: 'varda', clan: 'brisees', nom: 'Varda', role: 'forgeronne du vide', classe: 'combattant', app: 't_nuit.c_roux.h_bandeau.a_braises', ancre: pres(CENTRE_FAILLE, 170, -30), r: 25,
    dits: ['Les éclats du vide servent à forger les invocations, à l’atelier. Un allié qui encaisse à ta place, ça change tout.', 'Une invocation frappe à chaque tour. Plus tu l’améliores, plus elle est solide.', 'Le Colosse fusionné ? Il faut lui taper dessus longtemps. Très longtemps.'] },
  { id: 'sel', clan: 'brisees', nom: 'Sel l’ermite', role: 'ermite', classe: 'escrimeur', app: 't_abysses.c_blanc.h_paille.a_aucune', ancre: pres(CENTRE_FAILLE, 60, 120), r: 60,
    dits: ['Écoute… tu entends ? C’est le Cœur. Il bat sous nos pieds.', 'J’ai quitté mon clan il y a longtemps. Ici, personne ne demande d’où tu viens.', 'Les gouffres violets ne pardonnent pas. Reste sur les dalles.'] },
  { id: 'nyx', clan: 'brisees', nom: 'Nyx', role: 'oracle brisée', classe: 'mage', app: 't_faille.c_rose.h_fleurs.a_lucioles', ancre: pres(CENTRE_FAILLE, -40, 60), r: 15,
    dits: ['Je vois au-delà du Cauchemar. Ce qu’il y a là-bas n’a pas de nom.', 'Le niveau 50, puis le niveau 80… le chemin est encore long, voyageur.', 'Trois éléments, un seul monde. Tu le comprendras un jour.'] },
  // ---- v96 : les Cimes Orageuses (Chapitre 3)
  { id: 'brann', clan: 'cimes', nom: 'Brann', role: 'guide du col', classe: 'combattant', app: 't_cimes.c_roux.h_capuche.a_aucune', ancre: pres(CENTRE_CIMES, -470, 40), r: 0,
    dits: ['Au-delà du col, il faut le niveau 50. Les Cimes ne pardonnent rien.', 'Là-haut, certains monstres te paralysent : tu commences ton tour avec moins d’énergie.', 'Les crevasses bleues sont sans fond. Reste sur le givre.'] },
  { id: 'aela', clan: 'cimes', nom: 'Aela', role: 'lectrice d’aurores', classe: 'mage', app: 't_cimes.c_blanc.h_aucun.a_givre', ancre: pres(CENTRE_CIMES, -160, -40), r: 25,
    dits: ['Les aurores racontent l’histoire du ciel. Ces temps-ci, elles crient.', 'Les plumes d’orage ? Les harpies et les oiseaux-tonnerre en laissent partout.', 'Le Roi des Tempêtes n’a pas toujours été un monstre.'] },
  { id: 'torvald', clan: 'cimes', nom: 'Torvald', role: 'forgeron runique', classe: 'combattant', app: 't_nuit.c_blanc.h_bandeau.a_braises', ancre: pres(CENTRE_CIMES, 170, -30), r: 25,
    dits: ['Un monstre étourdi perd son tour. Rien de plus satisfaisant.', 'Les cristaux de foudre se forgent à l’atelier, comme les éclats du vide.', 'Mon marteau a été frappé par la foudre sept fois. Il en redemande.'] },
  { id: 'skadi', clan: 'cimes', nom: 'Skadi', role: 'chasseuse d’orages', classe: 'tireur', app: 't_cimes.c_noir.h_capuche.a_aucune', ancre: pres(CENTRE_CIMES, 60, 130), r: 60,
    dits: ['J’ai vu le Roi des Tempêtes une fois. Une fois suffit.', 'Ici, tout frappe plus fort qu’ailleurs. Viens avec un deck solide.', 'Les sorts de zone, c’est bien. L’étourdissement, c’est mieux.'] },
  { id: 'odra', clan: 'cimes', nom: 'Odra', role: 'vieille du sommet', classe: 'mage', app: 't_cimes.c_blanc.h_fleurs.a_lucioles', ancre: pres(CENTRE_CIMES, -40, 70), r: 15,
    dits: ['J’ai vu trois tempêtes du siècle. Celle-ci est la pire.', 'Au niveau 64, reviens me voir. Pas avant.', 'Le Néant, la Faille, les Cimes… tout est lié, petit.'] },
  // ---- v99 : les Îles Célestes (Chapitre 5)
  { id: 'elio', clan: 'ciel', nom: 'Elio', role: 'gardien du pont', classe: 'combattant', app: 't_ciel.c_blond.h_aucun.a_lucioles', ancre: pres(CENTRE_CIEL, -130, 30), r: 15,
    dits: ['Au-delà du pont, il faut le niveau 90. Le vide ne pardonne pas.', 'Ici, les monstres volent ta vie à chaque coup. Frappe vite, frappe fort.', 'Ne regarde pas en bas. Vraiment.'] },
  { id: 'astree', clan: 'ciel', nom: 'Astrée', role: 'astronome', classe: 'mage', app: 't_ciel.c_blanc.h_aucun.a_lucioles', ancre: pres(CENTRE_CIEL, 90, -70), r: 20,
    dits: ['Chaque étoile a un nom. Certaines ont faim.', 'La poussière d’étoile ? Les méduses et les feux follets en sont pleins.', 'D’ici, on voit tout le monde : les trois clans, la Faille, les Cimes, le désert…'] },
  { id: 'corvin', clan: 'ciel', nom: 'Corvin', role: 'forgeron d’étoiles', classe: 'combattant', app: 't_nuit.c_noir.h_bandeau.a_braises', ancre: pres(CENTRE_CIEL, 110, 60), r: 20,
    dits: ['Une lame qui boit la vie… c’est mon chef-d’œuvre.', 'Les cœurs d’étoile se forgent à l’atelier, comme les larmes d’ambre.', 'Avec le vol de vie, tu rentres à la maison avec plus de PV qu’en partant. Enfin, parfois.'] },
  { id: 'selene', clan: 'ciel', nom: 'Séléné', role: 'chevalière de la lune', classe: 'escrimeur', app: 't_ciel.c_noir.h_capuche.a_aucune', ancre: pres(CENTRE_CIEL, -60, -110), r: 25,
    dits: ['J’ai croisé l’Archange une fois. Il m’a laissé la vie. Je ne sais toujours pas pourquoi.', 'Ici, tout frappe plus fort que dans le désert. Ton meilleur deck, rien d’autre.', 'La Dévoreuse se soigne beaucoup : garde de gros coups pour la fin.'] },
  { id: 'ysolde', clan: 'ciel', nom: 'Ysolde', role: 'oracle', classe: 'mage', app: 't_ciel.c_blanc.h_fleurs.a_lucioles', ancre: pres(CENTRE_CIEL, 0, 90), r: 10,
    dits: ['Je t’ai vu venir, il y a longtemps. Tu étais plus petit.', 'Au niveau 97, reviens me voir. Pas avant.', 'Après l’Étoile mère… le monde respirera. Pour un temps.'] },
  // ---- v98 : le Désert d'Ambre (Chapitre 4)
  { id: 'kesh', clan: 'ambre', nom: 'Kesh', role: 'caravanière', classe: 'escrimeur', app: 't_ambre.c_noir.h_bandeau.a_aucune', ancre: pres(CENTRE_AMBRE, 220, 20), r: 0,
    dits: ['Au-delà de la passe, il faut le niveau 70. Le désert ne fait pas de cadeau.', 'Ici, les monstres te marquent. À trois marques, ça explose, et ton bouclier n’y peut rien.', 'Les sables mouvants avalent tout. Reste sur les dalles.'] },
  { id: 'neferet', clan: 'ambre', nom: 'Neferet', role: 'archéologue', classe: 'mage', app: 't_ambre.c_noir.h_paille.a_aucune', ancre: pres(CENTRE_AMBRE, -140, 40), r: 25,
    dits: ['Chaque pierre de cette cité a une histoire. La plupart finissent mal.', 'Le sable doré ? Les scorpions et les momies en sont couverts.', 'Le Pharaon voulait voler le soleil. Il a presque réussi.'] },
  { id: 'hakim', clan: 'ambre', nom: 'Hakim', role: 'forgeron d’ambre', classe: 'combattant', app: 't_nuit.c_noir.h_bandeau.a_braises', ancre: pres(CENTRE_AMBRE, 160, -40), r: 25,
    dits: ['Une marque, deux marques, trois… boum. J’adore mon métier.', 'Les larmes d’ambre se forgent à l’atelier, comme les cristaux de foudre.', 'Mélange les cartes qui marquent tous les ennemis et celles qui marquent fort : ça fait des feux d’artifice.'] },
  { id: 'saia', clan: 'ambre', nom: 'Saïa', role: 'pisteuse des dunes', classe: 'tireur', app: 't_ambre.c_roux.h_capuche.a_aucune', ancre: pres(CENTRE_AMBRE, 70, 140), r: 60,
    dits: ['J’ai suivi la Reine-scorpion trois jours. Elle, elle m’a suivie quatre.', 'Ici, tout frappe encore plus fort que dans les Cimes. Prends ton meilleur deck.', 'Si tu as deux marques sur toi, achève vite le monstre.'] },
  { id: 'imhet', clan: 'ambre', nom: 'Imhet', role: 'prêtre aveugle', classe: 'mage', app: 't_ambre.c_blanc.h_aucun.a_lucioles', ancre: pres(CENTRE_AMBRE, -40, 80), r: 15,
    dits: ['Je ne vois plus le soleil depuis longtemps. Mais je le sens devenir noir.', 'Au niveau 82, reviens me voir. Pas avant.', 'Le Néant, la tempête, l’étoile… le monde se défend, et c’est toi son bras.'] },
];
export const PNJ_PAR_ID = Object.fromEntries(PNJ.map((p) => [p.id, p]));

// ---------- leur promenade : 5 étapes autour de l'ancre, reliées par des chemins dégagés ----------
const VITESSE = 26, PAUSE = 4;   // px/s ; secondes d'arrêt à chaque étape
const CHEMINS = new Map();
function libre(obs, a, b) {
  const d = Math.hypot(b[0] - a[0], b[1] - a[1]), n = Math.ceil(d / 8);
  for (let i = 0; i <= n; i++) { const k = i / n; if (!praticable(a[0] + (b[0] - a[0]) * k, a[1] + (b[1] - a[1]) * k, obs)) return false; }
  return true;
}
export function cheminDe(pnj) {
  if (CHEMINS.has(pnj.id)) return CHEMINS.get(pnj.id);
  const obs = obstacles(), seed = [...pnj.id].reduce((h, c) => h * 31 + c.charCodeAt(0), 7);
  let depart = pnj.ancre;
  if (!praticable(depart[0], depart[1], obs)) {   // une ancre mal placée : on cherche un point libre tout près
    for (let k = 1; k < 200; k++) { const a = alea(seed + k) * 6.283, r = 8 + k; const c = [pnj.ancre[0] + Math.cos(a) * r, pnj.ancre[1] + Math.sin(a) * r * 0.7]; if (praticable(c[0], c[1], obs)) { depart = c; break; } }
  }
  const pts = [depart];
  if (pnj.r > 0) for (let k = 0; pts.length < 5 && k < 400; k++) {
    const a = alea(seed * 3 + k) * 6.283, r = pnj.r * (0.35 + alea(seed * 7 + k) * 0.65);
    const c = [Math.round(pnj.ancre[0] + Math.cos(a) * r), Math.round(pnj.ancre[1] + Math.sin(a) * r * 0.7)];
    if (praticable(c[0], c[1], obs) && libre(obs, pts[pts.length - 1], c) && (pts.length < 4 || libre(obs, c, pts[0]))) pts.push(c);
  }
  // les durées de chaque morceau : marcher puis s'arrêter
  const etapes = pts.map((a, i) => { const b = pts[(i + 1) % pts.length]; return { a, b, marche: Math.hypot(b[0] - a[0], b[1] - a[1]) / VITESSE }; });
  const ch = { etapes, cycle: etapes.reduce((s, e) => s + e.marche + PAUSE, 0) || 1 };
  CHEMINS.set(pnj.id, ch); return ch;
}
// où est ce PNJ au temps t (en secondes) ; dir : la direction où il regarde ; marche : s'il avance
export function posPnj(pnj, t) {
  const ch = cheminDe(pnj);
  if (ch.etapes.length < 2) { const [x, y] = ch.etapes[0].a; return { x, y, dir: 'bas', marche: false }; }
  let u = ((t + alea([...pnj.id].length) * 50) % ch.cycle + ch.cycle) % ch.cycle;
  for (const e of ch.etapes) {
    if (u < PAUSE) return { x: e.a[0], y: e.a[1], dir: 'bas', marche: false };
    u -= PAUSE;
    if (u < e.marche) {
      const k = u / e.marche, dx = e.b[0] - e.a[0], dy = e.b[1] - e.a[1];
      return { x: e.a[0] + dx * k, y: e.a[1] + dy * k, dir: Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 'droite' : 'gauche') : dy > 0 ? 'bas' : 'haut', marche: true };
    }
    u -= e.marche;
  }
  const [x, y] = ch.etapes[0].a; return { x, y, dir: 'bas', marche: false };
}
// ce qu'il dit à un joueur d'un autre clan
export const DIT_ETRANGER = { feu: 'Tu n’es pas d’ici, toi. Ne touche pas à nos filons.', eau: 'Un étranger… Les Lagons t’observent, voyageur.', plante: 'La Sylve tolère les visiteurs. Pas les pilleurs.' , brisees: 'Ici, il n’y a plus de clans. Seulement ceux qui survivent.' , cimes: 'Ici, ce n’est pas ton clan qui te protège. C’est ton deck.', ambre: 'Le désert se moque des clans. Il ne retient que les survivants.', ciel: 'Là-haut, les clans n’ont plus de sens. Il n’y a que le ciel et toi.' };
