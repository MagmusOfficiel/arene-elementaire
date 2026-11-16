// =====================================================================
//  STYLE VISUEL DES SORTS — un par champion, d'après sa fiche (arme, classe)
//
//  proj   : forme du projectile (texture art/fx/<proj>.png)
//  ps     : taille du projectile        spin : rotation (rad/s, 0 = suit la trajectoire)
//  core   : couleur du cœur : 'w' blanc, 'a' élément 1, 'b' élément 2, 'dark' sombre
//  trail  : forme des particules de traînée (teintées avec l'élément 2)
//  hit    : formes projetées à l'impact
//  slash  : forme du coup au corps à corps : slash | crescent | claw | impact | sword
//  heavy  : coup lourd (fissure au sol + secousse)   twin : double entaille croisée
// =====================================================================
export const STYLES = {
  'feu+vent':      { proj: 'flame',    ps: 1.2, core: 'w',    trail: 'feather',  hit: ['feather', 'flame'] },                 // Phénix : flammes et plumes
  'eau+feu':       { proj: 'bubble',   ps: 1.1, core: 'w',    trail: 'smoke',    hit: ['bubble', 'smoke'], spin: 2 },         // Vapeur : bulles brûlantes
  'feu+terre':     { proj: 'rock',     ps: 1.0, core: 'a',    trail: 'flame',    hit: ['rock', 'flame'], slash: 'impact', heavy: true, spin: 6 },  // Magma : poings de lave
  'eau+terre':     { proj: 'leaf',     ps: 1.2, core: 'b',    trail: 'leaf',     hit: ['leaf', 'drop'], slash: 'crescent', heavy: true },   // Racines
  'eau+vent':      { proj: 'wave',     ps: 1.1, core: 'w',    trail: 'streak',   hit: ['drop', 'bubble'] },                    // Rubans d'eau
  'terre+vent':    { proj: 'kunai',    ps: 1.0, core: 'w',    trail: 'debris',   hit: ['debris', 'streak'], slash: 'claw', twin: true },     // Lames de sable
  'feu+feu':       { proj: 'flame',    ps: 1.5, core: 'w',    trail: 'flame',    hit: ['flame', 'glow'], slash: 'impact', heavy: true },     // Couronne de flammes
  'eau+eau':       { proj: 'wave',     ps: 1.3, core: 'w',    trail: 'bubble',   hit: ['bubble', 'drop'], spin: 0 },           // Trident de corail
  'terre+terre':   { proj: 'rock',     ps: 1.4, core: 'a',    trail: 'debris',   hit: ['rock', 'debris'], slash: 'impact', heavy: true, spin: 4 },   // Marteau de pierre
  'vent+vent':     { proj: 'crescent', ps: 1.0, core: 'w',    trail: 'streak',   hit: ['streak', 'leaf'], slash: 'crescent', twin: true, spin: 0 },  // Katana du vent
  'eclair+feu':    { proj: 'flame',    ps: 1.1, core: 'w',    trail: 'bolt',     hit: ['bolt', 'flame'], slash: 'impact', heavy: true },     // Gantelets à plasma
  'eau+eclair':    { proj: 'bolt',     ps: 1.0, core: 'w',    trail: 'drop',     hit: ['bolt', 'drop'] },                      // Appel de l'orage
  'eclair+terre':  { proj: 'rock',     ps: 1.0, core: 'b',    trail: 'spark',    hit: ['gear', 'spark'], slash: 'impact', heavy: true, spin: 5 },    // Poings aimantés
  'eclair+vent':   { proj: 'bolt',     ps: 1.1, core: 'w',    trail: 'streak',   hit: ['bolt', 'streak'], slash: 'claw', twin: true },       // Vitesse de l'éclair
  'eclair+glace':  { proj: 'prism',    ps: 1.0, core: 'w',    trail: 'flake',    hit: ['prism', 'spark'], spin: 7 },           // Prismes
  'eclair+ombre':  { proj: 'bolt',     ps: 1.0, core: 'dark', trail: 'smoke',    hit: ['claw', 'bolt'], slash: 'claw' },       // Griffes noires
  'eclair+metal':  { proj: 'sword',    ps: 0.9, core: 'w',    trail: 'spark',    hit: ['spark', 'gear'] },                     // Canon à rails
  'feu+glace':     { proj: 'flame',    ps: 1.1, core: 'w',    trail: 'flake',    hit: ['flake', 'flame'], slash: 'impact', heavy: true },    // Poings feu et glace
  'eau+glace':     { proj: 'flake',    ps: 1.2, core: 'w',    trail: 'drop',     hit: ['flake', 'bubble'], spin: 4 },          // Couronne de givre
  'glace+terre':   { proj: 'prism',    ps: 1.2, core: 'a',    trail: 'rock',     hit: ['prism', 'rock'], slash: 'crescent', heavy: true },   // Hache de glace
  'glace+vent':    { proj: 'leaf',     ps: 1.0, core: 'w',    trail: 'flake',    hit: ['flake', 'leaf'], spin: 8 },            // Éventails de neige
  'glace+ombre':   { proj: 'skull',    ps: 0.9, core: 'w',    trail: 'smoke',    hit: ['flake', 'skull'], slash: 'crescent' },  // Faux spectrale
  'glace+metal':   { proj: 'sword',    ps: 1.0, core: 'a',    trail: 'flake',    hit: ['prism', 'spark'], slash: 'slash', twin: true },      // Katana trempé
  'feu+ombre':     { proj: 'flame',    ps: 1.2, core: 'dark', trail: 'smoke',    hit: ['flame', 'skull'], slash: 'sword' },    // Épée de flamme noire
  'eau+ombre':     { proj: 'spiral',   ps: 1.2, core: 'b',    trail: 'drop',     hit: ['spiral', 'bubble'], spin: 5 },         // Tentacules des abysses
  'ombre+terre':   { proj: 'skull',    ps: 1.0, core: 'b',    trail: 'debris',   hit: ['skull', 'rock'], slash: 'crescent', heavy: true },   // Pelle de fossoyeur
  'ombre+vent':    { proj: 'kunai',    ps: 1.1, core: 'b',    trail: 'smoke',    hit: ['kunai', 'smoke'], slash: 'claw', twin: true },       // Dagues spectrales
  'metal+ombre':   { proj: 'crescent', ps: 1.0, core: 'w',    trail: 'smoke',    hit: ['crescent', 'skull'], slash: 'crescent', spin: 9 },   // Faux d'acier
  'feu+metal':     { proj: 'sword',    ps: 1.1, core: 'b',    trail: 'flame',    hit: ['spark', 'flame'], slash: 'sword' },    // Lame chauffée à blanc
  'eau+metal':     { proj: 'wave',     ps: 1.0, core: 'b',    trail: 'drop',     hit: ['drop', 'spark'] },                     // Fouets de mercure
  'metal+terre':   { proj: 'gear',     ps: 1.1, core: 'a',    trail: 'debris',   hit: ['gear', 'rock'], slash: 'impact', heavy: true, spin: 6 },     // Bouclier-tour
  'metal+vent':    { proj: 'shuriken', ps: 1.1, core: 'w',    trail: 'streak',   hit: ['shuriken', 'spark'], slash: 'crescent', spin: 18 },  // Lames orbitales
  'eclair+eclair': { proj: 'bolt',     ps: 1.3, core: 'w',    trail: 'bolt',     hit: ['bolt', 'spark'] },                     // Foudre divine
  'glace+glace':   { proj: 'prism',    ps: 1.3, core: 'w',    trail: 'flake',    hit: ['flake', 'prism'], spin: 3 },           // Sceptre de cristal
  'ombre+ombre':   { proj: 'skull',    ps: 1.2, core: 'dark', trail: 'spiral',   hit: ['skull', 'smoke'] },                    // Ombres vivantes
  'metal+metal':   { proj: 'sword',    ps: 1.4, core: 'w',    trail: 'spark',    hit: ['sword', 'spark'], slash: 'sword', heavy: true },     // Espadon
  // ---- Lumière & Nature ----
  'eau+lumiere':     { proj: 'bubble',   ps: 1.1, core: 'w', trail: 'prism',   hit: ['prism', 'drop'] },
  'feu+lumiere':     { proj: 'flame',    ps: 1.2, core: 'w', trail: 'spark',   hit: ['flame', 'glow'], slash: 'sword' },
  'lumiere+terre':   { proj: 'rock',     ps: 1.1, core: 'b', trail: 'spark',   hit: ['rock', 'glow'], slash: 'impact', heavy: true },
  'lumiere+vent':    { proj: 'feather',  ps: 1.2, core: 'w', trail: 'feather', hit: ['feather', 'spark'] },
  'eclair+lumiere':  { proj: 'arrow',    ps: 1.1, core: 'w', trail: 'bolt',    hit: ['bolt', 'spark'] },
  'glace+lumiere':   { proj: 'flake',    ps: 1.2, core: 'w', trail: 'prism',   hit: ['flake', 'prism'], spin: 3 },
  'lumiere+ombre':   { proj: 'kunai',    ps: 1.0, core: 'w', trail: 'smoke',   hit: ['spiral', 'spark'], slash: 'claw', twin: true },
  'lumiere+metal':   { proj: 'sword',    ps: 1.1, core: 'w', trail: 'spark',   hit: ['sword', 'glow'], slash: 'sword' },
  'lumiere+nature':  { proj: 'leaf',     ps: 1.2, core: 'w', trail: 'leaf',    hit: ['leaf', 'spark'], spin: 4 },
  'lumiere+lumiere': { proj: 'prism',    ps: 1.3, core: 'w', trail: 'spark',   hit: ['glow', 'prism'], spin: 2 },
  'eau+nature':      { proj: 'leaf',     ps: 1.1, core: 'b', trail: 'drop',    hit: ['leaf', 'bubble'] },
  'feu+nature':      { proj: 'flame',    ps: 1.2, core: 'w', trail: 'leaf',    hit: ['leaf', 'flame'], slash: 'impact', heavy: true },
  'nature+terre':    { proj: 'rock',     ps: 1.2, core: 'b', trail: 'leaf',    hit: ['leaf', 'rock'], slash: 'impact', heavy: true, spin: 4 },
  'nature+vent':     { proj: 'leaf',     ps: 1.1, core: 'w', trail: 'leaf',    hit: ['leaf', 'streak'], slash: 'claw', twin: true, spin: 10 },
  'eclair+nature':   { proj: 'bolt',     ps: 1.0, core: 'w', trail: 'leaf',    hit: ['bolt', 'leaf'], slash: 'crescent' },
  'glace+nature':    { proj: 'arrow',    ps: 1.0, core: 'w', trail: 'flake',   hit: ['flake', 'leaf'] },
  'nature+ombre':    { proj: 'skull',    ps: 1.0, core: 'b', trail: 'smoke',   hit: ['spiral', 'leaf'] },
  'metal+nature':    { proj: 'gear',     ps: 1.0, core: 'b', trail: 'leaf',    hit: ['gear', 'leaf'], slash: 'impact', heavy: true, spin: 8 },
  'nature+nature':   { proj: 'leaf',     ps: 1.4, core: 'b', trail: 'leaf',    hit: ['leaf', 'leaf'], spin: 3 },
};

export const DEFAULT_STYLE = { proj: 'core', ps: 1, core: 'w', trail: 'spark', hit: ['spark'], slash: 'slash' };
export const styleOf = (fusion) => ({ ...DEFAULT_STYLE, ...(STYLES[fusion] || {}) });
// Textures supplémentaires à charger
export const SHAPES = ['kunai', 'shuriken', 'arrow', 'feather', 'bubble', 'skull', 'bolt', 'crescent', 'flake', 'rock', 'flame', 'leaf', 'gear', 'wave', 'claw', 'sword', 'impact', 'spiral', 'prism'];
