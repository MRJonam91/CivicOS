# Contributing to CivicOS / Contribuire a CivicOS

Grazie per l'interesse a contribuire a CivicOS! / Thank you for your interest in contributing to CivicOS!

## 🇮🇹 Linee guida
1. **DCO (Developer Certificate of Origin)**: firma ogni commit con `git commit -s`. Confermando che il codice è tuo o che hai il diritto di distribuirlo con licenza Apache-2.0.
2. **Architettura snella**: mantieni il core (`src/core/`) modulare e conciso (< 1.500 righe totali).
3. **Zero dipendenze runtime**: CivicOS è progettato per funzionare con runtime Node.js puro senza librerie esterne non essenziali, per facilitare audit di sicurezza e riuso nella PA.
4. **Test**: scrivi test per ogni nuova funzionalità o schema civico con `node:test` (`npm test`).
5. **Accessibilità e Trasparenza**: i modelli dati e le interfacce devono rispettare le linee guida sull'accessibilità (WCAG 2.1 AA) e consentire export trasparente.

## 🇬🇧 Guidelines
1. **DCO (Developer Certificate of Origin)**: sign off every commit with `git commit -s`. This certifies you have the right to submit the code under the Apache-2.0 license.
2. **Lean Architecture**: keep the core engine (`src/core/`) modular and concise (< 1,500 LOC).
3. **Zero runtime dependencies**: CivicOS is intentionally built using clean Node.js standard modules (`node:http`, `node:crypto`) to ensure frictionless PA security audits and sovereign deployments.
4. **Tests**: provide automated test suites for every feature or form schema using `node:test` (`npm test`).
5. **Accessibility & Transparency**: form models and user endpoints must align with WCAG 2.1 AA accessibility standards and support open data export.

## Sviluppo locale / Local Development
```bash
git clone https://github.com/MRJonam91/CivicOS.git
cd CivicOS
npm install
npm test
npm run build
npm start -- --help
```
