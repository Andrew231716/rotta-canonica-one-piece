"""Functional checks for the full audit pass (spoiler ribbons, home jump, map here, etc.)."""
from pathlib import Path
from playwright.sync_api import sync_playwright
import os

src = Path(__file__).resolve().parent.parent
css = ''.join((src / n).read_text() for n in [
    'styles.css', 'features.css', 'cloud.css', 'characters-v8.css',
    'enhancements-v9.css', 'characters-v10.css', 'enhancements-audit.css'
])
css = css.replace("@import url('https://fonts.googleapis.com/css2?family=Bangers&family=Nunito+Sans:wght@400;600;700;800;900&display=swap');", '')
js = ''.join((src / n).read_text() for n in ['features.js', 'cloud.js', 'app.js'])
shim = "window.__store={};Object.defineProperty(window,'localStorage',{configurable:true,value:{getItem:k=>window.__store[k]||null,setItem:(k,v)=>window.__store[k]=String(v),removeItem:k=>delete window.__store[k]}});window.fetch=async()=>({ok:false,json:async()=>({})});"
html = '<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1"><style>' + css + '</style></head><body><div id="app"></div><div id="toast"></div><script>' + shim + js + '</script></body></html>'

chrome = next((p for p in ('/usr/bin/chromium', '/usr/bin/chromium-browser') if os.path.exists(p)), None)

with sync_playwright() as pwt:
    b = pwt.chromium.launch(headless=True, executable_path=chrome, args=['--no-sandbox', '--disable-dev-shm-usage'])
    page = b.new_page(viewport={'width': 390, 'height': 844}, service_workers='block')
    errors = []
    page.on('pageerror', lambda err: errors.append(str(err)))
    page.route('https://**', lambda route: route.abort())
    page.set_content(html, wait_until='domcontentloaded', timeout=15000)

    # Spoiler: locked arcs hide saga ribbon and show seal
    page.evaluate('()=>{extra.spoiler=true;start=1;watched.clear();saveAll();setTab("path")}')
    page.wait_for_timeout(80)
    locked = page.locator('.arc-card.is-spoiler')
    assert locked.count() > 0, 'expected spoiler-locked arcs'
    assert locked.first.locator('.arc-saga-ribbon').count() == 0
    assert locked.first.locator('.arc-spoiler-seal').count() == 1
    print('spoiler ribbons hidden: PASS', flush=True)

    # Home jump + current marker after watching early arcs
    page.evaluate('''()=>{
      for(let n=1;n<92;n++){if(!filler.has(n))watched.add(n)}
      start=1;extra.spoiler=true;saveAll();setTab('path')
    }''')
    page.wait_for_timeout(100)
    assert page.locator('.home-jump').count() == 1
    assert '92' in page.locator('.home-jump').inner_text()
    assert page.locator('.arc-card.is-current').count() >= 1
    page.locator('[data-action="jump-current"]').click()
    page.wait_for_timeout(120)
    assert page.locator('.arc-card.open').count() == 1
    print('home jump / current: PASS', flush=True)

    # Hide completed arcs
    page.evaluate('()=>{extra.hideCompleted=true;saveExtra();setTab("path")}')
    page.wait_for_timeout(80)
    assert page.evaluate('()=>![...document.querySelectorAll(".arc-card.is-complete")].some(el=>el.offsetParent!==null)') or page.locator('.arc-card.is-complete').count() == 0
    print('hide completed: PASS', flush=True)

    # Episodes jump + empty title label
    page.evaluate('setTab("episodes")')
    page.wait_for_timeout(80)
    assert page.locator('.episode-jump').count() == 1
    page.fill('#jump-episode', '92')
    page.locator('[data-action="jump-episode"]').click()
    page.wait_for_timeout(120)
    assert page.evaluate('tab') == 'path'
    assert page.locator('.arc-card.open').count() == 1
    page.evaluate('setTab("episodes")')
    page.wait_for_timeout(60)
    page.fill('#episode-search', '1')
    page.wait_for_timeout(60)
    assert page.locator('.ep-missing').count() >= 1
    print('episodes jump + missing title: PASS', flush=True)

    # Map you-are-here
    page.evaluate('setTab("map")')
    page.wait_for_timeout(80)
    assert page.locator('.map-stop.you-are-here').count() == 1
    assert 'sei qui' in page.locator('.map-stop.you-are-here').inner_text().lower() or page.locator('.map-here').count() == 1
    print('map you-are-here: PASS', flush=True)

    # Locked character parchment (not pure black tile class present)
    page.evaluate('()=>{extra.spoiler=true;start=1;watched.clear();saveAll();setTab("characters")}')
    page.wait_for_timeout(100)
    assert page.locator('.char-card.is-locked').count() >= 1
    print('locked characters: PASS', flush=True)

    # Settings toggles + Altro dots icon
    page.evaluate('setTab("settings")')
    page.wait_for_timeout(60)
    assert 'attiva' in page.locator('.setting-item').first.inner_text().lower() or 'disattivat' in page.locator('.setting-item').first.inner_text().lower()
    assert page.locator('[data-action="hide-completed"]').count() >= 1
    assert page.locator('.cloud-offline-note').count() == 1
    assert page.locator('.mobile-more').count() == 1
    print('settings + Altro icon: PASS', flush=True)

    assert not errors, errors
    b.close()
    print('full audit PASS', flush=True)
