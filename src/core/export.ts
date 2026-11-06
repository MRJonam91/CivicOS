// SPDX-License-Identifier: Apache-2.0
// Copyright (c) 2026 Manoj Rollo (MRJonam91)

import type { CitizenApplication, ExportFormat } from './types.ts';

export class InteroperabilityExporter {
  public static export(applications: CitizenApplication[], format: ExportFormat): string {
    switch (format) {
      case 'json':
        return JSON.stringify(applications, null, 2);

      case 'ndjson':
        return applications.map(app => JSON.stringify(app)).join('\n');

      case 'csv':
        return this.toCsv(applications);

      default:
        throw new Error(`Formato export non supportato: ${format}`);
    }
  }

  private static toCsv(applications: CitizenApplication[]): string {
    const headers = [
      'id',
      'schemaId',
      'status',
      'submittedAt',
      'dueDate',
      'applicantName',
      'applicantEmail',
      'applicantTaxCode',
      'applicantPhone',
      'historyStepsCount',
      'latestAuditHash'
    ];

    const lines: string[] = [headers.join(',')];

    for (const app of applications) {
      const latestAudit = app.auditTrail[app.auditTrail.length - 1];
      const row = [
        this.escapeCsv(app.id),
        this.escapeCsv(app.schemaId),
        this.escapeCsv(app.status),
        this.escapeCsv(app.submittedAt),
        this.escapeCsv(app.dueDate),
        this.escapeCsv(app.applicant.fullName),
        this.escapeCsv(app.applicant.email),
        this.escapeCsv(app.applicant.taxCode || ''),
        this.escapeCsv(app.applicant.phone || ''),
        String(app.history.length),
        this.escapeCsv(latestAudit ? latestAudit.hash : '')
      ];
      lines.push(row.join(','));
    }

    return lines.join('\n');
  }

  private static escapeCsv(value: string): string {
    if (!value) return '""';
    const str = String(value).replace(/"/g, '""');
    return `"${str}"`;
  }
}
