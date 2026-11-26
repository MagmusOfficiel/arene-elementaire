#!/usr/bin/env python3
"""Les Clans Élémentaires — tests de bout en bout dans un vrai navigateur.

Le script joue au jeu comme un joueur : il clique, marche, appuie sur E, ouvre les
fenêtres, et vérifie à chaque étape que le serveur a bien fait ce qu'il fallait.
C'est ce qui aurait attrapé le bug de la v43 (le deck et les améliorations ne
marchaient plus depuis l'interface, alors que les tests du serveur passaient).

Ce que ça couvre :
  1. création du personnage, guide ;
  2. tirage à l'autel, deck (retirer, ajouter), amélioration d'une carte, forge d'une relique ;
  3. parcelle (construction), quêtes, apparence (achat, porté) ;
  4. une expédition jouée à la souris jusqu'à la fin d'un combat ;
  5. l'arène contre un Reflet, et une coupure réseau en plein duel (reconnexion) ;
  6. deux joueurs : prise d'un sanctuaire et alerte chez le défenseur ;
  7. sur téléphone : joystick, fenêtres, combat ;
  et aucune erreur JavaScript nulle part.

Prérequis : `pip install playwright` puis `playwright install chromium`, et le jeu compilé
(`npm run build`). Lancer : `npm run test:clans` (ou python3 tests/clans_e2e.py).
Le serveur de test tourne sur son propre port avec un fichier de stats jetable, et des
réglages qui accélèrent les choses (profil de départ riche, capture rapide, Reflet en 1,5 s).
"""
import math, os, subprocess, sys, tempfile, time
from pathlib import Path
from playwright.sync_api import sync_playwright

RACINE = Path(__file__).resolve().parent.parent
PORT = 2597
URL = f'http://localhost:{PORT}/'
echecs, erreurs_js = [], []

def verifier(cond, msg):
    print(('  ✅ ' if cond else '  ❌ ') + msg)
    if not cond: echecs.append(msg)

courante = ['démarrage']
def etape(titre): courante[0] = titre; print(f'\n▶ {titre}')

def serveur():
    if not (RACINE / 'client/dist/index.html').exists():
        print('Le jeu n’est pas compilé : lance d’abord `npm run build`.'); sys.exit(2)
    env = {k: v for k, v in os.environ.items() if not k.startswith('UPSTASH')}
    env.update(PORT=str(PORT), CLANS_SECRET='test-e2e', ADMIN_CLE='test-admin', CLANS_TEST_DEPART='1', CLANS_TEST_MARCHAND='1', CLANS_CAPTURE_VITESSE='10', CLANS_ARENE_REFLET='1500',
               STATS_FILE=str(Path(tempfile.mkdtemp()) / 'stats.json'))
    pr = subprocess.Popen(['node', 'src/index.js'], cwd=RACINE / 'server', env=env, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL, start_new_session=True)
    for _ in range(60):
        try:
            import urllib.request; urllib.request.urlopen(URL, timeout=1); return pr
        except Exception: time.sleep(0.5)
    pr.kill(); print('Le serveur de test ne démarre pas.'); sys.exit(2)

def page(b, nom, mobile=False, nouveau=False):
    vp = {'width': 390, 'height': 844} if mobile else {'width': 1280, 'height': 760}
    ctx = b.new_context(viewport=vp, is_mobile=mobile, has_touch=mobile, device_scale_factor=2 if mobile else 1)
    pg = ctx.new_page(); pg.nom = nom
    pg.add_init_script('globalThis.__marchandToujours = true; globalThis.__pasDeCadeau = true; globalThis.__pasDeTuto = true')   # v74 : le marchand ne passe plus qu’une heure sur trois ; v93 : pas de cadeau du jour qui s’ouvre tout seul
    # v112 : le nouveau style est là par défaut ; les scénarios d'origine jouent dans l'ancien (toute l'interface visible d'emblée)
    if not nouveau: pg.add_init_script("try { localStorage.setItem('clansStyle', 'ancien') } catch (e) {}")
    pg.on('pageerror', lambda e: erreurs_js.append(f'{nom} : {e}'))
    pg.on('dialog', lambda d: d.accept())
    return pg

def creer(pg, nom, clan, classe):
    pg.goto(URL); pg.wait_for_selector('#ecranClan:not(.cache)', timeout=30000)
    pg.click(f'.clanCarte.{clan}'); pg.click(f'.classeCarte[data-c="{classe}"]'); pg.fill('#nomJoueur', nom); pg.click('#btCreer')
    pg.wait_for_selector('#ecranMonde:not(.cache)', timeout=60000); pg.wait_for_timeout(600)

def etat(pg, js): return pg.evaluate(f'(() => {{ const c = window.__clans, p = c.p; return {js}; }})()')

OX, OY = 640, 640   # v100 : l'ancien monde est décalé (désert à gauche, îles en haut) — voir shared/clans/decalage.js
def aller(pg, x, y, pas=60, ancien=True):
    """marcher jusqu'à (x, y) par petits pas (comme un joueur pressé, sans se téléporter) ; x, y dans l'ancien monde"""
    if ancien: x, y = x + OX, y + OY
    pg.bring_to_front()
    for _ in range(200):
        j = etat(pg, '({ x: c.monde.joueur.x, y: c.monde.joueur.y })'); d = math.hypot(x - j['x'], y - j['y'])
        if d < 4: break
        k = min(1, pas / d)
        pg.evaluate(f'(() => {{ const j = __clans.monde.joueur; j.x += {(x - j["x"]) * k}; j.y += {(y - j["y"]) * k}; }})()')
        pg.wait_for_timeout(140)
    pg.wait_for_timeout(300)

def fermer(pg):
    if pg.locator('#fenetre:not(.cache)').count(): pg.click('#btFermer'); pg.wait_for_timeout(250)

def jouer_combat(pg, max_tours=40):
    """joue le combat affiché à la souris, jusqu'à la fin ; renvoie True si la scène s'est fermée"""
    pg.wait_for_selector('#combat:not(.cache)', timeout=10000); pg.wait_for_timeout(1600)
    libre = "!document.getElementById('combat').classList.contains('attente') || document.getElementById('combat').classList.contains('cache')"
    for _ in range(max_tours):
        if pg.evaluate("document.getElementById('combat').classList.contains('cache')"): return True
        if pg.evaluate("document.getElementById('combat').classList.contains('finie')"): pg.wait_for_timeout(600); continue
        for _ in range(8):
            pg.wait_for_function(libre, timeout=20000)
            ok = pg.evaluate("(() => { const k = document.querySelector('#cbMain .carte:not(.injouable)'); if (!k) return false; k.click(); const e = document.querySelector('#cbEnnemis .ennemi.ciblable'); if (e) e.click(); return true; })()")
            pg.wait_for_timeout(120)
            if not ok: break
        pg.wait_for_function(libre, timeout=20000)
        if pg.evaluate("document.getElementById('combat').classList.contains('cache') || document.getElementById('combat').classList.contains('finie')"): continue
        pg.evaluate("document.getElementById('btFinTour').click()"); pg.wait_for_timeout(300); pg.wait_for_function(libre, timeout=25000)
    pg.wait_for_selector('#combat.cache', state='attached', timeout=15000)
    return True

def scenario(b):
    A = page(b, 'Testeur')

    etape('Création du personnage')
    creer(A, 'Testeur', 'feu', 'mage')
    verifier(etat(A, 'p.clan') == 'feu' and etat(A, 'p.classe') == 'mage', 'profil créé par le serveur (Feu, Mage)')
    verifier('1 / 6' in A.inner_text('#guideEtape'), 'le guide démarre à l’étape 1')

    etape('Tirage à l’autel')
    aller(A, 1608, 1150); A.keyboard.press('e'); A.wait_for_selector('#bt1', timeout=5000)
    e0, n0 = etat(A, 'p.ress.essence'), etat(A, 'Object.keys(p.collection).length')
    A.click('#bt1'); A.wait_for_function(f'__clans.p.ress.essence < {e0}', timeout=8000)
    verifier(etat(A, 'p.ress.essence') == e0 - 100, 'tirer ×1 coûte 100 essences')
    verifier(etat(A, 'p.tirages.total') >= 1, 'le tirage est compté')
    A.click('#bt10'); A.wait_for_function(f'__clans.p.ress.essence <= {e0 - 1000}', timeout=8000)
    verifier(etat(A, 'Object.keys(p.collection).length') > n0, 'de nouvelles cartes dans la collection')

    etape('Forge d’une relique')
    fab = A.locator('[data-fab]:not([disabled])').first
    if fab.count():
        rel = fab.get_attribute('data-fab'); fab.click()
        A.wait_for_function(f"(__clans.p.collection['{rel}']?.n || 0) > 0", timeout=8000)
        verifier(True, f'relique forgée : {rel}')
    else: verifier(False, 'un bouton de forge disponible')
    fermer(A)

    etape('Plusieurs decks')
    A.click('#btDeck'); A.wait_for_selector('[data-deck="1"]', timeout=5000)
    d0 = etat(A, 'p.deck.length')
    A.click('[data-deck="1"]'); A.wait_for_function('__clans.p.decks?.actif === 1', timeout=8000)
    A.locator('[data-a]:not([disabled])').first.click(); A.wait_for_function(f'__clans.p.deck.length === {d0 + 1}', timeout=8000)   # v91 : 20 cartes au moins, on en ajoute une
    A.click('[data-deck="0"]'); A.wait_for_function(f'__clans.p.decks.actif === 0 && __clans.p.deck.length === {d0}', timeout=8000)
    verifier(True, 'deux decks différents, on passe de l’un à l’autre en un clic')
    A.click('[data-ren="0"]'); A.fill('.champDeck', 'Mon deck test'); A.keyboard.press('Enter')
    A.wait_for_function("__clans.p.decks.l[0].nom === 'Mon deck test'", timeout=8000)
    verifier(True, 'un deck renommé')

    etape('Deck : retirer, ajouter, améliorer')
    A.wait_for_timeout(400)
    d0 = etat(A, 'p.deck.length')
    A.locator('[data-a]:not([disabled])').first.click(); A.wait_for_function(f'__clans.p.deck.length === {d0 + 1}', timeout=8000)
    A.wait_for_timeout(300); A.locator('[data-r]:not([disabled])').first.click(); A.wait_for_function(f'__clans.p.deck.length === {d0}', timeout=8000)
    verifier(True, 'une carte retirée du deck (bug de la v43 corrigé)')
    verifier(True, 'une carte ajoutée au deck')
    A.wait_for_timeout(300)
    up = A.locator('[data-u]:not([disabled])').first
    if up.count():
        up = A.locator('[data-u].pret').first if A.locator('[data-u].pret').count() else up
        cid = up.get_attribute('data-u'); niv = etat(A, f"p.collection['{cid}'].niv"); up.click()
        A.wait_for_selector('.panneauAm .changements', timeout=5000)
        verifier(A.locator('.panneauAm .avantApres .carte').count() == 2 and A.locator('.panneauAm .changements li').count() >= 1, 'le panneau montre la carte avant / après et ce qui change')
        A.click('#btAmeliorer'); A.wait_for_function(f"__clans.p.collection['{cid}'].niv > {niv}", timeout=8000)
        verifier(True, f'carte améliorée : {cid} niveau {niv} → {niv + 1}')
        A.click('.fermerAm'); A.wait_for_timeout(300)
    else: verifier(False, 'un bouton d’amélioration disponible')
    fermer(A)

    etape('Parcelle')
    m = etat(A, 'c.monde.maison()'); aller(A, m['x'], m['y'] + 30, ancien=False); A.keyboard.press('e'); A.wait_for_selector('[data-b]', timeout=5000)
    niv = etat(A, 'p.parcelle.maison'); A.click('[data-b="maison"]')
    A.wait_for_function(f'__clans.p.parcelle.maison > {niv}', timeout=8000)
    verifier(True, f'maison améliorée au niveau {niv + 1}')
    fermer(A)

    etape('Projet de clan')
    aller(A, 648, 1600); A.keyboard.press('e'); A.wait_for_selector('[data-don]', timeout=5000)
    verifier('Forge géante' in A.inner_text('#fenetreCorps'), 'la fenêtre du projet de la Forge géante s’ouvre')
    b0 = etat(A, 'p.ress.braises'); A.click('[data-don="5"]')
    A.wait_for_function(f'__clans.p.ress.braises === {b0 - 200}', timeout=8000)
    verifier(etat(A, 'p.projet.pts') == 200, 'le don de 200 braises compte 200 points')
    A.wait_for_function("(document.querySelector('.projetBarre b')?.textContent || '').startsWith('200')", timeout=6000)
    verifier(True, 'la barre du projet est mise à jour par le serveur')
    fermer(A)

    etape('Marchand ambulant')
    m = etat(A, '({ x: c.monde.marchand.x, y: c.monde.marchand.y, slot: c.monde.marchand.slot })')
    aller(A, m['x'], m['y'] + 20, ancien=False); A.keyboard.press('e'); A.wait_for_selector('[data-offre]', timeout=5000)
    verifier(A.locator('.offre').count() == 3, 'le marchand propose 3 échanges')
    A.click('[data-offre="0"]'); A.wait_for_function(f"__clans.p.marchand?.slot === {m['slot']} && __clans.p.marchand.l.includes(0)", timeout=8000)
    verifier(A.locator('.offre.prise').count() == 1, 'un échange conclu, il ne se refait pas avant le prochain passage')
    fermer(A)

    etape('Quêtes et apparence')
    A.keyboard.press('j'); A.wait_for_timeout(400)
    verifier(A.locator('.quete').count() >= 6, 'la fenêtre des quêtes s’ouvre (3 du jour + bonus + 2 de la semaine)')
    fermer(A)
    A.click('#btMenu'); A.click('#btApparence'); A.wait_for_timeout(400); A.click('.garde .onglets button[data-o="chapeau"]'); A.wait_for_timeout(300)
    A.click('[data-acheter="h_paille"]'); A.wait_for_function("__clans.AP.code(__clans.p).includes('h_paille')", timeout=8000)
    verifier(True, 'chapeau de paille acheté et porté')
    A.click('.garde .onglets button[data-o="tenue"]'); A.wait_for_timeout(300); A.click('[data-acheter="t_nuit"]')
    A.wait_for_function("__clans.AP.code(__clans.p).startsWith('t_nuit')", timeout=8000)
    verifier(True, 'tenue « Nuit » achetée et portée')
    fermer(A)

    etape('Familier')
    A.keyboard.press('f'); A.wait_for_selector('[data-fab="salamandre"]', timeout=5000)
    A.click('[data-fab="salamandre"]'); A.wait_for_function("__clans.p.familiers?.actif === 'salamandre'", timeout=8000)
    verifier(True, 'une Salamandre fabriquée, elle suit le joueur')
    verifier(A.locator('.fam.actif').count() == 1, 'la fenêtre la montre comme active')
    fermer(A)

    etape('Expédition jouée à la souris')
    aller(A, 296, 1925); A.keyboard.press('e'); A.wait_for_selector('[data-p="1"]', timeout=5000)
    A.click('[data-p="1"]'); A.wait_for_selector('.salle.possible', timeout=8000)
    verifier(etat(A, 'p.expedition?.palier') == 1, 'expédition commencée (palier I)')
    v0 = etat(A, 'p.stats.combats')
    verifier(etat(A, 'p.expedition?.familier') == 'salamandre', 'le familier part en expédition')
    A.locator('.salle.possible').first.click(force=True)
    A.wait_for_selector('#combat:not(.cache)', timeout=10000)
    verifier(A.locator('#cbFam:not(.cache)').count() == 1 and etat(A, 'c.combat.ennemis.every((e) => e.brulure >= 2)'), 'la Salamandre est dans le combat et brûle les ennemis')
    A.wait_for_timeout(1200); vu = False
    for i in range(A.locator('#cbMain .carte').count()):
        A.hover(f'#cbMain .carte[data-i="{i}"]'); A.wait_for_timeout(150)
        if A.locator('#combat .apercu').count(): vu = True; break
    verifier(vu, 'au survol d’une carte, l’aperçu de ses effets réels s’affiche')
    A.mouse.move(5, 5); A.wait_for_timeout(150)
    verifier(A.locator('#combat .apercu').count() == 0, 'l’aperçu disparaît quand la souris quitte la carte')
    jouer_combat(A)
    A.wait_for_function(f'__clans.p.stats.combats > {v0}', timeout=10000)
    verifier(True, 'le combat est fini et validé par le serveur (le serveur a rejoué les coups)')
    if A.locator('#btAbandon').count():
        A.click('#btAbandon'); A.wait_for_function('!__clans.p.expedition', timeout=8000); verifier(True, 'expédition abandonnée proprement')
    fermer(A)

    etape('Grimoire')
    nb = etat(A, 'Object.keys(p.grimoire?.b || {}).length')
    verifier(nb >= 1 or etat(A, 'p.stats.victoires') == 0, f'le bestiaire a noté les monstres vaincus ({nb})')
    A.click('#btMenu'); A.click('#btGrimoire'); A.wait_for_selector('.grCartes', timeout=5000)
    verifier(A.locator('.grCartes .carte:not(.grInconnue)').count() >= 10 and A.locator('.grInconnue').count() > 10, 'le grimoire montre les cartes connues et cache les autres')
    A.click('[data-o="bestiaire"]'); A.wait_for_selector('.bestiaire', timeout=3000)
    verifier(A.locator('.bete').count() == 14 and A.locator('.bete:not(.inconnue)').count() == nb, 'le bestiaire montre les 14 monstres de la terre, dont ceux vaincus')
    A.click('[data-o="recompenses"]'); A.wait_for_selector('.grRec', timeout=3000)
    verifier(A.locator('.grRec').count() >= 14, 'les récompenses du grimoire sont listées')
    fermer(A)

    etape('Passe de saison')
    xp = etat(A, 'p.passe?.xp || 0')
    verifier(xp > 0, f'les activités ont rapporté de l’XP au passe ({xp} XP)')
    A.keyboard.press('p'); A.wait_for_selector('.passePiste', timeout=5000)
    verifier(A.locator('.pnv').count() == 30 and A.locator('.passeExclu .piece').count() == 3, 'la fenêtre montre les 30 niveaux et les 3 apparences exclusives')
    fermer(A)

    etape('Arène contre un Reflet, et coupure réseau en plein duel')
    A.click('#btMenu'); A.click('#btArene'); A.wait_for_timeout(500); A.click('#btFile')
    A.wait_for_selector('#duel:not(.cache)', timeout=15000)
    verifier('Arène' in A.inner_text('#duTitre'), 'un adversaire est trouvé (Reflet)')
    A.wait_for_timeout(2000)
    sid = etat(A, 'c.room.sessionId')
    # on note si le bandeau « connexion perdue » apparaît (la reconnexion peut être très rapide)
    A.evaluate("window.__vuReseau = false; new MutationObserver(() => { if (!document.getElementById('reseau').classList.contains('cache')) window.__vuReseau = true; }).observe(document.getElementById('reseau'), { attributes: true })")
    A.evaluate('__clans.room.connection.transport.ws.close(4999)')   # coupure brutale
    A.wait_for_function('window.__vuReseau', timeout=5000)
    verifier(True, 'le bandeau « connexion perdue » s’affiche')
    A.wait_for_selector('#reseau.cache', state='attached', timeout=25000); A.wait_for_timeout(800)
    verifier(etat(A, 'c.room?.sessionId') == sid, 'reconnecté à la même place (même session)')
    verifier(A.locator('#duel:not(.cache)').count() == 1, 'le duel continue après la coupure')
    elo0 = etat(A, 'p.arene?.elo ?? 1000')
    A.evaluate("document.getElementById('btDuelAbandon').click()")
    A.wait_for_selector('#btRejouer', timeout=10000)
    verifier(etat(A, 'p.arene.elo') < elo0, 'l’abandon fait perdre de l’Elo')
    fermer(A)

    etape('Deux joueurs : sanctuaire et alerte')
    B = page(b, 'Pyro'); creer(B, 'Pyro', 'feu', 'combattant')
    C = page(b, 'Ondine'); creer(C, 'Ondine', 'eau', 'tireur')
    aller(C, 1112, 1730)
    C.wait_for_function("document.getElementById('chatMsgs').innerText.includes('s’empare du Sanctuaire des Cendres') || document.getElementById('chatMsgs').innerText.includes(\"s'empare du Sanctuaire des Cendres\")", timeout=15000)
    verifier(True, 'l’Eau prend le Sanctuaire des Cendres (au Feu)')
    B.bring_to_front()
    verifier('attaque le Sanctuaire des Cendres' in B.inner_text('#chatMsgs'), 'le Feu a été prévenu de l’attaque')

    etape('Fiche de joueur et hauts faits')
    A.bring_to_front(); A.keyboard.press('h'); A.wait_for_selector('.hautsFaits', timeout=5000)
    t = A.evaluate("(() => { const s = document.querySelector('[data-hf]'); return s ? s.querySelector('option[value*=\":\"]')?.value : null; })()")
    verifier(t is not None, f'Testeur a déjà un haut fait ({t})')
    A.select_option(f'select[data-hf="{t.split(":")[0]}"]', t)
    A.wait_for_function(f"__clans.p.titre === '{t}'", timeout=8000)
    verifier(True, 'il choisit son titre')
    fermer(A)
    B.bring_to_front(); B.wait_for_timeout(1500)
    B.locator('#listeClans [data-fiche]', has_text='Testeur').first.click(); B.wait_for_selector('.titreFi .titreBadge', timeout=8000)
    verifier('Testeur' in B.inner_text('#fenetreCorps') and len(B.inner_text('.titreFi .titreBadge')) > 3, 'un autre joueur voit sa fiche et son titre')
    fermer(B)

    etape('Expédition en groupe')
    B.bring_to_front(); aller(B, 326, 1850); D = page(b, 'Ami'); creer(D, 'Ami', 'feu', 'mage'); aller(D, 356, 1850); B.wait_for_timeout(1500)
    B.bring_to_front(); B.evaluate("__clans.fenetreExpedition('feu')"); B.wait_for_selector('[data-inviter]:has-text("Ami")', timeout=8000)
    B.click('[data-inviter]:has-text("Ami")'); D.wait_for_selector('#invitationGroupe', timeout=8000); D.click('#invitationGroupe [data-rep="1"]')
    B.wait_for_function("document.querySelectorAll('.membresGroupe .membre').length === 2", timeout=8000)
    verifier(True, 'Ami accepte l’invitation de Pyro')
    B.click('[data-p="1"]')
    for pg in (B, D): pg.wait_for_function("__clans.p.expedition?.groupe", timeout=8000)
    verifier(etat(B, 'p.expedition.graine') == etat(D, 'p.expedition.graine'), 'le groupe part sur la même carte')
    B.wait_for_selector('.salle.possible', timeout=8000); B.locator('.salle.possible').first.click(force=True)
    for pg in (B, D): pg.wait_for_selector('#combat:not(.cache)', timeout=10000)
    verifier(True, 'le chef choisit la salle : les deux combattent')
    for pg in (B, D): pg.bring_to_front(); jouer_combat(pg)
    B.wait_for_timeout(1500)
    verifier(etat(B, 'p.expedition?.position') == etat(D, 'p.expedition?.position'), 'ils avancent ensemble')
    D.evaluate("__clans.act('expeAbandon', {})"); B.wait_for_function("!__clans.p.expedition?.groupe", timeout=8000)
    verifier(True, 'quand Ami part, Pyro continue seul')
    B.evaluate("__clans.act('expeAbandon', {})"); B.wait_for_timeout(500); fermer(B); fermer(D)

    etape('Sur téléphone')
    T = page(b, 'Mobile', mobile=True); creer(T, 'Mobile', 'plante', 'escrimeur')
    verifier(T.locator('#tactile:not(.cache)').count() == 1, 'les commandes tactiles s’affichent')
    x0 = etat(T, 'c.monde.joueur.x')
    box = T.locator('#joy').bounding_box(); cx, cy = box['x'] + box['width'] / 2, box['y'] + box['height'] / 2
    T.mouse.move(cx, cy); T.mouse.down(); T.mouse.move(cx + 50, cy, steps=4); T.wait_for_timeout(900); T.mouse.up()
    verifier(etat(T, 'c.monde.joueur.x') > x0 + 40, 'le joystick fait marcher le personnage')
    T.click('#btQuetes'); T.wait_for_timeout(400); verifier(T.locator('.quete').count() >= 6, 'fenêtre des quêtes sur téléphone'); fermer(T)
    T.evaluate("__clans.act('expeCommencer', { terr: 'plante', palier: 1 })"); T.wait_for_timeout(500); T.reload()
    T.wait_for_selector('.salle.possible', timeout=30000); T.locator('.salle.possible').first.click(force=True)
    jouer_combat(T)
    verifier(etat(T, 'p.stats.combats') >= 1, 'un combat joué jusqu’au bout sur téléphone')

    etape('Nouveau style (v112) : accueil et interface progressive')
    N = page(b, 'Neuf', nouveau=True)
    N.goto(URL); N.wait_for_selector('#accueil2:not(.cache)', timeout=30000)
    verifier(N.locator('#ecranClan .creation').is_hidden(), 'l’ancien écran de création est caché')
    N.click('#a2Jouer'); verifier(N.locator('#a2Go').is_disabled(), '« Jouer » attend le choix du clan')
    N.click('.a2Clan.eau'); verifier(N.locator('.a2Classe.choisi[data-c="mage"]').count() == 1, 'la classe de l’illustration est déjà choisie')
    verifier(len(N.input_value('#a2Nom')) >= 3, 'un nom est déjà rempli')
    N.click('.a2Classe[data-c="escrimeur"]'); N.fill('#a2Nom', 'Neuf'); N.click('#a2Go')
    N.wait_for_selector('#ecranMonde:not(.cache)', timeout=60000); N.wait_for_timeout(800)
    verifier(etat(N, '[p.clan, p.classe, p.nom].join()') == 'eau,escrimeur,Neuf', 'personnage créé en un écran')
    verifier(N.locator('#btDeck').is_hidden() and N.locator('#btQuetes').is_hidden() and N.locator('#btMenu').is_visible(), 'au début, seul le menu est en haut')
    verifier('Objectif' in N.inner_text('#guideEtape'), 'le guide montre un objectif')
    z0 = N.evaluate("document.getElementById('monde').width"); N.click('#btZoomPlus'); N.wait_for_timeout(200)
    verifier(N.evaluate("+localStorage.getItem('clansZoom')") == 1, 'le bouton ＋ zoome la carte, réglage gardé (v118)'); N.click('#btZoomMoins')
    N.evaluate("__clans.act('expeCommencer', { terr: 'eau', palier: 1 })"); N.wait_for_timeout(500); N.reload()
    N.wait_for_selector('.salle.possible', timeout=30000); N.locator('.salle.possible').first.click(force=True)
    N.wait_for_selector('#combat:not(.cache)', timeout=15000); N.wait_for_timeout(800)
    verifier(N.locator('#cbHeros .portraitH[data-clan="eau"]').is_visible() and N.locator('#cbSprite').is_hidden(), 'en combat, le héros est un portrait illustré (v114)')
    verifier('heros/eau_escrimeur.webp' in N.get_attribute('#cbHeros .portraitH', 'style'), 'avec le portrait de sa classe : Escrimeur de l’Eau (v115)')
    verifier(N.evaluate("fetch('/clans/heros/eau_escrimeur.webp').then(r => r.ok)"), 'l’image du portrait est bien servie')
    verifier(N.evaluate("Promise.all(['feu','eau','plante'].flatMap(c => ['gardien','berserker','archimage','invocateur','sniper','artificier','duelliste','ombre'].map(b => fetch(`/clans/heros/${c}_${b}.webp`).then(r => r.ok)))).then(l => l.every(Boolean))"), 'les 24 portraits des classes avancées sont servis (v116)')
    N.evaluate("__clans.act('expeAbandon', {})"); N.wait_for_timeout(500); N.reload(); N.wait_for_selector('#ecranMonde:not(.cache)', timeout=60000); N.wait_for_timeout(600)
    N.evaluate("document.getElementById('btMenu').click(); document.getElementById('btAide').click()"); N.wait_for_timeout(400)
    N.keyboard.press('Backspace'); N.wait_for_timeout(300)
    verifier(N.locator('#fenetre.cache').count() == 1, 'Retour arrière ferme une fenêtre (Échap quitte le plein écran sur CrazyGames) (v117)')
    N.click('#btMenu'); verifier('Ancien style' in N.inner_text('#btStyle'), 'le menu propose de revenir à l’ancien style')

    etape('Panneau admin des joueurs (v112)')
    Ad = page(b, 'Admin'); Ad.goto(URL + 'clans/admin-joueurs.html')
    Ad.fill('#cle', 'mauvaise'); Ad.click('#btCharger'); Ad.wait_for_timeout(600)
    verifier('Clé incorrecte' in Ad.inner_text('#liste'), 'une mauvaise clé est refusée')
    Ad.fill('#cle', 'test-admin'); Ad.click('#btCharger'); Ad.wait_for_selector('.ligneJ', timeout=8000)
    Ad.fill('#recherche', 'Neuf'); Ad.wait_for_timeout(900)
    verifier(Ad.locator('.ligneJ').count() == 1 and Ad.locator('.ligneJ .pt.on').count() == 1, 'la recherche trouve « Neuf », en ligne')
    Ad.click('.ligneJ'); Ad.wait_for_selector('#btAppliquer', timeout=5000)
    e0 = etat(N, 'p.ress.essence')
    Ad.fill('#niv', '30'); Ad.click('[data-v="essence:1000"]'); Ad.fill('#message', 'Cadeau de test'); Ad.click('#btAppliquer')
    Ad.wait_for_selector('#retour.ok', timeout=5000)
    N.wait_for_function('__clans.P.niveau(__clans.p) === 30', timeout=5000)
    verifier(etat(N, 'p.ress.essence') == e0 + 1000, 'le joueur connecté reçoit 1 000 essences tout de suite')
    verifier(etat(N, 'c.P.niveau(p)') == 30, 'et passe au niveau 30')
    verifier('Cadeau de test' in N.inner_text('#chatMsgs'), 'avec un message dans le chat')
    Ad.click('input[name=mode][value=fixer]'); Ad.fill('input[data-k="eclats"]', '7'); Ad.click('#btAppliquer'); Ad.wait_for_timeout(800)
    verifier(etat(N, 'p.ress.eclats') == 7, 'fixer une ressource à une valeur exacte')
    N.close(); Ad.wait_for_timeout(22000)   # la place est gardée 20 s après une coupure
    Ad.click('#btCharger'); Ad.wait_for_timeout(900); Ad.click('.ligneJ'); Ad.wait_for_selector('#btAppliquer', timeout=5000)
    Ad.click('input[name=mode][value=ajouter]'); Ad.fill('input[data-k="essence"]', '-500'); Ad.click('#btAppliquer'); Ad.wait_for_selector('#retour.ok', timeout=5000)
    verifier('hors ligne' in Ad.inner_text('#retour'), 'un joueur hors ligne est modifié dans sa sauvegarde')
    jet = Ad.get_attribute('.ligneJ', 'data-j')
    ess = Ad.evaluate(f"fetch('/api/clans/admin/joueur/{jet}', {{ headers: {{ 'x-admin-cle': 'test-admin' }} }}).then(r => r.json()).then(j => j.ress.essence)")
    verifier(ess == e0 + 500, f'retirer des ressources avec un nombre négatif ({ess})')


def main():
    srv = serveur()
    try:
        with sync_playwright() as pw:
            b = pw.chromium.launch()
            try: scenario(b)
            except Exception as e:
                # une étape bloquée (bouton qui ne répond pas, état qui n'arrive jamais…) : on dit laquelle, sans trace Python
                print(f'  ❌ bloqué : {str(e).splitlines()[0][:160]}'); print('     ' + '\n     '.join(str(e).splitlines()[1:8])) if os.environ.get('DETAIL') else None; echecs.append(f'étape « {courante[0]} » bloquée')
            b.close()
    finally:
        os.killpg(os.getpgid(srv.pid), 15)

    print()
    for e in erreurs_js: print(f'  ❌ erreur JavaScript — {e}')
    total = len(echecs) + len(erreurs_js)
    print('\n' + ('✅ Tout est bon.' if not total else f'❌ {total} problème(s).'))
    sys.exit(1 if total else 0)

if __name__ == '__main__':
    main()
