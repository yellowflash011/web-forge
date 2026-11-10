-- 00001_initial_schema.sql
-- Roshan Rozgar schema foundation and RLS policies

create extension if not exists "pgcrypto";

-- User profiles (tied to auth.users)
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  locale text not null default 'ur',
  avatar_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Worker profiles (separate role projection)
create table if not exists public.worker_profiles (
  id uuid primary key default gen_random_uuid(),
  owner_user_id uuid not null unique references auth.users(id) on delete cascade,
  name text not null,
  bio text,
  years_experience int check (years_experience >= 0),
  locality_id text not null,
  avatar_url text,
  availability_opt_in boolean not null default false,
  availability_expires_at timestamptz,
  is_demo boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Controlled worker trades
create table if not exists public.worker_trades (
  worker_id uuid not null references public.worker_profiles(id) on delete cascade,
  trade_id text not null,
  primary key (worker_id, trade_id)
);

-- Controlled worker service areas
create table if not exists public.worker_service_areas (
  worker_id uuid not null references public.worker_profiles(id) on delete cascade,
  locality_id text not null,
  primary key (worker_id, locality_id)
);

-- Jobs
create table if not exists public.jobs (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references auth.users(id) on delete cascade,
  worker_id uuid not null references public.worker_profiles(id) on delete restrict,
  trade_id text not null,
  locality_id text not null,
  task text not null,
  pricing_path text not null check (pricing_path in ('fixed', 'inspection')),
  state text not null check (
    state in (
      'requested',
      'discussing',
      'quoted',
      'confirmed',
      'visiting',
      'awaiting_repair_approval',
      'in_progress',
      'awaiting_completion',
      'completed',
      'visit_done',
      'declined',
      'expired',
      'cancelled',
      'issue_open'
    )
  ),
  version int not null default 1,
  is_demo boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Private job details (authorized only to customer and confirmed worker)
create table if not exists public.job_private_details (
  job_id uuid primary key references public.jobs(id) on delete cascade,
  address text,
  contact_phone text,
  instructions text
);

-- Quotes (immutable, versioned per job)
create table if not exists public.quotes (
  id uuid primary key default gen_random_uuid(),
  job_id uuid not null references public.jobs(id) on delete cascade,
  version int not null,
  purpose text not null check (purpose in ('fixed_job', 'inspection_visit', 'repair_after_inspection')),
  scope text not null,
  currency text not null default 'PKR',
  labour_minor bigint not null default 0 check (labour_minor >= 0),
  visit_fee_minor bigint not null default 0 check (visit_fee_minor >= 0),
  visit_fee_credited boolean not null default false,
  materials_policy text not null default 'excluded_approval_required',
  expires_at timestamptz,
  superseded_at timestamptz,
  created_at timestamptz not null default now(),
  unique (job_id, version)
);

-- Agreements (immutable snapshot of accepted quote)
create table if not exists public.agreements (
  id uuid primary key default gen_random_uuid(),
  job_id uuid not null unique references public.jobs(id) on delete cascade,
  quote_id uuid not null references public.quotes(id),
  quote_snapshot jsonb not null,
  accepted_at timestamptz not null default now()
);

-- Physical assignments (exclusive active immediate lock per worker)
create table if not exists public.assignments (
  id uuid primary key default gen_random_uuid(),
  job_id uuid not null unique references public.jobs(id) on delete cascade,
  worker_id uuid not null references public.worker_profiles(id) on delete cascade,
  acquired_at timestamptz not null default now(),
  released_at timestamptz,
  release_reason text
);

-- Invariant: at most one active immediate assignment per worker!
create unique index if not exists idx_active_worker_assignment
  on public.assignments(worker_id)
  where released_at is null;

-- Messages (text or private audio)
create table if not exists public.messages (
  id uuid primary key default gen_random_uuid(),
  job_id uuid not null references public.jobs(id) on delete cascade,
  sender_id uuid not null references auth.users(id),
  kind text not null check (kind in ('text', 'audio')),
  text text,
  audio_ref text,
  transcript text,
  created_at timestamptz not null default now()
);

-- Stable cursor pagination for messages
create index if not exists idx_messages_cursor
  on public.messages(job_id, created_at, id);

-- Audit log for state transitions
create table if not exists public.job_events (
  id uuid primary key default gen_random_uuid(),
  job_id uuid not null references public.jobs(id) on delete cascade,
  actor_id uuid not null references auth.users(id),
  transition text not null,
  previous_state text,
  new_state text not null,
  reason text,
  created_at timestamptz not null default now()
);

-- Reviews (one per completed job)
create table if not exists public.reviews (
  id uuid primary key default gen_random_uuid(),
  job_id uuid not null unique references public.jobs(id) on delete cascade,
  worker_id uuid not null references public.worker_profiles(id) on delete cascade,
  author_id uuid not null references auth.users(id),
  rating int not null check (rating between 1 and 5),
  punctuality boolean,
  price_honoured boolean,
  text text,
  is_demo boolean not null default false,
  created_at timestamptz not null default now()
);

-- Idempotency ledger for mutations
create table if not exists public.mutation_keys (
  actor_id uuid not null references auth.users(id) on delete cascade,
  idempotency_key text not null,
  operation text not null,
  response jsonb not null,
  created_at timestamptz not null default now(),
  primary key (actor_id, idempotency_key)
);

-- Issue reports
create table if not exists public.reports (
  id uuid primary key default gen_random_uuid(),
  reporter_id uuid not null references auth.users(id),
  job_id uuid references public.jobs(id) on delete set null,
  reason text not null,
  status text not null default 'pending',
  created_at timestamptz not null default now()
);

-- ==========================================
-- ROW LEVEL SECURITY (RLS)
-- ==========================================

alter table public.profiles enable row level security;
alter table public.worker_profiles enable row level security;
alter table public.worker_trades enable row level security;
alter table public.worker_service_areas enable row level security;
alter table public.jobs enable row level security;
alter table public.job_private_details enable row level security;
alter table public.quotes enable row level security;
alter table public.agreements enable row level security;
alter table public.assignments enable row level security;
alter table public.messages enable row level security;
alter table public.job_events enable row level security;
alter table public.reviews enable row level security;
alter table public.mutation_keys enable row level security;
alter table public.reports enable row level security;

-- Profiles: readable by authenticated users; editable only by owner
create policy "profiles_select" on public.profiles
  for select using (true);

create policy "profiles_insert" on public.profiles
  for insert with check (auth.uid() = id);

create policy "profiles_update" on public.profiles
  for update using (auth.uid() = id);

-- Worker profiles: readable by everyone; editable only by owner
create policy "worker_profiles_select" on public.worker_profiles
  for select using (true);

create policy "worker_profiles_insert" on public.worker_profiles
  for insert with check (auth.uid() = owner_user_id);

create policy "worker_profiles_update" on public.worker_profiles
  for update using (auth.uid() = owner_user_id);

-- Worker trades and service areas: readable by everyone; editable by worker owner
create policy "worker_trades_select" on public.worker_trades
  for select using (true);

create policy "worker_trades_modify" on public.worker_trades
  for all using (
    exists (
      select 1 from public.worker_profiles wp
      where wp.id = worker_trades.worker_id and wp.owner_user_id = auth.uid()
    )
  );

create policy "worker_service_areas_select" on public.worker_service_areas
  for select using (true);

create policy "worker_service_areas_modify" on public.worker_service_areas
  for all using (
    exists (
      select 1 from public.worker_profiles wp
      where wp.id = worker_service_areas.worker_id and wp.owner_user_id = auth.uid()
    )
  );

-- Jobs: readable only by customer or assigned worker
create policy "jobs_select" on public.jobs
  for select using (
    customer_id = auth.uid() or
    exists (
      select 1 from public.worker_profiles wp
      where wp.id = jobs.worker_id and wp.owner_user_id = auth.uid()
    )
  );

-- Direct client updates to jobs table are blocked; all transitions MUST use RPC!
create policy "jobs_insert_deny" on public.jobs
  for insert with check (false);

create policy "jobs_update_deny" on public.jobs
  for update using (false);

-- Job private details: accessible to customer, and to worker ONLY after booking confirmation
create policy "job_private_details_select" on public.job_private_details
  for select using (
    exists (
      select 1 from public.jobs j
      where j.id = job_private_details.job_id and (
        j.customer_id = auth.uid() or (
          exists (
            select 1 from public.worker_profiles wp
            where wp.id = j.worker_id and wp.owner_user_id = auth.uid()
          ) and j.state not in ('requested', 'discussing', 'declined', 'expired')
        )
      )
    )
  );

-- Quotes: visible only to job participants; directly inserted only by worker
create policy "quotes_select" on public.quotes
  for select using (
    exists (
      select 1 from public.jobs j
      where j.id = quotes.job_id and (
        j.customer_id = auth.uid() or
        exists (
          select 1 from public.worker_profiles wp
          where wp.id = j.worker_id and wp.owner_user_id = auth.uid()
        )
      )
    )
  );

-- Agreements: visible to job participants; only created by RPC
create policy "agreements_select" on public.agreements
  for select using (
    exists (
      select 1 from public.jobs j
      where j.id = agreements.job_id and (
        j.customer_id = auth.uid() or
        exists (
          select 1 from public.worker_profiles wp
          where wp.id = j.worker_id and wp.owner_user_id = auth.uid()
        )
      )
    )
  );

-- Assignments: readable by job participants; only created/modified by RPC
create policy "assignments_select" on public.assignments
  for select using (
    exists (
      select 1 from public.jobs j
      where j.id = assignments.job_id and (
        j.customer_id = auth.uid() or
        exists (
          select 1 from public.worker_profiles wp
          where wp.id = j.worker_id and wp.owner_user_id = auth.uid()
        )
      )
    )
  );

-- Messages: readable and insertable only by job participants
create policy "messages_select" on public.messages
  for select using (
    exists (
      select 1 from public.jobs j
      where j.id = messages.job_id and (
        j.customer_id = auth.uid() or
        exists (
          select 1 from public.worker_profiles wp
          where wp.id = j.worker_id and wp.owner_user_id = auth.uid()
        )
      )
    )
  );

create policy "messages_insert" on public.messages
  for insert with check (
    sender_id = auth.uid() and
    exists (
      select 1 from public.jobs j
      where j.id = messages.job_id and (
        j.customer_id = auth.uid() or
        exists (
          select 1 from public.worker_profiles wp
          where wp.id = j.worker_id and wp.owner_user_id = auth.uid()
        )
      )
    )
  );

-- Job events: visible to job participants
create policy "job_events_select" on public.job_events
  for select using (
    exists (
      select 1 from public.jobs j
      where j.id = job_events.job_id and (
        j.customer_id = auth.uid() or
        exists (
          select 1 from public.worker_profiles wp
          where wp.id = j.worker_id and wp.owner_user_id = auth.uid()
        )
      )
    )
  );

-- Reviews: publicly readable; creation guarded by RPC
create policy "reviews_select" on public.reviews
  for select using (true);

-- Mutation keys: actor only
create policy "mutation_keys_all" on public.mutation_keys
  for all using (actor_id = auth.uid());

-- Reports: reporter only
create policy "reports_insert" on public.reports
  for insert with check (reporter_id = auth.uid());

create policy "reports_select" on public.reports
  for select using (reporter_id = auth.uid());
