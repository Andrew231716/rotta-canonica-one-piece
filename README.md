# ROTTA CANONICA — VERSIONE 4.1 ANIME

**Progetto completo e pronto per Cursor, GitHub e Vercel.**

Questa versione sostituisce il restyling precedente e integra i nuovi asset grafici in ogni sezione realmente interattiva: home, navigazione principale, schede di saghe e archi, recuperi del live action, lista filler, diario dei progressi, pulsanti, interfacce modali e icone PWA. Non è una semplice tavola grafica o mockup.

## File principali

- `index.html`: punto di ingresso del sito.
- `styles.css`: tema anime piratesco, responsive, animazioni e variante con movimento ridotto.
- `app.js`: guida episodi (1–1155), saghe, ricerca, filtro filler, tracciamento, avanzamento, export/import e interazioni.
- `assets/*.webp`: illustrazioni ottimizzate, background, icone, pergamene, emblemi e sei ribbon saga.
- `icon-192.png`, `icon-512.png`, `icon.svg`: icone e metadati applicazione.
- `manifest.webmanifest`: configurazione installabile PWA.
- `service-worker.js`: cache degli asset per l'uso offline dopo la prima visita.
- `PROMPT_CURSOR.md`: istruzioni complete da incollare in Cursor.

## Esecuzione

Non è richiesto npm o build: progetto statico HTML/CSS/JavaScript.

Avvia un server statico dalla cartella principale, ad esempio `python3 -m http.server 8080`, e apri `http://localhost:8080`.

Non aprire `index.html` come file locale per testare la PWA, perché service worker e URL assoluti richiedono un server HTTP(S).

## Navigazione e stato

L'app conserva il salvataggio `localStorage` con chiave `rotta-canonica-v1`, così i progressi precedenti del medesimo browser/dominio vengono mantenuti. In alternativa: **Progressi → Esporta/Importa** per backup tra dispositivi.

Il catalogo termina all'episodio 1155; non è aggiornato automaticamente e non va pubblicizzato come elenco verificato dell'ultima puntata attuale. Le schede sono una guida di visione, non contenuti video in streaming.

## Animazioni e prestazioni

Movimenti CSS leggeri per onde, timone, badge, forziere, hero zoom. Il media query `prefers-reduced-motion` disattiva gli effetti. Asset locali in WebP; nessun player, niente framework e nessuna dipendenza JavaScript esterna.

## Nota sui diritti

Progetto di fan non ufficiale, non affiliato agli editori o ai produttori di One Piece. Il tema nautico/anime e le illustrazioni non costituiscono licenza d'uso di eventuali marchi o personaggi di terzi. Prima di una distribuzione commerciale, verificare i diritti relativi ai materiali utilizzati.
