import {test,beforeEach} from 'node:test';
import assert from 'node:assert/strict';
import * as demo from '../../lib/demo/index.js';
const memory=new Map();
globalThis.window={localStorage:{getItem:key=>memory.get(key)??null,setItem:(key,value)=>memory.set(key,value)}};
beforeEach(()=>memory.clear());
test('worker profile starts unavailable, becomes discoverable after opt-in, and expires',async()=>{
 const s=(await demo.ensureSession()).data;
 const fields={name:'A new local worker',tradeIds:['plumber'],localityId:'g-10-islamabad',serviceAreaIds:['g-10-islamabad'],yearsExperience:0,bio:''};
 const worker=(await demo.saveWorkerProfile({fields,idempotencyKey:'profile-1'})).data;
 assert.equal(worker.ownerUserId,s.userId);assert.equal(worker.yearsExperience,0);assert.equal(worker.averageRating,null);
 assert.equal((await demo.getMyWorkerProfile()).data.id,worker.id);
 const query={localityId:'g-10-islamabad',tradeId:'plumber'};
 assert.equal((await demo.listWorkers(query)).data.items.some(w=>w.id===worker.id),false);
 await demo.setAvailability({available:true,idempotencyKey:'available-1'});
 assert.equal((await demo.listWorkers(query)).data.items.some(w=>w.id===worker.id),true);
 const db=JSON.parse(memory.get('rr-frontend-demo-v1'));db.workers.find(w=>w.id===worker.id).availabilityExpiresAt='2000-01-01T00:00:00Z';memory.set('rr-frontend-demo-v1',JSON.stringify(db));
 assert.equal((await demo.listWorkers(query)).data.items.some(w=>w.id===worker.id),false);
});
test('request retries reuse one request, refresh reads it, and a new session cannot read its messages',async()=>{
 await demo.ensureSession();const worker=(await demo.listWorkers({localityId:'g-10-islamabad'})).data.items[0];
 const input={workerId:worker.id,tradeId:'plumber',localityId:'g-10-islamabad',task:'Leaking kitchen tap',pricingPath:'inspection',idempotencyKey:'intent-1'};
 const first=await demo.createRequest(input),retry=await demo.createRequest(input);
 assert.equal(first.data.id,retry.data.id);assert.equal(first.data.state,'requested');
 assert.equal((await demo.listMyJobs({workspace:'customer'})).data.items.length,1);
 assert.equal((await demo.getJob({jobId:first.data.id})).data.job.task,input.task);
 const message={jobId:first.data.id,kind:'text',text:'What is your visit fee?',idempotencyKey:'message-1'};
 await demo.sendMessage(message);await demo.sendMessage(message);
 assert.equal((await demo.listMessages({jobId:first.data.id})).data.items.length,1);
 await demo.signOut();await demo.ensureSession();
 assert.equal((await demo.listMessages({jobId:first.data.id})).error.code,'FORBIDDEN');
});
test('demo does not fabricate AI output, booking confirmation or a completed job',async()=>{
 assert.equal((await demo.extractVoice({})).error.code,'AI_UNAVAILABLE');
 assert.equal((await demo.acceptQuote({})).data,null);
 assert.equal((await demo.transitionJob({})).data,null);
 assert.equal((await demo.getSession()).data,null);
});
