"""Offline visual and regression checks for the production v10 + v11 CSS layer.
Images are served by Playwright's request interception; the public site is not accessed.
"""
from pathlib import Path
import mimetypes
from playwright.sync_api import sync_playwright
ROOT=Path(__file__).resolve().parents[1]
CSS_FILES=['styles.css','features.css','cloud.css','characters-v8.css','enhancements-v9.css','characters-v10.css','enhancements-audit.css','polish-v11.css']
JS_FILES=['features.js','cloud.js','app.js','polish-v11.js']
css='\n'.join((ROOT/name).read_text() for name in CSS_FILES).replace("@import url('https://fonts.googleapis.com/css2?family=Bangers&family=Nunito+Sans:wght@400;600;700;800;900&display=swap');",'')
js='\n'.join((ROOT/name).read_text() for name in JS_FILES)
shim='''window.__store={};Object.defineProperty(window,'localStorage',{configurable:true,value:{getItem:k=>window.__store[k]||null,setItem:(k,v)=>window.__store[k]=String(v),removeItem:k=>delete window.__store[k]}});window.fetch=async()=>({ok:false,json:async()=>({})});'''
html=f'<html lang="it"><head><base href="https://local.rotta.preview/"><meta name="viewport" content="width=device-width,initial-scale=1"><style>{css}</style></head><body><div id="app" tabindex="-1"></div><div id="toast"></div><script>{shim}{js}</script></body></html>'
with sync_playwright() as p:
  import os
  chrome=next((x for x in ('/usr/bin/chromium','/usr/bin/chromium-browser','/usr/bin/google-chrome') if os.path.exists(x)),None)
  b=p.chromium.launch(executable_path=chrome,headless=True,args=['--no-sandbox','--disable-dev-shm-usage'])
  page=b.new_page(viewport={'width':390,'height':844},device_scale_factor=2,service_workers='block')
  errors=[]
  page.on('pageerror',lambda e:errors.append(str(e)))
  def handler(route):
    path=route.request.url.partition('local.rotta.preview/')[2].split('?',1)[0]
    p=ROOT/path
    if p.is_file():route.fulfill(body=p.read_bytes(),content_type=mimetypes.guess_type(p.name)[0] or 'application/octet-stream')
    else:route.abort()
  page.route('https://local.rotta.preview/**',handler)
  page.route('https://**',lambda route:route.abort())
  page.set_content(html,wait_until='domcontentloaded')
  page.evaluate("extra.spoiler=false;saveExtra();setTab('characters')")
  assert page.locator('.char-card').count()==12
  assert page.locator('.char-art img').first.evaluate('x=>x.naturalWidth')==832
  assert page.locator('.char-description').first.evaluate('x=>x.scrollHeight<=x.clientHeight+1')
  assert page.locator('.mobile-brand-title').first.evaluate('x=>getComputedStyle(x).whiteSpace')=='nowrap'
  page.locator('#character-search').fill('nami')
  assert page.locator('.char-card:visible').count()==1
  page.locator('#character-search').fill('')
  page.locator('.char-card[data-id="nami"] .char-favorite').click()
  assert page.evaluate("extra.characterFavorites.includes('nami')")
  page.locator('.char-card[data-id="nami"] .char-open').click()
  assert page.locator('.modal-layer').count()==1
  page.keyboard.press('Escape')
  assert page.locator('.modal-layer').count()==0
  for w in (320,360,390,430,650,768,1024,1280,1440):
    page.set_viewport_size({'width':w,'height':844})
    assert page.evaluate('document.documentElement.scrollWidth')<=w+1, f'horizontal overflow at {w}'
  page.evaluate('extra.spoiler=true;saveExtra();setTab("characters")')
  assert page.locator('.char-card.is-locked').count()==6
  page.emulate_media(reduced_motion='reduce')
  page.reload if False else None
  assert not errors,errors
  print('PASS visual-v11: 12 portraits, full descriptions, search/favorites/detail, spoiler, no overflow 320–1440, no JS exceptions')
  b.close()
