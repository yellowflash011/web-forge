'use client';
import Link from 'next/link';
import {UserRound,ArrowRight,ArrowUpRight,LogOut} from 'lucide-react';
import {useMarketplace} from './provider';
import {useOperation} from './use-resource';
import {paths} from './routes';
import {Button,ErrorNotice} from '../../components/marketplace/shared';
export default function AccountPage(){
 const {services,session,identityLoading,startSession,signOut}=useMarketplace();const action=useOperation();
 if(identityLoading)return <div className="worker-skeleton" aria-label="Loading account" aria-busy="true"/>;
 return <section className="account-panel profile-form"><span className="eyebrow">YOUR ACCOUNT</span><h1>A connection you can return to.</h1><p>{services.mode==='demo'?'This local demo does not authenticate you with Supabase.':'A guest session lets you begin without a long signup form.'}</p><ErrorNotice error={action.error}/><div className="session-card"><UserRound size={28}/><div><strong>{session?.displayName||'Browsing as a visitor'}</strong><span>{session?(session.isAnonymous?'Guest session':'Signed-in session'):'No session started'}</span></div></div>{!session?<Button busy={action.busy} onClick={()=>action.run(startSession)}>Continue as guest <ArrowRight size={16}/></Button>:<><p className="demo-note">Clearing browser data may lose guest access. Account linking and recovery require the connected auth integration.</p><Button kind="outline" busy={action.busy} onClick={()=>action.run(signOut)}><LogOut size={16}/>Sign out</Button></>}<Link className="btn outline" href={paths.worker}>My worker workspace <ArrowUpRight size={16}/></Link></section>
}
