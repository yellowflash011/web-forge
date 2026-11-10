import {notFound} from 'next/navigation';
import MarketplaceShell from '../../../components/marketplace/shell';
import ProfilePage from '../../../features/marketplace/profile-page';
import {isRecordId} from '../../../features/marketplace/routes';
export const metadata={title:'Professional profile | Roshan Rozgar'};
export default async function Page({params}){const {workerId}=await params;if(!isRecordId(workerId))notFound();return <MarketplaceShell section="profile"><ProfilePage key={workerId} workerId={workerId}/></MarketplaceShell>}
