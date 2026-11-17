// =====================================================================
//  ASTUCES : une petite carte la PREMIÈRE fois qu'on rencontre quelque chose
//  (gardé dans le navigateur ; « Revoir le tutoriel » dans les Réglages les remet à zéro)
// =====================================================================
export const ASTUCES = {
  zoneRouge:  ['🔴', 'Zone rouge', 'Un sort va tomber à cet endroit dans un instant : sors-en ou roule à travers.'],
  annonce:    ['⚠', 'Ultime annoncé', 'Un ennemi prépare son ultime : la zone colorée montre où il va frapper. Sors-en !'],
  combo:      ['✨', 'Combo d’éléments', 'Deux éléments qui se rencontrent créent un effet bonus (ex. eau + foudre = électrocution).'],
  orbe:       ['💚', 'Orbes', 'Les orbes soignent et remplissent la jauge d’ultime. Les dorées sont légendaires.'],
  niveau:     ['⬆', 'Niveau supérieur', 'Choisis un bonus parmi les 3 cartes (touches 1, 2, 3 ou toucher la carte).'],
  pvBas:      ['🩸', 'PV bas', 'Recule, roule hors de portée et ramasse un orbe vert pour te soigner.'],
  horde:      ['🧟', 'Horde', 'Une vague de zombies arrive sur la carte : reste groupé ou fuis vers un coin calme.'],
  evenement:  ['🌋', 'Événement', 'Un événement élémentaire a commencé : son élément est renforcé dans la zone indiquée.'],
  attente:    ['⏳', 'File d’attente', 'La partie démarre quand assez de joueurs sont là, sinon elle est complétée par des bots.'],
  classe:     ['⚔', 'Mode classé', 'Ta place finale fait monter ou baisser ta cote. Fin de saison chaque mois, avec cadre et titre de ton meilleur rang.'],
  duo:        ['🤝', 'Duo 2v2', 'Toi et ton coéquipier touchez la même cible avec deux éléments différents en moins de 2 s : combo d’équipe !'],
  relique:    ['🏺', 'Reliques', 'En Survie, chaque boss te laisse choisir une relique : un pouvoir pour toute la partie.'],
  royale:     ['🌀', 'Battle royale', 'La tempête rétrécit la zone : reste à l’intérieur du cercle. Dernier en vie gagne.'],
  mort:       ['💀', 'Éliminé', 'Pas grave : chaque vie te donne un nouveau tirage d’éléments. Observe les combos qui t’ont battu !'],
};
const vues = new Set((() => { try { return JSON.parse(localStorage.getItem('astuces')) || []; } catch { return []; } })());
let file = [], enCours = false;

export function astuce(id) {
  if (!ASTUCES[id] || vues.has(id) || file.includes(id)) return;
  vues.add(id); try { localStorage.setItem('astuces', JSON.stringify([...vues])); } catch { /* rien */ }
  file.push(id); if (!enCours) suivante();
}
function suivante() {
  const id = file.shift(); if (!id) { enCours = false; return; }
  enCours = true;
  let el = document.getElementById('astuce');
  if (!el) { el = document.createElement('div'); el.id = 'astuce'; document.getElementById('hud').appendChild(el); el.onclick = () => { el.classList.remove('on'); clearTimeout(el._t); setTimeout(suivante, 250); }; }
  const [ic, titre, txt] = ASTUCES[id];
  el.innerHTML = `<b>${ic}</b><div><strong>${titre}</strong><span>${txt}</span></div>`;
  el.classList.add('on');
  clearTimeout(el._t); el._t = setTimeout(() => { el.classList.remove('on'); setTimeout(suivante, 400); }, 6500);
}
export function oublierAstuces() { vues.clear(); localStorage.removeItem('astuces'); localStorage.removeItem('tutoFait'); }
