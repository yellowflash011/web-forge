# Machine A status

## Integration repair — current checkpoint

User explicitly authorized Machine A to repair backend gaps. Merged origin/implementation/backend (f94f21a) into implementation/frontend. Prior ownership is temporarily overridden for these integration fixes; Machine B's next task is deployment/live B5, documented in MACHINE_B_NEXT_TASK.md.

Repaired: missing own-worker read; implicit in-memory fallback; Next public-key configuration; locality mismatch; busy-worker discovery; audio-reference-as-text AI; missing private audio provisioning; profile/review counts; FK-invalid demo review seed; message idempotency/cursor; fabricated transcript fallback; unsafe nullable suggestions. Added authenticated Edge handler with actual audio bytes, server-only model/key configuration, caller-scoped storage, throttling and explicit failure responses.

Frontend services now select the real facade by default. Fixtures require NEXT_PUBLIC_APP_MODE=demo explicitly. This is code integration, not a claim of hosted readiness. Cloud migrations/function deployment have NOT been applied here; Machine B alone owns shared-environment changes.

Checks: 20 tests pass, including real LOCAL PostgreSQL migration execution and policy/assignment/message checks via PGlite, plus mock-provider and Edge boundary tests. Final production build passed. Browser bundle scan found zero Gemini key references or direct Gemini provider-request URLs. PGlite uses stand-ins for Supabase Auth/Storage. Hosted auth, independent concurrent transactions, function deployment and actual Urdu transcription remain B5 checks.

Required deployment: repaired migration 00003 on fresh projects, then new 00004; deploy extract-voice with GEMINI_API_KEY and GEMINI_AUDIO_MODEL as function secrets. See docs/backend/INTEGRATION_REPAIR.md and coordination/MACHINE_B_NEXT_TASK.md. Do not replay already-applied migrations or reset shared data.

Next frontend work: quote editor, allowedActions-driven job controls, reviews and audio-message playback against the delivered backend. Earlier fixture-only checkpoint below is retained as history.

## Earlier frontend checkpoint

Baseline SHA: b463a25 (coordination baseline published to main)

Branch: implementation/frontend

Batch: A0/A1 implemented against explicit local demo adapter; early A2 request/conversation UI prepared. Real cross-device gates remain pending B1/B2.

Latest implementation SHA: ee03da1, published on implementation/frontend. This status document is finalized in the following documentation commit; use the branch head for the latest complete handoff.

Ready screens / changes:
- Root app uses modular marketplace UI, reusable domain components and separate recording lifecycle hook.
- Submitted prototype preserved under features/design/prototype.jsx and /design. Existing Figma exports retained unchanged.
- Guest session/account UX, signout, confirmed profile creation/editing, service area selection, availability and expiry display, search, profile evidence, saved worker IDs and proper empty/error/loading states.
- New profiles have no fabricated history/rating. No sample profile fields are presented as AI extraction.
- Customer request form distinguishes inspection from fixed-price discussion; request list and text conversation use contract-shaped service calls.
- Removed customer-side controls that impersonated a worker marking a job complete. No fabricated quotes or completed jobs in application mode.
- lib/demo is explicitly local, persisted browser fixtures only. No Supabase or real AI is claimed.

Integration seam: features/marketplace/services.js currently re-exports lib/demo/index.js. When B1 is ready, A will replace this with named exports from lib/api/index.js and export an explicit mode marker for UI disclosure. No silent fallback on live errors.

Contract addition for B: getMyWorkerProfile() -> { data: Worker|null, error }. Required to restore the authenticated worker workspace even when the worker is unavailable. Session lacks a worker ID and discovery excludes unavailable workers, so neither can locate the current user's worker profile reliably. Added as an additive call to API_CONTRACT.md; please include in B1 or propose an equivalent explicit shape. No other B-owned files were edited.

Ready calls consumed: getSession, ensureSession, signOut, getMyWorkerProfile, saveWorkerProfile, listWorkers, getWorker, setAvailability, listMyJobs, createRequest, getJob, listMessages, sendMessage; uploadAudio/extractVoice wired behind explicit not-connected response in the demo adapter.

Checks actually run:
- Production `npm run build` passed after final fixes; root and /design statically prerendered.
- `node --test tests/ui/demo-contract.test.mjs`: 3 passed. Covers profile identity/persistence, availability expiry, idempotent request/message retries, distinct-session fixture isolation and no fabricated AI/booking success. These are local fixture checks, not Supabase authorization or race tests.
- Browser: created Frontend QA Worker through confirm/save, enabled availability, reloaded and verified persisted identity/availability, saw the new worker in discovery, sent a demo request to another worker, sent a text message and verified it after refresh.
- 390px phone and 1440px desktop inspected; no phone horizontal overflow. Microphone capture was not exercised because it requires the user's browser permission; lifecycle/error handling is implemented.
- /design still contains all five submitted compositions. Existing static HTML/Figma output files unchanged.
- Screenshot: tests/ui/evidence/machine-a-desktop.png.

Dependencies requested: none.

Blockers: real adapter and shared database B1/B2 handoff. Quote editor, allowedActions rendering, approval/completion/reviews UI integration follows B2/B3; no end-to-end backend acceptance claimed.

Concurrent work preserved: an unrelated uncommitted one-word edit to MACHINE_B_PROMPT.md was present at kickoff and is not included in A's implementation commit.

Next batch: merge B1 when handed off, connect the real service boundary, run the two-device profile/discovery gate, then finish A2 quote and audio-message UI against delivered backend contracts.
