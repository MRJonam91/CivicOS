// SPDX-License-Identifier: Apache-2.0
// Copyright (c) 2026 Manoj Rollo (MRJonam91)

import { createHmac, timingSafeEqual } from 'node:crypto';

export class WebhookSigner {
  public static sign(payload: string, secret: string, timestamp: number = Date.now()): string {
    const signature = createHmac('sha256', secret)
      .update(`${timestamp}.${payload}`)
      .digest('hex');
    return `t=${timestamp},v1=${signature}`;
  }

  public static verify(
    payload: string,
    header: string,
    secret: string,
    toleranceSeconds: number = 300
  ): boolean {
    const parts = header.split(',');
    let timestampStr = '';
    let signature = '';

    for (const part of parts) {
      const [k, v] = part.split('=');
      if (k === 't' && v) timestampStr = v;
      if (k === 'v1' && v) signature = v;
    }

    if (!timestampStr || !signature) return false;

    const timestamp = parseInt(timestampStr, 10);
    if (isNaN(timestamp)) return false;

    const now = Date.now();
    if (Math.abs(now - timestamp) > toleranceSeconds * 1000) {
      return false; // Expired signature / replay attack
    }

    const expected = createHmac('sha256', secret)
      .update(`${timestamp}.${payload}`)
      .digest('hex');

    if (expected.length !== signature.length) return false;
    return timingSafeEqual(Buffer.from(expected), Buffer.from(signature));
  }
}
