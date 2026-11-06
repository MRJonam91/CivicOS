// SPDX-License-Identifier: Apache-2.0
// Copyright (c) 2026 Manoj Rollo (MRJonam91)

import { randomUUID } from 'node:crypto';
import type {
  ApplicationStatus,
  CitizenApplication,
  NotificationChannel,
  NotificationDeliveryRecord,
  NotificationPayload
} from './types.ts';

export interface NotificationHandler {
  send(payload: NotificationPayload): Promise<{ success: boolean; responseMessage: string }>;
}

export class NotificationDispatcher {
  private handlers: Map<NotificationChannel, NotificationHandler> = new Map();
  private deliveryHistory: NotificationDeliveryRecord[] = [];

  constructor() {
    this.registerDefaultHandlers();
  }

  public registerHandler(channel: NotificationChannel, handler: NotificationHandler): void {
    this.handlers.set(channel, handler);
  }

  private registerDefaultHandlers(): void {
    // Simulated mock handlers with realistic PA responses
    this.handlers.set('email', {
      async send(payload) {
        return {
          success: true,
          responseMessage: `[Email Provider] Sent to ${payload.recipient} subject: "${payload.subject}"`
        };
      }
    });

    this.handlers.set('sms', {
      async send(payload) {
        return {
          success: true,
          responseMessage: `[SMS Gateway] Dispatched to ${payload.recipient} (${payload.message.length} chars)`
        };
      }
    });

    this.handlers.set('webhook', {
      async send(payload) {
        return {
          success: true,
          responseMessage: `[Webhook Dispatcher] HTTP 202 Accepted at endpoint ${payload.recipient}`
        };
      }
    });

    this.handlers.set('io_mock', {
      async send(payload) {
        return {
          success: true,
          responseMessage: `[App IO / SEND Mock] Delivered message to citizen fiscal code ${payload.recipient}`
        };
      }
    });
  }

  public async notifyCitizen(
    app: CitizenApplication,
    channels: NotificationChannel[] = ['email']
  ): Promise<NotificationDeliveryRecord[]> {
    const records: NotificationDeliveryRecord[] = [];

    const { subject, message } = this.generateMessageContent(app);

    for (const channel of channels) {
      let recipient = app.applicant.email;
      if (channel === 'sms' && app.applicant.phone) {
        recipient = app.applicant.phone;
      } else if (channel === 'io_mock' && app.applicant.taxCode) {
        recipient = app.applicant.taxCode;
      }

      const payload: NotificationPayload = {
        applicationId: app.id,
        recipient,
        channel,
        subject,
        message,
        status: app.status
      };

      const handler = this.handlers.get(channel);
      let success = false;
      let responseMsg = 'Handler not found';

      if (handler) {
        try {
          const res = await handler.send(payload);
          success = res.success;
          responseMsg = res.responseMessage;
        } catch (err) {
          success = false;
          responseMsg = (err as Error).message;
        }
      }

      const record: NotificationDeliveryRecord = {
        id: randomUUID(),
        timestamp: new Date().toISOString(),
        channel,
        recipient,
        subject,
        message,
        status: success ? 'DELIVERED' : 'FAILED',
        rawResponse: responseMsg
      };

      this.deliveryHistory.push(record);
      records.push(record);
    }

    return records;
  }

  public getHistory(): NotificationDeliveryRecord[] {
    return [...this.deliveryHistory];
  }

  public generateMessageContent(app: CitizenApplication): { subject: string; message: string } {
    const id = app.id;
    switch (app.status) {
      case 'SUBMITTED':
        return {
          subject: `Ricevuta di presentazione istanza ${id}`,
          message: `Gentile ${app.applicant.fullName}, la sua istanza ${id} è stata correttamente acquisita. Termine conclusione procedimento: ${app.dueDate}.`
        };
      case 'IN_REVIEW':
        return {
          subject: `Avvio istruttoria pratica ${id}`,
          message: `Gentile cittadino, l'ente competente ha preso in carico la sua pratica ${id} per le verifiche istruttorie.`
        };
      case 'INTEGRATION_REQUESTED':
        return {
          subject: `Richiesta integrazione documentale pratica ${id}`,
          message: `Attenzione: per la pratica ${id} sono richiesti chiarimenti o documenti integrativi. Verifichi il fascicolo sul portale.`
        };
      case 'APPROVED':
        return {
          subject: `Conclusione positiva e accoglimento pratica ${id}`,
          message: `Gentile ${app.applicant.fullName}, la sua richiesta ${id} è stata approvata con esito favorevole.`
        };
      case 'REJECTED':
        return {
          subject: `Comunicazione esito pratica ${id}`,
          message: `La pratica ${id} si è conclusa con esito non favorevole. I dettagli e le motivazioni sono disponibili nel suo fascicolo.`
        };
      case 'CLOSED':
        return {
          subject: `Archiviazione definitiva pratica ${id}`,
          message: `Il procedimento ${id} è stato archiviato e formalmente chiuso.`
        };
      default:
        return {
          subject: `Aggiornamento stato pratica ${id}`,
          message: `La pratica ${id} è passata allo stato ${app.status}.`
        };
    }
  }
}
