"""Behavioral antispoiler tests for Wanted Collection (DOM presentation).
features.js remains public source — these checks protect rendered UI and interactions.
"""
from pathlib import Path
from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parent.parent
CSS_FILES = [
    'styles.css', 'features.css', 'cloud.css', 'characters-v8.css', 'enhancements-v9.css',
    'characters-v10.css', 'enhancements-audit.css', 'polish-v11.css', 'refinement-v12.css',
    'characters-v13.css', 'art-direction-v15.css', 'design-system-v16.css', 'nautical-finish-v18.css',
    'catalog-pwa-v19.css', 'anime-art-direction-v21.css', 'anime-scenic-v22.css', 'atlas.css',
    'mobile-quality-fixes.css', 'mobile-visual-repair-v26.css', 'premium-grand-line.css',
    'interactive-atlas-v28.css', 'wanted-dossiers-v28.css', 'mobile-ux-polish-v29.css',
]
JS_FILES = ['features.js', 'cloud.js', 'app.js', 'polish-v11.js']


def build_html():
    css = '\n'.join((ROOT / f).read_text(encoding='utf-8') for f in CSS_FILES if (ROOT / f).exists())
    js = '\n'.join((ROOT / f).read_text(encoding='utf-8') for f in JS_FILES if (ROOT / f).exists())
    shim = (
        "window.__store={};"
        "Object.defineProperty(window,'localStorage',{configurable:true,value:{"
        "getItem:k=>window.__store[k]||null,"
        "setItem:(k,v)=>{window.__store[k]=String(v)},"
        "removeItem:k=>{delete window.__store[k]}"
        "}});"
        "window.fetch=async()=>({ok:false,json:async()=>({})});"
    )
    return (
        '<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1">'
        f'<style>{css}</style></head><body><div id="app"></div><div id="toast"></div>'
        f'<script>{shim}{js}</script></body></html>'
    )


SENSITIVE_ATTRS = ('data-id', 'data-group', 'data-unlock', 'data-character', 'data-character-id')


def locked_posters(page):
    return page.locator('.wanted-poster[data-locked="true"]')


def unlocked_posters(page):
    return page.locator('.wanted-poster[data-locked="false"]')


def norm(text):
    return (text or '').casefold()


def assert_locked_neutral(page):
    cards = locked_posters(page)
    n = cards.count()
    assert n > 0, 'expected sealed posters'
    for i in range(n):
        card = cards.nth(i)
        html = card.evaluate('el => el.outerHTML')
        for attr in SENSITIVE_ATTRS:
            assert f'{attr}=' not in html, f'locked poster leaked {attr}: {html[:240]}'
        assert '/assets/characters/' not in html
        assert card.get_attribute('data-search') in ('', None)
        text = norm(card.inner_text())
        for leak in ('nami', 'usopp', 'robin', 'chopper', 'ace', 'law', 'franky', 'brook', 'jinbe',
                     'gatta ladra', 're dei cecchini', 'bambina demoniaca', 'amante del cotone',
                     'fire fist', 'surgeon'):
            assert leak not in text, f'locked poster text leak {leak!r}'
        open_btn = card.locator('.wanted-open')
        assert open_btn.get_attribute('aria-label') == 'Manifesto ancora sigillato'
        title = open_btn.get_attribute('title')
        if title:
            assert 'Manifesto ancora sigillato' in title
            assert 'episodio' not in title.casefold()


def set_progress(page, *, spoiler=True, start=1, watched=None):
    watched = list(watched or [])
    page.evaluate(
        """([spoiler, startEp, list]) => {
          extra.spoiler = !!spoiler;
          start = startEp;
          watched = new Set(list);
          if (typeof saveExtra === 'function') saveExtra();
          if (typeof saveAll === 'function') saveAll();
          characterQuery = '';
          characterFilter = 'all';
          setTab('characters');
        }""",
        [spoiler, start, watched],
    )


def main():
    html = build_html()
    chrome = '/usr/bin/google-chrome' if Path('/usr/bin/google-chrome').exists() else '/usr/bin/chromium'
    with sync_playwright() as pw:
        browser = pw.chromium.launch(headless=True, executable_path=chrome, args=['--no-sandbox', '--disable-dev-shm-usage'])
        page = browser.new_page(viewport={'width': 390, 'height': 844})
        errors = []
        page.on('pageerror', lambda e: errors.append(str(e)))
        page.set_content(html, wait_until='load')

        # --- 1. Inizio viaggio: solo soglie molto basse sbloccate ---
        set_progress(page, spoiler=True, start=1, watched=[1])
        assert page.locator('.wanted-poster').count() == 12
        assert unlocked_posters(page).count() >= 1  # Luffy at least
        assert locked_posters(page).count() >= 8
        assert_locked_neutral(page)
        # Ricerca non trova personaggi bloccati
        page.locator('#character-search').fill('Robin')
        assert page.locator('.wanted-poster:visible').count() == 0
        page.locator('#character-search').fill('Usopp')
        assert page.locator('.wanted-poster:visible').count() == 0
        page.locator('#character-search').fill('')

        # Dossier bloccato: tap sealed → toast, no modal
        locked_posters(page).first.locator('.wanted-open').click()
        assert page.locator('.wanted-dossier').count() == 0
        assert page.locator('.modal-layer').count() == 0

        # --- 2. Sblocca Usopp (ep.9) ma NON l'alias (278) ---
        set_progress(page, spoiler=True, start=1, watched=list(range(1, 30)))
        usopp = page.locator('.wanted-poster[data-id="usopp"]')
        assert usopp.count() == 1
        assert usopp.get_attribute('data-locked') == 'false'
        assert 'usopp' in norm(usopp.inner_text())
        assert 're dei cecchini' not in norm(usopp.inner_text())
        assert 'tiratore' in norm(usopp.inner_text())
        # Nami sbloccata senza alias (320)
        nami = page.locator('.wanted-poster[data-id="nami"]')
        assert nami.count() == 1
        assert 'gatta ladra' not in norm(nami.inner_text())
        assert 'navigatrice' in norm(nami.inner_text())
        # Sanji: alias noto al debutto
        sanji = page.locator('.wanted-poster[data-id="sanji"]')
        assert sanji.count() == 1
        assert 'gamba nera' in norm(sanji.inner_text())
        # Chopper ancora locked
        assert page.locator('.wanted-poster[data-id="chopper"]').count() == 0
        assert_locked_neutral(page)

        usopp.locator('.wanted-open').click()
        assert page.locator('.wanted-dossier').count() == 1
        dossier = norm(page.locator('.wanted-dossier').inner_text())
        assert 'usopp' in dossier
        assert 're dei cecchini' not in dossier
        assert 'tiratore' in dossier
        page.locator('[data-action="modal-cancel"]').click()

        # --- 3. Chopper sbloccato (81) senza alias (320) ---
        set_progress(page, spoiler=True, start=1, watched=list(range(1, 100)))
        chopper = page.locator('.wanted-poster[data-id="chopper"]')
        assert chopper.count() == 1
        assert 'amante del cotone dolce' not in norm(chopper.inner_text())
        assert 'medico' in norm(chopper.inner_text())
        assert_locked_neutral(page)

        # --- 4. Alias Usopp sbloccato (278+) ---
        set_progress(page, spoiler=True, start=1, watched=list(range(1, 280)))
        usopp = page.locator('.wanted-poster[data-id="usopp"]')
        assert 're dei cecchini' in norm(usopp.inner_text())
        usopp.locator('.wanted-open').click()
        assert 're dei cecchini' in norm(page.locator('.wanted-dossier').inner_text())
        page.locator('[data-action="modal-cancel"]').click()

        # Alias Nami/Chopper a 320
        set_progress(page, spoiler=True, start=1, watched=list(range(1, 321)))
        assert 'gatta ladra' in norm(page.locator('.wanted-poster[data-id="nami"]').inner_text())
        assert 'amante del cotone dolce' in norm(page.locator('.wanted-poster[data-id="chopper"]').inner_text())

        # Ricerca trova solo sbloccati
        page.locator('#character-search').fill('robin')
        assert page.locator('.wanted-poster:visible').count() == 1
        assert page.locator('.wanted-poster:visible').get_attribute('data-id') == 'robin'
        page.locator('#character-search').fill('')

        # --- 5. Spoiler disattivato: tutto visibile ---
        set_progress(page, spoiler=False, start=1, watched=[1])
        assert locked_posters(page).count() == 0
        assert unlocked_posters(page).count() == 12
        assert page.locator('.wanted-poster[data-id="law"]').count() == 1
        assert 'surgeon of death' in norm(page.locator('.wanted-poster[data-id="law"]').inner_text())

        # Archiviazione / preferiti senza regressione
        page.locator('.wanted-poster[data-id="luffy"] .wanted-collect').click()
        assert page.evaluate("extra.characterFavorites.includes('luffy')")
        page.locator('#character-filter').select_option('favorites')
        assert page.locator('.wanted-poster:visible').count() == 1
        assert page.locator('.wanted-poster:visible').get_attribute('data-id') == 'luffy'
        page.locator('.wanted-poster[data-id="luffy"] .wanted-collect').click()
        assert not page.evaluate("extra.characterFavorites.includes('luffy')")
        page.locator('#character-filter').select_option('all')

        # Viewport smoke
        for w in (320, 390, 430, 768, 1024, 1280):
            page.set_viewport_size({'width': w, 'height': 844})
            assert page.evaluate('document.documentElement.scrollWidth') <= w + 1, w

        assert not errors, errors
        print('PASS: Wanted behavioral antispoiler (progressions, aliasUnlock, DOM seals, search, dossier, favorites)')
        browser.close()


if __name__ == '__main__':
    main()
