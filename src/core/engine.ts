// SPDX-License-Identifier: Apache-2.0
// Copyright (c) 2026 Manoj Rollo (MRJonam91)

import type {
  ApplicationFilterOptions,
  ApplicationStatus,
  CivicAttachmentMetadata,
  CitizenApplication,
  ExportFormat,
  NotificationChannel,
  NotificationDeliveryRecord,
  ValidationResult
} from './types.ts';
import { SchemaRegistry } from './schemas.ts';
import { FormValidator } from './validator.ts';
import { LifecycleManager } from './lifecycle.ts';
import { AuditChain, GENESIS_PREVIOUS_HASH } from './audit.ts';
import { NotificationDispatcher } from './notifications.ts';
import { InteroperabilityExporter } from './export.ts';
import { ReceiptGenerator } from './receipt.ts';

export interface SubmitApplicationInput {
  schemaId: string;
  applicant: {
    fullName: string;
    email: string;
    phone?: string;
    taxCode?: string;
  };
  data: Record<string, unknown>;
  attachments?: CivicAttachmentMetadata[];
  notifyChannels?: NotificationChannel[];
}

export interface CivicEngineOptions {
  registry?: SchemaRegistry;
}

export class CivicEngine {
  private registry: SchemaRegistry;
  private applications: Map<string, CitizenApplication> = new Map();
  private dispatcher: NotificationDispatcher;

  constructor(options?: CivicEngineOptions) {
    this.registry = options?.registry || new SchemaRegistry();
    this.dispatcher = new NotificationDispatcher();
  }

  public getRegistry(): SchemaRegistry {
    return this.registry;
  }

  public getDispatcher(): NotificationDispatcher {
    return this.dispatcher;
  }

  public validateSubmission(schemaId: string, data: Record<string, unknown>): ValidationResult {
    const schema = this.registry.get(schemaId);
    if (!schema) {
      return {
        valid: false,
        errors: [{ field: 'schemaId', message: `Schema "${schemaId}" non trovato nel registro.`, code: 'SCHEMA_NOT_FOUND' }]
      };
    }
    return FormValidator.validate(schema, data);
  }

  public async submitApplication(input: SubmitApplicationInput): Promise<{
    success: boolean;
    application?: CitizenApplication;
    validation?: ValidationResult;
    notifications?: NotificationDeliveryRecord[];
  }> {
    const schema = this.registry.get(input.schemaId);
    if (!schema) {
      throw new Error(`Schema ${input.schemaId} inesistente.`);
    }

    const validation = FormValidator.validate(schema, input.data);
    if (!validation.valid) {
      return {
        success: false,
        validation
      };
    }

    const now = new Date();
    const nowIso = now.toISOString();
    const id = LifecycleManager.generateApplicationId(now);
    const dueDate = LifecycleManager.calculateDueDate(now, schema.slaDays);

    const initialAudit = AuditChain.createEntry(
      1,
      'APPLICATION_SUBMITTED',
      `citizen:${input.applicant.fullName}`,
      GENESIS_PREVIOUS_HASH,
      {
        schemaId: schema.id,
        schemaCode: schema.code,
        slaDays: schema.slaDays,
        attachmentsCount: input.attachments?.length || 0
      },
      nowIso
    );

    const app: CitizenApplication = {
      id,
      schemaId: schema.id,
      submittedAt: nowIso,
      updatedAt: nowIso,
      dueDate,
      status: 'SUBMITTED',
      applicant: {
        fullName: input.applicant.fullName,
        email: input.applicant.email,
        phone: input.applicant.phone,
        taxCode: input.applicant.taxCode
      },
      data: { ...input.data },
      attachments: input.attachments ? [...input.attachments] : [],
      history: [
        {
          status: 'SUBMITTED',
          timestamp: nowIso,
          actor: `citizen:${input.applicant.fullName}`,
          note: 'Istanza trasmessa telematicamente dal cittadino'
        }
      ],
      auditTrail: [initialAudit]
    };

    this.applications.set(id, app);

    const channels = input.notifyChannels || ['email', 'io_mock'];
    const notifications = await this.dispatcher.notifyCitizen(app, channels);

    return {
      success: true,
      application: app,
      validation,
      notifications
    };
  }

  public getApplication(id: string): CitizenApplication | undefined {
    return this.applications.get(id);
  }

  public listApplications(filter?: ApplicationFilterOptions): CitizenApplication[] {
    let list = Array.from(this.applications.values());

    if (filter?.status) {
      list = list.filter(a => a.status === filter.status);
    }
    if (filter?.schemaId) {
      list = list.filter(a => a.schemaId === filter.schemaId);
    }
    if (filter?.searchQuery) {
      const q = filter.searchQuery.toLowerCase().trim();
      list = list.filter(a =>
        a.id.toLowerCase().includes(q) ||
        a.applicant.fullName.toLowerCase().includes(q) ||
        a.applicant.email.toLowerCase().includes(q) ||
        (a.applicant.taxCode && a.applicant.taxCode.toLowerCase().includes(q))
      );
    }
    if (filter?.fromDate) {
      list = list.filter(a => a.submittedAt >= filter.fromDate!);
    }
    if (filter?.toDate) {
      list = list.filter(a => a.submittedAt.split('T')[0]! <= filter.toDate!);
    }

    if (filter?.sortBy) {
      const dir = filter.sortDirection === 'desc' ? -1 : 1;
      list.sort((a, b) => {
        const valA = a[filter.sortBy!];
        const valB = b[filter.sortBy!];
        if (valA < valB) return -1 * dir;
        if (valA > valB) return 1 * dir;
        return 0;
      });
    }

    return list;
  }

  public async transitionApplication(
    id: string,
    nextStatus: ApplicationStatus,
    actor: string,
    note?: string,
    notifyChannels?: NotificationChannel[]
  ): Promise<{
    application: CitizenApplication;
    notifications: NotificationDeliveryRecord[];
  }> {
    const app = this.applications.get(id);
    if (!app) {
      throw new Error(`Pratica ${id} non trovata.`);
    }

    LifecycleManager.transition(app, nextStatus, actor, note);

    const channels = notifyChannels || ['email', 'io_mock'];
    const notifications = await this.dispatcher.notifyCitizen(app, channels);

    return {
      application: app,
      notifications
    };
  }

  public verifyApplicationAudit(id: string): { valid: boolean; brokenAt?: number; reason?: string } {
    const app = this.applications.get(id);
    if (!app) {
      throw new Error(`Pratica ${id} non trovata.`);
    }
    return AuditChain.verifyChain(app.auditTrail);
  }

  public getReceiptHtml(id: string): string {
    const app = this.applications.get(id);
    if (!app) {
      throw new Error(`Pratica ${id} non trovata.`);
    }
    const schema = this.registry.get(app.schemaId);
    if (!schema) {
      throw new Error(`Schema ${app.schemaId} non trovato.`);
    }
    return ReceiptGenerator.generateHtmlReceipt(app, schema);
  }

  public export(format: ExportFormat, filter?: ApplicationFilterOptions): string {
    const apps = this.listApplications(filter);
    return InteroperabilityExporter.export(apps, format);
  }
}
