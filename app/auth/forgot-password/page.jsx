import AuthPage from '../../../features/marketplace/auth-page';
export const metadata={title:'forgot password | Roshan Rozgar'};
export default async function Page({searchParams}){const params=await searchParams;return <AuthPage mode="forgot" next={typeof params.next==='string'?params.next:'/'} />}
