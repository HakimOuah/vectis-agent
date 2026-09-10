/** Deterministic interpretation of Hunter evidence, never an LLM judgment. */
export function interpretVerification(call) {
  const expected = call.input?.queryParams?.email?.toLowerCase();
  const d = call.output?.data;
  const base = { email: expected ?? null, status:'unknown', usable:false, provider:'hunterio', runId:call.runId ?? null, checkedAt:call.finishedAt ?? null };
  if (call.operation !== 'verify_email' || call.status !== 'completed' || !d || typeof d.email !== 'string' || d.email.toLowerCase() !== expected) return {...base,reason:'No completed verification for this exact address'};
  if (d.status === 'invalid' || d.disposable === true || d.regexp === false) return {...base,status:'invalid',reason:'Provider rejected the address or identified a disposable address'};
  if (d.accept_all === true || d.status === 'accept_all') return {...base,status:'catch_all',reason:'Domain accepts all addresses; mailbox existence is not established'};
  if (d.status === 'valid' && d.smtp_check === true && d.mx_records === true && d.accept_all === false && d.disposable === false && d.block !== true) return {...base,status:'verified',usable:true,reason:'Hunter reports valid with successful SMTP check; no delivery guarantee'};
  return {...base,reason:'Verification incomplete, blocked or inconclusive'};
}
