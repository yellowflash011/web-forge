-- Expand services without changing existing worker profiles.
begin;
alter table public.worker_trades drop constraint supported_trade;
alter table public.worker_trades add constraint supported_trade check(trade_id in ('plumber','electrician','ac-technician','carpenter','painter','mason','welder','cleaner','gardener','appliance-technician','solar-technician','cctv-technician','pest-control','waterproofing','tiler','glass-aluminium','locksmith','handyman','mover','mechanic','bike-mechanic','driver','cook','tailor','upholsterer','computer-technician','phone-technician','general-labourer','other'));
create or replace function public.rpc_discover_workers(p_trade_id text,p_locality_id text,p_query text default '',p_sort text default 'recommended',p_limit int default 10) returns jsonb
language plpgsql stable security definer set search_path=public,pg_temp as $$
declare result jsonb;
begin
 if p_locality_id not in ('g-9-islamabad','g-10-islamabad','g-11-islamabad') or p_locality_id is null then raise exception 'VALIDATION_ERROR: Unsupported area'; end if;
 if p_trade_id is not null and p_trade_id not in ('plumber','electrician','ac-technician','carpenter','painter','mason','welder','cleaner','gardener','appliance-technician','solar-technician','cctv-technician','pest-control','waterproofing','tiler','glass-aluminium','locksmith','handyman','mover','mechanic','bike-mechanic','driver','cook','tailor','upholsterer','computer-technician','phone-technician','general-labourer','other') then raise exception 'VALIDATION_ERROR: Unsupported trade'; end if;
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
create or replace function public.validate_job_scope() returns trigger
language plpgsql security definer set search_path=public,pg_temp as $$
begin
 if new.locality_id not in ('g-9-islamabad','g-10-islamabad','g-11-islamabad') or not exists(select 1 from worker_service_areas where worker_id=new.worker_id and locality_id=new.locality_id) then raise exception 'VALIDATION_ERROR: Worker does not serve this area'; end if;
 if new.trade_id not in ('plumber','electrician','ac-technician','carpenter','painter','mason','welder','cleaner','gardener','appliance-technician','solar-technician','cctv-technician','pest-control','waterproofing','tiler','glass-aluminium','locksmith','handyman','mover','mechanic','bike-mechanic','driver','cook','tailor','upholsterer','computer-technician','phone-technician','general-labourer','other') or not exists(select 1 from worker_trades where worker_id=new.worker_id and trade_id=new.trade_id) then raise exception 'VALIDATION_ERROR: Worker does not offer this skill'; end if;
 if length(trim(new.task))=0 or length(new.task)>2000 then raise exception 'VALIDATION_ERROR: Invalid task'; end if;
 return new;
end;
$$;
commit;
