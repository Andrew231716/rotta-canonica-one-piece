/* Rotta Canonica — local-first One Piece episode guide. No accounts, analytics or external API. */
'use strict';
const arcData = [
  ['East Blue — Romance Dawn',1,3,'East Blue'],
  ['Orange Town',4,8,'East Blue'],
  ['Syrup Village',9,18,'East Blue'],
  ['Baratie',19,30,'East Blue'],
  ['Arlong Park',31,44,'East Blue'],
  ['Loguetown e storie di copertina',45,53,'East Blue'],
  ['Warship Island / Reverse Mountain',54,63,'Alabasta'],
  ['Whisky Peak e Koby–Helmeppo',64,69,'Alabasta'],
  ['Little Garden',70,77,'Alabasta'],
  ['Drum Island',78,91,'Alabasta'],
  ['Alabasta',92,130,'Alabasta'],
  ['Post-Alabasta / Goat / Ruluka',131,143,'Sky Island'],
  ['Jaya',144,152,'Sky Island'],
  ['Skypiea',153,195,'Sky Island'],
  ['G-8',196,206,'Sky Island'],
  ['Long Ring Long Land / Aokiji',207,228,'Water Seven'],
  ['Water Seven',229,263,'Water Seven'],
  ['Enies Lobby',264,312,'Water Seven'],
  ['Post-Enies Lobby',313,325,'Water Seven'],
  ['Ice Hunter',326,336,'Thriller Bark'],
  ['Thriller Bark',337,381,'Thriller Bark'],
  ['Spa Island',382,384,'Thriller Bark'],
  ['Sabaody',385,407,'Guerra dei vertici'],
  ['Amazon Lily',408,421,'Guerra dei vertici'],
  ['Impel Down',422,456,'Guerra dei vertici'],
  ['Marineford',457,489,'Guerra dei vertici'],
  ['Dopoguerra',490,516,'Guerra dei vertici'],
  ['Ritorno a Sabaody',517,522,'Isola degli Uomini-Pesce'],
  ['Isola degli Uomini-Pesce',523,574,'Isola degli Uomini-Pesce'],
  ['Z’s Ambition',575,578,'Dressrosa'],
  ['Punk Hazard',579,628,'Dressrosa'],
  ['Dressrosa',629,746,'Dressrosa'],
  ['Silver Mine',747,750,'Yonko'],
  ['Zou',751,779,'Yonko'],
  ['Marine Rookie',780,782,'Yonko'],
  ['Whole Cake Island',783,877,'Yonko'],
  ['Reverie',878,889,'Yonko'],
  ['Wano',890,1085,'Wano'],
  ['Egghead',1086,1155,'Saga finale']
];
const fillerData = [
  ['50–51','Loguetown: sfide extra'],['54–60','Warship Island (Apis e draghi)'],['98–99','Avventure extra ad Alabasta'],['102','Tappa aggiuntiva ad Alabasta'],
  ['131–143','Post-Alabasta, Goat Island e Ruluka'],['196–206','G-8'],['220–225','Ocean’s Dream e ritorno di Foxy'],
  ['279–283','Episodi riepilogativi'],['291–292','Speciali storici'],['303','Speciale storico'],['317–319','Storie aggiuntive a Water Seven'],
  ['326–336','Ice Hunter e Chopperman'],['382–384','Spa Island'],['406–407','Speciali storici'],['426–429','Introduzione al film Strong World'],
  ['457–458','Riepiloghi di Marineford'],['492','Crossover Toriko'],['542','Crossover Toriko'],['575–578','Z’s Ambition'],
  ['590','Crossover Toriko e Dragon Ball'],['626–627','Caesar Retrieval'],['747–750','Silver Mine'],['780–782','Marine Rookie'],
  ['895–896','Cidre Guild'],['907','Speciale Romance Dawn'],['1029–1030','Introduzione al film Red']
];
const recoverData = [
  ['6–7','Chouchou e Cabaji','La storia del cane Chouchou e uno scontro che il live action riduce.','Stagione 1'],
  ['9–18','Syrup Village e Gaimon','Jango, il piano di Kuro, le battaglie di Usopp e la storia di Gaimon (episodio 18).','Stagione 1'],
  ['21–23','L’arrivo di Don Krieg','Gin, la flotta e la minaccia originale al Baratie.','Stagione 1'],
  ['25–29','La battaglia del Baratie','Gin, Pearl e lo scontro completo di Luffy con Don Krieg.','Stagione 1'],
  ['33–34','Verso Arlong Park','Dettagli degli eventi di Nami, Usopp e dei villaggi.','Stagione 1'],
  ['38–42','Arlong Park originale','I combattimenti, compreso Zoro contro Hatchan.','Stagione 1'],
  ['46–47','La mini-storia di Buggy','Adattamento delle storie raccontate sulle copertine del manga.','Stagione 1'],
  ['49','Le spade di Zoro','Dettagli canonici sul passaggio di Zoro a Loguetown.','Stagione 2'],
  ['61','Ingresso nella Rotta Maggiore','Contiene anche la conclusione del filler: conserva la parte canonica.','Stagione 2'],
  ['68–69','Koby ed Helmeppo','Mini-storia canonica di copertina: addestramento e rapporto con Garp.','Stagione 2']
];
const filler = new Set();
function range(r){const [a,b]=r.split('–').map(Number);return Array.from({length:(b||a)-a+1},(_,i)=>a+i)}
for(const [r] of fillerData) for(const n of range(r)) filler.add(n);
const BASE_MAX=1155, CATALOG_LIMIT=3000;
let MAX=BASE_MAX, allCanon=Array.from({length:BASE_MAX},(_,i)=>i+1).filter(n=>!filler.has(n));
const STORAGE='rotta-canonica-v1';
function safeLoad(){try{const x=JSON.parse(localStorage.getItem(STORAGE)||'{}');return{watched:new Set(Array.isArray(x.watched)?x.watched.filter(n=>Number.isInteger(n)&&n>=1&&n<=CATALOG_LIMIT):[]),start:Number.isInteger(x.start)&&x.start>=1&&x.start<=CATALOG_LIMIT?x.start:92,showFiller:!!x.showFiller}}catch{return{watched:new Set(),start:92,showFiller:false}}}
const saved=safeLoad();
let watched=saved.watched,start=saved.start,showFiller=saved.showFiller,tab='path',search='',openArc=null,toastTimer=null;
function save(){localStorage.setItem(STORAGE,JSON.stringify({watched:[...watched].sort((a,b)=>a-b),start,showFiller}));window.RottaCloud?.queueSync()}
function icon(name){const paths={compass:'<circle cx="12" cy="12" r="10"/><path d="m16.2 7.8-2.9 5.5-5.5 2.9 2.9-5.5z"/>',route:'<circle cx="6" cy="19" r="2"/><path d="M9 19h7a4 4 0 0 0 0-8H8a4 4 0 0 1 0-8h7"/><path d="m12 1 3 2-3 2"/>',check:'<path d="M20 6 9 17l-5-5"/>',skip:'<path d="m5 4 14 16M19 4 5 20"/><circle cx="12" cy="12" r="10"/>',chart:'<path d="M3 3v18h18"/><path d="m7 16 4-5 3 2 5-7"/>',search:'<circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>',chevron:'<path d="m6 9 6 6 6-6"/>',play:'<path d="m8 5 12 7-12 7z"/>',award:'<circle cx="12" cy="8" r="6"/><path d="m8.21 13.89-1 9.11L12 20l4.79 3-1-9.12"/>',eye:'<path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12Z"/><circle cx="12" cy="12" r="3"/>',download:'<path d="M12 3v12m-4-4 4 4 4-4M4 17v4h16v-4"/>',upload:'<path d="M12 17V5m-4 4 4-4 4 4M4 19v2h16v-2"/>',rotate:'<path d="M3 11a9 9 0 1 1 2.4 6.1M3 3v8h8"/>',settings:'<path d="M12 3v3m0 12v3M3 12h3m12 0h3M5.6 5.6l2.1 2.1m8.6 8.6 2.1 2.1M18.4 5.6l-2.1 2.1m-8.6 8.6-2.1 2.1"/><circle cx="12" cy="12" r="4"/>',bookmark:'<path d="M6 3h12v18l-6-4-6 4z"/>',shield:'<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>',info:'<circle cx="12" cy="12" r="10"/><path d="M12 11v6m0-10v.1"/>',arrow:'<path d="M5 12h14m-6-6 6 6-6 6"/>'};return `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${paths[name]||paths.compass}</svg>`}

const UI_ASSET={path:'compass',episodes:'episode',map:'map',characters:'spyglass',journal:'loot',achievements:'chest',settings:'wheel',more:'loot',recover:'locator',filler:'flag',stats:'chest',watch:'complete',next:'route',loot:'loot',saga:'wheel'};
function art(name,cls='',alt=''){return `<img class="${cls}" src="/assets/ui-${name}.webp" alt="${cleanText(alt)}" loading="lazy" decoding="async">`}
function toolTile(tabId,title,subtitle,asset){return `<button class="tool-tile" data-tab="${tabId}" aria-label="Vai a ${title}"><span class="tool-tile-icon">${art(asset)}</span><span class="tool-tile-copy"><b>${title}</b><small>${subtitle}</small></span><span class="tool-tile-chevron" aria-hidden="true">›</span></button>`}

function heroPanel(next){return `<section class="hero" aria-label="Benvenuto in Rotta Canonica">
  <div class="hero-visual">
    <img class="hero-visual-img" src="/assets/crew-hero.webp" alt="Ciurma di avventurieri in stile anime a bordo di una nave, diretta verso isole fantastiche" fetchpriority="high">
    <div class="hero-top-stamp">${art('compass','stamp-art')} <span>LA GRANDE AVVENTURA COMINCIA QUI</span></div>
    <div class="hero-banner" aria-hidden="true"><img src="/assets/ornate-banner.webp" alt=""><b>ROTTA CANONICA</b><small>LA GUIDA DEGLI EPISODI</small></div>
    <div class="hero-wave" aria-hidden="true"></div>
  </div>
  <div class="hero-copy">
    <div class="eyebrow">IL TUO DIARIO DI BORDO</div>
    <h1>Salpa verso la <em>storia canonica!</em></h1>
    <p>Segui il manga attraverso l’anime, riscopri le avventure tagliate dal live action e naviga senza filler.</p>
    <div class="hero-buttons"><button class="button primary" data-action="next">${art('episode','button-art')} ${next?`Riprendi dall’episodio ${next}`:'Hai completato la rotta!'}</button><button class="button secondary" data-tab="recover">${art('map','button-art')} Recuperi live action</button></div>
  </div>
</section>`}
function routeArt(i){return `/assets/route-${(i%6)+1}.webp`}
function sagaRibbon(saga){const map={'East Blue':'east','Alabasta':'alabasta','Sky Island':'sky','Water Seven':'enies','Wano':'wano','Saga finale':'egghead','Yonko':'wano','Dressrosa':'enies','Isola degli Uomini-Pesce':'east','Thriller Bark':'wano','Guerra dei vertici':'egghead'};return `/assets/saga-${map[saga]||'east'}.webp`}

function formatRange(start,end){return start===end?String(start):`${start}–${end}`}
function contiguous(ns){if(!ns.length)return'—';const result=[];let a=ns[0],z=a;for(let i=1;i<ns.length;i++){if(ns[i]===z+1){z=ns[i];continue}result.push(formatRange(a,z));a=z=ns[i]}result.push(formatRange(a,z));return result.join(', ')}
function cleanText(s){return String(s).replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;')}
function getNext(){return allCanon.find(n=>n>=start&&!watched.has(n))||allCanon.find(n=>!watched.has(n))||null}
function counts(){const done=allCanon.filter(n=>watched.has(n)).length;return{done,total:allCanon.length,remaining:allCanon.length-done,percent:Math.round(done/allCanon.length*100),filler:filler.size}}
function navBtn(t,label,ico){return `<button class="nav-button ${tab===t?'active':''}" data-tab="${t}" aria-current="${tab===t?'page':'false'}">${art(UI_ASSET[t],'nav-art')}<span>${label}</span></button>`}
function mobNavBtn(t,label,ico){const mark=t==='recover'?`<span class="mobile-netflix" aria-hidden="true">N</span>`:t==='more'?`<span class="mobile-more" aria-hidden="true"><i></i><i></i><i></i></span>`:art(UI_ASSET[t],'mobile-art');return `<button class="${tab===t||(t==='more'&&['filler','stats','characters','journal','achievements','settings'].includes(tab))?'active':''}" data-tab="${t}" aria-current="${tab===t?'page':'false'}">${mark}<span>${label}</span></button>`}
function shell(content){const c=counts(),next=getNext(),section=tab==='recover'?'section-recover.webp':tab==='filler'?'section-filler.webp':'section-progress.webp';return `<div class="shell">
  <aside class="sidebar">
    <a href="#" class="brand" data-tab="path">${art('compass','brand-icon')}<span><strong>Rotta Canonica</strong><small>GUIDA ONE PIECE • FAN PROJECT</small></span></a>
    <div class="nav"><div class="nav-label">SALPA VERSO...</div>${navBtn('path','La tua rotta','route')}${navBtn('episodes','Guida episodi','episode')}${navBtn('map','Mappa delle saghe','map')}${navBtn('recover','Live action','bookmark')}${navBtn('filler','Filler da saltare','skip')}${navBtn('characters','Personaggi','spyglass')}${navBtn('journal','Diario di bordo','map')}${navBtn('achievements','Ricompense','chest')}${navBtn('stats','Progressi','chart')}${navBtn('settings','Impostazioni','wheel')}</div>
    <div class="sidebar-bottom"><div class="sidebar-treasure">${art('chest','sidebar-treasure-art')}<span>IL TESORO È LA TUA STORIA</span></div><div class="sidebar-info"><span>CONSIGLIO DI ROTTA</span><strong>Episodio 92</strong><p>Hai visto le prime due stagioni Netflix? La nuova traversata comincia da Alabasta.</p></div><div class="side-disclaimer">Guida indipendente non ufficiale, senza affiliazione ai titolari di One Piece.</div></div>
  </aside>
  <main class="main">
    <div class="mobile-chrome">
      <header class="mobile-brand">${art('compass','mobile-brand-mark')}<div><span class="mobile-brand-title">ROTTA CANONICA</span><span class="mobile-brand-sub">GUIDA ONE PIECE • FAN PROJECT</span></div><span class="mobile-brand-stamp">PWA</span></header>
      <div class="topline"><div class="breadcrumb">${art('anchor','tiny-art')} GRANDE ROTTA <b>/</b> ${({path:'IL TUO PERCORSO',episodes:'GUIDA EPISODI',map:'MAPPA DELLE SAGHE',recover:'RECUPERI LIVE ACTION',filler:'EPISODI FILLER',characters:'PERSONAGGI',journal:'DIARIO DI BORDO',achievements:'RICOMPENSE',settings:'IMPOSTAZIONI',more:'TUTTE LE SEZIONI',stats:'STATISTICHE'})[tab]||'IL TUO PERCORSO'}</div><div class="top-actions"><span class="tiny-tag"><span class="dot"></span> EP. 1–${MAX}</span></div></div>
    </div>
    ${tab==='path'?heroPanel(next):['recover','filler','stats'].includes(tab)?`<div class="secondary-topline" style="--section-bg:url('/assets/${section}')"><div class="secondary-copy"><span class="eyebrow">ROTTA CANONICA • ESPLORA</span><strong>${tab==='recover'?'STORIE DA RECUPERARE':tab==='filler'?'FUORI ROTTA!':'IL TUO DIARIO DI BORDO'}</strong><span class="secondary-desc">${tab==='recover'?'Scopri ciò che il live action ha lasciato indietro':tab==='filler'?'Naviga soltanto lungo la storia del manga':'Ogni episodio visto è un tesoro conquistato'}</span></div>${art(tab==='recover'?'locator':tab==='filler'?'flag':'chest','secondary-art')}</div>`:''}
    ${['path','stats'].includes(tab)?`<div class="metrics">
      <div class="metric">${art('complete','metric-art')}<div class="metric-content"><div class="metric-head">Episodi visti</div><div class="metric-value">${c.done}<span> / ${c.total}</span></div><div class="metric-foot">Solo percorso canonico</div></div></div>
      <div class="metric">${art('route','metric-art')}<div class="metric-content"><div class="metric-head">Da guardare</div><div class="metric-value">${c.remaining}</div><div class="metric-foot">La rotta continua</div></div></div>
      <div class="metric">${art('filler','metric-art')}<div class="metric-content"><div class="metric-head">Filler esclusi</div><div class="metric-value">${c.filler}</div><div class="metric-foot">Fuori dalla rotta</div></div></div>
      <div class="metric">${art('progress','metric-art')}<div class="metric-content"><div class="metric-head">Completamento</div><div class="metric-value">${c.percent}<span>%</span></div><div class="metric-foot">Tesori raccolti</div></div></div>
    </div>`:''}
    ${content}
    <div class="footer-sea" aria-hidden="true"><img src="/assets/ui-wheel.webp" alt=""></div>
    <div class="bottom-note">Fan tracker non ufficiale. Catalogo verificabile con fonti dichiarate: i dati mancanti restano segnalati. I progressi sono memorizzati sul dispositivo; esportali prima di cancellare i dati del browser.</div>
  </main>
</div><nav class="mobile-nav" aria-label="Navigazione">${mobNavBtn('path','Home','route')}${mobNavBtn('episodes','Episodi','episode')}${mobNavBtn('map','Mappa','map')}${mobNavBtn('recover','Netflix','bookmark')}${mobNavBtn('more','Altro','chest')}</nav>`}
function visibleArcs(){const next=getNext();return arcData.map((a,i)=>({a,i})).filter(({a})=>{const episodes=Array.from({length:a[2]-a[1]+1},(_,j)=>a[1]+j).filter(n=>!filler.has(n));if(!showFiller&&!episodes.length)return false;if(extra.hideCompleted&&episodes.length&&episodes.every(n=>watched.has(n))&&!(next&&next>=a[1]&&next<=a[2]))return false;if(!search)return true;const s=search.toLowerCase();const num=Number(search);return a[0].toLowerCase().includes(s)||a[3].toLowerCase().includes(s)||(Number.isInteger(num)&&num>=a[1]&&num<=a[2])})}
function arcCard(a,i){const [title,first,last,saga]=a;const titleSafe=spoilerName(first,title),sagaSafe=spoilerName(first,saga);const episodes=range(formatRange(first,last)).filter(n=>!filler.has(n));const done=episodes.filter(n=>watched.has(n)).length;const pct=episodes.length?Math.round(done/episodes.length*100):0;const skipped=last-first+1-episodes.length;const open=openArc===i;const next=getNext();const current=!!next&&next>=first&&next<=last;const locked=blocked(first);const complete=episodes.length&&done===episodes.length;return `<div class="arc-card ${open?'open':''} ${current?'is-current':''} ${complete?'is-complete':''} ${locked?'is-spoiler':''}" id="arc-${i}"><div class="arc-image"><img src="${routeArt(i)}" alt="${locked?'Isola ancora inesplorata':'Paesaggio illustrato di avventura marina'}" loading="lazy" class="${locked?'arc-fog':''}"><span class="arc-number">${current?'◎ ORA':'TAPPA '+String(i+1).padStart(2,'0')}</span>${locked?'':`<img class="arc-saga-ribbon" src="${sagaRibbon(saga)}" alt="" loading="lazy">`}${art(i%4===0?'compass':i%4===1?'wheel':i%4===2?'anchor':'map','arc-seal')}${locked?'<span class="arc-spoiler-seal" aria-hidden="true">?</span>':''}</div><div class="arc-top"><div class="arc-upper"><span class="arc-kicker">${cleanText(sagaSafe)}</span><span class="arc-status ${done===episodes.length?'done':''}">${done===episodes.length?icon('check'):''}${done===episodes.length?'Completato':`EP. ${first}–${last}`}</span></div><h3 class="arc-title">${cleanText(titleSafe)}</h3><div class="arc-sub">Da vedere: <b>${contiguous(episodes)}</b></div><div class="arc-progress"><span style="width:${pct}%"></span></div></div><div class="arc-footer"><span class="arc-counts"><b>${done}/${episodes.length}</b> visti ${skipped?`· ${skipped} filler esclusi`:''}</span><button class="open-arc" data-action="toggle-arc" data-arc="${i}">${open?'Chiudi':'Apri episodi'} ${icon('chevron')}</button></div>${open?`<div class="arc-detail"><div class="arc-detail-top"><span>Tocca un episodio per segnarlo visto</span><button class="pill-button" data-action="arc-all" data-arc="${i}">${done===episodes.length?'Segna non visti':'Segna tutti visti'}</button></div><div class="episode-grid">${Array.from({length:last-first+1},(_,k)=>first+k).filter(n=>showFiller||!filler.has(n)).map(n=>`<button title="${filler.has(n)?'Filler da saltare':watched.has(n)?'Segna da vedere':'Segna visto'}" aria-label="Episodio ${n}${filler.has(n)?' filler':''}" class="ep ${filler.has(n)?'filler':watched.has(n)?'watched':''}" data-action="episode" data-ep="${n}" ${filler.has(n)?'disabled':''}>${n}</button>`).join('')}</div><div class="arc-detail-legend"><span><i class="legend-dot"></i> Da vedere</span><span><i class="legend-dot watched"></i> Visto</span>${showFiller?'<span><i class="legend-dot filler"></i> Filler</span>':''}</div></div>`:''}</div>`}

// Weekly feed: only explicitly reviewed episodes join the spoiler-free route.
// An aired episode without a named editorial source remains visible as "da verificare".
let weeklyEpisodes=[], weeklyChecked=null;
function validReview(e){
  const review=e?.classificationReview;
  return ['canon','mixed','filler'].includes(e?.classification)
    && typeof review?.url==='string' && /^https:\/\/[^\s]+$/i.test(review.url)
    && typeof review?.checkedAt==='string' && /^\d{4}-\d{2}-\d{2}$/.test(review.checkedAt);
}
function validatedRelease(e){
  const n=Number(e?.number);
  if(!Number.isInteger(n)||n<=BASE_MAX||n>CATALOG_LIMIT)return null;
  const date=typeof e.aired==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(e.aired)?e.aired:null;
  if(!date || Number.isNaN(Date.parse(date)) || Date.parse(date)>Date.now()+86400000)return null;
  const reviewed=validReview(e);
  return {number:n,title:typeof e.title==='string'?e.title.slice(0,160):'',aired:date,
    classification:reviewed?e.classification:'unverified',
    classificationReview:reviewed?{url:e.classificationReview.url,checkedAt:e.classificationReview.checkedAt}:null};
}
function availableEpisodeNumbers(){return Array.from({length:BASE_MAX},(_,i)=>i+1).concat(weeklyEpisodes.map(e=>e.number));}
function releaseByNumber(n){return weeklyEpisodes.find(e=>e.number===n)||null;}
function confirmedForRoute(e){return e.classification==='canon'||e.classification==='mixed';}
function newEpisodesMarkup(){
 if(!weeklyEpisodes.length)return `<section class="new-episode-panel paper-panel" aria-label="Uscite più recenti"><h2>La rotta si aggiorna</h2><p>Archivio fino all’episodio ${BASE_MAX}. Nessuna puntata successiva confermata nel feed locale: il controllo settimanale non implica una nuova uscita ogni settimana.</p><small>Ultima verifica: ${weeklyChecked?cleanText(weeklyChecked.slice(0,10)):'non ancora eseguita'}.</small></section>`;
 const confirmed=weeklyEpisodes.filter(confirmedForRoute);
 return `<section class="paper-panel new-episode-panel" aria-label="Uscite più recenti"><h2>Le nuove puntate</h2>
  <p>${confirmed.length?`${confirmed.length} nuove puntate con classificazione documentata sono state aggiunte al percorso. `:''}Le uscite non ancora classificate restano consultabili, ma non vengono conteggiate come canoniche.</p>
  <div class="new-release-list">${weeklyEpisodes.slice(-12).reverse().map(e=>{const verified=e.classification!=='unverified';const status=verified?e.classification==='filler'?'Filler · fonte presente':e.classification==='mixed'?'Misto · fonte presente':'Canonico · fonte presente':'Canonicità da verificare';
   return `<div class="new-episode-item"><div><b>Ep. ${e.number} · ${cleanText(blocked(e.number)?'Titolo nascosto':e.title||'Titolo in verifica')}</b><span>${cleanText(e.aired)} · ${status}</span></div><div class="release-actions"><button class="button small secondary" data-action="detail" data-ep="${e.number}">Scheda</button>${confirmedForRoute(e)?`<button class="release-watch" data-action="episode" data-ep="${e.number}" aria-pressed="${watched.has(e.number)}">${watched.has(e.number)?'✓ Visto':'Segna visto'}</button>`:''}</div></div>`}).join('')}</div>
  <small>Fonte uscite: catalogo Jikan/MyAnimeList (terza parte) · Ultimo controllo: ${weeklyChecked?cleanText(weeklyChecked.slice(0,10)):'non disponibile'}. Classificazioni accettate solo con fonte editoriale.</small>
 </section>`;
}
async function loadWeeklyEpisodes(){try{
 const r=await fetch('/data/episodes-latest.json',{cache:'no-store'});if(!r.ok)return;
 const d=await r.json();if(d.schemaVersion!==1||!Array.isArray(d.episodes)||d.episodes.length>1200)return;
 const found=new Map();for(const item of d.episodes){const e=validatedRelease(item);if(e)found.set(e.number,e)}
 weeklyEpisodes=[...found.values()].sort((a,b)=>a.number-b.number);
 weeklyChecked=typeof d.checkedAt==='string'?d.checkedAt:null;
 MAX=Math.max(BASE_MAX,...weeklyEpisodes.map(e=>e.number));
 for(const e of weeklyEpisodes)if(e.classification==='filler')filler.add(e.number);
 allCanon=[...Array.from({length:BASE_MAX},(_,i)=>i+1).filter(n=>!filler.has(n)),...weeklyEpisodes.filter(confirmedForRoute).map(e=>e.number)];
 render();
 }catch(e){console.warn('Feed uscite non disponibile, percorso locale invariato',e)}
}

function pathView(){const next=getNext();const currentArc=next?arcData.find(a=>next>=a[1]&&next<=a[2]):null;return `${newEpisodesMarkup()}<section class="captains-deck"><div class="deck-label">${art('wheel','deck-wheel')}<div><span>IL PONTE DI COMANDO</span><b>Scegli la prossima avventura</b></div></div><div class="tool-grid">${toolTile('episodes','Guida episodi','Cerca e salva le puntate','episode')}${toolTile('map','La mappa','Esplora le isole','map')}${toolTile('characters','Personaggi','Enciclopedia senza spoiler','spyglass')}${toolTile('journal','Diario','Note e preferiti','loot')}</div></section>${next?`<div class="home-jump"><div><span class="home-jump-kicker">TAPPA CORRENTE</span><b>${cleanText(spoilerName(next,currentArc?currentArc[0]:'Prossimo episodio'))}</b><small>Episodio ${next}${currentArc?` · ${cleanText(spoilerName(next,currentArc[3]))}`:''}</small></div><button class="button primary small" data-action="jump-current">${art('route','button-art')} Vai qui</button></div>`:''}<div class="section-header"><div><h2>Le saghe da esplorare</h2><p>Scopri ogni isola, segna gli episodi visti e lascia i filler fuori rotta.</p></div><div class="section-extra"><label class="search-box">${icon('search')}<input id="arc-search" placeholder="Cerca arco o episodio…" value="${cleanText(search)}" aria-label="Cerca arco o episodio"></label><label class="switch-holder"><span>Nascondi finite</span><button class="switch ${extra.hideCompleted?'on':''}" aria-label="Nascondi saghe completate" aria-pressed="${!!extra.hideCompleted}" data-action="hide-completed"></button></label><label class="switch-holder"><span>Mostra filler</span><button class="switch ${showFiller?'on':''}" aria-label="Mostra filler" aria-pressed="${showFiller}" data-action="show-filler"></button></label></div></div><div class="arc-list">${visibleArcs().map(({a,i})=>arcCard(a,i)).join('')||'<div class="empty">Nessun arco trovato. Prova un altro nome o numero.</div>'}</div>`}
function recoveryView(){const recovered=recoverData.filter(([r])=>range(r).filter(n=>!filler.has(n)).every(n=>watched.has(n))).length;return `<div class="section-header"><div><h2>Ciò che Netflix ha cambiato</h2><p>Recupera gli episodi con contenuti del manga omessi o modificati nel live action.</p></div><div class="section-extra"><span class="tiny-tag">${recovered}/${recoverData.length} recuperi completati</span></div></div><div class="callout callout-start"><div class="callout-start-head">${art('locator','callout-start-art')}<div><span class="callout-start-kicker">LIVE ACTION → ANIME</span><h3>Hai visto le prime due stagioni?</h3></div></div><p>Per proseguire subito, imposta la partenza all’episodio 92 (Alabasta). Se vuoi conoscere il manga originale, recupera prima le storie qui sotto.</p><button class="button primary callout-start-btn" data-action="set-start-92">${art('episode','button-art')} Parti dal 92</button></div><div class="recover-list">${recoverData.map(([r,title,detail,season])=>{const ns=range(r).filter(n=>!filler.has(n)),done=ns.every(n=>watched.has(n));return `<article class="recover-card">${art(season==='Stagione 1'?'map':'compass','recover-image')}<div class="recover-range">${r}</div><div class="recover-body"><h3>${title}</h3><p>${detail}</p><div class="recover-bottom"><span class="status-chip ${done?'done':''}">${done?'✓ Recuperato':season}</span><button class="pill-button ${done?'done':''}" data-action="recover" data-range="${r}">${done?'Segna da vedere':'Segna recuperato'}</button></div></div></article>`}).join('')}</div><div class="tipbox">Le sezioni sono consigli mirati: un episodio elencato qui può raccontare anche eventi già noti dal live action. Per la versione completa, guarda gli episodi canonici dall'inizio.</div>`}
function fillerView(){return `<div class="section-header"><div><h2>Episodi da saltare</h2><p>Tutti i gruppi filler esclusi automaticamente dal percorso principale.</p></div><div class="section-extra"><span class="tiny-tag">${filler.size} episodi rimossi</span></div></div><div class="callout"><div class="callout-icon">${art('compass','callout-image')}</div><div><h3>I contenuti misti restano nella guida</h3><p>Un episodio che contiene sia scene canoniche sia aggiunte dell'anime non viene eliminato: potresti altrimenti perdere parti importanti della storia.</p></div></div><div class="filler-list">${fillerData.map(([r,name])=>`<article class="filler-card"><div class="filler-symbol">${art('flag','filler-art')}</div><div><div class="filler-title">Episodi ${r}</div><div class="filler-detail">${name}</div></div><span class="filler-n">${range(r).length} ep.</span></article>`).join('')}</div><div class="tipbox"><b>Nota:</b> l'arco G-8 (196–206) è uno dei filler più apprezzati dai fan, ma non compare nel manga. Puoi guardarlo come extra quando vuoi.</div>`}
function statsView(){const c=counts(),rec=recoverData.filter(([r])=>range(r).filter(n=>!filler.has(n)).every(n=>watched.has(n))).length;return `<div class="section-header"><div><h2>Il tuo viaggio</h2><p>Controlla i progressi ed esporta i dati per non perderli.</p></div></div><div class="stat-grid"><section class="stat-panel"><div class="stat-art-head">${art('loot','stat-loot')}<div><span class="small-ribbon">TESORO DEL NAVIGATORE</span><h3>Progresso complessivo</h3></div></div><div class="stat-chart-layout"><div class="ring" style="--p:${c.percent}%"><div class="ring-label">${c.percent}%<small>COMPLETATO</small></div></div><div class="stat-legend"><span><b>${c.done}</b>Episodi canonici visti</span><span><b>${c.remaining}</b>Episodi ancora da vedere</span><span><b>${rec}/10</b>Recuperi live action</span></div></div></section><section class="stat-panel"><h3>Personalizza il percorso</h3><div class="settings-grid"><button class="button secondary small" data-action="change-start">${icon('route')} Partenza: ep. ${start}</button><button class="button secondary small" data-action="export">${icon('download')} Esporta progressi</button><button class="button secondary small" data-action="import">${icon('upload')} Importa progressi</button><button class="button danger small" data-action="reset">${icon('rotate')} Azzera progressi</button></div><p class="notice">L'app funziona senza account. I progressi vengono salvati nella memoria del browser, non sincronizzati tra dispositivi. Usa Esporta/Importa per trasferirli.</p></section></div><div class="tipbox"><strong>Aggiornamenti futuri</strong><br>L’archivio iniziale contiene 1155 episodi. Le nuove puntate già trasmesse vengono mostrate nell’elenco; soltanto quelle con classificazione documentata entrano nel percorso senza filler. Puoi importare metadati verificati dalle Impostazioni quando ne hai di nuovi.</div><div class="help-footer">Per consultare un database di riferimento: <a href="https://www.animefillerlist.com/shows/one-piece" target="_blank" rel="noopener noreferrer">Anime Filler List</a>. Non sono presenti pubblicità né tracciamenti nell'app.</div>`}
function render({keepSearchFocus=false}={}){const app=document.getElementById('app');const old=document.activeElement,selection=keepSearchFocus&&old?.id==='arc-search'?old.selectionStart:null;const scroll=window.scrollY;app.innerHTML=shell(({path:pathView,episodes:episodeView,map:mapView,recover:recoveryView,filler:fillerView,stats:()=>statsView()+moreStats(),characters:characterView,journal:journalView,achievements:achievementView,settings:settingsView,more:moreView}[tab]||pathView)());if(tab==='characters'&&typeof applyCharacterFilters==='function')applyCharacterFilters();document.documentElement.dataset.activeSection=tab;if(selection!==null){const input=document.getElementById('arc-search');input?.focus();input?.setSelectionRange(selection,selection)}window.scrollTo({top:scroll,behavior:'instant'})}
function toast(s){const t=document.getElementById('toast');t.textContent=s;t.classList.add('visible');clearTimeout(toastTimer);toastTimer=setTimeout(()=>t.classList.remove('visible'),2400)}
function setTab(t){if(!['path','episodes','map','recover','filler','stats','characters','journal','achievements','settings','more'].includes(t))return;tab=t;openArc=null;search='';render();
 const names={path:'La tua rotta',episodes:'Guida episodi',map:'Mappa',recover:'Live action',filler:'Filler',stats:'Progressi',characters:'Personaggi',journal:'Diario',achievements:'Ricompense',settings:'Impostazioni',more:'Altre sezioni'};
 document.title=(names[t]||'Rotta Canonica')+' — Rotta Canonica';
 const main=document.querySelector('main.main');if(main){main.setAttribute('tabindex','-1');main.focus({preventScroll:true})}
 window.scrollTo({top:0,behavior:window.matchMedia('(prefers-reduced-motion: reduce)').matches?'instant':'smooth'});
}
function openEpisode(n){if(n>BASE_MAX && releaseByNumber(n)){tab='episodes';render();episodeDetail(n);return;}const idx=arcData.findIndex(a=>n>=a[1]&&n<=a[2]);if(idx<0)return;tab='path';search='';openArc=idx;render();document.getElementById(`arc-${idx}`)?.scrollIntoView({behavior:'smooth',block:'center'})}
let modalReturnFocus=null;
function modal(body){
 closeModal(false);
 modalReturnFocus=document.activeElement;
 document.body.insertAdjacentHTML('beforeend',`<div class="modal-layer" data-action="modal-close-bg"><div class="modal" role="dialog" aria-modal="true" aria-label="Scheda o impostazioni" tabindex="-1">${body}</div></div>`);
 document.getElementById('app')?.setAttribute('inert','');
 const dialog=document.querySelector('.modal-layer .modal');
 (dialog?.querySelector('button:not([disabled]),input:not([disabled]),textarea:not([disabled])')||dialog)?.focus();
}
function closeModal(returnFocus=true){
 document.querySelector('.modal-layer')?.remove();
 document.getElementById('app')?.removeAttribute('inert');
 if(returnFocus&&modalReturnFocus?.isConnected)modalReturnFocus.focus({preventScroll:true});
 modalReturnFocus=null;
}
function exportProgress(){const blob=new Blob([JSON.stringify({app:'Rotta Canonica',version:1,exported:new Date().toISOString(),start,watched:[...watched],extras:extra},null,2)],{type:'application/json'});const u=URL.createObjectURL(blob);const a=document.createElement('a');a.href=u;a.download='rotta-canonica-backup-completo.json';a.click();setTimeout(()=>URL.revokeObjectURL(u),2500);toast('File dei progressi esportato')}
function importProgress(){modal(`<h3>Importa progressi</h3><p>Seleziona il file JSON precedentemente esportato da Rotta Canonica. I dati locali verranno sostituiti.</p><input id="import-file" type="file" accept=".json,application/json"><div class="modal-buttons"><button class="button secondary" data-action="modal-cancel">Annulla</button><button class="button primary" data-action="import-confirm">Importa</button></div>`)}
function changeStart(){modal(`<h3>Imposta episodio di partenza</h3><p>La prossima puntata suggerita sarà la prima non vista a partire da questo numero. I filler continueranno a essere saltati.</p><input id="start-episode" type="number" min="1" max="${MAX}" value="${start}"><div class="modal-buttons"><button class="button secondary" data-action="modal-cancel">Annulla</button><button class="button primary" data-action="start-confirm">Salva</button></div>`)}
function resetProgress(){modal(`<h3>Azzerare i progressi?</h3><p>Verranno cancellati tutti gli episodi segnati come visti. Questa operazione non può essere annullata senza un file esportato.</p><div class="modal-buttons"><button class="button secondary" data-action="modal-cancel">Annulla</button><button class="button danger" data-action="reset-confirm">Azzera tutto</button></div>`)}
document.addEventListener('click',async e=>{const t=e.target.closest('[data-tab], [data-action]');if(!t)return;if(t.dataset.tab){e.preventDefault();setTab(t.dataset.tab);return}const act=t.dataset.action;
 if(act==='next'){const n=getNext();if(n)openEpisode(n);else toast('Hai completato tutti gli episodi!')}
 else if(act==='toggle-arc'){const i=Number(t.dataset.arc);openArc=openArc===i?null:i;render();document.getElementById(`arc-${i}`)?.scrollIntoView({behavior:'smooth',block:'nearest'})}
 else if(act==='arc-all'){const a=arcData[Number(t.dataset.arc)],ns=Array.from({length:a[2]-a[1]+1},(_,i)=>a[1]+i).filter(n=>!filler.has(n));if(ns.every(n=>watched.has(n)))ns.forEach(n=>{watched.delete(n);trackWatched(n,false)});else ns.forEach(n=>{watched.add(n);trackWatched(n,true)});save();render();toast('Progressi aggiornati')}
 else if(act==='episode'){const n=Number(t.dataset.ep);if(filler.has(n))return;const before=playAchievement();if(watched.has(n))watched.delete(n);else watched.add(n);trackWatched(n,watched.has(n));save();render();if(playAchievement()>before)rewardModal()} 
 else if(act==='show-filler'){showFiller=!showFiller;save();render()}
 else if(act==='recover'){const ns=range(t.dataset.range).filter(n=>!filler.has(n));if(ns.every(n=>watched.has(n)))ns.forEach(n=>{watched.delete(n);trackWatched(n,false)});else ns.forEach(n=>{watched.add(n);trackWatched(n,true)});save();render();toast('Recupero aggiornato')}
 else if(act==='set-start-92'){start=92;extra.settingsUpdatedAt=Date.now();saveExtra();save();toast('Partenza impostata all’episodio 92');render()}
 else if(act==='change-start')changeStart();else if(act==='export')exportProgress();else if(act==='import')importProgress();else if(act==='reset')resetProgress();else if(act==='modal-cancel')closeModal();
 else if(act==='modal-close-bg'&&e.target===t)closeModal();
 else if(act==='start-confirm'){const n=Number(document.getElementById('start-episode').value);if(!Number.isInteger(n)||n<1||n>MAX){toast('Inserisci un numero tra 1 e '+MAX);return}start=n;extra.settingsUpdatedAt=Date.now();saveExtra();save();closeModal();render();toast(`Partenza impostata: episodio ${n}`)}
 else if(act==='reset-confirm'){const now=Date.now();for(const n of watched){extra.watchEdits[n]={value:false,at:now};delete extra.watchedAt[n]}watched.clear();start=92;extra.settingsUpdatedAt=now;saveAll();closeModal();render();toast('Episodi visti azzerati; note e preferiti conservati')}
 else if(act==='import-confirm'){const f=document.getElementById('import-file').files?.[0];if(!f){toast('Seleziona un file');return}try{if(f.size>3_000_000)throw Error('Backup troppo grande');const previousWatched=new Set(watched),previousFavorites=new Set(extra.favorites),previousCharacterFavorites=new Set(extra.characterFavorites);const d=JSON.parse(await f.text());if(d.app!=='Rotta Canonica'||!Array.isArray(d.watched)||d.watched.some(n=>!Number.isInteger(n)||n<1||n>CATALOG_LIMIT))throw Error('Formato non valido');watched=new Set(d.watched.filter(n=>!filler.has(n)));start=Number.isInteger(d.start)&&d.start>=1&&d.start<=CATALOG_LIMIT?d.start:92;if(d.extras&&typeof d.extras==='object'){const v=d.extras;extra.favorites=Array.isArray(v.favorites)?v.favorites.filter(n=>Number.isInteger(n)&&n>=1&&n<=CATALOG_LIMIT):[];extra.notes=v.notes&&typeof v.notes==='object'?v.notes:{};extra.ratings=v.ratings&&typeof v.ratings==='object'?v.ratings:{};extra.watchedAt=v.watchedAt&&typeof v.watchedAt==='object'?v.watchedAt:{};extra.spoiler=v.spoiler!==false;extra.reminderDays=Number.isInteger(v.reminderDays)?v.reminderDays:0;extra.theme=['light','ocean'].includes(v.theme)?v.theme:'light';extra.catalogOverride=v.catalogOverride&&typeof v.catalogOverride==='object'?v.catalogOverride:{};extra.characterFavorites=Array.isArray(v.characterFavorites)?v.characterFavorites.filter(id=>typeof id==='string'&&/^[a-z]{2,16}$/.test(id)):[];extra.characterFavoriteEdits=v.characterFavoriteEdits&&typeof v.characterFavoriteEdits==='object'&&!Array.isArray(v.characterFavoriteEdits)?v.characterFavoriteEdits:{};for(const k of ['watchEdits','favoriteEdits','noteEdits','ratingEdits'])extra[k]=v[k]&&typeof v[k]==='object'&&!Array.isArray(v[k])?v[k]:{};extra.settingsUpdatedAt=Number(v.settingsUpdatedAt)||0;}const now=Date.now();for(const n of new Set([...previousWatched,...watched]))extra.watchEdits[n]={value:watched.has(n),at:now};for(const n of new Set([...previousFavorites,...extra.favorites]))extra.favoriteEdits[n]={value:extra.favorites.includes(n),at:now};for(const id of new Set([...previousCharacterFavorites,...extra.characterFavorites]))extra.characterFavoriteEdits[id]={value:extra.characterFavorites.includes(id),at:now};extra.settingsUpdatedAt=now;saveAll();applyTheme();closeModal();render();toast('Backup importato')}catch{toast('File non valido: importa un export dell’app')}}
 else await handleExtraAction(act,t);
});
document.addEventListener('input',e=>{if(e.target.id==='arc-search'){search=e.target.value;render({keepSearchFocus:true})}else if(e.target.id==='episode-search'){episodeQuery=e.target.value;episodePage=1;const caret=e.target.selectionStart;render();const el=document.getElementById('episode-search');el?.focus();try{el?.setSelectionRange(caret,caret)}catch{}}});
document.addEventListener('change',e=>{if(e.target.id==='episode-filter'){episodeFilter=e.target.value;episodePage=1;render()}else if(e.target.id==='episode-saga'){episodeSaga=e.target.value;episodePage=1;render()}else if(e.target.id==='reminder-days'){extra.reminderDays=Number(e.target.value)||0;saveExtra();toast('Promemoria salvato')}});
document.addEventListener('keydown',e=>{
 const dialog=document.querySelector('.modal-layer .modal');
 if(e.key==='Escape'&&dialog){e.preventDefault();closeModal();return}
 if(e.key!=='Tab'||!dialog)return;
 const focusable=[...dialog.querySelectorAll('button:not([disabled]),a[href],input:not([disabled]),textarea:not([disabled]),select:not([disabled]),[tabindex]:not([tabindex="-1"])')];
 if(!focusable.length){e.preventDefault();dialog.focus();return;}
 const first=focusable[0],last=focusable[focusable.length-1];
 if(e.shiftKey&&(document.activeElement===first||document.activeElement===dialog)){e.preventDefault();last.focus()}
 else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first.focus()}
});
applyTheme();render();loadCatalog();loadWeeklyEpisodes();checkReminder();
if('serviceWorker' in navigator)window.addEventListener('load',()=>navigator.serviceWorker.register('/service-worker.js?v=17safe').catch(()=>{}));
