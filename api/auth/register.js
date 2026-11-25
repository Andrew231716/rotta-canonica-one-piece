'use strict';
// An authenticated, email-verified registration must use Supabase Auth.
// This deprecated endpoint cannot mint immediately confirmed accounts.
module.exports=async function handler(req,res){
 res.setHeader('Cache-Control','no-store, private');
 if(req.method!=='POST')return res.status(405).json({error:'Metodo non consentito'});
 return res.status(410).json({error:'Registrazione diretta disabilitata: usa la conferma email.'});
};