"""Smoke test sezione Personaggi (Chromium headless senza accesso rete)."""
from pathlib import Path
from playwright.sync_api import sync_playwright
src = Path(__file__).resolve().parent.parent
css = '\n'.join((src/f).read_text() for f in ('styles.css','features.css','cloud.css','characters-v8.css','enhancements-v9.css','characters-v10.css'))
js = '\n'.join((src/f).read_text() for f in ('features.js','cloud.js','app.js'))
shim = "window.__store={};Object.defineProperty(window,'localStorage',{configurable:true,value:{getItem:k=>window.__store[k]||null,setItem:(k,v)=>window.__store[k]=String(v),removeItem:k=>delete window.__store[k]}});window.fetch=async()=>({ok:false,json:async()=>({})});"
html='<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1"><style>'+css+'</style></head><body><div id="app"></div><div id="toast"></div><script>'+shim+js+'</script></body></html>'
with sync_playwright() as pw:
 chrome='/usr/bin/google-chrome' if Path('/usr/bin/google-chrome').exists() else '/usr/bin/chromium'
 b = pw.chromium.launch(headless=True, executable_path=chrome, args=['--no-sandbox','--disable-dev-shm-usage'])
 page = b.new_page(viewport={'width':390,'height':844})
 errors=[];page.on('pageerror', lambda e: errors.append(str(e)))
 page.set_content(html,wait_until='load')
 page.evaluate("extra.spoiler=false;saveExtra();setTab('characters')")
 assert page.locator('.char-card:visible').count() == 12
 page.locator('#character-search').fill('nami')
 assert page.locator('.char-card:visible').count() == 1
 assert page.locator('.char-card:visible').get_attribute('data-id') == 'nami'
 page.locator('#character-search').fill('')
 page.locator('.char-card[data-id="luffy"] .char-favorite').click()
 assert page.evaluate("extra.characterFavorites.includes('luffy')")
 page.locator('#character-filter').select_option('favorites')
 assert page.locator('.char-card:visible').count() == 1
 page.locator('.char-card[data-id="luffy"] .char-favorite').click()
 assert page.locator('.char-card:visible').count() == 0
 page.locator('#character-filter').select_option('all')
 page.locator('.char-card[data-id="nami"] .char-open').click()
 assert page.locator('.modal-layer').count()==1
 page.locator('[data-action="modal-cancel"]').click()
 page.evaluate("extra.spoiler=true;saveExtra();setTab('characters')")
 assert page.locator('.char-card.is-locked').count()==6
 assert 'Robin' not in page.locator('.char-card[data-id="robin"]').get_attribute('data-search')
 for w in (320,360,390,430,768,1024,1440):
  page.set_viewport_size({'width':w,'height':844})
  assert page.evaluate('document.documentElement.scrollWidth') <= w+1, w
 out=page.evaluate("()=>mergeSnapshots({extras:{characterFavorites:[],characterFavoriteEdits:{luffy:{value:false,at:200}}}},{extras:{characterFavorites:['luffy'],characterFavoriteEdits:{luffy:{value:true,at:100}}}})")
 assert 'luffy' not in out['extras']['characterFavorites']
 assert not errors,errors
 print('PASS: ricerca, filtri, preferiti e rimozioni sincronizzate, dettaglio, antispoiler, 7 larghezze')
 b.close()
