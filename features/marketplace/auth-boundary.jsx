'use client';
import {useEffect} from 'react';
import Link from 'next/link';
import {usePathname,useRouter} from 'next/navigation';
import {useMarketplace} from './provider';
import {registeredSession} from './auth-policy';
import {ErrorNotice} from '../../components/marketplace/shared';
export default function AuthBoundary({children}){
 const {session,identityLoading,identityError,refreshIdentity}=useMarketplace();const pathname=usePathname(),router=useRouter();
 useEffect(()=>{if(!identityLoading&&!identityError&&!registeredSession(session))router.replace('/auth/login/?next='+encodeURIComponent(pathname+window.location.search))},[session,identityLoading,identityError,pathname,router]);
 if(identityLoading)return <main className="page-container"><div className="worker-skeleton" role="status">Restoring your account…</div></main>;
 if(identityError)return <main className="page-container account-panel"><h1>Let’s reconnect.</h1><ErrorNotice error={identityError} onRetry={()=>refreshIdentity().catch(()=>{})}/><Link className="btn outline" href="/auth/login/">Return to sign in</Link></main>;
 if(!registeredSession(session))return <main className="page-container"><p role="status">Opening sign in…</p></main>;
 return children;
}
