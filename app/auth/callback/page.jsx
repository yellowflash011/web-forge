import AuthPage from '../../../features/marketplace/auth-page';
export const metadata={title:'callback | Roshan Rozgar'};
export default async function Page({searchParams}){const params=await searchParams;return <AuthPage mode="callback" next={typeof params.next==='string'?params.next:'/'} />}
