// Source-aware episode metadata enrichment; no invented chapters, synopses, or anime/manga classifications.
import {readFile,writeFile} from 'node:fs/promises';
const DEST='data/episodes.json';
const JIKAN='https://api.jikan.moe/v4/anime/21/episodes';
const wait=ms=>new Promise(r=>setTimeout(r,ms));
async function page(n){for(let attempt=0;attempt<4;attempt++){
 try{const r=await fetch(JIKAN+'?page='+n,{headers:{Accept:'application/json','User-Agent':'RottaCanonica-EditorialImporter/1.0'}});if(r.status===429||r.status>=500){await wait((attempt+1)*2300);continue}if(!r.ok)throw Error('Jikan status '+r.status);const j=await r.json();if(!Array.isArray(j.data))throw Error('Episodi mancanti');return j}catch(e){if(attempt===3)throw e;await wait(1700*(attempt+1))}}
 throw Error('Jikan non disponibile')}
const doc=JSON.parse(await readFile(DEST,'utf8'));if(!Array.isArray(doc.episodes))throw Error('Catalogo non valido');
const first=await page(1),last=Number(first.pagination?.last_visible_page);
if(!Number.isInteger(last)||last<10||last>80)throw Error('Numero pagine Jikan anomalo: '+last);
const titles=new Map();
for(let n=1;n<=last;n++){
 const j=n===1?first:await page(n);
 for(const ep of j.data){if(Number.isInteger(ep.mal_id)&&ep.mal_id>=1&&ep.mal_id<=1155&&typeof ep.title==='string'&&ep.title.trim()&&ep.title.length<=180){
 titles.set(ep.mal_id,{title:ep.title.trim(),aired:typeof ep.aired==='string'?ep.aired.slice(0,10):null});}}
 if(n<last)await wait(1100);
}
// Never overwrite reviewed editorial metadata or user-written content.
let changed=0;const now=new Date().toISOString();
for(const ep of doc.episodes){const found=titles.get(ep.n);if(!found)continue;
 if(ep.title===null||ep.title===undefined||ep.title===''){
 ep.title=found.title;ep.source={provider:'Jikan API (MyAnimeList, community metadata)',url:'https://myanimelist.net/anime/21/One_Piece',checkedAt:now,fields:['title']};ep.verifiedAt=now;changed++;
 }
}
doc.catalogDisclaimer='Titoli tratti da Jikan/MyAnimeList (fonte terza); sinossi, capitoli e classificazione manga devono essere verificati separatamente.';
if(changed>0){
 doc.lastTitleImport=now;
 await writeFile(DEST,JSON.stringify(doc,null,2)+'\n','utf8');
}
console.log('Titoli aggiunti:',changed,'· Episodi catalogati:',doc.episodes.length,'· Episodi disponibili nella fonte:',titles.size);
