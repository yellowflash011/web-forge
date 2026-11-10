import {AUDIO_TYPES,MAX_AUDIO_BYTES,extractAudio} from '../_shared/voice-provider.js';
const cors={'Access-Control-Allow-Origin':'*','Access-Control-Allow-Headers':'authorization,apikey,x-client-info,content-type','Access-Control-Allow-Methods':'POST,OPTIONS'};
const json=(body,status=200)=>new Response(JSON.stringify(body),{status,headers:{...cors,'Content-Type':'application/json','Cache-Control':'no-store'}});
const fail=(code,message,status,retryable=false)=>json({data:null,error:{code,message,retryable}},status);

export function createVoiceHandler({createClient,env,extract=extractAudio}){
 return async request=>{
  if(request.method==='OPTIONS')return new Response(null,{status:204,headers:cors});
  if(request.method!=='POST')return fail('VALIDATION_ERROR','Use POST.',405);
  try{
   const authorization=request.headers.get('Authorization');if(!authorization?.startsWith('Bearer '))return fail('UNAUTHENTICATED','A signed-in session is required.',401);
   const url=env('SUPABASE_URL'),key=env('SUPABASE_ANON_KEY')||env('SUPABASE_PUBLISHABLE_KEY');
   if(!url||!key)return fail('AI_UNAVAILABLE','The voice service is not configured.',503);
   const client=createClient(url,key,{global:{headers:{Authorization:authorization}},auth:{persistSession:false,autoRefreshToken:false}});
   const {data:{user},error:authError}=await client.auth.getUser(authorization.slice(7));
   if(authError||!user)return fail('UNAUTHENTICATED','Your session could not be verified.',401);
   if(user.is_anonymous)return fail('UNAUTHENTICATED','Sign in with a registered account.',401);
   const raw=await request.text();if(raw.length>4096)return fail('VALIDATION_ERROR','Request is too large.',413);
   let input;try{input=JSON.parse(raw)}catch{return fail('VALIDATION_ERROR','Invalid JSON.',400)}
   const {audioRef,purpose,locale='ur'}=input||{};
   if(typeof audioRef!=='string'||audioRef.length>500||audioRef.includes('..')||audioRef.split('/')[0]!==user.id)return fail('FORBIDDEN','Only your own recording can be processed.',403);
   if(!['worker_profile','job_request'].includes(purpose)||!['ur','en'].includes(locale))return fail('VALIDATION_ERROR','Invalid extraction purpose or language.',400);
   const apiKey=env('GEMINI_API_KEY'),groqApiKey=env('GROQ_API_KEY');
   const model=env('GEMINI_AUDIO_MODEL')||'gemini-flash-lite-latest';
   if(!apiKey&&!groqApiKey)return fail('AI_UNAVAILABLE','The audio provider is not configured.',503);
   const {data:reserved,error:reserveError}=await client.rpc('reserve_voice_request');
   if(reserveError)return fail('AI_UNAVAILABLE','The voice service migration is not installed.',503);
   if(!reserved)return fail('RATE_LIMITED','Too many recordings. Please wait a few minutes.',429,true);
   // Caller-scoped client applies Storage RLS. No service-role bypass or remote URL fetching.
   const {data:blob,error:audioError}=await client.storage.from('job-audio').download(audioRef);
   if(audioError||!blob)return fail('FORBIDDEN','Recording unavailable to this session.',403);
   const mimeType=blob.type.split(';')[0].toLowerCase();
   if(!blob.size||blob.size>MAX_AUDIO_BYTES||!AUDIO_TYPES.includes(mimeType))return fail('VALIDATION_ERROR','Use a supported audio clip under 5 MB.',400);
   const data=await extract({bytes:new Uint8Array(await blob.arrayBuffer()),mimeType,purpose,locale,apiKey,model,groqApiKey});
   return json({data,error:null});
  }catch{return fail('AI_UNAVAILABLE','The recording could not be processed. Retry or confirm fields manually.',503,true)}
 };
}
