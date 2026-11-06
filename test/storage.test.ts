// SPDX-License-Identifier: Apache-2.0
// Copyright (c) 2026 Manoj Rollo (MRJonam91)

import test from 'node:test';
import assert from 'node:assert/strict';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { unlink } from 'node:fs/promises';
import { FileStorageAdapter, MemoryStorageAdapter } from '../src/storage/index.ts';
import type { CitizenApplication } from '../src/core/types.ts';

const sampleApp: CitizenApplication = {
  id: 'PRAT-20261106-9999',
  schemaId: 'iscrizione-mensa-scolastica',
  submittedAt: '2026-11-06T10:00:00Z',
  updatedAt: '2026-11-06T10:00:00Z',
  dueDate: '2026-12-06',
  status: 'SUBMITTED',
  applicant: { fullName: 'Mario Rossi', email: 'mario@example.com' },
  data: { test: true },
  history: [],
  auditTrail: []
};

test('MemoryStorageAdapter stores and retrieves applications', async () => {
  const mem = new MemoryStorageAdapter();
  await mem.save(sampleApp);

  const retrieved = await mem.get('PRAT-20261106-9999');
  assert.ok(retrieved);
  assert.equal(retrieved.id, 'PRAT-20261106-9999');

  const all = await mem.loadAll();
  assert.equal(all.length, 1);

  const deleted = await mem.delete('PRAT-20261106-9999');
  assert.equal(deleted, true);

  const missing = await mem.get('PRAT-20261106-9999');
  assert.equal(missing, undefined);
});

test('FileStorageAdapter persists atomically to file and reloads', async () => {
  const filePath = join(tmpdir(), `civicos-test-${Date.now()}-${Math.random().toString(36).slice(2)}.json`);

  try {
    const storage1 = new FileStorageAdapter(filePath);
    await storage1.save(sampleApp);

    // Create a new instance pointing to same file to verify persistence
    const storage2 = new FileStorageAdapter(filePath);
    const retrieved = await storage2.get('PRAT-20261106-9999');
    assert.ok(retrieved);
    assert.equal(retrieved.id, 'PRAT-20261106-9999');
    assert.equal(retrieved.applicant.fullName, 'Mario Rossi');

    const all = await storage2.loadAll();
    assert.equal(all.length, 1);

    await storage2.delete('PRAT-20261106-9999');
    const emptyAll = await storage2.loadAll();
    assert.equal(emptyAll.length, 0);
  } finally {
    try {
      await unlink(filePath);
    } catch {}
  }
});
