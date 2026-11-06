// SPDX-License-Identifier: Apache-2.0
// Copyright (c) 2026 Manoj Rollo (MRJonam91)

import test from 'node:test';
import assert from 'node:assert/strict';
import { CivicEngine } from '../src/core/engine.ts';

test('CivicEngine handles end-to-end application lifecycle with audit and notifications', async () => {
  const engine = new CivicEngine();

  const submission = await engine.submitApplication({
    schemaId: 'segnalazione-manutenzione-urbana',
    applicant: {
      fullName: 'Paolo Neri',
      email: 'paolo.neri@example.com',
      taxCode: 'NRIFNC80A01H501Y'
    },
    data: {
      categoryType: 'strade',
      location: 'Via Garibaldi 12',
      description: 'Presenza di una buca profonda sul ciglio della strada.',
      urgency: 'media'
    }
  });

  assert.equal(submission.success, true);
  assert.ok(submission.application);
  const appId = submission.application.id;

  // Verify initial audit chain
  const audit1 = engine.verifyApplicationAudit(appId);
  assert.equal(audit1.valid, true);

  // Transition to IN_REVIEW
  const step2 = await engine.transitionApplication(
    appId,
    'IN_REVIEW',
    'officer:clerk',
    'Istruttoria tecnica avviata'
  );
  assert.equal(step2.application.status, 'IN_REVIEW');

  // Transition to APPROVED
  const step3 = await engine.transitionApplication(
    appId,
    'APPROVED',
    'officer:director',
    'Intervento manutentivo programmato'
  );
  assert.equal(step3.application.status, 'APPROVED');

  // Verify audit chain remains unbroken
  const auditFinal = engine.verifyApplicationAudit(appId);
  assert.equal(auditFinal.valid, true);
  assert.equal(step3.application.auditTrail.length, 3);
});
