# Rotta Canonica · Personaggi Illustrati v7 (da Cloud Ready v6)

Web app/PWA **fan-made** in italiano per organizzare gli episodi di One Piece. Mantiene la grafica anime piratesca e tutte le funzioni local-first della v5: percorso senza filler, guida 1–1155, saghe, recuperi Netflix, diario, note, ricompense, preferiti, mappa e backup.

## Novità v7 · Personaggi veri della ciurma

La sezione **Personaggi** mostra finalmente ritratti fan-made riconoscibili di **Monkey D. Luffy, Roronoa Zoro, Nami, Usopp, Sanji, Tony Tony Chopper, Nico Robin, Franky, Brook e Jinbe**. I 10 ritratti WebP sono inclusi localmente in `assets/characters/` (nessun hotlink a immagini esterne). Ogni carta può aprire una scheda con ritratto ingrandito, ruolo, presentazione e riferimento all'episodio; le identità future rimangono coperte dalla modalità antispoiler e si sbloccano in funzione del tuo avanzamento.

I ritratti derivano da illustrazioni fan-made create per il progetto, **non** sono asset grafici ufficiali e non implicano licenze o affiliazione con gli aventi diritto. La pubblicazione pubblica e l'eventuale uso commerciale richiedono una valutazione dei diritti sulle immagini e sui personaggi.

Per installare questa versione usa i file dello ZIP sulla branch esistente: `features.js`, `features.css`, `service-worker.js`, `assets/characters/*` e gli altri file sono già compatibili. La chiave dei progressi `rotta-canonica-v1` e quella delle preferenze `rotta-canonica-extra-v1` non sono modificate. Lo ZIP include l'intero progetto, non soltanto una patch.

## Stato reale delle nuove funzionalità

| Funzionalità | Stato del codice | Per attivarla online |
|---|---|---|
| Accesso Google | Interfaccia e flusso OAuth PKCE integrati | Nuovo progetto Supabase e provider Google autorizzato |
| Accesso Apple | Interfaccia e flusso OAuth PKCE integrati | Supabase Auth e credenziali Apple Developer Service ID |
| Sincronizzazione iPhone/Android/PC | Merge conservativo di visti, note, preferiti e impostazioni; RLS | Applicare migration SQL + URL e chiave pubblica |
| Push quando PWA è chiusa | API Vercel, VAPID, service worker, consenso esplicito, cron settimanale | Database dedicato + segreti VAPID / Vercel / cron, PWA installata quando richiesto dal dispositivo |
| Titoli episodi 1–1155 | Importatore di titoli da Jikan/MyAnimeList con origine documentata | GitHub Actions abilitata, controlli sui dati di fonte terza |
| Capitoli manga e sinossi | Import editoriale validato con URL della fonte e data | Completamento da fonti affidabili e revisione manuale; **non** sono inventati |
| Nuove puntate oltre 1155 | Importatore settimanale indipendente, stato "da verificare" | GitHub Actions pubblica `episodes-latest.json`; non assume un episodio a settimana |

**Importante:** le due istanze Supabase visualizzate nell'account collegato sono inattive e appartengono ad altri progetti. Questa distribuzione non le modifica né crea automaticamente una terza istanza. Senza un backend dedicato, i pulsanti account/cloud sono disabilitati e l'app continua a funzionare localmente.

## Configurazione di un progetto Supabase dedicato

1. Crea un **nuovo** progetto Supabase chiamato, ad esempio, `Rotta Canonica`, nell'organizzazione scelta da te. Il servizio potrebbe avere costi o limiti di progetto.
2. Applica una sola volta `supabase/migrations/202611230001_rotta_sync_push.sql` nel SQL Editor. Le policies RLS limitano lettura/scrittura dei progressi al solo `auth.uid()`; le iscrizioni push non sono accessibili ai client.
3. Configura **Auth → Providers → Google**, ottenendo il client OAuth da Google Cloud. Aggiungi callback Supabase a Google e il dominio dell'app agli URL autorizzati in Supabase.
4. Per **Apple**, configura Apple Developer: Service ID, Team ID, Key ID, private key e URL di ritorno secondo le istruzioni correnti del provider Supabase. Apple potrebbe richiedere un account sviluppatore a pagamento.
5. Imposta in Vercel le variabili d'ambiente sotto. Le chiavi segrete non vanno in GitHub né nel browser.

### Environment variables su Vercel

```env
SUPABASE_URL=https://YOUR_PROJECT_REF.supabase.co
SUPABASE_PUBLISHABLE_KEY=sb_publishable_YOUR_PUBLIC_KEY
SUPABASE_SECRET_KEY=YOUR_SERVER_ONLY_SERVICE_ROLE_OR_SECRET_KEY
PUBLIC_SITE_URL=https://rotta-canonica-one-piece.vercel.app
VAPID_PUBLIC_KEY=PUBLIC_GENERATED_KEY
VAPID_PRIVATE_KEY=PRIVATE_GENERATED_KEY
VAPID_SUBJECT=mailto:YOUR_CONTACT_EMAIL@example.com
CRON_SECRET=LONG_RANDOM_STRING
```

`SUPABASE_SECRET_KEY` può essere una chiave Supabase secret/server o legacy `service_role`; deve restare **solo** in Vercel. Genera le chiavi VAPID eseguendo **in locale** `node scripts/generate-vapid.mjs` e trasferiscile direttamente alle variabili d'ambiente del progetto. Il file `api/public-config.js` espone al browser **solo** URL, chiave pubblica e VAPID public key. Non pubblicare mai i valori privati, i segreti OAuth, `CRON_SECRET` né il database con i dati personali.

Dopo il primo login Google/Apple, l'app unisce progressi e preferiti esistenti senza azzerare le chiavi locali `rotta-canonica-v1` e `rotta-canonica-extra-v1`. Le modifiche successive vengono sincronizzate; quando due dispositivi modificano lo stesso episodio, prevale la modifica con timestamp più recente. Per sicurezza, esporta un backup prima della prima connessione.

## Notifiche push

- Attivazione/disattivazione solo su richiesta dell'utente (Impostazioni → Account); il browser richiede consenso.
- PWA in contesto HTTPS; su iOS è generalmente necessario installarla nella schermata Home e usarla come web app.
- Le sottoscrizioni sono legate all'utente autenticato e salvate nel database dedicato via endpoint `api/push/subscription.js` con controllo della sessione.
- Cron Vercel (`/api/push/check`) controlla il catalogo di **episodi pubblicati**, non le anticipazioni, il lunedì alle 10 UTC. Il controllo è protetto da `CRON_SECRET` e non è aperto al pubblico.
- Le notifiche contengono un testo generico e non mostrano spoiler o note personali. I dispositivi senza supporto Push mantengono i promemoria locali all'apertura dell'app.
- Il servizio cron non può funzionare senza le variabili d'ambiente e il database attivi.

## Catalogo editoriale

- `data/episodes.json`: 1155 record, classificazione basata sulla guida precedente (non ancora revisionata integralmente). Alcuni metadata sono `null` per evitare invenzioni.
- `scripts/enrich-episodes.mjs`: usa Jikan API (MyAnimeList, fonte della community) per importare **titoli** e registrare fonte/data. Eseguito da `.github/workflows/enrich-episode-titles.yml` ogni lunedì. I titoli della fonte possono essere in inglese e non sono una traduzione ufficiale italiana.
- `data/reviewed-episodes.json` e `scripts/merge-reviewed.mjs`: aggiungono **solo** capitoli manga, sinossi e durata sottoposti a verifica editoriale. Ogni riga deve avere `source.url` HTTPS e `source.checkedAt` ISO. Le descrizioni non devono essere copiate integralmente da fonti protette: usa brevi sinossi originali basate su fatti confermati.
- `.github/workflows/update-episodes.yml` rileva gli episodi *già trasmessi* oltre 1155, senza inferire classificazioni manga dal campo `filler` dell'API. Il feed appare nella home, separato dal percorso canonico.
- Se Jikan non risponde o la paginazione è anomala, gli script falliscono senza aggiungere dati inventati.

Esempio per aggiungere un capitolo verificato in `data/reviewed-episodes.json` (i valori qui sotto sono segnaposto, non dati effettivi):

```json
{
  "schemaVersion": 1,
  "episodes": [
    {
      "n": 92,
      "chapter": "INSERIRE CAPITOLO VERIFICATO",
      "summary": "INSERIRE SINOSSI ORIGINALE BREVE E VERIFICATA",
      "source": {
        "url": "https://URL_DELLA_FONTE_AUTOREVOLE",
        "checkedAt": "2026-11-23"
      }
    }
  ]
}
```

## Test e limiti

Eseguire `python3 tests/test_browser.py` e `node tests/test_api.cjs`, oppure riprodurli con Playwright nel progetto. Sono stati verificati markup, progressi, merge, risoluzione mobile e autorizzazioni API in ambiente locale; **non è stato possibile testare OAuth, push reali o RLS su un progetto Supabase attivo**, perché manca un progetto dedicato configurato.

Per utilizzare l'app senza backend avvia un server statico nella directory: `python3 -m http.server 8080`. Per testare le API Vercel e la cron, esegui un deployment Vercel con variabili d'ambiente e verifica gli endpoint HTTPS di produzione.

Fan project indipendente, non ufficiale, senza affiliazione agli autori o ai detentori di One Piece.
