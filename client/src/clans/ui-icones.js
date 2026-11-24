// =====================================================================
//  LES CLANS ÉLÉMENTAIRES — les icônes des ressources (v66)
//  Dessinées en SVG, une par ressource, dans le même style (formes
//  simples, lumière en haut à gauche, contour sombre) : on reconnaît
//  d'un coup d'œil l'essence, les éclats, les trois matériaux et les
//  trois ressources rares. Elles sont posées une fois dans la page
//  (un « sprite ») et réutilisées partout avec <use>.
// =====================================================================
export const NOMS_RESS = {
  essence: 'Essence', eclats: 'Éclats', braises: 'Braises (Feu)', perles: 'Perles (Eau)', seve: 'Sève (Plante)',
  cristal: 'Cristal de lave (rare, Feu)', perle_noire: 'Perle noire (rare, Eau)', graine_or: 'Graine d’or (rare, Plante)',
  fragments: 'Fragments de faille (Terres Brisées)', eclat_vide: 'Éclat du vide (rare, Terres Brisées)',
};
const SYMBOLES = `
<symbol id="ir-essence" viewBox="0 0 24 24">
  <defs><radialGradient id="ir-g-ess" cx="40%" cy="35%" r="65%"><stop offset="0" stop-color="#fffbe0"/><stop offset=".45" stop-color="#ffd24a"/><stop offset="1" stop-color="#c47a0c"/></radialGradient>
  <radialGradient id="ir-g-halo" r="50%"><stop offset="0" stop-color="#ffd870" stop-opacity=".55"/><stop offset="1" stop-color="#ffd870" stop-opacity="0"/></radialGradient></defs>
  <circle cx="12" cy="12" r="12" fill="url(#ir-g-halo)"/>
  <circle cx="12" cy="12.5" r="7" fill="url(#ir-g-ess)" stroke="#6a3a06" stroke-width="1.1"/>
  <path d="M12 8.2c-1.6 1.4-1.9 3.4-.4 4.6 1.2 1 .9 2.4-.3 3.2" fill="none" stroke="#fff6d0" stroke-width="1.2" stroke-linecap="round" opacity=".85"/>
  <path d="M18.5 3.5l.7 1.8 1.8.7-1.8.7-.7 1.8-.7-1.8-1.8-.7 1.8-.7z" fill="#fff"/>
</symbol>
<symbol id="ir-eclats" viewBox="0 0 24 24">
  <path d="M10 2.5l4 6.5-4 12.5-4-12.5z" fill="#5ab8ff" stroke="#123a6a" stroke-width="1" stroke-linejoin="round"/>
  <path d="M10 2.5l4 6.5H6z" fill="#d8f4ff"/><path d="M10 21.5L6 9h4z" fill="#8ad0ff"/>
  <path d="M17.5 7l3 4.2-3 8.3-3-8.3z" fill="#3a8ae0" stroke="#123a6a" stroke-width="1" stroke-linejoin="round"/><path d="M17.5 7l3 4.2h-6z" fill="#bfeaff"/>
  <path d="M4.5 13l1.8 2.6L4.5 21l-1.8-5.4z" fill="#2a6ad0" stroke="#123a6a" stroke-width=".9" stroke-linejoin="round"/>
</symbol>
<symbol id="ir-braises" viewBox="0 0 24 24">
  <path d="M12 2.5c1.6 2.2 3.6 3.3 2.4 6.2 1.2-.4 1.8-1.4 1.9-2.4 1.8 2 1.6 4.4.4 5.8H7.3c-1.4-2-.6-4.6 1.2-5.9-.1 1.3.4 2.3 1.4 2.8-.6-2.6.6-4.8 2.1-6.5z" fill="#ffb040" stroke="#7a2a06" stroke-width=".9" stroke-linejoin="round"/>
  <path d="M12 6.5c.8 1.4 1.7 2.4 1 4.1H10.9c-.4-1.5.2-2.9 1.1-4.1z" fill="#fff0a0"/>
  <path d="M4.5 13.5l3-2.3h9.2l3 2.6-1.3 6.2-5.6 1.8-6.7-1.7z" fill="#3a2420" stroke="#120806" stroke-width="1" stroke-linejoin="round"/>
  <path d="M7 14.5l2.6 1.4 1.2 3M14 13.2l-1.2 2.7 2.8 1.6M10.8 16l2 0" fill="none" stroke="#ff7a2a" stroke-width="1.3" stroke-linecap="round"/>
  <path d="M5.6 14.2l2.2-1.6h3" fill="none" stroke="#6a4a40" stroke-width=".9" stroke-linecap="round"/>
</symbol>
<symbol id="ir-perles" viewBox="0 0 24 24">
  <defs><radialGradient id="ir-g-perle" cx="35%" cy="30%" r="70%"><stop offset="0" stop-color="#ffffff"/><stop offset=".55" stop-color="#d6ecfa"/><stop offset="1" stop-color="#7aa4c8"/></radialGradient></defs>
  <path d="M3 17.5c2.5 3 15.5 3 18 0-1-1.4-3-2.1-4.4-2.1H7.4C6 15.4 4 16.1 3 17.5z" fill="#2a8ae0" stroke="#0a2a5a" stroke-width=".9"/>
  <circle cx="12" cy="11.5" r="6.2" fill="url(#ir-g-perle)" stroke="#3a5a7a" stroke-width="1"/>
  <ellipse cx="9.8" cy="9.2" rx="1.8" ry="1.2" fill="#fff" opacity=".95"/>
  <circle cx="19" cy="5.5" r="1.6" fill="none" stroke="#9ad6ff" stroke-width=".9"/><circle cx="16.5" cy="3" r=".9" fill="none" stroke="#9ad6ff" stroke-width=".8"/>
</symbol>
<symbol id="ir-seve" viewBox="0 0 24 24">
  <defs><linearGradient id="ir-g-seve" x1="0" y1="0" x2=".3" y2="1"><stop offset="0" stop-color="#e8ff9a"/><stop offset=".5" stop-color="#6ad24a"/><stop offset="1" stop-color="#1e7a2a"/></linearGradient></defs>
  <path d="M12 4.5c3.3 4.3 6 7.3 6 10.6a6 6 0 0 1-12 0c0-3.3 2.7-6.3 6-10.6z" fill="url(#ir-g-seve)" stroke="#0e4a16" stroke-width="1.1" stroke-linejoin="round"/>
  <path d="M9.2 13.2c-.3 1.8.4 3.4 1.8 4.2" fill="none" stroke="#f4ffd0" stroke-width="1.3" stroke-linecap="round" opacity=".9"/>
  <path d="M12.2 4.8c.4-1.8 1.8-2.9 4-2.8-.3 2-1.7 3-4 2.8z" fill="#4ab854" stroke="#0e4a16" stroke-width=".8"/>
</symbol>
<symbol id="ir-cristal" viewBox="0 0 24 24">
  <path d="M7 3.5h10l4 5.5-9 12.5L3 9z" fill="#e8401a" stroke="#5a0a04" stroke-width="1.1" stroke-linejoin="round"/>
  <path d="M7 3.5h10l-2 5.5H9z" fill="#ffb08a"/><path d="M3 9h6l3 12.5z" fill="#ff7a4a"/><path d="M21 9h-6l-3 12.5z" fill="#b8240e"/>
  <path d="M9 9h6l-3 12.5z" fill="#ff5a2a"/><path d="M8.6 5l-1.2 2.2" stroke="#fff4e8" stroke-width="1.1" stroke-linecap="round"/>
</symbol>
<symbol id="ir-perle_noire" viewBox="0 0 24 24">
  <defs><radialGradient id="ir-g-noire" cx="35%" cy="30%" r="75%"><stop offset="0" stop-color="#a890d0"/><stop offset=".35" stop-color="#3a3058"/><stop offset="1" stop-color="#0a0812"/></radialGradient></defs>
  <circle cx="12" cy="12.5" r="8" fill="url(#ir-g-noire)" stroke="#000" stroke-width="1"/>
  <path d="M6.5 14.5a6 6 0 0 0 7.5 4" fill="none" stroke="#40d8c8" stroke-width="1.2" stroke-linecap="round" opacity=".75"/>
  <ellipse cx="9.4" cy="9.4" rx="2.2" ry="1.4" fill="#f0e8ff" opacity=".9"/>
  <path d="M18.5 3.5l.6 1.5 1.5.6-1.5.6-.6 1.5-.6-1.5-1.5-.6 1.5-.6z" fill="#d0c0ff"/>
</symbol>
<symbol id="ir-graine_or" viewBox="0 0 24 24">
  <defs><radialGradient id="ir-g-graine" cx="38%" cy="35%" r="70%"><stop offset="0" stop-color="#fff6b0"/><stop offset=".5" stop-color="#f0b830"/><stop offset="1" stop-color="#9a6608"/></radialGradient></defs>
  <path d="M12 8.5c4 0 6.2 3.2 6.2 6.4S15.6 21 12 21s-6.2-2.9-6.2-6.1 2.2-6.4 6.2-6.4z" fill="url(#ir-g-graine)" stroke="#5a3a04" stroke-width="1.1"/>
  <path d="M12 9.5c-.6 3.6-.6 7.2 0 10.6" fill="none" stroke="#b8820e" stroke-width=".9" opacity=".8"/>
  <path d="M12 8.6V5.2" stroke="#2e8a3a" stroke-width="1.4" stroke-linecap="round"/>
  <path d="M12 5.6c-.6-2.2-2.6-3-4.6-2.4.5 2 2.3 2.9 4.6 2.4zM12 5c.8-1.9 2.6-2.6 4.4-1.8-.7 1.8-2.4 2.4-4.4 1.8z" fill="#5ac84a" stroke="#1e6a26" stroke-width=".7"/>
  <ellipse cx="9.8" cy="12.2" rx="1.2" ry="1.8" fill="#fffbe0" opacity=".85" transform="rotate(20 9.8 12.2)"/>
</symbol>
<symbol id="ir-fragments" viewBox="0 0 24 24">
  <path d="M5 15l4-9 4 3-2 8z" fill="#6a4ab0" stroke="#24123e" stroke-width="1.1"/>
  <path d="M13 9l5-3 1 8-6 4z" fill="#8a60e0" stroke="#24123e" stroke-width="1.1"/>
  <path d="M9 6l4 3" stroke="#d8c0ff" stroke-width="1" opacity=".9"/>
  <circle cx="16" cy="9" r="1" fill="#f0e0ff"/>
</symbol>
<symbol id="ir-eclat_vide" viewBox="0 0 24 24">
  <defs><linearGradient id="ir-g-vide" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#c8f0ff"/><stop offset=".5" stop-color="#6a8aff"/><stop offset="1" stop-color="#3a1a8a"/></linearGradient></defs>
  <path d="M12 2.5l6 9.5-6 9.5-6-9.5z" fill="url(#ir-g-vide)" stroke="#1a0e3a" stroke-width="1.1"/>
  <path d="M12 2.5v19M6 12h12" stroke="#e8f4ff" stroke-width=".7" opacity=".6"/>
  <path d="M19.5 3.5l.6 1.5 1.5.6-1.5.6-.6 1.5-.6-1.5-1.5-.6 1.5-.6z" fill="#d0c0ff"/>
</symbol>`;
// le sprite, posé une seule fois dans la page
if (typeof document !== 'undefined' && !document.getElementById('spriteRess')) {
  const d = document.createElement('div');
  d.innerHTML = `<svg id="spriteRess" xmlns="http://www.w3.org/2000/svg" style="position:absolute;width:0;height:0;overflow:hidden" aria-hidden="true">${SYMBOLES}</svg>`;
  document.body.prepend(d.firstElementChild);
}
// l'icône d'une ressource, en HTML (avec son nom au survol)
export const icone = (k) => (NOMS_RESS[k] ? `<svg class="icoRes ir-${k}" viewBox="0 0 24 24" role="img" aria-label="${NOMS_RESS[k]}"><title>${NOMS_RESS[k]}</title><use href="#ir-${k}"/></svg>` : '');
