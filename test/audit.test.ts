// SPDX-License-Identifier: Apache-2.0
// Copyright (c) 2026 Manoj Rollo (MRJonam91)

import test from 'node:test';
import assert from 'node:assert/strict';
import { AuditChain, GENESIS_PREVIOUS_HASH } from '../src/core/audit.ts';
import type { AuditEntry } from '../src/core/types.ts';

test('AuditChain creates and verifies valid cryptographic chain', () => {
  const chain: AuditEntry[] = [];

  const entry1 = AuditChain.createEntry(
    1,
    'APPLICATION_SUBMITTED',
    'citizen:Mario Rossi',
    GENESIS_PREVIOUS_HASH,
    { details: 'submission' },
    '2026-11-06T10:00:00Z'
  );
  chain.push(entry1);

  const entry2 = AuditChain.createEntry(
    2,
    'STATUS_TRANSITION_TO_IN_REVIEW',
    'officer:Luigi Verdi',
    entry1.hash,
    { note: 'Assigned to clerk' },
    '2026-11-06T10:15:00Z'
  );
  chain.push(entry2);

  const check = AuditChain.verifyChain(chain);
  assert.equal(check.valid, true);
});

test('AuditChain detects tampered payload in history', () => {
  const chain: AuditEntry[] = [];

  const entry1 = AuditChain.createEntry(
    1,
    'APPLICATION_SUBMITTED',
    'citizen:Mario Rossi',
    GENESIS_PREVIOUS_HASH,
    { details: 'submission' },
    '2026-11-06T10:00:00Z'
  );
  chain.push(entry1);

  const entry2 = AuditChain.createEntry(
    2,
    'STATUS_TRANSITION_TO_IN_REVIEW',
    'officer:Luigi Verdi',
    entry1.hash,
    { note: 'Assigned to clerk' },
    '2026-11-06T10:15:00Z'
  );
  chain.push(entry2);

  // Alter entry1 action maliciously
  chain[0]!.action = 'APPLICATION_MODIFIED_UNLAWFULLY';

  const check = AuditChain.verifyChain(chain);
  assert.equal(check.valid, false);
  assert.equal(check.brokenAt, 0);
});
