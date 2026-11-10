import test from 'node:test';
import assert from 'node:assert/strict';
import {safeDestination,registeredSession} from '../../features/marketplace/auth-policy.js';
test('post-login destinations reject external, malformed and recursive auth URLs',()=>{
 for(const input of ['https://evil.example','//evil.example','/\\evil.example','/auth/login/?next=/jobs/','/jobs/\n//evil.example',null])assert.equal(safeDestination(input),'/');
 assert.equal(safeDestination('/jobs/abc/?from=inbox'),'/jobs/abc/?from=inbox');
});
test('only explicit registered identities pass the frontend account gate',()=>{
 for(const session of [null,{}, {userId:'123'}, {userId:'123',isAnonymous:true}])assert.equal(registeredSession(session),false);
 assert.equal(registeredSession({userId:'123',isAnonymous:false}),true);
});
