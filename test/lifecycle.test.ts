// SPDX-License-Identifier: Apache-2.0
// Copyright (c) 2026 Manoj Rollo (MRJonam91)

import test from 'node:test';
import assert from 'node:assert/strict';
import { LifecycleManager } from '../src/core/lifecycle.ts';
import type { CitizenApplication } from '../src/core/types.ts';
import { AuditChain, GENESIS_PREVIOUS_HASH } from '../src/core/audit.ts';

test('LifecycleManager generates valid application IDs', () => {
  const id = LifecycleManager.generateApplicationId(new Date('2026-11-06T12:00:00Z'));
  assert.match(id, /^PRAT-20261106-\d{4}$/);
});

test('LifecycleManager calculates correct SLA due date', () => {
  const start = new Date('2026-11-01T00:00:00Z');
  const due = LifecycleManager.calculateDueDate(start, 30);
  assert.equal(due, '2026-12-01');
});

test('LifecycleManager enforces valid state machine transitions', () => {
  const initAudit = AuditChain.createEntry(1, 'INIT', 'system', GENESIS_PREVIOUS_HASH);
  const app: CitizenApplication = {
    id: 'PRAT-20261106-1111',
    schemaId: 'iscrizione-mensa-scolastica',
    submittedAt: '2026-11-06T10:00:00Z',
    updatedAt: '2026-11-06T10:00:00Z',
    dueDate: '2026-12-06',
    status: 'SUBMITTED',
    applicant: { fullName: 'Mario Rossi', email: 'mario@example.com' },
    data: {},
    history: [{ status: 'SUBMITTED', timestamp: '2026-11-06T10:00:00Z', actor: 'citizen' }],
    auditTrail: [initAudit]
  };

  // Valid: SUBMITTED -> IN_REVIEW
  LifecycleManager.transition(app, 'IN_REVIEW', 'officer:clerk1', 'Presa in carico');
  assert.equal(app.status, 'IN_REVIEW');
  assert.equal(app.history.length, 2);
  assert.equal(app.auditTrail.length, 2);

  // Invalid: IN_REVIEW -> SUBMITTED (cannot go backwards to submitted)
  assert.throws(() => {
    LifecycleManager.transition(app, 'SUBMITTED', 'officer:clerk1');
  }, /Transizione di stato non consentita/);

  // Valid: IN_REVIEW -> APPROVED
  LifecycleManager.transition(app, 'APPROVED', 'officer:director', 'Conforme ai requisiti');
  assert.equal(app.status, 'APPROVED');

  // Valid: APPROVED -> CLOSED
  LifecycleManager.transition(app, 'CLOSED', 'system', 'Archiviazione');
  assert.equal(app.status, 'CLOSED');
});
