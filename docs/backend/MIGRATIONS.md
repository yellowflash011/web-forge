# Supabase Database Migrations Order

Machine B alone applies database migrations to the shared Supabase project.

## Migration Sequence

1. `supabase/migrations/20261110000001_initial_schema.sql`
   - Extension `pgcrypto`
   - Core tables: `profiles`, `worker_profiles`, `worker_trades`, `worker_service_areas`, `jobs`, `job_private_details`, `quotes`, `agreements`, `assignments`, `messages`, `job_events`, `reviews`, `mutation_keys`, `reports`.
   - Invariant constraints: partial unique index `idx_active_worker_assignment` on `assignments(worker_id) where released_at is null`.
   - Message cursor index `idx_messages_cursor` on `messages(job_id, created_at, id)`.
   - Full Row Level Security (RLS) policies and direct write denial on `jobs`.

2. `supabase/migrations/20261110000002_domain_rpcs.sql`
   - Transactional PostgreSQL functions with row-locking (`FOR UPDATE`) and idempotency:
     - `rpc_save_worker_profile`
     - `rpc_set_availability`
     - `rpc_create_job_request`
     - `rpc_issue_quote`
     - `rpc_accept_quote`
     - `rpc_transition_job`
     - `rpc_submit_review`
     - `rpc_report_issue`

3. `supabase/migrations/20261110000003_seed_data.sql`
   - Seed users, profiles, and demo workers for Islamabad (Rashid, Tariq, Nadeem).
   - Seed trade links and service area mappings.
   - Demonstration reviews with evidence-based ratings.

## How to Apply

To apply all migrations to your Supabase project:
```bash
# Using Supabase CLI linked to your project
supabase db push

# Or directly execute SQL files in numerical order via psql or the Supabase SQL editor:
# 1. 20261110000001_initial_schema.sql
# 2. 20261110000002_domain_rpcs.sql
# 3. 20261110000003_seed_data.sql
```
