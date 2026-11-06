# Checklist di Lancio / Launch Checklist — CivicOS v1.0.0

Guida formale per il rilascio in produzione e la diffusione pubblica di CivicOS.

## Checklist di Rilascio

- [x] Licenza Apache-2.0 verificata e file `NOTICE` presente
- [x] File `LICENSING.md` bilingue con matrice di attribuzione e diritti
- [x] Canali di supporto e donazione attivi in `.github/FUNDING.yml` e nei `README`
- [x] Pipeline di Continuous Integration (GitHub Actions) verde per Node.js 22 e 24
- [x] Guardia architetturale core verificata (< 1.500 LOC)
- [x] Suite di test automatizzati completa (28+ test passati al 100%)
- [x] Documentazione bilingue completa (Italiano / English)
- [x] Specifica OpenAPI 3.0 esposta nativamente per interoperabilità PDND / AgID (`/api/v1/openapi.json`)
- [x] Esportazione conforme allo standard europeo CPSV-AP (JSON-LD)
- [x] Generazione ricevuta ufficiale conforme al D.P.R. 445/2000
- [x] Transizione della repository a **Public** su GitHub

## Canali di Promozione Civica & PA

1. **Developers Italia & Forum Italia**:
   - Presentazione del progetto nella sezione *Software Libero e Riuso nella Pubblica Amministrazione* (artt. 68-69 CAD).
   - Dimostrazione del modulo per servizi pubblici e calcolo SLA L. 241/90.

2. **Open Data Community**:
   - Condivisione con community civic tech (Open Data Sicilia, Spaghetti Open Data, onData).
   - Export interoperabile conforme alle linee guida nazionali.

3. **Reti Professionali & Social**:
   - Annuncio formale con demo CLI, screenshot del fascicolo elettronico e documentazione.
   - Tagline: *CivicOS v1.0.0 — Standalone civic forms, procedural SLA tracking and notifications engine for public bodies.*
