'use client';
import {useState,useRef,useEffect,useCallback} from 'react';
import {friendlyJobError} from './job-policy';

const unwrap=result=>{if(result.error)throw result.error;return result.data};
export function useJobWorkspace(jobId,services){
 const [job,setJob]=useState(null),[allowedActions,setAllowedActions]=useState([]),[messages,setMessages]=useState([]),[worker,setWorker]=useState(null),[review,setReview]=useState(null),[evidenceReady,setEvidenceReady]=useState(false),[evidenceError,setEvidenceError]=useState(null),[hasMore,setHasMore]=useState(false),[error,setError]=useState(null),[notice,setNotice]=useState(''),[loading,setLoading]=useState(true),[pending,setPending]=useState(null);
 const active=useRef(false),epoch=useRef(0),locked=useRef(false),current=useRef(null),history=useRef([]),savedReview=useRef(null),intents=useRef(new Map());

 const refresh=useCallback(async({initial=false,force=false}={})=>{
  if(locked.current&&!force)return;
  const stamp=++epoch.current;
  if(initial)setLoading(true);
  try{
   const data=unwrap(await services.getJob({jobId}));
   if(!active.current||stamp!==epoch.current)return;
   if(!data?.job||data.job.id!==jobId)throw {code:'NOT_FOUND',message:'This job could not be found.'};
   current.current=data.job;setJob(data.job);setAllowedActions(Array.isArray(data.allowedActions)?data.allowedActions:[]);
   const last=history.current.at(-1);
   const results=await Promise.allSettled([
    services.listMessages({jobId,limit:100,...(last?{afterCreatedAt:last.createdAt,afterId:last.id}:{})}),
    services.getWorker({workerId:data.job.workerId}),
   ]);
   if(!active.current||stamp!==epoch.current)return;
   const conversation=results[0];
   if(conversation.status==='fulfilled'&&!conversation.value.error){
    const items=conversation.value.data.items;
    const merged=[...new Map([...history.current,...items].map(m=>[m.id,m])).values()].sort((a,b)=>a.createdAt.localeCompare(b.createdAt)||a.id.localeCompare(b.id));
    history.current=merged;setMessages(merged);setHasMore(conversation.value.data.hasMore);
   }else setError({code:'NETWORK_ERROR',message:'The latest messages could not load. Refresh the conversation to retry.'});
   const evidence=results[1];
   if(evidence.status==='fulfilled'&&!evidence.value.error){
    setWorker(evidence.value.data.worker);const existing=evidence.value.data.reviews.find(r=>r.jobId===jobId)||savedReview.current;
    setReview(existing||null);setEvidenceReady(true);setEvidenceError(null);
   }else{setEvidenceReady(false);setEvidenceError({message:'Review history could not be checked. Refresh before leaving feedback.'})}
   return data.job;
  }catch(e){
   if(active.current&&stamp===epoch.current){setError(friendlyJobError(e));setAllowedActions([]);if(['FORBIDDEN','UNAUTHENTICATED','NOT_FOUND'].includes(e.code)){current.current=null;history.current=[];setJob(null);setWorker(null);setMessages([]);setReview(null)}}
  }finally{if(active.current&&stamp===epoch.current)setLoading(false)}
 },[jobId,services]);

 useEffect(()=>{
  active.current=true;current.current=null;history.current=[];savedReview.current=null;intents.current.clear();setJob(null);setMessages([]);setReview(null);setEvidenceReady(false);setError(null);setNotice('');
  refresh({initial:true});
  const focus=()=>{if(document.visibilityState==='visible')refresh()};
  window.addEventListener('focus',focus);document.addEventListener('visibilitychange',focus);const timer=setInterval(focus,10000);
  return()=>{active.current=false;epoch.current++;clearInterval(timer);window.removeEventListener('focus',focus);document.removeEventListener('visibilitychange',focus)};
 },[refresh]);

 const mutate=useCallback(async(operation,input={},successMessage='Saved.')=>{
  if(locked.current||!current.current)return {ok:false};
  locked.current=true;epoch.current++;setPending(operation);setError(null);setNotice('');
  const payload={jobId,...input};
  const signature=operation+JSON.stringify(payload);
  if(!intents.current.has(signature))intents.current.set(signature,crypto.randomUUID());
  try{
   const data=unwrap(await services[operation]({...payload,idempotencyKey:intents.current.get(signature)}));
   if(!active.current)return {ok:false};
   if(data?.id===jobId&&data.state){current.current=data;setJob(data);setAllowedActions([])}
   if(operation==='submitReview'){
    if(!data?.review?.id)throw {code:'NETWORK_ERROR',message:'The server did not confirm your review. Please refresh before retrying.'};
    savedReview.current=data.review;setReview(data.review);if(data.worker)setWorker(data.worker);
   }
   setNotice(successMessage);
   await refresh({force:true});
   return {ok:true,data};
  }catch(e){
   if(active.current){
    // Reconcile conflicts before the next consent/action. Retain the original
    // idempotency key on network failures so a retry cannot duplicate intent.
    if(['VERSION_CONFLICT','QUOTE_STALE','WORKER_UNAVAILABLE','INVALID_TRANSITION','FORBIDDEN','UNAUTHENTICATED'].includes(e.code))await refresh({force:true});
    setError(friendlyJobError(e));
   }
   return {ok:false,error:e};
  }finally{locked.current=false;if(active.current){setPending(null);setLoading(false)}}
 },[jobId,services,refresh]);

 return {job,allowedActions,messages,worker,review,evidenceReady,evidenceError,hasMore,error,notice,loading,pending,refresh,mutate};
}
