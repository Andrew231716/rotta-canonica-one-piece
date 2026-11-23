// Public configuration only: never return service-role keys, OAuth secrets or VAPID private keys.
module.exports=async function handler(req,res){
 res.setHeader('Cache-Control','no-store, private');
 if(req.method!=='GET')return res.status(405).json({error:'Metodo non consentito'});
 const url=process.env.SUPABASE_URL||'',key=process.env.SUPABASE_PUBLISHABLE_KEY||'';
 const enabled=/^https:\/\/[^/]+\.supabase\.co\/?$/.test(url)&&!!key;
 return res.status(200).json({enabled,supabaseUrl:enabled?url:'',publishableKey:enabled?key:'',vapidPublicKey:enabled?process.env.VAPID_PUBLIC_KEY||'':''});
};
