// v106 — intégration CrazyGames (SDK HTML5 v3).
// Le SDK n'est chargé que sur CrazyGames (ou avec ?crazygames=1 pour tester) : ailleurs, rien ne change.
// - gameplayStart / gameplayStop : quand le joueur entre dans le monde / revient à l'écran de création
// - loadingStart / loadingStop : pendant la connexion et la préparation de la carte
// - settings.disableChat : on cache le chat des joueurs (les messages du jeu restent)
// - settings.muteAudio : le son est coupé, et le bouton du jeu ne peut pas le remettre
import { forcerMuet } from '../sfx.js';
import { langueSuggeree } from './i18n.js';

const q = new URLSearchParams(location.search);
const surCG = import.meta.env.VITE_CRAZYGAMES === '1' || q.has('crazygames') || /crazygames|1001juegos/.test(location.hostname) || /crazygames/.test(document.referrer);
let sdk = null, enJeu = false, enChargement = false;
const reglages = { disableChat: false, muteAudio: false };
// v110 : multijoueur — l'ami qui nous a invité (paramètre du lien), et ceux qui veulent savoir quand on rejoint
let amiInvite = null, instantane = false, pseudoCG = null, salleActuelle = '';
const rejoindre = [];
const ecouteurs = [];

function appliquer(s) {
  if (!s) return;
  reglages.disableChat = !!s.disableChat; reglages.muteAudio = !!s.muteAudio;
  forcerMuet(reglages.muteAudio); document.body.dataset.cgMuet = reglages.muteAudio ? '1' : '0';
  document.body.classList.toggle('sansChat', reglages.disableChat);
  for (const f of ecouteurs) f(reglages);
}
const sur = (f) => { if (!sdk || sdk.environment === 'disabled') return; try { f(sdk); } catch { /* le SDK ne doit jamais casser le jeu */ } };

export const cg = {
  get actif() { return !!sdk && sdk.environment !== 'disabled'; },
  get chatCoupe() { return reglages.disableChat; },
  onReglages(f) { ecouteurs.push(f); },
  // pour l'anglais (v107+) : la langue du joueur selon CrazyGames, sinon celle du navigateur
  get langue() { return (sdk?.user?.systemInfo?.locale || navigator.language || 'en').slice(0, 2).toLowerCase(); },
  chargementDebut() { if (enChargement) return; enChargement = true; sur((s) => s.game.loadingStart()); },
  chargementFin() { if (!enChargement) return; enChargement = false; sur((s) => s.game.loadingStop()); },
  jeuDebut() { cg.chargementFin(); if (enJeu) return; enJeu = true; sur((s) => s.game.gameplayStart()); },
  jeuFin() { if (!enJeu) return; enJeu = false; sur((s) => s.game.gameplayStop()); },
  // ---- v110 : multijoueur ----
  get instantane() { return instantane; },
  get pseudo() { return pseudoCG; },
  prendreAmi() { const a = amiInvite; amiInvite = null; return a; },   // l'ami du lien (une seule fois)
  onRejoindre(f) { rejoindre.push(f); },                                  // un lien cliqué alors que le jeu est déjà ouvert
  // le « salon » du joueur = son groupe d'expédition ; joignable s'il reste de la place
  salle({ id, ami, joignable }) {
    const cle = `${id}|${ami}|${joignable}`; if (cle === salleActuelle) return; salleActuelle = cle;
    sur((s) => {
      s.game.updateRoom?.({ roomId: id, isJoinable: !!joignable, inviteParams: { ami } });
      if (joignable) s.game.showInviteButton?.({ ami }); else s.game.hideInviteButton?.();
    });
  },
  quitterSalle() { salleActuelle = ''; sur((s) => { s.game.hideInviteButton?.(); s.game.leftRoom?.(); }); },
  lien(ami) { let l = null; sur((s) => { l = s.game.inviteLink({ ami }); }); return l; },
};

export const pret = !surCG ? Promise.resolve() : new Promise((ok) => {
  const sc = document.createElement('script');
  sc.src = 'https://sdk.crazygames.com/crazygames-sdk-v3.js';
  sc.onload = async () => {
    try {
      await window.CrazyGames.SDK.init();
      sdk = window.CrazyGames.SDK;
      if (sdk.environment !== 'disabled') {
        appliquer({ ...sdk.game.settings, ...(q.get('disableChat') === 'true' ? { disableChat: true } : {}), ...(q.get('muteAudio') === 'true' ? { muteAudio: true } : {}) });
        sdk.game.addSettingsChangeListener(appliquer);
        // v110 : arrivé par le lien d'un ami ? (et le cas où on clique un lien alors que le jeu est déjà ouvert)
        try { amiInvite = sdk.game.getInviteParam?.('ami') || sdk.game.inviteParams?.ami || null; } catch { amiInvite = null; }
        instantane = !!sdk.game.isInstantMultiplayer;
        try { sdk.game.addJoinRoomListener?.((x) => { const a = x?.ami || x?.inviteParams?.ami; if (a) { amiInvite = a; for (const f of rejoindre) f(); } }); } catch { /* pas de rejoindre en cours de partie */ }
        // le pseudo CrazyGames (il doit apparaître dans le jeu : on le propose comme nom de héros)
        try { const u = await sdk.user?.getUser?.(); pseudoCG = u?.username || null; } catch { pseudoCG = null; }
        langueSuggeree(sdk.user?.systemInfo?.locale || navigator.language);   // v107 : la langue du joueur selon CrazyGames
      }
    } catch { sdk = null; }
    ok();
  };
  sc.onerror = () => ok();
  document.head.append(sc);
  setTimeout(ok, 4000);   // le SDK injoignable ne bloque jamais le jeu
});
window.__cg = cg;
