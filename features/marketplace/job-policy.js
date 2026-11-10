// Presentation eligibility only. Every mutation is re-authorized by the backend.
export const ACTIONS={
 respond:{label:'Respond to request',primary:true},
 decline:{label:'Decline request',reason:true},
 start_visit:{label:'Start inspection visit',primary:true},
 start_work:{label:'Start work',primary:true},
 mark_work_done:{label:'Mark work done',primary:true,confirm:'The customer will still need to confirm completion.'},
 confirm_completion:{label:'Confirm work completed',primary:true,confirm:'Confirm that the agreed work is complete. This makes the job eligible for feedback.'},
 decline_repair:{label:'Decline repair quote',confirm:'The repair will not proceed. Your accepted inspection-fee agreement remains on record.'},
 cancel:{label:'Cancel this job',reason:true,confirm:'This cancels the request or booking and releases any active assignment.'},
 release_assignment:{label:'Release my assignment',confirm:'Confirm you are no longer engaged on this job.'},
};
export function capabilities(job,session,worker,allowed=[]){
 const customer=Boolean(session&&job?.customerId===session.userId);
 const professional=Boolean(session&&job&&worker&&worker.id===job.workerId&&worker.ownerUserId===session.userId);
 const participant=customer||professional;
 const initial=['requested','discussing','quoted'].includes(job?.state);
 const repair=job?.pricingPath==='inspection'&&['visiting','awaiting_repair_approval'].includes(job?.state);
 return {customer,professional,participant,
  quotePurpose:professional&&(initial||repair)?(repair?'repair_after_inspection':job.pricingPath==='inspection'?'inspection_visit':'fixed_job'):null,
  canAccept:customer&&['quoted','awaiting_repair_approval'].includes(job?.state),
  canReview:customer&&job?.state==='completed',
  canReport:participant&&['confirmed','visiting','awaiting_repair_approval','in_progress','awaiting_completion'].includes(job?.state),
  actions:participant?allowed.filter(action=>Object.hasOwn(ACTIONS,action)&&(action==='cancel'||customer&&['confirm_completion','decline_repair'].includes(action)||professional&&['respond','decline','start_visit','start_work','mark_work_done','release_assignment'].includes(action))&&!(action==='release_assignment'&&job.state==='awaiting_completion')&&!(action==='decline'&&job.state==='quoted')):[],
 };
}
export function parseMoney(value){
 if(typeof value!=='string'||!/^\d{1,8}(?:\.\d{1,2})?$/.test(value.trim()))throw Error('Enter a non-negative amount with at most two decimal places.');
 const [whole,fraction='']=value.trim().split('.');
 return Number(whole)*100+Number(fraction.padEnd(2,'0'));
}
export function formatMoney(minor){return Number.isSafeInteger(Number(minor))&&Number(minor)>=0?`Rs ${new Intl.NumberFormat('en-PK',{minimumFractionDigits:Number(minor)%100?2:0,maximumFractionDigits:2}).format(Number(minor)/100)}`:'Amount unavailable'}
export function snapshot(agreement){
 const q=agreement?.quoteSnapshot||agreement?.quote_snapshot;
 if(!q)return null;
 return {...q,labourMinor:Number(q.labourMinor??q.labour_minor??0),visitFeeMinor:Number(q.visitFeeMinor??q.visit_fee_minor??0),visitFeeCredited:Boolean(q.visitFeeCredited??q.visit_fee_credited),materialsPolicy:q.materialsPolicy??q.materials_policy};
}
export function quoteBreakdown(quote,agreement,now=Date.now()){
 if(!quote)return {valid:false,expired:false,reason:'No quote has been issued.'};
 const amounts=[quote.labourMinor,quote.visitFeeMinor].map(Number);
 if(quote.currency!=='PKR'||amounts.some(n=>!Number.isSafeInteger(n)||n<0)||!['fixed_job','inspection_visit','repair_after_inspection'].includes(quote.purpose)||quote.materialsPolicy!=='excluded_approval_required')return {valid:false,expired:false,reason:'This quote has unsupported price details. Ask for a revised quote.'};
 const expires=quote.expiresAt?Date.parse(quote.expiresAt):null;
 const expired=Boolean(quote.supersededAt||expires!=null&&(!Number.isFinite(expires)||expires<=now));
 const previous=snapshot(agreement);
 const visit=quote.purpose==='inspection_visit'?Number(quote.visitFeeMinor):quote.purpose==='repair_after_inspection'?Number(quote.visitFeeMinor):0;
 if(quote.purpose==='repair_after_inspection'&&previous?.purpose==='inspection_visit'&&visit!==previous.visitFeeMinor)return {valid:false,expired,reason:'The visit-fee detail does not match your accepted inspection agreement. Ask for a revised repair quote.'};
 if(quote.visitFeeCredited&&quote.purpose==='repair_after_inspection'&&visit===0)return {valid:false,expired,reason:'The credited inspection fee is missing. Ask the worker to confirm the amount.'};
 const labour=Number(quote.labourMinor);
 const credit=quote.purpose==='repair_after_inspection'&&quote.visitFeeCredited?Math.min(visit,labour):0;
 return {valid:true,expired,reason:expired?'This quote expired or was replaced. Ask for a new quote.':null,visitFeeMinor:visit,labourMinor:labour,creditMinor:credit,totalMinor:quote.purpose==='inspection_visit'?visit:labour-credit};
}
export function buildQuote({scope,amount,creditVisit,expiryMinutes},purpose,agreement,now=Date.now()){
 if(!scope?.trim()||scope.trim().length>2000)throw Error('Describe the agreed work in 1–2,000 characters.');
 const money=parseMoney(amount),previous=snapshot(agreement);
 const visit=purpose==='repair_after_inspection'?(previous?.purpose==='inspection_visit'?previous.visitFeeMinor:previous?.visitFeeMinor):0;
 if(purpose==='repair_after_inspection'&&!Number.isSafeInteger(visit))throw Error('The accepted inspection fee could not be loaded. Refresh before quoting repair work.');
 if(![15,30,60,120].includes(Number(expiryMinutes)))throw Error('Choose a supported quote expiry.');
 return {purpose,scope:scope.trim(),currency:'PKR',labourMinor:purpose==='inspection_visit'?0:money,visitFeeMinor:purpose==='inspection_visit'?money:visit,visitFeeCredited:purpose==='repair_after_inspection'&&Boolean(creditVisit)&&visit>0,materialsPolicy:'excluded_approval_required',expiresAt:new Date(now+Number(expiryMinutes)*60000).toISOString()};
}
export function friendlyJobError(error){
 const code=error?.code;
 const message={VERSION_CONFLICT:'The job changed while you were deciding. Review the refreshed details before trying again.',QUOTE_STALE:'That quote is no longer current. Review the latest quote with the professional.',WORKER_UNAVAILABLE:'This worker is no longer available for a new booking. No booking was confirmed.',FORBIDDEN:'This action is not available to your account.',UNAUTHENTICATED:'Your session ended. Sign in again before continuing.',INVALID_TRANSITION:'This action is no longer available at the current job stage.'}[code];
 return {...error,message:message||error?.message||'This action did not finish. Please retry.'};
}
