// SPDX-License-Identifier: Apache-2.0
// Copyright (c) 2026 Manoj Rollo (MRJonam91)

import { createHash } from 'node:crypto';
import type { CivicAttachmentMetadata } from './types.ts';

export const ALLOWED_CIVIC_MIME_TYPES = [
  'application/pdf',
  'image/jpeg',
  'image/png',
  'application/pkcs7-mime',
  'application/p7m',
  'application/xml',
  'text/xml'
];

export const DEFAULT_MAX_ATTACHMENT_SIZE = 15 * 1024 * 1024; // 15 MB

export class CivicAttachmentValidator {
  public static validate(
    att: CivicAttachmentMetadata,
    options?: { allowedMimeTypes?: string[]; maxSizeBytes?: number }
  ): { valid: boolean; error?: string } {
    const allowed = options?.allowedMimeTypes || ALLOWED_CIVIC_MIME_TYPES;
    const maxSize = options?.maxSizeBytes || DEFAULT_MAX_ATTACHMENT_SIZE;

    if (!att.filename || att.filename.trim().length === 0) {
      return { valid: false, error: 'Nome del file allegato non valido o vuoto.' };
    }

    if (!allowed.includes(att.mimeType.toLowerCase())) {
      return {
        valid: false,
        error: `Formato file "${att.mimeType}" non consentito. Formati ammessi: ${allowed.join(', ')}.`
      };
    }

    if (att.sizeBytes <= 0 || att.sizeBytes > maxSize) {
      return {
        valid: false,
        error: `Dimensione file non conforme (${att.sizeBytes} bytes). Dimensione massima consentita: ${maxSize} bytes.`
      };
    }

    if (!att.sha256Hash || !/^[a-f0-9]{64}$/i.test(att.sha256Hash)) {
      return {
        valid: false,
        error: 'Impronta crittografica SHA-256 non valida o mancante per l’allegato.'
      };
    }

    return { valid: true };
  }

  public static hashBuffer(buffer: Uint8Array | string): string {
    return createHash('sha256').update(buffer).digest('hex');
  }
}
