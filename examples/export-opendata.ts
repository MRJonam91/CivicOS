// SPDX-License-Identifier: Apache-2.0
// Copyright (c) 2026 Manoj Rollo (MRJonam91)

import { CivicEngine } from '../src/core/engine.ts';

async function run() {
  const engine = new CivicEngine();

  // Create two sample applications
  await engine.submitApplication({
    schemaId: 'richiesta-occupazione-suolo-pubblico',
    applicant: { fullName: 'Edilizia Moderna Srl', email: 'info@edilizia.it', taxCode: '12345678901' },
    data: {
      companyOrIndividual: 'Edilizia Moderna Srl',
      purpose: 'cantiere',
      address: 'Corso Francia 45',
      squareMeters: 40,
      startDate: '2026-11-20',
      endDate: '2026-12-05'
    }
  });

  await engine.submitApplication({
    schemaId: 'segnalazione-manutenzione-urbana',
    applicant: { fullName: 'Marco Neri', email: 'marco.neri@example.com' },
    data: {
      categoryType: 'illuminazione',
      location: 'Via Po angolo Via Rossini',
      description: 'Lampione spento da tre giorni vicino alle strisce pedonali.',
      urgency: 'media'
    }
  });

  console.log('--- NDJSON STREAM EXPORT ---');
  console.log(engine.export('ndjson'));

  console.log('\n--- TABULAR CSV EXPORT (D.Lgs. 33/2013 Open Data) ---');
  console.log(engine.export('csv'));
}

run().catch(console.error);
