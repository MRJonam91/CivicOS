// SPDX-License-Identifier: Apache-2.0
// Copyright (c) 2026 Manoj Rollo (MRJonam91)

import test from 'node:test';
import assert from 'node:assert/strict';
import { createCivicHttpServer } from '../src/server/http.ts';
import { CivicEngine } from '../src/core/engine.ts';
import type { AddressInfo } from 'node:net';

test('HTTP Server responds to health, schemas, and public forms', async () => {
  const engine = new CivicEngine();
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
    assert.equal(healthJson.service, 'civicos');

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

    // 4. Form HTML page
    const formRes = await fetch(`${baseUrl}/forms/iscrizione-mensa-scolastica`);
    assert.equal(formRes.status, 200);
    const formText = await formRes.text();
    assert.ok(formText.includes('Refezione Scolastica'));
  } finally {
    await new Promise<void>(resolve => server.close(() => resolve()));
  }
});
