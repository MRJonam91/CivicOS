# Changelog

All notable changes to **CivicOS** will be documented in this file.
The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.0] - 2026-11-06

### Added
- **Production Stable Release v1.0.0**: General Availability for public bodies, municipal entities, and civic tech developers.
- **OpenAPI 3.0.3 Specification**: Dynamic specification exposed at `/api/v1/openapi.json` for seamless API discovery, Swagger integration, and PDND (Piattaforma Digitale Nazionale Dati) ingestion.
- **Enhanced Health & Observability Metrics**: Real-time metrics including process uptime, active schema count, and total managed procedures at `GET /health`.
- **European CPSV-AP Standard (Core Public Service Vocabulary Application Profile)**: Full JSON-LD mapping and catalog export (`/api/v1/cpsv-ap` and `/api/v1/schemas/:id/cpsv-ap`) enabling seamless interoperability with EU and AgID public service catalogs.
- **National Holiday & Business Day SLA Engine (`CivicCalendar`)**: Procedural deadline calculator supporting Italian fixed and mobile public holidays (Easter Monday algorithm) and working-day SLA counting (`slaCalculationMode: 'business'`).
- **Cryptographic Attachment Validation**: Whitelist verification for civic document MIME types (PDF, JPEG, XML, P7M digital signatures) and strict SHA-256 fingerprint checks ensuring file integrity.
- **Sliding-Window Rate Limiter**: Zero-dependency defense layer protecting public submission endpoints against automated spam and DoS attempts.
- **HMAC-SHA256 Webhook Signer**: Anti-replay cryptographic signing (`X-Civic-Signature`) for secure interoperability with PA municipal software systems and electronic document registries (Protocollo Informatico).
- **Public Roadmap**: Long-term development and vision documented in [`docs/ROADMAP.md`](docs/ROADMAP.md).

## [0.2.0] - 2026-11-06

### Added
- **Official Italian Fiscal Code Checksum**: Rigorous validation implementing the official D.M. 23/12/1976 algorithm (even/odd character weights and control character verification).
- **Conditional Field Validation (`dependsOn`)**: Support for schema fields that become mandatory depending on the selection of another field (e.g. `iseeValue` when `hasIseeDiscount` is true).
- **Chronological Date Logic Verification**: Inter-field date range checks ensuring event/permit end dates cannot precede start dates.
- **Sovereign Storage Adapters (`src/storage/`)**:
  - `MemoryStorageAdapter`: Fast in-memory backend for transient execution and test suites.
  - `FileStorageAdapter`: Atomic file-based persistence using temporary files and safe atomic renames (crash-resilient without external database dependencies).
- **Official Electronic Protocol Receipt**: Printable and accessible receipt compliant with DPR 445/2000, displaying procedural terms (L. 241/90 SLA), legal declarations, and tamper-evident SHA-256 hash proof (`/receipts/:id` and `/api/v1/applications/:id/receipt`).
- **Electronic Case Dossier & Web Administration**:
  - Full case management interface (`/applications/:id`) with procedural timeline tracking, visual audit verification badge, and interactive status transition tool for PA officers.
  - Search and filter bar in the citizen portal dashboard (`/`) supporting queries across IDs, applicant names, fiscal codes, and application statuses.
- **Attachment Metadata Support**: Built-in support for document attachments with cryptographic SHA-256 fingerprinting.
- **CLI Enhancements**: Added `civicos receipt <id>` command, expanded `list` filters (`--search`), and updated `--version`.

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
