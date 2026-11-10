// Read-only deployment smoke checks. Never prints keys, tokens or private records.
const base=process.env.NEXT_PUBLIC_SUPABASE_URL;
const key=process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY||process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
if(!base||!key)throw Error('Load the deployment environment file before running this check.');
const headers={apikey:key,'Content-Type':'application/json'};
if(key.startsWith('eyJ'))headers.Authorization='Bearer '+key;
let failed=false;
async function check(name,path,options,expected){
 try{
  const response=await fetch(base+path,{...options,headers,signal:AbortSignal.timeout(15000)});
  const pass=expected.includes(response.status);if(!pass)failed=true;
  console.log(JSON.stringify({check:name,http:response.status,pass}));
  if(name==='auth'&&pass){const body=await response.json();if(!body.external?.email||body.external?.phone){failed=true;console.log('Email/password must be enabled and phone signup disabled.')}}
 }catch{failed=true;console.log(JSON.stringify({check:name,pass:false,error:'Endpoint unreachable'}))}
}
await check('auth','/auth/v1/settings',{},[200]);
await check('discovery','/rest/v1/rpc/rpc_discover_workers',{method:'POST',body:JSON.stringify({p_trade_id:null,p_locality_id:'g-10-islamabad',p_query:'',p_sort:'recommended',p_limit:3})},[200]);
await check('voice_cors','/functions/v1/extract-voice',{method:'OPTIONS'},[204]);
await check('voice_requires_account','/functions/v1/extract-voice',{method:'POST',body:JSON.stringify({audioRef:'outsider/test.wav',purpose:'worker_profile'})},[401]);
process.exitCode=failed?1:0;
