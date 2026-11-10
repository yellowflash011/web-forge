import MarketplaceShell from '../../components/marketplace/shell';
import DiscoveryPage from '../../features/marketplace/discovery-page';
export const metadata={title:'Saved professionals | Roshan Rozgar'};
export default function Page(){return <MarketplaceShell section="saved"><DiscoveryPage savedOnly/></MarketplaceShell>}
