// SPDX-License-Identifier: Apache-2.0
// Copyright (c) 2026 Manoj Rollo (MRJonam91)

import { CivicEngine } from '../src/core/engine.ts';

async function run() {
  const engine = new CivicEngine();

  console.log('1. Submitting civic application (iscrizione-mensa-scolastica)...');
  const submission = await engine.submitApplication({
    schemaId: 'iscrizione-mensa-scolastica',
    applicant: {
      fullName: 'Elena Ferrari',
      email: 'elena.ferrari@example.com',
      taxCode: 'FRRLNE88M45L219Z',
      phone: '+39 347 1122334'
    },
    data: {
      studentFullName: 'Matteo Ferrari',
      studentFiscalCode: 'FRRMTT17A01L219X',
      schoolName: 'scuola_rodari',
      schoolClass: '2A',
      specialDiet: 'celiachia',
      hasIseeDiscount: true,
      iseeValue: 12000
    }
  });

  if (!submission.success || !submission.application) {
    console.error('Validation errors:', submission.validation);
    return;
  }

  const app = submission.application;
  console.log(`✓ Application submitted! Protocol ID: ${app.id}, Due Date: ${app.dueDate}`);

  console.log('\n2. Officer takes charge (status -> IN_REVIEW)...');
  await engine.transitionApplication(app.id, 'IN_REVIEW', 'officer:Dott. Bianchi', 'Inizio verifica ISEE e certificato medico');

  console.log('\n3. Officer approves application (status -> APPROVED)...');
  await engine.transitionApplication(app.id, 'APPROVED', 'officer:Dott. Bianchi', 'Documentazione valida, ammissione al servizio confermata');

  console.log('\n4. Verifying tamper-evident cryptographic audit chain...');
  const auditResult = engine.verifyApplicationAudit(app.id);
  console.log(`✓ Cryptographic chain verification: ${auditResult.valid ? 'VALID (100% UNTAMPERED)' : 'COMPROMISED'}`);

  console.log('\n5. Interoperable Open Data CSV Export:');
  console.log(engine.export('csv'));
}

run().catch(console.error);
