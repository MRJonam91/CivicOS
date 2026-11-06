// SPDX-License-Identifier: Apache-2.0
// Copyright (c) 2026 Manoj Rollo (MRJonam91)

import test from 'node:test';
import assert from 'node:assert/strict';
import { InteroperabilityExporter } from '../src/core/export.ts';
import type { CitizenApplication } from '../src/core/types.ts';

test('InteroperabilityExporter correctly formats JSON, NDJSON and CSV', () => {
  const apps: CitizenApplication[] = [
    {
      id: 'PRAT-20261106-1234',
      schemaId: 'iscrizione-mensa-scolastica',
      submittedAt: '2026-11-06T10:00:00Z',
      updatedAt: '2026-11-06T10:00:00Z',
      dueDate: '2026-12-06',
      status: 'SUBMITTED',
      applicant: { fullName: 'Mario Rossi', email: 'mario@example.com' },
      data: { fieldA: 'valueA' },
      history: [],
      auditTrail: [
        {
          sequence: 1,
          timestamp: '2026-11-06T10:00:00Z',
          action: 'SUBMIT',
          performedBy: 'citizen',
          previousHash: '0000',
          hash: 'abc123hash'
        }
      ]
    }
  ];

  // Test JSON
  const jsonOutput = InteroperabilityExporter.export(apps, 'json');
  const parsed = JSON.parse(jsonOutput);
  assert.equal(parsed.length, 1);
  assert.equal(parsed[0]!.id, 'PRAT-20261106-1234');

  // Test NDJSON
  const ndjsonOutput = InteroperabilityExporter.export(apps, 'ndjson');
  assert.equal(ndjsonOutput.split('\n').length, 1);

  // Test CSV
  const csvOutput = InteroperabilityExporter.export(apps, 'csv');
  const rows = csvOutput.split('\n');
  assert.equal(rows.length, 2); // header + 1 row
  assert.ok(rows[0]!.includes('id,schemaId,status'));
  assert.ok(rows[1]!.includes('"PRAT-20261106-1234"'));
});
