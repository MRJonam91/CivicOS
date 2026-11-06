// SPDX-License-Identifier: Apache-2.0
// Copyright (c) 2026 Manoj Rollo (MRJonam91)

import test from 'node:test';
import assert from 'node:assert/strict';
import { CivicAttachmentValidator } from '../src/core/attachments.ts';
import type { CivicAttachmentMetadata } from '../src/core/types.ts';

test('CivicAttachmentValidator accepts valid PDF and images with SHA-256 fingerprint', () => {
  const validAttachment: CivicAttachmentMetadata = {
    id: 'att-1',
    filename: 'certificato_medico.pdf',
    mimeType: 'application/pdf',
    sizeBytes: 245000,
    sha256Hash: 'a1b2c3d4e5f67890123456789abcdef0123456789abcdef0123456789abcdef0',
    uploadedAt: '2026-11-06T10:00:00Z'
  };

  const result = CivicAttachmentValidator.validate(validAttachment);
  assert.equal(result.valid, true);
});

test('CivicAttachmentValidator rejects disallowed file extensions and invalid hash', () => {
  const dangerousAttachment: CivicAttachmentMetadata = {
    id: 'att-2',
    filename: 'malware.exe',
    mimeType: 'application/x-msdownload',
    sizeBytes: 1024,
    sha256Hash: 'invalid_short_hash',
    uploadedAt: '2026-11-06T10:00:00Z'
  };

  const result = CivicAttachmentValidator.validate(dangerousAttachment);
  assert.equal(result.valid, false);
  assert.ok(result.error?.includes('non consentito'));
});

test('CivicAttachmentValidator rejects oversize files', () => {
  const oversizeAttachment: CivicAttachmentMetadata = {
    id: 'att-3',
    filename: 'huge_scan.pdf',
    mimeType: 'application/pdf',
    sizeBytes: 25 * 1024 * 1024, // 25 MB > 15 MB
    sha256Hash: 'a1b2c3d4e5f67890123456789abcdef0123456789abcdef0123456789abcdef0',
    uploadedAt: '2026-11-06T10:00:00Z'
  };

  const result = CivicAttachmentValidator.validate(oversizeAttachment);
  assert.equal(result.valid, false);
  assert.ok(result.error?.includes('Dimensione file non conforme'));
});
