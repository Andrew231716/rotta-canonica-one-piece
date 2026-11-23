// Scheduled weekly by Vercel Cron. Authenticated with CRON_SECRET, never callable by visitors.
const {db,sendPush}=require('../../lib/push-server');
module.exports=async function handler(req,res){
 res.setHeader('Cache-Control','no-store, private');
 if(req.method!=='GET')return res.status(405).json({error:'Metodo non consentito'});
 const supplied=req.headers.authorization||'';
 if(!process.env.CRON_SECRET||supplied!=='Bearer '+process.env.CRON_SECRET)return res.status(401).json({error:'Non autorizzato'});
 try{
  const site=process.env.PUBLIC_SITE_URL||'https://rotta-canonica-one-piece.vercel.app';const u=new URL(site);if(u.protocol!=='https:')throw Error('Invalid site URL');
  const response=await fetch(u.origin+'/data/episodes-latest.json',{cache:'no-store',signal:AbortSignal.timeout(6000)});
  if(!response.ok)throw Error('Il catalogo delle nuove puntate non è disponibile');const source=await response.json();
  const episodes=(Array.isArray(source.episodes)?source.episodes:[]).filter(e=>Number.isInteger(e.number)&&e.number>1155&&e.number<=3000&&/^\d{4}-\d{2}-\d{2}$/.test(e.aired||''));
  if(!episodes.length)return res.status(200).json({ok:true,newEpisodes:0,sent:0});
  const latest=Math.max(...episodes.map(e=>e.number));
  const subs=await db('GET','rotta_push_subscriptions','?select=endpoint,last_sent_episode&last_sent_episode=lt.'+latest+'&limit=80');
  let sent=0,removed=0,errors=0;
  // Bounded parallelism prevents a large subscriber list from exhausting a Vercel function timeout.
  for(let i=0;i<subs.length;i+=12){
    await Promise.all(subs.slice(i,i+12).map(async item=>{try{
      const r=await sendPush(item.endpoint);
      if(r.ok){sent++;await db('PATCH','rotta_push_subscriptions','?endpoint=eq.'+encodeURIComponent(item.endpoint),{last_sent_episode:latest})}
      else if([404,410].includes(r.status)){removed++;await db('DELETE','rotta_push_subscriptions','?endpoint=eq.'+encodeURIComponent(item.endpoint))}
      else errors++;
    }catch{errors++}}));
  }
  return res.status(200).json({ok:true,latest,newEpisodes:episodes.length,sent,removed,errors,more:subs.length===80});
 }catch(e){console.error('Weekly push check',e.message);return res.status(503).json({error:'Controllo notifiche non disponibile'})}
};
