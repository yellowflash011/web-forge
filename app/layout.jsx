import './globals.css';
import './implementation.css';
import './jobs.css';
import './routing.css';
import './account-voice.css';
import {MarketplaceProvider} from '../features/marketplace/provider';
export const metadata = { title: 'Roshan Rozgar — Good work. Close to home.', description: 'Find nearby skilled professionals, agree a clear quote, and manage local jobs.' };
export default function RootLayout({children}) { return <html lang="en" data-scroll-behavior="smooth"><body><MarketplaceProvider>{children}</MarketplaceProvider></body></html>; }
