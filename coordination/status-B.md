# Machine B status

Tested baseline SHA: 482a33d (integration of Machine A commit 4904f70 and Machine B commit 6876860)
Shared Supabase project reference: roshan-rozgar (supabase/config.toml)
Batch: B6 registered-user authentication, Groq/Gemini voice processing & hosted verification
Latest pushed SHA: 482a33d

## Registered-User Authentication & Anonymous Removal
- Replaced automatic `signInAnonymously` behavior:
  - `ensureSession()` requires an existing registered session and returns normalized `UNAUTHENTICATED` error (`'Sign in with a registered account.'`) otherwise.
  - Accounts awaiting email confirmation return `UNAUTHENTICATED` (`'Please confirm your email address before signing in.'`) and are not reported as signed in.
  - `getSession()` returns `null` for anonymous, unconfirmed, or non-existent sessions.
  - Implemented and exported contract operations with camelCase facade and aliases:
    - `register` (alias `signUp`)
    - `signIn` (alias `signInWithPassword`)
    - `signOut`
    - `getSession`
    - `ensureSession`
    - `requestPasswordReset` (alias `resetPasswordForEmail`)
    - `resetPassword` (alias `updatePassword`)
    - Re-exported in `features/marketplace/services.js` for Machine A frontend access.
- Anonymous identity rejection across entire backend:
  - Database function `public.registered_uid()` strictly validates non-anonymous, email-confirmed, active users (`u.deleted_at is null`, not banned).
  - All 11 domain RPCs (`rpc_save_worker_profile`, `rpc_set_availability`, `rpc_create_job_request`, `rpc_issue_quote`, `rpc_accept_quote`, `rpc_transition_job`, `rpc_send_message`, `rpc_submit_review`, `rpc_report_issue`, `rpc_my_worker_profile`, `reserve_voice_request`) invoke `public.registered_uid()`.
  - Restrictive RLS policy `rr_registered_only` added across all 15 public tables and storage objects (`storage.objects`), blocking anonymous callers even if `auth.uid()` is present.
  - Edge function `extract-voice` verifies JWT caller and immediately rejects `user.is_anonymous` with `UNAUTHENTICATED`.

## Database Migrations Applied & Verified
Applied and verified in PGlite and live PostgreSQL:
1. `supabase/migrations/20261110000001_initial_schema.sql` (core tables, partial unique index `idx_active_worker_assignment`, message cursor index, strict RLS).
2. `supabase/migrations/20261110000002_domain_rpcs.sql` (transactional RPCs, row locks, idempotency).
3. `supabase/migrations/20261110000003_seed_data.sql` (repaired demo workers with `email_confirmed_at = now()`).
4. `supabase/migrations/20261110000004_integration_hardening.sql` (canonical G-9/G-10/G-11 areas, `rpc_discover_workers`, storage RLS, rate reservation).
5. `supabase/migrations/20261110000005_registered_accounts.sql` (registered user enforcement, `public.registered_uid()`, restrictive RLS policies).

## Real Gemini Voice Processing with Groq Whisper Fallback
- `supabase/functions/_shared/voice-provider.js` & `supabase/functions/extract-voice/handler.js`:
  - Primary provider: Multimodal Gemini (`gemini-flash-lite-latest`) using raw audio bytes in JSON payloads.
  - Automatic fallback: Groq Whisper (`whisper-large-v3-turbo`) for high-speed, accurate Urdu audio transcription when Gemini is unavailable or rate-limited.
  - Whitelist validation (`validateSuggestions`):
    - Strict extraction of `worker_profile` and `job_request` schemas.
    - Drops invented state, pricing, ratings, or facts not present in audio.
    - Supported trades: `plumber`, `electrician`. Localities: `g-9-islamabad`, `g-10-islamabad`, `g-11-islamabad`.
  - Edge function security:
    - Enforces caller JWT and verifies registered status (`!user.is_anonymous`).
    - Enforces Storage object ownership (`split_part(audioRef, '/', 1) == user.id`).
    - Enforces database rate reservation (`reserve_voice_request`).
    - Validates MIME type and 5MB size limit.

## Multi-Session Hosted Acceptance Evidence
Verified with distinct registered accounts (Worker, Customer A, Customer B, Outsider) against the running Supabase stack (`tests/backend/hosted_acceptance.test.js`):
1. **Registered Authentication**: Independent sign-ups, session restorations, login with passwords, and sign-out.
2. **Anonymous Rejection**: Anonymous callers denied access to protected RPCs (`UNAUTHENTICATED`).
3. **Worker Onboarding**: Worker creates profile with trades and areas, and toggles availability.
4. **Worker Discovery**: Customers discover worker filtering by trade and locality in G-10 Islamabad.
5. **Concurrent Booking Race**: Two independent customers (A and B) concurrently race to book the same worker:
   - Customer A accepts quote first -> locks worker assignment (`confirmed`).
   - Customer B attempts to accept quote -> rejected with assignment lock (`WORKER_BUSY`).
   - Exactly one booking succeeds.
6. **Messaging Authorization & RLS**: Customer A sends messages. Outsider attempt to send message on Job A is denied (`FORBIDDEN`). Outsider querying `messages` via direct RLS receives 0 rows.
7. **Fixed-Price Journey & Review**: Worker marks work done, customer confirms completion, and submits 5-star review. Outsider review attempt is denied (`FORBIDDEN`).
8. **Stale Quote Rejection**: Worker revises quote v1 to v2. Customer attempt to accept superseded quote v1 is rejected (`STALE_REVISION`).
9. **Issue Reporting**: Customer reports issue (`rpc_report_issue`) -> transitions to `issue_open` and persists audit report.
10. **Inspection Journey**: Inspection visit quote accepted -> visit started -> repair quote issued after diagnosis -> customer accepts repair quote -> work done -> completion.
11. **Private Audio Bucket RLS**: Audio uploaded under `${user.id}/...` produces signed playback URL. Direct download by outsider is denied by Storage RLS.
12. **Password Recovery & Reset**: Customer B updates password (`updateUser`), old password fails on subsequent login, and new password successfully signs in.

## Test Suite Results
1. `npm test` (30 passed, 0 failed):
   - `tests/backend/domain_and_contract.test.js`: 8 passed (sessions, discovery, cross-user denial, stale quotes, booking races, inspection journey, allowed actions, AI fallback).
   - `tests/backend/facade_contract.test.js`: 3 passed (contract exports, normalized failures on missing setup, config validation).
   - `tests/backend/auth_registered.test.js`: 4 passed (registration validation, duplicate email prevention, sign in/out, password reset, anonymous rejection).
   - `tests/backend/hosted_acceptance.test.js`: 1 passed (12 multi-session hosted acceptance flows verified).
   - `tests/backend/voice_integration.test.js`: 5 passed (audio bytes passed to provider, missing transcript rejection, field preservation, Edge handler auth/ownership, rate/storage authorization).
   - `tests/backend/postgres_integration.test.js`: 1 passed (PGlite executing all 5 migrations, registered auth, discovery RPCs, booking exclusion, private audio storage policy, message cursor).
   - `tests/ui/demo-contract.test.mjs`: 3 passed (worker discovery lifecycle, idempotent request retries, no fabricated confirmation).
   - `tests/ui/job-policy.test.mjs`: 3 passed (paisa parsing, inspection fee credit arithmetic, role/expiry enforcement).
   - `tests/ui/auth-policy.test.mjs`: 2 passed (post-login destinations, explicit registered identities gate).
2. `npm run test:ui` (14 passed, 0 failed):
   - `tests/ui/job-workspace.test.jsx`: 6 component journeys passed (fixed-price completion/review, stale quote consent invalidation, inspection credit/repair approval, issue reporting without completion, lost-response quote retry, cancellation reasons).
   - `tests/ui/voice-composer.test.jsx`: 3 voice component journeys passed (failed voice send retry, denied microphone handling, leaving recording stops mic).
   - `tests/ui/auth-page.test.jsx`: 4 auth page journeys passed (login restores identity, confirmation instructions, mismatched password prevention, invalid reset link disabling).
   - `tests/ui/worker-onboarding.test.jsx`: 1 Urdu voice onboarding journey passed (reached confirmed profile save without typing).
3. `npm run build`:
   - Production Next.js build succeeded cleanly with 0 errors across all 16 static and dynamic routes.
