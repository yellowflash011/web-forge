import {createServerClient} from '@supabase/ssr';
import {NextResponse} from 'next/server.js';
import {requirePublicConfiguration} from './configuration.js';

export async function updateRegisteredSession(request,{createClient=createServerClient,url=process.env.NEXT_PUBLIC_SUPABASE_URL,key=process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY||process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY}={}){
 let response=NextResponse.next({request});
 response.headers.set('Cache-Control','private, no-store');
 try{
  const configuration=requirePublicConfiguration(url,key);
  const client=createClient(configuration.url,configuration.key,{cookies:{
   getAll:()=>request.cookies.getAll(),
   setAll:values=>{for(const {name,value}of values)request.cookies.set(name,value);response=NextResponse.next({request});response.headers.set('Cache-Control','private, no-store');for(const {name,value,options}of values)response.cookies.set(name,value,options)},
  }});
  // Verify with Auth, rather than trusting user-controlled session cookies.
  const {data:{user},error}=await client.auth.getUser();
  if(error&&(error.status===0||error.status>=500))throw error;
  if(!user||error||user.is_anonymous||!user.email_confirmed_at){
   const destination=request.nextUrl.clone();destination.pathname='/auth/login/';destination.search='';destination.searchParams.set('next',request.nextUrl.pathname+request.nextUrl.search);
   const redirect=NextResponse.redirect(destination);
   for(const cookie of response.cookies.getAll())redirect.cookies.set(cookie);
   redirect.headers.set('Cache-Control','private, no-store');return redirect;
  }
  return response;
 }catch{
  return new NextResponse('Account verification is temporarily unavailable. Please retry shortly.',{status:503,headers:{'Cache-Control':'no-store','Retry-After':'30','Content-Type':'text/plain; charset=utf-8'}});
 }
}
