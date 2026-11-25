# Rotta Canonica — Attivazione cloud, OAuth e notifiche

**Il codice del frontend è predisposto, ma NON equivale a un backend attivo.**
L'app funziona offline e conserva il progresso locale anche senza account.

## 1. Progetto Supabase dedicato
Creare un nuovo progetto Supabase nella organizzazione scelta dall'utente. Non riutilizzare i database AutoHub o Palma 2026.
Nel SQL Editor applicare la migrazione:
`supabase/migrations/202611230001_rotta_sync_push.sql`.
Verificare che RLS sia abilitato: ogni utente può leggere e scrivere solo la propria riga `rotta_user_state`; le sottoscrizioni push non sono esposte al client.

## 2. Registrazione email
Nel pannello **Authentication → Providers → Email**, mantenere attiva **Confirm email** e configurare un servizio di invio email appropriato.
L'endpoint pubblico /api/auth/register è disabilitato (HTTP 410): nessuna API pubblica può usare una chiave amministratore per confermare automaticamente indirizzi email.
L'app chiama `supabase.auth.signUp` e avvisa di confermare il link email.

## 3. Google e Apple
Configurare i rispettivi provider nella dashboard Supabase, con client ID, client secret, origin e callback autorizzati.
Inserire l'URL di ritorno `https://rotta-canonica-one-piece.vercel.app/` nella redirect allow list.
Le opzioni Google/Apple appaiono solo se il backend funziona e le rispettive variabili sono `true`:
`OAUTH_GOOGLE_ENABLED` e `OAUTH_APPLE_ENABLED`.
Non impostare `true` prima di collaudare il login.

## 4. Variabili Vercel
Aggiungere in Vercel (mai in Git):
`SUPABASE_URL` e `SUPABASE_PUBLISHABLE_KEY` per il client;
`SUPABASE_SECRET_KEY` solo per le funzioni server;
`VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_SUBJECT` e `CRON_SECRET` per le notifiche.
Non esporre mai una secret/service-role key nel JavaScript client.

## 5. Notifiche e iPhone
Su iPhone Web Push richiede la PWA aggiunta alla schermata Home, la versione iOS compatibile e il consenso esplicito alle notifiche.
Verificare su dispositivo reale: registrazione push, consegna, disattivazione e riattivazione senza duplicare la sottoscrizione.

## 6. Offline e VoiceOver
Il service worker v17 salva come requisito iniziale soltanto i file essenziali e tratta gli altri asset come opzionali.
In seguito a una prima visita online, aprire l'app in modalità aereo e verificare Home, Episodi, Personaggi, Diario, backup e ritorno online.
Con VoiceOver controllare ordine di lettura, etichette dei pulsanti, stato dei preferiti e ritorno del focus dopo i dialoghi.

## 7. Catalogo verificato
L'importazione dei titoli da una fonte terza viene eseguita il lunedì dal workflow GitHub.
Non scrive più il JSON se non trova dati nuovi. I capitoli manga e le sinossi devono essere verificati da un revisore e salvati in `data/reviewed-episodes.json` con fonte URL e data.
Non presumere canoniche le nuove uscite senza classificazione documentata.

## Stato effettivo
- Account, OAuth e push: codice preparato, provider non ancora attivati.
- Data ingest: previsto da workflow, titoli e trame NON garantiti finché non vengono verificati.
- Test CI: controllo statico di sicurezza e PWA; non sostituisce un test VoiceOver su hardware Apple.
