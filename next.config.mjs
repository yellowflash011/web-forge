import {requirePublicConfiguration} from './lib/supabase/configuration.js';
if(process.env.VERCEL){
 const {url}=requirePublicConfiguration(process.env.NEXT_PUBLIC_SUPABASE_URL,process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY||process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
 if(new URL(url).protocol!=='https:'||['localhost','127.0.0.1','[::1]'].includes(new URL(url).hostname))throw Error('Vercel requires a hosted HTTPS Supabase URL.');
 if(process.env.NEXT_PUBLIC_APP_MODE==='demo')throw Error('Vercel deployments must use live account services.');
}
const nextConfig = { distDir: process.env.NEXT_DIST_DIR || (process.env.NODE_ENV === 'development' ? '.next-dev' : '.next'), images: { unoptimized: true }, trailingSlash: true, devIndicators: false,poweredByHeader:false,
 async headers(){return [{source:'/:path*',headers:[{key:'X-Content-Type-Options',value:'nosniff'},{key:'Referrer-Policy',value:'strict-origin-when-cross-origin'},{key:'X-Frame-Options',value:'DENY'},{key:'Permissions-Policy',value:'camera=(), microphone=(self), geolocation=()'}]}]},
};
export default nextConfig;
