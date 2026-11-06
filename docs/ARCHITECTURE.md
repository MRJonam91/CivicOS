# Architettura / Architecture — CivicOS

```
                                  ┌───────────────────────────────┐
                                  │       Citizen / Officer       │
                                  │   (Web Portal / Mobile / CLI) │
                                  └──────────────┬────────────────┘
                                                 │ Submit / Update Request
                                                 ▼
┌────────────────────────────────────────────────────────────────────────────────┐
│                             CivicOS Core Engine                                │
│                                                                                │
│  1. Schema Registry & Field Validator:                                         │
│     ├── Types (text, fiscal_code, email, phone, date, number, select)          │
│     └── Constraints (required, min/max, pattern, lengths, allowed options)     │
│                                                                                │
│  2. Citizen Application Lifecycle Manager:                                     │
│     ├── Unique Procedural ID (PRAT-YYYYMMDD-XXXX)                              │
│     ├── SLA Due Date Tracking (L. 241/90 procedural deadline)                  │
│     └── Deterministic State Machine Transitions:                               │
│         SUBMITTED ──► IN_REVIEW ──► INTEGRATION_REQUESTED ──► IN_REVIEW         │
│                           │                                                    │
│                           ├──► APPROVED ──► CLOSED                             │
│                           └──► REJECTED ──► CLOSED                             │
│                                                                                │
│  3. Tamper-Evident Audit Chain:                                                │
│     hash = SHA256(seq | timestamp | action | actor | prevHash | sortedDetails) │
│                                                                                │
│  4. Multi-Channel Notification Dispatcher:                                     │
│     ├── Email / PEC Receipt                                                    │
│     ├── SMS Digest Alert                                                       │
│     ├── App IO / SEND (Servizio Notifiche Digitali) Mock                       │
│     └── Interoperable Webhook (Protocollo Informatico PA)                      │
│                                                                                │
│  5. Interoperability & Open Data Export:                                       │
│     JSON (full dossier) │ NDJSON (streaming data lake) │ CSV (open data)       │
└────────────────────────────────────────────────────────────────────────────────┘
```

## 🇮🇹 Concetti Fondamentali

1. **Schema Registry & Validatore Dichiarativo (`src/core/schemas.ts`, `src/core/validator.ts`)**:
   - Definisce i modelli di servizio pubblico (refezione scolastica, occupazione suolo pubblico, segnalazioni guasti urbani).
   - Validazione accessibile, rigorosa e deterministica dei dati immessi dal cittadino.
   - Supporto nativo ai campi specifici della PA (es. Codice Fiscale conforme all'Agenzia delle Entrate, date ISO, numeri limitati a massimali).

2. **Gestione del Procedimento Amministrativo (`src/core/lifecycle.ts`)**:
   - Assegnazione protocollo identificativo univoco (`PRAT-YYYYMMDD-XXXX`).
   - Calcolo automatico dei termini di conclusione del procedimento amministrativo (ex Legge 241/90 e CAD).
   - Transizioni di stato controllate con storico tracciabile di ogni annotazione istruttoria.

3. **Catena Crittografica di Audit (`src/core/audit.ts`)**:
   - Ogni invio, transizione o notifica genera una voce crittograficamente concatenata in SHA-256 (`previousHash`).
   - La funzione `AuditChain.verifyChain()` garantisce l'assoluta integrità dei procedimenti contro manomissioni o cancellazioni indebite.

4. **Dispatcher di Notifiche Interoperabile (`src/core/notifications.ts`)**:
   - Notifica automatica al cittadino via email, SMS, App IO / SEND mock e Webhook per integrazione con gestionali di protocollo.

5. **Esportazione e Open Data (`src/core/export.ts`)**:
   - Permette agli enti di estrarre flussi in JSON, NDJSON per archiviazione documentale a norma e CSV tabellare per Open Data (es. D.Lgs. 33/2013).

---

## 🇬🇧 Architectural Overview

1. **Declarative Schema Registry & Validation**:
   - Standardized citizen services (school meals, public space occupation permits, road maintenance requests).
   - Deterministic and field-level validation with domain-specific rules (Italian Fiscal Code regex, dates, select ranges).

2. **Application Lifecycle & SLA Management**:
   - Procedural ID generation (`PRAT-YYYYMMDD-XXXX`).
   - Administrative SLA deadline tracking according to civic regulations (L. 241/90).
   - Deterministic state machine protecting procedural integrity.

3. **Tamper-Evident Audit Logging**:
   - Cryptographic SHA-256 chaining for every procedural milestone, ensuring verifiable transparency.

4. **Multi-Channel Notification Dispatcher**:
   - Extensible handlers for Email, SMS, Webhook and App IO / SEND (Italian Digital Notification Service) integration.

5. **Interoperability & Open Data**:
   - Zero-dependency export to JSON, NDJSON, and Open Data CSV formats.
