# Integrated backend repair

The original backend branch had useful domain tests but its browser facade implicitly used an in-memory store. It lacked own-profile restoration and private-storage provisioning; voice sent a path string instead of audio. These are now separated from live integration claims.

## Configuration and behavior

- Real API facade never imports the in-memory store or turns configuration/network failure into fixture success. Exceptions are normalized into `{data:null,error}`.
- Frontend selects local fixtures only with the explicit `NEXT_PUBLIC_APP_MODE=demo` build/development setting. Default is live. Restart Next after changing public environment settings.
- Both publishable-key and legacy anon-key names are supported with direct Next-compatible environment references.
- `getMyWorkerProfile()` uses an authenticated RPC, so unavailable workers can reopen their own profile.
- Discovery and public profile statistics use narrow database RPCs. Discovery excludes active assignments, expired opt-ins, wrong trades and out-of-coverage workers. No fake road distance is returned; nearest prioritizes the same locality when precise location is absent.
- Review counts and completed-job counts are computed separately. Seed history now includes corresponding completed demo jobs.
- Messages use an idempotent RPC and stable `(createdAt,id)` pagination. Audio has a private bucket and explicit owner/participant policies. Signed playback links expire after five minutes.

## Voice processing

Browser records -> authenticated private upload -> `client.functions.invoke('extract-voice')` -> Edge verifies the session and object ownership -> DB rate reservation -> RLS-protected download -> bounded audio bytes sent to Gemini -> strict validation -> suggestions returned for user confirmation.

The Edge function uses caller-scoped Supabase access, never a service-role key. Requests cannot provide a remote media URL or provider model/key. Configure `GEMINI_API_KEY` and `GEMINI_AUDIO_MODEL` as function secrets. Browser code contains neither provider keys nor direct Gemini requests. Recording metadata is not treated as a transcript. Unknown fields stay missing; price/state/verification guesses are discarded.

The handler has a 5 MB audio limit, permitted MIME list, provider timeout and per-user database-backed cap of 10 extraction requests per five minutes. Production abuse controls and recording-retention operations still require deployment/operations review; these limits are not a claim of full production readiness.

Deploy with `supabase functions deploy extract-voice` using the normal authenticated function configuration. The handler independently validates the user token with Supabase Auth. B5 must verify the actual project's JWT setup rather than assuming a successful local handler test proves gateway compatibility.

## Migration notes

Apply through `20261110000004_integration_hardening.sql` before switching users to live mode. Initial seed migration 00003 was repaired to create jobs before FK-linked reviews. Existing applied migrations are not automatically replayed; B5 must review actual migration history. The new migration maps only labelled demo areas from the initial backend seed to G-9/G-10/G-11 and does not relabel real historical records.

New 00004 also prevents client edits to the mutation ledger, enforces availability when acquiring assignments, validates requested skills/service areas and quote pricing paths, and prevents forged audio references, including those inserted through older request RPCs.

## Verification limits

`node --test tests/backend/*.test.js tests/ui/demo-contract.test.mjs` runs domain/fixture checks, facade failure checks, mock-provider/Edge boundary tests, and real LOCAL PostgreSQL checks through PGlite. PostgreSQL tests create minimal local auth/storage stand-ins, and use PostgreSQL's built-in UUID generator instead of the optional pgcrypto extension. They execute migrations, booking exclusion, private-object policies and idempotency. They do not validate hosted GoTrue, network Storage, real simultaneous transactions, real Gemini accuracy or function deployment.

Live voice smoke script requires `VOICE_SMOKE_URL`, `VOICE_SMOKE_ACCESS_TOKEN`, `VOICE_SMOKE_AUDIO_REF` for an actual already-uploaded recording. Set these privately; do not paste values into chat or logs. `node tests/backend/smoke_urdu.js` returns a nonzero exit code when blocked or failed and prints only structural success metadata. B5 must listen/compare the actual transcript privately.

Backend-driven quote/action/review UI remains Machine A's next frontend batch. Code integration is not a claim that all frontend operations or hosted end-to-end flows are finished.

References used for implementation: [Gemini audio input](https://ai.google.dev/gemini-api/docs/audio), [Supabase authenticated functions](https://supabase.com/docs/guides/functions/auth-legacy-jwt), [Supabase getUser verification](https://supabase.com/docs/reference/javascript/auth-getuser).
