// SPDX-License-Identifier: Apache-2.0
// Copyright (c) 2026 Manoj Rollo (MRJonam91)

export type FieldType =
  | 'text'
  | 'email'
  | 'phone'
  | 'fiscal_code'
  | 'number'
  | 'date'
  | 'select'
  | 'checkbox'
  | 'textarea';

export interface FieldOption {
  label: string;
  value: string;
}

export interface FieldValidationRule {
  required?: boolean;
  min?: number;
  max?: number;
  minLength?: number;
  maxLength?: number;
  pattern?: string;
  customValidator?: string;
  dependsOn?: {
    field: string;
    equals: unknown;
  };
}

export interface CivicAttachmentMetadata {
  id: string;
  filename: string;
  mimeType: string;
  sizeBytes: number;
  sha256Hash: string;
  uploadedAt: string;
}

export interface CivicStorageAdapter {
  loadAll(): Promise<CitizenApplication[]>;
  save(app: CitizenApplication): Promise<void>;
  get(id: string): Promise<CitizenApplication | undefined>;
  delete(id: string): Promise<boolean>;
}

export interface FormFieldDefinition {
  name: string;
  label: string;
  type: FieldType;
  description?: string;
  placeholder?: string;
  required?: boolean;
  options?: FieldOption[];
  validation?: FieldValidationRule;
  defaultValue?: string | number | boolean;
}

export interface CivicFormSchema {
  id: string;
  code: string;
  title: string;
  titleEn?: string;
  description: string;
  category: 'education' | 'public_spaces' | 'urban_maintenance' | 'registry' | 'general';
  competentBody: string; // e.g. "Comune di Esempio - Settore Servizi alla Persona"
  slaDays: number; // Termine procedimento L. 241/90 (es. 30 gg)
  slaCalculationMode?: 'calendar' | 'business'; // Default: 'calendar'
  version: string;
  fields: FormFieldDefinition[];
  createdAt: string;
  metadata?: Record<string, unknown>;
}

export type ApplicationStatus =
  | 'SUBMITTED'
  | 'IN_REVIEW'
  | 'INTEGRATION_REQUESTED'
  | 'APPROVED'
  | 'REJECTED'
  | 'CLOSED';

export interface AuditEntry {
  sequence: number;
  timestamp: string;
  action: string;
  performedBy: string;
  previousHash: string;
  hash: string;
  details?: Record<string, unknown>;
}

export interface CitizenApplication {
  id: string; // PRAT-YYYYMMDD-XXXX
  schemaId: string;
  submittedAt: string;
  updatedAt: string;
  dueDate: string; // calculated according to slaDays
  status: ApplicationStatus;
  applicant: {
    fullName: string;
    email: string;
    phone?: string;
    taxCode?: string; // Codice Fiscale
  };
  data: Record<string, unknown>;
  attachments?: CivicAttachmentMetadata[];
  history: Array<{
    status: ApplicationStatus;
    timestamp: string;
    actor: string;
    note?: string;
  }>;
  auditTrail: AuditEntry[];
}

export interface ApplicationFilterOptions {
  status?: ApplicationStatus;
  schemaId?: string;
  searchQuery?: string; // match in applicant name, email, taxCode or app ID
  fromDate?: string; // ISO date YYYY-MM-DD
  toDate?: string; // ISO date YYYY-MM-DD
  sortBy?: 'submittedAt' | 'dueDate' | 'status';
  sortDirection?: 'asc' | 'desc';
}

export type NotificationChannel = 'email' | 'sms' | 'webhook' | 'io_mock';

export interface NotificationPayload {
  applicationId: string;
  recipient: string;
  channel: NotificationChannel;
  subject: string;
  message: string;
  status: ApplicationStatus;
  metadata?: Record<string, unknown>;
}

export interface NotificationDeliveryRecord {
  id: string;
  timestamp: string;
  channel: NotificationChannel;
  recipient: string;
  subject: string;
  message: string;
  status: 'DELIVERED' | 'FAILED';
  rawResponse?: string;
}

export interface ValidationResult {
  valid: boolean;
  errors: Array<{
    field: string;
    message: string;
    code: string;
  }>;
}

export type ExportFormat = 'json' | 'ndjson' | 'csv';
