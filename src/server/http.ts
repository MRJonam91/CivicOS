// SPDX-License-Identifier: Apache-2.0
// Copyright (c) 2026 Manoj Rollo (MRJonam91)

import { createServer, IncomingMessage, ServerResponse } from 'node:http';
import { CivicEngine } from '../core/engine.ts';
import type { ApplicationFilterOptions, ApplicationStatus, ExportFormat, NotificationChannel } from '../core/types.ts';
import { CpsvApSerializer } from '../interop/cpsv.ts';
import { SlidingWindowRateLimiter } from '../security/rate-limiter.ts';

export function createCivicHttpServer(engine: CivicEngine = new CivicEngine()) {
  const rateLimiter = new SlidingWindowRateLimiter({ windowMs: 60000, maxRequests: 30 });

  const server = createServer(async (req: IncomingMessage, res: ServerResponse) => {
    const parsedUrl = new URL(req.url || '/', `http://${req.headers.host || 'localhost'}`);
    const pathname = parsedUrl.pathname;
    const method = req.method || 'GET';

    // CORS headers for interoperability
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (method === 'OPTIONS') {
      res.writeHead(204);
      res.end();
      return;
    }

    try {
      // Health check with operational metrics
      if (pathname === '/health' && method === 'GET') {
        const schemas = engine.getRegistry().list();
        const apps = engine.listApplications();
        return sendJson(res, 200, {
          status: 'ok',
          service: 'civicos',
          version: '1.0.0',
          timestamp: new Date().toISOString(),
          uptimeSeconds: Math.floor(process.uptime()),
          schemasCount: schemas.length,
          applicationsCount: apps.length
        });
      }

      // API: OpenAPI 3.0 Specification
      if (pathname === '/api/v1/openapi.json' && method === 'GET') {
        return sendJson(res, 200, getOpenApiSpecification());
      }

      // API: List schemas
      if (pathname === '/api/v1/schemas' && method === 'GET') {
        return sendJson(res, 200, { schemas: engine.getRegistry().list() });
      }

      // API: Get schema detail
      if (pathname.startsWith('/api/v1/schemas/') && method === 'GET') {
        const schemaId = pathname.replace('/api/v1/schemas/', '').replace('/cpsv-ap', '');
        const isCpsv = pathname.endsWith('/cpsv-ap');
        const schema = engine.getRegistry().get(schemaId);
        if (!schema) {
          return sendJson(res, 404, { error: `Schema "${schemaId}" not found` });
        }
        if (isCpsv) {
          return sendJson(res, 200, CpsvApSerializer.serializeService(schema));
        }
        return sendJson(res, 200, { schema });
      }

      // API: Export schemas as CPSV-AP Catalog
      if (pathname === '/api/v1/cpsv-ap' && method === 'GET') {
        const schemas = engine.getRegistry().list();
        res.writeHead(200, { 'Content-Type': 'application/ld+json; charset=utf-8' });
        res.end(CpsvApSerializer.serializeCatalog(schemas));
        return;
      }

      // API: Export applications
      if (pathname === '/api/v1/export' && method === 'GET') {
        const format = (parsedUrl.searchParams.get('format') || 'json') as ExportFormat;
        const status = (parsedUrl.searchParams.get('status') || undefined) as ApplicationStatus | undefined;
        const schemaId = parsedUrl.searchParams.get('schemaId') || undefined;
        const searchQuery = parsedUrl.searchParams.get('q') || undefined;

        const content = engine.export(format, { status, schemaId, searchQuery });
        let contentType = 'application/json';
        if (format === 'csv') contentType = 'text/csv; charset=utf-8';
        if (format === 'ndjson') contentType = 'application/x-ndjson';

        res.writeHead(200, { 'Content-Type': contentType });
        res.end(content);
        return;
      }

      // API: List applications with advanced filters
      if (pathname === '/api/v1/applications' && method === 'GET') {
        const filter: ApplicationFilterOptions = {
          status: (parsedUrl.searchParams.get('status') || undefined) as ApplicationStatus | undefined,
          schemaId: parsedUrl.searchParams.get('schemaId') || undefined,
          searchQuery: parsedUrl.searchParams.get('q') || undefined,
          fromDate: parsedUrl.searchParams.get('from') || undefined,
          toDate: parsedUrl.searchParams.get('to') || undefined,
          sortBy: (parsedUrl.searchParams.get('sortBy') || undefined) as any,
          sortDirection: (parsedUrl.searchParams.get('sortDir') || undefined) as any
        };

        const list = engine.listApplications(filter);
        return sendJson(res, 200, { count: list.length, applications: list });
      }

      // API: Submit application
      if (pathname === '/api/v1/applications' && method === 'POST') {
        const clientIp = req.socket.remoteAddress || 'unknown';
        const rateCheck = rateLimiter.check(clientIp);
        if (!rateCheck.allowed) {
          res.setHeader('Retry-After', Math.ceil(rateCheck.resetMs / 1000));
          return sendJson(res, 429, {
            error: 'Too many requests. Please wait before submitting another civic application.',
            resetMs: rateCheck.resetMs
          });
        }

        const body = await parseJsonBody(req);
        if (!body.schemaId || !body.applicant || !body.data) {
          return sendJson(res, 400, { error: 'Missing required parameters: schemaId, applicant, data' });
        }

        const result = await engine.submitApplication({
          schemaId: body.schemaId,
          applicant: body.applicant,
          data: body.data,
          attachments: body.attachments,
          notifyChannels: body.notifyChannels as NotificationChannel[]
        });

        if (!result.success) {
          return sendJson(res, 422, {
            error: 'Validation failed',
            validation: result.validation
          });
        }

        return sendJson(res, 201, result);
      }

      // API: Transition application status
      if (pathname.match(/^\/api\/v1\/applications\/([^\/]+)\/transition$/) && method === 'POST') {
        const matches = pathname.match(/^\/api\/v1\/applications\/([^\/]+)\/transition$/);
        const id = matches?.[1];
        if (!id) {
          return sendJson(res, 400, { error: 'Invalid application ID in URL' });
        }
        const body = await parseJsonBody(req);

        if (!body.status || !body.actor) {
          return sendJson(res, 400, { error: 'Missing required fields: status, actor' });
        }

        try {
          const result = await engine.transitionApplication(
            id,
            body.status as ApplicationStatus,
            body.actor,
            body.note,
            body.notifyChannels as NotificationChannel[]
          );
          return sendJson(res, 200, result);
        } catch (err) {
          return sendJson(res, 400, { error: (err as Error).message });
        }
      }

      // API: Verify application audit
      if (pathname.match(/^\/api\/v1\/applications\/([^\/]+)\/verify$/) && method === 'GET') {
        const matches = pathname.match(/^\/api\/v1\/applications\/([^\/]+)\/verify$/);
        const id = matches?.[1];
        if (!id) {
          return sendJson(res, 400, { error: 'Invalid application ID in URL' });
        }
        try {
          const audit = engine.verifyApplicationAudit(id);
          return sendJson(res, 200, { applicationId: id, audit });
        } catch (err) {
          return sendJson(res, 404, { error: (err as Error).message });
        }
      }

      // API: Get printable official receipt HTML
      if (pathname.match(/^\/api\/v1\/applications\/([^\/]+)\/receipt$/) && method === 'GET') {
        const matches = pathname.match(/^\/api\/v1\/applications\/([^\/]+)\/receipt$/);
        const id = matches?.[1];
        if (!id) {
          return sendJson(res, 400, { error: 'Invalid application ID in URL' });
        }
        try {
          const receiptHtml = engine.getReceiptHtml(id);
          res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
          res.end(receiptHtml);
          return;
        } catch (err) {
          return sendJson(res, 404, { error: (err as Error).message });
        }
      }

      // UI: Direct web page for receipt
      if (pathname.startsWith('/receipts/') && method === 'GET') {
        const id = pathname.replace('/receipts/', '');
        try {
          const receiptHtml = engine.getReceiptHtml(id);
          res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
          res.end(receiptHtml);
          return;
        } catch (err) {
          res.writeHead(404, { 'Content-Type': 'text/html; charset=utf-8' });
          res.end(`<h1>404 — Pratica non trovata</h1><p>${(err as Error).message}</p><p><a href="/">Torna alla Home</a></p>`);
          return;
        }
      }

      // API: Get application detail JSON
      if (pathname.startsWith('/api/v1/applications/') && method === 'GET') {
        const id = pathname.replace('/api/v1/applications/', '');
        const app = engine.getApplication(id);
        if (!app) {
          return sendJson(res, 404, { error: `Application ${id} not found` });
        }
        return sendJson(res, 200, { application: app });
      }

      // UI: Application Detail and Case Management page
      if (pathname.startsWith('/applications/') && method === 'GET') {
        const id = pathname.replace('/applications/', '');
        const app = engine.getApplication(id);
        if (!app) {
          res.writeHead(404, { 'Content-Type': 'text/html; charset=utf-8' });
          res.end('<h1>404 — Pratica non trovata</h1><p><a href="/">Torna alla Dashboard</a></p>');
          return;
        }
        const schema = engine.getRegistry().get(app.schemaId);
        const auditStatus = engine.verifyApplicationAudit(id);
        res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
        res.end(renderApplicationDetailHtml(app, schema, auditStatus));
        return;
      }

      // API: Notifications history
      if (pathname === '/api/v1/notifications' && method === 'GET') {
        return sendJson(res, 200, { notifications: engine.getDispatcher().getHistory() });
      }

      // UI: Interactive Public Form submission page
      if (pathname.startsWith('/forms/') && method === 'GET') {
        const schemaId = pathname.replace('/forms/', '');
        const schema = engine.getRegistry().get(schemaId);
        if (!schema) {
          res.writeHead(404, { 'Content-Type': 'text/html; charset=utf-8' });
          res.end('<h1>404 — Modulo civico non trovato</h1><p><a href="/">Torna alla Home</a></p>');
          return;
        }
        res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
        res.end(renderFormHtml(schema));
        return;
      }

      // UI: Web Portal Dashboard
      if (pathname === '/' && method === 'GET') {
        const schemas = engine.getRegistry().list();
        const searchQuery = parsedUrl.searchParams.get('q') || undefined;
        const statusFilter = (parsedUrl.searchParams.get('status') || undefined) as ApplicationStatus | undefined;
        const apps = engine.listApplications({ searchQuery, status: statusFilter });
        res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
        res.end(renderDashboardHtml(schemas, apps, searchQuery, statusFilter));
        return;
      }

      // 404 for unknown paths
      return sendJson(res, 404, { error: 'Not found' });
    } catch (err) {
      return sendJson(res, 500, { error: 'Internal server error', details: (err as Error).message });
    }
  });

  return server;
}

function sendJson(res: ServerResponse, statusCode: number, data: unknown): void {
  res.writeHead(statusCode, { 'Content-Type': 'application/json; charset=utf-8' });
  res.end(JSON.stringify(data, null, 2));
}

function parseJsonBody(req: IncomingMessage): Promise<any> {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', chunk => {
      body += chunk;
      if (body.length > 2 * 1024 * 1024) {
        reject(new Error('Payload too large'));
      }
    });
    req.on('end', () => {
      try {
        resolve(body ? JSON.parse(body) : {});
      } catch (err) {
        reject(new Error('Invalid JSON payload'));
      }
    });
    req.on('error', reject);
  });
}

function renderDashboardHtml(schemas: any[], apps: any[], searchQuery?: string, statusFilter?: string): string {
  const schemaListHtml = schemas
    .map(
      s => `
    <div style="border:1px solid #d0d7de; border-radius:6px; padding:16px; margin-bottom:12px; background:#ffffff;">
      <div style="display:flex; justify-content:space-between; align-items:center;">
        <h3 style="margin:0 0 6px 0; color:#0969da;">${escapeHtml(s.title)}</h3>
        <span style="background:#eef1f5; font-size:12px; padding:3px 8px; border-radius:12px; font-weight:600;">Codice: ${escapeHtml(s.code)}</span>
      </div>
      <p style="margin:4px 0 10px 0; color:#57609a; font-size:14px;">${escapeHtml(s.description)}</p>
      <div style="font-size:13px; color:#656d76; margin-bottom:12px;">
        <strong>Ente:</strong> ${escapeHtml(s.competentBody)} &bull; 
        <strong>Termine procedimento (L. 241/90):</strong> ${s.slaDays} giorni
      </div>
      <a href="/forms/${escapeHtml(s.id)}" style="display:inline-block; background:#1f883d; color:#fff; padding:6px 14px; text-decoration:none; border-radius:6px; font-size:13px; font-weight:600;">Compila Modulo Istanza &rarr;</a>
    </div>`
    )
    .join('');

  const countSubmitted = apps.filter(a => a.status === 'SUBMITTED').length;
  const countInReview = apps.filter(a => a.status === 'IN_REVIEW' || a.status === 'INTEGRATION_REQUESTED').length;
  const countApproved = apps.filter(a => a.status === 'APPROVED').length;
  const countClosed = apps.filter(a => a.status === 'REJECTED' || a.status === 'CLOSED').length;

  const metricsHtml = `
    <div style="display:grid; grid-template-columns:repeat(4, 1fr); gap:12px; margin-bottom:20px;">
      <div style="background:#fff; border:1px solid #d0d7de; border-radius:6px; padding:12px; text-align:center;">
        <div style="font-size:22px; font-weight:bold; color:#0969da;">${countSubmitted}</div>
        <div style="font-size:12px; color:#57609a; font-weight:600;">In Attesa Presa in Carico</div>
      </div>
      <div style="background:#fff; border:1px solid #d0d7de; border-radius:6px; padding:12px; text-align:center;">
        <div style="font-size:22px; font-weight:bold; color:#9a6700;">${countInReview}</div>
        <div style="font-size:12px; color:#57609a; font-weight:600;">Istruttoria Attiva</div>
      </div>
      <div style="background:#fff; border:1px solid #d0d7de; border-radius:6px; padding:12px; text-align:center;">
        <div style="font-size:22px; font-weight:bold; color:#1a7f37;">${countApproved}</div>
        <div style="font-size:12px; color:#57609a; font-weight:600;">Istanze Accolte</div>
      </div>
      <div style="background:#fff; border:1px solid #d0d7de; border-radius:6px; padding:12px; text-align:center;">
        <div style="font-size:22px; font-weight:bold; color:#656d76;">${countClosed}</div>
        <div style="font-size:12px; color:#57609a; font-weight:600;">Chiuse / Archiviate</div>
      </div>
    </div>`;

  const appRowsHtml =
    apps.length === 0
      ? '<tr><td colspan="6" style="padding:14px; text-align:center; color:#656d76;">Nessuna istanza civica trovata con i filtri selezionati. Compila uno dei moduli sopra per avviare un procedimento!</td></tr>'
      : apps
          .map(
            a => `
    <tr style="border-bottom:1px solid #e1e4e8;">
      <td style="padding:10px; font-family:monospace; font-weight:bold;"><a href="/applications/${escapeHtml(a.id)}" style="color:#0969da; text-decoration:none;">${escapeHtml(a.id)}</a></td>
      <td style="padding:10px;">${escapeHtml(a.schemaId)}</td>
      <td style="padding:10px;">${escapeHtml(a.applicant.fullName)} (${escapeHtml(a.applicant.taxCode || 'N/A')})</td>
      <td style="padding:10px;">
        <span style="padding:3px 8px; border-radius:12px; font-size:12px; font-weight:bold; ${getStatusBadgeStyle(a.status)}">${escapeHtml(a.status)}</span>
      </td>
      <td style="padding:10px; font-size:13px; color:#57609a;">Scadenza: ${escapeHtml(a.dueDate)}</td>
      <td style="padding:10px;">
        <a href="/applications/${escapeHtml(a.id)}" style="color:#0969da; text-decoration:none; font-size:13px; font-weight:600; margin-right:8px;">Fascicolo &rarr;</a>
        <a href="/receipts/${escapeHtml(a.id)}" target="_blank" style="color:#1f883d; text-decoration:none; font-size:13px;">Ricevuta</a>
      </td>
    </tr>`
          )
          .join('');

  return `<!DOCTYPE html>
<html lang="it">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>CivicOS — Sportello Telematico e Modulistica Civica</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; background:#f6f8fa; margin:0; padding:24px; color:#1f2328; }
    .container { max-width: 980px; margin: 0 auto; }
    header { background:#0969da; color:#ffffff; padding:20px; border-radius:8px; margin-bottom:24px; box-shadow:0 1px 3px rgba(0,0,0,0.1); }
    h1 { margin:0 0 6px 0; font-size:24px; }
    h2 { font-size:18px; margin-top:28px; margin-bottom:14px; border-bottom:2px solid #e1e4e8; padding-bottom:6px; }
    table { width:100%; border-collapse:collapse; background:#ffffff; border-radius:6px; overflow:hidden; box-shadow:0 1px 3px rgba(0,0,0,0.05); }
    th { background:#f6f8fa; text-align:left; padding:12px 10px; font-size:13px; color:#57609a; border-bottom:1px solid #d0d7de; }
    .export-bar { margin: 12px 0; display:flex; gap:10px; align-items:center; }
    .btn { display:inline-block; padding:6px 12px; border-radius:6px; text-decoration:none; font-size:13px; font-weight:600; border:1px solid #d0d7de; background:#f6f8fa; color:#24292f; }
    .btn:hover { background:#eaeef2; }
    .search-bar { background:#fff; padding:12px; border-radius:6px; border:1px solid #d0d7de; margin-bottom:16px; display:flex; gap:10px; align-items:center; }
  </style>
</head>
<body>
  <div class="container">
    <header>
      <h1>🏛️ CivicOS — Digital Public Goods Engine</h1>
      <p style="margin:0; opacity:0.9; font-size:14px;">Motore open source per modulistica civica, ciclo di vita procedimenti e notifiche interoperabili (Apache-2.0).</p>
    </header>

    <h2>📋 Modelli di Servizio Civico Disponibili</h2>
    ${schemaListHtml}

    <div style="display:flex; justify-content:space-between; align-items:flex-end;">
      <h2>📁 Istanze e Procedimenti Amministrativi (${apps.length})</h2>
      <div class="export-bar">
        <span style="font-size:13px; color:#57609a;">Export:</span>
        <a class="btn" href="/api/v1/export?format=json" target="_blank">JSON</a>
        <a class="btn" href="/api/v1/export?format=csv" target="_blank">CSV OpenData</a>
        <a class="btn" href="/api/v1/export?format=ndjson" target="_blank">NDJSON</a>
        <a class="btn" href="/api/v1/cpsv-ap" target="_blank" style="background:#f0f8ff; color:#0969da; border-color:#54aeff;">🇪🇺 CPSV-AP</a>
      </div>
    </div>

    ${metricsHtml}

    <form method="GET" action="/" class="search-bar">
      <input type="text" name="q" placeholder="Cerca per codice pratica, richiedente, codice fiscale o email..." value="${escapeHtml(searchQuery || '')}" style="flex:1; padding:8px; border:1px solid #d0d7de; border-radius:6px; font-size:14px;">
      <select name="status" style="padding:8px; border:1px solid #d0d7de; border-radius:6px; font-size:14px;">
        <option value="">Tutti gli stati</option>
        <option value="SUBMITTED" ${statusFilter === 'SUBMITTED' ? 'selected' : ''}>SUBMITTED</option>
        <option value="IN_REVIEW" ${statusFilter === 'IN_REVIEW' ? 'selected' : ''}>IN_REVIEW</option>
        <option value="INTEGRATION_REQUESTED" ${statusFilter === 'INTEGRATION_REQUESTED' ? 'selected' : ''}>INTEGRATION_REQUESTED</option>
        <option value="APPROVED" ${statusFilter === 'APPROVED' ? 'selected' : ''}>APPROVED</option>
        <option value="REJECTED" ${statusFilter === 'REJECTED' ? 'selected' : ''}>REJECTED</option>
        <option value="CLOSED" ${statusFilter === 'CLOSED' ? 'selected' : ''}>CLOSED</option>
      </select>
      <button type="submit" class="btn" style="background:#0969da; color:#fff; border-color:#0969da; cursor:pointer;">Filtra</button>
      <a href="/" class="btn">Reset</a>
    </form>

    <table>
      <thead>
        <tr>
          <th>Codice Pratica</th>
          <th>Servizio</th>
          <th>Richiedente</th>
          <th>Stato</th>
          <th>SLA Procedimento</th>
          <th>Azioni</th>
        </tr>
      </thead>
      <tbody>
        ${appRowsHtml}
      </tbody>
    </table>
  </div>
</body>
</html>`;
}

function renderApplicationDetailHtml(app: any, schema: any, auditStatus: any): string {
  const auditBadge = auditStatus.valid
    ? `<span style="background:#dafbe1; color:#1a7f37; border:1px solid #4ac26b; padding:4px 8px; border-radius:12px; font-size:12px; font-weight:bold;">✓ Catena Crittografica Integra (SHA-256 Verified)</span>`
    : `<span style="background:#ffebe9; color:#cf222e; border:1px solid #ff8182; padding:4px 8px; border-radius:12px; font-size:12px; font-weight:bold;">✗ Catena Compromessa</span>`;

  const timelineHtml = app.history
    .map(
      (h: any) => `
    <li style="margin-bottom:12px;">
      <strong style="color:#0969da;">${escapeHtml(h.status)}</strong> &bull; <span style="font-size:12px; color:#57609a;">${escapeHtml(h.timestamp)}</span><br>
      <span style="font-size:13px; color:#24292f;">Attore: <code>${escapeHtml(h.actor)}</code></span>
      ${h.note ? `<div style="font-size:13px; color:#57609a; margin-top:2px; font-style:italic;">Nota: "${escapeHtml(h.note)}"</div>` : ''}
    </li>`
    )
    .join('');

  const auditBlocksHtml = app.auditTrail
    .map(
      (b: any) => `
    <div style="font-family:monospace; font-size:12px; background:#f6f8fa; border:1px solid #d0d7de; padding:8px; border-radius:4px; margin-bottom:6px;">
      Block #${b.sequence} &bull; ${escapeHtml(b.action)} &bull; ${escapeHtml(b.performedBy)}<br>
      Hash: <span style="color:#0969da;">${escapeHtml(b.hash)}</span><br>
      Prev: <span style="color:#656d76;">${escapeHtml(b.previousHash)}</span>
    </div>`
    )
    .join('');

  return `<!DOCTYPE html>
<html lang="it">
<head>
  <meta charset="utf-8">
  <title>Fascicolo Pratica ${escapeHtml(app.id)} — CivicOS</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; background:#f6f8fa; margin:0; padding:24px; color:#1f2328; }
    .card { max-width: 860px; margin: 0 auto; background:#fff; padding:24px; border-radius:8px; border:1px solid #d0d7de; }
    h1 { font-size:22px; color:#0969da; margin:0; }
    .header-row { display:flex; justify-content:space-between; align-items:center; margin-bottom:16px; border-bottom:1px solid #e1e4e8; padding-bottom:12px; }
    .grid { display:grid; grid-template-columns: 1fr 1fr; gap:16px; margin-bottom:20px; }
    .section { border:1px solid #e1e4e8; border-radius:6px; padding:16px; }
    .btn { display:inline-block; padding:8px 14px; border-radius:6px; text-decoration:none; font-size:13px; font-weight:600; cursor:pointer; }
    .btn-primary { background:#0969da; color:#fff; border:none; }
  </style>
</head>
<body>
  <div class="card">
    <div style="margin-bottom:12px; display:flex; justify-content:space-between;">
      <a href="/" style="color:#0969da; text-decoration:none; font-size:14px;">&larr; Torna alla Dashboard</a>
      <a href="/receipts/${escapeHtml(app.id)}" target="_blank" class="btn" style="background:#1f883d; color:#fff;">🖨️ Stampa Ricevuta Ufficiale</a>
    </div>

    <div class="header-row">
      <div>
        <h1>Fascicolo: ${escapeHtml(app.id)}</h1>
        <div style="font-size:14px; color:#57609a; margin-top:4px;">Servizio: ${escapeHtml(schema ? schema.title : app.schemaId)}</div>
      </div>
      <div>
        ${auditBadge}
      </div>
    </div>

    <div class="grid">
      <div class="section">
        <h3 style="margin-top:0; font-size:15px; color:#24292f;">Dati del Procedimento</h3>
        <p style="font-size:13px; margin:4px 0;"><strong>Richiedente:</strong> ${escapeHtml(app.applicant.fullName)}</p>
        <p style="font-size:13px; margin:4px 0;"><strong>Codice Fiscale:</strong> <code>${escapeHtml(app.applicant.taxCode || 'N/A')}</code></p>
        <p style="font-size:13px; margin:4px 0;"><strong>Email:</strong> ${escapeHtml(app.applicant.email)}</p>
        <p style="font-size:13px; margin:4px 0;"><strong>Stato Attuale:</strong> <span style="font-weight:bold; ${getStatusBadgeStyle(app.status)} padding:2px 6px; border-radius:10px;">${escapeHtml(app.status)}</span></p>
        <p style="font-size:13px; margin:4px 0;"><strong>Termine Conclusione (SLA):</strong> ${escapeHtml(app.dueDate)}</p>
      </div>

      <div class="section">
        <h3 style="margin-top:0; font-size:15px; color:#24292f;">Azione Istruttoria (Operatore PA)</h3>
        <form id="transitionForm">
          <div style="margin-bottom:8px;">
            <label style="display:block; font-size:12px; font-weight:600;">Nuovo Stato:</label>
            <select name="status" style="width:100%; padding:6px; border:1px solid #d0d7de; border-radius:4px;">
              <option value="IN_REVIEW">IN_REVIEW (Presa in carico)</option>
              <option value="INTEGRATION_REQUESTED">INTEGRATION_REQUESTED (Richiesta integrazioni)</option>
              <option value="APPROVED">APPROVED (Accoglimento con esito favorevole)</option>
              <option value="REJECTED">REJECTED (Diniego / Esito negativo)</option>
              <option value="CLOSED">CLOSED (Chiusura procedimento)</option>
            </select>
          </div>
          <div style="margin-bottom:8px;">
            <label style="display:block; font-size:12px; font-weight:600;">Operatore / Istruttore:</label>
            <input type="text" name="actor" required value="officer:Istruttore" style="width:100%; padding:6px; border:1px solid #d0d7de; border-radius:4px;">
          </div>
          <div style="margin-bottom:8px;">
            <label style="display:block; font-size:12px; font-weight:600;">Note Istruttorie:</label>
            <input type="text" name="note" placeholder="es. Requisiti verificati con esito positivo..." style="width:100%; padding:6px; border:1px solid #d0d7de; border-radius:4px;">
          </div>
          <button type="submit" class="btn btn-primary">Registra Transizione &rarr;</button>
          <span id="transFeedback" style="font-size:12px; margin-left:8px;"></span>
        </form>
      </div>
    </div>

    <div class="section" style="margin-bottom:16px;">
      <h3 style="margin-top:0; font-size:15px; color:#24292f;">Dichiarazioni rese nel Modulo:</h3>
      <pre style="background:#f6f8fa; padding:12px; border-radius:6px; font-size:13px; overflow:auto;">${escapeHtml(JSON.stringify(app.data, null, 2))}</pre>
    </div>

    <div class="section" style="margin-bottom:16px;">
      <h3 style="margin-top:0; font-size:15px; color:#24292f;">Cronologia del Procedimento (Timeline)</h3>
      <ul style="padding-left:20px; margin:0;">
        ${timelineHtml}
      </ul>
    </div>

    <div class="section">
      <h3 style="margin-top:0; font-size:15px; color:#24292f;">Registro Immutabile di Audit (SHA-256 Hash Chain)</h3>
      ${auditBlocksHtml}
    </div>
  </div>

  <script>
    document.getElementById('transitionForm').addEventListener('submit', async function(e) {
      e.preventDefault();
      const fb = document.getElementById('transFeedback');
      fb.style.color = '#57609a';
      fb.textContent = 'Aggiornamento in corso...';
      const formData = new FormData(this);

      try {
        const res = await fetch('/api/v1/applications/${escapeHtml(app.id)}/transition', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            status: formData.get('status'),
            actor: formData.get('actor'),
            note: formData.get('note')
          })
        });
        const json = await res.json();
        if (res.ok) {
          fb.style.color = '#1f883d';
          fb.textContent = 'Stato aggiornato!';
          setTimeout(() => location.reload(), 1000);
        } else {
          fb.style.color = '#cf222e';
          fb.textContent = 'Errore: ' + (json.error || 'Operazione non consentita');
        }
      } catch (err) {
        fb.style.color = '#cf222e';
        fb.textContent = 'Errore di connessione.';
      }
    });
  </script>
</body>
</html>`;
}

function renderFormHtml(schema: any): string {
  const fieldsHtml = schema.fields
    .map((f: any) => {
      const requiredMark = f.required ? '<span style="color:#cf222e;">*</span>' : '';
      let inputHtml = '';

      if (f.type === 'select') {
        const opts = (f.options || [])
          .map((o: any) => `<option value="${escapeHtml(o.value)}">${escapeHtml(o.label)}</option>`)
          .join('');
        inputHtml = `<select name="${escapeHtml(f.name)}" style="width:100%; padding:8px; border:1px solid #d0d7de; border-radius:6px;" ${f.required ? 'required' : ''}>${opts}</select>`;
      } else if (f.type === 'textarea') {
        inputHtml = `<textarea name="${escapeHtml(f.name)}" placeholder="${escapeHtml(f.placeholder || '')}" rows="3" style="width:100%; padding:8px; border:1px solid #d0d7de; border-radius:6px;" ${f.required ? 'required' : ''}></textarea>`;
      } else if (f.type === 'checkbox') {
        inputHtml = `<label style="display:flex; align-items:center; gap:8px; cursor:pointer;"><input type="checkbox" name="${escapeHtml(f.name)}" value="true"> ${escapeHtml(f.label)}</label>`;
      } else {
        const inputType = f.type === 'number' ? 'number' : f.type === 'date' ? 'date' : 'text';
        inputHtml = `<input type="${inputType}" name="${escapeHtml(f.name)}" placeholder="${escapeHtml(f.placeholder || '')}" style="width:100%; padding:8px; border:1px solid #d0d7de; border-radius:6px;" ${f.required ? 'required' : ''}>`;
      }

      return `
      <div style="margin-bottom:14px;">
        <label style="display:block; font-weight:600; font-size:14px; margin-bottom:4px; color:#24292f;">
          ${escapeHtml(f.label)} ${requiredMark}
        </label>
        ${inputHtml}
      </div>`;
    })
    .join('');

  return `<!DOCTYPE html>
<html lang="it">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeHtml(schema.title)} — CivicOS</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; background:#f6f8fa; margin:0; padding:24px; color:#1f2328; }
    .card { max-width: 680px; margin: 0 auto; background:#ffffff; padding:24px; border-radius:8px; border:1px solid #d0d7de; box-shadow:0 1px 3px rgba(0,0,0,0.05); }
    h1 { font-size:20px; color:#0969da; margin-top:0; }
    fieldset { border:1px solid #e1e4e8; border-radius:6px; padding:16px; margin-bottom:16px; }
    legend { font-weight:600; font-size:13px; color:#57609a; padding:0 6px; }
    .btn-submit { background:#1f883d; color:#ffffff; font-weight:600; border:none; padding:10px 20px; border-radius:6px; cursor:pointer; font-size:14px; }
    .btn-submit:hover { background:#1a7f37; }
  </style>
</head>
<body>
  <div class="card">
    <a href="/" style="color:#0969da; text-decoration:none; font-size:13px;">&larr; Torna alla Dashboard</a>
    <h1>${escapeHtml(schema.title)}</h1>
    <p style="color:#57609a; font-size:14px; margin-bottom:18px;">${escapeHtml(schema.description)}</p>
    <div style="background:#f0f8ff; padding:10px; border-radius:6px; font-size:13px; margin-bottom:16px;">
      <strong>Competenza:</strong> ${escapeHtml(schema.competentBody)} &bull; 
      <strong>Termine conclusione:</strong> ${schema.slaDays} giorni ex L. 241/90
    </div>

    <form id="civicForm">
      <fieldset>
        <legend>Dati del Richiedente (Cittadino / Delegato)</legend>
        <div style="margin-bottom:10px;">
          <label style="display:block; font-size:13px; font-weight:600;">Nome e Cognome *</label>
          <input type="text" name="applicant_fullName" required style="width:100%; padding:8px; border:1px solid #d0d7de; border-radius:6px;" placeholder="es. Mario Rossi">
        </div>
        <div style="margin-bottom:10px;">
          <label style="display:block; font-size:13px; font-weight:600;">Codice Fiscale *</label>
          <input type="text" name="applicant_taxCode" required style="width:100%; padding:8px; border:1px solid #d0d7de; border-radius:6px;" placeholder="RSSMRA85M01H501Q">
        </div>
        <div style="margin-bottom:10px;">
          <label style="display:block; font-size:13px; font-weight:600;">Email / PEC per notifiche *</label>
          <input type="email" name="applicant_email" required style="width:100%; padding:8px; border:1px solid #d0d7de; border-radius:6px;" placeholder="mario.rossi@example.com">
        </div>
        <div style="margin-bottom:10px;">
          <label style="display:block; font-size:13px; font-weight:600;">Recapito Telefonico (SMS / App IO)</label>
          <input type="tel" name="applicant_phone" style="width:100%; padding:8px; border:1px solid #d0d7de; border-radius:6px;" placeholder="+39 340 1234567">
        </div>
      </fieldset>

      <fieldset>
        <legend>Dati Specifici dell'Istanza</legend>
        ${fieldsHtml}
      </fieldset>

      <div style="margin-top:20px; display:flex; justify-content:space-between; align-items:center;">
        <button type="submit" class="btn-submit">Invia Istanza Telematica &rarr;</button>
        <span id="formFeedback" style="font-size:13px; font-weight:600;"></span>
      </div>
    </form>
  </div>

  <script>
    document.getElementById('civicForm').addEventListener('submit', async function(e) {
      e.preventDefault();
      const fb = document.getElementById('formFeedback');
      fb.style.color = '#57609a';
      fb.textContent = 'Trasmissione in corso...';

      const formData = new FormData(this);
      const applicant = {
        fullName: formData.get('applicant_fullName'),
        taxCode: formData.get('applicant_taxCode'),
        email: formData.get('applicant_email'),
        phone: formData.get('applicant_phone')
      };

      const data = {};
      for (const [key, val] of formData.entries()) {
        if (!key.startsWith('applicant_')) {
          data[key] = val;
        }
      }

      try {
        const res = await fetch('/api/v1/applications', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            schemaId: '${escapeHtml(schema.id)}',
            applicant: applicant,
            data: data
          })
        });

        const json = await res.json();
        if (res.ok) {
          fb.style.color = '#1f883d';
          fb.innerHTML = 'Istanza inviata con successo! Protocollo: <strong>' + json.application.id + '</strong>. Reindirizzamento...';
          setTimeout(() => { window.location.href = '/applications/' + json.application.id; }, 1500);
        } else {
          fb.style.color = '#cf222e';
          fb.textContent = 'Errore validazione: ' + (json.validation ? json.validation.errors.map(e => e.message).join('; ') : json.error);
        }
      } catch (err) {
        fb.style.color = '#cf222e';
        fb.textContent = 'Errore di connessione al server.';
      }
    });
  </script>
</body>
</html>`;
}

function escapeHtml(str: string): string {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function getStatusBadgeStyle(status: string): string {
  switch (status) {
    case 'SUBMITTED':
      return 'background:#ddf4ff; color:#0969da; border:1px solid #54aeff;';
    case 'IN_REVIEW':
      return 'background:#fff8c5; color:#9a6700; border:1px solid #d4a72c;';
    case 'INTEGRATION_REQUESTED':
      return 'background:#fff1e5; color:#bc4c00; border:1px solid #fb8f44;';
    case 'APPROVED':
      return 'background:#dafbe1; color:#1a7f37; border:1px solid #4ac26b;';
    case 'REJECTED':
      return 'background:#ffebe9; color:#cf222e; border:1px solid #ff8182;';
    case 'CLOSED':
      return 'background:#eaeef2; color:#57609a; border:1px solid #8c959f;';
    default:
      return 'background:#f6f8fa; color:#24292f;';
  }
}

export function getOpenApiSpecification(): Record<string, unknown> {
  return {
    openapi: '3.0.3',
    info: {
      title: 'CivicOS REST API',
      version: '1.0.0',
      description: 'API aperta per la gestione di procedimenti civici, modulistica e notifiche della PA.'
    },
    paths: {
      '/health': {
        get: {
          summary: 'Health and operational status',
          responses: { '200': { description: 'Service operational' } }
        }
      },
      '/api/v1/schemas': {
        get: {
          summary: 'List available civic form schemas',
          responses: { '200': { description: 'List of schemas' } }
        }
      },
      '/api/v1/applications': {
        get: {
          summary: 'List or search civic applications',
          parameters: [
            { name: 'status', in: 'query', schema: { type: 'string' } },
            { name: 'q', in: 'query', schema: { type: 'string' } }
          ],
          responses: { '200': { description: 'Applications list' } }
        },
        post: {
          summary: 'Submit a new citizen application',
          responses: {
            '201': { description: 'Application submitted successfully' },
            '422': { description: 'Validation errors' }
          }
        }
      },
      '/api/v1/applications/{id}/transition': {
        post: {
          summary: 'Transition an application to a new status',
          responses: { '200': { description: 'Transition successful' } }
        }
      },
      '/api/v1/applications/{id}/receipt': {
        get: {
          summary: 'Official protocol receipt (HTML / printable)',
          responses: { '200': { description: 'HTML receipt' } }
        }
      },
      '/api/v1/export': {
        get: {
          summary: 'Export applications in JSON, NDJSON or Open Data CSV',
          responses: { '200': { description: 'Export stream' } }
        }
      },
      '/api/v1/cpsv-ap': {
        get: {
          summary: 'European Core Public Service Vocabulary catalog in JSON-LD',
          responses: { '200': { description: 'CPSV-AP catalog' } }
        }
      }
    }
  };
}
