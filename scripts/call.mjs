import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import {readFileSync} from 'node:fs';
import {homedir} from 'node:os';
import {resolve} from 'node:path';
import {setTimeout as delay} from 'node:timers/promises';
const request=JSON.parse(readFileSync(process.argv[2],'utf8'));
const client=new Client({name:'vectis-validation-client',version:'0.1.0'});
const transport=new StdioClientTransport({command:process.execPath,args:[new URL('../src/server.mjs',import.meta.url).pathname],env:{MONID_API_KEY:process.env.MONID_API_KEY || '',VECTIS_DATA_DIR:process.env.VECTIS_DATA_DIR || resolve(homedir(),'.vectis-agent'),VECTIS_MAX_USD:process.env.VECTIS_MAX_USD || '2'},stderr:'pipe'});
try {
 await client.connect(transport);
 const call=async(name,args)=>{const r=await client.callTool({name,arguments:args});if(r.isError)throw Error(r.content[0].text);return JSON.parse(r.content[0].text);};
 let result=await call(request.name,request.arguments);
 for(let i=0;result.status==='pending' && i<50;i++){await delay(2000);result=await call('vectis_refresh_call',{missionId:request.arguments.missionId,requestId:request.arguments.requestId});}
 const shown=structuredClone(result);
 if(shown.output?.person){const p=shown.output.person;shown.output={person:Object.fromEntries(['id','name','title','email','email_status','linkedin_url','email_domain_catchall'].map(k=>[k,p[k]])),company:p.organization?.primary_domain,currentRoles:p.employment_history?.filter(h=>h.current).map(h=>({company:h.organization_name,title:h.title}))};}
 if(shown.output?.results)shown.output.results=shown.output.results.map(r=>({title:r.title,url:r.url,text:r.text}));
 if(shown.calls){shown.callCount=shown.calls.length;delete shown.calls;}
 console.log(JSON.stringify(shown,null,2));
}finally{await client.close();}
