// =====================================================================
//  LES CLANS ÉLÉMENTAIRES — l'allure des titres (v85)
//  Pur. Chaque titre a une identité : son rang (bronze, argent, or, légende)
//  et son thème (sang pour le Berserker, arcanes pour l'Archimage…).
//  Utilisé par la carte (ruban sous le nom) et par les fenêtres (HTML).
// =====================================================================
import { HAUTS_FAITS } from './hautsfaits.js';

// rang : couleurs du ruban ; deco : ce qu'on dessine autour
const RANGS = {
  bronze: { fond: ['#3a2414', '#22140a'], bord: '#c08050', txt: '#f0c8a0' },
  argent: { fond: ['#3a4048', '#1e2228'], bord: '#c8d4e0', txt: '#eef4ff' },
  or: { fond: ['#5a4010', '#2a1c04'], bord: '#ffd870', txt: '#fff0b8', lueur: '#ffb830' },
  legende: { fond: ['#2a0e3a', '#12061a'], bord: '#e0a0ff', txt: '#f8e8ff', lueur: '#c060ff' },
};
const BR = {
  berserker: { rang: 'legende', fond: ['#5a0808', '#200202'], bord: '#ff3a2a', txt: '#ffd8d0', lueur: '#ff2a1a', ico: ['🪓', '🩸'], deco: 'sang' },
  gardien: { rang: 'legende', fond: ['#1a3050', '#0a1426'], bord: '#9ad0ff', txt: '#e8f4ff', lueur: '#6ab8ff', ico: ['🛡️', '🛡️'], deco: 'acier' },
  archimage: { rang: 'legende', fond: ['#2a1050', '#100626'], bord: '#c890ff', txt: '#f0e0ff', lueur: '#a060ff', ico: ['📖', '✨'], deco: 'runes' },
  invocateur: { rang: 'legende', fond: ['#0c3a3a', '#041818'], bord: '#7af0e0', txt: '#e0fff8', lueur: '#40e0c8', ico: ['🐾', '👻'], deco: 'esprits' },
  sniper: { rang: 'legende', fond: ['#1e3a14', '#0a1808'], bord: '#a8f070', txt: '#eaffd8', lueur: '#80e040', ico: ['🎯', '🏹'], deco: 'visee' },
  artificier: { rang: 'legende', fond: ['#5a2a08', '#241002'], bord: '#ffa040', txt: '#fff0d8', lueur: '#ff8020', ico: ['💣', '💥'], deco: 'etincelles' },
  duelliste: { rang: 'legende', fond: ['#383848', '#18181e'], bord: '#f0f0ff', txt: '#ffffff', lueur: '#d0d0ff', ico: ['🤺', '⚔️'], deco: 'lames' },
  ombre: { rang: 'legende', fond: ['#1a0e24', '#06030a'], bord: '#8a60b0', txt: '#d8c8e8', lueur: '#6a3a9a', ico: ['🗡️', '🌑'], deco: 'fumee' },
};
export function styleTitre(code) {
  const [id, n] = String(code || '').split(':');
  if (!id) return null;
  if (id === 'br' && BR[n]) return { ...BR[n] };
  if (id === 'vil') return { rang: 'or', fond: ['#2a4a14', '#122006'], bord: '#b8e070', txt: '#f0ffd8', ico: ['🏡', '🏡'] };
  if (id === 'gri') return { ...RANGS.legende, rang: 'legende', ico: n === 'bestiaire' ? ['🐾', '📕'] : ['📚', '📜'] };
  const hf = HAUTS_FAITS[id]; if (!hf) return null;
  const rang = ['bronze', 'argent', 'or'][Math.max(0, Math.min(2, +n - 1))];
  return { ...RANGS[rang], rang, ico: [hf.ico, rang === 'or' ? '👑' : hf.ico] };
}
// pour les fenêtres : le titre en HTML (classes CSS .titreBadge.<rang> et .deco-<thème>)
export function titreHTML(code, nom, esc = (x) => x) {
  const st = styleTitre(code); if (!st || !nom) return '';
  return `<span class="titreBadge ${st.rang} ${st.deco ? `deco-${st.deco}` : ''}" style="--tf1:${st.fond[0]};--tf2:${st.fond[1]};--tb:${st.bord};--tt:${st.txt};--tl:${st.lueur || 'transparent'}"><i>${st.ico[0]}</i>${esc(nom)}<i>${st.ico[1]}</i></span>`;
}
