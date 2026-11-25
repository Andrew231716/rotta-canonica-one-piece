// Sanitize incorrectly imported navigation headings (not anime episode titles).
import {readFile,writeFile} from 'node:fs/promises';
const PATH='data/episodes.json';
const doc=JSON.parse(await readFile(PATH,'utf8'));
if(!Array.isArray(doc.episodes)||doc.episodes.length!==1155)throw Error('Baseline episode catalog malformed');
const isInvalid=v=>/^(?:navigazione|navigation|curiosit[aà]|note|notes|differenze\s+(?:fra|tra)\s+manga\s+e\s+anime\s*=?|site\s+navigation|informazioni\s+episodio)$/i.test(String(v||'').trim());
let cleaned=0;
for(const ep of doc.episodes){
 if(!isInvalid(ep.title))continue;
 ep.title=null;
 ep.titleLanguage=null;
 ep.titleSource=null;
 // The generic page-heading source had been incorrectly attributed to the title.
 ep.source=null;
 cleaned++;
}
if(cleaned){
 doc.metadataCoverage={...doc.metadataCoverage,episodes:1155,titles:doc.episodes.filter(e=>e.title).length};
 await writeFile(PATH,JSON.stringify(doc,null,2)+'\n','utf8');
}
console.log('Removed false episode titles:',cleaned);
