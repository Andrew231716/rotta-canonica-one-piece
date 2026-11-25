# Rotta Canonica v9 – Nuova Rotta

Aggiornamento della v8.1 con guida ai nuovi episodi condizionata a revisione editoriale, ricerca per capitolo, link alle fonti e migliorie di accessibilità. Grafica anime conservata, con due nuovi ritratti fan-made di Ace e Law.

**Sicurezza dati:** localStorage `rotta-canonica-v1` e `rotta-canonica-extra-v1` invariati, i progressi utente non vengono cancellati. Le nuove puntate non ancora verificate non contano come canoniche.

**Verifica:** `node --check app.js`, `node --check features.js`, `node --check cloud.js`; `python3 tests/test_browser.py` e `python3 tests/test_audit_fixes.py` in un ambiente dotato di Playwright. Vedi `IMPROVEMENTS-v9.md`.

**Cloud:** account gratuito con email e password (API `/api/auth/register` + Supabase Auth), sync progressi e push opzionale. Local-first anche senza backend.

## v10: Schede immersive
Scene illustrate a tutta card in Personaggi (`/assets/character-scenes/`). Vedi `UPGRADE-v10.md`. Chiavi localStorage invariate.


## Catalogo e PWA v19

- Archivio principale 1–1155: titoli e sinossi italiani con attribuzione per singola scheda; capitoli e pagine adattate da Template:WC. Le nuove uscite sono mantenute nel feed separato (1156+), senza promuovere automaticamente gli episodi non classificati.
- I contenuti della community One Piece Wiki Italia / Fandom sono attribuiti alle rispettive revisioni e restano soggetti a CC BY-SA 3.0 salvo diversa indicazione. Consulta `DATA_ATTRIBUTION.md`.
- Il service worker usa cache network-first per HTML/CSS/JS/JSON e mantiene offline sia `episodes.json` sia `episodes-latest.json`.
- Su iPhone: aprire il sito in Safari → Condividi → Aggiungi alla schermata Home. Per l'offline, caricare l'app una prima volta con rete.
