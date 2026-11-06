// SPDX-License-Identifier: Apache-2.0
// Copyright (c) 2026 Manoj Rollo (MRJonam91)

import test from 'node:test';
import assert from 'node:assert/strict';
import { CpsvApSerializer } from '../src/interop/cpsv.ts';
import { DEFAULT_SCHEMAS } from '../src/core/schemas.ts';

test('CpsvApSerializer maps schemas into European CPSV-AP JSON-LD standard', () => {
  const schema = DEFAULT_SCHEMAS.find(s => s.id === 'iscrizione-mensa-scolastica')!;
  assert.ok(schema);

  const jsonLd = CpsvApSerializer.serializeService(schema);

  assert.equal(jsonLd['@type'], 'cpsv:PublicService');
  assert.equal(jsonLd.identifier, 'EDU-MNS-01');
  assert.equal(jsonLd.title.it, 'Iscrizione Servizio Refezione Scolastica');
  assert.equal(jsonLd.hasCompetentAuthority.prefLabel, 'Settore Istruzione e Servizi Educativi');
  assert.equal(jsonLd.processingTime, 'P30D');

  assert.ok(jsonLd.hasInput.length > 0);
  const fcField = jsonLd.hasInput.find(i => i.identifier === 'studentFiscalCode');
  assert.ok(fcField);
  assert.equal(fcField.isRequired, true);
});

test('CpsvApSerializer serializes multi-service catalog', () => {
  const rawCatalog = CpsvApSerializer.serializeCatalog(DEFAULT_SCHEMAS);
  const parsed = JSON.parse(rawCatalog);
  assert.ok(Array.isArray(parsed));
  assert.equal(parsed.length, 3);
  assert.equal(parsed[0]['@type'], 'cpsv:PublicService');
});
