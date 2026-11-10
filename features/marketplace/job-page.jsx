'use client';
import {useRouter} from 'next/navigation';
import {useMarketplace} from './provider';
import {paths} from './routes';
import JobWorkspace from '../../components/marketplace/job-workspace';
export default function JobPage({jobId}){
 const {session,own,identityLoading,services}=useMarketplace();const router=useRouter();
 if(identityLoading)return <div className="worker-skeleton" aria-label="Restoring your session" aria-busy="true"/>;
 return <JobWorkspace key={`${jobId}:${session?.userId||'visitor'}`} jobId={jobId} session={session} own={own} services={services} onBack={()=>router.push(paths.jobs)}/>;
}
