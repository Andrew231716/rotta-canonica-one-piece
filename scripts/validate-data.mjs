// Deterministic, offline validation. It checks provenance structure, not factual truth of external sources.
import {readFile} from 'node:fs/promises';
const read=async f=>JSON.parse(await readFile(f,'utf8'));
const base=await read('data/episodes.json');
const feed=await read('data/episodes-latest.json');
if(!Array.isArray(base.episodes)||base.episodes.length!==1155)throw Error('Expected 1155 baseline episodes');
for(let i=0;i<1155;i++){
 const ep=base.episodes[i];if(ep?.n!==i+1)throw Error('Missing / duplicate baseline episode '+(i+1));
 if((ep.chapter||ep.summary||ep.duration)&&!/^https:\/\/[^\s]+$/.test(ep.editorialSource?.url||''))throw Error('Chapter/summary/duration missing source: '+ep.n);
}
if(feed.schemaVersion!==1||!Array.isArray(feed.episodes))throw Error('Bad weekly feed');
const seen=new Set();
for(const e of feed.episodes){
 if(!Number.isInteger(e.number)||e.number<=1155||e.number>3000||seen.has(e.number))throw Error('Bad episode number '+e.number);
 seen.add(e.number);
 if(!/^\d{4}-\d{2}-\d{2}$/.test(e.aired||''))throw Error('Aired date missing '+e.number);
 if(Number.isNaN(Date.parse(e.aired))||Date.parse(e.aired)>Date.now()+86400000)throw Error('Future/invalid aired date '+e.number);
 if(!['canon','mixed','filler','unverified'].includes(e.classification))throw Error('Invalid classification '+e.number);
 if(e.classification!=='unverified'){
  if(!/^https:\/\/[^\s]+$/.test(e.classificationReview?.url||'')||!/^\d{4}-\d{2}-\d{2}$/.test(e.classificationReview?.checkedAt||''))throw Error('Missing classification source '+e.number);
 }
}
console.log('Valid catalog records:',base.episodes.length,'· releases:',feed.episodes.length,'· with classification source:',feed.episodes.filter(e=>e.classification!=='unverified').length);
