-- 00002_domain_rpcs.sql
-- Transactional business operations, state machines, row-locking and idempotency

create or replace function public.rpc_save_worker_profile(
  p_name text,
  p_trade_ids text[],
  p_locality_id text,
  p_service_area_ids text[],
  p_years_experience int,
  p_bio text,
  p_idempotency_key text
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_user_id uuid := auth.uid();
  v_worker_id uuid;
  v_existing_response jsonb;
  v_trade text;
  v_area text;
  v_result jsonb;
begin
  if v_user_id is null then
    raise exception 'UNAUTHENTICATED: Must be logged in';
  end if;

  if p_idempotency_key is not null then
    select response into v_existing_response
    from public.mutation_keys
    where actor_id = v_user_id and idempotency_key = p_idempotency_key;
    if v_existing_response is not null then
      return v_existing_response;
    end if;
  end if;

  if p_name is null or trim(p_name) = '' then
    raise exception 'VALIDATION_ERROR: Name is required';
  end if;

  if p_locality_id is null or trim(p_locality_id) = '' then
    raise exception 'VALIDATION_ERROR: Primary locality is required';
  end if;

  insert into public.worker_profiles (
    owner_user_id,
    name,
    bio,
    years_experience,
    locality_id,
    updated_at
  )
  values (
    v_user_id,
    p_name,
    p_bio,
    p_years_experience,
    p_locality_id,
    now()
  )
  on conflict (owner_user_id) do update set
    name = excluded.name,
    bio = excluded.bio,
    years_experience = excluded.years_experience,
    locality_id = excluded.locality_id,
    updated_at = now()
  returning id into v_worker_id;

  -- Refresh trades
  delete from public.worker_trades where worker_id = v_worker_id;
  if p_trade_ids is not null then
    foreach v_trade in array p_trade_ids loop
      if v_trade is not null and trim(v_trade) <> '' then
        insert into public.worker_trades (worker_id, trade_id)
        values (v_worker_id, trim(v_trade))
        on conflict do nothing;
      end if;
    end loop;
  end if;

  -- Refresh service areas
  delete from public.worker_service_areas where worker_id = v_worker_id;
  if p_service_area_ids is not null then
    foreach v_area in array p_service_area_ids loop
      if v_area is not null and trim(v_area) <> '' then
        insert into public.worker_service_areas (worker_id, locality_id)
        values (v_worker_id, trim(v_area))
        on conflict do nothing;
      end if;
    end loop;
  end if;

  select jsonb_build_object(
    'id', wp.id,
    'ownerUserId', wp.owner_user_id,
    'name', wp.name,
    'tradeIds', coalesce((select jsonb_agg(trade_id) from public.worker_trades where worker_id = wp.id), '[]'::jsonb),
    'localityId', wp.locality_id,
    'serviceAreaIds', coalesce((select jsonb_agg(locality_id) from public.worker_service_areas where worker_id = wp.id), '[]'::jsonb),
    'bio', wp.bio,
    'yearsExperience', wp.years_experience,
    'avatarUrl', wp.avatar_url,
    'availabilityOptIn', wp.availability_opt_in,
    'availabilityExpiresAt', wp.availability_expires_at,
    'isAvailableNow', (
      wp.availability_opt_in and
      wp.availability_expires_at > now() and
      not exists (
        select 1 from public.assignments
        where worker_id = wp.id and released_at is null
      )
    ),
    'approximateDistanceKm', null,
    'completedJobCount', (
      select count(*)::int from public.jobs
      where worker_id = wp.id and state in ('completed', 'visit_done')
    ),
    'reviewCount', (
      select count(*)::int from public.reviews
      where worker_id = wp.id
    ),
    'averageRating', (
      select coalesce(round(avg(rating)::numeric, 1), null)
      from public.reviews
      where worker_id = wp.id
    ),
    'isDemo', wp.is_demo
  ) into v_result
  from public.worker_profiles wp
  where wp.id = v_worker_id;

  if p_idempotency_key is not null then
    insert into public.mutation_keys (actor_id, idempotency_key, operation, response)
    values (v_user_id, p_idempotency_key, 'saveWorkerProfile', v_result)
    on conflict (actor_id, idempotency_key) do nothing;
  end if;

  return v_result;
end;
$$;

create or replace function public.rpc_set_availability(
  p_available boolean,
  p_idempotency_key text
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_user_id uuid := auth.uid();
  v_worker_id uuid;
  v_existing_response jsonb;
  v_expires_at timestamptz;
  v_result jsonb;
begin
  if v_user_id is null then
    raise exception 'UNAUTHENTICATED: Must be logged in';
  end if;

  if p_idempotency_key is not null then
    select response into v_existing_response
    from public.mutation_keys
    where actor_id = v_user_id and idempotency_key = p_idempotency_key;
    if v_existing_response is not null then
      return v_existing_response;
    end if;
  end if;

  select id into v_worker_id from public.worker_profiles where owner_user_id = v_user_id;
  if v_worker_id is null then
    raise exception 'NOT_FOUND: No worker profile found for user';
  end if;

  if p_available then
    v_expires_at := now() + interval '2 hours';
  else
    v_expires_at := null;
  end if;

  update public.worker_profiles
  set
    availability_opt_in = p_available,
    availability_expires_at = v_expires_at,
    updated_at = now()
  where id = v_worker_id;

  select jsonb_build_object(
    'id', wp.id,
    'ownerUserId', wp.owner_user_id,
    'name', wp.name,
    'tradeIds', coalesce((select jsonb_agg(trade_id) from public.worker_trades where worker_id = wp.id), '[]'::jsonb),
    'localityId', wp.locality_id,
    'serviceAreaIds', coalesce((select jsonb_agg(locality_id) from public.worker_service_areas where worker_id = wp.id), '[]'::jsonb),
    'bio', wp.bio,
    'yearsExperience', wp.years_experience,
    'avatarUrl', wp.avatar_url,
    'availabilityOptIn', wp.availability_opt_in,
    'availabilityExpiresAt', wp.availability_expires_at,
    'isAvailableNow', (
      wp.availability_opt_in and
      wp.availability_expires_at > now() and
      not exists (
        select 1 from public.assignments
        where worker_id = wp.id and released_at is null
      )
    ),
    'approximateDistanceKm', null,
    'completedJobCount', (
      select count(*)::int from public.jobs
      where worker_id = wp.id and state in ('completed', 'visit_done')
    ),
    'reviewCount', (
      select count(*)::int from public.reviews
      where worker_id = wp.id
    ),
    'averageRating', (
      select coalesce(round(avg(rating)::numeric, 1), null)
      from public.reviews
      where worker_id = wp.id
    ),
    'isDemo', wp.is_demo
  ) into v_result
  from public.worker_profiles wp
  where wp.id = v_worker_id;

  if p_idempotency_key is not null then
    insert into public.mutation_keys (actor_id, idempotency_key, operation, response)
    values (v_user_id, p_idempotency_key, 'setAvailability', v_result)
    on conflict (actor_id, idempotency_key) do nothing;
  end if;

  return v_result;
end;
$$;

create or replace function public.rpc_create_job_request(
  p_worker_id uuid,
  p_trade_id text,
  p_locality_id text,
  p_task text,
  p_pricing_path text,
  p_audio_ref text,
  p_idempotency_key text
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_user_id uuid := auth.uid();
  v_existing_response jsonb;
  v_worker record;
  v_job_id uuid;
  v_result jsonb;
begin
  if v_user_id is null then
    raise exception 'UNAUTHENTICATED: Must be logged in';
  end if;

  if p_idempotency_key is not null then
    select response into v_existing_response
    from public.mutation_keys
    where actor_id = v_user_id and idempotency_key = p_idempotency_key;
    if v_existing_response is not null then
      return v_existing_response;
    end if;
  end if;

  if p_pricing_path not in ('fixed', 'inspection') then
    raise exception 'VALIDATION_ERROR: Pricing path must be fixed or inspection';
  end if;

  if p_task is null or trim(p_task) = '' then
    raise exception 'VALIDATION_ERROR: Task description is required';
  end if;

  select * into v_worker from public.worker_profiles where id = p_worker_id;
  if v_worker.id is null then
    raise exception 'NOT_FOUND: Worker not found';
  end if;

  if v_worker.owner_user_id = v_user_id then
    raise exception 'FORBIDDEN: You cannot request a job with yourself';
  end if;

  -- Worker availability check
  if not v_worker.availability_opt_in or v_worker.availability_expires_at <= now() then
    raise exception 'WORKER_UNAVAILABLE: Worker is not currently available';
  end if;

  if exists (
    select 1 from public.assignments
    where worker_id = p_worker_id and released_at is null
  ) then
    raise exception 'WORKER_UNAVAILABLE: Worker is currently engaged on another job';
  end if;

  insert into public.jobs (
    customer_id,
    worker_id,
    trade_id,
    locality_id,
    task,
    pricing_path,
    state,
    version,
    created_at,
    updated_at
  )
  values (
    v_user_id,
    p_worker_id,
    p_trade_id,
    p_locality_id,
    p_task,
    p_pricing_path,
    'requested',
    1,
    now(),
    now()
  )
  returning id into v_job_id;

  -- If audio is provided, insert the first message
  if p_audio_ref is not null and trim(p_audio_ref) <> '' then
    insert into public.messages (
      job_id,
      sender_id,
      kind,
      text,
      audio_ref,
      created_at
    )
    values (
      v_job_id,
      v_user_id,
      'audio',
      p_task,
      p_audio_ref,
      now()
    );
  else
    insert into public.messages (
      job_id,
      sender_id,
      kind,
      text,
      created_at
    )
    values (
      v_job_id,
      v_user_id,
      'text',
      p_task,
      now()
    );
  end if;

  insert into public.job_events (job_id, actor_id, transition, previous_state, new_state, created_at)
  values (v_job_id, v_user_id, 'create_request', null, 'requested', now());

  select jsonb_build_object(
    'id', j.id,
    'customerId', j.customer_id,
    'workerId', j.worker_id,
    'tradeId', j.trade_id,
    'localityId', j.locality_id,
    'task', j.task,
    'pricingPath', j.pricing_path,
    'state', j.state,
    'version', j.version,
    'latestQuote', null,
    'acceptedAgreement', null,
    'createdAt', j.created_at,
    'updatedAt', j.updated_at,
    'isDemo', j.is_demo
  ) into v_result
  from public.jobs j
  where j.id = v_job_id;

  if p_idempotency_key is not null then
    insert into public.mutation_keys (actor_id, idempotency_key, operation, response)
    values (v_user_id, p_idempotency_key, 'createRequest', v_result)
    on conflict (actor_id, idempotency_key) do nothing;
  end if;

  return v_result;
end;
$$;

create or replace function public.rpc_issue_quote(
  p_job_id uuid,
  p_expected_version int,
  p_purpose text,
  p_scope text,
  p_labour_minor bigint,
  p_visit_fee_minor bigint,
  p_visit_fee_credited boolean,
  p_materials_policy text,
  p_expires_at timestamptz,
  p_idempotency_key text
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_user_id uuid := auth.uid();
  v_existing_response jsonb;
  v_job record;
  v_worker record;
  v_next_quote_version int;
  v_new_job_state text;
  v_quote_id uuid;
  v_result jsonb;
begin
  if v_user_id is null then
    raise exception 'UNAUTHENTICATED: Must be logged in';
  end if;

  if p_idempotency_key is not null then
    select response into v_existing_response
    from public.mutation_keys
    where actor_id = v_user_id and idempotency_key = p_idempotency_key;
    if v_existing_response is not null then
      return v_existing_response;
    end if;
  end if;

  if p_purpose not in ('fixed_job', 'inspection_visit', 'repair_after_inspection') then
    raise exception 'VALIDATION_ERROR: Invalid quote purpose %', p_purpose;
  end if;

  -- Lock job
  select * into v_job from public.jobs where id = p_job_id for update;
  if v_job.id is null then
    raise exception 'NOT_FOUND: Job % not found', p_job_id;
  end if;

  -- Check worker ownership
  select * into v_worker from public.worker_profiles where id = v_job.worker_id;
  if v_worker.owner_user_id <> v_user_id then
    raise exception 'FORBIDDEN: Only the assigned worker can issue quotes';
  end if;

  -- Version check
  if v_job.version <> p_expected_version then
    raise exception 'VERSION_CONFLICT: Expected version % but found %', p_expected_version, v_job.version;
  end if;

  -- Validate state
  if p_purpose in ('fixed_job', 'inspection_visit') then
    if v_job.state not in ('requested', 'discussing', 'quoted') then
      raise exception 'INVALID_TRANSITION: Cannot issue initial quote from state %', v_job.state;
    end if;
    v_new_job_state := 'quoted';
  elsif p_purpose = 'repair_after_inspection' then
    if v_job.state not in ('visiting', 'awaiting_repair_approval') then
      raise exception 'INVALID_TRANSITION: Repair quote requires inspection visit in progress, currently %', v_job.state;
    end if;
    v_new_job_state := 'awaiting_repair_approval';
  end if;

  -- Mark existing quotes as superseded
  update public.quotes
  set superseded_at = now()
  where job_id = p_job_id and superseded_at is null;

  select coalesce(max(version), 0) + 1 into v_next_quote_version
  from public.quotes
  where job_id = p_job_id;

  insert into public.quotes (
    job_id,
    version,
    purpose,
    scope,
    currency,
    labour_minor,
    visit_fee_minor,
    visit_fee_credited,
    materials_policy,
    expires_at,
    created_at
  )
  values (
    p_job_id,
    v_next_quote_version,
    p_purpose,
    p_scope,
    'PKR',
    coalesce(p_labour_minor, 0),
    coalesce(p_visit_fee_minor, 0),
    coalesce(p_visit_fee_credited, false),
    coalesce(p_materials_policy, 'excluded_approval_required'),
    p_expires_at,
    now()
  )
  returning id into v_quote_id;

  update public.jobs
  set
    state = v_new_job_state,
    version = version + 1,
    updated_at = now()
  where id = p_job_id;

  insert into public.job_events (job_id, actor_id, transition, previous_state, new_state, created_at)
  values (p_job_id, v_user_id, 'issue_quote', v_job.state, v_new_job_state, now());

  -- Build returned Job entity
  select jsonb_build_object(
    'id', j.id,
    'customerId', j.customer_id,
    'workerId', j.worker_id,
    'tradeId', j.trade_id,
    'localityId', j.locality_id,
    'task', j.task,
    'pricingPath', j.pricing_path,
    'state', j.state,
    'version', j.version,
    'latestQuote', (
      select jsonb_build_object(
        'id', q.id,
        'jobId', q.job_id,
        'version', q.version,
        'purpose', q.purpose,
        'scope', q.scope,
        'currency', q.currency,
        'labourMinor', q.labour_minor,
        'visitFeeMinor', q.visit_fee_minor,
        'visitFeeCredited', q.visit_fee_credited,
        'materialsPolicy', q.materials_policy,
        'expiresAt', q.expires_at,
        'supersededAt', q.superseded_at
      ) from public.quotes q where q.id = v_quote_id
    ),
    'acceptedAgreement', (
      select jsonb_build_object(
        'quoteSnapshot', a.quote_snapshot,
        'acceptedAt', a.accepted_at
      ) from public.agreements a where a.job_id = j.id
    ),
    'createdAt', j.created_at,
    'updatedAt', j.updated_at,
    'isDemo', j.is_demo
  ) into v_result
  from public.jobs j
  where j.id = p_job_id;

  if p_idempotency_key is not null then
    insert into public.mutation_keys (actor_id, idempotency_key, operation, response)
    values (v_user_id, p_idempotency_key, 'issueQuote', v_result)
    on conflict (actor_id, idempotency_key) do nothing;
  end if;

  return v_result;
end;
$$;

create or replace function public.rpc_accept_quote(
  p_job_id uuid,
  p_quote_id uuid,
  p_expected_version int,
  p_idempotency_key text
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_user_id uuid := auth.uid();
  v_existing_response jsonb;
  v_job record;
  v_quote record;
  v_worker record;
  v_new_state text;
  v_result jsonb;
begin
  if v_user_id is null then
    raise exception 'UNAUTHENTICATED: Must be logged in';
  end if;

  if p_idempotency_key is not null then
    select response into v_existing_response
    from public.mutation_keys
    where actor_id = v_user_id and idempotency_key = p_idempotency_key;
    if v_existing_response is not null then
      return v_existing_response;
    end if;
  end if;

  -- Lock job
  select * into v_job from public.jobs where id = p_job_id for update;
  if v_job.id is null then
    raise exception 'NOT_FOUND: Job not found';
  end if;

  if v_job.customer_id <> v_user_id then
    raise exception 'FORBIDDEN: Only customer can accept a quote';
  end if;

  if v_job.version <> p_expected_version then
    raise exception 'VERSION_CONFLICT: Expected version % but found %', p_expected_version, v_job.version;
  end if;

  -- Lock and fetch quote
  select * into v_quote from public.quotes where id = p_quote_id and job_id = p_job_id;
  if v_quote.id is null then
    raise exception 'NOT_FOUND: Quote not found for this job';
  end if;

  if v_quote.superseded_at is not null then
    raise exception 'QUOTE_STALE: Quote has been superseded by a newer version';
  end if;

  if v_quote.expires_at is not null and v_quote.expires_at <= now() then
    raise exception 'QUOTE_STALE: Quote has expired';
  end if;

  -- Lock worker to serialize concurrent acceptances across jobs
  select * into v_worker from public.worker_profiles where id = v_job.worker_id for update;

  if v_quote.purpose = 'repair_after_inspection' then
    if v_job.state <> 'awaiting_repair_approval' then
      raise exception 'INVALID_TRANSITION: Job state must be awaiting_repair_approval, currently %', v_job.state;
    end if;
    v_new_state := 'in_progress';
  else
    if v_job.state <> 'quoted' then
      raise exception 'INVALID_TRANSITION: Job state must be quoted, currently %', v_job.state;
    end if;

    -- Concurrency check: check if worker has an active assignment from ANOTHER job
    if exists (
      select 1 from public.assignments
      where worker_id = v_job.worker_id and released_at is null and job_id <> p_job_id
    ) then
      raise exception 'WORKER_UNAVAILABLE: Worker is engaged on another booking';
    end if;

    -- Create physical assignment
    insert into public.assignments (job_id, worker_id, acquired_at)
    values (p_job_id, v_job.worker_id, now())
    on conflict (job_id) do update set
      released_at = null,
      release_reason = null;

    v_new_state := 'confirmed';
  end if;

  -- Insert/update agreement snapshot
  insert into public.agreements (
    job_id,
    quote_id,
    quote_snapshot,
    accepted_at
  )
  values (
    p_job_id,
    p_quote_id,
    row_to_json(v_quote)::jsonb,
    now()
  )
  on conflict (job_id) do update set
    quote_id = excluded.quote_id,
    quote_snapshot = excluded.quote_snapshot,
    accepted_at = now();

  update public.jobs
  set
    state = v_new_state,
    version = version + 1,
    updated_at = now()
  where id = p_job_id;

  insert into public.job_events (job_id, actor_id, transition, previous_state, new_state, created_at)
  values (p_job_id, v_user_id, 'accept_quote', v_job.state, v_new_state, now());

  select jsonb_build_object(
    'id', j.id,
    'customerId', j.customer_id,
    'workerId', j.worker_id,
    'tradeId', j.trade_id,
    'localityId', j.locality_id,
    'task', j.task,
    'pricingPath', j.pricing_path,
    'state', j.state,
    'version', j.version,
    'latestQuote', (
      select jsonb_build_object(
        'id', q.id,
        'jobId', q.job_id,
        'version', q.version,
        'purpose', q.purpose,
        'scope', q.scope,
        'currency', q.currency,
        'labourMinor', q.labour_minor,
        'visitFeeMinor', q.visit_fee_minor,
        'visitFeeCredited', q.visit_fee_credited,
        'materialsPolicy', q.materials_policy,
        'expiresAt', q.expires_at,
        'supersededAt', q.superseded_at
      ) from public.quotes q where q.id = p_quote_id
    ),
    'acceptedAgreement', (
      select jsonb_build_object(
        'quoteSnapshot', a.quote_snapshot,
        'acceptedAt', a.accepted_at
      ) from public.agreements a where a.job_id = j.id
    ),
    'createdAt', j.created_at,
    'updatedAt', j.updated_at,
    'isDemo', j.is_demo
  ) into v_result
  from public.jobs j
  where j.id = p_job_id;

  if p_idempotency_key is not null then
    insert into public.mutation_keys (actor_id, idempotency_key, operation, response)
    values (v_user_id, p_idempotency_key, 'acceptQuote', v_result)
    on conflict (actor_id, idempotency_key) do nothing;
  end if;

  return v_result;
end;
$$;

create or replace function public.rpc_transition_job(
  p_job_id uuid,
  p_action text,
  p_expected_version int,
  p_reason text,
  p_idempotency_key text
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_user_id uuid := auth.uid();
  v_existing_response jsonb;
  v_job record;
  v_worker record;
  v_is_customer boolean;
  v_is_worker boolean;
  v_new_state text;
  v_result jsonb;
begin
  if v_user_id is null then
    raise exception 'UNAUTHENTICATED: Must be logged in';
  end if;

  if p_idempotency_key is not null then
    select response into v_existing_response
    from public.mutation_keys
    where actor_id = v_user_id and idempotency_key = p_idempotency_key;
    if v_existing_response is not null then
      return v_existing_response;
    end if;
  end if;

  select * into v_job from public.jobs where id = p_job_id for update;
  if v_job.id is null then
    raise exception 'NOT_FOUND: Job % not found', p_job_id;
  end if;

  if v_job.version <> p_expected_version then
    raise exception 'VERSION_CONFLICT: Expected version % but found %', p_expected_version, v_job.version;
  end if;

  select * into v_worker from public.worker_profiles where id = v_job.worker_id;
  v_is_customer := (v_job.customer_id = v_user_id);
  v_is_worker := (v_worker.owner_user_id = v_user_id);

  if not v_is_customer and not v_is_worker then
    raise exception 'FORBIDDEN: Caller is not a participant in job %', p_job_id;
  end if;

  -- State machine rules
  if p_action = 'respond' then
    if not v_is_worker then
      raise exception 'FORBIDDEN: Only worker can respond to request';
    end if;
    if v_job.state <> 'requested' then
      raise exception 'INVALID_TRANSITION: Action respond requires state requested, currently %', v_job.state;
    end if;
    v_new_state := 'discussing';

  elsif p_action = 'decline' then
    if not v_is_worker then
      raise exception 'FORBIDDEN: Only worker can decline request';
    end if;
    if v_job.state not in ('requested', 'discussing') then
      raise exception 'INVALID_TRANSITION: Action decline requires requested/discussing, currently %', v_job.state;
    end if;
    v_new_state := 'declined';

  elsif p_action = 'start_visit' then
    if not v_is_worker then
      raise exception 'FORBIDDEN: Only worker can start visit';
    end if;
    if v_job.pricing_path <> 'inspection' or v_job.state <> 'confirmed' then
      raise exception 'INVALID_TRANSITION: Action start_visit requires confirmed inspection job, currently %', v_job.state;
    end if;
    v_new_state := 'visiting';

  elsif p_action = 'start_work' then
    if not v_is_worker then
      raise exception 'FORBIDDEN: Only worker can start work';
    end if;
    if v_job.pricing_path <> 'fixed' or v_job.state <> 'confirmed' then
      raise exception 'INVALID_TRANSITION: Action start_work requires confirmed fixed job, currently %', v_job.state;
    end if;
    v_new_state := 'in_progress';

  elsif p_action = 'mark_work_done' then
    if not v_is_worker then
      raise exception 'FORBIDDEN: Only worker can mark work done';
    end if;
    if v_job.state <> 'in_progress' then
      raise exception 'INVALID_TRANSITION: Action mark_work_done requires in_progress, currently %', v_job.state;
    end if;
    v_new_state := 'awaiting_completion';

    -- Physical assignment is released upon marking work done!
    update public.assignments
    set released_at = now(), release_reason = 'work_done'
    where job_id = p_job_id and released_at is null;

  elsif p_action = 'confirm_completion' then
    if not v_is_customer then
      raise exception 'FORBIDDEN: Only customer can confirm completion';
    end if;
    if v_job.state <> 'awaiting_completion' then
      raise exception 'INVALID_TRANSITION: Action confirm_completion requires awaiting_completion, currently %', v_job.state;
    end if;
    v_new_state := 'completed';

  elsif p_action = 'decline_repair' then
    if not v_is_customer then
      raise exception 'FORBIDDEN: Only customer can decline repair';
    end if;
    if v_job.state <> 'awaiting_repair_approval' then
      raise exception 'INVALID_TRANSITION: Action decline_repair requires awaiting_repair_approval, currently %', v_job.state;
    end if;
    v_new_state := 'visit_done';

    -- Release assignment
    update public.assignments
    set released_at = now(), release_reason = 'repair_declined'
    where job_id = p_job_id and released_at is null;

  elsif p_action = 'cancel' then
    if v_job.state not in ('requested', 'discussing', 'quoted', 'confirmed') then
      raise exception 'INVALID_TRANSITION: Cannot cancel job in state %', v_job.state;
    end if;
    v_new_state := 'cancelled';

    -- Release assignment if confirmed
    update public.assignments
    set released_at = now(), release_reason = coalesce(p_reason, 'cancelled')
    where job_id = p_job_id and released_at is null;

  elsif p_action = 'release_assignment' then
    if not v_is_worker then
      raise exception 'FORBIDDEN: Only worker can release assignment';
    end if;
    update public.assignments
    set released_at = now(), release_reason = coalesce(p_reason, 'manual_worker_release')
    where job_id = p_job_id and released_at is null;
    v_new_state := v_job.state;

  else
    raise exception 'VALIDATION_ERROR: Unknown action %', p_action;
  end if;

  update public.jobs
  set
    state = v_new_state,
    version = version + 1,
    updated_at = now()
  where id = p_job_id;

  insert into public.job_events (job_id, actor_id, transition, previous_state, new_state, reason, created_at)
  values (p_job_id, v_user_id, p_action, v_job.state, v_new_state, p_reason, now());

  select jsonb_build_object(
    'id', j.id,
    'customerId', j.customer_id,
    'workerId', j.worker_id,
    'tradeId', j.trade_id,
    'localityId', j.locality_id,
    'task', j.task,
    'pricingPath', j.pricing_path,
    'state', j.state,
    'version', j.version,
    'latestQuote', (
      select jsonb_build_object(
        'id', q.id,
        'jobId', q.job_id,
        'version', q.version,
        'purpose', q.purpose,
        'scope', q.scope,
        'currency', q.currency,
        'labourMinor', q.labour_minor,
        'visitFeeMinor', q.visit_fee_minor,
        'visitFeeCredited', q.visit_fee_credited,
        'materialsPolicy', q.materials_policy,
        'expiresAt', q.expires_at,
        'supersededAt', q.superseded_at
      ) from public.quotes q where q.job_id = j.id and q.superseded_at is null order by q.version desc limit 1
    ),
    'acceptedAgreement', (
      select jsonb_build_object(
        'quoteSnapshot', a.quote_snapshot,
        'acceptedAt', a.accepted_at
      ) from public.agreements a where a.job_id = j.id
    ),
    'createdAt', j.created_at,
    'updatedAt', j.updated_at,
    'isDemo', j.is_demo
  ) into v_result
  from public.jobs j
  where j.id = p_job_id;

  if p_idempotency_key is not null then
    insert into public.mutation_keys (actor_id, idempotency_key, operation, response)
    values (v_user_id, p_idempotency_key, 'transitionJob', v_result)
    on conflict (actor_id, idempotency_key) do nothing;
  end if;

  return v_result;
end;
$$;

create or replace function public.rpc_submit_review(
  p_job_id uuid,
  p_rating int,
  p_punctuality boolean,
  p_price_honoured boolean,
  p_text text,
  p_idempotency_key text
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_user_id uuid := auth.uid();
  v_existing_response jsonb;
  v_job record;
  v_review_id uuid;
  v_result jsonb;
begin
  if v_user_id is null then
    raise exception 'UNAUTHENTICATED: Must be logged in';
  end if;

  if p_idempotency_key is not null then
    select response into v_existing_response
    from public.mutation_keys
    where actor_id = v_user_id and idempotency_key = p_idempotency_key;
    if v_existing_response is not null then
      return v_existing_response;
    end if;
  end if;

  if p_rating is null or p_rating < 1 or p_rating > 5 then
    raise exception 'VALIDATION_ERROR: Rating must be between 1 and 5';
  end if;

  select * into v_job from public.jobs where id = p_job_id;
  if v_job.id is null then
    raise exception 'NOT_FOUND: Job not found';
  end if;

  if v_job.customer_id <> v_user_id then
    raise exception 'FORBIDDEN: Only customer can submit a review';
  end if;

  if v_job.state not in ('completed', 'visit_done') then
    raise exception 'INVALID_TRANSITION: Job must be completed to leave a review, currently %', v_job.state;
  end if;

  if exists (select 1 from public.reviews where job_id = p_job_id) then
    raise exception 'FORBIDDEN: Review already submitted for this job';
  end if;

  insert into public.reviews (
    job_id,
    worker_id,
    author_id,
    rating,
    punctuality,
    price_honoured,
    text,
    created_at
  )
  values (
    p_job_id,
    v_job.worker_id,
    v_user_id,
    p_rating,
    p_punctuality,
    p_price_honoured,
    p_text,
    now()
  )
  returning id into v_review_id;

  select jsonb_build_object(
    'review', (
      select jsonb_build_object(
        'id', r.id,
        'jobId', r.job_id,
        'workerId', r.worker_id,
        'authorId', r.author_id,
        'rating', r.rating,
        'punctuality', r.punctuality,
        'priceHonoured', r.price_honoured,
        'text', r.text,
        'createdAt', r.created_at,
        'isDemo', r.is_demo
      ) from public.reviews r where r.id = v_review_id
    ),
    'worker', (
      select jsonb_build_object(
        'id', wp.id,
        'ownerUserId', wp.owner_user_id,
        'name', wp.name,
        'tradeIds', coalesce((select jsonb_agg(trade_id) from public.worker_trades where worker_id = wp.id), '[]'::jsonb),
        'localityId', wp.locality_id,
        'serviceAreaIds', coalesce((select jsonb_agg(locality_id) from public.worker_service_areas where worker_id = wp.id), '[]'::jsonb),
        'bio', wp.bio,
        'yearsExperience', wp.years_experience,
        'avatarUrl', wp.avatar_url,
        'availabilityOptIn', wp.availability_opt_in,
        'availabilityExpiresAt', wp.availability_expires_at,
        'isAvailableNow', (
          wp.availability_opt_in and
          wp.availability_expires_at > now() and
          not exists (
            select 1 from public.assignments
            where worker_id = wp.id and released_at is null
          )
        ),
        'approximateDistanceKm', null,
        'completedJobCount', (
          select count(*)::int from public.jobs
          where worker_id = wp.id and state in ('completed', 'visit_done')
        ),
        'reviewCount', (
          select count(*)::int from public.reviews
          where worker_id = wp.id
        ),
        'averageRating', (
          select coalesce(round(avg(rating)::numeric, 1), null)
          from public.reviews
          where worker_id = wp.id
        ),
        'isDemo', wp.is_demo
      ) from public.worker_profiles wp where wp.id = v_job.worker_id
    )
  ) into v_result;

  if p_idempotency_key is not null then
    insert into public.mutation_keys (actor_id, idempotency_key, operation, response)
    values (v_user_id, p_idempotency_key, 'submitReview', v_result)
    on conflict (actor_id, idempotency_key) do nothing;
  end if;

  return v_result;
end;
$$;

create or replace function public.rpc_report_issue(
  p_job_id uuid,
  p_reason text,
  p_expected_version int,
  p_idempotency_key text
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_user_id uuid := auth.uid();
  v_existing_response jsonb;
  v_job record;
  v_worker record;
  v_result jsonb;
begin
  if v_user_id is null then
    raise exception 'UNAUTHENTICATED: Must be logged in';
  end if;

  if p_idempotency_key is not null then
    select response into v_existing_response
    from public.mutation_keys
    where actor_id = v_user_id and idempotency_key = p_idempotency_key;
    if v_existing_response is not null then
      return v_existing_response;
    end if;
  end if;

  select * into v_job from public.jobs where id = p_job_id for update;
  if v_job.id is null then
    raise exception 'NOT_FOUND: Job not found';
  end if;

  if v_job.version <> p_expected_version then
    raise exception 'VERSION_CONFLICT: Expected version % but found %', p_expected_version, v_job.version;
  end if;

  select * into v_worker from public.worker_profiles where id = v_job.worker_id;
  if v_job.customer_id <> v_user_id and v_worker.owner_user_id <> v_user_id then
    raise exception 'FORBIDDEN: Only job participants can report an issue';
  end if;

  insert into public.reports (reporter_id, job_id, reason, status, created_at)
  values (v_user_id, p_job_id, p_reason, 'pending', now());

  update public.jobs
  set
    state = 'issue_open',
    version = version + 1,
    updated_at = now()
  where id = p_job_id;

  insert into public.job_events (job_id, actor_id, transition, previous_state, new_state, reason, created_at)
  values (p_job_id, v_user_id, 'report_issue', v_job.state, 'issue_open', p_reason, now());

  select jsonb_build_object(
    'id', j.id,
    'customerId', j.customer_id,
    'workerId', j.worker_id,
    'tradeId', j.trade_id,
    'localityId', j.locality_id,
    'task', j.task,
    'pricingPath', j.pricing_path,
    'state', j.state,
    'version', j.version,
    'latestQuote', (
      select jsonb_build_object(
        'id', q.id,
        'jobId', q.job_id,
        'version', q.version,
        'purpose', q.purpose,
        'scope', q.scope,
        'currency', q.currency,
        'labourMinor', q.labour_minor,
        'visitFeeMinor', q.visit_fee_minor,
        'visitFeeCredited', q.visit_fee_credited,
        'materialsPolicy', q.materials_policy,
        'expiresAt', q.expires_at,
        'supersededAt', q.superseded_at
      ) from public.quotes q where q.job_id = j.id and q.superseded_at is null order by q.version desc limit 1
    ),
    'acceptedAgreement', (
      select jsonb_build_object(
        'quoteSnapshot', a.quote_snapshot,
        'acceptedAt', a.accepted_at
      ) from public.agreements a where a.job_id = j.id
    ),
    'createdAt', j.created_at,
    'updatedAt', j.updated_at,
    'isDemo', j.is_demo
  ) into v_result
  from public.jobs j
  where j.id = p_job_id;

  if p_idempotency_key is not null then
    insert into public.mutation_keys (actor_id, idempotency_key, operation, response)
    values (v_user_id, p_idempotency_key, 'reportIssue', v_result)
    on conflict (actor_id, idempotency_key) do nothing;
  end if;

  return v_result;
end;
$$;
