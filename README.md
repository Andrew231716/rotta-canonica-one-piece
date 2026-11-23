# Rotta Canonica – Edizione Illustrata e Animata

Questa è l'app web completa con i file pronti per Cursor, GitHub e Vercel. Funziona come sito statico e PWA senza dipendenze npm, senza autenticazione e con i progressi salvati in localStorage.

## Elementi grafici
- `assets/capitano-elio.svg`: capitano originale, cappello di paglia con fascia turchese, capelli argento, giacca blu e cannocchiale. Non riproduce un personaggio del manga.
- `assets/stella-salmastra.svg`: paesaggio e nave originali.
- `assets/bandiera.svg`: vessillo con simbolo nautico originale.
- `assets/pergamena.webp`, `assets/cornice-nautica.webp`, `assets/emblema-nautico.webp`: ulteriori immagini decorative del pacchetto.
- `styles.css`: tema nautico anime con font display *Pirata One* (Google Fonts) e fallback Georgia. Non si utilizzano caratteri ufficiali di One Piece.

## Animazioni
- Capitano che ondeggia, bandiera che vibra, onde che scorrono, piccole stelle luminose, transizioni dei controlli.
- Attivazione CSS con `prefers-reduced-motion` per ridurre il movimento.
- Offline: l'app funziona dopo primo caricamento; i font Google richiedono rete e passano al fallback se offline.

## Avvio e pubblicazione
Avvio locale: `python3 -m http.server 8000` nella cartella progetto; apri `http://localhost:8000`.
GitHub: crea un nuovo repository e carica il contenuto della cartella senza annidarlo.
Vercel: importa repository; Framework Preset: **Other**; nessuna build; Output Directory: `.`. Deploy.
Su iOS: Safari > Condividi > Aggiungi alla schermata Home.

## Dataset
Il dataset iniziale si ferma all'episodio 1155, non verificato come ultimo attuale. Ricontrolla classificazione e numeri prima di aggiornare. Sezioni disponibili: percorso, recuperi del live action, filler, progressi/backup JSON. Non sincronizza su dispositivi diversi.

## Avviso marchi e opere
Progetto fan indipendente, non ufficiale, non affiliato ai titolari di One Piece. Titoli/nomi della serie sono usati a scopo descrittivo. Le illustrazioni `capitano-elio.svg`, `stella-salmastra.svg`, `bandiera.svg` e il tema della UI sono creazioni originali, non copie di personaggi o loghi di terzi. Evita di aggiungere screenshot, logo ufficiale o disegni molto simili a personaggi e simboli protetti senza una licenza.
