const CACHE='rotta-canonica-v22-2-scenic-portraits';
const ASSETS=["/design-system-v16.css","/assets/route-1.webp","/assets/route-2.webp","/assets/route-3.webp","/assets/route-4.webp","/assets/route-5.webp","/assets/route-6.webp","/art-direction-v15.css","/assets/character-scenes/luffy.webp","/assets/character-scenes/zoro.webp","/assets/character-scenes/nami.webp","/assets/character-scenes/usopp.webp","/assets/character-scenes/sanji.webp","/assets/character-scenes/chopper.webp","/assets/character-scenes/robin.webp","/assets/character-scenes/franky.webp","/assets/character-scenes/brook.webp","/assets/character-scenes/jinbe.webp","/","/index.html","/styles.css","/app.js","/features.js","/features.css","/characters-v8.css","/characters-v10.css","/enhancements-v9.css","/enhancements-audit.css","/polish-v11.css","/polish-v11.js","/cloud.js","/cloud.css","/data/episodes.json","/icon.svg","/icon-192.png","/icon-512.png","/manifest.webmanifest","/refinement-v12.css","/characters-v13.css","/assets/world-sunset.webp","/assets/ui-flag.webp","/nautical-finish-v18.css","/assets/icons/ui-compass.svg","/assets/icons/ui-episode.svg","/assets/icons/ui-map.svg","/assets/icons/ui-spyglass.svg","/assets/icons/ui-loot.svg","/assets/icons/ui-chest.svg","/assets/icons/ui-flag.svg","/assets/icons/ui-wheel.svg","/assets/icons/ui-progress.svg","/assets/icons/ui-locator.svg","/assets/icons/ui-route.svg","/assets/icons/ui-complete.svg","/assets/icons/ui-anchor.svg","/assets/icons/ui-filler.svg","/data/episodes-latest.json","/catalog-pwa-v19.css","/anime-art-direction-v21.css","/assets/anime-hero-portrait.webp","/assets/anime-ocean-bg.webp","/assets/anime-icons/anchor.webp","/assets/anime-icons/chest.webp","/assets/anime-icons/compass.webp","/assets/anime-icons/complete.webp","/assets/anime-icons/download.webp","/assets/anime-icons/episode.webp","/assets/anime-icons/filler.webp","/assets/anime-icons/flag.webp","/assets/anime-icons/locator.webp","/assets/anime-icons/loot.webp","/assets/anime-icons/map.webp","/assets/anime-icons/netflix.webp","/assets/anime-icons/progress.webp","/assets/anime-icons/route.webp","/assets/anime-icons/saga.webp","/assets/anime-icons/sea-divider.webp","/assets/anime-icons/spyglass.webp","/assets/anime-icons/treasure.webp","/assets/anime-icons/warning.webp","/assets/anime-icons/wheel.webp","/anime-scenic-v22.css","/assets/anime-v22-archipelago.webp","/assets/anime-v22-sunset.webp","/assets/anime-v22-portraits/luffy.webp","/assets/anime-v22-portraits/zoro.webp","/assets/anime-v22-portraits/nami.webp","/assets/anime-v22-portraits/usopp.webp","/assets/anime-v22-portraits/sanji.webp","/assets/anime-v22-portraits/chopper.webp","/assets/anime-v22-portraits/robin.webp","/assets/anime-v22-portraits/franky.webp","/assets/anime-v22-portraits/brook.webp","/assets/anime-v22-portraits/jinbe.webp"];
const NETWORK_FIRST=/\.(?:html?|css|js|json|webmanifest)$|\/$|\/index\.html$/i;
// A decorative image failure must not prevent the offline episode guide from installing.
const OFFLINE_CORE=['/index.html','/styles.css','/features.css','/app.js','/features.js','/cloud.js','/anime-art-direction-v21.css','/anime-scenic-v22.css','/data/episodes.json','/data/episodes-latest.json'];
self.addEventListener('install',e=>{
 e.waitUntil(caches.open(CACHE).then(async cache=>{
  await cache.addAll(OFFLINE_CORE);
  await Promise.allSettled(ASSETS.filter(x=>!OFFLINE_CORE.includes(x)).map(x=>cache.add(x)));
 }).then(()=>self.skipWaiting()));
});
self.addEventListener('activate',e=>{
 e.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim()).then(()=>self.clients.matchAll({type:'window'})).then(list=>list.forEach(c=>c.postMessage({type:'ROTTA_SW_UPDATED',cache:CACHE}))))
});
self.addEventListener('fetch',event=>{
 const request=event.request;if(request.method!=='GET')return;
 const url=new URL(request.url);if(url.origin!==self.location.origin||url.pathname.startsWith('/api/'))return;
 const fetchAndStore=()=>fetch(request,{cache:'no-cache'}).then(response=>{if(response.ok){const copy=response.clone();event.waitUntil(caches.open(CACHE).then(cache=>cache.put(request,copy)).catch(()=>{}))}return response});
 if(request.mode==='navigate'||NETWORK_FIRST.test(url.pathname)){
  event.respondWith(fetchAndStore().catch(async()=>await caches.match(request,{ignoreSearch:true})||(request.mode==='navigate'?await caches.match('/index.html'):Response.error())));
  return;
 }
 event.respondWith(caches.match(request,{ignoreSearch:true}).then(cached=>cached||fetchAndStore().catch(()=>Response.error())));
});
self.addEventListener('push',event=>{let data={title:'Rotta Canonica',body:'Nuova puntata disponibile',url:'/'};try{data={...data,...event.data.json()}}catch{}
 event.waitUntil(self.registration.showNotification(data.title,{body:data.body,icon:'/icon-192.png',badge:'/icon-192.png',data:{url:data.url||'/'}}))});
self.addEventListener('notificationclick',event=>{event.notification.close();const target=event.notification.data?.url||'/';event.waitUntil(clients.matchAll({type:'window',includeUncontrolled:true}).then(list=>{for(const client of list){if('focus'in client){client.navigate(target);return client.focus()}}if(clients.openWindow)return clients.openWindow(target)}))});
