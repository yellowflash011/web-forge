import test from 'node:test';
import assert from 'node:assert/strict';
import {parseMoney,buildQuote,quoteBreakdown,capabilities} from '../../features/marketplace/job-policy.js';
test('money parsing rejects ambiguous or negative values and keeps paisa exact',()=>{
 assert.equal(parseMoney('800.05'),80005);assert.equal(parseMoney('0'),0);
 for(const bad of ['','-1','1e3','1,000','10.999','Infinity','800 rupees'])assert.throws(()=>parseMoney(bad));
});
test('inspection credit is explicit, consistent with accepted visit and never invented',()=>{
 const agreement={quoteSnapshot:{purpose:'inspection_visit',visit_fee_minor:50000}};
 const repair=buildQuote({scope:'Replace tap washer',amount:'800',creditVisit:true,expiryMinutes:60},'repair_after_inspection',agreement,1000000);
 assert.equal(repair.visitFeeMinor,50000);assert.equal(repair.labourMinor,80000);
 assert.equal(quoteBreakdown(repair,agreement,1000000).totalMinor,30000);
 assert.equal(quoteBreakdown({...repair,visitFeeMinor:0},agreement,1000000).valid,false);
 assert.throws(()=>buildQuote({scope:'Repair',amount:'800',expiryMinutes:60},'repair_after_inspection',null));
});
test('expired quotes cannot be accepted and UI roles do not grant unreturned transition actions',()=>{
 assert.equal(capabilities(null,{userId:'customer'},null).professional,false);
 const q=buildQuote({scope:'Repair',amount:'800',expiryMinutes:15},'fixed_job',null,1000);
 assert.equal(quoteBreakdown(q,null,1000+16*60000).expired,true);
 const job={id:'job',customerId:'customer',workerId:'worker',state:'in_progress',pricingPath:'fixed'};
 assert.deepEqual(capabilities(job,{userId:'customer'},null,['mark_work_done']).professional,false);
 assert.deepEqual(capabilities(job,{userId:'outsider'},null,['mark_work_done']).actions,[]);
 assert.deepEqual(capabilities(job,{userId:'owner'},{id:'worker',ownerUserId:'owner'},[]).actions,[]);
 assert.equal(capabilities({...job,state:'completed'},{userId:'customer'},null,[]).canReview,true);
 assert.equal(capabilities({...job,state:'issue_open'},{userId:'customer'},null,[]).canReview,false);
 assert.deepEqual(capabilities({...job,state:'quoted'},{userId:'owner'},{id:'worker',ownerUserId:'owner'},['decline']).actions,[],'Do not offer the quoted-state decline rejected by the current SQL transition function');
});
