// =====================================================================
//  COMPTE : un code (« K7QF-2XMB ») qui sauvegarde la progression sur le serveur
//  (niveau, cosmétiques, titres, cote du Classé, grimoire, record de Survie)
//  pour la retrouver sur un autre appareil ou après avoir vidé le navigateur.
//  Le compte est créé tout seul dès que le serveur est joignable.
// =====================================================================
const CLES = { progression: 'progression', classe: 'classe', grimoire: 'grimoire', survie: 'survie_record', pseudo: 'pseudo', zm: 'zoneMorteCompte', zmRecord: 'zoneMorteRecord', enquete: 'ombresBS', clans: 'clansProfil' };
const lireLocal = () => { try { return JSON.parse(localStorage.getItem('compte')) || {}; } catch { return {}; } };
const etat = lireLocal();
const garder = () => localStorage.setItem('compte', JSON.stringify(etat));

function collecter() {
  const j = (k) => { try { return JSON.parse(localStorage.getItem(k)); } catch { return null; } };
  return { progression: j(CLES.progression), classe: j(CLES.classe), grimoire: j(CLES.grimoire), survie: +(localStorage.getItem(CLES.survie) || 0), pseudo: localStorage.getItem(CLES.pseudo) || '',
    zm: localStorage.getItem(CLES.zm) || '', zmRecord: j(CLES.zmRecord), enquete: localStorage.getItem(CLES.enquete) || '', clans: localStorage.getItem(CLES.clans) || '' };
}

export function creerCompte(http) {
  const req = (method, url, body) => fetch(`${http}${url}`, { method, headers: { 'Content-Type': 'application/json' }, body: body && JSON.stringify(body), signal: AbortSignal.timeout(6000) })
    .then(async (r) => { const j = await r.json().catch(() => ({})); if (!r.ok) throw new Error(j.erreur || `erreur ${r.status}`); return j; });
  let enCours = null, dernier = '';

  const compte = {
    get code() { return etat.code || ''; },
    get maj() { return etat.maj || 0; },
    onChange: null,
    // Sauvegarde : crée le compte la première fois, n'envoie rien si rien n'a changé
    async sauvegarder() {
      if (enCours) return enCours;
      const contenu = collecter(), sig = JSON.stringify(contenu);
      if (etat.code && sig === dernier) return;
      enCours = (async () => {
        try {
          if (!etat.code) { const r = await req('POST', '/api/compte', contenu); etat.code = r.code; }
          else await req('PUT', `/api/compte/${etat.code}`, contenu);
          etat.maj = Date.now(); dernier = sig; garder(); compte.onChange?.();
        } catch (e) {
          if (/introuvable/i.test(e.message)) { delete etat.code; garder(); }   // compte effacé côté serveur : on en recrée un
          else console.warn('Sauvegarde du compte impossible :', e.message);
        } finally { enCours = null; }
      })();
      return enCours;
    },
    // Récupérer un compte depuis son code : remplace la progression de ce navigateur
    async recuperer(code) {
      code = String(code || '').trim().toUpperCase().replace(/[^A-Z0-9]/g, '');
      if (code.length !== 8) throw new Error('Le code fait 8 caractères (ex. K7QF-2XMB).');
      code = `${code.slice(0, 4)}-${code.slice(4)}`;
      const c = await req('GET', `/api/compte/${code}`);
      for (const [k, cle] of Object.entries(CLES)) {
        const v = c[k]; if (v == null || v === '') { if (k === 'zm') localStorage.removeItem(cle); continue; }
        localStorage.setItem(cle, typeof v === 'object' ? JSON.stringify(v) : String(v));
      }
      etat.code = code; etat.maj = c.maj || Date.now(); garder();
    },
  };
  // Sauvegarde automatique toutes les 2 min et quand on quitte la page
  setInterval(() => compte.sauvegarder(), 120000);
  addEventListener('pagehide', () => {
    if (!etat.code) return;
    try { fetch(`${http}/api/compte/${etat.code}`, { method: 'PUT', keepalive: true, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(collecter()) }); } catch { /* tant pis */ }
  });
  return compte;
}
