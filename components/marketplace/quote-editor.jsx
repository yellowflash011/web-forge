'use client';
import React,{useState,useRef,useId} from 'react';
import {ArrowRight,ShieldCheck,RefreshCw} from 'lucide-react';
import {Button,ErrorNotice} from './shared';
import {buildQuote,quoteBreakdown,formatMoney,snapshot} from '../../features/marketplace/job-policy';

const TITLES={fixed_job:'A clear price for a clear job.',inspection_visit:'Agree the visit fee first.',repair_after_inspection:'Now, agree on the repair.'};
export default function QuoteEditor({job,purpose,busy,onSubmit,onClose}){
 const current=job.latestQuote?.purpose===purpose?job.latestQuote:null;
 const [scope,setScope]=useState(current?.scope||job.task),[amount,setAmount]=useState(current?String((purpose==='inspection_visit'?current.visitFeeMinor:current.labourMinor)/100):''),[creditVisit,setCreditVisit]=useState(Boolean(current?.visitFeeCredited)),[expiryMinutes,setExpiryMinutes]=useState('60'),[version,setVersion]=useState(job.version),[error,setError]=useState(null);
 const prepared=useRef(null),hintId=useId();const previous=snapshot(job.acceptedAgreement);const previousVisit=previous?.visitFeeMinor;
 const draft={scope,amount,creditVisit,expiryMinutes};
 let preview;try{preview=quoteBreakdown(buildQuote(draft,purpose,job.acceptedAgreement),job.acceptedAgreement)}catch{}
 const changed=job.version!==version;
 const submit=async e=>{
  e.preventDefault();setError(null);
  if(changed){setError({message:'The job changed. Review the latest details before sending this draft.'});return}
  try{
   const signature=JSON.stringify({draft,purpose,version,agreement:job.acceptedAgreement});
   if(prepared.current?.signature!==signature)prepared.current={signature,quoteFields:buildQuote(draft,purpose,job.acceptedAgreement)};
   const result=await onSubmit({expectedVersion:version,quoteFields:prepared.current.quoteFields});
   if(result.ok)onClose();
  }catch(e){setError({message:e.message})}
 };
 return <form className="quote-editor profile-form" onSubmit={submit} aria-label="Quote editor"><div className="section-heading"><div><span className="eyebrow">{current?'REVISE THE QUOTE':'PROPOSE THE DETAILS'}</span><h2>{TITLES[purpose]}</h2></div></div><p className="form-caption">{purpose==='inspection_visit'?'This fee covers the visit and assessment. Repair work needs a separate quote and approval.':'Describe the work precisely. Materials require separate approval.'}</p><ErrorNotice error={error}/>{changed&&<div className="draft-conflict" role="status"><p>The job has changed since you opened this draft. Review the current agreement before continuing.</p><Button type="button" kind="outline" onClick={()=>{setVersion(job.version);prepared.current=null;setError(null)}}><RefreshCw size={15}/>I reviewed the latest details</Button></div>}<label>Scope of work<textarea required maxLength={2000} rows={3} value={scope} onChange={e=>setScope(e.target.value)}/></label><label>{purpose==='inspection_visit'?'Inspection visit fee (PKR)':'Repair labour amount (PKR)'}<input aria-label={purpose==='inspection_visit'?'Inspection visit fee (PKR)':'Repair labour amount (PKR)'} aria-describedby={hintId} required inputMode="decimal" value={amount} onChange={e=>setAmount(e.target.value)} placeholder="e.g. 800" autoComplete="off"/><span id={hintId} className="field-hint">Use rupees, with up to two decimal places. Enter 0 explicitly for no charge.</span></label>{purpose==='repair_after_inspection'&&<div className="inspection-credit"><div><span>Earlier agreed inspection fee</span><strong>{formatMoney(previousVisit)}</strong></div><label><input type="checkbox" checked={creditVisit} disabled={!previousVisit} onChange={e=>setCreditVisit(e.target.checked)}/>Count this visit fee toward the repair labour</label><p>The repair amount below is {creditVisit?'reduced by the visit-fee credit.':'additional to the inspection fee.'}</p></div>}<label>Quote expires in<select value={expiryMinutes} onChange={e=>setExpiryMinutes(e.target.value)}><option value="15">15 minutes</option><option value="30">30 minutes</option><option value="60">1 hour</option><option value="120">2 hours</option></select></label><div className="quote-preview"><span>{purpose==='inspection_visit'?'Visit fee to agree':'Repair labour to agree'}</span><strong>{preview?.valid?formatMoney(preview.totalMinor):'Enter an amount'}</strong>{preview?.creditMinor>0&&<small>{formatMoney(preview.creditMinor)} inspection credit included</small>}</div><p className="materials-note"><ShieldCheck size={16}/>Materials excluded. Any extra work or materials need the customer’s approval.</p><div className="form-actions"><Button type="button" kind="outline" disabled={busy} onClick={onClose}>Keep discussing</Button><Button type="submit" busy={busy} disabled={changed}>Send {current?'revised ':''}quote <ArrowRight size={16}/></Button></div></form>
}
