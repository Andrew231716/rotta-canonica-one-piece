const CACHE='rotta-canonica-v12r3';
const ASSETS=["/","/index.html","/styles.css","/app.js","/features.js","/features.css","/characters-v8.css","/characters-v10.css","/enhancements-v9.css","/enhancements-audit.css","/polish-v11.css","/polish-v11.js","/cloud.js","/cloud.css","/data/episodes.json","/icon.svg","/icon-192.png","/icon-512.png","/manifest.webmanifest","/refinement-v12.css","/assets/world-sunset.webp","/assets/ui-flag.webp"];
const NETWORK_FIRST=/\.(?:html?|css|js|webmanifest)$|\/$|\/index\.html$/i;
self.addEventListener('install',e=>{e.waitUntil(caches.open(CACHE).then(c=>c.addAll(ASSETS)).then(()=>self.skipWaiting()))});
self.addEventListener('activate',e=>{
 e.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim()).then(()=>self.clients.matchAll({type:'window'})).then(list=>list.forEach(c=>c.postMessage({type:'ROTTA_SW_UPDATED',cache:CACHE}))))
});
self.addEventListener('fetch',event=>{
 const request=event.request;if(request.method!=='GET')return;
 const url=new URL(request.url);if(url.origin!==self.location.origin||url.pathname.startsWith('/api/')||url.pathname==='/data/episodes-latest.json')return;
 const fetchAndStore=()=>fetch(request,{cache:'no-cache'}).then(response=>{if(response.ok){const copy=response.clone();event.waitUntil(caches.open(CACHE).then(cache=>cache.put(request,copy)).catch(()=>{}))}return response});
 if(request.mode==='navigate'||NETWORK_FIRST.test(url.pathname)){
  event.respondWith(fetchAndStore().catch(()=>caches.match(request).then(c=>c||caches.match('/index.html'))));
  return;
 }
 event.respondWith(caches.match(request).then(cached=>cached?cached:fetchAndStore().catch(()=>cached)));
});
self.addEventListener('push',event=>{let data={title:'Rotta Canonica',body:'Nuova puntata disponibile',url:'/'};try{data={...data,...event.data.json()}}catch{}
 event.waitUntil(self.registration.showNotification(data.title,{body:data.body,icon:'/icon-192.png',badge:'/icon-192.png',data:{url:data.url||'/'}}))});
self.addEventListener('notificationclick',event=>{event.notification.close();const target=event.notification.data?.url||'/';event.waitUntil(clients.matchAll({type:'window',includeUncontrolled:true}).then(list=>{for(const client of list){if('focus'in client){client.navigate(target);return client.focus()}}if(clients.openWindow)return clients.openWindow(target)}))});
