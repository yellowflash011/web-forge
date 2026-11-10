Baseline SHA: b463a253f3ddea896df37176857c71f1697a5cbe
Batch: B0-B4
Latest pushed SHA: PENDING_FIRST_PUSH
Ready calls/screens:
- ensureSession (API_CONTRACT v1 Session shape)
- getSession (returns Session or null)
- signOut (returns { signedOut: true })
- saveWorkerProfile (Worker shape, controlled trades/localities)
- getWorker (Worker + Review[] shape)
- listWorkers (filters by trade/locality/query, available now first)
- setAvailability (opt-in toggle with 2-hour rolling expiry)
- createRequest (validates availability, initializes job & first message)
- listMyJobs (workspace: 'customer' or 'worker')
- getJob (Job + allowedActions computed per participant role)
- listMessages (cursor pagination with createdAt and ID)
- sendMessage (participant authorized, text/audioRef)
- issueQuote (supersedes older quotes, version increments)
- acceptQuote (atomic worker lock, stale quote rejection, repair quote handling)
- transitionJob (strict state machine, assignment release on work_done/cancel)
- submitReview (1 review per completed job, updates worker aggregates)
- reportIssue (transitions to issue_open, persists report audit)
- uploadAudio (private job-audio bucket upload)
- getAudioPlaybackUrl (signed playback URLs)
- extractVoice (validated suggestions schema, no auto-mutation)

Checks actually run:
1. `node --test tests/backend/domain_and_contract.test.js`:
   - ✔ 1. Session & Auth: distinct sessions and profile flags
   - ✔ 2. Worker Profile & Discovery: save profile and filter by trade/locality
   - ✔ 3. Cross-User Denial: unrelated users cannot view or send messages on a job
   - ✔ 4. Quote Stale Rejection: superseded quote cannot be accepted
   - ✔ 5. Booking Race: two customers race to book one worker concurrently
   - ✔ 6. Inspection Journey: visit agreement -> repair quote -> decline vs approve
   - ✔ 7. Allowed Actions: strict role-based capability computation
   - ✔ 8. AI Extraction Contract: safe fallback and validation without mutation
2. `node tests/backend/smoke_urdu.js`:
   - Provider availability check and structured Urdu extraction smoke test.

Migration required (B only):
1. `supabase/migrations/20261110000001_initial_schema.sql` (schema, indexes, RLS, private buckets)
2. `supabase/migrations/20261110000002_domain_rpcs.sql` (transactional RPCs, row locks, idempotency)
3. `supabase/migrations/20261110000003_seed_data.sql` (Islamabad demo workers, trades, reviews)

Dependencies requested:
- None. Required `@supabase/supabase-js` and `@supabase/ssr` are already installed in root package.json.

Blockers / contract proposals:
- No blockers. API_CONTRACT v1 implemented without breaking changes.
- To enable live cloud Supabase or AI provider calls on your machine, provide `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, and `GEMINI_API_KEY` in `.env.local` (placeholders provided in `.env.example`). When unconfigured, the backend runs against the robust in-memory validation engine.

Next batch:
- B5 (Joint acceptance, two-browser rehearsal, and submission readiness).
