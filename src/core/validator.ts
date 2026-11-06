// SPDX-License-Identifier: Apache-2.0
// Copyright (c) 2026 Manoj Rollo (MRJonam91)

import type { CivicFormSchema, FormFieldDefinition, ValidationResult } from './types.ts';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const FISCAL_CODE_REGEX = /^[A-Z]{6}[0-9LMNPQRSTUV]{2}[A-EHLMPR-T][0-9LMNPQRSTUV]{2}[A-Z][0-9LMNPQRSTUV]{3}[A-Z]$/i;
const DATE_ISO_REGEX = /^\d{4}-\d{2}-\d{2}$/;

export class FormValidator {
  public static validate(schema: CivicFormSchema, data: Record<string, unknown>): ValidationResult {
    const errors: ValidationResult['errors'] = [];

    for (const field of schema.fields) {
      const value = data[field.name];
      const isMissing = value === undefined || value === null || (typeof value === 'string' && value.trim() === '');

      if (field.required && isMissing) {
        errors.push({
          field: field.name,
          message: `Il campo "${field.label}" è obbligatorio.`,
          code: 'FIELD_REQUIRED'
        });
        continue;
      }

      if (isMissing) {
        continue; // Optional field empty, valid
      }

      this.validateFieldType(field, value, errors);
      this.validateFieldRules(field, value, errors);
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }

  private static validateFieldType(
    field: FormFieldDefinition,
    value: unknown,
    errors: ValidationResult['errors']
  ): void {
    switch (field.type) {
      case 'text':
      case 'textarea':
        if (typeof value !== 'string') {
          errors.push({
            field: field.name,
            message: `Il campo "${field.label}" deve essere una stringa di testo.`,
            code: 'INVALID_TEXT'
          });
        }
        break;

      case 'number':
        const num = typeof value === 'number' ? value : Number(value);
        if (isNaN(num)) {
          errors.push({
            field: field.name,
            message: `Il campo "${field.label}" deve essere un valore numerico valido.`,
            code: 'INVALID_NUMBER'
          });
        }
        break;

      case 'email':
        if (typeof value !== 'string' || !EMAIL_REGEX.test(value.trim())) {
          errors.push({
            field: field.name,
            message: `Il campo "${field.label}" deve contenere un indirizzo email valido.`,
            code: 'INVALID_EMAIL'
          });
        }
        break;

      case 'fiscal_code':
        if (typeof value !== 'string' || !FISCAL_CODE_REGEX.test(value.trim())) {
          errors.push({
            field: field.name,
            message: `Il campo "${field.label}" deve essere un codice fiscale valido di 16 caratteri alfanumerici.`,
            code: 'INVALID_FISCAL_CODE'
          });
        }
        break;

      case 'phone':
        if (typeof value !== 'string' || value.replace(/[^\d+]/g, '').length < 6) {
          errors.push({
            field: field.name,
            message: `Il campo "${field.label}" deve contenere un recapito telefonico valido.`,
            code: 'INVALID_PHONE'
          });
        }
        break;

      case 'date':
        if (typeof value !== 'string' || !DATE_ISO_REGEX.test(value.trim()) || isNaN(Date.parse(value))) {
          errors.push({
            field: field.name,
            message: `Il campo "${field.label}" deve essere una data valida nel formato YYYY-MM-DD.`,
            code: 'INVALID_DATE'
          });
        }
        break;

      case 'select':
        if (field.options && field.options.length > 0) {
          const validOptions = field.options.map(opt => opt.value);
          if (!validOptions.includes(String(value))) {
            errors.push({
              field: field.name,
              message: `Il valore selezionato per "${field.label}" non è consentito.`,
              code: 'INVALID_OPTION'
            });
          }
        }
        break;

      case 'checkbox':
        if (typeof value !== 'boolean' && value !== 'true' && value !== 'false') {
          errors.push({
            field: field.name,
            message: `Il campo "${field.label}" deve essere booleano (vero/falso).`,
            code: 'INVALID_BOOLEAN'
          });
        }
        break;
    }
  }

  private static validateFieldRules(
    field: FormFieldDefinition,
    value: unknown,
    errors: ValidationResult['errors']
  ): void {
    const rules = field.validation;
    if (!rules) return;

    if (typeof value === 'string') {
      const trimmed = value.trim();
      if (rules.minLength !== undefined && trimmed.length < rules.minLength) {
        errors.push({
          field: field.name,
          message: `Il campo "${field.label}" richiede almeno ${rules.minLength} caratteri.`,
          code: 'MIN_LENGTH'
        });
      }
      if (rules.maxLength !== undefined && trimmed.length > rules.maxLength) {
        errors.push({
          field: field.name,
          message: `Il campo "${field.label}" non può superare ${rules.maxLength} caratteri.`,
          code: 'MAX_LENGTH'
        });
      }
      if (rules.pattern) {
        const regex = new RegExp(rules.pattern);
        if (!regex.test(trimmed)) {
          errors.push({
            field: field.name,
            message: `Il formato di "${field.label}" non è valido.`,
            code: 'PATTERN_MISMATCH'
          });
        }
      }
    }

    if (typeof value === 'number' || (typeof value === 'string' && !isNaN(Number(value)) && field.type === 'number')) {
      const num = Number(value);
      if (rules.min !== undefined && num < rules.min) {
        errors.push({
          field: field.name,
          message: `Il valore di "${field.label}" deve essere maggiore o uguale a ${rules.min}.`,
          code: 'MIN_VALUE'
        });
      }
      if (rules.max !== undefined && num > rules.max) {
        errors.push({
          field: field.name,
          message: `Il valore di "${field.label}" deve essere minore o uguale a ${rules.max}.`,
          code: 'MAX_VALUE'
        });
      }
    }
  }
}
