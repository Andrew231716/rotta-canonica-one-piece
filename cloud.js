/* Rotta Canonica: Supabase email/password authentication only; progress stays local. */
'use strict';
const AUTH_SDK='https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.49.8/+esm';
const AUTH_STATE={state:'loading',message:'Verifica accesso email…',user:null,recovery:false};
let authClient=null,authBusy=false;
function cloudState(){return {...AUTH_STATE}}
function authChanged(){
 if(typeof tab==='undefined'||typeof render!=='function')return;
 if(AUTH_STATE.recovery&&tab!=='settings'&&typeof setTab==='function'){setTab('settings');return}
 if(tab==='settings')render();
}
function cloudPanel(){
 const s=cloudState(),ready=s.state==='ready',signed=!!s.user;
 const status=signed?'Connesso: '+(s.user.email||'account verificato'):ready?'Accedi o crea un account con email e password.':s.message;
 let body='';
 if(s.recovery&&ready){
  body='<form class="cloud-email-form" data-cloud-form="password-update">'+
  '<label class="cloud-email-label" for="cloud-new-password">Nuova password</label>'+
  '<input id="cloud-new-password" type="password" name="newPassword" autocomplete="new-password" required minlength="8" placeholder="Minimo 8 caratteri">'+
  '<button type="submit" class="button primary small" data-cloud-action="update-password">Imposta nuova password</button></form>';
 }else if(signed){
  body='<div class="cloud-account-card"><p><b>Email:</b> '+cleanText(s.user.email||'')+'</p>'+
   '<button class="button small secondary" type="button" data-cloud-action="logout">Esci dall’account</button></div>';
 }else if(ready){
  body='<form class="cloud-email-form" data-cloud-form="account">'+
  '<label class="cloud-email-label" for="cloud-email">Indirizzo email</label>'+
  '<input id="cloud-email" name="email" type="email" inputmode="email" autocomplete="username" required placeholder="nome@esempio.it">'+
  '<label class="cloud-email-label" for="cloud-password">Password</label>'+
  '<input id="cloud-password" name="password" type="password" autocomplete="current-password" required minlength="8" placeholder="Almeno 8 caratteri">'+
  '<div class="cloud-email-row"><button class="button primary small" type="submit" data-cloud-action="login">Accedi</button>'+
  '<button class="button secondary small" type="button" data-cloud-action="register">Crea account</button></div>'+
  '<div class="cloud-auth-help"><button class="button secondary small" type="button" data-cloud-action="forgot">Password dimenticata?</button>'+
  '<button class="button secondary small" type="button" data-cloud-action="resend">Reinvia email di verifica</button></div></form>';
 }
 const note=ready?'L’account gestisce soltanto l’accesso. Episodi visti, note e preferiti rimangono sul dispositivo: non vengono trasferiti automaticamente.':
  'Il login richiede un progetto Supabase configurato. Puoi usare l’app e i backup locali anche senza effettuare l’accesso.';
 return '<section class="paper-panel cloud-panel" aria-label="Account email"><h3>'+art('compass')+' Account email</h3>'+
  '<p class="cloud-status" role="status">'+cleanText(status)+'</p>'+body+'<p class="smallprint">'+note+'</p></section>';
}
function credentials(form,needPassword=true){
 const email=String(form&&form.querySelector('[name="email"]')?.value||'').trim().toLowerCase();
 const password=String(form&&form.querySelector('[name="password"]')?.value||'');
 if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))throw Error('Inserisci un indirizzo email valido');
 if(needPassword&&password.length<8)throw Error('La password deve contenere almeno 8 caratteri');
 return {email,password};
}
async function authAction(action,el){
 if(authBusy)return;
 if(!authClient||AUTH_STATE.state!=='ready'){toast('Accesso email non ancora configurato');return}
 authBusy=true;
 try{
  const form=el?.closest('form');
  if(action==='register'){
   const {email,password}=credentials(form);
   const {data,error}=await authClient.auth.signUp({email,password,options:{emailRedirectTo:location.origin+'/'}});
   if(error)throw error;
   if(data?.session){AUTH_STATE.user=data.session.user;toast('Account creato. Accesso effettuato.')}
   else toast('Se l’indirizzo è valido, riceverai un’email per confermare la registrazione.');
  }else if(action==='login'){
   const {email,password}=credentials(form);
   const {data,error}=await authClient.auth.signInWithPassword({email,password});
   if(error)throw error;
   AUTH_STATE.user=data.user||null;toast('Accesso effettuato');
  }else if(action==='logout'){
   const {error}=await authClient.auth.signOut();if(error)throw error;
   AUTH_STATE.user=null;AUTH_STATE.recovery=false;toast('Uscita effettuata. I dati locali restano invariati.');
  }else if(action==='forgot'){
   const {email}=credentials(form,false);
   const {error}=await authClient.auth.resetPasswordForEmail(email,{redirectTo:location.origin+'/'});
   if(error)throw error;
   toast('Se esiste un account, riceverai un’email per reimpostare la password.');
  }else if(action==='resend'){
   const {email}=credentials(form,false);
   const {error}=await authClient.auth.resend({type:'signup',email,options:{emailRedirectTo:location.origin+'/'}});
   if(error)throw error;
   toast('Se la verifica è in sospeso, riceverai una nuova email.');
  }else if(action==='update-password'){
   const password=String(form?.querySelector('[name="newPassword"]')?.value||'');
   if(password.length<8)throw Error('La nuova password deve contenere almeno 8 caratteri');
   const {error}=await authClient.auth.updateUser({password});if(error)throw error;
   AUTH_STATE.recovery=false;toast('Password aggiornata');
  }
 }catch(err){
  const code=String(err?.code||'').toLowerCase();
  const msg=code.includes('invalid_credentials')?'Email o password non corretti':code.includes('email_not_confirmed')?'Verifica prima la tua email':String(err?.message||'Operazione non riuscita');
  toast('Account: '+msg.slice(0,130));console.warn('Supabase email auth:',code||err);
 }finally{authBusy=false;authChanged()}
}
async function initializeCloud(){
 try{
  const response=await fetch('/api/public-config',{cache:'no-store'});if(!response.ok)throw Error('Configurazione non raggiungibile');
  const config=await response.json();
  if(!config.enabled||!/^https:\/\/[^/]+\.supabase\.co\/?$/.test(config.supabaseUrl||'')||!config.publishableKey){
   AUTH_STATE.state='unconfigured';AUTH_STATE.message='Accesso email da configurare in Supabase';return;
  }
  const {createClient}=await import(AUTH_SDK);
  authClient=createClient(config.supabaseUrl,config.publishableKey,{auth:{flowType:'pkce',detectSessionInUrl:true,persistSession:true,autoRefreshToken:true}});
  authClient.auth.onAuthStateChange((event,session)=>{
   AUTH_STATE.user=session?.user||null;
   if(event==='PASSWORD_RECOVERY')AUTH_STATE.recovery=true;
   if(event==='SIGNED_OUT')AUTH_STATE.recovery=false;
   setTimeout(authChanged,0);
  });
  const {data,error}=await authClient.auth.getSession();if(error)throw error;
  AUTH_STATE.user=data.session?.user||null;AUTH_STATE.state='ready';AUTH_STATE.message='Accesso email disponibile';
 }catch(error){AUTH_STATE.state='unconfigured';AUTH_STATE.message='Accesso temporaneamente non disponibile';console.warn('Supabase init:',error)}
 finally{authChanged()}
}
document.addEventListener('click',event=>{
 const button=event.target.closest('[data-cloud-action]');if(!button||button.type==='submit')return;
 event.preventDefault();authAction(button.dataset.cloudAction,button);
});
document.addEventListener('submit',event=>{
 const form=event.target.closest('[data-cloud-form]');if(!form)return;event.preventDefault();
 const action=form.dataset.cloudForm==='password-update'?'update-password':'login';
 authAction(action,form.querySelector('button[type="submit"]')||form);
});
window.RottaAuth={status:cloudState};
window.addEventListener('load',initializeCloud,{once:true});
