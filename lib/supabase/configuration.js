export function requirePublicConfiguration(url,key){
 if(!url||!key||url.includes('your-project')||key.includes('your-'))throw Object.assign(new Error('Supabase is not configured. Set its public URL and publishable key, or explicitly select demo mode.'),{code:'NETWORK_ERROR'});
 let parsed;try{parsed=new URL(url)}catch{throw Object.assign(new Error('Supabase URL is invalid.'),{code:'VALIDATION_ERROR'})}
 if(!['https:','http:'].includes(parsed.protocol))throw Object.assign(new Error('Supabase URL must use HTTP or HTTPS.'),{code:'VALIDATION_ERROR'});
 return {url,key};
}
