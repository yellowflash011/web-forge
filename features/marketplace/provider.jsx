'use client';
import React,{createContext,useContext,useState,useEffect,useRef,useCallback} from 'react';
import * as api from './services';
import {areas} from '../../components/marketplace/shared';
import {registeredSession} from './auth-policy';
import {getSupabaseBrowserClient} from '../../lib/supabase/client';
const MarketplaceContext=createContext(null);
export const unwrap=result=>{if(result.error)throw result.error;return result.data};

export function MarketplaceProvider({children,services=api}){
 const [session,setSession]=useState(null),[own,setOwn]=useState(null),[identityLoading,setIdentityLoading]=useState(true),[identityError,setIdentityError]=useState(null),[locality,setLocalityState]=useState(areas[0].id),[saved,setSaved]=useState([]),[trade,setTrade]=useState(''),[query,setQuery]=useState(''),[sort,setSort]=useState('recommended'),[notice,setNotice]=useState('');
 const alive=useRef(false),epoch=useRef(0),identity=useRef(null);
 const [requestDrafts,setRequestDrafts]=useState({});
 const setRequestDraft=useCallback((workerId,patch)=>setRequestDrafts(current=>({...current,[workerId]:{...current[workerId],...patch}})),[]);
 const refreshIdentity=useCallback(async()=>{
  const stamp=++epoch.current;
  try{
   let candidate;
   if(services===api){const client=await getSupabaseBrowserClient();const {data,error}=await client.auth.getSession();if(error)throw error;candidate=data.session&&!data.session.user.is_anonymous?unwrap(await services.getSession()):null}
   else candidate=unwrap(await services.getSession());
   const nextSession=registeredSession(candidate)?candidate:null;
   const nextWorker=nextSession?unwrap(await services.getMyWorkerProfile()):null;
   if(alive.current&&stamp===epoch.current){if(identity.current!==nextSession?.userId){setRequestDrafts({});setNotice('');identity.current=nextSession?.userId}setSession(nextSession);setOwn(nextWorker);setIdentityError(null)}
   return nextSession;
  }catch(error){if(alive.current&&stamp===epoch.current){setSession(null);setOwn(null);setIdentityError(error?.message?error:{message:'Your session could not be restored.'})}throw error}
  finally{if(alive.current&&stamp===epoch.current)setIdentityLoading(false)}
 },[services]);
 useEffect(()=>{
  alive.current=true;refreshIdentity().catch(()=>{});
  try{const ids=JSON.parse(localStorage.getItem('rr-saved-v1')||'[]');if(Array.isArray(ids))setSaved(ids.filter(id=>typeof id==='string'));const storedArea=localStorage.getItem('rr-locality-v1');if(areas.some(a=>a.id===storedArea))setLocalityState(storedArea)}catch{}
  let subscription,timer,disposed=false;if(services===api)getSupabaseBrowserClient().then(client=>{if(disposed)return;subscription=client.auth.onAuthStateChange((event,authSession)=>{if(event==='INITIAL_SESSION')return;clearTimeout(timer);if(event==='SIGNED_OUT'||identity.current!==authSession?.user?.id){epoch.current++;setSession(null);setOwn(null);setRequestDrafts({});setIdentityLoading(true)}timer=setTimeout(()=>refreshIdentity().catch(()=>{}),0)}).data.subscription}).catch(()=>{});
  const focus=()=>{if(document.visibilityState==='visible')refreshIdentity().catch(()=>{})};
  window.addEventListener('focus',focus);document.addEventListener('visibilitychange',focus);
  return()=>{disposed=true;subscription?.unsubscribe();clearTimeout(timer);alive.current=false;epoch.current++;window.removeEventListener('focus',focus);document.removeEventListener('visibilitychange',focus)};
 },[refreshIdentity]);
 const setLocality=value=>{if(!areas.some(a=>a.id===value))return;setLocalityState(value);try{localStorage.setItem('rr-locality-v1',value)}catch{}};
 const save=id=>{const next=saved.includes(id)?saved.filter(item=>item!==id):[...saved,id];setSaved(next);try{localStorage.setItem('rr-saved-v1',JSON.stringify(next))}catch{setNotice('Saved for this visit only; browser storage is unavailable.')}};
 const signOut=async()=>{unwrap(await services.signOut());epoch.current++;setSession(null);setOwn(null);setRequestDrafts({});setIdentityError(null);setNotice('Signed out. Prior records remain attached to the previous identity.')};
 return <MarketplaceContext.Provider value={{services,session,own,setOwn,identityLoading,identityError,refreshIdentity,signOut,locality,setLocality,saved,save,trade,setTrade,query,setQuery,sort,setSort,notice,setNotice,requestDrafts,setRequestDraft}}>{children}</MarketplaceContext.Provider>;
}
export function useMarketplace(){const context=useContext(MarketplaceContext);if(!context)throw Error('MarketplaceProvider is required.');return context}
