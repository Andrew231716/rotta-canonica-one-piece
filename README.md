# Rotta Canonica — One Piece Tracker

PWA indipendente, mobile-first e senza account: percorso canonico di One Piece, episodi filler da saltare, recuperi dopo le prime due stagioni live action Netflix, avanzamento individuale per episodio, backup locale JSON e funzionamento offline.

## Avvio

È un sito statico, senza build e senza dipendenze JavaScript:

```bash
python3 -m http.server 8000
```

Apri http://localhost:8000. Per installarla su iPhone, pubblica su HTTPS e in Safari usa **Condividi → Aggiungi alla schermata Home**.

## Pubblicazione

Progetto statico su Vercel (Framework: Other; nessun comando di build). Configurazione in `vercel.json`.

## Dati e limiti

Il dataset iniziale arriva all'episodio 1155. **Non è l'ultimo episodio corrente verificato**, e non esiste una sincronizzazione automatica con le nuove pubblicazioni. L'elenco degli episodi da saltare segue una classificazione di riferimento ricostruita, non è una verifica live scena per scena. Gli episodi misti canonico/filler sono mantenuti. Aggiorna `arcData`, `fillerData` e `MAX` in `app.js` dopo verifica di nuove uscite.

Salvataggio tramite `localStorage`. Nessun server, accesso, API, analytics o tracciamento; non sincronizza i dati tra dispositivi. Esporta/importa JSON da Statistiche.

Progetto non ufficiale e non affiliato a One Piece, Eiichiro Oda, Toei, Shueisha o Netflix. Nessuna immagine o risorsa di terzi inclusa.
