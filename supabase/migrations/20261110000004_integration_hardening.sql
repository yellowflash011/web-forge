-- Integration repair: safe public projections, canonical areas, private audio,
-- and database-backed AI throttling. Apply after 00001-00003.

update public.worker_profiles set locality_id=case locality_id when 'f-10-islamabad' then 'g-9-islamabad' when 'i-9-islamabad' then 'g-11-islamabad' end
where is_demo and locality_id in ('f-10-islamabad','i-9-islamabad');
insert into public.worker_service_areas(worker_id,locality_id)
select a.worker_id,case a.locality_id when 'f-10-islamabad' then 'g-9-islamabad' else 'g-11-islamabad' end
from public.worker_service_areas a join public.worker_profiles w on w.id=a.worker_id
where w.is_demo and a.locality_id in ('f-10-islamabad','i-9-islamabad') on conflict do nothing;
delete from public.worker_service_areas a using public.worker_profiles w
where a.worker_id=w.id and w.is_demo and a.locality_id in ('f-10-islamabad','i-9-islamabad');
update public.jobs set locality_id=case locality_id when 'f-10-islamabad' then 'g-9-islamabad' else 'g-11-islamabad' end where is_demo and locality_id in ('f-10-islamabad','i-9-islamabad');

alter table public.worker_profiles add constraint worker_supported_area check(locality_id in ('g-9-islamabad','g-10-islamabad','g-11-islamabad')) not valid;
alter table public.worker_service_areas add constraint service_supported_area check(locality_id in ('g-9-islamabad','g-10-islamabad','g-11-islamabad')) not valid;
alter table public.worker_trades add constraint supported_trade check(trade_id in ('plumber','electrician')) not valid;

create or replace function public.rpc_worker_summary(p_worker_id uuid) returns jsonb
language sql stable security definer set search_path=public,pg_temp as $$
 select jsonb_build_object(
  'id',w.id,'ownerUserId',w.owner_user_id,'name',w.name,'bio',w.bio,
  'tradeIds',coalesce((select jsonb_agg(t.trade_id order by t.trade_id) from worker_trades t where t.worker_id=w.id),'[]'::jsonb),
  'localityId',w.locality_id,'serviceAreaIds',coalesce((select jsonb_agg(a.locality_id order by a.locality_id) from worker_service_areas a where a.worker_id=w.id),'[]'::jsonb),
  'yearsExperience',w.years_experience,'avatarUrl',w.avatar_url,'availabilityOptIn',w.availability_opt_in,'availabilityExpiresAt',w.availability_expires_at,
  'isAvailableNow',coalesce(w.availability_opt_in and w.availability_expires_at>now() and not exists(select 1 from assignments a where a.worker_id=w.id and a.released_at is null),false),
  'approximateDistanceKm',null,'completedJobCount',(select count(*) from jobs j where j.worker_id=w.id and j.state='completed'),
  'reviewCount',(select count(*) from reviews r where r.worker_id=w.id),'averageRating',(select round(avg(r.rating),1) from reviews r where r.worker_id=w.id),'isDemo',w.is_demo
 ) from worker_profiles w where w.id=p_worker_id;
$$;
revoke all on function public.rpc_worker_summary(uuid) from public;
grant execute on function public.rpc_worker_summary(uuid) to anon,authenticated;

create or replace function public.rpc_my_worker_profile() returns jsonb
language plpgsql stable security definer set search_path=public,pg_temp as $$
begin
 if auth.uid() is null then raise exception 'UNAUTHENTICATED'; end if;
 return (select rpc_worker_summary(id) from worker_profiles where owner_user_id=auth.uid());
end;
$$;
revoke all on function public.rpc_my_worker_profile() from public;
grant execute on function public.rpc_my_worker_profile() to authenticated;

create or replace function public.rpc_discover_workers(p_trade_id text,p_locality_id text,p_query text default '',p_sort text default 'recommended',p_limit int default 10) returns jsonb
language plpgsql stable security definer set search_path=public,pg_temp as $$
declare result jsonb;
begin
 if p_locality_id not in ('g-9-islamabad','g-10-islamabad','g-11-islamabad') or p_locality_id is null then raise exception 'VALIDATION_ERROR: Unsupported area'; end if;
 if p_trade_id is not null and p_trade_id not in ('plumber','electrician') then raise exception 'VALIDATION_ERROR: Unsupported trade'; end if;
 if p_sort not in ('recommended','nearest') then raise exception 'VALIDATION_ERROR: Unsupported order'; end if;
 with eligible as (
  select w.id from worker_profiles w
  where w.availability_opt_in and w.availability_expires_at>now()
   and exists(select 1 from worker_service_areas a where a.worker_id=w.id and a.locality_id=p_locality_id)
   and not exists(select 1 from assignments a where a.worker_id=w.id and a.released_at is null)
   and (p_trade_id is null or exists(select 1 from worker_trades t where t.worker_id=w.id and t.trade_id=p_trade_id))
   and (coalesce(p_query,'')='' or w.name ilike '%'||left(p_query,100)||'%' or w.bio ilike '%'||left(p_query,100)||'%')
 ), ranked as (
  select rpc_worker_summary(e.id) item from eligible e
  order by case when p_sort='nearest' then (select locality_id<>p_locality_id from worker_profiles where id=e.id)::int else 0 end,
   (select count(*) from jobs j where j.worker_id=e.id and j.state='completed') desc,e.id
  limit greatest(3,least(20,coalesce(p_limit,10)))
 ) select jsonb_build_object('items',coalesce((select jsonb_agg(item) from ranked),'[]'::jsonb),'hasMore',(select count(*) from eligible)>greatest(3,least(20,coalesce(p_limit,10)))) into result;
 return result;
end;
$$;
revoke all on function public.rpc_discover_workers(text,text,text,text,int) from public;
grant execute on function public.rpc_discover_workers(text,text,text,text,int) to anon,authenticated;

-- RPC-only mutations: callers cannot forge the idempotency ledger or opt-in state.
revoke insert,update,delete on public.mutation_keys from anon,authenticated;
revoke insert,update,delete on public.worker_profiles,public.worker_trades,public.worker_service_areas from anon,authenticated;

create or replace function public.check_assignment_availability() returns trigger
language plpgsql security definer set search_path=public,pg_temp as $$
declare w record;
begin
 if new.released_at is null then
  if tg_op='UPDATE' then if old.released_at is null then return new; end if; end if;
  select * into w from worker_profiles where id=new.worker_id for update;
  if not coalesce(w.availability_opt_in and w.availability_expires_at>now(),false) then raise exception 'WORKER_UNAVAILABLE: Availability must be renewed'; end if;
 end if;
 return new;
end;
$$;
create trigger assignment_availability before insert or update of released_at on public.assignments for each row execute function public.check_assignment_availability();

insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values('job-audio','job-audio',false,5242880,array['audio/webm','audio/ogg','audio/wav','audio/mpeg','audio/mp4','audio/aac'])
on conflict(id) do update set public=false,file_size_limit=excluded.file_size_limit,allowed_mime_types=excluded.allowed_mime_types;

create or replace function public.can_read_job_audio(object_name text) returns boolean
language sql stable security definer set search_path=public,pg_temp as $$
 select auth.uid() is not null and (
  split_part(object_name,'/',1)=auth.uid()::text
  or exists(select 1 from messages m join jobs j on j.id=m.job_id join worker_profiles w on w.id=j.worker_id
   where m.audio_ref=object_name and (j.customer_id=auth.uid() or w.owner_user_id=auth.uid()))
 );
$$;
revoke all on function public.can_read_job_audio(text) from public;
grant execute on function public.can_read_job_audio(text) to authenticated;
create policy rr_audio_insert on storage.objects for insert to authenticated with check(bucket_id='job-audio' and split_part(name,'/',1)=auth.uid()::text);
create policy rr_audio_read on storage.objects for select to authenticated using(bucket_id='job-audio' and public.can_read_job_audio(name));
create policy rr_audio_delete on storage.objects for delete to authenticated using(bucket_id='job-audio' and split_part(name,'/',1)=auth.uid()::text and not exists(select 1 from public.messages where audio_ref=name));

create table public.voice_requests(id uuid primary key default gen_random_uuid(),actor_id uuid not null references auth.users(id),created_at timestamptz not null default now());
create index voice_requests_actor_time on public.voice_requests(actor_id,created_at);
alter table public.voice_requests enable row level security;
revoke all on public.voice_requests from anon,authenticated;
create or replace function public.reserve_voice_request() returns boolean language plpgsql security definer set search_path=public,pg_temp as $$
begin
 if auth.uid() is null then raise exception 'UNAUTHENTICATED'; end if;
 perform pg_advisory_xact_lock(hashtext(auth.uid()::text));
 if (select count(*) from voice_requests where actor_id=auth.uid() and created_at>now()-interval '5 minutes')>=10 then return false; end if;
 insert into voice_requests(actor_id) values(auth.uid());return true;
end;
$$;
revoke all on function public.reserve_voice_request() from public;
grant execute on function public.reserve_voice_request() to authenticated;

create or replace function public.rpc_send_message(p_job_id uuid,p_kind text,p_text text,p_audio_ref text,p_idempotency_key text) returns jsonb
language plpgsql security definer set search_path=public,pg_temp as $$
declare actor uuid:=auth.uid(); result jsonb; cached record; m public.messages;
begin
 if actor is null then raise exception 'UNAUTHENTICATED'; end if;
 if not exists(select 1 from jobs j join worker_profiles w on w.id=j.worker_id where j.id=p_job_id and (j.customer_id=actor or w.owner_user_id=actor)) then raise exception 'FORBIDDEN'; end if;
 if p_idempotency_key is not null then
  perform pg_advisory_xact_lock(hashtext(actor::text||p_idempotency_key));
  select * into cached from mutation_keys where actor_id=actor and idempotency_key=p_idempotency_key;
  if found then
   if cached.operation<>'send_message' or cached.response->>'jobId'<>p_job_id::text then raise exception 'VALIDATION_ERROR: Reused intent key'; end if;
   return cached.response;
  end if;
 end if;
 if p_kind not in ('text','audio') or p_kind is null then raise exception 'VALIDATION_ERROR: Invalid message type'; end if;
 if p_kind='text' and (p_text is null or length(trim(p_text))=0 or length(p_text)>2000) then raise exception 'VALIDATION_ERROR: Message must contain 1-2000 characters'; end if;
 if p_kind='audio' and (p_audio_ref is null or split_part(p_audio_ref,'/',1)<>actor::text or not exists(select 1 from storage.objects where bucket_id='job-audio' and name=p_audio_ref)) then raise exception 'FORBIDDEN: Recording is not owned by caller'; end if;
 insert into messages(job_id,sender_id,kind,text,audio_ref) values(p_job_id,actor,p_kind,case when p_kind='text' then trim(p_text) else null end,case when p_kind='audio' then p_audio_ref else null end) returning * into m;
 result:=jsonb_build_object('id',m.id,'jobId',m.job_id,'senderId',m.sender_id,'kind',m.kind,'text',m.text,'audioRef',m.audio_ref,'transcript',m.transcript,'createdAt',m.created_at);
 if p_idempotency_key is not null then insert into mutation_keys(actor_id,idempotency_key,operation,response) values(actor,p_idempotency_key,'send_message',result); end if;
 return result;
end;
$$;
revoke insert on public.messages from anon,authenticated;
revoke all on function public.rpc_send_message(uuid,text,text,text,text) from public;
grant execute on function public.rpc_send_message(uuid,text,text,text,text) to authenticated;

-- Also enforce object ownership when older definer RPCs insert an initial audio message.
create or replace function public.validate_message_audio() returns trigger
language plpgsql security definer set search_path=public,pg_temp as $$
begin
 if new.kind='audio' then
  if new.audio_ref is null or split_part(new.audio_ref,'/',1)<>new.sender_id::text or not exists(select 1 from storage.objects where bucket_id='job-audio' and name=new.audio_ref) then raise exception 'FORBIDDEN: Invalid audio attachment'; end if;
 end if;
 return new;
end;
$$;
create trigger message_audio_ownership before insert or update of audio_ref on public.messages for each row execute function public.validate_message_audio();

create or replace function public.validate_job_scope() returns trigger
language plpgsql security definer set search_path=public,pg_temp as $$
begin
 if new.locality_id not in ('g-9-islamabad','g-10-islamabad','g-11-islamabad') or not exists(select 1 from worker_service_areas where worker_id=new.worker_id and locality_id=new.locality_id) then raise exception 'VALIDATION_ERROR: Worker does not serve this area'; end if;
 if new.trade_id not in ('plumber','electrician') or not exists(select 1 from worker_trades where worker_id=new.worker_id and trade_id=new.trade_id) then raise exception 'VALIDATION_ERROR: Worker does not offer this skill'; end if;
 if length(trim(new.task))=0 or length(new.task)>2000 then raise exception 'VALIDATION_ERROR: Invalid task'; end if;
 return new;
end;
$$;
create trigger job_scope_validation before insert on public.jobs for each row execute function public.validate_job_scope();

create or replace function public.validate_quote_path() returns trigger
language plpgsql security definer set search_path=public,pg_temp as $$
declare path text;
begin
 select pricing_path into path from jobs where id=new.job_id;
 if (new.purpose='fixed_job' and path<>'fixed') or (new.purpose in ('inspection_visit','repair_after_inspection') and path<>'inspection') then raise exception 'VALIDATION_ERROR: Quote purpose must match the agreed pricing path'; end if;
 if length(trim(new.scope))=0 or length(new.scope)>2000 then raise exception 'VALIDATION_ERROR: Invalid scope'; end if;
 return new;
end;
$$;
create trigger quote_path_validation before insert on public.quotes for each row execute function public.validate_quote_path();
