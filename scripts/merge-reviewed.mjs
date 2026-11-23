// Manual editorial review import; every published manga chapter/summary must cite a source.
import{readFile,writeFile}from'node:fs/promises';
const primary='data/episodes.json',manual='data/reviewed-episodes.json';
const doc=JSON.parse(await readFile(primary,'utf8'));
const reviewed=JSON.parse(await readFile(manual,'utf8'));
if(!Array.isArray(doc.episodes)||!Array.isArray(reviewed.episodes))throw Error('Bad data');
const byNumber=new Map(doc.episodes.map(e=>[e.n,e]));let updated=0;
for(const src of reviewed.episodes){
 if(!Number.isInteger(src.n)||!byNumber.has(src.n))throw Error('Unexpected number '+src.n);
 if(!/^https:\/\//.test(src.source?.url||'')||!/\d{4}-\d{2}-\d{2}/.test(src.source?.checkedAt||''))throw Error('Missing source for episode '+src.n);
 const row=byNumber.get(src.n);const fields=[];
 for(const name of ['chapter','summary','duration'])if(src[name]!=null){if(typeof src[name]!=='string'||!src[name].trim()||src[name].length>(name==='summary'?650:150))throw Error('Invalid '+name+' for '+src.n);row[name]=src[name].trim();fields.push(name)}
 if(fields.length){row.editorialSource={url:src.source.url,checkedAt:src.source.checkedAt,fields};updated++}
}
await writeFile(primary,JSON.stringify(doc,null,2)+'\n','utf8');
console.log('Reviewed records updated',updated);
