// =====================================================================
//  LES CLANS ÉLÉMENTAIRES — les salles mystère (v75)
//  Pur (client + serveur). Une salle « ? » en expédition : un événement
//  et un choix. Tout se tire de la graine de l'expédition et du numéro de
//  la salle : le client et le serveur tombent d'accord, sans triche.
// =====================================================================
import { alea } from './combat.js';
import * as RQ from './reliques.js';
import { RARES } from './cartes.js';
import { PALIERS } from './monstres.js';

const pc = (x, k) => Math.max(1, Math.round(x.pvMax * k));
const butinEss = (x) => x.butin.essence || 0;
// effets : chacun renvoie le texte de ce qui est arrivé
const blesser = (x, n) => { x.pv = Math.max(1, x.pv - n); return `−${n} PV`; };
const soigner = (x, n) => { const a = x.pv; x.pv = Math.min(x.pvMax, x.pv + n); return `+${x.pv - a} PV`; };
const relique = (x) => { const [r] = RQ.tirerChoix(x, 1); if (!r) { x.butin.essence += 80; return '+80 essence (tu as déjà toutes les reliques)'; } RQ.ajouter(x, r); return `relique : ${RQ.RELIQUES[r].ico} ${RQ.RELIQUES[r].nom}`; };

// chaque événement : un texte, et 2 ou 3 choix (dispo(x) : peut-on le prendre ? ; faire(x, r) : l'effet)
export const EVENEMENTS = {
  autel: { nom: 'L’autel de sang', ico: '🩸', txt: 'Un autel ancien, couvert de runes, réclame une offrande. Une lueur rouge palpite au fond d’une coupe.',
    choix: [
      { txt: (x) => `Offrir ton sang (−${pc(x, 0.15)} PV) pour une relique`, dispo: (x) => x.pv > pc(x, 0.15), faire: (x) => `${blesser(x, pc(x, 0.15))}, ${relique(x)}` },
      { txt: () => 'Passer ton chemin', faire: () => 'Tu t’éloignes sans te retourner.' },
    ] },
  louche: { nom: 'Le marchand louche', ico: '🎩', txt: '« Psst… Des affaires rares, à moitié prix. Enfin, presque. » Un homme encapuchonné ouvre son manteau plein de fioles.',
    choix: [
      { txt: () => 'Une potion de soin (60 essence du butin) : +30 % PV', dispo: (x) => butinEss(x) >= 60, faire: (x) => { x.butin.essence -= 60; return soigner(x, pc(x, 0.3)); } },
      { txt: () => 'Un objet mystérieux (110 essence du butin) : une relique', dispo: (x) => butinEss(x) >= 110, faire: (x) => { x.butin.essence -= 110; return relique(x); } },
      { txt: () => 'Le repousser', faire: () => '« Tant pis pour toi… » Il disparaît dans l’ombre.' },
    ] },
  piege: { nom: 'Le couloir piégé', ico: '🪤', txt: 'Des dalles qui sonnent creux, des fléchettes dans les murs… et un coffre au bout du couloir.',
    choix: [
      { txt: (x) => `Foncer jusqu’au coffre (−${pc(x, 0.12)} PV, +70 essence)`, dispo: (x) => x.pv > pc(x, 0.12), faire: (x) => { x.butin.essence += 70; return `${blesser(x, pc(x, 0.12))}, +70 essence`; } },
      { txt: () => 'Avancer prudemment (une chance sur deux de te blesser un peu)', faire: (x, r) => (r < 0.5 ? `${blesser(x, pc(x, 0.06))} : une fléchette t’a eu.` : 'Tu passes sans une égratignure.') },
    ] },
  coffre: { nom: 'Le coffre scellé', ico: '🧰', txt: 'Un coffre bardé de fer, scellé par un vieux cadenas élémentaire. Il pourrait exploser… ou regorger de trésors.',
    choix: [
      { txt: () => 'Forcer le cadenas (60 % : un gros butin ; 40 % : il explose)', faire: (x, r) => { if (r < 0.6) { const m = PALIERS[x.palier - 1].butin; const e = Math.round(90 * m), t = Math.round(12 * m); x.butin.essence += e; x.butin.mat += t; return `+${e} essence, +${t} matériaux !`; } return `BOUM ! ${blesser(x, pc(x, 0.15))}`; } },
      { txt: () => 'Le laisser tranquille', faire: () => 'Mieux vaut ne pas tenter le diable.' },
    ] },
  blesse: { nom: 'Le voyageur blessé', ico: '🤕', txt: 'Un voyageur gît contre un rocher, la jambe bandée à la hâte. « À l’aide… J’ai de quoi te payer. »',
    choix: [
      { txt: (x) => `Le soigner avec tes réserves (−${pc(x, 0.1)} PV) : il te donne une ressource rare`, dispo: (x) => x.pv > pc(x, 0.1), faire: (x) => { const n = 1 + x.palier; x.butin.rare = (x.butin.rare || 0) + n; return `${blesser(x, pc(x, 0.1))}, +${n} ${RARES[x.territoire]?.nom || 'ressource rare'}`; } },
      { txt: () => 'Lui laisser un peu d’eau et repartir', faire: (x) => { x.butin.essence += 15; return '« Merci… » Il te glisse quelques pièces : +15 essence.'; } },
    ] },
  source: { nom: 'La source élémentaire', ico: '⛲', txt: 'Une source jaillit de la roche, chargée d’énergie élémentaire. Son eau scintille.',
    choix: [
      { txt: (x) => `Boire longuement (+${pc(x, 0.25)} PV)`, faire: (x) => soigner(x, pc(x, 0.25)) },
      { txt: () => 'T’y baigner (+8 PV max pour toute l’expédition)', faire: (x) => { x.pvMax += 8; x.pv += 8; return '+8 PV max, +8 PV'; } },
    ] },
  voeux: { nom: 'La fontaine aux vœux', ico: '🪙', txt: 'Au fond de la fontaine, des pièces brillent par milliers. Une inscription : « Qui donne recevra… peut-être. »',
    choix: [
      { txt: () => 'Jeter 40 essence (une chance sur deux d’en gagner 130)', dispo: (x) => butinEss(x) >= 40, faire: (x, r) => { x.butin.essence -= 40; if (r < 0.5) { x.butin.essence += 130; return 'La fontaine scintille : +130 essence !'; } return 'Plouf. Rien ne se passe.'; } },
      { txt: () => 'Faire un vœu sans rien jeter', faire: () => 'Tu fermes les yeux. Rien ne change… pour l’instant.' },
    ] },
};
export const LISTE = Object.keys(EVENEMENTS);
const num = (id) => Number(String(id).replace(/\D/g, '') || 0);
// l'événement d'une salle, et le tirage de son hasard
export const evenementDe = (x, id) => LISTE[Math.floor(alea(x.graine + num(id) * 13 + 777)() * LISTE.length)];
const hasard = (x, id) => alea(x.graine + num(id) * 29 + 1999)();

// la vue pour le client : le texte et les choix (avec leur disponibilité)
export function vue(x) {
  if (!x?.mystere) return null;
  const e = EVENEMENTS[x.mystere.evt];
  return { evt: x.mystere.evt, nom: e.nom, ico: e.ico, txt: e.txt, choix: e.choix.map((c) => ({ txt: c.txt(x), ok: !c.dispo || c.dispo(x) })) };
}
// choisir : applique l'effet et libère la carte
export function choisir(x, i) {
  if (!x?.mystere) return { ok: false };
  const e = EVENEMENTS[x.mystere.evt], c = e.choix[i | 0];
  if (!c || !Number.isInteger(i)) return { ok: false };
  if (c.dispo && !c.dispo(x)) return { ok: false, raison: 'Tu ne peux pas faire ça.' };
  const issue = c.faire(x, hasard(x, x.mystere.salle));
  x.mystere = null;
  return { ok: true, issue };
}
