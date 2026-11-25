// Rotta Canonica: asset references, anime visual themes and offline cache tests.
import {readFile, access} from 'node:fs/promises';
const read=path=>readFile(path,'utf8');
const html=await read('index.html');
const sw=await read('service-worker.js');
const css=await read('design-system-v16.css');
const newCss=await read('nautical-finish-v18.css');
const pwaCss=await read('catalog-pwa-v19.css');
const animeCss=await read('anime-art-direction-v21.css');
const scenicCss=await read('anime-scenic-v22.css');
const features=await read('features.js');
const app=await read('app.js');
for(const file of ['nautical-finish-v18.css','catalog-pwa-v19.css','anime-art-direction-v21.css','design-system-v16.css'])if(!html.includes('/'+file))throw Error('Stylesheet not linked: '+file);
for(const [file,value] of [['v16',css],['v18',newCss],['v19',pwaCss],['v21',animeCss],['v22',scenicCss]])if((value.match(/\{/g)||[]).length!==(value.match(/\}/g)||[]).length)throw Error('Unbalanced CSS braces in '+file);
if(!sw.includes('rotta-canonica-v22-scenic-anime'))throw Error('PWA version not bumped to v21');
if(!sw.includes("'/data/episodes-latest.json'"))throw Error('Missing offline episode feed');
if(!features.includes('[2,5,4,6,2,5][i%6]'))throw Error('Map illustrations missing');
if(!features.includes('appearanceStyle')||!features.includes('symbolStyle')||!features.includes('colorPalette')||!features.includes('animationLevel'))throw Error('Visual customization not persisted');
if(!app.includes('visual-style')||!app.includes('visual-symbols')||!app.includes('visual-palette')||!app.includes('visual-motion'))throw Error('Visual customization not actionable');
const precache=sw.match(/const ASSETS=(\[[\s\S]*?\]);/);
if(!precache)throw Error('PWA asset list missing');
let assets;try{assets=JSON.parse(precache[1])}catch{throw Error('Invalid PWA asset list')}
const referenced=new Set([...assets.filter(v=>v!=='/'),...Array.from(html.matchAll(/(?:src|href)="(\/[^"?]+)(?:\?[^"]*)?"/g),x=>x[1])]);
for(const id of ['luffy','zoro','nami','usopp','sanji','chopper','robin','franky','brook','jinbe','ace','law'])referenced.add('/assets/character-scenes/'+id+'.webp');
for(let i=1;i<=6;i++)referenced.add('/assets/route-'+i+'.webp');
const requiredIcons=['anchor','chest','compass','complete','download','episode','filler','flag','locator','loot','map','netflix','progress','route','saga','sea-divider','spyglass','treasure','warning','wheel'];
for(const name of requiredIcons){const path='/assets/anime-icons/'+name+'.webp';if(!assets.includes(path))throw Error('Anime icon not cached: '+name);referenced.add(path)}
for(const name of ['/anime-art-direction-v21.css','/assets/anime-hero-portrait.webp','/assets/anime-ocean-bg.webp'])if(!assets.includes(name))throw Error('Illustrated UI asset not cached: '+name);
const missing=[];
for(const rel of referenced){if(!rel.startsWith('/')||rel.includes('..'))throw Error('Unsafe asset path: '+rel);try{await access('.'+rel)}catch{missing.push(rel)}}
if(missing.length)throw Error('Assets missing: '+missing.join(', '));
console.log('Anime UI assets OK:',referenced.size,'assets, 20 new icons, 2 illustrated scenes, 4 themes, 3 symbol styles');

if(!html.includes('/anime-scenic-v22.css?v=22a1'))throw Error('Scenic anime v22 CSS missing from HTML');
if(!features.includes('v22FeaturedCharacters')||!features.includes('char-role-icon'))throw Error('Full-body manga cards not installed');
for(const asset of ['/anime-scenic-v22.css','/assets/anime-v22-archipelago.webp','/assets/anime-v22-sunset.webp'])if(!assets.includes(asset))throw Error('Missing offline scenery: '+asset);
for(const char of ['luffy','zoro','nami','usopp','sanji','chopper','robin','franky','brook','jinbe']){
  const file='/assets/anime-v22-portraits/'+char+'.webp';
  if(!assets.includes(file))throw Error('Portrait missing from offline cache: '+char);
  try{await access('.'+file)}catch{throw Error('Portrait file missing: '+char)}
}
console.log('Scenic manga v22: 10 portraits, 2 backgrounds, UI roles and offline cache verified.');
