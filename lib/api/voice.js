import {getSupabaseBrowserClient} from '../supabase/client.js';
import {createError,createSuccess,ERROR_CODES} from './domain.js';

// Browser transports an authorized object reference only. Provider credentials
// and recording bytes are handled exclusively inside the Edge Function.
export async function extractVoice({audioRef,purpose,locale='ur'}={}){
 if(!audioRef||!['worker_profile','job_request'].includes(purpose)||!['ur','en'].includes(locale))return createError(ERROR_CODES.VALIDATION_ERROR,'Choose a recording and extraction purpose.');
 try{
  const client=await getSupabaseBrowserClient();
  const {data,error}=await client.functions.invoke('extract-voice',{body:{audioRef,purpose,locale}});
  if(error)return createError(ERROR_CODES.AI_UNAVAILABLE,'Voice processing is unavailable. Keep your recording and confirm the fields manually.',true);
  if(data?.error)return {data:null,error:data.error};
  if(!data?.data?.fields||typeof data.data.transcript!=='string')return createError(ERROR_CODES.AI_UNAVAILABLE,'The voice service returned an invalid result.');
  return createSuccess(data.data);
 }catch{return createError(ERROR_CODES.AI_UNAVAILABLE,'Voice processing is not configured or could not be reached.',false)}
}
