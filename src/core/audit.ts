// SPDX-License-Identifier: Apache-2.0
// Copyright (c) 2026 Manoj Rollo (MRJonam91)

import { createHash } from 'node:crypto';
import type { AuditEntry } from './types.ts';

export const GENESIS_PREVIOUS_HASH = '0000000000000000000000000000000000000000000000000000000000000000';

export class AuditChain {
  public static calculateHash(
    sequence: number,
    timestamp: string,
    action: string,
    performedBy: string,
    previousHash: string,
    details?: Record<string, unknown>
  ): string {
    const canonicalDetails = details ? JSON.stringify(details, Object.keys(details).sort()) : '{}';
    const payload = `${sequence}|${timestamp}|${action}|${performedBy}|${previousHash}|${canonicalDetails}`;
    return createHash('sha256').update(payload).digest('hex');
  }

  public static createEntry(
    sequence: number,
    action: string,
    performedBy: string,
    previousHash: string,
    details?: Record<string, unknown>,
    timestamp: string = new Date().toISOString()
  ): AuditEntry {
    const hash = this.calculateHash(sequence, timestamp, action, performedBy, previousHash, details);
    return {
      sequence,
      timestamp,
      action,
      performedBy,
      previousHash,
      hash,
      details
    };
  }

  public static verifyChain(chain: AuditEntry[]): { valid: boolean; brokenAt?: number; reason?: string } {
    if (!chain || chain.length === 0) {
      return { valid: true };
    }

    let expectedPrevHash = GENESIS_PREVIOUS_HASH;

    for (let i = 0; i < chain.length; i++) {
      const entry = chain[i];
      if (!entry) {
        return { valid: false, brokenAt: i, reason: 'Voce indefinita nella sequenza audit' };
      }

      if (entry.sequence !== i + 1) {
        return {
          valid: false,
          brokenAt: i,
          reason: `Sequenza non valida: atteso ${i + 1}, trovato ${entry.sequence}`
        };
      }

      if (entry.previousHash !== expectedPrevHash) {
        return {
          valid: false,
          brokenAt: i,
          reason: `Discrepanza previousHash alla voce ${entry.sequence}`
        };
      }

      const recalculated = this.calculateHash(
        entry.sequence,
        entry.timestamp,
        entry.action,
        entry.performedBy,
        entry.previousHash,
        entry.details
      );

      if (recalculated !== entry.hash) {
        return {
          valid: false,
          brokenAt: i,
          reason: `Hash alterato alla voce ${entry.sequence}`
        };
      }

      expectedPrevHash = entry.hash;
    }

    return { valid: true };
  }
}
