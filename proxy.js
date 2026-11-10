import {updateRegisteredSession} from './lib/supabase/proxy';
export async function proxy(request){return updateRegisteredSession(request)}
export const config={matcher:['/','/account/:path*','/jobs/:path*','/worker/:path*','/onboarding/:path*','/profile/:path*','/saved/:path*']};
