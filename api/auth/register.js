// Creates a confirmed email/password user via service role so signup works
 // without Supabase's free built-in mailer (rate-limited / often blocked).
'use strict';
const {config}=require('../../lib/push-server.js');

function bad(res,status,error){return res.status(status).json({error})}

module.exports=async function handler(req,res){
 res.setHeader('Cache-Control','no-store, private');
 if(req.method!=='POST')return bad(res,405,'Metodo non consentito');
 let body=req.body;
 if(typeof body==='string'){try{body=JSON.parse(body)}catch{return bad(res,400,'JSON non valido')}}
 body=body||{};
 const email=String(body.email||'').trim().toLowerCase();
 const password=String(body.password||'');
 if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)||email.length>200)return bad(res,400,'Email non valida');
 if(password.length<8||password.length>100)return bad(res,400,'La password deve avere almeno 8 caratteri');
 let c;
 try{c=config()}catch{return bad(res,503,'Backend non configurato')}
 try{
  const r=await fetch(c.url+'/auth/v1/admin/users',{
   method:'POST',
   headers:{apikey:c.secret,Authorization:'Bearer '+c.secret,'Content-Type':'application/json'},
   body:JSON.stringify({email,password,email_confirm:true}),
   cache:'no-store'
  });
  const data=await r.json().catch(()=>({}));
  if(r.status===422||r.status===400){
   const msg=String(data.msg||data.error_description||data.error||'');
   if(/already|registered|exists/i.test(msg))return bad(res,409,'Account già esistente: usa Accedi');
   return bad(res,400,msg||'Registrazione non riuscita');
  }
  if(!r.ok)return bad(res,502,'Registrazione non riuscita');
  return res.status(200).json({ok:true});
 }catch(e){
  return bad(res,502,'Registrazione non riuscita');
 }
};
