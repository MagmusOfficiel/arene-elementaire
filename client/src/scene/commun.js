// Constantes et petites aides partagées par les morceaux de la scène de jeu
import Phaser from 'phaser';
import { couleurDe, emoteDe } from '../../../shared/cosmetiques.js';
import { reglages, surReglage, fxMul } from '../reglages.js';
import { RigSprite } from '../rig.js';
import { Ambiance } from '../ambiance.js';
import { Hero, HEROS } from '../hero.js';
import { sfx, toggleMute, setMusic, setAmbiance, foule } from '../sfx.js';
import { TOUCH, touch } from '../touch.js';
import { styleOf, SHAPES } from '../styles.js';
import { progress } from '../progress.js';
import { EVENTS, TERRAINS, terrainAt, terrainSpeed, ARENA, BIOMES, CONFIG, ELEMENTS, FUSIONS, BUILDINGS, CITY, ZOMBIES, TAGS, generateKit, insideBuilding, resolveCollisions, TOURNOI, tournoiPit, COLISEE, SURVIE, DUO, carteDu, areneProche, hasStatus as S } from '../../../shared/data.js';
export const elColor = (el) => ELEMENTS[el]?.color ?? (el === 'zombie' ? 0x8fd14f : 0xffffff);
export const lerp = (a, b, t) => a + (b - a) * t;
export const R = CONFIG.playerRadius;
export const CHAR_H = 120;                                   // hauteur d'affichage des persos
export const ZOMBIE_H = { rodeur: 84, coureur: 64, colosse: 150, titan: 270, cracheur: 80, kamikaze: 62, chaman: 90, porteur: 122, esprit: 60, liche: 220, behemoth: 250 };
// Apparence des monstres de la Survie : image de base, teinte, lueur
export const ZLOOK = {
  titan:    { tex: 'zb_colosse', tint: 0xff9a8a, glow: 0xff3020 },
  cracheur: { tex: 'zb_rodeur',  tint: 0xb8ff6a, glow: 0x7aff3a },
  kamikaze: { tex: 'zb_coureur', tint: 0xff7a4a, glow: 0xff4010, pulse: true },
  chaman:   { tex: 'zb_rodeur',  tint: 0xc89aff, glow: 0xb06aff },
  porteur:  { tex: 'zb_colosse', tint: 0x9ab8e0 },
  liche:    { tex: 'zb_rodeur',  tint: 0x9a6aff, glow: 0x7a2aff },
  behemoth: { tex: 'zb_colosse', tint: 0xd08a5a, glow: 0xff7a20 },
};
export const ELITE_NOMS = { 1: 'Rapide', 2: 'Explosif', 3: 'Vampire', 4: 'Invocateur', 5: 'Blindé' };
export const FONT = '"Segoe UI", system-ui, -apple-system, sans-serif';
export const D_GROUND = -50, D_FX = 5000, D_UI = 6000;       // couches de profondeur (le reste = tri par Y)

// ---------------------------------------------------------------------
//  Particules par élément
// ---------------------------------------------------------------------
export const FX = {
  feu:    { tex: 'fx_glow',   tint: [0xffd040, 0xff7a1a, 0xff3a00], scale: { start: 0.32, end: 0 }, speed: { min: 10, max: 40 }, lifespan: 380, gravityY: -80, blendMode: 'ADD', frequency: 16 },
  eau:    { tex: 'fx_drop',   tint: [0x7cc8ff, 0x3a9cff, 0xd0f0ff], scale: { start: 0.6, end: 0.15 }, speed: { min: 20, max: 50 }, lifespan: 420, gravityY: 160, alpha: { start: 0.9, end: 0 }, frequency: 26 },
  terre:  { tex: 'fx_debris', tint: [0xa8845a, 0x6b5338, 0x8a7a66], scale: { start: 0.7, end: 0.3 }, rotate: { min: 0, max: 360 }, speed: { min: 20, max: 60 }, lifespan: 480, gravityY: 260, frequency: 40 },
  vent:   { tex: 'fx_streak', tint: [0xd8fff2, 0x9fe8d0], scale: { start: 0.5, end: 0.1 }, alpha: { start: 0.7, end: 0 }, speed: { min: 5, max: 20 }, lifespan: 260, blendMode: 'ADD', frequency: 22 },
  eclair: { tex: 'fx_spark',  tint: [0xffffff, 0xfff07a, 0xffe14a], scale: { start: 0.7, end: 0 }, speed: { min: 40, max: 140 }, lifespan: 170, blendMode: 'ADD', frequency: 16 },
  glace:  { tex: 'fx_shard',  tint: [0xe8faff, 0x9be7ff], scale: { start: 0.55, end: 0.1 }, rotate: { min: 0, max: 360 }, speed: { min: 15, max: 45 }, lifespan: 440, blendMode: 'ADD', frequency: 32 },
  ombre:  { tex: 'fx_smoke',  tint: [0x2a1650, 0x5a2aa0, 0x8a5cff], scale: { start: 0.35, end: 0.8 }, alpha: { start: 0.75, end: 0 }, speed: { min: 5, max: 20 }, lifespan: 540, frequency: 26 },
  metal:  { tex: 'fx_spark',  tint: [0xffffff, 0xc8d2dc, 0xffd890], scale: { start: 0.45, end: 0 }, speed: { min: 60, max: 170 }, lifespan: 220, blendMode: 'ADD', frequency: 28 },
  lumiere: { tex: 'fx_glow',  tint: [0xffffff, 0xfff6c8, 0xffe08a], scale: { start: 0.28, end: 0 }, speed: { min: 10, max: 50 }, lifespan: 420, gravityY: -40, blendMode: 'ADD', frequency: 22 },
  nature:  { tex: 'fx_leaf',  tint: [0x5fcf4a, 0x9be86a, 0x3f8f3a], scale: { start: 0.45, end: 0.15 }, rotate: { min: 0, max: 360 }, speed: { min: 15, max: 45 }, lifespan: 520, gravityY: 90, frequency: 30 },
  zombie: { tex: 'fx_smoke',  tint: [0x4a6a2a, 0x8fd14f], scale: { start: 0.3, end: 0.6 }, alpha: { start: 0.6, end: 0 }, speed: { min: 20, max: 60 }, lifespan: 500, frequency: 50 },
};

// Décors par zone : [nom, poids]
export const PROPS = {
  plaine:   [['arbre', 5], ['arbre2', 4], ['buisson', 4], ['rocher', 2]],
  volcan:   [['roche_lave', 5], ['arbre_brule', 3]],
  lac:      [['arbre_bleu', 4], ['roseaux', 5], ['buisson', 2]],
  montagne: [['rocher_brun', 5], ['sapin', 4], ['rocher', 2]],
  plateau:  [['arbre2', 3], ['buisson', 4], ['rocher', 2]],
  pics:     [['sapin_neige', 6], ['cristal_glace', 3]],
  fonderie: [['tuyau', 4], ['caisse', 4]],
  marais:   [['arbre_mort', 5], ['tombe', 4], ['cristal_ombre', 2]],
  orage:    [['cristal_orage', 3], ['arbre_brule', 3], ['rocher_brun', 3]],
  sanctuaire: [['cristal_lumiere', 5], ['lampadaire', 2], ['buisson', 2]],
  foret:    [['arbre', 6], ['arbre2', 6], ['buisson', 5], ['sapin', 2]],
};
export const PROP_NAMES = [...new Set(Object.values(PROPS).flat().map(([n]) => n)), 'lampadaire', 'caisse'];
