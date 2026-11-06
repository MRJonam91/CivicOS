// SPDX-License-Identifier: Apache-2.0
// Copyright (c) 2026 Manoj Rollo (MRJonam91)

import test from 'node:test';
import assert from 'node:assert/strict';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { writeFile, unlink } from 'node:fs/promises';
import { CivicEngine } from '../src/core/engine.ts';
import { FileStorageAdapter } from '../src/storage/index.ts';

test('CivicEngine loads existing applications from persistent storage on init()', async () => {
  const storePath = join(tmpdir(), `civicos-cli-test-${Date.now()}-${Math.random().toString(36).slice(2)}.json`);

  try {
    const storage = new FileStorageAdapter(storePath);
    const engine1 = new CivicEngine({ storage });
    await engine1.init();

    const result = await engine1.submitApplication({
      schemaId: 'iscrizione-mensa-scolastica',
      applicant: {
        fullName: 'Elena Ferrari',
        email: 'elena@example.com',
        taxCode: 'FRRLNE88M45L219R'
      },
      data: {
        studentFullName: 'Matteo Ferrari',
        studentFiscalCode: 'FRRMTT17A01L219Z',
        schoolName: 'scuola_rodari',
        schoolClass: '2A'
      }
    });

    assert.equal(result.success, true);
    const appId = result.application!.id;

    // Simulate new CLI command execution with separate engine instance
    const engine2 = new CivicEngine({ storage: new FileStorageAdapter(storePath) });
    await engine2.init();

    const loadedApp = engine2.getApplication(appId);
    assert.ok(loadedApp);
    assert.equal(loadedApp.id, appId);
    assert.equal(loadedApp.applicant.fullName, 'Elena Ferrari');

    // Transition on second instance
    await engine2.transitionApplication(appId, 'IN_REVIEW', 'officer:clerk', 'Verified on separate invocation');

    // Simulate 3rd invocation
    const engine3 = new CivicEngine({ storage: new FileStorageAdapter(storePath) });
    await engine3.init();
    const updatedApp = engine3.getApplication(appId);
    assert.ok(updatedApp);
    assert.equal(updatedApp.status, 'IN_REVIEW');
    assert.equal(updatedApp.history.length, 2);
  } finally {
    try {
      await unlink(storePath);
    } catch {}
  }
});
