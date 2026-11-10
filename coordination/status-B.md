# Machine B status

Tested baseline SHA: 28ce7e73f2a1b3908f4b4a615abd17b32b31e5f9 (origin/implementation/frontend final UI batch)
Shared Supabase project reference: roshan-rozgar (supabase/config.toml)
Batch: B5 final integration & reconciliation
Latest pushed SHA: 7cc23351494faec5df9293e67dee32a8f379fe36

## Reconciled backend follow-ups
- Reconciled `computeAllowedActions` in `lib/api/domain.js` as flagged in `status-A.md`:
  - Removed `'decline'` in `quoted` state to match `rpc_transition_job` (retaining revise-quote and customer cancellation).
  - Removed redundant `'release_assignment'` in `awaiting_completion` (since `mark_work_done` already releases the physical assignment) and moved `'release_assignment'` to `issue_open`.

## Migration & database state
Applied and verified sequentially in PGlite engine:
1. `supabase/migrations/20261110000001_initial_schema.sql` (core tables, partial unique index `idx_active_worker_assignment`, message cursor index, strict RLS write denials).
2. `supabase/migrations/20261110000002_domain_rpcs.sql` (transactional RPCs, row locks, idempotency).
3. `supabase/migrations/20261110000003_seed_data.sql` (repaired historical jobs preceding reviews FK; demo workers).
4. `supabase/migrations/20261110000004_integration_hardening.sql` (canonical G-9/G-10/G-11 areas, `rpc_worker_summary`, `rpc_my_worker_profile`, `rpc_discover_workers`, `can_read_job_audio` storage RLS, `reserve_voice_request` DB throttle, and mutation table write protection).

Remote project deployment state:
- Local PostgreSQL simulation verified via `tests/backend/postgres_integration.test.js`.
- Remote Supabase CLI push (`npx supabase db push`) requires `SUPABASE_ACCESS_TOKEN` or interactive `npx supabase login`.

## Edge Function state (`supabase/functions/extract-voice`)
- Function implementation verified with `tests/backend/voice_integration.test.js` (5/5 tests pass).
- Caller-scoped Supabase client verified: enforces JWT auth, storage object ownership (`split_part(audioRef, '/', 1) == user.id`), storage RLS download, rate reservation, and provider whitelist validation (drops invented states/prices).
- Live deployment (`supabase functions deploy extract-voice`) requires remote deployment credentials.
- Function secrets needed on live deployment: `GEMINI_API_KEY` and `GEMINI_AUDIO_MODEL` (never exposed to client).

## Ready calls & contract integration
All 21 API_CONTRACT functions exported and verified:
- `ensureSession`
- `getSession`
- `getMyWorkerProfile` (restores unavailable worker profile for authenticated owner)
- `signOut`
- `saveWorkerProfile`
- `getWorker`
- `listWorkers` (uses canonical G-9, G-10, G-11 discovery; excludes active assignments, expired opt-ins, wrong trades)
- `setAvailability`
- `createRequest`
- `listMyJobs`
- `getJob` (Job entity + role-computed `allowedActions`)
- `listMessages` (stable cursor pagination on `(createdAt, id)`)
- `sendMessage` (participant authorization, text & audio references)
- `issueQuote` (versioned quotes, supersedes prior quotes)
- `acceptQuote` (atomic assignment lock, stale quote rejection, repair quote handling)
- `transitionJob` (strict action matrix, assignment release on `mark_work_done`, `decline_repair`, `cancel`)
- `submitReview` (1 review per completed job, updates worker aggregates)
- `reportIssue` (transitions to `issue_open`, persists audit report)
- `uploadAudio` (private `job-audio` bucket upload)
- `getAudioPlaybackUrl` (signed URLs with 5-minute expiry)
- `extractVoice` (invokes Edge Function; safe suggestions schema)

## Checks actually run
1. `npm test` (23 passed, 0 failed):
   - `tests/backend/domain_and_contract.test.js`: 8 passed (sessions, discovery, cross-user denial, stale quotes, booking races, inspection journey, reconciled allowed actions, safe AI fallback).
   - `tests/backend/facade_contract.test.js`: 3 passed (contract export, normalized failure on missing setup, public config validation).
   - `tests/backend/postgres_integration.test.js`: 1 passed (PGlite executing all 4 migrations, discovery RPCs, booking exclusion, private audio storage policy, message cursor).
   - `tests/backend/voice_integration.test.js`: 5 passed (audio bytes passed to provider, missing transcript rejection, field preservation without authority injection, Edge handler auth/ownership enforcement, rate/storage authorization).
   - `tests/ui/demo-contract.test.mjs`: 3 passed (worker discovery lifecycle, idempotent request retries, no fabricated confirmation).
   - `tests/ui/job-policy.test.mjs`: 3 passed (paisa parsing, inspection fee credit arithmetic, role/expiry enforcement).
2. `npm run test:ui` (6 passed, 0 failed):
   - `tests/ui/job-workspace.test.jsx`: 6 interactive component journeys passed (fixed-price completion/review, stale quote consent invalidation, inspection credit/repair approval, issue reporting without completion, lost-response quote retry, cancellation reasons).
3. `npm run build`:
   - Production Next.js build succeeded. Routes `/`, `/_not-found`, `/design` prerendered statically.
4. `npm run test:live-voice`:
   - Executed; truthfully reported `BLOCKED: set VOICE_SMOKE_URL, VOICE_SMOKE_ACCESS_TOKEN and VOICE_SMOKE_AUDIO_REF` without fabricating fake live results.

## Blockers & next steps
- Hosted deployment credentials (`SUPABASE_ACCESS_TOKEN` / operator token) needed to deploy Edge Function and push migrations to the remote Supabase project.
- All frontend and backend branches are merged and 100% of local and integration tests pass.
