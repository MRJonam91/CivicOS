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
    },
    attachments: [
      {
        id: 'att-1',
        filename: 'foto_buca.jpg',
        mimeType: 'image/jpeg',
        sizeBytes: 1048576,
        sha256Hash: 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
        uploadedAt: '2026-11-06T10:00:00Z'
      }
    ]
  });

  assert.equal(submission.success, true);
  assert.ok(submission.application);
  const appId = submission.application.id;

  // Verify attachments saved
  assert.equal(submission.application.attachments?.length, 1);
  assert.equal(submission.application.attachments?.[0]?.filename, 'foto_buca.jpg');

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

  // Verify printable official receipt generation
  const receiptHtml = engine.getReceiptHtml(appId);
  assert.ok(receiptHtml.includes('REPUBBLICA ITALIANA'));
  assert.ok(receiptHtml.includes(appId));
  assert.ok(receiptHtml.includes('Paolo Neri'));
  assert.ok(receiptHtml.includes('SHA-256 Tamper-Evident Proof'));

  // Test search filters
  const searchResults = engine.listApplications({ searchQuery: 'Paolo' });
  assert.equal(searchResults.length, 1);
  assert.equal(searchResults[0]?.id, appId);

  const emptySearch = engine.listApplications({ searchQuery: 'Inesistente' });
  assert.equal(emptySearch.length, 0);
});
