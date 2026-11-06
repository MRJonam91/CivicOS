// SPDX-License-Identifier: Apache-2.0
// Copyright (c) 2026 Manoj Rollo (MRJonam91)

import type { CitizenApplication, CivicFormSchema } from './types.ts';

function escapeHtml(str: string): string {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export class ReceiptGenerator {
  public static generateHtmlReceipt(app: CitizenApplication, schema: CivicFormSchema): string {
    const latestAudit = app.auditTrail[app.auditTrail.length - 1];
    const auditHash = latestAudit ? latestAudit.hash : 'N/A';

    const fieldsRows = Object.entries(app.data)
      .map(([key, val]) => {
        const fieldDef = schema.fields.find(f => f.name === key);
        const label = fieldDef ? fieldDef.label : key;
        const displayVal = typeof val === 'boolean' ? (val ? 'Sì' : 'No') : String(val ?? '');
        return `<tr><td style="padding:8px; border-bottom:1px solid #ddd; font-weight:600; width:40%;">${escapeHtml(label)}</td><td style="padding:8px; border-bottom:1px solid #ddd;">${escapeHtml(displayVal)}</td></tr>`;
      })
      .join('');

    return `<!DOCTYPE html>
<html lang="it">
<head>
  <meta charset="utf-8">
  <title>Ricevuta Ufficiale Presentazione Istanza — ${escapeHtml(app.id)}</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif; padding: 32px; color: #222; max-width: 800px; margin: 0 auto; line-height: 1.5; }
    .header { border-bottom: 2px solid #0969da; padding-bottom: 16px; margin-bottom: 24px; display: flex; justify-content: space-between; align-items: flex-start; }
    .badge { background: #ddf4ff; color: #0969da; border: 1px solid #54aeff; font-family: monospace; font-size: 16px; font-weight: bold; padding: 6px 12px; border-radius: 6px; }
    table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
    .legal-box { background: #f6f8fa; border: 1px solid #d0d7de; border-radius: 6px; padding: 14px; font-size: 12px; color: #57609a; margin-top: 24px; }
    .hash-box { font-family: monospace; font-size: 11px; word-break: break-all; background: #eef1f5; padding: 8px; border-radius: 4px; margin-top: 6px; }
    @media print { .no-print { display: none; } body { padding: 0; } }
  </style>
</head>
<body>
  <div class="no-print" style="margin-bottom: 20px; display:flex; justify-content:space-between;">
    <a href="/" style="color:#0969da; text-decoration:none;">&larr; Torna alla Dashboard</a>
    <button onclick="window.print()" style="background:#0969da; color:#fff; border:none; padding:8px 16px; border-radius:6px; cursor:pointer; font-weight:bold;">🖨️ Stampa Ricevuta Ufficiale</button>
  </div>

  <div class="header">
    <div>
      <h1 style="margin:0 0 6px 0; font-size:22px;">REPUBBLICA ITALIANA</h1>
      <h2 style="margin:0; font-size:16px; color:#57609a;">${escapeHtml(schema.competentBody)}</h2>
      <div style="font-size:13px; color:#656d76; margin-top:4px;">Sportello Telematico Servizi al Cittadino (CivicOS)</div>
    </div>
    <div style="text-align:right;">
      <div class="badge">${escapeHtml(app.id)}</div>
      <div style="font-size:12px; color:#656d76; margin-top:6px;">Data ricezione: ${escapeHtml(app.submittedAt)}</div>
    </div>
  </div>

  <h3 style="color:#0969da; margin-top:0;">Ricevuta di Protocollo ed Avvio del Procedimento</h3>
  <p>Si certifica l'avvenuta trasmissione dell'istanza telematica per il servizio <strong>"${escapeHtml(schema.title)}"</strong> (Cod. ${escapeHtml(schema.code)}).</p>

  <table style="background:#fafbfc; border:1px solid #d0d7de; border-radius:6px; margin-bottom:20px;">
    <tr><td style="padding:8px; font-weight:600; width:40%;">Richiedente:</td><td style="padding:8px;">${escapeHtml(app.applicant.fullName)}</td></tr>
    <tr><td style="padding:8px; font-weight:600;">Codice Fiscale:</td><td style="padding:8px; font-family:monospace;">${escapeHtml(app.applicant.taxCode || 'N/A')}</td></tr>
    <tr><td style="padding:8px; font-weight:600;">Recapito Notifiche:</td><td style="padding:8px;">${escapeHtml(app.applicant.email)}</td></tr>
    <tr><td style="padding:8px; font-weight:600;">Termine Conclusione (SLA L. 241/90):</td><td style="padding:8px;">${schema.slaDays} giorni (Scadenza prevista: <strong>${escapeHtml(app.dueDate)}</strong>)</td></tr>
    <tr><td style="padding:8px; font-weight:600;">Stato Attuale:</td><td style="padding:8px;"><strong>${escapeHtml(app.status)}</strong></td></tr>
  </table>

  <h4 style="margin-bottom:8px;">Dati Dichiarati nell'Istanza:</h4>
  <table>
    <tbody>
      ${fieldsRows}
    </tbody>
  </table>

  <div class="legal-box">
    <strong>Avvertenza Legale e Trasparenza Amministrativa:</strong><br>
    Ai sensi degli artt. 46 e 47 del D.P.R. 28 dicembre 2000, n. 445, il sottoscritto dichiara sotto la propria responsabilità che le informazioni sopra riportate sono veritiere, consapevole delle sanzioni penali richiamate dall'art. 76 per dichiarazioni mendaci.
    <div style="margin-top:8px;">
      <strong>Impronta Crittografica Fascicolo (SHA-256 Tamper-Evident Proof):</strong>
      <div class="hash-box">${escapeHtml(auditHash)}</div>
    </div>
  </div>
</body>
</html>`;
  }
}
