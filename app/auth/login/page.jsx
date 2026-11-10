import AuthPage from '../../../features/marketplace/auth-page';
export const metadata={title:'Sign in | Roshan Rozgar'};
export default async function Page({searchParams}){const params=await searchParams;return <AuthPage mode="login" next={typeof params.next==='string'?params.next:'/'} />}
