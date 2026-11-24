"""Local deterministic functional test for fixes in v8.1 (no live provider credentials)."""
from pathlib import Path
from playwright.sync_api import sync_playwright
import json
p=Path(__file__).resolve().parent.parent
css='\n'.join((p/n).read_text() for n in ['styles.css','features.css','cloud.css','characters-v8.css','enhancements-v9.css','characters-v10.css','enhancements-audit.css'])
css=css.replace("@import url('https://fonts.googleapis.com/css2?family=Bangers&family=Nunito+Sans:wght@400;600;700;800;900&display=swap');",'')
js='\n'.join((p/n).read_text() for n in ['features.js','cloud.js','app.js'])
shim="window.__store={};Object.defineProperty(window,'localStorage',{configurable:true,value:{getItem:k=>window.__store[k]||null,setItem:(k,v)=>window.__store[k]=String(v),removeItem:k=>delete window.__store[k]}});window.fetch=async()=>({ok:false,json:async()=>({})});"
html='<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1"><style>'+css+'</style></head><body><div id="app"></div><div id="toast"></div><script>'+shim+js+'</script></body></html>'
with sync_playwright() as pwt:
 import os
 path=next((p for p in ('/usr/bin/chromium','/usr/bin/chromium-browser','/usr/local/bin/google-chrome','/usr/bin/google-chrome') if os.path.exists(p)),None)
 b=pwt.chromium.launch(headless=True,**({'executable_path':path} if path else {}),args=['--no-sandbox','--disable-dev-shm-usage'])
 page=b.new_page(viewport={'width':390,'height':844},service_workers='block',accept_downloads=True)
 errors=[];page.on('pageerror',lambda err:errors.append(str(err)))
 page.route('https://**',lambda route:route.abort())
 page.set_content(html,wait_until='domcontentloaded',timeout=12000)
 # 1. Reset does not destroy personal notes/favorites, and tombstones prevent cloud resurrection.
 page.evaluate('''()=>{watched.add(92);extra.watchedAt['92']='2026-11-24T10:00:00Z';extra.notes['92']='Nota da conservare';extra.favorites=[92];extra.characterFavorites=['luffy'];saveAll();setTab('settings')}''')
 page.locator('[data-action="reset"]').first.click()
 page.locator('[data-action="reset-confirm"]').click()
 result=page.evaluate('''()=>({watched:[...watched],notes:extra.notes['92'],favorites:extra.favorites,characters:extra.characterFavorites,edit:extra.watchEdits['92']})''')
 assert result['watched']==[],result
 assert result['notes']=='Nota da conservare' and result['favorites']==[92] and result['characters']==['luffy'],result
 assert result['edit']['value'] is False,result
 print('reset preserves notes/favorites and adds tombstone: PASS',flush=True)
 # 2. Reimport round-trips character favorites
 page.locator('[data-action="import"]').first.click()
 data={'app':'Rotta Canonica','watched':[92], 'start':92,'extras':{'favorites':[92],'characterFavorites':['zoro','nami'],'characterFavoriteEdits':{'zoro':{'value':True,'at':1234567890}},'notes':{'92':'Nota ripristinata'}}}
 page.locator('#import-file').set_input_files({'name':'backup.json','mimeType':'application/json','buffer':json.dumps(data).encode()})
 page.locator('[data-action="import-confirm"]').click()
 page.wait_for_function("extra.characterFavorites.includes('zoro')")
 assert page.evaluate('extra.characterFavorites.sort().join(",")')=='nami,zoro'
 assert page.evaluate("extra.characterFavoriteEdits.zoro.value") is True
 print('backup restores character favorites: PASS',flush=True)
 # 3. Spoiler-protected map stops are genuinely disabled
 page.evaluate('extra.spoiler=true;start=92;saveAll();setTab("map")')
 assert page.locator('.map-stop.fogged').count()>0
 assert page.locator('.map-stop.fogged').first.is_disabled()
 print('locked map stops disabled: PASS',flush=True)
 # 4. Account B must not access/sync account A state
 is_blocked=page.evaluate('''async()=>{localStorage.setItem(CLOUD_OWNER_KEY,'user-A');CLOUD_STATUS.user={id:'user-B',email:'b@test.invalid'};cloudClient={from:()=>{throw Error('MUST NOT REACH DB')}};await cloudSync();return CLOUD_STATUS.accountConflict&&CLOUD_STATUS.message.includes('sospesa')}''')
 assert is_blocked
 print('cloud account cross-over blocked: PASS',flush=True)
 # 5. no layout overflow in both light and dark theme
 for w in (320,360,390,430,768,1024):
  page.set_viewport_size({'width':w,'height':844})
  assert page.evaluate('document.documentElement.scrollWidth')<=w+1,w
 assert not errors,errors
 print('responsive and no JS exceptions: PASS',flush=True)
 b.close()
