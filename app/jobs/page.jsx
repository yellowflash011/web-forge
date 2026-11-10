import MarketplaceShell from '../../components/marketplace/shell';
import JobsPage from '../../features/marketplace/jobs-page';
export const metadata={title:'My jobs | Roshan Rozgar'};
export default function Page(){return <MarketplaceShell section="jobs"><JobsPage/></MarketplaceShell>}
