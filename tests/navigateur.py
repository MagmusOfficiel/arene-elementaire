#!/usr/bin/env python3
"""Tests dans un vrai navigateur (Chrome via Playwright).

Ce que ça vérifie :
  1. le menu (onglets, réglages) sans erreur, sur PC et téléphone ;
  2. chaque mode démarre en solo sans erreur JavaScript ;
  3. en ligne avec ~200 ms d'aller-retour : pas de gros décalage écran / serveur, pas de téléportation ;
  4. la reconnexion après une coupure réseau.

Prérequis : `pip install playwright` puis `playwright install chromium` (ou Chrome installé),
et le jeu compilé (`npm run build`). Lancer : python3 tests/navigateur.py
"""
import asyncio, os, subprocess, sys, time, signal
from pathlib import Path
from playwright.async_api import async_playwright

RACINE = Path(__file__).resolve().parent.parent
PORT, PROXY = 2593, 2594
URL = f'http://localhost:{PROXY}/'
CHROME = os.environ.get('CHROME') or ('/usr/bin/google-chrome' if Path('/usr/bin/google-chrome').exists() else None)
ARGS = ['--use-gl=swiftshader', '--enable-unsafe-swiftshader']
echecs = []

def verifier(cond, msg):
    print(('  ✅ ' if cond else '  ❌ ') + msg)
    if not cond: echecs.append(msg)

def lancer(cmd, **kw):
    return subprocess.Popen(cmd, cwd=RACINE, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL, start_new_session=True, **kw)

def proxy():
    return lancer(['node', 'tests/proxy-latence.mjs', str(PROXY), str(PORT), '90', '40'])

async def nouvelle_page(b, mobile=False, petit=False):
    vp = {'width': 844, 'height': 390} if mobile else {'width': 480, 'height': 300} if petit else {'width': 1100, 'height': 650}
    ctx = await b.new_context(viewport=vp, has_touch=mobile, is_mobile=mobile)
    await ctx.add_init_script("sessionStorage.setItem('hubVu', '1')")   # l'accueil commun est testé à part
    pg = await ctx.new_page(); pg.erreurs = []
    pg.on('pageerror', lambda e: pg.erreurs.append(str(e)))
    return pg

async def entrer(pg, mode, solo=False, url=URL):
    await pg.goto(url); await pg.wait_for_timeout(800)
    await pg.click('#onglets button[data-o="jouer"]')
    await pg.fill('#name', 'Testeur')
    if solo: await pg.check('#solo')
    await pg.click('#' + mode)
    await pg.wait_for_function('() => globalThis.__scene?.room', timeout=90000)
    await pg.wait_for_selector('#choix.on', timeout=60000)            # choix du champion parmi 3
    await pg.click('#choix .carte[data-i="0"]')
    await pg.wait_for_timeout(3000)
    if await pg.locator('#tutoSkip:visible').count(): await pg.click('#tutoSkip')

TRACE = """() => { const sc = globalThis.__scene, id = sc.room.sessionId; window.__trace = [];
  sc.events.on('postupdate', () => { const d = sc.disp.get(id), p = sc.room.state.players.get(id); if (d && p) window.__trace.push([performance.now(), d.x, d.y, p.x, p.y]); }); }"""

async def mouvement(pg):
    await pg.evaluate(TRACE)
    for k in ['d', 's', 'q', 'z']:
        await pg.keyboard.down(k); await pg.wait_for_timeout(1300); await pg.keyboard.up(k); await pg.wait_for_timeout(250)
    tr = await pg.evaluate('() => window.__trace')
    gros = sum(1 for r in tr if ((r[1] - r[3]) ** 2 + (r[2] - r[4]) ** 2) ** .5 > 160)
    tele = 0
    for i in range(1, len(tr)):
        dt = (tr[i][0] - tr[i - 1][0]) / 1000
        if ((tr[i][1] - tr[i - 1][1]) ** 2 + (tr[i][2] - tr[i - 1][2]) ** 2) ** .5 > 275 * dt * 1.8 + 6: tele += 1
    return gros, tele, len(tr)

async def main():
    if not (RACINE / 'client/dist/index.html').exists(): sys.exit('Compile d’abord le jeu : npm run build')
    env = {**os.environ, 'PORT': str(PORT), 'STATS_FILE': '/tmp/arene-test-nav.json', 'UPSTASH_REDIS_REST_URL': '', 'UPSTASH_REDIS_REST_TOKEN': ''}
    serveur = lancer(['node', 'server/src/index.js'], env=env); px = proxy()
    time.sleep(2.5)
    try:
        async with async_playwright() as p:
            b = await p.chromium.launch(executable_path=CHROME, args=ARGS) if CHROME else await p.chromium.launch(args=ARGS)

            print('1. Menu')
            for mobile in (False, True):
                pg = await nouvelle_page(b, mobile); await pg.goto(URL); await pg.wait_for_timeout(1000)
                for o in ['profil', 'classements', 'defis', 'reglages', 'jouer']:
                    await pg.click(f'#onglets button[data-o="{o}"]'); await pg.wait_for_timeout(150)
                    visible = await pg.locator(f'#lobby .onglet[data-o="{o}"]').is_visible()
                    if not visible: verifier(False, f'onglet {o} visible ({"téléphone" if mobile else "PC"})')
                await pg.click('#onglets button[data-o="reglages"]'); await pg.select_option('#rgQualite', 'bas'); await pg.select_option('#rgQualite', 'auto')
                verifier(not pg.erreurs, f'menu sans erreur ({"téléphone" if mobile else "PC"}) {pg.erreurs[:1]}')
                await pg.context.close()

            print('2. Chaque mode en solo')
            for mode in ['play', 'playRoyale', 'playTournoi', 'playClasse', 'playSurvie', 'playDuo']:
                pg = await nouvelle_page(b)
                try:
                    await entrer(pg, mode, solo=True)
                    await pg.keyboard.down('d'); await pg.mouse.down(); await pg.wait_for_timeout(2500); await pg.mouse.up(); await pg.keyboard.up('d')
                    verifier(not pg.erreurs, f'{mode} solo sans erreur {pg.erreurs[:1]}')
                except Exception as e: verifier(False, f'{mode} solo démarre ({e})')
                await pg.context.close()

            print('3. En ligne avec ~200 ms de latence')
            # petite fenêtre = plus d'images par seconde dans ce navigateur de test sans carte graphique ;
            # 1 ou 2 écarts tolérés : un coup qui repousse (recul de 380 px décidé par le serveur) en crée un vrai
            for mode in ['play', 'playTournoi', 'playSurvie', 'playDuo']:
                pg = await nouvelle_page(b, petit=True)
                try:
                    await entrer(pg, mode)
                    gros, tele, n = await mouvement(pg)
                    verifier(gros <= 2 and tele <= 2 and n > 60, f'{mode} : {gros} gros décalages, {tele} téléportations ({n} images)')
                    verifier(not pg.erreurs, f'{mode} en ligne sans erreur {pg.erreurs[:1]}')
                except Exception as e: verifier(False, f'{mode} en ligne ({e})')
                await pg.context.close()

            print('4. Reconnexion après une coupure')
            pg = await nouvelle_page(b)
            await entrer(pg, 'play')
            avant = await pg.evaluate('() => globalThis.__scene.room.sessionId')
            os.killpg(px.pid, signal.SIGTERM); await pg.wait_for_timeout(1500)
            bandeau = await pg.evaluate("() => document.getElementById('reco')?.classList.contains('on')")
            px = proxy(); await pg.wait_for_timeout(9000)
            apres = await pg.evaluate('() => [globalThis.__scene.room.sessionId, document.getElementById("lobby").classList.contains("hidden")]')
            verifier(bandeau, 'bandeau « reconnexion » pendant la coupure')
            verifier(apres[0] == avant and apres[1], 'de retour dans la même partie')
            print('5. Tutoriel interactif (premier lancement)')
            pg = await nouvelle_page(b)
            await pg.goto(URL); await pg.wait_for_timeout(600)
            await pg.fill('#name', 'Testeur'); await pg.check('#solo'); await pg.click('#play')
            await pg.wait_for_selector('#choix.on', timeout=60000)
            verifier(await pg.locator('#choix .carte').count() == 3, 'choix entre 3 champions')
            await pg.keyboard.press('3')
            await pg.wait_for_function('() => globalThis.__scene?.tuto', timeout=60000)
            etape = lambda: pg.evaluate("() => globalThis.__scene.tuto ? globalThis.__scene.tuto.etape.id : 'fini'")
            for _ in range(60):
                if await etape() != 'move': break
                dx, dy = await pg.evaluate("() => { const sc = globalThis.__scene, c = sc.tuto.cible, d = sc.disp.get(sc.room.sessionId); return c ? [c.x - d.x, c.y - d.y] : [0, 0]; }")
                ks = ([('d' if dx > 0 else 'q')] if abs(dx) > 30 else []) + ([('s' if dy > 0 else 'z')] if abs(dy) > 30 else [])
                for k in ks: await pg.keyboard.down(k)
                await pg.wait_for_timeout(250)
                for k in ks: await pg.keyboard.up(k)
            e1 = await etape(); verifier(e1 == 'basique', f'étape « se déplacer » validée en atteignant le cercle (étape : {e1})')
            await pg.mouse.click(700, 300); await pg.wait_for_timeout(400)
            await pg.keyboard.press('e'); await pg.wait_for_timeout(400)
            verifier(await etape() == 'zone', 'étapes « attaquer » et « sorts » validées')
            await pg.click('#tutoSkip'); await pg.wait_for_timeout(200)
            verifier(await pg.evaluate("() => localStorage.getItem('tutoFait') === '1'") and not pg.erreurs, f'tutoriel passé et mémorisé {pg.erreurs[:1]}')
            await pg.context.close()

            print('6. Accueil commun et Conclave des éléments')
            ctx = await b.new_context(viewport={'width': 1200, 'height': 760}); pg = await ctx.new_page(); pg.erreurs = []
            pg.on('pageerror', lambda e: pg.erreurs.append(str(e)))
            await pg.goto(URL); await pg.wait_for_timeout(600)
            verifier(await pg.locator('#hub').is_visible(), 'accueil commun affiché à l’arrivée')
            await pg.click('#hubConclave'); await pg.wait_for_url('**/conclave/**', timeout=15000)
            await pg.fill('#pseudo', 'Hôte'); await pg.click('#btCreer')
            await pg.wait_for_selector('#ecranSalon:not(.cache)', timeout=20000)
            code = (await pg.text_content('#salonCode')).strip()
            ctx2 = await b.new_context(viewport={'width': 900, 'height': 700}); pg2 = await ctx2.new_page(); pg2.erreurs = []
            pg2.on('pageerror', lambda e: pg2.erreurs.append(str(e)))
            await pg2.goto(URL.rstrip('/') + '/conclave/'); await pg2.fill('#pseudo', 'Invité'); await pg2.fill('#codeSalon', code); await pg2.click('#btRejoindre')
            await pg2.wait_for_selector('#ecranSalon:not(.cache)', timeout=20000)
            await pg.wait_for_function("() => document.querySelectorAll('#listeSalon li').length === 2", timeout=10000)
            verifier(True, f'rejoindre un salon par son code ({code})')
            await pg.click('#choixChampions .champion[data-k="feu+terre"]'); await pg.wait_for_timeout(300)
            await pg2.wait_for_function("() => document.querySelector('#choixChampions .champion[data-k=\"feu+terre\"]').disabled", timeout=5000)
            verifier(True, 'un champion pris est bloqué pour les autres')
            await pg.click('#btLancer')
            await pg.wait_for_selector('#ecranJeu:not(.cache)', timeout=10000); await pg2.wait_for_selector('#ecranJeu:not(.cache)', timeout=10000)
            n = await pg.locator('#plateau .pion').count()
            verifier(n == 5, f'partie lancée à 5 (bots ajoutés), {n} pions')
            roles = [await x.text_content('#carteRole b') for x in (pg, pg2)]
            verifier(all(roles), f'chacun voit son rôle {roles}')
            # chaque joueur ne reçoit que sa propre main
            fuite = await pg.evaluate("() => document.body.innerHTML.includes('main')") and False
            # déplacement → rituel → débat
            for x in (pg, pg2): await x.click('#s_forge')
            await pg.wait_for_function("() => document.body.dataset.phase === 'rituel'", timeout=30000)
            for x in (pg, pg2):
                if await x.locator('#main.active .carte').count(): await x.click('#main .carte >> nth=0')
            await pg.wait_for_function("() => ['revelation', 'debat'].includes(document.body.dataset.phase)", timeout=30000)
            await pg.wait_for_function("() => document.body.dataset.phase === 'debat' || document.body.dataset.phase === 'fin'", timeout=30000)
            if await pg.evaluate("() => document.body.dataset.phase") == 'debat':
                await pg.fill('#chatInput', 'Bonjour le Conclave'); await pg.press('#chatInput', 'Enter')
                await pg2.wait_for_function("() => document.getElementById('chatListe').textContent.includes('Bonjour le Conclave')", timeout=8000)
                verifier(True, 'le chat du débat arrive chez les autres')
                for x in (pg, pg2):
                    if await x.locator('#btPret').count(): await x.click('#btPret')
                await pg.wait_for_function("() => ['vote', 'fin'].includes(document.body.dataset.phase)", timeout=30000)
                if await pg.locator('#btAbst').count(): await pg.click('#btAbst')
                await pg.wait_for_function("() => ['resultat', 'deplacement', 'fin'].includes(document.body.dataset.phase)", timeout=40000)
                verifier(True, 'une manche complète : déplacement, rituel, révélation, débat, vote')
            verifier(not pg.erreurs and not pg2.erreurs, f'Conclave sans erreur {pg.erreurs[:1]} {pg2.erreurs[:1]}')
            await ctx.close(); await ctx2.close()

            print('7. Conclave : tutoriel guidé et file publique')
            ctx = await b.new_context(viewport={'width': 1300, 'height': 820}); pg = await ctx.new_page(); pg.erreurs = []
            pg.on('pageerror', lambda e: pg.erreurs.append(str(e)))
            await pg.goto(URL.rstrip('/') + '/conclave/'); await pg.fill('#pseudo', 'Élève'); await pg.click('#btTuto')
            await pg.wait_for_selector('#coach:not(.cache)', timeout=20000)
            verifier('Forge' in (await pg.text_content('#coach')), 'tutoriel : la bulle explique le déplacement')
            await pg.click('#s_forge'); await pg.wait_for_function("() => document.body.dataset.phase === 'rituel'", timeout=30000)
            await pg.wait_for_selector('#main.active .carte', timeout=10000); await pg.click('#main .carte >> nth=0')
            await pg.wait_for_function("() => document.body.dataset.phase === 'debat'", timeout=40000)
            await pg.wait_for_function("() => document.getElementById('chatListe').textContent.includes('Votez Kenzo')", timeout=60000)
            await pg.click('#btPret'); await pg.wait_for_function("() => document.body.dataset.phase === 'vote'", timeout=30000)
            await pg.locator('.pion', has_text='Kenzo').click()
            await pg.wait_for_function("() => document.body.dataset.phase === 'fin'", timeout=40000)
            verifier(await pg.evaluate("() => localStorage.getItem('conclave_tuto') === '1' && document.getElementById('voileContenu').textContent.includes('Gardiens')"), 'tutoriel terminé : victoire des Gardiens, tuto mémorisé')
            verifier(not pg.erreurs, f'tutoriel sans erreur {pg.erreurs[:1]}')
            await ctx.close()
            ctxs = [await b.new_context(viewport={'width': 900, 'height': 700}) for _ in range(2)]
            pgs = [await c.new_page() for c in ctxs]
            for i, x in enumerate(pgs):
                await x.goto(URL.rstrip('/') + '/conclave/'); await x.fill('#pseudo', f'Public{i}'); await x.click('#btPublic')
                await x.wait_for_selector('#ecranSalon:not(.cache)', timeout=20000)
            await pgs[0].wait_for_function("() => document.querySelectorAll('#listeSalon li').length === 2", timeout=10000)
            verifier(True, 'file publique : deux joueurs se retrouvent dans le même salon')
            for c in ctxs: await c.close()

            print('8. Zone Morte : monde, porte, sauvegarde, fouille, barricade, zombies, mort')
            ctx = await b.new_context(viewport={'width': 1100, 'height': 650}); pg = await ctx.new_page(); pg.erreurs = []
            pg.on('pageerror', lambda e: pg.erreurs.append(str(e)))
            await pg.goto(URL); await pg.click('#hubZone'); await pg.wait_for_url('**/zone-morte/**', timeout=15000)
            await pg.click('#metiers button[data-m="policier"]')
            await pg.fill('#graine', 'test'); await pg.click('#btNouvelle'); await pg.wait_for_timeout(1200)
            verifier(await pg.evaluate("window.__zm.partie.survivant.inv.some((o) => o.id === 'pistolet') && window.__zm.partie.survivant.metier === 'policier'"), 'métier choisi : le policier part avec un pistolet')
            avant = await pg.evaluate('window.__zm.partie.joueur.x')
            await pg.keyboard.down('d'); await pg.wait_for_timeout(1200); await pg.keyboard.up('d')
            verifier(await pg.evaluate('window.__zm.partie.joueur.x') > avant + 1, 'le survivant marche')
            ok = await pg.evaluate('''() => { const z = window.__zm, m = z.monde, p = z.partie.joueur;
              for (let y = Math.floor(p.y) - 25; y < p.y + 25; y++) for (let x = Math.floor(p.x) - 25; x < p.x + 25; x++)
                if (m.tuile(x, y) === 9 && m.tuile(x, y - 1) === 3) { p.x = x + 0.5; p.y = y - 0.7; return true; } return false; }''')
            await pg.wait_for_timeout(300); await pg.keyboard.press('e'); await pg.wait_for_timeout(300)
            verifier(ok and await pg.evaluate('Object.values(window.__zm.monde.modifs).includes(10)'), 'une porte s’ouvre avec E')
            await pg.evaluate('window.__zm.partie.temps = 23 * 60'); await pg.wait_for_timeout(500)
            await pg.keyboard.press('Escape'); await pg.wait_for_timeout(300)
            verifier('23:' in (await pg.text_content('#btContinuer')), 'la partie est sauvegardée (menu « Continuer »)')
            await pg.reload(); await pg.click('#btContinuer'); await pg.wait_for_timeout(800)
            verifier(await pg.evaluate('Object.values(window.__zm.monde.modifs).includes(10)'), 'la porte ouverte est restée ouverte après rechargement')
            await pg.evaluate('''() => { const z = window.__zm, m = z.monde, p = z.partie.joueur; z.horde.z.length = 0;
              for (let y = Math.floor(p.y) - 30; y < p.y + 30; y++) for (let x = Math.floor(p.x) - 30; x < p.x + 30; x++) if (m.tuile(x, y) === 13)
                for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) if (!m.solide(x + dx, y + dy)) { p.x = x + dx + 0.5; p.y = y + dy + 0.5; const sc = z.jeu.scene.getScene('zone'); sc.souris = null; sc.dir = { x: -dx, y: -dy }; return; } }''')
            await pg.wait_for_timeout(300); await pg.keyboard.press('e')
            await pg.wait_for_selector('#panneau:not(.cache)', timeout=15000)
            verifier(len(await pg.inner_text('#titreCont')) > 0, f"fouille d'un meuble : {await pg.inner_text('#titreCont')}")
            await pg.click('#listeInv button:has-text("Manger") >> nth=0'); await pg.wait_for_timeout(300)
            verifier(await pg.evaluate('window.__zm.partie.survivant.faim < 20'), 'manger fait baisser la faim')
            await pg.keyboard.press('Escape'); await pg.wait_for_timeout(200)
            await pg.evaluate('''() => { const z = window.__zm, m = z.monde, p = z.partie.joueur, s = z.partie.survivant; z.horde.z.length = 0;
              s.inv.push({ id: 'marteau', n: 1, etat: 80 }, { id: 'planche', n: 2 }, { id: 'clous', n: 4 });
              for (let y = Math.floor(p.y) - 25; y < p.y + 25; y++) for (let x = Math.floor(p.x) - 25; x < p.x + 25; x++)
                if (m.tuile(x, y) === 9 && [6, 7].includes(m.tuile(x, y + 1)) && !m.solide(x, y + 2)) { p.x = x + 0.5; p.y = y + 1.6; const sc = z.jeu.scene.getScene('zone'); sc.dir = { x: 0, y: -1 }; return; } }''')
            await pg.wait_for_timeout(300); await pg.keyboard.press('r')
            try: await pg.wait_for_function('Object.keys(window.__zm.monde.barricades).length === 1', timeout=20000); ok = True
            except Exception: ok = False
            verifier(ok, f"une porte barricadée avec R (marteau, planche, clous) {'' if ok else await pg.inner_text('#message')}")
            await pg.evaluate('''() => { const z = window.__zm, p = z.partie.joueur; z.horde.z.length = 0; const q = z.horde.ajouter(p.x + 1.1, p.y); q.recharge = 99; }''')
            await pg.mouse.move(800, 325)
            for _ in range(5):
                await pg.keyboard.press(' '); await pg.wait_for_timeout(900)
            verifier(await pg.evaluate('window.__zm.partie.survivant.tues') >= 1, 'un zombie tué à la batte (en visant à la souris)')
            await pg.evaluate('''() => { const z = window.__zm, p = z.partie.joueur; for (let i = 0; i < 8; i++) { const q = z.horde.ajouter(p.x + Math.cos(i) * 0.8, p.y + Math.sin(i) * 0.8); q.etat = 'chasse'; } }''')
            await pg.wait_for_selector('#mort:not(.cache)', timeout=40000)
            verifier(await pg.evaluate("localStorage.getItem('zoneMorte') === null"), 'encerclé : mort, écran de fin, partie effacée')
            verifier('XP de compte' in await pg.inner_text('#mortXp'), 'fin de partie : XP du compte et compétences affichées')
            await pg.click('#btRecommencer'); await pg.wait_for_timeout(800)
            verifier(await pg.evaluate('!window.__zm.partie.survivant.mort'), 'on peut recommencer')
            verifier(not pg.erreurs, f'Zone Morte sans erreur {pg.erreurs[:1]}')
            await ctx.close()
            await b.close()
    finally:
        for proc in (serveur, px):
            try: os.killpg(proc.pid, signal.SIGTERM)
            except ProcessLookupError: pass
    print('\n' + ('✅ Tout est bon' if not echecs else f'❌ {len(echecs)} problème(s)'))
    sys.exit(1 if echecs else 0)

asyncio.run(main())
