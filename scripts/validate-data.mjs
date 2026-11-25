// Deterministic offline checks for catalog provenance, source coverage and release feed.
import {readFile} from 'node:fs/promises';
const read=async f=>JSON.parse(await readFile(f,'utf8'));
const base=await read('data/episodes.json'),feed=await read('data/episodes-latest.json');
const BASE=1155,url=s=>typeof s?.url==='string'&&/^https:\/\/[^\s]+$/.test(s.url);
if(!Array.isArray(base.episodes)||base.episodes.length!==BASE)throw Error('Expected 1155 baseline episodes');
let titles=0,summaries=0,chapters=0;
for(let i=0;i<BASE;i++){const ep=base.episodes[i];if(ep?.n!==i+1)throw Error('Missing / duplicate baseline episode '+(i+1));
 if(ep.title){titles++;if(!url(ep.source)&&!url(ep.titleSource))throw Error('Title missing source: '+ep.n)}
 if(ep.summary){summaries++;if(!url(ep.summarySource)&&!url(ep.editorialSource))throw Error('Summary missing source: '+ep.n);if(ep.summary.length>650)throw Error('Summary too long: '+ep.n)}
 if(ep.chapter){chapters++;if(!url(ep.chapterSource)&&!url(ep.editorialSource))throw Error('Chapter mapping missing source: '+ep.n);if(ep.chapter.length>150)throw Error('Chapter field too long: '+ep.n)}
 if(ep.chapterDetails!==undefined&&!Array.isArray(ep.chapterDetails))throw Error('Invalid chapter details: '+ep.n);
 if(Array.isArray(ep.chapterDetails)&&ep.chapterDetails.length>20)throw Error('Too many chapter references: '+ep.n)}
if(titles<1050)throw Error('Title coverage too low: '+titles+'/1155');
if(summaries<900)throw Error('Summary coverage too low: '+summaries+'/1155');
if(chapters<900)throw Error('Chapter coverage too low: '+chapters+'/1155');
if(feed.schemaVersion!==1||!Array.isArray(feed.episodes))throw Error('Bad weekly feed');
const seen=new Set();let latest=BASE;
for(const e of feed.episodes){if(!Number.isInteger(e.number)||e.number<=BASE||e.number>3000||seen.has(e.number))throw Error('Bad episode number '+e.number);seen.add(e.number);latest=Math.max(latest,e.number);
 if(!/^\d{4}-\d{2}-\d{2}$/.test(e.aired||''))throw Error('Aired date missing '+e.number);
 if(Number.isNaN(Date.parse(e.aired))||Date.parse(e.aired)>Date.now()+86400000)throw Error('Future/invalid aired date '+e.number);
 if(!['canon','mixed','filler','unverified'].includes(e.classification))throw Error('Invalid classification '+e.number);
 if(e.title&&!url(e.source)&&!url(e.titleSource))throw Error('New title missing source '+e.number);
 if(e.summary&&!url(e.summarySource)&&!url(e.editorialSource))throw Error('New summary missing source '+e.number);
 if(e.chapter&&!url(e.chapterSource)&&!url(e.editorialSource))throw Error('New chapter mapping missing source '+e.number);
 if(e.classification!=='unverified'&&(!url(e.classificationReview)||!/^\d{4}-\d{2}-\d{2}$/.test(e.classificationReview?.checkedAt||'')))throw Error('Missing classification source '+e.number)}
if(Number(feed.latest||BASE)!==latest)throw Error('Latest episode pointer is stale');
console.log('Catalog provenance OK:',{episodes:BASE,titles,summaries,chapterMappings:chapters,newEpisodes:feed.episodes.length,latest});
