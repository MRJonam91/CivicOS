# Changelog

All notable changes to **CivicOS** will be documented in this file.
The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.1.0] - 2026-11-06

### Added
- **Declarative Form Engine**: JSON/TypeScript schema models with field-level validation (types, regex, required rules, constraints).
- **Public Service Registry**: Out-of-the-box catalog of standard public services (school meal enrolment, public space occupation, municipal road maintenance).
- **Citizen Application Lifecycle Engine**: Unique procedural tracking ID (`PRAT-YYYYMMDD-XXXX`), state machine transitions (`SUBMITTED`, `IN_REVIEW`, `INTEGRATION_REQUESTED`, `APPROVED`, `REJECTED`, `CLOSED`), and procedural SLA calculations.
- **Tamper-Evident Audit Chain**: Immutable SHA-256 hash chaining of every status transition and event for public transparency and administrative accountability.
- **Multi-Channel Notification Dispatcher**: Templated dispatch to email, SMS, webhooks, and App IO mock with full delivery log inspection.
- **Interoperability & Open Data Export**: Zero-dependency export to JSON, NDJSON, and tabular CSV format.
- **Embedded HTTP REST Server & Web Portal**: Native Node.js web server serving interactive accessible citizen submission forms, officer dashboard, and JSON REST API.
- **CLI Utility**: Command-line interface `civicos` for local inspection, submission, transitions, and batch export.
- **Community Standards**: Apache-2.0 license, NOTICE, bilingual documentation (IT/EN), CI workflow with < 1500 LOC core guard, and funding channels.
