// Operator-run LIVE test. Requires an uploaded real Urdu recording and its user's
// access token. No Gemini key is read by this script or sent to the browser.
const url=process.env.VOICE_SMOKE_URL;
const token=process.env.VOICE_SMOKE_ACCESS_TOKEN;
const audioRef=process.env.VOICE_SMOKE_AUDIO_REF;
if(!url||!token||!audioRef){console.log('BLOCKED: set VOICE_SMOKE_URL, VOICE_SMOKE_ACCESS_TOKEN and VOICE_SMOKE_AUDIO_REF for a real uploaded Urdu recording.');process.exitCode=1}
else{
 try{
  const response=await fetch(url,{method:'POST',headers:{Authorization:`Bearer ${token}`,'Content-Type':'application/json'},body:JSON.stringify({audioRef,purpose:'worker_profile',locale:'ur'}),signal:AbortSignal.timeout(60000)});
  const result=await response.json();if(!response.ok||result.error||!result.data?.transcript?.trim()||!result.data.fields)throw Error('Live voice endpoint did not return a valid result.');
  console.log(JSON.stringify({success:true,hasTranscript:true,fieldKeys:Object.keys(result.data.fields),missingFieldCount:result.data.missingFields.length}));
 }catch{console.error('FAILED: deployed voice endpoint could not transcribe the supplied recording. Inspect configuration privately.');process.exitCode=1}
}
