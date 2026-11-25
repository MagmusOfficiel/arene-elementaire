// v107 — le jeu en anglais.
// Le code reste écrit en français ; la traduction se fait à l'affichage :
//  - les textes de la page (nœuds texte + title / placeholder / aria-label / alt), surveillés en continu,
//  - les textes dessinés sur le canvas (fillText / strokeText / measureText),
//  - les boîtes confirm().
// Le dictionnaire (i18n/en.json) associe un texte français à sa traduction. « {0} », « {1} »… sont
// des parties variables (nombres, noms) : elles sont reprises telles quelles, ou traduites si elles
// sont elles-mêmes dans le dictionnaire (« Clan du Feu » → « Fire Clan »).
// Langue : choix du joueur (menu ☰) > ?lang=en > sur CrazyGames la langue du joueur (anglais par défaut)
// > ailleurs le français.
import EN from './i18n/en.json';

const q = new URLSearchParams(location.search);
const surCG = import.meta.env.VITE_CRAZYGAMES === '1' || q.has('crazygames') || /crazygames|1001juegos/.test(location.hostname);
const lire = () => { try { return localStorage.getItem('langue'); } catch { return null; } };
const deNav = (l) => (String(l || '').toLowerCase().startsWith('fr') ? 'fr' : 'en');
export let langue = q.get('lang') === 'en' || q.get('lang') === 'fr' ? q.get('lang') : lire() || (surCG ? deNav(navigator.language) : 'fr');

// ---------- le dictionnaire ----------
const exact = new Map(), motifs = [];
const echapper = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
for (let [fr, en] of Object.entries(EN)) {
  if (!en) continue;
  if (/[’']$/.test(fr) && /\w$/.test(en)) en += ' ';   // « va à l’ » + <b>Autel</b> → « head to the » + espace
  if (!/\{\d+\}/.test(fr)) { exact.set(fr, en); continue; }
  const ordre = [], corps = echapper(fr).replace(/\\\{(\d+)\\\}/g, (_, n) => { ordre.push(+n); return '\u0000'; });
  // strict : chaque partie variable a au moins un caractère ; souple : elle peut être vide (« dégâts{1}{2}. »)
  const statique = fr.replace(/\{\d+\}/g, '').length;
  motifs.push({ corps, ordre, en, statique, prefixe: fr.split('{')[0], v: {} });
}
// v107 : une partie variable faite de HTML (icône, gras) coupe le texte en plusieurs nœuds à l'écran
// (« … devient des éclats » <svg> « . »). On ajoute donc tous les morceaux contigus d'un motif :
// chaque morceau fixe seul, et chaque suite de morceaux avec leurs parties variables.
const nouveaux = [];
for (const [fr, en] of Object.entries(EN)) {
  if (!en || !/\{\d+\}/.test(fr)) continue;
  const F = fr.split(/(\{\d+\})/), G = en.split(/(\{\d+\})/);
  if (F.length !== G.length || F.some((x, i) => i % 2 && x !== G[i])) continue;   // même ordre des parties variables
  const nb = (F.length - 1) / 2;
  for (let a = 0; a <= nb; a++) for (let b = a; b <= nb; b++) {
    if (a === 0 && b === nb) continue;
    const f = F.slice(2 * a, 2 * b + 1).join('').trim(), g = G.slice(2 * a, 2 * b + 1).join('').trim();
    if (!g || f.replace(/\{\d+\}/g, '').replace(/[^A-Za-zÀ-ÿ]/g, '').length < 3 || EN[f] !== undefined || exact.has(f)) continue;
    nouveaux.push([f, g]);
  }
}
for (const [f, g] of nouveaux) {
  if (!/\{\d+\}/.test(f)) { if (!exact.has(f)) exact.set(f, g); continue; }
  const ordre = [], corps = echapper(f).replace(/\\\{(\d+)\\\}/g, (_, n) => { ordre.push(+n); return '\u0000'; });
  motifs.push({ corps, ordre, en: g, statique: f.replace(/\{\d+\}/g, '').length - 0.5, prefixe: f.split('{')[0], v: {}, derive: true });
}
motifs.sort((a, b) => b.statique - a.statique);   // le motif le plus précis d'abord
const parPrefixe = new Map(), sansPrefixe = [];
for (const m of motifs) { if (m.prefixe.length >= 2) { const k = m.prefixe.slice(0, 2); (parPrefixe.get(k) || parPrefixe.set(k, []).get(k)).push(m); } else sansPrefixe.push(m); }

const cache = new Map();
// une partie variable : traduite si on la connaît (« Clan du Feu », « 🔥 Terres de Braise »), sinon gardée telle quelle
const partie = (v, prof) => { const c = v.trim(); if (!c) return v; const e = coeur(c, prof + 1); return e === null ? v : v.match(/^\s*/)[0] + e + v.match(/\s*$/)[0]; };
// décor autour d'un texte connu : emojis, symboles, « : » en tête, « — » ou « 🔒 » en queue
const DECO_AV = /^([\p{Extended_Pictographic}\uFE0F\u200D\u2190-\u21FF\u2600-\u27BF★☆✓✦·—:•«"“\s]+)/u, DECO_AP = /([\p{Extended_Pictographic}\uFE0F\u200D\u2600-\u27BF★☆✓✦·—•»"”\s\d×%+\-−/,]+)$/u;
// les découpages possibles d'un motif : chaque partie variable courte ou longue, d'abord non vide (strict) puis vide permise (souple)
function variantes(m, souple) {
  const k = souple ? 's' : 'f'; if (m.v[k]) return m.v[k];
  const nb = m.ordre.length, l = [];
  for (let c = 0; c < 1 << Math.min(nb, 4); c++) {
    let i = 0;
    l.push(new RegExp('^' + m.corps.replace(/\u0000/g, () => { const g = (c >> i++) & 1; return souple ? (g ? '([\\s\\S]*)' : '([\\s\\S]*?)') : (g ? '([\\s\\S]+)' : '([\\s\\S]+?)'); }) + '$'));
  }
  return (m.v[k] = l);
}
const ok = (v, prof) => (simple(v) || coeur(v.trim(), prof + 1) !== null ? 1 : 0);
// deux parties variables collées (« dégâts{1}{2} ») : la coupure la plus juste, à un espace
function affiner(m, caps, prof) {
  m.adj ??= [...m.corps.matchAll(/\u0000(?=\u0000)/g)].map((x) => m.corps.slice(0, x.index).split('\u0000').length - 1);
  for (const i of m.adj) {
    const c = caps[i] + caps[i + 1]; let best = null, bs = -1;
    for (let p = 0; p <= c.length; p++) {
      if (p > 0 && p < c.length && c[p] !== ' ') continue;
      const s = ok(c.slice(0, p), prof) + ok(c.slice(p), prof); if (s > bs) { bs = s; best = p; }
    }
    caps[i] = c.slice(0, best); caps[i + 1] = c.slice(best);
  }
}
const simple = (v) => { const x = v.trim(); return !x || /^[\d\s.,:%×+\-−/()]+$/.test(x); };
function direct(n, prof) {
  const e = exact.get(n); if (e !== undefined) return e;
  for (const souple of [false, true]) for (const liste of [parPrefixe.get(n.slice(0, 2)) || [], sansPrefixe]) for (const m of liste) {
    const vs = variantes(m, souple); if (!vs[0].test(n)) continue;
    let mieux = null, score = -1;
    for (const re of vs) {
      const r = re.exec(n); if (!r) continue;
      const caps = r.slice(1);
      if (caps.some((v) => /[.!?…]\s+\S/.test(v) || /^\s*[.!?…]/.test(v))) continue;   // une partie variable n'avale pas la phrase suivante
      const s = caps.reduce((a, v) => a + (simple(v) || coeur(v.trim(), prof + 1) !== null ? 1 : 0), 0);
      if (s > score) { score = s; mieux = caps; if (s === caps.length) break; }
    }
    if (!mieux) continue;
    if (score < mieux.length) affiner(m, mieux, prof);
    const vals = []; m.ordre.forEach((num, i) => { vals[num] = mieux[i]; });
    return m.en.replace(/\{(\d+)\}/g, (_, k) => partie(vals[k] ?? '', prof));
  }
  return null;
}
function coeur(s, prof = 0) {
  const n = s.replace(/\s+/g, ' ').trim(); if (!n) return null;
  const d = direct(n, prof); if (d !== null) return d;
  if (prof > 3) return null;
  const av = DECO_AV.exec(n)?.[1] || '', ap = DECO_AP.exec(n.slice(av.length))?.[1] || '';
  if ((av || ap) && n.length > av.length + ap.length) { const r = coeur(n.slice(av.length, n.length - ap.length), prof + 1); if (r !== null) return av.replace(/«\s*/, '“') + r + ap.replace(/\s*»/, '”'); }
  for (const sep of [' — ', ' · ']) if (n.includes(sep)) {
    const parts = n.split(sep), tr = parts.map((x) => coeur(x, prof + 1));
    if (tr.some((x) => x !== null)) return parts.map((x, i) => tr[i] ?? x).join(sep);
  }
  return null;
}
// traduit un texte entier (en gardant les espaces autour) ; null si rien à faire
export function trad(s, noter = true) {
  if (langue !== 'en' || !s || !/[A-Za-zÀ-ÿ]/.test(s)) return null;
  if (cache.has(s)) return cache.get(s);
  const m = /^(\s*)([\s\S]*?)(\s*)$/.exec(s);
  const t = coeur(m[2]); const r = t === null ? null : m[1] + t + m[3];
  if (cache.size > 20000) cache.clear();
  cache.set(s, r);
  if (r === null && manquants && noter) manquants.add(m[2]);
  return r;
}
export const t = (s) => trad(s) ?? s;
// un texte fait de plusieurs phrases (description de carte) : on prend les plus longs morceaux connus
export function tradPhrases(s) {
  if (langue !== 'en' || !s) return s;
  const r = trad(s, false); if (r !== null) return r;
  const ph = s.split(/(?<=[.!?…])\s+/), out = [];
  for (let i = 0; i < ph.length;) {
    let ok = false;
    for (let j = ph.length; j > i; j--) { const x = (j - i === ph.length ? null : trad(ph.slice(i, j).join(' '), false)); if (x !== null) { out.push(x); i = j; ok = true; break; } }
    if (!ok) out.push(ph[i++]);
  }
  return out.join(' ');
}
let manquants = q.has('i18nDebug') ? new Set() : null;
window.__i18n = { get manquants() { return manquants ? [...manquants] : null; }, trad, tradPhrases, get langue() { return langue; } };

// ---------- la page ----------
const ATTRS = ['title', 'placeholder', 'aria-label', 'alt'];
const origTexte = new WeakMap(), posees = new WeakMap(), origAttr = new WeakMap();
const ignorer = (el) => !el || el.closest?.('script,style,textarea,[translate="no"],.notr');
function texte(n) {
  const v = n.nodeValue;
  if (posees.get(n) === v) return;   // c'est nous qui venons de l'écrire
  if (ignorer(n.parentElement)) return;
  origTexte.set(n, v);
  const r = trad(v); if (r === null || r === v) return;
  posees.set(n, r); n.nodeValue = r;
}
function attrs(el) {
  if (ignorer(el)) return;
  let o = origAttr.get(el);
  for (const a of ATTRS) {
    if (!el.hasAttribute(a)) continue;
    const v = el.getAttribute(a); if (o?.[a]?.pose === v) continue;
    const r = trad(v); if (r === null || r === v) continue;
    o ||= {}; o[a] = { fr: v, pose: r }; origAttr.set(el, o); el.setAttribute(a, r);
  }
}
function parcourir(racine) {
  if (racine.nodeType === 3) return texte(racine);
  if (racine.nodeType !== 1) return;
  if (ignorer(racine)) return;
  attrs(racine);
  const w = document.createTreeWalker(racine, NodeFilter.SHOW_TEXT | NodeFilter.SHOW_ELEMENT);
  for (let n = w.nextNode(); n; n = w.nextNode()) { if (n.nodeType === 3) texte(n); else if (n.attributes.length) attrs(n); }
}
let obs = null;
function surveiller() {
  if (obs) return;
  obs = new MutationObserver((liste) => {
    for (const m of liste) {
      if (m.type === 'characterData') texte(m.target);
      else if (m.type === 'attributes') attrs(m.target);
      else for (const n of m.addedNodes) parcourir(n);
    }
  });
  obs.observe(document.documentElement, { childList: true, subtree: true, characterData: true, attributes: true, attributeFilter: ATTRS });
  parcourir(document.body);
  document.title = t('Les Clans Élémentaires');
}
// retour au français : on remet les textes d'origine
function revenir() {
  obs?.disconnect(); obs = null;
  const w = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT | NodeFilter.SHOW_ELEMENT);
  for (let n = w.nextNode(); n; n = w.nextNode()) {
    if (n.nodeType === 3) { if (posees.get(n) === n.nodeValue && origTexte.has(n)) { n.nodeValue = origTexte.get(n); posees.delete(n); } }
    else { const o = origAttr.get(n); if (o) for (const a in o) if (n.getAttribute(a) === o[a].pose) n.setAttribute(a, o[a].fr); origAttr.delete(n); }
  }
  document.title = 'Les Clans Élémentaires';
}

// ---------- le canvas et confirm() ----------
const C2 = CanvasRenderingContext2D.prototype;
for (const f of ['fillText', 'strokeText', 'measureText']) {
  const orig = C2[f];
  C2[f] = function (s, ...rest) { return orig.call(this, langue === 'en' && typeof s === 'string' ? t(s) : s, ...rest); };
}
const conf = window.confirm.bind(window);
window.confirm = (s) => conf(t(String(s)));

export function changerLangue(l, garder = true) {
  if (l !== 'en' && l !== 'fr') return;
  if (garder) { try { localStorage.setItem('langue', l); } catch { /* rien */ } }
  if (l === langue) return;
  langue = l; cache.clear();
  document.documentElement.lang = l;
  if (l === 'en') surveiller(); else revenir();
  window.dispatchEvent(new Event('langue'));
}
// CrazyGames : la langue donnée par le SDK, si le joueur n'a rien choisi
export function langueSuggeree(code) { if (!lire() && !q.get('lang')) changerLangue(deNav(code), false); }

document.documentElement.lang = langue;
if (langue === 'en') surveiller();
