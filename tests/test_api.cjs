const assert=require('node:assert/strict');
const path=require('node:path');
const ROOT=path.resolve(__dirname,'..');
const publicConfig=require(ROOT+'/api/public-config.js');
const sub=require(ROOT+'/api/push/subscription.js');
const check=require(ROOT+'/api/push/check.js');
const register=require(ROOT+'/api/auth/register.js');
function response(){return{headers:{},statusCode:0,body:null,setHeader(k,v){this.headers[k]=v},status(c){this.statusCode=c;return this},json(d){this.body=d;return this}}}
(async()=>{
 process.env.SUPABASE_URL='https://invalid.example';
 let r=response();await publicConfig({method:'GET'},r);assert.equal(r.statusCode,200);assert.equal(r.body.enabled,false);assert.equal(JSON.stringify(r.body).includes('secret'),false);
 process.env.SUPABASE_URL='https://example.supabase.co';
 process.env.SUPABASE_PUBLISHABLE_KEY='sb_publishable_test';
 r=response();await publicConfig({method:'GET'},r);assert.equal(r.body.enabled,true);
 r=response();await sub({method:'GET'},r);assert.equal(r.statusCode,405);
 r=response();await check({method:'GET',headers:{}},r);assert.equal(r.statusCode,401);
 r=response();await register({method:'GET'},r);assert.equal(r.statusCode,405);
 r=response();await register({method:'POST',body:{email:'bad',password:'short'}},r);assert.equal(r.statusCode,410);
 const {endpointSafe}=require(ROOT+'/lib/push-server.js');assert.equal(endpointSafe('http://localhost:3456/'),false);assert.equal(endpointSafe('https://fcm.googleapis.com/fcm/send/a'),true);assert.equal(endpointSafe('https://my-evil-site.example/a'),false);
 console.log('API security smoke tests: PASS');
})().catch(e=>{console.error(e);process.exit(1)});
