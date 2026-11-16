// =====================================================================
//  EXPLICATION DES SORTS — texte généré à partir des paramètres du sort
// =====================================================================
import { ELEMENTS, TAGS } from './data.js';

const EFFETS = {
  brulure: 'brûle (dégâts sur la durée)',
  mouille: 'mouille (combo avec Feu, Éclair, Glace)',
  lourd: 'ralentit',
  poussee: 'repousse',
  poussee_l: 'repousse un peu',
  chaine: 'rebondit sur les ennemis proches',
  gel: 'gèle et ralentit',
  marque: 'marque (la cible prend +20 % de dégâts)',
  perce: 'ignore boucliers et armures',
  aveugle: 'aveugle (la cible fait -15 % de dégâts)',
  racine: 'enlace et ralentit (2e coup : immobilise)',
};

const n = (v) => Math.round(v);
const s = (v) => `${+v.toFixed(1)} s`;

// Phrase principale selon la forme du sort
function forme(sp) {
  const loin = sp.centre === 'lanceur' ? 'autour de toi' : 'à l’endroit visé';
  switch (sp.forme) {
    case 'projectile': {
      let t = 'Lance un projectile';
      if (sp.pierce) t += ' qui traverse les ennemis';
      if (sp.bm) t += ', puis revient vers toi (touche à l’aller et au retour)';
      if (sp.explode) t += ` et explose à l’impact`;
      if (sp.pull) t += '. S’il touche, tu fonces sur la cible';
      if (sp.attire) t += '. S’il touche, la cible est ramenée vers toi';
      return t + '.';
    }
    case 'salve': return `Tire ${sp.count} projectiles à la suite dans la direction visée.`;
    case 'eventail': return `Tire ${sp.count} projectiles en éventail.`;
    case 'impact': return `Une frappe tombe ${loin} après ${s(sp.delay)} (zone annoncée au sol).`;
    case 'pluie': return `Fait pleuvoir ${sp.count} impacts ${loin}.`;
    case 'fissure': return `Ouvre une ligne de ${sp.count} éruptions qui avance devant toi.`;
    case 'tornade': return `Envoie une tornade qui avance pendant ${s(sp.duree)} en blessant tout ce qu’elle traverse.`;
    case 'zone': return `Crée une zone ${loin} pendant ${s(sp.duree)} qui blesse en continu${sp.soinLanceur ? ' et te soigne' : ''}.`;
    case 'nova': return `Explosion tout autour de toi${sp.recul ? ' qui repousse les ennemis' : ''}.`;
    case 'rayon': return `Rayon en ligne droite qui touche tout sur sa longueur.`;
    case 'charge': return `Fonce droit devant et frappe tout sur ton passage${sp.recul ? ' en repoussant' : ''}.`;
    case 'saut': return 'Bondit vers la cible et écrase le sol à l’atterrissage.';
    case 'tourbillon': return `Tourne sur toi-même pendant ${s(sp.duree)} en frappant autour (tu peux bouger lentement).`;
    case 'frappe': return 'Se téléporte dans le dos de l’ennemi visé et le frappe.';
    case 'piege': return `Pose un piège caché (${s(sp.duree)}) qui explose quand un ennemi marche dessus.`;
    case 'melee': return `Coup au corps à corps en arc devant toi${sp.recul ? ', qui repousse' : ''}.`;
    case 'dash': return 'Bond rapide dans la direction visée.';
    case 'soin': return `Te soigne de ${n(sp.heal)} PV.`;
    case 'bouclier': return `Bouclier de ${n(sp.shield)} PV pendant ${s(sp.duree)}.`;
    case 'blink': return `Téléportation, puis invisible pendant ${s(sp.invis)}.`;
    case 'hate': return `+${n(sp.bonus * 100)} % de vitesse pendant ${s(sp.duree)}.`;
    case 'armure': return `Réduit les dégâts subis de ${n(sp.reduction * 100)} % pendant ${s(sp.duree)}.`;
    // ultimes
    case 'meteore': return 'Un météore géant s’écrase à l’endroit visé.';
    case 'rayon_ult': return `Rayon gigantesque qui suit ta visée pendant ${s(sp.duree)}.`;
    case 'domaine': return `Domaine autour de toi qui blesse pendant ${s(sp.duree)}, puis implose violemment.`;
    case 'dragon': return 'Un dragon élémentaire serpente droit devant en dévastant tout.';
    case 'invocation': return 'Invoque un géant qui frappe toute la zone visée.';
    default: return '';
  }
}

function degats(sp) {
  if (!sp.dmg) return '';
  const parTick = ['tornade', 'zone', 'tourbillon', 'rayon_ult', 'domaine', 'dragon'].includes(sp.forme);
  let t = parTick ? `${n(sp.dmg)} dégâts toutes les ${s(sp.tick || 0.5)}` : `${n(sp.dmg)} dégâts`;
  if (['salve', 'eventail'].includes(sp.forme)) t += ' par projectile';
  if (['pluie', 'fissure'].includes(sp.forme)) t += ' par impact';
  if (sp.forme === 'domaine' && sp.final) t += `, puis ${n(sp.final)} à l’implosion`;
  if (sp.explode) t += ` (+${n(sp.dmg * 0.5)} autour)`;
  return t;
}

// Explication complète d'un sort : { titre, texte, degats, effets[], cd }
export function describeSpell(sp) {
  let effets = [...new Set(sp.tags || [])].map((t) => EFFETS[t]).filter(Boolean);
  if (sp.nova) {
    // sorts utilitaires : les effets ne concernent que la petite explosion finale
    const nom = ELEMENTS[sp.nova.element]?.nom || '';
    const de = /^[AEIOUÉÈ]/i.test(nom) ? `d’${nom}` : `de ${nom}`;
    const nova = `finit par une petite explosion ${de} (${n(sp.nova.dmg)} dégâts)`;
    effets = sp.dmg ? [...effets, nova] : [nova + (effets.length ? ` qui ${effets.join(', ')}` : '')];
  }
  return { titre: sp.nom, texte: forme(sp), degats: degats(sp), effets, cd: sp.cd ? `Recharge ${s(sp.cd)}` : '' };
}

// Version HTML (infobulles, grimoire)
export function spellHtml(sp, key = '', col = '#fff') {
  const d = describeSpell(sp);
  return `<div class="sp"><div class="sp-h"><b style="color:${col}">${d.titre}</b>${key ? `<span class="sp-k">${key}</span>` : ''}</div>
    <div class="sp-t">${d.texte}</div>
    ${d.degats ? `<div class="sp-d">⚔ ${d.degats}</div>` : ''}
    ${d.effets.length ? `<div class="sp-e">✦ ${d.effets.join(' · ')}</div>` : ''}
    ${d.cd ? `<div class="sp-c">⏱ ${d.cd}</div>` : ''}</div>`;
}

// Fiche complète d'un champion (5 sorts)
export function kitHtml(kit, ELS = ELEMENTS) {
  const A = ELS[kit.a]?.css, B = ELS[kit.b]?.css;
  return [
    spellHtml(kit.basique, 'CLIC', A), spellHtml(kit.sort1, 'E', A), spellHtml(kit.sort2, 'SHIFT', B),
    spellHtml(kit.sort3, 'F', B), spellHtml({ ...kit.ultime, cd: 0 }, 'R · ULTIME', '#ffcf3a'),
  ].join('');
}
export { EFFETS, TAGS };
