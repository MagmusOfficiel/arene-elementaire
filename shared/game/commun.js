// Constantes et petites fonctions partagées par tous les morceaux de la logique du jeu
import { ArenaState, Player, Zone, Orb, Zombie } from './schema.js';
import { valideCouleur, valideCadre, emoteDe } from '../cosmetiques.js';
import { deltaCote, niveauBots, coteValide } from '../classe.js';
import {
  ARENA, CONFIG, BIOMES, TAGS, INTERACTIONS, ELEMENTS,
  generateKit, rollElements,
  BUILDINGS, CITY, ZOMBIES, ZOMBIE_CONFIG, ROYALE, resolveCollisions, insideBuilding, STATUS_BITS,
  TOURNOI, tournoiPit, NOMS_TOURS, DUO, comboEquipe, FILE, SURVIE, ELITES, RELIQUES, COLISEE, carteDu, areneProche, ESQUIVE, EVENTS, TERRAINS, TERRAIN_TYPES, terrainAt, terrainSpeed, PROGRESSION, UPGRADES, newMods, applyUpgrade,
} from '../data.js';
export const STATUS_FIELD = { brulure: 'burn', mouille: 'wet', lourd: 'slow', gel: 'frost', marque: 'mark', aveugle: 'blind', racine: 'vine', stun: 'stun' };
export const TIMERS = ['burn', 'wet', 'slow', 'root', 'frost', 'mark', 'invis', 'armor', 'haste', 'blind', 'vine', 'stun'];
export const speedMult = (t) => (t.slow > 0 ? 1 - TAGS.lourd.slow : 1) * (t.frost > 0 ? 1 - TAGS.gel.slow : 1) * (t.vine > 0 ? 1 - TAGS.racine.slow : 1);
export const BOT_NAMES = ['Mannequin Alpha', 'Mannequin Bêta', 'Mannequin Gamma', 'Mannequin Delta', 'Mannequin Epsilon',
  'Kaito', 'Rena', 'Shinra', 'Aiko', 'Ryuji', 'Mira', 'Taro', 'Yuna', 'Kenji', 'Sora', 'Hana', 'Daichi', 'Emi', 'Haru',
  'Kira', 'Nao', 'Riku', 'Saya', 'Toma', 'Yori', 'Akane', 'Botan', 'Chiyo', 'Genji', 'Isamu', 'Jun', 'Kaede', 'Mako'];
export const botName = (i) => (i < BOT_NAMES.length ? BOT_NAMES[i] : `${BOT_NAMES[5 + (i % (BOT_NAMES.length - 5))]} ${Math.floor(i / BOT_NAMES.length) + 1}`);
export const UPG_KEYS = Object.keys(UPGRADES);
export const pick3 = () => { const k = [...UPG_KEYS]; for (let i = k.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [k[i], k[j]] = [k[j], k[i]]; } return k.slice(0, 3); };
export const BOT_DMG = 0.6; // les bots tapent moins fort

export const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
export const dist = (ax, ay, bx, by) => Math.hypot(bx - ax, by - ay);

// Portée utile d'un sort (pour décider quand les bots le lancent)
// Durée de l'annonce (zone d'impact visible) avant les ultimes qui frappent tout de suite
export const ANNONCE_ULT = { nova: 0.45, rayon_ult: 0.45, dragon: 0.4, tornade: 0.4, domaine: 0.35, prison: 0.4 };

export function porteeSort(sp) {
  switch (sp.forme) {
    case 'melee': case 'frappe': case 'tourbillon': case 'nova': case 'domaine': return (sp.radius || 90) + 40;
    case 'charge': case 'dash': case 'blink': case 'saut': return (sp.distance || sp.range || 300) + 30;
    case 'tornade': case 'dragon': return 480;
    case 'invocation': return 380;
    case 'sanctuaire': return 260;
    case 'mur': case 'prison': case 'tourelle': case 'armee': case 'soin_zone': return sp.range || 500;
    default: return sp.range || 450;
  }
}
