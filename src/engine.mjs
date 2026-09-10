import { mkdirSync, readFileSync, writeFileSync, renameSync, openSync, closeSync, unlinkSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { randomUUID, createHash } from 'node:crypto';
import { operations, quote, dollars, round } from './operations.mjs';
import { interpretVerification } from './email-verification.mjs';
const idPattern = /^[a-zA-Z0-9_-]{1,100}$/;
const digest = data => createHash('sha256').update(JSON.stringify(data)).digest('hex');
export class Engine {
  constructor({ directory, apiKey, sessionBudgetUsd = 2, fetcher = fetch }) {
    if (!Number.isFinite(sessionBudgetUsd) || sessionBudgetUsd <= 0 || sessionBudgetUsd > 100) throw new Error('VECTIS_MAX_USD must be > 0 and <= 100');
    this.directory = directory; this.apiKey = apiKey; this.cap = sessionBudgetUsd; this.fetcher = fetcher;
    mkdirSync(directory, { recursive: true, mode: 0o700 });
    // Exclusive directory ownership avoids duplicate paid submissions from two MCP processes.
    this.lock = join(directory, 'process.lock');
    try { this.fd = openSync(this.lock, 'wx', 0o600); } catch { throw new Error('Data directory locked. Stop its other Vectis process; after a crash, remove process.lock manually.'); }
    writeFileSync(this.fd, String(process.pid));
    this.missions = new Map();
    try {
      for (const file of readdirSync(directory).filter(n => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.json$/.test(n))) {
        const m = JSON.parse(readFileSync(join(directory, file), 'utf8'));
        if (!idPattern.test(m.id) || !Array.isArray(m.calls)) throw new Error('Invalid mission store');
        for (const c of m.calls) if (c.operation === 'verify_email') c.verification = interpretVerification(c);
        this.missions.set(m.id, m);
      }
    } catch (e) { this.close(); throw e; }
  }
  close() { if (this.fd !== undefined) { closeSync(this.fd); unlinkSync(this.lock); this.fd = undefined; } }
  save(m) {
    const path = join(this.directory, `${m.id}.json`);
    writeFileSync(`${path}.tmp`, JSON.stringify(m, null, 2), { mode: 0o600 });
    renameSync(`${path}.tmp`, path);
  }
  mission(id) { const m = this.missions.get(id); if (!m) throw new Error('Unknown mission'); return m; }
  usage(m) {
    const measured = m.calls.every(c => c.costUsd !== null);
    return { budgetUsd: m.budgetUsd, committedUsd: round(m.calls.reduce((n,c) => n + Math.max(c.reservedUsd, c.costUsd ?? 0), 0)), measuredCostUsd: measured ? round(m.calls.reduce((n,c) => n + c.costUsd, 0)) : null, aiCost: 'Billed by your assistant/provider, not measured by Vectis' };
  }
  create({ name, budgetUsd }) {
    if (budgetUsd > this.cap) throw new Error('Mission budget exceeds configured cap');
    const m = { id: randomUUID(), name, budgetUsd, createdAt: new Date().toISOString(), calls: [], report: null };
    this.save(m); this.missions.set(m.id,m); return this.summary(m);
  }
  summary(m) { return { ...m, usage: this.usage(m) }; }
  list() { return [...this.missions.values()].map(m => ({ id:m.id, name:m.name, usage:this.usage(m) })); }
  async request(method, path, body) {
    if (!this.apiKey) throw new Error('Set your own MONID_API_KEY in the MCP process environment');
    let response;
    try { response = await this.fetcher(`https://api.monid.ai${path}`, {
      method, headers: { Authorization: `Bearer ${this.apiKey}`, 'Content-Type': 'application/json', 'X-Monid-Client': 'vectis-agent' },
      body: body ? JSON.stringify(body) : undefined, redirect: 'error', signal: AbortSignal.timeout(35000),
    }); } catch { throw new Error('Monid network error; no automatic paid retry'); }
    if (!response.ok) { await response.body?.cancel(); throw new Error(`Monid HTTP ${response.status}`); }
    try { return await response.json(); } catch { throw new Error('Invalid Monid response'); }
  }
  async inspect(operation) {
    const op = operations[operation]; if (!op) throw new Error('Unknown operation');
    return this.request('POST', '/v1/inspect', { provider: op.provider, endpoint: op.endpoint });
  }
  async execute({ missionId, requestId, operation, args }) {
    const m = this.mission(missionId), op = operations[operation];
    if (!op || !idPattern.test(requestId)) throw new Error('Invalid operation or request ID');
    const parsed = op.schema.parse(args), input = op.input(parsed), fingerprint = digest({ operation, input });
    const existing = m.calls.find(c => c.requestId === requestId);
    if (existing) { if (existing.fingerprint !== fingerprint) throw new Error('Request ID already used with different arguments'); return existing; }
    const inspected = await this.inspect(operation);
    const reservedUsd = quote(inspected.price, operation, op.limit(parsed));
    // Recheck after network await. All reservations below are synchronous and persisted before billing.
    const duplicate = m.calls.find(c => c.requestId === requestId);
    if (duplicate) { if (duplicate.fingerprint !== fingerprint) throw new Error('Request ID conflict'); return duplicate; }
    const allCalls = [...this.missions.values()].flatMap(x => x.calls);
    if (allCalls.some(c => c.costUsd === null)) throw new Error('Resolve pending or unknown charges before another paid call');
    const total = [...this.missions.values()].reduce((n,x) => n + this.usage(x).committedUsd, 0);
    if (this.usage(m).committedUsd + reservedUsd > m.budgetUsd + 1e-8 || total + reservedUsd > this.cap + 1e-8) throw new Error('Budget exceeded');
    const call = { requestId, fingerprint, operation, provider:op.provider, endpoint:op.endpoint, input, reservedUsd, costUsd:null, status:'submitting', createdAt:new Date().toISOString() };
    m.calls.push(call); this.save(m);
    try {
      const run = await this.request('POST', '/v1/run', { provider:op.provider, endpoint:op.endpoint, input });
      if (!idPattern.test(run.runId || '')) throw new Error('Missing provider run ID');
      call.runId = run.runId;
      this.applyRun(call, run);
    } catch (e) { call.status = 'uncertain'; call.error = e.message; }
    this.save(m); return call;
  }
  applyRun(call, run) {
    if (run.runId !== undefined && run.runId !== call.runId) throw new Error('Provider run ID mismatch');
    call.providerStatus = run.status;
    if (['READY','RUNNING'].includes(run.status)) { call.status = 'pending'; return; }
    call.costUsd = dollars(run.cost) ?? dollars(run.billing?.reportedCost);
    call.status = run.status === 'COMPLETED' && run.providerResponse?.httpStatus >= 200 && run.providerResponse?.httpStatus < 300 ? 'completed' : 'failed';
    call.output = run.output ?? null;
    call.finishedAt = new Date().toISOString();
    if (call.costUsd === null) call.status = 'unknown_cost';
    if (call.operation === 'verify_email') call.verification = interpretVerification(call);
  }
  async refresh(missionId, requestId) {
    const m = this.mission(missionId), c = m.calls.find(x => x.requestId === requestId);
    if (!c?.runId) throw new Error('No run ID available. Do not resubmit; reconcile the Monid wallet manually.');
    if (['completed','failed'].includes(c.status) && c.costUsd !== null) return c;
    const run = await this.request('GET', `/v1/runs/${encodeURIComponent(c.runId)}`);
    this.applyRun(c,run); this.save(m); return c;
  }
  saveReport(missionId, report) {
    const m = this.mission(missionId);
    const known = new Set(m.calls.map(c => c.requestId));
    if (report.prospects.some(p => p.evidenceRequestIds.some(id => !known.has(id)))) throw new Error('Report references unknown evidence');
    for (const prospect of report.prospects) {
      for (const contact of prospect.contacts) {
        const latest = m.calls.filter(c => c.operation === 'verify_email' && c.input?.queryParams?.email?.toLowerCase() === contact.email?.toLowerCase()).at(-1);
        if (contact.emailStatus === 'verified' && (!latest || !interpretVerification(latest).usable)) throw new Error('Verified email requires successful latest Hunter evidence in this mission');
      }
    }
    m.report = { ...report, author:'user_assistant', savedAt:new Date().toISOString(), verifiedByVectis:false };
    this.save(m); return this.summary(m);
  }
}
