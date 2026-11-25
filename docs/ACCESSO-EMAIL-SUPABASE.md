# Rotta Canonica — Accesso email con Supabase (senza sincronizzazione)

## Funzioni
- Registrazione email e password, verifica indirizzo tramite email, accesso, logout.
- Reinvio verifica, recupero password e aggiornamento password.
- Sessione persistente sul singolo dispositivo.
- Nessuna lettura/scrittura della tabella rotta_user_state e nessuna fusione dei progressi.
- Episodi visti, preferiti e note rimangono nella memoria locale; per il trasferimento manuale usare Esporta/Importa.
- Nessun accesso Google/Apple.

## Attivazione
1. Creare un progetto Supabase dedicato (non riutilizzare AutoHub o Palma 2026). Occorrono scelta dell'organizzazione e autorizzazione agli eventuali costi.
2. Authentication > Sign In / Providers > Email: abilitare email/password, registrazioni e Confirm email.
3. Authentication > URL Configuration: Site URL https://rotta-canonica-one-piece.vercel.app e Redirect URL https://rotta-canonica-one-piece.vercel.app/**.
4. In Vercel impostare SUPABASE_URL e SUPABASE_PUBLISHABLE_KEY. Non esporre secret/service-role.
5. Deploy e collaudo reale: registrazione → conferma email → login → riapertura → uscita → recupero password.
6. Verificare che cambiando account i dati locali non cambino.

L'accesso non richiede tabelle SQL o migrazioni. Le precedenti funzioni server per sincronizzazione e push non sono necessarie al solo login.