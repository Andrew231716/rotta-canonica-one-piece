// Detect newly aired episodes only. Never infer manga canon/filler status from Jikan.
import {readFile,writeFile} from 'node:fs/promises';
const OUT='data/episodes-latest.json',BASE=1155,API='https://api.jikan.moe/v4/anime/21/episodes';
const pause=ms=>new Promise(resolve=>setTimeout(resolve,ms));
async function getPage(page){for(let retry=0;retry<4;retry++){
 try{const r=await fetch(API+'?page='+page,{headers:{Accept:'application/json','User-Agent':'RottaCanonicaWeeklyChecker/1.1'}});
 if(r.status===429||r.status>=500){await pause((retry+1)*1800);continue}
 if(!r.ok)throw Error('Jikan HTTP '+r.status);const json=await r.json();if(!Array.isArray(json?.data))throw Error('Risposta API non valida');return json}
 catch(err){if(retry===3)throw err;await pause(1500*(retry+1))}}
 throw Error('API indisponibile')}
let old;try{old=JSON.parse(await readFile(OUT,'utf8'))}catch{old={schemaVersion:1,episodes:[]}}
const first=await getPage(1),last=Number(first.pagination?.last_visible_page);
if(!Number.isInteger(last)||last<1||last>200)throw Error('Paginazione inattesa: '+last);
const pages=[first];if(last>2){await pause(850);pages.push(await getPage(last-1))}if(last>1){await pause(850);pages.push(await getPage(last))}
const observed=new Map(),now=Date.now();
for(const page of pages)for(const ep of page.data){const number=Number(ep.mal_id);if(!Number.isInteger(number)||number<=BASE||number>3000)continue;
 const ts=Date.parse(ep.aired||'');if(!Number.isFinite(ts)||ts>now)continue;
 observed.set(number,{number,title:String(ep.title||'Titolo da verificare').slice(0,150),aired:new Date(ts).toISOString().slice(0,10),reportedFiller:ep.filler===true,reportedRecap:ep.recap===true});}
const previous=new Map((Array.isArray(old.episodes)?old.episodes:[]).filter(e=>Number.isInteger(e.number)&&e.number>BASE&&e.number<=3000).map(e=>[e.number,e]));
for(const [n,entry] of observed){const prior=previous.get(n)||{};previous.set(n,{...entry,classification:['canon','mixed','filler'].includes(prior.classification)?prior.classification:'unverified'})}
const episodes=[...previous.values()].sort((a,b)=>a.number-b.number);
const data={schemaVersion:1,source:'Jikan API (MyAnimeList, fonte terza non ufficiale)',checkedAt:new Date().toISOString(),latest:Math.max(BASE,...episodes.map(e=>e.number)),episodes};
await writeFile(OUT,JSON.stringify(data,null,2)+'\n');console.log('Nuove uscite:',episodes.length,'· Da verificare:',episodes.filter(e=>e.classification==='unverified').length);
