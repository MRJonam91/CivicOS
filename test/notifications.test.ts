// SPDX-License-Identifier: Apache-2.0
// Copyright (c) 2026 Manoj Rollo (MRJonam91)

import test from 'node:test';
import assert from 'node:assert/strict';
import { NotificationDispatcher } from '../src/core/notifications.ts';
import type { CitizenApplication } from '../src/core/types.ts';

test('NotificationDispatcher dispatches to multiple channels and logs history', async () => {
  const dispatcher = new NotificationDispatcher();
  const app: CitizenApplication = {
    id: 'PRAT-20261106-9999',
    schemaId: 'iscrizione-mensa-scolastica',
    submittedAt: '2026-11-06T10:00:00Z',
    updatedAt: '2026-11-06T10:00:00Z',
    dueDate: '2026-12-06',
    status: 'SUBMITTED',
    applicant: {
      fullName: 'Giulia Bianchi',
      email: 'giulia.bianchi@example.com',
      phone: '+393331234567',
      taxCode: 'BNCGLI90A41H501U'
    },
    data: {},
    history: [],
    auditTrail: []
  };

  const records = await dispatcher.notifyCitizen(app, ['email', 'sms', 'io_mock']);
  assert.equal(records.length, 3);
  assert.ok(records.every(r => r.status === 'DELIVERED'));

  const history = dispatcher.getHistory();
  assert.equal(history.length, 3);
});
