// SPDX-License-Identifier: Apache-2.0
// Copyright (c) 2026 Manoj Rollo (MRJonam91)

import test from 'node:test';
import assert from 'node:assert/strict';
import { SlidingWindowRateLimiter } from '../src/security/rate-limiter.ts';
import { WebhookSigner } from '../src/security/webhook-signer.ts';

test('SlidingWindowRateLimiter blocks requests exceeding threshold', () => {
  const limiter = new SlidingWindowRateLimiter({ windowMs: 1000, maxRequests: 3 });
  const key = '192.168.1.50';

  assert.equal(limiter.check(key).allowed, true);
  assert.equal(limiter.check(key).allowed, true);
  assert.equal(limiter.check(key).allowed, true);

  // 4th request must be rejected
  const fourth = limiter.check(key);
  assert.equal(fourth.allowed, false);
  assert.equal(fourth.remaining, 0);

  // Different IP should still be allowed
  assert.equal(limiter.check('192.168.1.51').allowed, true);
});

test('WebhookSigner signs payloads with HMAC-SHA256 and verifies integrity', () => {
  const secret = 'super-secret-gov-key-2026';
  const payload = JSON.stringify({ event: 'STATUS_CHANGED', id: 'PRAT-20261106-0001' });

  const signatureHeader = WebhookSigner.sign(payload, secret);
  assert.ok(signatureHeader.startsWith('t='));
  assert.ok(signatureHeader.includes('v1='));

  // Valid verification
  const isValid = WebhookSigner.verify(payload, signatureHeader, secret);
  assert.equal(isValid, true);

  // Tampered payload fails
  const tamperedPayload = JSON.stringify({ event: 'STATUS_CHANGED', id: 'PRAT-20261106-0002' });
  const isInvalid = WebhookSigner.verify(tamperedPayload, signatureHeader, secret);
  assert.equal(isInvalid, false);

  // Wrong secret fails
  const isWrongSecret = WebhookSigner.verify(payload, signatureHeader, 'wrong-secret');
  assert.equal(isWrongSecret, false);
});
