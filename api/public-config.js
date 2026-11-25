// Email/password authentication only. Never expose secret/service-role keys.
module.exports=async function handler(req,res){
 res.setHeader('Cache-Control','no-store, private');
 if(req.method!=='GET')return res.status(405).json({error:'Metodo non consentito'});
 const url=process.env.SUPABASE_URL||process.env.NEXT_PUBLIC_SUPABASE_URL||'',key=process.env.SUPABASE_PUBLISHABLE_KEY||process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY||process.env.SUPABASE_ANON_KEY||process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY||'';
 const enabled=/^https:\/\/[^/]+\.supabase\.co\/?$/.test(url)&&!!key;
 return res.status(200).json({enabled,supabaseUrl:enabled?url:'',publishableKey:enabled?key:''});
};
