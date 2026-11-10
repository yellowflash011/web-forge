'use client';
import React,{useEffect,useState,useRef} from 'react';
import Link from 'next/link';
import {useRouter} from 'next/navigation';
import {ArrowRight,Eye,EyeOff,ShieldCheck,Mail} from 'lucide-react';
import {Logo,Button,ErrorNotice} from '../../components/marketplace/shared';
import {useMarketplace} from './provider';
import {authenticate,finishAuthRedirect} from './auth-service';
import {safeDestination,registeredSession} from './auth-policy';

const copy={login:['WELCOME BACK','Good work starts with a connection.','Sign in to find help, offer your skills and keep every agreement together.','Sign in'],register:['A PLACE IN YOUR NEIGHBOURHOOD','Your next connection starts here.','Create one account to find a professional or share your own skills.','Create account'],forgot:['LET’S GET YOU BACK','A fresh start, in your inbox.','Enter your email and we’ll send a link to reset your password.','Send reset link'],reset:['YOUR ACCOUNT, SECURED','Choose a new password.','Use a unique password with at least eight characters.','Save new password'],callback:['CONFIRMING YOUR ACCOUNT','One moment. You’re nearly home.','We’re checking your email link.','Continue']};
export default function AuthPage({mode='login',next='/',authOperation=authenticate,completeRedirect=finishAuthRedirect}){
 const router=useRouter(),{session,refreshIdentity}=useMarketplace();const [name,setName]=useState(''),[email,setEmail]=useState(''),[password,setPassword]=useState(''),[confirmation,setConfirmation]=useState(''),[visible,setVisible]=useState(false),[busy,setBusy]=useState(false),[error,setError]=useState(null),[notice,setNotice]=useState(''),[resetReady,setResetReady]=useState(false);const lock=useRef(false),redirectStarted=useRef(false);const destination=safeDestination(next),text=copy[mode];
 useEffect(()=>{if(mode==='login'&&registeredSession(session))router.replace(destination)},[session,mode,destination,router]);
 useEffect(()=>{
  if(!['callback','reset'].includes(mode))return;let active=true;
  const params=new URLSearchParams(window.location.search),hash=new URLSearchParams(window.location.hash.slice(1));
  const code=params.get('code'),linkError=params.get('error_description')||hash.get('error_description');
  (async()=>{setBusy(true);try{if(linkError)throw Error(linkError);redirectStarted.current ||=completeRedirect(code);await redirectStarted.current;await refreshIdentity();if(active){if(mode==='reset')setResetReady(true);else router.replace(destination)}}catch(e){if(active)setError({message:e.message})}finally{if(active)setBusy(false)}})();
  return()=>{active=false};
 },[mode,destination,refreshIdentity,router]);
 const submit=async event=>{
  event.preventDefault();if(lock.current)return;setError(null);setNotice('');
  if(['register','reset'].includes(mode)&&password!==confirmation){setError({message:'The passwords do not match.'});return}
  lock.current=true;setBusy(true);
  try{
   const redirectTo=window.location.origin+(mode==='forgot'?'/auth/reset-password/?next='+encodeURIComponent(destination):'/auth/callback/?next='+encodeURIComponent(destination));
   const result=await authOperation(mode,{name:name.trim(),email:email.trim(),password,redirectTo});if(result.error)throw result.error;
   if(mode==='forgot'){setNotice('If an account exists for this email, a reset link will arrive shortly. Check your spam folder too.');return}
   if(mode==='register'&&!result.data.session){setNotice('Check your inbox to confirm your email, then return to sign in.');setPassword('');setConfirmation('');return}
   if(mode==='reset'){setNotice('Your password is updated.');await refreshIdentity();router.replace(destination);return}
   const identity=await refreshIdentity();if(!registeredSession(identity))throw Error('Your sign-in could not be confirmed. Please try again.');router.replace(destination);
  }catch(e){setError({message:e.message||'This request could not finish. Please retry.'})}finally{lock.current=false;setBusy(false)}
 };
 return <main className="auth-layout"><section className="auth-story"><Logo/><span className="eyebrow">YOUR NEIGHBOURHOOD. YOUR PEOPLE.</span><h1>Good work.<br/>Closer <span className="serif">together.</span></h1><p>Find a helping hand. Share a skill. Build a connection that lasts.</p><div className="auth-promise"><ShieldCheck size={27}/><p>Your conversations and agreements belong to your account.</p></div><span className="auth-sun">✳</span></section><section className="auth-form-panel"><span className="eyebrow">{text[0]}</span><h2>{text[1]}</h2><p>{text[2]}</p><ErrorNotice error={error}/>{notice&&<div role="status" className="form-notice"><Mail size={18}/>{notice}</div>}{mode!=='callback'&&<form className="profile-form" onSubmit={submit}>{mode==='register'&&<label>Your name<input required autoComplete="name" maxLength={80} value={name} onChange={e=>setName(e.target.value)}/></label>}{mode!=='reset'&&<label>Email address<input required type="email" autoComplete="email" maxLength={254} value={email} onChange={e=>setEmail(e.target.value)}/></label>}{mode!=='forgot'&&<><label>Password<div className="password-field"><input aria-label="Password" required minLength={mode==='login'?1:8} maxLength={128} type={visible?'text':'password'} autoComplete={mode==='login'?'current-password':'new-password'} value={password} onChange={e=>setPassword(e.target.value)}/><button type="button" aria-label={visible?'Hide password':'Show password'} onClick={()=>setVisible(!visible)}>{visible?<EyeOff size={18}/>:<Eye size={18}/>}</button></div></label>{['register','reset'].includes(mode)&&<label>Confirm password<input required minLength={8} maxLength={128} type={visible?'text':'password'} autoComplete="new-password" value={confirmation} onChange={e=>setConfirmation(e.target.value)}/></label>}</>}<Button type="submit" className="full" busy={busy} disabled={mode==='reset'&&!resetReady}>{text[3]}<ArrowRight size={17}/></Button></form>}{mode==='login'&&<><Link href={'/auth/forgot-password/?next='+encodeURIComponent(destination)} className="auth-secondary">Forgot your password?</Link><p className="auth-switch">New around here? <Link href={'/auth/register/?next='+encodeURIComponent(destination)}>Create an account</Link></p></>}{mode!=='login'&&<Link className="auth-secondary" href={'/auth/login/?next='+encodeURIComponent(destination)}>Back to sign in</Link>}<p className="auth-fine">One account for hiring and offering services. Quotes record an agreed price; payment is arranged outside the platform.</p></section></main>;
}
