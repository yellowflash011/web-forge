import test from 'node:test';
import assert from 'node:assert/strict';
import {finishAuthRedirect} from '../../features/marketplace/auth-service.js';
test('confirmation codes exchange even when a different account is already signed in',async()=>{
 let exchanged=false;
 const user=await finishAuthRedirect('new-account-code',{getClient:async()=>({auth:{exchangeCodeForSession:async code=>{assert.equal(code,'new-account-code');exchanged=true;return {error:null}},getUser:async()=>({data:{user:{id:exchanged?'new-account':'previous-account',is_anonymous:false}},error:null})}})});
 assert.equal(user.id,'new-account');
});
test('invalid codes cannot fall back to the previously signed-in account',async()=>{
 let queried=false;
 await assert.rejects(finishAuthRedirect('expired',{getClient:async()=>({auth:{exchangeCodeForSession:async()=>({error:Error('Expired link')}),getUser:async()=>{queried=true;return {data:{user:{id:'old'}}}}}})}),/Expired link/);
 assert.equal(queried,false);
});
