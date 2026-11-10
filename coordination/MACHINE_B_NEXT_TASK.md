# Machine B next task — B5 live verification

Machine A was explicitly authorized to repair and integrate B's first backend delivery. A temporarily owns the integration edits to lib/api, lib/supabase and voice-function code. Do not independently rewrite those files while A publishes the repair. Coordinate before changing production SQL functions in a separate branch.

Fetch origin/implementation/frontend after the integration repair commit is published. Start B5 from that exact commit in a separate clone or worktree, preserving local work. Record the tested SHA and shared Supabase project reference (no keys) in coordination/status-B.md. Do not claim tests ran against a different unpublished version.

## Deployment preparation

1. Review docs/backend/INTEGRATION_REPAIR.md.
2. Apply migrations 00001 through 00004 in order to the agreed project. 00003 now includes the historical jobs required by its review foreign keys; 00004 adds public summaries, private audio policies and integration guards. If 00001-00003 are already applied, apply only the pending migration. Do not reset shared data or blindly replay policies/migrations.
3. Enable/verify anonymous auth in the agreed project; use distinct browser profiles or independent clients for customer, worker and outsider.
4. Deploy supabase/functions/extract-voice. Set GEMINI_API_KEY and GEMINI_AUDIO_MODEL as Edge Function secrets through the Supabase dashboard or another secure configuration path. Choose an audio-capable model actually available to this account. Do not put the key in NEXT_PUBLIC settings, source, test logs or status files.
5. Browser configuration supports NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY or legacy NEXT_PUBLIC_SUPABASE_ANON_KEY. Set NEXT_PUBLIC_APP_MODE=live and restart/rebuild Next.js. No silent fixture fallback exists.

## Required live evidence

- Auth/session persistence and getMyWorkerProfile for an unavailable worker; profile can be edited only by its owner.
- Available profiles appear in the agreed G-9/G-10/G-11 service areas; wrong trade, expired, offline and assigned workers do not.
- Two truly independent authenticated clients accept quotes for the same available worker concurrently. Exactly one assignment succeeds. Repeat and inspect the database constraint and responses. Local in-memory/PGlite tests are not evidence of simultaneous hosted transactions.
- Complete a fixed-price and inspection-first journey through API calls if UI controls are not yet integrated; verify customer/worker permissions and quote versions. Record any frontend controls still pending as UI gaps rather than backend failures.
- Customer sends a text/audio message; worker can read and play it. Outsider cannot query job/messages or obtain private audio. Repeating an intent does not duplicate messages.
- A real Urdu audio recording is uploaded and processed through the DEPLOYED Edge Function. Confirm transcript and fields against the actual speech. The old Urdu text-only smoke test was replaced; run the new script using private environment variables as documented. No transcript or personal audio needs to be published.
- Test invalid/expired auth, a guessed other-user audio path, unsupported/oversized audio, and rate-limit responses. Verify the provider is not called for rejected access.

Publish exact checks run, results, migration/function deployment state, blockers and latest tested SHA in status-B.md. Commit and push only verification scripts/docs or mutually agreed fixes. Report failure honestly; no paid reruns or repeated provider calls beyond the necessary smoke checks. Do not reset the database while A is building or rehearsing.

If deployment access or secrets are unavailable, name the missing capability without exposing keys; complete local/nondependent checks and report the live gate as blocked by missing access.
