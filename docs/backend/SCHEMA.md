# Database Schema & Security Specification

## Schema Entities

1. **`profiles`**:
   - `id`: UUID (Primary Key, references `auth.users(id)`).
   - `display_name`: Text.
   - `locale`: Text default 'ur'.
   - `avatar_url`: Text.
   - `created_at`, `updated_at`: Timestamptz.

2. **`worker_profiles`**:
   - `id`: UUID (Primary Key).
   - `owner_user_id`: UUID (references `auth.users(id)`).
   - `name`: Text.
   - `bio`: Text.
   - `years_experience`: Integer.
   - `locality_id`: Text (controlled e.g. `'g-10-islamabad'`).
   - `availability_opt_in`: Boolean default `false`.
   - `availability_expires_at`: Timestamptz (auto-set to `now() + 2 hours` on opt-in).
   - `is_demo`: Boolean.

3. **`worker_trades` & `worker_service_areas`**:
   - Controlled many-to-many catalogs for skill and locality coverage.

4. **`jobs`**:
   - `id`: UUID (Primary Key).
   - `customer_id`: UUID (references `auth.users(id)`).
   - `worker_id`: UUID (references `worker_profiles(id)`).
   - `pricing_path`: `'fixed'` or `'inspection'`.
   - `state`: `'requested' | 'discussing' | 'quoted' | 'confirmed' | 'visiting' | 'awaiting_repair_approval' | 'in_progress' | 'awaiting_completion' | 'completed' | 'visit_done' | 'declined' | 'expired' | 'cancelled' | 'issue_open'`.
   - `version`: Integer (increments on every transition).

5. **`assignments`**:
   - `id`: UUID.
   - `job_id`: UUID (Unique references `jobs(id)`).
   - `worker_id`: UUID (references `worker_profiles(id)`).
   - `acquired_at`: Timestamptz.
   - `released_at`: Timestamptz nullable.
   - **Critical Index**: `create unique index idx_active_worker_assignment on public.assignments(worker_id) where released_at is null;`
   - Guarantees at most ONE active assignment per worker at any time.

6. **`quotes`**:
   - `id`: UUID.
   - `job_id`: UUID.
   - `version`: Integer.
   - `purpose`: `'fixed_job' | 'inspection_visit' | 'repair_after_inspection'`.
   - `scope`: Text.
   - `currency`: `'PKR'`.
   - `labour_minor`, `visit_fee_minor`: BigInt.
   - `visit_fee_credited`: Boolean.
   - `superseded_at`: Timestamptz.

7. **`agreements`**:
   - Immutable snapshot of accepted quote and acceptance timestamp.

8. **`messages`**:
   - `id`: UUID.
   - `job_id`: UUID.
   - `sender_id`: UUID.
   - `kind`: `'text' | 'audio'`.
   - `audio_ref`: Private storage path.
   - `created_at`: Timestamptz.
   - Indexed by `(job_id, created_at, id)` for stable cursor pagination.

9. **`reviews`**:
   - `id`: UUID.
   - `job_id`: UUID (Unique: at most 1 review per job).
   - `rating`: 1–5.
   - `punctuality`, `price_honoured`: Boolean.

10. **`mutation_keys`**:
    - `(actor_id, idempotency_key)` primary key for duplicate request suppression.

## Transactional PostgreSQL RPCs

- `rpc_save_worker_profile`: Creates/updates worker profile and controlled trades/areas.
- `rpc_set_availability`: Toggles worker opt-in with rolling 2-hour server timestamp.
- `rpc_create_job_request`: Validates worker availability and active lock; creates job.
- `rpc_issue_quote`: Row-locks job; supersedes previous quote; increments version.
- `rpc_accept_quote`: Row-locks job and worker; rejects stale/expired quotes; acquires worker assignment; transitions state to `confirmed` or `in_progress`.
- `rpc_transition_job`: Enforces role-based action matrix; releases physical assignment on `mark_work_done`, `decline_repair`, and `cancel`.
- `rpc_submit_review`: Ensures only completed jobs can be reviewed by customer; updates aggregate reputation evidence.
- `rpc_report_issue`: Transitions job to `issue_open` and logs report audit.
