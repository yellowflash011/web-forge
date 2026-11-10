import AuthPage from '../../../features/marketplace/auth-page';
export const metadata={title:'register | Roshan Rozgar'};
export default async function Page({searchParams}){const params=await searchParams;return <AuthPage mode="register" next={typeof params.next==='string'?params.next:'/'} />}
