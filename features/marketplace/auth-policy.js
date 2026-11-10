export function safeDestination(value){
 if(typeof value!=='string'||!value.startsWith('/')||value.startsWith('//')||/[\\\u0000-\u001f]/.test(value))return '/';
 try{const url=new URL(value,'https://roshan.invalid');const decoded=decodeURIComponent(url.pathname);if(decoded.startsWith('//')||/[\\\u0000-\u001f]/.test(decoded)||/^\/auth(?:\/|$)/.test(decoded))return '/';if(url.origin!=='https://roshan.invalid'||/^\/auth(?:\/|$)/.test(url.pathname))return '/';return url.pathname+url.search}catch{return '/'}
}
export const registeredSession=session=>Boolean(session?.userId&&session.isAnonymous===false);
