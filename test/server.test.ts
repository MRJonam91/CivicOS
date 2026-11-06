// SPDX-License-Identifier: Apache-2.0
// Copyright (c) 2026 Manoj Rollo (MRJonam91)

import test from 'node:test';
import assert from 'node:assert/strict';
import { createCivicHttpServer } from '../src/server/http.ts';
import { CivicEngine } from '../src/core/engine.ts';
import type { AddressInfo } from 'node:net';

test('HTTP Server responds to health, schemas, public forms, receipt and case management', async () => {
  const engine = new CivicEngine();

  // Create a sample application
  const created = await engine.submitApplication({
    schemaId: 'iscrizione-mensa-scolastica',
    applicant: {
      fullName: 'Mario Rossi',
      email: 'mario.rossi@example.com',
      taxCode: 'RSSMRA85M01H501Q'
    },
    data: {
      studentFullName: 'Giacomo Rossi',
      studentFiscalCode: 'RSSGCM16A01L219C',
      schoolName: 'scuola_rodari',
      schoolClass: '1A'
    }
  });

  assert.ok(created.application);
  const appId = created.application.id;

  const server = createCivicHttpServer(engine);
  await new Promise<void>(resolve => server.listen(0, resolve));
  const address = server.address() as AddressInfo;
  const baseUrl = `http://127.0.0.1:${address.port}`;

  try {
    // 1. Health check
    const healthRes = await fetch(`${baseUrl}/health`);
    assert.equal(healthRes.status, 200);
    const healthJson = await healthRes.json();
    assert.equal(healthJson.status, 'ok');
    assert.equal(healthJson.version, '0.3.0');

    // 1b. CPSV-AP Catalog endpoint
    const cpsvRes = await fetch(`${baseUrl}/api/v1/cpsv-ap`);
    assert.equal(cpsvRes.status, 200);
    const cpsvJson = await cpsvRes.json();
    assert.ok(Array.isArray(cpsvJson));
    assert.equal(cpsvJson[0]['@type'], 'cpsv:PublicService');

    // 2. Schemas list
    const schemasRes = await fetch(`${baseUrl}/api/v1/schemas`);
    assert.equal(schemasRes.status, 200);
    const schemasJson = await schemasRes.json();
    assert.ok(Array.isArray(schemasJson.schemas));
    assert.ok(schemasJson.schemas.length >= 3);

    // 3. Web UI Homepage
    const homeRes = await fetch(`${baseUrl}/`);
    assert.equal(homeRes.status, 200);
    const homeText = await homeRes.text();
    assert.ok(homeText.includes('CivicOS'));
    assert.ok(homeText.includes(appId));

    // 4. Form HTML page
    const formRes = await fetch(`${baseUrl}/forms/iscrizione-mensa-scolastica`);
    assert.equal(formRes.status, 200);
    const formText = await formRes.text();
    assert.ok(formText.includes('Refezione Scolastica'));

    // 5. Case detail UI page
    const appUiRes = await fetch(`${baseUrl}/applications/${appId}`);
    assert.equal(appUiRes.status, 200);
    const appUiText = await appUiRes.text();
    assert.ok(appUiText.includes(appId));
    assert.ok(appUiText.includes('Fascicolo:'));
    assert.ok(appUiText.includes('Azione Istruttoria'));

    // 6. Official receipt HTML endpoint
    const receiptRes = await fetch(`${baseUrl}/api/v1/applications/${appId}/receipt`);
    assert.equal(receiptRes.status, 200);
    const receiptText = await receiptRes.text();
    assert.ok(receiptText.includes('REPUBBLICA ITALIANA'));
    assert.ok(receiptText.includes('Ricevuta di Protocollo'));

    // 7. Direct printable receipt page
    const receiptUiRes = await fetch(`${baseUrl}/receipts/${appId}`);
    assert.equal(receiptUiRes.status, 200);

    // 8. Transition status via REST
    const transRes = await fetch(`${baseUrl}/api/v1/applications/${appId}/transition`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        status: 'IN_REVIEW',
        actor: 'officer:clerk',
        note: 'Presa in carico test'
      })
    });
    assert.equal(transRes.status, 200);
    const transJson = await transRes.json();
    assert.equal(transJson.application.status, 'IN_REVIEW');

    // 9. Verify cryptographic audit via REST
    const verifyRes = await fetch(`${baseUrl}/api/v1/applications/${appId}/verify`);
    assert.equal(verifyRes.status, 200);
    const verifyJson = await verifyRes.json();
    assert.equal(verifyJson.audit.valid, true);

  } finally {
    await new Promise<void>(resolve => server.close(() => resolve()));
  }
});
