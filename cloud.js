/* Rotta Canonica: optional cloud synchronization. Local-first even without credentials. */
'use strict';
const CLOUD_SDK='https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.49.8/+esm';
const CLOUD_OWNER_KEY='rotta-canonica-cloud-owner-v1';
const CLOUD_STATUS={state:'loading',message:'Controllo collegamento cloud…',user:null,config:null,accountConflict:false};
let cloudClient=null,cloudBusy=false,cloudDirty=false,cloudTimer=null,cloudHydrating=false,cloudInitial=false;
const cloudState=()=>({...CLOUD_STATUS});
function cloudPanel(){
 const s=cloudState();const online=s.state==='ready';const signed=!!s.user;
 const status=s.accountConflict?'Protezione account: dati locali associati a un altro account. La sincronizzazione è sospesa.':signed?'Connesso come '+(s.user.email||'utente') : online?'Disponibile · non connesso':s.state==='loading'?'Verifica in corso…':s.message;
 const login=signed?`<div class="row-buttons"><button class="button small primary" data-cloud-action="sync" ${s.accountConflict?'disabled':''}>Sincronizza adesso</button><button class="button small secondary" data-cloud-action="logout">Esci</button></div>`:online?`<form class="cloud-email-form" data-cloud-form="account">
   <label class="cloud-email-label" for="cloud-email">Email</label>
   <input id="cloud-email" name="email" type="email" inputmode="email" autocomplete="username" required placeholder="tu@email.com">
   <label class="cloud-email-label" for="cloud-password">Password</label>
   <input id="cloud-password" name="password" type="password" autocomplete="current-password" required minlength="8" placeholder="Almeno 8 caratteri">
   <div class="cloud-email-row">
     <button class="button small primary" type="submit" data-cloud-action="login">Accedi</button>
     <button class="button small secondary" type="button" data-cloud-action="register">Crea account</button>
   </div>
   <small class="cloud-email-hint">Gratis: stessa email e password su iPhone, Android e PC. Alla prima sincronizzazione i progressi si uniscono.</small>
 </form>`:`<p class="cloud-offline-note">La sincronizzazione cloud non è disponibile in questa sessione. I progressi restano salvati sul dispositivo: usa Esporta/Importa dalle Impostazioni.</p>`;
 return `<section class="paper-panel cloud-panel"><h3>${art('compass')} Account e sincronizzazione</h3><p class="cloud-status" role="status">${cleanText(status)}</p><p>Conserva i progressi sul dispositivo e sincronizza gratis la rotta tra iPhone, Android e PC. La prima sincronizzazione unisce i dati anziché cancellarli.</p>${login}
 ${s.accountConflict?'<div class="account-switch-warning"><strong>Account differente su questo dispositivo</strong><p>Esporta un backup prima di procedere. Per utilizzare il nuovo account è necessario cancellare esplicitamente i vecchi dati locali; non saranno trasferiti nel nuovo account.</p><button class="button small secondary" data-action="export">Esporta backup</button> <button class="button small danger" data-cloud-action="account-switch">Passa al nuovo account</button></div>':''}<div class="setting-item"><div><b>Notifiche nuove puntate</b><small>Notifiche push solo dopo consenso, login e installazione della PWA sui dispositivi che lo richiedono.</small></div><div class="row-buttons"><button class="button small secondary" data-cloud-action="push-on" ${!signed||s.accountConflict||!s.config?.vapidPublicKey?'disabled':''}>Attiva</button><button class="button small secondary" data-cloud-action="push-off" ${!signed||s.accountConflict?'disabled':''}>Disattiva</button></div></div><p class="smallprint">${s.state==='unconfigured'?'Il backend non è ancora configurato: i tuoi dati locali e i backup continuano a funzionare.':'La sincronizzazione usa il tuo account; i dati restano privati e puoi sempre esportarli.'}</p></section>`;
}
function cloudChanged(){if(typeof tab!=='undefined'&&tab==='settings'&&typeof render==='function')render()}
function epoch(x){const n=Number(x);return Number.isFinite(n)&&n>0?n:0}
function ownObject(x){return x&&typeof x==='object'&&!Array.isArray(x)?x:{}}
function safeSnapshot(){return {version:6,watched:[...watched],start,showFiller,extras:JSON.parse(JSON.stringify(extra))}}
function mergeValueSet(localItems,remoteItems,localChanges,remoteChanges,max=3000){
 const left=new Set((Array.isArray(localItems)?localItems:[]).filter(n=>Number.isInteger(n)&&n>=1&&n<=max));
 const right=new Set((Array.isArray(remoteItems)?remoteItems:[]).filter(n=>Number.isInteger(n)&&n>=1&&n<=max));
 const out=new Set();const merged={};
 for(const n of new Set([...left,...right,...Object.keys(localChanges).map(Number),...Object.keys(remoteChanges).map(Number)])){
   if(!Number.isInteger(n)||n<1||n>max)continue;
   const le=ownObject(localChanges[n]),re=ownObject(remoteChanges[n]);
   const a=epoch(le.at),b=epoch(re.at);let chosen;
   if(a||b){chosen=a>=b?{at:a,value:!!le.value}:{at:b,value:!!re.value};if(a===b&&a!==0)chosen.value=!!le.value||!!re.value}
   else chosen={at:0,value:left.has(n)||right.has(n)};
   if(chosen.value)out.add(n);
   if(chosen.at)merged[n]=chosen;
 }
 return {items:[...out].sort((a,b)=>a-b),changes:merged};
}
function mergeCharacterFavoriteLists(l,r,le,re){
 const left=new Set(Array.isArray(l)?l:[]),right=new Set(Array.isArray(r)?r:[]),all=new Set([...left,...right,...Object.keys(ownObject(le)),...Object.keys(ownObject(re))]);
 const entries={},selected=[];
 for(const id of all){if(!/^[a-z]{2,16}$/.test(id))continue;
 const a=ownObject(le)[id]||{},b=ownObject(re)[id]||{},atA=epoch(a.at),atB=epoch(b.at);
 const value=atA||atB?(atA>=atB?!!a.value:!!b.value):(left.has(id)||right.has(id));
 if(value)selected.push(id);
 if(atA||atB)entries[id]=atA>=atB?{at:atA,value:!!a.value}:{at:atB,value:!!b.value};
 }
 return {selected,entries};
}
function mergeObjectFields(left,right,le,re,max=3000){
 const a=ownObject(left),b=ownObject(right),lc=ownObject(le),rc=ownObject(re);const result={},changes={};
 for(const key of new Set([...Object.keys(a),...Object.keys(b),...Object.keys(lc),...Object.keys(rc)])){
  const n=Number(key);if(!Number.isInteger(n)||n<1||n>max)continue;
  const l=epoch(lc[key]),r=epoch(rc[key]),value=l>=r?(key in a?a[key]:undefined):(key in b?b[key]:undefined);
  if(value!==undefined&&value!==null&&value!=='')result[key]=value;
  if(l||r)changes[key]=Math.max(l,r);
 }
 return {values:result,changes};
}
function mergeSnapshots(local,remote){
 const l=ownObject(local),r=ownObject(remote),le=ownObject(l.extras),re=ownObject(r.extras);
 const w=mergeValueSet(l.watched,r.watched,ownObject(le.watchEdits),ownObject(re.watchEdits));
 const f=mergeValueSet(le.favorites,re.favorites,ownObject(le.favoriteEdits),ownObject(re.favoriteEdits));
 const characters=mergeCharacterFavoriteLists(le.characterFavorites,re.characterFavorites,le.characterFavoriteEdits,re.characterFavoriteEdits);
 const notes=mergeObjectFields(le.notes,re.notes,le.noteEdits,re.noteEdits);
 const ratings=mergeObjectFields(le.ratings,re.ratings,le.ratingEdits,re.ratingEdits);
 const watchedAt={...ownObject(re.watchedAt),...ownObject(le.watchedAt)};
 for(const [key,val] of Object.entries(ownObject(re.watchedAt))){if(Date.parse(val)>Date.parse(watchedAt[key]||''))watchedAt[key]=val}
 const localAt=epoch(le.settingsUpdatedAt),remoteAt=epoch(re.settingsUpdatedAt);
 const settings=localAt>=remoteAt?le:re;
 return {version:6,watched:w.items,start:Number.isInteger((localAt>=remoteAt?l:r).start)?(localAt>=remoteAt?l:r).start:92,
 showFiller:!!(localAt>=remoteAt?l:r).showFiller,extras:{...re,...le,
 favorites:f.items,watchEdits:w.changes,favoriteEdits:f.changes,characterFavorites:characters.selected,characterFavoriteEdits:characters.entries,
 notes:notes.values,noteEdits:notes.changes,ratings:ratings.values,ratingEdits:ratings.changes,watchedAt,
 spoiler:settings.spoiler!==false,theme:['light','ocean'].includes(settings.theme)?settings.theme:'light',reminderDays:Number.isInteger(settings.reminderDays)?settings.reminderDays:0,
 settingsUpdatedAt:Math.max(localAt,remoteAt),catalogOverride:{...ownObject(re.catalogOverride),...ownObject(le.catalogOverride)}}};
}
function applyCloudSnapshot(s){cloudHydrating=true;try{
 watched=new Set(s.watched.filter(n=>!filler.has(n)&&n<=CATALOG_LIMIT));start=Number.isInteger(s.start)&&s.start>=1&&s.start<=CATALOG_LIMIT?s.start:92;showFiller=!!s.showFiller;
 const incoming=ownObject(s.extras);extra={...extra,...incoming};
 localStorage.setItem(STORAGE,JSON.stringify({watched:[...watched],start,showFiller}));
 localStorage.setItem(EXTRA_KEY,JSON.stringify(extra));applyTheme();render();
}finally{cloudHydrating=false}}
async function cloudSync(){if(cloudBusy||!cloudClient||!CLOUD_STATUS.user||cloudHydrating||!navigator.onLine)return;
 const previousOwner=localStorage.getItem(CLOUD_OWNER_KEY);
 if(previousOwner&&previousOwner!==CLOUD_STATUS.user.id){CLOUD_STATUS.accountConflict=true;CLOUD_STATUS.message='Dati locali appartenenti a un altro account: sincronizzazione sospesa';cloudChanged();return;}
 CLOUD_STATUS.accountConflict=false;
 cloudBusy=true;cloudDirty=false;try{
 const id=CLOUD_STATUS.user.id;
 const {data,error}=await cloudClient.from('rotta_user_state').select('state').eq('user_id',id).maybeSingle();if(error)throw error;
 const combined=mergeSnapshots(safeSnapshot(),data?.state||{});
 const {error:putError}=await cloudClient.from('rotta_user_state').upsert({user_id:id,state:combined,updated_at:new Date().toISOString()},{onConflict:'user_id'});
 if(putError)throw putError;
 localStorage.setItem(CLOUD_OWNER_KEY,id);
 applyCloudSnapshot(combined);cloudInitial=true;CLOUD_STATUS.message='Sincronizzato';
 }catch(e){cloudDirty=true;CLOUD_STATUS.message='Sincronizzazione non riuscita: '+String(e.message||'riprova');console.warn('Rotta cloud sync:',e)}finally{cloudBusy=false;cloudChanged();if(cloudDirty){clearTimeout(cloudTimer);cloudTimer=setTimeout(cloudSync,10000)}}
}
function queueCloudSync(){if(cloudHydrating||!CLOUD_STATUS.user)return;cloudDirty=true;clearTimeout(cloudTimer);cloudTimer=setTimeout(cloudSync,1200)}
async function initializeCloud(){try{
 const res=await fetch('/api/public-config',{cache:'no-store'});if(!res.ok)throw Error('Backend non disponibile');const cfg=await res.json();
 if(!cfg.enabled||!/^https:\/\//.test(cfg.supabaseUrl||'')||!cfg.publishableKey){CLOUD_STATUS.state='unconfigured';CLOUD_STATUS.message='Servizio cloud da configurare';return}
 CLOUD_STATUS.config=cfg;
 const {createClient}=await import(CLOUD_SDK);
 cloudClient=createClient(cfg.supabaseUrl,cfg.publishableKey,{auth:{flowType:'pkce',detectSessionInUrl:true,persistSession:true,autoRefreshToken:true}});
 CLOUD_STATUS.state='ready';
 cloudClient.auth.onAuthStateChange((_event,session)=>{const previous=CLOUD_STATUS.user?.id;CLOUD_STATUS.user=session?.user||null;if(session?.user&&(previous!==session.user.id||!cloudInitial))setTimeout(cloudSync,200);cloudChanged()});
 const {data,error}=await cloudClient.auth.getSession();if(error)throw error;CLOUD_STATUS.user=data.session?.user||null;
 if(CLOUD_STATUS.user)await cloudSync();
 }catch(e){CLOUD_STATUS.state='unconfigured';CLOUD_STATUS.message='Backend non disponibile: usa il backup locale';console.warn('Rotta cloud:',e)}finally{cloudChanged()}}
function urlBase64ToUint8Array(base64){const padding='='.repeat((4-base64.length%4)%4);const str=atob((base64+padding).replace(/-/g,'+').replace(/_/g,'/'));return Uint8Array.from(str,c=>c.charCodeAt(0))}
function cloudCredentials(fromEl){
 const root=(fromEl&&fromEl.closest('form'))||document;
 const email=String((root.querySelector('#cloud-email')||{}).value||'').trim().toLowerCase();
 const password=String((root.querySelector('#cloud-password')||{}).value||'');
 if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))throw Error('Inserisci un’email valida');
 if(password.length<8)throw Error('La password deve avere almeno 8 caratteri');
 return {email,password};
}
async function cloudRegister(email,password){
 const res=await fetch('/api/auth/register',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({email,password}),cache:'no-store'});
 const data=await res.json().catch(()=>({}));
 if(!res.ok)throw Error(data.error||'Registrazione non riuscita');
}
async function cloudPasswordLogin(email,password){
 const {data,error}=await cloudClient.auth.signInWithPassword({email,password});
 if(error)throw error;
 CLOUD_STATUS.user=data.user||null;
 cloudChanged();
 await cloudSync();
 toast('Accesso effettuato: sincronizzazione avviata');
}
async function cloudAction(action,fromEl){try{
 if(!cloudClient||CLOUD_STATUS.state!=='ready'){toast('Sincronizzazione cloud da configurare');return}
 if(action==='register'){
  const {email,password}=cloudCredentials(fromEl);
  await cloudRegister(email,password);
  await cloudPasswordLogin(email,password);
  return;
 }
 if(action==='login'){
  const {email,password}=cloudCredentials(fromEl);
  await cloudPasswordLogin(email,password);
  return;
 }
 if(action==='logout'){await cloudClient.auth.signOut();CLOUD_STATUS.user=null;CLOUD_STATUS.accountConflict=false;cloudInitial=false;cloudChanged();toast('Account scollegato; dati locali conservati');return}
 if(action==='account-switch'){if(!CLOUD_STATUS.accountConflict)return;modal('<h3>Passare al nuovo account?</h3><p>Questa operazione cancellerà <b>i dati locali associati al precedente account</b> (episodi visti, note e preferiti) solo su questo dispositivo, senza cancellare quelli salvati nel precedente cloud. Esporta prima il backup se vuoi conservarli.</p><div class="modal-buttons"><button class="button secondary" data-action="export">Esporta backup</button><button class="button secondary" data-action="modal-cancel">Annulla</button><button class="button danger" data-cloud-action="account-switch-confirm">Cancella dati locali e collega</button></div>');return}
 if(action==='account-switch-confirm'){if(!CLOUD_STATUS.accountConflict||!CLOUD_STATUS.user)return;localStorage.removeItem(STORAGE);localStorage.removeItem(EXTRA_KEY);watched=new Set();start=92;showFiller=false;extra=loadExtra();localStorage.setItem(CLOUD_OWNER_KEY,CLOUD_STATUS.user.id);CLOUD_STATUS.accountConflict=false;cloudInitial=false;applyTheme();saveAll();closeModal();render();await cloudSync();toast(CLOUD_STATUS.message||'Nuovo account collegato');return}
 if(CLOUD_STATUS.accountConflict)throw Error('Sincronizzazione sospesa: account differente. Esporta un backup e usa Passa al nuovo account.');
 if(action==='sync'){await cloudSync();toast(CLOUD_STATUS.message||'Sincronizzazione completata');return}
 if(!CLOUD_STATUS.user)throw Error('Accedi prima con un account');
 if(action==='push-on'){
  if(!('Notification'in window)||!('serviceWorker'in navigator)||!('PushManager'in window)||!window.isSecureContext)throw Error('Le notifiche push non sono supportate qui');
  const perm=await Notification.requestPermission();if(perm!=='granted')throw Error('Autorizzazione notifiche non concessa');
  const reg=await navigator.serviceWorker.ready;
  let subscription=await reg.pushManager.getSubscription();if(!subscription)subscription=await reg.pushManager.subscribe({userVisibleOnly:true,applicationServerKey:urlBase64ToUint8Array(CLOUD_STATUS.config.vapidPublicKey)});
  const {data}=await cloudClient.auth.getSession();const res=await fetch('/api/push/subscription',{method:'POST',headers:{'Content-Type':'application/json','Authorization':'Bearer '+data.session.access_token},body:JSON.stringify(subscription.toJSON())});if(!res.ok)throw Error((await res.json().catch(()=>({}))).error||'Registrazione notifiche fallita');toast('Notifiche push attivate');return;
 }
 if(action==='push-off'){
  const reg=await navigator.serviceWorker.ready,sub=await reg.pushManager.getSubscription();
  if(sub){const {data}=await cloudClient.auth.getSession();await fetch('/api/push/subscription',{method:'DELETE',headers:{'Content-Type':'application/json','Authorization':'Bearer '+data.session.access_token},body:JSON.stringify({endpoint:sub.endpoint})});await sub.unsubscribe()}
  toast('Notifiche push disattivate');return;
 }
 }catch(err){
  const msg=String(err.message||err);
  const friendly=/rate limit|over_email/i.test(msg)?'Limite email gratuito raggiunto: usa “Crea account” / “Accedi” con password (senza link email).':msg;
  toast('Operazione non riuscita: '+friendly.slice(0,110));console.warn('Cloud action',err)
 }
}
document.addEventListener('click',e=>{const b=e.target.closest('[data-cloud-action]');if(!b||b.type==='submit')return;e.preventDefault();cloudAction(b.dataset.cloudAction,b)});
document.addEventListener('submit',e=>{const form=e.target.closest('[data-cloud-form="account"]');if(!form)return;e.preventDefault();cloudAction('login',form)});
window.addEventListener('online',()=>{if(CLOUD_STATUS.user)cloudSync()});
window.addEventListener('focus',()=>{if(CLOUD_STATUS.user)cloudSync()});
window.RottaCloud={queueSync:queueCloudSync,status:cloudState,sync:cloudSync};
window.addEventListener('load',initializeCloud,{once:true});
