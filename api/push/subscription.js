const {userFromToken,db,endpointSafe}=require('../../lib/push-server');
module.exports=async function handler(req,res){
 res.setHeader('Cache-Control','no-store, private');
 if(!['POST','DELETE'].includes(req.method))return res.status(405).json({error:'Metodo non consentito'});
 try{
  const token=(req.headers.authorization||'').match(/^Bearer\s+(\S+)$/i)?.[1];const user=await userFromToken(token),data=typeof req.body==='string'?JSON.parse(req.body):req.body||{};
  if(!endpointSafe(data.endpoint))return res.status(400).json({error:'Endpoint push non valido'});
  if(req.method==='DELETE'){
   await db('DELETE','rotta_push_subscriptions','?endpoint=eq.'+encodeURIComponent(data.endpoint)+'&user_id=eq.'+encodeURIComponent(user.id));return res.status(200).json({ok:true});
  }
  if(!/^[A-Za-z0-9_-]{20,180}$/.test(data.keys?.p256dh||'')||!/^[A-Za-z0-9_-]{8,100}$/.test(data.keys?.auth||''))return res.status(400).json({error:'Chiavi push non valide'});
  const old=await db('GET','rotta_push_subscriptions','?select=endpoint,user_id&endpoint=eq.'+encodeURIComponent(data.endpoint));
  if(old.length&&old[0].user_id!==user.id)return res.status(409).json({error:'Endpoint già collegato a un altro account'});
  // Subscription begins at the current published episode, avoiding backfilled alerts.
  let latest=1155;try{const site=process.env.PUBLIC_SITE_URL||'https://rotta-canonica-one-piece.vercel.app';const host=new URL(site);if(host.protocol==='https:'){const r=await fetch(host.origin+'/data/episodes-latest.json',{signal:AbortSignal.timeout(2000)});if(r.ok){const j=await r.json();if(Number.isInteger(j.latest))latest=Math.max(1155,Math.min(j.latest,3000))}}}catch{}
  await db('POST','rotta_push_subscriptions','?on_conflict=endpoint',[{endpoint:data.endpoint,user_id:user.id,p256dh:data.keys.p256dh,auth:data.keys.auth,last_sent_episode:latest}]);
  return res.status(200).json({ok:true});
 }catch(e){console.error('Subscription endpoint',e.message);return res.status(e.status||503).json({error:e.status?'Accesso non autorizzato':'Servizio notifiche non configurato o indisponibile'})}
};
