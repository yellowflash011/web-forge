// Actual local PostgreSQL (PGlite), with minimal auth/storage stand-ins.
// This verifies SQL execution and policies, not hosted GoTrue/Storage behavior
// or simultaneous independent network transactions. B5 verifies those live.
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {PGlite} from '@electric-sql/pglite';

test('SQL migrations, safe discovery, booking exclusion, messages and private audio policies',async()=>{
 const db=new PGlite();
 try{
  await db.exec(`
   create role anon; create role authenticated;
   create schema auth;create schema storage;
   create table auth.users(id uuid primary key,email text,raw_user_meta_data jsonb,created_at timestamptz);
   create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
   create table storage.buckets(id text primary key,name text,public boolean,file_size_limit bigint,allowed_mime_types text[]);
   create table storage.objects(id uuid primary key default gen_random_uuid(),bucket_id text references storage.buckets(id),name text,unique(bucket_id,name));
   alter table storage.objects enable row level security;
   grant usage on schema public,auth,storage to anon,authenticated;
   grant execute on function auth.uid() to anon,authenticated;
   grant all on storage.objects to authenticated;
   alter default privileges in schema public grant all on tables to anon,authenticated;
  `);
  for(const file of ['20261110000001_initial_schema.sql','20261110000002_domain_rpcs.sql','20261110000003_seed_data.sql','20261110000004_integration_hardening.sql']){
   let sql=await readFile(new URL(`../../supabase/migrations/${file}`,import.meta.url),'utf8');
   // PGlite already provides gen_random_uuid; its optional pgcrypto extension is absent.
   sql=sql.replace('create extension if not exists "pgcrypto";','');await db.exec(sql);
  }
  const customer='00000000-0000-0000-0000-000000000011',workerOwner='00000000-0000-0000-0000-000000000001',stranger='00000000-0000-0000-0000-000000000012',workerId='11111111-1111-1111-1111-111111111111';
  const actor=async id=>{await db.exec('reset role');await db.query("select set_config('request.jwt.claim.sub',$1,false)",[id]);await db.exec('set role authenticated')};
  const rpc=async(sql,args=[])=> (await db.query(sql,args)).rows[0].result;
  await actor(workerOwner);
  const restored=await rpc('select rpc_my_worker_profile() result');assert.equal(restored.id,workerId);
  assert.equal(restored.completedJobCount,2);assert.equal(restored.reviewCount,2);
  await actor(customer);
  const discover=()=>rpc("select rpc_discover_workers(null,'g-10-islamabad','','recommended',20) result");
  assert.ok((await discover()).items.some(w=>w.id===workerId));
  const job=await rpc("select rpc_create_job_request($1,'electrician','g-10-islamabad','Breaker trips','fixed',null,'sql-request-1') result",[workerId]);
  await actor(workerOwner);
  const quoted=await rpc("select rpc_issue_quote($1,$2,'fixed_job','Repair breaker',80000,0,false,'excluded_approval_required',now()+interval '1 hour','sql-quote-1') result",[job.id,job.version]);
  await actor(stranger);
  const competing=await rpc("select rpc_create_job_request($1,'electrician','g-10-islamabad','Other breaker','fixed',null,'sql-other-request') result",[workerId]);
  await actor(workerOwner);
  const competingQuote=await rpc("select rpc_issue_quote($1,$2,'fixed_job','Other breaker',90000,0,false,'excluded_approval_required',now()+interval '1 hour','sql-other-quote') result",[competing.id,competing.version]);
  await actor(customer);
  const booked=await rpc('select rpc_accept_quote($1,$2,$3,$4) result',[job.id,quoted.latestQuote.id,quoted.version,'sql-accept-1']);
  assert.equal(booked.state,'confirmed');assert.equal((await discover()).items.some(w=>w.id===workerId),false);
  await actor(stranger);
  await assert.rejects(()=>rpc('select rpc_accept_quote($1,$2,$3,$4) result',[competing.id,competingQuote.latestQuote.id,competingQuote.version,'sql-other-accept']),/WORKER_UNAVAILABLE/);
  await actor(customer);
  const msg=await rpc("select rpc_send_message($1,'text','Please confirm the arrival time',null,'sql-message-1') result",[job.id]);
  const retry=await rpc("select rpc_send_message($1,'text','Please confirm the arrival time',null,'sql-message-1') result",[job.id]);assert.equal(msg.id,retry.id);
  await assert.rejects(()=>db.query("insert into mutation_keys(actor_id,idempotency_key,operation,response) values($1,'forged','accept_quote','{}')",[customer]),/permission denied/i);
  const ref=`${customer}/message/owned.webm`;
  await db.query("insert into storage.objects(bucket_id,name) values('job-audio',$1)",[ref]);
  await rpc("select rpc_send_message($1,'audio',null,$2,'sql-audio-1') result",[job.id,ref]);
  await actor(workerOwner);assert.equal((await db.query('select name from storage.objects where name=$1',[ref])).rows.length,1);
  await actor(stranger);assert.equal((await db.query('select name from storage.objects where name=$1',[ref])).rows.length,0);
  await assert.rejects(()=>rpc("select rpc_send_message($1,'text','unauthorized',null,'sql-deny') result",[job.id]),/FORBIDDEN/);
  await actor(customer);
  await assert.rejects(()=>rpc("select rpc_send_message($1,'audio',null,$2,'sql-forged-audio') result",[job.id,`${stranger}/onboarding/secret.webm`]),/FORBIDDEN/);
  await actor(workerOwner);await rpc('select rpc_set_availability(false,$1) result',['sql-offline']);
  assert.equal((await rpc('select rpc_my_worker_profile() result')).isAvailableNow,false);
 }finally{await db.close()}
});
