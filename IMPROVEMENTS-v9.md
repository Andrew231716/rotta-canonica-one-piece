# Rotta Canonica v9 – Nuova Rotta

## Novità implementate
- **Nuove puntate nella guida**: tutte le uscite effettivamente presenti nel feed (oltre la base 1155) compaiono in `Guida episodi → Tutti / Uscite da verificare`. Solo voci con `classification` canon/mixed/filler E `classificationReview.url` (HTTPS) E `classificationReview.checkedAt` entrano nel percorso senza filler o nell'elenco filler. Senza classificazione verificata il bottone "Segna visto" è disabilitato, così i progressi canonici non vengono falsati.
- **Nuova tappa in Mappa**: se ci sono puntate con classificazione documentata dopo l’episodio 1155, compare una nuova tappa collegata alla Guida. Non vengono inventati nomi di isole o eventi.
- **Aggiornamento del contatore**, prossima puntata e progressi solo per classificazioni documentate. Non inferisce episodi intermedi non riportati dal feed.
- **Ricerca per capitolo** quando disponibile, link a fonte editoriale per capitoli/sinossi. I campi mancanti restano vuoti.
- **Validazione automatica cataloghi**: lo script `scripts/validate-data.mjs` viene eseguito da entrambe le GitHub Actions prima del commit; rifiuta classificazioni prive di fonte, duplicati ed episodi con date future.
- **Import metadati locale con fonte obbligatoria**, senza trasformare in verificato un JSON arbitrario privo di citazione.
- **Enciclopedia ampliata**: ai dieci ritratti della ciurma si aggiungono Ace e Law con due illustrazioni ricavate dalle tavole grafiche fan-made già create per il progetto. Filtri Ciurma / Altri incontri e sblocco spoiler prudente.
- **Accessibilità**: salto al contenuto, dialog con focus iniziale, Tab intrappolato nel dialog, Escape e ritorno del focus, modali scorrevoli anche su iPhone, riduzione animazioni.
- **Cloud/backup**: conserva ID futuri fino a 3000 senza trasformarli in episodi canonici durante merge. Account email/password gratuito (niente OAuth); push richiede VAPID sul backend già collegato.

## Revisione editoriale delle uscite
Compilare manualmente in `data/episodes-latest.json` o nel workflow dedicato, esclusivamente dopo verifica documentata:

```json
{
 "number":1156,
 "title":"Titolo riportato dalla fonte",
 "aired":"2026-12-01",
 "classification":"mixed",
 "classificationReview":{
  "url":"https://fonte-affidabile.example/pagina-episodio",
  "checkedAt":"2026-12-02"
 }
}
```

**I valori sono esempi fittizi e non devono essere copiati come episodi realmente usciti.** Il workflow Jikan rileva soltanto uscite e conserva una revisione già esistente; non decide la canonicità.

## Limiti dichiarati
- Nessuna verifica online delle nuove puntate in questo ambiente: il feed di produzione resta quello fornito dal progetto.
- Titoli, capitoli e sinossi del catalogo 1–1155 non sono stati completati perché senza fonti consultabili non sarebbe attendibile inventarli. È presente lo script `scripts/enrich-episodes.mjs` da eseguire su GitHub Actions in un ambiente autorizzato.
- Non è stato configurato alcun progetto Supabase: accessi Google/Apple e notifiche push ancora non operativi.
- La revisione finale su Safari reale, compatibilità VoiceOver e colori/contrasto richiede un dispositivo.

## Pubblicazione
Inviare l'intera cartella/ZIP a Cursor, integrare in `Andrew231716/rotta-canonica-one-piece`, eseguire test in `tests/`, pubblicare il repository esistente, verificare il deployment Vercel. Non sovrascrivere la memoria locale degli utenti, non ruotare credenziali, non pubblicare segreti.
