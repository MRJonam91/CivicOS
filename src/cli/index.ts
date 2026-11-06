#!/usr/bin/env node
// SPDX-License-Identifier: Apache-2.0
// Copyright (c) 2026 Manoj Rollo (MRJonam91)

import { readFileSync, existsSync } from 'node:fs';
import { CivicEngine } from '../core/engine.ts';
import { createCivicHttpServer } from '../server/http.ts';
import { FileStorageAdapter } from '../storage/index.ts';
import type { ApplicationStatus, ExportFormat } from '../core/types.ts';

const SPONSOR_LINE = 'CivicOS is free & open source (Apache-2.0). Support the project: https://github.com/sponsors/MRJonam91';

function printSponsorMaybe(): void {
  if (process.env.NO_SPONSOR || !process.stdout.isTTY || process.env.CI) return;
  if (Math.random() < 0.1) {
    console.error(`\x1b[90m♥ ${SPONSOR_LINE}\x1b[0m`);
  }
}

function printHelp(): void {
  console.log(`
CivicOS — Standalone Civic Forms, Procedures & Notifications Engine (v1.0.0)
Usage: civicos <command> [options]

Commands:
  serve                 Start the embedded HTTP API & citizen portal
    --port <number>     Port to listen on (default: 3000)
    --storage <file>    Persist applications to a JSON file (or CIVICOS_STORAGE env)

  schemas               List available civic form schemas

  submit                Submit a new citizen application
    --schema <id>       Schema identifier
    --applicant <json|@file>  Applicant details JSON or @file.json
    --data <json|@file>       Form field data JSON or @file.json
    --storage <file>    Persistent storage file

  list                  List submitted applications
    --status <status>   Filter by status (SUBMITTED, IN_REVIEW, APPROVED, etc.)
    --schema <id>       Filter by schema
    --search <query>    Search by name, email, fiscal code or ID
    --storage <file>    Persistent storage file

  show <id>             Show application details and audit trail
    --storage <file>    Persistent storage file

  receipt <id>          Generate and print official protocol receipt
    --storage <file>    Persistent storage file

  transition <id>       Transition an application to a new status
    --to <status>       Target status
    --actor <name>      Name or role of officer/system
    --note <text>       Optional administrative note
    --storage <file>    Persistent storage file

  verify <id>           Cryptographically verify the tamper-evident audit chain
    --storage <file>    Persistent storage file

  export                Export applications
    --format <type>     Export format: json, csv, ndjson (default: json)
    --storage <file>    Persistent storage file

Options:
  -h, --help            Show this help message
  -v, --version         Show CivicOS version

Sponsor & Support:
  ${SPONSOR_LINE}
`);
}

function parseJsonOrFile(input: string, fieldName: string): any {
  let content = input.trim();
  if (content.startsWith('@')) {
    const filePath = content.slice(1);
    if (!existsSync(filePath)) {
      throw new Error(`File not found for ${fieldName}: ${filePath}`);
    }
    content = readFileSync(filePath, 'utf-8');
  } else if (content.endsWith('.json') && existsSync(content)) {
    content = readFileSync(content, 'utf-8');
  }

  try {
    return JSON.parse(content);
  } catch (err: any) {
    throw new Error(
      `Invalid JSON for ${fieldName}. Provide inline JSON or pass a file using @filename.json (Error: ${err.message})`
    );
  }
}

async function main() {
  const args = process.argv.slice(2);
  if (args.length === 0 || args.includes('-h') || args.includes('--help')) {
    printHelp();
    return;
  }

  if (args.includes('-v') || args.includes('--version')) {
    console.log('CivicOS v1.0.0');
    return;
  }

  const command = args[0];

  // Resolve storage path
  const storageIdx = args.indexOf('--storage');
  const storagePath =
    (storageIdx !== -1 ? args[storageIdx + 1] : undefined) ||
    process.env.CIVICOS_STORAGE ||
    undefined;

  const storage = storagePath ? new FileStorageAdapter(storagePath) : undefined;
  const engine = new CivicEngine({ storage });
  await engine.init();

  switch (command) {
    case 'serve': {
      let port = 3000;
      const portIdx = args.indexOf('--port');
      const customPort = portIdx !== -1 ? args[portIdx + 1] : undefined;
      if (customPort) {
        port = parseInt(customPort, 10);
      }
      const server = createCivicHttpServer(engine);
      server.listen(port, () => {
        console.log(`CivicOS HTTP Server listening at http://localhost:${port}`);
        console.log(`Citizen Web Portal: http://localhost:${port}/`);
        console.log(`REST API Base:     http://localhost:${port}/api/v1/schemas`);
        if (storagePath) {
          console.log(`Persistent Storage: ${storagePath}`);
        }
        console.log('Press Ctrl+C to terminate.');
      });
      break;
    }

    case 'schemas': {
      const schemas = engine.getRegistry().list();
      console.log(`\nAvailable Civic Form Schemas (${schemas.length}):\n`);
      for (const s of schemas) {
        console.log(`- [${s.code}] ${s.id}`);
        console.log(`  Title: ${s.title}`);
        console.log(`  Competence: ${s.competentBody} | SLA: ${s.slaDays} days`);
        console.log(`  Fields: ${s.fields.map(f => f.name).join(', ')}\n`);
      }
      printSponsorMaybe();
      break;
    }

    case 'submit': {
      const schemaIdx = args.indexOf('--schema');
      const applicantIdx = args.indexOf('--applicant');
      const dataIdx = args.indexOf('--data');

      const schemaArg = schemaIdx !== -1 ? args[schemaIdx + 1] : undefined;
      if (!schemaArg) {
        console.error('Error: missing --schema <id>');
        process.exit(1);
      }

      const schemaId = schemaArg;
      const applicantRaw = (applicantIdx !== -1 ? args[applicantIdx + 1] : undefined) || '{}';
      const dataRaw = (dataIdx !== -1 ? args[dataIdx + 1] : undefined) || '{}';

      try {
        const applicant = parseJsonOrFile(applicantRaw, '--applicant');
        const data = parseJsonOrFile(dataRaw, '--data');

        const result = await engine.submitApplication({ schemaId, applicant, data });
        if (!result.success) {
          console.error('Validation Error:');
          console.error(result.validation?.errors);
          process.exit(1);
        }

        console.log(`Application submitted successfully!`);
        console.log(`ID: ${result.application?.id}`);
        console.log(`Status: ${result.application?.status}`);
        console.log(`Due Date: ${result.application?.dueDate}`);
        printSponsorMaybe();
      } catch (err) {
        console.error(`Submission failed: ${(err as Error).message}`);
        process.exit(1);
      }
      break;
    }

    case 'list': {
      let status: ApplicationStatus | undefined;
      let schemaId: string | undefined;
      let searchQuery: string | undefined;

      const sIdx = args.indexOf('--status');
      if (sIdx !== -1 && args[sIdx + 1]) status = args[sIdx + 1] as ApplicationStatus;

      const schIdx = args.indexOf('--schema');
      if (schIdx !== -1 && args[schIdx + 1]) schemaId = args[schIdx + 1];

      const qIdx = args.indexOf('--search');
      if (qIdx !== -1 && args[qIdx + 1]) searchQuery = args[qIdx + 1];

      const list = engine.listApplications({ status, schemaId, searchQuery });
      console.log(JSON.stringify(list, null, 2));
      printSponsorMaybe();
      break;
    }

    case 'show': {
      const id = args[1];
      if (!id) {
        console.error('Usage: civicos show <applicationId>');
        process.exit(1);
      }
      const app = engine.getApplication(id);
      if (!app) {
        console.error(`Application "${id}" not found.`);
        process.exit(1);
      }
      console.log(JSON.stringify(app, null, 2));
      printSponsorMaybe();
      break;
    }

    case 'receipt': {
      const id = args[1];
      if (!id) {
        console.error('Usage: civicos receipt <applicationId>');
        process.exit(1);
      }
      try {
        const html = engine.getReceiptHtml(id);
        console.log(html);
        printSponsorMaybe();
      } catch (err) {
        console.error(`Receipt generation failed: ${(err as Error).message}`);
        process.exit(1);
      }
      break;
    }

    case 'transition': {
      const id = args[1];
      const toIdx = args.indexOf('--to');
      const actorIdx = args.indexOf('--actor');
      const noteIdx = args.indexOf('--note');

      const toArg = toIdx !== -1 ? args[toIdx + 1] : undefined;
      const actorArg = actorIdx !== -1 ? args[actorIdx + 1] : undefined;

      if (!id || !toArg || !actorArg) {
        console.error('Usage: civicos transition <id> --to <status> --actor <name> [--note <text>]');
        process.exit(1);
      }

      const toStatus = toArg as ApplicationStatus;
      const actor = actorArg;
      const note = noteIdx !== -1 ? args[noteIdx + 1] : undefined;

      try {
        const result = await engine.transitionApplication(id, toStatus, actor, note);
        console.log(`Application ${id} transitioned to ${toStatus}`);
        console.log(`Audit Trail Length: ${result.application.auditTrail.length}`);
        printSponsorMaybe();
      } catch (err) {
        console.error(`Transition error: ${(err as Error).message}`);
        process.exit(1);
      }
      break;
    }

    case 'verify': {
      const id = args[1];
      if (!id) {
        console.error('Usage: civicos verify <applicationId>');
        process.exit(1);
      }
      try {
        const check = engine.verifyApplicationAudit(id);
        if (check.valid) {
          console.log(`[PASS] Audit chain for ${id} is intact and cryptographically verified.`);
        } else {
          console.error(`[FAIL] Audit chain compromised at block ${check.brokenAt}: ${check.reason}`);
          process.exit(1);
        }
        printSponsorMaybe();
      } catch (err) {
        console.error(`Verification error: ${(err as Error).message}`);
        process.exit(1);
      }
      break;
    }

    case 'export': {
      const fmtIdx = args.indexOf('--format');
      const fmtArg = fmtIdx !== -1 ? args[fmtIdx + 1] : undefined;
      const format = (fmtArg || 'json') as ExportFormat;
      const out = engine.export(format);
      console.log(out);
      printSponsorMaybe();
      break;
    }

    default:
      console.error(`Unknown command: ${command}. Run "civicos --help" for available commands.`);
      process.exit(1);
  }
}

main().catch(err => {
  console.error(`Fatal error: ${err.message}`);
  process.exit(1);
});
