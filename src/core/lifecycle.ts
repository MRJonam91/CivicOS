// SPDX-License-Identifier: Apache-2.0
// Copyright (c) 2026 Manoj Rollo (MRJonam91)

import { randomInt } from 'node:crypto';
import type { ApplicationStatus, CitizenApplication } from './types.ts';
import { AuditChain, GENESIS_PREVIOUS_HASH } from './audit.ts';

export const ALLOWED_TRANSITIONS: Record<ApplicationStatus, ApplicationStatus[]> = {
  SUBMITTED: ['IN_REVIEW'],
  IN_REVIEW: ['INTEGRATION_REQUESTED', 'APPROVED', 'REJECTED'],
  INTEGRATION_REQUESTED: ['IN_REVIEW', 'REJECTED'],
  APPROVED: ['CLOSED'],
  REJECTED: ['CLOSED'],
  CLOSED: []
};

export class LifecycleManager {
  public static generateApplicationId(date: Date = new Date()): string {
    const y = date.getUTCFullYear();
    const m = String(date.getUTCMonth() + 1).padStart(2, '0');
    const d = String(date.getUTCDate()).padStart(2, '0');
    const seq = String(randomInt(1000, 9999));
    return `PRAT-${y}${m}${d}-${seq}`;
  }

  public static calculateDueDate(startDate: Date, slaDays: number): string {
    const due = new Date(startDate.getTime());
    due.setUTCDate(due.getUTCDate() + slaDays);
    const datePart = due.toISOString().split('T')[0];
    return datePart || due.toISOString().substring(0, 10);
  }

  public static canTransition(current: ApplicationStatus, next: ApplicationStatus): boolean {
    const allowed = ALLOWED_TRANSITIONS[current] || [];
    return allowed.includes(next);
  }

  public static transition(
    app: CitizenApplication,
    nextStatus: ApplicationStatus,
    actor: string,
    note?: string
  ): CitizenApplication {
    if (!this.canTransition(app.status, nextStatus)) {
      throw new Error(
        `Transizione di stato non consentita da ${app.status} a ${nextStatus}. Transizioni permesse: ${(
          ALLOWED_TRANSITIONS[app.status] || []
        ).join(', ') || 'nessuna'}`
      );
    }

    const now = new Date().toISOString();
    const lastAudit = app.auditTrail[app.auditTrail.length - 1];
    const prevHash = lastAudit ? lastAudit.hash : GENESIS_PREVIOUS_HASH;
    const newSeq = app.auditTrail.length + 1;

    const auditEntry = AuditChain.createEntry(
      newSeq,
      `STATUS_TRANSITION_TO_${nextStatus}`,
      actor,
      prevHash,
      {
        previousStatus: app.status,
        newStatus: nextStatus,
        note: note || null
      },
      now
    );

    app.status = nextStatus;
    app.updatedAt = now;
    app.history.push({
      status: nextStatus,
      timestamp: now,
      actor,
      note
    });
    app.auditTrail.push(auditEntry);

    return app;
  }
}
