// Email/password authentication only. Never expose secret/service-role keys.
module.exports=async function handler(req,res){
 res.setHeader('Cache-Control','no-store, private');
 if(req.method!=='GET')return res.status(405).json({error:'Metodo non consentito'});
 // Project URL and sb_publishable key are intentionally public credentials (never use service_role here).
 const url=process.env.SUPABASE_URL||process.env.NEXT_PUBLIC_SUPABASE_URL||'https://qnmuxoelrigjfhghadjg.supabase.co';
 const key=process.env.SUPABASE_PUBLISHABLE_KEY||process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY||process.env.SUPABASE_ANON_KEY||process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY||'sb_publishable_nCJR-xxpYhlTxu3TiayKuw_aUqJD3d_';
 const enabled=/^https:\/\/[^/]+\.supabase\.co\/?$/.test(url)&&!!key;
 return res.status(200).json({enabled,supabaseUrl:enabled?url:'',publishableKey:enabled?key:''});
};
