/* Rotta Canonica • Grand Voyage • funzionalità locali estese. Nessun servizio di terze parti. */
'use strict';
const EXTRA_KEY='rotta-canonica-extra-v1';
function loadExtra(){let x={};try{x=JSON.parse(localStorage.getItem(EXTRA_KEY)||'{}')}catch{}
return {favorites:Array.isArray(x.favorites)?x.favorites.filter(n=>Number.isInteger(n)&&n>=1&&n<=3000):[],
 characterFavorites:Array.isArray(x.characterFavorites)?x.characterFavorites.filter(id=>typeof id==='string'&&/^[a-z]{2,16}$/.test(id)):[],
 characterFavoriteEdits:x.characterFavoriteEdits&&typeof x.characterFavoriteEdits==='object'?x.characterFavoriteEdits:{},
 notes:x.notes&&typeof x.notes==='object'?x.notes:{},ratings:x.ratings&&typeof x.ratings==='object'?x.ratings:{},watchedAt:x.watchedAt&&typeof x.watchedAt==='object'?x.watchedAt:{},
 spoiler:x.spoiler!==false,reminderDays:Number.isInteger(x.reminderDays)&&x.reminderDays>=0&&x.reminderDays<=30?x.reminderDays:0,
 theme:['light','ocean'].includes(x.theme)?x.theme:'light',
 appearanceStyle:['anime','ocean','night','classic'].includes(x.appearanceStyle)?x.appearanceStyle:(x.theme==='ocean'?'ocean':'anime'),
 symbolStyle:['anime','vintage','vector'].includes(x.symbolStyle)?x.symbolStyle:'anime',
 colorPalette:['coral','sea','gold','violet','custom'].includes(x.colorPalette)?x.colorPalette:'coral',
 customAccent:typeof x.customAccent==='string'&&/^#[0-9a-fA-F]{6}$/.test(x.customAccent)?x.customAccent:'#dc4c34',
 animationLevel:['full','soft','off'].includes(x.animationLevel)?x.animationLevel:'full',
 hideCompleted:!!x.hideCompleted,watchEdits:x.watchEdits&&typeof x.watchEdits==='object'?x.watchEdits:{},favoriteEdits:x.favoriteEdits&&typeof x.favoriteEdits==='object'?x.favoriteEdits:{},noteEdits:x.noteEdits&&typeof x.noteEdits==='object'?x.noteEdits:{},ratingEdits:x.ratingEdits&&typeof x.ratingEdits==='object'?x.ratingEdits:{},settingsUpdatedAt:Number(x.settingsUpdatedAt)||0,catalogOverride:x.catalogOverride&&typeof x.catalogOverride==='object'?x.catalogOverride:{}}}
let extra=loadExtra();
function saveExtra(){try{localStorage.setItem(EXTRA_KEY,JSON.stringify(extra))}catch(e){console.warn('Spazio locale esaurito',e);toast('Memoria locale piena: esporta un backup')}}
function saveAll(){save();saveExtra()}
let episodeQuery='',episodeFilter='canon',episodeSaga='all',episodePage=1,catalog={};
let pageMode='default';
const PAGE_SIZE=30;
const MIXED_REVIEW=[61,100,101,226,628]; // segnalazioni editoriali da verificare, NON un elenco esaustivo
const MIXED_REVIEW_SET=new Set(MIXED_REVIEW);
const SAGA_GROUPS=[
 {name:'East Blue',first:1,last:53,icon:'saga-east.webp',emoji:'🌊',description:'Il viaggio comincia tra porti, villaggi e nuovi compagni.'},
 {name:'Alabasta',first:54,last:130,icon:'saga-alabasta.webp',emoji:'☀️',description:'Il cammino porta verso il regno del deserto.'},
 {name:'Sky Island',first:131,last:206,icon:'saga-sky.webp',emoji:'☁️',description:'Un viaggio oltre le rotte conosciute.'},
 {name:'Water Seven',first:207,last:325,icon:'saga-enies.webp',emoji:'⚓',description:'Una città costruita sull’acqua e nuove sfide.'},
 {name:'Thriller Bark',first:326,last:384,icon:'saga-wano.webp',emoji:'🌙',description:'Un tratto di mare avvolto nel mistero.'},
 {name:'Guerra dei vertici',first:385,last:516,icon:'saga-egghead.webp',emoji:'🛡️',description:'Un passaggio decisivo per il mondo dei pirati.'},
 {name:'Isola degli Uomini-Pesce',first:517,last:574,icon:'saga-east.webp',emoji:'🐚',description:'Un tratto di rotta sotto il livello del mare.'},
 {name:'Dressrosa',first:575,last:750,icon:'saga-enies.webp',emoji:'🌺',description:'Isole, alleanze e nuovi obiettivi.'},
 {name:'Yonko',first:751,last:889,icon:'saga-wano.webp',emoji:'👑',description:'Una parte impegnativa del grande viaggio.'},
 {name:'Wano',first:890,last:1085,icon:'saga-wano.webp',emoji:'⛩️',description:'Una terra dalle tradizioni particolari.'},
 {name:'Saga finale',first:1086,last:1155,icon:'saga-egghead.webp',emoji:'✨',description:'Gli episodi più avanzati inclusi nell’archivio locale.'}
];
const CHARACTERS=[
 {id:'luffy',name:'Monkey D. Luffy',role:'Capitano',unlock:1,profile:'Parte all’avventura con il sogno di diventare il Re dei Pirati. Coraggioso, impulsivo e fedele ai propri amici.',tags:'capitano ciurma sogno'},
 {id:'zoro',name:'Roronoa Zoro',role:'Spadaccino',unlock:2,profile:'Combatte usando tre spade e si allena per diventare il miglior spadaccino del mondo.',tags:'spadaccino spade'},
 {id:'nami',name:'Nami',role:'Navigatrice',unlock:3,profile:'Esperta di rotte, mappe e meteorologia, guida la ciurma attraverso i mari.',tags:'navigatrice cartografia'},
 {id:'usopp',name:'Usopp',role:'Tiratore',unlock:9,profile:'Inventore e narratore instancabile, sogna di diventare un coraggioso guerriero del mare.',tags:'tiratore inventore'},
 {id:'sanji',name:'Sanji',role:'Cuoco',unlock:20,profile:'Cuoco del Baratie, porta nella ciurma la sua passione per la cucina e il combattimento.',tags:'cuoco combattente'},
 {id:'chopper',name:'Tony Tony Chopper',role:'Medico',unlock:81,profile:'Un giovane medico e una renna molto speciale che vuole curare ogni malattia.',tags:'medico renna'},
 {id:'robin',name:'Nico Robin',role:'Archeologa',unlock:130,profile:'Studia le antiche civiltà, i misteri della storia e le tracce del passato.',tags:'archeologa storia'},
 {id:'franky',name:'Franky',role:'Carpentiere',unlock:233,profile:'Un costruttore di navi dall’estro incredibile, appassionato di ingegneria e invenzioni.',tags:'carpentiere invenzioni'},
 {id:'brook',name:'Brook',role:'Musicista',unlock:337,profile:'Musicista e spadaccino dall’umorismo inconfondibile, ama portare musica in ogni viaggio.',tags:'musicista spadaccino'},
 {id:'jinbe',name:'Jinbe',role:'Timoniere',unlock:430,profile:'Esperto uomo-pesce e navigatore con una conoscenza profonda del mare.',tags:'timoniere uomo pesce'},
 // Due incontri illustrati con ritratti fan-made già disponibili nel progetto.
 // Gli sblocchi sono soglie conservative anti-spoiler, non "prima apparizione".
 {id:'ace',name:'Portgas D. Ace',role:'Pirata',group:'Incontri',unlock:130,profile:'Un pirata determinato dal forte legame con la storia di Luffy. La sua scheda evita sviluppi successivi.',tags:'pirata incontri alleato'},
 {id:'law',name:'Trafalgar D. Water Law',role:'Capitano e medico',group:'Incontri',unlock:405,profile:'Un capitano dalla mente strategica, noto per le sue competenze mediche e il suo equipaggio.',tags:'medico capitano alleato incontri'}
]
const ACHIEVEMENTS=[
 {id:'first',title:'Prima vela',detail:'Guarda il tuo primo episodio canonico.',icon:'compass',test:()=>watched.size>=1},
 {id:'ten',title:'Prime dieci miglia',detail:'Completa 10 episodi canonici.',icon:'route',test:()=>counts().done>=10},
 {id:'fifty',title:'Esploratore',detail:'Completa 50 episodi canonici.',icon:'map',test:()=>counts().done>=50},
 {id:'hundred',title:'Navigatore',detail:'Completa 100 episodi canonici.',icon:'wheel',test:()=>counts().done>=100},
 {id:'threehundred',title:'Veterano',detail:'Completa 300 episodi canonici.',icon:'anchor',test:()=>counts().done>=300},
 {id:'fivehundred',title:'Rotta oceanica',detail:'Completa 500 episodi canonici.',icon:'loot',test:()=>counts().done>=500},
 {id:'thousand',title:'Mille avventure',detail:'Completa 1000 episodi canonici.',icon:'chest',test:()=>counts().done>=1000},
 {id:'east',title:'East Blue completato',detail:'Completa i canonici della prima saga.',icon:'flag',test:()=>allCanon.filter(n=>n<=53).every(n=>watched.has(n))},
 {id:'recoveries',title:'Niente dimenticato',detail:'Completa tutti i recuperi dal live action.',icon:'complete',test:()=>recoverData.every(([r])=>range(r).filter(n=>!filler.has(n)).every(n=>watched.has(n)))},
 {id:'fivefavorites',title:'Collezionista',detail:'Aggiungi cinque episodi ai preferiti.',icon:'loot',test:()=>extra.favorites.length>=5},
 {id:'threenotes',title:'Diario di bordo',detail:'Scrivi tre note personali.',icon:'map',test:()=>Object.values(extra.notes).filter(x=>String(x).trim()).length>=3}
];
function spoilerHorizon(){return Math.max(Math.min(start-1,BASE_MAX),...watched,0)}
function blocked(n){return extra.spoiler&&n>spoilerHorizon()}
function spoilerName(n,s){return blocked(n)?'Isola inesplorata':s}
function episodeArc(n){return arcData.find(a=>n>=a[1]&&n<=a[2])||['Nuove uscite · saga finale',n,n,'Saga finale']}
function episodeStatus(n){if(n>BASE_MAX)return releaseByNumber(n)?.classification||'unverified';return filler.has(n)?'filler':MIXED_REVIEW_SET.has(n)?'mixed':'canon'}
function usableEpisodeTitle(value,n){
 const title=typeof value==='string'?value.trim():'';
 if(!title||/^(?:navigazione|navigation|curiosit[aà]|note|notes|differenze\s+(?:fra|tra)\s+manga\s+e\s+anime\s*=?|site\s+navigation)$/i.test(title))return 'Episodio '+n;
 return title;
}
function epInfo(n){const arc=episodeArc(n),edit=extra.catalogOverride[n]||{},base=catalog[n]||{},released=n>BASE_MAX?releaseByNumber(n):null;
 const summary=edit.summary||base.summary||released?.summary||null,chapter=edit.chapter||base.chapter||released?.chapter||null;
 return {n,title:usableEpisodeTitle(edit.title||base.title||released?.title,n),arc:arc[0],saga:arc[3],chapter,chapterDetails:base.chapterDetails||released?.chapterDetails||[],chapterStatus:base.chapterStatus||released?.chapterStatus||null,duration:edit.duration||base.duration||released?.duration||null,summary,summaryStatus:base.summaryStatus||released?.summaryStatus||null,summaryLanguage:base.summaryLanguage||released?.summaryLanguage||null,source:base.source||released?.source||null,titleSource:base.titleSource||released?.titleSource||null,summarySource:base.summarySource||released?.summarySource||null,chapterSource:base.chapterSource||released?.chapterSource||null,editorialSource:base.editorialSource||released?.editorialSource||edit.source||null,verifiedAt:base.verifiedAt||released?.verifiedAt||null,status:episodeStatus(n),aired:released?.aired||null,editoriallyReviewed:!!(base.editorialSource?.url||base.summarySource?.url||base.chapterSource?.url||released?.summarySource?.url||released?.chapterSource?.url||edit.source?.url)};
}
function epStatusLabel(s){return s==='filler'?'Filler':s==='mixed'?'Misto':s==='unverified'?'Da verificare':'Nel percorso'}
function sectionHeader(title,description){return `<div class="section-header"><div><h2>${title}</h2><p>${description}</p></div></div>`}
function catalogCoverage(){const rows=Object.values(catalog);return {total:BASE_MAX,titles:rows.filter(e=>e.title&&usableEpisodeTitle(e.title,0)!=='Episodio 0').length,chapters:rows.filter(e=>e.chapter).length,summaries:rows.filter(e=>e.summary).length}}

function episodeView(){let items=availableEpisodeNumbers(),query=episodeQuery.toLocaleLowerCase('it').trim();
 if(episodeFilter==='canon')items=items.filter(n=>n<=BASE_MAX?!filler.has(n):confirmedForRoute(releaseByNumber(n)||{}));
 if(episodeFilter==='filler')items=items.filter(n=>filler.has(n));
 if(episodeFilter==='mixed')items=items.filter(n=>episodeStatus(n)==='mixed');
 if(episodeFilter==='unverified')items=items.filter(n=>episodeStatus(n)==='unverified');
 if(episodeFilter==='unwatched')items=items.filter(n=>allCanon.includes(n)&&!watched.has(n));
 if(episodeFilter==='watched')items=items.filter(n=>watched.has(n));
 if(episodeFilter==='favorites')items=items.filter(n=>extra.favorites.includes(n));
 if(episodeSaga!=='all'){const g=SAGA_GROUPS.find(g=>g.name===episodeSaga);if(g)items=items.filter(n=>n>=g.first&&(n<=g.last||(g.name==='Saga finale'&&n>BASE_MAX)))}
 if(query)items=items.filter(n=>{const ep=epInfo(n);return /^\d+$/.test(query)?n===Number(query):String(n).includes(query)||ep.arc.toLowerCase().includes(query)||ep.saga.toLowerCase().includes(query)||ep.title.toLowerCase().includes(query)||String(ep.chapter||'').toLowerCase().includes(query)});
 const count=items.length,shown=items.slice(0,episodePage*PAGE_SIZE),cov=catalogCoverage(),next=getNext();
 return `<div class="section-shell">${sectionHeader('Guida agli episodi','Cerca per numero o arco. I titoli e i capitoli compaiono solo quando sono stati verificati nel catalogo.')}
 <div class="notice-catalog">${art('compass','notice-icon')}<div><b>${cov.titles?`Titoli con fonte: ${cov.titles}/${cov.total}`:'Titoli non ancora nel catalogo'}</b><div class="catalog-coverage" aria-label="Copertura metadati degli episodi"><span>Titoli ${cov.titles}/${cov.total}</span><span>Capitoli ${cov.chapters}/${cov.total}</span><span>Sinossi ${cov.summaries}/${cov.total}</span></div><span>${cov.titles?'Puoi importare altri metadati verificati dalle Impostazioni.':'Per ora vedi numero e arco: puoi comunque segnare i visti e aggiungere note.'}</span></div></div>
 <div class="episode-jump"><label for="jump-episode">Vai all’episodio</label><input id="jump-episode" type="number" min="1" max="${MAX}" placeholder="es. 92" inputmode="numeric"><button class="button small primary" data-action="jump-episode">Apri</button><button class="button small secondary" data-action="filter-unwatched">Solo da vedere</button></div>
 <div class="episode-filters"><label class="search-box">${icon('search')}<input id="episode-search" type="search" autocomplete="off" placeholder="Numero, titolo o arco…" value="${cleanText(episodeQuery)}"></label>
 <label>Tipo<select id="episode-filter"><option value="canon" ${episodeFilter==='canon'?'selected':''}>Percorso senza filler</option><option value="all" ${episodeFilter==='all'?'selected':''}>Tutti</option><option value="filler" ${episodeFilter==='filler'?'selected':''}>Filler</option><option value="mixed" ${episodeFilter==='mixed'?'selected':''}>Misti</option><option value="unverified" ${episodeFilter==='unverified'?'selected':''}>Uscite da verificare</option><option value="unwatched" ${episodeFilter==='unwatched'?'selected':''}>Da vedere</option><option value="watched" ${episodeFilter==='watched'?'selected':''}>Già visti</option><option value="favorites" ${episodeFilter==='favorites'?'selected':''}>Preferiti</option></select></label>
 <label>Saga<select id="episode-saga"><option value="all">Tutte le saghe</option>${SAGA_GROUPS.map(g=>`<option value="${cleanText(g.name)}" ${episodeSaga===g.name?'selected':''}>${cleanText(g.name)}</option>`).join('')}</select></label></div>
 <div class="result-hint">${count} risultati · ${Math.min(shown.length,count)} mostrati <button class="inline-link" data-action="go-next">${icon('play')} Prossimo: ${next||'completato'}</button></div>
 <div class="episode-list">${shown.map(n=>episodeListItem(n)).join('')||'<div class="empty">Nessun episodio trovato.</div>'}</div>
 ${shown.length<count?`<button class="button secondary show-more" data-action="episodes-more">Carica altri episodi (${count-shown.length} rimasti)</button>`:''}
 </div>`}
function episodeListItem(n){const x=epInfo(n),lock=blocked(n),fave=extra.favorites.includes(n),done=watched.has(n),status=x.status;
 const titleLabel=lock?`Episodio ${n}`:(x.title&&x.title!==`Episodio ${n}`?cleanText(x.title):`Episodio ${n}`);
 return `<article class="ep-list-item ${done?'is-done':''} ${status==='filler'?'is-filler':''}"><div class="ep-list-num">${n}</div><div class="ep-list-copy"><b>${titleLabel}</b><span>${lock?'Contenuti protetti':cleanText(x.arc)} · <span class="ep-tag ${status}">${epStatusLabel(status)}</span>${!lock&&x.chapter?` · Cap. ${cleanText(x.chapter)}`:''}${(!x.title||x.title===`Episodio ${n}`)?` · <em class="ep-missing">titolo da catalogare</em>`:''}</span></div><div class="ep-list-actions"><button class="icon-action ${fave?'selected':''}" aria-label="${fave?'Rimuovi dai':'Aggiungi ai'} preferiti episodio ${n}" data-action="favorite" data-ep="${n}">★</button><button class="icon-action ${done?'selected':''}" aria-label="${done?'Segna da vedere':'Segna visto'} episodio ${n}" data-action="episode" data-ep="${n}" ${status==='filler'||status==='unverified'?'disabled title="Non inserito nel percorso verificato"':''}>${done?'✓':'○'}</button><button class="mini-detail" data-action="detail" data-ep="${n}" aria-label="Apri scheda episodio ${n}">Scheda ›</button></div></article>`}
function episodeDetail(n){const x=epInfo(n),lock=blocked(n),fav=extra.favorites.includes(n),rate=Number(extra.ratings[n]||0),text=String(extra.notes[n]||''),done=watched.has(n);
 const defaultP=lock?'Questa informazione è nascosta dalla modalità antispoiler.':x.summary||(x.summaryStatus==='missing-source-section'?'La scheda italiana non riporta una sinossi disponibile.':'Sinossi non ancora verificata nel catalogo. Puoi registrare qui le tue note personali.');
 const chapterLabel=lock?'Nascosto':x.chapter?cleanText(x.chapter):x.chapterStatus==='no-manga-mapping'?'Nessun capitolo manga mappato':'Da verificare';
 const safeSourceUrl=url=>/^https:\/\/(?:onepiece\.fandom\.com|myanimelist\.net|www\.crunchyroll\.com)\/[^\s]+$/i.test(String(url||''));
 const sourceLinks=[['Titolo',x.source],['Sinossi',x.summarySource],['Capitoli',x.chapterSource]].filter(([,source])=>!lock&&safeSourceUrl(source?.url));
 const sourceMarkup=sourceLinks.length?`<div class="episode-source-links">${sourceLinks.map(([label,source])=>`<a href="${cleanText(source.url)}" target="_blank" rel="noopener noreferrer">${label} · ${cleanText(source.provider||'Fonte')}</a>`).join('')}</div>`:'';
 const chapterItems=!lock&&Array.isArray(x.chapterDetails)?x.chapterDetails.slice(0,12).map(item=>{const label=`Cap. ${item.chapter}${item.pages?` · pp. ${cleanText(item.pages)}`:''}`;return safeSourceUrl(item.url)?`<a href="${cleanText(item.url)}" target="_blank" rel="noopener noreferrer">${label}</a>`:`<span>${label}</span>`}).join(''):'';
 modal(`<div class="episode-detail"><span class="eyebrow">SCHEDA DELL’EPISODIO</span><h3>${lock?'Episodio '+n:cleanText(x.title)}</h3><div class="detail-sub">Episodio ${n} · ${lock?'Saga nascosta':cleanText(x.arc)}</div><span class="ep-tag ${x.status}">${epStatusLabel(x.status)}</span><p>${cleanText(defaultP)}</p>
 <div class="detail-source">Capitoli manga: <b>${chapterLabel}</b> · Durata: <b>${x.duration?cleanText(x.duration):'Da verificare'}</b> · ${x.source?'Fonte titolo: '+cleanText(x.source.provider||'Catalogo terzo'):'Metadati del titolo da verificare.'}</div>
 ${chapterItems?`<div class="chapter-details"><b>Pagine adattate nel manga</b><div>${chapterItems}</div></div>`:''}${sourceMarkup}
 <div class="detail-actions"><button class="button small ${done?'secondary':'primary'}" data-action="detail-watch" data-ep="${n}" ${x.status==='filler'||x.status==='unverified'?'disabled':''}>${done?'✓ Già visto · annulla':'✓ Segna come visto'}</button><button class="button secondary small" data-action="favorite" data-ep="${n}">${fav?'★ Nei preferiti':'☆ Preferito'}</button></div>
 <div class="rating-group" role="group" aria-label="La tua valutazione">Valutazione personale ${[1,2,3,4,5].map(k=>`<button class="rate-star ${rate>=k?'selected':''}" data-action="rate" data-ep="${n}" data-score="${k}" aria-label="${k} stelle">★</button>`).join('')}</div>
 <label class="note-label">Note private <textarea id="detail-notes" maxlength="2500" rows="4" placeholder="Le note rimangono locali, oppure private nel cloud quando effettui il login.">${cleanText(text)}</textarea></label><div class="modal-buttons"><button class="button secondary" data-action="modal-cancel">Chiudi</button><button class="button primary" data-action="note-save" data-ep="${n}">Salva note</button></div></div>`)}
function newMapStop(){
 const recent=weeklyEpisodes.filter(confirmedForRoute);if(!recent.length)return '';
 const remaining=recent.filter(e=>!watched.has(e.number)).length;
 const locked=extra.spoiler&&recent[0].number>spoilerHorizon();
 return `<button class="map-stop map-stop-new ${locked?'fogged':''}" data-action="open-latest" ${locked?'disabled aria-disabled="true"':''} aria-label="${locked?'Rotta ancora inesplorata':'Nuove uscite con fonte editoriale'}">
   <span class="map-stop-number">★</span><img src="/assets/route-6.webp" alt="" loading="lazy"><span class="map-stop-body"><b>${locked?'Rotta inesplorata':'Nuove uscite documentate'}</b><small>${recent.length} nuove puntate · ${remaining} da guardare</small><span class="mini-track"><i style="width:${recent.length?(recent.length-remaining)/recent.length*100:0}%"></i></span></span>
  </button>`;
}
function mapView(){const horizon=spoilerHorizon(),next=getNext();return `<div class="section-shell">${sectionHeader('Mappa della Grand Line','Ogni tappa corrisponde a una saga; salpa verso un’isola per aprire i suoi episodi canonici.')}
 <div class="map-board"><div class="map-top"><span>LA ROTTA DEL NAVIGATORE</span><span>${counts().percent}% del viaggio</span></div><div class="map-compass">${art('compass')}</div><div class="map-trail">${SAGA_GROUPS.map((g,i)=>{const ns=allCanon.filter(n=>n>=g.first&&n<=g.last),done=ns.filter(n=>watched.has(n)).length,pct=ns.length?Math.round(done/ns.length*100):0,lock=extra.spoiler&&g.first>horizon,here=!!next&&next>=g.first&&next<=g.last;
 return `<button class="map-stop ${pct===100?'conquered':''} ${lock?'fogged':''} ${here?'you-are-here':''}" data-action="map-saga" data-first="${g.first}" ${lock?'disabled aria-disabled="true" title="Tappa protetta dagli spoiler"':''} aria-label="${lock?'Isola inesplorata':g.name}, episodi ${g.first}-${g.last}"><span class="map-stop-number">${here?'◎':String(i+1).padStart(2,'0')}</span><img src="/assets/route-${[2,5,4,6,2,5][i%6]}.webp" alt="" loading="lazy"><span class="map-stop-body"><b>${lock?'Isola inesplorata':cleanText(g.name)}</b><small>${lock?'Protetta dagli spoiler':`Ep. ${g.first}–${g.last} · ${done}/${ns.length} · ${pct}%`}${here?' · sei qui':''}</small><span class="mini-track"><i style="width:${pct}%"></i></span></span>${pct===100?'<span class="map-checked">✓</span>':here?'<span class="map-here">Qui</span>':''}</button>`}).join('')}${newMapStop()}</div><div class="map-bottom">${art('spyglass')} <span>La mappa è una rappresentazione tematica, non una cartografia ufficiale del mondo di One Piece.</span></div></div>
 </div>`}
const v22FeaturedCharacters=['nami','usopp','sanji','chopper'];
const v22PortraitIds=new Set(['luffy','zoro','nami','usopp','sanji','chopper','robin','franky','brook','jinbe']);
const v22RoleIcons={luffy:'flag',zoro:'anchor',nami:'compass',usopp:'spyglass',sanji:'treasure',chopper:'complete',robin:'map',franky:'wheel',brook:'flag',jinbe:'wheel',ace:'flag',law:'complete'};
function characterPortrait(c,locked=false,large=false){
 const scene=v22PortraitIds.has(c.id)?'/assets/anime-v22-portraits/'+c.id+'.webp':'/assets/character-scenes/'+c.id+'.webp';
 const loading=v22FeaturedCharacters.includes(c.id)?'eager':'lazy';
 return `<img class="character-portrait${large?' portrait-large':''}" src="${scene}?v=22-anime" alt="${locked?'':cleanText('Ritratto illustrato di '+c.name)}" loading="${loading}" decoding="async">`;
}
let characterQuery='',characterFilter='all';
function toggleCharacterFavorite(id){
 const c=CHARACTERS.find(p=>p.id===id);
 if(!c||blocked(c.unlock))return false;
 const old=new Set(extra.characterFavorites||[]);
 if(old.has(id))old.delete(id);else old.add(id);
 extra.characterFavorites=[...old];
 extra.characterFavoriteEdits[id]={value:old.has(id),at:Date.now()};
 saveExtra();return old.has(id);
}
function applyCharacterFilters(){
 const area=document.querySelector('.character-section');if(!area)return;
 const q=characterQuery.toLocaleLowerCase('it').trim();
 let visible=0;
 for(const card of area.querySelectorAll('.char-card')){
  const locked=card.dataset.locked==='true';
  const favorite=(extra.characterFavorites||[]).includes(card.dataset.id);
  const group=card.dataset.group;
  const eligible=characterFilter==='all'||characterFilter==='discovered'&&!locked||characterFilter==='locked'&&locked||characterFilter==='favorites'&&favorite||characterFilter==='crew'&&group==='crew'||characterFilter==='encounters'&&group==='encounters';
  const ok=eligible&&(!q||card.dataset.search.includes(q));
  card.hidden=!ok;if(ok)visible++;
 }
 const count=area.querySelector('#character-match-count');if(count)count.textContent=`${visible} ${visible===1?'scheda trovata':'schede trovate'}`;
 const empty=area.querySelector('.character-no-results');if(empty)empty.hidden=visible>0;
}
function characterView(){
 const discovered=CHARACTERS.filter(c=>!blocked(c.unlock)).length;
 const favoriteCount=(extra.characterFavorites||[]).length;
 return `<div class="section-shell character-section">
 <section class="characters-hero" aria-label="Enciclopedia dei personaggi">
   <div class="characters-hero-top"><span>ENCICLOPEDIA DELLA GRAND LINE</span><span class="characters-hero-count">${discovered} / ${CHARACTERS.length} scoperti</span></div>
   <div class="characters-hero-title"><img src="/assets/ui-compass.webp" width="45" height="45" alt="" loading="lazy"><h1>PERSONAGGI</h1><span class="characters-hero-anchor" aria-hidden="true">⚓</span></div>
   <p>Conosci la ciurma e gli incontri più importanti. I personaggi futuri restano nascosti finché non li raggiungi.</p>
 </section>
 <div class="character-toolbar"><label class="character-search" for="character-search"><span aria-hidden="true">⌕</span><input id="character-search" type="search" autocomplete="off" placeholder="Cerca un personaggio…" value="${cleanText(characterQuery)}" aria-label="Cerca per nome, ruolo o descrizione"></label>
 <label class="character-filter-label"><span>Filtra</span><select id="character-filter" aria-label="Filtra personaggi"><option value="all" ${characterFilter==='all'?'selected':''}>Tutti</option><option value="crew" ${characterFilter==='crew'?'selected':''}>Ciurma</option><option value="encounters" ${characterFilter==='encounters'?'selected':''}>Altri incontri</option><option value="discovered" ${characterFilter==='discovered'?'selected':''}>Scoperti</option><option value="locked" ${characterFilter==='locked'?'selected':''}>Da scoprire</option><option value="favorites" ${characterFilter==='favorites'?'selected':''}>Preferiti ★ (${favoriteCount})</option></select></label></div>
 <div class="character-utility"><span id="character-match-count">${CHARACTERS.length} schede trovate</span><div class="character-spoiler"><span>${icon('shield')} Antispoiler <b>${extra.spoiler?'attivo':'disattivato'}</b></span><button type="button" data-action="spoiler-toggle">${extra.spoiler?'Mostra tutti':'Proteggi'}</button></div></div>
 <div class="character-grid">${[...CHARACTERS].sort((a,b)=>{
  const ia=v22FeaturedCharacters.indexOf(a.id),ib=v22FeaturedCharacters.indexOf(b.id);
  return (ia<0?100+CHARACTERS.indexOf(a):ia)-(ib<0?100+CHARACTERS.indexOf(b):ib);
 }).map(c=>{const i=CHARACTERS.indexOf(c);
  const locked=blocked(c.unlock),favorite=!locked&&(extra.characterFavorites||[]).includes(c.id);
  const searchable=locked?`personaggio da scoprire episodio ${c.unlock}`:`${c.name} ${c.role} ${c.profile} ${c.tags}`.toLocaleLowerCase('it');
  return `<article class="char-card ${locked?'is-locked':''}" data-id="${c.id}" data-group="${c.group?'encounters':'crew'}" data-locked="${locked}" data-search="${cleanText(searchable)}">
   <button type="button" class="char-open" data-action="character-detail" data-character="${i}" aria-label="${locked?`Personaggio non ancora sbloccato, episodio ${c.unlock}`:`Apri la scheda di ${cleanText(c.name)}`}" ${locked?'aria-disabled="true"':''}>
    <span class="char-art"><span class="char-photo-frame">${characterPortrait(c,locked)}${locked?'<span class="char-hidden-mark" aria-hidden="true">?</span>':''}</span></span>
    <span class="char-copy"><span class="char-kicker">${art(v22RoleIcons[c.id]||'compass','char-role-icon')} ${locked?'IDENTITÀ NASCOSTA':cleanText(c.role)}</span><strong class="char-title">${locked?'Da scoprire':cleanText(c.name)}</strong><span class="char-description">${locked?`Scheda disponibile dall’episodio ${c.unlock}.`:cleanText(c.profile)}</span><span class="char-cta"><span>${locked?`Da ep. ${c.unlock}`:'Scopri la scheda'}${!locked?` <small>· Ep. ${c.unlock}</small>`:''}</span><span aria-hidden="true">›</span></span></span>
   </button>
   ${locked?'<span class="char-favorite locked" title="Non ancora sbloccato" aria-label="Personaggio ancora bloccato">⌑</span>':`<button type="button" class="char-favorite ${favorite?'is-favorite':''}" data-action="character-star" data-character-id="${c.id}" aria-pressed="${favorite}" aria-label="${favorite?'Rimuovi':'Aggiungi'} ${cleanText(c.name)} ${favorite?'dai':'ai'} preferiti">★</button>`}
  </article>`}).join('')}</div>
 <div class="character-no-results" hidden><img src="/assets/ui-spyglass.webp" alt=""><strong>Nessuna scheda trovata</strong><p>Prova un nome diverso o modifica il filtro.</p></div>
 <p class="character-source-note">Ritratti fan-made non ufficiali. L’antispoiler oscura le schede che non hai ancora raggiunto nella storia.</p>
 </div>`;
}
function characterDetail(i){
 const c=CHARACTERS[i];if(!c)return;
 if(blocked(c.unlock)){toast('Personaggio bloccato: raggiungi l’episodio '+c.unlock+' oppure disattiva la protezione spoiler.');return;}
 modal(`<div class="character-detail"><div class="detail-portrait">${characterPortrait(c,false,true)}</div><div class="detail-profile"><span class="eyebrow">ENCICLOPEDIA DEI PERSONAGGI</span><h3>${cleanText(c.name)}</h3><span class="detail-role">${cleanText(c.role)}</span><p>${cleanText(c.profile)}</p><div class="detail-facts"><span>Ruolo</span><b>${cleanText(c.role)}</b><span>Gruppo</span><b>${c.group?"Altri incontri":"Ciurma di Cappello di Paglia"}</b><span>Disponibile dopo</span><b>Episodio ${c.unlock} (soglia antispoiler)</b></div><p class="smallprint">Scheda senza anticipazioni importanti. Ritratto fan-made non ufficiale.</p><div class="modal-buttons"><button class="button primary" data-action="modal-cancel">Torna alla ciurma</button></div></div></div>`);
}
function notesSummary(){const rows=Object.entries(extra.notes).filter(([n,t])=>String(t).trim()&&Number(n)>=1&&Number(n)<=CATALOG_LIMIT).sort((a,b)=>Number(b[0])-Number(a[0]));return rows}
function journalView(){const dates=Object.values(extra.watchedAt).filter(s=>typeof s==='string').map(s=>s.slice(0,10)).sort().reverse();const unique=[...new Set(dates)].sort().reverse();const latest=unique[0];const rows=notesSummary();const favorites=extra.favorites.slice().sort((a,b)=>a-b);
 return `<div class="section-shell">${sectionHeader('Diario di bordo','Annota gli episodi, tieni i preferiti e conserva i ricordi del tuo viaggio.')}
 <div class="journal-metrics"><div><b>${Object.keys(extra.watchedAt).length}</b><span>Visioni registrate da questa versione</span></div><div><b>${unique.length}</b><span>Giorni di attività</span></div><div><b>${favorites.length}</b><span>Episodi preferiti</span></div><div><b>${rows.length}</b><span>Note personali</span></div></div>
 <div class="journal-columns"><section class="paper-panel"><h3>${art('map')} Appunti di viaggio</h3>${rows.length?rows.slice(0,12).map(([n,t])=>`<button class="journal-entry" data-action="detail" data-ep="${n}"><b>Ep. ${n}</b><span>${cleanText(String(t).slice(0,180))}</span></button>`).join(''):'<p>Ancora nessun appunto. Apri la scheda di un episodio e scrivi la tua prima nota.</p>'}<button class="button small secondary" data-tab="episodes">Apri guida episodi</button></section>
 <section class="paper-panel"><h3>${art('loot')} I miei tesori</h3>${favorites.length?`<div class="favorite-chips">${favorites.slice(0,50).map(n=>`<button data-action="detail" data-ep="${n}">★ Ep. ${n}</button>`).join('')}</div>`:'<p>Nessun episodio nei preferiti. Premi ★ accanto a una puntata per aggiungerla.</p>'}<div class="journal-date">${latest?'Ultima attività registrata: '+cleanText(latest):'Le date vengono registrate quando segni un nuovo episodio visto.'}</div><button class="button small secondary" data-tab="achievements">Visualizza ricompense</button></section></div>
 </div>`}
function achievementView(){const wins=ACHIEVEMENTS.filter(x=>x.test()).length;return `<div class="section-shell">${sectionHeader('Ricompense del viaggio','Le ricompense sono traguardi simbolici, non premi acquistabili.')}
 <div class="achievement-head">${art('chest')}<div><b>${wins} / ${ACHIEVEMENTS.length}</b><span>Obiettivi conquistati</span></div></div>
 <div class="achievement-grid">${ACHIEVEMENTS.map(a=>{const unlocked=a.test();return `<article class="achievement-card ${unlocked?'earned':''}"><div class="achievement-badge">${art(a.icon)}</div><span>${unlocked?'SBLOCCATO':'DA CONQUISTARE'}</span><h3>${cleanText(a.title)}</h3><p>${cleanText(a.detail)}</p></article>`}).join('')}</div></div>`}
function settingsView(){return `<div class="section-shell">${sectionHeader('Impostazioni di bordo','Personalizza il viaggio e proteggi i tuoi dati.')}
 <div class="settings-columns">
 <section class="paper-panel appearance-lab" aria-label="Personalizza grafica dell'app">
   <div class="appearance-head"><div class="appearance-head-art">${art('compass')}</div><div><span class="appearance-kicker">LA BOTTEGA DEL NAVIGATORE</span><h3>Personalizza l'avventura</h3><p>Cambia direttamente grafica, colori, simboli e animazioni. Ogni scelta viene salvata su questo dispositivo.</p></div></div>
   <div class="appearance-preview" aria-label="Anteprima del tema corrente">
     <span class="preview-rays" aria-hidden="true"></span>
     <span class="preview-icon">${art('chest')}</span><span class="preview-icon">${art('compass')}</span><span class="preview-icon">${art('map')}</span>
     <b>La tua rotta, il tuo stile</b>
   </div>
   <div class="appearance-controls">
     <label class="setting-select">Stile grafico
       <select id="visual-style" aria-label="Stile grafico">
         <option value="anime" ${extra.appearanceStyle==='anime'?'selected':''}>Anime avventura · illustrato</option>
         <option value="ocean" ${extra.appearanceStyle==='ocean'?'selected':''}>Oceano celeste · colori vivaci</option>
         <option value="night" ${extra.appearanceStyle==='night'?'selected':''}>Notte dei pirati · blu profondo</option>
         <option value="classic" ${extra.appearanceStyle==='classic'?'selected':''}>Pergamena classica · tradizionale</option>
       </select>
     </label>
     <label class="setting-select">Simboli e icone
       <select id="visual-symbols" aria-label="Stile delle icone">
         <option value="anime" ${extra.symbolStyle==='anime'?'selected':''}>Anime illustrati · dettagliati</option>
         <option value="vintage" ${extra.symbolStyle==='vintage'?'selected':''}>Emblemi nautici · vintage</option>
         <option value="vector" ${extra.symbolStyle==='vector'?'selected':''}>Simboli essenziali · SVG</option>
       </select>
     </label>
     <label class="setting-select">Palette colori
       <select id="visual-palette" aria-label="Palette colori">
         <option value="coral" ${extra.colorPalette==='coral'?'selected':''}>Rosso avventura</option>
         <option value="sea" ${extra.colorPalette==='sea'?'selected':''}>Blu mare</option>
         <option value="gold" ${extra.colorPalette==='gold'?'selected':''}>Oro del tesoro</option>
         <option value="violet" ${extra.colorPalette==='violet'?'selected':''}>Viola misterioso</option>
         <option value="custom" ${extra.colorPalette==='custom'?'selected':''}>Colore personale</option>
       </select>
     </label>
     <label class="setting-select appearance-color">Scegli un colore preciso
       <input id="visual-accent" type="color" value="${extra.customAccent}" aria-label="Scegli colore personalizzato">
     </label>
     <label class="setting-select">Animazioni
       <select id="visual-motion" aria-label="Intensità animazioni">
         <option value="full" ${extra.animationLevel==='full'?'selected':''}>Anime dinamico · completo</option>
         <option value="soft" ${extra.animationLevel==='soft'?'selected':''}>Movimenti delicati</option>
         <option value="off" ${extra.animationLevel==='off'?'selected':''}>Disattivate</option>
       </select>
     </label>
   </div>
   <div class="appearance-footer"><span>Puoi combinare liberamente stili, simboli e colori.</span><button class="button secondary small" data-action="visual-reset">Ripristina la grafica anime</button></div>
 </section>
 <section class="paper-panel"><h3>${art('compass')} Navigazione</h3><div class="setting-item"><div><b>Protezione spoiler</b><small>Stato: <strong>${extra.spoiler?'attiva':'disattivata'}</strong>. Nasconde saghe e personaggi non ancora raggiunti.</small></div><button class="button small secondary" data-action="spoiler-toggle" aria-pressed="${extra.spoiler}">${extra.spoiler?'Disattiva protezione':'Attiva protezione'}</button></div>

 <div class="setting-item"><div><b>Nascondi saghe completate</b><small>Nella Home puoi tenere solo le tappe ancora da finire.</small></div><button class="button small secondary" data-action="hide-completed" aria-pressed="${!!extra.hideCompleted}">${extra.hideCompleted?'Mostra tutte':'Nascondi completate'}</button></div>
 <div class="setting-item"><div><b>Riprendi dal numero</b><small>Non modifica gli episodi già segnati come visti.</small></div><button class="button small secondary" data-action="change-start">Ep. ${start}</button></div></section>
 <section class="paper-panel"><h3>${art('spyglass')} Promemoria</h3><p>Il promemoria compare <b>quando apri l’app</b>, se non guardi episodi da alcuni giorni.</p><label class="setting-select">Ricordamelo dopo<select id="reminder-days">${[0,1,2,3,5,7,14,30].map(d=>`<option value="${d}" ${extra.reminderDays===d?'selected':''}>${d===0?'Disattivato':`${d} giorni`}</option>`).join('')}</select></label><button class="button small secondary" data-action="notification-test">Prova notifica</button><p class="smallprint">Questo promemoria è locale e non richiede l’accesso con email.</p></section>
 ${typeof cloudPanel==='function'?cloudPanel():''}
 <section class="paper-panel"><h3>${art('chest')} Backup</h3><p>Esporta o importa i progressi in qualsiasi momento, anche senza account.</p><div class="row-buttons"><button class="button small primary" data-action="export">Esporta backup</button><button class="button small secondary" data-action="import">Importa backup</button><button class="button small secondary" data-action="share-backup">Condividi</button><button class="button small danger" data-action="reset">Azzera</button></div></section>
 <section class="paper-panel"><h3>${art('episode')} Archivio episodi</h3><p>Archivio verificato 1–1155; nuove uscite consultabili fino all’episodio ${MAX}. I titoli, le sinossi e le pagine manga riportano la fonte direttamente nella scheda.</p><button class="button small secondary" data-action="catalog-import">Importa metadati (JSON)</button><p class="smallprint">Le puntate 1156 e successive restano fuori dal percorso canonico finché la classificazione non viene documentata.</p></section>
 <section class="paper-panel pwa-install-panel"><h3>${art('map')} Installa su iPhone</h3><ol class="ios-install-steps"><li>Apri Rotta Canonica in <b>Safari</b>, non nel browser interno di un social.</li><li>Tocca <b>Condividi</b> e scegli <b>Aggiungi alla schermata Home</b>.</li><li>Conferma con <b>Aggiungi</b> e apri l’app dalla nuova icona.</li></ol><p>Per l’uso offline, apri una volta l’app con la connessione attiva e attendi il caricamento del catalogo. Il feed delle nuove puntate viene aggiornato quando torni online.</p><p class="smallprint">L’accesso email non trasferisce progressi o preferiti tra dispositivi. Per farlo manualmente usa Esporta/Importa backup.</p></section>
 <section class="paper-panel"><h3>${art('compass')} Fonti e attribuzioni</h3><p>I titoli e le sinossi italiane sono tratti dalle schede della community di One Piece Wiki Italia; le corrispondenze capitolo/pagina sono tratte da Template:WC. Le attribuzioni e le revisioni sono conservate nei metadati delle singole schede.</p><p>I contenuti della community Fandom sono disponibili con licenza <b>CC BY-SA 3.0</b>, salvo diversa indicazione. I titoli Jikan/MyAnimeList sono usati solo come fallback quando manca una scheda italiana.</p><div class="attribution-links"><a href="https://onepiece.fandom.com/it/wiki/Episodi_e_film" target="_blank" rel="noopener noreferrer">One Piece Wiki Italia</a><a href="https://onepiece.fandom.com/wiki/Template:WC" target="_blank" rel="noopener noreferrer">Template:WC</a><a href="https://creativecommons.org/licenses/by-sa/3.0/" target="_blank" rel="noopener noreferrer">Licenza CC BY-SA 3.0</a></div><p class="smallprint">Rotta Canonica è un progetto fan non ufficiale e non è affiliato a Eiichirō Oda, Shueisha, Toei Animation o Fandom.</p></section></div></div>`}
function moreView(){return `<div class="section-shell">${sectionHeader('Tutti i servizi','Ogni sezione della tua avventura, sempre a portata di mano.')}
 <div class="more-menu">${toolTile('journal','Diario di bordo','Note e preferiti','loot')}${toolTile('characters','Personaggi','Enciclopedia senza spoiler','spyglass')}${toolTile('achievements','Ricompense','Traguardi sbloccabili','chest')}${toolTile('filler','Filler','Episodi fuori rotta','flag')}${toolTile('stats','Progressi','Statistiche del viaggio','progress')}${toolTile('settings','Impostazioni','Backup e protezione dati','wheel')}</div></div>`}
function moreStats(){return `<div class="paper-panel extras-quick"><div><h3>Il viaggio continua</h3><p>${extra.favorites.length} episodi preferiti · ${notesSummary().length} note · ${ACHIEVEMENTS.filter(a=>a.test()).length} ricompense.</p></div><div class="row-buttons"><button class="button small secondary" data-tab="journal">Diario</button><button class="button small secondary" data-tab="achievements">Ricompense</button><button class="button small secondary" data-tab="settings">Impostazioni</button></div></div>`}
async function loadCatalog(){try{const r=await fetch('/data/episodes.json',{cache:'no-cache'});if(!r.ok)throw Error('catalog unavailable');const d=await r.json();if(!Array.isArray(d.episodes))throw Error('invalid data');const obj={};for(const e of d.episodes){if(Number.isInteger(e.n)&&e.n>=1&&e.n<=BASE_MAX)obj[e.n]={source:e.source||null,titleSource:e.titleSource||null,summarySource:e.summarySource||null,chapterSource:e.chapterSource||null,editorialSource:e.editorialSource||null,verifiedAt:e.verifiedAt||null,title:typeof e.title==='string'&&e.title.trim()?e.title:null,titleLanguage:e.titleLanguage||null,chapter:typeof e.chapter==='string'?e.chapter:null,chapterDetails:Array.isArray(e.chapterDetails)?e.chapterDetails:[],chapterStatus:e.chapterStatus||null,duration:typeof e.duration==='string'?e.duration:null,summary:typeof e.summary==='string'?e.summary:null,summaryStatus:e.summaryStatus||null,summaryLanguage:e.summaryLanguage||null}}catalog=obj;render()}catch(e){console.warn('Catalog offline: fallback numerico',e)}}
function trackWatched(n,nowWatched){extra.watchEdits[n]={value:!!nowWatched,at:Date.now()};if(nowWatched)extra.watchedAt[n]=new Date().toISOString();else delete extra.watchedAt[n];saveExtra()}
function playAchievement(){const k=ACHIEVEMENTS.filter(a=>a.test()).length;return k}
function toggleFavorite(n){if(extra.favorites.includes(n))extra.favorites=extra.favorites.filter(v=>v!==n);else extra.favorites.push(n);extra.favoriteEdits[n]={value:extra.favorites.includes(n),at:Date.now()};saveExtra();return extra.favorites.includes(n)}
function downloadJSON(obj,name){const b=new Blob([JSON.stringify(obj,null,2)],{type:'application/json'});const u=URL.createObjectURL(b);const a=document.createElement('a');a.href=u;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(u),2000)}
async function handleExtraAction(action,t){const n=Number(t.dataset.ep);
 switch(action){
 case 'character-detail':{const i=Number(t.dataset.character);if(Number.isInteger(i)&&i>=0&&i<CHARACTERS.length)characterDetail(i);return true;}
 case 'character-star':{const id=t.dataset.characterId;if(!id)return true;const selected=toggleCharacterFavorite(id);t.classList.toggle('is-favorite',selected);t.setAttribute('aria-pressed',String(selected));const c=CHARACTERS.find(x=>x.id===id);t.setAttribute('aria-label',`${selected?'Rimuovi':'Aggiungi'} ${c?.name||'personaggio'} ${selected?'dai':'ai'} preferiti`);const opt=document.querySelector('#character-filter option[value=\"favorites\"]');if(opt)opt.textContent=`Preferiti ★ (${extra.characterFavorites.length})`;if(characterFilter==='favorites')applyCharacterFilters();toast(selected?'Personaggio aggiunto ai preferiti':'Personaggio rimosso dai preferiti');return true;}
 case 'go-next':openEpisode(getNext()||start);return true;
 case 'detail':if(Number.isInteger(n)&&n>=1&&(n<=BASE_MAX||!!releaseByNumber(n)))episodeDetail(n);return true;
 case 'detail-watch':if(allCanon.includes(n)){watched.has(n)?watched.delete(n):watched.add(n);trackWatched(n,watched.has(n));save();closeModal();episodeDetail(n);toast('Episodio aggiornato')}return true;
 case 'favorite':{const f=toggleFavorite(n);if(document.querySelector('.modal-layer')){closeModal();episodeDetail(n)}else render();toast(f?'Aggiunto ai preferiti':'Rimosso dai preferiti');return true}
 case 'rate':extra.ratings[n]=Number(t.dataset.score);extra.ratingEdits[n]=Date.now();saveExtra();closeModal();episodeDetail(n);return true;
 case 'note-save':{const val=String(document.getElementById('detail-notes')?.value||'').slice(0,2500);if(val.trim())extra.notes[n]=val;else delete extra.notes[n];extra.noteEdits[n]=Date.now();saveExtra();closeModal();render();toast('Nota salvata');return true}
 case 'episodes-more':episodePage++;render();return true;
 case 'open-latest':{if(extra.spoiler&&weeklyEpisodes.filter(confirmedForRoute)[0]?.number>spoilerHorizon()){toast('Rotta protetta dagli spoiler');return true}episodeFilter='all';episodeSaga='Saga finale';episodeQuery='';episodePage=1;setTab('episodes');return true}
 case 'map-saga':{let first=Number(t.dataset.first);if(extra.spoiler&&first>spoilerHorizon()){toast('Isola ancora protetta dagli spoiler');return true}const group=SAGA_GROUPS.find(g=>g.first===first);const firstCanon=allCanon.find(n=>n>=first&&n<=(group?.last||1155))||first;const arc=arcData.findIndex(a=>a[1]<=firstCanon&&a[2]>=firstCanon);tab='path';openArc=arc>=0?arc:null;search='';render();setTimeout(()=>document.getElementById(`arc-${arc}`)?.scrollIntoView({behavior:motionScrollBehavior(),block:'center'}),50);return true}
 case 'jump-episode':{const raw=document.getElementById('jump-episode')?.value;const n=Number(raw);if(!Number.isInteger(n)||n<1||n>MAX){toast('Inserisci un numero episodio valido');return true}openEpisode(n);return true}
 case 'filter-unwatched':episodeFilter='unwatched';episodePage=1;render();return true;
 case 'jump-current':{const n=getNext();if(!n){toast('Hai completato la rotta');return true}openEpisode(n);return true}
 case 'hide-completed':extra.hideCompleted=!extra.hideCompleted;extra.settingsUpdatedAt=Date.now();saveExtra();render();toast(extra.hideCompleted?'Saghe completate nascoste':'Tutte le saghe visibili');return true;
 case 'spoiler-toggle':extra.spoiler=!extra.spoiler;extra.settingsUpdatedAt=Date.now();saveExtra();render();return true;
 case 'theme-toggle':extra.appearanceStyle=extra.appearanceStyle==='anime'?'ocean':'anime';extra.theme=extra.appearanceStyle==='ocean'?'ocean':'light';extra.settingsUpdatedAt=Date.now();saveExtra();applyTheme();render();return true;
 case 'visual-reset':extra.appearanceStyle='anime';extra.symbolStyle='anime';extra.colorPalette='coral';extra.customAccent='#dc4c34';extra.animationLevel='full';extra.theme='light';extra.settingsUpdatedAt=Date.now();saveExtra();applyTheme();render();toast('Grafica anime ripristinata');return true;
 case 'share-backup':{const backup={app:'Rotta Canonica',version:5,exported:new Date().toISOString(),start,watched:[...watched],extras:extra};const blob=new Blob([JSON.stringify(backup,null,2)],{type:'application/json'});const file=new File([blob],'rotta-canonica-backup.json',{type:'application/json'});try{if(navigator.canShare?.({files:[file]})){await navigator.share({files:[file],title:'Backup Rotta Canonica'});toast('Backup condiviso')}else exportProgress()}catch(e){if(e.name!=='AbortError'){exportProgress();toast('Backup scaricato per condividerlo manualmente')}}return true}
 case 'notification-test':{if(!('Notification' in window)){toast('Notifiche non disponibili nel browser');return true}try{const p=await Notification.requestPermission();if(p==='granted')new Notification('Rotta Canonica',{body:'Le tue avventure ti aspettano!'});else toast('Permesso notifiche non concesso')}catch{toast('Notifiche non disponibili qui')}return true}
 case 'catalog-import':modal('<h3>Importa metadati degli episodi</h3><p>JSON con <code>{"episodes":[{"n":92,"chapter":"130","summary":"Testo originale","source":{"url":"https://fonte.example/...","checkedAt":"2026-11-24"}}]}</code>. Occorre una fonte HTTPS; non modifica la classificazione filler/canonico.</p><input id="catalog-file" type="file" accept=".json,application/json"><div class="modal-buttons"><button class="button secondary" data-action="modal-cancel">Annulla</button><button class="button primary" data-action="catalog-confirm">Importa</button></div>');return true;
 case 'catalog-confirm':{const f=document.getElementById('catalog-file')?.files?.[0];if(!f){toast('Seleziona un file JSON');return true}try{if(f.size>1000000)throw Error('file too large');const d=JSON.parse(await f.text());if(!Array.isArray(d.episodes)||d.episodes.length>1155)throw Error('bad schema');let count=0;for(const ep of d.episodes){if(!Number.isInteger(ep.n)||ep.n<1||ep.n>BASE_MAX)continue;
 if(typeof ep.source?.url!=='string'||!/^https:\/\/[^\s]+$/i.test(ep.source.url)||!/^\d{4}-\d{2}-\d{2}$/.test(ep.source.checkedAt||''))continue;
 const clean={};for(const k of ['title','chapter','duration','summary'])if(typeof ep[k]==='string'&&ep[k].trim())clean[k]=ep[k].slice(0,k==='summary'?650:170);
 if(Object.keys(clean).length){extra.catalogOverride[ep.n]={...clean,source:{url:ep.source.url,checkedAt:ep.source.checkedAt}};count++}}saveExtra();closeModal();render();toast(`${count} schede importate`)}catch{toast('JSON non valido o troppo grande')}return true}
 default:return false;
 }}
function applyTheme(){
 const root=document.documentElement;
 const style=['anime','ocean','night','classic'].includes(extra.appearanceStyle)?extra.appearanceStyle:'anime';
 const symbols=['anime','vintage','vector'].includes(extra.symbolStyle)?extra.symbolStyle:'anime';
 const palette=['coral','sea','gold','violet','custom'].includes(extra.colorPalette)?extra.colorPalette:'coral';
 const motion=['full','soft','off'].includes(extra.animationLevel)?extra.animationLevel:'full';
 const colors={coral:'#d94d34',sea:'#117fa9',gold:'#b98524',violet:'#8355bb',custom:extra.customAccent};
 root.dataset.theme=style==='ocean'||style==='night'?'ocean':'light';
 root.dataset.visualStyle=style;root.dataset.symbolStyle=symbols;root.dataset.colorPalette=palette;root.dataset.animationLevel=motion;
 const hex=/^#[0-9a-fA-F]{6}$/.test(colors[palette])?colors[palette]:'#d94d34';
 root.style.setProperty('--anime-accent',hex);
 const rgb=[1,3,5].map(i=>parseInt(hex.slice(i,i+2),16)/255).map(c=>c<=0.04045?c/12.92:Math.pow((c+0.055)/1.055,2.4));
 const lum=.2126*rgb[0]+.7152*rgb[1]+.0722*rgb[2];
 root.style.setProperty('--anime-accent-ink',lum>0.37?'#2d2018':'#fff8e3');
 root.style.colorScheme=style==='night'?'dark':'light';
}
function checkReminder(){if(!extra.reminderDays||!Object.keys(extra.watchedAt).length)return;const d=Math.max(...Object.values(extra.watchedAt).map(x=>Date.parse(x)).filter(Number.isFinite));if(Date.now()-d>extra.reminderDays*86400000)setTimeout(()=>toast('La tua rotta ti aspetta: scegli il prossimo episodio canonico.'),1800)}

function rewardModal(){modal(`<div class="reward-celebration"><span class="eyebrow">TESORO SCOPERTO!</span><div class="reward-open-art">${art('chest','reward-closed')}${art('loot','reward-open')}</div><h3>Ricompensa sbloccata!</h3><p>Hai raggiunto un nuovo traguardo. Continua il viaggio e scopri tutti i tesori nella sezione Ricompense.</p><div class="modal-buttons"><button class="button primary" data-action="modal-cancel">Continua l’avventura</button><button class="button secondary" data-tab="achievements">Ricompense</button></div></div>`)}

/* v8 · Ricerca istantanea senza ricostruire le card e perdere il focus. */
document.addEventListener('input',e=>{if(e.target?.id==='character-search'){characterQuery=e.target.value;applyCharacterFilters()}});
document.addEventListener('change',e=>{if(e.target?.id==='character-filter'){characterFilter=e.target.value;applyCharacterFilters()}});
