import test,{afterEach,after} from 'node:test';
import assert from 'node:assert/strict';
import {JSDOM} from 'jsdom';
import {mkdir,readFile,writeFile} from 'node:fs/promises';
const dom=new JSDOM('<!doctype html><html><body></body></html>',{url:'http://localhost/'});
for(const [name,value] of Object.entries({window:dom.window,document:dom.window.document,navigator:dom.window.navigator,HTMLElement:dom.window.HTMLElement,Node:dom.window.Node,MutationObserver:dom.window.MutationObserver,getComputedStyle:dom.window.getComputedStyle}))Object.defineProperty(globalThis,name,{configurable:true,value});
globalThis.IS_REACT_ACT_ENVIRONMENT=true;
const {render,within,waitFor,cleanup}=await import('@testing-library/react');
const userEvent=(await import('@testing-library/user-event')).default;
const {default:JobWorkspace}=await import('../../components/marketplace/job-workspace.jsx');
const {InMemoryStore}=await import('../../lib/api/in_memory.js');
const {capabilities}=await import('../../features/marketplace/job-policy.js');
afterEach(()=>cleanup());after(()=>dom.window.close());
const customer='00000000-0000-0000-0000-000000000011',owner='00000000-0000-0000-0000-000000000001',workerId='11111111-1111-1111-1111-111111111111';
function fixture(pricingPath='fixed'){
 const store=new InMemoryStore();store.setCurrentUser(customer);
 const job=store.createRequest({workerId,tradeId:'electrician',localityId:'g-10-islamabad',task:'Repair the kitchen switch',pricingPath,idempotencyKey:'create'}).data;
 const calls=[];
 const adapter=user=>Object.fromEntries(['getJob','listMessages','getWorker','issueQuote','acceptQuote','transitionJob','submitReview','reportIssue','sendMessage'].map(name=>[name,async input=>{store.setCurrentUser(user);calls.push({user,name,input});return store[name](input)}]));
 const worker=store.getWorkerNormalized(workerId);
 return {store,job,worker,calls,workerApi:adapter(owner),customerApi:adapter(customer)};
}
function mount(f,role){const view=render(<JobWorkspace jobId={f.job.id} session={{userId:role==='worker'?owner:customer}} own={role==='worker'?f.worker:null} onBack={()=>{}} services={role==='worker'?f.workerApi:f.customerApi}/>);return {...within(view.container),root:view.container}}
async function saveEvidence(view,name){
 const copy=view.root.cloneNode(true),inputs=view.root.querySelectorAll('input,textarea,select');
 copy.querySelectorAll('input,textarea,select').forEach((node,i)=>{const source=inputs[i];if(node.tagName==='TEXTAREA')node.textContent=source.value;else if(node.tagName==='SELECT')for(const option of node.options){option.toggleAttribute('selected',option.value===source.value)}else {node.setAttribute('value',source.value);node.toggleAttribute('checked',source.checked)}});
 const css=(await Promise.all(['globals.css','implementation.css','jobs.css'].map(name=>readFile(new URL(`../../app/${name}`,import.meta.url),'utf8')))).join('\n');
 await mkdir(new URL('./evidence/',import.meta.url),{recursive:true});
 await writeFile(new URL(`./evidence/${name}.html`,import.meta.url),`<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Roshan Rozgar UI verification</title><style>${css}</style></head><body><div class="prototype-ribbon">COMPONENT VERIFICATION FIXTURE · NO LIVE BOOKINGS</div><main class="page-container live-app live-job">${copy.innerHTML}</main></body></html>`);
}
async function refresh(view,user){await user.click(view.getByRole('button',{name:'Refresh conversation',exact:true}));await waitFor(()=>assert.equal(view.queryByText('Refreshing…'),null))}
async function createQuote(view,user,amount='800'){
 await user.click(await view.findByRole('button',{name:'Prepare quote',exact:true}));
 const editor=view.getByRole('form',{name:'Quote editor'});
 await user.type(within(editor).getByRole('textbox',{name:/amount \(PKR\)|fee \(PKR\)/}),amount);
 await saveEvidence(view,'quote-editor');
 await user.click(within(editor).getByRole('button',{name:'Send quote',exact:true}));
 await waitFor(()=>assert.equal(view.queryByRole('form',{name:'Quote editor'}),null));
}
async function acceptQuote(view,user){
 await user.click(await view.findByRole('button',{name:'Review & accept quote',exact:true}));
 const form=view.getByRole('form',{name:'Quote acceptance confirmation'}),scope=within(form);
 const button=scope.getByRole('button',{name:/Accept quote & book|Approve repair quote/});assert.equal(button.disabled,true);
 await user.click(scope.getByRole('checkbox',{name:'I agree to this scope, price and materials policy.'}));await user.click(button);
 await waitFor(()=>assert.equal(view.queryByRole('form',{name:'Quote acceptance confirmation'}),null));
}
async function confirmedAction(view,user,name){await user.click(await view.findByRole('button',{name,exact:true}));await user.click(within(view.getByRole('form',{name:'Job action confirmation'})).getByRole('button',{name:'Confirm job action',exact:true}));await waitFor(()=>assert.equal(view.queryByRole('form',{name:'Job action confirmation'}),null))}

test('fixed-price UI journey: exact quote consent, worker-only actions, completion and one persisted review',async()=>{
 const f=fixture(),user=userEvent.setup({document:dom.window.document});const w=mount(f,'worker'),c=mount(f,'customer');
 await createQuote(w,user);
 await refresh(c,user);assert.equal(c.queryByRole('button',{name:'Start work',exact:true}),null);
 await acceptQuote(c,user);await refresh(w,user);
 await user.click(await w.findByRole('button',{name:'Start work',exact:true}));
 await confirmedAction(w,user,'Mark work done');await refresh(c,user);
 await confirmedAction(c,user,'Confirm work completed');
 const review=await c.findByRole('form',{name:'Completed job review'});
 await saveEvidence(c,'review-form');
 await user.click(within(review).getByRole('radio',{name:/5 stars/}));
 await user.type(within(review).getByRole('textbox',{name:/What should the next neighbour know/}),'Explained the repair clearly.');
 await user.click(within(review).getByRole('button',{name:'Submit my feedback',exact:true}));
 await c.findByRole('region',{name:'Submitted review'});await refresh(c,user);
 await saveEvidence(c,'completed-review');
 assert.equal(c.queryByRole('form',{name:'Completed job review'}),null);
 const saved=[...f.store.reviews.values()].filter(r=>r.job_id===f.job.id);assert.equal(saved.length,1);assert.equal(saved[0].rating,5);assert.equal(saved[0].punctuality,null);assert.equal(saved[0].price_honoured,null);
 assert.ok(f.calls.filter(call=>['issueQuote','acceptQuote','transitionJob','submitReview'].includes(call.name)).every(call=>call.input.idempotencyKey));
});

test('a revised quote invalidates an already-open customer consent',async()=>{
 const f=fixture(),user=userEvent.setup({document:dom.window.document});const w=mount(f,'worker'),c=mount(f,'customer');
 await createQuote(w,user);await refresh(c,user);
 await user.click(c.getByRole('button',{name:'Review & accept quote',exact:true}));
 const consent=within(c.getByRole('form',{name:'Quote acceptance confirmation'}));await user.click(consent.getByRole('checkbox'));
 f.store.setCurrentUser(owner);const current=f.store.getJobNormalized(f.job.id);
 f.store.issueQuote({jobId:f.job.id,expectedVersion:current.version,quoteFields:{purpose:'fixed_job',scope:'Updated scope',labourMinor:90000,visitFeeMinor:0,materialsPolicy:'excluded_approval_required'},idempotencyKey:'revision'});
 await refresh(c,user);
 assert.equal(consent.getByRole('button',{name:'Accept quote & book',exact:true}).disabled,true);
 assert.equal(f.calls.filter(call=>call.name==='acceptQuote').length,0);
});

test('inspection UI preserves visit fee and makes repair approval a separate decision',async()=>{
 const f=fixture('inspection'),user=userEvent.setup({document:dom.window.document});const w=mount(f,'worker'),c=mount(f,'customer');
 await createQuote(w,user,'500');await refresh(c,user);await acceptQuote(c,user);await refresh(w,user);
 await user.click(await w.findByRole('button',{name:'Start inspection visit',exact:true}));
 await user.click(await w.findByRole('button',{name:'Prepare quote',exact:true}));const editor=within(w.getByRole('form',{name:'Quote editor'}));
 await user.type(editor.getByRole('textbox',{name:'Repair labour amount (PKR)'}),'800');
 await user.click(editor.getByRole('checkbox',{name:'Count this visit fee toward the repair labour'}));
 await user.click(editor.getByRole('button',{name:'Send quote',exact:true}));
 await waitFor(()=>assert.equal(w.queryByRole('form',{name:'Quote editor'}),null));await refresh(c,user);
 assert.ok(c.getAllByText('Rs 300').length);await acceptQuote(c,user);
 f.store.setCurrentUser(customer);assert.equal(f.store.getJobNormalized(f.job.id).state,'in_progress');
});

test('reporting a problem uses the issue API and never creates a review',async()=>{
 const f=fixture(),user=userEvent.setup({document:dom.window.document});const w=mount(f,'worker'),c=mount(f,'customer');
 await createQuote(w,user);await refresh(c,user);await acceptQuote(c,user);
 await user.click(await c.findByRole('button',{name:'Something needs attention',exact:true}));
 const form=within(c.getByRole('form',{name:'Job action confirmation'}));await user.selectOptions(form.getByRole('combobox',{name:'Reason'}),'Work needs attention');await user.click(form.getByRole('button',{name:'Confirm issue report',exact:true}));
 await waitFor(()=>assert.equal(c.queryByRole('form',{name:'Job action confirmation'}),null));
 assert.equal(c.queryByRole('form',{name:'Completed job review'}),null);f.store.setCurrentUser(customer);assert.equal(f.store.getJobNormalized(f.job.id).state,'issue_open');
 assert.equal([...f.store.reviews.values()].filter(r=>r.job_id===f.job.id).length,0);
});

test('a lost quote response retries the same intent without duplicating the quote',async()=>{
 const f=fixture(),user=userEvent.setup({document:dom.window.document});const original=f.workerApi.issueQuote;let loseResponse=true;
 f.workerApi.issueQuote=async input=>{const result=await original(input);if(loseResponse){loseResponse=false;return {data:null,error:{code:'NETWORK_ERROR',message:'Test: response was lost',retryable:true}}}return result};
 const w=mount(f,'worker');await user.click(await w.findByRole('button',{name:'Prepare quote',exact:true}));
 const editor=within(w.getByRole('form',{name:'Quote editor'}));await user.type(editor.getByRole('textbox',{name:'Repair labour amount (PKR)'}),'800');await user.click(editor.getByRole('button',{name:'Send quote',exact:true}));
 await w.findByText('Test: response was lost');await user.click(editor.getByRole('button',{name:'Send quote',exact:true}));
 await waitFor(()=>assert.equal(w.queryByRole('form',{name:'Quote editor'}),null));
 const attempts=f.calls.filter(c=>c.name==='issueQuote');assert.equal(attempts.length,2);assert.equal(attempts[0].input.idempotencyKey,attempts[1].input.idempotencyKey);assert.equal(f.store.quotes.size,1);
});

test('cancellation requires a reason and preserves a non-completed outcome',async()=>{
 const f=fixture(),user=userEvent.setup({document:dom.window.document});const c=mount(f,'customer');
 await user.click(await c.findByRole('button',{name:'Cancel this job',exact:true}));
 const form=within(c.getByRole('form',{name:'Job action confirmation'}));await user.selectOptions(form.getByRole('combobox',{name:'Reason'}),'Plans changed');await user.click(form.getByRole('button',{name:'Confirm job action',exact:true}));
 await waitFor(()=>assert.equal(c.queryByRole('form',{name:'Job action confirmation'}),null));f.store.setCurrentUser(customer);assert.equal(f.store.getJobNormalized(f.job.id).state,'cancelled');
 assert.equal(c.queryByRole('form',{name:'Completed job review'}),null);assert.equal(f.calls.find(c=>c.name==='transitionJob').input.reason,'Plans changed');
});
