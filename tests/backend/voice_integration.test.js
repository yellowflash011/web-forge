import test from 'node:test';
import assert from 'node:assert/strict';
import {extractAudio,validateSuggestions} from '../../supabase/functions/_shared/voice-provider.js';
import {createVoiceHandler} from '../../supabase/functions/extract-voice/handler.js';
import {applyProfileSuggestions} from '../../features/marketplace/profile-suggestions.js';

test('provider receives actual audio bytes and whitelist validation drops invented state and price',async()=>{
 let sent;
 const fields=await extractAudio({bytes:new Uint8Array([1,2,3,4]),mimeType:'audio/webm',purpose:'worker_profile',apiKey:'test-provider-secret',model:'test-model',fetchImpl:async(url,options)=>{
  assert.ok(!url.includes('test-provider-secret'));sent=JSON.parse(options.body);
  return Response.json({candidates:[{content:{parts:[{text:JSON.stringify({transcript:'Mera naam Ali hai',fields:{name:'Ali',tradeIds:['plumber','surgeon'],localityId:'g-9-islamabad',serviceAreaIds:['g-9-islamabad','unknown'],yearsExperience:0,price:900,state:'completed'},ambiguities:[]})}]}}]});
 }});
 assert.equal(sent.contents[0].parts[1].inlineData.data,'AQIDBA==');
 assert.equal(sent.contents[0].parts[1].inlineData.mimeType,'audio/webm');
 assert.deepEqual(fields.fields.tradeIds,['plumber']);assert.equal(fields.fields.yearsExperience,0);assert.ok(!('price' in fields.fields));assert.ok(!('state' in fields.fields));
});
test('missing transcript is rejected instead of manufacturing a successful extraction',()=>{
 assert.throws(()=>validateSuggestions({fields:{name:'Guess'}},'worker_profile'));
});

test('voice fallback preserves a real English transcript when Gemini remains unavailable',async()=>{
 let transcriptionLanguage=null,geminiCalls=0;
 const result=await extractAudio({bytes:new Uint8Array([1,2]),mimeType:'audio/webm',purpose:'job_request',locale:'en',apiKey:'test-gemini',groqApiKey:'test-groq',model:'test-model',fetchImpl:async(url,input)=>{
  if(url.includes('api.groq.com')){transcriptionLanguage=input.body.get('language');return new Response(JSON.stringify({text:'I need a plumber in g-10 to fix a tap.'}),{status:200})}
  geminiCalls++;throw Error('Provider temporarily unavailable');
 }});
 assert.equal(transcriptionLanguage,'en');assert.equal(geminiCalls,2);assert.equal(result.fields.tradeId,'plumber');assert.equal(result.fields.localityId,'g-10-islamabad');assert.equal(result.transcript,'I need a plumber in g-10 to fix a tap.');assert.ok(!('price' in result.fields));
});
test('missing spoken fields do not erase manual entries or introduce model authority fields',()=>{
 const current={name:'Manual Name',tradeIds:['plumber'],localityId:'g-10-islamabad',serviceAreaIds:['g-10-islamabad'],yearsExperience:'',bio:''};
 const next=applyProfileSuggestions(current,{name:null,tradeIds:[],yearsExperience:0,price:500,state:'completed'});
 assert.equal(next.name,'Manual Name');assert.deepEqual(next.tradeIds,['plumber']);assert.equal(next.yearsExperience,0);assert.ok(!('price' in next));assert.ok(!('state' in next));
});
const user='11111111-1111-4111-8111-111111111111';
function handler({authorized=true,reserved=true,audioAllowed=true}={}){
 let providerCalls=0;let downloads=0;
 const createClient=()=>({auth:{getUser:async()=>({data:{user:authorized?{id:user}:null},error:null})},rpc:async()=>({data:reserved,error:null}),storage:{from:()=>({download:async()=>{downloads++;return audioAllowed?{data:new Blob(['audio bytes'],{type:'audio/webm'}),error:null}:{data:null,error:{message:'denied'}}}})}});
 const env=name=>({SUPABASE_URL:'https://example.supabase.co',SUPABASE_ANON_KEY:'test-key',GEMINI_API_KEY:'server-only-test-key',GEMINI_AUDIO_MODEL:'test-model'})[name];
 return {run:createVoiceHandler({createClient,env,extract:async({bytes})=>{providerCalls++;assert.ok(bytes.length);return {transcript:'real fixture transcript',fields:{name:'Ali'},missingFields:[],ambiguities:[]}}}),counts:()=>({providerCalls,downloads})};
}
const request=audioRef=>new Request('https://example.test/extract-voice',{method:'POST',headers:{Authorization:'Bearer test-token','Content-Type':'application/json'},body:JSON.stringify({audioRef,purpose:'worker_profile'})});
test('Edge handler denies missing auth and another user’s recording before provider access',async()=>{
 const h=handler();assert.equal((await h.run(new Request('https://example.test',{method:'POST'}))).status,401);
 assert.equal((await h.run(request(`someone-else/onboarding/test.webm`))).status,403);
 assert.deepEqual(h.counts(),{providerCalls:0,downloads:0});
});
test('Edge handler enforces rate and storage authorization, then processes owned bytes',async()=>{
 const denied=handler({reserved:false});assert.equal((await denied.run(request(`${user}/onboarding/test.webm`))).status,429);assert.equal(denied.counts().providerCalls,0);
 const privateFile=handler({audioAllowed:false});assert.equal((await privateFile.run(request(`${user}/onboarding/test.webm`))).status,403);assert.equal(privateFile.counts().providerCalls,0);
 const valid=handler();const response=await valid.run(request(`${user}/onboarding/test.webm`));assert.equal(response.status,200);assert.equal((await response.json()).data.fields.name,'Ali');assert.equal(valid.counts().providerCalls,1);
});

 test('expanded service catalogue preserves supported skills and rejects unknown ones',()=>{
 const result=validateSuggestions({transcript:'I repair AC units',fields:{tradeIds:['ac-technician','carpenter','invented-skill']}},'worker_profile');
 assert.deepEqual(result.fields.tradeIds,['ac-technician','carpenter']);
 });
