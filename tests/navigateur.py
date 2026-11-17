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
            await b.close()
    finally:
        for proc in (serveur, px):
            try: os.killpg(proc.pid, signal.SIGTERM)
            except ProcessLookupError: pass
    print('\n' + ('✅ Tout est bon' if not echecs else f'❌ {len(echecs)} problème(s)'))
    sys.exit(1 if echecs else 0)

asyncio.run(main())
