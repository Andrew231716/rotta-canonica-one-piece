# Rotta Canonica v9 – Nuova Rotta

Aggiornamento della v8.1 con guida ai nuovi episodi condizionata a revisione editoriale, ricerca per capitolo, link alle fonti e migliorie di accessibilità. Grafica anime conservata, con due nuovi ritratti fan-made di Ace e Law.

**Sicurezza dati:** localStorage `rotta-canonica-v1` e `rotta-canonica-extra-v1` invariati, i progressi utente non vengono cancellati. Le nuove puntate non ancora verificate non contano come canoniche.

**Verifica:** `node --check app.js`, `node --check features.js`, `node --check cloud.js`; `python3 tests/test_browser.py` e `python3 tests/test_audit_fixes.py` in un ambiente dotato di Playwright. Vedi `IMPROVEMENTS-v9.md`.

**Cloud:** account gratuito con email e password (API `/api/auth/register` + Supabase Auth), sync progressi e push opzionale. Local-first anche senza backend.

## v10: Schede immersive
Scene illustrate a tutta card in Personaggi (`/assets/character-scenes/`). Vedi `UPGRADE-v10.md`. Chiavi localStorage invariate.


## Catalogo e PWA v19

- Archivio principale 1–1155: titoli e sinossi italiani con attribuzione per singola scheda; capitoli e pagine adattate da Template:WC. Le nuove uscite sono mantenute nel feed separato (1156+), senza promuovere automaticamente gli episodi non classificati.
- I contenuti della community One Piece Wiki Italia / Fandom e le traduzioni delle schede inglesi per le nuove uscite sono attribuiti alle rispettive revisioni e restano soggetti a CC BY-SA 3.0 salvo diversa indicazione. Consulta `DATA_ATTRIBUTION.md`.
- Il service worker usa cache network-first per HTML/CSS/JS/JSON e mantiene offline sia `episodes.json` sia `episodes-latest.json`.
- Su iPhone: aprire il sito in Safari → Condividi → Aggiungi alla schermata Home. Per l'offline, caricare l'app una prima volta con rete.

## Grafica anime illustrata e personalizzazione (v21)

**Percorso:** in app apri **Altro → Impostazioni → Personalizza l'avventura**.

- **Stile grafico:** Anime avventura (predefinito), Oceano celeste, Notte dei pirati oppure Pergamena classica.
- **Simboli:** 20 icone originali anime dettagliate, stemmi nautici vintage o simboli vettoriali essenziali.
- **Colori:** Rosso avventura, Blu mare, Oro del tesoro, Viola misterioso, oppure un colore esadecimale selezionato manualmente.
- **Animazioni:** Complete, Delicate o Disattivate. La preferenza di accessibilità del dispositivo per movimento ridotto prevale sulle animazioni.
- **Ripristino:** il pulsante «Ripristina la grafica anime» reimposta stile, simboli, colori e movimenti.

Le preferenze visive sono salvate **solo nel browser locale** insieme alle altre impostazioni del viaggio. Nessuna modifica alla registrazione email via Supabase, ai progressi degli episodi o al monitoraggio delle nuove uscite. Gli asset sono immagini ottimizzate e le icone decorative hanno sfondi trasparenti. La PWA usa la cache `rotta-canonica-v21-anime-customizer`.

## Audit catalogo 25 novembre 2026
Una verifica semantica ha individuato titoli errati ("Navigazione", "Curiosità" e intestazioni di pagina) precedentemente introdotti dall'importatore wiki. L'importatore ora legge solo campi titolo espliciti, il catalogo viene sanificato prima di ogni aggiornamento e il validatore respinge i titoli editoriali generici.
I titoli mancanti vengono visualizzati onestamente come "Episodio N", non come titoli inventati. Le schede mantengono sinossi, capitoli e attribuzioni delle fonti.
La Quality Gate controlla anche una soglia minima di copertura reale: almeno 900 titoli sui 1155 episodi dell'archivio base.

### Verifica applicativa 25 novembre 2026
- Browser Chromium isolato: 11 sezioni x 4 viewport (320, 390, 768 e 1280 px), nessun errore JS o overflow orizzontale.
- Impostazioni: cambio e ripristino di tema/simboli/palette/movimento controllati; persistenza locale verificata.
- Scheda episodio: fonti e pagine manga rese visibili, dialogo chiudibile con Escape.
- Catalogo: titoli errati come «Navigazione» sanificati; 951 titoli italiani con fonte e 204 episodi con etichetta numerica di fallback. Non attribuire titoli inesistenti.
- Verifiche non ancora eseguibili nell'ambiente di test: login/recovery Supabase con casella email reale, web push su iPhone fisico e Safari iOS.
