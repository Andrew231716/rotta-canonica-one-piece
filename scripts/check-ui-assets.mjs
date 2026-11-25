// Rotta Canonica: controllo offline dei riferimenti asset e cache PWA.
// Dalla radice del repository: node scripts/check-ui-assets.mjs
import {readFile, access} from 'node:fs/promises';
const read=path=>readFile(path,'utf8');
const html=await read('index.html');
const sw=await read('service-worker.js');
const css=await read('design-system-v16.css');
const newCss=await read('nautical-finish-v18.css');
if(!html.includes('/nautical-finish-v18.css'))throw Error('Foglio grafico v18 non collegato');
if((newCss.match(/\{/g)||[]).length!==(newCss.match(/\}/g)||[]).length)throw Error('CSS v18 non valido');
const feature=await read('features.js');
if(!html.includes('/design-system-v16.css'))throw Error('Foglio grafico v16 non collegato');
if(!/rotta-canonica-v18-1-ui/.test(sw))throw Error('Cache PWA non aggiornata alla v18');
if(!feature.includes('[2,5,4,6,2,5][i%6]'))throw Error('Mappa priva delle miniature illustrate per le saghe');
if((css.match(/\{/g)||[]).length!==(css.match(/\}/g)||[]).length)throw Error('Parentesi CSS non bilanciate');
const precache=sw.match(/const ASSETS=(\[[\s\S]*?\]);/);
if(!precache)throw Error('Lista precache del service worker assente');
let assets;
try{assets=JSON.parse(precache[1])}catch{throw Error('Lista precache del service worker non valida')}
const referenced=new Set([...assets.filter(v=>v!=='/'),...Array.from(html.matchAll(/(?:src|href)="(\/[^"?]+)(?:\?[^"]*)?"/g),x=>x[1])]);
const characters=['luffy','zoro','nami','usopp','sanji','chopper','robin','franky','brook','jinbe','ace','law'];
for(const id of characters)referenced.add('/assets/character-scenes/'+id+'.webp');
for(let i=1;i<=6;i++)referenced.add('/assets/route-'+i+'.webp');
const missing=[];
for(const rel of referenced){
 if(!rel.startsWith('/')||rel.includes('..'))throw Error('Percorso sospetto: '+rel);
 try{await access('.'+rel)}catch{missing.push(rel)}
}
if(missing.length)throw Error('Asset mancanti: '+missing.join(', '));
console.log('UI assets OK:',referenced.size,'file verificati, 12 personaggi, 6 tappe illustrate');
+'{[2,5,4,6,2,5][i%6]}.webp'))throw Error('Mappa priva di paesaggi anti-spoiler');
if((css.match(/\{/g)||[]).length!==(css.match(/\}/g)||[]).length)throw Error('Parentesi CSS non bilanciate');
const precache=sw.match(/const ASSETS=(\[[\s\S]*?\]);/);
if(!precache)throw Error('Lista precache del service worker assente');
let assets;
try{assets=JSON.parse(precache[1])}catch{throw Error('Lista precache del service worker non valida')}
const referenced=new Set([...assets.filter(v=>v!=='/'),...Array.from(html.matchAll(/(?:src|href)="(\/[^"?]+)(?:\?[^"]*)?"/g),x=>x[1])]);
const characters=['luffy','zoro','nami','usopp','sanji','chopper','robin','franky','brook','jinbe','ace','law'];
for(const id of characters)referenced.add('/assets/character-scenes/'+id+'.webp');
for(let i=1;i<=6;i++)referenced.add('/assets/route-'+i+'.webp');
const missing=[];
for(const rel of referenced){
 if(!rel.startsWith('/')||rel.includes('..'))throw Error('Percorso sospetto: '+rel);
 try{await access('.'+rel)}catch{missing.push(rel)}
}
if(missing.length)throw Error('Asset mancanti: '+missing.join(', '));
console.log('UI assets OK:',referenced.size,'file verificati, 12 personaggi, 6 tappe illustrate');
