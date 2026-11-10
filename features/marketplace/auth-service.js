import {getSupabaseBrowserClient} from '../../lib/supabase/client.js';

// Frontend auth uses the same Supabase client/cookies as the domain facade.
// Backend authorization and hosted provider configuration remain Machine B's responsibility.
export async function authenticate(operation,input={}) {
 try {
  const client=await getSupabaseBrowserClient();
  let result;
  if(operation==='login')result=await client.auth.signInWithPassword({email:input.email,password:input.password});
  else if(operation==='register')result=await client.auth.signUp({email:input.email,password:input.password,options:{data:{display_name:input.name},emailRedirectTo:input.redirectTo}});
  else if(operation==='forgot')result=await client.auth.resetPasswordForEmail(input.email,{redirectTo:input.redirectTo});
  else if(operation==='reset'){
   const {data,error}=await client.auth.getUser();
   if(error||!data.user||data.user.is_anonymous)throw Error('Open the password reset link from your email before choosing a new password.');
   result=await client.auth.updateUser({password:input.password});
  }else throw Error('Unsupported account operation.');
  if(result.error)throw result.error;
  if(result.data?.user?.is_anonymous)throw Error('Please sign in with a registered account.');
  return {data:result.data||{},error:null};
 }catch(error){return {data:null,error:{message:error?.message||'Your account request could not finish. Please retry.'}}}
}

export async function finishAuthRedirect(code,{getClient=getSupabaseBrowserClient}={}){
 const client=await getClient();
 if(code){const {error}=await client.auth.exchangeCodeForSession(code);if(error)throw error}
 const {data,error}=await client.auth.getUser();
 if(error||!data.user||data.user.is_anonymous)throw Error('This link is invalid or has expired. Request a new email link.');
 return data.user;
}
