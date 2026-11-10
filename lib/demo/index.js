// Explicit browser-only fixtures. Not authentication, authorization or a real marketplace.
const KEY = 'rr-frontend-demo-v1';
const ok = data => ({ data, error: null });
const fail = (code, message, retryable = false) => ({ data: null, error: { code, message, retryable } });
export const mode = 'demo';
const seeds = [
  ['11111111-1111-4111-8111-111111111111', 'Aslam Mehmood', 'plumber', 'g-10-islamabad', 12, 38, 24, 4.9, .8],
  ['22222222-2222-4222-8222-222222222222', 'Bilal Ahmed', 'electrician', 'g-9-islamabad', 8, 31, 19, 4.8, 1.2],
  ['33333333-3333-4333-8333-333333333333', 'Usman Ali', 'plumber', 'g-11-islamabad', 9, 26, 16, 4.9, 1.6],
].map(([id,name,trade,localityId,yearsExperience,completedJobCount,reviewCount,averageRating,approximateDistanceKm], i) => ({
  id, ownerUserId: id, name, tradeIds:[trade], localityId,
  serviceAreaIds:['g-9-islamabad','g-10-islamabad','g-11-islamabad'],
  yearsExperience, completedJobCount, reviewCount, averageRating, approximateDistanceKm,
  bio:'I explain the work and agree on the cost before getting started. Illustrative introduction.',
  avatarUrl:`/images/profile-${i+1}.jpg`, availabilityOptIn:true,
  availabilityExpiresAt:'2099-01-01T00:00:00.000Z', isAvailableNow:true, isDemo:true,
}));
function read() {
  if(typeof window==='undefined') throw new Error('Demo data is available in your browser only.');
  const raw=window.localStorage.getItem(KEY);
  return raw ? JSON.parse(raw) : {session:null,workers:seeds,jobs:[],messages:[],keys:{}};
}
function write(db){window.localStorage.setItem(KEY,JSON.stringify(db));}
function safe(fn){return async (...args)=>{try{return fn(...args)}catch{return fail('NETWORK_ERROR','Browser demo storage is unavailable. Allow local storage or use another browser.',true)}}}
const publicWorker=w=>({...w,isAvailableNow:w.availabilityOptIn&&Date.parse(w.availabilityExpiresAt)>Date.now()});
export const getSession=safe(()=>ok(read().session));
export const getMyWorkerProfile=safe(()=>{const db=read();if(!db.session)return fail('UNAUTHENTICATED','Start a session first.');const w=db.workers.find(w=>w.ownerUserId===db.session.userId);return ok(w?publicWorker(w):null)});
export const ensureSession=safe(()=>{const db=read();if(!db.session){db.session={userId:crypto.randomUUID(),isAnonymous:true,displayName:'Neighbour',hasWorkerProfile:false};write(db)}return ok(db.session)});
export const signOut=safe(()=>{const db=read();db.session=null;write(db);return ok({signedOut:true})});
export const listWorkers=safe(({tradeId,localityId,query='',sort='recommended',limit=20})=>{
  let items=read().workers.map(publicWorker).filter(w=>w.isAvailableNow&&w.serviceAreaIds.includes(localityId)&&(!tradeId||w.tradeIds.includes(tradeId))&&`${w.name} ${w.tradeIds.join(' ')} ${w.bio}`.toLowerCase().includes(query.toLowerCase()));
  items.sort((a,b)=>sort==='nearest'?(a.approximateDistanceKm??Infinity)-(b.approximateDistanceKm??Infinity):b.completedJobCount-a.completedJobCount);
  return ok({items:items.slice(0,limit),hasMore:items.length>limit});
});
export const getWorker=safe(({workerId})=>{const worker=read().workers.find(w=>w.id===workerId);return worker?ok({worker:publicWorker(worker),reviews:[]}):fail('NOT_FOUND','This professional could not be found.')});
export const saveWorkerProfile=safe(({fields,idempotencyKey})=>{
  const db=read();if(!db.session)return fail('UNAUTHENTICATED','Continue with a session before saving.');
  if(!fields.name?.trim()||!fields.tradeIds?.length||!['g-9-islamabad','g-10-islamabad','g-11-islamabad'].includes(fields.localityId)||!fields.serviceAreaIds?.length||fields.yearsExperience!=null&&(!Number.isFinite(fields.yearsExperience)||fields.yearsExperience<0||fields.yearsExperience>70))return fail('VALIDATION_ERROR','Check your name, skill, service areas and experience.');
  if(db.keys[idempotencyKey])return ok(db.keys[idempotencyKey]);
  const existing=db.workers.find(w=>w.ownerUserId===db.session.userId);
  const worker={id:existing?.id||crypto.randomUUID(),ownerUserId:db.session.userId,avatarUrl:null,completedJobCount:0,reviewCount:0,averageRating:null,approximateDistanceKm:null,availabilityOptIn:false,availabilityExpiresAt:null,...existing,...fields,name:fields.name.trim(),isDemo:true};
  db.workers=db.workers.filter(w=>w.id!==worker.id).concat(worker);db.session={...db.session,displayName:worker.name,hasWorkerProfile:true};db.keys[idempotencyKey]=publicWorker(worker);write(db);return ok(publicWorker(worker));
});
export const setAvailability=safe(({available,idempotencyKey})=>{const db=read();if(!db.session)return fail('UNAUTHENTICATED','Start a session first.');const w=db.workers.find(w=>w.ownerUserId===db.session.userId);if(!w)return fail('FORBIDDEN','Create your worker profile first.');if(db.keys[idempotencyKey])return ok(db.keys[idempotencyKey]);w.availabilityOptIn=available;w.availabilityExpiresAt=available?new Date(Date.now()+2*60*60*1000).toISOString():null;db.keys[idempotencyKey]=publicWorker(w);write(db);return ok(publicWorker(w))});
export const listMyJobs=safe(({workspace})=>{const db=read();if(!db.session)return fail('UNAUTHENTICATED','Start a session to see your requests.');const own=db.workers.find(w=>w.ownerUserId===db.session.userId);return ok({items:db.jobs.filter(j=>workspace==='worker'?j.workerId===own?.id:j.customerId===db.session.userId)})});
export const createRequest=safe(input=>{const db=read();if(!db.session)return fail('UNAUTHENTICATED','Start a session to send a request.');if(db.keys[input.idempotencyKey])return ok(db.keys[input.idempotencyKey]);const worker=db.workers.find(w=>w.id===input.workerId);if(!worker||!publicWorker(worker).isAvailableNow)return fail('WORKER_UNAVAILABLE','This professional is no longer available.');if(worker.ownerUserId===db.session.userId)return fail('VALIDATION_ERROR','Choose another professional for your request.');if(!input.task?.trim())return fail('VALIDATION_ERROR','Describe what needs attention.');const job={id:crypto.randomUUID(),customerId:db.session.userId,workerId:worker.id,tradeId:input.tradeId,localityId:input.localityId,task:input.task.trim(),pricingPath:input.pricingPath,state:'requested',version:1,latestQuote:null,acceptedAgreement:null,createdAt:new Date().toISOString(),updatedAt:new Date().toISOString(),isDemo:true};db.jobs.push(job);db.keys[input.idempotencyKey]=job;write(db);return ok(job)});
export const getJob=safe(({jobId})=>{const db=read();const job=db.jobs.find(j=>j.id===jobId);if(!job)return fail('NOT_FOUND','Request not found.');if(job.customerId!==db.session?.userId)return fail('FORBIDDEN','This demo request belongs to another session.');return ok({job,allowedActions:[]})});
export const listMessages=safe(({jobId})=>{const db=read();const job=db.jobs.find(j=>j.id===jobId);if(job?.customerId!==db.session?.userId)return fail('FORBIDDEN','Conversation is unavailable to this session.');return ok({items:db.messages.filter(m=>m.jobId===jobId),hasMore:false})});
export const sendMessage=safe(({jobId,text,kind,idempotencyKey})=>{const db=read();if(db.keys[idempotencyKey])return ok(db.keys[idempotencyKey]);const job=db.jobs.find(j=>j.id===jobId);if(!db.session||job?.customerId!==db.session.userId)return fail('FORBIDDEN','Conversation is unavailable to this session.');if(kind!=='text'||!text?.trim())return fail('VALIDATION_ERROR','Enter a text message. Demo audio upload is not connected.');const message={id:crypto.randomUUID(),jobId,senderId:db.session.userId,kind:'text',text:text.trim(),audioRef:null,transcript:null,createdAt:new Date().toISOString()};db.messages.push(message);db.keys[idempotencyKey]=message;write(db);return ok(message)});
const notReady=async()=>fail('NETWORK_ERROR','This operation needs Machine B’s connected backend. No changes were made.',false);
export const issueQuote=notReady, acceptQuote=notReady, transitionJob=notReady, submitReview=notReady, reportIssue=notReady, uploadAudio=notReady, getAudioPlaybackUrl=notReady;
export const extractVoice=async()=>fail('AI_UNAVAILABLE','AI extraction is not connected. Keep your recording and confirm the fields manually.');
