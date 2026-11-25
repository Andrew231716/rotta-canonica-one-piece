// Importa metadati italiani dalle schede One Piece Wiki Italia e i capitoli da Template:WC.
// Non assegna mai la canonicità: la classificazione rimane gestita separatamente.
import {readFile,writeFile} from 'node:fs/promises';
const BASE=1155, KNOWN_LATEST=1180, IT_API='https://onepiece.fandom.com/it/api.php', ROOT_API='https://onepiece.fandom.com/api.php';
const EPISODE_URL=n=>'https://onepiece.fandom.com/it/wiki/Episodio_'+n;
const TEMPLATE_URL='https://onepiece.fandom.com/wiki/Template:WC';
const wait=ms=>new Promise(resolve=>setTimeout(resolve,ms));
async function getJson(url,label){
 for(let attempt=0;attempt<5;attempt++){
  try{const r=await fetch(url,{headers:{Accept:'application/json','User-Agent':'RottaCanonicaMetadataBot/1.0 (https://github.com/Andrew231716/rotta-canonica-one-piece)'},signal:AbortSignal.timeout(45000)});
   if(r.status===429||r.status>=500){const retry=Number(r.headers.get('retry-after'));await wait(Math.min(60000,retry>0?retry*1000:(attempt+1)*2500));continue}
   if(!r.ok)throw Error(label+' HTTP '+r.status);const body=await r.text();let json;try{json=JSON.parse(body)}catch{throw Error(label+' non ha restituito JSON')}
   if(json?.error)throw Error(label+': '+String(json.error.info||json.error.code||'errore API'));return json;
  }catch(error){if(attempt===4)throw error;await wait((attempt+1)*1800)}
 }throw Error(label+' non disponibile');
}
function apiUrl(base,params){const u=new URL(base);for(const [k,v] of Object.entries(params))u.searchParams.set(k,String(v));return u.toString()}
async function queryPages(api,numbers,prefix='Episodio'){const titles=numbers.map(n=>prefix+'_'+n).join('|');const url=apiUrl(api,{action:'query',prop:'revisions',titles,rvprop:'ids|timestamp|content',rvslots:'main',format:'json',formatversion:2,origin:'*'});const json=await getJson(url,'One Piece Wiki Italia');const pages=json?.query?.pages;return Array.isArray(pages)?pages:Object.values(pages||{})}
function pageText(page){return String(page?.revisions?.[0]?.slots?.main?.content||'')}
function episodeNumber(page){const m=String(page?.title||page?.displaytitle||'').match(/Episodio[_\s]+(\d+)/i);return m?Number(m[1]):null}
function englishEpisodeNumber(page){const m=String(page?.title||'').match(/Episode[_\s]+(\d+)/i);return m?Number(m[1]):null}
function headingInfo(line){const m=String(line).match(/^(={2,6})\s*(.*?)\s*\1\s*$/);return m?{level:m[1].length,name:m[2].replace(/\[\]$/,'').trim()}:null}
function section(text,names){const lines=String(text).split(/\r?\n/);let start=-1,level=0;for(let i=0;i<lines.length;i++){const h=headingInfo(lines[i]);if(h&&names.some(n=>h.name.toLocaleLowerCase('it')===n.toLocaleLowerCase('it'))){start=i+1;level=h.level;break}}if(start<0)return '';let end=lines.length;for(let i=start;i<lines.length;i++){const h=headingInfo(lines[i]);if(h&&h.level<=level){end=i;break}}return lines.slice(start,end).join('\n').trim()}
function decodeEntities(value){return String(value).replace(/&nbsp;/gi,' ').replace(/&amp;/gi,'&').replace(/&quot;/gi,'"').replace(/&#39;|&apos;/gi,"'").replace(/&lt;/gi,'<').replace(/&gt;/gi,'>').replace(/&ndash;/gi,'–').replace(/&mdash;/gi,'—').replace(/&hellip;/gi,'…').replace(/&#(\d+);/g,(_,n)=>String.fromCodePoint(Number(n))).replace(/&#x([\da-f]+);/gi,(_,n)=>String.fromCodePoint(parseInt(n,16)))}
function plainWiki(value){let text=String(value||'').replace(/<!--[\s\S]*?-->/g,' ').replace(/<ref\b[^>]*>[\s\S]*?<\/ref>/gi,' ').replace(/<ref\b[^>]*\/>/gi,' ').replace(/<gallery[\s\S]*?<\/gallery>/gi,' ').replace(/<br\s*\/?\s*>/gi,' ');for(let i=0;i<12;i++){const next=text.replace(/\{\{[^{}]*\}\}/g,' ');if(next===text)break;text=next}text=text.replace(/\{\{[\s\S]*?\}\}/g,' ').replace(/\[\[(?:File|Image|Categoria|Category):[^\]]+\]\]/gi,' ').replace(/\[\[([^\]|]+)\|([^\]]+)\]\]/g,'$2').replace(/\[\[([^\]]+)\]\]/g,'$1').replace(/\[(?:https?:\/\/\S+)\s+([^\]]+)\]/g,'$1').replace(/https?:\/\/\S+/g,' ').replace(/<[^>]*>/g,' ').replace(/'''|''/g,'').replace(/^\s*[*#;:]+\s*/gm,' ').replace(/^\s*[|!].*$/gm,' ').replace(/^={2,6}.*={2,6}$/gm,' ').replace(/\[\d+\]/g,' ');return decodeEntities(text).replace(/[\t\r\n]+/g,' ').replace(/\s{2,}/g,' ').trim()}
function concise(value,max=650){const text=plainWiki(value);if(text.length<=max)return text;const head=text.slice(0,max-1),cut=Math.max(head.lastIndexOf('. '),head.lastIndexOf('! '),head.lastIndexOf('? '));return (cut>Math.floor(max*.55)?head.slice(0,cut+1):head.replace(/\s+\S*$/,'')).trimEnd()+'…'}
function titleFromPage(page,wikitext,n,language='it'){
 const raw=page?.displaytitle||((wikitext.match(/\{\{DISPLAYTITLE\s*:\s*([^}]+)\}\}/i)||[])[1])||'';
 const generic=/^(navigazione|navigation|informazioni episodio|english information|japanese information|crediti|episode credits|statistiche|statistics|riassunto|short summary|long summary|personaggi|characters|differenze tra manga e anime|anime notes|collegamenti esterni|site navigation|curiosità|notes)$/i;
 const clean=value=>plainWiki(value).replace(new RegExp('^(?:Episodio|Episode)\\s+'+n+'\\s*[:–—-]?\\s*','i'),'').trim();
 const title=clean(raw);if(title&&!generic.test(title)&&title.toLowerCase()!=='episodio '+n&&title.toLowerCase()!=='episode '+n)return title.slice(0,150);
 for(const line of String(wikitext).split(/\r?\n/)){const h=headingInfo(line);if(!h||h.level!==2||generic.test(h.name))continue;const candidate=clean(h.name);if(candidate&&!generic.test(candidate))return candidate.slice(0,150)}
 const info=section(wikitext,language==='it'?['Informazioni episodio']:['English Information']);
 const match=info.match(/(?:^|\n)\s*(?:Titolo|Traduzione|Title)\s*:?\s*([^\n]+)/i);
 return match?clean(match[1]).slice(0,150):'';
}
function chapterListFromTemplate(wikitext){const map=new Map();let rows=0,mappings=0,match;const regex=/\{\{WC\/f\|\{\{\{1\}\}\}\|([^}]*)\}\}/g;while((match=regex.exec(wikitext))){rows++;const args=match[1].split('|');if(args.length<3||((args.length-1)%2)!==0)continue;const cm=args[0].trim().match(/^Chapter\s+(\d+)$/i);if(!cm)continue;const chapter=Number(cm[1]);for(let i=1;i+1<args.length;i+=2){const ep=args[i].trim().match(/^Episode\s+(\d+)$/i);if(!ep)continue;const n=Number(ep[1]);if(!map.has(n))map.set(n,[]);const pages=args[i+1].trim(),url='https://onepiece.fandom.com/wiki/Chapter_'+chapter;if(!map.get(n).some(x=>x.chapter===chapter&&x.pages===pages))map.get(n).push({chapter,pages,url});mappings++}}for(const list of map.values())list.sort((a,b)=>a.chapter-b.chapter);return {map,rows,mappings}}
function chaptersFromItalianPage(wikitext){const stats=section(wikitext,['Statistiche']),text=stats||wikitext,found=[],regex=/Capitolo\s+(\d+)(?:\s*(?:pag\.?|pagine?)\s*([0-9,\s–-]+))?/gi;let m;while((m=regex.exec(text))){const chapter=Number(m[1]),pages=String(m[2]||'').trim();if(!found.some(x=>x.chapter===chapter&&x.pages===pages))found.push({chapter,pages,url:'https://onepiece.fandom.com/it/wiki/Capitolo_'+chapter})}return found.sort((a,b)=>a.chapter-b.chapter)}
function parseAirDate(wikitext){
 const months={gennaio:1,febbraio:2,marzo:3,aprile:4,maggio:5,giugno:6,luglio:7,agosto:8,settembre:9,ottobre:10,novembre:11,dicembre:12};
 const candidates=[...String(wikitext).matchAll(/\|\s*(?:data|aired|airdate)\s*=\s*([^\n|]+)/gi),...String(wikitext).matchAll(/\bData(?:\s+originale)?\s*:\s*([^\n]+)/gi)].map(m=>m[1].replace(/<[^>]*>/g,'').trim());
 for(const raw of candidates){const iso=raw.match(/(20\d{2})-(\d{2})-(\d{2})/);if(iso)return iso[0];const it=raw.match(/(\d{1,2})\s+(gennaio|febbraio|marzo|aprile|maggio|giugno|luglio|agosto|settembre|ottobre|novembre|dicembre)\s+(20\d{2})/i);if(it){const mm=String(months[it[2].toLowerCase()]).padStart(2,'0'),dd=String(it[1]).padStart(2,'0');return it[3]+'-'+mm+'-'+dd}}
 return null;
}
function compactChapters(items){const nums=[...new Set(items.map(x=>x.chapter).filter(Number.isInteger))].sort((a,b)=>a-b);if(!nums.length)return null;const out=[];let start=nums[0],last=start;for(const n of nums.slice(1)){if(n===last+1){last=n;continue}out.push(start===last?String(start):start+'–'+last);start=last=n}out.push(start===last?String(start):start+'–'+last);return out.join(', ')}
async function getTemplate(){const url=apiUrl(ROOT_API,{action:'query',prop:'revisions',titles:'Template:WC',rvprop:'ids|timestamp|content',rvslots:'main',format:'json',formatversion:2,origin:'*'});const json=await getJson(url,'One Piece Wiki Template:WC'),page=(json?.query?.pages||[])[0],rev=page?.revisions?.[0],text=String(rev?.slots?.main?.content||'');if(!text)throw Error('Template:WC senza contenuto');const parsed=chapterListFromTemplate(text);if(parsed.rows<1000||parsed.mappings<1500)throw Error('Template:WC incompleto: righe '+parsed.rows+', mappature '+parsed.mappings);return {...parsed,source:{provider:'One Piece Wiki / Template:WC',url:TEMPLATE_URL,revisionId:rev.revid,checkedAt:rev.timestamp,license:'CC BY-SA 3.0'}}}
function manualSource(source){return /manual|redazion|curat/i.test(String(source?.provider||''))}
const doc=JSON.parse(await readFile('data/episodes.json','utf8')),feed=JSON.parse(await readFile('data/episodes-latest.json','utf8'));
if(!Array.isArray(doc.episodes)||doc.episodes.length!==BASE||!Array.isArray(feed.episodes))throw Error('Catalogo principale o feed non valido');
const baseMap=new Map(doc.episodes.map(e=>[e.n,e])),latestMap=new Map(feed.episodes.map(e=>[e.number,e]));
const max=Math.max(BASE,KNOWN_LATEST,Number(feed.latest)||BASE,...feed.episodes.map(e=>Number(e.number)||BASE));
let api=null,firstPages=null,lastApiError=null;for(const candidate of [IT_API,ROOT_API]){try{const pages=await queryPages(candidate,[1]);if(pages.some(p=>!p.missing&&pageText(p))){api=candidate;firstPages=pages;break}}catch(e){lastApiError=e}}
if(!api)throw Error('API One Piece Wiki Italia non raggiungibile: '+String(lastApiError?.message||'pagina episodio 1 assente'));
const pageMap=new Map();for(const p of firstPages){const n=episodeNumber(p);if(n&&pageText(p))pageMap.set(n,p)}
for(let start=2;start<=max;start+=25){const nums=Array.from({length:Math.min(25,max-start+1)},(_,i)=>start+i),pages=await queryPages(api,nums);for(const p of pages){const n=episodeNumber(p);if(n&&pageText(p))pageMap.set(n,p)}if(start+25<=max)await wait(750)}
const englishMap=new Map();
for(let start=BASE+1;start<=max;start+=25){const nums=Array.from({length:Math.min(25,max-start+1)},(_,i)=>start+i),pages=await queryPages(ROOT_API,nums,'Episode');for(const p of pages){const n=englishEpisodeNumber(p);if(n&&pageText(p))englishMap.set(n,p)}if(start+25<=max)await wait(650)}
for(let n=BASE+1;n<=max;n++){if(latestMap.has(n))continue;const page=pageMap.get(n);if(!page)continue;const aired=parseAirDate(pageText(page));if(aired)latestMap.set(n,{number:n,title:'',aired,classification:'unverified'})}
let template=null;try{template=await getTemplate()}catch(e){console.warn('Template:WC non disponibile; uso le statistiche delle schede italiane:',e.message)}
const checkedAt=new Date().toISOString();let titles=0,summaries=0,chapters=0,italianPages=0;
for(let n=1;n<=max;n++){
 const row=n<=BASE?baseMap.get(n):latestMap.get(n);if(!row)continue;
 const italianPage=pageMap.get(n),englishPage=n>BASE?englishMap.get(n):null,page=italianPage||englishPage;
 const language=italianPage?'it':englishPage?'en':'it',wikitext=pageText(page),revision=page?.revisions?.[0];
 const pageUrl=italianPage?EPISODE_URL(n):'https://onepiece.fandom.com/wiki/Episode_'+n;
 const pageDate=revision?.timestamp||checkedAt,provider=italianPage?'One Piece Wiki Italia / Fandom':'One Piece Wiki / Fandom (English)';
 const pageSource={provider,url:pageUrl,revisionId:revision?.revid||null,checkedAt:pageDate,license:'CC BY-SA 3.0'};
 const manualTitle=manualSource(row.source),manualSummary=manualSource(row.summarySource),manualChapter=manualSource(row.chapterSource);
 if(page){
  if(italianPage)italianPages++;
  const title=titleFromPage(page,wikitext,n,language);
  if(title&&!manualTitle){row.title=title;row.titleLanguage=language;row.source={...pageSource,fields:['title']};row.titleSource={...pageSource,fields:['title']};row.verifiedAt=pageDate;titles++}
  const summary=concise(section(wikitext,language==='it'?['Riassunto','Trama','Sinossi']:['Short Summary','Summary']),650);
  if(summary&&!manualSummary){row.summary=summary;row.summaryLanguage=language;row.summarySource={...pageSource,fields:['summary']};row.summaryStatus=language==='it'?'verified':'source-english';summaries++}
  else if(!row.summary)row.summaryStatus='missing-source-section';
 }
 let details=template?.map.get(n)||[];if(!details.length&&italianPage)details=chaptersFromItalianPage(wikitext);
 if(details.length&&!manualChapter){row.chapter=compactChapters(details);row.chapterDetails=details;row.chapterStatus='mapped';row.chapterSource=template?.map.has(n)?{...template.source,fields:['chapter','pages']}:{...pageSource,fields:['chapter','pages']};chapters++}
 else if(!row.chapter){row.chapterStatus=template?'no-manga-mapping':page?'not-mapped-in-episode-page':'not-verified';if(template)row.chapterSource={...template.source,fields:['chapter','pages']}}
 const fields=[];if(row.summarySource?.url)fields.push('summary');if(row.chapterSource?.url)fields.push('chapter');
 if(fields.length)row.editorialSource={url:row.summarySource?.url||row.chapterSource.url,checkedAt:row.summarySource?.checkedAt||row.chapterSource?.checkedAt||checkedAt,fields};
 if(!row.source&&row.title)row.source={provider:'Jikan API (MyAnimeList, fallback)',url:'https://myanimelist.net/anime/21/One_Piece/episode/'+n,checkedAt,fields:['title']};
}
feed.episodes=[...latestMap.values()].sort((a,b)=>a.number-b.number);feed.latest=Math.max(BASE,...feed.episodes.map(e=>e.number));
const baseTitles=doc.episodes.filter(e=>e.title).length,baseSummaries=doc.episodes.filter(e=>e.summary).length,baseChapters=doc.episodes.filter(e=>e.chapter).length;
doc.metadataSource={name:'One Piece Wiki Italia / Fandom',url:'https://onepiece.fandom.com/it/wiki/Episodi_e_film',license:'CC BY-SA 3.0 salvo diversa indicazione',lastChecked:checkedAt};
doc.metadataCoverage={titles:baseTitles,summaries:baseSummaries,chapterMappings:baseChapters,episodes:BASE};
doc.catalogDisclaimer='Titoli e sinossi in italiano da One Piece Wiki Italia / Fandom; capitoli e pagine da One Piece Wiki Template:WC. I contenuti della community sono CC BY-SA 3.0 salvo diversa indicazione. Jikan/MyAnimeList è usato solo come fallback per le nuove uscite. La classificazione canonico/misto/filler resta separata e richiede revisione.';
feed.metadataSource={name:'One Piece Wiki Italia / Fandom + One Piece Wiki English + Template:WC',url:'https://onepiece.fandom.com/wiki/Episode_Guide',license:'CC BY-SA 3.0 salvo diversa indicazione; le traduzioni redazionali mantengono la stessa attribuzione',lastChecked:checkedAt};
feed.metadataCoverage={titles:feed.episodes.filter(e=>e.title).length,summaries:feed.episodes.filter(e=>e.summary).length,chapterMappings:feed.episodes.filter(e=>e.chapter).length,episodes:feed.episodes.length};
await writeFile('data/episodes.json',JSON.stringify(doc,null,2)+'\n','utf8');await writeFile('data/episodes-latest.json',JSON.stringify(feed,null,2)+'\n','utf8');
console.log(JSON.stringify({wikiPages:italianPages,sourceMaximum:max,base:{titles:baseTitles,summaries:baseSummaries,chapters:baseChapters},newEpisodes:feed.metadataCoverage,templateRows:template?.rows||0,templateMappings:template?.mappings||0,updatedTitles:titles,updatedSummaries:summaries,updatedChapters:chapters}));
if(italianPages<900||baseSummaries<850||baseChapters<850)throw Error('Copertura editoriale insufficiente; catalogo non pubblicabile');
