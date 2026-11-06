# CivicOS — Piano di Sviluppo & Roadmap

Documento programmatico sull'evoluzione architetturale e funzionale di CivicOS.

---

## 🎯 Obiettivi Raggiunti — Versione 1.0.0 (Stabile)

- [x] **Schemi Dichiarativi PA**: Modelli aperti per istanze civiche (mensa scolastica, occupazione suolo pubblico, manutenzioni urbane).
- [x] **Validatore Deterministico Avanzato**: Algoritmo ufficiale del Codice Fiscale italiano (D.M. 23/12/1976), campi condizionali (`dependsOn`) e controlli di coerenza cronologica.
- [x] **Gestione Procedimento & SLA**: Generazione identificativi univoci `PRAT-YYYYMMDD-XXXX`, transizioni di stato controllate e calcolo scadenze legali (L. 241/90) su giorni solari o lavorativi con festività nazionali italiane.
- [x] **Audit Trail Immutabile SHA-256**: Concatenazione crittografica di ogni evento per garantire verificabilità probatoria e conformità alla trasparenza amministrativa.
- [x] **Notifiche Multi-Canale**: Template per Email/PEC, SMS, Webhook firmati HMAC-SHA256 e simulatore conforme per App IO / SEND (Servizio Notifiche Digitali).
- [x] **Interoperabilità Completa**: Esportazione nativa in JSON, NDJSON, CSV Open Data (D.Lgs. 33/2013) e CPSV-AP europeo (JSON-LD).
- [x] **Specifica OpenAPI 3.0**: Esportazione automatica schema OpenAPI per integrazione con PDND (Piattaforma Digitale Nazionale Dati).
- [x] **Fascicolo Elettronico & Ricevuta Ufficiale**: Ricevuta stampabile D.P.R. 445/2000 e cruscotto web accessibile WCAG 2.1 AA.
- [x] **Storage Sovrano Atomico**: FileStorageAdapter resiliente ai crash con zero database esterni obbligatori.

---

## 🚀 Prossimi Passi — Versione 1.1 (Q1 2027)

- [ ] **SPID / CIE Auth Adapter (SAML / OIDC)**: Modulo opzionale per l'autenticazione federata con identità digitale nazionale italiana ed eIDAS.
- [ ] **Integrazione PagoPA (WISP 2.0 Mock)**: Generazione avviso IUV e modello di pagamento elettronico integrato per le istanze onerose (es. diritti di segreteria o canone suolo pubblico).
- [ ] **Firma Elettronica Qualificata (FEQ / XAdES / PAdES)**: Supporto alla verifica automatica dei certificati di firma digitale apposti sui PDF allegati.

---

## 🌐 Visione a Lungo Termine — Versione 2.0 (2027+)

- [ ] **Rete Federata tra Enti (CivicMesh)**: Scambio inter-comunale sicuro di pratiche e fascicoli tramite crittografia asimmetrica per unioni di comuni e consorzi.
- [ ] **Assistente Civico Accessibile Offline-First**: Supporto PWA completa con sincronizzazione CRDT per territori montani o aree a bassa connettività.
