'use client';
import {createContext,useContext,useState,useEffect,useRef,useCallback} from 'react';
import * as api from './services';
import {areas} from '../../components/marketplace/shared';
const MarketplaceContext=createContext(null);
export const unwrap=result=>{if(result.error)throw result.error;return result.data};

export function MarketplaceProvider({children,services=api}){
 const [session,setSession]=useState(null),[own,setOwn]=useState(null),[identityLoading,setIdentityLoading]=useState(true),[identityError,setIdentityError]=useState(null),[locality,setLocalityState]=useState(areas[0].id),[saved,setSaved]=useState([]),[trade,setTrade]=useState(''),[query,setQuery]=useState(''),[sort,setSort]=useState('recommended'),[notice,setNotice]=useState('');
 const alive=useRef(false),epoch=useRef(0);
 const [requestDrafts,setRequestDrafts]=useState({});
 const setRequestDraft=useCallback((workerId,patch)=>setRequestDrafts(current=>({...current,[workerId]:{...current[workerId],...patch}})),[]);
 const refreshIdentity=useCallback(async()=>{
  const stamp=++epoch.current;
  try{
   const nextSession=unwrap(await services.getSession());
   const nextWorker=nextSession?unwrap(await services.getMyWorkerProfile()):null;
   if(alive.current&&stamp===epoch.current){setSession(nextSession);setOwn(nextWorker);setIdentityError(null)}
   return nextSession;
  }catch(error){if(alive.current&&stamp===epoch.current){setSession(null);setOwn(null);setIdentityError(error?.message?error:{message:'Your session could not be restored.'})}throw error}
  finally{if(alive.current&&stamp===epoch.current)setIdentityLoading(false)}
 },[services]);
 useEffect(()=>{
  alive.current=true;refreshIdentity().catch(()=>{});
  try{const ids=JSON.parse(localStorage.getItem('rr-saved-v1')||'[]');if(Array.isArray(ids))setSaved(ids.filter(id=>typeof id==='string'));const storedArea=localStorage.getItem('rr-locality-v1');if(areas.some(a=>a.id===storedArea))setLocalityState(storedArea)}catch{}
  const focus=()=>{if(document.visibilityState==='visible')refreshIdentity().catch(()=>{})};
  window.addEventListener('focus',focus);document.addEventListener('visibilitychange',focus);
  return()=>{alive.current=false;epoch.current++;window.removeEventListener('focus',focus);document.removeEventListener('visibilitychange',focus)};
 },[refreshIdentity]);
 const setLocality=value=>{if(!areas.some(a=>a.id===value))return;setLocalityState(value);try{localStorage.setItem('rr-locality-v1',value)}catch{}};
 const save=id=>{const next=saved.includes(id)?saved.filter(item=>item!==id):[...saved,id];setSaved(next);try{localStorage.setItem('rr-saved-v1',JSON.stringify(next))}catch{setNotice('Saved for this visit only; browser storage is unavailable.')}};
 const startSession=async()=>{unwrap(await services.ensureSession());await refreshIdentity();setNotice(services.mode==='demo'?'Demo session ready. Data stays in this browser.':'Your guest session is ready.')};
 const signOut=async()=>{unwrap(await services.signOut());epoch.current++;setSession(null);setOwn(null);setRequestDrafts({});setIdentityError(null);setNotice('Signed out. Prior records remain attached to the previous identity.')};
 return <MarketplaceContext.Provider value={{services,session,own,setOwn,identityLoading,identityError,refreshIdentity,startSession,signOut,locality,setLocality,saved,save,trade,setTrade,query,setQuery,sort,setSort,notice,setNotice,requestDrafts,setRequestDraft}}>{children}</MarketplaceContext.Provider>;
}
export function useMarketplace(){const context=useContext(MarketplaceContext);if(!context)throw Error('MarketplaceProvider is required.');return context}
