'use client';
import Link from 'next/link';
import {useRouter} from 'next/navigation';
import {ArrowLeft,ArrowUpRight,Wrench} from 'lucide-react';
import {useMarketplace} from './provider';
import {paths} from './routes';
import WorkerEditor from './worker-editor';
import {Empty} from '../../components/marketplace/shared';
export default function OnboardingPage({editing=false}){
 const {own,setOwn,identityLoading,services,refreshIdentity,setNotice}=useMarketplace();const router=useRouter();
 if(identityLoading)return <div className="worker-skeleton" aria-label="Loading your profile" aria-busy="true"/>;
 return <><Link className="back-link" href={paths.worker}><ArrowLeft size={16}/>Back to my work</Link>{editing&&!own?<Empty icon={Wrench} title="Start with your skill." action={<Link className="btn" href={paths.onboarding}>Create my worker profile <ArrowUpRight size={16}/></Link>}>You have not created a worker profile in this session yet.</Empty>:<WorkerEditor key={own?.id||'new'} services={services} profile={own} onSaved={async worker=>{setOwn(worker);await refreshIdentity();setNotice('Profile saved. Choose when you are available.');router.replace(paths.worker)}}/>}</>
}
