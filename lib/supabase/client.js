import {requirePublicConfiguration} from './configuration.js';
let browserClient;
export async function getSupabaseBrowserClient(){
 if(typeof window==='undefined')throw Object.assign(new Error('The browser Supabase client cannot be used on the server.'),{code:'NETWORK_ERROR'});
 if(browserClient)return browserClient;
 // Direct property references are required for Next.js public env substitution.
 const config=requirePublicConfiguration(process.env.NEXT_PUBLIC_SUPABASE_URL,process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY||process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
 const {createBrowserClient}=await import('@supabase/ssr');
 browserClient=createBrowserClient(config.url,config.key);
 return browserClient;
}
