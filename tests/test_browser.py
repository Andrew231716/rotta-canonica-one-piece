from playwright.sync_api import sync_playwright
from pathlib import Path
import mimetypes
src=Path(__file__).resolve().parent.parent;base='https://rotta-canonica.local'
css=(src/'styles.css').read_text()+(src/'features.css').read_text()+(src/'cloud.css').read_text()
js=(src/'features.js').read_text()+(src/'cloud.js').read_text()+(src/'app.js').read_text()
shim="""window.__store={}; Object.defineProperty(window,'localStorage',{configurable:true,value:{getItem:(k)=>window.__store[k]||null,setItem:(k,v)=>{window.__store[k]=String(v)},removeItem:(k)=>{delete window.__store[k]}}});window.fetch=async(url)=>({ok:String(url).includes('/data/episodes.json'),json:async()=>({episodes:[]})});"""
html='<!doctype html><html lang="it"><head><meta name="viewport" content="width=device-width,initial-scale=1"><style>'+css+'</style></head><body><div id="app"></div><div id="toast"></div><script>'+shim+js+'</script></body></html>'
with sync_playwright() as pw:
 import os
 path=next((p for p in ('/usr/bin/chromium','/usr/bin/chromium-browser','/usr/local/bin/google-chrome','/usr/bin/google-chrome') if os.path.exists(p)),None)
 b=pw.chromium.launch(headless=True,**({'executable_path':path} if path else {}),args=['--no-sandbox','--disable-dev-shm-usage'])
 c=b.new_context(viewport={'width':390,'height':844},service_workers='block',accept_downloads=True)
 page=c.new_page()
 errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
 page.set_content(html,wait_until='load');page.wait_for_timeout(500)
 print('home',page.title(), 'errors',errors)
 page.locator('.mobile-nav button',has_text='Episodi').click()
 page.locator('#episode-search').fill('92')
 assert page.locator('.ep-list-item').count()==1
 page.locator('.ep-list-item [data-action="detail"]').click()
 assert page.locator('.modal-layer').count()==1
 page.locator('#detail-notes').fill('La mia nota di prova')
 page.locator('[data-action="note-save"]').click()
 page.locator('.ep-list-item [data-action="episode"]').click()
 if page.locator('.reward-celebration').count():page.locator('[data-action="modal-cancel"]').click()
 assert page.evaluate("JSON.parse(localStorage.getItem('rotta-canonica-v1')).watched.includes(92)")
 assert page.evaluate("JSON.parse(localStorage.getItem('rotta-canonica-extra-v1')).watchEdits['92'].value")
 assert page.evaluate("JSON.parse(localStorage.getItem('rotta-canonica-extra-v1')).notes['92']==='La mia nota di prova'")
 page.locator('.mobile-nav button',has_text='Altro').click()
 page.locator('.more-menu .tool-tile',has_text='Impostazioni').click();page.wait_for_timeout(200)
 assert page.locator('.cloud-panel').count()==1
 assert page.locator('#cloud-email').count()==1
 assert page.locator('#cloud-password').count()==1
 assert page.locator('[data-cloud-action="login"]').is_disabled()
 assert page.locator('[data-cloud-action="register"]').is_disabled()
 text=page.locator('.cloud-panel').inner_text().lower()
 assert 'configur' in text or 'non disponibile' in text or 'password' in text or 'email' in text
 print('local state intact and cloud password login present (disabled without backend)')
 for w in [360,390,430,768,1024,1440]:
  page.set_viewport_size({'width':w,'height':850});page.evaluate("setTab('path')");n=page.evaluate('document.documentElement.scrollWidth')
  print('width',w,'scroll',n)
  assert n<=w+1
 # pure CRDT merge test: "unwatched" tombstone must win over old watched.
 out=page.evaluate("""()=>mergeSnapshots({watched:[92],start:92,extras:{watchEdits:{92:{value:false,at:200}}}},{watched:[92],start:92,extras:{watchEdits:{92:{value:true,at:100}}}})""")
 assert 92 not in out['watched'],out
 print('CRDT tombstone merge PASS')
 print('page errors',errors)
 assert not errors
 b.close()
