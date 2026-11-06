// SPDX-License-Identifier: Apache-2.0
// Copyright (c) 2026 Manoj Rollo (MRJonam91)

import test from 'node:test';
import assert from 'node:assert/strict';
import { FormValidator } from '../src/core/validator.ts';
import { DEFAULT_SCHEMAS } from '../src/core/schemas.ts';

test('FormValidator correctly validates valid student enrolment form with official control char', () => {
  const schema = DEFAULT_SCHEMAS.find(s => s.id === 'iscrizione-mensa-scolastica')!;
  assert.ok(schema);

  const validData = {
    studentFullName: 'Mario Rossi',
    studentFiscalCode: 'RSSMRA15A01L219Y', // Valid control character Y
    schoolName: 'scuola_rodari',
    schoolClass: '3B',
    specialDiet: 'nessuna',
    hasIseeDiscount: true,
    iseeValue: 14500
  };

  const res = FormValidator.validate(schema, validData);
  assert.equal(res.valid, true);
  assert.equal(res.errors.length, 0);
});

test('FormValidator catches missing required fields', () => {
  const schema = DEFAULT_SCHEMAS.find(s => s.id === 'iscrizione-mensa-scolastica')!;
  const invalidData = {
    // missing studentFullName
    studentFiscalCode: 'RSSMRA15A01L219Y',
    schoolName: 'scuola_rodari',
    schoolClass: '3B'
  };

  const res = FormValidator.validate(schema, invalidData);
  assert.equal(res.valid, false);
  const err = res.errors.find(e => e.field === 'studentFullName');
  assert.ok(err);
  assert.equal(err.code, 'FIELD_REQUIRED');
});

test('FormValidator catches invalid Italian fiscal code checksum', () => {
  const schema = DEFAULT_SCHEMAS.find(s => s.id === 'iscrizione-mensa-scolastica')!;
  const badFiscalData = {
    studentFullName: 'Mario Rossi',
    studentFiscalCode: 'RSSMRA15A01L219X', // X is WRONG, expected Y
    schoolName: 'scuola_rodari',
    schoolClass: '3B'
  };

  const res = FormValidator.validate(schema, badFiscalData);
  assert.equal(res.valid, false);
  const err = res.errors.find(e => e.field === 'studentFiscalCode');
  assert.ok(err);
  assert.equal(err.code, 'INVALID_FISCAL_CODE');
});

test('FormValidator validates conditional requirement via dependsOn', () => {
  const schema = DEFAULT_SCHEMAS.find(s => s.id === 'iscrizione-mensa-scolastica')!;

  // When hasIseeDiscount is true but iseeValue is omitted -> must fail
  const missingIseeData = {
    studentFullName: 'Mario Rossi',
    studentFiscalCode: 'RSSMRA15A01L219Y',
    schoolName: 'scuola_rodari',
    schoolClass: '3B',
    hasIseeDiscount: true
    // iseeValue missing
  };

  const res = FormValidator.validate(schema, missingIseeData);
  assert.equal(res.valid, false);
  const err = res.errors.find(e => e.field === 'iseeValue');
  assert.ok(err);
  assert.equal(err.code, 'CONDITIONAL_FIELD_REQUIRED');
});

test('FormValidator validates date ranges (startDate <= endDate)', () => {
  const schema = DEFAULT_SCHEMAS.find(s => s.id === 'richiesta-occupazione-suolo-pubblico')!;
  assert.ok(schema);

  const invertedDatesData = {
    companyOrIndividual: 'Rossi Srl',
    purpose: 'cantiere',
    address: 'Via Garibaldi 10',
    squareMeters: 25,
    startDate: '2026-12-15',
    endDate: '2026-12-05' // Inverted!
  };

  const res = FormValidator.validate(schema, invertedDatesData);
  assert.equal(res.valid, false);
  const err = res.errors.find(e => e.field === 'endDate');
  assert.ok(err);
  assert.equal(err.code, 'INVALID_DATE_RANGE');
});

test('FormValidator validates min/max numerical bounds', () => {
  const schema = DEFAULT_SCHEMAS.find(s => s.id === 'richiesta-occupazione-suolo-pubblico')!;
  assert.ok(schema);

  const invalidMetersData = {
    companyOrIndividual: 'Rossi Srl',
    purpose: 'cantiere',
    address: 'Via Garibaldi 10',
    squareMeters: 5000, // max is 2000
    startDate: '2026-12-01',
    endDate: '2026-12-10'
  };

  const res = FormValidator.validate(schema, invalidMetersData);
  assert.equal(res.valid, false);
  const err = res.errors.find(e => e.field === 'squareMeters');
  assert.ok(err);
  assert.equal(err.code, 'MAX_VALUE');
});
