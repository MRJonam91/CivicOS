// SPDX-License-Identifier: Apache-2.0
// Copyright (c) 2026 Manoj Rollo (MRJonam91)

import type { CivicFormSchema, FormFieldDefinition, ValidationResult } from './types.ts';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const FISCAL_CODE_PATTERN = /^[A-Z]{6}[0-9LMNPQRSTUV]{2}[A-EHLMPR-T][0-9LMNPQRSTUV]{2}[A-Z][0-9LMNPQRSTUV]{3}[A-Z]$/i;
const DATE_ISO_REGEX = /^\d{4}-\d{2}-\d{2}$/;

// Italian Fiscal Code Odd Character Conversion Table (D.M. 23/12/1976)
const CF_ODD_VALUES: Record<string, number> = {
  '0': 1, '1': 0, '2': 5, '3': 7, '4': 9, '5': 13, '6': 15, '7': 17, '8': 19, '9': 21,
  A: 1, B: 0, C: 5, D: 7, E: 9, F: 13, G: 15, H: 17, I: 19, J: 21,
  K: 2, L: 4, M: 18, N: 20, O: 11, P: 3, Q: 6, R: 8, S: 12, T: 14,
  U: 16, V: 10, W: 22, X: 25, Y: 24, Z: 23
};

// Italian Fiscal Code Even Character Conversion Table
const CF_EVEN_VALUES: Record<string, number> = {
  '0': 0, '1': 1, '2': 2, '3': 3, '4': 4, '5': 5, '6': 6, '7': 7, '8': 8, '9': 9,
  A: 0, B: 1, C: 2, D: 3, E: 4, F: 5, G: 6, H: 7, I: 8, J: 9,
  K: 10, L: 11, M: 12, N: 13, O: 14, P: 15, Q: 16, R: 17, S: 18, T: 19,
  U: 20, V: 21, W: 22, X: 23, Y: 24, Z: 25
};

export class FormValidator {
  public static isValidFiscalCode(cf: string): boolean {
    if (!cf || typeof cf !== 'string') return false;
    const clean = cf.trim().toUpperCase();
    if (clean.length !== 16 || !FISCAL_CODE_PATTERN.test(clean)) {
      return false;
    }

    let sum = 0;
    for (let i = 0; i < 15; i++) {
      const char = clean[i]!;
      if (i % 2 === 0) {
        // Odd positions (1st, 3rd, 5th... 0-indexed)
        const val = CF_ODD_VALUES[char];
        if (val === undefined) return false;
        sum += val;
      } else {
        // Even positions (2nd, 4th, 6th... 0-indexed)
        const val = CF_EVEN_VALUES[char];
        if (val === undefined) return false;
        sum += val;
      }
    }

    const expectedControlChar = String.fromCharCode(65 + (sum % 26));
    return clean[15] === expectedControlChar;
  }

  public static validate(schema: CivicFormSchema, data: Record<string, unknown>): ValidationResult {
    const errors: ValidationResult['errors'] = [];

    for (const field of schema.fields) {
      const value = data[field.name];
      const isMissing = value === undefined || value === null || (typeof value === 'string' && value.trim() === '');

      // Check conditional dependency
      const dependsOn = field.validation?.dependsOn;
      let isRequiredDueToDependency = false;
      if (dependsOn) {
        const parentVal = data[dependsOn.field];
        const isMatch = String(parentVal) === String(dependsOn.equals) || parentVal === dependsOn.equals;
        if (isMatch && isMissing) {
          isRequiredDueToDependency = true;
          errors.push({
            field: field.name,
            message: `Il campo "${field.label}" è obbligatorio in quanto "${dependsOn.field}" è selezionato.`,
            code: 'CONDITIONAL_FIELD_REQUIRED'
          });
          continue;
        }
      }

      if (field.required && isMissing && !isRequiredDueToDependency) {
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

    // Cross-field logic: date ranges
    if (data['startDate'] && data['endDate'] && typeof data['startDate'] === 'string' && typeof data['endDate'] === 'string') {
      const start = new Date(data['startDate']).getTime();
      const end = new Date(data['endDate']).getTime();
      if (!isNaN(start) && !isNaN(end) && start > end) {
        errors.push({
          field: 'endDate',
          message: 'La data di fine occupazione/evento non può essere antecedente alla data di inizio.',
          code: 'INVALID_DATE_RANGE'
        });
      }
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
        if (typeof value !== 'string' || !this.isValidFiscalCode(value)) {
          errors.push({
            field: field.name,
            message: `Il campo "${field.label}" deve contenere un codice fiscale valido di 16 caratteri con carattere di controllo corretto.`,
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
