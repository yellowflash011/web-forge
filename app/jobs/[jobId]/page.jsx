import {notFound} from 'next/navigation';
import MarketplaceShell from '../../../components/marketplace/shell';
import JobPage from '../../../features/marketplace/job-page';
import {isRecordId} from '../../../features/marketplace/routes';
export const metadata={title:'Job workspace | Roshan Rozgar'};
export default async function Page({params}){const {jobId}=await params;if(!isRecordId(jobId))notFound();return <MarketplaceShell section="job"><JobPage key={jobId} jobId={jobId}/></MarketplaceShell>}
