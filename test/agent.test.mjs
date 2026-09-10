import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { Engine } from '../src/engine.mjs';
import { quote } from '../src/operations.mjs';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
const money = n => ({ value:n,currency:'USD' });
const price = {type:'PER_CALL',amount:money(0.01)};
function fixture(t, run = {runId:'run_1',status:'COMPLETED',cost:money(0.01),providerResponse:{httpStatus:200},output:{results:[]}}) {
  const directory = mkdtempSync(join(tmpdir(),'vectis-test-')); const calls=[];
  const fetcher = async (url, init) => { calls.push({url,init}); return Response.json(url.endsWith('/inspect') ? {price} : run); };
  const engine = new Engine({directory,apiKey:'test-key-never-persist',fetcher,sessionBudgetUsd:0.02});
  t.after(()=>{engine.close();rmSync(directory,{recursive:true,force:true});});
  const m = engine.create({name:'Test',budgetUsd:0.02});
  const request = {missionId:m.id,requestId:'search_1',operation:'search_web',args:{query:'brand sponsorship'}};
  return {engine,directory,calls,m,request};
}
test('paid call is idempotent across repeated calls and process restart; keys never persisted',async t=>{
  const f=fixture(t); const first=await f.engine.execute(f.request);
  assert.equal(first.status,'completed'); assert.deepEqual(first.output,{results:[]});
  assert.deepEqual(await f.engine.execute(f.request),first);
  await assert.rejects(f.engine.execute({...f.request,args:{query:'different'}}),/different/);
  assert.equal(f.calls.filter(c=>c.url.endsWith('/run')).length,1);
  assert.equal(readFileSync(join(f.directory,`${f.m.id}.json`),'utf8').includes('test-key-never-persist'),false);
  f.engine.close();
  const restarted = new Engine({directory:f.directory,apiKey:'other',fetcher:()=>{throw Error('must not fetch')}});
  assert.deepEqual(await restarted.execute(f.request),first); restarted.close();
});
test('parallel submissions share persistent cap and cannot double submit',async t=>{
  const f=fixture(t);
  const results=await Promise.all([f.engine.execute(f.request),f.engine.execute(f.request)]);
  assert.equal(results[0].requestId,results[1].requestId);
  assert.equal(f.calls.filter(c=>c.url.endsWith('/run')).length,1);
  await f.engine.execute({...f.request,requestId:'second'});
  await assert.rejects(f.engine.execute({...f.request,requestId:'third'}),/Budget/);
});
test('pending refresh retrieves same run without another paid POST',async t=>{
  const f=fixture(t,{runId:'pending_1',status:'RUNNING'});
  assert.equal((await f.engine.execute(f.request)).status,'pending');
  await assert.rejects(f.engine.execute({...f.request,requestId:'next'}),/pending/);
  f.engine.fetcher=async (url,init)=>{assert.equal(init.method,'GET');return Response.json({runId:'pending_1',status:'COMPLETED',cost:money(0.01),providerResponse:{httpStatus:200},output:{ok:true}});};
  assert.equal((await f.engine.refresh(f.m.id,'search_1')).status,'completed');
  assert.equal(f.engine.usage(f.engine.mission(f.m.id)).measuredCostUsd,0.01);
});
test('ambiguous paid network failure is persisted and blocks new missions from evading cost cap',async t=>{
  const f=fixture(t); f.engine.fetcher=async url=>{if(url.endsWith('inspect'))return Response.json({price});throw Error('private provider error');};
  const result=await f.engine.execute(f.request);assert.equal(result.status,'uncertain');assert.equal(result.costUsd,null);
  assert.equal(JSON.stringify(result).includes('private provider error'),false);
  const other=f.engine.create({name:'Other',budgetUsd:0.02});
  await assert.rejects(f.engine.execute({...f.request,missionId:other.id}),/unknown charges/);
});
test('known failed run costs counted, unknown cost stops next call',async t=>{
  const f=fixture(t,{runId:'bad',status:'FAILED',cost:money(0.01),providerResponse:{httpStatus:500}});
  assert.equal((await f.engine.execute(f.request)).status,'failed');
  assert.equal(f.engine.usage(f.engine.mission(f.m.id)).measuredCostUsd,0.01);
  f.engine.fetcher=async url=>Response.json(url.endsWith('inspect')?{price}:{runId:'unknown',status:'COMPLETED',providerResponse:{httpStatus:200}});
  assert.equal((await f.engine.execute({...f.request,requestId:'unknown'})).status,'unknown_cost');
  assert.equal(f.engine.usage(f.engine.mission(f.m.id)).measuredCostUsd,null);
});
test('input errors do not trigger network and competing process cannot open data',async t=>{
  const f=fixture(t);
  await assert.rejects(f.engine.execute({...f.request,operation:'find_email',args:{name:'A',domain:'https://bad'}}));
  assert.equal(f.calls.length,0);
  assert.throws(()=>new Engine({directory:f.directory}),/locked/);
});
test('price drift fails closed and only known Exa tier is accepted',()=>{
  assert.throws(()=>quote({type:'UNKNOWN'},'search_web',5));
  const p={type:'TIERED',default:price,tiers:[{selector:{key:'numResults',in:'body',offset:10},price:{type:'PER_RESULT',amount:money(0.001)}}]};
  assert.equal(quote(p,'search_web',10),0.01);
  assert.throws(()=>quote(p,'search_web',11));
  p.tiers[0].selector.offset=2;assert.throws(()=>quote(p,'search_web',5));
});
test('MCP stdio handshake, workflow, report persistence and no-key error with real SDK client',async t=>{
  const directory=mkdtempSync(join(tmpdir(),'vectis-mcp-'));
  const client=new Client({name:'test-assistant',version:'1.0.0'});
  const transport=new StdioClientTransport({command:process.execPath,args:[new URL('../src/server.mjs',import.meta.url).pathname],env:{VECTIS_DATA_DIR:directory,VECTIS_MAX_USD:'0.05'},stderr:'pipe'});
  t.after(async()=>{await client.close();rmSync(directory,{recursive:true,force:true});});
  await client.connect(transport);
  const tools=await client.listTools();assert.equal(tools.tools.length,12);
  const call=async(name,args={})=>client.callTool({name,arguments:args});
  assert.match((await call('vectis_get_workflow')).content[0].text,/own AI model|model the user/);
  const m=JSON.parse((await call('vectis_start_mission',{name:'SDK',budgetUsd:0.02})).content[0].text);
  const report={athlete:'Demo fixture',summary:'No live evidence in this offline test',prospects:[],limitations:['Offline test']};
  const saved=JSON.parse((await call('vectis_save_report',{missionId:m.id,report})).content[0].text);
  assert.equal(saved.report.author,'user_assistant');assert.equal(saved.report.verifiedByVectis,false);
  const error=await call('vectis_find_email',{missionId:m.id,requestId:'no_key',name:'Test',domain:'example.com'});
  assert.equal(error.isError,true);assert.match(error.content[0].text,/MONID_API_KEY/);
});

test('Apollo disabled phone add-on can have an output selector without being charged',()=>{
  const p={type:'TIERED',default:price,tiers:[{when:{reveal_phone_number:'true'},selector:{key:'phone_units',in:'output'},price:{type:'PER_CALL',amount:money(0.4)}}]};
  assert.equal(quote(p,'enrich_contact',1),0.01);
  p.tiers[0].when={new_paid_feature:'true'};assert.throws(()=>quote(p,'enrich_contact',1));
});

const {interpretVerification}=await import('../src/email-verification.mjs');
test('Hunter valid, catch-all, invalid, blocked and mismatched addresses stay distinct',()=>{
 const c={operation:'verify_email',status:'completed',input:{queryParams:{email:'person@example.com'}},output:{data:{email:'person@example.com',status:'valid',smtp_check:true,mx_records:true,accept_all:false,disposable:false,block:false}}};
 assert.equal(interpretVerification(c).usable,true);
 assert.equal(interpretVerification({...c,output:{data:{...c.output.data,accept_all:true}}}).status,'catch_all');
 assert.equal(interpretVerification({...c,output:{data:{...c.output.data,status:'invalid'}}}).status,'invalid');
 assert.equal(interpretVerification({...c,output:{data:{...c.output.data,block:true}}}).usable,false);
 assert.equal(interpretVerification({...c,output:{data:{...c.output.data,email:'someone-else@example.com'}}}).usable,false);
 assert.equal(interpretVerification({...c,status:'failed'}).usable,false);
});
test('assistant cannot persist a verified email without matching provider evidence',t=>{
 const f=fixture(t);const report={prospects:[{contacts:[{email:'person@example.com',emailStatus:'verified'}],evidenceRequestIds:[]}]};
 assert.throws(()=>f.engine.saveReport(f.m.id,report),/requires successful/);
 report.prospects[0].contacts[0].emailStatus='unknown';assert.equal(f.engine.saveReport(f.m.id,report).report.verifiedByVectis,false);
});

const {round}=await import('../src/operations.mjs');
test('cost totals do not acquire phantom microdollars from binary floating point',()=>{
 assert.equal(round(0.01*6+0.05*2+0.02392+0.01196*2),0.20784);
});
test('a later negative verification supersedes a prior positive one',t=>{
 const f=fixture(t), m=f.engine.mission(f.m.id);
 const c={operation:'verify_email',status:'completed',input:{queryParams:{email:'person@example.com'}},output:{data:{email:'person@example.com',status:'valid',smtp_check:true,mx_records:true,accept_all:false,disposable:false}}};
 m.calls.push({...c,requestId:'old',costUsd:0,reservedUsd:0},{...c,requestId:'new',costUsd:0,reservedUsd:0,output:{data:{...c.output.data,status:'invalid'}}});
 assert.throws(()=>f.engine.saveReport(m.id,{prospects:[{contacts:[{email:'person@example.com',emailStatus:'verified'}],evidenceRequestIds:[]}]}),/latest Hunter/);
});

test('exported handoff JSON is not interpreted as a mission on restart',t=>{
 const f=fixture(t);writeFileSync(join(f.directory,'handoff-client.json'),JSON.stringify({stage:'email_verification_complete'}));f.engine.close();
 const restarted=new Engine({directory:f.directory});assert.equal(restarted.list().length,1);restarted.close();
});
