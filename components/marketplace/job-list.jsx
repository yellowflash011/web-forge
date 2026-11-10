'use client';
import Link from 'next/link';
import {ArrowRight,ArrowUpRight,BriefcaseBusiness,UserRound,Wrench} from 'lucide-react';
import {Button,ErrorNotice,Empty,areaName} from './shared';
import {useMarketplace} from '../../features/marketplace/provider';
import {useOperation} from '../../features/marketplace/use-resource';
import {paths,jobPath} from '../../features/marketplace/routes';
export default function JobList({items=[],workspace='customer',loading=false}){
 const {session,identityLoading,startSession}=useMarketplace();const action=useOperation();
 if(identityLoading||loading)return <div className="worker-skeleton" aria-label="Loading jobs" aria-busy="true"/>;
 return <div className="live-job-list"><ErrorNotice error={action.error}/>{!session?<Empty icon={UserRound} title="Keep your conversations together." action={<Button busy={action.busy} onClick={()=>action.run(startSession)}>Continue as guest <ArrowRight size={16}/></Button>}>Start a session before viewing your requests.</Empty>:!items.length?<Empty icon={BriefcaseBusiness} title={workspace==='worker'?'Your next connection starts here.':'A helping hand starts with a conversation.'} action={<Link className="btn" href={paths.home}>Explore professionals <ArrowUpRight size={16}/></Link>}>{workspace==='worker'?'Incoming requests appear here. Availability lets neighbours discover you.':'Requests you send will appear here with their latest status.'}</Empty>:items.map(job=><article className="job-list-card" key={job.id}><span className="incoming-icon"><Wrench size={24}/></span><div><span className="eyebrow">{job.isDemo?'LOCAL DEMO REQUEST':'YOUR REQUEST'}</span><h3>{job.task}</h3><p>{areaName(job.localityId)} · {job.pricingPath==='inspection'?'Inspection first':'Discuss a fixed quote'}</p></div><span className="pill">{job.state.replaceAll('_',' ')}</span><Link className="btn" href={jobPath(job.id)}>Open conversation <ArrowUpRight size={16}/></Link></article>)}</div>
}
