// v106 — filtre à grossièretés (chat + pseudos), français et anglais.
// Exigence CrazyGames : tout texte écrit par un joueur et vu par d'autres doit être filtré.
// On normalise (minuscules, accents, l33t, lettres répétées, séparateurs) puis on cherche
// les mots interdits ; un mot trouvé est remplacé par des étoiles.

const MOTS = [
  // français
  'connard', 'connasse', 'conasse', 'salope', 'salaud', 'pute', 'putain', 'pd', 'pede', 'enculer', 'encule', 'enfoire',
  'batard', 'bouffon', 'abruti', 'debile', 'merde', 'chier', 'nique', 'niquer', 'ntm', 'fdp', 'tg', 'ta gueule', 'tagueule',
  'bite', 'couille', 'couilles', 'chatte', 'branleur', 'branler', 'suceur', 'suce', 'pouffiasse', 'trouduc', 'cul',
  'negro', 'negre', 'bougnoule', 'youpin', 'tapette', 'gouine', 'mongol', 'triso', 'nazi', 'hitler', 'viol', 'violer',
  'grosse merde', 'fils de pute', 'nique ta mere', 'ntm', 'va te faire', 'suicide toi', 'creve',
  // anglais
  'fuck', 'fucker', 'fucking', 'motherfucker', 'shit', 'bitch', 'bastard', 'asshole', 'dick', 'cock', 'pussy', 'cunt',
  'whore', 'slut', 'fag', 'faggot', 'nigger', 'nigga', 'retard', 'wanker', 'twat', 'porn', 'porno', 'sex', 'sexy', 'nude',
  'nudes', 'rape', 'kys', 'kill yourself', 'stfu', 'wtf', 'dumbass', 'jackass', 'penis', 'vagina', 'boobs', 'tits', 'bullshit', 'shitty', 'cum',
];
// mots courts qui feraient de faux positifs à l'intérieur d'un mot (« cul » dans « calculer ») : seulement en mot entier
const ENTIERS = new Set(['pd', 'tg', 'cul', 'suce', 'bite', 'sex', 'dick', 'cock', 'tits', 'viol', 'creve', 'chier', 'nique', 'pute', 'fag', 'kys', 'wtf', 'stfu', 'ntm', 'fdp', 'nazi', 'porn', 'nude', 'triso', 'negre', 'mongol', 'chatte', 'merde', 'shit', 'twat', 'abruti', 'debile', 'bouffon', 'retard', 'sexy', 'pede', 'cunt', 'rape', 'cock', 'tits', 'boobs', 'cum']);

const LEET = { 0: 'o', 1: 'i', 3: 'e', 4: 'a', 5: 's', 7: 't', 8: 'b', '@': 'a', $: 's', '!': 'i', '€': 'e' };
// une lettre normalisée par caractère d'origine, pour pouvoir remettre des étoiles au bon endroit
function normaliser(t) {
  const out = [], cs = [...t]; // [lettre, indice d'origine] (indices en caractères, emojis compris)
  for (let i = 0; i < cs.length; i++) {
    let c = cs[i].toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
    c = LEET[c] ?? c;
    if (/[a-z]/.test(c)) { if (!(out.length && out.at(-1)[0] === c && out.at(-2)?.[0] === c)) out.push([c, i]); }   // « fuuuuck » → « fuuck »
    else if (/\s/.test(c)) { if (out.length && out.at(-1)[0] !== ' ') out.push([' ', i]); }
    // ponctuation et séparateurs (f.u.c.k, f-u-c-k) ignorés
  }
  return out;
}
const sansDoublons = (s) => s.replace(/(.)\1+/g, '$1');
const CIBLES = [...new Set(MOTS)].map((m) => ({ m, s: sansDoublons(m), entier: ENTIERS.has(m) })).sort((a, b) => b.s.length - a.s.length);

// renvoie [début, fin] (indices d'origine) de chaque passage interdit
function trouver(t) {
  const n = normaliser(t); if (!n.length) return [];
  // version sans doublons avec la correspondance des indices
  const lettres = []; for (const x of n) if (!(lettres.length && lettres.at(-1)[0] === x[0])) lettres.push(x); else lettres.at(-1)[2] = x[1];
  const s = lettres.map((x) => x[0]).join('');
  const zones = [];
  for (const { s: mot, entier } of CIBLES) {
    let k = s.indexOf(mot);
    while (k >= 0) {
      const avant = k === 0 || s[k - 1] === ' ', apres = k + mot.length === s.length || s[k + mot.length] === ' ';
      if (!entier || (avant && apres)) { const fin = lettres[k + mot.length - 1]; zones.push([lettres[k][1], fin[2] ?? fin[1]]); }
      k = s.indexOf(mot, k + 1);
    }
  }
  // version collée (« f u c k », « n i q u e ») : seulement pour les mots longs, sans espaces
  const colle = s.replace(/ /g, '');
  if (colle !== s) for (const { s: mot, entier } of CIBLES) if (!entier && mot.length >= 4 && !mot.includes(' ') && colle.includes(mot) && !s.includes(mot)) zones.push([0, [...t].length - 1]);
  return zones;
}

export function grossier(t) { return trouver(String(t || '')).length > 0; }

export function filtrer(t) {
  t = String(t || ''); const z = trouver(t); if (!z.length) return t;
  const c = [...t];
  for (const [a, b] of z) for (let i = a; i <= b; i++) if (!/\s/.test(c[i])) c[i] = '*';
  return c.join('');
}

// un pseudo grossier n'est pas censuré mais refusé (des étoiles dans un nom, c'est moche)
export const pseudoOk = (nom) => !grossier(nom);
