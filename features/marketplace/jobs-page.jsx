'use client';
import {useCallback} from 'react';
import {useMarketplace} from './provider';
import {useResource} from './use-resource';
import {ErrorNotice} from '../../components/marketplace/shared';
import JobList from '../../components/marketplace/job-list';
export default function JobsPage(){
 const {services,session,identityLoading}=useMarketplace();
 const fetchJobs=useCallback(()=>services.listMyJobs({workspace:'customer'}),[services,session?.userId]);
 const resource=useResource(fetchJobs,{enabled:!identityLoading&&Boolean(session),pollMs:12000});
 return <><section className="worker-greeting"><div><span className="eyebrow">EVERYTHING, IN ONE PLACE</span><h1>Your home’s helping hands.</h1><p>Requests and conversations you can come back to.</p></div></section><ErrorNotice error={resource.error} onRetry={resource.reload}/>{(!resource.error||resource.data)&&<JobList items={resource.data?.items||[]} loading={identityLoading||resource.loading&&!resource.data}/>}</>
}
