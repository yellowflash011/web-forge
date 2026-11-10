import {requirePublicConfiguration} from './configuration.js';
let browserClient;
export async function getSupabaseBrowserClient(){
 if(typeof window==='undefined')throw Object.assign(new Error('The browser Supabase client cannot be used on the server.'),{code:'NETWORK_ERROR'});
 if(browserClient)return browserClient;
 // Direct property references are required for Next.js public env substitution.
 const config=requirePublicConfiguration(process.env.NEXT_PUBLIC_SUPABASE_URL,process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY||process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
 const {createBrowserClient}=await import('@supabase/ssr');
 // Auth callback pages exchange PKCE codes explicitly once. Automatic exchange
 // races that handler and can consume a code before it verifies the right user.
 browserClient=createBrowserClient(config.url,config.key,{auth:{detectSessionInUrl:false}});
 return browserClient;
}
