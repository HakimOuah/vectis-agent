import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import { resolve } from 'node:path';
import { quote } from '../src/operations.mjs';
import { setTimeout as delay } from 'node:timers/promises';
if (!process.env.MONID_API_KEY) throw new Error('Configure your own MONID_API_KEY before running. Maximum authorized provider spend: $0.05.');
const client=new Client({name:'vectis-live-smoke',version:'0.1.0'});
const transport=new StdioClientTransport({command:process.execPath,args:[new URL('../src/server.mjs',import.meta.url).pathname],
  env:{MONID_API_KEY:process.env.MONID_API_KEY,VECTIS_DATA_DIR:process.env.VECTIS_DATA_DIR || resolve('.vectis/live-smoke'),VECTIS_MAX_USD:'0.05'},stderr:'pipe'});
try {
  await client.connect(transport);
  const call=async(name,args={})=>{const r=await client.callTool({name,arguments:args});if(r.isError)throw Error(r.content[0].text);return JSON.parse(r.content[0].text);};
  const checks=[];
  for(const operation of ['search_web','search_contacts','enrich_contact','find_email','verify_email']) {
    try {const r=await call('vectis_inspect',{operation}); const reservedUsd=quote(r.price,operation,operation==='search_contacts'?10:operation==='search_web'?3:1); checks.push({operation,available:true,priceType:r.price?.type,reservedUsd});}
    catch {checks.push({operation,available:false});}
  }
  const existing=await call('vectis_list_missions');
  const mission=existing.find(m=>m.name==='Public live smoke') || await call('vectis_start_mission',{name:'Public live smoke',budgetUsd:0.05});
  let result=await call('vectis_search_web',{missionId:mission.id,requestId:'public-search-1',query:'Decathlon Kipsta official football partnership UEFA',limit:3});
  for(let i=0;result.status==='pending' && i<20;i++) {await delay(2000);result=await call('vectis_refresh_call',{missionId:mission.id,requestId:'public-search-1'});}
  const saved=await call('vectis_get_mission',{missionId:mission.id});
  process.stdout.write(JSON.stringify({checks,missionId:mission.id,status:result.status,runId:result.runId,usage:saved.usage,sources:result.output?.results?.map(r=>({title:r.title,url:r.url})), resultCount:result.output?.results?.length},null,2)+'\n');
  if(result.status!=='completed')process.exitCode=1;
} finally {await client.close();}
