// Temporary visual QA server. Serves only generated HTML evidence and sample portraits.
import http from 'node:http';
import {readFile} from 'node:fs/promises';
const names=new Set(['quote-editor.html','review-form.html','completed-review.html']);
const pictures=new Set(['profile-1.jpg','profile-2.jpg','profile-3.jpg']);
const server=http.createServer(async(req,res)=>{
 try{
  const path=new URL(req.url,'http://localhost').pathname;
  let file,type;
  if(names.has(path.slice(1))){file=new URL(`./evidence/${path.slice(1)}`,import.meta.url);type='text/html; charset=utf-8'}
  else if(path.startsWith('/images/')&&pictures.has(path.slice(8))){file=new URL(`../../public/images/${path.slice(8)}`,import.meta.url);type='image/jpeg'}
  else{res.writeHead(404);res.end('Not found');return}
  const bytes=await readFile(file);res.writeHead(200,{'Content-Type':type,'Cache-Control':'no-store'});res.end(bytes);
 }catch{res.writeHead(500);res.end('Evidence could not load')}
});
server.listen(3010,'127.0.0.1',()=>console.log('UI verification fixtures: http://localhost:3010/quote-editor.html'));
