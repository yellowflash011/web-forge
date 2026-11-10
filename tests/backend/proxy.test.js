import test from 'node:test';
import assert from 'node:assert/strict';
import {NextRequest} from 'next/server.js';
import {updateRegisteredSession} from '../../lib/supabase/proxy.js';
const request=()=>new NextRequest('https://app.example/jobs/123/?from=inbox');
const settings={url:'https://example.supabase.co',key:'test-public-key'};
test('server gate rejects missing, anonymous and unconfirmed identities',async()=>{
 for(const user of [null,{id:'anon',is_anonymous:true},{id:'pending'}]){
  const result=await updateRegisteredSession(request(),{...settings,createClient:()=>({auth:{getUser:async()=>({data:{user},error:null})}})});
  assert.equal(result.status,307);const url=new URL(result.headers.get('location'));assert.equal(url.pathname,'/auth/login/');assert.equal(url.searchParams.get('next'),'/jobs/123/?from=inbox');assert.match(result.headers.get('cache-control'),/no-store/);
 }
});
test('server gate verifies the user and retains refreshed cookies on success and redirect',async()=>{
 for(const user of [null,{id:'registered',is_anonymous:false,email_confirmed_at:'2026-11-10'}]){
  let verified=0;
  const result=await updateRegisteredSession(request(),{...settings,createClient:(_url,_key,{cookies})=>({auth:{getUser:async()=>{verified++;cookies.setAll([{name:'sb-refresh-test',value:'new-value',options:{path:'/',sameSite:'lax',secure:true}}]);return {data:{user},error:null}}}})});
  assert.equal(verified,1);assert.equal(result.status,user?200:307);assert.equal(result.cookies.get('sb-refresh-test').value,'new-value');assert.match(result.headers.get('cache-control'),/no-store/);
 }
});
test('configuration and Auth outages fail closed without rendering protected content',async()=>{
 const missing=await updateRegisteredSession(request(),{url:'',key:''});assert.equal(missing.status,503);
 const outage=await updateRegisteredSession(request(),{...settings,createClient:()=>({auth:{getUser:async()=>({data:{user:null},error:{status:503}})}})});assert.equal(outage.status,503);assert.equal(outage.headers.get('retry-after'),'30');
});
