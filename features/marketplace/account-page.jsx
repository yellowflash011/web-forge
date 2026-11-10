'use client';
import Link from 'next/link';
import {useRouter} from 'next/navigation';
import {UserRound,ArrowUpRight,LogOut} from 'lucide-react';
import {useMarketplace} from './provider';
import {useOperation} from './use-resource';
import {paths} from './routes';
import {Button,ErrorNotice} from '../../components/marketplace/shared';
export default function AccountPage(){
 const {session,signOut}=useMarketplace(),action=useOperation(),router=useRouter();
 return <section className="account-panel profile-form"><span className="eyebrow">YOUR ACCOUNT</span><h1>A connection you can return to.</h1><p>Your requests, conversations and worker profile belong to your account.</p><ErrorNotice error={action.error}/><div className="session-card"><UserRound size={28}/><div><strong>{session?.displayName||'Your account'}</strong><span>Signed in with your registered account</span></div></div><Button kind="outline" busy={action.busy} onClick={()=>action.run(async()=>{await signOut();router.replace('/auth/login/')})}><LogOut size={16}/>Sign out</Button><Link className="btn outline" href={paths.worker}>My worker workspace <ArrowUpRight size={16}/></Link><Link className="auth-secondary" href="/auth/forgot-password/">Reset my password</Link><p className="demo-note">Agreed prices are recorded here. Payment is arranged outside the platform.</p></section>
}
