'use client';
import {useEffect,useState,useRef,useCallback} from 'react';
import {unwrap} from './provider';
export function useResource(loader,{enabled=true,pollMs=0}={}){
 const [data,setData]=useState(null),[loading,setLoading]=useState(enabled),[error,setError]=useState(null);const alive=useRef(false),epoch=useRef(0);
 const reload=useCallback(async()=>{if(!enabled)return;const stamp=++epoch.current;setLoading(true);setError(null);try{const result=unwrap(await loader());if(alive.current&&stamp===epoch.current)setData(result);return result}catch(e){if(alive.current&&stamp===epoch.current){setError(e?.message?e:{message:'This view could not load. Check your connection and retry.'});if(['NOT_FOUND','UNAUTHENTICATED','FORBIDDEN'].includes(e?.code))setData(null)}}finally{if(alive.current&&stamp===epoch.current)setLoading(false)}},[loader,enabled]);
 useEffect(()=>{alive.current=true;if(enabled)reload();else{setData(null);setLoading(false);setError(null)}const focus=()=>{if(document.visibilityState==='visible')reload()};window.addEventListener('focus',focus);const timer=pollMs?setInterval(focus,pollMs):null;return()=>{alive.current=false;epoch.current++;window.removeEventListener('focus',focus);if(timer)clearInterval(timer)}},[reload,enabled,pollMs]);
 return {data,loading,error,reload};
}
export function useOperation(){const [busy,setBusy]=useState(false),[error,setError]=useState(null);const locked=useRef(false);const run=async fn=>{if(locked.current)return;locked.current=true;setBusy(true);setError(null);try{return await fn()}catch(e){setError(e?.message?e:{message:'This action did not finish. Please retry.'})}finally{locked.current=false;setBusy(false)}};return {busy,error,run}}
